# SPEC — ProSeller V1

> Especificação funcional **parcial, por feature** (AGENTS.md §3).
> Primeira feature speccada retroativamente: **F-001 · Consulta Simples Nacional**.
> Demais módulos em produção serão speccados retroativamente na Onda R-3 do TODO.
>
> Versão: 0.2 — Data: 2026-04-22 — Referência PRD: ainda não existe (R-2 pendente).
> **Changelog v0.2 (2026-04-22):** DP-001/002/003 resolvidas em call com Valentim Nunes; RF-003 virou revalidação por pedido (ADR-004); CB-003 eliminado pelo toggle UI; Anti-SPEC proíbe edição manual do campo optante.

---

## Escopo desta versão

Apenas **F-001 · Consulta Simples Nacional** (ver `TODO.md §2`).

**Motivação de negócio** (capturada de TODO + conversa com Lucas 18/abr): mudanças tributárias em SP exigem identificar clientes optantes do Simples Nacional. Cada empresa (subsidiária Tiny) pode precisar de uma **natureza de operação distinta no Tiny** conforme o destinatário seja ou não optante do Simples. Hoje o ProSeller envia sempre a mesma natureza, gerando NFs classificadas erroneamente.

Fora de F-001: F-002 e ondas R-1…R-5 têm seu próprio escopo futuro.

---

## 1. Requisitos Funcionais (RF)

### RF-001 — Campo `optante_simples_nacional` no cadastro de cliente
- **Descrição:** O sistema deve persistir, para cada cliente com CNPJ, uma flag booleana indicando se é optante do Simples Nacional, junto com a data/hora em que essa informação foi consultada.
- **Prioridade:** Alta
- **Cobre:** CA-001, CA-002, CA-003
- **Contrato:** `packages/shared/types/cliente.ts` → `ClienteSimplesNacional`
- **Notas:** Campo **opcional** (nullable) — clientes antigos ficam com `null` até serem re-consultados ou editados. **Só se aplica a CNPJ** (PJ): para cliente com CPF, o campo fica permanentemente `null` e o sistema trata como "não-simples" no fluxo Tiny.

### RF-002 — Consulta à ReceitaWS no cadastro de cliente novo
- **Descrição:** Ao criar um cliente com CNPJ, o sistema deve, **se a feature flag estiver ativa**, consultar a API ReceitaWS para obter o valor `simples.optante` e persistir no cliente.
- **Prioridade:** Alta
- **Cobre:** CA-001, CA-004
- **Contrato:** `packages/shared/types/simples-nacional.ts` → `ReceitaWsSimplesResponse`
- **Notas:** A consulta é **best-effort**: falha de rede, timeout (>5s) ou quota esgotada **não bloqueia** a criação do cliente. Em caso de falha, `optante_simples_nacional` permanece `null` e um log é registrado.

### RF-003 — Revalidação ao enviar pedido ao Tiny
- **Descrição:** Ao disparar pedido ao Tiny, se o cliente é PJ e a feature flag está ligada, o sistema deve reconsultar ReceitaWS **a cada envio**, independente de quando a última consulta aconteceu, e atualizar `optante_simples_nacional` antes de montar o payload Tiny.
- **Prioridade:** Alta
- **Cobre:** CA-005, CA-007
- **Contrato:** reusa `ReceitaWsSimplesResponse`
- **Notas:** Motivo da revalidação por pedido (e não por janela de tempo): o cliente pode sair do Simples fora das janelas anuais se incluir atividade não-permitida — decisão confirmada por Valentim Nunes em 2026-04-22 (ver ADR-004). Se a revalidação falhar, usa o valor persistido (mesmo que antigo) e anota no log. Apenas se o valor for `null` E a revalidação falhar o pedido prossegue tratando como "não-simples" (fallback documentado em CB-002).

