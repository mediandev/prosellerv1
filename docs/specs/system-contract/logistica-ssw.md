# Contrato — Logística & Rastreio SSW

> Regras e invariantes verificadas no código. Não editar sem cotejar impacto.

Cada regra abaixo foi verificada contra o código. Quando o veredito foi *partial*, o enunciado apresentado é o **enunciado corrigido** (`corrected_statement`) e um contraexemplo é anexado como *pitfall*/nota de regressão.

---

## Invariantes

### Enum de tipo de ocorrência (5 valores em Zod, 5 no banco)
**Tipo:** invariant

**Enunciado:** O campo `tipo` de `OcorrenciaSSW` é restrito a exatamente 5 valores: `Cliente`, `Informativo`, `Entrega`, `Sistema`, `Operacional`. O ENUM do banco inclui esses mesmos 5 (migration 119 definiu 4; migration 120 adicionou `Entrega`). Schema TypeScript e banco devem permanecer sincronizados.

**Evidência:**
- `packages/shared/types/frete-logistica.ts:25-31` — enum `TipoOcorrenciaSSW` com 5 valores.
- `supabase/migrations/120_ssw_tracking_adjustments.sql:19` — migration 120 adiciona `Entrega` ao ENUM `tipo_ocorrencia_ssw`.
- `supabase/migrations/119_frete_logistica_base.sql:35-41` — migration 119 original definiu 4 valores (antes de `Entrega`).

**Regressão se:** adicionar ou remover valores do enum sem coordenar schema TypeScript e migrations do banco; usar tipo de ocorrência fora dos 5 valores definidos.

---

### Idempotência da chave de acesso NFe (índice único global) — PARCIAL
**Tipo:** invariant

**Enunciado (corrigido):** A chave de acesso NFe (código de 44 dígitos) deve ser globalmente única entre todos os fretes ativos. O índice único `uq_frete_logistica_chave_acesso` previne duplicatas no nível do banco. Porém, o tratamento idempotente é INCOMPLETO: enquanto `autoCreateFreteLogistica` trata o erro 23505 (violação de unicidade) como skip idempotente, o endpoint PUT em `frete-logistica-v1/index.ts` e o handler de webhook em `webhook-tiny-atualizacao/index.ts` não possuem tratamento específico para violações de constraint UNIQUE ao atualizar `nfe_chave_acesso`, podendo resultar em erros não-tratados ou respostas 404 falsas em vez de comportamento idempotente gracioso.

**Evidência:**
- `supabase/migrations/119_frete_logistica_base.sql:273-276` — índice UNIQUE em `nfe_chave_acesso` WHERE `deleted_at IS NULL`.
- `supabase/migrations/119_frete_logistica_base.sql:168` — CHECK constraint `nfe_chave_44` valida formato 44 dígitos.
- `supabase/functions/frete-logistica-v1/index.ts:357` — handler de erro verifica violações de `nfe_chave_44`.

**Regressão se:** remover o índice único; permitir múltiplos fretes com a mesma chave NFe; aceitar chave sem validação de 44 dígitos; soft-delete sem revalidar unicidade.

**Pitfall (contraexemplo):** `supabase/functions/webhook-tiny-atualizacao/index.ts:246-258` — UPDATE não trata o código 23505. Dois webhooks concorrentes tentando associar a mesma `nfe_chave_acesso` a fretes distintos: um falha com erro PostgreSQL não-tratado em vez de conflito gracioso.

---

### Idempotência de Pedido Venda + NFe Numero (índice composto) — PARCIAL
**Tipo:** invariant

**Enunciado (corrigido):** A combinação `(empresa_id, nfe_numero)` deve ser única entre fretes ativos. Essa constraint garante que o R-LOG-3 auto-create do Tiny não duplique fretes quando o MESMO PEDIDO é reenviado (idempotência de INSERT). Porém, a idempotência de UPDATE não é garantida: se dois updates de webhook concorrentes tentam setar `nfe_numero` em fretes diferentes com `(empresa_id, nfe_numero)` idêntico, o segundo falha com erro 23505 e não é tratado como sucesso idempotente.

**Evidência:**
- `supabase/migrations/119_frete_logistica_base.sql:267-271` — índice UNIQUE `uq_frete_logistica_empresa_nfe` em `(empresa_id, nfe_numero)` WHERE `nfe_numero IS NOT NULL`.
- `supabase/migrations/121_frete_logistica_uq_pedido_venda.sql` — migration adicional para constraints de unicidade de pedido_venda.
- `supabase/functions/_shared/frete-auto-create.ts:42-47` — R-LOG-3 detecta 23505 (duplicate key) e trata como sucesso idempotente (`skipped: true`).

