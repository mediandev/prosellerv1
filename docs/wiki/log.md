# Wiki Log — ProSeller V1

> Histórico cronológico vivo. Toda feature B/C/D, bugfix, ingest, release e validação ganha 1 linha aqui.
> Formato: `YYYY-MM-DD · [TAG] · descrição curta · SHA/PR/feature`.
> Tags: `INGEST`, `RELEASE`, `BUGFIX`, `MIGRATION`, `ADR`, `RUNBOOK`, `VALIDATION`, `BLOCKED`, `MVP`.

## 2026-05-21

- 2026-05-21 · [BUGFIX] · INC-017: `clientes-v2` PUT/POST lia `body.tipoPessoa` antes do ID canônico, `Number("Pessoa Jurídica") = NaN` → null → RPC preservava `ref_tipo_pessoa_id_FK` antigo (geralmente null). Mesma família dos INC-008/009. Novo helper `extractRefTipoPessoaId` prioriza IDs e só aceita string numérica. Frontend: `descontoPadrao`/`descontoFinanceiro`/`pedidoMinimo` defaults trocados para `undefined` (evita zerar valor existente quando user não toca). Deploy edge function em prod via CLI + smoke E2E verde com cliente 7364 (E.R DA SILVA COSMETICOS) restaurando `ref_tipo_pessoa_id_FK=2`. V 1.37. Frontend Netlify pendente.
- 2026-05-21 · [RELEASE] · F-LOG-CRM R-LOG-1 deployada em PRODUÇÃO com flag LIGADA. Migration 119 aplicada via Cursor MCP `apply_migration` + 4 Edge Functions (transportador-logistica-v1, regiao-destino-v1, origem-frete-v1, frete-logistica-v1) deployadas via Supabase CLI local + `FEATURE_LOG_CRM=true` em Supabase Secrets + `VITE_FEATURE_LOG_CRM=true` em Netlify env (Production deploy `main@90dd9b6` 2026-05-21 14:51 BRT). Skip de `pg_dump` documentado em DECISIONS_LOG (DDL aditivo puro). Smoke E2E via Playwright em `proseller.app.br` autenticado como `lucas.carmo@flowcode.cc`: menu Logística visível para backoffice, criou 1 transportador (ATIVA TESTE), 1 região (MG-MATA), 1 origem (MG-JDF, empresa 8) e 1 frete (id=1, NFe 99999, R$100, status "Em Separação", JOINs verdes). Validação banco confirmou contagens 1/1/1/1 e payload completo. Próximas ondas R-LOG-2..8 entram conforme priorização com Valentim.

## 2026-05-20

- 2026-05-20 · [INGEST] · F-LOG-CRM planejamento (8 ondas) + R-LOG-1 mergeada em main: schema base do módulo Logística (migration 119), 4 cadastros (transportador, região, origem, frete manual), 4 Edge Functions atrás de `FEATURE_LOG_CRM` (default OFF), V 1.36. PR #22. Context Pack em `wiki/context/F-LOG-CRM.md`; ADR-006..009 pendentes em `DECISIONS_LOG`. ADR-006 cancelada por validação direta com SSW (integração pública por chave NFe, sem auth — confirmado via `ssw.inf.br/ajuda/trackingdanfe.html` + curl real).
- 2026-05-20 · [BUGFIX] · `produtos-v2?action=list` ganhou `LIMIT 2000` + `ORDER BY descricao ASC` — antes estourava `statement_timeout` do Postgres conforme a base crescia, e o frontend caía em fallback silencioso para `mockProdutos.ts` (12 itens Dell/Logitech), inutilizando o dropdown de Listas de Preço. Também adiciona `<Input>` editável inline de preço em `PriceListFormPage` (antes só era texto estático + lixeira). Smoke E2E AC1+AC2 verde em prod · SHA `7285e22` / PR #24 / V 1.35.
- 2026-05-20 · [BUGFIX] · `listas-preco-v2` POST/PUT agora persiste `produtos` e `faixasDesconto` nas tabelas filhas (`produtos_listas_precos`, `listas_preco_comissionamento`). Antes só salvava a master. Reportado por Valentim 2026-05-19. Edge function deployada + smoke E2E em prod (AC1+AC2) verde · SHA `64929c2` / PR #21 / V 1.34.

## 2026-05-19

- 2026-05-19 · [INGEST] · Bootstrap Harness v3.2 — Project Wiki criada, AGENTS/CLAUDE migrados para v3.2, `CURRENT_REALITY.md` gerado a partir do TODO + SPEC + ADRs + estado de produção (branch `chore/harness-v3.2-reorg`).
