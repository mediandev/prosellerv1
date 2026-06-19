// EntregaPublicaPage — página pública (sem login) para motoristas confirmarem entrega
// ou agendarem reentrega via chave de acesso NFe (44 dígitos) ou scanner de código de barras.
// Rota: /entrega — montada ANTES do AuthProvider em App.tsx.
// Comunica-se diretamente com a edge function entrega-publica-v1 (sem token de usuário).

import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent } from "../ui/card";
import { Camera, ScanBarcode, CheckCircle, CalendarClock, ArrowLeft, Loader2 } from "lucide-react";

const SUPABASE_URL = "https://xxoiqfraeolsqsmsheue.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4b2lxZnJhZW9sc3FzbXNoZXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1ODQ5MDIsImV4cCI6MjA0MjE2MDkwMn0.m8A1mUf3GyAl_17FjltxkgBr-xRQYZw9YEDUVUBdttA";
const FUNC_URL = `${SUPABASE_URL}/functions/v1/entrega-publica-v1`;

type Step = "identificar" | "confirmar" | "acao" | "foto" | "agendar" | "sucesso";

interface FreteInfo {
  freteId: string;
  nfeNumero: string | null;
  statusEntrega: string | null;
  clienteNome: string | null;
  empresaNome: string | null;
}

