# F-LOG-4 · Integração SSW Tracking — Edge Function + polling + ocorrências

**Risco:** **D** · **Branch:** `feat/log-crm-R-LOG-4` (futura) · **CI alvo:** N3 · **Depende de:** F-LOG-1 + F-LOG-2.

> **Esqueleto.** Classe D — integração externa em produção, env var nova, dependência de quota/rate-limit SSW. ADR-006 e ADR-008 obrigatórios antes.

## Objetivo

Atualizar `frete_logistica_ocorrencia` consumindo a API SSW (`https://ssw.inf.br/api/trackingdanfe` para a versão pública, ou endpoint autenticado por transportadora). Estratégia: **on-demand** ao abrir Detalhe do frete (Bubble faz assim) + cron diário de catch-up para fretes "Em Trânsito" há > 24h.

## Definition of Ready

- [ ] **ADR-006** decidido: credenciais SSW (1 conta por transportadora vs. chave NFe pura).
- [ ] **ADR-008** decidido: frequência do polling (on-demand vs. cron).
- [ ] Quota e rate-limit SSW levantados.
- [ ] Mapping código SSW → `tipo_ocorrencia_ssw` definido.
- [ ] Feature flag `FEATURE_LOG_CRM_SSW`.
- [ ] Rollback plan para staging→prod.

## Escopo incluído

- `supabase/functions/ssw-tracking-v1/index.ts` — wrapper de chamada SSW.
- `supabase/functions/frete-logistica-v1` GET-by-id passa a chamar `ssw-tracking-v1` se `transportador.ssw_dominio != null` e cache stale.
- Cron Supabase pg_cron (job `ssw_catchup_diario`) — se ADR-008 escolher esse caminho.
- Coluna `transportador_logistica.ssw_credencial_secret_ref` se ADR-006 escolher 1 conta por transportadora.

## Escopo excluído

- UI de configuração de credenciais SSW por transportadora (talvez F-LOG-4a).
- Indicadores SLA (R-LOG-5).

## Arquivos prováveis

- `supabase/functions/ssw-tracking-v1/index.ts`
- `supabase/functions/frete-logistica-v1/index.ts` (modificada)
- Migration ~120+ para `ssw_credencial_secret_ref` e cron job.

## Dependências externas

- API SSW (https://ssw.inf.br/api/trackingdanfe) — verificar SLA.
- Secrets Supabase (uma por transportadora se ADR-006 escolher esse caminho).

## Bloqueadores

- ADR-006 e ADR-008 pendentes — **não abrir esta onda antes**.
