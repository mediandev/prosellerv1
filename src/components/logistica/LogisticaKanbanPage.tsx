// LogisticaKanbanPage — board Kanban com drag-and-drop entre colunas de status.
// Arrastar um card muda statusEntrega via freteService.update (optimistic).
// Usa API nativa HTML5 DnD — sem dependência extra.

import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { listFretes, freteService } from "../../services/logisticaService";
import FreteStatusBadge from "./FreteStatusBadge";
import type { FreteLogisticaEnriched } from "@shared/types/frete-logistica";

const COLUMNS = [
  "Em Separação",
  "Aguardando Coleta",
  "Em Trânsito",
  "Aguardando Agendamento",
  "Agendado",
  "Entregue",
  "Recusado",
  "Devolvido - Trânsito",
  "Devolvido - Entregue",
] as const;

type Status = (typeof COLUMNS)[number];

const COL_COLOR: Record<Status, string> = {
  "Em Separação": "border-t-blue-400",
  "Aguardando Coleta": "border-t-amber-400",
  "Em Trânsito": "border-t-sky-500",
  "Aguardando Agendamento": "border-t-violet-500",
  "Agendado": "border-t-orange-400",
  "Entregue": "border-t-green-500",
  "Recusado": "border-t-rose-500",
  "Devolvido - Trânsito": "border-t-slate-500",
  "Devolvido - Entregue": "border-t-slate-400",
};

export default function LogisticaKanbanPage({
  onOpenFrete,
}: {
  onOpenFrete?: (id: string) => void;
}) {
  const [fretes, setFretes] = useState<FreteLogisticaEnriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<Status | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listFretes({ limit: 200 });
      setFretes(data.fretes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar fretes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function byStatus(col: Status) {
    return fretes.filter((f) => f.statusEntrega === col);
  }

  async function handleDrop(targetCol: Status) {
    setDragOverCol(null);
    if (!draggingId) return;
    const frete = fretes.find((f) => f.id === draggingId);
    if (!frete || frete.statusEntrega === targetCol) return;

    const prev = frete.statusEntrega;
    // optimistic
    setFretes((fs) =>
      fs.map((f) => (f.id === draggingId ? { ...f, statusEntrega: targetCol } : f)),
    );
    setSavingId(draggingId);
    try {
      await freteService.update(draggingId, { statusEntrega: targetCol });
    } catch {
      // rollback
      setFretes((fs) =>
        fs.map((f) => (f.id === draggingId ? { ...f, statusEntrega: prev } : f)),
      );
    } finally {
      setSavingId(null);
      setDraggingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Kanban de Fretes</h2>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? "Carregando..." : "Atualizar"}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div
        className="flex gap-3 overflow-x-auto pb-4"
        style={{ minHeight: "60vh" }}
      >
        {COLUMNS.map((col) => {
          const items = byStatus(col);
          const isOver = dragOverCol === col;
          return (
            <div
              key={col}
              className={[
                "flex-shrink-0 w-52 rounded-lg border-t-4 bg-muted/40 flex flex-col",
                COL_COLOR[col],
                isOver ? "ring-2 ring-primary bg-muted/70" : "",
              ].join(" ")}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCol(col);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverCol(null);
                }
              }}
              onDrop={() => handleDrop(col)}
            >
              {/* cabeçalho */}
              <div className="px-3 py-2 flex items-center justify-between sticky top-0 bg-muted/80 backdrop-blur-sm rounded-t-lg z-10">
                <span className="text-xs font-semibold truncate">{col}</span>
                <span className="text-xs text-muted-foreground tabular-nums ml-1">
                  {items.length}
                </span>
              </div>

              {/* cards */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {items.length === 0 && (
                  <div
                    className={[
                      "rounded-md border-2 border-dashed text-xs text-muted-foreground text-center py-6",
                      isOver ? "border-primary" : "border-border",
                    ].join(" ")}
                  >
                    {isOver ? "Soltar aqui" : "vazio"}
                  </div>
                )}
                {items.map((f) => {
                  const isDragging = draggingId === f.id;
                  const isSaving = savingId === f.id;
                  return (
                    <div
                      key={f.id}
                      draggable
                      onDragStart={() => setDraggingId(f.id)}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDragOverCol(null);
                      }}
                      onClick={() => !isDragging && onOpenFrete?.(f.id)}
                      className={[
                        "rounded-md border bg-background p-2 text-xs select-none transition-opacity",
                        "hover:bg-accent cursor-grab active:cursor-grabbing",
                        isDragging ? "opacity-40" : "",
                        isSaving ? "opacity-60 pointer-events-none" : "",
                      ].join(" ")}
                    >
                      <div className="font-medium truncate">
                        NFe {f.nfeNumero ?? "—"}
                      </div>
                      {f.clienteNome && (
                        <div className="text-muted-foreground truncate mt-0.5">
                          {f.clienteNome}
                        </div>
                      )}
                      <div className="text-muted-foreground truncate">
                        {f.transportadorRazaoSocial ?? "—"}
                      </div>
                      {typeof f.diasEmTransito === "number" && (
                        <div className="text-muted-foreground">
                          {f.diasEmTransito}d em trânsito
                        </div>
                      )}
                      {isSaving && (
                        <div className="text-[10px] text-muted-foreground mt-1">
                          salvando...
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* drop zone extra quando coluna não está vazia */}
                {items.length > 0 && isOver && (
                  <div className="rounded-md border-2 border-dashed border-primary text-xs text-primary text-center py-3">
                    Soltar aqui
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