### RF-004 — Mapeamento dual de natureza de operação Tiny
- **Descrição:** A tabela de mapeamento `(empresa × natureza de operação ProSeller → valor Tiny)` deve aceitar um segundo valor Tiny opcional, usado quando o destinatário é optante do Simples Nacional. Quando o 2º valor é `null`, o sistema usa o 1º para todos os clientes (comportamento atual preservado).
- **Prioridade:** Alta
- **Cobre:** CA-006, CA-007
- **Contrato:** `packages/shared/types/natureza-operacao.ts` → `TinyEmpresaNaturezaOperacao`
- **Notas:** A UI de Configurações expõe um **switch** "Habilitar natureza para Simples Nacional" por linha do mapeamento. Off por default (1 campo, comportamento pré-F-001). On abre o 2º campo e **ambos** `tinyValor` e `tinyValorSimples` viram obrigatórios no form; desligar o switch limpa o 2º campo.

### RF-005 — Seleção de natureza Tiny por optante no envio
- **Descrição:** Ao enviar pedido ao Tiny, o sistema deve escolher qual `tiny_valor` usar (1º ou 2º) com base em `cliente.optante_simples_nacional`:
  - `optante_simples_nacional = true` → `tiny_valor_simples` se preenchido, senão `tiny_valor`.
  - `optante_simples_nacional = false` ou `null` → `tiny_valor`.
- **Prioridade:** Alta
- **Cobre:** CA-007
- **Contrato:** comportamento interno da função `tiny-enviar-pedido-venda-v1` (sem contrato externo novo).

### RF-006 — Feature flag `feature_simples_nacional_lookup`
- **Descrição:** Toda a consulta à ReceitaWS (criação + revalidação no envio) deve ficar atrás de uma feature flag lida em tempo de runtime pela Edge Function. Com a flag desligada, o sistema preserva o comportamento atual (sem consulta, sem dual-ID em uso).
- **Prioridade:** Alta
- **Cobre:** CA-008
- **Contrato:** ver ADR-001 (estratégia de feature flag).
- **Notas:** Desligar a flag **não** deve quebrar pedidos: o código que escolhe natureza Tiny precisa tolerar `optante_simples_nacional = null` e cair em `tiny_valor`.

---

## 2. Requisitos Não-Funcionais (RNF)

### RNF-001 — Latência
- Consulta ReceitaWS na criação de cliente: **timeout de 5s**. Fluxo de criação nunca bloqueia por mais de 5s total por causa da consulta.
- Envio Tiny com revalidação: **timeout de 5s** adicional só se for revalidar; caso contrário nenhum overhead.

### RNF-002 — Observabilidade
- Cada chamada à ReceitaWS registra: `cnpj_mascarado`, `http_status`, `simples_optante`, `duration_ms`, `trace_id`.
- Cada decisão de natureza no envio Tiny registra: `empresa_id`, `natureza_operacao_id`, `optante_aplicado` (boolean), `tiny_valor_escolhido`, `fallback_used` (boolean).

### RNF-003 — Segurança e dados sensíveis
- CNPJ consultado não aparece em logs em texto claro — mascarar preservando apenas os 4 primeiros e últimos dígitos.
- Token ReceitaWS (quando plano pago) vive em `SUPABASE_ENV` secret, nunca em código.
- Resposta bruta da ReceitaWS **não** é persistida — apenas os campos derivados (`simples.optante`, data da consulta).

### RNF-004 — Idempotência e resiliência
- Se a ReceitaWS falhar 3 vezes em sequência para o mesmo CNPJ em uma janela de 1 minuto, o sistema para de tentar para aquele CNPJ pelo resto do processo atual (circuito simples, in-memory, não persistido).
- Retries não acontecem dentro de uma única requisição HTTP — falhou, caiu no fallback.

### RNF-005 — Testes de integração obrigatórios (gate de entrega)
- Como F-001 cruza módulos sensíveis (cliente + pedido + ERP), **CLAUDE.md** exige teste de integração antes do código. Esta feature introduz Vitest + Supertest no repo (Onda R-5 adiantada).
- Cobertura mínima: os 4 cenários de CA-007 (Simples+ID1, Simples+ID2, Não-Simples+ID1, Não-Simples com fallback) + 2 cenários de falha da ReceitaWS (timeout, resposta inválida).

---

## 3. Fluxos principais

