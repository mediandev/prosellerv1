# Wiki Log — ProSeller V1

> Histórico cronológico vivo. Toda feature B/C/D, bugfix, ingest, release e validação ganha 1 linha aqui.
> Formato: `YYYY-MM-DD · [TAG] · descrição curta · SHA/PR/feature`.
> Tags: `INGEST`, `RELEASE`, `BUGFIX`, `MIGRATION`, `ADR`, `RUNBOOK`, `VALIDATION`, `BLOCKED`, `MVP`.

## 2026-05-20

- 2026-05-20 · [INGEST] · F-LOG-CRM planejamento (8 ondas) + R-LOG-1 mergeada em main: schema base do módulo Logística (migration 119), 4 cadastros (transportador, região, origem, frete manual), 4 Edge Functions atrás de `FEATURE_LOG_CRM` (default OFF), V 1.36. PR #22. Context Pack em `wiki/context/F-LOG-CRM.md`; ADR-006..009 pendentes em `DECISIONS_LOG`. ADR-006 cancelada por validação direta com SSW (integração pública por chave NFe, sem auth — confirmado via `ssw.inf.br/ajuda/trackingdanfe.html` + curl real).
- 2026-05-20 · [BUGFIX] · `produtos-v2?action=list` ganhou `LIMIT 2000` + `ORDER BY descricao ASC` — antes estourava `statement_timeout` do Postgres conforme a base crescia, e o frontend caía em fallback silencioso para `mockProdutos.ts` (12 itens Dell/Logitech), inutilizando o dropdown de Listas de Preço. Também adiciona `<Input>` editável inline de preço em `PriceListFormPage` (antes só era texto estático + lixeira). Smoke E2E AC1+AC2 verde em prod · SHA `7285e22` / PR #24 / V 1.35.
- 2026-05-20 · [BUGFIX] · `listas-preco-v2` POST/PUT agora persiste `produtos` e `faixasDesconto` nas tabelas filhas (`produtos_listas_precos`, `listas_preco_comissionamento`). Antes só salvava a master. Reportado por Valentim 2026-05-19. Edge function deployada + smoke E2E em prod (AC1+AC2) verde · SHA `64929c2` / PR #21 / V 1.34.

## 2026-05-19

- 2026-05-19 · [INGEST] · Bootstrap Harness v3.2 — Project Wiki criada, AGENTS/CLAUDE migrados para v3.2, `CURRENT_REALITY.md` gerado a partir do TODO + SPEC + ADRs + estado de produção (branch `chore/harness-v3.2-reorg`).
