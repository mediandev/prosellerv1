# CURRENT_REALITY — ProSeller V1

> Síntese do **estado real** do repo em 2026-05-19, no momento do bootstrap Harness v3.2.
> Fonte para PRD retroativo (R-2) e SPEC retroativo (R-3). Não inventa nada — só consolida o que existe.

---

## 1. Inventário de código

| Pasta | Conteúdo | Volume |
|---|---|---|
| `src/` | React 18 SPA (Vite + TS). `App.tsx` ~45 KB com roteamento manual `useState<Page>`. Subpastas: `components/`, `contexts/`, `data/` (mocks), `hooks/`, `lib/`, `services/`, `types/` (legado), `utils/`. | ~1 app SPA |
| `packages/shared/types/` | Schemas Zod (fonte de verdade dos contratos). Arquivos: `api.ts`, `cliente.ts`, `natureza-operacao.ts`, `simples-nacional.ts`, `index.ts`. | 5 arquivos |
| `supabase/functions/` | Edge Functions Deno. Padrão `*-v2`. Helper `_shared/` (7 arquivos) + `_shared_helpers.ts` (duplicação histórica). | 41 funções |
| `supabase/migrations/` | DDL/migration SQL numeradas, com gaps históricos. Última: `118_list_clientes_v2_vendedor_ve_pendentes.sql`. | 78 migrations |
| `tests/` | `setup.ts` + `unit/` (3 testes smoke) + `edge/` (3 testes Deno + README) + `integration/` (vazia) + `e2e/` (vazia). | 6 arquivos de teste |
| `public/` | Assets estáticos do SPA. | (não inventariado em detalhe) |

---

## 2. Inventário de docs

| Pasta | Estado |
|---|---|
| `docs/product/` | **VAZIO** — PRD ainda não escrito (débito R-2). |
| `docs/specs/` | `SPEC.md` (v0.3, parcial — só F-001). Dois HTML auxiliares (`decisoes-pendentes-notion.html`, `teste-simples-nacional-valentim.html`) — devem sair para `archive/specs-auxiliares/`. |
| `docs/contracts/` | `CONTRACTS.md` (v0.3, parcial — só F-001). |
| `docs/decisions/adr/` | `ADR-template.md` + ADR-001..005. |
| `docs/plans/` | `cursor-brief.md` (atualizado, várias tarefas), `skills-manifest.md`, 2 backups (`backup_inc013_montoz_2026-05-07.csv`, `backup_list_clientes_v2_pre_115.sql`). A partir do bootstrap v3.2 também `CURRENT_REALITY.md` (este), `risk-classification.md`, `FEATURE-CONTRACT-template.md`, `VALIDATION-MATRIX-template.md`, `DECISIONS_LOG.md`, `feature-contracts/`. |
| `docs/wiki/` | **CRIADA NESTE BOOTSTRAP** — `index`, `log`, `overview`, `architecture`, 8 módulos, 6 runbooks, `features/` + `context/` vazios com `.gitkeep`. |
| `docs/` (raiz) | 4 planilhas `.xlsx` (imports de clientes) — devem ir para `archive/imports/`. |

---

## 3. Tabelas Postgres principais

Extraído por nome de migrations e Edge Functions (não inventário SQL completo — escopo para R-3):

- **Cliente:** `cliente`, `cliente_change_logs`, `grupo_cliente`, `rede_cliente`, `segmento_cliente`.
- **Vendas:** `pedido_venda`, `pedido_venda_produtos`, `natureza_operacao`, `tiny_empresa_natureza_operacao`.
- **Comissões:** `comissao_*`, `meta_vendedor`, `conta_corrente_vendedor`, `categoria_conta_corrente`.
- **Usuários:** `public."user"` (perfil app, soft-delete via `ativo`/`deleted_at`), `dados_vendedor` (FK → `public."user"`, com `idtiny`).
- **Cadastros:** `produto`, `marca`, `tipo_produto`, `unidade_medida`, `tipo_pessoa`, `tipo_veiculo`, `forma_pagamento`, `condicao_pagamento`, `empresa`, `lista_preco`, `ref_situacao`.
- **Operacional:** `notificacao`, `auth.users` (Supabase, intocado por soft-delete por design).

