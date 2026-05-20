# Arquitetura — ProSeller V1

> Arquitetura técnica viva. Resume o que **existe** no código, não o ideal.
> Última atualização: 2026-05-19.

---

## Diagrama (3 camadas + integrações)

```
┌──────────────────────────────────────────────────────────────────────┐
│                       NAVEGADOR (Netlify)                            │
│  React 18 SPA — src/App.tsx (45 KB) com useState<Page>               │
│  src/components/  src/contexts/  src/hooks/  src/lib/                │
│  src/services/  packages/shared/types/ (Zod)                         │
└──────────────────────────────────────────────────────────────────────┘
              │  HTTP  (Supabase JS client + apiService)
              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                  EDGE FUNCTIONS (Supabase Deno)                      │
│   *-v2 (41 funções):  clientes-v2 · pedido-venda-v2 ·                │
│   tiny-empresa-natureza-operacao-v2 · tiny-enviar-pedido-venda-v1 ·  │
│   comissoes-v2 · conta-corrente-v2 · create-user-v2 · …              │
│   _shared/  +  _shared_helpers.ts  (duplicação histórica — débito)   │
└──────────────────────────────────────────────────────────────────────┘
       │  RPC + SQL                              │  HTTP
       ▼                                         ▼
┌──────────────────────────┐         ┌────────────────────────────────┐
│  POSTGRES (Supabase)     │         │  Externos                      │
│  78 migrations           │         │   - Tiny ERP (tiny-*)          │
│  RLS ativo na maioria    │         │   - ReceitaWS  (F-001)         │
│  RPCs (create_/update_/  │         │                                │
│   delete_cliente_v2 etc) │         │                                │
└──────────────────────────┘         └────────────────────────────────┘
```

## Frontend

- **Roteamento manual** via `const [currentPage, setCurrentPage] = useState<Page>('dashboard')` em `src/App.tsx` (~45 KB). Páginas principais: clientes, vendas/pedidos, comissões, conta-corrente, dashboard, configurações, importação, changelog. Não há React Router (decisão herdada — débito conhecido, ver TODO §4).
- **Componentes** em `src/components/` (Radix + shadcn + Tailwind, padrão CVA + tailwind-merge).
- **Serviços HTTP** em `src/services/` (chamam Edge Functions via `supabase.functions.invoke` / wrapper `apiService`).
- **Tipos:**
  - **Legado:** `src/types/` (TypeScript puro, sem Zod). Em migração feature a feature.
  - **Novo padrão:** `packages/shared/types/` (Zod) — `api.ts`, `cliente.ts`, `natureza-operacao.ts`, `simples-nacional.ts`, `index.ts`. F-001 inteira já vive aqui.
- **Versão visível ao usuário** em `src/App.tsx` `SidebarUserInfo` (~linha 142), constante `systemVersion`. Tooltip ✨ lista changelog. Página dedicada de novidades existe (`ChangelogPage.tsx`, V 1.23+).

## Edge Functions

- Padrão `<recurso>-v2/index.ts` em Deno (`supabase/functions/`). Exceções nomeadas: `tiny-enviar-pedido-venda-v1` (mantida como v1 por contrato com Tiny), `enviar-email-comissoes`.
- Helpers em `supabase/functions/_shared/`: `auth.ts`, `date-br.ts`, `errors.ts`, `natureza-resolver.ts`, `receitaws-client.ts`, `types.ts`, `validation.ts`. **Duplicação:** existe um `_shared_helpers.ts` solto ao lado de `_shared/` — débito histórico, consolidar na próxima feature que tocar Edge Function (TODO §4).
- Toda função expõe `OPTIONS` para preflight CORS (lição do INC-012 / V 1.24).
- Deploy **somente via Supabase CLI** local: `npx supabase functions deploy <nome> --project-ref xxoiqfraeolsqsmsheue` (ADR-005). Cursor MCP `deploy_edge_function` proibido.

## Banco

- **Postgres no Supabase**, projeto ref `xxoiqfraeolsqsmsheue`.
- **78 migrations** em `supabase/migrations/` numeradas. **Gaps históricos** (031–040, 046–066, 079–080, 092–094, 096–097, etc.) — não preencher; seguir próximo número livre. Última: `118_list_clientes_v2_vendedor_ve_pendentes.sql`.
- **RLS ativo na maioria das tabelas.** Tabelas principais: `cliente`, `pedido_venda`, `pedido_venda_produtos`, `vendedor`/`dados_vendedor`, `comissao_*`, `tiny_empresa_natureza_operacao`, `empresa`, `user` (`public."user"`, soft-delete via `ativo` + `deleted_at`).
- **RPCs SECURITY DEFINER** para escrita (`create_cliente_v2`, `update_cliente_v2`, `delete_cliente_v2`, `create_user_v2`, `delete_user_v2`, `get_cliente_completo_v2`, etc.) — chamadas pelas Edge Functions.

## Integrações externas

- **Tiny ERP** — todas as Edge Functions `tiny-*`. Payload HTTP montado no `tiny-enviar-pedido-venda-v1/index.ts`. Identificação de entidades por `id_tiny` (não por nome — INC-014).
- **ReceitaWS** — `supabase/functions/_shared/receitaws-client.ts`. Consumido por `create-cliente-v2` e `tiny-enviar-pedido-venda-v1` quando `FEATURE_SIMPLES_NACIONAL_LOOKUP=true`. Sem token (API Pública) por default — plano pago entra como Bearer (ADR-002).

## Contratos

- **Fonte de verdade:** `packages/shared/types/*.ts` (Zod). Importação no frontend via `@shared/*` (path alias em `tsconfig.json` + `vite.config.ts`). Importação nas Edge Functions via path relativo: `import { X } from "../../../packages/shared/types/index.ts"`.
- **Espelho legível:** `docs/contracts/CONTRACTS.md` — parcial, só F-001 hoje.
- **Regra absoluta:** schema Zod **primeiro**, código depois.

## Anti-SPEC viva

Ver `docs/specs/SPEC.md §6`. Itens vivos hoje:
- NÃO persistir resposta bruta da ReceitaWS (PII de sócios).
- NÃO logar CNPJ completo em texto claro (mascarar).
- NÃO permitir edição manual de `optante_simples_nacional` pela UI (sempre derivado).
- NÃO aplicar dual-ID a outros campos do payload Tiny (só `natureza_operacao`).
- NÃO chamar ReceitaWS para CPF (PF).
- NÃO mexer em linhas existentes de `tiny_empresa_natureza_operacao` na migration.
- NÃO bloquear criação de cliente ou envio Tiny por falha da ReceitaWS.

## Feature flags ativas

- **`FEATURE_SIMPLES_NACIONAL_LOOKUP`** — env var no Supabase (secret das Edge Functions). Liga/desliga F-001. Hoje: `true` em produção. Off por default. Convenção de nomenclatura: `FEATURE_<SCREAMING_SNAKE_CASE>` (ADR-001).

## Decisões arquiteturais (ADRs)

- **ADR-001** — Feature flag via env var lida em runtime (MVP, padrão para features futuras).
- **ADR-002** — ReceitaWS como fornecedor da consulta Simples Nacional.
- **ADR-003** — Dual-ID em `tiny_empresa_natureza_operacao` via coluna nullable (não tabela paralela).
- **ADR-004** — Revalidação do optante Simples Nacional **a cada envio** de pedido Tiny (sem janela).
- **ADR-005** — Deploy de Edge Functions **exclusivamente via Supabase CLI** (após INC-001).

---

*Próxima revisão prevista: após onda R-3 (SPEC retroativo dos módulos legados).*
