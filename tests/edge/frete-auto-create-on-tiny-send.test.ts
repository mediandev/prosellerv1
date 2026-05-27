// Rodar com: `deno test --no-check --allow-env --allow-read tests/edge/frete-auto-create-on-tiny-send.test.ts`
// Vitest config exclui tests/edge/** — este arquivo é Deno puro.
//
// R-LOG-3: testa autoCreateFreteLogistica (helper) e feature flag AUTO_FRETE.
// CA principal: falha do hook NUNCA bloqueia o retorno do pedido (best-effort).

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { autoCreateFreteLogistica } from "../../supabase/functions/_shared/frete-auto-create.ts";
import type { AutoFreteResult } from "../../supabase/functions/_shared/frete-auto-create.ts";
import {
  isLogCrmAutoFreteFeatureEnabled,
  isLogCrmAutoFreteEnabledFromEnv,
} from "../../supabase/functions/_shared/log-crm-feature-flag.ts";

// ========== Feature flag tests ==========

Deno.test("isLogCrmAutoFreteFeatureEnabled('true') -> habilitado", () => {
  assertEquals(isLogCrmAutoFreteFeatureEnabled("true"), true);
});

Deno.test("isLogCrmAutoFreteFeatureEnabled('false') -> desabilitado", () => {
  assertEquals(isLogCrmAutoFreteFeatureEnabled("false"), false);
});

Deno.test("isLogCrmAutoFreteFeatureEnabled(undefined) -> desabilitado", () => {
  assertEquals(isLogCrmAutoFreteFeatureEnabled(undefined), false);
});

Deno.test("isLogCrmAutoFreteFeatureEnabled(null) -> desabilitado", () => {
  assertEquals(isLogCrmAutoFreteFeatureEnabled(null), false);
});

Deno.test("isLogCrmAutoFreteEnabledFromEnv lê FEATURE_LOG_CRM_AUTO_FRETE", () => {
  Deno.env.set("FEATURE_LOG_CRM_AUTO_FRETE", "true");
  try {
    assertEquals(isLogCrmAutoFreteEnabledFromEnv(), true);
  } finally {
    Deno.env.delete("FEATURE_LOG_CRM_AUTO_FRETE");
  }
});

Deno.test("isLogCrmAutoFreteEnabledFromEnv ausência -> false (flag off = skip)", () => {
  Deno.env.delete("FEATURE_LOG_CRM_AUTO_FRETE");
  assertEquals(isLogCrmAutoFreteEnabledFromEnv(), false);
});

// ========== autoCreateFreteLogistica tests ==========

const baseParams = {
  pedidoVendaId: 42,
  empresaId: 1,
  clienteId: 10,
  vendedorId: "aaaa-bbbb-cccc-dddd",
  valorProdutos: 1500.0,
  criadoPor: "user-uuid-123",
  traceId: "trace-test-001",
};

function mockSupabase(insertResult: { error: { code?: string; message?: string } | null }) {
  return {
    from: (_table: string) => ({
      insert: (_row: Record<string, unknown>) => Promise.resolve(insertResult),
    }),
  };
}

Deno.test("autoCreateFreteLogistica: insert sucesso -> created=true", async () => {
  const sb = mockSupabase({ error: null });
  const result: AutoFreteResult = await autoCreateFreteLogistica(sb, baseParams);
  assertEquals(result.created, true);
  assertEquals(result.skipped, false);
  assertEquals(result.error, null);
});

Deno.test("autoCreateFreteLogistica: unique violation (23505) -> skipped=true (idempotent)", async () => {
  const sb = mockSupabase({ error: { code: "23505", message: "duplicate key" } });
  const result: AutoFreteResult = await autoCreateFreteLogistica(sb, baseParams);
  assertEquals(result.created, false);
  assertEquals(result.skipped, true);
  assertEquals(result.error, null);
});

Deno.test("autoCreateFreteLogistica: other DB error -> created=false, error logged, no throw", async () => {
  const sb = mockSupabase({ error: { code: "42501", message: "permission denied" } });
  const result: AutoFreteResult = await autoCreateFreteLogistica(sb, baseParams);
  assertEquals(result.created, false);
  assertEquals(result.skipped, false);
  assertEquals(result.error, "permission denied");
});

Deno.test("autoCreateFreteLogistica: unexpected exception -> caught, no throw (best-effort)", async () => {
  const sb = {
    from: (_table: string) => ({
      insert: (_row: Record<string, unknown>) => Promise.reject(new Error("network timeout")),
    }),
  };
  const result: AutoFreteResult = await autoCreateFreteLogistica(sb, baseParams);
  assertEquals(result.created, false);
  assertEquals(result.skipped, false);
  assertEquals(typeof result.error, "string");
});
