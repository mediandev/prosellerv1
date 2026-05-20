# Wiki Log — ProSeller V1

> Histórico cronológico vivo. Toda feature B/C/D, bugfix, ingest, release e validação ganha 1 linha aqui.
> Formato: `YYYY-MM-DD · [TAG] · descrição curta · SHA/PR/feature`.
> Tags: `INGEST`, `RELEASE`, `BUGFIX`, `MIGRATION`, `ADR`, `RUNBOOK`, `VALIDATION`, `BLOCKED`, `MVP`.

## 2026-05-20

- 2026-05-20 · [INGEST] · F-LOG-CRM planejamento (8 ondas) + R-LOG-1 em execução: schema base do módulo Logística (migration 119), 4 cadastros (transportador, região, origem, frete manual), 4 Edge Functions atrás de `FEATURE_LOG_CRM` (default OFF), V 1.34. Branch `feat/log-crm-R-LOG-1`. Context Pack em `wiki/context/F-LOG-CRM.md`; ADR-006..009 pendentes em `DECISIONS_LOG`.

## 2026-05-19

- 2026-05-19 · [INGEST] · Bootstrap Harness v3.2 — Project Wiki criada, AGENTS/CLAUDE migrados para v3.2, `CURRENT_REALITY.md` gerado a partir do TODO + SPEC + ADRs + estado de produção (branch `chore/harness-v3.2-reorg`).
