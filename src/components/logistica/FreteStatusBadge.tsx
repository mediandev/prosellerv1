// FreteStatusBadge — chip colorido para o status do frete. F-LOG-CRM R-LOG-2.
// Cores conforme prompt R-LOG-2: verde Entregue, azul Em Trânsito, amarelo
// Agendado, vermelho Recusado, cinza Devolvido / outros.

import { Badge } from "../ui/badge";

type Tone = "green" | "blue" | "yellow" | "red" | "gray" | "purple" | "orange";

const STATUS_TONE: Record<string, Tone> = {
  "Entregue": "green",
  "Em Trânsito": "blue",
  "Em Trânsito - Reentrega": "purple",
  "Aguardando Coleta": "orange",
  "Em Separação": "gray",
  "Agendado": "yellow",
  "Recusado": "red",
  "Devolvido - Trânsito": "gray",
  "Devolvido - Entregue": "gray",
};

const TONE_CLASSES: Record<Tone, string> = {
  green: "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100",
  blue: "bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-100",
  yellow: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100",
  red: "bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-100",
  gray: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100",
  purple: "bg-violet-100 text-violet-800 border-violet-200 hover:bg-violet-100",
  orange: "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100",
};

export default function FreteStatusBadge({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  if (!status) {
    return (
      <Badge variant="outline" className={className}>
        —
      </Badge>
    );
  }
  const tone = STATUS_TONE[status] ?? "gray";
  return (
    <Badge variant="outline" className={`${TONE_CLASSES[tone]} ${className ?? ""}`}>
      {status}
    </Badge>
  );
}
