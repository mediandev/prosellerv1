# CONTRACTS — ProSeller V1

> Espelho **legível** dos contratos. A **fonte de verdade são os schemas Zod** em `packages/shared/types/`.
> Este arquivo apenas referencia e descreve — nunca duplica a definição.
>
> Versão: 0.2 — Referência: SPEC v0.2 (F-001 apenas — DPs resolvidas 2026-04-22)

---

## Como este arquivo funciona

No Harness Solo, **contratos são código**. Toda mudança em contrato:

1. Acontece **primeiro** em `packages/shared/types/` (Zod + TypeScript).
2. Depois é refletida aqui em prosa curta.
3. Gera ADR se for *breaking*.

```
packages/shared/types/
├── api.ts                  ← envelopes: ApiSuccess, ApiPaginated, ApiErrorSchema, ErrorCodes
├── cliente.ts              ← fragmento F-001: ClienteSimplesNacional, ClienteSimplesNacionalUpdate
├── natureza-operacao.ts    ← TinyEmpresaNaturezaOperacao (com dual-ID), UpsertInput, NaturezaOperacaoResolucao (log)
├── simples-nacional.ts     ← ReceitaWsResponseSchema, SimplesNacionalLookupResult, SimplesNacionalLookupLog
└── index.ts                ← re-export
```

**Importação:**

- **Frontend** (`src/`): `import { X } from "@shared/types"` (alias configurado em `tsconfig.json` + `vite.config.ts`).
- **Edge Functions** (`supabase/functions/`): via path relativo → `import { X } from "../../../packages/shared/types/index.ts"`. A Edge Function ainda declara `"zod": "npm:zod@3.23.8"` no seu `deno.json` ou import map da função (introduzir junto com F-001 na primeira Edge Function que consumir os schemas).

**Regra absoluta:** se o código precisa de um tipo novo, **cria primeiro o schema Zod** em `packages/shared/types/`, depois implementa o endpoint/componente consumindo `z.infer<>`.

---

## Escopo desta versão

Apenas os contratos introduzidos por **F-001 · Consulta Simples Nacional**. Os demais endpoints existentes em produção (ex.: `clientes-v2`, `pedido-venda-v2`, `empresas-v2`) **não foram documentados aqui ainda** — isso é escopo da Onda R-4 do TODO (migrar `src/types/` → `packages/shared/types/` feature a feature).

---

## 1. Padrões de resposta da API (`api.ts`)

### Sucesso

```ts
ApiSuccess(<DataSchema>) → { success: true, data, meta? }
```

### Sucesso paginado

```ts
ApiPaginated(<ItemSchema>) → { success: true, data: T[], meta: PaginationMeta }
```

### Erro

```ts
ApiErrorSchema → { success: false, error: string, trace_id?, timestamp?, details? }
```

