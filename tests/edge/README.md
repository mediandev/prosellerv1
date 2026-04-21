# tests/edge — testes nativos Deno para Edge Functions

As Edge Functions do Supabase rodam em **runtime Deno**, não Node. Por isso o projeto usa **dois runners de teste**:

| Pasta | Runtime | Runner | Como rodar |
|---|---|---|---|
| `tests/unit/` · `tests/integration/` | Node + jsdom | Vitest | `npm test` |
| `tests/edge/` | Deno | `deno test` | `npm run test:edge` *(ou `deno test --allow-read tests/edge/`)* |

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
