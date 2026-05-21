# TODO — ProSeller V1

> Estado vivo do projeto. Único arquivo de controle, junto com `git log`.
> Atualizar ao final de cada sessão.

**Última atualização:** 2026-05-21 (sessão — F-LOG-CRM R-LOG-2 implementada na branch `feat/log-crm-R-LOG-2`, V 1.38, aguardando push/deploy)

---

## 1. Em andamento

**F-LOG-CRM · Migração módulo Logis (LogCRM Bubble → ProSeller V1) — R-LOG-2 IMPLEMENTADA (branch `feat/log-crm-R-LOG-2`, V 1.38), aguardando push/deploy. R-LOG-1 EM PRODUÇÃO desde 2026-05-21.**

Branch R-LOG-1 mergeada em main. Plano completo em 8 ondas: ver `docs/wiki/context/F-LOG-CRM.md` e `docs/plans/feature-contracts/F-LOG-{1..8}.md`.

R-LOG-2 entregue nesta sessão (2026-05-21):
- ✅ Feature Contract detalhado em `docs/plans/feature-contracts/F-LOG-2.md` (12 CAs).
- ✅ Edge Function `frete-logistica-v1` estendida com 2 actions (`list_by_status`, `get_with_ocorrencias`) + 7 filtros + paginação (hard cap 100 — lição INC-016). Helpers puros em `supabase/functions/_shared/frete-logistica-helpers.ts`.
- ✅ 3 wrappers HTTP novos em `src/services/logisticaService.ts` (`listFretes`, `listFretesByStatus`, `getFreteWithOcorrencias`).
- ✅ 6 componentes React novos: `LogisticaDashboardPage`, `LogisticaBuscaPage`, `FreteDetalhePage`, `FreteOcorrenciaTimeline`, `FreteStatusBadge`, `FreteResumoCard`.
- ✅ Singleton `src/services/supabase.ts` para Storage upload (sem refatorar fetchers existentes).
- ✅ `LogisticaPage` atualizada: abas finais Dashboard (default) / Busca / Transportadores / Novo Frete. Abas "Regiões destino" e "Origens" removidas (decisão Valentim 2026-05-21 — tabelas permanecem no banco).
- ✅ `SalesPage` recebe bloco "Entrega" (`FreteResumoCard`) no Diálogo "Detalhes da Venda" quando NFe foi emitida.
- ✅ Bump V 1.37 → V 1.38 + 5 bullets no `ChangelogPage`.
- ✅ Testes: 2 unit (`logistica-dashboard.smoke.test.tsx`, `frete-detalhe-timeline.smoke.test.tsx`) + 1 edge (`frete-logistica-v1-list-filters.test.ts` cobrindo cap 100 + buckets + diasEmTransito).
- ✅ Wiki atualizada (`log.md`, `modules/logistica.md`, `context/F-LOG-CRM.md`).
- ⏳ **Pendente humano:** abrir PR + deploy de `frete-logistica-v1` redeployada via `npx supabase functions deploy frete-logistica-v1 --project-ref xxoiqfraeolsqsmsheue` (local).
- ⏳ **Pendente humano:** criar bucket Supabase Storage `logistica-comprovantes` via Cursor MCP — brief em `cursor-brief.md` Tarefa 9. UI já degrada graciosamente sem ele.

R-LOG-1 entregue e deployado:
- ✅ Migration 119 aplicada em prod via Cursor MCP `apply_migration` (2026-05-21, V 1.36).
- ✅ 4 Edge Functions (transportador-logistica-v1, regiao-destino-v1, origem-frete-v1, frete-logistica-v1) deployadas via `npx supabase functions deploy --project-ref xxoiqfraeolsqsmsheue`.
- ✅ Flags `FEATURE_LOG_CRM=true` (Supabase Secret) e `VITE_FEATURE_LOG_CRM=true` (Netlify env) ligadas em prod 2026-05-21.
- ✅ Smoke E2E via Playwright autenticado `lucas.carmo@flowcode.cc` em `proseller.app.br`: criou 1 transportador (ATIVA TESTE), 1 região (MG-MATA), 1 origem (MG-JDF, empresa 8), 1 frete (id=1, NFe 99999, R$100, status "Em Separação"). JOINs verdes via MCP.
- Resumo formal em `docs/wiki/features/F-LOG-CRM-R-LOG-1.md`.

Bloqueador para R-LOG-2 (Torre de Controle + Busca + Detalhe):
- [ ] Feedback do Valentim sobre os cadastros (campos faltantes? nomenclatura?). R-LOG-2 pode rodar em paralelo — não bloqueia.
- [ ] Prompt R-LOG-2 pronto na conversa de discovery; abrir sessão CLI nova quando for executar.

Bloqueador para R-LOG-3 (hook auto-create frete pós Tiny):
- [ ] R-LOG-2 mergeada (precisa Torre de Controle para usuário ver os fretes auto-criados).
- [ ] Próxima migration C/D (R-LOG-3 toca `tiny-enviar-pedido-venda-v1` em prod) **exigirá staging Supabase** — compromisso documentado em DECISIONS_LOG 2026-05-20. Provisionar projeto Supabase free de staging antes de iniciar R-LOG-3.

Bloqueadores R-LOG-4/7 (com Valentim):
- [x] ~~ADR-006~~ (creds SSW) — CANCELADA. Integração pública por chave NFe.
- [ ] **ADR-008** (polling SSW: on-demand vs cron) — pendente. Bloqueia R-LOG-4.
- [ ] **ADR-007** (parser PDF/EDI próprio vs SaaS vs WS SSW para Embarcadores) — pendente. Bloqueia R-LOG-7.
- [ ] **ADR-009** — mantida manual no MVP (resolvida).
- [ ] **1 chave NFe ativa** (44 dígitos) pedida ao Valentim para finalizar schema Zod `OcorrenciaSSW`. Sem urgência.
- [ ] **2-3 PDFs de fatura ATIVA/BRASSPRESS** pedidos ao Valentim. Sem urgência.

Smoke registros teste em prod (não apagar, deixar como evidência do deploy de 2026-05-21):
- transportador `id=1` ATIVA DISTR E LOGISTICA LTDA (TESTE)
- regiao_destino `id=1` MG-MATA (TESTE)
- origem_frete `id=1` MG-JDF (TESTE, empresa 8)
- frete_logistica `id=1` NFe 99999, R$100, status "Em Separação"

---

**F-HARNESS-V3.2 · Migração para Harness v3.2 + Project Wiki — Concluída em 2026-05-19**

Branch: `chore/harness-v3.2-reorg` · Classe: **B** (puramente documental, sem toque em código de produção) · CI alvo: **N1**.

