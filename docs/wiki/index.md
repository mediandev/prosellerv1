# Project Wiki — ProSeller V1

> Memória sintetizada viva do projeto. **Primeira leitura** de qualquer agente.
> Nunca é fonte de verdade — sintetiza PRD/SPEC/CONTRACTS/ADR/TODO.

ProSeller V1 é um sistema comercial **em produção** (`proseller.app.br`) sobre React + Supabase + Tiny ERP. Estado atual: **V 1.33** · Cenário Harness: **C (em produção)**.

---

## Onde encontro o quê

| Preciso de... | Vai em... |
|---|---|
| Mapa da memória sintetizada | `docs/wiki/index.md` (este arquivo) |
| Histórico cronológico (release, bugfix, ingest) | `docs/wiki/log.md` |
| Projeto em 1 página | `docs/wiki/overview.md` |
| Arquitetura técnica viva | `docs/wiki/architecture.md` |
| Memória por área | `docs/wiki/modules/<mod>.md` |
| Receita operacional / bug recorrente | `docs/wiki/runbooks/<slug>.md` |
| Context Pack reusável entre agentes | `docs/wiki/context/<F-NNN>.md` |
| Resumo de feature após merge C/D | `docs/wiki/features/<F-NNN>.md` |
| Estado vivo + Feature Contract inline | `TODO.md` (raiz) |
| O quê e por quê | `docs/product/PRD.md` *(ainda não existe — onda R-2)* |
| O que o sistema faz (SPEC + Anti-SPEC §6) | `docs/specs/SPEC.md` *(parcial — só F-001)* |
| Contratos legíveis | `docs/contracts/CONTRACTS.md` |
| **Contratos executáveis** | `packages/shared/types/*.ts` |
| Estado real do repo | `docs/plans/CURRENT_REALITY.md` |
| Decisão arquitetural | `docs/decisions/adr/ADR-NNN-*.md` |
| Decisão operacional recorrente | `docs/plans/DECISIONS_LOG.md` |
| Regras para agentes | `AGENTS.md` (raiz) |
| Ajustes do Claude Code | `CLAUDE.md` (raiz) |
| Manual do Harness | `.claude/harness-v3.2-manual.md` |

---

## Páginas desta wiki

- [overview.md](overview.md) — projeto em 1 página
- [architecture.md](architecture.md) — arquitetura viva
- [log.md](log.md) — histórico cronológico

## Módulos

- [modules/clientes.md](modules/clientes.md)
- [modules/vendas-pedidos.md](modules/vendas-pedidos.md)
- [modules/erp-tiny.md](modules/erp-tiny.md)
- [modules/comissoes.md](modules/comissoes.md)
- [modules/conta-corrente.md](modules/conta-corrente.md)
- [modules/usuarios-auth.md](modules/usuarios-auth.md)
- [modules/produtos-cadastros.md](modules/produtos-cadastros.md)
- [modules/dashboard.md](modules/dashboard.md)

## Runbooks

- [runbooks/deploy-edge-function.md](runbooks/deploy-edge-function.md)
- [runbooks/deploy-netlify.md](runbooks/deploy-netlify.md)
- [runbooks/aplicar-migration-supabase.md](runbooks/aplicar-migration-supabase.md)
- [runbooks/rollback-feature-flag.md](runbooks/rollback-feature-flag.md)
- [runbooks/bump-system-version.md](runbooks/bump-system-version.md)
- [runbooks/smoke-pos-deploy-prod.md](runbooks/smoke-pos-deploy-prod.md)

---

*Última atualização: 2026-05-19 (bootstrap Harness v3.2).*
