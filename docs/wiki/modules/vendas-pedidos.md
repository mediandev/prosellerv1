# Módulo — Vendas / Pedidos

## Propósito

Criação, edição, listagem, clonagem e envio de pedidos de venda. É o ponto onde vendedor + cliente + condição comercial + itens + natureza Tiny se encontram para gerar a NF via Tiny ERP.

## Edge Functions

- **`pedido-venda-v2/index.ts`** — CRUD principal de pedidos. POST/PUT trabalham com cabeçalho + itens (`pedido_venda_produtos`). Aceita `vendedorId` no PUT (lição do BUG-003 — UI precisa expor).
- **`tiny-enviar-pedido-venda-v1/index.ts`** — envia pedido ao Tiny. **Mantém versão v1** (contrato com Tiny). Faz revalidação ReceitaWS (RF-003), resolve natureza, sanitiza CEP/CNPJ/fone (INC-011) e monta payload. Persiste auditoria (`pedido_venda` campos `id_tiny`, audit fields da migration 112).

## Tabelas Postgres principais

- `pedido_venda` — cabeçalho do pedido (cliente, empresa, vendedor, natureza, condição de pagamento, status, descontos, observações, OC, datas). Campos Tiny audit em migration 112.
- `pedido_venda_produtos` — itens.
- `vendedor` / `dados_vendedor` — informações do vendedor (idtiny obrigatório para envio).

## Componentes React principais

- **`SalesPage`** (área em `App.tsx`) — listagem com filtros, ações (clonar, enviar Tiny, imprimir).
- **`SaleFormPage.tsx`** — formulário de criação/edição do pedido. Select de vendedor condicional ao tipo de usuário (`backoffice` pode alterar — fix BUG-003 em branch `fix/timezone-e-vendedor-backoffice`).
- **`SalesPage.handleDuplicarPedido`** — clona pedido strip-ando `id`, `numero`, `integracaoERP`, `createdAt`, `updatedAt`, `createdBy` (precursor de F-003).
- **Impressão de pedido** — V 1.23 entregou layout próprio (`feat/print-pedido` PR #17).

## Features cobertas

- **F-001** (parcial neste módulo) — `tiny-enviar-pedido-venda-v1` revalida ReceitaWS e escolhe `tiny_valor` vs `tiny_valor_simples`.
- **F-003 · Clonar Pedido** (backlog) — decidida em call 2026-04-22, ainda não implementada. Já há precursor em `handleDuplicarPedido`.

## Débitos conhecidos do módulo

- **`tiny-enviar-pedido-venda-v1` não tem teste de integração completo** dos 4 sub-casos de CA-007 (Simples + dual, Simples sem dual, Não-Simples + dual, optante=null + dual) + sub-caso E (empresa sem dual-ID, DP-006).
- **Helper de date-br** (`_shared/date-br.ts`) introduzido no fix de BUG-001 — confirma TZ `America/Sao_Paulo`. Suíte de testes Deno cobre bordas, mas o `*.toISOString().slice(0,10)` antigo ainda pode estar replicado em outras Edge Functions; auditar quando aparecer regressão.

## Incidentes históricos relevantes

- **BUG-001** — Pedidos chegavam no Tiny com data D+1 (TZ UTC virava dia seguinte entre 21h e 23h59 BRT). Helper `_shared/date-br.ts` com `Intl.DateTimeFormat timeZone: America/Sao_Paulo`. **EM CORREÇÃO** na branch `fix/timezone-e-vendedor-backoffice` (commit `0b5a454`).
- **BUG-002** — Sistema bloqueia envio Tiny se cliente sem vendedor; decisão de produto pendente (Valentim).
- **BUG-003** — UI não permitia alterar vendedor na edição do pedido (mesmo backoffice). Backend já aceita; faltava expor. **EM CORREÇÃO** (commit `6313cc2`).
- **INC-006 + INC-007 + INC-005 + INC-004** (abril 2026) — persistência de auditoria, `id_natureza_operacao` no payload, tratamento de HTTP 200 + "Too many requests" como rate_limited, retry rate limit + reler cliente em fallback.
- **INC-011** (2026-05-06, V 1.29) — `tiny-enviar-pedido-venda-v1` mandava CEP/CNPJ/fone com formatação Excel (`07.250130`, `61.585.865/0737-01`). Fix: 3 `.trim()` → `digitsOnly()`. Lição: sanitizar no boundary é defesa última.
- **INC-014** (2026-05-13, V 1.31) — `nome_vendedor` redundante no payload Tiny causava rejeição quando divergente do cadastro Tiny. Fix: remover campo do payload. **Deploy pendente** + smoke do Valentim.
- **OC vazio** (V 1.31) — não injetar `OC: [Aguardando]` na observação NF quando OC vazio (commit `0076386`).

## Referências

- SPEC §4 CA-007 · ADR-002, ADR-003, ADR-004 · CONTRACTS §2 · TODO §1, §5.