Entregue:
- `AGENTS.md` v2.0 (Harness v3.2) — princípios não-negociáveis 1-17, classificação A/B/C/D, DoR, Feature Contract, Matriz de Validação, CI N1/N2/N3, Project Wiki, Fast Fix, continuidade entre agentes, antipadrões. Regras específicas de produção preservadas.
- `CLAUDE.md` v3.2 — `docs/wiki/index.md` como item 0 da leitura inicial; gates duros de fast-fix; quando atualizar a wiki; preservadas todas as lições (bump systemVersion, typecheck herdado, migrations com gaps, padrão `-v2`, mocks, App.tsx 45 KB, etc.).
- `docs/wiki/` — `index.md`, `log.md` (com 1 linha `[INGEST]` de hoje), `overview.md`, `architecture.md`, 8 módulos (clientes, vendas-pedidos, erp-tiny, comissoes, conta-corrente, usuarios-auth, produtos-cadastros, dashboard), 6 runbooks (deploy-edge-function, deploy-netlify, aplicar-migration-supabase, rollback-feature-flag, bump-system-version, smoke-pos-deploy-prod), `features/` + `context/` vazios com `.gitkeep`.
- `docs/plans/CURRENT_REALITY.md` — síntese honesta do estado real em 12 blocos.
- `docs/plans/risk-classification.md` (A/B/C/D com exemplos deste projeto), `FEATURE-CONTRACT-template.md`, `VALIDATION-MATRIX-template.md`, `DECISIONS_LOG.md`, `feature-contracts/` (vazio com `.gitkeep`).
- `archive/` — screenshots agrupados por mtime (2026-04-29, 2026-05-05, 2026-05-06), `imports/` (4 `.xlsx`), `specs-auxiliares/` (2 `.html`), `temp/` (1 `.json` renomeado).
- `.github/workflows/ci.yml` com `typecheck` em `continue-on-error` + documentação N1/N2/N3 no cabeçalho.

Não tocou: `src/`, `supabase/`, `packages/`, `package.json`, `tsconfig*`, `vite.config.ts`, `netlify.toml`, `index.html`. SPEC.md, CONTRACTS.md e ADRs existentes preservados integralmente.

Não bumpou `systemVersion` (PR puramente documental, sem deploy Netlify previsto).

Próximo passo do projeto: retomar features/bugs em `§1` e `§5` usando o fluxo v3.2 (Prompt 1 → 2 → 3 conforme classe da feature). Lembrar: F-001 aguarda validação E2E do Valentim; INC-014 deploy `tiny-enviar-pedido-venda-v1` + smoke pendentes; BUG-001/003 EM CORREÇÃO em `fix/timezone-e-vendedor-backoffice`; BUG-002 decisão de produto pendente.

---

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
- [ ] **Validação end-to-end pelo Valentim** — enviado HTML `docs/specs/teste-simples-nacional-valentim.html` com 2 testes (cliente Simples e não-Simples). **INC-002 corrigido em prod hoje (2026-04-29, merge `87080e0`, deploy CLI das 2 funcs)** — pedir Valentim refazer Teste A (esperado 781284632/657287750 + log `receitaws.lookup outcome=ok simplesOptante=true`). **INC-003 corrigido em prod hoje (merge `40da033`, deploy CLI de `clientes-v2`)** — ficha do cliente passa a exibir "Sim" no campo Optante Simples Nacional (antes mostrava "—" porque o mapper omitia o campo).

Retomada rápida:
- Se Valentim responder OK → mandar prompt **completo** (do histórico da sessão) no Claude Code CLI para mover F-001 para §6 e encerrar.
- Se vier erro → desligar flag (`FEATURE_SIMPLES_NACIONAL_LOOKUP=false` no painel Supabase), avaliar e investigar.
- Log em tempo real: Supabase → Edge Functions → `tiny-enviar-pedido-venda-v1` → Logs. Eventos esperados: `receitaws.lookup` + `natureza.resolvida`.

---

## 2. Backlog — Features priorizadas

### 🚚 F-LOG-CRM · Migração módulo Logis (LogCRM Bubble) — 8 ondas

R-LOG-1 (esta sessão, em execução). Demais ondas embriões em `docs/plans/feature-contracts/F-LOG-{2..8}.md`.

| Onda | Nome | Classe | CI | Depende |
|---|---|---|---|---|
| R-LOG-2 | Torre Controle + Busca + Detalhe do frete | **B** | N1+matriz | R-LOG-1 |
| R-LOG-3 | Hook em `tiny-enviar-pedido-venda-v1` cria frete automático | **C** | N2 | R-LOG-1 |
| R-LOG-4 | Integração SSW Tracking (on-demand + catch-up) | **D** | N3 | R-LOG-1, R-LOG-2, ADR-006, ADR-008 |
| R-LOG-5 | Indicadores financeiros do Dashboard | **B** | N1+matriz | R-LOG-2 |
| R-LOG-6 | Faturas transportadora — CRUD manual | **B** | N1+matriz | R-LOG-1 |
| R-LOG-7 | Parser PDF/EDI de faturas | **D** | N3 | R-LOG-6, ADR-007 |
| R-LOG-8 | Auditoria Cotado × Cobrado | **C** | N2 | R-LOG-1, R-LOG-6 |

Decisões pendentes (registradas em `docs/plans/DECISIONS_LOG.md`):
- ADR-006 (creds SSW), ADR-007 (parser PDF/EDI), ADR-008 (polling SSW), ADR-009 (fonte `valor_cotacao`).

Origem: discovery via Playwright em `https://logcrm.bubbleapps.io` (creds Valentim) — screenshots em `archive/screenshots/2026-05-20-logcrm/`.

---

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

### 🟢 F-004 · Importação de clientes via planilha (Concluída — V 1.27)

**Motivação:** Valentim reportou em 2026-05-06 que o vendedor Sergio
não conseguia cadastrar 6 clientes novos (TERUYA — DAP) e pediu
import via planilha para acelerar. A UI já tinha o componente
`ImportCustomersData` (Configurações &gt; Importação de Dados) com
preview, validação e conversor — mas `handleConfirmImport` era um
mock (timeout de 1.5s sem chamar API). Esta feature wireia a
persistência real e adapta o mapeador para a planilha do Sergio.

**Escopo entregue:**
- `COLUMN_MAP` estendido com colunas da migração: `Código`,
  `CNPJ / CPF`, `IE / RG`, `NOME REDE`, `Situação Proseller`,
  `Endereço`, `Cidade`, `Estado`, `Fone`, `Web Site`,
  `E-mail para envio de notas fiscais`, `Empresa de Faturamento`,
  `Lista de Preço`, `Desc Fin`, `Desconto (%)`, `Observações NF`.
