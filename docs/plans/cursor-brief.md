# Cursor Brief — ProSeller V1

> **Para que serve este arquivo:** instruções curtas para o Cursor Agent executar tarefas de **infra via MCP Supabase** (Cenário C — produção).
>
> **Regra de ouro do projeto (AGENTS.md §2.2):** toda operação em produção passa por staging antes e tem seção **Rollback** obrigatória. Uma seção por operação. Se uma seção crescer > ~50 linhas, a complexidade é sinal de que a feature não é só infra — reconsiderar.

**Versão:** 1.0 · **Data:** 2026-04-20

---

## Como usar

1. Localize a seção da tarefa no índice abaixo.
2. Confirme que o MCP Supabase está ativo no Cursor (`.cursor/MCP.json`, projeto `xxoiqfraeolsqsmsheue`).
3. **Padrão:** primeiro aplique em staging, valide com o smoke da seção, depois repita em produção com a feature flag relevante **desligada**.
4. **Exceção operacional (Free plan, sem Branching):** quando a tarefa marcar explicitamente "PROD ONLY com rede reforçada" (ex.: Tarefa 8 da F-LOG-CRM R-LOG-1), staging dedicado não existe — usa-se `pg_dump --schema-only` como backup, janela fora do expediente, smoke ampliado e janela de observação de 7 dias com flag OFF antes de cogitar ligar. Trade-off documentado em `DECISIONS_LOG.md`.
5. Volte ao Claude Code e marque no `TODO.md §1` a migration como aplicada, com SHA do commit.

---

## Índice

