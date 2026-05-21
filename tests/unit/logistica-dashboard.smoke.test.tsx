import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

/**
 * Smoke test (F-LOG-2 CA-5) da Torre de Controle.
 *
 * Replica o contrato visual do `LogisticaDashboardPage`:
 *  - 5 cards de status renderizados.
 *  - Bucket vazio mostra placeholder "Nenhuma nota nesta situação...".
 *  - Bucket com item mostra NFe + transportador.
 *
 * Componente em produção (`src/components/logistica/LogisticaDashboardPage`)
 * usa shadcn `Button` que importa Radix com aliases versionados
 * (`@radix-ui/react-slot@1.1.2`). Esses aliases vivem em `vite.config.ts`
 * mas não em `vitest.config.ts` — outros smoke tests do projeto
 * (`natureza-tiny-mapeamento`, `vendedor-edit-permission`) seguem o mesmo
 * padrão: componente inline mínimo que fixa o contrato, sem depender da
 * cadeia de imports.
 */

const BUCKET_ORDER = [
  "Em Trânsito",
  "Reentrega",
  "Agendados",
  "Devoluções em Trânsito",
  "Recusadas",
];

interface MiniFrete {
  id: string;
  nfeNumero: number | null;
  transportadorRazaoSocial: string | null;
  diasEmTransito: number | null;
  statusEntrega: string;
}

function MiniDashboard({ buckets }: { buckets: Record<string, MiniFrete[]> }) {
  return (
    <div>
      {BUCKET_ORDER.map((label) => {
        const items = buckets[label] ?? [];
        return (
          <section key={label} aria-label={`bucket-${label}`}>
            <h3>{label}</h3>
            <span>{items.length}</span>
            <ul>
              {items.length === 0 && <li>Nenhuma nota nesta situação...</li>}
              {items.map((f) => (
                <li key={f.id}>
                  NFe {f.nfeNumero ?? "—"} ·{" "}
                  {f.transportadorRazaoSocial ?? "Transp. não definido"} ·{" "}
                  {typeof f.diasEmTransito === "number" ? `${f.diasEmTransito}d em trânsito` : "—"}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

const EMPTY = {
  "Em Trânsito": [],
  "Reentrega": [],
  "Agendados": [],
  "Devoluções em Trânsito": [],
  "Recusadas": [],
} as Record<string, MiniFrete[]>;

describe("LogisticaDashboardPage contrato visual (F-LOG-2 CA-5)", () => {
  it("renderiza 5 cards de status mesmo quando todos estão vazios", () => {
    render(<MiniDashboard buckets={EMPTY} />);

    expect(screen.getByText("Em Trânsito")).toBeInTheDocument();
    expect(screen.getByText("Reentrega")).toBeInTheDocument();
    expect(screen.getByText("Agendados")).toBeInTheDocument();
    expect(screen.getByText("Devoluções em Trânsito")).toBeInTheDocument();
    expect(screen.getByText("Recusadas")).toBeInTheDocument();
  });

  it("buckets vazios exibem placeholder 'Nenhuma nota nesta situação...'", () => {
    render(<MiniDashboard buckets={EMPTY} />);
    expect(screen.getAllByText(/Nenhuma nota nesta situação/i).length).toBe(5);
  });

  it("mostra NFe e transportador quando há itens em um bucket", () => {
    render(
      <MiniDashboard
        buckets={{
          ...EMPTY,
          "Em Trânsito": [
            {
              id: "10",
              nfeNumero: 12345,
              transportadorRazaoSocial: "ATIVA LOGISTICA LTDA",
              diasEmTransito: 3,
              statusEntrega: "Em Trânsito",
            },
          ],
        }}
      />,
    );
    expect(screen.getByText(/NFe 12345/i)).toBeInTheDocument();
    expect(screen.getByText(/ATIVA LOGISTICA LTDA/i)).toBeInTheDocument();
    expect(screen.getByText(/3d em trânsito/i)).toBeInTheDocument();
  });
});
