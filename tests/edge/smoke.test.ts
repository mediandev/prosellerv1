// Rodar com: `deno test --no-check --allow-read tests/edge/`
// Não rodar via Vitest — é Deno puro. Vitest config exclui tests/edge/**.
//
// Por que `--no-check`? Deno faz typecheck mais estrito que o tsconfig do
// frontend. Código legado em supabase/functions/_shared/ tem retornos
// tipo `string | boolean` (curto-circuito de `value && ...`) que falham
// o typecheck Deno. Como este smoke test é de infra — só valida que o
// runner sobe e importa helpers existentes como caixa-preta — desabilitar
// typecheck é aceitável. A validação de types do código de produção é
// débito técnico separado (ver TODO.md §4).
//
// Smoke test de infra de F-002. Importa helpers puros de
// supabase/functions/_shared/validation.ts para validar que:
//   (a) o runner deno test sobe;
//   (b) o caminho relativo para o código de Edge Function funciona;
//   (c) funções puras são chamáveis isoladamente como caixa-preta.

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  validateEmail,
  validateUUID,
  validateNotEmpty,
} from "../../supabase/functions/_shared/validation.ts";

Deno.test("validateEmail accepts canonical address", () => {
  assertEquals(validateEmail("user@example.com"), true);
});

Deno.test("validateEmail rejects missing @", () => {
  assertEquals(validateEmail("user.example.com"), false);
});

Deno.test("validateUUID accepts v4-shaped string", () => {
  assertEquals(validateUUID("550e8400-e29b-41d4-a716-446655440000"), true);
});

Deno.test("validateUUID rejects malformed", () => {
  assertEquals(validateUUID("not-a-uuid"), false);
});

Deno.test("validateNotEmpty rejects empty and whitespace-only", () => {
  assertEquals(validateNotEmpty(""), false);
  assertEquals(validateNotEmpty("   "), false);
  assertEquals(validateNotEmpty(null), false);
  assertEquals(validateNotEmpty(undefined), false);
});
