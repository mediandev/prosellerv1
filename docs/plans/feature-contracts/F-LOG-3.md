# F-LOG-3 · Hook em `tiny-enviar-pedido-venda-v1` cria frete automático

**Risco:** **C** · **Branch:** `feat/log-crm-R-LOG-3` · **CI alvo:** N2 · **Depende de:** F-LOG-1 (tabela `frete_logistica` em prod).

## Objetivo

Após sucesso no `tiny-enviar-pedido-venda-v1` (pedido criado no Tiny), criar automaticamente um `frete_logistica` com `pedido_venda_id`, `cliente_id`, `empresa_id`, `vendedor_id`, `valor_produtos` e `status_entrega='Em Separação'`. O frete nasce com `nfe_numero: null` e `nfe_chave_acesso: null` — NFe não é emitida neste ponto (apenas inclusão do pedido no Tiny). Idempotente via UNIQUE index em `pedido_venda_id`.

## Definition of Ready

- [x] Confirmar payload Tiny: `pedido.incluir.php` retorna apenas `registro.id` + `registro.numero`. **`nfe_numero` e `nfe_chave_acesso` NÃO existem neste ponto** — preenchidos em etapa futura.
- [x] Anti-SPEC revisitada: hook behind feature flag `FEATURE_LOG_CRM_AUTO_FRETE` (defesa em camadas).
- [x] Teste de paridade: output da Edge Function permanece idêntico (mesmos campos no JSON de resposta).
- [x] Hook faz INSERT direto via service_role client (mesmo padrão das 4 Edge Functions R-LOG-1).
- [x] Classificação C confirmada (toca Edge Function de produção crítica).
- [x] Arquivos de alteração listados.
- [x] Testes: 1 edge (flag + mock insert sucesso/falha/unique violation).
- [x] Contrato Zod: `FreteLogisticaCreate` já existe em `packages/shared/types/frete-logistica.ts`.
- [x] Migration 121: UNIQUE index em `pedido_venda_id` (idempotência).
- [x] Feature flag `FEATURE_LOG_CRM_AUTO_FRETE` separada (nasce `false`).

## Critérios de Aceite

| CA | Descrição |
|---|---|
| CA-1 | Flag OFF: enviar pedido ao Tiny funciona normalmente, sem novo registro em `frete_logistica`. |
| CA-2 | Flag ON: enviar pedido ao Tiny → sucesso normal + `frete_logistica` tem novo registro com `pedido_venda_id` preenchido, `nfe_numero = null`, `status_entrega = 'Em Separação'`. |
| CA-3 | Retry: enviar mesmo pedido → frete NÃO duplica (unique violation → skip silencioso). |
| CA-4 | Falha do INSERT (RLS, constraint, timeout) → log + pedido retorna sucesso normalmente (best-effort). |
| CA-5 | Resposta HTTP da Edge Function permanece idêntica (mesmos campos, mesmo status). |
| CA-6 | `dry_run=true` não cria frete (hook só executa no success path real). |

## Escopo incluído

- Migration 121: `CREATE UNIQUE INDEX uq_frete_logistica_pedido_venda ON frete_logistica(pedido_venda_id) WHERE pedido_venda_id IS NOT NULL AND deleted_at IS NULL`.
- Helper `_shared/frete-auto-create.ts`: função `autoCreateFreteLogistica` (testável, best-effort).
- Feature flag functions em `_shared/log-crm-feature-flag.ts`.
- Hook em `tiny-enviar-pedido-venda-v1/index.ts` (1 import + ~8 linhas após `updError` check).
- Testes edge (Deno): flag on/off + mock insert (sucesso, unique violation, erro, exceção).
- Bump V 1.41 + changelog.
- Cursor-brief Tarefa 9 (migration 121 + deploy da Edge Function).

## Escopo excluído

- UI nova (frete auto-criado aparece na Busca/Torre de Controle existentes).
- Preenchimento de `nfe_numero`/`nfe_chave_acesso` (etapa futura quando Tiny retornar dados de faturamento).
- Integração SSW (R-LOG-4 já implementada).

## Arquivos alterados

- `supabase/migrations/121_frete_logistica_uq_pedido_venda.sql` (novo)
- `supabase/functions/_shared/frete-auto-create.ts` (novo)
- `supabase/functions/_shared/log-crm-feature-flag.ts` (edit: +8 linhas)
- `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts` (edit: +1 import, +8 linhas hook)
- `tests/edge/frete-auto-create-on-tiny-send.test.ts` (novo)
- `src/App.tsx` (version bump)
- `src/components/ChangelogPage.tsx` (changelog entry)

## Arquivos que NÃO podem ser alterados

- Payload enviado ao Tiny (`pedidoTiny` object).
- Resposta HTTP da Edge Function (campos retornados ao frontend).
- Fluxo de ReceitaWS / natureza de operação.
- Qualquer migration já aplicada (119, 120).

## Infra / Produção

- **Migration 121**: DDL aditivo puro (CREATE UNIQUE INDEX). Rollback: `DROP INDEX uq_frete_logistica_pedido_venda;`
- **Deploy**: `npx supabase functions deploy tiny-enviar-pedido-venda-v1 --project-ref xxoiqfraeolsqsmsheue` (CLI local, ADR-005).
- **Feature flag**: `FEATURE_LOG_CRM_AUTO_FRETE` nasce `false`. Ligar após smoke E2E verde.
- **Rollback da flag**: setar `FEATURE_LOG_CRM_AUTO_FRETE=false` → hook desativado instantaneamente.

## Testes obrigatórios

| CA | Teste | Tipo | Comando |
|---|---|---|---|
| CA-1..CA-4 | `frete-auto-create-on-tiny-send.test.ts` | edge (Deno) | `deno test --no-check --allow-env --allow-read tests/edge/frete-auto-create-on-tiny-send.test.ts` |
| CA-1..CA-6 | Smoke E2E manual | smoke | Enviar pedido ao Tiny com flag off → on → retry |
