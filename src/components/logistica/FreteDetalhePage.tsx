// FreteDetalhePage — detalhe do frete + timeline + upload de comprovante.
// F-LOG-CRM R-LOG-2. Layout espelha `/logis_busca` > visualização do Bubble.
// Upload via <input type="file" capture="environment"> (câmera HTML5).
// Bucket Supabase Storage: `logistica-comprovantes` (privado, autenticado).

import { useEffect, useState, useRef } from "react";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { ArrowLeft, Save, Camera, Paperclip } from "lucide-react";
import {
  getFreteWithOcorrencias,
  freteService,
  transportadorService,
} from "../../services/logisticaService";
import FreteStatusBadge from "./FreteStatusBadge";
import FreteOcorrenciaTimeline from "./FreteOcorrenciaTimeline";
import { supabase } from "../../services/supabase";
import type {
  FreteLogisticaEnriched,
  OcorrenciaSSW,
} from "@shared/types/frete-logistica";

const STATUS_OPTIONS = [
  "Em Separação",
  "Aguardando Coleta",
  "Em Trânsito",
  "Aguardando Agendamento",
  "Agendado",
  "Entregue",
  "Recusado",
  "Devolvido - Trânsito",
  "Devolvido - Entregue",
];

const BUCKET_NAME = "logistica-comprovantes";

function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return iso;
}

interface FormState {
  statusEntrega: string;
  dataSaida: string;
  previsaoEntrega: string;
  dataEntrega: string;
  transportadorId: string;
  valorCotacao: string;
  volumes: string;
  observacoes: string;
  dacteUrl: string;
  comprovanteEntregaUrl: string;
}

