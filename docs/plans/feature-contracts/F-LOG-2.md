# F-LOG-2 · Logística — Torre de Controle + Busca + Detalhe do frete + bloco Entrega no Pedido

**Risco:** B · **RFs cobertos:** F-LOG-CRM RF-2 (Torre de Controle), RF-3 (Busca), RF-4 (Detalhe) · **Branch:** `feat/log-crm-R-LOG-2` · **CI alvo:** N1 + matriz · **Depende de:** F-LOG-1 (mergeada e deployada em prod 2026-05-21).

## Objetivo

Recriar as 3 telas centrais do módulo Logis do LogCRM Bubble dentro do ProSeller V1 — Dashboard "Torre de Controle" (5 cards de status), Busca de fretes (lista paginada com filtros) e Detalhe do frete (timeline de ocorrências + dados + upload de DACTE/comprovante) — e adicionar um bloco compacto "Entrega" no detalhe do pedido (`SalesPage`) com link para o detalhe completo. Resultado de negócio: Valentim e o time Cântico conseguem operar 100% no ProSeller a partir de 2026-06-01, desligando o LogCRM Bubble.

## Definition of Ready

- [x] RFs vinculados — RF-2/3/4 do F-LOG-CRM (`docs/wiki/context/F-LOG-CRM.md`).
- [x] CAs claros e testáveis — 12 CAs verificáveis (ver seção dedicada).
- [x] Escopo **incluído** descrito — Dashboard + Busca + Detalhe + bloco Entrega + esconder Regiões/Origens + upload câmera + bucket Storage.
- [x] Escopo **excluído** descrito — SSW real (R-LOG-4), hook Tiny (R-LOG-3), indicadores financeiros (R-LOG-5), bug INC-018 permissões (sessão futura).
- [x] Classe **B** confirmada — sem migration nova, sem env var nova, sem secret novo, sem deploy de produção fora de Edge Function existente (`frete-logistica-v1`); RLS já existe; flag `FEATURE_LOG_CRM` já está ligada.
- [x] Arquivos prováveis listados (ver seção Arquivos).
- [x] Testes esperados — 3 testes (2 unit React + 1 edge Deno) cobrindo filtros e timeline placeholder.
- [x] Contratos Zod necessários — apenas estender tipo `ListFretesFilters` em `packages/shared/types/frete-logistica.ts` (sem novo schema).
- [x] Dependências externas — bucket Supabase Storage `logistica-comprovantes` (a criar via Cursor MCP).
- [x] Impacto em banco — somente SELECT (estende GET da Edge Function). Sem DDL.
- [x] Impacto em produção — redeploy de `frete-logistica-v1` via CLI local (ADR-005 proíbe deploy via MCP). Bucket Storage criado via MCP (op leve). Sem alteração de migration; sem alteração de schema.

## Critérios de aceite (12)

