# tests/edge — testes nativos Deno para Edge Functions

As Edge Functions do Supabase rodam em **runtime Deno**, não Node. Por isso o projeto usa **dois runners de teste**:

| Pasta | Runtime | Runner | Como rodar |
|---|---|---|---|
| `tests/unit/` · `tests/integration/` | Node + jsdom | Vitest | `npm test` |
| `tests/edge/` | Deno | `deno test` | `npm run test:edge` *(ou `deno test --no-check --allow-read tests/edge/`)* |

**Por quê dois runners?** Supertest (padrão Node para testes HTTP) não encaixa em Edge Functions porque o runtime é Deno. Usar `deno test` permite importar helpers de `supabase/functions/_shared/*.ts` como caixa-preta e exercitá-los no mesmo runtime que vai rodar em produção. Decisão documentada em `docs/plans/skills-manifest.md §5`.

**Vitest ignora esta pasta** — `vitest.config.ts` inclui `tests/edge/**` no campo `exclude`.

**Não adicionar `deno test` a `npm test`** — o npm script `test:edge` é separado. CI GitHub Actions tem dois jobs distintos (`test` usa Node/Vitest, `edge-tests` usa Deno).

## Pré-requisitos locais

- Deno 1.x instalado (`deno --version`). Instalação: https://deno.land/manual/getting_started/installation

## Escopo desta pasta

**Apenas smoke tests de infra e testes de helpers puros** em `supabase/functions/_shared/`. Testes de Edge Functions completas (com chamadas Supabase reais) ficam fora daqui — exigiriam `supabase functions serve` + DB de staging e esse padrão ainda não foi estabelecido (escopo de feature futura).

**Proibido nesta pasta:**
- Chamadas reais a ReceitaWS, Tiny ERP, Supabase, SMTP, etc.
- Testes que dependem de variável de ambiente de produção.

## Por que `--no-check`?

Deno faz typecheck mais estrito que o `tsconfig.json` do frontend (usado pelo Vite). O código legado em `supabase/functions/_shared/validation.ts:144` (`validateMinLength`) tem retornos do tipo `string | boolean` — padrão `value && ...` curto-circuita para a string vazia em vez de `false`. Como esse arquivo está **em produção** e reescrevê-lo fora do contexto de uma feature violaria as regras do projeto (CLAUDE.md: "nenhum refactor preventivo"), o runner de testes usa `--no-check` para pular a verificação de tipos. Assertions em runtime continuam normais — o que é o objetivo de um smoke test de infra.

A validação de types do código de produção fica registrada como débito técnico separado.
