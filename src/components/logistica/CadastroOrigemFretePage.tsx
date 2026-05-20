// CadastroOrigemFretePage — lista + form de origens de frete. F-LOG-CRM R-LOG-1.

import { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { origemFreteService } from "../../services/logisticaService";

interface OrigemView {
  id: string;
  nome: string;
  uf: string | null;
  empresaId: number;
  ativo: boolean;
}

export default function CadastroOrigemFretePage() {
  const [items, setItems] = useState<OrigemView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [uf, setUf] = useState("");
  const [empresaId, setEmpresaId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = (await origemFreteService.list({ apenasAtivos: false })) as { origens: OrigemView[] };
      setItems(data?.origens || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao listar origens");
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
      const empresaIdNum = Number(empresaId);
      if (!empresaIdNum || empresaIdNum <= 0) {
        setSaveMessage("Empresa ID inválido");
        return;
      }
      await origemFreteService.create({
        nome,
        uf: uf ? uf.toUpperCase() : null,
        empresaId: empresaIdNum,
      });
      setSaveMessage("Origem criada com sucesso.");
      setNome("");
      setUf("");
      setEmpresaId("");
      await refresh();
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Falha ao criar origem");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Nova origem de frete</h2>
        <form className="grid grid-cols-1 sm:grid-cols-3 gap-3" onSubmit={handleSave}>
          <div>
            <Label htmlFor="ori-nome">Nome *</Label>
            <Input
              id="ori-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: MG-JDF"
              required
            />
          </div>
          <div>
            <Label htmlFor="ori-uf">UF</Label>
            <Input
              id="ori-uf"
              value={uf}
              onChange={(e) => setUf(e.target.value.toUpperCase())}
              maxLength={2}
              placeholder="MG"
            />
          </div>
          <div>
            <Label htmlFor="ori-emp">Empresa ID *</Label>
            <Input
              id="ori-emp"
              type="number"
              value={empresaId}
              onChange={(e) => setEmpresaId(e.target.value)}
              required
            />
          </div>
          <div className="sm:col-span-3 flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
            {saveMessage && <span className="text-sm text-muted-foreground">{saveMessage}</span>}
          </div>
        </form>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Origens cadastradas</h2>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            {loading ? "Atualizando..." : "Atualizar"}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive mb-2">{error}</p>}
        {items.length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground">Nenhuma origem cadastrada ainda.</p>
        ) : (
          <ul className="divide-y">
            {items.map((o) => (
              <li key={o.id} className="py-2 text-sm">
                <span className="font-medium">{o.nome}</span>
                {o.uf && <span className="text-xs text-muted-foreground"> · {o.uf}</span>}
                <span className="text-xs text-muted-foreground"> · empresa {o.empresaId}</span>
                {!o.ativo && <span className="text-xs text-muted-foreground"> · inativa</span>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
