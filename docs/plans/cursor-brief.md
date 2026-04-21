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

Etapas:
1. Confirmar que a feature flag FEATURE_SIMPLES_NACIONAL_LOOKUP está
   ausente ou "false" nos secrets da Edge Function antes de rodar. Se
   estiver "true", ABORTAR.
2. Criar o arquivo supabase/migrations/108_simples_nacional_lookup.sql
   com o SQL exato do brief (cursor-brief.md Tarefa 1).
3. Aplicar via `supabase db push` (ou a operação equivalente do MCP).
4. Rodar o smoke test (SQL abaixo) — confirmar que retorna 3 linhas,
   todas com is_nullable='YES'.
5. Comitar o arquivo da migration na mesma branch de F-001 no git.
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
2. Reverter o commit da migration 108 no git: `git revert <sha-do-commit-da-migration>`.
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

## Regras deste arquivo

- **Uma seção = uma operação atômica.** Nunca combinar "migration + deploy + env" em uma seção.
- **Rollback sempre explícito.** Cenário C (produção) exige — sem rollback, a tarefa não é auditável.
- **Tipos Zod são fonte de verdade.** Toda migration cita o arquivo `packages/shared/types/` correspondente.
- **Sem segredos em texto claro.** Usar placeholders `<valor>`; Cursor Agent lê do `.env.local` do Cursor.
