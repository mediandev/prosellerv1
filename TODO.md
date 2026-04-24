# TODO — ProSeller V1

> Estado vivo do projeto. Único arquivo de controle, junto com `git log`.
> Atualizar ao final de cada sessão.

**Última atualização:** 2026-04-24

---

## 1. Em andamento

**F-001 · Consulta Simples Nacional — ATIVA EM PRODUÇÃO desde 2026-04-24, aguardando validação end-to-end do Valentim.**

Estado da entrega:
- [x] SPEC v0.3 + CONTRACTS + ADR-001..004 + Zod em `packages/shared/types/` — `cf1ea26`, `a0d0823`, `569bcbf`.
- [x] Suíte Vitest + `deno test` (F-002) — merge PR #1 `dd50c31`.
- [x] Migration 108 aplicada **em produção** via Cursor MCP (2026-04-24).
- [x] Secret `FEATURE_SIMPLES_NACIONAL_LOOKUP` cadastrada (inicialmente `false`, depois `true`). `RECEITAWS_TOKEN` pulado — API Pública basta no MVP (ver ADR-002).
- [x] PR #4 (feat/simples-nacional-lookup) mergeado em main — merge commit `4a770bb`.
- [x] 3 Edge Functions redeployadas via `supabase functions deploy` CLI (`create-cliente-v2`, `tiny-empresa-natureza-operacao-v2`, `tiny-enviar-pedido-venda-v1`).
- [x] Códigos duais da DAP cadastrados na UI via toggle (Venda: 781495108/781284632 · Bonificação: 781496980/657287750). Cântico mantida 1:1.
- [x] Feature flag trocada para `true` em produção.
- [x] INC-001 (deploy Cursor MCP publicou stub `// test`) documentado + ADR-005 — `c7d9a51`.

Único bloqueador para mover F-001 para §6:
- [ ] **Validação end-to-end pelo Valentim** — enviado HTML `docs/specs/teste-simples-nacional-valentim.html` com 2 testes (cliente Simples e não-Simples). Aguardando retorno dele com os códigos Tiny observados.

Retomada rápida:
- Se Valentim responder OK → mandar prompt **completo** (do histórico da sessão) no Claude Code CLI para mover F-001 para §6 e encerrar.
- Se vier erro → desligar flag (`FEATURE_SIMPLES_NACIONAL_LOOKUP=false` no painel Supabase), avaliar e investigar.
- Log em tempo real: Supabase → Edge Functions → `tiny-enviar-pedido-venda-v1` → Logs. Eventos esperados: `receitaws.lookup` + `natureza.resolvida`.

---

## 2. Backlog — Features priorizadas

### 🔴 F-001 · Consulta Simples Nacional (Alta · EM EXECUÇÃO — branch feat/simples-nacional-lookup)

**Motivação:** mudanças tributárias em SP exigem identificar clientes optantes do Simples Nacional e ajustar a natureza de operação Tiny conforme o caso.

**Cobre:** RF-001, RF-002, RF-003, RF-004, RF-005, RF-006 (ver `docs/specs/SPEC.md §9` — tabela de rastreabilidade).

**Critérios de aceite (oficial em SPEC §4):**
- CA-001 — Cliente novo PJ com ReceitaWS OK → campos populados.
- CA-002 — Cliente novo PF não consulta ReceitaWS.
- CA-003 — Cliente novo sem CPF/CNPJ → campos `null`.
- CA-004 — ReceitaWS timeout não bloqueia criação (201).
- CA-005 — Revalidação a cada envio de pedido Tiny (ADR-004).
- CA-006 — UI salva dual-ID com toggle.
- CA-007 — Envio Tiny escolhe natureza correta nos 4 cenários (A, B, C, D).
- CA-008 — Feature flag desligada preserva comportamento atual.

**Contratos (Zod em `packages/shared/types/`):**
- `cliente.ts` → `ClienteSimplesNacional`, `ClienteSimplesNacionalUpdate`.
- `natureza-operacao.ts` → `TinyEmpresaNaturezaOperacao` (com `tinyValorSimples`), `UpsertInput`, `NaturezaOperacaoResolucao` (log).
- `simples-nacional.ts` → `ReceitaWsResponseSchema`, `SimplesNacionalLookupResult`, `SimplesNacionalLookupLog`.

**Dependências:**
- Migration 108 (arquivo `supabase/migrations/108_simples_nacional_lookup.sql` já commitado) — aplicação via Cursor MCP pendente (`cursor-brief §Tarefa 1`).
- Feature flag `FEATURE_SIMPLES_NACIONAL_LOOKUP` (env var — ADR-001), inicia `"false"`.
- Token `RECEITAWS_TOKEN` em secret Supabase (ADR-002, plano pago).
- Edge Functions afetadas: `create-cliente-v2`, `tiny-empresa-natureza-operacao-v2`, `tiny-enviar-pedido-venda-v1`.

**Branch:** `feat/simples-nacional-lookup`. Commits atômicos: (1) testes primeiro (`resolveNaturezaTiny` + toggle UI), (2) helper `natureza-resolver.ts`, (3) helper `receitaws-client.ts`, (4) integração em `create-cliente-v2`, (5) aceite dual-ID em `tiny-empresa-natureza-operacao-v2`, (6) revalidação por pedido em `tiny-enviar-pedido-venda-v1`, (7) toggle na UI de Mapeamento, (8) campo read-only na ficha do cliente.

