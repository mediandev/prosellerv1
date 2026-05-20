# AGENTS.md — ProSeller V1

> Contrato de operação com agentes de IA neste repositório.
> Leitura obrigatória antes de qualquer sessão de trabalho.

**Versão:** 2.0 (Harness v3.2) · **Estado do projeto:** em produção (Cenário C)

---

## 1. Contexto do projeto

ProSeller V1 é um sistema de gestão comercial em produção (`proseller.app.br`) com integração Tiny ERP. Clientes reais usam o sistema para cadastrar vendas, acompanhar comissões, gerenciar conta corrente e disparar pedidos ao ERP.

Stack: React 18 + Vite + TypeScript (SPA) · Supabase (Postgres com RPCs + Edge Functions Deno) · Netlify · Tiny ERP API · ReceitaWS (F-001).

Como está em produção, vale a regra: **nenhum refactor preventivo**. Código antigo só muda quando uma feature nova atravessa aquele arquivo.

---

## 2. Princípios não-negociáveis (Harness v3.2 §2 + §28)

1. **Desenvolvedor solo.** Um agente gerador principal: Claude Code.
2. **Cursor Agent / Codex opcionais.** Cursor para infra/MCP (classe D); Codex para continuidade quando Claude esgota tokens.
3. **CI é o avaliador independente.** Gerador ≠ avaliador.
4. **Estado em `TODO.md` + `git log`.** Sem `state/`, sem `progress.jsonl`, sem `handoffs/`, sem `AGENT-BRIEFS/`, sem JSON paralelo.
5. **Feature é a unidade.** Nunca task atômica.
6. **Contrato é código.** Zod em `packages/shared/types/` é fonte; `CONTRACTS.md` é espelho.
7. **Anti-SPEC é sagrada.** Não alterável por agente sem autorização humana.
8. **CI verde é condição de merge.** Sem exceção (no nível da classe).
9. **Produção exige staging, rollback e smoke test.** Classe D, não negociável.
10. **Wiki é memória sintetizada, NUNCA fonte de verdade.** (v3.2)
11. **Fast Fix é exceção justificada, não norma.** (v3.2)
12. **Toda feature B/C/D termina com 1 linha em `wiki/log.md`.** (v3.2)
13. **Sem burocracia desnecessária.** Quando em dúvida, corte.
14. **Suba a classe, nunca desça.** Em dúvida, escolha a mais alta.
15. **Sem evidência objetiva, nunca APROVADO** no QA (B/C/D).
16. **BLOQUEADO é retorno legítimo.** Use quando faltar DoR, Anti-SPEC ferida, ou domínio sensível sem Feature Contract.
17. **Teste fake não conta.** `.skip`/`.only`/cobertura genérica não satisfazem matriz de validação.

---

## 3. Papéis dos agentes

### 3.1. Gerador — Claude Code (Opus)

Responsável por escrever código, testes, abrir PR, autorrevisar.

**Deve:**
- Ler `docs/wiki/index.md` (+ `wiki/context/<atual>.md` se existir) + `TODO.md` + `AGENTS.md` no início de toda sessão.
- Escrever teste antes do código em áreas sensíveis (clientes/vendas/pedidos/ERP).
- Usar somente tipos de `packages/shared/types/` para features novas.
- Commits atômicos referenciando item do `TODO.md`.
- Atualizar `TODO.md` ao fim de cada feature (mover para "Concluído" com SHA).
- Atualizar `wiki/log.md` com 1 linha por feature B/C/D mergeada (formato `YYYY-MM-DD · [TAG] · descrição · SHA/PR`).
- Registrar ideias/bugs novos em `TODO.md` — nunca na memória.
- Pausar e reportar se a feature "cresceu" — quebrar em duas no `TODO.md`.

**Não pode:**
- Refatorar código fora do escopo da feature atual.
- Tocar `supabase/migrations/*` já aplicadas em produção sem confirmação explícita.
- Inventar tipos fora de `packages/shared/types/`.
- Fazer alterações listadas na Anti-SPEC (`docs/specs/SPEC.md §6`).
- Criar `state/`, `handoffs/`, `progress.jsonl`, `AGENT-BRIEFS/` ou qualquer JSON paralelo de estado.
- Rodar comandos destrutivos (force push, reset --hard, branch -D) sem confirmação.

### 3.2. Infra — Cursor Agent (opcional, via MCP)

