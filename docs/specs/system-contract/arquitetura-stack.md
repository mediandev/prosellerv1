# Contrato — Arquitetura & Stack

> Regras e invariantes verificadas no código. Não editar sem cotejar impacto.

---

## Invariants

### Roteamento manual via `useState<Page>` em App.tsx

O roteamento entre páginas é exclusivamente controlado por `useState<Page>` em `src/App.tsx`. Não há React Router. As transições de página chamam `setCurrentPage` com tipos discriminados (`Page` union type). `handlePageChange` valida permissões antes de mudar página.

- **Tipo:** invariant
- **Evidência:**
  - `src/App.tsx:79,302` — `type Page` union type; `useState<Page>("dashboard")` inicializa sempre com dashboard
  - `src/App.tsx:541-582` — `handlePageChange` valida permissões antes de mudar página via `setCurrentPage`
- **Regressão se:** Adicionar React Router, Next.js, roteamento por URL hash/path, ou navegação sem passar por `setCurrentPage`.

---

### Branch `main` é fonte de verdade única (git espelha produção)

O branch `main` é a fonte de verdade INTENCIONADA para frontend, Edge Functions e migrations, com suporte documental e procedural (ADR-005, runbooks, AGENTS.md §14–15). Deploy manual de backend (edge functions + migrations) é sempre a partir do `main`, APÓS commitar. Entretanto, o enforcement é apenas procedural, não técnico:

- (a) `master` NÃO foi arquivado — ainda existe em `origin/master` desatualizado;
- (b) CI valida apenas `main` (bloqueando merge), mas deploy manual (Edge Functions + Netlify) NÃO valida branch — aceitam qualquer ramo;
- (c) Commitar antes de deployar é procedimento exigido (o `supabase functions deploy` lê o working tree), mas sem check técnico pré-deploy;
- (d) Conversão repo↔prod é via git, sem barreira técnica caso o operador execute deploy de branch errado ou código não-commitado.

- **Tipo:** invariant
- **Evidência:**
  - `AGENTS.md:90-91` — main é fonte de verdade ÚNICA; master arquivada em 2026-06-02 (convergência)
  - `AGENTS.md:255` — Git ESPELHA produção; commitar ANTES de deployar; deploy manual sempre a partir do main
  - `docs/wiki/runbooks/deploy-edge-function.md:20-23` e `deploy-netlify.md:26-29` — scripts de deploy manual aceitam qualquer branch (`git pull` sem validação)
- **Regressão se:** Deployar edge function ou migration de branch não-main, deployar código não-commitado, ou usar master como branch de trabalho.

---

### `data_initialized` localStorage sempre `true` (DataInitializer desabilitado)

O `DataInitializer` component existe mas está desabilitado (comentado). `localStorage.setItem('data_initialized', 'true')` é feito no primeiro login. O sistema nunca apresenta tela de inicialização de dados. ENTRETANTO, há código morto: `handleDataInitComplete` chama `setShowDataInit(false)`, mas a variável de estado `showDataInit` não foi declarada e não existe mais no componente `AppContent`.

- **Tipo:** invariant
- **Evidência:**
  - `src/App.tsx:338,366-372` — `dataInitialized` sempre `true`; `useEffect` garante `localStorage.setItem('data_initialized', 'true')`
  - `src/App.tsx:1215-1218` — render do `DataInitializer` comentado (desabilitado)
  - `src/App.tsx:376` — `setShowDataInit(false)` chamado em `handleDataInitComplete()`, mas `showDataInit` nunca declarado (código morto)
- **Regressão se:** Renderizar `DataInitializer` em alguma rota, ou deixar `dataInitialized=false` bloquear acesso ao dashboard.

---

## Business Rules

### Stack: React 18 + Vite + TypeScript + Supabase + Netlify

O frontend é SPA React 18 + Vite compilada para `build`, servida via Netlify. Backend é Supabase (Postgres + Deno Edge Functions). A maioria dos fluxos de dados passa por Edge Functions, mas existem exceções:

1. Alguns campos de `dados_vendedor` (idtiny, Comissão) são lidos/escritos via PostgREST direto (`/rest/v1/`);
2. Fluxos de autenticação usam `/auth/v1/` direto;
3. Upload de arquivos usa Storage direto.

A nomenclatura de Edge Functions não é uniformemente `-v2`: mantém-se versões v1 por contrato (`tiny-enviar-pedido-venda-v1`) e novos módulos (logística, SSW) usam v1, além de funções sem versionamento. Não há frameworks MVC nem mudanças no build. A stack é efetivamente o contrato de deploy, mas com exceções pontuais documentadas e não-documentadas.

