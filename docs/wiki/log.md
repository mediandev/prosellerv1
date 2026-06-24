# Wiki Log — ProSeller V1

> Histórico cronológico vivo. Toda feature B/C/D, bugfix, ingest, release e validação ganha 1 linha aqui.
> Formato: `YYYY-MM-DD · [TAG] · descrição curta · SHA/PR/feature`.
> Tags: `INGEST`, `RELEASE`, `BUGFIX`, `MIGRATION`, `ADR`, `RUNBOOK`, `VALIDATION`, `BLOCKED`, `MVP`.

## 2026-06-24

- 2026-06-24 · [BUGFIX] · Webhook Tiny NF-e: casa nota por `id_venda` quando `idPedidoEcommerce` vem vazio (deploy v31). Backfill de 88 notas reais; cadastro de 6 transportadoras + vínculo nos fretes; validação do rastreio SSW (cobertura 37/89). SHA `c31f802`. Detalhe: [logistica-status-2026-06-24](logistica-status-2026-06-24.md).
- 2026-06-24 · [BUGFIX] · Produtos: imagens voltam na listagem via lazy-load sob demanda · PR #71 (V 1.65) · SHA `36dc138`.
- 2026-06-24 · [CHORE] · Git: corrigido refspec do clone (`master`→`*`) que causava a confusão recorrente "main vs master"; `origin/main` sincronizado. Ver memória `git-branch-main-vs-master`.

## 2026-06-22

- 2026-06-22 · [BUGFIX] · feat/revisao-geral (V 1.63) — CustomerMixTab reescrito para Supabase direto (contorna status-mix-v2 não deployada); ABC Clientes: Grupo/Rede → combobox pesquisável, status "Pendentes", fallback "Cliente #ID". Migration 137 pendente aplicação em prod. SHA 1392ff9.
- 2026-06-22 · [BUGFIX] · fix/conta-corrente-arquivos (V 1.61) — Conta Corrente: handlers de visualizar/baixar arquivo agora abrem URL real; mapper de arquivosAnexos string[] corrigido no detail fetch (CompromissoDialogDetalhes via handleVisualizarCompromisso) e no list fetch.
- 2026-06-22 · [BUGFIX] · fix/mix-indicadores-v160 (V 1.60) — Aba Mix: produtos carregam filtrando por ativo/disponivel; fetch separado para não bloquear por falha no status-mix. Aba Indicadores: LTV e performance calculados de vendas reais. Backend: edge function status-mix-v2 + migration 137 (status_mix table). PR #67.
- 2026-06-22 · [BUGFIX] · fix/abc-clientes-paginacao (V 1.59) — Curva ABC de Clientes, Mix por Cliente e ROI por Cliente agora carregam todos os clientes via paginação completa (antes: apenas 10 de 960). Filtro Grupo/Rede: corrigido exibição de UUID no lugar do nome do grupo (workaround client-side em mapClienteFromApi). Filtro Natureza de Operação: exibe apenas naturezas presentes nas vendas do período.

## 2026-05-26

- 2026-05-26 · [INGEST] · F-LOG-CRM R-LOG-4 implementada (SSW Tracking on-demand com cache 30 min). Migration 120 (ALTER TYPE `Entrega` + 3 ADD COLUMN). Nova Edge Function `ssw-tracking-v1` + `frete-logistica-v1` estendida com polling SSW. Mapper SSW → status_entrega automático. ADR-008 documentado. Feature flag `FEATURE_LOG_CRM_SSW` separada (nasce OFF). V 1.39. Branch `feat/log-crm-R-LOG-4`.

## 2026-05-21

