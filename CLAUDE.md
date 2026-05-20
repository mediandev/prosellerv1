# CLAUDE.md — Ajustes específicos do Claude Code

> Regras e atalhos aplicados quando o Claude Code opera neste repo.
> Leia junto com `AGENTS.md`.

**Versão:** 2.0 (Harness v3.2)

---

## Prioridade de leitura no início da sessão

0. `docs/wiki/index.md` + (se existir) `docs/wiki/context/<atual>.md`.
1. `TODO.md`.
2. `AGENTS.md`.
3. `git log --oneline -5` e `git status`.
4. Este arquivo.
5. (Se existir) `docs/specs/SPEC.md` e `docs/product/PRD.md` nas seções relevantes à feature atual.

---

## Convenções particulares deste projeto

- **Suíte Vitest configurada mas vazia em áreas sensíveis.** Existem 3 testes unit (`masks.smoke`, `natureza-tiny-mapeamento.smoke`, `vendedor-edit-permission.smoke`) e 3 testes edge (`date-br`, `simples-nacional`, `smoke`). Áreas sensíveis (clientes/vendas/pedidos/ERP) ainda exigem teste de integração ANTES do código.
- **Typecheck pode ter ruído herdado.** `tsconfig.json` é `strict` com `noUnusedLocals/Parameters`, mas o código carrega imports versionados (`date-fns@4.1.0`, `sonner@2.0.3`, etc.). Rodar `npm run typecheck` antes de decidir se um erro é da feature nova ou débito existente. Em caso de dúvida, **isolar** — corrigir só o que a feature introduziu.
- **Supabase migrations numeradas com gaps** (ex.: 031–040, 046–066, 092–097). Não "preencher" os gaps. Seguir a próxima sequência livre (vide último arquivo em `supabase/migrations/`).
- **Edge Functions seguem padrão `-v2`** (ex.: `clientes-v2`, `dashboard-v2`). Features novas adotam o mesmo padrão ou documentam em ADR por que divergem.
- **Duas camadas de dados convivem:** `src/data/mock*.ts` (seed/fallback) e `src/services/*.ts` (Supabase real). Em features novas, **somente Supabase real**. Mocks só permanecem como referência até serem extintos em onda dedicada.
- **App.tsx tem 45 KB e roteamento manual por `useState<Page>`.** Não refatorar isso oportunisticamente — está no débito técnico. Ao adicionar página nova, seguir o mesmo padrão atual para não quebrar as outras.
- **Toda PR que dispara deploy em produção bumpa `systemVersion` no Sidebar.** A variável fica em `src/App.tsx` (componente `SidebarUserInfo`, ~linha 142) e o tooltip ao lado do ícone ✨ lista o changelog. Padrão: criar nova seção "Novidades em V x.y" no topo do tooltip e descer a anterior para "V x.(y-1)" (ver V 1.23 como referência). Cliente cobra ver a versão mudar a cada entrega — fix técnico sem bump visível gera confusão e re-trabalho. Aplicar sempre que mexer em `src/`. Para deploy puramente backend (Edge Function, migration), avaliar caso a caso conforme o efeito visível ao usuário final.

---

## Quando usar /fast-fix vs Standard

Use `/fast-fix` **apenas** se TODOS os gates duros passarem:

- Bug confirmado (não suspeita).
- Classe **A ou B**, sem tocar auth, payment, RLS, dados sensíveis, banco, migration, env vars, deploy, integração externa crítica.
- Estimativa < 30 min até o PR.
- Diff < 50 linhas e < 3 arquivos.
- Não é a 2ª+ ocorrência do mesmo bug.

**SAIA** do modo Fast Fix automaticamente se aparecer migration, env, deploy, mudança em `clientes-v2`/`tiny-*`/`*-user-*`, ajuste de RLS — escale para Standard (B/C) ou Production (D). Bug recorrente (≥ 2 ocorrências passadas) → Deep Work com refator, não fast-fix.

---

## Quando atualizar a Project Wiki

- **Depois de toda feature B/C/D mergeada:** 1 linha em `docs/wiki/log.md` no formato `YYYY-MM-DD · [TAG] · descrição · SHA/PR`.
- **Depois de feature C/D:** resumo ≤ 5 linhas em `docs/wiki/features/F-NNN.md`.
- **Quando descobrir runbook operacional novo** (ex.: deploy, rollback, smoke recorrente): criar `docs/wiki/runbooks/<slug>.md`.
- **Ao fim da sessão se a tarefa continua** (vai migrar para Codex/Cursor ou outra janela): `/wiki context F-NNN` antes de fechar.
- **Quinzenalmente / antes de release:** `/wiki lint`. Reparar se amarelo/vermelho.
- **NÃO atualizar a wiki para forçar ela a "caber" uma feature.** Ajuste o SPEC primeiro — wiki é espelho.

---

## Quando o Cursor Agent entra

Aciono o Cursor Agent + MCP Supabase somente para:
- Criar/aplicar migration nova em staging antes de produção.
- Testar RPC diretamente contra o banco.
- Operações administrativas no projeto Supabase (roles, buckets, env secrets).
- Deploy/promoção no Netlify.

**NÃO** uso o Cursor MCP para `deploy_edge_function` — proibido pelo ADR-005 (INC-001 publicou stub em prod). Edge Functions só via `npx supabase functions deploy <nome> --project-ref xxoiqfraeolsqsmsheue` local.

Para cada acionamento, gero um trecho em `docs/plans/cursor-brief.md` com:
1. Operação.
2. Comando/MCP call exata.
3. Pré-condições (ex.: backup).
4. **Rollback** (obrigatório em produção).

---

## O que nunca posso fazer sem confirmação explícita

- Dar `git push --force` em `main`.
- Executar migration em produção.
- Deletar branch remota.
- Alterar payload de API consumida pelo frontend em produção sem feature flag.
- Mexer em `supabase/migrations/*.sql` já aplicadas.
- Renomear/mover arquivos em massa (sempre um commit por lote auditável).
- Editar SPEC.md, CONTRACTS.md ou ADRs existentes sem pausa para confirmação.

---

## Lembretes operacionais

- **Branch de trabalho:** `main` é a fonte de verdade. Ignore `master` (obsoleta).
- **Imports versionados (`@x.y.z`)**: não mexa por conta própria. Lista no débito técnico.
- **`docs/` versionado.** Qualquer `.md` solto vai para a subpasta certa (`docs/product/`, `docs/specs/`, `docs/wiki/`, etc.), nunca solto na raiz.

---

## Quando pausar e perguntar

- Se a feature cruzou mais de 3 módulos (clientes + vendas + comissões, p.ex.) — pausar e quebrar.
- Se uma migration é necessária — parar, escrever o brief em `cursor-brief.md`, esperar confirmação humana antes de executar.
- Se o typecheck quebra em arquivo que não foi tocado pela feature — reportar, não "consertar".
- Se encontrar segredo/token em código — reportar imediatamente.
- Se o estado real do repo divergir significativamente do que a wiki/AGENTS afirma — reportar antes de agir.

---

*Arquivo vivo. Limite v3.2: 140 linhas. Se crescer além disso, separe em ADRs.*
