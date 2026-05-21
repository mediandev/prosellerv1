// LogisticaDashboardPage — Torre de Controle (5 cards de status).
// F-LOG-CRM R-LOG-2. Decisão Valentim 2026-05-21: sem indicadores financeiros
// (adiados pra R-LOG-5). Cards vazios mostram placeholder.

import { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Truck, RotateCcw, CalendarClock, RotateCw, XCircle } from "lucide-react";
import { listFretesByStatus } from "../../services/logisticaService";
import FreteStatusBadge from "./FreteStatusBadge";
import type {
  DashboardBuckets,
  DashboardBucketLabel,
  FreteLogisticaEnriched,
} from "@shared/types/frete-logistica";

const BUCKET_ORDER: DashboardBucketLabel[] = [
  "Em Trânsito",
  "Reentrega",
  "Agendados",
  "Devoluções em Trânsito",
  "Recusadas",
];

const ICONS: Record<DashboardBucketLabel, JSX.Element> = {
  "Em Trânsito": <Truck className="h-5 w-5" />,
  "Reentrega": <RotateCw className="h-5 w-5" />,
  "Agendados": <CalendarClock className="h-5 w-5" />,
  "Devoluções em Trânsito": <RotateCcw className="h-5 w-5" />,
  "Recusadas": <XCircle className="h-5 w-5" />,
};

const TONES: Record<DashboardBucketLabel, string> = {
  "Em Trânsito": "text-sky-700",
  "Reentrega": "text-violet-700",
  "Agendados": "text-amber-700",
  "Devoluções em Trânsito": "text-slate-700",
  "Recusadas": "text-rose-700",
};

export default function LogisticaDashboardPage({
  onOpenFrete,
}: {
  onOpenFrete?: (id: string) => void;
}) {
  const [buckets, setBuckets] = useState<DashboardBuckets | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await listFretesByStatus();
      setBuckets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar Torre de Controle");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Torre de Controle</h2>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          {loading ? "Atualizando..." : "Atualizar"}
        </Button>
      </div>

      {error && (
        <Card className="p-3 text-sm text-destructive border-destructive/40">
          {error}
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {BUCKET_ORDER.map((label) => {
          const items: FreteLogisticaEnriched[] = (buckets?.[label] ?? []) as FreteLogisticaEnriched[];
          return (
            <Card key={label} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2 font-medium ${TONES[label]}`}>
                  {ICONS[label]}
                  <span>{label}</span>
                </div>
                <span className="text-2xl font-semibold tabular-nums">
                  {loading && !buckets ? "—" : items.length}
                </span>
              </div>
              <ul className="space-y-2">
                {items.length === 0 && (
                  <li className="text-xs text-muted-foreground">
                    Nenhuma nota nesta situação...
                  </li>
                )}
                {items.slice(0, 5).map((f) => (
                  <li
                    key={f.id}
                    className="rounded-md border border-border p-2 text-xs hover:bg-muted cursor-pointer"
                    onClick={() => onOpenFrete?.(f.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">
                        NFe {f.nfeNumero ?? "—"}
                      </span>
                      {typeof f.diasEmTransito === "number" && (
                        <span className="text-muted-foreground whitespace-nowrap">
                          {f.diasEmTransito}d em trânsito
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-muted-foreground truncate">
                        {f.transportadorRazaoSocial ?? "Transportador não definido"}
                      </span>
                      <FreteStatusBadge status={f.statusEntrega} className="text-[10px]" />
                    </div>
                    {f.clienteNome && (
                      <div className="mt-0.5 text-muted-foreground truncate">
                        {f.clienteNome}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