RLS ativa na maioria das tabelas de domínio. RPCs SECURITY DEFINER para escrita.

---

## 4. Edge Functions ativas em produção

41 funções em `supabase/functions/` (padrão `*-v2`):

`aprovar-cliente-v2`, `categorias-conta-corrente-v2`, `clientes-v2`, `comissoes-v2`, `condicoes-pagamento-v2`, `conta-corrente-v2`, `create-cliente-v2`, `create-user-v2`, `dashboard-v2`, `delete-cliente-v2`, `delete-user-v2`, `empresas-v2`, `enviar-email-comissoes`, `formas-pagamento-v2`, `get-cliente-v2`, `get-user-v2`, `get-vendedor-completo-v2`, `grupos-redes-v2`, `listas-preco-v2`, `list-clientes-v2`, `list-condicoes-pagamento-v2`, `list-users-v2`, `marcas-v2`, `metas-vendedor-v2`, `natureza-operacao-v2`, `notificacoes-v2`, `pedido-venda-v2`, `produtos-v2`, `ref-situacao-v2`, `rejeitar-cliente-v2`, `segmento-cliente-v2`, `tiny-empresa-natureza-operacao-v2`, `tiny-enviar-pedido-venda-v1` (mantida v1 por contrato com Tiny), `tipos-pessoa-v2`, `tipos-produto-v2`, `tipos-veiculo-v2`, `unidades-medida-v2`, `update-cliente-v2`, `update-user-v2`.

Helpers em `_shared/`: `auth.ts`, `date-br.ts`, `errors.ts`, `natureza-resolver.ts`, `receitaws-client.ts`, `types.ts`, `validation.ts`. Duplicação histórica: `_shared_helpers.ts` ao lado.

---

## 5. Tipos Zod já consolidados (`packages/shared/types/`)

- **`api.ts`** — envelopes `ApiSuccess`, `ApiPaginated`, `ApiErrorSchema`, `ErrorCodes`.
- **`cliente.ts`** — fragmento F-001: `ClienteSimplesNacional`, `ClienteSimplesNacionalUpdate`.
- **`natureza-operacao.ts`** — `TinyEmpresaNaturezaOperacao` (com dual-ID), `UpsertInput`, `NaturezaOperacaoResolucao` (log estruturado).
- **`simples-nacional.ts`** — `ReceitaWsResponseSchema`, `SimplesNacionalLookupResult`, `SimplesNacionalLookupLog`.
- **`index.ts`** — barrel re-export.

Import no frontend: `@shared/types` (alias). Import nas Edge Functions: path relativo (`../../../packages/shared/types/index.ts`).

---

## 6. Tipos legados ainda não migrados

`src/types/` contém tipos TypeScript puros (sem Zod) para todas as entidades em produção que **não passaram por F-001 ainda**: `customer.ts`, `sale.ts`, `commission.ts`, `user.ts`, `product.ts`, `company.ts`, etc. Migração feature a feature (onda R-4).

---

## 7. Dependências críticas externas

- **Tiny ERP** — API HTTP. Cobre envio de pedido (`pedido.incluir.php`), incluído por `tiny-enviar-pedido-venda-v1`.
- **ReceitaWS** — API HTTP. F-001. Endpoint público `https://www.receitaws.com.br/v1/cnpj/<digits>`. Sem token = API Pública (default); com token (`RECEITAWS_TOKEN`) = Bearer.
- **Supabase** — projeto ref `xxoiqfraeolsqsmsheue`. Postgres + Edge Functions Deno + Storage + Auth.
- **Netlify** — hosting do SPA. Build via `npm run build` (Vite). Sem MCP disponível (gap em `skills-manifest.md §5`).

---

## 8. Feature flags ativas

| Flag | Onde | Valor produção | Liga/desliga |
|---|---|---|---|
| `FEATURE_SIMPLES_NACIONAL_LOOKUP` | Supabase secret (Edge Functions env) | `true` | `runbooks/rollback-feature-flag.md` |

