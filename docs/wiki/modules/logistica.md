# Módulo — Logística (F-LOG-CRM)

> Estado: **R-LOG-1 em produção desde 2026-05-21 com flag LIGADA** (V 1.36). **R-LOG-2 implementada** (branch `feat/log-crm-R-LOG-2`, V 1.38, aguardando push). `FEATURE_LOG_CRM=true` em Supabase + `VITE_FEATURE_LOG_CRM=true` em Netlify.
> Última atualização: 2026-05-21.

## Propósito

Migrar o módulo Logis do LogCRM Bubble (usado hoje pela Cântico Distribuidora) para dentro do ProSeller, módulo por módulo, sem perder o que funciona. O LogCRM cobre: torre de controle de fretes, busca, detalhe com ocorrências SSW, novo frete manual, faturas transportadora e auditoria cotado × cobrado. A migração acontece em 8 ondas (R-LOG-1 a R-LOG-8) — ver `docs/plans/feature-contracts/F-LOG-{1..8}.md`.

## Origem

Sistema **LogCRM** (`https://logcrm.bubbleapps.io`) — discovery via Playwright em 2026-05-20 com credenciais Cântico. Screenshots em `archive/screenshots/2026-05-20-logcrm/`.

## Estrutura entregue em R-LOG-1

### Edge Functions
- `supabase/functions/transportador-logistica-v1/index.ts` — CRUD direto via supabase-js.
- `supabase/functions/regiao-destino-v1/index.ts` — CRUD lookup (regiões globais).
- `supabase/functions/origem-frete-v1/index.ts` — CRUD lookup por empresa.
- `supabase/functions/frete-logistica-v1/index.ts` — CRUD do cabeçalho do frete.
- `supabase/functions/_shared/log-crm-feature-flag.ts` — helper de gating.

Todas as 4 Edge Functions retornam **503** quando `FEATURE_LOG_CRM != "true"`.

### Tabelas Postgres (migration 119)
- `transportador_logistica` — razão social, CNPJ (digits-only), grupo enum, `ssw_dominio`, audit.
- `regiao_destino` — lookup global.
- `origem_frete` — lookup por empresa.
- `frete_logistica` — cabeçalho do frete; `pedido_venda_id` NULLABLE (R-LOG-3 popula via hook).
- `frete_logistica_ocorrencia` — ocorrências SSW (populadas em R-LOG-4).
- `fatura_transportadora` — estrutura apenas (CRUD em R-LOG-6).
- `fatura_transportadora_item` — idem.

4 ENUMs: `status_entrega_frete` (9), `tipo_ocorrencia_ssw` (4), `grupo_transportador` (5), `status_fatura_transportadora` (3).

RLS habilitada em todas as 7 tabelas (defesa em profundidade). Policy SELECT para `authenticated`; escritas só por service_role via Edge Function.

Indexes em: `frete_logistica.nfe_numero`, `nfe_chave_acesso`, `empresa_id`, `status_entrega`, `pedido_venda_id`; `frete_logistica_ocorrencia.frete_id`; `fatura_transportadora_item.frete_id`; `transportador_logistica.cnpj`, `grupo`; `origem_frete.empresa_id`.

### Frontend
- `src/components/logistica/LogisticaPage.tsx` — container; verifica flag; abas internas. **R-LOG-2: 4 abas finais** (Dashboard, Busca, Transportadores, Novo Frete; abas "Regiões destino" e "Origens" removidas por decisão Valentim 2026-05-21 — tabelas no banco permanecem).
- `src/components/logistica/CadastroTransportadorPage.tsx`.
- `src/components/logistica/CadastroRegiaoDestinoPage.tsx` (componente continua, mas sem entry point na UI).
- `src/components/logistica/CadastroOrigemFretePage.tsx` (idem).
- `src/components/logistica/NovoFretePage.tsx` — form manual de frete.
- **R-LOG-2 componentes novos:**
  - `LogisticaDashboardPage.tsx` — Torre de Controle (5 cards de status, sem indicadores financeiros — adiados para R-LOG-5).
  - `LogisticaBuscaPage.tsx` — lista paginada com 7 filtros + paginação client-side.
  - `FreteDetalhePage.tsx` — 7 seções + timeline + upload câmera/arquivo (DACTE + comprovante).
  - `FreteOcorrenciaTimeline.tsx` — placeholder quando vazio; integração SSW chega em R-LOG-4.
  - `FreteStatusBadge.tsx` — chip colorido reutilizável.
  - `FreteResumoCard.tsx` — bloco "Entrega" inserido no Diálogo "Detalhes da Venda" (`SalesPage`).
