# F-LOG-1 · Logística — Schema base + cadastros de lookup + Novo Frete manual

**Risco:** B · **RFs cobertos:** (RF da F-LOG-CRM ainda a registrar em SPEC retroativo — ver Onda R-3) · **Branch:** `feat/log-crm-R-LOG-1` · **CI alvo:** N1 + matriz

> Primeira onda da migração do módulo Logis (LogCRM Bubble → ProSeller V1). Onda **estrutural**: cria o schema da Logística + 4 cadastros de lookup + formulário manual de frete, tudo escondido atrás da feature flag `FEATURE_LOG_CRM` (default OFF). Não toca pedidos/Tiny/SSW — isso fica para R-LOG-3/4.

---

## Objetivo

Habilitar o cadastro manual de fretes na CANTICO (e demais empresas do grupo) dentro do ProSeller, recriando o caminho mais simples do LogCRM Bubble (`/logis_nova-nfe`). Entregar a base de dados + 4 Edge Functions + UI mínima para que, com a flag ligada, um backoffice consiga cadastrar transportadores, regiões, origens e um frete avulso. Nenhum fluxo existente (clientes/pedidos/Tiny) muda.

---

## Definition of Ready

- [x] RFs vinculados — pendente registro no SPEC retroativo (onda R-3). Justificativa: contrato é interno (sem alteração de API pública); Anti-SPEC §6 atual não restringe.
- [x] CAs claros e testáveis — ver §"Critérios de aceite".
- [x] Escopo incluído descrito.
- [x] Escopo excluído descrito.
- [x] Classificação confirmada: **B**. Tabelas novas, sem mexer em produção existente, sem auth/payment/dados sensíveis. Atrás de feature flag default OFF.
- [x] Arquivos prováveis listados.
- [x] Testes esperados: 1 unit Zod + 1 integration Deno + smoke E2E manual (documentado).
- [x] Contratos Zod necessários: `transportador-logistica.ts`, `regiao-origem.ts`, `frete-logistica.ts`, `fatura-transportadora.ts`.
- [x] Dependências externas: nenhuma nesta onda (SSW só em R-LOG-4).
- [x] Impacto em banco: migration 119, 7 tabelas novas, 4 ENUMs. **Não aplicada nesta sessão.**
- [x] Impacto em produção: nada — flag OFF default, migration e Edge Functions ficam no repositório aguardando brief humano para staging.

---

## Critérios de aceite (CAs)

- **CA-1** (transportador POST/GET) — Given backoffice autenticado E `FEATURE_LOG_CRM=true`, When POST `/transportador-logistica-v1` com `razao_social`, `cnpj` (14 dígitos), `grupo='ATIVA'`, Then 201 com `id`; GET subsequente retorna o registro.
- **CA-2** (região destino lookup) — Given backoffice E flag ON, When POST `/regiao-destino-v1` com `nome='MG-MATA'`, `uf='MG'`, Then 201; GET list retorna ≥1 entrada.
- **CA-3** (origem frete lookup) — Given backoffice E flag ON E empresa Cântico existente, When POST `/origem-frete-v1` com `nome='MG-JDF'`, `uf='MG'`, `empresa_id=<cantico>`, Then 201.
- **CA-4** (frete manual happy path) — Given transportador + região + origem cadastrados E flag ON, When POST `/frete-logistica-v1` com `nfe_numero`, `cliente_id`, `empresa_id`, `vendedor_id`, `transportador_id`, `regiao_destino_id`, `origem_frete_id`, `data_saida`, `valor_produtos`, Then 201 com frete persistido em `status_entrega='Em Separação'`.
- **CA-5** (Zod rejeita inválido) — Given payload sem `nfe_numero` ou com `valor_produtos` negativo, When parseado por `FreteLogisticaCreate`, Then `.safeParse` retorna `success=false`.
- **CA-6** (feature flag OFF) — Given `FEATURE_LOG_CRM` ausente OU `"false"`, When request a qualquer das 4 Edge Functions, Then 503 com mensagem clara "Logística feature flag desligada". Frontend renderiza placeholder "Funcionalidade em preparação".
- **CA-7** (RLS tenant-scoped) — Given vendedor autenticado, When tenta ler frete de empresa não atribuída a ele, Then RLS bloqueia. Backoffice vê tudo. (Verificado no smoke de staging — fora do CI.)

---

## Escopo

