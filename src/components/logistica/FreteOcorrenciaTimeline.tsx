// FreteOcorrenciaTimeline — lista cronológica reversa de ocorrências SSW.
// F-LOG-CRM R-LOG-2. Placeholder visível quando lista vazia (R-LOG-4 popula).

import { Card } from "../ui/card";
import type { OcorrenciaSSW } from "@shared/types/frete-logistica";

function formatDataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso ?? "—";
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso ?? "—";
  }
}

export default function FreteOcorrenciaTimeline({
  ocorrencias,
}: {
  ocorrencias: OcorrenciaSSW[] | undefined;
}) {
  const items = ocorrencias ?? [];
  if (items.length === 0) {
    return (
      <Card className="p-4 text-sm text-muted-foreground border-dashed">
        Sem atualizações do transportador. Integração SSW chega na próxima
        entrega (R-LOG-4).
      </Card>
    );
  }
  return (
    <ol className="relative border-l border-border ml-3 space-y-4">
      {items.map((o) => (
        <li key={o.id} className="ml-4">
          <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-primary" />
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-medium">
              {o.codigoSsw ? `[${o.codigoSsw}] ` : ""}
              {o.descricaoOcorrencia ?? "Ocorrência sem descrição"}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDataHora(o.dataHora)}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {[o.cidade, o.uf, o.filial, o.dominio].filter(Boolean).join(" · ") || "Sem localização"}
          </div>
        </li>
      ))}
    </ol>
  );
}