declare const BarcodeDetector: {
  new (opts: { formats: string[] }): {
    detect(image: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
  };
};

export default function EntregaPublicaPage() {
  const [step, setStep] = useState<Step>("identificar");
  const [chave, setChave] = useState("");
  const [freteInfo, setFreteInfo] = useState<FreteInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // scanner
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // foto
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  // agendamento
  const [dataAgendamento, setDataAgendamento] = useState("");
  const [horaAgendamento, setHoraAgendamento] = useState("");
  const [obsAgendamento, setObsAgendamento] = useState("");

  useEffect(() => {
    return () => stopScanner();
  }, []);

  function stopScanner() {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    scanIntervalRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }

  async function startScanner() {
    setError(null);
    if (!("BarcodeDetector" in window)) {
      setError("Scanner de código de barras não suportado neste dispositivo. Digite a chave manualmente.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setScanning(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => null);
        }
      }, 100);

      const detector = new BarcodeDetector({
        formats: ["code_128", "code_39", "ean_13", "ean_8", "qr_code"],
      });

      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current) return;
        try {
          const results = await detector.detect(videoRef.current);
          for (const r of results) {
            const raw = r.rawValue.replace(/\D/g, "");
            if (raw.length === 44) {
              stopScanner();
              setChave(raw);
              await buscarFrete(raw);
              return;
            }
          }
        } catch {
          // frame ainda não pronto
        }
      }, 300);
    } catch {
      setError("Não foi possível acessar a câmera. Verifique as permissões.");
      setScanning(false);
    }
  }

  async function buscarFrete(chaveAcesso: string) {
    const c = chaveAcesso.replace(/\D/g, "");
    if (c.length !== 44) {
      setError("A chave de acesso deve ter exatamente 44 dígitos.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${FUNC_URL}?chave=${c}`, {
        headers: { apikey: ANON_KEY },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Frete não encontrado.");
      setFreteInfo(data);
      setStep("confirmar");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao buscar frete.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFoto(file: File) {
    if (!freteInfo) return;
    setUploading(true);
    setError(null);
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch(FUNC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY },
        body: JSON.stringify({
          action: "confirmar_entrega",
          freteId: freteInfo.freteId,
          fotoBase64: base64,
          mimeType: file.type || "image/jpeg",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao registrar entrega.");
      setStep("sucesso");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar foto.");
    } finally {
      setUploading(false);
    }
  }

  async function handleAgendar() {
    if (!freteInfo || !dataAgendamento) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(FUNC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY },
        body: JSON.stringify({
          action: "reportar_agendamento",
          freteId: freteInfo.freteId,
          dataAgendamento,
          horaAgendamento: horaAgendamento || null,
          obsAgendamento: obsAgendamento || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao registrar agendamento.");
      setStep("sucesso");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao agendar.");
    } finally {
      setLoading(false);
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function reiniciar() {
    stopScanner();
    setChave("");
    setFreteInfo(null);
    setError(null);
    setDataAgendamento("");
    setHoraAgendamento("");
    setObsAgendamento("");
    setStep("identificar");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start py-8 px-4">
      <div className="w-full max-w-md">
        {/* header */}
        <div className="mb-6 text-center">
          <p className="text-xs text-muted-foreground mt-1">ProSeller · Módulo Logística</p>
        </div>

        {step !== "sucesso" && step !== "identificar" && (
          <button
            onClick={() => {
              if (step === "confirmar") reiniciar();
              else if (step === "acao") setStep("confirmar");
              else if (step === "foto" || step === "agendar") setStep("acao");
            }}
            className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
        )}

        {/* STEP: identificar */}
        {step === "identificar" && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-lg font-semibold">Confirmar entrega</h2>
              <p className="text-sm text-muted-foreground">
                Digite ou escaneie a chave de acesso da NF-e (44 dígitos).
              </p>

              {scanning ? (
                <div className="space-y-3">
                  <video
                    ref={videoRef}
                    className="w-full rounded-md border bg-black"
                    playsInline
                    muted
                    style={{ maxHeight: 240 }}
                  />
                  <Button variant="outline" className="w-full" onClick={stopScanner}>
                    Cancelar scanner
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={startScanner}
                >
                  <ScanBarcode className="h-4 w-4 mr-2" />
                  Escanear código de barras
                </Button>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex-1 border-t" />
                ou
                <div className="flex-1 border-t" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="chave">Chave de acesso NF-e</Label>
                <Input
                  id="chave"
                  placeholder="44 dígitos"
                  value={chave}
                  onChange={(e) => setChave(e.target.value.replace(/\D/g, "").slice(0, 44))}
                  inputMode="numeric"
                  maxLength={44}
                />
                <p className="text-xs text-muted-foreground text-right">{chave.length}/44</p>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button
                className="w-full"
                onClick={() => buscarFrete(chave)}
                disabled={loading || chave.length !== 44}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Buscar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* STEP: confirmar */}
        {step === "confirmar" && freteInfo && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-lg font-semibold">Dados da entrega</h2>

              <dl className="space-y-2 text-sm">
                {freteInfo.nfeNumero && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">NF-e</dt>
                    <dd className="font-medium">{freteInfo.nfeNumero}</dd>
                  </div>
                )}
                {freteInfo.clienteNome && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Cliente</dt>
                    <dd className="font-medium">{freteInfo.clienteNome}</dd>
                  </div>
                )}
                {freteInfo.empresaNome && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Empresa</dt>
                    <dd className="font-medium">{freteInfo.empresaNome}</dd>
                  </div>
                )}
                {freteInfo.statusEntrega && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Status atual</dt>
                    <dd className="font-medium">{freteInfo.statusEntrega}</dd>
                  </div>
                )}
              </dl>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button className="w-full" onClick={() => setStep("acao")}>
                Confirmar — é essa entrega
              </Button>
              <Button variant="outline" className="w-full" onClick={reiniciar}>
                Não, buscar outra
              </Button>
            </CardContent>
          </Card>
        )}

        {/* STEP: acao */}
        {step === "acao" && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-lg font-semibold">O que deseja registrar?</h2>

              <Button className="w-full h-20 flex-col gap-1" onClick={() => setStep("foto")}>
                <Camera className="h-6 w-6" />
                <span>Confirmar entrega com foto</span>
              </Button>

              <Button
                variant="outline"
                className="w-full h-20 flex-col gap-1"
                onClick={() => setStep("agendar")}
              >
                <CalendarClock className="h-6 w-6" />
                <span>Agendar nova tentativa</span>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* STEP: foto */}
        {step === "foto" && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-lg font-semibold">Foto do comprovante</h2>
              <p className="text-sm text-muted-foreground">
                Tire uma foto do comprovante assinado ou selecione um arquivo.
              </p>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFoto(file);
                }}
              />

              <Button
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Camera className="h-4 w-4 mr-2" />
                )}
                {uploading ? "Enviando..." : "Abrir câmera / selecionar arquivo"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* STEP: agendar */}
        {step === "agendar" && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-lg font-semibold">Agendar reentrega</h2>

              <div className="space-y-2">
                <Label htmlFor="data">Data *</Label>
                <Input
                  id="data"
                  type="date"
                  value={dataAgendamento}
                  onChange={(e) => setDataAgendamento(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hora">Horário (opcional)</Label>
                <Input
                  id="hora"
                  type="time"
                  value={horaAgendamento}
                  onChange={(e) => setHoraAgendamento(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="obs">Observações (opcional)</Label>
                <textarea
                  id="obs"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px] resize-none"
                  placeholder="Ex.: cliente pede que ligue antes, portaria fecha às 18h..."
                  value={obsAgendamento}
                  onChange={(e) => setObsAgendamento(e.target.value)}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button
                className="w-full"
                onClick={handleAgendar}
                disabled={loading || !dataAgendamento}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirmar agendamento
              </Button>
            </CardContent>
          </Card>
        )}

        {/* STEP: sucesso */}
        {step === "sucesso" && (
          <Card>
            <CardContent className="pt-6 space-y-4 text-center">
              <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
              <h2 className="text-lg font-semibold">Registrado com sucesso!</h2>
              <p className="text-sm text-muted-foreground">
                A informação foi salva e o backoffice será notificado.
              </p>
              <Button variant="outline" className="w-full" onClick={reiniciar}>
                Nova consulta
              </Button>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground mt-8">
          Documento gerado pelo ProSeller.com.br
        </p>
      </div>
    </div>
  );
}
