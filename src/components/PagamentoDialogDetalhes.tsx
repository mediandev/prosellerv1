import { Calendar, FileText, Edit, Trash2, Eye, Download, User, Clock } from 'lucide-react';
import { Pagamento } from '../types/contaCorrente';
import { toast } from 'sonner@2.0.3';
import { api } from '../services/api';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Combobox } from './ui/combobox';

interface PagamentoDialogDetalhesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pagamento: Pagamento | null;
  formasPagamentoOptions: Array<{ value: string; label: string }>;
  podeEditar: boolean;
  podeExcluir: boolean;
  onEditar?: () => void;
  onExcluir?: () => void;
  onVisualizarArquivo?: (nome: string, url: string) => void;
  onBaixarArquivo?: (nome: string, url: string) => void;
  showCliente?: boolean; // Para exibir info do cliente quando chamado de ContaCorrenteOverview
}

export function PagamentoDialogDetalhes({
  open,
  onOpenChange,
  pagamento,
  formasPagamentoOptions,
  podeEditar,
  podeExcluir,
  onEditar,
  onExcluir,
  onVisualizarArquivo,
  onBaixarArquivo,
  showCliente = false
}: PagamentoDialogDetalhesProps) {
  const [modoEdicao, setModoEdicao] = useState(false);
  const [categoriasContaCorrente, setCategoriasContaCorrente] = useState<any[]>([]);
  
  useEffect(() => {
    const carregarCategorias = async () => {
      try {
        const data = await api.get('categorias-conta-corrente');
        setCategoriasContaCorrente(data || []);
      } catch (error) {
        console.error('[CATEGORIAS] Erro ao carregar:', error);
        setCategoriasContaCorrente([]);
      }
    };
    carregarCategorias();
  }, []);

  const [dadosEdicao, setDadosEdicao] = useState({
    dataPagamento: '',
    valor: '',
    formaPagamento: '',
    categoriaId: '',
    observacoes: '',
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAtivarEdicao = () => {
    if (!podeEditar) {
      toast.error('Você não tem permissão para editar lançamentos');
      return;
    }
    
    if (pagamento) {
      setDadosEdicao({
        dataPagamento: pagamento.dataPagamento,
        valor: pagamento.valor.toString(),
        formaPagamento: pagamento.formaPagamento,
        categoriaId: pagamento.categoriaId || '',
        observacoes: pagamento.observacoes || '',
      });
      setModoEdicao(true);
    }
  };

  const handleCancelarEdicao = () => {
    setModoEdicao(false);
    setDadosEdicao({
      dataPagamento: '',
      valor: '',
      formaPagamento: '',
      categoriaId: '',
      observacoes: '',
    });
  };

  const handleSalvarEdicao = () => {
    if (!dadosEdicao.dataPagamento || !dadosEdicao.valor || !dadosEdicao.formaPagamento) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    console.log('Editando pagamento:', { id: pagamento?.id, data: dadosEdicao });
    toast.success('Pagamento atualizado com sucesso!');
    setModoEdicao(false);
    
    if (onEditar) {
      onEditar();
    }
  };

  const handleFechar = () => {
    setModoEdicao(false);
    setDadosEdicao({
      dataPagamento: '',
      valor: '',
      formaPagamento: '',
      observacoes: '',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleFechar()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" aria-describedby={undefined}>
        <DialogHeader className="pb-3 flex-shrink-0 pr-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl mb-1">
                {modoEdicao ? 'Editar Pagamento' : 'Detalhes do Pagamento'}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <Calendar className="h-3.5 w-3.5" />
                  {pagamento && formatDate(modoEdicao ? dadosEdicao.dataPagamento : pagamento.dataPagamento)}
                </span>
                <span>•</span>
                <span>{pagamento && (modoEdicao ? dadosEdicao.formaPagamento : pagamento.formaPagamento)}</span>
              </DialogDescription>
            </div>
            {!modoEdicao && (
              <div className="flex gap-2 flex-shrink-0">
                {podeEditar && (
                  <Button variant="outline" size="sm" onClick={handleAtivarEdicao}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                )}
                {podeExcluir && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onExcluir}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        {pagamento && (
          <>
            {!modoEdicao ? (
              <div className="space-y-4 flex-1 overflow-y-auto">
                {/* Cliente (se aplicável) */}
                {showCliente && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <Label className="text-xs text-muted-foreground mb-1 block">Cliente</Label>
                    <p className="font-medium">{pagamento.clienteNome}</p>
                  </div>
                )}

                {/* Compromisso Relacionado */}
                <div className="p-3 bg-muted/30 rounded-lg">
                  <Label className="text-xs text-muted-foreground mb-1 block">Compromisso</Label>
                  <p className="font-medium">{pagamento.compromissoTitulo}</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <Label className="text-xs text-muted-foreground mb-1 block">Valor</Label>
                    <p className="text-2xl font-semibold text-green-600">
                      {formatCurrency(pagamento.valor)}
                    </p>
                  </div>

                  {/* Categoria */}
                  {pagamento.categoriaNome && (
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <Label className="text-xs text-muted-foreground mb-1 block">Categoria</Label>
                      <p className="font-medium">{pagamento.categoriaNome}</p>
                    </div>
                  )}
                </div>

                {/* Observações */}
                {pagamento.observacoes && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Observações</Label>
                    <div className="p-3 bg-muted/30 rounded-md">
                      <p className="text-sm whitespace-pre-wrap">{pagamento.observacoes}</p>
                    </div>
                  </div>
                )}

                {/* Comprovante */}
                {pagamento.comprovanteAnexo && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Comprovante</Label>
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {pagamento.comprovanteAnexo.nomeArquivo}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {pagamento.comprovanteAnexo.tipoArquivoNome}
                            </Badge>
                            <span>•</span>
                            <span>{formatFileSize(pagamento.comprovanteAnexo.tamanho)}</span>
                            <span>•</span>
                            <span>{formatDate(pagamento.comprovanteAnexo.dataUpload)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        {onVisualizarArquivo && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              onVisualizarArquivo(
                                pagamento.comprovanteAnexo!.nomeArquivo,
                                pagamento.comprovanteAnexo!.url
                              )
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {onBaixarArquivo && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              onBaixarArquivo(
                                pagamento.comprovanteAnexo!.nomeArquivo,
                                pagamento.comprovanteAnexo!.url
                              )
                            }
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Histórico de Alterações */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Histórico de Alterações</Label>
                  <div className="space-y-3">
                    <div className="flex gap-3 items-start">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="w-px h-full bg-border mt-1"></div>
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-sm font-medium">Criado</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(pagamento.dataCriacao).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">por {pagamento.criadoPor}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Clock className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-sm font-medium">Última atualização</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(pagamento.dataAtualizacao).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">por {pagamento.atualizadoPor}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Formulário de Edição */
              <div className="flex-1 overflow-y-auto space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-data">Data do Pagamento *</Label>
                    <Input
                      id="edit-data"
                      type="date"
                      value={dadosEdicao.dataPagamento}
                      onChange={(e) =>
                        setDadosEdicao({ ...dadosEdicao, dataPagamento: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-valor">Valor *</Label>
                    <Input
                      id="edit-valor"
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={dadosEdicao.valor}
                      onChange={(e) =>
                        setDadosEdicao({ ...dadosEdicao, valor: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-formaPagamento">Forma de Pagamento *</Label>
                    <Combobox
                      options={formasPagamentoOptions}
                      value={dadosEdicao.formaPagamento}
                      onValueChange={(value) => setDadosEdicao({ ...dadosEdicao, formaPagamento: value })}
                      placeholder="Selecione a forma de pagamento"
                      searchPlaceholder="Pesquisar forma de pagamento..."
                      emptyText="Nenhuma forma de pagamento encontrada."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-categoria">Categoria</Label>
                    <Combobox
                      options={categoriasContaCorrente.map(c => ({
                        label: c.nome,
                        value: c.id,
                      }))}
                      value={dadosEdicao.categoriaId}
                      onValueChange={(value) =>
                        setDadosEdicao({ ...dadosEdicao, categoriaId: value })
                      }
                      placeholder="Selecione uma categoria"
                      searchPlaceholder="Pesquisar categoria..."
                      emptyText="Nenhuma categoria encontrada."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-observacoes">Observações</Label>
                  <Textarea
                    id="edit-observacoes"
                    placeholder="Observações sobre o pagamento..."
                    rows={4}
                    value={dadosEdicao.observacoes}
                    onChange={(e) =>
                      setDadosEdicao({ ...dadosEdicao, observacoes: e.target.value })
                    }
                  />
                </div>
              </div>
            )}
          </>
        )}

        <DialogFooter className="mt-4 flex-shrink-0">
          {!modoEdicao ? (
            <Button onClick={handleFechar}>Fechar</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancelarEdicao}>
                Cancelar
              </Button>
              <Button onClick={handleSalvarEdicao}>
                Salvar Alterações
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}