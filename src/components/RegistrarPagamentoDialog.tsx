import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Combobox } from './ui/combobox';
import { Separator } from './ui/separator';
import { Compromisso } from '../types/contaCorrente';
import { toast } from 'sonner@2.0.3';
import { DollarSign, Calendar } from 'lucide-react';
import { Badge } from './ui/badge';

interface RegistrarPagamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  compromisso: Compromisso | null;
  compromissosDisponiveis?: Compromisso[];
  formasPagamentoOptions: { label: string; value: string }[];
  categoriasOptions: { label: string; value: string }[];
  onSalvar: (pagamento: {
    compromissoId: string;
    dataPagamento: string;
    valor: string;
    formaPagamentoId: string;
    categoriaId: string;
    observacoes: string;
  }) => void;
}

export function RegistrarPagamentoDialog({
  open,
  onOpenChange,
  compromisso,
  compromissosDisponiveis = [],
  formasPagamentoOptions,
  categoriasOptions,
  onSalvar,
}: RegistrarPagamentoDialogProps) {
  const [compromissoSelecionadoId, setCompromissoSelecionadoId] = useState('');
  const [formData, setFormData] = useState({
    dataPagamento: new Date().toISOString().split('T')[0],
    valor: '',
    formaPagamentoId: '',
    categoriaId: '',
    observacoes: '',
  });

  // Compromisso efetivo (o passado via prop ou o selecionado no combobox)
  const compromissoEfetivo = compromisso || compromissosDisponiveis.find(c => c.id === compromissoSelecionadoId);

  // Quando o compromisso mudar, preencher o valor padrão com o valor pendente
  useEffect(() => {
    if (compromissoEfetivo && open) {
      setFormData({
        dataPagamento: new Date().toISOString().split('T')[0],
        valor: compromissoEfetivo.valorPendente.toString(),
        formaPagamentoId: '',
        categoriaId: compromissoEfetivo.categoriaId || '',
        observacoes: '',
      });
    }
  }, [compromissoEfetivo, open]);

  // Resetar seleção quando abrir sem compromisso pré-selecionado
  useEffect(() => {
    if (open && !compromisso) {
      setCompromissoSelecionadoId('');
      setFormData({
        dataPagamento: new Date().toISOString().split('T')[0],
        valor: '',
        formaPagamentoId: '',
        categoriaId: '',
        observacoes: '',
      });
    }
  }, [open, compromisso]);

  const handleSalvar = () => {
    if (!compromissoEfetivo) {
      toast.error('Selecione um compromisso');
      return;
    }

    // Validações
    if (!formData.dataPagamento) {
      toast.error('Selecione a data do pagamento');
      return;
    }
    if (!formData.valor || parseFloat(formData.valor) <= 0) {
      toast.error('Digite um valor válido');
      return;
    }
    if (parseFloat(formData.valor) > compromissoEfetivo.valorPendente) {
      toast.error(`O valor não pode ser maior que o valor pendente (${formatCurrency(compromissoEfetivo.valorPendente)})`);
      return;
    }
    if (!formData.formaPagamentoId) {
      toast.error('Selecione a forma de pagamento');
      return;
    }

    onSalvar({
      compromissoId: compromissoEfetivo.id,
      dataPagamento: formData.dataPagamento,
      valor: formData.valor,
      formaPagamentoId: formData.formaPagamentoId,
      categoriaId: formData.categoriaId,
      observacoes: formData.observacoes,
    });
    
    // Resetar formulário
    setCompromissoSelecionadoId('');
    setFormData({
      dataPagamento: new Date().toISOString().split('T')[0],
      valor: '',
      formaPagamentoId: '',
      categoriaId: '',
      observacoes: '',
    });
  };

  const handleCancel = () => {
    // Resetar formulário
    setCompromissoSelecionadoId('');
    setFormData({
      dataPagamento: new Date().toISOString().split('T')[0],
      valor: '',
      formaPagamentoId: '',
      categoriaId: '',
      observacoes: '',
    });
    onOpenChange(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Preparar opções de compromissos pendentes
  const compromissosOptions = compromissosDisponiveis
    .filter(c => c.valorPendente > 0)
    .map(c => ({
      label: `${c.clienteNome} - ${c.titulo} (Pend: ${formatCurrency(c.valorPendente)})`,
      value: c.id,
    }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
          <DialogDescription>
            {compromisso 
              ? 'Registre um pagamento para o compromisso selecionado'
              : 'Selecione um compromisso e registre um pagamento'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Seleção de Compromisso (quando não pré-selecionado) */}
        {!compromisso && (
          <>
            <div className="space-y-2">
              <Label htmlFor="compromisso">
                Compromisso <span className="text-destructive">*</span>
              </Label>
              <Combobox
                options={compromissosOptions}
                value={compromissoSelecionadoId}
                onValueChange={setCompromissoSelecionadoId}
                placeholder="Selecione um compromisso"
                searchPlaceholder="Pesquisar compromisso..."
                emptyText="Nenhum compromisso pendente encontrado."
              />
            </div>
            <Separator />
          </>
        )}

        {/* Informações do Compromisso */}
        {compromissoEfetivo && (
          <>
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{compromissoEfetivo.titulo}</h4>
                <Badge variant={compromissoEfetivo.tipoCompromisso === 'Investimento' ? 'default' : 'secondary'}>
                  {compromissoEfetivo.tipoCompromisso}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Cliente:</span>
                  <p className="font-medium">{compromissoEfetivo.clienteNome}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Data do Compromisso:</span>
                  <p className="font-medium">{formatDate(compromissoEfetivo.data)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Valor Total:</span>
                  <p className="font-medium text-lg">{formatCurrency(compromissoEfetivo.valor)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Valor Pago:</span>
                  <p className="font-medium text-green-600">{formatCurrency(compromissoEfetivo.valorPago)}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Valor Pendente:</span>
                  <p className="font-semibold text-red-600 text-xl">{formatCurrency(compromissoEfetivo.valorPendente)}</p>
                </div>
              </div>
            </div>
            <Separator />
          </>
        )}

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dataPagamento">
                Data do Pagamento <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dataPagamento"
                type="date"
                value={formData.dataPagamento}
                onChange={(e) => setFormData({ ...formData, dataPagamento: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor">
                Valor <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                  className="pl-9"
                />
              </div>
              {compromissoEfetivo && (
                <p className="text-xs text-muted-foreground">
                  Máximo: {formatCurrency(compromissoEfetivo.valorPendente)}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="formaPagamento">
              Forma de Pagamento <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.formaPagamentoId}
              onValueChange={(value) => setFormData({ ...formData, formaPagamentoId: value })}
            >
              <SelectTrigger id="formaPagamento">
                <SelectValue placeholder="Selecione a forma de pagamento" />
              </SelectTrigger>
              <SelectContent>
                {formasPagamentoOptions.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Nenhuma forma de pagamento disponível
                  </SelectItem>
                ) : (
                  formasPagamentoOptions.map((forma) => (
                    <SelectItem key={forma.value} value={forma.value}>
                      {forma.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoria">Categoria (opcional)</Label>
            <Combobox
              options={categoriasOptions}
              value={formData.categoriaId}
              onValueChange={(value) => setFormData({ ...formData, categoriaId: value })}
              placeholder="Selecione uma categoria"
              searchPlaceholder="Pesquisar categoria..."
              emptyText="Nenhuma categoria encontrada."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              placeholder="Informações adicionais sobre o pagamento (opcional)"
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              rows={3}
            />
          </div>

          {/* Previsão após o pagamento */}
          {compromissoEfetivo && formData.valor && parseFloat(formData.valor) > 0 && parseFloat(formData.valor) <= compromissoEfetivo.valorPendente && (
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-sm mb-2 text-blue-900 dark:text-blue-100">
                Após este pagamento:
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 dark:text-blue-300">Total Pago:</span>
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    {formatCurrency(compromissoEfetivo.valorPago + parseFloat(formData.valor))}
                  </p>
                </div>
                <div>
                  <span className="text-blue-700 dark:text-blue-300">Saldo Restante:</span>
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    {formatCurrency(compromissoEfetivo.valorPendente - parseFloat(formData.valor))}
                  </p>
                </div>
              </div>
              {compromissoEfetivo.valorPendente - parseFloat(formData.valor) === 0 && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
                  ✓ Este pagamento quitará totalmente o compromisso
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar}>
            Registrar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}