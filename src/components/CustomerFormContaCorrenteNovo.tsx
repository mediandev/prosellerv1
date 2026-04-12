import { useState, useMemo, useEffect } from 'react';
import { Cliente } from '../types/customer';
import { Compromisso, Pagamento, TipoCompromisso, TipoArquivo } from '../types/contaCorrente';
import { api } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Combobox } from './ui/combobox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Plus, FileText, TrendingUp, TrendingDown, DollarSign, Calendar, Filter, X, Paperclip } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface CustomerFormContaCorrenteProps {
  formData: Partial<Cliente>;
  readOnly: boolean;
}

type TipoLancamento = 'compromisso' | 'pagamento';
type TipoFiltro = 'todos' | 'compromissos' | 'pagamentos';
type StatusFiltro = 'todos' | 'Pendente' | 'Pago Parcialmente' | 'Pago Integralmente';

interface LancamentoUnificado {
  id: string;
  tipo: TipoLancamento;
  data: string;
  titulo: string;
  descricao: string;
  valor: number;
  tipoCompromisso?: TipoCompromisso;
  formaPagamento?: string;
  status?: string;
  valorPago?: number;
  valorPendente?: number;
  compromissoTitulo?: string;
  observacoes?: string;
  arquivosCount?: number;
}

export function CustomerFormContaCorrente({ formData, readOnly }: CustomerFormContaCorrenteProps) {
  // Estados para os dialogs
  const [dialogCompromissoOpen, setDialogCompromissoOpen] = useState(false);
  const [dialogPagamentoOpen, setDialogPagamentoOpen] = useState(false);
  const [dialogNovoTipoArquivoOpen, setDialogNovoTipoArquivoOpen] = useState(false);

  // Estados de filtros
  const [filtroTipo, setFiltroTipo] = useState<TipoFiltro>('todos');
  const [filtroStatus, setFiltroStatus] = useState<StatusFiltro>('todos');
  const [filtroPeriodoInicio, setFiltroPeriodoInicio] = useState('');
  const [filtroPeriodoFim, setFiltroPeriodoFim] = useState('');
  const [filtroBusca, setFiltroBusca] = useState('');

  // Estados para os formulários
  const [novoCompromisso, setNovoCompromisso] = useState({
    data: new Date().toISOString().split('T')[0],
    valor: '',
    titulo: '',
    descricao: '',
    tipoCompromisso: 'Investimento' as TipoCompromisso,
    arquivos: [] as { file: File; tipoArquivoId: string; tipoArquivoNome: string }[],
  });

  const [novoPagamento, setNovoPagamento] = useState({
    compromissoId: '',
    dataPagamento: new Date().toISOString().split('T')[0],
    valor: '',
    formaPagamento: '',
    observacoes: '',
    comprovanteFile: null as File | null,
  });

  const [novoTipoArquivo, setNovoTipoArquivo] = useState({
    nome: '',
    descricao: '',
  });

  const [tiposArquivo, setTiposArquivo] = useState<TipoArquivo[]>([]);

  // Estados para dados do servidor
  const [compromissos, setCompromissos] = useState<Compromisso[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<any[]>([]);

  // Carregar dados do servidor
  useEffect(() => {
    const carregarDados = async () => {
      if (!formData.id) return;
      
      try {
        const [compData, pagData, tiposData, formasData] = await Promise.all([
          api.get(`conta-corrente/compromissos?clienteId=${formData.id}`),
          api.get(`conta-corrente/pagamentos?clienteId=${formData.id}`),
          api.get('conta-corrente/tipos-arquivo'),
          api.get('formas-pagamento'),
        ]);
        setCompromissos(compData || []);
        setPagamentos(pagData || []);
        setTiposArquivo(tiposData || []);
        setFormasPagamento(formasData || []);
      } catch (error) {
        console.error('[CONTA-CORRENTE-NOVO] Erro ao carregar dados:', error);
        setCompromissos([]);
        setPagamentos([]);
        setTiposArquivo([]);
        setFormasPagamento([]);
      }
    };
    carregarDados();
  }, [formData.id]);

  // Formas de pagamento disponíveis para conta corrente (apenas ativas)
  const formasPagamentoDisponiveis = useMemo(() => {
    return formasPagamento.filter(f => f.ativo && f.usarEmContaCorrente);
  }, [formasPagamento]);

  // Unificar compromissos e pagamentos
  const lancamentosUnificados = useMemo((): LancamentoUnificado[] => {
    const lancamentos: LancamentoUnificado[] = [];

    // Adicionar compromissos
    compromissos.forEach((c) => {
      lancamentos.push({
        id: `comp-${c.id}`,
        tipo: 'compromisso',
        data: c.data,
        titulo: c.titulo,
        descricao: c.descricao,
        valor: c.valor,
        tipoCompromisso: c.tipoCompromisso,
        status: c.status,
        valorPago: c.valorPago,
        valorPendente: c.valorPendente,
        arquivosCount: c.arquivos?.length || 0,
      });
    });

    // Adicionar pagamentos
    pagamentos.forEach((p) => {
      lancamentos.push({
        id: `pag-${p.id}`,
        tipo: 'pagamento',
        data: p.dataPagamento,
        titulo: p.compromissoTitulo,
        descricao: p.observacoes || '',
        valor: p.valor,
        formaPagamento: p.formaPagamento,
        compromissoTitulo: p.compromissoTitulo,
        observacoes: p.observacoes,
      });
    });

    // Ordenar por data (mais recente primeiro)
    return lancamentos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [compromissos, pagamentos]);

  // Aplicar filtros
  const lancamentosFiltrados = useMemo(() => {
    let resultado = lancamentosUnificados;

    // Filtro por tipo
    if (filtroTipo !== 'todos') {
      resultado = resultado.filter(l => {
        if (filtroTipo === 'compromissos') return l.tipo === 'compromisso';
        if (filtroTipo === 'pagamentos') return l.tipo === 'pagamento';
        return true;
      });
    }

    // Filtro por status (apenas para compromissos)
    if (filtroStatus !== 'todos') {
      resultado = resultado.filter(l => {
        if (l.tipo === 'compromisso') return l.status === filtroStatus;
        return true;
      });
    }

    // Filtro por período
    if (filtroPeriodoInicio) {
      resultado = resultado.filter(l => l.data >= filtroPeriodoInicio);
    }
    if (filtroPeriodoFim) {
      resultado = resultado.filter(l => l.data <= filtroPeriodoFim);
    }

    // Filtro por busca
    if (filtroBusca) {
      const busca = filtroBusca.toLowerCase();
      resultado = resultado.filter(l =>
        l.titulo.toLowerCase().includes(busca) ||
        l.descricao.toLowerCase().includes(busca)
      );
    }

    return resultado;
  }, [lancamentosUnificados, filtroTipo, filtroStatus, filtroPeriodoInicio, filtroPeriodoFim, filtroBusca]);

  // Cálculo do resumo
  const resumo = useMemo(() => {
    const totalInvestimentos = compromissos
      .filter((c) => c.tipoCompromisso === 'Investimento')
      .reduce((acc, c) => acc + c.valor, 0);

    const totalRessarcimentos = compromissos
      .filter((c) => c.tipoCompromisso === 'Ressarcimento')
      .reduce((acc, c) => acc + c.valor, 0);

    const totalPago = compromissos.reduce((acc, c) => acc + c.valorPago, 0);
    const totalPendente = compromissos.reduce((acc, c) => acc + c.valorPendente, 0);

    return {
      totalInvestimentos,
      totalRessarcimentos,
      totalPago,
      totalPendente,
      quantidadeCompromissos: compromissos.length,
      quantidadePagamentos: pagamentos.length,
    };
  }, [compromissos, pagamentos]);

  // Opções para comboboxes
  const tiposArquivoOptions = useMemo(
    () => tiposArquivo.map((t) => ({ value: t.id, label: t.nome })),
    [tiposArquivo]
  );

  const compromissosOptions = useMemo(
    () =>
      compromissos
        .filter((c) => c.valorPendente > 0)
        .map((c) => ({ value: c.id, label: `${c.titulo} (R$ ${c.valorPendente.toFixed(2)} pendente)` })),
    [compromissos]
  );

  // Handlers
  const handleSalvarCompromisso = () => {
    if (!novoCompromisso.titulo || !novoCompromisso.valor || !novoCompromisso.data) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    console.log('Salvando compromisso:', novoCompromisso);
    toast.success('Compromisso salvo com sucesso!');
    setDialogCompromissoOpen(false);
    
    setNovoCompromisso({
      data: new Date().toISOString().split('T')[0],
      valor: '',
      titulo: '',
      descricao: '',
      tipoCompromisso: 'Investimento',
      arquivos: [],
    });
  };

  const handleSalvarPagamento = () => {
    if (!novoPagamento.compromissoId || !novoPagamento.valor || !novoPagamento.formaPagamento) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    console.log('Salvando pagamento:', novoPagamento);
    toast.success('Pagamento registrado com sucesso!');
    setDialogPagamentoOpen(false);
    
    setNovoPagamento({
      compromissoId: '',
      dataPagamento: new Date().toISOString().split('T')[0],
      valor: '',
      formaPagamento: '',
      observacoes: '',
      comprovanteFile: null,
    });
  };

  const handleAdicionarArquivo = (file: File, tipoArquivoId: string) => {
    const tipoArquivo = tiposArquivo.find((t) => t.id === tipoArquivoId);
    if (!tipoArquivo) return;

    setNovoCompromisso({
      ...novoCompromisso,
      arquivos: [
        ...novoCompromisso.arquivos,
        { file, tipoArquivoId, tipoArquivoNome: tipoArquivo.nome },
      ],
    });
  };

  const handleRemoverArquivo = (index: number) => {
    setNovoCompromisso({
      ...novoCompromisso,
      arquivos: novoCompromisso.arquivos.filter((_, i) => i !== index),
    });
  };

  const handleCriarTipoArquivo = () => {
    if (!novoTipoArquivo.nome) {
      toast.error('Digite o nome do tipo de arquivo');
      return;
    }

    const novoTipo: TipoArquivo = {
      id: `temp-${Date.now()}`,
      nome: novoTipoArquivo.nome,
      descricao: novoTipoArquivo.descricao,
    };

    setTiposArquivo([...tiposArquivo, novoTipo]);
    toast.success(`Tipo de arquivo "${novoTipo.nome}" criado com sucesso!`);
    setDialogNovoTipoArquivoOpen(false);
    setNovoTipoArquivo({ nome: '', descricao: '' });
  };

  const limparFiltros = () => {
    setFiltroTipo('todos');
    setFiltroStatus('todos');
    setFiltroPeriodoInicio('');
    setFiltroPeriodoFim('');
    setFiltroBusca('');
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'Pendente': 'destructive',
      'Pago Parcialmente': 'secondary',
      'Pago Integralmente': 'default',
      'Cancelado': 'outline',
    };

    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getTipoBadge = (tipo: TipoLancamento) => {
    if (tipo === 'compromisso') {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Compromisso</Badge>;
    }
    return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Pagamento</Badge>;
  };

  const getTipoCompromissoBadge = (tipo: TipoCompromisso) => {
    if (tipo === 'Investimento') {
      return <Badge variant="default">Investimento</Badge>;
    }
    return <Badge variant="secondary">Ressarcimento</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Investimentos</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{formatCurrency(resumo.totalInvestimentos)}</div>
            <p className="text-xs text-muted-foreground">Acordos firmados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Ressarcimentos</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{formatCurrency(resumo.totalRessarcimentos)}</div>
            <p className="text-xs text-muted-foreground">Compensações devidas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Pago</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{formatCurrency(resumo.totalPago)}</div>
            <p className="text-xs text-muted-foreground">{resumo.quantidadePagamentos} pagamentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Saldo Pendente</CardTitle>
            <Calendar className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{formatCurrency(resumo.totalPendente)}</div>
            <p className="text-xs text-muted-foreground">A pagar</p>
          </CardContent>
        </Card>
      </div>

      {/* Movimentações Unificadas */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Movimentações da Conta Corrente</CardTitle>
              <CardDescription>Compromissos e pagamentos registrados</CardDescription>
            </div>
            {!readOnly && (
              <div className="flex gap-2">
                <Dialog open={dialogCompromissoOpen} onOpenChange={setDialogCompromissoOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Compromisso
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
                    <DialogHeader>
                      <DialogTitle>Novo Compromisso</DialogTitle>
                      <DialogDescription>
                        Registre um novo investimento ou ressarcimento acordado com o cliente
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="data">Data *</Label>
                          <Input
                            id="data"
                            type="date"
                            value={novoCompromisso.data}
                            onChange={(e) =>
                              setNovoCompromisso({ ...novoCompromisso, data: e.target.value })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="valor">Valor *</Label>
                          <Input
                            id="valor"
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            value={novoCompromisso.valor}
                            onChange={(e) =>
                              setNovoCompromisso({ ...novoCompromisso, valor: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tipoCompromisso">Tipo de Compromisso *</Label>
                        <Select
                          value={novoCompromisso.tipoCompromisso}
                          onValueChange={(value: TipoCompromisso) =>
                            setNovoCompromisso({ ...novoCompromisso, tipoCompromisso: value })
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
                        <Label htmlFor="titulo">Título *</Label>
                        <Input
                          id="titulo"
                          placeholder="Ex: Investimento em Material de PDV"
                          value={novoCompromisso.titulo}
                          onChange={(e) =>
                            setNovoCompromisso({ ...novoCompromisso, titulo: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="descricao">Descrição</Label>
                        <Textarea
                          id="descricao"
                          placeholder="Descreva os detalhes do compromisso..."
                          rows={4}
                          value={novoCompromisso.descricao}
                          onChange={(e) =>
                            setNovoCompromisso({ ...novoCompromisso, descricao: e.target.value })
                          }
                        />
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Arquivos Anexos</Label>
                          <Dialog open={dialogNovoTipoArquivoOpen} onOpenChange={setDialogNovoTipoArquivoOpen}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Plus className="h-3 w-3 mr-1" />
                                Novo Tipo
                              </Button>
                            </DialogTrigger>
                            <DialogContent aria-describedby={undefined}>
                              <DialogHeader>
                                <DialogTitle>Novo Tipo de Arquivo</DialogTitle>
                                <DialogDescription>
                                  Crie um novo tipo de arquivo para classificação
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="nomeTipo">Nome *</Label>
                                  <Input
                                    id="nomeTipo"
                                    placeholder="Ex: Certificado"
                                    value={novoTipoArquivo.nome}
                                    onChange={(e) =>
                                      setNovoTipoArquivo({ ...novoTipoArquivo, nome: e.target.value })
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="descricaoTipo">Descrição</Label>
                                  <Input
                                    id="descricaoTipo"
                                    placeholder="Breve descrição do tipo"
                                    value={novoTipoArquivo.descricao}
                                    onChange={(e) =>
                                      setNovoTipoArquivo({ ...novoTipoArquivo, descricao: e.target.value })
                                    }
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setDialogNovoTipoArquivoOpen(false)}>
                                  Cancelar
                                </Button>
                                <Button onClick={handleCriarTipoArquivo}>Criar Tipo</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>

                        {novoCompromisso.arquivos.length > 0 && (
                          <div className="space-y-2">
                            {novoCompromisso.arquivos.map((arquivo, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-2 border rounded"
                              >
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4" />
                                  <div>
                                    <p className="text-sm">{arquivo.file.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {arquivo.tipoArquivoNome} • {formatFileSize(arquivo.file.size)}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoverArquivo(index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="grid gap-2 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="tipoArquivo">Tipo de Arquivo</Label>
                            <Combobox
                              options={tiposArquivoOptions}
                              value=""
                              onValueChange={(value) => {
                                const input = document.getElementById('fileInput') as HTMLInputElement;
                                if (input) {
                                  input.dataset.tipoArquivoId = value;
                                  input.click();
                                }
                              }}
                              placeholder="Selecione o tipo"
                              searchPlaceholder="Pesquisar tipo..."
                              emptyText="Nenhum tipo encontrado."
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="fileInput">Arquivo</Label>
                            <Input
                              id="fileInput"
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                const tipoArquivoId = (e.target as HTMLInputElement).dataset.tipoArquivoId;
                                if (file && tipoArquivoId) {
                                  handleAdicionarArquivo(file, tipoArquivoId);
                                  e.target.value = '';
                                }
                              }}
                            />
                            <div className="text-sm text-muted-foreground">
                              Selecione o tipo de arquivo primeiro
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDialogCompromissoOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleSalvarCompromisso}>Salvar Compromisso</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {compromissosOptions.length > 0 && (
                  <Dialog open={dialogPagamentoOpen} onOpenChange={setDialogPagamentoOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Registrar Pagamento
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl" aria-describedby={undefined}>
                      <DialogHeader>
                        <DialogTitle>Registrar Pagamento</DialogTitle>
                        <DialogDescription>
                          Registre um pagamento realizado para um compromisso
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="compromisso">Compromisso *</Label>
                          <Combobox
                            options={compromissosOptions}
                            value={novoPagamento.compromissoId}
                            onValueChange={(value) =>
                              setNovoPagamento({ ...novoPagamento, compromissoId: value })
                            }
                            placeholder="Selecione o compromisso"
                            searchPlaceholder="Pesquisar compromisso..."
                            emptyText="Nenhum compromisso pendente."
                          />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="dataPagamento">Data do Pagamento *</Label>
                            <Input
                              id="dataPagamento"
                              type="date"
                              value={novoPagamento.dataPagamento}
                              onChange={(e) =>
                                setNovoPagamento({ ...novoPagamento, dataPagamento: e.target.value })
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="valorPagamento">Valor *</Label>
                            <Input
                              id="valorPagamento"
                              type="number"
                              step="0.01"
                              placeholder="0,00"
                              value={novoPagamento.valor}
                              onChange={(e) =>
                                setNovoPagamento({ ...novoPagamento, valor: e.target.value })
                              }
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="formaPagamento">Forma de Pagamento *</Label>
                          <Select
                            value={novoPagamento.formaPagamento}
                            onValueChange={(value) =>
                              setNovoPagamento({ ...novoPagamento, formaPagamento: value })
                            }
                          >
                            <SelectTrigger id="formaPagamento">
                              <SelectValue placeholder="Selecione a forma" />
                            </SelectTrigger>
                            <SelectContent>
                              {formasPagamentoDisponiveis.length === 0 ? (
                                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                  Nenhuma forma de pagamento disponível
                                </div>
                              ) : (
                                formasPagamentoDisponiveis.map((forma) => (
                                  <SelectItem key={forma.id} value={forma.nome}>
                                    {forma.nome}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="observacoes">Observações</Label>
                          <Textarea
                            id="observacoes"
                            placeholder="Informações adicionais sobre o pagamento..."
                            rows={3}
                            value={novoPagamento.observacoes}
                            onChange={(e) =>
                              setNovoPagamento({ ...novoPagamento, observacoes: e.target.value })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="comprovante">Comprovante (opcional)</Label>
                          <Input
                            id="comprovante"
                            type="file"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setNovoPagamento({ ...novoPagamento, comprovanteFile: file });
                            }}
                          />
                          {novoPagamento.comprovanteFile && (
                            <p className="text-sm text-muted-foreground">
                              {novoPagamento.comprovanteFile.name} ({formatFileSize(novoPagamento.comprovanteFile.size)})
                            </p>
                          )}
                        </div>
                      </div>

                      <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogPagamentoOpen(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleSalvarPagamento}>Registrar Pagamento</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium">Filtros</h4>
              {(filtroTipo !== 'todos' || filtroStatus !== 'todos' || filtroPeriodoInicio || filtroPeriodoFim || filtroBusca) && (
                <Button variant="ghost" size="sm" onClick={limparFiltros}>
                  <X className="h-3 w-3 mr-1" />
                  Limpar Filtros
                </Button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <Label htmlFor="filtroTipo">Tipo</Label>
                <Select value={filtroTipo} onValueChange={(value: TipoFiltro) => setFiltroTipo(value)}>
                  <SelectTrigger id="filtroTipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="compromissos">Compromissos</SelectItem>
                    <SelectItem value="pagamentos">Pagamentos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filtroStatus">Status</Label>
                <Select value={filtroStatus} onValueChange={(value: StatusFiltro) => setFiltroStatus(value)}>
                  <SelectTrigger id="filtroStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Pago Parcialmente">Pago Parcialmente</SelectItem>
                    <SelectItem value="Pago Integralmente">Pago Integralmente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="periodoInicio">Período Início</Label>
                <Input
                  id="periodoInicio"
                  type="date"
                  value={filtroPeriodoInicio}
                  onChange={(e) => setFiltroPeriodoInicio(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="periodoFim">Período Fim</Label>
                <Input
                  id="periodoFim"
                  type="date"
                  value={filtroPeriodoFim}
                  onChange={(e) => setFiltroPeriodoFim(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="busca">Buscar</Label>
                <Input
                  id="busca"
                  placeholder="Buscar por título..."
                  value={filtroBusca}
                  onChange={(e) => setFiltroBusca(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator className="mb-4" />

          {/* Tabela Unificada */}
          {lancamentosFiltrados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma movimentação encontrada</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Detalhes</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status/Info</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lancamentosFiltrados.map((lancamento) => (
                    <TableRow key={lancamento.id}>
                      <TableCell>{getTipoBadge(lancamento.tipo)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(lancamento.data)}</TableCell>
                      <TableCell className="font-medium">
                        <div>
                          {lancamento.titulo}
                          {lancamento.tipo === 'compromisso' && lancamento.tipoCompromisso && (
                            <div className="mt-1">
                              {getTipoCompromissoBadge(lancamento.tipoCompromisso)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">{lancamento.descricao}</p>
                          {lancamento.tipo === 'pagamento' && lancamento.formaPagamento && (
                            <div className="text-xs text-muted-foreground">
                              Forma: {lancamento.formaPagamento}
                            </div>
                          )}
                          {lancamento.tipo === 'compromisso' && lancamento.arquivosCount! > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Paperclip className="h-3 w-3" />
                              {lancamento.arquivosCount} arquivo(s)
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        {formatCurrency(lancamento.valor)}
                        {lancamento.tipo === 'compromisso' && (
                          <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                            <div className="text-green-600">Pago: {formatCurrency(lancamento.valorPago || 0)}</div>
                            <div className="text-red-600">Pendente: {formatCurrency(lancamento.valorPendente || 0)}</div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {lancamento.tipo === 'compromisso' && lancamento.status && getStatusBadge(lancamento.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}