---

### 🟡 F-003 · Clonar Pedido (Média · Backlog)

**Motivação:** quando um pedido é cancelado no Tiny, o fluxo atual obriga o backoffice a recriar manualmente um novo pedido com os mesmos itens. Um botão "Clonar" na listagem reduz esse retrabalho e preserva auditoria: o pedido cancelado permanece cancelado, e o clonado é um novo pedido com rastreabilidade própria. Decidido na call com Valentim Nunes em 2026-04-22.

**Escopo proposto:**
- Botão "Clonar" na listagem de pedidos (`SalesPage` / `pedido-venda-v2` list).
- Ao clicar, cria um novo pedido **em rascunho editável** copiando:
  - Cliente, empresa, vendedor, natureza de operação, condição de pagamento.
  - Todos os itens (`pedido_venda_produtos`) com quantidades e valores unitários.
  - Descontos, observações e observação interna.
- **NÃO copia:** status, `id_tiny`, `numero_pedido`, `data_venda` (nova data) e `ordem_cliente` (opcional — verificar com Valentim).
- Pedido clonado nasce em status "Rascunho" e pode ser editado antes de enviar ao Tiny.

**Critérios de aceite (rascunho — formalizar em SPEC quando a feature abrir):**
- CA-1: Botão "Clonar" aparece em pedidos de qualquer status (não restrito a cancelados).
- CA-2: Pedido clonado tem novo ID local, sem vínculo com o original.
- CA-3: Itens do pedido clonado são editáveis (permite ajustar quantidade/valor antes de enviar).
- CA-4: Pedido original permanece imutável (auditoria preservada).
- CA-5: Listagem indica visualmente quando um pedido foi clonado a partir de outro (opcional — confirmar UX).

**Dependências:**
- Edge Function afetada: `pedido-venda-v2` (novo endpoint POST `/pedido-venda-v2/clone`).
- Sem migration (usa tabelas existentes).
- Sem feature flag (mudança aditiva, sem risco tributário).

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
- **Commits de documentação feitos com autor genérico `Seu Nome <seu-email@example.com>`** (`cf1ea26`, `6dba32b`, `6c29740`, `2f6bd76`) — histórico imutável em `origin/main`; autor correto (`EduardoSousaPO <eduspires123@gmail.com>`) a partir de `b3be6bf` em diante. Rebase/force-push para corrigir o histórico está **proibido** em `main` (CLAUDE.md).
- **Deploy é Netlify, sem MCP disponível** — template do Harness v3 assume Vercel. Operação em Netlify fica manual (painel) ou via `netlify` CLI. Identificado em `docs/plans/skills-manifest.md §5`. Não bloqueia F-001.
- **Supertest não encaixa em Edge Functions Deno** — o TODO §3 R-5 listava "Supertest", mas Edge Functions rodam em Deno (não Node), e Supertest assume Node HTTP server. Recomendação em `docs/plans/skills-manifest.md §5`: usar `deno test` + `supabase functions serve` para integração de Edge Functions, reservando Supertest só se aparecer algum servidor Node no projeto. Atualizar R-5 quando a feature da suíte de testes for aberta.
- **`npm install` gerou 11 vulnerabilidades auditadas (1 moderate, 8 high, 2 critical)** nas dependências existentes — detectadas ao instalar zod na fase SPEC. Não relacionado a zod; são dependências herdadas. Tratar em onda dedicada de segurança (`npm audit fix` controlado, não `--force`).
- **F-001 consulta ReceitaWS a cada envio de pedido Tiny (ADR-004).** Decisão tributária do cliente — sem cache por janela. Monitorar quota ReceitaWS consumida no primeiro mês após ligar a flag em produção; se aproximar do limite do plano pago, reabrir ADR-004 para considerar cache curto (TTL 24h) com revalidação sob mudança de status.
- Automatizar deploy de Edge Functions em GitHub Action ao mergear main (evita INC-001 recorrer).
- Quota ReceitaWS API Pública 3/min — monitorar logs receitaws.lookup.rate_limited; migrar para plano Comercial se recorrente.

---

## 5. Bugs / incidentes

🐛 INC-001 · 2026-04-24 · Cursor MCP publicou stub "// test" em
create-cliente-v2 em produção durante deploy de F-001.
- Reprodução: Cursor agent invocou `deploy_edge_function` com
  payload minimalista de validação; sobrescreveu versão de produção.
- Impacto: janela de ~minutos com create-cliente-v2 retornando
  "// test" em produção. Nenhum cliente afetado confirmado.
- Resolução: `npx supabase functions deploy create-cliente-v2
  --project-ref xxoiqfraeolsqsmsheue` a partir do código em main
  pós-merge PR #4. Também redeployadas
  tiny-empresa-natureza-operacao-v2 e tiny-enviar-pedido-venda-v1
  pelo mesmo canal.
- Status: resolvido. Lição → ADR-005.

_Formato para próximos bugs:_

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
| 🟢 F-002 | Setup Vitest + deno test (merge PR #1) | `dd50c31` | 2026-04-21 |
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
