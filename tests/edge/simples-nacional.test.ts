// Rodar com: `deno test --no-check --allow-read tests/edge/simples-nacional.test.ts`
// Vitest config exclui tests/edge/** — este arquivo é Deno puro.
//
// Smoke de unit para a função pura `resolveNaturezaTiny` (F-001). Cobre os
// 4 cenários do CA-007 (A: Simples+dual, B: Simples sem dual, C: Não-simples
// com dual, D: optante=null com dual) e os logs de fallback esperados.
//
// Helper criado no commit B.2 em supabase/functions/_shared/natureza-resolver.ts.
// Enquanto B.2 não mergear, este teste falha ao importar — é o estado TDD
// "test primeiro, implementação depois" (AGENTS.md §2.1).

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { resolveNaturezaTiny } from "../../supabase/functions/_shared/natureza-resolver.ts";

// Cenário A (CA-007): optante=true + dual configurado → tinyValorSimples
Deno.test("resolveNaturezaTiny: optante=true com dual escolhe tinyValorSimples", () => {
  const result = resolveNaturezaTiny({
    mapeamento: { tinyValor: "1001", tinyValorSimples: "2002" },
    optanteSimples: true,
  });
  assertEquals(result.tinyValor, "2002");
  assertEquals(result.fallbackUsed, "none");
});

// Cenário B (CA-007): optante=true + dual ausente → tinyValor + fallback "no_dual"
Deno.test("resolveNaturezaTiny: optante=true sem dual cai para tinyValor com fallback no_dual", () => {
  const result = resolveNaturezaTiny({
    mapeamento: { tinyValor: "1001", tinyValorSimples: null },
    optanteSimples: true,
  });
  assertEquals(result.tinyValor, "1001");
  assertEquals(result.fallbackUsed, "no_dual");
});

// Cenário C (CA-007): optante=false + dual configurado → tinyValor
Deno.test("resolveNaturezaTiny: optante=false com dual escolhe tinyValor", () => {
  const result = resolveNaturezaTiny({
    mapeamento: { tinyValor: "1001", tinyValorSimples: "2002" },
    optanteSimples: false,
  });
  assertEquals(result.tinyValor, "1001");
  assertEquals(result.fallbackUsed, "none");
});

// Cenário D (CA-007): optante=null (PF ou consulta falhou) + dual → tinyValor + fallback "null_optante"
Deno.test("resolveNaturezaTiny: optante=null com dual cai para tinyValor com fallback null_optante", () => {
  const result = resolveNaturezaTiny({
    mapeamento: { tinyValor: "1001", tinyValorSimples: "2002" },
    optanteSimples: null,
  });
  assertEquals(result.tinyValor, "1001");
  assertEquals(result.fallbackUsed, "null_optante");
});

// Borda: tinyValorSimples string vazia é tratada como ausente (defesa em profundidade).
Deno.test("resolveNaturezaTiny: tinyValorSimples string vazia equivale a null (no_dual)", () => {
  const result = resolveNaturezaTiny({
    mapeamento: { tinyValor: "1001", tinyValorSimples: "" },
    optanteSimples: true,
  });
  assertEquals(result.tinyValor, "1001");
  assertEquals(result.fallbackUsed, "no_dual");
});

// Borda: optante=false sem dual → tinyValor com fallback "none" (sem dual mas
// também sem escolha pendente porque optante é false; no_dual continua correto
// porque é a forma de sinalizar "mapeamento não tem Simples configurado").
Deno.test("resolveNaturezaTiny: optante=false sem dual usa tinyValor com fallback no_dual", () => {
  const result = resolveNaturezaTiny({
    mapeamento: { tinyValor: "1001", tinyValorSimples: null },
    optanteSimples: false,
  });
  assertEquals(result.tinyValor, "1001");
  assertEquals(result.fallbackUsed, "no_dual");
});
