// FreteResumoCard — bloco compacto "Entrega" no detalhe do pedido (SalesPage).
// F-LOG-CRM R-LOG-2. Busca frete pelo número da NFe; placeholder se não achar.

import { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Truck, ExternalLink } from "lucide-react";
import { listFretes } from "../../services/logisticaService";
import FreteStatusBadge from "./FreteStatusBadge";
import type { FreteLogisticaEnriched } from "@shared/types/frete-logistica";

export default function FreteResumoCard({
  nfeNumero,
  onOpenLogistica,
}: {
  nfeNumero: string | number | null | undefined;
  onOpenLogistica?: (freteId: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [frete, setFrete] = useState<FreteLogisticaEnriched | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!nfeNumero) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await listFretes({ nfeNumero: String(nfeNumero), limit: 1 });
        if (cancelled) return;
        setFrete((data.fretes && data.fretes[0]) || null);
      } catch (err) {
        if (cancelled) return;
        // Erro silencioso para não poluir o detalhe do pedido — só log.
        console.warn("[FreteResumoCard] falha ao buscar frete:", err);
        setError(err instanceof Error ? err.message : "Falha ao consultar logística");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nfeNumero]);

  if (!nfeNumero) {
    return null;
  }

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
          Nenhum frete vinculado a esta NF ainda.
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
          <div className="text-xs text-muted-foreground">
            Sem atualizações do transportador (integração SSW chega em breve).
          </div>
          {onOpenLogistica && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenLogistica(frete.id)}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Ver detalhe completo
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