- **`handleFileUpload` agora aplica COLUMN_MAP automaticamente**
  (antes só `handleConvertFile` mapeava — usuário tinha que rodar
  Converter → re-upload do CSV gerado). Detectado durante teste E2E
  Playwright em 2026-05-06: planilha com `Tipo pessoa` (lowercase)
  era rejeitada na validação porque `validateRow` lia `Tipo Pessoa`
  do template. Fix elimina o passo extra de conversão.
- Pré-resolução de lookups antes do loop: `api.get('vendedores')`,
  `api.get('empresas')`, `api.get('listas-preco')`. Match
  case/accent-insensitive por nome/razaoSocial/email/codigo.
- Vendedor com sufixo `(NNN)` (ex.: `SERGIO GLEZER (5984)`) é
  partido em nome + código antes do match.
- Por linha: `api.create('clientes', cliente)` + `api.update` com
  `empresaFaturamentoId` quando empresa resolve (POST do clientes-v2
  não aceita o campo, PUT sim — split em 2 chamadas por linha).
- Quando vendedor/empresa/lista não casam, registro é importado com
  aviso na lista de erros (não-bloqueante) — backoffice corrige
  manualmente depois.
- Validação tornada case/accent-insensitive (`ATIVO` agora aceito;
  `Pessoa Jurídica` em qualquer caixa).
- Progress bar no preview durante o run.

**Cobre:** caso de uso "Valentim recebe planilha do vendedor com
clientes novos do mês e importa em lote em Configurações &gt;
Importação de Dados &gt; Selecionar Arquivo".

**Não cobre (pode virar F-NNN se demanda surgir):**
- Condições de pagamento por linha (FORMA, PZ PGTO, DESC EXTRA da
  planilha são lidas mas ignoradas no payload).
- Segmento como ID (campo vai como texto livre via segmentoMercado).
- Status: ✅ código pronto na branch `main`. **clientes-v2 v44
  deployado em produção em 2026-05-06 14:27 BRT** (via Supabase
  MCP — cliente_id 7352..7357 confirmados em DB com Sergio
  vinculado em vendedoresatribuidos). **Pendente: deploy
  Netlify** para a UI da importação ficar disponível em
  proseller.app.br.

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

### 🟢 Onda R-1 — Inventário e reorganização de docs/ (Parcial — concluída em 2026-05-19 no bootstrap Harness v3.2)

- [x] **Raiz limpa** — 19 PNGs, 4 `.xlsx`, 2 `.html` auxiliares e 1 `.json` temporário corrompido movidos para `archive/` (sub-pastas `screenshots/<data>/`, `imports/`, `specs-auxiliares/`, `temp/`).
- [x] **`docs/wiki/` populada** (cenário C + bootstrap v3.2): index, log, overview, architecture, 8 módulos, 6 runbooks, features/context vazios.
- [x] **Templates v3.2 plantados** em `docs/plans/`: CURRENT_REALITY, risk-classification, FEATURE-CONTRACT, VALIDATION-MATRIX, DECISIONS_LOG, feature-contracts/.
- [ ] **Pendente:** inventariar `docs/front/` (120+ arquivos pré-Harness ainda intocados nesta sessão) em `docs/plans/inventario.md`. Decidir para cada um: `docs/decisions/adr/`, `docs/specs/`, `docs/product/`, `docs/wiki/runbooks/` ou `archive/legacy-docs/`. Um commit por lote temático.

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
- **Auditoria de READ Edge Functions ao adicionar coluna nova:** quando uma feature adiciona campo novo ao schema, criar checklist obrigatório de Edge Functions de leitura a auditar. **INC-003 surgiu porque a auditoria pré-deploy de F-001 cobriu apenas os fluxos de escrita (`create-cliente-v2`, `tiny-empresa-natureza-operacao-v2`, `tiny-enviar-pedido-venda-v1`) e ignorou o GET de `clientes-v2` que serializa a entidade pra ficha.** Próxima feature que adicionar coluna em `cliente`/`empresa`/`pedido_venda` deve listar todas as Edge Functions GET dessa entidade no PR antes de mergear.
- **`mapClienteCompleto` não tem teste unit:** vive dentro de `supabase/functions/clientes-v2/index.ts` que é uma `serve()` entry point e não exporta. Extrair pra `_shared/cliente-mapper.ts` na próxima feature que tocar `clientes-v2` (não fazer oportunisticamente). Débito identificado no fix do INC-003.
- **F-004 import precisa normalizar CEP/CNPJ/fone na ENTRADA também (defesa em 2 camadas).** INC-011 mostrou que clientes importados pela planilha do Sergio via `ImportCustomersData.tsx` chegam ao banco com formatação Excel preservada (`07.250130`, `61.585.865/0737-01`, `(11) 3296-2301`). O fix do INC-011 sanitiza no boundary do Tiny (`tiny-enviar-pedido-venda-v1`), mas qualquer outro consumidor que dependa do formato canônico (ex.: integrações futuras, busca por CEP, validação no frontend) vai sofrer. Próxima onda do import deve aplicar `.replace(/\D/g, '')` em CEP/CNPJ/fone antes do `api.create('clientes', ...)`. Backfill dos clientes já importados é opcional (não bloqueia uso). Não fazer oportunisticamente — abrir feature dedicada quando F-004 voltar a ser tocada.
- **F-004 falha silenciosamente quando o cliente já existe (unique constraint).** `ImportCustomersData.tsx:554` chama `api.create('clientes', ...)` sem upsert. Se a row já existir por `codigo` ou `cpf_cnpj`, o backend retorna erro mas o try/catch interno do loop por linha (L572-574) só registra como "Importado com avisos" — usuário não percebe que a planilha **não atualizou** o cliente existente. INC-013 (Valentim 2026-05-07) é instância: pediu "processar de novo a planilha pra atualizar vendedor" porque achou que o import iria fazer upsert. Próxima feature que tocar o componente deve: (a) detectar conflito ANTES do POST (lookup por `codigo`/`cpf_cnpj` no início do loop), (b) oferecer toggle "Atualizar clientes existentes" no preview, (c) quando toggle ON, chamar `api.update` em vez de `api.create` na linha conflitante, (d) quando toggle OFF, mensagem explícita "cliente X já existe — pulando" em vez de "Importado com avisos". Não fazer oportunisticamente.
- **`findVendedor` no `ImportCustomersData` falha quando planilha usa razão social no lugar do nome do vendedor.** Caso de teste: planilha Montoz 2026-05-01 traz `Vendedor = MONTOZ REPRESENTAÇÃO COMERCIAL LTDA`; vendedora cadastrada é `Valeria Montoz` (`gomes_val@hotmail.com`). Os 3 níveis de match (email, nome exato, includes mútuo) falham. INC-013 acabou não sendo causado por isso (os clientes da planilha já existiam e o create caiu na unique constraint), mas o bug está latente — qualquer planilha futura com vendedor por razão social vai falhar igual. Fix sugerido para a próxima feature que tocar o componente: aceitar `email` ou `user_id` literal na coluna 'Vendedor (Email)' (o nome da coluna até induz isso), com fallback para o match atual. Reaproveitar a estrutura `splitVendedorValue` para extrair email entre `<>` se vier formato `Nome <email@host>`.
- **30 clientes com `vendedoresatribuidos` apontando para UUID inexistente** (estado pré-INC-013, agora corrigido). Origem: bulk update de jan/2026 e 03/mai/2026 gravou o UUID `c02341e2-7356-4ec1-86fe-119e16465101` que não existe em `public."user"` nem em `auth.users`. Não há `criado_por`/`atualizado_por` apontando para ele em nenhuma row. Provável: script ad-hoc de migração inicial de carteira ou hard-delete de user antigo deixando referências órfãs. **O fix do INC-013 só corrigiu os 30 clientes da Valéria** — pode haver outros clientes no banco com o mesmo UUID fantasma (não auditado). Próxima passada: query `SELECT cliente_id, codigo, nome FROM cliente WHERE 'c02341e2-7356-4ec1-86fe-119e16465101'::uuid = ANY(vendedoresatribuidos) AND deleted_at IS NULL;` — se retornar > 0, abrir INC-014 e auditar com Valentim quem deveria ser o vendedor real de cada um. Não fazer agora; abrir só se Valentim reportar mais clientes "sem vendedor".