### Fluxo F-1 — Criar cliente com CNPJ (feature flag ligada)

**Pré-condição:** usuário autenticado · feature flag `feature_simples_nacional_lookup = true` · payload com `cpf_cnpj` de 14 dígitos válido.

1. Frontend POST `/create-cliente-v2` com `cpf_cnpj`.
2. Edge Function valida CNPJ, sanitiza entrada.
3. Chama RPC `create_cliente_v2` (campos atuais, sem o novo flag).
4. **Após sucesso do RPC:** chama ReceitaWS (`GET https://www.receitaws.com.br/v1/cnpj/<digits>`) com timeout 5s.
5. Se resposta válida: faz `UPDATE cliente SET optante_simples_nacional = <bool>, optante_simples_nacional_consultado_em = now() WHERE cliente_id = <id>`.
6. Se falhar: loga o erro, não atualiza os campos, resposta da Edge Function **continua 201 sucesso**.

**Pós-condição:** cliente criado · se ReceitaWS OK, campos populados; se falha, campos `null`.
**Cobre:** RF-001, RF-002.

### Fluxo F-2 — Enviar pedido ao Tiny (cliente PJ, feature flag ligada)

**Pré-condição:** pedido existe · empresa Tiny configurada · natureza mapeada em `tiny_empresa_natureza_operacao`.

1. Edge Function carrega pedido + empresa + cliente.
2. Se cliente é PJ (CNPJ de 14 dígitos):
   - Reconsulta ReceitaWS com timeout 5s — **sempre, sem checar janela**.
   - Sucesso: atualiza `cliente.optante_simples_nacional` + `..._consultado_em`.
   - Falha: usa valor persistido (pode ser `null`) — log `receitaws.*` com outcome.
3. Busca mapeamento em `tiny_empresa_natureza_operacao` (ambos `tiny_valor` e `tiny_valor_simples`).
4. Escolhe `tiny_valor_escolhido`:
   - Se `optante_simples_nacional = true` e `tiny_valor_simples` não é null → `tiny_valor_simples`.
   - Caso contrário → `tiny_valor` (fallback também para `null` e `false`).
5. Monta payload Tiny com `natureza_operacao = tiny_valor_escolhido`.
6. POST `pedido.incluir.php`.

**Pós-condição:** pedido enviado · `pedido_venda.id_tiny` preenchido · `cliente.optante_simples_nacional_consultado_em` atualizado se revalidação rodou.
**Cobre:** RF-003, RF-004, RF-005.

### Fluxo F-3 — Configurar dual-ID no mapeamento de natureza (UI)

**Pré-condição:** usuário backoffice · tela Configurações › Mapeamento Naturezas Tiny.

1. UI lista mapeamentos de uma empresa selecionada.
2. Por linha: campo 1 "ID Tiny padrão" + switch "Habilitar natureza para Simples Nacional" (off por default).
3. Ao ligar o switch: abre campo 2 "ID Tiny quando optante Simples"; o form marca ambos campos como obrigatórios e não permite salvar sem os 2 preenchidos.
4. Ao salvar com switch on: POST `/tiny-empresa-natureza-operacao-v2` com `{ empresaId, naturezaOperacaoId, tinyValor, tinyValorSimples }` (ambos strings não-vazias).
5. Ao desligar o switch: POST seta `tinyValorSimples = null` no banco.
6. Ao salvar com switch off: POST com `{ empresaId, naturezaOperacaoId, tinyValor, tinyValorSimples: null }` (ou omitido).

**Pós-condição:** mapeamento persistido com ou sem 2º valor. Estado "só `tinyValorSimples` preenchido" é impossível pela UI (CB-003 eliminado).
**Cobre:** RF-004.

---

## 4. Critérios de Aceite (CA)

### CA-001 — Cliente novo PJ com ReceitaWS OK (cobre RF-001, RF-002)
```
Given: usuário backoffice autenticado, feature flag ligada
When: POST /create-cliente-v2 com cpf_cnpj válido de 14 dígitos
  E ReceitaWS responde 200 com { simples: { optante: true } }
Then: retorna 201 com cliente criado
  And: cliente.optante_simples_nacional = true
  And: cliente.optante_simples_nacional_consultado_em ≈ now()
```