**Incluído:**
- Migration 119 com 7 tabelas (`transportador_logistica`, `regiao_destino`, `origem_frete`, `frete_logistica`, `frete_logistica_ocorrencia`, `fatura_transportadora`, `fatura_transportadora_item`) + 4 ENUMs + RLS + indexes.
- 4 Edge Functions CRUD direto via `supabase-js` (sem RPC): `transportador-logistica-v1`, `regiao-destino-v1`, `origem-frete-v1`, `frete-logistica-v1`.
- 4 schemas Zod em `packages/shared/types/` + re-export em `index.ts`.
- 5 componentes React em `src/components/logistica/`: `LogisticaPage`, `CadastroTransportadorPage`, `CadastroRegiaoDestinoPage`, `CadastroOrigemFretePage`, `NovoFretePage`.
- `src/services/logisticaService.ts` wrappers HTTP.
- Page `'logistica'` adicionada a `App.tsx` (gated `backofficeOnly` + flag).
- `vite-env.d.ts` declara `VITE_FEATURE_LOG_CRM`.
- 1 teste Deno + 1 teste Vitest Zod.
- Bump `systemVersion` para V 1.34 com bullet no Changelog.
- Atualização da wiki: `log.md`, `modules/logistica.md` (novo), `architecture.md`.
- Brief em `cursor-brief.md` (Tarefa 8) para aplicação da migration 119 em staging→prod.

**Excluído (NÃO faz parte desta onda):**
- Torre de Controle, Busca, Detalhe (R-LOG-2).
- Hook em `tiny-enviar-pedido-venda-v1` (R-LOG-3).
- Integração SSW Tracking (R-LOG-4).
- Indicadores financeiros do dashboard (R-LOG-5).
- CRUD/parser de faturas (R-LOG-6/7).
- Auditoria de Fretes (R-LOG-8).
- Aplicação real da migration 119 e deploy das Edge Functions — fica no repositório aguardando brief humano.
- Ativação de `FEATURE_LOG_CRM=true` em qualquer ambiente.

---

## Arquivos

**Podem ser alterados:**
- `supabase/migrations/119_frete_logistica_base.sql` (novo)
- `supabase/functions/transportador-logistica-v1/index.ts` (novo)
- `supabase/functions/regiao-destino-v1/index.ts` (novo)
- `supabase/functions/origem-frete-v1/index.ts` (novo)
- `supabase/functions/frete-logistica-v1/index.ts` (novo)
- `packages/shared/types/transportador-logistica.ts` (novo)
- `packages/shared/types/regiao-origem.ts` (novo)
- `packages/shared/types/frete-logistica.ts` (novo)
- `packages/shared/types/fatura-transportadora.ts` (novo)
- `packages/shared/types/index.ts` (re-export)
- `src/components/logistica/*` (novos)
- `src/services/logisticaService.ts` (novo)
- `src/App.tsx` (adicionar Page `'logistica'`, item de menu, switch, bump V 1.34)
- `vite-env.d.ts` (adicionar `VITE_FEATURE_LOG_CRM`)
- `tests/unit/frete-logistica.zod.test.ts` (novo)
- `tests/edge/frete-logistica-v1.test.ts` (novo)
- `TODO.md`, `docs/plans/cursor-brief.md`, `docs/plans/DECISIONS_LOG.md`, `docs/plans/feature-contracts/F-LOG-{1..8}.md`, `docs/wiki/{context/F-LOG-CRM,log,architecture,modules/logistica}.md`
- `archive/screenshots/2026-05-20-logcrm/*.png` (mover untracked da raiz)

**NÃO podem ser alterados** (qualquer alteração exige pausa):
- `supabase/migrations/<anteriores>` (regra de ouro).
- `supabase/functions/clientes-v2/`, `tiny-enviar-pedido-venda-v1/`, `tiny-empresa-natureza-operacao-v2/` — escopo de R-LOG-3.
- `docs/specs/SPEC.md`, `docs/contracts/CONTRACTS.md`, ADRs existentes (001-005).
- `src/App.tsx` componente `SidebarUserInfo` exceto para bump V 1.34.
- `src/data/mock*.ts` e `src/services/*.ts` (outros que não `logisticaService.ts`).

---

## Contratos Zod

A criar em `packages/shared/types/`:
- `transportador-logistica.ts` — `TransportadorLogistica`, `TransportadorLogisticaCreate`, `TransportadorLogisticaUpdate`, enum `GrupoTransportador` (`ATIVA | BRASSPRESS | TA_AMERICANA | CAMILO`).
- `regiao-origem.ts` — `RegiaoDestino`, `OrigemFrete` (+ Create/Update).
- `frete-logistica.ts` — `FreteLogistica`, `FreteLogisticaCreate`, `FreteLogisticaUpdate`, enum `StatusEntregaFrete` (9 valores), `OcorrenciaSSW`, enum `TipoOcorrenciaSSW`.
- `fatura-transportadora.ts` — `FaturaTransportadora`, `FaturaTransportadoraCreate`, `FaturaTransportadoraUpdate`, `FaturaTransportadoraItem`, enum `StatusFaturaTransportadora`.