---

## 5. Bugs / incidentes

🔴 INC-018 · 2026-05-21 · Permissões de usuário não persistem edições.
Reportado por Valentim na call de 2026-05-21 (15:15 BRT, 26 min): "Eu criei
[um usuário] já com algumas permissões a menos. E aí depois eu vi que ele
veio com tudo. Não consegui tirar suas permissões aqui."
- Sintoma: ao editar um usuário existente e remover algumas permissões,
  ao salvar e reabrir o cadastro, todas as permissões voltam (ou estavam
  desde a criação). Sem evidência ainda de payload — Valentim só viu via UI.
- Hipóteses: (a) `update-user-v2` ignora subset do array `permissoes` no
  PATCH/PUT (família INC-015 — Edge Function só salvando master); (b)
  tabela de junção (ex.: `user_permissoes` ou `ref_user_role`) não sofre
  DELETE+INSERT consistente; (c) frontend não envia o array de permissões
  no payload de edição.
- Prioridade: **pré-1ºJun.** Cântico vai 100% no ProSeller em 1ºJun e
  permissões finas são bloqueador operacional.
- Próximos passos para a sessão que pegar:
  1. Reproduzir em prod com `lucas.carmo@flowcode.cc` editando um usuário
     teste — capturar payload PUT no DevTools.
  2. Conferir `supabase/functions/update-user-v2/index.ts` se existe (ou
     o equivalente `users-v2` PUT) e como mexe em `user_permissoes`.
  3. Auditar tabela de papéis/permissões (`ref_user_role`,
     `user_permissoes`) para entender o modelo.
  4. Aplicar fix + smoke E2E + bump systemVersion + entry no log.md.
- NÃO mexer nesta onda R-LOG-2 (escopo isolado, classe diferente).

---

✅ INC-017 · 2026-05-21 · Valentim reportou bug recorrente em prod (V 1.36):
"Alguns dados do cadastro do cliente não ficam salvos. Tipo de pessoa
(pessoa jurídica) e desconto padrão." Screenshot mostrava cliente
`E.R DA SILVA COSMETICOS` (cliente_id 7364, CNPJ 28.745.999/0001-17)
com campo "Tipo Pessoa" vazio em prod, apesar de PJ óbvio.
- Reprodução: smoke E2E em prod via Playwright como
  `lucas.carmo@flowcode.cc`. Banco confirmou `ref_tipo_pessoa_id_FK=null`
  para cliente_id 7364 + carteira pesada (cliente real, ativo).
  Payload PUT capturado mandava 3 campos canônicos apontando para PJ:
  `tipoPessoa: "Pessoa Jurídica"`, `refTipoPessoaId: 2`,
  `ref_tipo_pessoa_id: 2`. Mesmo assim banco persistia null.
- Causa raiz: `supabase/functions/clientes-v2/index.ts` PUT (linhas
  ~537-550) e POST (~347-361) liam `body.tipoPessoa` PRIMEIRO. Como
  o frontend manda `tipoPessoa: "Pessoa Jurídica"` (string humana),
  `Number("Pessoa Jurídica") = NaN`, que serializa como `null` no
  JSON do RPC. Branch `else if` que olhava `refTipoPessoaId` /
  `ref_tipo_pessoa_id` nunca rodava (porque `body.tipoPessoa` é
  truthy). RPC `update_cliente_v2` faz `CASE WHEN p_ref_tipo_pessoa_id_fk
  IS NOT NULL THEN ... ELSE c."ref_tipo_pessoa_id_FK" END` — recebia
  null, mantinha valor anterior (que também era null). Mesma família
  de INC-008 (vendedoresAtribuidos não normalizado) e INC-009
  (`p_desconto` não chegava ao RPC).
- Causa raiz secundária: `src/components/CustomerFormPage.tsx` linha
  ~60 inicializava `descontoPadrao: 0`, `descontoFinanceiro: 0`,
  `pedidoMinimo: 0`. Quando o usuário não tocava nesses campos, o
  PUT enviava `0` e a RPC fazia `COALESCE(0, c.desconto) = 0`,
  sobrescrevendo o valor existente. INC-009 (V 1.28) só corrigiu
  o problema de `p_desconto` chegar ao RPC; este residual aparecia
  quando o user editava outro campo e salvava.
- Resolução: novo helper `extractRefTipoPessoaId(body)` em
  `clientes-v2/index.ts` que prioriza IDs canônicos
  (`refTipoPessoaId`, `tipoPessoaId`, `ref_tipo_pessoa_id_FK`,
  `ref_tipo_pessoa_id`) e só aceita `tipoPessoa` string se for
  numérica. Aplicado em POST e PUT. Frontend: defaults numéricos
  trocados para `undefined` (RPC mantém valor anterior via
  `COALESCE`). V 1.37.
- Status: edge function `clientes-v2` deployada em prod (`npx
  supabase functions deploy clientes-v2 --project-ref
  xxoiqfraeolsqsmsheue`). Smoke E2E pós-fix verde: PUT no cliente
  7364 com mesmo payload (string + ID) agora persiste
  `ref_tipo_pessoa_id_FK=2` no banco. `updated_at` 19:34:04 (V 1.37
  ativo). Cliente 7364 restaurado (era o quebrado). Frontend V 1.37
  ainda pendente deploy Netlify (Eduardo).
