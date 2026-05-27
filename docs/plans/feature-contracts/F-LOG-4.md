# F-LOG-4 · Integração SSW Tracking — on-demand com cache 30 min

**Risco:** **D** · **Branch:** `feat/log-crm-R-LOG-4` · **CI alvo:** N3 · **Depende de:** F-LOG-1 (V 1.36) + F-LOG-2 (V 1.38), ambas em produção.

## Objetivo

Popular `frete_logistica_ocorrencia` com dados reais da API SSW pública, atualizar automaticamente `status_entrega` do frete, e exibir timeline enriquecida no detalhe do frete (UI já entregue em R-LOG-2).

## ADR-008 (decidido 2026-05-26)

On-demand ao abrir detalhe do frete. Cache 30 min baseado em `created_at` da última ocorrência. Skip em status terminal (Entregue, Devolvido - Entregue). Sem cron. Fail-safe: se SSW retorna erro ou array vazio, NÃO deleta ocorrências existentes.

## Critérios de Aceite

| # | CA | Validação |
|---|---|---|
| 1 | `get_with_ocorrencias` consulta SSW quando cache > 30 min e chave NFe presente | Abrir detalhe do frete 1 (chave 3226...) → timeline popula com 7 ocorrências |
| 2 | Ocorrências persistidas em `frete_logistica_ocorrencia` com todos os campos | SELECT da tabela confirma 7 rows com `nome_recebedor`, `data_hora_efetiva` preenchidos no evento ENTREGUE |
| 3 | `status_entrega` atualizado automaticamente (mapper) | Frete 1 passa de "Em Separação" para "Entregue" após polling |
| 4 | Cache 30 min respeitado | Reabrir detalhe antes de 30 min → não chama SSW de novo (log Edge Function confirma) |
| 5 | Skip em status terminal | Frete com status "Entregue" → não chama SSW |
| 6 | Fail-safe: SSW fora do ar não apaga ocorrências | Simular erro SSW → ocorrências existentes preservadas |
| 7 | Flag `FEATURE_LOG_CRM_SSW=false` desliga polling | Desligar flag → `get_with_ocorrencias` retorna ocorrências do DB sem chamar SSW |
| 8 | `ssw-tracking-v1` standalone funciona | GET `?chave_nfe=3226...` retorna ocorrências normalizadas |
| 9 | Timeline UI exibe `nome_recebedor` em eventos de entrega | Evento "MERCADORIA ENTREGUE (01)" mostra "Recebido por: FULANO" |
| 10 | Bump V 1.39 visível no Sidebar | Tooltip mostra 3 bullets R-LOG-4 |

## Escopo incluído

- Migration 120 (ALTER TYPE + 3 ADD COLUMN).
- `_shared/ssw-client.ts` (fetch + parse + cache check).
- `_shared/frete-logistica-helpers.ts` (mapper SSW → status_entrega).
- `_shared/log-crm-feature-flag.ts` (FEATURE_LOG_CRM_SSW).
- `ssw-tracking-v1/index.ts` (standalone wrapper).
- `frete-logistica-v1/index.ts` (get_with_ocorrencias orquestra SSW).
- `packages/shared/types/ssw-tracking.ts` (Zod SSW response).
- `packages/shared/types/frete-logistica.ts` (3 campos novos + Entrega no enum).
- `FreteOcorrenciaTimeline.tsx` (cores, nome_recebedor, placeholder atualizado).
- `ChangelogPage.tsx` + `App.tsx` (V 1.39).
- ADR-008.

## Escopo excluído

- SalesPage (não tocar além de R-LOG-2).
- Cron / pg_cron.
- Tiny integration (R-LOG-3).
- Indicadores financeiros (R-LOG-5).
- Parser PDF/EDI (R-LOG-7 adiada).

## Rollback

1. `FEATURE_LOG_CRM_SSW=false` → polling para, timeline mostra dados do DB.
2. Redeploy `frete-logistica-v1` anterior (git checkout da versão R-LOG-2).
3. Migration 120 é DDL aditivo — colunas e enum value ficam inertes sem uso.

## Deploy (cursor-brief)

1. Migration 120 via Cursor MCP `apply_migration` direto em prod.
2. Secret `FEATURE_LOG_CRM_SSW=false` (nasce OFF).
3. `npx supabase functions deploy ssw-tracking-v1 --project-ref xxoiqfraeolsqsmsheue`.
4. `npx supabase functions deploy frete-logistica-v1 --project-ref xxoiqfraeolsqsmsheue`.
5. Frontend V 1.39 via Netlify.
6. Ligar `FEATURE_LOG_CRM_SSW=true`.
7. Smoke: abrir detalhe frete com chave NFe → timeline popula.
