import { useState, useMemo, useEffect } from 'react';
import { Cliente } from '../types/customer';
import { ArquivoAnexo, Compromisso, Pagamento, TipoCompromisso, TipoArquivo } from '../types/contaCorrente';
import { useAuth } from '../contexts/AuthContext';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Plus, FileText, TrendingUp, TrendingDown, DollarSign, Calendar, Filter, X, Paperclip, Eye, Download, User, Clock, Edit, Trash2, Wallet } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';

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
  categoriaId?: string;
  categoriaNome?: string;
  status?: string;
  valorPago?: number;
  valorPendente?: number;
  compromissoTitulo?: string;
  observacoes?: string;
  arquivosCount?: number;
}

const mapCompromisso = (comp: any): Compromisso => ({
  id: String(comp.id ?? ''),
  clienteId: String(comp.clienteId ?? comp.cliente_id ?? ''),
  clienteNome: comp.clienteNome ?? comp.cliente_nome ?? '',
  data: comp.data ?? '',
  valor: Number(comp.valor ?? 0),
  titulo: comp.titulo ?? '',
  descricao: comp.descricao ?? '',
  tipoCompromisso: comp.tipoCompromisso === 'Investimento' ? 'Investimento' : 'Ressarcimento',
  categoriaId: comp.categoriaId != null ? String(comp.categoriaId) : undefined,
  categoriaNome: comp.categoria || comp.categoriaNome || undefined,
  arquivos: Array.isArray(comp.arquivosAnexos)
    ? comp.arquivosAnexos.map((arq: any): ArquivoAnexo => ({
        id: String(arq.id || ''),
        nomeArquivo: arq.nomeArquivo || arq.nome || '',
        tamanho: Number(arq.tamanho || 0),
        tipoArquivoId: String(arq.tipoArquivoId || ''),
        tipoArquivoNome: arq.tipoArquivoNome || arq.tipo || '',
        url: arq.url || '',
        dataUpload: arq.dataUpload || arq.data || '',
        uploadedBy: arq.uploadedBy || arq.criadoPor || '',
      }))
    : [],
  status:
    comp.status === 'Pago Integralmente'
      ? 'Pago Integralmente'
      : comp.status === 'Pago Parcialmente'
        ? 'Pago Parcialmente'
        : 'Pendente',
  valorPago: Number(comp.valorPago || 0),
  valorPendente: Number(comp.valorPendente || comp.valor || 0),
  dataCriacao: comp.dataCriacao || new Date().toISOString(),
  criadoPor: comp.criadoPor || 'Sistema',
  dataAtualizacao: comp.dataAtualizacao || comp.dataCriacao || new Date().toISOString(),
  atualizadoPor: comp.atualizadoPor || comp.criadoPor || 'Sistema',
});

const mapPagamento = (
  pag: any,
  compromissoLookup: Record<string, Compromisso>,
  categoriasLookup: Record<string, string>
): Pagamento => {
  const compromissoIdValue = pag.compromissoId != null
    ? String(pag.compromissoId)
    : (pag.conta_corrente_id != null ? String(pag.conta_corrente_id) : '');
  const compromisso = compromissoLookup[compromissoIdValue];

  return {
    id: String(pag.id ?? ''),
    compromissoId: compromissoIdValue,
    compromissoTitulo: compromisso?.titulo || '',
    dataPagamento: pag.dataPagamento || pag.data_pagamento || pag.dataCriacao || pag.created_at || new Date().toISOString(),
    valor: Number(pag.valor || pag.valor_pago || 0),
    formaPagamento: pag.formaPagamento || pag.forma_pagamento || '',
    categoriaId: pag.categoriaId != null ? String(pag.categoriaId) : undefined,
    categoriaNome:
      (pag.categoriaId != null ? categoriasLookup[String(pag.categoriaId)] : undefined) ||
      pag.categoria ||
      pag.categoriaNome ||
      undefined,
    comprovanteAnexo: pag.arquivoComprovante
      ? {
          id: String(pag.arquivoComprovante.id || ''),
          nomeArquivo: pag.arquivoComprovante.nomeArquivo || pag.arquivoComprovante.nome || '',
          tamanho: Number(pag.arquivoComprovante.tamanho || 0),
          tipoArquivoId: String(pag.arquivoComprovante.tipoArquivoId || ''),
          tipoArquivoNome: pag.arquivoComprovante.tipoArquivoNome || pag.arquivoComprovante.tipo || '',
          url: pag.arquivoComprovante.url || '',
          dataUpload: pag.arquivoComprovante.dataUpload || pag.arquivoComprovante.data || '',
          uploadedBy: pag.arquivoComprovante.uploadedBy || pag.arquivoComprovante.criadoPor || '',
        }
      : undefined,
    observacoes: pag.observacoes,
    dataCriacao: pag.dataCriacao || new Date().toISOString(),
    criadoPor: pag.criadoPor || 'Sistema',
  };
};