**Regressão se:** remover o índice composto; permitir pares `(empresa_id, nfe_numero)` duplicados; não tratar erros 23505 de duplicate key no auto-create.

**Pitfall (contraexemplo):** `supabase/functions/webhook-tiny-atualizacao/index.ts:245-258` — UPDATE de `nfe_numero` sem detecção/recuperação de duplicata concorrente; erro 23505 é logado mas não tratado como idempotente. Segundo webhook concorrente setando o mesmo `nfe_numero` em frete diferente falha.

---

## Regras de negócio

### Aderência de status terminal (2 definições) — PARCIAL
**Tipo:** business-rule

**Enunciado (corrigido):** A regra é aplicada nos fluxos principais (on-demand via `frete-logistica-v1` e cron via `ssw-sweep-v1`), mas há um ponto de entrada alternativo (`ssw-tracking-v1`) que permite polling SSW sem respeitar status terminal — descrito como função de "debug e teste manual", mas exposta na API de produção. Existem duas definições consistentes de status terminal: (1) `helpers.ts` define `TERMINAL_STATUSES` como `{Entregue, Devolvido - Entregue}`, e (2) `ssw-refresh.ts` define `TERMINAL_FILTER` como filtro SQL para os mesmos status. Fretes não-terminais são elegíveis para polling SSW; uma vez em `Entregue` ou `Devolvido - Entregue`, não há mais polling.

**Evidência:**
- `supabase/functions/_shared/frete-logistica-helpers.ts:65-72` — definição do set `TERMINAL_STATUSES`: apenas `Entregue` e `Devolvido - Entregue`.
- `supabase/functions/_shared/ssw-refresh.ts:11-14` — comentário reconhece explicitamente "duas definições divergentes de status" como padrão robusto intencional.
- `supabase/functions/_shared/ssw-refresh.ts:110-115` — query do sweep exclui status terminais: `.not('status_entrega', 'in', TERMINAL_FILTER)`.

**Regressão se:** adicionar `Recusado` ou qualquer outro status ao set terminal sem atualizar tanto `TERMINAL_STATUSES` quanto `TERMINAL_FILTER`; fazer polling de fretes já em `Entregue`/`Devolvido - Entregue`.

**Pitfall (contraexemplo):** `supabase/functions/ssw-tracking-v1/index.ts:70` — chamada a `fetchSswTracking(chaveNfe)` sem validação de `isTerminalStatus()`, permitindo polling SSW para qualquer chave NFe independentemente do `status_entrega` do frete associado.

---

### Override de status "sticky" (regra do último evento administrativo)
**Tipo:** business-rule

**Enunciado:** Ao resolver status a partir da timeline de rastreio SSW, se o último evento mapeia para `Em Trânsito` (mapeamento genérico default), o sistema busca para trás por um status "sticky" (`Entregue`, `Devolvido - Entregue`, `Devolvido - Trânsito` ou `Recusado`). Isso impede que eventos administrativos como `ANEXADO COMPROVANTE (70)` revertam uma entrega concluída. `Agendado` e `Em Trânsito - Reentrega` NÃO são sticky, para preservar a progressão.

**Evidência:**
- `supabase/functions/_shared/frete-logistica-helpers.ts:99-120` — `resolveFreteStatusFromTracking` implementa a lógica sticky com o set `STICKY`.
- `tests/edge/ssw-tracking-helpers.test.ts:90-97` — teste verifica que comprovante complementar (70) após entrega não reverte status para `Em Trânsito`.
- `tests/edge/ssw-tracking-helpers.test.ts:99-105` — teste confirma que saída para entrega após agendamento reverte para `Em Trânsito` (`Agendado` não é sticky).

**Regressão se:** remover qualquer status do set `STICKY`; adicionar `Agendado` ou `Reentrega` ao set `STICKY`; processar a timeline linearmente sem busca reversa por status sticky.

---

### Mapeamento de tipo e código de ocorrência SSW — PARCIAL
**Tipo:** business-rule

**Enunciado (corrigido):** Códigos de ocorrência SSW mapeiam para status distintos na função `mapOcorrenciaToStatus` APENAS para fluxos guiados por SSW: `tipo=Entrega + (01)` → `Entregue`; `tipo=Cliente + (02)` → `Agendado`; `AGENDAD[AO] + (08)` → `Agendado`; `RECUSAD[AO]` → `Recusado`; variantes `DEVOLU[CÇ][AÃ]O` (checadas ANTES de `RECUSADO`) → variantes `Devolvido`; `REENTREGA` → `Em Trânsito - Reentrega`; default → `Em Trânsito`. Padrões regex são case-insensitive e checados em ordem específica. Porém, o status também é atribuído diretamente (contornando este mapper) nos endpoints `romaneio-logistica-v1` e `entrega-publica-v1`, e a ordem de precedência (DEVOLUÇÃO antes de RECUSADO) não está explicitamente documentada na regra original.