export default function FreteDetalhePage({
  freteId,
  onBack,
}: {
  freteId: string;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [frete, setFrete] = useState<FreteLogisticaEnriched | null>(null);
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaSSW[]>([]);
  const [transportadores, setTransportadores] = useState<{ id: string; razaoSocial: string }[]>([]);

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    statusEntrega: "Em Separação",
    dataSaida: "",
    previsaoEntrega: "",
    dataEntrega: "",
    transportadorId: "",
    valorCotacao: "",
    volumes: "",
    observacoes: "",
    dacteUrl: "",
    comprovanteEntregaUrl: "",
  });

  const comprovanteRef = useRef<HTMLInputElement | null>(null);
  const dacteRef = useRef<HTMLInputElement | null>(null);
  const [uploadingComp, setUploadingComp] = useState(false);
  const [uploadingDacte, setUploadingDacte] = useState(false);
  const [bucketAvailable, setBucketAvailable] = useState<boolean | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getFreteWithOcorrencias(freteId);
      setFrete(data.frete);
      setOcorrencias(data.ocorrencias);
      if (data.frete) {
        setForm({
          statusEntrega: data.frete.statusEntrega || "Em Separação",
          dataSaida: data.frete.dataSaida ?? "",
          previsaoEntrega: data.frete.previsaoEntrega ?? "",
          dataEntrega: data.frete.dataEntrega ?? "",
          transportadorId: data.frete.transportadorId != null ? String(data.frete.transportadorId) : "",
          valorCotacao: data.frete.valorCotacao != null ? String(data.frete.valorCotacao) : "",
          volumes: data.frete.volumes != null ? String(data.frete.volumes) : "",
          observacoes: data.frete.observacoes ?? "",
          dacteUrl: data.frete.dacteUrl ?? "",
          comprovanteEntregaUrl: data.frete.comprovanteEntregaUrl ?? "",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar frete");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    (async () => {
      try {
        const t = (await transportadorService.list({ apenasAtivos: true })) as {
          transportadores: { id: string; razaoSocial: string }[];
        };
        setTransportadores(t?.transportadores ?? []);
      } catch {/* ignora */}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freteId]);

  async function handleUpload(
    file: File,
    field: "comprovanteEntregaUrl" | "dacteUrl",
  ): Promise<string | null> {
    if (!file) return null;
    const ext = file.name.split(".").pop() || "bin";
    const path = `frete-${freteId}/${field}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET_NAME).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
    if (upErr) {
      // Mensagem clara quando o bucket não existe (T7 pode não ter rodado ainda).
      if (/bucket.*not.*found/i.test(upErr.message)) {
        setBucketAvailable(false);
      }
      throw upErr;
    }
    setBucketAvailable(true);
    // Bucket é privado — usamos signed URL longa para preview/download (1 ano).
    const { data: signed } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    return signed?.signedUrl ?? null;
  }

  async function onSelectComprovante(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingComp(true);
    setSaveMessage(null);
    try {
      const url = await handleUpload(file, "comprovanteEntregaUrl");
      if (url) {
        setForm((f) => ({
          ...f,
          comprovanteEntregaUrl: url,
          // Auto-atualiza status para Entregue ao salvar comprovante
          statusEntrega: f.statusEntrega === "Entregue" ? f.statusEntrega : "Entregue",
        }));
      }
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Falha no upload do comprovante");
    } finally {
      setUploadingComp(false);
      if (comprovanteRef.current) comprovanteRef.current.value = "";
    }
  }

  async function onSelectDacte(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDacte(true);
    setSaveMessage(null);
    try {
      const url = await handleUpload(file, "dacteUrl");
      if (url) setForm((f) => ({ ...f, dacteUrl: url }));
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Falha no upload do DACTE");
    } finally {
      setUploadingDacte(false);
      if (dacteRef.current) dacteRef.current.value = "";
    }
  }

  async function handleSave() {
    if (!frete) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const patch: Record<string, unknown> = {
        statusEntrega: form.statusEntrega,
        dataSaida: form.dataSaida || null,
        previsaoEntrega: form.previsaoEntrega || null,
        dataEntrega: form.dataEntrega || null,
        transportadorId: form.transportadorId ? Number(form.transportadorId) : null,
        valorCotacao: form.valorCotacao !== "" ? Number(form.valorCotacao) : null,
        volumes: form.volumes !== "" ? Number(form.volumes) : null,
        observacoes: form.observacoes || null,
        dacteUrl: form.dacteUrl || null,
        comprovanteEntregaUrl: form.comprovanteEntregaUrl || null,
      };
      await freteService.update(frete.id, patch);
      setSaveMessage("Frete atualizado com sucesso.");
      setEditMode(false);
      await load();
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Falha ao salvar frete");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">Carregando frete...</div>
    );
  }

  if (error || !frete) {
    return (
      <div className="space-y-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
        <Card className="p-4 text-sm text-destructive border-destructive/40">
          {error ?? "Frete não encontrado."}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <h2 className="text-lg font-semibold">
            Acompanhamento NFe {frete.nfeNumero ?? "—"}
          </h2>
          <FreteStatusBadge status={frete.statusEntrega} />
        </div>
        <div className="flex items-center gap-2">
          {!editMode ? (
            <Button onClick={() => setEditMode(true)}>Editar</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => { setEditMode(false); load(); }}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-1" />
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </>
          )}
        </div>
      </div>

      {saveMessage && (
        <Card className="p-3 text-sm">{saveMessage}</Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Identificação */}
        <Card className="p-4 space-y-3">
          <h3 className="font-medium">Identificação</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <Label className="text-muted-foreground">Nº NFe</Label>
              <p className="font-medium">{frete.nfeNumero ?? "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Chave NFe</Label>
              <p className="font-medium break-all text-xs">{frete.nfeChaveAcesso ?? "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Cliente</Label>
              <p className="font-medium">{frete.clienteNome ?? "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Empresa</Label>
              <p className="font-medium">{frete.empresaNome ?? `Empresa #${frete.empresaId}`}</p>
            </div>
          </div>
        </Card>

        {/* 2. Status */}
        <Card className="p-4 space-y-3">
          <h3 className="font-medium">Status</h3>
          {editMode ? (
            <div>
              <Label htmlFor="st">Status entrega</Label>
              <select
                id="st"
                value={form.statusEntrega}
                onChange={(e) => setForm({ ...form, statusEntrega: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          ) : (
            <FreteStatusBadge status={frete.statusEntrega} />
          )}
          <div className="text-xs text-muted-foreground">
            {typeof frete.diasEmTransito === "number"
              ? `${frete.diasEmTransito} dias em trânsito desde a saída.`
              : "Sem trânsito ativo."}
          </div>
        </Card>

        {/* 3. Datas */}
        <Card className="p-4 space-y-3">
          <h3 className="font-medium">Datas</h3>
          {editMode ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <Label htmlFor="ds">Saída</Label>
                <Input id="ds" type="date" value={form.dataSaida} onChange={(e) => setForm({ ...form, dataSaida: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="pe">Previsão</Label>
                <Input id="pe" type="date" value={form.previsaoEntrega} onChange={(e) => setForm({ ...form, previsaoEntrega: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="de">Entrega</Label>
                <Input id="de" type="date" value={form.dataEntrega} onChange={(e) => setForm({ ...form, dataEntrega: e.target.value })} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <Label className="text-muted-foreground">Emissão</Label>
                <p className="font-medium">{formatDateBR(frete.dataEmissao)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Saída</Label>
                <p className="font-medium">{formatDateBR(frete.dataSaida)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Previsão</Label>
                <p className="font-medium">{formatDateBR(frete.previsaoEntrega)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Entrega</Label>
                <p className="font-medium">{formatDateBR(frete.dataEntrega)}</p>
              </div>
            </div>
          )}
        </Card>

        {/* 4. Transportador */}
        <Card className="p-4 space-y-3">
          <h3 className="font-medium">Transportador</h3>
          {editMode ? (
            <div>
              <Label htmlFor="tra">Transportador</Label>
              <select
                id="tra"
                value={form.transportadorId}
                onChange={(e) => setForm({ ...form, transportadorId: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— selecionar —</option>
                {transportadores.map((t) => (
                  <option key={t.id} value={t.id}>{t.razaoSocial}</option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-sm font-medium">{frete.transportadorRazaoSocial ?? "—"}</p>
          )}
        </Card>

        {/* 5. Valores */}
        <Card className="p-4 space-y-3">
          <h3 className="font-medium">Valores</h3>
          {editMode ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <Label htmlFor="vc">Valor cotação (R$)</Label>
                <Input id="vc" type="number" step="0.01" value={form.valorCotacao} onChange={(e) => setForm({ ...form, valorCotacao: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="vol">Volumes</Label>
                <Input id="vol" type="number" value={form.volumes} onChange={(e) => setForm({ ...form, volumes: e.target.value })} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <Label className="text-muted-foreground">Valor produtos</Label>
                <p className="font-medium">R$ {Number(frete.valorProdutos || 0).toFixed(2)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Valor cotação</Label>
                <p className="font-medium">
                  {frete.valorCotacao != null ? `R$ ${Number(frete.valorCotacao).toFixed(2)}` : "—"}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Volumes</Label>
                <p className="font-medium">{frete.volumes ?? "—"}</p>
              </div>
            </div>
          )}
        </Card>

        {/* 6. Anexos */}
        <Card className="p-4 space-y-3">
          <h3 className="font-medium">Anexos</h3>
          <div className="space-y-3 text-sm">
            <div>
              <Label className="text-muted-foreground">DACTE</Label>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {form.dacteUrl ? (
                  <a href={form.dacteUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-sm underline truncate max-w-[200px]">
                    Ver DACTE
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">Sem DACTE anexado</span>
                )}
                {editMode && (
                  <>
                    <input
                      ref={dacteRef}
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={onSelectDacte}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => dacteRef.current?.click()}
                      disabled={uploadingDacte}
                    >
                      <Paperclip className="h-4 w-4 mr-1" />
                      {uploadingDacte ? "Enviando..." : "Anexar DACTE"}
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Comprovante de entrega</Label>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {form.comprovanteEntregaUrl ? (
                  <a href={form.comprovanteEntregaUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-sm underline truncate max-w-[200px]">
                    Ver comprovante
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">Sem comprovante anexado</span>
                )}
                {editMode && (
                  <>
                    <input
                      ref={comprovanteRef}
                      type="file"
                      accept="image/*,application/pdf"
                      capture="environment"
                      className="hidden"
                      onChange={onSelectComprovante}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => comprovanteRef.current?.click()}
                      disabled={uploadingComp}
                    >
                      <Camera className="h-4 w-4 mr-1" />
                      {uploadingComp ? "Enviando..." : "Tirar foto / Anexar"}
                    </Button>
                  </>
                )}
              </div>
              {bucketAvailable === false && (
                <p className="text-xs text-amber-700 mt-1">
                  Bucket `logistica-comprovantes` ainda não foi criado neste projeto. Upload em breve.
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* 7. Observações */}
        <Card className="p-4 space-y-3 lg:col-span-2">
          <h3 className="font-medium">Observações</h3>
          {editMode ? (
            <Input
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              placeholder="Anotações internas sobre este frete"
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap">{frete.observacoes || "—"}</p>
          )}
        </Card>
      </div>

      {/* Timeline */}
      <Card className="p-4 space-y-3">
        <h3 className="font-medium">Atualizações no Transportador</h3>
        <FreteOcorrenciaTimeline ocorrencias={ocorrencias} />
      </Card>
    </div>
  );
}
