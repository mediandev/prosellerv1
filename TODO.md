# TODO — ProSeller V1

> Estado vivo do projeto. Único arquivo de controle, junto com `git log`.
> Atualizar ao final de cada sessão.

**Última atualização:** 2026-04-20

---

## 1. Em andamento

**F-001 · Consulta Simples Nacional — pré-execução concluída, aguardando DPs e aplicação da migration.**

Artefatos produzidos (commits em `main`):
- [x] SPEC em `docs/specs/SPEC.md` (6 RFs, 8 CAs, 7 CBs) — `cf1ea26`.
- [x] Schemas Zod em `packages/shared/types/` (api, cliente, natureza-operacao, simples-nacional) — `cf1ea26`.
- [x] `docs/contracts/CONTRACTS.md` espelho — `cf1ea26`.
- [x] ADR-001 (feature flag env var), ADR-002 (ReceitaWS), ADR-003 (dual-ID nullable) — `cf1ea26`.
- [x] `zod@3.23.8` + alias `@shared/*` (tsconfig + vite + package-lock) — `cf1ea26`.
- [x] `docs/plans/skills-manifest.md` — 5× tool_nativa + 1× MCP Supabase, zero skills novas — `6dba32b`.
- [x] `docs/plans/cursor-brief.md` — Tarefa 1 (Migration 108) com rollback obrigatório — `6c29740`.

Bloqueadores restantes (impedem começar código de F-001):
- [ ] **DP-001, DP-002, DP-003** resolvidas com Lucas / dev anterior (ver SPEC §11).
- [ ] **Migration 108 aplicada em staging** via Cursor MCP (brief pronto em `docs/plans/cursor-brief.md §Tarefa 1`). Exige confirmação humana explícita.
- [ ] **Migration 108 aplicada em produção** após smoke test verde em staging.
- [ ] **Secrets Supabase** cadastrados: `FEATURE_SIMPLES_NACIONAL_LOOKUP` (valor `"false"` no início) e `RECEITAWS_TOKEN` (plano pago — decisão comercial pendente).
- [ ] **Suíte Vitest + `deno test`** introduzida como feature própria (RNF-005 + recomendação do skills-manifest §5).
- [ ] Implementação nas 3 Edge Functions afetadas: `create-cliente-v2`, `tiny-empresa-natureza-operacao-v2`, `tiny-enviar-pedido-venda-v1`.
- [ ] UI do toggle dual-ID em Configurações › Mapeamento Naturezas Tiny (CA-006).

---

## 2. Backlog — Features priorizadas

### 🔴 F-001 · Consulta Simples Nacional (Alta · SPEC aprovada, execução aguarda DPs)

**Motivação:** mudanças tributárias em SP exigem identificar clientes optantes do Simples Nacional e ajustar a natureza de operação Tiny conforme o caso.

**Cobre:** RF-001, RF-002, RF-003, RF-004, RF-005, RF-006 (ver `docs/specs/SPEC.md §9` — tabela de rastreabilidade).

**Critérios de aceite (oficial em SPEC §4):**
- CA-001 — Cliente novo PJ com ReceitaWS OK → campos populados.
- CA-002 — Cliente novo PF não consulta ReceitaWS.
- CA-003 — Cliente novo sem CPF/CNPJ → campos `null`.
- CA-004 — ReceitaWS timeout não bloqueia criação (201).
- CA-005 — Revalidação no envio Tiny (>30 dias — **DP-001**).
- CA-006 — UI salva dual-ID.
- CA-007 — Envio Tiny escolhe natureza correta nos 4 cenários (A, B, C, D).
- CA-008 — Feature flag desligada preserva comportamento atual.

**Contratos (Zod em `packages/shared/types/`):**
- `cliente.ts` → `ClienteSimplesNacional`, `ClienteSimplesNacionalUpdate`.
- `natureza-operacao.ts` → `TinyEmpresaNaturezaOperacao` (com `tinyValorSimples`), `UpsertInput`, `NaturezaOperacaoResolucao` (log).
- `simples-nacional.ts` → `ReceitaWsResponseSchema`, `SimplesNacionalLookupResult`, `SimplesNacionalLookupLog`.

**Dependências:**
- Migration 108 (SQL pronto em `docs/decisions/adr/ADR-003-modelagem-dual-id-natureza-operacao.md §Migration a ser criada`) — **exige brief Cursor + confirmação antes de aplicar em prod**.
- Feature flag `FEATURE_SIMPLES_NACIONAL_LOOKUP` (env var — ADR-001).
- Token `RECEITAWS_TOKEN` em secret Supabase (ADR-002, plano pago necessário).
- Edge Functions afetadas: `create-cliente-v2`, `tiny-empresa-natureza-operacao-v2`, `tiny-enviar-pedido-venda-v1`.
- **Bloqueador operacional:** Vitest + Supertest precisam entrar no repo **antes** do código produção (RNF-005 + CLAUDE.md regra "área sensível").