- Lição: padrão "edge function lê string humana primeiro" tem
  precedente (INC-008, INC-009). Auditar todos os `*-v2` PUT/POST
  que aceitam `tipoXyz` como string + `tipoXyzId` como número —
  procurar `if (body.tipoXxx)` que entra primeiro. Considerar
  contrato Zod no `packages/shared/types/` para clientes-v2
  (próxima onda de débito C-1).

✅ INC-016 · 2026-05-20 · Após o fix do INC-015 em prod (V 1.34), Valentim
reportou 3 novos sintomas no fluxo de Listas de Preço: dropdown de
produtos vazio ao criar nova lista, mesmo problema ao editar a
ES_ARAUJO [ATUAL] que ele criou vazia, e impossibilidade de
alterar o valor de itens já vinculados em listas existentes.
- Reprodução: smoke E2E em prod com lucas.carmo@flowcode.cc (V 1.34)
  via Playwright + console do navegador. Console mostrava
  `produtos-v2?action=list` retornando 500 com `canceling statement
  due to statement timeout` (limite de 60s do Postgres do Supabase).
  Frontend caía em fallback silencioso para mockProdutos.ts (12
  itens Dell/Logitech/Keychron — não os reais DAP do Median).
- Causa raiz A (timeout): `supabase/functions/produtos-v2/index.ts`
  case `'list'` (linhas ~163-192) fazia `SELECT (20 colunas) FROM
  produto WHERE deleted_at IS NULL ORDER BY created_at DESC` sem
  `LIMIT` nem paginação. Conforme a base do cliente crescia, a
  query passou a estourar o `statement_timeout`. Sub-queries
  posteriores em `marcas`, `ref_tipo_produto`, `ref_unidade_medida`
  agravavam.
- Causa raiz B (UX): `src/components/PriceListFormPage.tsx` linha
  ~650 renderizava o preço como `formatCurrency(pp.preco)` em
  texto estático, só com botão de Remover ao lado. O workaround
  "remover + readicionar" também era bloqueado pelo filtro
  `produtosDisponiveis` (linha ~593-595) que retira do dropdown
  itens já vinculados.
- Resolução: PR #24 (`7285e22`, V 1.35) — A) `.limit(2000)` +
  `ORDER BY descricao ASC` no `produtos-v2 case 'list'`; B) novo
  handler `handleUpdateProdutoPreco` em `PriceListFormPage`, prop
  `onUpdatePreco` em `ProdutoPrecoForm`, troca da célula de preço
  por `<Input type="number">` controlado quando `!disabled`. Sem
  migration. Sem mudança no schema.
- Status: código mergeado em `main`, edge function `produtos-v2`
  deployada em prod, frontend V 1.35 publicado via Netlify, smoke
  E2E AC1+AC2 verde em https://prosaller.netlify.app/ (dropdown
  lista 28 produtos reais ordenados alfabeticamente; edição inline
  10 → 22,50 persistiu corretamente via PUT). Aguardando smoke
  real do Valentim para fechar formalmente.
- Lição A: Edge Functions `*-v2?action=list` que retornam todos os
  registros sem paginação sobrevivem em ambiente de teste/staging
  mas estouram em produção quando a base passa de N mil registros.
  Auditar `clientes-v2`, `pedido-venda-v2`, `produtos-v2` (e
  outros) periodicamente — adicionar `LIMIT` como quick fix, mas
  o ideal é paginação server-side com search.
- Lição B: bugfix de persistência (INC-015) não revela
  necessariamente todo o problema de UX da feature. Vale rodar
  fluxo completo do cliente (criar + editar + alterar +
  reabrir + excluir) antes de declarar resolvido.

