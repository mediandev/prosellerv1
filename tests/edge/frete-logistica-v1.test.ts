// Rodar com: `deno test --no-check --allow-env --allow-read tests/edge/frete-logistica-v1.test.ts`
// Vitest config exclui tests/edge/** — este arquivo é Deno puro.
//
// Smoke de unit para o helper compartilhado da F-LOG-CRM. Valida a regra
// de gating da `FEATURE_LOG_CRM` que cobre CA-6 do F-LOG-1 (Edge Functions
// retornam 503 quando flag != "true").
//
// A integração HTTP completa (POST → 200 + linha persistida) roda apenas
// em staging via `cursor-brief.md` Tarefa 8, depois que a migration 119
// for aplicada. Aqui só validamos a função pura — defesa em duas camadas.

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  isLogCrmFeatureEnabled,
  isLogCrmEnabledFromEnv,
} from "../../supabase/functions/_shared/log-crm-feature-flag.ts";

// ----- isLogCrmFeatureEnabled (pure) -----

Deno.test("isLogCrmFeatureEnabled('true') -> habilitado", () => {
  assertEquals(isLogCrmFeatureEnabled("true"), true);
});

Deno.test("isLogCrmFeatureEnabled('false') -> desabilitado", () => {
  assertEquals(isLogCrmFeatureEnabled("false"), false);
});

Deno.test("isLogCrmFeatureEnabled(undefined) -> desabilitado", () => {
  assertEquals(isLogCrmFeatureEnabled(undefined), false);
});

Deno.test("isLogCrmFeatureEnabled(null) -> desabilitado", () => {
  assertEquals(isLogCrmFeatureEnabled(null), false);
});

Deno.test("isLogCrmFeatureEnabled('TRUE') maiúsculo -> desabilitado (case-sensitive por design)", () => {
  // Convenção idêntica ao FEATURE_SIMPLES_NACIONAL_LOOKUP (ADR-001):
  // apenas a string "true" minúscula liga a feature.
  assertEquals(isLogCrmFeatureEnabled("TRUE"), false);
});

Deno.test("isLogCrmFeatureEnabled(' true ') com espaço -> desabilitado", () => {
  // Sem trim por design — evita ambiguidade em deploy automático.
  assertEquals(isLogCrmFeatureEnabled(" true "), false);
});

// ----- isLogCrmEnabledFromEnv (lê Deno.env) -----

Deno.test("isLogCrmEnabledFromEnv lê FEATURE_LOG_CRM (true)", () => {
  Deno.env.set("FEATURE_LOG_CRM", "true");
  try {
    assertEquals(isLogCrmEnabledFromEnv(), true);
  } finally {
    Deno.env.delete("FEATURE_LOG_CRM");
  }
});

Deno.test("isLogCrmEnabledFromEnv ausência -> false", () => {
  Deno.env.delete("FEATURE_LOG_CRM");
  assertEquals(isLogCrmEnabledFromEnv(), false);
});

Deno.test("isLogCrmEnabledFromEnv FEATURE_LOG_CRM='false' -> false", () => {
  Deno.env.set("FEATURE_LOG_CRM", "false");
  try {
    assertEquals(isLogCrmEnabledFromEnv(), false);
  } finally {
    Deno.env.delete("FEATURE_LOG_CRM");
  }
});