Acionado quando uma feature precisa tocar serviço externo: migração Supabase, deploy Netlify, variáveis de ambiente, criação de buckets/roles.

- MCP configurado: Supabase (projeto `xxoiqfraeolsqsmsheue`) em `.cursor/MCP.json` **(gitignored)**.
- Operação em produção sempre via `docs/plans/cursor-brief.md` com seção **Rollback** obrigatória (classe D).
- Deploy de Edge Function: **EXCLUSIVAMENTE via Supabase CLI** local (`npx supabase functions deploy <nome> --project-ref xxoiqfraeolsqsmsheue`), nunca via MCP — ver ADR-005.
- Deploy Netlify em produção sempre passa por preview antes.

### 3.3. Avaliador — CI GitHub Actions

Verde no nível da classe = libera merge. Vermelho = não passa, sem exceção. Nunca desabilitar teste para fazer passar.

Pipeline atual: `build` (Vite) + `test` (Vitest) + `edge-tests` (Deno). `typecheck` ativo com `continue-on-error` (débito herdado). `lint` em no-op (ESLint não configurado — débito).

---

## 4. Classificação A/B/C/D (Harness v3.2 §7)

| Classe | Exemplos no projeto | Feed Forward | CI alvo | Modo |
|---|---|---|---|---|
| **A** | Typo em label, ajuste de cor, copy de toast, fix de tooltip em `Sidebar` | Item simples no TODO | N1 | Standard ou Fast Fix |
| **B** | Novo endpoint não crítico, CRUD em tabela sem RLS sensível, página nova frontend, ajuste em mapeador `clientes-v2` que NÃO toca payload Tiny | DoR + Feature Contract inline | N1 + matriz | Standard ou Fast Fix |
| **C** | Mudança em qualquer `*-v2` de cliente/vendas/comissão; ajuste de RLS; novo campo em payload Tiny sem migration; mudança em `create-user-v2`/`delete-user-v2` | DoR + Feature Contract (detalhado) + Anti-SPEC revisada | N2 (build + test + edge-tests) | Deep Work |
| **D** | Migration nova; deploy de Edge Function em prod; env var nova; mudança em natureza de operação Tiny; qualquer toque em `tiny-enviar-pedido-venda-v1` que altere payload; flip de feature flag | DoR + Feature Contract + cursor-brief + rollback + (feature flag se contrato público) | N3 (e2e + smoke + migration validation) | Production |

**Desempates (Harness §7):**
1. Toca produção / banco real / envs → **D**.
2. Envolve auth / dinheiro / permissões / dados sensíveis → **C**.
3. Cria/altera contrato público → mínimo **B**.
4. Código isolado sem contrato → **A**.
5. Em dúvida, escolha a classe mais alta.

Referência completa: `docs/plans/risk-classification.md`.

---

## 5. Definition of Ready (Harness v3.2 §8)

Feature com DoR incompleta **não entra em execução**. Em domínio sensível (produção, banco, auth, pagamento, dados sensíveis), DoR incompleta → `BLOQUEADO — DEFINITION OF READY INCOMPLETA`.

- [ ] RFs vinculados (ou justificativa clara).
- [ ] CAs claros e testáveis.
- [ ] Escopo **incluído** descrito.
- [ ] Escopo **excluído** descrito.
- [ ] Classificação A/B/C/D confirmada.
- [ ] Arquivos prováveis de alteração listados.
- [ ] Testes esperados (unit / integration / contract / e2e / smoke).
- [ ] Contratos Zod necessários (ou decisão de que não precisa).
- [ ] Dependências externas.
- [ ] Impacto em banco.
- [ ] Impacto em produção (staging, rollback, feature flag).

Onde vive: **inline no item do `TODO.md`**, junto com o Feature Contract.

---

## 6. Feature Contract (Harness v3.2 §9)

Obrigatório para **B, C, D**. Opcional para A.

**Campos:** ID + nome + risco + RF(s) + branch + CI alvo · Objetivo (1–3 frases) · DoR (§5) · CAs · Escopo incluído/excluído · Arquivos que podem ser alterados · Arquivos que NÃO podem · Contratos Zod · Testes obrigatórios (matriz) · Comandos obrigatórios · Infra/Produção (só C/D) com rollback · Anti-SPEC relevante · Matriz de validação (preenchida no QA) · Gate de autonomia.

