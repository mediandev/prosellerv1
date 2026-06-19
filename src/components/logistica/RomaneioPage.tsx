// RomaneioPage — lista e criação de Romaneios de Expedição.
// Sub-view da LogisticaPage (aba "Romaneio").
// Criação: seleciona fretes em Separação/Aguardando Coleta, define data + transportador,
// gera romaneio e baixa PDF automático.

import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { FileText, Plus, ArrowLeft, Download, Loader2, ChevronRight } from "lucide-react";
import {
  listRomaneios,
  getRomaneio,
  listarFretesDisponiveis,
  createRomaneio,
} from "../../services/romaneioService";
import { transportadorService } from "../../services/logisticaService";
import { romaneioToPdf } from "./romaneioToPdf";
import type {
  RomaneioListItem,
  RomaneioDetalhe,
  FreteDisponivel,
} from "../../services/romaneioService";

type View = "lista" | "criar" | "detalhe";

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

function fmtBRL(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Lista ──────────────────────────────────────────────────────────────────
function RomaneioLista({
  onCriar,
  onVerDetalhe,
}: {
  onCriar: () => void;
  onVerDetalhe: (id: string) => void;
}) {
  const [lista, setLista] = useState<RomaneioListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await listRomaneios();
      setLista(res.romaneios);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar romaneios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Romaneios de Expedição</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Atualizar"}
          </Button>
          <Button size="sm" onClick={onCriar}>
            <Plus className="h-4 w-4 mr-1" />
            Novo Romaneio
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {lista.length === 0 && !loading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum romaneio criado ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Nº</th>
                <th className="text-left px-4 py-2 font-medium">Data</th>
                <th className="text-left px-4 py-2 font-medium">Transportador</th>
                <th className="text-left px-4 py-2 font-medium">NFs</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 font-mono font-medium">
                    {String(r.numero).padStart(3, "0")}
                  </td>
                  <td className="px-4 py-2.5">{fmtDate(r.dataRomaneio)}</td>
                  <td className="px-4 py-2.5">{r.transportadorNome ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline">{r.qtdFretes} NF{r.qtdFretes !== 1 ? "s" : ""}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="ghost" size="sm" onClick={() => onVerDetalhe(r.id)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Criar ──────────────────────────────────────────────────────────────────
function RomaneioNovo({
  onBack,
  onCriado,
}: {
  onBack: () => void;
  onCriado: (id: string) => void;
}) {
  const [step, setStep] = useState<"config" | "selecionar">("config");
  const [dataRomaneio, setDataRomaneio] = useState(new Date().toISOString().slice(0, 10));
  const [transportadores, setTransportadores] = useState<{ id: string; razaoSocial: string }[]>([]);
  const [transportadorId, setTransportadorId] = useState<string>("");
  const [observacoes, setObservacoes] = useState("");
  const [fretes, setFretes] = useState<FreteDisponivel[]>([]);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [empresaId, setEmpresaId] = useState<number | null>(null);

  useEffect(() => {
    transportadorService
      .list({ apenasAtivos: true })
      .then((res) => {
        const r = res as { transportadores: { id: string; razaoSocial: string }[] };
        setTransportadores(r?.transportadores ?? []);
      })
      .catch(() => null);
  }, []);

  async function buscarFretes() {
    if (!dataRomaneio) return;
    setLoading(true);
    setError(null);
    try {
      // pega empresa_id do primeiro frete disponível — ou usa 1 como fallback
      const res = await listarFretesDisponiveis(
        empresaId ?? 1,
        transportadorId ? Number(transportadorId) : undefined,
      );
      setFretes(res.fretes);
      if (res.fretes.length > 0 && !empresaId) {
        // descobre empresa_id pelo contexto (não temos acesso direto ao usuário aqui)
      }
      setSelecionados(new Set());
      setStep("selecionar");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao buscar fretes");
    } finally {
      setLoading(false);
    }
  }

  async function gerarRomaneio() {
    if (selecionados.size === 0) return;
    setSaving(true);
    setError(null);
    try {
      const freteIdsSel = Array.from(selecionados);
      const res = await createRomaneio({
        empresaId: empresaId ?? 1,
        freteIds: freteIdsSel,
        dataRomaneio,
        transportadorId: transportadorId ? Number(transportadorId) : null,
        observacoes: observacoes || null,
      });
      onCriado(res.romaneioId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar romaneio");
    } finally {
      setSaving(false);
    }
  }

  function toggleSel(freteId: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(freteId)) next.delete(freteId);
      else next.add(freteId);
      return next;
    });
  }

  function toggleAll() {
    if (selecionados.size === fretes.length) setSelecionados(new Set());
    else setSelecionados(new Set(fretes.map((f) => f.freteId)));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={step === "config" ? onBack : () => setStep("config")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-base font-semibold">
          {step === "config" ? "Novo Romaneio" : "Selecionar NFs"}
        </h2>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {step === "config" && (
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Data do Romaneio *</Label>
                <Input
                  type="date"
                  value={dataRomaneio}
                  onChange={(e) => setDataRomaneio(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Transportador</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={transportadorId}
                  onChange={(e) => setTransportadorId(e.target.value)}
                >
                  <option value="">Todos / sem filtro</option>
                  {transportadores.map((t) => (
                    <option key={t.id} value={t.id}>{t.razaoSocial}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Observações</Label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[64px] resize-none"
                placeholder="Observações para o romaneio (opcional)"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>

            <Button
              className="w-full"
              onClick={buscarFretes}
              disabled={!dataRomaneio || loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Buscar NFs disponíveis
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "selecionar" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {fretes.length === 0
                ? "Nenhuma NF disponível para este filtro."
                : `${fretes.length} NF${fretes.length !== 1 ? "s" : ""} disponíve${fretes.length !== 1 ? "is" : "l"} — ${selecionados.size} selecionada${selecionados.size !== 1 ? "s" : ""}`}
            </p>
            {fretes.length > 0 && (
              <Button variant="outline" size="sm" onClick={toggleAll}>
                {selecionados.size === fretes.length ? "Desmarcar todos" : "Selecionar todos"}
              </Button>
            )}
          </div>

          {fretes.length > 0 && (
            <div className="border rounded-lg overflow-auto max-h-[55vh]">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 w-8"></th>
                    <th className="text-left px-3 py-2 font-medium">NF</th>
                    <th className="text-left px-3 py-2 font-medium">Pedido</th>
                    <th className="text-left px-3 py-2 font-medium">Destinatário</th>
                    <th className="text-left px-3 py-2 font-medium">Cidade / UF</th>
                    <th className="text-left px-3 py-2 font-medium">Vols.</th>
                    <th className="text-left px-3 py-2 font-medium">Peso (kg)</th>
                    <th className="text-right px-3 py-2 font-medium">Vlr. Produtos</th>
                  </tr>
                </thead>
                <tbody>
                  {fretes.map((f) => {
                    const sel = selecionados.has(f.freteId);
                    return (
                      <tr
                        key={f.freteId}
                        className={`border-t cursor-pointer transition-colors ${sel ? "bg-primary/5" : "hover:bg-muted/30"}`}
                        onClick={() => toggleSel(f.freteId)}
                      >
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            readOnly
                            checked={sel}
                            className="h-3.5 w-3.5"
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => toggleSel(f.freteId)}
                          />
                        </td>
                        <td className="px-3 py-2 font-mono">{f.nfeNumero ?? "—"}</td>
                        <td className="px-3 py-2 font-mono">{f.pedidoVendaId ?? "—"}</td>
                        <td className="px-3 py-2 max-w-[180px] truncate">{f.clienteNome ?? "—"}</td>
                        <td className="px-3 py-2">
                          {f.clienteCidade && f.clienteUf
                            ? `${f.clienteCidade} / ${f.clienteUf}`
                            : "—"}
                        </td>
                        <td className="px-3 py-2">{f.volumes ?? "—"}</td>
                        <td className="px-3 py-2">
                          {f.pesoBruto != null
                            ? f.pesoBruto.toLocaleString("pt-BR", { minimumFractionDigits: 3 })
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">{fmtBRL(f.valorProdutos)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Button
            className="w-full"
            onClick={gerarRomaneio}
            disabled={selecionados.size === 0 || saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
            {saving ? "Gerando..." : `Gerar romaneio com ${selecionados.size} NF${selecionados.size !== 1 ? "s" : ""}`}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Detalhe ────────────────────────────────────────────────────────────────
function RomaneioDetalheView({
  romaneioId,
  onBack,
  autoDownload,
}: {
  romaneioId: string;
  onBack: () => void;
  autoDownload?: boolean;
}) {
  const [rom, setRom] = useState<RomaneioDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getRomaneio(romaneioId)
      .then((data) => {
        setRom(data);
        if (autoDownload) {
          setTimeout(() => romaneioToPdf(data), 300);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar romaneio"))
      .finally(() => setLoading(false));
  }, [romaneioId, autoDownload]);

  function handleDownload() {
    if (!rom) return;
    setDownloading(true);
    try { romaneioToPdf(rom); } finally { setDownloading(false); }
  }

  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground">Carregando...</div>;
  if (error || !rom) return (
    <div className="space-y-3">
      <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
      <p className="text-sm text-destructive">{error ?? "Romaneio não encontrado."}</p>
    </div>
  );

  const totalVols = rom.totais.volumes;
  const totalPeso = rom.totais.pesoBruto;
  const totalProd = rom.totais.valorProdutos;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-base font-semibold">
            Romaneio Nº {String(rom.numero).padStart(3, "0")} — {fmtDate(rom.dataRomaneio)}
          </h2>
        </div>
        <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
          <Download className="h-4 w-4 mr-1" />
          Baixar PDF
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <Card>
          <CardContent className="pt-4 pb-3 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Empresa</p>
            <p className="font-medium">{rom.empresaNome ?? "—"}</p>
            {rom.empresaCnpj && <p className="text-muted-foreground">{rom.empresaCnpj}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Transportador</p>
            <p className="font-medium">{rom.transportadorNome ?? "—"}</p>
            {rom.transportadorCnpj && <p className="text-muted-foreground">{rom.transportadorCnpj}</p>}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4 text-sm">
        <span className="text-muted-foreground">Volumes totais: <strong>{totalVols}</strong></span>
        <span className="text-muted-foreground">Peso total: <strong>{totalPeso.toLocaleString("pt-BR", { minimumFractionDigits: 3 })} kg</strong></span>
        <span className="text-muted-foreground">Valor total produtos: <strong>{fmtBRL(totalProd)}</strong></span>
      </div>

      {rom.observacoes && (
        <p className="text-sm text-muted-foreground italic">{rom.observacoes}</p>
      )}

      <div className="border rounded-lg overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-3 py-2 font-medium">#</th>
              <th className="text-left px-3 py-2 font-medium">NF</th>
              <th className="text-left px-3 py-2 font-medium">Pedido</th>
              <th className="text-left px-3 py-2 font-medium">Destinatário</th>
              <th className="text-left px-3 py-2 font-medium">Cidade / UF</th>
              <th className="text-left px-3 py-2 font-medium">CEP</th>
              <th className="text-left px-3 py-2 font-medium">Vols.</th>
              <th className="text-left px-3 py-2 font-medium">Peso (kg)</th>
              <th className="text-right px-3 py-2 font-medium">Vlr. Produtos</th>
            </tr>
          </thead>
          <tbody>
            {rom.fretes.map((f, i) => (
              <tr key={f.freteId} className="border-t">
                <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                <td className="px-3 py-2 font-mono">{f.nfeNumero ?? "—"}</td>
                <td className="px-3 py-2 font-mono">{f.pedidoVendaId ?? "—"}</td>
                <td className="px-3 py-2 max-w-[180px] truncate">{f.clienteNome ?? "—"}</td>
                <td className="px-3 py-2">
                  {f.clienteCidade && f.clienteUf ? `${f.clienteCidade} / ${f.clienteUf}` : "—"}
                </td>
                <td className="px-3 py-2">{f.clienteCep ?? "—"}</td>
                <td className="px-3 py-2">{f.volumes ?? "—"}</td>
                <td className="px-3 py-2">
                  {f.pesoBruto != null
                    ? f.pesoBruto.toLocaleString("pt-BR", { minimumFractionDigits: 3 })
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right">{fmtBRL(f.valorProdutos)}</td>
              </tr>
            ))}
            <tr className="border-t bg-muted/30 font-semibold text-xs">
              <td colSpan={6} className="px-3 py-2 text-right">TOTAL</td>
              <td className="px-3 py-2">{totalVols}</td>
              <td className="px-3 py-2">
                {totalPeso.toLocaleString("pt-BR", { minimumFractionDigits: 3 })}
              </td>
              <td className="px-3 py-2 text-right">{fmtBRL(totalProd)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Container principal ─────────────────────────────────────────────────────
export default function RomaneioPage() {
  const [view, setView] = useState<View>("lista");
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [autoDownload, setAutoDownload] = useState(false);

  function handleCriado(id: string) {
    setDetalheId(id);
    setAutoDownload(true);
    setView("detalhe");
  }

  function handleVerDetalhe(id: string) {
    setDetalheId(id);
    setAutoDownload(false);
    setView("detalhe");
  }

  if (view === "criar") {
    return <RomaneioNovo onBack={() => setView("lista")} onCriado={handleCriado} />;
  }

  if (view === "detalhe" && detalheId) {
    return (
      <RomaneioDetalheView
        romaneioId={detalheId}
        onBack={() => { setView("lista"); setDetalheId(null); setAutoDownload(false); }}
        autoDownload={autoDownload}
      />
    );
  }

  return (
    <RomaneioLista
      onCriar={() => setView("criar")}
      onVerDetalhe={handleVerDetalhe}
    />
  );
}
