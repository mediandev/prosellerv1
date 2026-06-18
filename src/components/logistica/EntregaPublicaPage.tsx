// EntregaPublicaPage — página pública para motoristas (sem login).
// Rota: /entrega — acessível sem autenticação.
// Spec: FUNCIONALIDADE DE COMPROVANTES DE ENTREGA.docx
// Fluxo: identificar NF por chave de acesso (manual ou barcode) →
//        confirmar entrega (foto) OU reportar agendamento.

import { useRef, useState } from "react";
import { Camera, QrCode, CheckCircle, Calendar, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card } from "../ui/card";

const SUPABASE_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  "https://xxoiqfraeolsqsmsheue.supabase.co";
const SUPABASE_ANON_KEY =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4b2lxZnJhZW9sc3FzbXNoZXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1ODQ5MDIsImV4cCI6MjA0MjE2MDkwMn0.m8A1mUf3GyAl_17FjltxkgBr-xRQYZw9YEDUVUBdttA";

async function callPublica(method: "GET" | "POST", params: Record<string, unknown>) {
  const base = `${SUPABASE_URL}/functions/v1/entrega-publica-v1`;
  let url = base;
  let body: string | undefined;

  if (method === "GET") {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined) q.set(k, String(v));
    url = `${base}?${q.toString()}`;
  } else {
    body = JSON.stringify(params);
  }

  const res = await fetch(url, {
    method,
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Erro ${res.status}`);
  return data?.data;
}

type Step = "identificar" | "confirmar" | "foto" | "agendar" | "sucesso";

interface FreteInfo {
  freteId: string;
  nfeNumero: number | null;
  clienteNome: string | null;
  empresaNome: string | null;
  statusEntrega: string;
}

export default function EntregaPublicaPage() {
  const [step, setStep] = useState<Step>("identificar");
  const [chave, setChave] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frete, setFrete] = useState<FreteInfo | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  // Agendamento
  const [dataAgendamento, setDataAgendamento] = useState("");
  const [horaAgendamento, setHoraAgendamento] = useState("");
  const [obsAgendamento, setObsAgendamento] = useState("");

  // Foto
  const fotoRef = useRef<HTMLInputElement>(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  // Barcode scanner
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scannerAtivo, setScannerAtivo] = useState(false);
  const scannerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function limparChave(raw: string) {
    return raw.replace(/\D/g, "").slice(0, 44);
  }

  async function handleIdentificar() {
    const c = limparChave(chave);
    if (c.length !== 44) {
      setError("A chave de acesso deve ter 44 dígitos.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await callPublica("GET", { chave: c });
      setFrete(data as FreteInfo);
      setStep("confirmar");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chave não encontrada.");
    } finally {
      setLoading(false);
    }
  }

  async function iniciarScanner() {
    setScannerAtivo(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // BarcodeDetector API (Chrome/Safari 17.4+)
      const BarcodeDetector = (window as any).BarcodeDetector;
      if (!BarcodeDetector) {
        pararScanner();
        setError("Seu navegador não suporta leitura de código de barras. Digite a chave manualmente.");
        return;
      }

      const detector = new BarcodeDetector({ formats: ["code_128", "code_39", "ean_13", "ean_8", "qr_code"] });

      scannerIntervalRef.current = setInterval(async () => {
        if (!videoRef.current) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          for (const bc of barcodes) {
            const raw = limparChave(bc.rawValue);
            if (raw.length === 44) {
              pararScanner();
              setChave(raw);
              return;
            }
          }
        } catch {/* ignore frame errors */}
      }, 300);
    } catch {
      setScannerAtivo(false);
      setError("Não foi possível acessar a câmera.");
    }
  }

  function pararScanner() {
    if (scannerIntervalRef.current) clearInterval(scannerIntervalRef.current);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setScannerAtivo(false);
  }

  async function handleFotoSelecionada(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !frete) return;
    setUploadingFoto(true);
    setError(null);
    try {
      // Converter para base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      await callPublica("POST", {
        action: "confirmar_entrega",
        freteId: frete.freteId,
        fotoBase64: base64,
        mimeType: file.type || "image/jpeg",
      });

      setSuccessMsg("Entrega confirmada com sucesso! Obrigado.");
      setStep("sucesso");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar foto.");
    } finally {
      setUploadingFoto(false);
      if (fotoRef.current) fotoRef.current.value = "";
    }
  }

  async function handleAgendar() {
    if (!frete || !dataAgendamento) {
      setError("Informe a data do agendamento.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await callPublica("POST", {
        action: "reportar_agendamento",
        freteId: frete.freteId,
        dataAgendamento,
        horaAgendamento: horaAgendamento || undefined,
        obsAgendamento: obsAgendamento || undefined,
      });
      setSuccessMsg("Agendamento registrado com sucesso!");
      setStep("sucesso");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao registrar agendamento.");
    } finally {
      setLoading(false);
    }
  }

  function voltar() {
    setError(null);
    if (step === "foto" || step === "agendar") setStep("confirmar");
    else { setStep("identificar"); setFrete(null); setChave(""); }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <div className="text-center pb-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
            <Camera className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold">Comprovante de Entrega</h1>
          <p className="text-sm text-muted-foreground">Confirme a entrega ou registre um agendamento</p>
        </div>

        {/* ── STEP: identificar ─────────────────────────────────────────── */}
        {step === "identificar" && (
          <Card className="p-5 space-y-4">
            <div>
              <Label htmlFor="chave">Chave de Acesso da NF-e (44 dígitos)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="chave"
                  inputMode="numeric"
                  placeholder="Digite ou escaneie o código de barras"
                  value={chave}
                  onChange={(e) => { setChave(limparChave(e.target.value)); setError(null); }}
                  maxLength={44}
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={scannerAtivo ? pararScanner : iniciarScanner}
                  title="Escanear código de barras"
                >
                  <QrCode className="w-4 h-4" />
                </Button>
              </div>
              {chave.length > 0 && chave.length < 44 && (
                <p className="text-xs text-muted-foreground mt-1">{chave.length}/44 dígitos</p>
              )}
            </div>

            {/* Scanner de câmera */}
            {scannerAtivo && (
              <div className="rounded-lg overflow-hidden border border-input bg-black aspect-video">
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              className="w-full"
              onClick={handleIdentificar}
              disabled={loading || chave.replace(/\D/g, "").length !== 44}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Consultar NF-e
            </Button>
          </Card>
        )}

        {/* ── STEP: confirmar (dados da NF + 3 opções) ──────────────────── */}
        {step === "confirmar" && frete && (
          <Card className="p-5 space-y-4">
            <div className="bg-muted rounded-lg p-4 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">NF-e</p>
              <p className="text-lg font-bold">{frete.nfeNumero ?? "—"}</p>
              <p className="font-medium">{frete.clienteNome ?? "—"}</p>
              <p className="text-sm text-muted-foreground">{frete.empresaNome ?? "—"}</p>
              <span className="inline-block mt-1 text-xs bg-background border border-input rounded px-2 py-0.5">
                {frete.statusEntrega}
              </span>
            </div>

            <p className="text-sm text-center text-muted-foreground">Esta é a nota correta?</p>

            <div className="space-y-2">
              <Button className="w-full" onClick={() => { setError(null); setStep("foto"); }}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirmar Entrega
              </Button>
              <Button variant="outline" className="w-full" onClick={() => { setError(null); setStep("agendar"); }}>
                <Calendar className="w-4 h-4 mr-2" />
                Reportar Agendamento
              </Button>
              <Button variant="ghost" className="w-full" onClick={voltar}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </Card>
        )}

        {/* ── STEP: foto ────────────────────────────────────────────────── */}
        {step === "foto" && frete && (
          <Card className="p-5 space-y-4">
            <div className="text-center space-y-2">
              <Camera className="w-10 h-10 mx-auto text-primary" />
              <p className="font-medium">Fotografe o comprovante de entrega</p>
              <p className="text-sm text-muted-foreground">
                Tire uma foto do recibo assinado ou do local de entrega.
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <input
              ref={fotoRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFotoSelecionada}
            />

            <Button
              className="w-full"
              onClick={() => fotoRef.current?.click()}
              disabled={uploadingFoto}
            >
              {uploadingFoto
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Enviando foto...</>
                : <><Camera className="w-4 h-4 mr-2" />Abrir câmera</>
              }
            </Button>
            <Button variant="ghost" className="w-full" onClick={voltar}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Card>
        )}

        {/* ── STEP: agendar ─────────────────────────────────────────────── */}
        {step === "agendar" && frete && (
          <Card className="p-5 space-y-4">
            <p className="font-medium">Dados do Agendamento</p>

            <div>
              <Label htmlFor="data-ag">Data *</Label>
              <Input
                id="data-ag"
                type="date"
                value={dataAgendamento}
                onChange={(e) => setDataAgendamento(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="hora-ag">Hora (opcional)</Label>
              <Input
                id="hora-ag"
                type="time"
                value={horaAgendamento}
                onChange={(e) => setHoraAgendamento(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="obs-ag">Observações (opcional)</Label>
              <textarea
                id="obs-ag"
                rows={3}
                value={obsAgendamento}
                onChange={(e) => setObsAgendamento(e.target.value)}
                placeholder="Ex: Ligar antes de entregar, portaria bloco B..."
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button className="w-full" onClick={handleAgendar} disabled={loading || !dataAgendamento}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calendar className="w-4 h-4 mr-2" />}
              Confirmar Agendamento
            </Button>
            <Button variant="ghost" className="w-full" onClick={voltar}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Card>
        )}

        {/* ── STEP: sucesso ─────────────────────────────────────────────── */}
        {step === "sucesso" && (
          <Card className="p-8 text-center space-y-4">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
            <p className="text-xl font-bold text-green-700">{successMsg}</p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => { setStep("identificar"); setFrete(null); setChave(""); setError(null); }}
            >
              Nova consulta
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
