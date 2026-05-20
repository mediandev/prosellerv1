# Decisions Log — ProSeller V1

> **Decisões operacionais pequenas** que podem voltar ao debate. ADRs (`docs/decisions/adr/`) são para decisões arquiteturais grandes que devem ser preservadas com argumentação completa.
>
> Use este log quando:
> - A decisão é pequena (regra de validação, escolha de nome, ordem de execução).
> - Provavelmente vai voltar ao debate ("será que ainda faz sentido?").
> - Não precisa de prós/contras nem alternativas detalhadas — uma linha basta.

Para decisões grandes (mudança de stack, modelagem de banco, fluxo de auth, etc.) → ADR.

---

## Formato

| Data | Decisão | Motivo | Impacto |
|---|---|---|---|
| `YYYY-MM-DD` | O quê foi decidido (1 frase) | Por quê (1 frase) | Onde afeta (arquivo / módulo / processo) |

---

## Entradas

| Data | Decisão | Motivo | Impacto |
|---|---|---|---|
| 2026-05-20 | F-LOG-CRM R-LOG-1 nasce atrás de `FEATURE_LOG_CRM`/`VITE_FEATURE_LOG_CRM` (default OFF) e não toca pedido/Tiny/SSW | Migração gradual do LogCRM Bubble exige isolar tabelas/UI novas até smoke staging verde | 7 tabelas novas, 4 Edge Functions, 5 componentes UI, Page `'logistica'` em App.tsx; commits 1–9 da branch `feat/log-crm-R-LOG-1` |
| 2026-05-20 | Edge Functions novas (`*-v1` da Logística) fazem CRUD direto via supabase-js, sem RPC SECURITY DEFINER | Tabelas são novas e isoladas, sem consumers; RPCs (~12) inflariam migration 119 sem ganho de segurança | `transportador-logistica-v1`, `regiao-destino-v1`, `origem-frete-v1`, `frete-logistica-v1`; documentado no FC F-LOG-1 |
| 2026-05-20 | Item de menu "Logística" entra como Page raiz `'logistica'` gated por `backofficeOnly` + flag, não como sub-aba de Configurações | Configurações é renderizado inline em App.tsx (45 KB de débito); novo Page reduz blast radius e segue padrão de `'tiny-erp'` | `src/App.tsx` (tipo Page, menuItems, pageConfig, switch) |
| 2026-05-20 | **ADR-006 pendente** — credenciais SSW: 1 conta por transportadora (`transportador_logistica.ssw_dominio` + secret) vs. chave NFe pura no endpoint público | Bubble usa proxy server-side com domínio SSW; precisa confirmar config com Valentim antes de abrir R-LOG-4 | Bloqueia R-LOG-4 |
| 2026-05-20 | **ADR-007 pendente** — parser PDF/EDI: próprio (`pdf-parse`) vs. serviço externo (Documind / Mindee) | Custo recorrente + precisão variável por transportadora; precisa amostras (≥ 3 PDFs por grupo) | Bloqueia R-LOG-7 |
| 2026-05-20 | **ADR-008 pendente** — polling SSW: cron Supabase vs. on-demand quando usuário abre detalhe | Bubble parece on-demand (1 chamada por NFe); quota e rate-limit SSW pesam | Bloqueia R-LOG-4 |
| 2026-05-20 | **ADR-009 pendente** — fonte de `valor_cotacao` no MVP: manual (como Bubble) | Integração com tabela de fretes Tiny é overkill no MVP; cliente já preenche manual hoje | Mantido manual em R-LOG-1; revisitar se Valentim pedir |

<!-- Exemplo (comentado): -->
<!-- | 2026-05-19 | Bullet "Novidades em V x.y" sempre no topo do tooltip, anteriores descem | Cliente cobra ver versão mudar a cada entrega | `src/App.tsx` SidebarUserInfo + CLAUDE.md "Toda PR que dispara deploy..." | -->

---

## Quando promover uma linha daqui para ADR

- Quando a decisão começa a guiar 3+ features diferentes.
- Quando a equipe (Cursor / Codex / Claude) precisa explicar o "porquê" repetidamente.
- Quando uma feature nova bate de frente com a regra e exige re-discussão profunda.

Movimentar uma linha para ADR: criar `ADR-NNN-<slug>.md` em `docs/decisions/adr/` e remover a linha desta tabela com nota: "promovido para ADR-NNN".