### CA-002 — Cliente novo PF não consulta ReceitaWS (cobre RF-001)
```
Given: usuário autenticado, feature flag ligada
When: POST /create-cliente-v2 com cpf_cnpj de 11 dígitos (CPF)
Then: retorna 201 com cliente criado
  And: cliente.optante_simples_nacional = null
  And: ReceitaWS NÃO foi chamada (assertion sobre mock)
```

### CA-003 — Cliente novo sem cpf_cnpj (cobre RF-001)
```
Given: usuário autenticado, feature flag ligada
When: POST /create-cliente-v2 SEM cpf_cnpj
Then: retorna 201 com cliente criado
  And: cliente.optante_simples_nacional = null
  And: ReceitaWS NÃO foi chamada
```

### CA-004 — ReceitaWS falha não bloqueia criação (cobre RF-002, CB-001)
```
Given: usuário autenticado, feature flag ligada
When: POST /create-cliente-v2 com CNPJ válido
  E ReceitaWS retorna timeout após 5s
Then: retorna 201 com cliente criado
  And: cliente.optante_simples_nacional = null
  And: log "receitaws.timeout" foi emitido com cnpj mascarado
```

### CA-005 — Revalidação a cada envio de pedido Tiny (cobre RF-003)
```
Given: cliente PJ com optante_simples_nacional = true gravado há X dias
  (X arbitrário — pode ser 1h, 3 dias ou 6 meses; não importa)
  E feature flag ligada
When: POST /tiny-enviar-pedido-venda-v1 para esse cliente
  E ReceitaWS responde 200 com { simples: { optante: false } } (mudou de estado)
Then: antes de montar payload Tiny, cliente.optante_simples_nacional é atualizado para false
  And: cliente.optante_simples_nacional_consultado_em ≈ now()
  And: payload Tiny usa o tiny_valor (não o tiny_valor_simples)
  And: log receitaws.lookup e natureza.resolvida são emitidos
```

### CA-006 — UI salva dual-ID (cobre RF-004)
```
Given: usuário backoffice, tela Mapeamento Tiny, linha da natureza "Venda SP"
When: preenche "ID Tiny padrão" = "1001", marca toggle Simples, preenche "2002", salva
Then: POST /tiny-empresa-natureza-operacao-v2 retorna 200
  And: linha no banco tem tiny_valor="1001" E tiny_valor_simples="2002"
```

### CA-007 — Envio Tiny escolhe natureza correta pelos 4 cenários (cobre RF-005)
```
# 4 sub-casos independentes — cada um um teste de integração.
# Pré-req comum: cliente PJ válido; mapeamento existe.

Cenário A — Simples + dual configurado:
Given: cliente.optante_simples_nacional=true, mapeamento.tiny_valor="1001", mapeamento.tiny_valor_simples="2002"
When: envia pedido
Then: payload Tiny.natureza_operacao = "2002"

Cenário B — Simples + dual NÃO configurado:
Given: cliente.optante_simples_nacional=true, mapeamento.tiny_valor="1001", mapeamento.tiny_valor_simples=null
When: envia pedido
Then: payload Tiny.natureza_operacao = "1001"
  And: log "natureza.fallback_no_dual" emitido

Cenário C — Não-simples + dual configurado:
Given: cliente.optante_simples_nacional=false, mapeamento.tiny_valor="1001", mapeamento.tiny_valor_simples="2002"
When: envia pedido
Then: payload Tiny.natureza_operacao = "1001"

Cenário D — optante=null (PF ou consulta falhou) + dual configurado:
Given: cliente.optante_simples_nacional=null, mapeamento.tiny_valor="1001", mapeamento.tiny_valor_simples="2002"
When: envia pedido
Then: payload Tiny.natureza_operacao = "1001"
  And: log "natureza.fallback_null_optante" emitido
```