Convenção: `FEATURE_<SCREAMING_SNAKE_CASE>`. Padrão Edge Function: `(Deno.env.get("FEATURE_X") || "").toLowerCase() === "true"` (não usar `!!` — string `"false"` é truthy).

---

## 9. Restrições intocáveis

### 9.1. Tabelas / endpoints sem migration plan

- `cliente`, `pedido_venda`, `pedido_venda_produtos`, `tiny_empresa_natureza_operacao`, `comissao_*`, `dados_vendedor`, `public."user"` — só ALTER aditivo via nova migration. Drops e renames exigem ADR + brief com rollback.
- Migrations 031–040, 046–066, 079–080, 092–094, 096–097 (gaps históricos) — não preencher; seguir próximo número livre.
- `tiny-enviar-pedido-venda-v1` mantido como v1 (contrato Tiny).

### 9.2. Imports versionados (`@x.y.z`) — débito de bundler

Em `package.json` aparecem versões "soltas" (`*`) e versões pinadas com risco de quebra:
- `date-fns@3.6.0` (era 4.1.0 em fase anterior — atenção)
- `sonner@2.0.3`
- `next-themes@0.4.6`
- `clsx: "*"`, `hono: "*"`, `jspdf: "*"`, `jspdf-autotable: "*"`, `tailwind-merge: "*"`, `xlsx: "*"` — versões soltas, atualizações silenciosas podem quebrar build/UI.

Não atualizar sem migration planejada.

### 9.3. Segredos e configuração

- `.cursor/MCP.json` **gitignored** (case-insensitive a partir da V 1.x) — contém token Supabase.
- `RECEITAWS_TOKEN` — secret Supabase, opcional (sem token = API Pública).
- Credencial admin produção (`lucas.carmo@flowcode.cc`) — uso restrito a smoke pós-deploy.

### 9.4. Branches

- `main` é fonte de verdade.
- `master` está desatualizada — não usar, **mas não deletar sem confirmação humana** (CLAUDE.md).

---

## 10. Débitos técnicos catalogados (consolidado do TODO §4)

1. `docs/front/` (120+ arquivos pré-Harness) — onda R-1 (parte feita neste bootstrap).
2. Imports versionados (`date-fns`, `sonner`, `next-themes`, etc.).
3. `App.tsx` 45 KB + roteamento manual — refactor em onda dedicada (não oportunisticamente).
4. Mocks (`src/data/mock*.ts`) convivendo com serviços reais — deprecate por módulo.
5. Numeração de migrations com gaps — aceitar como histórico.
6. `_shared/` + `_shared_helpers.ts` duplicado em `supabase/functions/` — consolidar na próxima feature que tocar Edge Function.
7. `vite-env.d.ts` duplicado (raiz + `src/`).
8. Arquivos soltos na raiz (PNGs, `.json` corrompido) — **MOVIDOS PARA `archive/` neste bootstrap**.
9. Branches `main` e `master` convivendo — `master` obsoleta, deletar em commit próprio futuro.
10. ESLint não configurado — onda dedicada (~30 min estimados).
11. Suíte de testes esparsa (3 unit + 3 edge) — R-5.
12. Token MCP Supabase hardcoded em `.cursor/MCP.json` (gitignored, decisão consciente).
13. Histórico de commits com autor genérico `Seu Nome` em 4 commits antigos (`cf1ea26`, `6dba32b`, `6c29740`, `2f6bd76`) — rebase proibido em `main`.
14. Deploy Netlify sem MCP — manual (painel ou CLI).
15. Supertest não cabe em Edge Functions Deno — atualizar R-5 para `deno test` + `supabase functions serve`.
16. 11 vulnerabilidades `npm audit` (1 moderate, 8 high, 2 critical) — onda dedicada de segurança.
17. F-001 consulta ReceitaWS a cada envio (ADR-004) — monitorar quota; débito para reabrir se apertar.
18. Automatizar deploy Edge Function via GitHub Action ao mergear `main` (evita INC-001).
19. Quota ReceitaWS API Pública 3/min — migrar para plano Comercial se recorrente.
20. Auditoria de Edge Functions GET quando adicionar coluna nova — checklist obrigatório (lição INC-003).
21. `mapClienteCompleto` sem teste unit — extrair para `_shared/cliente-mapper.ts` na próxima feature que tocar `clientes-v2`.
22. F-004 import precisa normalizar CEP/CNPJ/fone na entrada (defesa em 2 camadas).
23. F-004 falha silenciosamente quando cliente já existe (unique constraint) — INC-013.
24. `findVendedor` no `ImportCustomersData` falha com razão social — aceitar email/user_id literal.
25. 30 clientes com UUID fantasma `c02341e2-...` corrigidos em INC-013 — pode haver outros, auditar sob demanda.

