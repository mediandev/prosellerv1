import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Combobox } from './ui/combobox';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Calendar, DollarSign, FileText, Paperclip, User, Clock, Edit, Trash2, Eye, Download } from 'lucide-react';
import { Compromisso, Pagamento, TipoCompromisso } from '../types/contaCorrente';
import { toast } from 'sonner@2.0.3';

interface CompromissoDialogDetalhesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  compromisso: Compromisso | null;
  pagamentos: Pagamento[];
  podeEditar: boolean;
  podeExcluir: boolean;
  onEditar?: () => void;
  onExcluir?: () => void;
  onVisualizarArquivo?: (nome: string, url: string) => void;
  onBaixarArquivo?: (nome: string, url: string) => void;
  onVisualizarPagamento?: (pagamentoId: string) => void;
  showCliente?: boolean; // Para exibir info do cliente quando chamado de ContaCorrenteOverview
}

export function CompromissoDialogDetalhes({
  open,
  onOpenChange,
  compromisso,
  pagamentos,
  podeEditar,
  podeExcluir,
  onEditar,
  onExcluir,
  onVisualizarArquivo,
  onBaixarArquivo,
  onVisualizarPagamento,
  showCliente = false
}: CompromissoDialogDetalhesProps) {
  const [modoEdicao, setModoEdicao] = useState(false);
  const [categoriasContaCorrenteMock, setCategoriasContaCorrenteMock] = useState<any[]>([]);
  
  useEffect(() => {
    const carregarCategorias = async () => {
      try {
        const data = await api.get('categorias-conta-corrente');
        setCategoriasContaCorrenteMock(data || []);
      } catch (error) {
        console.error('[CATEGORIAS] Erro ao carregar:', error);
        setCategoriasContaCorrenteMock([]);
      }
    };
    carregarCategorias();
  }, []);

  const [dadosEdicao, setDadosEdicao] = useState({
    data: '',
    valor: '',
    titulo: '',
    descricao: '',
    tipoCompromisso: 'Investimento' as TipoCompromisso,
    categoriaId: '',
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

  const getStatusBadge = (status: string) => {
    if (status === 'Pago Integralmente') {
      return <Badge className="bg-green-500 hover:bg-green-600">Pago Integralmente</Badge>;
    }
    if (status === 'Pago Parcialmente') {
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pago Parcialmente</Badge>;
    }
    return <Badge variant="destructive">Pendente</Badge>;
  };

  const getTipoCompromissoBadge = (tipo: TipoCompromisso) => {
    if (tipo === 'Investimento') {
      return <Badge variant="default">Investimento</Badge>;
    }
    return <Badge variant="secondary">Ressarcimento</Badge>;
  };

  const handleAtivarEdicao = () => {
    if (!podeEditar) {
      toast.error('Você não tem permissão para editar lançamentos');
      return;
    }
    
    if (compromisso) {
      setDadosEdicao({
        data: compromisso.data,
        valor: compromisso.valor.toString(),
        titulo: compromisso.titulo,
        descricao: compromisso.descricao,
        tipoCompromisso: compromisso.tipoCompromisso,
        categoriaId: compromisso.categoriaId || '',
      });
      setModoEdicao(true);
    }
  };

  const handleCancelarEdicao = () => {
    setModoEdicao(false);
    setDadosEdicao({
      data: '',
      valor: '',
      titulo: '',
      descricao: '',
      tipoCompromisso: 'Investimento',
    });
  };

  const handleSalvarEdicao = () => {
    if (!dadosEdicao.titulo || !dadosEdicao.valor || !dadosEdicao.data) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    console.log('Editando compromisso:', { id: compromisso?.id, data: dadosEdicao });
    toast.success('Compromisso atualizado com sucesso!');
    setModoEdicao(false);
    
    if (onEditar) {
      onEditar();
    }
  };

  const handleFechar = () => {
    setModoEdicao(false);
    setDadosEdicao({
      data: '',
      valor: '',
      titulo: '',
      descricao: '',
      tipoCompromisso: 'Investimento',
    });
    onOpenChange(false);
  };

  const pagamentosRelacionados = pagamentos.filter(p => p.compromissoId === compromisso?.id);

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleFechar()}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col" aria-describedby={undefined}>
        <DialogHeader className="pb-3 flex-shrink-0 pr-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl mb-1 break-words">
                {modoEdicao ? 'Editar Compromisso' : compromisso?.titulo}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-3 mt-2">
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <Calendar className="h-3.5 w-3.5" />
                  {compromisso && formatDate(modoEdicao ? dadosEdicao.data : compromisso.data)}
                </span>
                <span>•</span>
                {compromisso && getTipoCompromissoBadge(modoEdicao ? dadosEdicao.tipoCompromisso : compromisso.tipoCompromisso)}
                {!modoEdicao && (
                  <>
                    <span>•</span>
                    {compromisso && getStatusBadge(compromisso.status)}
                  </>
                )}
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

        {compromisso && (
          <>
            {!modoEdicao ? (
              <>
                {/* Resumo de Valores - Compacto */}
                <div className="grid grid-cols-3 gap-3 p-4 bg-muted/30 rounded-lg flex-shrink-0">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Valor Total</p>
                    <p className="text-xl font-semibold">{formatCurrency(compromisso.valor)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Pago</p>
                    <p className="text-xl font-semibold text-green-600">
                      {formatCurrency(compromisso.valorPago)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Pendente</p>
                    <p className="text-xl font-semibold text-red-600">
                      {formatCurrency(compromisso.valorPendente)}
                    </p>
                  </div>
                </div>

                {/* Tabs para Organizar Conteúdo */}
                <Tabs defaultValue="geral" className="flex-1 overflow-hidden flex flex-col">
                  <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
                    <TabsTrigger value="geral">
                      <FileText className="h-4 w-4 mr-2" />
                      Informações
                    </TabsTrigger>
                    <TabsTrigger value="arquivos">
                      <Paperclip className="h-4 w-4 mr-2" />
                      Arquivos ({compromisso.arquivos?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="pagamentos">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Pagamentos ({pagamentosRelacionados.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* Conteúdo das Tabs - Com Scroll */}
                  <div className="flex-1 overflow-y-auto mt-4">
                    <TabsContent value="geral" className="mt-0 space-y-4">
                      {/* Cliente (se aplicável) */}
                      {showCliente && (
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <Label className="text-xs text-muted-foreground mb-1 block">Cliente</Label>
                          <p className="font-medium">{compromisso.clienteNome}</p>
                        </div>
                      )}

                      {/* Categoria */}
                      {compromisso.categoriaNome && (
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <Label className="text-xs text-muted-foreground mb-1 block">Categoria</Label>
                          <p className="font-medium">{compromisso.categoriaNome}</p>
                        </div>
                      )}

                      {/* Descrição */}
                      {compromisso.descricao && (
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Descrição</Label>
                          <div className="p-3 bg-muted/30 rounded-md">
                            <p className="text-sm whitespace-pre-wrap">{compromisso.descricao}</p>
                          </div>
                        </div>
                      )}

                      {/* Histórico de Alterações - Timeline */}
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
                                  {new Date(compromisso.dataCriacao).toLocaleString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">por {compromisso.criadoPor}</p>
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
                                  {new Date(compromisso.dataAtualizacao).toLocaleString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">por {compromisso.atualizadoPor}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="arquivos" className="mt-0">
                      {compromisso.arquivos && compromisso.arquivos.length > 0 ? (
                        <div className="space-y-2">
                          {compromisso.arquivos.map((arquivo) => (
                            <div
                              key={arquivo.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{arquivo.nomeArquivo}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                                    <Badge variant="outline" className="text-xs">
                                      {arquivo.tipoArquivoNome}
                                    </Badge>
                                    <span>•</span>
                                    <span>{formatFileSize(arquivo.tamanho)}</span>
                                    <span>•</span>
                                    <span>{formatDate(arquivo.dataUpload)}</span>
                                    <span>•</span>
                                    <span>{arquivo.uploadedBy}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                {onVisualizarArquivo && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onVisualizarArquivo(arquivo.nomeArquivo, arquivo.url)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                                {onBaixarArquivo && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onBaixarArquivo(arquivo.nomeArquivo, arquivo.url)}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Paperclip className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Nenhum arquivo anexado</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="pagamentos" className="mt-0">
                      {pagamentosRelacionados.length > 0 ? (
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[120px]">Data</TableHead>
                                <TableHead className="w-[140px]">Valor</TableHead>
                                <TableHead className="min-w-[150px]">Forma de Pagamento</TableHead>
                                <TableHead>Observações</TableHead>
                                <TableHead className="w-[80px]">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {pagamentosRelacionados.map(pag => (
                                <TableRow key={pag.id}>
                                  <TableCell className="whitespace-nowrap">{formatDate(pag.dataPagamento)}</TableCell>
                                  <TableCell className="font-medium">{formatCurrency(pag.valor)}</TableCell>
                                  <TableCell>{pag.formaPagamento}</TableCell>
                                  <TableCell className="max-w-[200px] truncate">
                                    {pag.observacoes || '-'}
                                  </TableCell>
                                  <TableCell>
                                    {onVisualizarPagamento && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onVisualizarPagamento(pag.id)}
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Nenhum pagamento registrado</p>
                        </div>
                      )}
                    </TabsContent>
                  </div>
                </Tabs>
              </>
            ) : (
              /* Formulário de Edição */
              <div className="flex-1 overflow-y-auto space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-data">Data *</Label>
                    <Input
                      id="edit-data"
                      type="date"
                      value={dadosEdicao.data}
                      onChange={(e) =>
                        setDadosEdicao({ ...dadosEdicao, data: e.target.value })
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
                    <Label htmlFor="edit-tipoCompromisso">Tipo de Compromisso *</Label>
                    <Select
                      value={dadosEdicao.tipoCompromisso}
                      onValueChange={(value: TipoCompromisso) =>
                        setDadosEdicao({ ...dadosEdicao, tipoCompromisso: value })
                      }
                    >
                      <SelectTrigger id="edit-tipoCompromisso">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Investimento">Investimento</SelectItem>
                        <SelectItem value="Ressarcimento">Ressarcimento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-categoria">Categoria</Label>
                    <Combobox
                      options={categoriasContaCorrenteMock.filter(c => c.ativo).map(c => ({
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
                  <Label htmlFor="edit-titulo">Título *</Label>
                  <Input
                    id="edit-titulo"
                    placeholder="Ex: Investimento em Material de PDV"
                    value={dadosEdicao.titulo}
                    onChange={(e) =>
                      setDadosEdicao({ ...dadosEdicao, titulo: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-descricao">Descrição</Label>
                  <Textarea
                    id="edit-descricao"
                    placeholder="Descreva os detalhes do compromisso..."
                    rows={4}
                    value={dadosEdicao.descricao}
                    onChange={(e) =>
                      setDadosEdicao({ ...dadosEdicao, descricao: e.target.value })
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