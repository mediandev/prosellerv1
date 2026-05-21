# Feature — F-LOG-CRM R-LOG-1 · Schema base + cadastros Logística + Novo Frete manual

**Status:** ✅ Em produção desde 2026-05-21 com flag LIGADA (`FEATURE_LOG_CRM=true` Supabase + `VITE_FEATURE_LOG_CRM=true` Netlify).
**Versão de release:** V 1.36.
**PR:** [#22](https://github.com/mediandev/prosellerv1/pull/22) (código) + [#25](https://github.com/mediandev/prosellerv1/pull/25) + [#26](https://github.com/mediandev/prosellerv1/pull/26) (docs).
**Merge commit em main:** `ad817aa` (R-LOG-1) + `102f370` (SSW confirmed) + `90dd9b6` (cursor-brief PROD-only).

## Entregou

- **Migration 119** (`supabase/migrations/119_frete_logistica_base.sql`) — 4 ENUMs + 7 tabelas (`transportador_logistica`, `regiao_destino`, `origem_frete`, `frete_logistica`, `frete_logistica_ocorrencia`, `fatura_transportadora`, `fatura_transportadora_item`) + RLS habilitado em todas + 11 indexes incluindo 2 únicos parciais para idempotência do hook futuro (R-LOG-3).
- **4 Edge Functions v1** atrás de `FEATURE_LOG_CRM`: `transportador-logistica-v1`, `regiao-destino-v1`, `origem-frete-v1`, `frete-logistica-v1`. CRUD direto via supabase-js (decisão consciente — DECISIONS_LOG 2026-05-20).
- **4 schemas Zod** em `packages/shared/types/`: transportador-logistica, regiao-origem, frete-logistica, fatura-transportadora.
- **5 componentes React** em `src/components/logistica/` + service HTTP. Page raiz `'logistica'` em `App.tsx` (backofficeOnly + flag).

## Deploy em prod (2026-05-21)

- pg_dump skipado (DDL aditivo puro, registrado em DECISIONS_LOG).
- `apply_migration` via Cursor MCP — success.
- Smoke pós-apply 6 SELECTs verdes (7 tabelas / 4 ENUMs / 7 RLS / 7 policies SELECT / 2 índices únicos / 3 FKs para user).
- 4 deploys via `npx supabase functions deploy ... --project-ref xxoiqfraeolsqsmsheue` — all success.
- 4 OPTIONS HTTP 200 + 4 GET sem auth HTTP 401 (gate auth ativo).
- Flags ligadas em Supabase + Netlify (rebuild Netlify dispara manualmente).
- E2E via Playwright autenticado: criou 1 transportador, 1 região, 1 origem, 1 frete (id=1, NFe 99999) com JOINs verdes.

## Estado das flags em prod

- `FEATURE_LOG_CRM=true` (Supabase Edge Function Secrets, criada 2026-05-21).
- `VITE_FEATURE_LOG_CRM=true` (Netlify Production env, criada 2026-05-21 + rebuild).

## Próximas ondas (não bloqueadas)

- **R-LOG-2** — Torre de Controle + Busca + Detalhe do frete. Classe B. Prompt pronto na conversa de discovery.
- **R-LOG-3** — Hook em `tiny-enviar-pedido-venda-v1` para auto-criar frete pós-emissão NFe. Classe C.
- **R-LOG-4** — Integração SSW Tracking (API pública, sem auth — ADR-006 cancelada). Classe D. Falta apenas decidir ADR-008 (polling) + 1 chave NFe ativa do Valentim para mapear schema response.
- **R-LOG-5/6/7/8** — Indicadores, faturas, parser PDF/EDI, auditoria.

## Referências

- `docs/plans/feature-contracts/F-LOG-1.md` (Feature Contract)
- `docs/wiki/context/F-LOG-CRM.md` (Context Pack)
- `docs/wiki/modules/logistica.md` (módulo)
- `docs/plans/cursor-brief.md` Tarefa 8 (deploy refinado)
- `docs/plans/DECISIONS_LOG.md` (3 entradas: divergência supabase-js, prod sem staging, skip pg_dump)