- **CA-1:** Given um agente lendo este arquivo, When abrir `docs/plans/feature-contracts/F-LOG-2.md`, Then encontra ≥ 40 linhas com DoR completo, CAs, escopo, arquivos, testes e gate de autonomia.
- **CA-2:** Given a Edge Function `frete-logistica-v1` redeployada, When chamar `GET ?action=list` com qualquer combinação dos 7 filtros (`cliente_id`, `transportador_id`, `empresa_id`, `status_entrega` CSV, `data_inicio`, `data_fim`, `nfe_numero` LIKE) + paginação, Then retorna apenas registros que casam todos os filtros e respeita `limit` (default 20, **hard cap 100** — lição INC-016).
- **CA-3:** Given a Edge Function deployada, When chamar `GET ?action=list_by_status`, Then retorna objeto com 5 buckets de status (`Em Trânsito`, `Reentrega`, `Agendados`, `Devoluções em Trânsito`, `Recusadas`), cada bucket com até 20 fretes mais recentes contendo `cliente.nome`, `transportador.razao_social` e `dias_em_transito` (calculado SQL).
- **CA-4:** Given a Edge Function deployada, When chamar `GET ?action=get_with_ocorrencias&id=N`, Then retorna `{ frete: {…joins…}, ocorrencias: [...ordenadas DESC por data_hora...] }`.
- **CA-5:** Given `VITE_FEATURE_LOG_CRM=true`, When usuário backoffice abrir Logística > Dashboard, Then vê 5 cards de status em grid 3+2 (desktop) / 1 coluna (mobile); cada card lista até 5 fretes recentes com clique levando ao `FreteDetalhePage`; cards vazios exibem mensagem "Nenhuma nota nesta situação...".
- **CA-6:** Given Logística > Busca, When aplicar filtros (Cliente, Transportador, Status multi, Período, Nº NFe), Then a lista paginada (20 cards por página) reflete os filtros via chamada `action=list`.
- **CA-7:** Given `FreteDetalhePage` aberto, Then mostra 6 seções (Identificação, Status, Datas, Transportador, Valores, Observações) + área "Atualizações no Transportador" com timeline reversa **ou** placeholder "Sem atualizações do transportador. Integração SSW chega na próxima entrega (R-LOG-4)." se vazio.
- **CA-8:** Given Logística (`LogisticaPage`), Then as abas `Regiões destino` e `Origens` **não aparecem** na barra; abas finais são Dashboard (default), Busca, Transportadores, Novo Frete.
- **CA-9:** Given `SalesPage` no diálogo "Detalhes da Venda" de um pedido com NFe emitida (`integracaoERP.notaFiscalNumero` presente) e flag `VITE_FEATURE_LOG_CRM=true`, Then aparece bloco "Entrega" com status, última ocorrência (ou placeholder) e botão "Ver detalhe completo →".
- **CA-10:** Given `FreteDetalhePage` em modo edição, When usuário clica em "Anexar comprovante de entrega", Then `<input type="file" capture="environment" accept="image/*,application/pdf">` abre câmera/picker; se bucket `logistica-comprovantes` existe, o upload persiste em Storage e atualiza `comprovante_entrega_url` no frete; se bucket não existe, exibe placeholder "Upload em breve".
- **CA-11:** Given um deploy desta feature, When usuário abre Sidebar, Then aparece V 1.38; o tooltip ✨ lista os 5 bullets de V 1.38 no topo.
- **CA-12:** Given `npm run build` rodado na raiz, Then completa com sucesso; `npm run typecheck` não introduz erros novos (apenas os 6 herdados); `git diff main..feat/log-crm-R-LOG-2` não toca `tiny-enviar-pedido-venda-v1`, `clientes-v2`, `update-user-v2`, ADRs, `docs/specs/SPEC.md` ou `supabase/migrations/`.

## Escopo

**Incluído:**

- Estender `supabase/functions/frete-logistica-v1/index.ts` com 2 actions novos + 5 filtros + paginação (hard cap 100).
- 3 wrappers novos em `src/services/logisticaService.ts`.
- 5 componentes React em `src/components/logistica/`: `LogisticaDashboardPage`, `LogisticaBuscaPage`, `FreteDetalhePage`, `FreteOcorrenciaTimeline`, `FreteStatusBadge`.
- Inserção cirúrgica do `FreteResumoCard` em `src/components/SalesPage.tsx` (diálogo "Detalhes da Venda").
- Esconder abas "Regiões destino" e "Origens" em `LogisticaPage.tsx`.
- Bucket Supabase Storage `logistica-comprovantes` (Cursor MCP) + upload via `<input type="file" capture="environment">`.
- Bump V 1.38 + 5 bullets no `ChangelogPage`.
- 3 testes (2 unit React Vitest + 1 edge Deno).
- Atualização de wiki (log, modules/logistica, context/F-LOG-CRM) + TODO §1 + INC-018 registrado em §5.

**Excluído (NÃO faz parte desta feature):**