- 2026-05-21 · [RELEASE] · F-LOG-CRM R-LOG-2 deployada em PRODUÇÃO (V 1.38). PR #28 mergeada em main (`5b6193b`). Edge Function `frete-logistica-v1` redeployada via Supabase CLI com extensões (7 filtros + actions `list_by_status`/`get_with_ocorrencias`). Netlify rebuild Published 18:22 BRT. Smoke E2E via Playwright `lucas.carmo@flowcode.cc`: V 1.38 confirmada Sidebar; Torre de Controle 5 cards (Em Trânsito 1 / Reentrega 0 / Agendados 0 / Devoluções 0 / Recusadas 0) com NFe 99999 listada; Busca encontrou frete id=1 com filtros; Detalhe view 7 seções + edit (mudou status Em Separação → Em Trânsito, persistiu, voltou Dashboard atualizado); timeline placeholder "Sem atualizações... R-LOG-4". Bloco "Entrega" no detalhe do pedido validado por análise de código (`SalesPage.tsx:2024` — condição `FEATURE_LOG_CRM_ENABLED && selectedSale.integracaoERP?.notaFiscalNumero` correta); visual smoke pendente em pedido Faturado/Enviado. Bucket Storage `logistica-comprovantes` ainda não criado (Tarefa 9 cursor-brief) — botão "Tirar foto / Anexar" exposto, upload degrada graciosamente. Screenshots em `archive/screenshots/2026-05-21-e2e-rlog2-prod/`.
- 2026-05-21 · [INGEST] · F-LOG-CRM R-LOG-2 implementada (Torre de Controle + Busca + Detalhe + bloco "Entrega" no detalhe do pedido + upload comprovante via câmera HTML5 + V 1.38). Estende `frete-logistica-v1` GET com 7 filtros, paginação (hard cap 100 — lição INC-016), `action=list_by_status` (5 buckets) e `action=get_with_ocorrencias`. Abas "Regiões destino" e "Origens" removidas do `LogisticaPage` por decisão Valentim 2026-05-21 (tabelas permanecem no banco). Bucket Supabase Storage `logistica-comprovantes` pendente de criação via Cursor MCP (Tarefa 9 no cursor-brief) — UI degrada graciosamente. Branch `feat/log-crm-R-LOG-2` aguardando autorização humana para push.
- 2026-05-21 · [INGEST] · Call Valentim 26 min (15:15 BRT). Decisões de produto pra R-LOG-2: esconder abas "Regiões destino" e "Origens" do LogisticaPage (Valentim não usa); manter Transportadores + Grupo; adicionar seção "Entrega" dentro do detalhe do pedido com timeline + preview de comprovante; foto via câmera HTML5 do navegador; indicadores financeiros adiados (R-LOG-5 backlog); **prazo 2026-05-22 fim de tarde**. Bug novo de permissões de usuário não persistirem (`update-user-v2`) — prioridade pré-1ºJun. Não migrar histórico Bubble. Detalhes em `wiki/context/F-LOG-CRM-call-valentim-2026-05-21.md`.
- 2026-05-21 · [BUGFIX] · INC-017: `clientes-v2` PUT/POST lia `body.tipoPessoa` antes do ID canônico, `Number("Pessoa Jurídica") = NaN` → null → RPC preservava `ref_tipo_pessoa_id_FK` antigo (geralmente null). Mesma família dos INC-008/009. Novo helper `extractRefTipoPessoaId` prioriza IDs e só aceita string numérica. Frontend: `descontoPadrao`/`descontoFinanceiro`/`pedidoMinimo` defaults trocados para `undefined` (evita zerar valor existente quando user não toca). Deploy edge function em prod via CLI + smoke E2E verde com cliente 7364 (E.R DA SILVA COSMETICOS) restaurando `ref_tipo_pessoa_id_FK=2`. V 1.37. Frontend Netlify pendente.
- 2026-05-21 · [RELEASE] · F-LOG-CRM R-LOG-1 deployada em PRODUÇÃO com flag LIGADA. Migration 119 aplicada via Cursor MCP `apply_migration` + 4 Edge Functions (transportador-logistica-v1, regiao-destino-v1, origem-frete-v1, frete-logistica-v1) deployadas via Supabase CLI local + `FEATURE_LOG_CRM=true` em Supabase Secrets + `VITE_FEATURE_LOG_CRM=true` em Netlify env (Production deploy `main@90dd9b6` 2026-05-21 14:51 BRT). Skip de `pg_dump` documentado em DECISIONS_LOG (DDL aditivo puro). Smoke E2E via Playwright em `proseller.app.br` autenticado como `lucas.carmo@flowcode.cc`: menu Logística visível para backoffice, criou 1 transportador (ATIVA TESTE), 1 região (MG-MATA), 1 origem (MG-JDF, empresa 8) e 1 frete (id=1, NFe 99999, R$100, status "Em Separação", JOINs verdes). Validação banco confirmou contagens 1/1/1/1 e payload completo. Próximas ondas R-LOG-2..8 entram conforme priorização com Valentim.

## 2026-05-20

- 2026-05-20 · [INGEST] · F-LOG-CRM planejamento (8 ondas) + R-LOG-1 mergeada em main: schema base do módulo Logística (migration 119), 4 cadastros (transportador, região, origem, frete manual), 4 Edge Functions atrás de `FEATURE_LOG_CRM` (default OFF), V 1.36. PR #22. Context Pack em `wiki/context/F-LOG-CRM.md`; ADR-006..009 pendentes em `DECISIONS_LOG`. ADR-006 cancelada por validação direta com SSW (integração pública por chave NFe, sem auth — confirmado via `ssw.inf.br/ajuda/trackingdanfe.html` + curl real).
- 2026-05-20 · [BUGFIX] · `produtos-v2?action=list` ganhou `LIMIT 2000` + `ORDER BY descricao ASC` — antes estourava `statement_timeout` do Postgres conforme a base crescia, e o frontend caía em fallback silencioso para `mockProdutos.ts` (12 itens Dell/Logitech), inutilizando o dropdown de Listas de Preço. Também adiciona `<Input>` editável inline de preço em `PriceListFormPage` (antes só era texto estático + lixeira). Smoke E2E AC1+AC2 verde em prod · SHA `7285e22` / PR #24 / V 1.35.
- 2026-05-20 · [BUGFIX] · `listas-preco-v2` POST/PUT agora persiste `produtos` e `faixasDesconto` nas tabelas filhas (`produtos_listas_precos`, `listas_preco_comissionamento`). Antes só salvava a master. Reportado por Valentim 2026-05-19. Edge function deployada + smoke E2E em prod (AC1+AC2) verde · SHA `64929c2` / PR #21 / V 1.34.

## 2026-05-19

- 2026-05-19 · [INGEST] · Bootstrap Harness v3.2 — Project Wiki criada, AGENTS/CLAUDE migrados para v3.2, `CURRENT_REALITY.md` gerado a partir do TODO + SPEC + ADRs + estado de produção (branch `chore/harness-v3.2-reorg`).

## 2026-06-22

- 2026-06-22 · [BUGFIX] · `fix/relatorios-include-itens` (PR #64 / V 1.58) — Relatórios SolicitadoFaturado e MixCliente agora passam `include_itens=true` para carregar produtos. Badge Backoffice/Vendedor adicionado na lista de Usuários. SHA `59e2724`.
2026-06-22 · [FIX] · Relatórios ABC Produtos/Mix/ROI: auth Supabase corrigida (JWT inject), loading infinito ROI, include_itens → query direta · PR #69 (V 1.62)