### CA-008 — Feature flag desligada preserva comportamento atual (cobre RF-006)
```
Given: feature_simples_nacional_lookup = false
When: POST /create-cliente-v2 com CNPJ válido
Then: retorna 201 sem consultar ReceitaWS
  And: cliente.optante_simples_nacional = null

Given: feature_simples_nacional_lookup = false
  E cliente com optante_simples_nacional=true já persistido
When: envia pedido ao Tiny (mapeamento com dual configurado)
Then: payload Tiny.natureza_operacao = tiny_valor (1º campo) — ignora optante
```

---

## 5. Casos de borda

| ID | Cenário | Comportamento esperado | Prioridade |
|---|---|---|---|
| CB-001 | ReceitaWS retorna 200 mas sem campo `simples` (plano grátis) | Tratar como inconclusivo: `optante_simples_nacional = null` + log `receitaws.missing_field` | Alta |
| CB-002 | Pedido de cliente PJ com optante=null E revalidação falha na hora do envio | Envia pedido usando `tiny_valor` (não `tiny_valor_simples`), log `natureza.fallback_revalidation_failed`; pedido **não é bloqueado** | Alta |
| CB-003 | Mapeamento tem `tiny_valor_simples` mas `tiny_valor` está null/vazio | **Eliminado pelo toggle UI** (decisão 2026-04-22): o form de Mapeamento Naturezas só expõe `tiny_valor_simples` quando o toggle "Habilitar natureza para Simples Nacional" está ligado, e nesse modo exige ambos `tiny_valor` e `tiny_valor_simples` preenchidos. Fora disso, só existe 1 campo. Validação duplicada (front + back). Ver RF-004 e UI em F-3. | — |
| CB-004 | ReceitaWS rate-limit 429 | Cair no fallback (comportar como timeout) + log `receitaws.rate_limited` | Média |
| CB-005 | CNPJ inativo na Receita (empresa baixada) | Persistir `optante_simples_nacional` conforme veio na resposta (pode ser null ou false) + log `receitaws.cnpj_inativo` — operação continua | Média |
| CB-006 | Cliente editado mudando CPF → CNPJ (tipo pessoa) | Na próxima revalidação ao enviar pedido, a flag será consultada corretamente; não há migração automática | Baixa |
| CB-007 | Mesmo cliente enviado 2x em pedidos concorrentes | Revalidação roda 2x; resultado final é o último UPDATE; aceitável (não há lock pessimista) | Baixa |

---

## 6. Anti-SPEC (o que o sistema NÃO DEVE fazer)

### Fora desta versão
- NÃO implementar cron job que varre todos os clientes periodicamente consultando ReceitaWS. Revalidação é sob-demanda (cadastro + envio Tiny).
- NÃO criar tela dedicada de "consultar Simples Nacional de cliente X" — a consulta acontece só nos fluxos de F-001.
- NÃO criar relatório de optantes vs não-optantes — fora de escopo.
- NÃO aplicar dual-ID a outros campos do payload Tiny (CFOP, transportadora, etc.) — só `natureza_operacao`.
- NÃO permitir edição manual da flag `optante_simples_nacional` pela UI — valor é sempre derivado de consulta. (Pode mudar em v2 se houver demanda.)

### Comportamentos proibidos
- NÃO bloquear criação de cliente por falha da ReceitaWS.
- NÃO bloquear envio de pedido ao Tiny por falha da ReceitaWS na revalidação — cair no último valor conhecido.
- NÃO persistir a resposta bruta da ReceitaWS (contém dados PII de sócios etc.).
- NÃO logar CNPJ completo em texto claro.
- NÃO chamar ReceitaWS quando feature flag estiver desligada.
- NÃO chamar ReceitaWS para CPF (PF) — sempre `null` para cliente sem CNPJ.
- NÃO alterar linhas existentes de `tiny_empresa_natureza_operacao` na migration — apenas ADD COLUMN nullable.
- NÃO permitir edição manual do campo `optante_simples_nacional` na v1 — sempre populado por ReceitaWS. A UI da ficha do cliente exibe o campo como read-only. (Revisitar em v2 se cliente pedir override.)

