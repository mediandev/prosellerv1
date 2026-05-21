# F-LOG-4 · Integração SSW Tracking — Edge Function + ocorrências

**Risco:** **D** · **Branch:** `feat/log-crm-R-LOG-4` (futura) · **CI alvo:** N3 · **Depende de:** F-LOG-1 + F-LOG-2 (ambas em produção a partir de V 1.38).

> **Esqueleto v3 (2026-05-21).** Classe D mantida porque toca produção + integração externa, mas:
>  - API SSW pública (sem auth, sem ADR-006), rate limit 20 req/s.
>  - **R-LOG-2 (V 1.38) já entregou a UI da timeline** (`FreteOcorrenciaTimeline`) com placeholder quando `frete_logistica_ocorrencia` está vazia. Esta onda precisa apenas popular a tabela — não há mais trabalho de frontend.

## Objetivo

Atualizar `frete_logistica_ocorrencia` consumindo a API SSW pública. Estratégia provável (a confirmar em ADR-008): **on-demand** ao abrir Detalhe do frete (Bubble faz assim) com **cache local de 30-60 min** em `frete_logistica_ocorrencia.updated_at`. Cron Supabase opcional como catch-up diário para fretes "Em Trânsito" há > 24h sem polling recente.

## Contrato da API SSW (confirmado 2026-05-20)

- **Endpoint:** `POST https://ssw.inf.br/api/trackingdanfe`
- **Auth:** nenhuma.
- **Headers:** `Content-Type: application/json` (resposta JSON) ou `application/x-www-form-urlencoded` (resposta XML).
- **Body JSON:** `{"chave_nfe": "<44 dígitos>"}`.
- **Body form:** `chave_nfe=<44 dígitos>`.
- **Schema resposta (mínimo confirmado):** `{success: boolean, message: string, ...}`. Campos extras do `success=true` (timeline ocorrências) pendentes — falta 1 chave NFe ativa para mapear (Valentim, sem urgência; podemos usar chave da doc `43160400850257000132550010000083991000083990` como exemplo Zod parcial).
- **Erros mapeados:**
  - `{success:false, message:"Chave da DANFE deve possuir 44 digitos."}` — chave curta ou ausente.
  - `{success:false, message:"Chave da DANFE invalida."}` — chave com caracteres não numéricos.
  - `{success:false, message:"Nenhum documento localizado"}` — chave 44 dígitos mas não conhecida pela SSW.
  - `{success:false, message:"Method not allowed"}` — GET (só POST é aceito).
- **Rate limit oficial:** 20 req/s ("Todas as chamadas para APIs e Webservices tem um limite de 20 requisições por segundo. As chamadas extras serão recusadas." — `ssw.inf.br/ajuda`).
- **Documentação oficial:** `https://ssw.inf.br/ajuda/trackingdanfe.html`.

## Definition of Ready

- [x] ~~ADR-006~~ **CANCELADA** — integração pública, sem credenciais por transportadora. Ver DECISIONS_LOG 2026-05-20.
- [ ] **ADR-008** decidido: frequência do polling (on-demand + cache vs. cron periódico vs. híbrido).
- [x] Rate-limit SSW levantado: **20 req/s.**
- [ ] Schema completo da resposta SSW `success=true` mapeado (precisa 1 chave NFe ativa do Valentim — sem urgência, ou usar chave da doc para esqueleto Zod).
- [ ] Mapping código SSW → `tipo_ocorrencia_ssw` definido (códigos vistos: 01, 02, 67, 71, 80 — listar completo via Valentim ou observação).
- [ ] Feature flag `FEATURE_LOG_CRM_SSW` (separada de `FEATURE_LOG_CRM` para permitir polling off enquanto cadastros estão on).
- [ ] Rollback plan para staging→prod.

## Escopo incluído

- `supabase/functions/ssw-tracking-v1/index.ts` — wrapper Deno da chamada SSW pública. Recebe `nfe_chave_acesso`, retorna ocorrências normalizadas em formato Zod `OcorrenciaSSW`.
- `supabase/functions/frete-logistica-v1` GET-by-id passa a chamar `ssw-tracking-v1` quando `nfe_chave_acesso != null` e `updated_at` da última ocorrência > N minutos.
- Cron Supabase `pg_cron` (job `ssw_catchup_diario`) — se ADR-008 escolher esse caminho.
- Persistência em `frete_logistica_ocorrencia` (tabela já criada em migration 119) com `raw_payload jsonb` preservando resposta original.
- Mapper `codigo_ssw → status_entrega` para atualizar o status interno do frete a partir dos códigos SSW (ex.: 01 → "Entregue", 02 → "Agendado").

## Escopo excluído

- UI de configuração de credenciais SSW por transportadora (não existe mais — ADR-006 cancelada).
- Indicadores SLA (R-LOG-5).
- Suporte a outras transportadoras fora SSW (TA-AMERICANA, CAMILO DOS SANTOS — `transportador_logistica.ssw_dominio = NULL` → não consulta API).

## Arquivos prováveis

- `supabase/functions/ssw-tracking-v1/index.ts` (novo).
- `supabase/functions/frete-logistica-v1/index.ts` (modificada — adiciona chamada ssw-tracking-v1 no GET-by-id).
- `packages/shared/types/ssw-tracking.ts` (novo Zod schema da resposta).
- `packages/shared/types/frete-logistica.ts` (estende `OcorrenciaSSW` com campos confirmados).
- Migration `~120` para `pg_cron` job se ADR-008 escolher esse caminho.

## Dependências externas

- API SSW pública (`https://ssw.inf.br/api/trackingdanfe`).
- Rate limit 20 req/s — projetar batch/throttle.

## Bloqueadores

- **ADR-008** pendente — não abrir esta onda antes.
- R-LOG-1 deployada em produção (atualmente PR #22 mergeada em main, aguardando deploy via cursor-brief Tarefa 8).
- R-LOG-2 pelo menos parcial (Detalhe do frete onde o polling on-demand acontece).