**Códigos de erro padronizados** (`ErrorCodes` enum): `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `RECEITAWS_TIMEOUT`, `RECEITAWS_RATE_LIMITED`, `RECEITAWS_INVALID_RESPONSE`, `NATUREZA_MAPEAMENTO_INCOMPLETO`, `INTERNAL_ERROR`.

> **Nota:** o formato atual das Edge Functions (`{ success, data, meta: { timestamp, userId, duration } }`) já se encaixa em `ApiSuccess`. Manter compatibilidade — o envelope Zod apenas formaliza o que já existe.

---

## 2. Endpoints afetados por F-001

### `POST /create-cliente-v2` — cobre RF-001, RF-002

- **Arquivo:** `supabase/functions/create-cliente-v2/index.ts`
- **Input:** body atual preservado (ver `CreateClienteBody` em `index.ts` da Edge Function). **Não aceita `optanteSimplesNacional` na entrada** — esse campo é derivado por consulta.
- **Saída `201`:** `ApiSuccess` com `{ cliente, message }`. O objeto `cliente` ganha os campos `optanteSimplesNacional` e `optanteSimplesNacionalConsultadoEm` do schema `ClienteSimplesNacional`.
- **Fluxo interno novo:**
  1. RPC `create_cliente_v2` (inalterado).
  2. Se `cpfCnpj` tem 14 dígitos E feature flag ativa → chama ReceitaWS (timeout 5s).
  3. Sucesso ReceitaWS → `UPDATE cliente SET optante_simples_nacional, optante_simples_nacional_consultado_em`.
  4. Falha ReceitaWS → continua retornando 201, campos ficam `null`, emite `SimplesNacionalLookupLog`.
- **Breaking?** Não. Campos novos são opcionais no response (aditivo).

### `PUT /update-cliente-v2/:cliente_id` — cobre RF-001

- **Arquivo:** `supabase/functions/update-cliente-v2/index.ts`
- **Input:** body preservado. **Não aceita os 2 campos novos** — ver Anti-SPEC §6 ("NÃO permitir edição manual").
- **Saída:** `ApiSuccess(Cliente)` com os 2 campos novos no objeto retornado.
- **Fluxo:** sem alteração — F-001 não revalida aqui, só em create e em envio Tiny.

### `GET /tiny-empresa-natureza-operacao-v2?empresa_id=<n>` — cobre RF-004

- **Arquivo:** `supabase/functions/tiny-empresa-natureza-operacao-v2/index.ts`
- **Saída:** `ApiSuccess(Array<TinyEmpresaNaturezaOperacao>)` — cada item ganha `tinyValorSimples: string | null`.
- **Breaking?** Não. Frontend existente que ignora campos extras continua funcionando.

### `POST /tiny-empresa-natureza-operacao-v2` — cobre RF-004, CA-006

- **Arquivo:** mesmo.
- **Input:** `TinyEmpresaNaturezaOperacaoUpsertInput` — aceita `tinyValorSimples?: string | null`.
- **Saída:** `ApiSuccess(TinyEmpresaNaturezaOperacao)` com campo dual.
- **Regra de negócio (RF-004, DP-003 resolvida em 2026-04-22):**
  - `tinyValor` vazio + `tinyValorSimples` ausente/null → soft-delete do mapeamento (comportamento atual).
  - `tinyValor` vazio + `tinyValorSimples` não-vazio → **erro 400** `NATUREZA_MAPEAMENTO_INCOMPLETO` (defesa em profundidade — a UI já bloqueia esse estado via toggle).
  - `tinyValor` presente + `tinyValorSimples` ausente/null → upsert com coluna nova = `null` (comportamento pré-F-001 — toggle off).
  - `tinyValor` presente + `tinyValorSimples` não-vazio → upsert com dual (toggle on).

### `POST /tiny-enviar-pedido-venda-v1` — cobre RF-003, RF-005, CA-007

- **Arquivo:** `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts`
- **Input:** inalterado.
- **Saída:** inalterada.
- **Fluxo interno novo:**
  1. Carrega pedido + empresa + cliente (como hoje).
  2. Se cliente PJ E feature flag ativa → chama ReceitaWS **a cada envio** (sem checar janela de tempo — RF-003 / ADR-004); atualiza `optante_simples_nacional` + `..._consultado_em` se OK; se falhar, usa valor persistido com fallback.
  3. Busca mapeamento incluindo `tinyValorSimples` (coluna nova).
  4. Resolve `tinyValorEscolhido` conforme RF-005 → emite `NaturezaOperacaoResolucao` em log estruturado.
  5. Monta payload Tiny usando o valor escolhido.
- **Breaking?** Não. Request/response externos inalterados.

---

## 3. Entidades de banco afetadas

> DDL exato em `supabase/migrations/108_*.sql` (a criar). Aqui só a visão lógica.

### Tabela `cliente` (colunas novas)

| Coluna | Tipo SQL | Nullable | Obs |
|---|---|---|---|
| `optante_simples_nacional` | `boolean` | Sim | Default `null` para linhas existentes |
| `optante_simples_nacional_consultado_em` | `timestamptz` | Sim | Default `null` |

Índices: **nenhum novo**. Uso é sempre via `cliente_id` (PK) que já é indexado.

### Tabela `tiny_empresa_natureza_operacao` (coluna nova)

| Coluna | Tipo SQL | Nullable | Obs |
|---|---|---|---|
| `tiny_valor_simples` | `text` | Sim | Null = comportamento pré-F-001 |

Unique index existente `uq_tiny_empresa_natureza_operacao_empresa_natureza` **não muda** — a modelagem dual-ID não adiciona linhas, só coluna.

### Fonte externa: ReceitaWS

- Endpoint: `GET https://www.receitaws.com.br/v1/cnpj/<14 dígitos>`
- Schema de resposta: `ReceitaWsResponseSchema` (`passthrough` — só validamos o que usamos).
- **Não persistimos a resposta bruta** — ver Anti-SPEC §6.

---

## 4. Eventos estruturados (logs)

F-001 introduz dois eventos emitidos via `console.log({ ... })` — formato machine-friendly, sem tabela dedicada.

### `receitaws.lookup` — schema `SimplesNacionalLookupLog`

Emitido a cada chamada à ReceitaWS. Campos: `traceId`, `cnpjMasked`, `httpStatus`, `simplesOptante`, `durationMs`, `outcome`.

### `natureza.resolvida` — schema `NaturezaOperacaoResolucao`

Emitido a cada decisão de `tiny_valor` no envio Tiny. Campos: `traceId`, `empresaId`, `naturezaOperacaoId`, `optanteAplicado`, `tinyValorEscolhido`, `fallbackUsed`.

---

## 5. Regras de evolução

**Mudança aditiva (OK, sem breaking):**
- Novo campo **opcional** em response.
- Novo endpoint.
- Novo valor em `ErrorCodes` (clientes devem tolerar desconhecido).

**Mudança breaking (exige ADR + plano de rollout):**
- Remover endpoint.
- Remover/renomear campo.
- Tornar `optanteSimplesNacional` **não-nullable** (clientes PF quebrariam).
- Mudar semântica de `tinyValorSimples` (ex.: reusar para outra regra).

**Processo:**
1. Atualiza schema em `packages/shared/types/`.
2. Atualiza `CONTRACTS.md`.
3. Se breaking: ADR + feature flag para rollout.

---

## 6. Aprovação

- [ ] Todos os endpoints de F-001 têm schema Zod correspondente
- [ ] `CONTRACTS.md` reflete fielmente os schemas em `packages/shared/types/`
- [ ] Padrões de response consistentes com Edge Functions existentes
- [ ] Regras de evolução documentadas
- [ ] Rastreabilidade com RFs da SPEC (coluna "cobre" nos endpoints)
- [ ] Contratos revisados e aprovados

---

*Próximo passo: popular ADRs (ADR-001 a ADR-003) e atualizar TODO.md com referências a RF/CA.*
