// NovoFretePage — criação manual de frete com busca de pedido.
// R-LOG-1: usuário busca pedido faturado → auto-preenche cliente/empresa/valor.

import { useEffect, useRef, useState } from "react";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Search, X } from "lucide-react";
import {
  freteService,
  transportadorService,
  regiaoDestinoService,
  origemFreteService,
  searchPedidos,
  type PedidoOption,
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

  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<PedidoOption[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<PedidoOption | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [pedidoVendaId, setPedidoVendaId] = useState<number | null>(null);
  const [empresaId, setEmpresaId] = useState("");
  const [empresaNome, setEmpresaNome] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [transportadorId, setTransportadorId] = useState("");
  const [regiaoDestinoId, setRegiaoDestinoId] = useState("");
  const [origemFreteId, setOrigemFreteId] = useState("");
  const [dataSaida, setDataSaida] = useState("");
  const [previsaoEntrega, setPrevisaoEntrega] = useState("");
  const [valorProdutos, setValorProdutos] = useState("0");
  const [valorCotacao, setValorCotacao] = useState("");
  const [volumes, setVolumes] = useState("");
  const [nfeNumero, setNfeNumero] = useState("");
  const [nfeChaveAcesso, setNfeChaveAcesso] = useState("");
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
      } catch {/* ignore */}
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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleBuscar() {
    if (!busca.trim()) return;
    setBuscando(true);
    setShowDropdown(true);
    try {
      const res = await searchPedidos(busca.trim());
      setResultados(res);
    } catch {
      setResultados([]);
    } finally {
      setBuscando(false);
    }
  }

  function handleSelecionarPedido(pedido: PedidoOption) {
    setPedidoSelecionado(pedido);
    setPedidoVendaId(Number(pedido.id));
    setClienteId(String(pedido.clienteId));
    setClienteNome(pedido.nomeCliente);
    setEmpresaId(String(pedido.empresaFaturamentoId));
    setEmpresaNome(pedido.nomeEmpresaFaturamento);
    setValorProdutos(String(pedido.valorProdutos));
    setShowDropdown(false);
    setBusca("");
  }

  function handleLimparPedido() {
    setPedidoSelecionado(null);
    setPedidoVendaId(null);
    setClienteId("");
    setClienteNome("");
    setEmpresaId("");
    setEmpresaNome("");
    setValorProdutos("0");
    setBusca("");
    setResultados([]);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    const empresaIdNum = Number(empresaId);
    if (!empresaIdNum || empresaIdNum <= 0) {
      setMessage("Selecione um pedido ou informe a Empresa.");
      return;
    }

    if (nfeChaveAcesso && nfeChaveAcesso.length !== 44) {
      setMessage("Chave de acesso deve ter 44 dígitos.");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        empresaId: empresaIdNum,
        statusEntrega,
        valorProdutos: Number(valorProdutos) || 0,
      };
      if (pedidoVendaId) payload.pedidoVendaId = pedidoVendaId;
      if (nfeNumero) payload.nfeNumero = Number(nfeNumero);
      if (nfeChaveAcesso) payload.nfeChaveAcesso = nfeChaveAcesso;
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
      handleLimparPedido();
      setNfeNumero(""); setNfeChaveAcesso(""); setTransportadorId("");
      setRegiaoDestinoId(""); setOrigemFreteId(""); setDataSaida("");
      setPrevisaoEntrega(""); setValorCotacao(""); setVolumes("");
      setObservacoes(""); setStatusEntrega("Em Separação");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha ao criar frete");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold mb-4">Novo Frete</h2>
      <form className="grid grid-cols-1 sm:grid-cols-2 gap-3" onSubmit={handleSave}>

        <div className="sm:col-span-2">
          <Label>Buscar pedido</Label>
          {pedidoSelecionado ? (
            <div className="flex items-center gap-2 mt-1 rounded-md border border-input bg-muted px-3 py-2 text-sm">
              <span className="flex-1">
                <span className="font-medium">#{pedidoSelecionado.numero}</span>
                {" — "}{pedidoSelecionado.nomeCliente}
                <span className="text-muted-foreground ml-2">{pedidoSelecionado.nomeEmpresaFaturamento}</span>
              </span>
              <button type="button" onClick={handleLimparPedido} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative mt-1" ref={dropdownRef}>
              <div className="flex gap-2">
                <Input
                  placeholder="Nº pedido, cliente, CNPJ..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleBuscar())}
                />
                <Button type="button" variant="outline" onClick={handleBuscar} disabled={buscando}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              {showDropdown && (
                <div className="absolute z-10 w-full mt-1 rounded-md border border-input bg-background shadow-md">
                  {buscando ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Buscando...</div>
                  ) : resultados.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum pedido encontrado.</div>
                  ) : (
                    resultados.map((p) => (
                      <button key={p.id} type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                        onClick={() => handleSelecionarPedido(p)}>
                        <span className="font-medium">#{p.numero}</span>{" — "}{p.nomeCliente}
                        <span className="text-muted-foreground ml-2 text-xs">{p.nomeEmpresaFaturamento}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <Label>Empresa</Label>
          {empresaNome
            ? <div className="mt-1 rounded-md border border-input bg-muted px-3 py-2 text-sm">{empresaNome}</div>
            : <Input type="number" placeholder="ID da empresa" value={empresaId} onChange={(e) => setEmpresaId(e.target.value)} />}
        </div>
        <div>
          <Label>Cliente</Label>
          {clienteNome
            ? <div className="mt-1 rounded-md border border-input bg-muted px-3 py-2 text-sm">{clienteNome}</div>
            : <Input type="number" placeholder="ID do cliente" value={clienteId} onChange={(e) => setClienteId(e.target.value)} />}
        </div>

        <div>
          <Label htmlFor="nfe">Nº NF-e</Label>
          <Input id="nfe" type="number" placeholder="Número da nota" value={nfeNumero} onChange={(e) => setNfeNumero(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="chave">Chave de acesso (44 dígitos)</Label>
          <Input id="chave" placeholder="00000000000000000000000000000000000000000000"
            maxLength={44} value={nfeChaveAcesso}
            onChange={(e) => setNfeChaveAcesso(e.target.value.replace(/\D/g, "").slice(0, 44))} />
          {nfeChaveAcesso.length > 0 && nfeChaveAcesso.length < 44 && (
            <p className="text-xs text-destructive mt-0.5">{nfeChaveAcesso.length}/44 dígitos</p>
          )}
        </div>

        <div>
          <Label htmlFor="tra">Transportador</Label>
          <select id="tra" value={transportadorId} onChange={(e) => setTransportadorId(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">— selecionar —</option>
            {transportadores.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="reg">Região destino</Label>
          <select id="reg" value={regiaoDestinoId} onChange={(e) => setRegiaoDestinoId(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">— selecionar —</option>
            {regioes.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="ori">Origem</Label>
          <select id="ori" value={origemFreteId} onChange={(e) => setOrigemFreteId(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">— selecionar —</option>
            {origens.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="st">Status inicial</Label>
          <select id="st" value={statusEntrega} onChange={(e) => setStatusEntrega(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
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

        <div className="sm:col-span-2">
          <Label htmlFor="obs">Observações</Label>
          <Input id="obs" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        </div>

        <div className="sm:col-span-2 flex items-center gap-3">
          <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar frete"}</Button>
          {message && (
            <span className={`text-sm ${message.startsWith("Frete") ? "text-green-600" : "text-destructive"}`}>
              {message}
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}