**Evidência:**
- `supabase/functions/_shared/frete-logistica-helpers.ts:74-97` — `mapOcorrenciaToStatus` implementa as regras de mapeamento com padrões regex.
- `tests/unit/ssw-status-mapper.test.ts:35-75` — cobertura abrangente de todos os caminhos de mapeamento.
- `tests/edge/ssw-tracking-helpers.test.ts:38-73` — testes de edge case confirmam ordem de mapeamento e casamento de padrões.

**Regressão se:** alterar padrões regex, ordem de mapeamento ou associações código-para-status; aceitar novos códigos de ocorrência sem atualizar o mapper.

**Pitfall (contraexemplo):** `supabase/functions/romaneio-logistica-v1/index.ts:323` atribui `status_entrega: 'Em Trânsito'` diretamente sem chamar `mapOcorrenciaToStatus`. Da mesma forma, `supabase/functions/entrega-publica-v1/index.ts:143` e `:166` atribuem `Entregue` e `Agendado` diretamente sem validação pelo mapper. Nota: `AGENDAD[AO]\s*\(08\)` exige AMBOS os padrões juntos, não apenas `(08)`.

---

### Cache de polling SSW (TTL de 30 minutos)
**Tipo:** business-rule

**Enunciado:** Dados de rastreio SSW são cacheados por frete com base em `frete_logistica_ocorrencia.created_at`. O cache é válido por 30 minutos. O polling é pulado se a ocorrência mais recente for mais nova que 30 minutos atrás, a menos que `force=true` seja passado. Aplica-se tanto a polls on-demand (`get_with_ocorrencias?force=true`) quanto a sweeps agendados (`ssw-sweep-v1` cron com `force=false`).

**Evidência:**
- `supabase/functions/_shared/ssw-client.ts:122-132` — `isCacheStale` define TTL de 30 minutos na constante `CACHE_TTL_MS`.
- `supabase/functions/_shared/ssw-refresh.ts:45-57` — `refreshSswForFrete` checa staleness do cache antes de fazer polling, exceto se `force=true`.
- `supabase/functions/ssw-sweep-v1/index.ts:44-46` — sweep cron horário usa `force=false`, respeitando o cache.

**Regressão se:** alterar a constante TTL sem atualizar todos os callers; fazer polling com `force=false` quando a ocorrência está fresca; ignorar a checagem de staleness do cache.

---

### Controle de concorrência do sweep SSW
**Tipo:** business-rule

**Enunciado:** O polling SSW em lote processa fretes com concorrência de 8 (`CONCURRENCIA=8`) para respeitar o rate limit SSW de 20 req/s. Lotes do sweep processam sequencialmente a 8 requisições concorrentes por lote, para evitar sobrecarregar a API externa. Limite default do sweep é 500 fretes por execução; 300 para o sweep via cron.

**Evidência:**
- `supabase/functions/_shared/ssw-refresh.ts:100-136` — `sweepSsw` implementa batching `CONCURRENCIA=8` e o parâmetro `limit`.
- `supabase/functions/ssw-sweep-v1/index.ts:44-46` — cron horário usa `limit: 500` para sweep geral.

**Regressão se:** aumentar a concorrência além de 8 sem coordenação com o rate limit SSW; remover o parâmetro `limit` causando queries ilimitadas; mudar o processamento em lote para sequencial.

---

### Status inicial de novo frete — PARCIAL
**Tipo:** business-rule

**Enunciado (corrigido):** Todos os fretes recém-criados via POST para `frete-logistica-v1` ou via R-LOG-3 auto-create do Tiny têm status default `Em Separação`. Porém, `entrega-publica-v1` (endpoint público, não-autenticado) pode criar/atualizar fretes com valores de status terminal (`Entregue`, `Agendado`) diretamente, contornando o default `Em Separação`.

**Evidência:**
- `packages/shared/types/frete-logistica.ts:116` — schema `FreteLogisticaCreate` faz default de `statusEntrega` para `Em Separação`.
- `supabase/functions/frete-logistica-v1/index.ts:139` — handler POST faz default de `status_entrega` para `Em Separação` se não fornecido.
- `supabase/functions/_shared/frete-auto-create.ts:34` — R-LOG-3 auto-create fixa `status_entrega: 'Em Separação'`.