### Padrões proibidos
- NÃO inline o valor `tiny_valor_simples` como string no frontend — o campo vem da Edge Function `tiny-empresa-natureza-operacao-v2`.
- NÃO duplicar a lógica de escolha de natureza no frontend — é decisão 100% backend.
- NÃO usar a ReceitaWS como fonte de verdade para outros dados do cliente (razão social, endereço) — isso é fora de escopo e introduz risco de sobrescrita.
- NÃO criar nova tabela só para log de consultas ReceitaWS — usar o `console.log` padrão já existente nas Edge Functions (igual `tiny-enviar-pedido-venda-v1` faz hoje).

---

## 7. Modelos de dados (visão funcional)

> DDL exato vive na migration 108 (a ser criada). Tipos em `packages/shared/types/`.

### Entidade: `cliente` (colunas novas em tabela existente)

| Campo | Tipo | Obrigatório | Validação |
|---|---|---|---|
| `optante_simples_nacional` | boolean | Não (nullable) | `null` = desconhecido/não consultado |
| `optante_simples_nacional_consultado_em` | timestamptz | Não (nullable) | `null` quando flag é `null`; setado por consulta |

### Entidade: `tiny_empresa_natureza_operacao` (coluna nova em tabela existente)

| Campo | Tipo | Obrigatório | Validação |
|---|---|---|---|
| `tiny_valor_simples` | text | Não (nullable) | `null` = usar `tiny_valor` para todos os clientes |

**Invariante:** se `tiny_valor_simples` é NOT NULL, `tiny_valor` também deve ser NOT NULL. Essa invariante **já é garantida** pela NOT NULL existente em `tiny_valor` (migration 085).

### Origem externa: ReceitaWS (não persistida; apenas campo `simples.optante`)

```
GET https://www.receitaws.com.br/v1/cnpj/<14 dígitos>
→ 200 { ..., simples: { optante: boolean, data_opcao?, data_exclusao? }, ... }
→ 429 rate limit
→ 504/timeout
```

### Feature flag (runtime; ver ADR-001)

Leitura: env var `FEATURE_SIMPLES_NACIONAL_LOOKUP` (`"true"` | `"false"` | ausente). Ausente = `false`.

---

## 8. Limites de escopo

| Item | Motivo | Quando |
|---|---|---|
| Consulta em massa de clientes existentes | Fora do escopo — sob demanda basta | Se necessário, criar feature dedicada no futuro |
| UI para forçar re-consulta Simples de 1 cliente | Não justifica a feature no MVP | v2 se houver demanda |
| Dual-ID para outros campos Tiny além de natureza | Não solicitado | Apenas se aparecer novo requisito tributário |
| Cache local (Redis/tabela) de respostas ReceitaWS | Sobrecomplexa — ReceitaWS tem plano pago com quota suficiente | Revisitar se quota apertar |
| Feature flag por empresa (multi-tenant) | MVP é global por ambiente (staging/prod) | ADR-001 contempla evolução futura |

---

## 9. Rastreabilidade (RF ↔ feature)

| RF | Cobre (CAs) | Feature (TODO.md) |
|---|---|---|
| RF-001 | CA-001, CA-002, CA-003 | F-001 |
| RF-002 | CA-001, CA-004 | F-001 |
| RF-003 | CA-005 | F-001 |
| RF-004 | CA-006, CA-007 | F-001 |
| RF-005 | CA-007 | F-001 |
| RF-006 | CA-008 | F-001 |

---

## 10. Dependências externas e ADRs associadas

- **ADR-001** — Estratégia de feature flag (env var como MVP).
- **ADR-002** — ReceitaWS como fornecedor de dado Simples Nacional (retroativo, formalizando decisão de 18/abr/2026).
- **ADR-003** — Modelagem dual-ID em `tiny_empresa_natureza_operacao` (coluna nullable vs tabela separada).
- **ADR-004** — Revalidação do optante Simples Nacional a cada envio de pedido Tiny (substitui janela de 30 dias).

---

## 11. Decisões pendentes e resolvidas

### 11.a — Pendentes

