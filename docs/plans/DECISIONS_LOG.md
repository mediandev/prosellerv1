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
<!-- Exemplo (comentado): -->
<!-- | 2026-05-19 | Bullet "Novidades em V x.y" sempre no topo do tooltip, anteriores descem | Cliente cobra ver versão mudar a cada entrega | `src/App.tsx` SidebarUserInfo + CLAUDE.md "Toda PR que dispara deploy..." | -->

*(Tabela intencionalmente vazia. Adicione linhas conforme decisões operacionais aparecerem.)*

---

## Quando promover uma linha daqui para ADR

- Quando a decisão começa a guiar 3+ features diferentes.
- Quando a equipe (Cursor / Codex / Claude) precisa explicar o "porquê" repetidamente.
- Quando uma feature nova bate de frente com a regra e exige re-discussão profunda.

Movimentar uma linha para ADR: criar `ADR-NNN-<slug>.md` em `docs/decisions/adr/` e remover a linha desta tabela com nota: "promovido para ADR-NNN".
