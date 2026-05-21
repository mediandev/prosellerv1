import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

/**
 * Smoke test (F-LOG-2 CA-7) do `FreteOcorrenciaTimeline`:
 *  - Quando ocorrencias = [], exibe placeholder explicando que a integração
 *    SSW chega na próxima entrega (R-LOG-4).
 *  - Quando ocorrencias tem itens, renderiza a lista (código + descrição).
 */

import FreteOcorrenciaTimeline from "../../src/components/logistica/FreteOcorrenciaTimeline";

describe("FreteOcorrenciaTimeline (F-LOG-2 CA-7)", () => {
  it("mostra placeholder quando lista vazia", () => {
    render(<FreteOcorrenciaTimeline ocorrencias={[]} />);
    expect(
      screen.getByText(/Sem atualizações do transportador/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/R-LOG-4/i)).toBeInTheDocument();
  });

  it("mostra placeholder quando ocorrencias = undefined", () => {
    render(<FreteOcorrenciaTimeline ocorrencias={undefined} />);
    expect(
      screen.getByText(/Sem atualizações do transportador/i),
    ).toBeInTheDocument();
  });

  it("renderiza ocorrências quando há dados", () => {
    render(
      <FreteOcorrenciaTimeline
        ocorrencias={[
          {
            id: "1",
            freteId: "10",
            codigoSsw: "01",
            descricaoOcorrencia: "Entregue ao destinatário",
            tipo: "Operacional",
            dataHora: "2026-05-21T10:30:00Z",
            dominio: "ATV",
            filial: "SP",
            cidade: "São Paulo",
            uf: "SP",
            rawPayload: null,
          },
          {
            id: "2",
            freteId: "10",
            codigoSsw: "67",
            descricaoOcorrencia: "Em trânsito",
            tipo: "Informativo",
            dataHora: "2026-05-20T08:00:00Z",
            dominio: "ATV",
            filial: null,
            cidade: "Campinas",
            uf: "SP",
            rawPayload: null,
          },
        ] as any}
      />,
    );
    expect(screen.getByText(/Entregue ao destinatário/i)).toBeInTheDocument();
    expect(screen.getByText(/Em trânsito/i)).toBeInTheDocument();
    expect(screen.queryByText(/Sem atualizações do transportador/i)).toBeNull();
  });
});