**Regressão se:** mudar o status default para algo diferente de `Em Separação`; permitir criação de novos fretes sem status explícito; auto-create usando status inicial diferente.

**Pitfall (contraexemplo):** `supabase/functions/entrega-publica-v1/index.ts:143` e `:166` — POST `action=confirmar_entrega` seta `status_entrega` para `Entregue`; POST `action=reportar_agendamento` seta `status_entrega` para `Agendado`, ambos contornando o default `Em Separação`.

---

### Criação de romaneio dispara transição para Em Trânsito — PARCIAL
**Tipo:** business-rule

**Enunciado (corrigido):** Ao criar um romaneio via POST `action=create`, o sistema LISTA fretes disponíveis filtrados por status válido (`Em Separação`/`Aguardando Coleta`) no GET `listar_disponiveis`, mas o endpoint POST `create` NÃO valida se os `freteIds` submetidos estão de fato em status válido antes de inserir em `romaneio_frete`. A atualização de status para `Em Trânsito` é tentada APÓS o insert na junção e é não-crítica (logada, mas não faz rollback). Não há constraint no banco impedindo fretes em status inválido de serem incluídos em um romaneio.

**Evidência:**
- `supabase/functions/romaneio-logistica-v1/index.ts:88` — listar disponíveis filtra fretes com `.in('status_entrega', ['Em Separação', 'Aguardando Coleta'])`.
- `supabase/functions/romaneio-logistica-v1/index.ts:320-329` — POST create atualiza status do frete para `Em Trânsito`; falha é logada mas não falha a criação do romaneio.

**Regressão se:** alterar os status pré-romaneio elegíveis; atualizar status de forma síncrona como parte do commit do romaneio; impedir atualização de status se o insert do romaneio falhar.

**Pitfall (contraexemplo):** `supabase/functions/romaneio-logistica-v1/index.ts:265-318` — POST create aceita array `freteIds` sem consultar/validar `status_entrega` antes de inserir em `romaneio_frete` (linha 313). Um frete em `Entregue` ou `Recusado` pode ser incluído em um romaneio. A atualização de status (linhas 321-329) ocorre após o insert da junção e falha silenciosamente sem rollback.

---

### Cálculo de dias em trânsito (apenas fretes ativos) — PARCIAL
**Tipo:** business-rule

**Enunciado (corrigido):** Dias em trânsito (`diasEmTransito`) é calculado como dias decorridos de `data_saida` até agora, mas SOMENTE para operações GET de lista (`list`, `list_by_status`, `get_with_ocorrencias`). Quando calculado, a lógica retorna `null` se: `data_entrega` não é nulo, `data_saida` está ausente/inválido, ou o tempo atual é anterior a `data_saida`. Recuperações de registro único (GET por id), POST (create) e PUT (update) não incluem `diasEmTransito` nas respostas.

**Evidência:**
- `supabase/functions/_shared/frete-logistica-helpers.ts:127-136` — `diasEmTransito` retorna `null` se `dataEntrega` existe ou `dataSaida` inválido.

**Regressão se:** calcular dias de trânsito para fretes entregues; remover a checagem de nulo para `dataEntrega`; usar data atual em vez de cálculo preciso via `Date.now()`.

**Pitfall (contraexemplo):** `supabase/functions/frete-logistica-v1/index.ts:279-284` — GET por id retorna `formatFrete()` sem enriquecimento de `diasEmTransito`, contradizendo a aplicação universal implícita na regra original.

---

### Soft delete (campo deleted_at) — PARCIAL
**Tipo:** business-rule

**Enunciado (corrigido):** Apenas algumas entidades logísticas impõem soft delete via `deleted_at`: `frete_logistica`, `transportador_logistica` e `fatura_transportadora` têm coluna `deleted_at` e queries filtram `deleted_at IS NULL`. Porém, hard delete é ativamente usado em `ssw-refresh.ts` linha 66 (`frete_logistica_ocorrencia.delete()`) e `romaneio-logistica-v1/index.ts` linha 316 (`romaneio_expedicao.delete()` em rollback de erro). Adicionalmente, as tabelas `origem_frete` e `regiao_destino` foram criadas sem coluna `deleted_at` e não implementam soft delete — `origem_frete` usa apenas flag `ativo`, e `regiao_destino` não tem handler de delete.

**Evidência:**
- `supabase/migrations/119_frete_logistica_base.sql:162, 81, 213, 231` — colunas `deleted_at` adicionadas a tabelas de logística.
- `supabase/functions/frete-logistica-v1/index.ts:302, 407-408` — queries filtram `.is('deleted_at', null)`; DELETE usa soft-delete via update.
- `supabase/functions/_shared/ssw-refresh.ts:108` — queries do sweep excluem linhas soft-deleted.

