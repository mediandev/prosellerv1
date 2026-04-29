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
import { consultarSimplesNacional } from "../../supabase/functions/_shared/receitaws-client.ts";

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

// ─────────────────────────────────────────────────────────────────────────────
// receitaws-client (INC-002 hotfix): operação sem token = API Pública.
// Substituímos `globalThis.fetch` e `Deno.env.get` por stubs determinísticos
// para validar que o header Authorization é construído condicionalmente.
// ─────────────────────────────────────────────────────────────────────────────

type FetchInit = { method?: string; headers?: Record<string, string> };

function stubFetch(responseBody: unknown, status = 200) {
  const calls: Array<{ url: string; init: FetchInit }> = [];
  const original = globalThis.fetch;
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const headers = (init?.headers || {}) as Record<string, string>;
    calls.push({ url, init: { method: init?.method, headers } });
    return Promise.resolve(
      new Response(JSON.stringify(responseBody), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    );
    // deno-lint-ignore no-explicit-any
  }) as any;
  const restore = () => {
    globalThis.fetch = original;
  };
  return { calls, restore };
}

function stubEnv(values: Record<string, string | undefined>) {
  const originalGet = Deno.env.get.bind(Deno.env);
  Deno.env.get = ((name: string) => {
    if (name in values) return values[name];
    return originalGet(name);
    // deno-lint-ignore no-explicit-any
  }) as any;
  return () => {
    Deno.env.get = originalGet;
  };
}

const SIMPLES_OPTANTE_BODY = {
  cnpj: "39.511.470/0001-55",
  simples: { optante: true },
};

// INC-002 cenário 1: sem token → fetch chamado sem header Authorization, status=ok.
Deno.test("consultarSimplesNacional: sem token chama API Publica sem Authorization", async () => {
  const restoreEnv = stubEnv({ RECEITAWS_TOKEN: undefined });
  const { calls, restore: restoreFetch } = stubFetch(SIMPLES_OPTANTE_BODY, 200);
  try {
    const result = await consultarSimplesNacional({
      cnpj: "39511470000155",
      traceId: "trace-no-token",
    });
    assertEquals(result.status, "ok");
    assertEquals(result.optante, true);
    assertEquals(calls.length, 1);
    assertEquals(calls[0].init.headers?.["Authorization"], undefined);
    assertEquals(calls[0].init.headers?.["Accept"], "application/json");
  } finally {
    restoreFetch();
    restoreEnv();
  }
});

// INC-002 cenário 2: com token → fetch chamado com Authorization Bearer.
Deno.test("consultarSimplesNacional: com token chama API Comercial com Bearer", async () => {
  const restoreEnv = stubEnv({ RECEITAWS_TOKEN: "abc123" });
  const { calls, restore: restoreFetch } = stubFetch(SIMPLES_OPTANTE_BODY, 200);
  try {
    const result = await consultarSimplesNacional({
      cnpj: "39511470000155",
      traceId: "trace-with-token",
    });
    assertEquals(result.status, "ok");
    assertEquals(result.optante, true);
    assertEquals(calls.length, 1);
    assertEquals(calls[0].init.headers?.["Authorization"], "Bearer abc123");
  } finally {
    restoreFetch();
    restoreEnv();
  }
});
