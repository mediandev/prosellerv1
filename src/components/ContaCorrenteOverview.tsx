import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import { Compromisso, Pagamento, TipoCompromisso } from '../types/contaCorrente';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { Combobox } from './ui/combobox';
import { 
  Calendar, 
  DollarSign, 
  FileText, 
  Paperclip,
  Filter, 
  X, 
  Search,
  TrendingUp,
  TrendingDown,
  Plus,
  Wallet
} from 'lucide-react';
import { CompromissoDialogDetalhes } from './CompromissoDialogDetalhes';
import { PagamentoDialogDetalhes } from './PagamentoDialogDetalhes';
import { NovoCompromissoDialog } from './NovoCompromissoDialog';
import { RegistrarPagamentoDialog } from './RegistrarPagamentoDialog';

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
  status?: string;
  valorPago?: number;
  valorPendente?: number;
  tipoCompromisso?: TipoCompromisso;
  formaPagamento?: string;
  categoriaId?: string;
  categoriaNome?: string;
  arquivosCount?: number;
  clienteId: string;
  clienteNome: string;
  clienteGrupoRede?: string;
}

export function ContaCorrenteOverview() {
  const { temPermissao } = useAuth();
  
  // Estados para os dialogs
  const [dialogDetalhesCompromissoOpen, setDialogDetalhesCompromissoOpen] = useState(false);
  const [dialogDetalhesPagamentoOpen, setDialogDetalhesPagamentoOpen] = useState(false);
  const [dialogExcluirOpen, setDialogExcluirOpen] = useState(false);
  const [dialogNovoCompromissoOpen, setDialogNovoCompromissoOpen] = useState(false);
  const [dialogRegistrarPagamentoOpen, setDialogRegistrarPagamentoOpen] = useState(false);
  const [dialogNovoTipoArquivoOpen, setDialogNovoTipoArquivoOpen] = useState(false);
  const [compromissoSelecionado, setCompromissoSelecionado] = useState<Compromisso | null>(null);
  const [compromissoParaPagamento, setCompromissoParaPagamento] = useState<Compromisso | null>(null);
  const [pagamentoSelecionado, setPagamentoSelecionado] = useState<Pagamento | null>(null);
  const [itemParaExcluir, setItemParaExcluir] = useState<{ id: string; tipo: TipoLancamento; titulo: string } | null>(null);

  // Estados de filtros
  const [filtroTipo, setFiltroTipo] = useState<TipoFiltro>('todos');
  const [filtroStatus, setFiltroStatus] = useState<StatusFiltro>('todos');
  const [filtroPeriodoInicio, setFiltroPeriodoInicio] = useState('');
  const [filtroPeriodoFim, setFiltroPeriodoFim] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroGrupoRede, setFiltroGrupoRede] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroBusca, setFiltroBusca] = useState('');
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(false);

  // Permissões
  const podeEditar = temPermissao('contacorrente.editar');
  const podeExcluir = temPermissao('contacorrente.excluir');

  // Estados de dados
  const [compromissos, setCompromissos] = useState<Compromisso[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<any[]>([]);
  const [gruposRedes, setGruposRedes] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<any[]>([]);
  
  // Estados para paginação e estatísticas
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(50);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [estatisticas, setEstatisticas] = useState<{
    totalCompromissos?: number;
    totalPagamentos?: number;
    totalPendente?: number;
    quantidadeCompromissos?: number;
    quantidadePagamentos?: number;
  }>({});

  // Carregar dados
  useEffect(() => {
    carregarDados();
  }, [paginaAtual, itensPorPagina, filtroPeriodoInicio, filtroPeriodoFim, filtroCliente, filtroStatus, filtroBusca]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      console.log('[CONTA-CORRENTE] Carregando dados...');
      
      // Preparar filtros para a API
      const params: Record<string, any> = {
        page: paginaAtual,
        limit: itensPorPagina,
      };
      
      if (filtroPeriodoInicio) params.dataInicio = filtroPeriodoInicio;
      if (filtroPeriodoFim) params.dataFim = filtroPeriodoFim;
      if (filtroCliente) params.cliente = filtroCliente;
      if (filtroStatus !== 'todos') params.status = filtroStatus;
      if (filtroBusca) params.search = filtroBusca;
      
      console.log('[CONTA-CORRENTE] Chamando api.contaCorrente.list com params:', params);
      
      // Buscar compromissos da Edge Function
      const response = await api.contaCorrente.list({ params });
      
      console.log('[CONTA-CORRENTE] Resposta da API:', response);
      console.log('[CONTA-CORRENTE] Tipo da resposta:', typeof response);
      console.log('[CONTA-CORRENTE] response.compromissos:', response?.compromissos);
      console.log('[CONTA-CORRENTE] response.pagination:', response?.pagination);
      console.log('[CONTA-CORRENTE] response.estatisticas:', response?.estatisticas);
      
      // Mapear compromissos da API para o formato do frontend
      const compromissosMapeados = (response.compromissos || []).map((comp: any): Compromisso => ({
        id: String(comp.id),
        clienteId: String(comp.clienteId),
        clienteNome: comp.clienteNome || '',
        data: comp.data,
        valor: Number(comp.valor),
        titulo: comp.titulo || '',
        descricao: comp.descricao || '',
        tipoCompromisso: comp.tipoCompromisso === 'Investimento' ? 'Investimento' : 'Ressarcimento',
        categoriaId: comp.categoriaId ? String(comp.categoriaId) : undefined,
        categoriaNome: comp.categoria || comp.categoriaNome,
        arquivos: Array.isArray(comp.arquivosAnexos) ? comp.arquivosAnexos.map((arq: any) => ({
          id: String(arq.id || ''),
          nomeArquivo: arq.nomeArquivo || arq.nome || '',
          tamanho: Number(arq.tamanho || 0),
          tipoArquivoId: String(arq.tipoArquivoId || ''),
          tipoArquivoNome: arq.tipoArquivoNome || arq.tipo || '',
          url: arq.url || '',
          dataUpload: arq.dataUpload || arq.data || '',
          uploadedBy: arq.uploadedBy || arq.criadoPor || '',
        })) : [],
        status: comp.status === 'Pendente' ? 'Pendente' : 
                comp.status === 'Pago Parcialmente' ? 'Pago Parcialmente' : 
                comp.status === 'Pago Integralmente' ? 'Pago Integralmente' : 
                'Pendente',
        valorPago: Number(comp.valorPago || 0),
        valorPendente: Number(comp.valorPendente || comp.valor),
        dataCriacao: comp.dataCriacao || new Date().toISOString(),
        criadoPor: comp.criadoPor || 'Sistema',
        dataAtualizacao: comp.dataAtualizacao || comp.dataCriacao || new Date().toISOString(),
        atualizadoPor: comp.atualizadoPor || comp.criadoPor || 'Sistema',
      }));
      
      setCompromissos(compromissosMapeados);
      
      // Não buscar pagamentos de todos os compromissos de uma vez (ineficiente)
      // Os pagamentos serão buscados apenas quando necessário (ao visualizar um compromisso)
      // Por enquanto, manteremos o estado vazio ou apenas os pagamentos já carregados
      // setPagamentos([]);
      
      // Atualizar paginação e estatísticas
      if (response.pagination) {
        setTotalRegistros(response.pagination.total || 0);
        setPaginaAtual(response.pagination.page || 1);
      }
      
      if (response.estatisticas) {
        setEstatisticas(response.estatisticas);
      }
      
      // Carregar dados auxiliares
      const [clientesAPI, gruposAPI, categsAPI, formasAPI] = await Promise.all([
        api.get('clientes'),
        api.get('grupos-redes'),
        api.get('categorias-conta-corrente'),
        api.get('formas-pagamento'),
      ]);

      setClientes(Array.isArray(clientesAPI) ? clientesAPI : (clientesAPI?.data || []));
      
      // A API pode retornar um array direto ou um objeto com paginação
      let gruposArray = [];
      if (Array.isArray(gruposAPI)) {
        gruposArray = gruposAPI;
      } else if (gruposAPI && typeof gruposAPI === 'object' && 'grupos' in gruposAPI) {
        gruposArray = gruposAPI.grupos || [];
      }
      setGruposRedes(gruposArray);
      
      setCategorias(categsAPI || []);
      setFormasPagamento(formasAPI || []);

      console.log('[CONTA-CORRENTE] Dados carregados:', {
        compromissos: compromissosMapeados.length,
        pagamentos: pagamentos.length,
        clientes: Array.isArray(clientesAPI) ? clientesAPI.length : (clientesAPI?.data?.length || 0),
        estatisticas: response.estatisticas
      });
    } catch (error) {
      console.error('[CONTA-CORRENTE] Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados.');
      setCompromissos([]);
      setPagamentos([]);
      setClientes([]);
      setGruposRedes([]);
      setCategorias([]);
      setFormasPagamento([]);
    } finally {
      setLoading(false);
    }
  };

  // Funções auxiliares (declaradas antes dos useMemo)
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString || dateString === 'undefined' || dateString === 'null') {
      return '-';
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return '-';
      }
      return date.toLocaleDateString('pt-BR');
    } catch (error) {
      return '-';
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'Pendente': 'destructive',
      'Pago Parcialmente': 'outline',
      'Pago Integralmente': 'default',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getTipoBadge = (tipo: TipoLancamento) => {
    if (tipo === 'compromisso') {
      return <Badge variant="secondary">Compromisso</Badge>;
    }
    return <Badge variant="outline">Pagamento</Badge>;
  };

  const getTipoCompromissoBadge = (tipo: TipoCompromisso) => {
    if (tipo === 'Investimento') {
      return <Badge variant="default" className="bg-blue-500"><TrendingUp className="h-3 w-3 mr-1" /> Investimento</Badge>;
    }
    return <Badge variant="default" className="bg-orange-500"><TrendingDown className="h-3 w-3 mr-1" /> Ressarcimento</Badge>;
  };

  // Preparar opções para combobox
  const clientesOptions = useMemo(() => {
    return clientes.map(cliente => ({
      label: `${cliente.codigo ? `[${cliente.codigo}] ` : ''}${cliente.razaoSocial}`,
      value: cliente.id,
    }));
  }, [clientes]);

  const gruposRedesOptions = useMemo(() => {
    // Garantir que gruposRedes seja um array
    if (!Array.isArray(gruposRedes)) {
      return [];
    }
    return gruposRedes.map(grupo => ({
      label: grupo.nome,
      value: grupo.nome,
    }));
  }, [gruposRedes]);

  const categoriasOptions = useMemo(() => {
    return categorias
      .filter(c => c.ativo)
      .map(c => ({
        label: c.nome,
        value: c.id,
      }));
  }, [categorias]);

  const formasPagamentoOptions = useMemo(() => {
    return formasPagamento
      .filter(f => f.ativo && f.usarEmContaCorrente)
      .map(f => ({
        label: f.nome,
        value: f.id,
      }));
  }, [formasPagamento]);

  // Unificar compromissos e pagamentos em uma única lista
  // Nota: Por padrão, mostramos apenas compromissos na tabela unificada
  // Os pagamentos são mostrados apenas nos detalhes do compromisso
  const lancamentosUnificados = useMemo((): LancamentoUnificado[] => {
    const compromissosComTipo: LancamentoUnificado[] = compromissos.map((comp) => ({
      id: `comp-${comp.id}`,
      tipo: 'compromisso' as TipoLancamento,
      data: comp.data,
      titulo: comp.titulo,
      descricao: comp.descricao,
      valor: comp.valor,
      status: comp.status,
      valorPago: comp.valorPago,
      valorPendente: comp.valorPendente,
      tipoCompromisso: comp.tipoCompromisso,
      categoriaId: comp.categoriaId,
      categoriaNome: comp.categoriaNome,
      arquivosCount: comp.arquivos?.length || 0,
      clienteId: comp.clienteId,
      clienteNome: comp.clienteNome,
      clienteGrupoRede: comp.clienteGrupoRede || clientes.find(c => c.id === comp.clienteId)?.grupoRede,
    }));

    // Incluir pagamentos apenas se estiverem carregados (ex: após visualizar um compromisso)
    const pagamentosComTipo: LancamentoUnificado[] = pagamentos.map((pag) => {
      const compromisso = compromissos.find((c) => c.id === pag.compromissoId);
      return {
        id: `pag-${pag.id}`,
        tipo: 'pagamento' as TipoLancamento,
        data: pag.dataPagamento,
        titulo: pag.compromissoTitulo,
        descricao: pag.observacoes || '',
        valor: pag.valor,
        formaPagamento: pag.formaPagamento,
        categoriaId: pag.categoriaId,
        categoriaNome: pag.categoriaNome,
        clienteId: compromisso?.clienteId || '',
        clienteNome: compromisso?.clienteNome || '',
        clienteGrupoRede: compromisso ? (compromisso.clienteGrupoRede || clientes.find(c => c.id === compromisso.clienteId)?.grupoRede) : undefined,
      };
    });

    return [...compromissosComTipo, ...pagamentosComTipo].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
    );
  }, [compromissos, pagamentos, clientes]);

  // Aplicar filtros
  const lancamentosFiltrados = useMemo(() => {
    return lancamentosUnificados.filter((lancamento) => {
      // Filtro por tipo
      if (filtroTipo === 'compromissos' && lancamento.tipo !== 'compromisso') return false;
      if (filtroTipo === 'pagamentos' && lancamento.tipo !== 'pagamento') return false;

      // Filtro por status (apenas para compromissos)
      if (filtroStatus !== 'todos' && lancamento.tipo === 'compromisso') {
        if (lancamento.status !== filtroStatus) return false;
      }

      // Filtro por período
      if (filtroPeriodoInicio && lancamento.data < filtroPeriodoInicio) return false;
      if (filtroPeriodoFim && lancamento.data > filtroPeriodoFim) return false;

      // Filtro por cliente
      if (filtroCliente && lancamento.clienteId !== filtroCliente) return false;

      // Filtro por grupo/rede
      if (filtroGrupoRede && lancamento.clienteGrupoRede !== filtroGrupoRede) return false;

      // Filtro por categoria
      if (filtroCategoria && lancamento.categoriaId !== filtroCategoria) return false;

      // Filtro por busca (título, cliente, grupo/rede)
      if (filtroBusca) {
        const busca = filtroBusca.toLowerCase();
        const matchTitulo = lancamento.titulo.toLowerCase().includes(busca);
        const matchCliente = lancamento.clienteNome.toLowerCase().includes(busca);
        const matchGrupoRede = lancamento.clienteGrupoRede?.toLowerCase().includes(busca) || false;
        if (!matchTitulo && !matchCliente && !matchGrupoRede) return false;
      }

      return true;
    });
  }, [lancamentosUnificados, filtroTipo, filtroStatus, filtroPeriodoInicio, filtroPeriodoFim, filtroCliente, filtroGrupoRede, filtroCategoria, filtroBusca]);

  // Cálculos de totais
  const totais = useMemo(() => {
    // Usar estatísticas da API se disponíveis, senão calcular do frontend
    const totalCompromissos = estatisticas.totalCompromissos !== undefined
      ? estatisticas.totalCompromissos
      : lancamentosFiltrados
          .filter(l => l.tipo === 'compromisso')
          .reduce((sum, l) => sum + l.valor, 0);
    
    const totalPagamentos = estatisticas.totalPagamentos !== undefined
      ? estatisticas.totalPagamentos
      : lancamentosFiltrados
          .filter(l => l.tipo === 'pagamento')
          .reduce((sum, l) => sum + l.valor, 0);
    
    const totalPendente = estatisticas.totalPendente !== undefined
      ? estatisticas.totalPendente
      : lancamentosFiltrados
          .filter(l => l.tipo === 'compromisso')
          .reduce((sum, l) => sum + (l.valorPendente || 0), 0);

    return { totalCompromissos, totalPagamentos, totalPendente };
  }, [lancamentosFiltrados, estatisticas]);

  const limparFiltros = () => {
    setFiltroTipo('todos');
    setFiltroStatus('todos');
    setFiltroPeriodoInicio('');
    setFiltroPeriodoFim('');
    setFiltroCliente('');
    setFiltroGrupoRede('');
    setFiltroBusca('');
  };

  const handleVisualizarCompromisso = async (idCompromisso: string) => {
    try {
      // Buscar compromisso completo da API
      const response = await api.contaCorrente.getById(idCompromisso);
      
      if (response?.compromisso) {
        const comp = response.compromisso;
        const compromissoCompleto: Compromisso = {
          id: String(comp.id),
          clienteId: String(comp.clienteId),
          clienteNome: comp.clienteNome || '',
          data: comp.data,
          valor: Number(comp.valor),
          titulo: comp.titulo || '',
          descricao: comp.descricao || '',
          tipoCompromisso: comp.tipoCompromisso === 'Investimento' ? 'Investimento' : 'Ressarcimento',
          categoriaId: comp.categoriaId ? String(comp.categoriaId) : undefined,
          categoriaNome: comp.categoriaNome,
          arquivos: Array.isArray(comp.arquivosAnexos) ? comp.arquivosAnexos.map((arq: any) => ({
            id: String(arq.id || ''),
            nomeArquivo: arq.nomeArquivo || arq.nome || '',
            tamanho: Number(arq.tamanho || 0),
            tipoArquivoId: String(arq.tipoArquivoId || ''),
            tipoArquivoNome: arq.tipoArquivoNome || arq.tipo || '',
            url: arq.url || '',
            dataUpload: arq.dataUpload || arq.data || '',
            uploadedBy: arq.uploadedBy || arq.criadoPor || '',
          })) : [],
          status: comp.status === 'Pendente' ? 'Pendente' : 
                  comp.status === 'Pago Parcialmente' ? 'Pago Parcialmente' : 
                  comp.status === 'Pago Integralmente' ? 'Pago Integralmente' : 
                  'Pendente',
          valorPago: Number(comp.valorPago || 0),
          valorPendente: Number(comp.valorPendente || comp.valor),
          dataCriacao: comp.dataCriacao || new Date().toISOString(),
          criadoPor: comp.criadoPor || 'Sistema',
          dataAtualizacao: comp.dataAtualizacao || comp.dataCriacao || new Date().toISOString(),
          atualizadoPor: comp.atualizadoPor || comp.criadoPor || 'Sistema',
        };
        
        setCompromissoSelecionado(compromissoCompleto);
        
        // Mapear pagamentos
        const pagamentosMapeados = (response.pagamentos || []).map((pag: any): Pagamento => {
          // Garantir que compromissoId seja tratado corretamente
          const compromissoIdValue = pag.compromissoId != null && pag.compromissoId !== undefined && pag.compromissoId !== 'undefined'
            ? String(pag.compromissoId)
            : (pag.conta_corrente_id != null && pag.conta_corrente_id !== undefined && pag.conta_corrente_id !== 'undefined'
              ? String(pag.conta_corrente_id)
              : idCompromisso) // Fallback: usar o ID do compromisso atual
          
          return {
            id: String(pag.id),
            compromissoId: compromissoIdValue,
            compromissoTitulo: compromissoCompleto.titulo,
            dataPagamento: pag.dataPagamento || pag.data_pagamento || pag.dataCriacao || pag.created_at || new Date().toISOString(),
            valor: Number(pag.valor || pag.valor_pago || 0),
            formaPagamento: pag.formaPagamento || pag.forma_pagamento || '',
            categoriaId: pag.categoriaId ? String(pag.categoriaId) : undefined,
            categoriaNome: pag.categoria || pag.categoriaNome,
            comprovanteAnexo: pag.arquivoComprovante ? {
              id: String(pag.arquivoComprovante.id || ''),
              nomeArquivo: pag.arquivoComprovante.nomeArquivo || pag.arquivoComprovante.nome || '',
              tamanho: Number(pag.arquivoComprovante.tamanho || 0),
              tipoArquivoId: String(pag.arquivoComprovante.tipoArquivoId || ''),
              tipoArquivoNome: pag.arquivoComprovante.tipoArquivoNome || pag.arquivoComprovante.tipo || '',
              url: pag.arquivoComprovante.url || '',
              dataUpload: pag.arquivoComprovante.dataUpload || pag.arquivoComprovante.data || '',
              uploadedBy: pag.arquivoComprovante.uploadedBy || pag.arquivoComprovante.criadoPor || '',
            } : undefined,
            observacoes: pag.observacoes,
            dataCriacao: pag.dataCriacao || new Date().toISOString(),
            criadoPor: pag.criadoPor || 'Sistema',
          }
        });
        
        // Atualizar pagamentos locais para este compromisso
        setPagamentos(prev => {
          const outros = prev.filter(p => p.compromissoId !== idCompromisso);
          return [...outros, ...pagamentosMapeados];
        });
        
        setDialogDetalhesCompromissoOpen(true);
      } else {
        // Fallback: buscar do estado local
        const compromisso = compromissos.find(c => c.id === idCompromisso);
        if (compromisso) {
          setCompromissoSelecionado(compromisso);
          setDialogDetalhesCompromissoOpen(true);
        }
      }
    } catch (error) {
      console.error('[CONTA-CORRENTE] Erro ao buscar compromisso:', error);
      // Fallback: buscar do estado local
      const compromisso = compromissos.find(c => c.id === idCompromisso);
      if (compromisso) {
        setCompromissoSelecionado(compromisso);
        setDialogDetalhesCompromissoOpen(true);
      }
    }
  };

  const handleVisualizarPagamento = (idPagamento: string) => {
    const pagamento = pagamentos.find(p => p.id === idPagamento);
    if (pagamento) {
      setPagamentoSelecionado(pagamento);
      setDialogDetalhesPagamentoOpen(true);
    }
  };

  const handleConfirmarExclusao = (id: string, tipo: TipoLancamento, titulo: string) => {
    if (!podeExcluir) {
      toast.error('Você não tem permissão para excluir lançamentos');
      return;
    }
    
    setItemParaExcluir({ id, tipo, titulo });
    setDialogExcluirOpen(true);
  };

  const handleExcluir = async () => {
    if (!itemParaExcluir) return;

    try {
      console.log('[CONTA-CORRENTE] Excluindo lançamento:', itemParaExcluir);
      
      if (itemParaExcluir.tipo === 'compromisso') {
        // Extrair ID do compromisso (remover prefixo 'comp-')
        const compromissoId = itemParaExcluir.id.replace('comp-', '');
        await api.contaCorrente.delete(compromissoId);
        toast.success('Compromisso excluído com sucesso!');
      } else {
        // Extrair ID do pagamento (remover prefixo 'pag-')
        const pagamentoId = itemParaExcluir.id.replace('pag-', '');
        const pagamento = pagamentos.find(p => p.id === pagamentoId);
        if (pagamento) {
          await api.contaCorrente.deletePagamento(pagamento.compromissoId, pagamentoId);
          toast.success('Pagamento excluído com sucesso!');
        } else {
          toast.error('Pagamento não encontrado');
          return;
        }
      }
      
      setDialogExcluirOpen(false);
      setItemParaExcluir(null);
      
      if (dialogDetalhesCompromissoOpen) {
        setDialogDetalhesCompromissoOpen(false);
        setCompromissoSelecionado(null);
      }
      if (dialogDetalhesPagamentoOpen) {
        setDialogDetalhesPagamentoOpen(false);
        setPagamentoSelecionado(null);
      }
      
      // Recarregar dados
      await carregarDados();
    } catch (error: any) {
      console.error('[CONTA-CORRENTE] Erro ao excluir lançamento:', error);
      toast.error(`Erro ao excluir: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const handleBaixarArquivo = (nomeArquivo: string, url: string) => {
    toast.success(`Download iniciado: ${nomeArquivo}`);
    console.log('Download arquivo:', { nomeArquivo, url });
  };

  const handleVisualizarArquivo = (nomeArquivo: string, url: string) => {
    toast.success(`Abrindo visualização: ${nomeArquivo}`);
    console.log('Visualizar arquivo:', { nomeArquivo, url });
  };

  const handleSalvarNovoCompromisso = async (compromisso: {
    clienteId: string;
    data: string;
    valor: string;
    titulo: string;
    descricao: string;
    tipoCompromisso: TipoCompromisso;
    categoriaId: string;
  }) => {
    if (!temPermissao('contacorrente.criar')) {
      toast.error('Você não tem permissão para criar lançamentos');
      return;
    }

    try {
      console.log('[CONTA-CORRENTE] Salvando novo compromisso:', compromisso);
      
      const valorNumerico = parseFloat(compromisso.valor);
      
      // Preparar payload para a Edge Function
      const payload = {
        clienteId: compromisso.clienteId,
        data: compromisso.data,
        valor: valorNumerico,
        titulo: compromisso.titulo,
        descricao: compromisso.descricao,
        tipoCompromisso: compromisso.tipoCompromisso,
        categoriaId: compromisso.categoriaId || undefined,
      };
      
      // Salvar no backend via Edge Function
      await api.contaCorrente.create(payload);
      
      toast.success('Compromisso criado com sucesso!');
      setDialogNovoCompromissoOpen(false);
      
      // Recarregar dados para mostrar o novo compromisso
      await carregarDados();
    } catch (error: any) {
      console.error('[CONTA-CORRENTE] Erro ao criar compromisso:', error);
      toast.error(`Erro ao criar compromisso: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const handleAbrirRegistroPagamento = (compromissoId?: string) => {
    if (!temPermissao('contacorrente.criar')) {
      toast.error('Você não tem permissão para criar lançamentos');
      return;
    }

    if (compromissoId) {
      // Pagamento rápido para um compromisso específico
      const compromisso = compromissos.find(c => c.id === compromissoId);
      if (compromisso) {
        if (compromisso.valorPendente <= 0) {
          toast.error('Este compromisso já está totalmente pago');
          return;
        }
        setCompromissoParaPagamento(compromisso);
        setDialogRegistrarPagamentoOpen(true);
      }
    } else {
      // Registrar pagamento sem compromisso específico
      setCompromissoParaPagamento(null);
      setDialogRegistrarPagamentoOpen(true);
    }
  };

  const handleSalvarPagamento = async (pagamento: {
    compromissoId: string;
    dataPagamento: string;
    valor: string;
    formaPagamentoId: string;
    categoriaId: string;
    observacoes: string;
  }) => {
    if (!temPermissao('contacorrente.criar')) {
      toast.error('Você não tem permissão para criar lançamentos');
      return;
    }

    try {
      console.log('[CONTA-CORRENTE] Salvando pagamento:', pagamento);
      
      const valorNumerico = parseFloat(pagamento.valor);
      
      // Preparar payload para a Edge Function
      const payload = {
        dataPagamento: pagamento.dataPagamento,
        valor: valorNumerico,
        formaPagamento: pagamento.formaPagamentoId,
        categoriaId: pagamento.categoriaId || undefined,
        observacoes: pagamento.observacoes || undefined,
      };
      
      // Salvar no backend via Edge Function
      await api.contaCorrente.createPagamento(pagamento.compromissoId, payload);
      
      toast.success('Pagamento registrado com sucesso!');
      setDialogRegistrarPagamentoOpen(false);
      setCompromissoParaPagamento(null);
      
      // Recarregar dados (a Edge Function já atualiza o compromisso automaticamente)
      await carregarDados();
    } catch (error: any) {
      console.error('[CONTA-CORRENTE] Erro ao registrar pagamento:', error);
      toast.error(`Erro ao registrar pagamento: ${error.message || 'Erro desconhecido'}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Compromissos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totais.totalCompromissos)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {lancamentosFiltrados.filter(l => l.tipo === 'compromisso').length} compromissos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Pagamentos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totais.totalPagamentos)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {lancamentosFiltrados.filter(l => l.tipo === 'pagamento').length} pagamentos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Pendente</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totais.totalPendente)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Saldo a pagar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Filtros</CardTitle>
              <CardDescription>Filtre os lançamentos por período e critérios</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFiltrosVisiveis(!filtrosVisiveis)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {filtrosVisiveis ? 'Ocultar' : 'Filtros Avançados'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros Básicos - Sempre Visíveis */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex gap-4">
              <div className="space-y-2">
                <Label htmlFor="periodo-inicio">Data Início</Label>
                <Input
                  id="periodo-inicio"
                  type="date"
                  className="w-[140px]"
                  value={filtroPeriodoInicio}
                  onChange={(e) => setFiltroPeriodoInicio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="periodo-fim">Data Fim</Label>
                <Input
                  id="periodo-fim"
                  type="date"
                  className="w-[140px]"
                  value={filtroPeriodoFim}
                  onChange={(e) => setFiltroPeriodoFim(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2 flex-1">
              <Label htmlFor="busca">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="busca"
                  placeholder="Cliente, título, grupo/rede..."
                  value={filtroBusca}
                  onChange={(e) => setFiltroBusca(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          {/* Filtros Avançados - Colapsáveis */}
          {filtrosVisiveis && (
            <div className="grid gap-4 md:grid-cols-5 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="filtro-tipo">Tipo</Label>
                <Select value={filtroTipo} onValueChange={(value: TipoFiltro) => setFiltroTipo(value)}>
                  <SelectTrigger id="filtro-tipo">
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
                <Label htmlFor="filtro-status">Status</Label>
                <Select value={filtroStatus} onValueChange={(value: StatusFiltro) => setFiltroStatus(value)}>
                  <SelectTrigger id="filtro-status">
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
                <Label htmlFor="filtro-categoria">Categoria</Label>
                <Combobox
                  options={categoriasOptions}
                  value={filtroCategoria}
                  onValueChange={setFiltroCategoria}
                  placeholder="Todas as categorias"
                  searchPlaceholder="Pesquisar categoria..."
                  emptyText="Nenhuma categoria encontrada."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filtro-cliente">Cliente</Label>
                <Combobox
                  options={clientesOptions}
                  value={filtroCliente}
                  onValueChange={setFiltroCliente}
                  placeholder="Todos os clientes"
                  searchPlaceholder="Pesquisar cliente..."
                  emptyText="Nenhum cliente encontrado."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filtro-grupo">Grupo/Rede</Label>
                <Combobox
                  options={gruposRedesOptions}
                  value={filtroGrupoRede}
                  onValueChange={setFiltroGrupoRede}
                  placeholder="Todos os grupos"
                  searchPlaceholder="Pesquisar grupo..."
                  emptyText="Nenhum grupo encontrado."
                />
              </div>
            </div>
          )}

          {/* Botão Limpar Filtros */}
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={limparFiltros}>
              <X className="h-4 w-4 mr-2" />
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Lançamentos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lançamentos ({lancamentosFiltrados.length})</CardTitle>
              <CardDescription>
                Clique em um lançamento para ver os detalhes
              </CardDescription>
            </div>
            {temPermissao('contacorrente.criar') && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setDialogNovoCompromissoOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Compromisso
                </Button>
                <Button onClick={() => handleAbrirRegistroPagamento()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Pagamento
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {lancamentosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum lançamento encontrado com os filtros aplicados</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Tipo</TableHead>
                    <TableHead className="w-[100px]">Data</TableHead>
                    <TableHead className="w-[200px]">Cliente</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead className="w-[140px]">Categoria</TableHead>
                    <TableHead className="text-right w-[140px]">Valor</TableHead>
                    <TableHead className="w-[140px]">Status</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lancamentosFiltrados.map((lancamento) => (
                    <TableRow 
                      key={lancamento.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        if (lancamento.tipo === 'compromisso') {
                          const idCompromisso = lancamento.id.replace('comp-', '');
                          handleVisualizarCompromisso(idCompromisso);
                        } else {
                          const idPagamento = lancamento.id.replace('pag-', '');
                          handleVisualizarPagamento(idPagamento);
                        }
                      }}
                    >
                      <TableCell className="py-3">{getTipoBadge(lancamento.tipo)}</TableCell>
                      <TableCell className="whitespace-nowrap py-3">{formatDate(lancamento.data)}</TableCell>
                      <TableCell className="py-3">
                        <div className="space-y-1">
                          <div className="font-medium">{lancamento.clienteNome}</div>
                          {lancamento.clienteGrupoRede && (
                            <div className="text-xs text-muted-foreground">{lancamento.clienteGrupoRede}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="space-y-1">
                          <div className="font-medium">{lancamento.titulo}</div>
                          {lancamento.tipo === 'compromisso' && lancamento.tipoCompromisso && (
                            <div className="flex items-center gap-2">
                              {getTipoCompromissoBadge(lancamento.tipoCompromisso)}
                              {lancamento.arquivosCount! > 0 && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Paperclip className="h-3 w-3" />
                                  {lancamento.arquivosCount}
                                </span>
                              )}
                            </div>
                          )}
                          {lancamento.tipo === 'pagamento' && lancamento.formaPagamento && (
                            <div className="text-xs text-muted-foreground">
                              {lancamento.formaPagamento}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        {lancamento.categoriaNome ? (
                          <Badge variant="outline" className="whitespace-nowrap">
                            {lancamento.categoriaNome}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <div className="space-y-1">
                          <div className="font-medium">{formatCurrency(lancamento.valor)}</div>
                          {lancamento.tipo === 'compromisso' && (
                            <div className="text-xs text-muted-foreground">
                              Pend: {formatCurrency(lancamento.valorPendente || 0)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        {lancamento.tipo === 'compromisso' && lancamento.status && getStatusBadge(lancamento.status)}
                      </TableCell>
                      <TableCell className="py-3">
                        {lancamento.tipo === 'compromisso' && lancamento.valorPendente! > 0 && temPermissao('contacorrente.criar') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              const idCompromisso = lancamento.id.replace('comp-', '');
                              handleAbrirRegistroPagamento(idCompromisso);
                            }}
                            title="Registrar pagamento"
                          >
                            <Wallet className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalhes do Compromisso */}
      <CompromissoDialogDetalhes
        open={dialogDetalhesCompromissoOpen}
        onOpenChange={setDialogDetalhesCompromissoOpen}
        compromisso={compromissoSelecionado}
        pagamentos={pagamentos}
        podeEditar={podeEditar}
        podeExcluir={podeExcluir}
        onExcluir={() => {
          if (compromissoSelecionado) {
            handleConfirmarExclusao(compromissoSelecionado.id, 'compromisso', compromissoSelecionado.titulo);
          }
        }}
        onVisualizarArquivo={handleVisualizarArquivo}
        onBaixarArquivo={handleBaixarArquivo}
        onVisualizarPagamento={handleVisualizarPagamento}
        showCliente={true}
      />

      {/* Dialog de Detalhes do Pagamento */}
      <PagamentoDialogDetalhes
        open={dialogDetalhesPagamentoOpen}
        onOpenChange={setDialogDetalhesPagamentoOpen}
        pagamento={pagamentoSelecionado}
        formasPagamentoOptions={formasPagamentoOptions}
        podeEditar={podeEditar}
        podeExcluir={podeExcluir}
        onExcluir={() => {
          if (pagamentoSelecionado) {
            handleConfirmarExclusao(pagamentoSelecionado.id, 'pagamento', 'Pagamento');
          }
        }}
        onVisualizarArquivo={handleVisualizarArquivo}
        onBaixarArquivo={handleBaixarArquivo}
        showCliente={true}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={dialogExcluirOpen} onOpenChange={setDialogExcluirOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir {itemParaExcluir?.tipo === 'compromisso' ? 'o compromisso' : 'o pagamento'} "{itemParaExcluir?.titulo}"?
              <br /><br />
              Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Novo Compromisso */}
      <NovoCompromissoDialog
        open={dialogNovoCompromissoOpen}
        onOpenChange={setDialogNovoCompromissoOpen}
        clientesOptions={clientesOptions}
        categoriasOptions={categoriasOptions}
        onSalvar={handleSalvarNovoCompromisso}
      />

      {/* Dialog de Registrar Pagamento */}
      <RegistrarPagamentoDialog
        open={dialogRegistrarPagamentoOpen}
        onOpenChange={setDialogRegistrarPagamentoOpen}
        compromisso={compromissoParaPagamento}
        compromissosDisponiveis={compromissos}
        formasPagamentoOptions={formasPagamentoOptions}
        categoriasOptions={categoriasOptions}
        onSalvar={handleSalvarPagamento}
      />
    </div>
  );
}