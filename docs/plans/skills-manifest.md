# Skills Manifest — ProSeller V1

> Output do `/skill-scout`. Escopo: **capacidades necessárias a F-001 Consulta Simples Nacional**.
> Demais capacidades do sistema (auth, dashboard, comissões, etc.) não foram escaneadas aqui — entram quando features novas as exigirem.

**Data:** 2026-04-20
**Versão:** 1.0
**Referência:** SPEC v0.1 (F-001), ADR-001/002/003

---

## 1. Capacidades mapeadas

| # | Domínio | Capacidade | Decisão | Recurso |
|---|---|---|---|---|
| 1 | HTTP externo | Consulta ReceitaWS a partir de Edge Function Deno | `tool_nativa` | `fetch()` do runtime Deno (mesmo padrão já usado em `tiny-enviar-pedido-venda-v1` linhas 93-149 para chamar Tiny) |
| 2 | Banco / migrations | Aplicar migration 108 em staging e produção | `mcp` | Supabase MCP (configurado em `.cursor/MCP.json`, operação via Cursor Agent — brief em `docs/plans/cursor-brief.md` com rollback) |
| 3 | Banco / runtime | R/W em `cliente`, `tiny_empresa_natureza_operacao`, `pedido_venda` dentro de Edge Functions | `tool_nativa` | `@supabase/supabase-js@2` (já instalado e usado em todas as Edge Functions `-v2`) |
| 4 | Feature flag | Ler `FEATURE_SIMPLES_NACIONAL_LOOKUP` em runtime | `tool_nativa` | `Deno.env.get()` (padrão ADR-001; valores gerenciados no painel Supabase) |
| 5 | Testes | Integração Edge Function + unit frontend | `tool_nativa` | Vitest (frontend, devDep) + `deno test` (Edge Functions, runtime nativo). Introdução é feature própria — ver §5. |
| 6 | PR / CI | Abertura de PR, status checks | `tool_nativa` | `gh` CLI + GitHub Actions já existente em `.github/workflows/ci.yml` |

**Legenda:**
- `tool_nativa` — biblioteca/runtime instalado no projeto, sem skill extra
- `mcp` — resolvido via MCP em sessão Cursor Agent
- `skill_existente` — skill já instalada
- `skill_nova` — skill a criar (último recurso)

**Resumo numérico:** 5 `tool_nativa` + 1 `mcp` = 6 total. Zero `skill_nova`. Zero `skill_existente` extra.

---

## 2. MCPs necessários

> Confirmar ativos no Cursor antes de começar execução. Operação em produção sempre via brief com rollback (AGENTS.md §2.2).

- [x] **Supabase MCP** — migrations, RLS, seed, secrets (já configurado em `.cursor/MCP.json`, projeto `xxoiqfraeolsqsmsheue`)
- [ ] **Vercel MCP** — N/A (deploy é Netlify, não Vercel; Netlify não tem MCP — operação manual ou via `netlify` CLI)
- [ ] **GitHub MCP** — N/A (`gh` CLI resolve)

**Secrets a configurar antes da execução** (gerenciados no painel Supabase, não são MCP):
- `FEATURE_SIMPLES_NACIONAL_LOOKUP` (`"true"` | `"false"` — default ausente = off; ADR-001)
- `RECEITAWS_TOKEN` (plano pago — ADR-002)

---

## 3. Skills existentes que serão usadas

- `/project-kickoff` — N/A (projeto legado, não roda kickoff)
- `/consultor-prd` — ainda não consumida (PRD retroativo fica para Onda R-2 do TODO)
- `/SDD-avancado` — **consumida** (SPEC de F-001 em `cf1ea26`)
- `/skill-scout` — **consumida** (este arquivo)
- `/cursor-team-protocol` — **próximo passo** (gerar `docs/plans/cursor-brief.md` para migration 108)

Skills extras (fora do Harness): *nenhuma*.

---

## 4. Skills novas a criar

*(vazio — nenhuma capacidade de F-001 caiu no nível 3)*

---

## 5. Observações

### Sobre a suíte de testes (capacidade #5)

O TODO lista "Vitest + Supertest" como bloqueador de F-001 (RNF-005 da SPEC). Detalhes operacionais que **não** viram skill, mas **precisam** ser resolvidos quando a feature da suíte de testes for implementada:

- **Frontend (`src/`):** Vitest + `@testing-library/react` — devDep padrão Vite, sem skill.
- **Edge Functions (`supabase/functions/`):** são runtime Deno, não Node. Supertest (listado no TODO) assume Node HTTP server — **não encaixa direto**. Duas alternativas:
  - **(a) `deno test` runner nativo** contra `supabase functions serve` local — solução mais próxima do ambiente real, zero dep nova.
  - **(b) Vitest + `fetch` mockado** para simular respostas de Supabase e ReceitaWS — rápido mas não exercita o Deno runtime.
  - Recomendação para a feature futura: **usar (a) para cobrir CA-007 (4 cenários) e (b) só para casos onde a complexidade de `supabase functions serve` não compense**.

Essa ambiguidade **não bloqueia F-001-SPEC nem a migration 108** — ela é problema da feature que vai introduzir a suíte (ainda não aberta no TODO como F própria).

### Sobre deploy

Deploy é Netlify (`netlify.toml` na raiz) — o manual do Harness v3 assume Vercel no template; adaptação local: operação via painel Netlify ou `netlify` CLI, sem MCP. Isso é débito de infra conhecido, não afeta F-001.

### Sobre plano ReceitaWS

Nível 1 assume `fetch` nativo resolve. Mas **plano gratuito** da ReceitaWS não retorna `simples.optante` (CB-001 da SPEC) — a feature só é útil de verdade com **plano pago + `RECEITAWS_TOKEN`**. Isso é decisão comercial do cliente, não técnica — registrar no brief Cursor como pré-condição ao ligar a feature flag em produção.

---

## 6. Aprovação

- [x] Todas as capacidades de F-001 mapeadas
- [x] Nenhum MCP ou skill adicionada sem justificativa real
- [x] Zero skills novas (gate 3 níveis resolveu tudo em nativo/MCP)
- [ ] Manifest revisado pelo dev
- [x] Próximo passo: `/cursor-team-protocol`
