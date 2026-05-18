import { useEffect, useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

export interface GrupoRedeMinimo {
  id: string;
  nome: string;
  descricao?: string;
}

interface QuickCreateGrupoRedeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGrupoSelecionado: (grupo: GrupoRedeMinimo) => void;
  nomeInicial?: string;
}

type Etapa = 'editando' | 'revisando';

const extrairLista = (resposta: any): GrupoRedeMinimo[] => {
  if (Array.isArray(resposta)) return resposta;
  if (resposta && typeof resposta === 'object') {
    if (Array.isArray(resposta.grupos)) return resposta.grupos;
    if (Array.isArray(resposta.data)) return resposta.data;
  }
  return [];
};

const extrairGrupoCriado = (resposta: any): GrupoRedeMinimo | null => {
  if (!resposta) return null;
  if (resposta.id && resposta.nome) return resposta;
  if (resposta.data && resposta.data.id) return resposta.data;
  return null;
};

export function QuickCreateGrupoRedeDialog({
  open,
  onOpenChange,
  onGrupoSelecionado,
  nomeInicial = '',
}: QuickCreateGrupoRedeDialogProps) {
  const [nome, setNome] = useState(nomeInicial);
  const [descricao, setDescricao] = useState('');
  const [etapa, setEtapa] = useState<Etapa>('editando');
  const [similares, setSimilares] = useState<GrupoRedeMinimo[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    if (open) {
      setNome(nomeInicial);
      setDescricao('');
      setEtapa('editando');
      setSimilares([]);
    }
  }, [open, nomeInicial]);

  const nomeTrim = nome.trim();
  const podeVerificar = nomeTrim.length >= 2 && !buscando;

  const handleVerificar = async () => {
    if (!podeVerificar) return;
    setBuscando(true);
    try {
      const resposta = await api.get('grupos-redes', {
        params: { search: nomeTrim, apenas_ativos: true, limit: 20 },
      });
      setSimilares(extrairLista(resposta));
      setEtapa('revisando');
    } catch (erro: any) {
      console.error('[QUICK-GRUPO] Erro ao buscar similares:', erro);
      toast.error('Não foi possível buscar grupos existentes. Tente novamente.');
    } finally {
      setBuscando(false);
    }
  };

  const handleUsarExistente = (grupo: GrupoRedeMinimo) => {
    onGrupoSelecionado(grupo);
    onOpenChange(false);
  };

  const handleCriarMesmoAssim = async () => {
    setCriando(true);
    try {
      const resposta = await api.create('grupos-redes', {
        nome: nomeTrim,
        descricao: descricao.trim() || undefined,
      });
      const grupoCriado = extrairGrupoCriado(resposta);
      if (!grupoCriado) {
        throw new Error('Resposta inesperada do servidor ao criar grupo.');
      }
      toast.success(`Grupo "${grupoCriado.nome}" criado com sucesso.`);
      onGrupoSelecionado(grupoCriado);
      onOpenChange(false);
    } catch (erro: any) {
      console.error('[QUICK-GRUPO] Erro ao criar grupo:', erro);
      const msg =
        typeof erro?.message === 'string' && erro.message.includes('já existe')
          ? 'Já existe um grupo com esse nome. Use o grupo da lista acima.'
          : erro?.message || 'Não foi possível criar o grupo. Tente novamente.';
      toast.error(msg);
    } finally {
      setCriando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Incluir grupo / rede</DialogTitle>
          <DialogDescription>
            {etapa === 'editando'
              ? 'Informe o nome do grupo ou rede. Faremos uma busca para evitar duplicidades antes de criar.'
              : 'Antes de criar, confira se o grupo já existe na lista abaixo.'}
          </DialogDescription>
        </DialogHeader>

        {etapa === 'editando' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quick-grupo-nome">Nome *</Label>
              <Input
                id="quick-grupo-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Carrefour, Atacadão, ..."
                autoFocus
                disabled={buscando}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-grupo-descricao">Descrição (opcional)</Label>
              <Textarea
                id="quick-grupo-descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Observação ou identificação adicional"
                rows={2}
                disabled={buscando}
              />
            </div>
          </div>
        )}

        {etapa === 'revisando' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Atenção! Evite duplicidade.</p>
                <p>Verifique se o grupo já existe abaixo.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Você está prestes a criar</Label>
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <span className="font-medium">{nomeTrim}</span>
                {descricao.trim() && (
                  <span className="ml-2 text-muted-foreground">— {descricao.trim()}</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Grupos existentes parecidos</Label>
              {similares.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum grupo similar encontrado. Você pode criar com segurança.
                </p>
              ) : (
                <div className="max-h-56 overflow-y-auto rounded-md border divide-y">
                  {similares.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => handleUsarExistente(g)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{g.nome}</div>
                        {g.descricao && (
                          <div className="text-xs text-muted-foreground truncate">
                            {g.descricao}
                          </div>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs text-primary shrink-0">
                        <Check className="h-3.5 w-3.5" />
                        Usar este
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {etapa === 'editando' && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={buscando}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={handleVerificar} disabled={!podeVerificar}>
                {buscando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...
                  </>
                ) : (
                  'Verificar e salvar'
                )}
              </Button>
            </>
          )}
          {etapa === 'revisando' && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEtapa('editando')}
                disabled={criando}
              >
                Voltar
              </Button>
              <Button
                type="button"
                onClick={handleCriarMesmoAssim}
                disabled={criando}
              >
                {criando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...
                  </>
                ) : (
                  'Criar mesmo assim'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
