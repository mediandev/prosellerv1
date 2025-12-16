import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { api } from "../services/api";
import { toast } from "sonner@2.0.3";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar as CalendarUI } from "./ui/calendar";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Checkbox } from "./ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { 
  Search, 
  Download, 
  MoreVertical, 
  Eye,
  DollarSign,
  TrendingUp,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Plus,
  CreditCard,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  BarChart3,
  Mail,
  Send,
  Loader2,
  Edit,
  RotateCcw,
  Lock,
  Unlock
} from "lucide-react";
import { 
  RelatorioPeriodoComissoes,
  RelatorioComissoesCompleto,
  ComissaoVenda,
  LancamentoManual, 
  PagamentoPeriodo 
} from "../types/comissao";

import { CommissionReportPage } from "./CommissionReportPage";

interface CommissionsManagementProps {
  period?: string;
  onPeriodChange?: (period: string) => void;
  customDateRange?: { from: Date | undefined; to: Date | undefined };
  onCustomDateRangeChange?: (range: { from: Date | undefined; to: Date | undefined }) => void;
}

export function CommissionsManagement({
  period = "current_month",
  onPeriodChange,
  customDateRange = { from: undefined, to: undefined },
  onCustomDateRangeChange
}: CommissionsManagementProps) {
  // Estados principais
  const [relatorios, setRelatorios] = useState<RelatorioPeriodoComissoes[]>([]);
  const [comissoesVendas, setComissoesVendas] = useState<ComissaoVenda[]>([]);
  const [lancamentosManuais, setLancamentosManuais] = useState<LancamentoManual[]>([]);
  const [pagamentos, setPagamentos] = useState<PagamentoPeriodo[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [relatorioSelecionado, setRelatorioSelecionado] = useState<RelatorioComissoesCompleto | null>(null);
  const [visualizandoRelatorio, setVisualizandoRelatorio] = useState(false);
  
  // Dialogs
  const [dialogLancamento, setDialogLancamento] = useState(false);
  const [dialogPagamento, setDialogPagamento] = useState(false);
  const [dialogEnvioEmMassa, setDialogEnvioEmMassa] = useState(false);
  const [dialogEditarLancamento, setDialogEditarLancamento] = useState(false);
  const [dialogReabrir, setDialogReabrir] = useState(false);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [relatoriosSelecionados, setRelatoriosSelecionados] = useState<Set<string>>(new Set());
  const [enviandoEmMassa, setEnviandoEmMassa] = useState(false);
  const [progressoEnvio, setProgressoEnvio] = useState({ atual: 0, total: 0 });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>(customDateRange);
  
  // Período selecionado
  const [mesAtual] = useState(10);
  const [anoAtual] = useState(2025);
  const [mesSelecionado, setMesSelecionado] = useState(mesAtual.toString().padStart(2, '0'));
  const [anoSelecionado, setAnoSelecionado] = useState(anoAtual.toString());

  // Lançamento sendo editado
  const [lancamentoEditando, setLancamentoEditando] = useState<{
    tipo: 'venda' | 'lancamentoManual' | 'pagamento';
    dados: ComissaoVenda | LancamentoManual | PagamentoPeriodo;
  } | null>(null);

  // Formulários
  const [formLancamento, setFormLancamento] = useState({
    tipo: "credito" as "credito" | "debito",
    valor: "",
    descricao: "",
    data: format(new Date(), "yyyy-MM-dd")
  });

  const [formPagamento, setFormPagamento] = useState({
    valor: "",
    formaPagamento: "",
    comprovante: "",
    observacoes: "",
    data: format(new Date(), "yyyy-MM-dd")
  });

  const [formEdicao, setFormEdicao] = useState({
    periodo: "",
    observacoes: ""
  });

  const periodoSelecionado = `${anoSelecionado}-${mesSelecionado}`;

  // Carregar dados de comissões
  useEffect(() => {
    carregarComissoes();
  }, []);

  const carregarComissoes = async () => {
    try {
      console.log('[COMISSOES] Carregando dados...');
      
      const [relatoriosAPI, lancamentosAPI, pagamentosAPI, comissoesVendasAPI, vendedoresAPI] = await Promise.all([
        api.get('relatoriosComissao'),
        api.get('lancamentosComissao'),
        api.get('pagamentosComissao'),
        api.get('comissoesVendas'),
        api.get('vendedores'),
      ]);

      setRelatorios(Array.isArray(relatoriosAPI) ? relatoriosAPI : []);
      setLancamentosManuais(Array.isArray(lancamentosAPI) ? lancamentosAPI : []);
      setPagamentos(Array.isArray(pagamentosAPI) ? pagamentosAPI : []);
      setComissoesVendas(Array.isArray(comissoesVendasAPI) ? comissoesVendasAPI : []);
      setVendedores(Array.isArray(vendedoresAPI) ? vendedoresAPI : []);

      console.log('[COMISSOES] Dados carregados:', {
        relatorios: relatoriosAPI?.length || 0,
        lancamentos: lancamentosAPI?.length || 0,
        pagamentos: pagamentosAPI?.length || 0
      });
    } catch (error) {
      console.error('[COMISSOES] Erro ao carregar dados:', error);
      toast.error('Erro ao carregar comissões da API.');
      setRelatorios([]);
      setComissoesVendas([]);
      setLancamentosManuais([]);
      setPagamentos([]);
      setVendedores([]);
    } finally {
      setLoading(false);
    }
  };

  // Handlers para período
  const handleDateSelect = (range: { from: Date | undefined; to: Date | undefined } | undefined) => {
    if (range) {
      setDateRange(range);
      if (range.from && range.to) {
        onPeriodChange?.("custom");
        onCustomDateRangeChange?.(range);
        setIsCalendarOpen(false);
      }
    }
  };

  const formatDateRange = () => {
    if (!dateRange.from || !dateRange.to) return "Selecionar período";
    return `${format(dateRange.from, "dd/MM/yy", { locale: ptBR })} - ${format(dateRange.to, "dd/MM/yy", { locale: ptBR })}`;
  };

  // ========================================
  // FUNÇÕES DE CÁLCULO (TEMPO REAL)
  // ========================================

  const calcularRelatorioCompleto = (relatorio: RelatorioPeriodoComissoes): RelatorioComissoesCompleto => {
    // Buscar vendedor
    const vendedor = vendedores.find(v => v.id === relatorio.vendedorId);
    
    // Buscar lançamentos do período
    const vendas = comissoesVendas.filter(cv => 
      cv.vendedorId === relatorio.vendedorId && cv.periodo === relatorio.periodo
    );
    
    const lancamentos = lancamentosManuais.filter(lm => 
      lm.vendedorId === relatorio.vendedorId && lm.periodo === relatorio.periodo
    );
    
    const pagsRelatorio = pagamentos.filter(p => 
      p.vendedorId === relatorio.vendedorId && p.periodo === relatorio.periodo
    );
    
    // Separar lançamentos
    const lancamentosCredito = lancamentos.filter(l => l.tipo === 'credito');
    const lancamentosDebito = lancamentos.filter(l => l.tipo === 'debito');
    
    // Calcular totalizadores
    const totalVendas = vendas.reduce((sum, v) => sum + v.valorTotalVenda, 0);
    const quantidadeVendas = vendas.length;
    const totalComissoes = vendas.reduce((sum, v) => sum + v.valorComissao, 0);
    const totalCreditos = lancamentosCredito.reduce((sum, l) => sum + l.valor, 0);
    const totalDebitos = lancamentosDebito.reduce((sum, l) => sum + l.valor, 0);
    
    return {
      relatorio,
      vendedorNome: vendedor?.nome || relatorio.vendedorId,
      vendedorEmail: vendedor?.email || "",
      vendedorIniciais: vendedor?.iniciais || "",
      vendas,
      lancamentosCredito,
      lancamentosDebito,
      pagamentos: pagsRelatorio,
      totalVendas,
      quantidadeVendas,
      totalComissoes,
      totalCreditos,
      totalDebitos
    };
  };

  // Relatórios filtrados com cálculos
  const relatoriosCompletos = useMemo(() => {
    return relatorios.map(calcularRelatorioCompleto);
  }, [relatorios, comissoesVendas, lancamentosManuais, pagamentos]);

  const relatoriosFiltrados = useMemo(() => {
    return relatoriosCompletos.filter((relCompleto) => {
      const matchesSearch = searchTerm === "" || 
                           relCompleto.vendedorNome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filtroStatus === "todos" || relCompleto.relatorio.status === filtroStatus;
      const matchesPeriodo = relCompleto.relatorio.periodo === periodoSelecionado;
      
      return matchesSearch && matchesStatus && matchesPeriodo;
    });
  }, [relatoriosCompletos, searchTerm, filtroStatus, periodoSelecionado]);

  // Estatísticas gerais
  const estatisticas = {
    totalComissoes: relatorios.reduce((sum, r) => sum + r.valorLiquido, 0),
    totalPago: relatorios.reduce((sum, r) => sum + r.totalPago, 0),
    totalPendente: relatorios.reduce((sum, r) => sum + r.saldoDevedor, 0),
    quantidadeRelatorios: relatorios.length
  };

  // ========================================
  // FUNÇÕES DE NAVEGAÇÃO
  // ========================================

  const handleVerDetalhes = (relatorioCompleto: RelatorioComissoesCompleto) => {
    setRelatorioSelecionado(relatorioCompleto);
    setVisualizandoRelatorio(true);
  };

  const handleVoltarLista = () => {
    setVisualizandoRelatorio(false);
    setRelatorioSelecionado(null);
  };

  // ========================================
  // FUNÇÕES DE LANÇAMENTO MANUAL
  // ========================================

  const handleAbrirLancamento = (relatorioCompleto: RelatorioComissoesCompleto) => {
    setRelatorioSelecionado(relatorioCompleto);
    setFormLancamento({
      tipo: "credito",
      valor: "",
      descricao: "",
      data: format(new Date(), "yyyy-MM-dd")
    });
    setDialogLancamento(true);
  };

  const handleSalvarLancamento = () => {
    if (!relatorioSelecionado) return;
    
    if (!formLancamento.valor || parseFloat(formLancamento.valor) <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    
    if (!formLancamento.descricao.trim()) {
      toast.error("Informe a descrição do lançamento");
      return;
    }

    const novoLancamento: LancamentoManual = {
      id: `L${formLancamento.tipo === 'credito' ? 'C' : 'D'}-${Date.now()}`,
      vendedorId: relatorioSelecionado.relatorio.vendedorId,
      periodo: relatorioSelecionado.relatorio.periodo,
      data: formLancamento.data,
      tipo: formLancamento.tipo,
      valor: parseFloat(formLancamento.valor),
      descricao: formLancamento.descricao,
      criadoPor: "Usuário Backoffice", // Em produção, pegar do contexto
      criadoEm: new Date().toISOString()
    };

    // Salvar no Supabase
    api.create('lancamentosComissao', novoLancamento)
      .then(() => {
        setLancamentosManuais([...lancamentosManuais, novoLancamento]);
        recalcularRelatorio(relatorioSelecionado.relatorio.id);
        toast.success(`Lançamento de ${formLancamento.tipo} registrado com sucesso!`);
        setDialogLancamento(false);
      })
      .catch((error: any) => {
        console.error('[COMISSOES] Erro ao salvar lançamento:', error);
        toast.error(`Erro ao salvar lançamento: ${error.message || 'Erro desconhecido'}`);
      });
  };

  // ========================================
  // FUNÇÕES DE PAGAMENTO
  // ========================================

  const handleAbrirPagamento = (relatorioCompleto: RelatorioComissoesCompleto) => {
    setRelatorioSelecionado(relatorioCompleto);
    setFormPagamento({
      valor: relatorioCompleto.relatorio.saldoDevedor.toFixed(2),
      formaPagamento: "",
      comprovante: "",
      observacoes: "",
      data: format(new Date(), "yyyy-MM-dd")
    });
    setDialogPagamento(true);
  };

  const handleSalvarPagamento = () => {
    if (!relatorioSelecionado) return;
    
    if (!formPagamento.valor || parseFloat(formPagamento.valor) <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    
    if (!formPagamento.formaPagamento) {
      toast.error("Selecione a forma de pagamento");
      return;
    }

    const novoPagamento: PagamentoPeriodo = {
      id: `PG-${Date.now()}`,
      vendedorId: relatorioSelecionado.relatorio.vendedorId,
      periodo: relatorioSelecionado.relatorio.periodo,
      data: formPagamento.data,
      valor: parseFloat(formPagamento.valor),
      formaPagamento: formPagamento.formaPagamento,
      comprovante: formPagamento.comprovante || undefined,
      observacoes: formPagamento.observacoes || undefined,
      realizadoPor: "Usuário Backoffice",
      realizadoEm: new Date().toISOString()
    };

    // Salvar no Supabase
    api.create('pagamentosComissao', novoPagamento)
      .then(() => {
        setPagamentos([...pagamentos, novoPagamento]);
        recalcularRelatorio(relatorioSelecionado.relatorio.id);
        toast.success("Pagamento registrado com sucesso!");
        setDialogPagamento(false);
      })
      .catch((error: any) => {
        console.error('[COMISSOES] Erro ao salvar pagamento:', error);
        toast.error(`Erro ao salvar pagamento: ${error.message || 'Erro desconhecido'}`);
      });
  };

  // ========================================
  // FUNÇÕES DE EDIÇÃO DE LANÇAMENTOS
  // ========================================

  const handleAbrirEdicaoLancamento = (
    tipo: 'venda' | 'lancamentoManual' | 'pagamento',
    dados: ComissaoVenda | LancamentoManual | PagamentoPeriodo
  ) => {
    setLancamentoEditando({ tipo, dados });
    setFormEdicao({
      periodo: dados.periodo,
      observacoes: 'observacoes' in dados ? dados.observacoes || "" : ""
    });
    setDialogEditarLancamento(true);
  };

  const handleSalvarEdicaoLancamento = () => {
    if (!lancamentoEditando) return;

    const { tipo, dados } = lancamentoEditando;
    const periodoAnterior = dados.periodo;
    const periodoNovo = formEdicao.periodo;

    // Atualizar lançamento
    const dadosEditados = {
      ...dados,
      periodo: periodoNovo,
      editadoPor: "Usuário Backoffice",
      editadoEm: new Date().toISOString()
    };

    if ('observacoes' in dadosEditados) {
      dadosEditados.observacoes = formEdicao.observacoes;
    }

    // Atualizar no array correspondente
    if (tipo === 'venda') {
      setComissoesVendas(comissoesVendas.map(cv => 
        cv.id === dados.id ? dadosEditados as ComissaoVenda : cv
      ));
    } else if (tipo === 'lancamentoManual') {
      setLancamentosManuais(lancamentosManuais.map(lm => 
        lm.id === dados.id ? dadosEditados as LancamentoManual : lm
      ));
    } else if (tipo === 'pagamento') {
      setPagamentos(pagamentos.map(p => 
        p.id === dados.id ? dadosEditados as PagamentoPeriodo : p
      ));
    }

    // Recalcular ambos os períodos se mudou
    if (periodoAnterior !== periodoNovo) {
      const relAnterior = relatorios.find(r => 
        r.vendedorId === dados.vendedorId && r.periodo === periodoAnterior
      );
      const relNovo = relatorios.find(r => 
        r.vendedorId === dados.vendedorId && r.periodo === periodoNovo
      );

      if (relAnterior) recalcularRelatorio(relAnterior.id);
      if (relNovo) recalcularRelatorio(relNovo.id);

      toast.success(`Lançamento transferido de ${formatPeriodo(periodoAnterior)} para ${formatPeriodo(periodoNovo)}`);
    } else {
      recalcularRelatorio(relatorios.find(r => 
        r.vendedorId === dados.vendedorId && r.periodo === periodoNovo
      )?.id || "");
      toast.success("Lançamento atualizado com sucesso!");
    }

    setDialogEditarLancamento(false);
    setLancamentoEditando(null);
  };

  // ========================================
  // FUNÇÃO DE REABERTURA DE PERÍODO
  // ========================================

  const handleAbrirReabrir = (relatorioCompleto: RelatorioComissoesCompleto) => {
    setRelatorioSelecionado(relatorioCompleto);
    setDialogReabrir(true);
  };

  const handleReabrirPeriodo = () => {
    if (!relatorioSelecionado) return;

    const relatorio = relatorioSelecionado.relatorio;

    if (relatorio.status === "pago") {
      toast.error("Não é possível reabrir um período já pago");
      return;
    }

    if (relatorio.status !== "fechado") {
      toast.error("Apenas períodos fechados podem ser reabertos");
      return;
    }

    setRelatorios(relatorios.map(r => {
      if (r.id === relatorio.id) {
        return {
          ...r,
          status: "aberto" as const,
          dataFechamento: undefined
        };
      }
      return r;
    }));

    toast.success(`Período ${formatPeriodo(relatorio.periodo)} reaberto com sucesso!`);
    setDialogReabrir(false);
  };

  // ========================================
  // FUNÇÃO DE RECÁLCULO
  // ========================================

  const recalcularRelatorio = (relatorioId: string) => {
    const relatorio = relatorios.find(r => r.id === relatorioId);
    if (!relatorio) return;

    const vendas = comissoesVendas.filter(cv => 
      cv.vendedorId === relatorio.vendedorId && cv.periodo === relatorio.periodo
    );
    
    const lancamentos = lancamentosManuais.filter(lm => 
      lm.vendedorId === relatorio.vendedorId && lm.periodo === relatorio.periodo
    );
    
    const pagsRelatorio = pagamentos.filter(p => 
      p.vendedorId === relatorio.vendedorId && p.periodo === relatorio.periodo
    );

    const totalComissoes = vendas.reduce((sum, v) => sum + v.valorComissao, 0);
    const totalCreditos = lancamentos.filter(l => l.tipo === 'credito').reduce((sum, l) => sum + l.valor, 0);
    const totalDebitos = lancamentos.filter(l => l.tipo === 'debito').reduce((sum, l) => sum + l.valor, 0);
    const totalPago = pagsRelatorio.reduce((sum, p) => sum + p.valor, 0);

    const valorLiquido = totalComissoes + totalCreditos - totalDebitos + relatorio.saldoAnterior;
    const saldoDevedor = valorLiquido - totalPago;
    const status = saldoDevedor <= 0 && relatorio.status === "fechado" ? "pago" as const : relatorio.status;

    setRelatorios(relatorios.map(r => {
      if (r.id === relatorioId) {
        return {
          ...r,
          valorLiquido,
          totalPago,
          saldoDevedor,
          status,
          dataPagamento: status === "pago" && !r.dataPagamento ? new Date().toISOString() : r.dataPagamento
        };
      }
      return r;
    }));
  };

  // ========================================
  // FUNÇÕES DE ENVIO EM MASSA
  // ========================================

  const handleToggleSelecao = (relatorioId: string) => {
    const novaSelecao = new Set(relatoriosSelecionados);
    if (novaSelecao.has(relatorioId)) {
      novaSelecao.delete(relatorioId);
    } else {
      novaSelecao.add(relatorioId);
    }
    setRelatoriosSelecionados(novaSelecao);
  };

  const handleSelecionarTodos = () => {
    if (relatoriosSelecionados.size === relatoriosFiltrados.length) {
      setRelatoriosSelecionados(new Set());
    } else {
      setRelatoriosSelecionados(new Set(relatoriosFiltrados.map(r => r.relatorio.id)));
    }
  };

  const handleAbrirEnvioEmMassa = () => {
    if (relatoriosSelecionados.size === 0) {
      toast.error("Selecione pelo menos um relatório para enviar");
      return;
    }
    setDialogEnvioEmMassa(true);
  };

  const handleEnvioEmMassa = async () => {
    setEnviandoEmMassa(true);
    setDialogEnvioEmMassa(false);
    
    const relatoriosParaEnviar = relatoriosCompletos.filter(r => relatoriosSelecionados.has(r.relatorio.id));
    
    setProgressoEnvio({ atual: 0, total: relatoriosParaEnviar.length });
    
    const resultados = {
      sucessos: [] as string[],
      falhas: [] as { vendedor: string; motivo: string }[]
    };

    for (let i = 0; i < relatoriosParaEnviar.length; i++) {
      const relCompleto = relatoriosParaEnviar[i];
      
      setProgressoEnvio({ atual: i + 1, total: relatoriosParaEnviar.length });
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (!relCompleto.vendedorEmail) {
        resultados.falhas.push({
          vendedor: relCompleto.vendedorNome,
          motivo: "E-mail não cadastrado"
        });
        continue;
      }

      try {
        console.log(`=== ENVIO EM MASSA ${i + 1}/${relatoriosParaEnviar.length} ===`);
        console.log('Para:', relCompleto.vendedorEmail);
        console.log('Vendedor:', relCompleto.vendedorNome);
        console.log('Período:', formatPeriodo(relCompleto.relatorio.periodo));
        console.log('Valor Líquido:', formatCurrency(relCompleto.relatorio.valorLiquido));
        console.log('==========================================');
        
        resultados.sucessos.push(relCompleto.vendedorNome);
      } catch (error) {
        resultados.falhas.push({
          vendedor: relCompleto.vendedorNome,
          motivo: "Erro ao processar"
        });
      }
    }

    setEnviandoEmMassa(false);
    setProgressoEnvio({ atual: 0, total: 0 });
    
    if (resultados.sucessos.length > 0 && resultados.falhas.length === 0) {
      toast.success(
        `${resultados.sucessos.length} ${resultados.sucessos.length === 1 ? 'relatório enviado' : 'relatórios enviados'} com sucesso!\n\n` +
        `⚠️ NOTA: Esta é uma simulação. Em produção, os e-mails seriam enviados via API de backend.`,
        { duration: 6000 }
      );
    } else if (resultados.sucessos.length > 0) {
      toast.warning(
        `${resultados.sucessos.length} enviados com sucesso\n${resultados.falhas.length} falharam:\n` +
        resultados.falhas.map(f => `• ${f.vendedor}: ${f.motivo}`).join('\n'),
        { duration: 8000 }
      );
    } else {
      toast.error(
        `Falha ao enviar todos os relatórios:\n` +
        resultados.falhas.map(f => `• ${f.vendedor}: ${f.motivo}`).join('\n'),
        { duration: 8000 }
      );
    }
    
    setRelatoriosSelecionados(new Set());
  };

  // ========================================
  // FUNÇÕES AUXILIARES
  // ========================================

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: any, label: string }> = {
      aberto: { variant: "secondary", icon: Clock, label: "Aberto" },
      fechado: { variant: "outline", icon: AlertCircle, label: "Fechado" },
      pago: { variant: "default", icon: CheckCircle2, label: "Pago" }
    };
    
    const config = variants[status] || variants.aberto;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
  };

  const formatPeriodo = (periodo: string) => {
    const [ano, mes] = periodo.split('-');
    if (mes) {
      const data = new Date(parseInt(ano), parseInt(mes) - 1);
      return format(data, "MMMM/yyyy", { locale: ptBR });
    }
    return ano;
  };

  const meses = [
    { value: "01", label: "Janeiro" },
    { value: "02", label: "Fevereiro" },
    { value: "03", label: "Março" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Maio" },
    { value: "06", label: "Junho" },
    { value: "07", label: "Julho" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" }
  ];

  const anos = Array.from({ length: 5 }, (_, i) => {
    const ano = anoAtual - 2 + i;
    return { value: ano.toString(), label: ano.toString() };
  });

  // Atualizar relatório de detalhes (callback do CommissionReportPage)
  const handleAtualizarRelatorioDetalhe = (relatorioAtualizado: RelatorioPeriodoComissoes) => {
    setRelatorios(relatorios.map(rel => 
      rel.id === relatorioAtualizado.id ? relatorioAtualizado : rel
    ));
    
    // Recalcular relatório completo
    const relCompleto = calcularRelatorioCompleto(relatorioAtualizado);
    setRelatorioSelecionado(relCompleto);
  };

  // Períodos disponíveis para transferência
  const periodosDisponiveis = useMemo(() => {
    if (!lancamentoEditando) return [];
    
    // Pegar períodos do mesmo vendedor
    const vendedorId = lancamentoEditando.dados.vendedorId;
    return relatorios
      .filter(r => r.vendedorId === vendedorId)
      .map(r => r.periodo)
      .sort()
      .reverse();
  }, [lancamentoEditando, relatorios]);

  // ========================================
  // RENDERIZAÇÃO
  // ========================================

  // Se está visualizando um relatório, mostrar a página de detalhes
  if (visualizandoRelatorio && relatorioSelecionado) {
    return (
      <CommissionReportPage 
        relatorio={relatorioSelecionado.relatorio}
        relatorioCompleto={relatorioSelecionado}
        onVoltar={handleVoltarLista}
        onAtualizarRelatorio={handleAtualizarRelatorioDetalhe}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-3xl">Gestão de Comissões</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie relatórios periódicos de comissões, lançamentos manuais e pagamentos
        </p>
      </div>

      {/* Filtros de Período */}
      <div className="flex flex-wrap gap-2">
        <Select value={period === "custom" ? "" : period} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-[200px]">
            <CalendarIcon className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Selecione o período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem key="per-curr-month" value="current_month">Mês atual</SelectItem>
            <SelectItem key="per-last-month" value="last_month">Mês anterior</SelectItem>
            <SelectItem key="per-curr-quarter" value="current_quarter">Trimestre atual</SelectItem>
            <SelectItem key="per-curr-year" value="current_year">Ano atual</SelectItem>
            <SelectItem key="per-30" value="30">Últimos 30 dias</SelectItem>
            <SelectItem key="per-90" value="90">Últimos 90 dias</SelectItem>
            <SelectItem key="per-365" value="365">Último ano</SelectItem>
          </SelectContent>
        </Select>
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[240px] justify-start">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {period === "custom" && dateRange.from && dateRange.to ? (
                formatDateRange()
              ) : (
                "Período personalizado"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <CalendarUI
              mode="range"
              selected={dateRange}
              onSelect={handleDateSelect}
              numberOfMonths={2}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Comissões</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(estatisticas.totalComissoes)}</div>
            <p className="text-xs text-muted-foreground">
              {estatisticas.quantidadeRelatorios} períodos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(estatisticas.totalPago)}
            </div>
            <p className="text-xs text-muted-foreground">
              Pagamentos realizados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Devedor</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(estatisticas.totalPendente)}
            </div>
            <p className="text-xs text-muted-foreground">
              Aguardando pagamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Percentual Pago</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {estatisticas.totalComissoes > 0 
                ? ((estatisticas.totalPago / estatisticas.totalComissoes) * 100).toFixed(1)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Do total de comissões
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Relatórios */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Relatórios de Comissões por Período
              </CardTitle>
              <CardDescription>
                Visualize, gerencie lançamentos manuais e registre pagamentos
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="flex gap-4 flex-wrap items-end">
            {/* Seletor de Período */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Período</Label>
              <div className="flex gap-2">
                <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {meses.map((mes) => (
                      <SelectItem key={mes.value} value={mes.value}>
                        {mes.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={anoSelecionado} onValueChange={setAnoSelecionado}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {anos.map((ano) => (
                      <SelectItem key={ano.value} value={ano.value}>
                        {ano.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Busca por vendedor */}
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por vendedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filtro de Status */}
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="st-todos" value="todos">Todos os status</SelectItem>
                <SelectItem key="st-aberto" value="aberto">Aberto</SelectItem>
                <SelectItem key="st-fechado" value="fechado">Fechado</SelectItem>
                <SelectItem key="st-pago" value="pago">Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Info do período selecionado */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            <span>
              Exibindo relatórios de <span className="font-medium text-foreground capitalize">{formatPeriodo(periodoSelecionado)}</span>
              {relatoriosFiltrados.length > 0 && (
                <> • {relatoriosFiltrados.length} {relatoriosFiltrados.length === 1 ? 'vendedor' : 'vendedores'}</>
              )}
            </span>
          </div>

          {/* Ações em Massa */}
          {relatoriosSelecionados.size > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  {relatoriosSelecionados.size} {relatoriosSelecionados.size === 1 ? 'relatório selecionado' : 'relatórios selecionados'}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRelatoriosSelecionados(new Set())}
                >
                  Limpar Seleção
                </Button>
                <Button
                  size="sm"
                  onClick={handleAbrirEnvioEmMassa}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  Enviar por E-mail
                </Button>
              </div>
            </div>
          )}

          {/* Indicador de envio em massa */}
          {enviandoEmMassa && (
            <div className="flex items-center justify-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  Enviando relatórios... {progressoEnvio.atual} de {progressoEnvio.total}
                </span>
              </div>
            </div>
          )}

          {/* Tabela */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={relatoriosFiltrados.length > 0 && relatoriosSelecionados.size === relatoriosFiltrados.length}
                      onCheckedChange={handleSelecionarTodos}
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Vendas</TableHead>
                  <TableHead>Comissões</TableHead>
                  <TableHead>Ajustes</TableHead>
                  <TableHead>Valor Líquido</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relatoriosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">Nenhum relatório encontrado</p>
                        <p className="text-sm text-muted-foreground">
                          Verifique os filtros aplicados (período, vendedor ou status)
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  relatoriosFiltrados.map((relCompleto) => (
                    <TableRow key={relCompleto.relatorio.id}>
                      <TableCell>
                        <Checkbox
                          checked={relatoriosSelecionados.has(relCompleto.relatorio.id)}
                          onCheckedChange={() => handleToggleSelecao(relCompleto.relatorio.id)}
                          aria-label={`Selecionar ${relCompleto.vendedorNome}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {relCompleto.vendedorIniciais || relCompleto.vendedorNome
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{relCompleto.vendedorNome}</div>
                            <div className="text-xs text-muted-foreground">
                              {relCompleto.vendedorEmail || `ID: ${relCompleto.relatorio.vendedorId}`}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{formatCurrency(relCompleto.totalVendas)}</div>
                          <div className="text-xs text-muted-foreground">
                            {relCompleto.quantidadeVendas} {relCompleto.quantidadeVendas === 1 ? 'venda' : 'vendas'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{formatCurrency(relCompleto.totalComissoes)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          {relCompleto.totalCreditos > 0 && (
                            <div className="flex items-center gap-1 text-green-600">
                              <ArrowUpCircle className="h-3 w-3" />
                              +{formatCurrency(relCompleto.totalCreditos)}
                            </div>
                          )}
                          {relCompleto.totalDebitos > 0 && (
                            <div className="flex items-center gap-1 text-red-600">
                              <ArrowDownCircle className="h-3 w-3" />
                              -{formatCurrency(relCompleto.totalDebitos)}
                            </div>
                          )}
                          {relCompleto.totalCreditos === 0 && relCompleto.totalDebitos === 0 && (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{formatCurrency(relCompleto.relatorio.valorLiquido)}</div>
                          {relCompleto.relatorio.saldoAnterior > 0 && (
                            <div className="text-xs text-amber-600">
                              +{formatCurrency(relCompleto.relatorio.saldoAnterior)} anterior
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-green-600">
                          {formatCurrency(relCompleto.relatorio.totalPago)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`font-medium ${relCompleto.relatorio.saldoDevedor > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                          {formatCurrency(relCompleto.relatorio.saldoDevedor)}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(relCompleto.relatorio.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleVerDetalhes(relCompleto)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            {relCompleto.relatorio.status !== "pago" && (
                              <>
                                <DropdownMenuItem onClick={() => handleAbrirLancamento(relCompleto)}>
                                  <Plus className="h-4 w-4 mr-2" />
                                  Lançamento Manual
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAbrirPagamento(relCompleto)}>
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  Registrar Pagamento
                                </DropdownMenuItem>
                              </>
                            )}
                            {relCompleto.relatorio.status === "fechado" && (
                              <DropdownMenuItem onClick={() => handleAbrirReabrir(relCompleto)}>
                                <Unlock className="h-4 w-4 mr-2" />
                                Reabrir Período
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              Exportar PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Lançamento Manual */}
      <Dialog open={dialogLancamento} onOpenChange={setDialogLancamento}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Lançamento Manual
            </DialogTitle>
            <DialogDescription>
              Adicione créditos ou débitos ao relatório de {relatorioSelecionado?.vendedorNome}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Lançamento</Label>
              <Select 
                value={formLancamento.tipo} 
                onValueChange={(value: "credito" | "debito") => setFormLancamento({...formLancamento, tipo: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credito">
                    <div className="flex items-center gap-2">
                      <ArrowUpCircle className="h-4 w-4 text-green-600" />
                      <span>Crédito (Adicionar)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="debito">
                    <div className="flex items-center gap-2">
                      <ArrowDownCircle className="h-4 w-4 text-red-600" />
                      <span>Débito (Subtrair)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={formLancamento.valor}
                onChange={(e) => setFormLancamento({...formLancamento, valor: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={formLancamento.data}
                onChange={(e) => setFormLancamento({...formLancamento, data: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Ex: Bonificação por atingimento de meta"
                value={formLancamento.descricao}
                onChange={(e) => setFormLancamento({...formLancamento, descricao: e.target.value})}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogLancamento(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarLancamento}>
              Salvar Lançamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Pagamento */}
      <Dialog open={dialogPagamento} onOpenChange={setDialogPagamento}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Registrar Pagamento
            </DialogTitle>
            <DialogDescription>
              Registre um pagamento de comissão para {relatorioSelecionado?.vendedorNome}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {relatorioSelecionado && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-900">Saldo devedor atual:</span>
                  <span className="font-semibold text-blue-900">
                    {formatCurrency(relatorioSelecionado.relatorio.saldoDevedor)}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={formPagamento.valor}
                onChange={(e) => setFormPagamento({...formPagamento, valor: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Data do Pagamento</Label>
              <Input
                type="date"
                value={formPagamento.data}
                onChange={(e) => setFormPagamento({...formPagamento, data: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select 
                value={formPagamento.formaPagamento} 
                onValueChange={(value) => setFormPagamento({...formPagamento, formaPagamento: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="Transferência Bancária">Transferência Bancária</SelectItem>
                  <SelectItem value="TED">TED</SelectItem>
                  <SelectItem value="DOC">DOC</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Número do Comprovante (opcional)</Label>
              <Input
                placeholder="Ex: PIX-2025-001"
                value={formPagamento.comprovante}
                onChange={(e) => setFormPagamento({...formPagamento, comprovante: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                placeholder="Informações adicionais sobre o pagamento"
                value={formPagamento.observacoes}
                onChange={(e) => setFormPagamento({...formPagamento, observacoes: e.target.value})}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogPagamento(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarPagamento}>
              Registrar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição de Lançamento */}
      <Dialog open={dialogEditarLancamento} onOpenChange={setDialogEditarLancamento}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Editar Lançamento
            </DialogTitle>
            <DialogDescription>
              Edite ou transfira o lançamento entre períodos
            </DialogDescription>
          </DialogHeader>

          {lancamentoEditando && (
            <div className="space-y-4 py-4">
              {/* Informações do lançamento */}
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span className="font-medium">
                    {lancamentoEditando.tipo === 'venda' && 'Comissão de Venda'}
                    {lancamentoEditando.tipo === 'lancamentoManual' && 
                      `Lançamento Manual (${(lancamentoEditando.dados as LancamentoManual).tipo})`}
                    {lancamentoEditando.tipo === 'pagamento' && 'Pagamento'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor:</span>
                  <span className="font-medium">
                    {formatCurrency('valor' in lancamentoEditando.dados 
                      ? lancamentoEditando.dados.valor 
                      : (lancamentoEditando.dados as ComissaoVenda).valorComissao)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Período atual:</span>
                  <span className="font-medium">{formatPeriodo(lancamentoEditando.dados.periodo)}</span>
                </div>
              </div>

              {/* Período (editável) */}
              <div className="space-y-2">
                <Label>Transferir para período</Label>
                <Select
                  value={formEdicao.periodo}
                  onValueChange={(value) => setFormEdicao({...formEdicao, periodo: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {periodosDisponiveis.map(p => (
                      <SelectItem key={p} value={p}>
                        {formatPeriodo(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formEdicao.periodo !== lancamentoEditando.dados.periodo && (
                  <p className="text-sm text-amber-600">
                    ⚠️ O lançamento será transferido de {formatPeriodo(lancamentoEditando.dados.periodo)} 
                    para {formatPeriodo(formEdicao.periodo)}
                  </p>
                )}
              </div>

              {/* Observações (se aplicável) */}
              {'observacoes' in lancamentoEditando.dados && (
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={formEdicao.observacoes}
                    onChange={(e) => setFormEdicao({...formEdicao, observacoes: e.target.value})}
                    placeholder="Adicione observações..."
                    rows={2}
                  />
                </div>
              )}

              {/* Auditoria */}
              {lancamentoEditando.dados.editadoPor && (
                <div className="bg-muted p-2 rounded text-xs space-y-1">
                  <p className="text-muted-foreground">
                    Última edição: <span className="font-medium">{lancamentoEditando.dados.editadoPor}</span>
                  </p>
                  <p className="text-muted-foreground">
                    Em: {new Date(lancamentoEditando.dados.editadoEm!).toLocaleString('pt-BR')}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogEditarLancamento(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarEdicaoLancamento}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Reabertura de Período */}
      <Dialog open={dialogReabrir} onOpenChange={setDialogReabrir}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlock className="h-5 w-5" />
              Reabrir Período
            </DialogTitle>
            <DialogDescription>
              Confirme a reabertura do período fechado
            </DialogDescription>
          </DialogHeader>

          {relatorioSelecionado && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                <p className="text-sm text-amber-900">
                  Você está prestes a <span className="font-semibold">reabrir</span> o período de {" "}
                  <span className="font-semibold">{formatPeriodo(relatorioSelecionado.relatorio.periodo)}</span>
                  {" "}para o vendedor <span className="font-semibold">{relatorioSelecionado.vendedorNome}</span>.
                </p>
                <p className="text-sm text-amber-800">
                  O período voltará ao status "Aberto" e poderá receber novos lançamentos.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fechado em:</span>
                  <span className="font-medium">
                    {relatorioSelecionado.relatorio.dataFechamento 
                      ? new Date(relatorioSelecionado.relatorio.dataFechamento).toLocaleString('pt-BR')
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor líquido:</span>
                  <span className="font-medium">{formatCurrency(relatorioSelecionado.relatorio.valorLiquido)}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogReabrir(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReabrirPeriodo} variant="default">
              Confirmar Reabertura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Envio em Massa */}
      <Dialog open={dialogEnvioEmMassa} onOpenChange={setDialogEnvioEmMassa}>
        <DialogContent className="max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Enviar Relatórios por E-mail
            </DialogTitle>
            <DialogDescription>
              Confirme o envio de {relatoriosSelecionados.size} {relatoriosSelecionados.size === 1 ? 'relatório' : 'relatórios'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                Os relatórios de comissões serão enviados por e-mail para os vendedores selecionados.
              </p>
            </div>

            {/* Tabela de destinatários */}
            <div className="border rounded-lg max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead className="text-right">Valor Líquido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatoriosCompletos
                    .filter(r => relatoriosSelecionados.has(r.relatorio.id))
                    .map(relCompleto => (
                      <TableRow key={relCompleto.relatorio.id}>
                        <TableCell className="font-medium">{relCompleto.vendedorNome}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {relCompleto.vendedorEmail || <span className="text-red-600">E-mail não cadastrado</span>}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(relCompleto.relatorio.valorLiquido)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-900">
                ⚠️ <span className="font-semibold">NOTA DE DEMONSTRAÇÃO:</span> Esta é uma simulação. 
                Em produção, os PDFs seriam gerados e enviados via API de backend com serviço de e-mail configurado.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogEnvioEmMassa(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEnvioEmMassa} className="gap-2">
              <Send className="h-4 w-4" />
              Confirmar Envio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
