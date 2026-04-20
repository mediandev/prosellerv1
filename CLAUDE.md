# CLAUDE.md — Ajustes específicos do Claude Code

> Regras e atalhos aplicados quando o Claude Code opera neste repo.
> Leia junto com `AGENTS.md`.

---

## Prioridade de leitura no início da sessão

1. `TODO.md`
2. `AGENTS.md`
3. `git log --oneline -5` e `git status`
4. Este arquivo
5. (Se existir) `docs/specs/SPEC.md` e `docs/product/PRD.md` nas seções relevantes à feature atual.

---

## Convenções particulares deste projeto

- **Sem `npm test` configurado ainda.** Até introduzirmos suíte de testes, pule a etapa "teste falhando primeiro" do Prompt 2 **apenas** para features que não tocam áreas sensíveis (clientes/vendas/pedidos/ERP). Áreas sensíveis obrigam a começar pelo teste de integração, adicionando Vitest + Supertest à stack na primeira oportunidade.
- **Typecheck pode ter ruído herdado.** `tsconfig.json` é `strict`, mas o código carrega imports versionados (`date-fns@4.1.0`, `sonner@2.0.3`, etc.) e `noUnusedLocals/Parameters` ativos. Rodar `npm run typecheck` antes de decidir se um erro é da feature nova ou débito existente. Em caso de dúvida, **isolar** — corrigir só o que a feature introduziu.
- **Supabase migrations numeradas com gaps** (ex.: 031–040, 046–066). Não "preencher" os gaps. Seguir a próxima sequência livre (vide último arquivo em `supabase/migrations/`).
- **Edge Functions seguem padrão `-v2`** (ex.: `clientes-v2`, `dashboard-v2`). Features novas adotam o mesmo padrão ou documentam em ADR por que divergem.
- **Duas camadas de dados convivem:** `src/data/mock*.ts` (seed/fallback) e `src/services/*.ts` (Supabase real). Em features novas, **somente Supabase real**. Mocks só permanecem como referência até serem extintos em onda dedicada.
- **App.tsx tem 45 KB e roteamento manual por `useState<Page>`.** Não refatorar isso oportunisticamente — está no débito técnico. Ao adicionar página nova, seguir o mesmo padrão atual para não quebrar as outras.

---

## Quando o Cursor Agent entra

Aciono o Cursor Agent + MCP Supabase somente para:
- Criar/aplicar migration nova em staging antes de produção.
- Testar RPC diretamente contra o banco.
- Operações administrativas no projeto Supabase (roles, buckets, env secrets).
- Deploy/promoção no Netlify.

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
- Renomear/mover arquivos em massa (mesmo na onda de reorganização — sempre um commit por lote auditável).

---

## Lembretes operacionais

- **Branch de trabalho:** `main` é a fonte de verdade. Ignore `master` (obsoleta).
- **Imports versionados (`@x.y.z`)**: não mexa por conta própria. Lista no débito técnico.
- **`docs/` agora está versionada.** Qualquer `.md` solto que eu for adicionar vai para a subpasta certa (`docs/product/`, `docs/specs/`, etc.), nunca solto em `docs/front/` ou na raiz.
- **Arquivos soltos da raiz** (`DEPLOY_PRODUTOS_V2.md`, `NETLIFY_DEPLOY.md`, `check_braces.js`): planejados para mover em onda de reorganização — não mover por conta própria.

---

## Quando pausar e perguntar

- Se a feature cruzou mais de 3 módulos (clientes + vendas + comissões, p.ex.) — pausar e quebrar.
- Se uma migration é necessária — parar, escrever o brief, esperar confirmação humana antes de executar.
- Se o typecheck quebra em arquivo que não foi tocado pela feature — reportar, não "consertar".
- Se encontrar segredo/token em código — reportar imediatamente.

---

*Arquivo vivo. ~100 linhas. Se crescer além disso, separe em ADRs.*
