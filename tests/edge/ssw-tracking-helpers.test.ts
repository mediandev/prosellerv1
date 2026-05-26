// Rodar com: `deno test --no-check --allow-env --allow-read tests/edge/ssw-tracking-helpers.test.ts`
// Vitest config exclui tests/edge/** — este arquivo é Deno puro.
//
// Smoke de unit para helpers SSW da R-LOG-4: mapper status, cache staleness,
// feature flag SSW, e parser cidade/UF.

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  isLogCrmSswFeatureEnabled,
} from "../../supabase/functions/_shared/log-crm-feature-flag.ts";
import {
  mapOcorrenciaToStatus,
  isTerminalStatus,
  resolveFreteStatusFromTracking,
} from "../../supabase/functions/_shared/frete-logistica-helpers.ts";
import {
  isCacheStale,
  mapSswToOcorrencias,
} from "../../supabase/functions/_shared/ssw-client.ts";
import type { SswSuccessResponse } from "../../supabase/functions/_shared/ssw-client.ts";

// ----- Feature flag SSW -----

Deno.test("isLogCrmSswFeatureEnabled('true') -> habilitado", () => {
  assertEquals(isLogCrmSswFeatureEnabled("true"), true);
});

Deno.test("isLogCrmSswFeatureEnabled('false') -> desabilitado", () => {
  assertEquals(isLogCrmSswFeatureEnabled("false"), false);
});

Deno.test("isLogCrmSswFeatureEnabled(undefined) -> desabilitado", () => {
  assertEquals(isLogCrmSswFeatureEnabled(undefined), false);
});

// ----- Mapper SSW → status_entrega -----

Deno.test("mapper: tipo Entrega + (01) → Entregue", () => {
  assertEquals(mapOcorrenciaToStatus("Entrega", "MERCADORIA ENTREGUE (01)"), "Entregue");
});

Deno.test("mapper: tipo Cliente + (02) → Agendado", () => {
  assertEquals(mapOcorrenciaToStatus("Cliente", "AGUARDANDO AGENDAMENTO DO CLIENTE (02)"), "Agendado");
});

Deno.test("mapper: AGENDADA (08) → Agendado", () => {
  assertEquals(mapOcorrenciaToStatus("Informativo", "ENTREGA AGENDADA (08)"), "Agendado");
});

Deno.test("mapper: RECUSADA → Recusado", () => {
  assertEquals(mapOcorrenciaToStatus("Cliente", "MERCADORIA RECUSADA"), "Recusado");
});

Deno.test("mapper: DEVOLVIDA → Devolvido - Trânsito", () => {
  assertEquals(mapOcorrenciaToStatus("Informativo", "MERCADORIA DEVOLVIDA"), "Devolvido - Trânsito");
});

Deno.test("mapper: DEVOLUÇÃO ENTREGUE → Devolvido - Entregue", () => {
  assertEquals(mapOcorrenciaToStatus("Entrega", "DEVOLUÇÃO ENTREGUE AO REMETENTE"), "Devolvido - Entregue");
});

Deno.test("mapper: default Informativo → Em Trânsito", () => {
  assertEquals(mapOcorrenciaToStatus("Informativo", "DOCUMENTO DE TRANSPORTE EMITIDO (67)"), "Em Trânsito");
});

// ----- isTerminalStatus -----

Deno.test("isTerminalStatus: Entregue é terminal", () => {
  assertEquals(isTerminalStatus("Entregue"), true);
});

Deno.test("isTerminalStatus: Em Trânsito NÃO é terminal", () => {
  assertEquals(isTerminalStatus("Em Trânsito"), false);
});

// ----- resolveFreteStatusFromTracking -----

Deno.test("resolveFreteStatusFromTracking: usa último item do tracking", () => {
  const tracking = [
    { tipo: "Informativo", ocorrencia: "DOCUMENTO DE TRANSPORTE EMITIDO (67)" },
    { tipo: "Entrega", ocorrencia: "MERCADORIA ENTREGUE (01)" },
  ];
  assertEquals(resolveFreteStatusFromTracking(tracking), "Entregue");
});

Deno.test("resolveFreteStatusFromTracking: array vazio → Em Trânsito", () => {
  assertEquals(resolveFreteStatusFromTracking([]), "Em Trânsito");
});

// ----- isCacheStale -----

Deno.test("isCacheStale: null → stale", () => {
  assertEquals(isCacheStale(null), true);
});

Deno.test("isCacheStale: undefined → stale", () => {
  assertEquals(isCacheStale(undefined), true);
});

Deno.test("isCacheStale: recente (5 min atrás) → NOT stale", () => {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  assertEquals(isCacheStale(fiveMinAgo), false);
});

Deno.test("isCacheStale: antigo (60 min atrás) → stale", () => {
  const sixtyMinAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  assertEquals(isCacheStale(sixtyMinAgo), true);
});

// ----- mapSswToOcorrencias -----

Deno.test("mapSswToOcorrencias: extrai cidade/UF de 'VIANA / ES'", () => {
  const sswResponse: SswSuccessResponse = {
    success: true,
    message: "ok",
    documento: {
      header: { remetente: "R", destinatario: "D", nro_nf: "1", pedido: "" },
      tracking: [
        {
          data_hora: "2026-05-15T14:30:00",
          dominio: "FAV",
          filial: "VIX",
          cidade: "VIANA / ES",
          ocorrencia: "DOCUMENTO DE TRANSPORTE EMITIDO (67)",
          descricao: "CT-e emitido",
          tipo: "Informativo",
          data_hora_efetiva: "2026-05-15T14:30:00",
          nome_recebedor: "",
          nro_doc_recebedor: "",
          codigo_ssw: "80",
        },
      ],
    },
  };
  const rows = mapSswToOcorrencias(sswResponse, "42");
  assertEquals(rows.length, 1);
  assertEquals(rows[0].cidade, "VIANA");
  assertEquals(rows[0].uf, "ES");
  assertEquals(rows[0].frete_id, "42");
  assertEquals(rows[0].codigo_ssw, "80");
  assertEquals(rows[0].nome_recebedor, null);
});

Deno.test("mapSswToOcorrencias: nome_recebedor preenchido em evento de entrega", () => {
  const sswResponse: SswSuccessResponse = {
    success: true,
    message: "ok",
    documento: {
      header: { remetente: "R", destinatario: "D", nro_nf: "1", pedido: "" },
      tracking: [
        {
          data_hora: "2026-05-20T09:15:00",
          dominio: "FAV",
          filial: "CBA",
          cidade: "CUIABA / MT",
          ocorrencia: "MERCADORIA ENTREGUE (01)",
          descricao: "Entrega realizada",
          tipo: "Entrega",
          data_hora_efetiva: "2026-05-20T09:15:00",
          nome_recebedor: "MARIA SILVA",
          nro_doc_recebedor: "12345678900",
          codigo_ssw: "01",
        },
      ],
    },
  };
  const rows = mapSswToOcorrencias(sswResponse, "99");
  assertEquals(rows[0].nome_recebedor, "MARIA SILVA");
  assertEquals(rows[0].nro_doc_recebedor, "12345678900");
  assertEquals(rows[0].tipo, "Entrega");
});
