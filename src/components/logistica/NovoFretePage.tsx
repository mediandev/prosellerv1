// NovoFretePage — form de criação manual de frete. F-LOG-CRM R-LOG-1.
// Cobre o caminho mínimo do "/logis_nova-nfe" do Bubble — campos opcionais.
// Lookups (transportador, região, origem) são carregados via select.

import { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import {
  freteService,
  transportadorService,
  regiaoDestinoService,
  origemFreteService,
} from "../../services/logisticaService";

interface Option {
  id: string;
  label: string;
}

const statusOptions = [
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

export default function NovoFretePage() {
  const [transportadores, setTransportadores] = useState<Option[]>([]);
  const [regioes, setRegioes] = useState<Option[]>([]);
  const [origens, setOrigens] = useState<Option[]>([]);

  const [nfeNumero, setNfeNumero] = useState("");
  const [empresaId, setEmpresaId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [transportadorId, setTransportadorId] = useState("");
  const [regiaoDestinoId, setRegiaoDestinoId] = useState("");
  const [origemFreteId, setOrigemFreteId] = useState("");
  const [dataSaida, setDataSaida] = useState("");
  const [previsaoEntrega, setPrevisaoEntrega] = useState("");
  const [valorProdutos, setValorProdutos] = useState("0");
  const [valorCotacao, setValorCotacao] = useState("");
  const [volumes, setVolumes] = useState("");
  const [statusEntrega, setStatusEntrega] = useState("Em Separação");
  const [observacoes, setObservacoes] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const t = (await transportadorService.list({ apenasAtivos: true })) as {
          transportadores: { id: string; razaoSocial: string }[];
        };
        setTransportadores(
          (t?.transportadores || []).map((row) => ({ id: row.id, label: row.razaoSocial })),
        );
      } catch {/* ignore na carga inicial */}
      try {
        const r = (await regiaoDestinoService.list({ apenasAtivos: true })) as {
          regioes: { id: string; nome: string }[];
        };
        setRegioes((r?.regioes || []).map((row) => ({ id: row.id, label: row.nome })));
      } catch {/* ignore */}
      try {
        const o = (await origemFreteService.list({ apenasAtivos: true })) as {
          origens: { id: string; nome: string }[];
        };
        setOrigens((o?.origens || []).map((row) => ({ id: row.id, label: row.nome })));
      } catch {/* ignore */}
    })();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const empresaIdNum = Number(empresaId);
      if (!empresaIdNum || empresaIdNum <= 0) {
        setMessage("Empresa ID obrigatório.");
        return;
      }
      const payload: Record<string, unknown> = {
        empresaId: empresaIdNum,
        statusEntrega,
        valorProdutos: Number(valorProdutos) || 0,
      };
      if (nfeNumero) payload.nfeNumero = Number(nfeNumero);
      if (clienteId) payload.clienteId = Number(clienteId);
      if (transportadorId) payload.transportadorId = Number(transportadorId);
      if (regiaoDestinoId) payload.regiaoDestinoId = Number(regiaoDestinoId);
      if (origemFreteId) payload.origemFreteId = Number(origemFreteId);
      if (dataSaida) payload.dataSaida = dataSaida;
      if (previsaoEntrega) payload.previsaoEntrega = previsaoEntrega;
      if (valorCotacao) payload.valorCotacao = Number(valorCotacao);
      if (volumes) payload.volumes = Number(volumes);
      if (observacoes) payload.observacoes = observacoes;

      const saved = (await freteService.create(payload)) as { id?: string };
      setMessage(saved?.id ? `Frete criado (id ${saved.id}).` : "Frete criado.");
      setNfeNumero("");
      setClienteId("");
      setValorProdutos("0");
      setValorCotacao("");
      setVolumes("");
      setObservacoes("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha ao criar frete");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold mb-3">Novo Frete (manual)</h2>
      <form className="grid grid-cols-1 sm:grid-cols-2 gap-3" onSubmit={handleSave}>
        <div>
          <Label htmlFor="empresa">Empresa ID *</Label>
          <Input
            id="empresa"
            type="number"
            value={empresaId}
            onChange={(e) => setEmpresaId(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="nfe">Nº NFe</Label>
          <Input id="nfe" type="number" value={nfeNumero} onChange={(e) => setNfeNumero(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="cli">Cliente ID</Label>
          <Input id="cli" type="number" value={clienteId} onChange={(e) => setClienteId(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="tra">Transportador</Label>
          <select
            id="tra"
            value={transportadorId}
            onChange={(e) => setTransportadorId(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">— selecionar —</option>
            {transportadores.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="reg">Região destino</Label>
          <select
            id="reg"
            value={regiaoDestinoId}
            onChange={(e) => setRegiaoDestinoId(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">— selecionar —</option>
            {regioes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="ori">Origem</Label>
          <select
            id="ori"
            value={origemFreteId}
            onChange={(e) => setOrigemFreteId(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">— selecionar —</option>
            {origens.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="ds">Data de saída</Label>
          <Input id="ds" type="date" value={dataSaida} onChange={(e) => setDataSaida(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="pe">Previsão de entrega</Label>
          <Input id="pe" type="date" value={previsaoEntrega} onChange={(e) => setPrevisaoEntrega(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="vp">Valor produtos (R$)</Label>
          <Input id="vp" type="number" step="0.01" value={valorProdutos} onChange={(e) => setValorProdutos(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="vc">Valor cotação (R$)</Label>
          <Input id="vc" type="number" step="0.01" value={valorCotacao} onChange={(e) => setValorCotacao(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="vol">Volumes</Label>
          <Input id="vol" type="number" value={volumes} onChange={(e) => setVolumes(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="st">Status entrega</Label>
          <select
            id="st"
            value={statusEntrega}
            onChange={(e) => setStatusEntrega(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="obs">Observações</Label>
          <Input id="obs" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        </div>
        <div className="sm:col-span-2 flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar frete"}
          </Button>
          {message && <span className="text-sm text-muted-foreground">{message}</span>}
        </div>
      </form>
    </Card>
  );
}
