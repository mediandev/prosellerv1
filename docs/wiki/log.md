# Wiki Log — ProSeller V1

> Histórico cronológico vivo. Toda feature B/C/D, bugfix, ingest, release e validação ganha 1 linha aqui.
> Formato: `YYYY-MM-DD · [TAG] · descrição curta · SHA/PR/feature`.
> Tags: `INGEST`, `RELEASE`, `BUGFIX`, `MIGRATION`, `ADR`, `RUNBOOK`, `VALIDATION`, `BLOCKED`, `MVP`.

## 2026-05-20

- 2026-05-20 · [BUGFIX] · `listas-preco-v2` POST/PUT agora persiste `produtos` e `faixasDesconto` nas tabelas filhas (`produtos_listas_precos`, `listas_preco_comissionamento`). Antes só salvava a master. Reportado por Valentim 2026-05-19. Edge function deployada + smoke E2E em prod (AC1+AC2) verde · SHA `64929c2` / PR #21 / V 1.34.

## 2026-05-19

- 2026-05-19 · [INGEST] · Bootstrap Harness v3.2 — Project Wiki criada, AGENTS/CLAUDE migrados para v3.2, `CURRENT_REALITY.md` gerado a partir do TODO + SPEC + ADRs + estado de produção (branch `chore/harness-v3.2-reorg`).
