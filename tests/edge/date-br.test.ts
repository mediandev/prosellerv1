// Rodar com: `deno test --no-check --allow-read tests/edge/date-br.test.ts`
//
// BUG-001: Edge Functions Deno rodam com TZ default UTC. A versão antiga
// (`new Date().toISOString().slice(0, 10).split('-').reverse().join('/')`)
// devolvia o dia UTC, e às 23:30 BRT (UTC 02:30 do dia seguinte) o pedido
// chegava no Tiny com data D+1.

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { formatDateBR } from "../../supabase/functions/_shared/date-br.ts";

// 2026-04-29 23:30 BRT == 2026-04-30 02:30:00 UTC. A data BR continua 29/04.
Deno.test("formatDateBR: 23:30 BRT mantém dia BR mesmo já sendo D+1 em UTC", () => {
  const utc = new Date("2026-04-30T02:30:00.000Z");
  assertEquals(formatDateBR(utc), "29/04/2026");
});

// Caso simétrico: 12:00 UTC == 09:00 BRT, mesmo dia em ambos os fusos.
Deno.test("formatDateBR: meio-dia UTC formata o mesmo dia BR", () => {
  const utc = new Date("2026-04-29T12:00:00.000Z");
  assertEquals(formatDateBR(utc), "29/04/2026");
});

// Borda de virada de mês: 30/04 23:30 BRT == 01/05 02:30 UTC.
Deno.test("formatDateBR: virada de mês — 30/04 23:30 BRT continua 30/04 BR", () => {
  const utc = new Date("2026-05-01T02:30:00.000Z");
  assertEquals(formatDateBR(utc), "30/04/2026");
});

// Borda de horário de verão (BR não usa DST desde 2019, mas garantia).
// 2026-12-31 23:00 BRT == 2027-01-01 02:00 UTC → dia BR 31/12/2026.
Deno.test("formatDateBR: virada de ano BR não escorrega para UTC", () => {
  const utc = new Date("2027-01-01T02:00:00.000Z");
  assertEquals(formatDateBR(utc), "31/12/2026");
});