- [Tarefa 1 — Migration 108 · F-001 Simples Nacional (schema)](#tarefa-1--migration-108--f-001-simples-nacional-schema)
- [Tarefa 2 — Secrets Supabase (pós-migration)](#tarefa-2--secrets-supabase-pós-migration)
- [Tarefa 3 — Ativar feature flag em staging](#tarefa-3--ativar-feature-flag-em-staging)
- [Tarefa 4 — Ativar feature flag em produção](#tarefa-4--ativar-feature-flag-em-produção)
- [Tarefa 5 — INC-013 · Vincular 32 clientes da Valéria Montoz](#tarefa-5--inc-013--vincular-32-clientes-da-valéria-montoz)
- [Tarefa 6 — Migration 115 · busca clientes (unaccent + CNPJ digits + grupo)](#tarefa-6--migration-115--busca-clientes-unaccent--cnpj-digits--grupo)
- [Tarefa 7 — Cadastro do vendedor "Empresa - Venda Direta ES"](#tarefa-7--cadastro-do-vendedor-empresa---venda-direta-es)
- [Tarefa 8 — F-LOG-CRM R-LOG-1 (migration 119 + 4 Edge Functions, **PROD ONLY** com rede reforçada)](#tarefa-8--f-log-crm-r-log-1-migration-119--4-edge-functions-prod-only-com-rede-reforçada)
- [Tarefa 9 — F-LOG-CRM R-LOG-2 · Bucket Storage `logistica-comprovantes`](#tarefa-9--f-log-crm-r-log-2--bucket-storage-logistica-comprovantes)

---

## Tarefa 1 — Migration 108 · F-001 Simples Nacional (schema)

**Feature associada:** F-001 — Consulta Simples Nacional
**MCP:** Supabase MCP (projeto `xxoiqfraeolsqsmsheue`)
**Tipos Zod espelhados:**
- `packages/shared/types/cliente.ts` → `ClienteSimplesNacional`
- `packages/shared/types/natureza-operacao.ts` → `TinyEmpresaNaturezaOperacao` (campo `tinyValorSimples`)
**ADR de referência:** `docs/decisions/adr/ADR-003-modelagem-dual-id-natureza-operacao.md`

### Objetivo

Adicionar 3 colunas nullable (2 em `cliente`, 1 em `tiny_empresa_natureza_operacao`) para suportar o dual-ID de natureza de operação Tiny baseado no regime Simples Nacional do destinatário.

### Pré-condições (rodar EM ORDEM, parar se qualquer falhar)

1. **Backup recente.** Confirmar no painel Supabase que um backup automático ocorreu nas últimas 24h. Se não, forçar backup manual antes.
2. **Feature flag desligada.** Confirmar no painel Supabase (Project Settings › Edge Functions › Secrets) que `FEATURE_SIMPLES_NACIONAL_LOOKUP` está **ausente** OU com valor `"false"`. Nunca aplicar a migration com a flag `"true"` — código de produção não está pronto.
3. **Horário:** aplicar fora do horário comercial BR (antes das 9h ou após as 20h). A migration é ADD COLUMN nullable (metadata-only, lock desprezível no Postgres 14+), mas respeitar a janela mantém margem.
4. **Staging primeiro.** Esta seção precisa rodar **duas vezes** — uma em staging/preview, outra em produção. Validar smoke test em staging antes de passar para prod.
5. **Revisão de consumidores.** Grep no código por uso direto de `tiny_empresa_natureza_operacao` — se houver consumidor fora de `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts` e `supabase/functions/tiny-empresa-natureza-operacao-v2/index.ts`, reportar antes de aplicar (indica superfície escondida).

### SQL final

Arquivo a ser criado: `supabase/migrations/108_simples_nacional_lookup.sql`

```sql
-- 108: F-001 Consulta Simples Nacional
-- Adiciona (a) flag optante + timestamp da consulta no cliente
--         (b) valor Tiny dual por natureza/empresa (dual-ID ADR-003).
-- Todas as colunas são NULL-safe para preservar dados e comportamento atuais.
-- Ver: docs/specs/SPEC.md §7 e docs/decisions/adr/ADR-003*.md

-- 108.a) cliente: flag Simples Nacional + timestamp
alter table public.cliente
  add column if not exists optante_simples_nacional boolean null,
  add column if not exists optante_simples_nacional_consultado_em timestamptz null;

comment on column public.cliente.optante_simples_nacional is
  'true = cliente optante do Simples Nacional (CONSOPT via ReceitaWS). null = nunca consultado, cliente PF, ou consulta inconclusiva. Ver SPEC §1 RF-001.';

comment on column public.cliente.optante_simples_nacional_consultado_em is
  'Timestamp da última consulta ReceitaWS que produziu valor definitivo. Revalidação acontece on-demand ao enviar pedido Tiny (>30 dias). Ver SPEC §1 RF-003.';

-- 108.b) tiny_empresa_natureza_operacao: natureza distinta para optantes
alter table public.tiny_empresa_natureza_operacao
  add column if not exists tiny_valor_simples text null;

comment on column public.tiny_empresa_natureza_operacao.tiny_valor_simples is
  'Valor natureza_operacao Tiny usado quando cliente destinatário é optante do Simples Nacional. NULL = usa tiny_valor para todos (comportamento pré-F-001). Invariante: se NOT NULL, tiny_valor também precisa estar NOT NULL. Ver ADR-003.';
```

**Notas:**
- `add column if not exists` é idempotente — reaplicar é seguro.
- Nenhum índice novo: acesso sempre via PK (`cliente_id`) ou unique index existente `uq_tiny_empresa_natureza_operacao_empresa_natureza`.
- Unique index existente em `tiny_empresa_natureza_operacao` **não é tocado**.

### Operação (cole isto no Cursor Agent)

```
Usando Supabase MCP (projeto xxoiqfraeolsqsmsheue), execute a migration
108_simples_nacional_lookup.sql no ambiente-alvo.

Ambiente-alvo: [staging | production]  ← escolher explicitamente

Passo 0 (PRÉ-MCP — rodar no git local, obrigatório):
  Criar o arquivo supabase/migrations/108_simples_nacional_lookup.sql
  com o conteúdo exato da seção "SQL final" acima.
  Commit (HEREDOC) com mensagem:
    feat(db): migration 108 - optante simples nacional + dual tiny_valor
  Push para origin/main (ou para a branch de F-001, se já houver).
  Só depois prosseguir para as Etapas com o MCP. Este passo é o que
  habilita o "git revert" do Rollback — sem o commit do .sql no git,
  o rollback via `git revert` fica sem alvo.

Etapas:
1. Confirmar que a feature flag FEATURE_SIMPLES_NACIONAL_LOOKUP está
   ausente ou "false" nos secrets da Edge Function antes de rodar. Se
   estiver "true", ABORTAR.
2. Criar o arquivo supabase/migrations/108_simples_nacional_lookup.sql
   com o SQL exato do brief (cursor-brief.md Tarefa 1).
   (Nota: se Passo 0 já rodou, o arquivo já existe no git local — o
   MCP apenas aplica o SQL, não recria o arquivo.)
3. Aplicar via `supabase db push` (ou a operação equivalente do MCP).
4. Rodar o smoke test (SQL abaixo) — confirmar que retorna 3 linhas,
   todas com is_nullable='YES'.
5. Comitar o arquivo da migration na mesma branch de F-001 no git.
   (Redundante com o Passo 0 acima se já foi feito — pode pular.)
6. Reportar: [aplicada | falhou com <erro>].

NÃO ligue a feature flag nesta operação. A flag entra depois, em
sessão separada, quando o código das Edge Functions estiver mergeado.
```

### Smoke test pós-aplicação

Rodar via SQL Editor do Supabase ou via MCP:

```sql
-- 1. Confirmar as 3 colunas novas, todas NULLABLE
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where (table_name = 'cliente' and column_name in ('optante_simples_nacional', 'optante_simples_nacional_consultado_em'))
   or (table_name = 'tiny_empresa_natureza_operacao' and column_name = 'tiny_valor_simples')
order by table_name, column_name;
-- Esperado: 3 linhas, todas is_nullable = 'YES'.

-- 2. Confirmar que dados existentes estão intactos e com NULL nas colunas novas
select count(*) as total,
       count(optante_simples_nacional) as optante_setados,
       count(optante_simples_nacional_consultado_em) as consultados
from public.cliente;
-- Esperado: total = contagem atual de clientes; optante_setados = 0; consultados = 0.

select count(*) as total,
       count(tiny_valor_simples) as duais
from public.tiny_empresa_natureza_operacao
where deleted_at is null;
-- Esperado: total = contagem atual de mapeamentos ativos; duais = 0.

-- 3. Confirmar que o unique index antigo ainda é único
select indexname, indexdef
from pg_indexes
where tablename = 'tiny_empresa_natureza_operacao'
  and indexname = 'uq_tiny_empresa_natureza_operacao_empresa_natureza';
-- Esperado: 1 linha, com indexdef contendo "UNIQUE".
```

**Passa?** Seguir. **Falha?** Rodar o rollback abaixo **imediatamente** e reportar o diff.

### Rollback (OBRIGATÓRIO — Cenário C produção)

**Quando usar:**
- Smoke test falhou.
- Aplicação de produção começou a retornar erros em `cliente` ou `tiny_empresa_natureza_operacao` após a migration.
- Decisão de reverter F-001 antes de ligar a feature flag.

**Pré-condição:** confirmar que **nenhum** registro já gravou valor não-null nas colunas novas (se já houver dado real, rollback apaga informação coletada — aceitável no MVP, mas reportar ao usuário).

```sql
-- Confirmar se há dado nas colunas antes de dropar
select count(*) from public.cliente where optante_simples_nacional is not null;
select count(*) from public.cliente where optante_simples_nacional_consultado_em is not null;
select count(*) from public.tiny_empresa_natureza_operacao where tiny_valor_simples is not null;
-- Se alguma retornar > 0, PARAR e reportar antes de dropar.

-- Rollback efetivo
alter table public.tiny_empresa_natureza_operacao
  drop column if exists tiny_valor_simples;

alter table public.cliente
  drop column if exists optante_simples_nacional_consultado_em,
  drop column if exists optante_simples_nacional;
```

**Pós-rollback:**
1. Confirmar que smoke test (seção acima) retorna **0 linhas** na query das 3 colunas.
2. Reverter o commit da migration 108 no git — é o commit produzido no **Passo 0** da seção "Operação" acima, com mensagem `feat(db): migration 108 - optante simples nacional + dual tiny_valor`. Localize o SHA com `git log --grep='migration 108' -1 --format=%H` e rode `git revert <SHA>`.
3. Atualizar `TODO.md §1` reinserindo "Migration 108" como bloqueador aberto.
4. Registrar no `TODO.md §5 Bugs` (se motivação foi falha) ou `§4 Débito técnico` (se foi decisão estratégica) o motivo da reversão.

### Critério de aceite da Tarefa 1

- [ ] Migration aplicada em **staging** sem erro.
- [ ] Smoke test em staging: 3 colunas criadas, nullable, sem dado.
- [ ] Migration aplicada em **produção** sem erro.
- [ ] Smoke test em produção: idem.
- [ ] Arquivo `supabase/migrations/108_simples_nacional_lookup.sql` comitado na branch `feat/simples-nacional-lookup`.
- [ ] Flag `FEATURE_SIMPLES_NACIONAL_LOOKUP` continua ausente/`"false"` após a migration.
- [ ] `TODO.md §1` atualizado marcando a Migration 108 como aplicada, com SHA.

---

## Tarefa 2 — Secrets Supabase (pós-migration)

**Feature associada:** F-001 — Consulta Simples Nacional
**MCP:** Supabase MCP (projeto `xxoiqfraeolsqsmsheue`)
**Pré-requisito:** Tarefa 1 concluída em staging **e** produção.

### Objetivo

Cadastrar os 2 secrets necessários para o código da F-001 rodar em staging e em produção, **com a flag ainda desligada**. O código das Edge Functions precisa que ambos existam antes de ser chamado com a flag ligada — se faltar `RECEITAWS_TOKEN`, o helper `consultarSimplesNacional` devolve fallback gracioso; se faltar `FEATURE_SIMPLES_NACIONAL_LOOKUP`, o código trata como `"false"` (ADR-001).

### Pré-condições

1. Tarefa 1 (migration 108) concluída em ambos os ambientes, smoke test verde.
2. Token pago da ReceitaWS adquirido (decisão comercial confirmada com Lucas).
3. Branch `feat/simples-nacional-lookup` ainda não mergeada em `main` (os secrets entram antes do código para evitar janela onde o código já está em produção mas os secrets ainda não existem).

### Operação (cole no Cursor Agent)

```
Usando Supabase MCP (projeto xxoiqfraeolsqsmsheue), cadastre os seguintes
secrets de Edge Functions no ambiente-alvo.

Ambiente-alvo: [staging | production]  ← escolher explicitamente

Secrets:
1. FEATURE_SIMPLES_NACIONAL_LOOKUP = "false"
   (string literal "false"; quando decidirmos ativar, alteramos para "true"
   em sessão separada — Tarefa 3/4 abaixo.)

2. RECEITAWS_TOKEN = <token-do-plano-pago>
   (ler do .env.local do Cursor ou do local seguro onde o token foi
   guardado ao contratar o plano pago da ReceitaWS. Nunca colar em chat.)

Validação pós-cadastro:
- Rodar `supabase secrets list` via MCP e confirmar que ambos os nomes
  aparecem, sem exibir o valor.
- Confirmar que FEATURE_SIMPLES_NACIONAL_LOOKUP aparece com valor "false"
  (ou verificar via chamada de probe se o painel nao mostrar valor).

Reportar: [cadastrados | falhou com <erro>].
```

### Rollback

```
supabase secrets unset FEATURE_SIMPLES_NACIONAL_LOOKUP RECEITAWS_TOKEN
```

Rollback dos secrets é sempre seguro: com `FEATURE_SIMPLES_NACIONAL_LOOKUP` ausente, o código trata como `"false"` (ADR-001). Sem `RECEITAWS_TOKEN`, o helper `consultarSimplesNacional` emite log de erro e retorna `status="failed"` — nenhum fluxo do sistema quebra.

### Critério de aceite da Tarefa 2

- [ ] `FEATURE_SIMPLES_NACIONAL_LOOKUP = "false"` cadastrada em **staging**.
- [ ] `RECEITAWS_TOKEN = <valor>` cadastrada em **staging**.
- [ ] Mesmas duas secrets cadastradas em **produção**.
- [ ] `supabase secrets list` mostra ambos os nomes nos dois ambientes.

---

## Tarefa 3 — Ativar feature flag em staging

**Feature associada:** F-001 — Consulta Simples Nacional
**MCP:** Supabase MCP (projeto `xxoiqfraeolsqsmsheue`)
**Pré-requisito:** Tarefa 1 + Tarefa 2 concluídas; PR `feat/simples-nacional-lookup` com deploy Netlify de preview já testado visualmente pelo humano.

### Objetivo

Ligar `FEATURE_SIMPLES_NACIONAL_LOOKUP = "true"` apenas no ambiente de staging e validar end-to-end com CNPJ público antes de tocar em produção.

### Pré-condições

1. Tarefa 2 concluída em staging.
2. Branch F-001 testada em preview Netlify (humano executou smoke visual).
3. Plano: rodar **apenas em staging** — nunca subir flag em prod sem passar por aqui.
4. Janela: qualquer hora — staging não tem usuários finais.

### Operação (cole no Cursor Agent)

```
Usando Supabase MCP (projeto xxoiqfraeolsqsmsheue, ambiente staging),
execute os seguintes passos:

1. Trocar o valor do secret FEATURE_SIMPLES_NACIONAL_LOOKUP para "true"
   em staging. Confirmar no `supabase secrets list`.

2. Aguardar 30s (propagação das Edge Functions).

3. Via Supabase SQL Editor (ou MCP), criar 1 cliente PJ de teste usando
   um CNPJ público válido — sugestão: Magazine Luiza (CNPJ 47.960.950/0001-21).
   Usar chamada `POST /create-cliente-v2` autenticado como backoffice.

4. Verificar nos logs da Edge Function:
   - Evento `receitaws.lookup` com `outcome: "ok"` e CNPJ mascarado.
   - Row em `cliente` com `optante_simples_nacional` setado (true ou false)
     e `optante_simples_nacional_consultado_em` ≈ now().

5. Criar 1 pedido-de-teste para esse cliente e chamar
   `POST /tiny-enviar-pedido-venda-v1 { dry_run: true }`.
   - Confirmar log `natureza.resolvida` com `tinyValorEscolhido`
     coerente com a flag do cliente.
   - Confirmar log `receitaws.lookup` (revalidacao ocorreu no envio).

6. Reportar: [flag on + smoke passou | smoke falhou com <erro>].

Se falhar em qualquer passo, rodar Rollback imediatamente.
```

### Rollback

Trocar o secret de volta para `"false"`:

```
supabase secrets set FEATURE_SIMPLES_NACIONAL_LOOKUP=false
```

Verificar via `supabase secrets list` e testar que criar cliente PJ **não** emite `receitaws.lookup`.

### Critério de aceite da Tarefa 3

- [ ] Flag `FEATURE_SIMPLES_NACIONAL_LOOKUP = "true"` em staging.
- [ ] Criar cliente PJ com CNPJ público → `optante_simples_nacional` populado.
- [ ] Dry-run de pedido → logs `receitaws.lookup` e `natureza.resolvida` emitidos.
- [ ] Sem regressão em fluxos de cliente PF (consulta não é chamada — CA-002).

---

## Tarefa 4 — Ativar feature flag em produção

**Feature associada:** F-001 — Consulta Simples Nacional
**MCP:** Supabase MCP (projeto `xxoiqfraeolsqsmsheue`)
**Pré-requisito:** Tarefa 1 + 2 + 3 concluídas; PR mergeado em `main`; deploy Netlify de produção concluído.

### Objetivo

Ligar a feature flag em produção, após smoke verde em staging. Esta é a **única** operação em produção desta feature — todas as anteriores são preparação.

### Pré-condições

1. Tarefa 3 concluída em staging, smoke verde.
2. PR `feat/simples-nacional-lookup` mergeado; deploy Netlify de `main` rodando em proseller.app.br.
3. Backup recente confirmado (últimas 24h).
4. Horário de baixo tráfego preferencial (antes das 9h ou após 20h BR).
5. Humano em standby para monitorar primeiros 30 minutos pós-ligação.

### Operação (cole no Cursor Agent)

```
Usando Supabase MCP (projeto xxoiqfraeolsqsmsheue, ambiente PRODUCTION),
execute:

1. Trocar o valor do secret FEATURE_SIMPLES_NACIONAL_LOOKUP para "true"
   em PRODUÇÃO. Confirmar via `supabase secrets list`.

2. Aguardar 30s.

3. Monitorar logs por 5 minutos:
   - Volume de `receitaws.lookup` proporcional a criação de clientes PJ
     + envios de pedido PJ.
   - Qualquer `outcome: "timeout" | "rate_limited" | "invalid_response"`
     em volume > 5% é sinal de alerta — considerar Rollback.
   - Nenhum erro 5xx em `create-cliente-v2` ou `tiny-enviar-pedido-venda-v1`.

4. Pedir ao humano que faça 1 cadastro real de cliente PJ + 1 envio
   real de pedido, e valide visualmente que a NF Tiny sai com a
   natureza correta.

5. Reportar: [flag on em prod + smoke verde | Rollback executado por <motivo>].
```

### Rollback

Em caso de qualquer anomalia (taxa alta de falha ReceitaWS, erro 5xx, NF com regime errado):

```
supabase secrets set FEATURE_SIMPLES_NACIONAL_LOOKUP=false
```

Rollback da flag é **imediato** e reversível. A migration 108 não precisa ser revertida — colunas ficam lá, com valores `null` para clientes que ainda não foram consultados; comportamento pré-F-001 é restaurado ao desligar a flag (CA-008).

### Critério de aceite da Tarefa 4

- [ ] `FEATURE_SIMPLES_NACIONAL_LOOKUP = "true"` em produção.
- [ ] Primeiros 30 minutos sem 5xx ou taxa anormal de falha ReceitaWS.
- [ ] Validação manual pelo humano: 1 cadastro PJ + 1 envio Tiny com NF correta.
- [ ] `TODO.md §1` atualizado marcando F-001 como concluída com SHA/PR.

---

## Tarefa 5 — INC-013 · Vincular 32 clientes da Valéria Montoz

**Feature associada:** F-004 — Importação de clientes via planilha (correção pontual pós-import)
**MCP:** Supabase MCP (projeto `xxoiqfraeolsqsmsheue`)
**Data do incidente:** 2026-05-07
**Origem:** Valentim reportou via WhatsApp 14:07 — clientes da Valéria Montoz não ficaram vinculados a ela após import V 1.27 (planilha `2026.05.01_PROSELLER_CLIENTES_VEND MONTOZ.xlsx`).

### Causa raiz

O `findVendedor` do `ImportCustomersData.tsx` casa por email/nome exato/`includes` mútuo. A planilha do Sergio (V 1.27) tinha vendedor formatado como `SERGIO GLEZER (5984)` e casou. A planilha do Montoz tem `MONTOZ REPRESENTAÇÃO COMERCIAL LTDA` (razão social), que **não** casa com o nome da vendedora cadastrada no banco (presumivelmente `Valéria Montoz` ou similar). Os 32 clientes foram criados com `cliente.vendedoresatribuidos = NULL` (aviso não-bloqueante na lista de erros, conforme F-004 §"Não cobre"). Débito de matcher para o backlog.

### Objetivo

Setar `cliente.vendedoresatribuidos = ARRAY[<user_id_valeria>]::uuid[]` nos 32 clientes da planilha, identificados por `codigo` (chave Tiny). Sem reimport (que duplicaria os clientes — `handleConfirmImport` só faz INSERT, sem upsert).

### Pré-condições (rodar EM ORDEM, parar se qualquer falhar)

1. **Backup recente** confirmado nas últimas 24h.
2. **Pré-check 1 — vendedora Valéria existe e está ativa:**
   ```sql
   SELECT user_id, nome, email, tipo, ativo
   FROM public."user"
   WHERE (
     unaccent(lower(nome)) LIKE '%valeria%'
     OR unaccent(lower(nome)) LIKE '%montoz%'
     OR lower(email) LIKE '%montoz%'
     OR lower(email) LIKE '%valeria%'
   )
     AND deleted_at IS NULL
   ORDER BY ativo DESC, nome;
   ```
   Esperado: **1 linha** com `tipo='vendedor'` e `ativo=true`. **Anotar o `user_id` — ele é o `<USER_ID_VALERIA>` do UPDATE.** Se 0 linhas, parar e perguntar ao Valentim qual é a Valéria. Se >1 linhas, reportar e desambiguar com o humano antes de prosseguir.
3. **Pré-check 2 — confirmar os 32 clientes existem e auditar estado atual:**
   ```sql
   SELECT cliente_id, codigo, nome, vendedoresatribuidos, criado_por, created_at
   FROM public.cliente
   WHERE codigo IN (
     '5674','4874','2422','5359','696','10312','7059','6837','364',
     '2759','1338','7133','10454','10874','10388','5052','6938','5800',
     '10847','10446','5442','5376','6913','7003','7113','4486','6998',
     '7002','6084','5254','10034','10214'
   )
     AND deleted_at IS NULL
   ORDER BY codigo;
   ```
   Esperado: **32 linhas**. Se < 32, identificar quais códigos faltam — pode haver cliente que não foi importado (planilha rejeitada por validação) ou foi soft-deleted depois.

   **Auditoria crítica:** se algum cliente tiver `vendedoresatribuidos` **diferente de NULL/{}** já preenchido, pode ter sido reatribuído manualmente para outro vendedor depois do import — nesses casos, REMOVER o `codigo` da lista do UPDATE e reportar ao Valentim antes de prosseguir. Não sobrescrever vendedor legítimo.
4. **Backup pré-UPDATE** (CSV ou snapshot da query):
   ```sql
   -- Salvar resultado em docs/plans/backup_inc013_montoz_2026-05-07.csv
   SELECT cliente_id, codigo, nome, vendedoresatribuidos, atualizado_por, updated_at
   FROM public.cliente
   WHERE codigo IN (... mesma lista dos 32 ...)
     AND deleted_at IS NULL;
   ```
5. **`<USER_ID_VALENTIM>`** — o ator da operação para `atualizado_por`. Pegar do banco:
   ```sql
   SELECT user_id FROM public."user"
   WHERE email ILIKE '%valentim%' AND deleted_at IS NULL AND ativo = TRUE;
   ```
   Se não houver Valentim cadastrado como user (ele é cliente final, não user do sistema), usar o user_id de um backoffice ativo (perguntar ao Eduardo qual usar) ou deixar como `NULL` (a coluna aceita).

### SQL final (operação)

```sql
BEGIN;

-- Dry-run: confirmar quantas linhas serão afetadas
SELECT COUNT(*) AS linhas_afetadas
FROM public.cliente
WHERE codigo IN (
  '5674','4874','2422','5359','696','10312','7059','6837','364',
  '2759','1338','7133','10454','10874','10388','5052','6938','5800',
  '10847','10446','5442','5376','6913','7003','7113','4486','6998',
  '7002','6084','5254','10034','10214'
)
  AND deleted_at IS NULL;
-- Esperado: 32 (ou menor, se passo 3 da pré-condição removeu algum código).

-- UPDATE efetivo
UPDATE public.cliente
SET vendedoresatribuidos = ARRAY['<USER_ID_VALERIA>']::uuid[],
    atualizado_por = '<USER_ID_BACKOFFICE>'::uuid,  -- ou NULL se não houver
    updated_at = NOW()
WHERE codigo IN (
  '5674','4874','2422','5359','696','10312','7059','6837','364',
  '2759','1338','7133','10454','10874','10388','5052','6938','5800',
  '10847','10446','5442','5376','6913','7003','7113','4486','6998',
  '7002','6084','5254','10034','10214'
)
  AND deleted_at IS NULL;
-- Esperado: UPDATE 32 (ou número confirmado no dry-run).

-- Verificação inline antes do COMMIT
SELECT codigo, nome, vendedoresatribuidos, updated_at
FROM public.cliente
WHERE codigo IN ('5674','4874','2422','5359','696')  -- amostra de 5
  AND deleted_at IS NULL
ORDER BY codigo;
-- Esperado: vendedoresatribuidos = {<USER_ID_VALERIA>} em todas, updated_at ≈ now.

COMMIT;
```

**Se a verificação inline mostrar algo errado, executar `ROLLBACK;` e investigar.**

### Smoke test pós-COMMIT

```sql
-- 1. Confirmar que os 32 clientes têm Valéria como vendedora
SELECT COUNT(*) AS clientes_com_valeria
FROM public.cliente
WHERE codigo IN (... mesma lista ...)
  AND vendedoresatribuidos @> ARRAY['<USER_ID_VALERIA>']::uuid[]
  AND deleted_at IS NULL;
-- Esperado: 32 (ou número confirmado).

-- 2. Confirmar que nenhum outro cliente teve vendedor alterado nos últimos 5 minutos
-- (segurança contra UPDATE acidentalmente amplo)
SELECT COUNT(*) AS clientes_recentes
FROM public.cliente
WHERE updated_at > NOW() - INTERVAL '5 minutes'
  AND deleted_at IS NULL;
-- Esperado: 32 (apenas os do UPDATE).
```

**Validação humana:** Valentim abre 2-3 dos clientes na UI (codigo 5674 SIDNEI SEIKI, 4874 BELFACE, 2422 BELFACE SAO CAETANO) e confirma que Valéria aparece como vendedora.

### Rollback (OBRIGATÓRIO — Cenário C produção)

**Quando usar:**
- Smoke test mostrou clientes sem Valéria.
- Valentim reportou que algum dos 32 clientes não deveria ter Valéria (era de outro vendedor).
- UPDATE pegou clientes além dos 32 esperados.

**Como reverter:** usar o CSV de backup do passo 4 das pré-condições.

```sql
-- Para cada linha do CSV de backup, gerar um UPDATE reverso:
UPDATE public.cliente
SET vendedoresatribuidos = <valor_original_do_csv>,
    atualizado_por = <atualizado_por_original>,
    updated_at = <updated_at_original>
WHERE cliente_id = <cliente_id_do_csv>;
```

Para o caso onde `vendedoresatribuidos` original era `NULL`, usar `vendedoresatribuidos = NULL` no UPDATE de rollback (não `ARRAY[]::uuid[]`).

**Janela de rollback:** 7 dias. Após isso, o cliente pode ter recebido novos pedidos atrelados ao vínculo da Valéria — reverter quebra histórico.

### Critério de aceite da Tarefa 5

- [ ] Pré-check 1 retornou exatamente 1 vendedora Valéria ativa.
- [ ] Pré-check 2 retornou 32 clientes (ou lista ajustada após auditoria).
- [ ] Backup CSV salvo em `docs/plans/backup_inc013_montoz_2026-05-07.csv`.
- [ ] UPDATE rodou em transação, COMMIT após verificação inline.
- [ ] Smoke test: 32 clientes com Valéria; nenhum cliente fora da lista alterado.
- [ ] Validação humana: Valentim confirmou na UI em 2-3 clientes.
- [ ] `TODO.md §5` recebeu entrada **INC-013** documentando causa raiz, resolução e link para esta seção.
- [ ] Bullet adicionado ao tooltip do sidebar (V 1.30 ou bullet adicional na V 1.29 se ainda não foi promovida): "Vínculo dos 32 clientes da Valéria Montoz restaurado (INC-013)."
- [ ] Débito técnico em `TODO.md §4`: "Matcher de vendedor no `ImportCustomersData` falha quando planilha usa razão social no lugar do nome do vendedor. Adicionar fallback (aceitar `email` ou `user_id` literal na coluna 'Vendedor (Email)') na próxima feature que tocar o componente."

---

## Tarefa 6 — Migration 115 · busca clientes (unaccent + CNPJ digits + grupo)

**Feature associada:** ajuste pontual reportado por Valentim em 13/05/2026.
**MCP:** Supabase MCP (projeto `xxoiqfraeolsqsmsheue`)
**Arquivo:** `supabase/migrations/115_unaccent_cnpj_grupo_search_list_clientes_v2.sql`

### Motivação

Reportes do Valentim em 13/05 09:01–09:13:
- Buscar `DROGARIA SAO` não retorna `DROGARIA SÃO …` (acento).
- Buscar `48617921000124` (só dígitos) não encontra cliente cadastrado como `48.617.921/0001-24`.
- Buscar `DPSP` (Grupo/Rede) não retorna os clientes do grupo.

A RPC atual (`026_fix_list_clientes_v2_signature.sql`) faz `LOWER(c.nome) LIKE …` — sem unaccent, sem normalização digits-only, sem `grupo_rede`.

### Pré-condições

1. **Backup do estado atual da função** (executar via MCP `execute_sql` e salvar saída):
   ```sql
   SELECT pg_get_functiondef(oid)
   FROM pg_proc
   WHERE proname = 'list_clientes_v2'
     AND pg_function_is_visible(oid);
   ```
   Salvar resultado em `docs/plans/backup_list_clientes_v2_pre_115.sql`.
2. **Confirmar extensão `unaccent` disponível ou instalável:**
   ```sql
   SELECT 1 FROM pg_available_extensions WHERE name = 'unaccent';
   ```
   Se não estiver disponível, parar e reportar ao Eduardo. A migration faz `CREATE EXTENSION IF NOT EXISTS unaccent;`.
3. **Verificar se já há outra versão de `unaccent` instalada em outro schema** (pode causar conflito):
   ```sql
   SELECT extname, extnamespace::regnamespace FROM pg_extension WHERE extname = 'unaccent';
   ```
   Se já existir em `public` ou `extensions`, nada a fazer — `IF NOT EXISTS` é idempotente.

### Comando MCP

```
mcp__supabase__apply_migration({
  name: '115_unaccent_cnpj_grupo_search_list_clientes_v2',
  query: <conteúdo de supabase/migrations/115_unaccent_cnpj_grupo_search_list_clientes_v2.sql>
})
```

### Smoke test pós-aplicação

```sql
-- 1) Acento-insensível
SELECT codigo, nome FROM public.cliente
WHERE deleted_at IS NULL
  AND unaccent(LOWER(nome)) LIKE '%' || unaccent(LOWER('drogaria sao')) || '%'
LIMIT 5;
-- Esperado: retornar clientes com "DROGARIA SÃO ..." no nome.

-- 2) CNPJ digits-only
SELECT * FROM list_clientes_v2(
  p_limit := 5, p_page := 1,
  p_requesting_user_id := '<USER_ID_BACKOFFICE>'::uuid,
  p_search := '48617921000124'
);
-- Esperado: clientes cujo cpf_cnpj puro contém '48617921000124'.

-- 3) Grupo/Rede
SELECT * FROM list_clientes_v2(
  p_limit := 5, p_page := 1,
  p_requesting_user_id := '<USER_ID_BACKOFFICE>'::uuid,
  p_search := 'DPSP'
);
-- Esperado: clientes com grupo_rede ILIKE '%DPSP%'.
```

### Rollback (OBRIGATÓRIO)

Reaplicar o conteúdo de `supabase/migrations/026_fix_list_clientes_v2_signature.sql` via:
```
mcp__supabase__apply_migration({
  name: 'rollback_115_list_clientes_v2',
  query: <conteúdo de 026_fix_list_clientes_v2_signature.sql>
})
```
A extensão `unaccent` instalada **não precisa** ser removida no rollback (custo zero deixar instalada).

### Critério de aceite da Tarefa 6

- [ ] Backup `pg_get_functiondef` salvo.
- [ ] `apply_migration` retornou OK.
- [ ] Smoke 1 (acento): pelo menos 1 linha retornada.
- [ ] Smoke 2 (CNPJ digits): cliente correto retornado.
- [ ] Smoke 3 (grupo): pelo menos 1 linha retornada.
- [ ] Vendedor logado (não backoffice) testado: continua vendo apenas os clientes dele (RLS lógica preservada).

---

## Tarefa 7 — Preencher idtiny dos vendedores CANTICO/ES (Empresa-VD-ES + Eric)

**Origem:** Valentim 12/05/2026 17:34 + 20:46 + 21:44. Karen e Eric atendem clientes pela CANTICO/ES.

### Descobertas da investigação (13/05/2026, sessão Claude Code)

Os 2 vendedores que as planilhas referenciam **já existem** no banco — `findVendedor` em `ImportCustomersData.tsx` casa por **nome exato** (não precisa de email). O que está faltando é o `idtiny`:

| `user_id` | nome | email | idtiny atual |
|---|---|---|---|
| `48163ed8-bde1-416e-ab7a-61ffaa65ab63` | `Empresa - Venda Direta ES` | `vendas1@median.com.br` | **NULL** |
| `b2611a0a-49a1-4c22-8474-15985a8570b7` | `Eric Vidal Ferreira` | `ge.representacoesltda@gmail.com` | **NULL** |

Sem `idtiny`, qualquer pedido vinculado a esses vendedores vai bater na validação `Vendedor sem idtiny para envio ao Tiny` (`tiny-enviar-pedido-venda-v1/index.ts:262`). **Cadastrar novo vendedor não é necessário** — basta o Valentim informar os 2 `idtiny` (um por linha) que vamos preencher pela UI (Configurações → Vendedores) ou via SQL pelo Cursor MCP.

### Pré-condição (BLOQUEANTE)

**Confirmar com Valentim por WhatsApp**:
1. `idtiny` no Tiny CANTICO para o vendedor genérico `Empresa - Venda Direta ES`.
2. `idtiny` no Tiny CANTICO para `Eric Vidal Ferreira`.
3. Confirmar `nome_fantasia` correspondente em cada registro Tiny (texto livre, só auditoria — não vai mais para o payload depois do fix da Tarefa A).

### Operação preferida (UI)

1. Configurações → Vendedores → buscar `Empresa - Venda Direta ES` → preencher `idtiny`.
2. Mesmo para `Eric Vidal Ferreira`.

### Operação alternativa (Cursor MCP, se a UI bloquear)

```sql
BEGIN;
UPDATE public.dados_vendedor
SET idtiny = '<IDTINY_VD_ES>',
    nome_fantasia = COALESCE(NULLIF('<NOME_FANTASIA_VD_ES>',''), nome_fantasia),
    updated_at = NOW()
WHERE user_id = '48163ed8-bde1-416e-ab7a-61ffaa65ab63'::uuid;

UPDATE public.dados_vendedor
SET idtiny = '<IDTINY_ERIC>',
    nome_fantasia = COALESCE(NULLIF('<NOME_FANTASIA_ERIC>',''), nome_fantasia),
    updated_at = NOW()
WHERE user_id = 'b2611a0a-49a1-4c22-8474-15985a8570b7'::uuid;

-- Verificação inline
SELECT user_id, idtiny, nome_fantasia FROM public.dados_vendedor
WHERE user_id IN ('48163ed8-bde1-416e-ab7a-61ffaa65ab63'::uuid,
                  'b2611a0a-49a1-4c22-8474-15985a8570b7'::uuid);

COMMIT;
```

### Observação sobre o import (13/05/2026)

As planilhas Karen e Eric trazem a coluna **`Vendedor`** com o **nome** do vendedor (texto, não email). O `COLUMN_MAP` em `ImportCustomersData.tsx:82` já mapeia essa coluna para a chave canônica, e o `findVendedor` (`ImportCustomersData.tsx:364-377`) tem 3 níveis de match: email exato → nome exato → `includes` mútuo. Karen casa por **nome exato** com `Empresa - Venda Direta ES` (já cadastrado no banco) e Eric casa por nome exato com `Eric Vidal Ferreira`. **Nenhum ajuste de código é necessário para o import** — desde que os vendedores estejam ativos e o nome cadastrado no banco bata literalmente com a planilha.

### Audit de conflitos das planilhas (rodado em 13/05/2026)

Detectado via SQL (`cliente.codigo` ou `digits(cliente.cpf_cnpj)`):

| Planilha | Total linhas | Conflito por código | Conflito só por CNPJ | Novos (sem conflito) |
|---|---:|---:|---:|---:|
| Karen | 49 | 3 | 42 | **4** |
| Eric  | 59 | 2 | 34 | **23** |

**Implicação operacional para o Valentim:** se ele rodar o import via Configurações → Importação de Dados sem nenhuma mudança, **81/108 linhas vão falhar silenciosamente na unique constraint** (déjà vu do INC-013 — registrado em `TODO.md §4`). O componente `ImportCustomersData.tsx` precisa do toggle "Atualizar existentes" antes de qualquer rodada significativa. Enquanto isso não estiver pronto, sugestão de operação:

- Importar apenas as 4 (Karen) + 23 (Eric) linhas novas — copiar essas linhas para uma planilha derivada.
- Para os clientes que já existem, atualizar manualmente vendedor + `lista_preco` + `empresa_faturamento` pelas telas individuais (ou aguardar a feature de upsert).

### Rollback

`UPDATE public.dados_vendedor SET idtiny = NULL, nome_fantasia = NULL WHERE user_id = ...;` — reverte para o estado pré-fix. Pedidos vinculados ao vendedor voltam a recusar envio com `Vendedor sem idtiny`, mas nenhum dado de cliente é perdido.

### Critério de aceite da Tarefa 7

- [ ] Valentim confirmou `idtiny` dos 2 vendedores.
- [ ] `dados_vendedor.idtiny` preenchido em ambos.
- [ ] Smoke: pedido teste com cada vendedor é aceito pelo Tiny.
- [ ] Valentim ciente da limitação do import (não rodar antes do toggle de upsert).

---

## Tarefa 8 — F-LOG-CRM R-LOG-1 (migration 119 + 4 Edge Functions, **PROD ONLY** com rede reforçada)

**Feature associada:** F-LOG-CRM R-LOG-1 (`feat/log-crm-R-LOG-1`, mergeada em `main` via PR #22, merge commit `ad817aa`)
**MCP:** Supabase MCP (projeto `xxoiqfraeolsqsmsheue`)
**Tipos Zod espelhados:**
- `packages/shared/types/transportador-logistica.ts`
- `packages/shared/types/regiao-origem.ts`
- `packages/shared/types/frete-logistica.ts`
- `packages/shared/types/fatura-transportadora.ts`

> **⚠️ Desvio do padrão "staging primeiro":** Org Median está no plano Free do Supabase, sem Branching/staging dedicado disponível. Esta tarefa é **PROD ONLY**, com rede de proteção reforçada (pg_dump, janela fora do expediente, smoke ampliado, 7 dias de observação com flag OFF). Decisão e justificativa em `docs/plans/DECISIONS_LOG.md` 2026-05-20. Histórico: migrations 001..115 já foram aplicadas direto em prod com brief + rollback + smoke. R-LOG-3+ vai exigir staging — abrir plano de upgrade Supabase quando essa onda chegar.

### Objetivo

Aplicar a migration `119_frete_logistica_base.sql` (7 tabelas novas + 4 ENUMs + RLS + indexes) **direto em produção** e deployar as 4 Edge Functions (`transportador-logistica-v1`, `regiao-destino-v1`, `origem-frete-v1`, `frete-logistica-v1`) via Supabase CLI local. Risco operacional baixo porque:

1. Migration 119 é DDL puramente **aditivo** — apenas `CREATE TABLE`/`CREATE TYPE`/`CREATE INDEX`/`CREATE POLICY`. Zero `ALTER` em tabela existente, zero `DROP`.
2. As 7 tabelas novas são **isoladas** — nenhum código de produção (frontend, Edge Functions existentes, RPCs) consulta elas. Vetor de quebra em `cliente`/`pedido_venda`/`comissao` é **zero**.
3. Feature flags `FEATURE_LOG_CRM` (Supabase) e `VITE_FEATURE_LOG_CRM` (Netlify) nascem **`false`/ausentes**. Edge Functions retornam 503 e frontend não exibe menu até alguém ligar.
4. Rollback trivial: 7 `DROP TABLE` em ordem inversa + 4 `DROP TYPE` + 4 `supabase functions delete`.

### Pré-condições (rodar EM ORDEM, parar se qualquer falhar)

1. **Backup pré-migration via `pg_dump --schema-only`** do projeto `xxoiqfraeolsqsmsheue` — salvar como `docs/plans/backup_prod_pre_119_<YYYY-MM-DD>.sql`. Adicionar `backup_prod_*.sql` ao `.gitignore` se ainda não estiver (arquivos grandes, sem segredos de payload mas com schema completo — não publicar). Comando referência (rodar local com credenciais do humano):
   ```powershell
   pg_dump --schema-only --no-owner --no-acl `
     "postgresql://postgres.xxoiqfraeolsqsmsheue:<DB_PASSWORD>@aws-0-us-east-2.pooler.supabase.com:5432/postgres" `
     > docs/plans/backup_prod_pre_119_$(Get-Date -Format yyyy-MM-dd).sql
   ```
   Esperado: arquivo > 200 KB com `CREATE TABLE public.cliente` etc. Se vazio ou erro, **parar** e investigar antes de prosseguir.
2. **Janela operacional fora do expediente do cliente.** Aplicar antes das 8h ou após 19h BRT (Cântico opera durante o comercial). DDL aditivo tem lock metadata-only, mas a janela é margem de segurança.
3. **Confirmar `FEATURE_LOG_CRM` ausente/`'false'` no Supabase Dashboard**: Project Settings › Edge Functions › Secrets. Visualmente, antes de aplicar. Print/screenshot opcional, mas se ligado, **abortar**.
4. **Confirmar `VITE_FEATURE_LOG_CRM` ausente/`'false'` no Netlify Dashboard**: Site `proseller.app.br` › Site settings › Environment variables. Visualmente. Se ligado, **abortar**.
5. **Confirmar branch `main` atualizada** com migration `119_frete_logistica_base.sql` (já está — PR #22 mergeada como `ad817aa`):
   ```bash
   git log --oneline main -1 -- supabase/migrations/119_frete_logistica_base.sql
   ```
   Esperado: SHA de um commit da branch `feat/log-crm-R-LOG-1` (parte da PR #22). Se vazio, parar.
6. **Audit "0 linhas"** — as 7 tabelas-alvo ainda não existem em prod:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema='public'
     AND table_name IN ('transportador_logistica','regiao_destino','origem_frete',
                        'frete_logistica','frete_logistica_ocorrencia',
                        'fatura_transportadora','fatura_transportadora_item');
   -- Esperado: 0 linhas. Se >0, parar e investigar (alguém aplicou manual?).
   ```
7. **Audit "0 ENUMs"** — os 4 ENUMs também não existem:
   ```sql
   SELECT typname FROM pg_type
   WHERE typname IN ('status_entrega_frete','tipo_ocorrencia_ssw',
                     'grupo_transportador','status_fatura_transportadora');
   -- Esperado: 0 linhas.
   ```

### Operação — Etapa A · Migration via Cursor MCP (NUNCA `execute_sql` para DDL)

```
Usando Supabase MCP (projeto xxoiqfraeolsqsmsheue, ambiente PRODUCTION),
aplique a migration 119_frete_logistica_base.sql.

Pré-checks executados (confirme antes de prosseguir):
- pg_dump backup salvo em docs/plans/backup_prod_pre_119_<data>.sql
- Janela operacional fora do expediente confirmada (antes 8h ou após 19h BRT)
- FEATURE_LOG_CRM ausente/'false' no Supabase Dashboard (visualmente)
- VITE_FEATURE_LOG_CRM ausente/'false' no Netlify Dashboard (visualmente)
- Audits 6 e 7 (0 linhas em tables + 0 linhas em pg_type) verdes

Etapas:
1. mcp__supabase__apply_migration({
     name: '119_frete_logistica_base',
     query: <conteúdo de supabase/migrations/119_frete_logistica_base.sql>
   })
   IMPORTANTE: use apply_migration, NUNCA execute_sql para DDL — runbook v3.2.
2. Rodar o smoke (5 SELECTs abaixo) — esperar 7 linhas em tabelas, 4 em tipos,
   7 com rowsecurity=true, 7+ policies, 2 índices únicos parciais.
3. Reportar: [aplicada | falhou com <erro>].
4. Se falhar, executar Rollback imediato (seção "Rollback" abaixo).

NÃO cadastre FEATURE_LOG_CRM='true' nesta operação. Flag entra em sessão
separada, após 7 dias de observação com flag OFF + Edge Functions vivas.
```

### Smoke test pós-apply (5 SELECTs)

```sql
-- 1) 7 tabelas criadas
SELECT table_name FROM information_schema.tables
WHERE table_schema='public'
  AND table_name IN ('transportador_logistica','regiao_destino','origem_frete',
                     'frete_logistica','frete_logistica_ocorrencia',
                     'fatura_transportadora','fatura_transportadora_item')
ORDER BY table_name;
-- Esperado: 7 linhas.

-- 2) 4 ENUMs criados
SELECT typname FROM pg_type
WHERE typname IN ('status_entrega_frete','tipo_ocorrencia_ssw',
                  'grupo_transportador','status_fatura_transportadora')
ORDER BY typname;
-- Esperado: 4 linhas.

-- 3) RLS habilitada em todas
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname='public'
  AND tablename IN ('transportador_logistica','regiao_destino','origem_frete',
                    'frete_logistica','frete_logistica_ocorrencia',
                    'fatura_transportadora','fatura_transportadora_item')
ORDER BY tablename;
-- Esperado: 7 linhas, todas rowsecurity=true.

-- 4) Pelo menos 1 policy SELECT por tabela
SELECT tablename, policyname, cmd FROM pg_policies
WHERE schemaname='public'
  AND tablename IN ('transportador_logistica','regiao_destino','origem_frete',
                    'frete_logistica','frete_logistica_ocorrencia',
                    'fatura_transportadora','fatura_transportadora_item')
ORDER BY tablename;
-- Esperado: 7+ linhas (1 policy SELECT por tabela).

-- 4b) Índices únicos parciais para idempotência do hook R-LOG-3
SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname='public' AND tablename='frete_logistica'
  AND indexname IN ('uq_frete_logistica_empresa_nfe','uq_frete_logistica_chave_acesso');
-- Esperado: 2 linhas, ambas com "UNIQUE" e "WHERE" no indexdef.

-- 4c) FK frete_logistica.vendedor_id → public."user".user_id existe
SELECT conname, conrelid::regclass AS tabela_origem,
       confrelid::regclass AS tabela_alvo
FROM pg_constraint
WHERE contype='f'
  AND conrelid='public.frete_logistica'::regclass
  AND confrelid='public."user"'::regclass;
-- Esperado: 1 linha (FK do vendedor_id).

-- 5) Tabelas vazias
SELECT 'transportador_logistica' tab, COUNT(*) FROM public.transportador_logistica
UNION ALL SELECT 'regiao_destino', COUNT(*) FROM public.regiao_destino
UNION ALL SELECT 'origem_frete', COUNT(*) FROM public.origem_frete
UNION ALL SELECT 'frete_logistica', COUNT(*) FROM public.frete_logistica
UNION ALL SELECT 'frete_logistica_ocorrencia', COUNT(*) FROM public.frete_logistica_ocorrencia
UNION ALL SELECT 'fatura_transportadora', COUNT(*) FROM public.fatura_transportadora
UNION ALL SELECT 'fatura_transportadora_item', COUNT(*) FROM public.fatura_transportadora_item;
-- Esperado: todos count=0.
```

**Algum smoke falhou?** Rodar **Rollback** imediato e reportar.

### Operação — Etapa B · Deploy das 4 Edge Functions via Supabase CLI **local** (ADR-005, MCP PROIBIDO)

ADR-005 proíbe `deploy_edge_function` via Cursor MCP (INC-001 publicou stub `// test` em produção em 24/abr). Deploy **só** via CLI local.

```powershell
# rodar a partir da raiz do repo, branch main atualizada
git checkout main
git pull
git rev-parse --short HEAD  # anotar o SHA — vai pra TODO.md

npx supabase functions deploy transportador-logistica-v1 --project-ref xxoiqfraeolsqsmsheue
npx supabase functions deploy regiao-destino-v1          --project-ref xxoiqfraeolsqsmsheue
npx supabase functions deploy origem-frete-v1            --project-ref xxoiqfraeolsqsmsheue
npx supabase functions deploy frete-logistica-v1         --project-ref xxoiqfraeolsqsmsheue
```

Cada comando deve imprimir `Deployed Function <nome> on project xxoiqfraeolsqsmsheue` e retornar exit 0. Se algum falhar, **abortar deploys subsequentes** e rodar Rollback (seção abaixo) para as funções já deployadas + para a migration (decisão de produto: voltar ou ficar com parcial — registrar).

### Smoke test pós-deploy (4 curls OPTIONS)

Rodar do terminal local após os 4 deploys:

```powershell
$base = "https://xxoiqfraeolsqsmsheue.supabase.co/functions/v1"
foreach ($fn in @('transportador-logistica-v1','regiao-destino-v1','origem-frete-v1','frete-logistica-v1')) {
  $r = curl.exe -s -o $null -w "%{http_code}" -X OPTIONS "$base/$fn"
  Write-Host "$fn → $r"
}
```

**Esperado para todas as 4:** HTTP `200` (CORS preflight retornado pelo `if (req.method === 'OPTIONS')` no início de cada Edge Function). HTTP `503` aqui significaria que a função verificou a flag — não deveria, OPTIONS não passa pelo gate. HTTP `404` significa que o deploy falhou.

**Smoke do gate de flag (esperado 503):** sem flag ligada, GET autenticado deve retornar 503.

```powershell
# precisa de token de backoffice válido — substituir <TOKEN>
$tok = "<TOKEN>"
$base = "https://xxoiqfraeolsqsmsheue.supabase.co/functions/v1"
foreach ($fn in @('transportador-logistica-v1','regiao-destino-v1','origem-frete-v1','frete-logistica-v1')) {
  $r = curl.exe -s -o $null -w "%{http_code}" -H "Authorization: Bearer $tok" "$base/$fn"
  Write-Host "$fn (GET sem flag) → $r"
}
```

**Esperado para todas as 4:** HTTP `503` com body contendo `"Logística feature flag desligada"` — confirma que o gate de `FEATURE_LOG_CRM` funciona. Se retornar 200, há algo errado com o secret — investigar.

### Janela de observação de 7 dias com flag OFF

Após Etapa B verde:

- **Não ligar `FEATURE_LOG_CRM='true'` nem `VITE_FEATURE_LOG_CRM='true'` por 7 dias.**
- Durante a janela, R-LOG-2 (próxima onda — telas Torre/Busca/Detalhe) pode ser desenvolvida e mergeada em paralelo (frontend mock-friendly, gate OFF).
- Após 7 dias sem alertas, abrir Tarefa 9 (futura, ainda não escrita): "Ativar FEATURE_LOG_CRM em prod com smoke E2E do Valentim". Pré-requisitos da Tarefa 9: R-LOG-2 mergeada, smoke local com `VITE_FEATURE_LOG_CRM=true` no `.env.local`, plano de cadastro inicial (transportadores Cântico).

### Rollback (OBRIGATÓRIO — Cenário C produção)

**Quando usar:**
- Smoke da Etapa A falhou (qualquer das 6 queries).
- Smoke OPTIONS pós-deploy retornou 404 ou 5xx persistente.
- Decisão de descartar F-LOG-CRM antes de ligar a flag.
- Anomalia inesperada (FK, conflict de naming, alerta Supabase).

**Pré-rollback:** confirmar que nenhuma linha foi inserida nas 7 tabelas (esperado: zero, porque flags estão OFF):
```sql
SELECT 'transportador_logistica', COUNT(*) FROM public.transportador_logistica
UNION ALL SELECT 'regiao_destino', COUNT(*) FROM public.regiao_destino
UNION ALL SELECT 'origem_frete', COUNT(*) FROM public.origem_frete
UNION ALL SELECT 'frete_logistica', COUNT(*) FROM public.frete_logistica
UNION ALL SELECT 'frete_logistica_ocorrencia', COUNT(*) FROM public.frete_logistica_ocorrencia
UNION ALL SELECT 'fatura_transportadora', COUNT(*) FROM public.fatura_transportadora
UNION ALL SELECT 'fatura_transportadora_item', COUNT(*) FROM public.fatura_transportadora_item;
-- Esperado: todos 0.
```
Se >0 em qualquer linha, **parar e exportar o conteúdo antes de dropar** (`COPY ... TO STDOUT` via MCP) — registra perda de dado no DECISIONS_LOG.

**Rollback Etapa B — deletar as 4 Edge Functions:**
```powershell
npx supabase functions delete transportador-logistica-v1 --project-ref xxoiqfraeolsqsmsheue
npx supabase functions delete regiao-destino-v1          --project-ref xxoiqfraeolsqsmsheue
npx supabase functions delete origem-frete-v1            --project-ref xxoiqfraeolsqsmsheue
npx supabase functions delete frete-logistica-v1         --project-ref xxoiqfraeolsqsmsheue
```

**Rollback Etapa A — dropar tabelas + ENUMs em ordem inversa de criação (respeita FKs):**
```sql
DROP TABLE IF EXISTS public.fatura_transportadora_item CASCADE;
DROP TABLE IF EXISTS public.fatura_transportadora CASCADE;
DROP TABLE IF EXISTS public.frete_logistica_ocorrencia CASCADE;
DROP TABLE IF EXISTS public.frete_logistica CASCADE;
DROP TABLE IF EXISTS public.origem_frete CASCADE;
DROP TABLE IF EXISTS public.regiao_destino CASCADE;
DROP TABLE IF EXISTS public.transportador_logistica CASCADE;

DROP TYPE IF EXISTS public.status_fatura_transportadora;
DROP TYPE IF EXISTS public.grupo_transportador;
DROP TYPE IF EXISTS public.tipo_ocorrencia_ssw;
DROP TYPE IF EXISTS public.status_entrega_frete;
```

**Pós-rollback:**
1. Smoke ré-rodado: 0 linhas em tabelas + 0 linhas em pg_type.
2. Restore opcional do schema antigo via `psql < docs/plans/backup_prod_pre_119_<data>.sql` — **só se** o smoke confirmar que alguma tabela existente foi afetada (não deveria — DDL aditivo isolado).
3. Reverter o commit da migration no git: `git log --grep='migration 119' -1 --format=%H` → `git revert <SHA>`. Como a migration veio da PR #22 mergeada (commit `ad817aa`), o revert mexe em arquivos de várias features — preferível **criar nova migration 120 com `DROP TABLE ... CASCADE; DROP TYPE ...`** se quisermos persistir o rollback no histórico do schema (não bloqueante; o repo só precisa que o estado de prod fique limpo).
4. Atualizar `TODO.md §1` reinserindo "Migration 119 + 4 Edge Functions" como pendente.
5. Registrar incidente em `TODO.md §5` (se anomalia técnica) ou `DECISIONS_LOG.md` (se decisão estratégica).

### Critério de aceite da Tarefa 8

- [ ] Backup `pg_dump --schema-only` salvo em `docs/plans/backup_prod_pre_119_<data>.sql`.
- [ ] Janela operacional fora do expediente (antes 8h ou após 19h BRT) confirmada.
- [ ] `FEATURE_LOG_CRM` ausente/`'false'` no **Supabase Dashboard** (validado visualmente).
- [ ] `VITE_FEATURE_LOG_CRM` ausente/`'false'` no **Netlify Dashboard** (validado visualmente).
- [ ] Audit pré-apply: 0 tabelas + 0 ENUMs com nomes-alvo.
- [ ] `apply_migration` retornou OK (NÃO via `execute_sql`).
- [ ] Smoke 1–4c + 5 verdes em prod.
- [ ] 4 Edge Functions deployadas via `npx supabase functions deploy` (NÃO via MCP).
- [ ] 4 curls OPTIONS retornaram HTTP 200.
- [ ] 4 GETs autenticados (com token backoffice) retornaram HTTP 503 (gate da flag funcionando).
- [ ] Janela de observação 7 dias com flag OFF agendada em `TODO.md §1` (data alvo registrada).
- [ ] `TODO.md §1` atualizado: migration 119 aplicada + 4 funções deployadas, com SHA + timestamp.
- [ ] Wiki atualizada: `docs/wiki/log.md` recebeu entrada `YYYY-MM-DD · [RELEASE] · F-LOG-CRM R-LOG-1 prod (migration 119 + 4 EF, flag OFF) · <SHA>`.

---

## Tarefa 9 — F-LOG-CRM R-LOG-2 · Bucket Storage `logistica-comprovantes`

**Feature associada:** F-LOG-CRM R-LOG-2 (Torre de Controle + Detalhe do frete).
**MCP:** Supabase MCP (projeto `xxoiqfraeolsqsmsheue`) — operação leve em Storage (sem DDL, sem deploy).
**Cenário:** A/B (operação reversível: bucket vazio = `DELETE` simples; sem dados de produção dependentes ainda).

### Operação

Criar bucket Storage **privado** chamado `logistica-comprovantes` e abrir policies para usuários autenticados (`role = authenticated`) lerem e escreverem em qualquer caminho. O frontend (`FreteDetalhePage`) faz upload em `frete-<freteId>/<campo>-<timestamp>.<ext>` e gera signed URL de 1 ano para preview.

### Pré-condições

- [ ] R-LOG-2 mergeada em `main` (esta sessão).
- [ ] Confirmar via MCP que o bucket ainda não existe: `select * from storage.buckets where id = 'logistica-comprovantes';` → 0 linhas.

### Comandos no Cursor (MCP Supabase)

```sql
-- 1) Criar bucket privado.
insert into storage.buckets (id, name, public)
values ('logistica-comprovantes', 'logistica-comprovantes', false)
on conflict (id) do nothing;

-- 2) Policy de upload (INSERT) para autenticados.
create policy "logistica_comprovantes_authenticated_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'logistica-comprovantes');

-- 3) Policy de leitura (SELECT) para autenticados.
create policy "logistica_comprovantes_authenticated_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'logistica-comprovantes');

-- 4) Policy de atualização (UPDATE) — opcional, para reupload do mesmo path.
create policy "logistica_comprovantes_authenticated_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'logistica-comprovantes')
  with check (bucket_id = 'logistica-comprovantes');

-- 5) Policy de deleção (DELETE) — opcional, para limpeza eventual.
create policy "logistica_comprovantes_authenticated_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'logistica-comprovantes');
```

> Operações 2–5 podem ser feitas por `execute_sql` (não são DDL de schema, são DML + policy em `storage`). `apply_migration` também aceita. Não há tabela nova.

### Smoke pós-criação

- [ ] `select id, name, public from storage.buckets where id = 'logistica-comprovantes';` → 1 linha, `public = false`.
- [ ] `select policyname, cmd from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'logistica_comprovantes_%';` → 4 linhas (insert/select/update/delete).
- [ ] Em `proseller.app.br` (usuário backoffice): abrir Logística > Detalhe de um frete > Editar > Tirar foto / Anexar; confirmar que aparece "Frete atualizado com sucesso" + link de "Ver comprovante" funcional.

### Rollback (Cenário A — reversível por DELETE simples)

```sql
-- Apaga policies.
drop policy if exists "logistica_comprovantes_authenticated_insert" on storage.objects;
drop policy if exists "logistica_comprovantes_authenticated_select" on storage.objects;
drop policy if exists "logistica_comprovantes_authenticated_update" on storage.objects;
drop policy if exists "logistica_comprovantes_authenticated_delete" on storage.objects;

-- Apaga bucket (DEVE estar vazio; se houver arquivos, deletar antes via Storage UI).
delete from storage.buckets where id = 'logistica-comprovantes';
```

### Notas

- A UI degrada graciosamente se o bucket não existir: mensagem "Bucket `logistica-comprovantes` ainda não foi criado neste projeto. Upload em breve." aparece no `FreteDetalhePage`.
- Se policies forem mais restritivas no futuro (ex.: cada vendedor só vê fotos da própria empresa), criar nova migration; a estratégia atual é "todos autenticados" para acelerar Cântico em 1º/junho.
- Status de execução: registrar no `TODO.md §1` quando concluído (`bucket criado em <SHA>`).

---

## Regras deste arquivo

- **Uma seção = uma operação atômica.** Combinar "migration + deploy" em uma seção só é permitido quando a janela operacional é a mesma e o rollback é igualmente unificado (Etapas A + B); a Tarefa 8 é exceção justificada porque migration sem deploy das funções não traz valor algum (tabelas viram peso morto até o deploy) e o cliente paga o custo da janela uma vez.
- **Rollback sempre explícito.** Cenário C (produção) exige — sem rollback, a tarefa não é auditável.
- **Tipos Zod são fonte de verdade.** Toda migration cita o arquivo `packages/shared/types/` correspondente.
- **Sem segredos em texto claro.** Usar placeholders `<valor>`; Cursor Agent lê do `.env.local` do Cursor.
- **DDL sempre via `apply_migration`, NUNCA `execute_sql`** (runbook v3.2). Deploy de Edge Function sempre via CLI local (`npx supabase functions deploy`), NUNCA via MCP (ADR-005, INC-001).