---

## 11. Histórico de incidentes recentes (consolidado do TODO §5)

| ID | Data | Resumo | Status |
|---|---|---|---|
| INC-001 | 2026-04-24 | Cursor MCP publicou stub `// test` em `create-cliente-v2`. | Resolvido → ADR-005. |
| INC-002 | 2026-04-24/29 | ReceitaWS client early-return sem token; clientes Simples receberam natureza errada por dias. | Hotfix `87080e0`. |
| INC-003 | 2026-04-29 | `mapClienteCompleto` omitia `optante_simples_nacional` no GET de `clientes-v2`. | PR #7 `40da033`. |
| INC-004/005/006/007 | abril 2026 | Retry rate limit, HTTP 200+texto, persistência audit, `id_natureza_operacao` no payload. | Todos mergeados. |
| INC-008 | 2026-05-06 | POST `clientes-v2` não normalizava `vendedoresAtribuidos` (UUID vs objeto). | V 1.27. |
| INC-009 | 2026-05-06 | PUT `clientes-v2` não enviava `p_desconto`. | V 1.28. |
| INC-010 | 2026-05-06 | PUT `clientes-v2` só mandava UUID do grupo, não texto. | V 1.28. |
| INC-011 | 2026-05-06 | Tiny rejeitava CEP/CNPJ/fone formatados (Excel). | V 1.29 `001df7f`. |
| INC-012 | 2026-05-06 | Recriar usuário soft-deleted estourava `user_pkey`. | V 1.29 migration 114 `cd959d8`. |
| INC-013 | 2026-05-07 | 30 clientes da Valéria com UUID fantasma. | UPDATE direto via MCP + V 1.30. |
| INC-014 | 2026-05-13 | `nome_vendedor` redundante no payload Tiny. | V 1.31 `3d46ef9`, deploy pendente + smoke do Valentim. |
| BUG-001 | 2026-04-29+ | Pedido chega no Tiny com data D+1 (TZ). | EM CORREÇÃO `fix/timezone-e-vendedor-backoffice`. |
| BUG-002 | 2026-04-29+ | Bloqueio de envio Tiny sem vendedor. | Decisão de produto pendente (Valentim). |
| BUG-003 | 2026-04-29+ | UI não permite alterar vendedor na edição (mesmo backoffice). | EM CORREÇÃO mesma branch de BUG-001. |

---

## 12. Onde está o gap do Harness

- **PRD ausente** em `docs/product/` — onda R-2.
- **SPEC parcial** (`docs/specs/SPEC.md`) — só F-001 hoje. Demais módulos serão speccados retroativamente em R-3.
- **CONTRACTS parcial** (`docs/contracts/CONTRACTS.md`) — só F-001.
- **Suíte de testes esparsa** — 3 unit + 3 edge. `integration/`, `e2e/` vazias. R-5.
- **ESLint não configurado** — `npm run lint` é no-op.
- **Typecheck herdado** — TS strict + `noUnusedLocals/Parameters` + imports versionados quebram. Por isso N1 entra com `continue-on-error` neste bootstrap.
- **`docs/front/` legacy** — 120+ arquivos pré-Harness ainda não inventariados (parte da R-1 fica para depois).
- **CI N2/N3** — `edge-tests` (Deno) já roda; e2e/smoke/migration validation ainda manuais.
- **Wiki bootstrap concluído** — este arquivo + `docs/wiki/` populado.

---

*Próxima revisão prevista: após R-2 (PRD retroativo) ou se aparecer divergência significativa entre wiki/AGENTS e a realidade.*