**Decisões pendentes (ver SPEC §11):**
- DP-001 — Janela de revalidação (default 30d).
- DP-002 — Timeout ReceitaWS (default 5s).
- DP-003 — `tiny_valor_simples` preenchido com `tiny_valor` vazio (default: bloquear).

**Branch proposta:** `feat/simples-nacional-lookup`. Commits atômicos na ordem: (1) Vitest setup, (2) migration 108, (3) schemas já commitados, (4) Edge Function `create-cliente-v2`, (5) Edge Function `tiny-empresa-natureza-operacao-v2`, (6) Edge Function `tiny-enviar-pedido-venda-v1`, (7) UI de mapeamento dual.

---

### 🟡 F-002 · Pedidos — Ajustes Manuais (Média · Em análise)

**Motivação:** cobrir casos fora do roteiro padrão — substituição de NF do Tiny, correções diretas no Tiny — para manter sincronia visual entre ProSeller e ERP sem gerar efeito reverso no ERP.

**Escopo proposto:**
- Permitir ajuste manual de **status do pedido** no ProSeller (só efeito local, não replica no Tiny).
- Permitir alterar manualmente o número da **NF do Tiny** vinculada a um pedido ProSeller (só efeito local).
- Ação restrita a usuário **backoffice com permissão específica**.
- Garantir idempotência: pedido com ajuste manual **não pode** gerar repercussão no Tiny em nenhuma sync futura (flag `ajuste_manual: true`).

**Critérios de aceite (rascunho):**
- CA-1: Backoffice com permissão vê botões de "Ajuste manual" na listagem de pedidos.
- CA-2: Usuário sem permissão não vê nem acessa os botões (403 no endpoint).
- CA-3: Pedido com ajuste manual exibe badge visual na listagem.
- CA-4: Sync com Tiny ignora pedidos com `ajuste_manual: true`.
- CA-5: Log de auditoria (quem ajustou, o quê, quando) fica gravado.

**Dependências:**
- Migration: adicionar `ajuste_manual` + `ajuste_manual_log` em tabela de pedido.
- Permissão nova: `pedido.ajustar_manual`.
- Edge Functions afetadas: `pedido-venda-v2` (PATCH de status/NF manual), `tiny-enviar-pedido-venda-v1` (filtro de ignorar).

---

### 🟢 F-000 · Espinha mínima Harness v3 (Concluída, aguardando este commit)

Criação de `AGENTS.md`, `CLAUDE.md`, `TODO.md`, estrutura `docs/`, `packages/`, `tests/`, CI GitHub Actions, scripts npm (`lint`, `typecheck`), correção do `.gitignore`.

### 🟢 F-001-SPEC · SPEC retroativo de F-001 (Concluída, aguardando aprovação e DPs)

Artefatos produzidos: `docs/specs/SPEC.md`, `docs/contracts/CONTRACTS.md`, `packages/shared/types/{api,cliente,natureza-operacao,simples-nacional}.ts`, ADR-001/002/003, zod em `package.json`, alias `@shared/*`. Commit: `cf1ea26`.

### 🟢 F-001-PRE · Pré-execução de F-001 (Concluída)

- `/skill-scout` → `docs/plans/skills-manifest.md` (commit `6dba32b`). Zero skills novas.
- `/cursor-team-protocol` → `docs/plans/cursor-brief.md` Tarefa 1 Migration 108 (commit `6c29740`). Rollback explícito.
- AGENTS.md/PLAN.md: não alterados (AGENTS já conforme, ≤6 features descarta PLAN).

---

## 3. Próximas ondas (após as 2 features acima)

### Onda R-1 — Inventário e reorganização de docs/
- Listar os 120+ `.md` atualmente em `docs/front/` (agora versionados) em `docs/plans/inventario.md`.
- Decidir para cada um: `docs/decisions/adr/`, `docs/specs/`, `docs/product/` ou `archive/`.
- Um commit por lote temático (ex.: todos os `CORRECAO_*` viram ADRs retroativos em um PR).

### Onda R-2 — PRD retroativo (`/consultor-prd` modo retroativo)
- Gera `docs/product/PRD.md` curto e honesto, reconhecendo o que já foi construído.
- Inclui seção **Restrições de produção** (tabelas intocáveis, endpoints legados).

### Onda R-3 — SPEC retroativo (`/SDD-avancado` modo retroativo)
- Extrai RFs a partir dos módulos existentes (clientes, vendas, comissões, ERP, conta corrente).
- Anti-SPEC crítica: "não mexemos na tabela X", "não alteramos rota legada Y".
- ADRs retroativos para decisões passadas relevantes (Postgres+Supabase, React+Vite, Tiny, etc.).

