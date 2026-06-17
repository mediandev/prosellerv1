// FreteResumoCard — bloco compacto "Entrega" no detalhe do pedido (SalesPage).
// F-LOG-CRM R-LOG-2/R-LOG-4. Busca frete por pedido_venda_id (fallback: nfe_numero).

import { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Truck } from "lucide-react";
import { listFretes, getFreteWithOcorrencias } from "../../services/logisticaService";
import FreteStatusBadge from "./FreteStatusBadge";
import FreteOcorrenciaTimeline from "./FreteOcorrenciaTimeline";
import type { FreteLogisticaEnriched, OcorrenciaSSW } from "@shared/types/frete-logistica";

export default function FreteResumoCard({
  pedidoVendaId,
  nfeNumero,
}: {
  pedidoVendaId?: number | null;
  nfeNumero?: string | number | null;
  onOpenLogistica?: (freteId: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [frete, setFrete] = useState<FreteLogisticaEnriched | null>(null);
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaSSW[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const hasKey = pedidoVendaId != null || nfeNumero != null;
      if (!hasKey) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const filters = pedidoVendaId != null
          ? { pedidoVendaId, limit: 1 }
          : { nfeNumero: String(nfeNumero), limit: 1 };
        const data = await listFretes(filters);
        if (cancelled) return;
        const found = (data.fretes && data.fretes[0]) || null;
        setFrete(found);
        if (found) {
          const detail = await getFreteWithOcorrencias(found.id);
          if (!cancelled) setOcorrencias(detail.ocorrencias || []);
        }
      } catch (err) {
        if (cancelled) return;
        console.warn("[FreteResumoCard] falha ao buscar frete:", err);
        setError(err instanceof Error ? err.message : "Falha ao consultar logística");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pedidoVendaId, nfeNumero]);

  return (
    <Card className="p-4 border-dashed">
      <div className="flex items-center gap-2 mb-2">
        <Truck className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-medium">Entrega</h4>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Consultando logística...</p>
      ) : error ? (
        <p className="text-sm text-amber-700">{error}</p>
      ) : !frete ? (
        <p className="text-sm text-muted-foreground">
          Nenhum frete vinculado a este pedido ainda.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <FreteStatusBadge status={frete.statusEntrega} />
            {typeof frete.diasEmTransito === "number" && (
              <span className="text-xs text-muted-foreground">
                {frete.diasEmTransito} dias em trânsito
              </span>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            Transportadora: <span className="font-medium text-foreground">{frete.transportadorRazaoSocial ?? "—"}</span>
          </div>
          <FreteOcorrenciaTimeline ocorrencias={ocorrencias} />
        </div>
      )}
    </Card>
  );
}