**Regressão se:** hard-delete de qualquer registro logístico; falhar em incluir `deleted_at IS NULL` nas queries; usar statement DELETE em vez de UPDATE com `deleted_at`.

**Pitfall (contraexemplo):** `supabase/functions/_shared/ssw-refresh.ts:66` — `await supabase.from('frete_logistica_ocorrencia').delete().eq('frete_id', id)` executa deleção física sem soft-delete; também `supabase/functions/romaneio-logistica-v1/index.ts:316` — `await admin.from('romaneio_expedicao').delete().eq('id', romaneioId)`.

---

### Buckets de status do Dashboard com consolidação e decomposição — PARCIAL
**Tipo:** business-rule

**Enunciado (corrigido):** O Dashboard/Kanban implementa 5 buckets com a consolidação de `Em Trânsito - Reentrega` no bucket `Em Trânsito`, limite 20 por bucket e ordenação correta (`data_emissao` desc, `id` desc), servidos pela action `list_by_status`. Porém: (1) o status `Em Trânsito - Reentrega` permanece mapeado em `DASHBOARD_BUCKETS` apesar de ter sido marcado para remoção no Changelog V1.56 — conflita com a declaração de tipo Zod que não o inclui; (2) o status `Aguardando Agendamento` (adicionado no Changelog V1.56) não tem bucket mapeado em `DASHBOARD_BUCKETS`, permanecendo invisível no Dashboard/Kanban apesar de estar registrado no banco.

**Evidência:**
- `supabase/functions/_shared/frete-logistica-helpers.ts:44-50` — mapeamento `DASHBOARD_BUCKETS`: bucket `Em Trânsito` inclui `Em Trânsito` e `Em Trânsito - Reentrega`.
- `packages/shared/types/frete-logistica.ts:164-172` — tipo `DashboardBucketLabel` define os nomes exatos dos buckets.
- `supabase/functions/frete-logistica-v1/index.ts:169-184` — `handleListByStatus` consulta 5 buckets com limite 20 cada, ordenação consolidada.

**Regressão se:** alterar definições de bucket; remover a consolidação `Em Trânsito`; adicionar novos status sem atualizar os buckets; modificar a ordenação dentro dos buckets.

**Pitfall (contraexemplo):** `packages/shared/types/frete-logistica.ts:16` — o tipo Zod `StatusEntregaFrete` não inclui `Em Trânsito - Reentrega` (contradiz o mapeamento `DASHBOARD_BUCKETS`), e não há bucket para `Aguardando Agendamento` apesar de estar no Zod.

---

### Feature flags: FEATURE_LOG_CRM (master) e FEATURE_LOG_CRM_SSW (sub-flag) — PARCIAL
**Tipo:** business-rule

**Enunciado (corrigido):** Nem todas as funções logísticas gatean em `FEATURE_LOG_CRM`. Enquanto `frete-logistica-v1`, `ssw-sweep-v1`, `ssw-tracking-v1`, `origem-frete-v1`, `regiao-destino-v1` e `transportador-logistica-v1` implementam gating com 503 quando desabilitado, `romaneio-logistica-v1` não possui nenhuma verificação de feature flag e processa requisições independentemente do estado da flag. Funções específicas de SSW gatean adicionalmente em `FEATURE_LOG_CRM_SSW`. Os requisitos de case-sensitivity (exigindo `true` literal, minúsculo, sem trim; rejeitando `TRUE` e ` true `) estão corretamente implementados em todos os helpers de flag.

**Evidência:**
- `supabase/functions/frete-logistica-v1/index.ts:31, 243-244` — `frete-logistica-v1` checa `isLogCrmEnabledFromEnv()` e retorna 503 se desabilitado.
- `supabase/functions/ssw-sweep-v1/index.ts:29-34` — `ssw-sweep-v1` gatea em `FEATURE_LOG_CRM` e `FEATURE_LOG_CRM_SSW`.
- `tests/edge/frete-logistica-v1.test.ts:20-45` — testes verificam o requisito case-sensitive de `true` (`TRUE` maiúsculo é falso).

**Regressão se:** tornar as flags case-insensitive; aplicar trim nos valores; retornar códigos de status diferentes para o estado desabilitado; remover a checagem da sub-flag SSW; mudar o default para habilitado.

**Pitfall (contraexemplo):** `supabase/functions/romaneio-logistica-v1/index.ts:1-335` — Edge Function logística que processa GET e POST sem qualquer verificação de `FEATURE_LOG_CRM` ou `isLogCrmEnabledFromEnv()`, violando o gating universal.