- **Tipo:** business-rule
- **Evidência:**
  - `vite.config.ts:1-10` — `defineConfig` com React plugin SWC, `outDir=build` para Netlify
  - `AGENTS.md:14` — Stack: React 18 + Vite + TypeScript (SPA) · Supabase (Postgres com RPCs + Edge Functions Deno) · Netlify
  - `docs/wiki/architecture.md:8-35` — diagrama de 3 camadas: navegador (React SPA), Edge Functions (Deno), Postgres
  - `src/services/api.ts:256-311` (contraexemplo) — `fetchDadosVendedorIdtiny()`, `updateDadosVendedorIdtiny()`, `updateDadosVendedorComissao()` fazem GET/PATCH via `/rest/v1/dados_vendedor` direto ao Postgres, contornando Edge Functions
- **Regressão se:** Trocar build tool (Webpack/Turbopack), mudar SSR/SSG, migrar backend para Node.js, deixar de usar Deno nas Edge Functions, ou self-host fora do Netlify.

---

### Permissões discriminam backoffice vs. vendedor + telas backoffice-only

Usuários têm tipo (`'backoffice' | 'vendedor'`) + array de permissões string (ex: `'clientes.visualizar'`). Menu filtra por `canAccessPage(page)`. Telas equipe/metas/configuracoes/logistica requerem permissão específica (`'equipe.visualizar'`, `'metas.visualizar'`, `'configuracoes.visualizar'`) OU ter `'config.geral'` nas permissões. O fallback legado funciona via `'config.geral'` no array de permissões (injetado por `getDefaultPermissoes` para `tipo=backoffice`), NÃO via verificação de tipo. Usuários `tipo=backoffice` COM PERMISSÕES EXPLÍCITAS que excluem `'config.geral'` ficariam bloqueados.

- **Tipo:** business-rule
- **Evidência:**
  - `src/App.tsx:88-102` — `menuItems` array com flag `backofficeOnly`; `canAccessPage` filtra por tipo + permissão
  - `src/App.tsx:511-539` — `canAccessPage`: perfil/dashboard sempre; equipe/metas/config requerem `config.geral` ou permissão específica
  - `src/services/api.ts:40-80` — `getDefaultPermissoes(tipo)`: backoffice tem defaults com `config.geral`; vendedor tem seller defaults
  - `src/App.tsx:529-531` (contraexemplo) — verifica `has("equipe.visualizar") || isLegacyAdmin`, onde `isLegacyAdmin` depende de `'config.geral'` no array, não do tipo do usuário
- **Regressão se:** Permitir vendedor acessar telas backoffice-only, remover permissão sem migração para usuários legacy, ou misturar autorização de forma inconsistente entre frontend e Edge Functions.

---

## Arch Decisions

### Edge Functions: padrão `-v2` aspiracional; deploy manual imposto

O padrão de nomenclatura `-v2` em Edge Functions é aspiracional (maioria seguindo `<recurso>-v2`, ~38 funções), mas NÃO imposto: ~14 funções sem versão no nome permanecem ativas (`Criar_Vendedor`, `ObterListas`, `ObterProdutos`, `TinyEmitirAPI`, `emitir-pedido-sem-vendedor`, `emitirpedido`, `enviar-email-comissao`, `enviar-email-comissoes`, `export-csv`, `fetch_clientesSP`, `get-price-list-detail`, `upsert_price_list`, `verificarquantosclientes`, `webhook-tiny-atualizacao`), nenhuma justificada como contrato externo ativo. Somente 1 v1 é genuinamente nomeado por contrato externo (`tiny-enviar-pedido-venda-v1` / Tiny ERP). A regra de nomenclatura vive em wiki (memória), sem ADR governando nem lint/CI validando. O deploy via Supabase CLI é SIM imposto (ADR-005), nunca via MCP Cursor.

- **Tipo:** arch-decision
- **Evidência:**
  - `docs/wiki/architecture.md:48-52` — funções em padrão `<recurso>-v2/index.ts`; deploy somente via Supabase CLI (ADR-005); Cursor MCP `deploy_edge_function` proibido
  - `AGENTS.md:72` — Deploy de Edge Function EXCLUSIVAMENTE via Supabase CLI local, nunca via MCP
  - `AGENTS.md:254` — Deploy de Edge Function só via Supabase CLI (ADR-005); MCP Cursor proibido
  - `supabase/functions/webhook-tiny-atualizacao/index.ts` (contraexemplo) — sem versão, mantida em 2026, sem contrato externo declarado
  - `supabase/functions/enviar-email-comissao/index.ts` (contraexemplo) — sem versão, ativa, consumida em `src/services/api.ts`
- **Regressão se:** Deployar via Cursor MCP, ou usar Node.js em lugar de Deno.

---

### Feature flags: dual-layer (frontend compile-time + Edge runtime)

Feature flags seguem padrão dual-layer:

- **(A) Frontend:** `VITE_FEATURE_LOG_CRM`, `VITE_FEATURE_SIMPLES_*` lidas em **compile-time** via `import.meta.env` (inlined pelo Vite) em `App.tsx`, `SalesPage.tsx`.
- **(B) Edge Functions:** `FEATURE_SIMPLES_NACIONAL_LOOKUP`, `FEATURE_LOG_CRM`, `FEATURE_LOG_CRM_AUTO_FRETE` lidas em **runtime** via `Deno.env.get()` a partir de Supabase secrets, permitindo toggle de 1 clique sem redeploy (ADR-001).

Ambas as camadas usam convenção SCREAMING_SNAKE_CASE. Flags nunca são expostas como toggles de UI — apenas renderização condicional de componentes.

- **Tipo:** arch-decision
- **Evidência:**
  - `src/App.tsx:81,98-100` — `const FEATURE_LOG_CRM_ENABLED = import.meta.env.VITE_FEATURE_LOG_CRM === 'true'`; condicional no menu
  - `docs/wiki/architecture.md:84-88` — `FEATURE_SIMPLES_NACIONAL_LOOKUP`, `FEATURE_LOG_CRM` env vars; convenção `FEATURE_<SCREAMING_SNAKE_CASE>` (ADR-001)
  - `AGENTS.md:250` — Feature flag para contrato público; mudança que altera payload Tiny/ProSeller passa por flag até rollout controlado
  - `docs/decisions/adr/ADR-001-feature-flag-via-env-var.md:23-29` — Edge Function flags definidas como env var lida em **runtime** (contraste com compile-time)
- **Regressão se:** Usar feature flags de UI (localStorage toggles), misturar env vars com runtime toggles no frontend, ou variar comportamento feature-flag-compatível sem compilação.

---

### Mapeamento Page → permissão via `PAGE_VIEW_PERMISSION`

A arquitetura implementa DOIS padrões distintos de autorização:

1. **Verificações EXPLÍCITAS** (`App.tsx:526-531`): `has(permission) || isLegacyAdmin` para `tiny-erp`, `clientes-pendentes`, `logistica`, `equipe`, `metas`, `configuracoes`.
2. **`PAGE_VIEW_PERMISSION`** (`App.tsx:533-536`): `has(permission)` APENAS, SEM fallback de `isLegacyAdmin`, para `vendas`, `clientes`, `produtos`, `comissoes`, `contacorrente`, `relatorios`.
3. **Páginas sem entrada em nenhum lugar** (`dashboard`, `perfil`, `changelog`): acesso sempre permitido (fallback permissivo `return true`).

- **Tipo:** arch-decision
- **Evidência:**
  - `src/App.tsx:104-111` — `PAGE_VIEW_PERMISSION` mapeamento: `vendas->vendas.visualizar`, `clientes->clientes.visualizar`, etc.
  - `src/App.tsx:533-536` — `const requiredPermission = PAGE_VIEW_PERMISSION[page]`; retorna `has(requiredPermission)` se existe, senão `return true` (permissivo)
  - `src/App.tsx:526-531` (contraste) — páginas explícitas usam `has(...) || isLegacyAdmin`; `PAGE_VIEW_PERMISSION` não inclui `isLegacyAdmin`
- **Regressão se:** Nova página sem entrada em `PAGE_VIEW_PERMISSION` + sem check explícito em `canAccessPage`, ou checar permissão de forma diferente em frontend vs. Edge Function RLS.

---

### UI Components via shadcn + Radix UI + Tailwind (CVA)

Componentes usam Radix UI (acessibilidade), shadcn (componentes pré-estilizados), Tailwind CSS (utility-first), CVA (variantes), tailwind-merge (utility `cn`). Path alias `@` aponta para `src/`. EXCEÇÕES:

1. `PedidoPrintView.css` contém estilos customizados para impressão;
2. `globals.css` define CSS variables e tipografia base;
3. Alguns componentes (`ABCCurveCard`, `CustomerWalletCard`, `SegmentSalesCard`, etc.) usam `style={{}}` inline para valores dinâmicos, violando utility-first;
4. Tailwind configurado via `@theme inline` em `globals.css`, sem `tailwind.config.js`.

- **Tipo:** arch-decision
- **Evidência:**
  - `docs/wiki/architecture.md:40` — Componentes em `src/components/` (Radix + shadcn + Tailwind, padrão CVA + tailwind-merge)
  - `vite.config.ts:52` — Path alias `@ -> src/`, `@shared -> packages/shared`
  - `src/components/PedidoPrintView.tsx:1` (contraexemplo) — importa `./PedidoPrintView.css` com classes customizadas `.pp-*`
  - `src/components/ABCCurveCard.tsx:172-173` (contraexemplo) — usa `style={{ cursor: 'pointer' }}`, `style={{ opacity }}`, `style={{ backgroundColor: COLORS[...] }}` em vez de classes Tailwind/CVA
- **Regressão se:** Usar Material-UI, Chakra UI, ou CSS-in-JS customizado em lugar de Tailwind + CVA.