_Nenhuma. Todas as DPs de F-001 foram resolvidas em call com Valentim Nunes em 2026-04-22 — ver §11.b._

### 11.b — Resolvidas

> Cada entrada registra o que era pendente, a decisão final, quem decidiu, em que data, e os trechos da SPEC que foram atualizados.
> Mantidas aqui para rastreabilidade; **não** servem como defaults — o texto ativo da SPEC (RFs, CAs) já reflete a resolução.

#### DP-001 — Janela de revalidação do optante Simples Nacional → **RESOLVIDA**
- **Resolvida em:** 2026-04-22 por Valentim Nunes (cliente) + Eduardo Sousa (formalização).
- **Decisão:** **Revalidar a cada envio de pedido Tiny**, sem janela de tempo.
- **Motivação:** empresa pode sair do Simples fora das janelas anuais se incluir atividade não-permitida — risco tributário real; janela de 30 dias colocaria NF com regime errado por até um mês.
- **Trechos atualizados:** RF-003 (de "30 dias" → "a cada envio"); Fluxo F-2 passo 2 (removida checagem de data); CA-005 (reescrita); débito técnico adicionado ao TODO.md §4 ("monitorar quota ReceitaWS no primeiro mês").
- **ADR associado:** `docs/decisions/adr/ADR-004-revalidacao-simples-por-pedido.md`.

#### DP-002 — Timeout da chamada à ReceitaWS → **RESOLVIDA**
- **Resolvida em:** 2026-04-22 por Valentim Nunes + Eduardo Sousa.
- **Decisão:** **5 segundos** (mantido o default da SPEC v0.1).
- **Motivação:** compromisso razoável — Edge Function Supabase tem timeout total de 60s, 5s deixa folga; p95 observado da ReceitaWS no plano pago fica abaixo; UX no form de cliente é aceitável.
- **Trechos atualizados:** nenhum (o default já estava ativo em RNF-001, RF-002, RF-003, CA-004).

#### DP-003 — `tiny_valor_simples` preenchido sem `tiny_valor` → **RESOLVIDA (obsoleta pelo toggle UI)**
- **Resolvida em:** 2026-04-22 por Valentim Nunes + Eduardo Sousa.
- **Decisão:** **Caso eliminado pela UI**. O form de Mapeamento Naturezas Tiny ganha um toggle "Habilitar natureza para Simples Nacional" por linha. Com o toggle off (default) só existe 1 campo (`tinyValor`, comportamento pré-F-001). Com o toggle on abre o 2º campo (`tinyValorSimples`) e o form exige ambos preenchidos — não deixa salvar com um só. Backend valida redundantemente.
- **Motivação:** o caso "só simples preenchido" deixa de existir estruturalmente; a UI torna impossível criar o estado inválido.
- **Trechos atualizados:** CB-003 (reescrita como "eliminado pelo toggle UI"); RF-004 (toggle descrito); Fluxo F-3 (UI com switch por linha). Resumo da UX do toggle: switch por linha, off por default, label "Habilitar natureza para Simples Nacional".

---

## 12. Aprovação

- [x] RFs numerados e verificáveis
- [x] RNFs com alvos concretos (timeout, observabilidade, segurança)
- [x] CAs em formato Given/When/Then cobrindo os 4 cenários operacionais de negócio
- [x] Casos de borda mapeados incluindo fallbacks de rede
- [x] Anti-SPEC preenchida (inclui "não tocar linhas existentes da tabela 085" e "não permitir edição manual do optante")
- [x] Modelos de dados com validações
- [x] Rastreabilidade RF ↔ F-001
- [x] Quatro ADRs identificados como pré-requisitos de execução (ADR-001 a ADR-004)
- [x] **Decisões pendentes (DP-001 a DP-003) resolvidas em 2026-04-22 por Valentim Nunes (cliente) + Eduardo Sousa**
- [x] SPEC revisada e aprovada (v0.2)

---

*Próximo passo após aprovação: Fase 4 — criar schemas Zod em `packages/shared/types/` + espelho em `docs/contracts/CONTRACTS.md`.*