✅ INC-015 · 2026-05-20 · Lista de preço criada/editada via Configurações
não persistia produtos nem faixas de comissionamento.
- Reprodução: Valentim 2026-05-19 09:42 BRT — "Não consigo atualizar
  uma lista de preço manualmente aqui. As alterações não ficam salvas.
  Tentei resolver criando uma nova... a lista foi criada. Ao abrir a
  lista, não havia nenhum item vinculado." Print mostra `ES_ARAUJO
  [ATUAL]` com 0 produtos vinculados em prod.
- Causa raiz: `supabase/functions/listas-preco-v2/index.ts` POST
  (linhas ~254-278) e PUT (linhas ~280-318) faziam INSERT/UPDATE
  só na master `listas_preco`. Recebiam `body.produtos` e
  `body.faixasDesconto` no payload e simplesmente ignoravam. As
  tabelas filhas `produtos_listas_precos` e
  `listas_preco_comissionamento` já existiam (DELETE da própria
  função as limpava) e são lidas por `generate_vendedor_comissao`
  (migration 082).
- Resolução: PR #21 (`64929c2`, V 1.34) — POST insere filhos pós-INSERT
  da master com rollback manual em caso de erro nos filhos; PUT
  replica replace (DELETE filhas + INSERT do payload novo);
  validação de `tipoComissao=conforme_desconto` exige
  `faixasDesconto.length>0` e rejeita `max <= min`; descontoMax=null
  ("acima de") vira `100` no banco. Sem migration. Sem mudança no
  frontend.
- Status: código mergeado em `main`, edge function deployada em
  prod (`xxoiqfraeolsqsmsheue`), smoke E2E AC1+AC2 verde em
  https://prosaller.netlify.app/ via Playwright (criar lista fixa
  + lista conforme desconto, reabrir e ver tudo persistido,
  deletar para limpeza). Sidebar atualizado para V 1.34 + entry
  no CHANGELOG. Aguardando smoke real do Valentim para fechar
  formalmente.
- Lição: o padrão de Edge Function `-v2` que aceita payload com
  arrays de filhos no body precisa persistir esses filhos
  explicitamente — não confiar no nome do POST/PUT pra saber se
  o handler já cobre o caso. Auditar outras `-v2` (`clientes-v2`,
  `pedido-venda-v2` etc.) à medida que mexer nelas para não
  repetir.

🐛 INC-014 · 2026-05-13 · Envio de pedido ao Tiny falhava com
"Vendedor não Configurado" quando o `nome_fantasia` cadastrado
no ProSeller não batia exatamente com o nome do vendedor no Tiny.
- Reprodução: Valentim 11/05/2026 16:58–17:21 — pedidos do
  representante Almeida (Lojas Livia) só passaram depois que ele
  alinhou manualmente o `nome_fantasia` do `dados_vendedor` no
  ProSeller com o nome cadastrado em Tiny. Workaround frágil.
- Causa raiz: `tiny-enviar-pedido-venda-v1/index.ts` enviava
  `pedido.nome_vendedor` no payload (linha ~632) além de
  `id_vendedor`. O Tiny rejeita o pedido se o `nome_vendedor` não
  bater literalmente com o registro do `id_vendedor` lá. Como o
  `id_vendedor` (idtiny) já identifica o vendedor unicamente, o
  `nome_vendedor` era redundante e fonte de regressão.
- Resolução: 3 edits em `tiny-enviar-pedido-venda-v1` (commit
  `3d46ef9`, V 1.31) — remove campo do payload, remove campo da
  resposta `dryRun` e remove a validação pré-envio
  `Vendedor sem nome_fantasia` (a validação `Vendedor sem idtiny`
  segue ativa). Sem migration. Sem mudança no frontend.
- Status: código mergeado em `main`, deploy da Edge Function
  pendente (`npx supabase functions deploy tiny-enviar-pedido-venda-v1
  --project-ref xxoiqfraeolsqsmsheue`). Smoke real do Valentim
  pendente — re-enviar um pedido cujo vendedor tenha
  `nome_fantasia` divergente do Tiny e confirmar `status: 'ok'`.
- Lição: payload do Tiny deve enviar **só o estritamente necessário**
  para identificar entidades por ID. Campos redundantes (nome,
  descrição) viram fonte de drift quando o cadastro local e o ERP
  divergem.

🐛 INC-013 · 2026-05-07 · 30 clientes da carteira da Valéria Montoz
estavam apontando para um UUID de vendedor inexistente
(`c02341e2-7356-4ec1-86fe-119e16465101`) em
`cliente.vendedoresatribuidos`, fazendo a vendedora não enxergar nenhum
cliente atribuído na UI.
- Reprodução: Valentim reportou via WhatsApp 14:07 — "os clientes da
  Valéria Montoz não ficaram vinculados a ela; conseguimos processar
  de novo a planilha?". Planilha de referência:
  `docs/2026.05.01_PROSELLER_CLIENTES_VEND MONTOZ.xlsx` (32 códigos).
- Hipótese inicial (descartada após audit): "regressão do import
  V 1.27 — `findVendedor` não casou `MONTOZ REPRESENTAÇÃO COMERCIAL
  LTDA` com o nome cadastrado `Valeria Montoz`". Plausível pelo código,
  mas o backup CSV mostrou que **nenhum dos 30 clientes foi tocado em
  06-07/maio** (data do reclamado import). 22 deles têm `updated_at =
  2026-01-13 21:50:13.382` (timestamp idêntico → bulk em jan/2026), 8
  têm `updated_at = 2026-05-03 10:51:xx` (bulk em 03/maio). Ou seja, o
  import V 1.27 **nunca rodou** efetivamente nesses clientes — eles já
  existiam, e o `api.create` deve ter sido rejeitado silenciosamente
  por unique constraint em `codigo`/`cpf_cnpj`, virando warning no
  try/catch da linha do loop em `ImportCustomersData.tsx:572-574`.
- Causa raiz: estado herdado de bulk imports anteriores
  (jan/2026 e maio/2026) que gravaram o UUID fantasma
  `c02341e2-7356-4ec1-86fe-119e16465101` em `vendedoresatribuidos`.
  Esse UUID **não existe** em `public."user"` nem em `auth.users`
  (rastreio raso negativo via Supabase MCP, 2026-05-07). Origem da
  rotina que produziu o UUID: desconhecida — provavelmente script
  ad-hoc de migração inicial de carteira ou hard-delete de user antigo
  que deixou referências órfãs. Não há `criado_por` nem `atualizado_por`
  apontando para esse UUID em outras linhas → não é auth.uid() de
  ninguém ativo.
- Resolução: UPDATE direto via Supabase MCP em transação
  (`docs/plans/cursor-brief.md` Tarefa 5) — backup CSV em
  `docs/plans/backup_inc013_montoz_2026-05-07.csv`. Lista final do
  UPDATE: 30 clientes (excluído codigo 364 que já tinha Valéria, e
  excluído codigo 6938 SHIGE TERUYA que está com Sergio Glezer desde
  2026-05-05 — decisão pendente do Valentim sobre 6938).
  `vendedoresatribuidos = ARRAY['18f0a888-5613-448e-9359-6d8ec7e27228']`
  (Valéria), `atualizado_por = 'd08c824e-aeca-4018-8efa-e23fb1a5b5f1'`
  (Valentim, valentim@cantico.com.br), `updated_at = NOW()`. Smoke test
  pós-COMMIT: 30/30 OK, 364 intacto, 6938 intacto, nenhum cliente fora
  da lista alterado nos últimos 5 minutos. Bump V 1.30 no Sidebar
  com 1 bullet em "Novidades em V 1.30".
- Status: corrigido em prod via SQL direto. V 1.29 já estava em
  produção quando o INC-013 foi corrigido — por isso bumpou pra V 1.30
  em vez de empilhar como 3º bullet da 1.29 (cliente cobra ver versão
  mudar a cada entrega visível, CLAUDE.md). Pendente: deploy Netlify
  para a UI exibir V 1.30. Validação humana: Valentim abrir 2-3
  clientes na UI (5674 SIDNEI SEIKI, 4874 BELFACE, 2422 BELFACE SAO
  CAETANO) + responder sobre o 6938.
- Lição: o componente `ImportCustomersData` falha **silenciosamente**
  quando `api.create` retorna erro de unique constraint — o usuário vê
  "X importado com avisos" e não percebe que a linha não foi escrita.
  Próxima feature que tocar o componente deve: (a) detectar conflito
  por código/CNPJ ANTES do POST e oferecer modo "atualizar existente"
  (upsert), (b) tornar o aviso explícito ("cliente já existe — vendedor
  NÃO foi atualizado, edite manualmente"). Registrado no §4.

🐛 INC-011 · 2026-05-06 · Pedidos de clientes importados via
planilha (F-004) falhavam ao enviar ao Tiny ERP com toast
"Erro retornado pelo Tiny".
- Reprodução: Valentim reportou 3 pedidos RAIADROGASIL S/A
  (pedido_venda_ID 456/457/458, vendedor "Empresa - Venda Direta",
  OC 15419788/15421544/15424397) falhando no envio. Pedido 459
  (Sergio, ELIZA KAZUMI, cliente cadastrado pela UI nativa)
  passou no mesmo dia.
- Hipótese inicial (descartada): "duplicação reusing id_tiny".
  `SalesPage.handleDuplicarPedido` (L1130-1145) já strip-a `id`,
  `numero`, `integracaoERP`, `createdAt`, `updatedAt`,
  `createdBy`. Os 3 pedidos têm `id_tiny=NULL` e `ordem_cliente`
  único — não é o duplicate.
- Causa raiz: `tiny-enviar-pedido-venda-v1/index.ts:606-624`
  enviava `cep`, `cpf_cnpj` e `fone` literalmente (apenas
  `.trim()`). Clientes importados pela planilha do Sergio via
  F-004 (V 1.27) chegam ao banco com formatação preservada do
  Excel: CEP `07.250130` / `06.833073` / `14.097140`, CNPJ
  `61.585.865/0737-01`, fone `(11) 3296-2301`. Tiny ERP rejeita
  CEP com `.` retornando `status="Erro"` (toast vem de
  `index.ts:138`). Outros 3 clientes do mesmo lote (TENDA
  `18.076-005`, SAO RAFAEL `08.311-080`, NAVEGANTES `09.972-260`)
  sofrem do mesmo problema latente.
- Resolução: 3 substituições `.trim()` → `digitsOnly()` no
  payload Tiny (helper já existe em L20). Sanitização no boundary
  é idempotente — clientes com CEP limpo continuam funcionando.
  Bump V 1.29.
- Status: corrigido em prod, edge function v33 deployada via
  Supabase MCP (2026-05-06 18:36 BRT). Smoke OPTIONS = 200 OK.
  Pendente: deploy Netlify para a UI exibir V 1.29 + Valentim
  reenviar pelos botões dos pedidos 456/457/458.
- Lição: F-004 import deve normalizar CEP/CNPJ/fone na entrada
  também (defesa em 2 camadas — registrado no §4 débito técnico).

🐛 INC-012 · 2026-05-06 · Recriar usuário com mesmo e-mail após
exclusão estourava `duplicate key value violates unique constraint
user_pkey` (resolve BUG-006 e BUG-007 do backlog).
- Reprodução: Valentim excluiu Karen (vendas@median.com.br,
  user_id 32f2eceb-...) com sucesso (V 1.24/V 1.25 já corrigiram
  preflight CORS e ambiguidade em `delete_user_v2`). Ao tentar
  recriar com o mesmo e-mail, o backend devolvia
  `Database operation failed: duplicate key value violates unique
  constraint user_pkey`.
- Causa raiz (cadeia, confirmada via Supabase MCP):
  1. `delete_user_v2` faz só soft-delete em `public."user"`
     (`UPDATE ... SET ativo=false, deleted_at=NOW()`). Não toca
     em `auth.users` por design (preserva auditoria).
  2. Na recriação, `create-user-v2` (Edge Function) chama
     `supabaseAdmin.auth.admin.inviteUserByEmail(email)`. Como o
     `auth.user` antigo continua vivo, o Supabase devolve o
     **mesmo** `auth_user_id` antigo.
  3. `create_user_v2` (RPC, 7-args) recebe esse `auth_user_id` e
     fazia `INSERT INTO public."user"(user_id, ...)` — colidindo
     com a PK da row soft-deleted que ainda guarda aquele `user_id`.
- Resolução: migration **114** trocou o `INSERT` por
  `INSERT ... ON CONFLICT ON CONSTRAINT user_pkey DO UPDATE SET
   ativo=TRUE, deleted_at=NULL, deleted_by=NULL, ...`. Reativa a
  row soft-deleted preservando `user_id` (FKs históricas
  continuam apontando: `dados_vendedor.user_id`, audit logs etc.).
  Edge Function `create-user-v2` não muda — assinatura do RPC
  preservada. **Não bumpa versão** — V 1.29 já bumpada pela sessão
  do BUG-001 Tiny CEP; entrada no tooltip foi adicionada como 2º
  bullet da V 1.29.
- Detalhe técnico: precisei usar
  `ON CONFLICT ON CONSTRAINT user_pkey` (não `ON CONFLICT (user_id)`)
  porque a função declara `user_id uuid` no `RETURNS TABLE` — a
  referência bare colide com a variável OUT (mesmo padrão que
  V 1.25 corrigiu em `delete_user_v2`).
- Validação: dry-run via `BEGIN; SELECT create_user_v2(...,
  p_auth_user_id := '32f2eceb-...'); ROLLBACK;` retornou Karen
  com `ativo=true, deleted_at=null, deleted_by=null`. Estado em
  produção preservado pelo ROLLBACK — Karen segue soft-deleted
  até o Valentim recriar pela UI.
- Status: corrigido em prod, validação humana sugerida (Valentim
  recriar Karen pela UI de Configurações &gt; Usuários).

🐛 INC-009 · 2026-05-06 · Desconto Padrão do cliente não persistia
ao salvar via PUT.
- Reprodução: Valentim alterou desconto de 13% para 10% no cliente
  codigo 6985 (PERFUMARIA 8 DEZ) duas vezes; banco manteve 13%.
- Causa raiz: `clientes-v2` rota PUT (linhas 559-594) chamava
  `update_cliente_v2` sem enviar `p_desconto`. RPC tem o parâmetro
  com default NULL e usa `desconto = COALESCE(p_desconto, c.desconto)`
  — sem entrada, mantém valor antigo.
- Resolução: 1 linha em PUT — `p_desconto: body.descontoPadrao ?? body.desconto ?? null`. Bump V 1.28.
- Status: corrigido. clientes-v2 v45 deployado em prod (2026-05-06
  via Supabase MCP).

🐛 INC-010 · 2026-05-06 · Grupo/Rede do cliente não persistia ao
salvar via PUT em alguns casos.
- Reprodução: Valentim selecionou grupo TERUYA no cliente codigo
  6938 (SHIGE TERUYA) duas vezes; banco manteve `grupo_id=NULL` e
  `grupo_rede=NULL`.
- Causa raiz: `clientes-v2` PUT só enviava `p_grupo_id` (UUID). Se
  o lookup nome→UUID falhasse (collation, espaço, ambiguidade no
  `.single()`), o texto do grupo também ficava perdido — RPC mantém
  ambos os campos null.
- Resolução: PUT agora resolve **tanto** UUID quanto nome (via
  `maybeSingle`) e envia `p_grupo_id` + `p_grupo_rede` para o RPC,
  garantindo que mesmo se a resolução falhar parcial, ao menos
  o texto fica salvo. Bump V 1.28.
- Status: corrigido junto com INC-009 (mesmo deploy).

🐛 INC-008 · 2026-05-06 · Cadastro de cliente novo (vendedor logado
ou backoffice atribuindo vendedor) falhava com `invalid input syntax
for type uuid: '{"id":"…","nome":"…","email":"…"}'`.
- Reprodução: Sergio (vendedor) tenta cadastrar cliente novo com seu
  perfil auto-atribuído. Erro reportado pelo Valentim em 2026-05-06.
- Causa raiz: `supabase/functions/clientes-v2/index.ts:376` (POST)
  repassava `body.vendedoresAtribuidos` direto para a RPC
  `create_cliente_v2`, que espera `uuid[]`. O form de Condição
  Comercial (`CustomerFormCondicaoComercial.tsx:118`) seta esse
  campo como array de objetos `[{id,nome,email}]`. PUT já tinha a
  normalização correta (linhas 458-471), POST não.
- Resolução: extrair IDs do array de objetos antes do RPC, espelhando
  a lógica do PUT. Edit em ~15 linhas. Bump V 1.27.
- Status: corrigido em código (V 1.27). **Pendente: deploy
  `clientes-v2` em produção (`npx supabase functions deploy
  clientes-v2`) — fix só toma efeito após deploy.**
- Lição: divergência POST/PUT em handlers paralelos é fonte de bugs.
  Próxima feature que tocar `clientes-v2` deve unificar normalização
  de vendedoresAtribuidos em helper compartilhado (débito em §4).

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

🐛 INC-003 · 2026-04-29 · `clientes-v2` GET não incluía
`optante_simples_nacional` no `mapClienteCompleto`, fazendo a ficha
do cliente exibir "—" mesmo após o backend gravar o campo
corretamente.
- Reprodução: cliente reportou em call agora — após INC-002
  (PR #5) ter corrigido a gravação do campo, a UI continuava
  mostrando "—" para 2KJ Perfumaria (cliente_id 6658) cujo
  banco já tinha `optante_simples_nacional=true` desde 18:14:06
  UTC do mesmo dia.
- Diagnóstico (Supabase MCP):
  - Banco: ✅ campo populado.
  - RPC `get_cliente_completo_v2`: ✅ retorna o campo via
    `row_to_json(c)`.
  - Edge Function `clientes-v2` GET (versão 42, deploy
    2026-04-13): ❌ helper `mapClienteCompleto` chamava o RPC,
    recebia o campo, mas omitia ao serializar — frontend
    recebia `undefined` → ternário caía em "—".
  - Frontend (`api.ts` L624-630, `types/customer.ts` L162-163,
    `CustomerFormDadosCadastrais.tsx` L838): ✅ já lia
    camelCase com fallback snake_case.
- Resolução: 9 linhas em `mapClienteCompleto` (PR #7, merge
  `40da033`) + redeploy de `clientes-v2` via supabase CLI.
- Lição: quando F-001 introduziu colunas novas em `cliente`,
  a auditoria pré-deploy cobriu só os fluxos de escrita
  (`create-cliente-v2`, `tiny-enviar-pedido-venda-v1`) e
  ignorou o GET de `clientes-v2` que serializa a entidade
  pra ficha. Débito de processo registrado em §4.
- Status: corrigido em prod, validação humana sugerida.

🐛 INC-002 · 2026-04-24/29 · ReceitaWS client em F-001 fazia
early-return quando `RECEITAWS_TOKEN` ausente, causando fallback
para `tinyValor` padrão em todos os pedidos de clientes Simples
desde o flip da flag (24/abr).
- Reprodução: cliente reportou via WhatsApp pedido de empresa
  optante do Simples (2KJ Perfumaria, CNPJ 39.511.470/0001-55)
  chegando no Tiny com código não-Simples (781495108 em vez de
  781284632; 781496980 em vez de 657287750).
- Impacto: todos os clientes optantes do Simples desde
  2026-04-24 enviaram pedidos com natureza tributária errada.
  Precisa de retificação manual no Tiny pelo backoffice
  (escopo do Valentim, não do dev).
- Causa raiz: `supabase/functions/_shared/receitaws-client.ts`
  L96-115 fazia `if (!token) return failed/network_error` antes
  de chamar a rede. Por decisão de produto (ADR-002 + DP-005),
  o token nunca foi cadastrado — API Pública basta no MVP.
- Resolução: hotfix em `fix/f001-receitaws-sem-token` (PR #5,
  merge `87080e0`). Helper agora opera sem token (API Pública)
  por default; com token entra como Bearer (API Comercial).
  Deploy direto via supabase CLI das 2 funcs que importam o
  helper: `create-cliente-v2`, `tiny-enviar-pedido-venda-v1`.
- Lição: revisão de código pré-merge não pegou — guardião
  Harness vai exigir leitura do helper completo, não só busca
  por keywords (já tinha "sem token + fallback gracioso" como
  suposto comportamento, mas implementação fazia early-return).
- Status: corrigido em prod, smoke real do Valentim pendente.

🐛 BUG-001 · Pedidos chegam no Tiny com data do dia seguinte
(fuso horário). Reproduz em todos os envios.
- Área: `tiny-enviar-pedido-venda-v1` L563 (`new Date()
  .toISOString().slice(0,10)` em runtime UTC virava D+1 entre
  21h-23h59 BRT).
- Workaround atual: nenhum — ajuste manual no Tiny.
- Origem: reportado pelo Valentim na call de 2026-04-29.
- Status: **EM CORREÇÃO** — branch
  `fix/timezone-e-vendedor-backoffice`, commit `0b5a454`.
  Helper `_shared/date-br.ts` com `Intl.DateTimeFormat
  timeZone: America/Sao_Paulo`. 4 testes Deno cobrindo bordas.

🐛 BUG-002 · ProSeller não permite enviar pedido ao Tiny se
cliente estiver sem vendedor vinculado.
- Decisão necessária: aceitar fluxo backoffice sem vendedor?
- Área: validação no caminho de envio Tiny.
- Origem: reportado pelo Valentim na call de 2026-04-29.
- Status: **AGUARDANDO DECISÃO DE PRODUTO do Valentim** —
  manter regra atual (vendedor obrigatório) ou liberar envio
  sem vendedor para usuário backoffice? Sem decisão, não há
  implementação possível. Não entra na PR de BUG-001/003.

🐛 BUG-003 · ProSeller não permite alterar vendedor na edição
do pedido (mesmo para usuário backoffice).
- Comportamento esperado: vendedor comum = manter restrição;
  backoffice = deveria poder alterar.
- Área: UI (`SaleFormPage.tsx`). Backend (`pedido-venda-v2`
  PUT) já aceitava `vendedorId` — só faltou expor na UI.
- Origem: reportado pelo Valentim na call de 2026-04-29.
- Status: **EM CORREÇÃO** — mesma branch
  `fix/timezone-e-vendedor-backoffice`, commit `6313cc2`.
  Select shadcn condicional ao `usuario.tipo === 'backoffice'`,
  carrega `apiService.get('vendedores', { ativo: true })`
  apenas para backoffice. 5 testes Vitest smoke inline.

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
| — | docs(todo): registra INC-013 + lessons (V 1.31 carry-forward) | `71ee791` | 2026-05-13 |
| — | feat(clientes): busca acento-insensivel + CNPJ digits-only + grupo/rede (V 1.31) | `1c5bd48` | 2026-05-13 |
| — | fix(vendas): nao injetar 'OC: [Aguardando]' na NF quando OC esta vazio (V 1.31) | `0076386` | 2026-05-13 |
| — | fix(tiny): vendedor identificado por id, sem exigir nome batendo com Tiny (V 1.31) | `3d46ef9` | 2026-05-13 |
| — | feat(comissoes): saldo anterior + totalizadores + acentos + fechar periodo (V 1.22) | _pendente_ | 2026-05-05 |
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
