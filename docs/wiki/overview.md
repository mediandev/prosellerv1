# Overview — ProSeller V1

> Projeto em 1 página. Síntese honesta do estado real, não do desejo.
> Última atualização: 2026-05-19.

---

## O que é

**ProSeller V1** é um sistema de gestão comercial em produção (`proseller.app.br`) que integra com **Tiny ERP**. Adiciona, sobre o ERP, uma camada de **vendedor / comissão / aprovação** com fluxo de cadastro de clientes, abertura de pedidos, envio ao Tiny, e cálculo de comissão de vendedor — orquestrada por uma SPA React 18 + Vite e por Edge Functions Supabase em Deno.

## Para quem

Empresas (cliente final: backoffice da Cantico/Median) que usam Tiny ERP no Brasil e precisam de fluxo comercial controlado fora do ERP — vendedor externo cadastra cliente, monta pedido, dispara aprovação, envio ao Tiny gera a NF, e o sistema acompanha a comissão por vendedor com fechamento mensal.

## Caminho crítico em produção

1. **Cadastro de cliente** (`clientes-v2` POST/PUT + `create-cliente-v2`) — com F-001 consultando ReceitaWS para o flag de Simples Nacional quando habilitado.
2. **Mapeamento de natureza Tiny** por empresa (`tiny-empresa-natureza-operacao-v2`) — pode ter ID dual (padrão + Simples).
3. **Criação de pedido** (`pedido-venda-v2`) — itens, condição de pagamento, vendedor atribuído.
4. **Envio ao Tiny** (`tiny-enviar-pedido-venda-v1`) — revalida Simples Nacional, escolhe natureza, monta payload com `id_vendedor` (não `nome_vendedor` — INC-014).
5. **Comissão** calculada a partir do pedido enviado, com fechamento mensal e e-mail de relatório.

## Stack resumida

React 18 + Vite + TypeScript SPA (roteamento manual via `useState<Page>`) · `@radix-ui/*` + shadcn · React Hook Form + Zod (em adoção gradual) · Sonner para toasts · `xlsx` para imports · Supabase Postgres + RLS + RPCs + Edge Functions Deno (padrão `*-v2`) · Netlify para hosting do SPA · Tiny ERP API HTTP · ReceitaWS para Simples Nacional (F-001).

## Status atual

- **Versão em produção:** V 1.33 (ver `src/App.tsx` componente `SidebarUserInfo`, ~linha 142).
- **Última feature significativa:** **F-001 · Consulta Simples Nacional** — ativa em produção desde 2026-04-24, com flag `FEATURE_SIMPLES_NACIONAL_LOOKUP=true`. Único bloqueador remanescente: validação end-to-end do Valentim com o HTML de roteiro (`docs/specs/teste-simples-nacional-valentim.html`).
- **Última entrega visível:** V 1.33 — fix do PDF de comissões (caracteres especiais Latin-1) e V 1.32 — inclusão rápida de grupo/rede + vendedor vê pendentes.

## Próximas frentes conhecidas

- **F-003 · Clonar Pedido** — backlog, decisão tomada em call 2026-04-22, sem implementação iniciada.
- **Ondas de reorganização (R-1..R-5):**
  - R-1 — Inventário e reorganização de `docs/` (parte feita nesta sessão Harness v3.2 — raiz limpa, wiki bootstrap).
  - R-2 — PRD retroativo (`/consultor-prd`).
  - R-3 — SPEC retroativo dos módulos legados (`/SDD-avancado`).
  - R-4 — Migrar `src/types/` para Zod em `packages/shared/types/`.
  - R-5 — Introduzir suíte de testes (Vitest + deno test; ESLint).
- **Bugs/incidentes pendentes em validação humana:** INC-014 (deploy de `tiny-enviar-pedido-venda-v1` + smoke do Valentim), INC-012 (Karen — Valentim recriar pela UI), BUG-001/003 (em correção na branch `fix/timezone-e-vendedor-backoffice`).
- **Decisão de produto aberta:** BUG-002 — vendedor obrigatório no envio Tiny? Aguarda Valentim.

## PRD

**Não existe ainda** em `docs/product/PRD.md`. Onda R-2 vai retroativamente gerar via `/consultor-prd`. Esta wiki sintetiza o que dá para extrair do SPEC parcial + TODO + ADRs + código real — não substitui o PRD.

## Restrições de produção

- Nenhum refactor preventivo.
- Nenhuma migration preventiva — só com brief explícito de rollback (`docs/plans/cursor-brief.md`).
- Paridade de testes antes de refatorar rota crítica.
- Feature flag para qualquer mudança em contrato público (payload Tiny / ProSeller).
- Deploy de Edge Function **apenas via Supabase CLI** (ADR-005) — Cursor MCP proibido para `deploy_edge_function`.
- Imports versionados em `package.json` são débito, não tocar oportunisticamente.
- `master` é obsoleta — fonte de verdade é `main`.

---

*Próxima revisão prevista: após onda R-2 (PRD retroativo).*
