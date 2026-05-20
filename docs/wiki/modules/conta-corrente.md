# Módulo — Conta Corrente

## Propósito

Lançamentos financeiros do vendedor (adiantamentos, ajustes, descontos) que são abatidos do total de comissão no fechamento do período. Categoriza lançamentos para auditoria e relatório.

## Edge Functions

- **`conta-corrente-v2/index.ts`** — CRUD de lançamentos de conta corrente do vendedor.
- **`categorias-conta-corrente-v2/index.ts`** — CRUD das categorias (entrada, ajuste, desconto, etc.).

## Tabelas Postgres principais

- `conta_corrente_vendedor` (lançamentos).
- `categoria_conta_corrente` (cadastro de domínio).

## Componentes React principais

- Página/aba de conta corrente do vendedor dentro da área administrativa de vendedores ou em página dedicada (ver `App.tsx`).

## Débitos conhecidos do módulo

- Sem cobertura de teste. Como afeta o **resultado financeiro** consolidado com `comissoes-v2`, é candidato a alvo prioritário quando a onda R-5 abrir.
- Sem auditoria explícita de quem lançou o quê (depende dos `criado_por`/`atualizado_por` herdados pela trigger genérica).

## Referências

- TODO (sem incidentes registrados ainda neste módulo).
