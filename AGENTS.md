# AGENTS.md — ProSeller V1

> Contrato de operação com agentes de IA no Harness v3 (Solo).
> Leitura obrigatória antes de qualquer sessão de trabalho.

**Versão:** 1.0 · **Estado do projeto:** em produção (Cenário C)

---

## 1. Contexto do projeto

ProSeller V1 é um sistema de gestão comercial em produção (app em `proseller.app.br`) com integração Tiny ERP. Clientes reais usam o sistema para cadastrar vendas, acompanhar comissões, gerenciar conta corrente e disparar pedidos ao ERP.

Stack: React 18 + Vite + TypeScript (SPA) · Supabase (Postgres com RPCs + Edge Functions Deno) · Netlify · Tiny ERP API.

Como está em produção, vale a regra: **nenhum refactor preventivo**. Código antigo só muda quando uma feature nova atravessa aquele arquivo.

---

## 2. Papéis dos agentes

### 2.1. Gerador — Claude Code (Opus)

Responsável por escrever código, testes, abrir PR, autorrevisar.

**Deve:**
- Ler `TODO.md` + `AGENTS.md` no início de toda sessão.
- Escrever teste antes do código quando o CI/teste suite já cobre a área tocada.
- Usar somente tipos de `packages/shared/types/` para novas features.
- Commits atômicos referenciando item do `TODO.md`.
- Atualizar `TODO.md` ao fim de cada feature (mover para "Concluído" com SHA).
- Registrar idéias/bugs novos em `TODO.md` — nunca na memória.
- Pausar e reportar se a feature "cresceu" — quebrar em duas no `TODO.md`.

**Não pode:**
- Refatorar código que não está no escopo da feature atual.
- Tocar `supabase/migrations/*` já aplicadas em produção sem confirmação explícita.
- Inventar tipos fora de `packages/shared/types/`.
- Fazer alterações listadas na Anti-SPEC (`docs/specs/SPEC.md §6`).
- Criar `state/`, `handoffs/`, `progress.jsonl`, `AGENT-BRIEFS/` ou qualquer JSON paralelo de estado.
- Rodar comandos destrutivos (force push, reset --hard, branch -D) sem confirmação.

### 2.2. Infra — Cursor Agent (opcional, via MCP)

Só é acionado quando uma feature precisa tocar serviço externo: migração Supabase, deploy Netlify, variáveis de ambiente, criação de buckets/roles.

- MCP configurado: Supabase (projeto `xxoiqfraeolsqsmsheue`) em `.cursor/MCP.json` **(gitignored)**.
- Operação em produção sempre via `docs/plans/cursor-brief.md` com seção **Rollback** obrigatória.
- Deploy em produção sempre passa por staging/preview antes.

### 2.3. Avaliador — CI GitHub Actions

Verde = libera merge. Vermelho = não passa, sem exceção. Nunca desabilitar teste para fazer passar.

Pipeline: `typecheck` → (futuro) `lint` → (futuro) `test`.

---

## 3. Estrutura canônica do repo

```
AGENTS.md · CLAUDE.md · TODO.md · README.md
docs/
  product/PRD.md                  (retroativo, em construção)
  specs/SPEC.md                   (parcial, por feature nova)
  contracts/CONTRACTS.md          (espelho Zod)
  plans/cursor-brief.md           (opcional)
  decisions/adr/                  (1 arquivo por decisão)
src/                              código frontend (React+Vite)
  components/ contexts/ data/ hooks/ lib/ services/ types/ utils/
supabase/
  functions/                      Edge Functions Deno (versão v2)
  migrations/                     SQL numerado (alguns gaps históricos)
packages/shared/types/            FONTE DE VERDADE (Zod) — migração gradual de src/types/
tests/unit/ integration/ e2e/     ainda vazios, introduzir junto com features novas
.github/workflows/ci.yml
```

**Pastas que NÃO existem no Solo:** `state/`, `handoffs/`, `AGENT-BRIEFS/`, `scripts/` genérico, múltiplos `.cursor/rules/`.

---

## 4. Regras específicas de produção

- **Nenhuma migration preventiva.** Só muda schema quando a feature exige, e somente com brief explícito de rollback.
- **Paridade de testes antes de refatorar rota.** Antes de mexer numa Edge Function existente, capturar comportamento atual em teste de integração.
- **Feature flag para contrato público.** Toda mudança que altera payload entre Tiny/ProSeller ou campos visíveis ao usuário passa por flag até rollout controlado.
- **Imports versionados herdados** (`date-fns@4.1.0`, `sonner@2.0.3`, etc.) são débito técnico conhecido. Não remover sem migração planejada (pode quebrar o bundler Vite).
- **`docs/` agora está versionado.** Anteriormente estava no `.gitignore` — 120+ .md vão ser inventariados e organizados em onda dedicada antes de virar fonte de verdade.

---

## 5. Prompts do dia a dia

Os 3 prompts (Início de Sessão, Implementar Feature, QA do PR) estão no manual `.claude/skills/harness-v3-manual.md §5`. Uso sempre o fluxo: pull → Prompt 1 → decidir → Prompt 2 → código/teste → Prompt 3 → merge.

---

## 6. O que está em `.claude/`

Skills do Harness v3 instaladas localmente: `/project-kickoff`, `/consultor-prd`, `/SDD-avancado`, `/skill-scout`, `/cursor-team-protocol`. A pasta está no `.gitignore` porque são ferramentas do dev, não do projeto.

---

## 7. Convenções

- **Branches:** `feat/<slug>` para features; `fix/<slug>` para correções em produção; `chore/<slug>` para reorganização. Trivialidades (<30min, testadas) direto em `main`.
- **Commits:** `tipo(escopo): resumo (#F-NNN)` quando houver referência no TODO.
- **Encoding:** UTF-8, LF, sem BOM (já definido em `CODING_STANDARDS.md`).
- **Idioma:** código e PR em português-BR quando o domínio é BR (CNPJ, vendedor, comissão). Mensagens técnicas genéricas podem ficar em inglês.

---

## 8. Contatos e origem

- Repo: `github.com/mediandev/prosellerv1`
- Supabase projeto ref: `xxoiqfraeolsqsmsheue`
- Deploy: Netlify (config em `netlify.toml`)
- Design original: Figma — `figma.com/design/reHzF0vlYIbzge1bFGwZzX/ProSeller-V1`

---

*Arquivo vivo. Revisar sempre que uma prática aqui virar fricção.*