### Onda R-4 — Migrar `src/types/` para Zod em `packages/shared/types/`
- Conversão gradual, feature por feature (não big-bang).
- `CONTRACTS.md` passa a espelhar automaticamente.

### Onda R-5 — Introduzir suíte de testes
- Vitest + @testing-library/react para frontend.
- Supertest contra Edge Functions (pode ser em Deno test runner).
- Começar cobertura pelas funções críticas: `tinyERPSync.ts`, `erpAutoSendService.ts`, `clientRiskService.ts`.

---

## 4. Débito técnico identificado

- **`docs/front/` com 120+ arquivos** (CORRECAO_*, TESTE_*, CHANGELOG_*). Tratar em R-1.
- **Imports versionados** no código (`date-fns@4.1.0`, `sonner@2.0.3`, `next-themes@0.4.6`) — não-convencional, quebra typecheck estrito.
- **`App.tsx` com ~45 KB + roteamento manual** por `useState<Page>`. Candidato a React Router — onda dedicada, não oportunista.
- **Mocks convivendo com real:** `src/data/mock*.ts` + `src/services/*.ts`. Plano: deprecate mocks por módulo, à medida que features novas tocam cada módulo.
- **Numeração de migrations com gaps** (031–040, 046–066, 079–080, 092–094, 096–097). Nada a fazer — aceitar como histórico; seguir próxima sequência livre.
- **`_shared` duplicado** em `supabase/functions/` (pasta + arquivo `_shared_helpers.ts`). Consolidar na próxima feature que tocar Edge Functions.
- **`vite-env.d.ts` duplicado** (raiz + `src/`). Resolver junto com próxima feature de frontend.
- **Arquivos soltos na raiz** (`check_braces.js`, `DEPLOY_PRODUTOS_V2.md`, `NETLIFY_DEPLOY.md`). Mover em R-1.
- **Branches `main` e `master` convivendo.** Master está desatualizada; deletar em commit próprio após validação.
- **Sem lint configurado.** Adicionar ESLint + Prettier em onda dedicada (estimativa: 30 min).
- **Sem testes.** Tratado em R-5.
- **Token MCP Supabase hardcoded em `.cursor/MCP.json`** — decisão consciente do dev em manter; arquivo protegido pelo `.gitignore` (case-insensitive agora). Não expor em docs/ADRs públicos.
- **Deploy é Netlify, sem MCP disponível** — template do Harness v3 assume Vercel. Operação em Netlify fica manual (painel) ou via `netlify` CLI. Identificado em `docs/plans/skills-manifest.md §5`. Não bloqueia F-001.
- **Supertest não encaixa em Edge Functions Deno** — o TODO §3 R-5 listava "Supertest", mas Edge Functions rodam em Deno (não Node), e Supertest assume Node HTTP server. Recomendação em `docs/plans/skills-manifest.md §5`: usar `deno test` + `supabase functions serve` para integração de Edge Functions, reservando Supertest só se aparecer algum servidor Node no projeto. Atualizar R-5 quando a feature da suíte de testes for aberta.
- **`npm install` gerou 11 vulnerabilidades auditadas (1 moderate, 8 high, 2 critical)** nas dependências existentes — detectadas ao instalar zod na fase SPEC. Não relacionado a zod; são dependências herdadas. Tratar em onda dedicada de segurança (`npm audit fix` controlado, não `--force`).

---

## 5. Bugs abertos

_Nenhum registrado aqui. Quando aparecer, usar formato:_

```
### 🐛 BUG-NNN · <título>
- Reprodução: ...
- Impacto: ...
- Área: <módulo>
- Workaround atual: ...
```

---

## 6. Concluído (referência — últimos 10 commits do git log)

| # | Feature / Commit | SHA | Data |
|---|---|---|---|
| — | fix: destaque do e-mail de comissões + flash de 10 clientes no dashboard | `ccaa811` | (pré-harness) |
| — | feat: enviar PDF como anexo no email de comissões (V 1.18) | `50212af` | (pré-harness) |
| — | fix: endereço/contato no PUT de `clientes-v2` | `217169d` | (pré-harness) |
| — | fix: persistência do vendedor atribuído na edição de clientes | `09748ec` | (pré-harness) |
| — | v1.17: Bloquear edição pós-envio, fix comissões, notificações | `f01d4c1` | (pré-harness) |
| — | Avisos de config ERP no formulário + ícone erro com tooltip | `d6fe4f4` | (pré-harness, branch master) |
| — | Fix envio ao ERP: usar ID do banco em vez de UUID do frontend | `4b7621d` | (pré-harness, branch master) |

_Histórico pré-Harness está no `git log`, não será duplicado aqui._

---

*Fim do TODO. Mantenha curto, honesto, e atualize todo dia.*
