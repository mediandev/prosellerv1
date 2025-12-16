import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Combobox } from './ui/combobox';
import { Separator } from './ui/separator';
import { TipoCompromisso } from '../types/contaCorrente';
import { toast } from 'sonner@2.0.3';
import { Plus } from 'lucide-react';

interface NovoCompromissoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientesOptions: { label: string; value: string }[];
  categoriasOptions: { label: string; value: string }[];
  onSalvar: (compromisso: {
    clienteId: string;
    data: string;
    valor: string;
    titulo: string;
    descricao: string;
    tipoCompromisso: TipoCompromisso;
    categoriaId: string;
  }) => void;
}

export function NovoCompromissoDialog({
  open,
  onOpenChange,
  clientesOptions,
  categoriasOptions,
  onSalvar,
}: NovoCompromissoDialogProps) {
  const [formData, setFormData] = useState({
    clienteId: '',
    data: new Date().toISOString().split('T')[0],
    valor: '',
    titulo: '',
    descricao: '',
    tipoCompromisso: 'Investimento' as TipoCompromisso,
    categoriaId: '',
  });

  const handleSalvar = () => {
    // Validações
    if (!formData.clienteId) {
      toast.error('Selecione um cliente');
      return;
    }
    if (!formData.titulo) {
      toast.error('Digite o título do compromisso');
      return;
    }
    if (!formData.valor || parseFloat(formData.valor) <= 0) {
      toast.error('Digite um valor válido');
      return;
    }
    if (!formData.data) {
      toast.error('Selecione uma data');
      return;
    }

    onSalvar(formData);
    
    // Resetar formulário
    setFormData({
      clienteId: '',
      data: new Date().toISOString().split('T')[0],
      valor: '',
      titulo: '',
      descricao: '',
      tipoCompromisso: 'Investimento',
      categoriaId: '',
    });
  };

  const handleCancel = () => {
    // Resetar formulário
    setFormData({
      clienteId: '',
      data: new Date().toISOString().split('T')[0],
      valor: '',
      titulo: '',
      descricao: '',
      tipoCompromisso: 'Investimento',
      categoriaId: '',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Novo Compromisso</DialogTitle>
          <DialogDescription>
            Registre um novo investimento ou ressarcimento acordado com o cliente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cliente">Cliente *</Label>
            <Combobox
              options={clientesOptions}
              value={formData.clienteId}
              onValueChange={(value) => setFormData({ ...formData, clienteId: value })}
              placeholder="Selecione um cliente"
              searchPlaceholder="Pesquisar cliente..."
              emptyText="Nenhum cliente encontrado."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="data">Data *</Label>
              <Input
                id="data"
                type="date"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor">Valor *</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tipoCompromisso">Tipo de Compromisso *</Label>
              <Select
                value={formData.tipoCompromisso}
                onValueChange={(value: TipoCompromisso) =>
                  setFormData({ ...formData, tipoCompromisso: value })
                }
              >
                <SelectTrigger id="tipoCompromisso">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Investimento">Investimento</SelectItem>
                  <SelectItem value="Ressarcimento">Ressarcimento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Combobox
                options={categoriasOptions}
                value={formData.categoriaId}
                onValueChange={(value) => setFormData({ ...formData, categoriaId: value })}
                placeholder="Selecione uma categoria"
                searchPlaceholder="Pesquisar categoria..."
                emptyText="Nenhuma categoria encontrada."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              placeholder="Ex: Investimento em Material de PDV"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              placeholder="Descreva os detalhes do compromisso..."
              rows={4}
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar}>
            <Plus className="h-4 w-4 mr-2" />
            Salvar Compromisso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}