- `src/services/logisticaService.ts` — wrappers HTTP. **R-LOG-2: 3 funções novas** (`listFretes`, `listFretesByStatus`, `getFreteWithOcorrencias`).
- `src/services/supabase.ts` — **R-LOG-2 novo singleton** do supabase-js (usado só para Storage upload em `logistica-comprovantes`).
- `src/App.tsx` — Page `'logistica'` adicionada ao tipo Page + item de menu gated `backofficeOnly + FEATURE_LOG_CRM_ENABLED`. **R-LOG-2: passa `onAbrirLogistica` para `SalesPage`** quando flag está ligada.
- `src/components/SalesPage.tsx` — **R-LOG-2: amplia `Sale.integracaoERP` com `notaFiscalNumero`** e renderiza `FreteResumoCard` dentro do Diálogo de visualização da venda quando a NFe foi emitida.

### Contratos
Zod em `packages/shared/types/`:
- `transportador-logistica.ts` — `TransportadorLogistica`, `Create`, `Update`, `GrupoTransportador`.
- `regiao-origem.ts` — `RegiaoDestino`, `OrigemFrete` + Create/Update.
- `frete-logistica.ts` — `FreteLogistica`, `Create`, `Update`, `StatusEntregaFrete`, `OcorrenciaSSW`, `TipoOcorrenciaSSW`.
- `fatura-transportadora.ts` — `FaturaTransportadora`, itens, `StatusFaturaTransportadora`.

## Features cobertas / planejadas

- **R-LOG-1** (em produção, V 1.36) — Schema + cadastros + Novo Frete manual.
- **R-LOG-2** (implementada, V 1.38, aguardando push/deploy) — Torre de Controle + Busca + Detalhe + bloco "Entrega" no detalhe do pedido + upload comprovante via câmera.
- **R-LOG-3** (backlog, classe C) — Hook em `tiny-enviar-pedido-venda-v1` cria frete automático.
- **R-LOG-4** (backlog, classe D) — Integração SSW Tracking. *Timeline já está pronta na UI; precisa apenas popular `frete_logistica_ocorrencia`.*
- **R-LOG-5** (backlog) — Indicadores financeiros do Dashboard.
- **R-LOG-6** (backlog) — Faturas — CRUD manual.
- **R-LOG-7** (backlog, classe D) — Parser PDF/EDI.
- **R-LOG-8** (backlog, classe C) — Auditoria Cotado × Cobrado.

## Débitos conhecidos

- **Bucket Supabase Storage `logistica-comprovantes`** ainda não criado — brief em `cursor-brief.md` Tarefa 9. UI degrada graciosamente (mensagem "Upload em breve").
- **Edge Function `frete-logistica-v1` precisa de redeploy** pós-R-LOG-2 — `npx supabase functions deploy frete-logistica-v1 --project-ref xxoiqfraeolsqsmsheue` (local, ADR-005 proíbe via MCP).
- **Sem integração SSW** — só estrutura (`frete_logistica_ocorrencia`). R-LOG-4. Timeline da UI já consome `OcorrenciaSSW` quando houver.
- **Sem parser PDF/EDI** de faturas — só estrutura. R-LOG-7.
- **Sem hook automático em pedidos** — frete manual apenas. R-LOG-3. Bloqueado pelo provisionamento de Supabase free de staging.
- **RLS minimalista** — defense-in-depth com SELECT para authenticated, escritas via service_role. Granularidade fina (vendedor vê só sua empresa) fica para R-LOG-3+.
- **Sem testes E2E HTTP** das Edge Functions — smoke real só em prod via Playwright. Unit/contract coberto via Vitest + Deno (10+ casos novos em R-LOG-2 para helpers de paginação e timeline).

## Decisões pendentes (vão virar ADRs)

Registradas em `docs/plans/DECISIONS_LOG.md`:
- **ADR-006** — Estratégia de credenciais SSW (1 conta por transportadora vs. chave NFe pura).
- **ADR-007** — Parser PDF/EDI: próprio vs. serviço externo.
- **ADR-008** — Frequência do polling SSW: cron vs. on-demand.
- **ADR-009** — Fonte de `valor_cotacao` no MVP: manual (MVP) vs. integração Tiny.

## Smoke E2E manual pós-staging

1. Aplicar migration 119 via Cursor MCP (cursor-brief Tarefa 8).
2. Confirmar 7 tabelas + 4 ENUMs + RLS habilitada.
3. Cadastrar secret `FEATURE_LOG_CRM='true'` em staging.
4. Deployar as 4 Edge Functions via Supabase CLI.
5. Frontend em preview Netlify com `VITE_FEATURE_LOG_CRM=true`.
6. Criar 1 transportador + 1 região + 1 origem + 1 frete manual via UI.
7. `select count(*) from frete_logistica` = 1.
8. Desligar flag (`'false'`) → confirmar 503 em todas as 4 funções + UI placeholder.

## Referências

- Feature Contract: `docs/plans/feature-contracts/F-LOG-1.md`.
- Context Pack: `docs/wiki/context/F-LOG-CRM.md`.
- Cursor brief: `docs/plans/cursor-brief.md` Tarefa 8.
- Decisões: `docs/plans/DECISIONS_LOG.md` (entradas de 2026-05-20).
- TODO: `TODO.md` §1 e §2 (R-LOG-2..8 no backlog).

---

*Próxima revisão prevista: após smoke verde em staging da migration 119.*
