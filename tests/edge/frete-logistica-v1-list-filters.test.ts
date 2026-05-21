// Rodar com: `deno test --no-check --allow-env --allow-read tests/edge/frete-logistica-v1-list-filters.test.ts`
// Vitest config exclui tests/edge/** — este arquivo é Deno puro.
//
// F-LOG-CRM R-LOG-2 · valida helpers puros da extensão GET de `frete-logistica-v1`:
//   - clampLimit / clampOffset (lição INC-016: hard cap 100).
//   - csvParam (parse de status CSV).
//   - DASHBOARD_BUCKETS (5 buckets, "Em Trânsito" inclui Reentrega).
//   - diasEmTransito (cálculo do KPI dos cards do Dashboard).
//
// Integração HTTP completa fica para smoke E2E manual em prod (matriz de validação
// do F-LOG-2 CA-2 / CA-3 / CA-4).

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  csvParam,
  clampLimit,
  clampOffset,
  DASHBOARD_BUCKETS,
  diasEmTransito,
} from "../../supabase/functions/_shared/frete-logistica-helpers.ts";

// ----- csvParam -----

Deno.test("csvParam(null) -> []", () => {
  assertEquals(csvParam(null), []);
});

Deno.test("csvParam('') -> []", () => {
  assertEquals(csvParam(""), []);
});

Deno.test("csvParam('Em Trânsito') -> ['Em Trânsito']", () => {
  assertEquals(csvParam("Em Trânsito"), ["Em Trânsito"]);
});

Deno.test("csvParam('A,B,C') trim e remove vazios", () => {
  assertEquals(csvParam("A, B , C ,, "), ["A", "B", "C"]);
});

// ----- clampLimit -----

Deno.test("clampLimit ausente -> 20 (default)", () => {
  assertEquals(clampLimit(null), 20);
  assertEquals(clampLimit(undefined), 20);
  assertEquals(clampLimit(""), 20);
});

Deno.test("clampLimit string numérica respeita o valor", () => {
  assertEquals(clampLimit("50"), 50);
  assertEquals(clampLimit("1"), 1);
});

Deno.test("clampLimit acima de 100 -> 100 (hard cap INC-016)", () => {
  assertEquals(clampLimit("200"), 100);
  assertEquals(clampLimit(99999), 100);
});

Deno.test("clampLimit zero/negativo -> 20 (default)", () => {
  assertEquals(clampLimit(0), 20);
  assertEquals(clampLimit(-10), 20);
});

Deno.test("clampLimit string inválida -> 20 (default)", () => {
  assertEquals(clampLimit("abc"), 20);
});

// ----- clampOffset -----

Deno.test("clampOffset ausente -> 0", () => {
  assertEquals(clampOffset(null), 0);
  assertEquals(clampOffset(undefined), 0);
});

Deno.test("clampOffset string numérica respeita o valor", () => {
  assertEquals(clampOffset("40"), 40);
});

Deno.test("clampOffset negativo -> 0", () => {
  assertEquals(clampOffset(-5), 0);
});

// ----- DASHBOARD_BUCKETS -----

Deno.test("DASHBOARD_BUCKETS tem exatamente 5 buckets", () => {
  assertEquals(Object.keys(DASHBOARD_BUCKETS).length, 5);
});

Deno.test("Bucket 'Em Trânsito' inclui 'Em Trânsito' e 'Em Trânsito - Reentrega'", () => {
  assertEquals(DASHBOARD_BUCKETS["Em Trânsito"], [
    "Em Trânsito",
    "Em Trânsito - Reentrega",
  ]);
});

Deno.test("Bucket 'Reentrega' só inclui 'Em Trânsito - Reentrega'", () => {
  assertEquals(DASHBOARD_BUCKETS["Reentrega"], ["Em Trânsito - Reentrega"]);
});

Deno.test("Bucket 'Agendados' só inclui 'Agendado'", () => {
  assertEquals(DASHBOARD_BUCKETS["Agendados"], ["Agendado"]);
});

Deno.test("Bucket 'Devoluções em Trânsito' só inclui 'Devolvido - Trânsito'", () => {
  assertEquals(DASHBOARD_BUCKETS["Devoluções em Trânsito"], ["Devolvido - Trânsito"]);
});

Deno.test("Bucket 'Recusadas' só inclui 'Recusado'", () => {
  assertEquals(DASHBOARD_BUCKETS["Recusadas"], ["Recusado"]);
});

// ----- diasEmTransito -----

const REF_NOW = new Date("2026-05-21T12:00:00Z").getTime();

Deno.test("diasEmTransito sem dataSaida -> null", () => {
  assertEquals(diasEmTransito(null, null, REF_NOW), null);
});

Deno.test("diasEmTransito com dataEntrega -> null (não está em trânsito ativo)", () => {
  assertEquals(diasEmTransito("2026-05-15", "2026-05-20", REF_NOW), null);
});

Deno.test("diasEmTransito 5 dias", () => {
  assertEquals(diasEmTransito("2026-05-16", null, REF_NOW), 5);
});

Deno.test("diasEmTransito mesmo dia -> 0", () => {
  assertEquals(diasEmTransito("2026-05-21", null, REF_NOW), 0);
});

Deno.test("diasEmTransito dataSaida no futuro -> null", () => {
  assertEquals(diasEmTransito("2027-01-01", null, REF_NOW), null);
});
