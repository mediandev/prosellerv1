# TODO — ProSeller V1

> Estado vivo do projeto. Único arquivo de controle, junto com `git log`.
> Atualizar ao final de cada sessão.

**Última atualização:** 2026-05-06 (sessão — INC-008 + F-004 + INC-009 + INC-010 + INC-011 + INC-012)

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
- [ ] **Validação end-to-end pelo Valentim** — enviado HTML `docs/specs/teste-simples-nacional-valentim.html` com 2 testes (cliente Simples e não-Simples). **INC-002 corrigido em prod hoje (2026-04-29, merge `87080e0`, deploy CLI das 2 funcs)** — pedir Valentim refazer Teste A (esperado 781284632/657287750 + log `receitaws.lookup outcome=ok simplesOptante=true`). **INC-003 corrigido em prod hoje (merge `40da033`, deploy CLI de `clientes-v2`)** — ficha do cliente passa a exibir "Sim" no campo Optante Simples Nacional (antes mostrava "—" porque o mapper omitia o campo).

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
- **Auditoria de READ Edge Functions ao adicionar coluna nova:** quando uma feature adiciona campo novo ao schema, criar checklist obrigatório de Edge Functions de leitura a auditar. **INC-003 surgiu porque a auditoria pré-deploy de F-001 cobriu apenas os fluxos de escrita (`create-cliente-v2`, `tiny-empresa-natureza-operacao-v2`, `tiny-enviar-pedido-venda-v1`) e ignorou o GET de `clientes-v2` que serializa a entidade pra ficha.** Próxima feature que adicionar coluna em `cliente`/`empresa`/`pedido_venda` deve listar todas as Edge Functions GET dessa entidade no PR antes de mergear.
- **`mapClienteCompleto` não tem teste unit:** vive dentro de `supabase/functions/clientes-v2/index.ts` que é uma `serve()` entry point e não exporta. Extrair pra `_shared/cliente-mapper.ts` na próxima feature que tocar `clientes-v2` (não fazer oportunisticamente). Débito identificado no fix do INC-003.
- **F-004 import precisa normalizar CEP/CNPJ/fone na ENTRADA também (defesa em 2 camadas).** INC-011 mostrou que clientes importados pela planilha do Sergio via `ImportCustomersData.tsx` chegam ao banco com formatação Excel preservada (`07.250130`, `61.585.865/0737-01`, `(11) 3296-2301`). O fix do INC-011 sanitiza no boundary do Tiny (`tiny-enviar-pedido-venda-v1`), mas qualquer outro consumidor que dependa do formato canônico (ex.: integrações futuras, busca por CEP, validação no frontend) vai sofrer. Próxima onda do import deve aplicar `.replace(/\D/g, '')` em CEP/CNPJ/fone antes do `api.create('clientes', ...)`. Backfill dos clientes já importados é opcional (não bloqueia uso). Não fazer oportunisticamente — abrir feature dedicada quando F-004 voltar a ser tocada.

---

## 5. Bugs / incidentes

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
