// CadastroRegiaoDestinoPage — lista + form de regiões destino. F-LOG-CRM R-LOG-1.

import { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { regiaoDestinoService } from "../../services/logisticaService";

interface RegiaoView {
  id: string;
  nome: string;
  uf: string | null;
  ativo: boolean;
}

export default function CadastroRegiaoDestinoPage() {
  const [items, setItems] = useState<RegiaoView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [uf, setUf] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = (await regiaoDestinoService.list({ apenasAtivos: false })) as {
        regioes: RegiaoView[];
      };
      setItems(data?.regioes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao listar regiões");
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
      await regiaoDestinoService.create({
        nome,
        uf: uf ? uf.toUpperCase() : null,
      });
      setSaveMessage("Região criada com sucesso.");
      setNome("");
      setUf("");
      await refresh();
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Falha ao criar região");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Nova região destino</h2>
        <form className="grid grid-cols-1 sm:grid-cols-2 gap-3" onSubmit={handleSave}>
          <div>
            <Label htmlFor="reg-nome">Nome *</Label>
            <Input
              id="reg-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: MG-MATA"
              required
            />
          </div>
          <div>
            <Label htmlFor="reg-uf">UF</Label>
            <Input
              id="reg-uf"
              value={uf}
              onChange={(e) => setUf(e.target.value.toUpperCase())}
              maxLength={2}
              placeholder="MG"
            />
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
          <h2 className="text-lg font-semibold">Regiões cadastradas</h2>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            {loading ? "Atualizando..." : "Atualizar"}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive mb-2">{error}</p>}
        {items.length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground">Nenhuma região cadastrada ainda.</p>
        ) : (
          <ul className="divide-y">
            {items.map((r) => (
              <li key={r.id} className="py-2 text-sm">
                <span className="font-medium">{r.nome}</span>
                {r.uf && <span className="text-xs text-muted-foreground"> · {r.uf}</span>}
                {!r.ativo && <span className="text-xs text-muted-foreground"> · inativa</span>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
