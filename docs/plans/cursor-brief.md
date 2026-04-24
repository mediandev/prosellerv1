# Cursor Brief — ProSeller V1

> **Para que serve este arquivo:** instruções curtas para o Cursor Agent executar tarefas de **infra via MCP Supabase** (Cenário C — produção).
>
> **Regra de ouro do projeto (AGENTS.md §2.2):** toda operação em produção passa por staging antes e tem seção **Rollback** obrigatória. Uma seção por operação. Se uma seção crescer > ~50 linhas, a complexidade é sinal de que a feature não é só infra — reconsiderar.

**Versão:** 1.0 · **Data:** 2026-04-20

---

## Como usar

1. Localize a seção da tarefa no índice abaixo.
2. Confirme que o MCP Supabase está ativo no Cursor (`.cursor/MCP.json`, projeto `xxoiqfraeolsqsmsheue`).
3. **Primeiro aplique em staging.** Valide com o smoke test da seção.
4. Só então repita em produção — com a feature flag `FEATURE_SIMPLES_NACIONAL_LOOKUP` **desligada** no momento da aplicação.
5. Volte ao Claude Code e marque no `TODO.md §1` a migration como aplicada, com SHA do commit.

---

## Índice

- [Tarefa 1 — Migration 108 · F-001 Simples Nacional (schema)](#tarefa-1--migration-108--f-001-simples-nacional-schema)
- [Tarefa 2 — Secrets Supabase (pós-migration)](#tarefa-2--secrets-supabase-pós-migration)
- [Tarefa 3 — Ativar feature flag em staging](#tarefa-3--ativar-feature-flag-em-staging)
- [Tarefa 4 — Ativar feature flag em produção](#tarefa-4--ativar-feature-flag-em-produção)

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

## Regras deste arquivo

- **Uma seção = uma operação atômica.** Nunca combinar "migration + deploy + env" em uma seção.
- **Rollback sempre explícito.** Cenário C (produção) exige — sem rollback, a tarefa não é auditável.
- **Tipos Zod são fonte de verdade.** Toda migration cita o arquivo `packages/shared/types/` correspondente.
- **Sem segredos em texto claro.** Usar placeholders `<valor>`; Cursor Agent lê do `.env.local` do Cursor.