**Onde vive:**
1. **Preferência:** bloco inline dentro do item do `TODO.md`.
2. Alternativa: `docs/plans/feature-contracts/F-NNN.md` se passar de ~40 linhas (típico C/D).

Template: `docs/plans/FEATURE-CONTRACT-template.md`.

---

## 7. Matriz de Validação (Harness v3.2 §10)

Obrigatória no Prompt 3 (QA) para B/C/D. Sem evidência objetiva em algum CA → `MUDANÇAS_SOLICITADAS`. Nunca `APROVADO`.

| CA | Teste | Tipo | Status | Evidência |
|---|---|---|---|---|
| CA-N | `arquivo.test.ts::caso` | unit / integration / e2e / smoke | passou/falhou | log de `npm test`, CI link, report Playwright, smoke com exit 0 |

**Conta como evidência:** `npm test` com teste nomeado, Playwright report, CI log com `✔ passed`, migration aplicada em staging com `select`, script de smoke com exit code 0.
**Não conta:** afirmação do agente, "o código parece correto", `.skip`/`.only`, cobertura genérica sem amarração ao CA.

Template: `docs/plans/VALIDATION-MATRIX-template.md`.

---

## 8. CI por níveis (Harness v3.2 §11)

Mapeamento real para o repo:

| Nível | Contém | Script real | Obrigatório para |
|---|---|---|---|
| **N1** | typecheck + lint + unit + build | `npm run typecheck` (continue-on-error) + `npm run lint` (no-op) + `npm test` + `npm run build` | A, B, Fast Fix |
| **N2** | N1 + edge-tests + contract tests | `npm run test:edge` + (futuro) contract tests | B relevante, C |
| **N3** | N2 + e2e + smoke + migration validation | (manual hoje via Cursor MCP + smoke prod) | C crítica, D |

CI hoje: `.github/workflows/ci.yml` roda **N1** (com typecheck em `continue-on-error` por causa do débito) + **N2** parcial (`edge-tests`). N3 ainda é manual. Próxima onda de débito (TODO §3 R-5) destrava N2/N3.

---

## 9. Project Wiki (Harness v3.2 §12)

A wiki vive em `docs/wiki/` — **memória sintetizada viva** entre fontes brutas (prints, logs, decisões) e os agentes.

**Princípio:** a wiki **nunca** substitui PRD/SPEC/CONTRACTS/ADR. Sintetiza e linka.

**Estrutura:**
- `wiki/index.md` — mapa principal (≤ 80 linhas).
- `wiki/log.md` — histórico cronológico (≤ 200 linhas).
- `wiki/overview.md` — projeto em 1 página (≤ 150).
- `wiki/architecture.md` — arquitetura técnica viva (≤ 150).
- `wiki/modules/<mod>.md` — 1 por módulo (≤ 200 cada).
- `wiki/features/<F-NNN>.md` — resumo após merge C/D (≤ 30).
- `wiki/runbooks/<slug>.md` — deploy, rollback, smoke (≤ 150 cada).
- `wiki/context/<F-NNN>.md` — Context Pack por tarefa, descartável (≤ 150).

**Cadência:**
- Diário: 1 linha em `log.md` por release/bugfix; Context Pack se a tarefa continua.
- Quinzenal / pré-release: `/wiki lint`. Se amarelo/vermelho, `/wiki repair`.
- **Não** rodar `lint` antes de cada microtarefa — é checkpoint, não cerimônia.

---

## 10. Fast Fix (Harness v3.2 §13)

`/fast-fix` é o modo **Project Quick** para bug urgente classe A/B sem auth/payment/dados sensíveis/banco/env/deploy, < 30 min.

**Gates duros — sai do modo se:**
- Toca auth/payment/dados sensíveis → escalar Standard/Deep Work.
- Diff > 50 linhas ou > 3 arquivos → escalar.
- Tempo > 30 min → escalar.
- Migration/env/deploy aparecem → Production.
- Sem teste reproduzindo → escrever teste via Standard.
- ≥ 2 ocorrências passadas → Deep Work (bug com causa profunda).

Termina com 1 linha em `wiki/log.md` tipo `BUGFIX` + runbook em `wiki/runbooks/bug-<slug>.md` se o bug pode voltar.

---

## 11. Skills disponíveis (Harness v3.2 §5)