Atualizar `packages/shared/types/index.ts` com re-exports.

Regra absoluta: schema Zod **primeiro**, código depois.

---

## Testes obrigatórios (matriz)

| Teste | Tipo | CA coberto | Arquivo |
|---|---|---|---|
| `frete-logistica.zod.test.ts::rejeita_payload_incompleto` | unit | CA-5 | `tests/unit/frete-logistica.zod.test.ts` |
| `frete-logistica.zod.test.ts::aceita_payload_valido` | unit | CA-5 | idem |
| `frete-logistica-v1.test.ts::post_cria_frete_quando_flag_on` | integration (Deno) | CA-4 | `tests/edge/frete-logistica-v1.test.ts` |
| `frete-logistica-v1.test.ts::responde_503_quando_flag_off` | integration (Deno) | CA-6 | idem |
| Smoke E2E manual (documentado em Context Pack) | smoke | CA-1..4 + CA-7 | `docs/wiki/context/F-LOG-CRM.md` |

---

## Comandos obrigatórios

CI N1 + matriz (classe B):
- `npm run typecheck` (continue-on-error — débito herdado)
- `npm run lint` (no-op)
- `npm test` (Vitest)
- `npm run build` (deve passar)
- `npm run test:edge` (Deno, somente local)

---

## Infra / Produção

- **Migration:** **119_frete_logistica_base.sql** — 7 tabelas + 4 ENUMs + RLS + indexes. **NÃO aplicada** nesta sessão. Brief em `cursor-brief.md` Tarefa 8 para staging→prod.
- **Env var nova:** `FEATURE_LOG_CRM` (Edge Functions, Deno) + `VITE_FEATURE_LOG_CRM` (frontend). Default OFF. **Não cadastrar em produção nesta sessão.**
- **Feature flag:** sim, default OFF nos 2 lugares.
- **Staging:** ver `cursor-brief.md` Tarefa 8.
- **Rollback plan:** `DROP TABLE` na ordem inversa (escrito no brief). Como a flag está OFF e nenhum código de produção referencia as 7 tabelas novas, rollback é completamente reversível.

---

## Anti-SPEC relevante

- F-LOG-CRM não toca payload Tiny — Anti-SPEC §6 sobre `tiny_empresa_natureza_operacao` e payload Tiny **não se aplica** a esta onda.
- Não introduzir cron / job em loop para SSW nesta onda (R-LOG-4).
- Não exibir CNPJ completo do transportador em log (mascarar nas Edge Functions, mesmo padrão F-001 RNF-003).

---

## Matriz de validação (preencher no QA — Prompt 3)

| CA | Teste | Tipo | Status | Evidência |
|---|---|---|---|---|
| CA-1 | smoke E2E staging — `select count(*) from transportador_logistica` ≥ 1 | smoke | pendente | log do staging pós-brief Tarefa 8 |
| CA-2 | smoke E2E staging — `select count(*) from regiao_destino` ≥ 1 | smoke | pendente | idem |
| CA-3 | smoke E2E staging — `select count(*) from origem_frete` ≥ 1 | smoke | pendente | idem |
| CA-4 | `frete-logistica-v1.test.ts::post_cria_frete_quando_flag_on` | integration (Deno) | pendente | output `npm run test:edge` |
| CA-5 | `frete-logistica.zod.test.ts::*` | unit | pendente | output `npm test` |
| CA-6 | `frete-logistica-v1.test.ts::responde_503_quando_flag_off` | integration (Deno) | pendente | idem |
| CA-7 | smoke E2E staging | smoke | pendente | log com 2 usuários (backoffice + vendedor) |

---

## Gate de autonomia

**Posso decidir sozinho:**
- Forma exata das colunas e ENUMs dentro da migration 119 (sem mexer em tabelas existentes).
- Wrappers HTTP no `logisticaService.ts`.
- Naming dos componentes React e estrutura interna.

**Devo pausar e perguntar:**
- Se descobrir necessidade de migrar dados existentes ou tocar pedido_venda/clientes-v2.
- Se RLS exigir alteração em policies fora das 7 tabelas novas.
- Se algum dos 4 ADRs pendentes (006-009) virar bloqueador antes do merge.
- Se o débito herdado de typecheck (6 erros em ERPConfigMulticompany.tsx + tinyERPSync_temp.ts) for tocado pela feature nova.

---

*Onda 1 de 8 — F-LOG-CRM. Próxima: R-LOG-2 (Torre de Controle + Busca + Detalhe).*
