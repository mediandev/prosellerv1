// LogisticaBuscaPage — busca paginada de fretes com filtros (R-LOG-2).
// Replica o `/logis_busca` do Bubble: filtros colapsáveis + lista paginada.

import { useEffect, useState, useCallback } from "react";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import {
  listFretes,
  transportadorService,
} from "../../services/logisticaService";
import FreteStatusBadge from "./FreteStatusBadge";
import { Eye, Filter, ChevronDown, ChevronUp } from "lucide-react";
import type { FreteLogisticaEnriched } from "@shared/types/frete-logistica";

const STATUS_OPTIONS = [
  "Em Separação",
  "Aguardando Coleta",
  "Em Trânsito",
  "Em Trânsito - Reentrega",
  "Entregue",
  "Agendado",
  "Recusado",
  "Devolvido - Trânsito",
  "Devolvido - Entregue",
];

const PAGE_SIZE = 20;

function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  // YYYY-MM-DD → DD/MM/YYYY (sem timezone surprise).
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return iso;
}

export default function LogisticaBuscaPage({
  onOpenFrete,
}: {
  onOpenFrete?: (id: string) => void;
}) {
  const [filtersOpen, setFiltersOpen] = useState(true);

  // Filtros
  const [clienteIdFilter, setClienteIdFilter] = useState("");
  const [transportadorIdFilter, setTransportadorIdFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [nfeNumero, setNfeNumero] = useState("");

  const [transportadores, setTransportadores] = useState<{ id: string; razaoSocial: string }[]>([]);

  // Lista
  const [fretes, setFretes] = useState<FreteLogisticaEnriched[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (nextPage = 0) => {
      setLoading(true);
      setError(null);
      try {
        const data = await listFretes({
          clienteId: clienteIdFilter ? Number(clienteIdFilter) : undefined,
          transportadorId: transportadorIdFilter ? Number(transportadorIdFilter) : undefined,
          statusEntrega: statusFilter.length > 0 ? statusFilter : undefined,
          dataInicio: dataInicio || undefined,
          dataFim: dataFim || undefined,
          nfeNumero: nfeNumero || undefined,
          limit: PAGE_SIZE,
          offset: nextPage * PAGE_SIZE,
        });
        setFretes(data.fretes ?? []);
        setTotal(data.total ?? 0);
        setPage(nextPage);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao buscar fretes");
      } finally {
        setLoading(false);
      }
    },
    [clienteIdFilter, transportadorIdFilter, statusFilter, dataInicio, dataFim, nfeNumero],
  );

  useEffect(() => {
    (async () => {
      try {
        const t = (await transportadorService.list({ apenasAtivos: true })) as {
          transportadores: { id: string; razaoSocial: string }[];
        };
        setTransportadores(t?.transportadores ?? []);
      } catch {/* ignora */}
    })();
    fetchPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleStatus(status: string) {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
  }

  function clearFilters() {
    setClienteIdFilter("");
    setTransportadorIdFilter("");
    setStatusFilter([]);
    setDataInicio("");
    setDataFim("");
    setNfeNumero("");
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Busca de Fretes</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <Filter className="h-4 w-4 mr-1" />
          Filtros
          {filtersOpen ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
        </Button>
      </div>

      {filtersOpen && (
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="f-cli">Cliente ID</Label>
              <Input
                id="f-cli"
                type="number"
                placeholder="ex.: 1024"
                value={clienteIdFilter}
                onChange={(e) => setClienteIdFilter(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="f-tra">Transportador</Label>
              <select
                id="f-tra"
                value={transportadorIdFilter}
                onChange={(e) => setTransportadorIdFilter(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— todos —</option>
                {transportadores.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.razaoSocial}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="f-nfe">Nº NFe (contém)</Label>
              <Input
                id="f-nfe"
                placeholder="ex.: 9999"
                value={nfeNumero}
                onChange={(e) => setNfeNumero(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="f-di">Data emissão (de)</Label>
              <Input
                id="f-di"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="f-df">Data emissão (até)</Label>
              <Input
                id="f-df"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label className="block mb-1">Status entrega</Label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleStatus(s)}
                  className={
                    "rounded-md border px-2 py-1 text-xs " +
                    (statusFilter.includes(s)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-input hover:bg-muted")
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => fetchPage(0)} disabled={loading}>
              {loading ? "Buscando..." : "Aplicar filtros"}
            </Button>
            <Button variant="outline" onClick={clearFilters} disabled={loading}>
              Limpar
            </Button>
          </div>
        </Card>
      )}

      {error && (
        <Card className="p-3 text-sm text-destructive border-destructive/40">{error}</Card>
      )}

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3 text-sm text-muted-foreground">
          <span>
            {total === 0
              ? loading
                ? "Buscando..."
                : "Nenhum frete encontrado."
              : `Mostrando ${fretes.length} de ${total} (página ${page + 1}/${totalPages})`}
          </span>
        </div>

        {fretes.length > 0 && (
          <ul className="divide-y">
            {fretes.map((f) => (
              <li
                key={f.id}
                className="py-3 flex items-start justify-between gap-4 hover:bg-muted/50 px-2 -mx-2 rounded-md cursor-pointer"
                onClick={() => onOpenFrete?.(f.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{f.clienteNome ?? "Cliente não definido"}</p>
                    <FreteStatusBadge status={f.statusEntrega} className="text-[10px]" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    NFe {f.nfeNumero ?? "—"} · {f.transportadorRazaoSocial ?? "Transp. não definido"} · saída {formatDateBR(f.dataSaida)} · emissão {formatDateBR(f.dataEmissao)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFrete?.(f.id);
                  }}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Visualizar
                </Button>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPage(Math.max(0, page - 1))}
              disabled={loading || page === 0}
            >
              Anterior
            </Button>
            <span className="text-xs text-muted-foreground">
              Página {page + 1} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPage(Math.min(totalPages - 1, page + 1))}
              disabled={loading || page >= totalPages - 1}
            >
              Próxima
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
