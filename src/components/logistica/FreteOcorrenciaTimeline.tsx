// FreteOcorrenciaTimeline — lista cronológica reversa de ocorrências SSW.
// F-LOG-CRM R-LOG-2 (estrutura) + R-LOG-4 (SSW tracking popula dados reais).

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

function dotColor(tipo: string | null | undefined): string {
  if (tipo === "Entrega") return "bg-green-500";
  if (tipo === "Cliente") return "bg-amber-500";
  return "bg-primary";
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
        Sem atualizações de rastreio. O tracking será atualizado
        automaticamente quando houver uma chave NFe vinculada.
      </Card>
    );
  }
  return (
    <ol className="relative border-l border-border ml-3 space-y-4">
      {items.map((o) => (
        <li key={o.id} className="ml-4">
          <span className={`absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full ${dotColor(o.tipo)}`} />
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-medium">
              {o.descricaoOcorrencia ?? "Ocorrência sem descrição"}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDataHora(o.dataHoraEfetiva ?? o.dataHora)}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {[o.cidade, o.uf, o.filial, o.dominio].filter(Boolean).join(" · ") || "Sem localização"}
          </div>
          {o.nomeRecebedor ? (
            <div className="text-xs text-green-700 dark:text-green-400 mt-0.5">
              Recebido por: {o.nomeRecebedor}
              {o.nroDocRecebedor ? ` (doc: ${o.nroDocRecebedor})` : ""}
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