- Integração SSW real (R-LOG-4).
- Hook em `tiny-enviar-pedido-venda-v1` (R-LOG-3 — exige staging Supabase).
- Indicadores financeiros do Dashboard (R-LOG-5).
- Correção do bug INC-018 (permissões de usuário). Apenas registrar no TODO.
- Apagar tabelas `regiao_destino` / `origem_frete` (só esconder na UI).
- Apagar registros de teste de prod (id=1 cada — evidência do deploy de 2026-05-21).

## Arquivos

**Podem ser alterados:**

- `supabase/functions/frete-logistica-v1/index.ts` (estender GET).
- `packages/shared/types/frete-logistica.ts` (estender tipo `ListFretesFilters`).
- `src/services/logisticaService.ts` (3 wrappers novos).
- `src/components/logistica/LogisticaPage.tsx` (esconder 2 abas, adicionar Dashboard/Busca, suportar deep-link para Detalhe).
- `src/components/logistica/LogisticaDashboardPage.tsx` (novo).
- `src/components/logistica/LogisticaBuscaPage.tsx` (novo).
- `src/components/logistica/FreteDetalhePage.tsx` (novo).
- `src/components/logistica/FreteOcorrenciaTimeline.tsx` (novo).
- `src/components/logistica/FreteStatusBadge.tsx` (novo).
- `src/components/logistica/FreteResumoCard.tsx` (novo).
- `src/components/SalesPage.tsx` (apenas amplia tipo `Sale.integracaoERP` + renderiza FreteResumoCard dentro do diálogo já existente — inserção mínima).
- `src/App.tsx` (apenas `systemVersion = "V 1.38"`).
- `src/components/ChangelogPage.tsx` (adiciona entrada V 1.38 no topo).
- `tests/unit/logistica-dashboard.test.tsx`, `tests/unit/frete-detalhe-timeline.test.tsx`, `tests/edge/frete-logistica-v1-list-filters.test.ts` (novos).
- Docs: `docs/wiki/log.md`, `docs/wiki/modules/logistica.md`, `docs/wiki/context/F-LOG-CRM.md`, `TODO.md`, `docs/plans/feature-contracts/F-LOG-4.md` (apenas nota dizendo que timeline já está pronta).

**NÃO podem ser alterados** (qualquer alteração exige pausa):

- `supabase/migrations/*.sql` — todos já aplicados; sem migration nova.
- `supabase/functions/tiny-enviar-pedido-venda-v1/*` (R-LOG-3).
- `supabase/functions/clientes-v2/*` e `supabase/functions/update-user-v2/*`.
- `docs/specs/SPEC.md`, `docs/contracts/CONTRACTS.md` e ADRs (`docs/decisions/`).
- `src/App.tsx` fora da linha de `systemVersion` (componente `SidebarUserInfo`).

## Contratos Zod

- Estender tipo `ListFretesFilters` em `packages/shared/types/frete-logistica.ts` para incluir os 7 filtros + paginação (sem novo schema validado; apenas tipo TS para consumo).
- `OcorrenciaSSW` e `FreteLogistica` já existem desde R-LOG-1 — reaproveitados.

## Testes obrigatórios (matriz)

| Teste | Tipo | CA coberto | Arquivo |
|---|---|---|---|
| Dashboard renderiza 5 cards com placeholder vazio | unit React (Vitest) | CA-5 | `tests/unit/logistica-dashboard.test.tsx` |
| Timeline placeholder quando sem ocorrências + renderiza lista quando preenchida | unit React (Vitest) | CA-7 | `tests/unit/frete-detalhe-timeline.test.tsx` |
| GET `action=list` aplica filtros + respeita `limit` cap 100 + flag OFF → 503 | edge Deno | CA-2, CA-12 | `tests/edge/frete-logistica-v1-list-filters.test.ts` |

## Comandos obrigatórios

CI alvo N1 + matriz:

- `npm run typecheck` (sem regressão além dos 6 erros herdados).
- `npm run lint`.
- `npm test`.
- `npm run build`.
- `deno test tests/edge/frete-logistica-v1-list-filters.test.ts` (opcional local; CI roda em separado).

## Infra / Produção

- **Migration:** não.
- **Env var nova:** não. `FEATURE_LOG_CRM` e `VITE_FEATURE_LOG_CRM` reaproveitadas.
- **Feature flag:** já ligada em prod.
- **Bucket Storage:** `logistica-comprovantes` (privado, autenticado). Criar via Cursor MCP. Se falhar, placeholder "Upload em breve" + INC novo no TODO §4.
- **Staging:** módulo já está ligado em prod; rebuild Netlify dispara automaticamente ao mergear. Edge Function redeployada via `npx supabase functions deploy frete-logistica-v1 --project-ref xxoiqfraeolsqsmsheue` local (ADR-005 — proibido via MCP).
- **Rollback plan:** desligar `VITE_FEATURE_LOG_CRM=false` em Netlify + rebuild (esconde toda a UI); ou desligar `FEATURE_LOG_CRM=false` no Supabase Secrets (Edge Function devolve 503). Em última instância, `git revert` do merge na main.

## Anti-SPEC relevante

- §6.4 — não tocar `tiny-enviar-pedido-venda-v1` (R-LOG-3).
- §6.7 — não criar migration que reuse número já aplicado (irrelevante aqui — sem migration).
- §6.8 — todo deploy de Edge Function via CLI local (não via MCP).
- §6.9 — bump `systemVersion` no Sidebar é obrigatório quando há deploy visível ao usuário.

## Matriz de validação (preenchida no QA — Prompt 3)

| CA | Teste | Tipo | Status | Evidência |
|---|---|---|---|---|
| CA-1 | leitura humana | manual | a executar | wc -l do próprio arquivo |
| CA-2 | `frete-logistica-v1-list-filters.test.ts` | edge | a executar | log `deno test` |
| CA-3 | smoke E2E em prod | manual | a executar | screenshot Dashboard |
| CA-4 | smoke E2E em prod | manual | a executar | screenshot Detalhe |
| CA-5 | `logistica-dashboard.test.tsx` | unit React | a executar | log `npm test` |
| CA-6 | smoke E2E em prod | manual | a executar | screenshot Busca |
| CA-7 | `frete-detalhe-timeline.test.tsx` | unit React | a executar | log `npm test` |
| CA-8 | smoke E2E em prod | manual | a executar | screenshot abas |
| CA-9 | smoke E2E em prod | manual | a executar | screenshot pedido detalhe |
| CA-10 | smoke E2E em prod | manual | a executar | upload foto via câmera |
| CA-11 | smoke E2E em prod | manual | a executar | screenshot sidebar |
| CA-12 | `npm run build` + `git diff` | automatizado | a executar | log local |

## Gate de autonomia

**Posso decidir sozinho:**

- Layout exato dos 5 cards e cards vazios.
- Estilo de badge de status (cores conforme prompt).
- Ordem dos filtros na Busca (decisão de UX leve).
- Microcopy dos placeholders.
- Estrutura interna de `ListFretesFilters` (tipos TS).
- Ordem dos commits dentro do lote.

**Devo pausar e perguntar:**

- Se `App.tsx` precisar de mudança maior que +5 linhas além do bump version (escopo expandiu).
- Se bucket Storage `logistica-comprovantes` falhar em criar via MCP (deixa placeholder "Upload em breve" + INC, não bloqueia).
- Se `SalesPage.tsx` precisar de refactor para encaixar bloco "Entrega".
- Se typecheck novo aparecer em arquivo não tocado (não consertar — reportar).
- Se `pedido_venda.numero_nfe` tiver formato diferente do esperado (adaptar apenas o lookup).
- Antes do `git push` final.

---

*Atualizado em 2026-05-21 (sessão R-LOG-2). Versão alvo: V 1.38.*
