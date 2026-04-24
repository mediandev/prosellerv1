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

// DP-006 (2026-04-24): short-circuit por empresa. Quando o caller passa
// companyHasDualMapping=false, a função retorna tinyValor padrão com fallback
// "no_dual_company" — independente do per-row tinyValorSimples e do optante.
// No caller (tiny-enviar-pedido-venda-v1), esse caminho evita a chamada a
// ReceitaWS completamente.
Deno.test("resolveNaturezaTiny: short-circuit companyHasDualMapping=false retorna no_dual_company", () => {
  const result = resolveNaturezaTiny({
    mapeamento: { tinyValor: "1001", tinyValorSimples: null },
    optanteSimples: true,
    companyHasDualMapping: false,
  });
  assertEquals(result.tinyValor, "1001");
  assertEquals(result.fallbackUsed, "no_dual_company");
});

// DP-006 borda: companyHasDualMapping=false precede tinyValorSimples na mesma
// row (cenário estruturalmente inconsistente — se a empresa tem 1 dual, a probe
// retornaria >0 — mas garante que o flag empresa-level tem prioridade).
Deno.test("resolveNaturezaTiny: companyHasDualMapping=false precede tinyValorSimples na mesma row", () => {
  const result = resolveNaturezaTiny({
    mapeamento: { tinyValor: "1001", tinyValorSimples: "2002" },
    optanteSimples: true,
    companyHasDualMapping: false,
  });
  assertEquals(result.tinyValor, "1001");
  assertEquals(result.fallbackUsed, "no_dual_company");
});

// DP-006 regressão: companyHasDualMapping=true mantém comportamento pré-DP-006.
Deno.test("resolveNaturezaTiny: companyHasDualMapping=true com dual e optante=true escolhe Simples", () => {
  const result = resolveNaturezaTiny({
    mapeamento: { tinyValor: "1001", tinyValorSimples: "2002" },
    optanteSimples: true,
    companyHasDualMapping: true,
  });
  assertEquals(result.tinyValor, "2002");
  assertEquals(result.fallbackUsed, "none");
});