export function CustomerFormContaCorrente({ formData, readOnly }: CustomerFormContaCorrenteProps) {
  // Estados para dados do servidor
  const [compromissos, setCompromissos] = useState<Compromisso[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [tiposArquivo, setTiposArquivo] = useState<TipoArquivo[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<any[]>([]);
  const [categoriasContaCorrente, setCategoriasContaCorrente] = useState<any[]>([]);

  // Estados para os dialogs
  const [dialogCompromissoOpen, setDialogCompromissoOpen] = useState(false);
  const [dialogPagamentoOpen, setDialogPagamentoOpen] = useState(false);
  const [dialogNovoTipoArquivoOpen, setDialogNovoTipoArquivoOpen] = useState(false);
  const [dialogDetalhesCompromissoOpen, setDialogDetalhesCompromissoOpen] = useState(false);
  const [dialogDetalhesPagamentoOpen, setDialogDetalhesPagamentoOpen] = useState(false);
  const [dialogExcluirOpen, setDialogExcluirOpen] = useState(false);
  const [dialogEditarCompromissoOpen, setDialogEditarCompromissoOpen] = useState(false);
  const [dialogEditarPagamentoOpen, setDialogEditarPagamentoOpen] = useState(false);
  
  // Estados para visualização de detalhes
  const [compromissoSelecionado, setCompromissoSelecionado] = useState<Compromisso | null>(null);
  const [pagamentoSelecionado, setPagamentoSelecionado] = useState<Pagamento | null>(null);
  
  // Estados para controlar modo de edição nos dialogs de detalhes
  const [modoEdicaoCompromisso, setModoEdicaoCompromisso] = useState(false);
  const [modoEdicaoPagamento, setModoEdicaoPagamento] = useState(false);
  
  // Estados para edição e exclusão
  const [itemParaExcluir, setItemParaExcluir] = useState<{ id: string; tipo: TipoLancamento; titulo: string } | null>(null);

  // Estados de filtros
  const [filtroTipo, setFiltroTipo] = useState<TipoFiltro>('todos');
  const [filtroStatus, setFiltroStatus] = useState<StatusFiltro>('todos');
  const [filtroPeriodoInicio, setFiltroPeriodoInicio] = useState('');
  const [filtroPeriodoFim, setFiltroPeriodoFim] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroBusca, setFiltroBusca] = useState('');

  // Estados para os formulários
  const [novoCompromisso, setNovoCompromisso] = useState({
    data: new Date().toISOString().split('T')[0],
    valor: '',
    titulo: '',
    descricao: '',
    tipoCompromisso: 'Investimento' as TipoCompromisso,
    categoriaId: '',
    arquivos: [] as { file: File; tipoArquivoId: string; tipoArquivoNome: string }[],
  });

  const [novoPagamento, setNovoPagamento] = useState({
    compromissoId: '',
    dataPagamento: new Date().toISOString().split('T')[0],
    valor: '',
    formaPagamento: '',
    categoriaId: '',
    observacoes: '',
    comprovanteFile: null as File | null,
  });

  const [novoTipoArquivo, setNovoTipoArquivo] = useState({
    nome: '',
    descricao: '',
  });



  // Hook de autenticação e permissões
  const { temPermissao } = useAuth();

  // Verificar permissões específicas
  const podeEditar = temPermissao('contacorrente.editar');
  const podeExcluir = temPermissao('contacorrente.excluir');

  // Carregar dados do servidor
  useEffect(() => {
    const carregarDados = async () => {
      try {
        const [compResponse, tiposData, formasData, catData] = await Promise.all([
          api.contaCorrente.list({ params: { cliente_id: formData.id, page: 1, limit: 100 } }),
          api.get('conta-corrente/tipos-arquivo'),
          api.get('formas-pagamento'),
          api.get('categorias-conta-corrente'),
        ]);

        const compromissosMapeados = (compResponse?.compromissos || []).map(mapCompromisso);
        setCompromissos(compromissosMapeados);
        setTiposArquivo(tiposData || []);
        setFormasPagamento(formasData || []);
        setCategoriasContaCorrente(catData || []);

        const compromissoLookup = compromissosMapeados.reduce<Record<string, Compromisso>>((acc, comp) => {
          acc[comp.id] = comp;
          return acc;
        }, {});

        const categoriasLookup = (catData || []).reduce<Record<string, string>>((acc: Record<string, string>, cat: any) => {
          acc[String(cat.id)] = cat.nome;
          return acc;
        }, {});

        if (compromissosMapeados.length > 0) {
          const pagamentosPorCompromisso = await Promise.all(
            compromissosMapeados.map((comp) => api.contaCorrente.listPagamentos(comp.id))
          );
          const pagamentosMapeados = pagamentosPorCompromisso
            .flat()
            .map((pag) => mapPagamento(pag, compromissoLookup, categoriasLookup));
          setPagamentos(pagamentosMapeados);
        } else {
          setPagamentos([]);
        }
      } catch (error) {
        console.error('[CONTA-CORRENTE] Erro ao carregar dados:', error);
        setCompromissos([]);
        setPagamentos([]);
        setTiposArquivo([]);
        setFormasPagamento([]);
        setCategoriasContaCorrente([]);
      }
    };
    if (formData.id) {
      carregarDados();
    }
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
        categoriaId: c.categoriaId,
        categoriaNome: c.categoriaNome,
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
        categoriaId: p.categoriaId,
        categoriaNome: p.categoriaNome,
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

    // Filtro por categoria
    if (filtroCategoria) {
      resultado = resultado.filter(l => l.categoriaId === filtroCategoria);
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
  }, [lancamentosUnificados, filtroTipo, filtroStatus, filtroPeriodoInicio, filtroPeriodoFim, filtroCategoria, filtroBusca]);

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
      categoriaId: '',
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
      categoriaId: '',
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
    setFiltroCategoria('');
    setFiltroBusca('');
  };

  // Handlers para visualização de detalhes
  const handleVisualizarCompromisso = (idCompromisso: string) => {
    const compromisso = compromissos.find(c => c.id === idCompromisso);
    if (compromisso) {
      setCompromissoSelecionado(compromisso);
      setModoEdicaoCompromisso(false); // Sempre abrir no modo visualização
      setDialogDetalhesCompromissoOpen(true);
    }
  };

  const handleVisualizarPagamento = (idPagamento: string) => {
    const pagamento = pagamentos.find(p => p.id === idPagamento);
    if (pagamento) {
      setPagamentoSelecionado(pagamento);
      setModoEdicaoPagamento(false); // Sempre abrir no modo visualização
      setDialogDetalhesPagamentoOpen(true);
    }
  };

  const handleBaixarArquivo = (nomeArquivo: string, url: string) => {
    toast.success(`Download iniciado: ${nomeArquivo}`);
    // Em produção, isso faria o download do arquivo real
    console.log('Download arquivo:', { nomeArquivo, url });
  };

  const handleVisualizarArquivo = (nomeArquivo: string, url: string) => {
    toast.success(`Abrindo visualização: ${nomeArquivo}`);
    // Em produção, isso abriria o arquivo em uma nova aba ou modal
    console.log('Visualizar arquivo:', { nomeArquivo, url });
  };

  // Handler para alternar para modo edição no dialog de detalhes
  const handleAtivarEdicaoCompromisso = () => {
    if (!podeEditar) {
      toast.error('Você não tem permissão para editar lançamentos');
      return;
    }
    
    if (compromissoSelecionado) {
      setNovoCompromisso({
        data: compromissoSelecionado.data,
        valor: compromissoSelecionado.valor.toString(),
        titulo: compromissoSelecionado.titulo,
        descricao: compromissoSelecionado.descricao,
        tipoCompromisso: compromissoSelecionado.tipoCompromisso,
        categoriaId: compromissoSelecionado.categoriaId || '',
        arquivos: [],
      });
      setModoEdicaoCompromisso(true);
    }
  };

  const handleAtivarEdicaoPagamento = () => {
    if (!podeEditar) {
      toast.error('Você não tem permissão para editar lançamentos');
      return;
    }
    
    if (pagamentoSelecionado) {
      setNovoPagamento({
        compromissoId: pagamentoSelecionado.compromissoId,
        dataPagamento: pagamentoSelecionado.dataPagamento,
        valor: pagamentoSelecionado.valor.toString(),
        formaPagamento: pagamentoSelecionado.formaPagamento,
        categoriaId: pagamentoSelecionado.categoriaId || '',
        observacoes: pagamentoSelecionado.observacoes || '',
        comprovanteFile: null,
      });
      setModoEdicaoPagamento(true);
    }
  };

  const handleCancelarEdicaoCompromisso = () => {
    setModoEdicaoCompromisso(false);
    setNovoCompromisso({
      data: new Date().toISOString().split('T')[0],
      valor: '',
      titulo: '',
      descricao: '',
      tipoCompromisso: 'Investimento',
      categoriaId: '',
      arquivos: [],
    });
  };

  const handleCancelarEdicaoPagamento = () => {
    setModoEdicaoPagamento(false);
    setNovoPagamento({
      compromissoId: '',
      dataPagamento: new Date().toISOString().split('T')[0],
      valor: '',
      formaPagamento: '',
      categoriaId: '',
      observacoes: '',
      comprovanteFile: null,
    });
  };

  const handleFecharDialogCompromisso = () => {
    setDialogDetalhesCompromissoOpen(false);
    setModoEdicaoCompromisso(false);
    setCompromissoSelecionado(null);
    setNovoCompromisso({
      data: new Date().toISOString().split('T')[0],
      valor: '',
      titulo: '',
      descricao: '',
      tipoCompromisso: 'Investimento',
      categoriaId: '',
      arquivos: [],
    });
  };

  const handleFecharDialogPagamento = () => {
    setDialogDetalhesPagamentoOpen(false);
    setModoEdicaoPagamento(false);
    setPagamentoSelecionado(null);
    setNovoPagamento({
      compromissoId: '',
      dataPagamento: new Date().toISOString().split('T')[0],
      valor: '',
      formaPagamento: '',
      categoriaId: '',
      observacoes: '',
      comprovanteFile: null,
    });
  };

  // Handlers para edição e exclusão
  const handleEditarCompromisso = (idCompromisso: string) => {
    if (!podeEditar) {
      toast.error('Você não tem permissão para editar lançamentos');
      return;
    }
    
    const compromisso = compromissos.find(c => c.id === idCompromisso);
    if (compromisso) {
      setCompromissoSelecionado(compromisso);
      setNovoCompromisso({
        data: compromisso.data,
        valor: compromisso.valor.toString(),
        titulo: compromisso.titulo,
        descricao: compromisso.descricao,
        tipoCompromisso: compromisso.tipoCompromisso,
        arquivos: [],
      });
      setDialogEditarCompromissoOpen(true);
    }
  };

  const handleEditarPagamento = (idPagamento: string) => {
    if (!podeEditar) {
      toast.error('Você não tem permissão para editar lançamentos');
      return;
    }
    
    const pagamento = pagamentos.find(p => p.id === idPagamento);
    if (pagamento) {
      setPagamentoSelecionado(pagamento);
      setNovoPagamento({
        compromissoId: pagamento.compromissoId,
        dataPagamento: pagamento.dataPagamento,
        valor: pagamento.valor.toString(),
        formaPagamento: pagamento.formaPagamento,
        observacoes: pagamento.observacoes || '',
        comprovanteFile: null,
      });
      setDialogEditarPagamentoOpen(true);
    }
  };

  const handleSalvarEdicaoCompromisso = () => {
    if (!novoCompromisso.titulo || !novoCompromisso.valor || !novoCompromisso.data) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    console.log('Editando compromisso:', { id: compromissoSelecionado?.id, data: novoCompromisso });
    toast.success('Compromisso atualizado com sucesso!');
    
    // Fechar dialog de detalhes e resetar estados
    handleFecharDialogCompromisso();
  };

  const handleSalvarEdicaoPagamento = () => {
    if (!novoPagamento.compromissoId || !novoPagamento.valor || !novoPagamento.formaPagamento) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    console.log('Editando pagamento:', { id: pagamentoSelecionado?.id, data: novoPagamento });
    toast.success('Pagamento atualizado com sucesso!');
    
    // Fechar dialog de detalhes e resetar estados
    handleFecharDialogPagamento();
    setPagamentoSelecionado(null);
    
    setNovoPagamento({
      compromissoId: '',
      dataPagamento: new Date().toISOString().split('T')[0],
      valor: '',
      formaPagamento: '',
      observacoes: '',
      comprovanteFile: null,
    });
  };

  const handleConfirmarExclusao = (id: string, tipo: TipoLancamento, titulo: string) => {
    if (!podeExcluir) {
      toast.error('Você não tem permissão para excluir lançamentos');
      return;
    }
    
    setItemParaExcluir({ id, tipo, titulo });
    setDialogExcluirOpen(true);
  };

  const handleExcluir = () => {
    if (!itemParaExcluir) return;

    console.log('Excluindo lançamento:', itemParaExcluir);
    toast.success(
      itemParaExcluir.tipo === 'compromisso'
        ? 'Compromisso excluído com sucesso!'
        : 'Pagamento excluído com sucesso!'
    );
    
    // Fechar dialog de confirmação
    setDialogExcluirOpen(false);
    setItemParaExcluir(null);
    
    // Fechar dialog de detalhes se estiver aberto
    if (dialogDetalhesCompromissoOpen) {
      handleFecharDialogCompromisso();
    }
    if (dialogDetalhesPagamentoOpen) {
      handleFecharDialogPagamento();
    }
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Investimentos</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold">{formatCurrency(resumo.totalInvestimentos)}</div>
            <p className="text-xs text-muted-foreground">Acordos firmados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Ressarcimentos</CardTitle>
            <TrendingDown className="h-5 w-5 text-orange-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold">{formatCurrency(resumo.totalRessarcimentos)}</div>
            <p className="text-xs text-muted-foreground">Compensações devidas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pago</CardTitle>
            <DollarSign className="h-5 w-5 text-green-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold">{formatCurrency(resumo.totalPago)}</div>
            <p className="text-xs text-muted-foreground">{resumo.quantidadePagamentos} pagamentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Pendente</CardTitle>
            <Calendar className="h-5 w-5 text-red-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold">{formatCurrency(resumo.totalPendente)}</div>
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

                      <div className="grid gap-4 md:grid-cols-2">
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
                              <SelectItem key="tipo-inv-1" value="Investimento">Investimento</SelectItem>
                              <SelectItem key="tipo-res-1" value="Ressarcimento">Ressarcimento</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="categoriaCompromisso">Categoria</Label>
                          <Combobox
                            options={categoriasContaCorrente.filter(c => c.ativo).map(c => ({
                              label: c.nome,
                              value: c.id,
                            }))}
                            value={novoCompromisso.categoriaId}
                            onValueChange={(value) =>
                              setNovoCompromisso({ ...novoCompromisso, categoriaId: value })
                            }
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

                        <div className="grid gap-4 md:grid-cols-2">
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
                            <Label htmlFor="categoriaPagamento">Categoria</Label>
                            <Combobox
                              options={categoriasContaCorrente.filter(c => c.ativo).map(c => ({
                                label: c.nome,
                                value: c.id,
                              }))}
                              value={novoPagamento.categoriaId}
                              onValueChange={(value) =>
                                setNovoPagamento({ ...novoPagamento, categoriaId: value })
                              }
                              placeholder="Selecione uma categoria"
                              searchPlaceholder="Pesquisar categoria..."
                              emptyText="Nenhuma categoria encontrada."
                            />
                          </div>
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
              {(filtroTipo !== 'todos' || filtroStatus !== 'todos' || filtroPeriodoInicio || filtroPeriodoFim || filtroCategoria || filtroBusca) && (
                <Button variant="ghost" size="sm" onClick={limparFiltros}>
                  <X className="h-3 w-3 mr-1" />
                  Limpar Filtros
                </Button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
              <div className="space-y-2">
                <Label htmlFor="filtroTipo">Tipo</Label>
                <Select value={filtroTipo} onValueChange={(value: TipoFiltro) => setFiltroTipo(value)}>
                  <SelectTrigger id="filtroTipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem key="filtro-todos" value="todos">Todos</SelectItem>
                    <SelectItem key="filtro-comp" value="compromissos">Compromissos</SelectItem>
                    <SelectItem key="filtro-pag" value="pagamentos">Pagamentos</SelectItem>
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
                    <SelectItem key="status-todos" value="todos">Todos</SelectItem>
                    <SelectItem key="status-pendente" value="Pendente">Pendente</SelectItem>
                    <SelectItem key="status-parcial" value="Pago Parcialmente">Pago Parcialmente</SelectItem>
                    <SelectItem key="status-integral" value="Pago Integralmente">Pago Integralmente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filtroCategoria">Categoria</Label>
                <Combobox
                  options={categoriasContaCorrente.filter(c => c.ativo).map(c => ({
                    label: c.nome,
                    value: c.id,
                  }))}
                  value={filtroCategoria}
                  onValueChange={setFiltroCategoria}
                  placeholder="Todas"
                  searchPlaceholder="Pesquisar categoria..."
                  emptyText="Nenhuma categoria encontrada."
                />
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
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Tipo</TableHead>
                    <TableHead className="w-[100px]">Data</TableHead>
                    <TableHead>Título</TableHead>
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
                        {!readOnly && lancamento.tipo === 'compromisso' && lancamento.valorPendente! > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              const idCompromisso = lancamento.id.replace('comp-', '');
                              const compromisso = compromissos.find(c => c.id === idCompromisso);
                              if (compromisso) {
                                // Pre-selecionar o compromisso no dialog de pagamento
                                setNovoPagamento({
                                  ...novoPagamento,
                                  compromissoId: compromisso.id,
                                  valor: compromisso.valorPendente.toString(),
                                });
                                setDialogPagamentoOpen(true);
                              }
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
      <Dialog open={dialogDetalhesCompromissoOpen} onOpenChange={(open) => !open && handleFecharDialogCompromisso()}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col" aria-describedby={undefined}>
          <DialogHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-xl mb-1">
                  {modoEdicaoCompromisso ? 'Editar Compromisso' : compromissoSelecionado?.titulo}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {compromissoSelecionado && formatDate(modoEdicaoCompromisso ? novoCompromisso.data : compromissoSelecionado.data)}
                  </span>
                  <span>•</span>
                  {compromissoSelecionado && getTipoCompromissoBadge(modoEdicaoCompromisso ? novoCompromisso.tipoCompromisso : compromissoSelecionado.tipoCompromisso)}
                  {!modoEdicaoCompromisso && (
                    <>
                      <span>•</span>
                      {compromissoSelecionado && getStatusBadge(compromissoSelecionado.status)}
                    </>
                  )}
                </DialogDescription>
              </div>
              {!modoEdicaoCompromisso && (
                <div className="flex gap-2">
                  {podeEditar && (
                    <Button variant="outline" size="sm" onClick={handleAtivarEdicaoCompromisso}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  )}
                  {podeExcluir && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        if (compromissoSelecionado) {
                          handleConfirmarExclusao(compromissoSelecionado.id, 'compromisso', compromissoSelecionado.titulo);
                        }
                      }}
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

          {compromissoSelecionado && (
            <>
              {!modoEdicaoCompromisso ? (
                <>
                  {/* Resumo de Valores - Compacto */}
                  <div className="grid grid-cols-3 gap-3 p-4 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Valor Total</p>
                      <p className="text-xl font-semibold">{formatCurrency(compromissoSelecionado.valor)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Pago</p>
                      <p className="text-xl font-semibold text-green-600">
                        {formatCurrency(compromissoSelecionado.valorPago)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Pendente</p>
                      <p className="text-xl font-semibold text-red-600">
                        {formatCurrency(compromissoSelecionado.valorPendente)}
                      </p>
                    </div>
                  </div>

                  {/* Tabs para Organizar Conteúdo */}
                  <Tabs defaultValue="geral" className="flex-1 overflow-hidden flex flex-col">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="geral">
                    <FileText className="h-4 w-4 mr-2" />
                    Informações
                  </TabsTrigger>
                  <TabsTrigger value="arquivos">
                    <Paperclip className="h-4 w-4 mr-2" />
                    Arquivos ({compromissoSelecionado.arquivos?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="pagamentos">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Pagamentos ({pagamentos.filter(p => p.compromissoId === compromissoSelecionado.id).length})
                  </TabsTrigger>
                </TabsList>

                {/* Conteúdo das Tabs - Com Scroll */}
                <div className="flex-1 overflow-y-auto mt-4">
                  <TabsContent value="geral" className="mt-0 space-y-4">
                    {/* Descrição */}
                    {compromissoSelecionado.descricao && (
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Descrição</Label>
                        <div className="p-3 bg-muted/30 rounded-md">
                          <p className="text-sm whitespace-pre-wrap">{compromissoSelecionado.descricao}</p>
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
                                {new Date(compromissoSelecionado.dataCriacao).toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">por {compromissoSelecionado.criadoPor}</p>
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
                                {new Date(compromissoSelecionado.dataAtualizacao).toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">por {compromissoSelecionado.atualizadoPor}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="arquivos" className="mt-0">
                    {compromissoSelecionado.arquivos && compromissoSelecionado.arquivos.length > 0 ? (
                      <div className="space-y-2">
                        {compromissoSelecionado.arquivos.map((arquivo) => (
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleVisualizarArquivo(arquivo.nomeArquivo, arquivo.url)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleBaixarArquivo(arquivo.nomeArquivo, arquivo.url)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
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
                    {pagamentos.filter(p => p.compromissoId === compromissoSelecionado.id).length > 0 ? (
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
                            {pagamentos
                              .filter(p => p.compromissoId === compromissoSelecionado.id)
                              .map(pag => (
                                <TableRow key={pag.id}>
                                  <TableCell className="whitespace-nowrap">{formatDate(pag.dataPagamento)}</TableCell>
                                  <TableCell className="font-medium">{formatCurrency(pag.valor)}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{pag.formaPagamento}</Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {pag.observacoes || '-'}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleVisualizarPagamento(pag.id)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
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
                        value={novoCompromisso.data}
                        onChange={(e) =>
                          setNovoCompromisso({ ...novoCompromisso, data: e.target.value })
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
                        value={novoCompromisso.valor}
                        onChange={(e) =>
                          setNovoCompromisso({ ...novoCompromisso, valor: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-tipoCompromisso">Tipo de Compromisso *</Label>
                    <Select
                      value={novoCompromisso.tipoCompromisso}
                      onValueChange={(value: TipoCompromisso) =>
                        setNovoCompromisso({ ...novoCompromisso, tipoCompromisso: value })
                      }
                    >
                      <SelectTrigger id="edit-tipoCompromisso">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem key="tipo-inv-2" value="Investimento">Investimento</SelectItem>
                        <SelectItem key="tipo-res-2" value="Ressarcimento">Ressarcimento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-titulo">Título *</Label>
                    <Input
                      id="edit-titulo"
                      placeholder="Ex: Investimento em Material de PDV"
                      value={novoCompromisso.titulo}
                      onChange={(e) =>
                        setNovoCompromisso({ ...novoCompromisso, titulo: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-descricao">Descrição</Label>
                    <Textarea
                      id="edit-descricao"
                      placeholder="Descreva os detalhes do compromisso..."
                      rows={4}
                      value={novoCompromisso.descricao}
                      onChange={(e) =>
                        setNovoCompromisso({ ...novoCompromisso, descricao: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {!modoEdicaoCompromisso ? (
            <DialogFooter className="mt-4">
              <Button onClick={handleFecharDialogCompromisso}>Fechar</Button>
            </DialogFooter>
          ) : (
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={handleCancelarEdicaoCompromisso}>
                Cancelar
              </Button>
              <Button onClick={handleSalvarEdicaoCompromisso}>
                Salvar Alterações
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Detalhes do Pagamento */}
      <Dialog open={dialogDetalhesPagamentoOpen} onOpenChange={(open) => !open && handleFecharDialogPagamento()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" aria-describedby={undefined}>
          <DialogHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-xl mb-1">
                  {modoEdicaoPagamento ? 'Editar Pagamento' : 'Pagamento Realizado'}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {pagamentoSelecionado && formatDate(modoEdicaoPagamento ? novoPagamento.dataPagamento : pagamentoSelecionado.dataPagamento)}
                  </span>
                  <span>•</span>
                  <Badge variant="outline">
                    {modoEdicaoPagamento ? novoPagamento.formaPagamento : pagamentoSelecionado?.formaPagamento}
                  </Badge>
                </DialogDescription>
              </div>
              {!modoEdicaoPagamento && (
                <div className="flex gap-2">
                  {podeEditar && (
                    <Button variant="outline" size="sm" onClick={handleAtivarEdicaoPagamento}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  )}
                  {podeExcluir && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        if (pagamentoSelecionado) {
                          handleConfirmarExclusao(pagamentoSelecionado.id, 'pagamento', 'Pagamento');
                        }
                      }}
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

          {pagamentoSelecionado && (
            <>
              {!modoEdicaoPagamento ? (
                <div className="space-y-4 flex-1 overflow-y-auto">
                  {/* Compromisso Relacionado */}
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <Label className="text-xs text-muted-foreground mb-1 block">Compromisso</Label>
                    <p className="font-medium">{pagamentoSelecionado.compromissoTitulo}</p>
                  </div>

                  <div className="p-3 bg-muted/30 rounded-lg">
                    <Label className="text-xs text-muted-foreground mb-1 block">Valor</Label>
                    <p className="text-2xl font-semibold text-green-600">
                      {formatCurrency(pagamentoSelecionado.valor)}
                    </p>
                  </div>

                  {/* Observações */}
                  {pagamentoSelecionado.observacoes && (
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Observações</Label>
                      <div className="p-3 bg-muted/30 rounded-md">
                        <p className="text-sm whitespace-pre-wrap">{pagamentoSelecionado.observacoes}</p>
                      </div>
                    </div>
                  )}

              {/* Comprovante */}
              {pagamentoSelecionado.comprovanteAnexo && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Comprovante</Label>
                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {pagamentoSelecionado.comprovanteAnexo.nomeArquivo}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Badge variant="outline" className="text-xs">
                            {pagamentoSelecionado.comprovanteAnexo.tipoArquivoNome}
                          </Badge>
                          <span>•</span>
                          <span>{formatFileSize(pagamentoSelecionado.comprovanteAnexo.tamanho)}</span>
                          <span>•</span>
                          <span>{formatDate(pagamentoSelecionado.comprovanteAnexo.dataUpload)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleVisualizarArquivo(
                            pagamentoSelecionado.comprovanteAnexo!.nomeArquivo,
                            pagamentoSelecionado.comprovanteAnexo!.url
                          )
                        }
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleBaixarArquivo(
                            pagamentoSelecionado.comprovanteAnexo!.nomeArquivo,
                            pagamentoSelecionado.comprovanteAnexo!.url
                          )
                        }
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Histórico de Alterações */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Histórico de Alterações</Label>
                <div className="flex gap-3 items-start p-3 border rounded-md">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-medium">Registrado</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(pagamentoSelecionado.dataCriacao).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">por {pagamentoSelecionado.criadoPor}</p>
                  </div>
                </div>
              </div>
                </div>
              ) : (
                /* Formulário de Edição */
                <div className="flex-1 overflow-y-auto space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-pag-compromisso">Compromisso *</Label>
                    <Combobox
                      options={compromissosOptions}
                      value={novoPagamento.compromissoId}
                      onValueChange={(value) =>
                        setNovoPagamento({ ...novoPagamento, compromissoId: value })
                      }
                      placeholder="Selecione o compromisso"
                      searchPlaceholder="Pesquisar compromisso..."
                      emptyText="Nenhum compromisso encontrado."
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="edit-pag-data">Data do Pagamento *</Label>
                      <Input
                        id="edit-pag-data"
                        type="date"
                        value={novoPagamento.dataPagamento}
                        onChange={(e) =>
                          setNovoPagamento({ ...novoPagamento, dataPagamento: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-pag-valor">Valor *</Label>
                      <Input
                        id="edit-pag-valor"
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
                    <Label htmlFor="edit-pag-forma">Forma de Pagamento *</Label>
                    <Select
                      value={novoPagamento.formaPagamento}
                      onValueChange={(value) =>
                        setNovoPagamento({ ...novoPagamento, formaPagamento: value })
                      }
                    >
                      <SelectTrigger id="edit-pag-forma">
                        <SelectValue placeholder="Selecione a forma de pagamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {formasPagamentoDisponiveis.map((forma) => (
                          <SelectItem key={forma.id} value={forma.nome}>
                            {forma.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-pag-observacoes">Observações</Label>
                    <Textarea
                      id="edit-pag-observacoes"
                      placeholder="Adicione observações sobre este pagamento..."
                      rows={3}
                      value={novoPagamento.observacoes}
                      onChange={(e) =>
                        setNovoPagamento({ ...novoPagamento, observacoes: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {!modoEdicaoPagamento ? (
            <DialogFooter className="mt-4">
              <Button onClick={handleFecharDialogPagamento}>Fechar</Button>
            </DialogFooter>
          ) : (
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={handleCancelarEdicaoPagamento}>
                Cancelar
              </Button>
              <Button onClick={handleSalvarEdicaoPagamento}>
                Salvar Alterações
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição de Compromisso */}
      <Dialog open={dialogEditarCompromissoOpen} onOpenChange={setDialogEditarCompromissoOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Editar Compromisso</DialogTitle>
            <DialogDescription>
              Atualize as informações do compromisso selecionado
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-data">Data *</Label>
                <Input
                  id="edit-data"
                  type="date"
                  value={novoCompromisso.data}
                  onChange={(e) => setNovoCompromisso({ ...novoCompromisso, data: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-valor">Valor *</Label>
                <Input
                  id="edit-valor"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={novoCompromisso.valor}
                  onChange={(e) => setNovoCompromisso({ ...novoCompromisso, valor: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-tipoCompromisso">Tipo de Compromisso *</Label>
              <Select
                value={novoCompromisso.tipoCompromisso}
                onValueChange={(value: TipoCompromisso) =>
                  setNovoCompromisso({ ...novoCompromisso, tipoCompromisso: value })
                }
              >
                <SelectTrigger id="edit-tipoCompromisso">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="tipo-inv-3" value="Investimento">Investimento</SelectItem>
                  <SelectItem key="tipo-res-3" value="Ressarcimento">Ressarcimento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-titulo">Título *</Label>
              <Input
                id="edit-titulo"
                placeholder="Ex: Investimento em Material de PDV"
                value={novoCompromisso.titulo}
                onChange={(e) => setNovoCompromisso({ ...novoCompromisso, titulo: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-descricao">Descrição</Label>
              <Textarea
                id="edit-descricao"
                placeholder="Descreva os detalhes do compromisso..."
                rows={4}
                value={novoCompromisso.descricao}
                onChange={(e) => setNovoCompromisso({ ...novoCompromisso, descricao: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogEditarCompromissoOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarEdicaoCompromisso}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição de Pagamento */}
      <Dialog open={dialogEditarPagamentoOpen} onOpenChange={setDialogEditarPagamentoOpen}>
        <DialogContent className="max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Editar Pagamento</DialogTitle>
            <DialogDescription>
              Atualize as informações do pagamento selecionado
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-compromisso">Compromisso *</Label>
              <Combobox
                options={compromissosOptions}
                value={novoPagamento.compromissoId}
                onValueChange={(value) => setNovoPagamento({ ...novoPagamento, compromissoId: value })}
                placeholder="Selecione o compromisso"
                searchPlaceholder="Pesquisar compromisso..."
                emptyText="Nenhum compromisso pendente."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-dataPagamento">Data do Pagamento *</Label>
                <Input
                  id="edit-dataPagamento"
                  type="date"
                  value={novoPagamento.dataPagamento}
                  onChange={(e) => setNovoPagamento({ ...novoPagamento, dataPagamento: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-valorPagamento">Valor *</Label>
                <Input
                  id="edit-valorPagamento"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={novoPagamento.valor}
                  onChange={(e) => setNovoPagamento({ ...novoPagamento, valor: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-formaPagamento">Forma de Pagamento *</Label>
              <Select
                value={novoPagamento.formaPagamento}
                onValueChange={(value) => setNovoPagamento({ ...novoPagamento, formaPagamento: value })}
              >
                <SelectTrigger id="edit-formaPagamento">
                  <SelectValue placeholder="Selecione a forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  {formasPagamentoDisponiveis.map((forma) => (
                    <SelectItem key={forma.id} value={forma.nome}>
                      {forma.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-observacoes">Observações</Label>
              <Textarea
                id="edit-observacoes"
                placeholder="Observações sobre o pagamento..."
                rows={3}
                value={novoPagamento.observacoes}
                onChange={(e) => setNovoPagamento({ ...novoPagamento, observacoes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogEditarPagamentoOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarEdicaoPagamento}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={dialogExcluirOpen} onOpenChange={setDialogExcluirOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir{' '}
              {itemParaExcluir?.tipo === 'compromisso' ? 'o compromisso' : 'o pagamento'}{' '}
              <span className="font-semibold">&quot;{itemParaExcluir?.titulo}&quot;</span>?
              <br />
              <br />
              {itemParaExcluir?.tipo === 'compromisso' && (
                <span className="text-destructive">
                  Atenção: Esta ação também excluirá todos os pagamentos relacionados a este compromisso.
                </span>
              )}
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
