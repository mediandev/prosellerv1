// Invariante da data de entrega (item 3 do lote, incidente NF 6358/6359):
// quando o frete fecha como Entregue, a data vem do evento que REPRESENTA a
// entrega ("MERCADORIA ENTREGUE (01)"), nunca do último evento da timeline
// (que pode ser administrativo e posterior, ex.: "ANEXADO COMPROVANTE (70)").
// Importa o mapper REAL; a seleção replica a lógica de refreshSswForFrete
// (supabase/functions/_shared/ssw-refresh.ts — keep in sync).

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { mapOcorrenciaToStatus } from "../../supabase/functions/_shared/frete-logistica-helpers.ts";

type Evento = { tipo: string; ocorrencia: string; data_hora_efetiva: string };

function selecionaDataEntrega(tracking: Evento[]): string | undefined {
  let eventoEntrega: Evento | undefined;
  for (let i = tracking.length - 1; i >= 0; i--) {
    if (mapOcorrenciaToStatus(tracking[i].tipo, tracking[i].ocorrencia) === "Entregue") {
      eventoEntrega = tracking[i];
      break;
    }
  }
  const origem = eventoEntrega ?? tracking[tracking.length - 1];
  return origem?.data_hora_efetiva;
}

Deno.test("data de entrega: comprovante posterior NÃO define a data (caso NF 6359)", () => {
  const tracking: Evento[] = [
    { tipo: "Informativo", ocorrencia: "SAIDA PARA ENTREGA (92)", data_hora_efetiva: "2026-06-18T04:00:00Z" },
    { tipo: "Entrega", ocorrencia: "MERCADORIA ENTREGUE (01)", data_hora_efetiva: "2026-06-18T15:01:01Z" },
    { tipo: "Informativo", ocorrencia: "ANEXADO COMPROVANTE DE ENTREGA COMPLEMENTAR (70)", data_hora_efetiva: "2026-06-23T10:40:44Z" },
  ];
  assertEquals(selecionaDataEntrega(tracking), "2026-06-18T15:01:01Z");
});

Deno.test("data de entrega: entrega como último evento funciona normal", () => {
  const tracking: Evento[] = [
    { tipo: "Informativo", ocorrencia: "SAIDA PARA ENTREGA (92)", data_hora_efetiva: "2026-06-15T07:00:00Z" },
    { tipo: "Entrega", ocorrencia: "MERCADORIA ENTREGUE (01)", data_hora_efetiva: "2026-06-15T10:56:58Z" },
  ];
  assertEquals(selecionaDataEntrega(tracking), "2026-06-15T10:56:58Z");
});

Deno.test("data de entrega: fallback para o último evento quando não há evento de entrega", () => {
  const tracking: Evento[] = [
    { tipo: "Informativo", ocorrencia: "SAIDA DE UNIDADE (71)", data_hora_efetiva: "2026-06-04T11:00:00Z" },
  ];
  assertEquals(selecionaDataEntrega(tracking), "2026-06-04T11:00:00Z");
});
