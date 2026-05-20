# Módulo — Produtos e Cadastros Auxiliares

## Propósito

Cadastros de domínio que alimentam pedidos, clientes e configurações. Estáveis (mudam pouco) — entram aqui para que features novas saibam onde encontrá-los.

## Edge Functions

- **`produtos-v2/index.ts`** — CRUD de produtos. V 1.26 hidrata lista de preço em modo edit/visualizar (commit `e4d6fab`).
- **`marcas-v2/index.ts`** — CRUD de marcas.
- **`tipos-produto-v2/index.ts`** — CRUD de tipo de produto.
- **`unidades-medida-v2/index.ts`** — CRUD de unidade de medida.
- **`tipos-pessoa-v2/index.ts`** — tipo de pessoa (PF/PJ + categorias).
- **`tipos-veiculo-v2/index.ts`** — tipos de veículo (cadastro de domínio do cliente).
- **`formas-pagamento-v2/index.ts`** — CRUD de formas de pagamento.
- **`condicoes-pagamento-v2/index.ts`** + **`list-condicoes-pagamento-v2/index.ts`** — CRUD + listagem de condições de pagamento.
- **`empresas-v2/index.ts`** — CRUD de empresas/subsidiárias (alimenta também o mapeamento Tiny).
- **`listas-preco-v2/index.ts`** — CRUD de listas de preço.
- **`ref-situacao-v2/index.ts`** — referências de situação (cadastro de domínio).

## Tabelas Postgres principais

`produto`, `marca`, `tipo_produto`, `unidade_medida`, `tipo_pessoa`, `tipo_veiculo`, `forma_pagamento`, `condicao_pagamento`, `empresa`, `lista_preco`, `ref_situacao`.

## Componentes React principais

- Páginas de cadastro auxiliar acessíveis via "Configurações" ou menu lateral (estrutura herdada do `App.tsx` com `useState<Page>`).

## Débitos conhecidos do módulo

- **`condicoes-pagamento-v2`**: lista de preço não vinha hidratada em modo edit/visualizar até V 1.26 — fix em `e4d6fab` (#16). Auditar padrão em outros formulários de cadastro auxiliar.

## Incidentes históricos relevantes

- **V 1.26** — hidratação de lista de preço em modo edit/visualizar (`e4d6fab`).

## Referências

- TODO §6 (lista de releases pré e pós-Harness).
