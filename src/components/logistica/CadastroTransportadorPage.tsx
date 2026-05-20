// CadastroTransportadorPage — lista + form de criação. F-LOG-CRM R-LOG-1.
// Cobre o caminho mínimo para o smoke E2E.

import { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { transportadorService } from "../../services/logisticaService";

interface TransportadorView {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string;
  grupo: string;
  ativo: boolean;
}

const grupos = ["ATIVA", "BRASSPRESS", "TA_AMERICANA", "CAMILO", "OUTROS"];

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

export default function CadastroTransportadorPage() {
  const [items, setItems] = useState<TransportadorView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [grupo, setGrupo] = useState("OUTROS");
  const [sswDominio, setSswDominio] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = (await transportadorService.list({ apenasAtivos: false })) as {
        transportadores: TransportadorView[];
      };
      setItems(data?.transportadores || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao listar transportadores");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    try {
      await transportadorService.create({
        razaoSocial,
        nomeFantasia: nomeFantasia || null,
        cnpj: digitsOnly(cnpj),
        grupo,
        sswDominio: sswDominio || null,
      });
      setSaveMessage("Transportador criado com sucesso.");
      setRazaoSocial("");
      setNomeFantasia("");
      setCnpj("");
      setGrupo("OUTROS");
      setSswDominio("");
      await refresh();
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Falha ao criar transportador");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Novo transportador</h2>
        <form className="grid grid-cols-1 sm:grid-cols-2 gap-3" onSubmit={handleSave}>
          <div>
            <Label htmlFor="razao">Razão social *</Label>
            <Input id="razao" value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="fantasia">Nome fantasia</Label>
            <Input id="fantasia" value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cnpj">CNPJ * (14 dígitos)</Label>
            <Input id="cnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} maxLength={18} required />
          </div>
          <div>
            <Label htmlFor="grupo">Grupo</Label>
            <select
              id="grupo"
              value={grupo}
              onChange={(e) => setGrupo(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {grupos.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="ssw">Domínio SSW (opcional)</Label>
            <Input id="ssw" value={sswDominio} onChange={(e) => setSswDominio(e.target.value.toUpperCase())} maxLength={8} />
          </div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
            {saveMessage && <span className="text-sm text-muted-foreground">{saveMessage}</span>}
          </div>
        </form>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Transportadores cadastrados</h2>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            {loading ? "Atualizando..." : "Atualizar"}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive mb-2">{error}</p>}
        {items.length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground">Nenhum transportador cadastrado ainda.</p>
        ) : (
          <ul className="divide-y">
            {items.map((t) => (
              <li key={t.id} className="py-2 text-sm flex items-center justify-between">
                <div>
                  <p className="font-medium">{t.razaoSocial}</p>
                  <p className="text-xs text-muted-foreground">
                    CNPJ {t.cnpj} · grupo {t.grupo} · {t.ativo ? "ativo" : "inativo"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