| Skill | Quando usar |
|---|---|
| `/project-kickoff` | Repo novo (não se aplica — já estamos rodando). |
| `/consultor-prd` | Quando abrirmos a onda R-2 (PRD retroativo). |
| `/SDD-avancado` | Quando abrirmos R-3 (SPEC retroativo dos módulos legados). |
| `/skill-scout` | Antes de feature com integração nova não trivial. |
| `/agents-protocol` | Antes de feature classe D — gera cursor-brief com rollback. |
| `/wiki` (`ingest \| context \| lint \| repair`) | Manter a wiki viva entre sessões. |
| `/fast-fix` | Bug urgente A/B sem domínios sensíveis. |
| `/triage-bugs` | ≥ 2 bugs do cliente para priorizar. |

---

## 12. Continuidade entre agentes (Harness v3.2 §23)

Antes de fechar a sessão atual (Claude esgotou tokens, vai usar Codex/Cursor):

```
/wiki context F-NNN
```

Cria/atualiza `docs/wiki/context/F-NNN.md` com estado atual, arquivos relevantes, restrições, próximos passos, decisões abertas e handoff ("última ação", "o que NÃO fiz").

No próximo agente: lê `wiki/index.md` + `wiki/context/F-NNN.md` + `AGENTS.md` + `TODO.md` + Feature Contract. Executa o passo "PRÓXIMOS PASSOS CONCRETOS" e atualiza o Context Pack no fim.

Ao fim da feature: resumo ≤ 5 linhas em `wiki/features/F-NNN.md` (C/D), linha em `log.md` tipo `RELEASE`, **delete** `wiki/context/F-NNN.md` (consumido).

---

## 13. Antipadrões (Harness v3.2 §26 — itens com peso aqui)

- **"Vou usar Fast Fix nesse bug de clientes-v2 / tiny-* — é só 2 linhas":** não. Domínios sensíveis sempre. Escale para Standard/Deep Work.
- **"Esqueci de atualizar `wiki/log.md`":** feature B/C/D não fecha sem isso.
- **"`/wiki lint` antes de cada microtarefa":** não — é checkpoint quinzenal/pré-release.
- **"Edito `wiki/architecture.md` para caber a feature":** ajuste o SPEC primeiro; wiki é espelho.
- **"Classe B mas começou a tocar Tiny / banco":** reclassifique para C ou D **antes** de continuar.

---

## 14. Regras específicas de produção (preservadas)

- **Nenhuma migration preventiva.** Só muda schema quando a feature exige, e somente com brief explícito de rollback.
- **Paridade de testes antes de refatorar rota.** Antes de mexer numa Edge Function existente, capturar comportamento atual em teste de integração.
- **Feature flag para contrato público.** Toda mudança que altera payload entre Tiny/ProSeller ou campos visíveis ao usuário passa por flag até rollout controlado.
- **Imports versionados herdados** (`date-fns@4.1.0`, `sonner@2.0.3`, `next-themes@0.4.6`) são débito conhecido — não remover sem migração planejada.
- **`docs/` versionado.** Qualquer `.md` solto vai para a subpasta certa, nunca solto na raiz.
- **Deploy de Edge Function só via Supabase CLI** (ADR-005). MCP Cursor proibido para `deploy_edge_function`.
- **Bump `systemVersion`** em `src/App.tsx` `SidebarUserInfo` toda PR que dispara deploy visível em produção.

---

## 15. Convenções

- **Branches:** `feat/<slug>` features; `fix/<slug>` correções; `chore/<slug>` reorganização. Trivialidades (< 30 min, testadas) direto em `main`.
- **Commits:** `tipo(escopo): resumo (#F-NNN)` quando houver referência no TODO.
- **Encoding:** UTF-8, LF, sem BOM.
- **Idioma:** código e PR em pt-BR quando o domínio é BR (CNPJ, vendedor, comissão). Mensagens técnicas genéricas podem ficar em inglês.
- **Branch de trabalho:** `main` é fonte de verdade. `master` é obsoleta — ignore.

---

## 16. Contatos e origem

- Repo: `github.com/mediandev/prosellerv1`
- Supabase projeto ref: `xxoiqfraeolsqsmsheue`
- Deploy: Netlify (config em `netlify.toml`)
- Design original: Figma — `figma.com/design/reHzF0vlYIbzge1bFGwZzX/ProSeller-V1`

---

*Arquivo vivo. Revisar sempre que uma prática aqui virar fricção. Limite v3.2: 360 linhas.*
