import { useState, useEffect, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Venda, StatusVenda } from "../types/venda";
import { NaturezaOperacao } from "../types/naturezaOperacao";
import { isStatusConcluido } from "../utils/statusVendaUtils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { Textarea } from "./ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { 
  Search, 
  Plus, 
  Filter, 
  Download, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  CheckCircle2,
  User,
  Building2,
  Check,
  ChevronsUpDown,
  Tag,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CalendarIcon,
  Plug,
  RefreshCw,
  Wrench,
  FileText,
  Send,
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { api } from '../services/api';
import { tinyERPSyncService } from '../services/tinyERPSync';
import { useAuth } from '../contexts/AuthContext';

interface Sale {
  id: string;
  numero: string;
  cliente: string;
  clienteCodigo?: string;
  clienteCnpj?: string;
  clienteRazaoSocial?: string;
  clienteNomeFantasia?: string;
  clienteGrupoRede?: string;
  ordemCompraCliente?: string;
  empresa: string;
  vendedor: string;
  vendedorId: string;
  vendedorIniciais: string;
  valor: number;
  produtos: string[];
  naturezaOperacao: string;
  naturezaOperacaoId: string;
  status: StatusVenda; // ✅ CORRIGIDO: Usar StatusVenda direto do banco
  data: string;
  dataFechamento?: string;
  observacoes?: string;
  probabilidade?: number;
  integracaoERP?: {
    erpPedidoId?: string;
    erpNumeroPedido?: string;
  };
}

// ✅ CORRIGIDO: Função para converter Venda para Sale SEM mapeamento de status
const convertVendaToSale = (venda: Venda | any): Sale => {
  // Extrair iniciais do vendedor (lidar com null/undefined)
  const nomeVendedor = venda.nomeVendedor || venda.vendedorNome || 'Sem Vendedor';
  const iniciais = nomeVendedor
    .split(' ')
    .filter(n => n && n.length > 0)
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2) || 'SV';

  // Normalizar status (se vazio ou inválido, usar 'Rascunho')
  const statusFromDb = (venda.status ?? '') as string;
  let status: StatusVenda = (statusFromDb as StatusVenda) || 'Rascunho';

  // Compat: mapear status antigos para o novo conjunto.
  if (statusFromDb === 'Em Separação') status = 'Pronto para envio';
  if (statusFromDb === 'Concluído') status = 'Entregue';

  const allowed: StatusVenda[] = [
    'Rascunho',
    'Em Análise',
    'Em aberto',
    'Aprovado',
    'Preparando envio',
    'Faturado',
    'Pronto para envio',
    'Enviado',
    'Entregue',
    'Não Entregue',
    'Cancelado',
  ];
  if (statusFromDb === '' || !allowed.includes(status)) status = 'Rascunho';

  // Garantir que itens seja um array
  const itens = Array.isArray(venda.itens) ? venda.itens : [];
  const produtos = itens.length > 0 
    ? itens.map((item: any) => item.descricaoProduto || item.descricao || 'Produto sem descrição')
    : ['Sem produtos cadastrados'];

  // Normalizar data
  let dataPedido: Date;
  if (venda.dataPedido) {
    if (venda.dataPedido instanceof Date) {
      dataPedido = venda.dataPedido;
    } else if (typeof venda.dataPedido === 'string') {
      dataPedido = new Date(venda.dataPedido);
    } else {
      dataPedido = new Date();
    }
  } else {
    dataPedido = venda.createdAt ? (venda.createdAt instanceof Date ? venda.createdAt : new Date(venda.createdAt)) : new Date();
  }

  return {
    id: venda.id || '',
    numero: venda.numero || venda.id || '',
    cliente: venda.nomeCliente || venda.clienteNome || 'Cliente não informado',
    clienteCodigo: venda.clienteCodigo,
    clienteCnpj: venda.cnpjCliente || venda.clienteCnpj,
    clienteRazaoSocial: venda.clienteRazaoSocial || venda.nomeCliente,
    clienteNomeFantasia: venda.clienteNomeFantasia,
    clienteGrupoRede: venda.clienteGrupoRede,
    ordemCompraCliente: venda.ordemCompraCliente,
    empresa: venda.nomeEmpresaFaturamento || venda.empresaFaturamentoNome || 'Empresa não informada',
    vendedor: nomeVendedor,
    vendedorId: venda.vendedorId || venda.vendedor_uuid || '',
    vendedorIniciais: iniciais,
    valor: venda.valorPedido || venda.valor_total || 0,
    produtos: produtos,
    naturezaOperacao: venda.nomeNaturezaOperacao || venda.naturezaOperacaoNome || 'Natureza não informada',
    naturezaOperacaoId: venda.naturezaOperacaoId || venda.natureza_operacao_id || '',
    status: status,
    data: format(dataPedido, "dd/MM/yyyy", { locale: ptBR }),
    dataFechamento: (status === 'Faturado' || status === 'Entregue' || status === 'Não Entregue' || status === 'Cancelado') && venda.updatedAt 
      ? format(venda.updatedAt instanceof Date ? venda.updatedAt : new Date(venda.updatedAt), "dd/MM/yyyy", { locale: ptBR }) 
      : undefined,
    observacoes: venda.observacoesInternas || venda.observacoes || '',
    integracaoERP: venda.integracaoERP,
  };
};

// ✅ CORRIGIDO: statusConfig para TODOS os StatusVenda possíveis
const statusConfig: Record<StatusVenda, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; color: string }> = {
  'Rascunho': { label: "Rascunho", variant: "outline", color: "text-gray-500" },
  'Em Análise': { label: "Em Análise", variant: "secondary", color: "text-yellow-600" },
  'Em aberto': { label: "Em aberto", variant: "secondary", color: "text-amber-700" },
  'Aprovado': { label: "Aprovado", variant: "secondary", color: "text-blue-500" },
  'Preparando envio': { label: "Preparando envio", variant: "secondary", color: "text-purple-500" },
  'Faturado': { label: "Faturado", variant: "default", color: "text-green-600" },
  'Pronto para envio': { label: "Pronto para envio", variant: "secondary", color: "text-indigo-600" },
  'Enviado': { label: "Enviado", variant: "default", color: "text-cyan-500" }, // ✅ NOVO
  'Entregue': { label: "Entregue", variant: "default", color: "text-emerald-600" },
  'Não Entregue': { label: "Não Entregue", variant: "destructive", color: "text-orange-600" },
  'Cancelado': { label: "Cancelado", variant: "destructive", color: "text-red-500" }
};

// Mock data para naturezas de operação (virá das configurações)
const naturezasOperacao = [
  "Venda Direta",
  "Revenda",
  "Serviço",
  "Locação",
  "Demonstração"
];

interface SalesPageProps {
  onNovaVenda?: () => void;
  onVisualizarVenda?: (vendaId: string) => void;
  onEditarVenda?: (vendaId: string) => void;
  onIntegracaoERP?: () => void;
  period?: string;
  onPeriodChange?: (period: string) => void;
  customDateRange?: { from: Date | undefined; to: Date | undefined };
  onCustomDateRangeChange?: (range: { from: Date | undefined; to: Date | undefined }) => void;
}

// Funções de formatação de valores (mesma lógica do Dashboard)
const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const formatDisplayValue = (value: number) => {
  // Se for >= 1 milhão, abreviar mostrando milhões e milhares
  if (value >= 1000000) {
    // Truncar para milhares (remover centenas e centavos)
    const truncatedValue = Math.floor(value / 1000);
    // Formatar com separador de milhar
    return `R$ ${truncatedValue.toLocaleString('pt-BR')} M`;
  }
  
  // Se for < 1 milhão, mostrar valor completo
  return formatCurrency(value);
};

export function SalesPage({ 
  onNovaVenda, 
  onVisualizarVenda, 
  onEditarVenda,
  onIntegracaoERP,
  period = "all",
  onPeriodChange,
  customDateRange = { from: undefined, to: undefined },
  onCustomDateRangeChange
}: SalesPageProps) {
  const { usuario } = useAuth();
  const ehVendedor = usuario?.tipo === 'vendedor';
  
  // Declarações de estado - TODAS ANTES DOS useEffect
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [enviandoParaERP, setEnviandoParaERP] = useState<string | null>(null);
  const [naturezasOperacao, setNaturezasOperacao] = useState<NaturezaOperacao[]>([]);
  const [statsFromAPI, setStatsFromAPI] = useState<any>(null);
  const [paginationFromAPI, setPaginationFromAPI] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>(customDateRange);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    id: string | null;
    cliente: string | null;
  }>({
    open: false,
    id: null,
    cliente: null,
  });
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [naturezaPopoverOpen, setNaturezaPopoverOpen] = useState(false);
  const [selectedNatureza, setSelectedNatureza] = useState<string>("");
  const [sortField, setSortField] = useState<keyof Sale | null>("data");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [sincronizandoVenda, setSincronizandoVenda] = useState<string | null>(null);
  const [corrigindoIntegracao, setCorrigindoIntegracao] = useState(false);
  const [dialogCorrigirOpen, setDialogCorrigirOpen] = useState(false);
  
  // Função carregarDados usando useCallback para poder ser usada nos useEffect
  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[SALES-PAGE] Carregando dados da API...', { page: paginaAtual, limit: itensPorPagina });
      
      // Preparar filtros de data se necessário
      // NOTA: Se period for "all", não aplicar filtro de data
      let dataInicio: string | undefined;
      let dataFim: string | undefined;
      
      if (period && period !== "custom" && period !== "all") {
        const now = new Date();
        if (period.includes('-')) {
          const [year, month] = period.split('-').map(Number);
          dataInicio = `${year}-${String(month).padStart(2, '0')}-01`;
          const lastDay = new Date(year, month, 0).getDate();
          dataFim = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        } else {
          switch (period) {
            case "current_month":
              const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
              const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
              dataInicio = format(startOfMonth, 'yyyy-MM-dd');
              dataFim = format(endOfMonth, 'yyyy-MM-dd');
              break;
            case "7":
              const sevenDaysAgo = new Date(now);
              sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
              dataInicio = format(sevenDaysAgo, 'yyyy-MM-dd');
              dataFim = format(now, 'yyyy-MM-dd');
              break;
            case "30":
              const thirtyDaysAgo = new Date(now);
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              dataInicio = format(thirtyDaysAgo, 'yyyy-MM-dd');
              dataFim = format(now, 'yyyy-MM-dd');
              break;
          }
        }
      } else if (period === "custom" && dateRange.from && dateRange.to) {
        dataInicio = format(dateRange.from, 'yyyy-MM-dd');
        dataFim = format(dateRange.to, 'yyyy-MM-dd');
      }
      
      const [vendasResponse, naturezasAPI] = await Promise.all([
        api.vendas.list({ 
          page: paginaAtual, 
          limit: itensPorPagina,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: searchTerm || undefined,
          dataInicio,
          dataFim,
        }),
        api.get('naturezas-operacao')
      ]);
      
      console.log('[SALES-PAGE] Resposta completa da API:', vendasResponse);
      console.log('[SALES-PAGE] Vendas recebidas:', vendasResponse.vendas?.length || 0);
      console.log('[SALES-PAGE] Pagination recebida:', vendasResponse.pagination);
      console.log('[SALES-PAGE] Stats recebidas:', vendasResponse.stats);
      console.log('[SALES-PAGE] Naturezas recebidas:', naturezasAPI.length);
      
      const vendasAPI = vendasResponse.vendas || [];
      console.log('[SALES-PAGE] Vendas recebidas da API (antes da conversão):', vendasAPI.length);
      console.log('[SALES-PAGE] Primeira venda (antes da conversão):', vendasAPI[0]);
      
      const vendasConvertidas = vendasAPI.map(convertVendaToSale);
      console.log('[SALES-PAGE] Vendas convertidas:', vendasConvertidas.length);
      console.log('[SALES-PAGE] Primeira venda (depois da conversão):', vendasConvertidas[0]);
      
      setSales(vendasConvertidas);
      setNaturezasOperacao(naturezasAPI || []);
      
      // Armazenar stats e pagination do backend
      if (vendasResponse.stats) {
        setStatsFromAPI(vendasResponse.stats);
      }
      if (vendasResponse.pagination) {
        setPaginationFromAPI(vendasResponse.pagination);
      }
      
      console.log('[SALES-PAGE] Estado atualizado - sales.length:', vendasConvertidas.length);
    } catch (error) {
      console.error('[SALES-PAGE] Erro ao carregar dados:', error);
      setSales([]);
      setNaturezasOperacao([]);
      setStatsFromAPI(null);
      setPaginationFromAPI(null);
      toast.error('Erro ao conectar com o banco de dados. Usando dados de demonstração.');
    } finally {
      setLoading(false);
    }
  }, [paginaAtual, itensPorPagina, statusFilter, searchTerm, period, dateRange]);
  
  // Carregar vendas e naturezas de operação do Supabase
  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Forçar sincronização com Tiny ERP
  const handleSincronizarTinyERP = async () => {
    try {
      setSyncing(true);
      console.log('[SYNC] 🔄 Iniciando sincronização manual com Tiny ERP...');
      
      // Buscar todas as vendas do banco
      const vendasAPI = await api.get('vendas');
      console.log('[SYNC] 📊 Vendas carregadas para sincronização:', vendasAPI.length);
      
      // Filtrar apenas vendas que têm integração com ERP
      const vendasComERP = vendasAPI.filter((v: any) => 
        v.integracaoERP?.erpPedidoId && 
        v.status !== 'Rascunho' && 
        v.status !== 'Cancelado'
      );
      console.log('[SYNC] 📦 Vendas com ERP para sincronizar:', vendasComERP.length);
      
      // Contar pedidos mockados
      const pedidosMockados = vendasComERP.filter((v: any) => 
        v.integracaoERP?.erpPedidoId?.startsWith('tiny-mock-')
      ).length;
      
      const pedidosReais = vendasComERP.length - pedidosMockados;
      
      let descricao = `${pedidosReais} pedido(s) a processar`;
      if (pedidosMockados > 0) {
        descricao += ` (${pedidosMockados} pedido(s) mockado(s) ignorado(s))`;
      }
      descricao += '. Delay de 0.5s entre cada pedido para evitar bloqueio da API.';
      
      toast.info('🔄 Sincronizando pedidos...', {
        description: descricao,
        duration: 4000
      });
      
      // Sincronizar todas as vendas
      console.log('[SYNC] ⚙️ Chamando sincronizarTodasVendas...');
      await tinyERPSyncService.sincronizarTodasVendas(vendasComERP);
      console.log('[SYNC] ✅ Sincronização concluída!');
      
      toast.success('✅ Sincronização concluída!', {
        description: `Processo finalizado. Verifique o console para detalhes.`,
        duration: 5000
      });
      
      // Recarregar dados atualizados
      console.log('[SYNC] 🔄 Recarregando dados da página...');
      await carregarDados();
      
    } catch (error) {
      console.error('[SYNC] ❌ Erro ao sincronizar:', error);
      
      // Mensagem específica para rate limit
      if (error instanceof Error && error.message.includes('Rate limit')) {
        toast.error('🚫 Limite de requisições atingido', {
          description: 'A API do Tiny ERP bloqueou temporariamente as requisições. Aguarde 2-3 minutos e tente novamente.',
          duration: 8000
        });
      } else {
        toast.error('❌ Erro na sincronização', {
          description: error instanceof Error ? error.message : 'Erro desconhecido ao sincronizar com o ERP'
        });
      }
    } finally {
      setSyncing(false);
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

  // Função para ordenar
  const handleSort = (field: keyof Sale) => {
    if (sortField === field) {
      // Se já está ordenando por esse campo
      if (sortDirection === "asc") {
        // Primeiro clique foi crescente, agora muda para decrescente
        setSortDirection("desc");
      } else {
        // Segundo clique foi decrescente, agora desativa a ordenação
        setSortField(null);
        setSortDirection("asc");
      }
    } else {
      // Se é um novo campo, ordena crescente
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filtrar vendas com busca aprimorada
  // Se usando paginação do backend, os filtros já vêm aplicados, então não precisa filtrar novamente
  // Apenas aplicar filtros no frontend se não houver paginação do backend
  let filteredSales = paginationFromAPI ? sales : sales.filter(sale => {
    // 🔒 Filtro automático para vendedores: mostrar apenas suas próprias vendas
    if (ehVendedor && usuario) {
      if (sale.vendedorId !== usuario.id) {
        return false;
      }
    }
    
    // Busca expandida incluindo múltiplos campos
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      sale.id.toLowerCase().includes(searchLower) || // ID da Venda
      sale.numero.toLowerCase().includes(searchLower) || // Número da Venda
      (sale.ordemCompraCliente && sale.ordemCompraCliente.toLowerCase().includes(searchLower)) || // OC do Cliente
      sale.cliente.toLowerCase().includes(searchLower) || // Nome do Cliente
      (sale.clienteCodigo && sale.clienteCodigo.toLowerCase().includes(searchLower)) || // Código do Cliente
      (sale.clienteCnpj && sale.clienteCnpj.toLowerCase().includes(searchLower)) || // CNPJ do Cliente
      (sale.clienteRazaoSocial && sale.clienteRazaoSocial.toLowerCase().includes(searchLower)) || // Razão Social
      (sale.clienteNomeFantasia && sale.clienteNomeFantasia.toLowerCase().includes(searchLower)) || // Nome Fantasia
      (sale.clienteGrupoRede && sale.clienteGrupoRede.toLowerCase().includes(searchLower)) || // Grupo/Rede
      sale.empresa.toLowerCase().includes(searchLower) ||
      sale.vendedor.toLowerCase().includes(searchLower); // Vendedor
    
    // Filtro por período
    let matchesPeriod = true;
    if (period && period !== "custom") {
      // Converter data dd/MM/yyyy para Date no fuso horário LOCAL (evita bug de UTC)
      const [dia, mes, ano] = sale.data.split("/").map(Number);
      const saleDate = new Date(ano, mes - 1, dia);
      saleDate.setHours(0, 0, 0, 0);
      const now = new Date();
      now.setHours(23, 59, 59, 999); // Fim do dia atual
      
      // DEBUG: Log na primeira venda
      if (sales.indexOf(sale) === 0) {
        console.log('[SALES-PAGE] 🔍 Iniciando filtro de período:', {
          periodo: period,
          totalVendas: sales.length,
          dataAtual: format(now, "dd/MM/yyyy HH:mm:ss", { locale: ptBR }),
          primeiraVenda: {
            id: sale.id,
            data: sale.data
          }
        });
      }
      
      // Verificar se é um período no formato YYYY-MM (mês específico)
      if (period.includes('-')) {
        const [year, month] = period.split('-').map(Number);
        const periodStart = new Date(year, month - 1, 1);
        periodStart.setHours(0, 0, 0, 0);
        const periodEnd = new Date(year, month, 0); // Último dia do mês
        periodEnd.setHours(23, 59, 59, 999);
        matchesPeriod = saleDate >= periodStart && saleDate <= periodEnd;
        
        // DEBUG: Log detalhado para YYYY-MM
        if (sales.indexOf(sale) === 0) {
          console.log('[SALES-PAGE] 📅 Filtro YYYY-MM detectado:', {
            periodo: period,
            ano: year,
            mes: month,
            inicioMes: format(periodStart, "dd/MM/yyyy HH:mm:ss", { locale: ptBR }),
            fimMes: format(periodEnd, "dd/MM/yyyy HH:mm:ss", { locale: ptBR })
          });
        }
      } else {
        // Períodos fixos (7, 30, 90, 365, current_month)
        switch (period) {
          case "7":
            const sevenDaysAgo = new Date(now);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            sevenDaysAgo.setHours(0, 0, 0, 0);
            matchesPeriod = saleDate >= sevenDaysAgo && saleDate <= now;
            break;
          case "30":
            const thirtyDaysAgo = new Date(now);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            thirtyDaysAgo.setHours(0, 0, 0, 0);
            matchesPeriod = saleDate >= thirtyDaysAgo && saleDate <= now;
            break;
          case "current_month":
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            startOfMonth.setHours(0, 0, 0, 0);
            // Fim do mês: último dia do mês atual (31/12 para dezembro)
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            endOfMonth.setHours(23, 59, 59, 999);
            matchesPeriod = saleDate >= startOfMonth && saleDate <= endOfMonth;
            
            // DEBUG: Log detalhado para current_month
            if (sales.indexOf(sale) === 0) {
              console.log('[SALES-PAGE] 📅 Filtro current_month detectado:', {
                inicioMes: format(startOfMonth, "dd/MM/yyyy", { locale: ptBR }),
                fimMes: format(endOfMonth, "dd/MM/yyyy", { locale: ptBR })
              });
              
              // DEBUG: Analisar primeiras 30 vendas
              console.log('[SALES-PAGE] 🔍 Analisando vendas do mês atual...');
              const vendasDezembro = sales.filter(s => {
                const [dia, mes, ano] = s.data.split('/');
                return mes === '12' && ano === '2025';
              });
              
              console.log(`[SALES-PAGE] 📊 Total de vendas em 12/2025 (pela string de data): ${vendasDezembro.length}`);
              
              // Testar conversão de data nas primeiras vendas
              sales.slice(0, 10).forEach((s, idx) => {
                const [dia, mes, ano] = s.data.split("/").map(Number);
                const sd = new Date(ano, mes - 1, dia);
                sd.setHours(0, 0, 0, 0);
                const passa = sd >= startOfMonth && sd <= endOfMonth;
                console.log(`[SALES-PAGE] Venda ${idx + 1}:`, {
                  numero: s.numero,
                  dataOriginal: s.data,
                  dataConvertida: format(sd, "dd/MM/yyyy HH:mm:ss", { locale: ptBR }),
                  timestamp: sd.getTime(),
                  passa: passa,
                  dentroInicio: sd >= startOfMonth,
                  dentroFim: sd <= endOfMonth
                });
              });
            }
            break;
          case "90":
            const ninetyDaysAgo = new Date(now);
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            ninetyDaysAgo.setHours(0, 0, 0, 0);
            matchesPeriod = saleDate >= ninetyDaysAgo && saleDate <= now;
            break;
          case "365":
            const oneYearAgo = new Date(now);
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            oneYearAgo.setHours(0, 0, 0, 0);
            matchesPeriod = saleDate >= oneYearAgo && saleDate <= now;
            break;
        }
      }
    } else if (period === "custom" && dateRange.from && dateRange.to) {
      const saleDate = new Date(sale.data.split("/").reverse().join("-"));
      const from = new Date(dateRange.from);
      from.setHours(0, 0, 0, 0);
      const to = new Date(dateRange.to);
      to.setHours(23, 59, 59, 999);
      matchesPeriod = saleDate >= from && saleDate <= to;
    }
    
    return matchesSearch && matchesPeriod;
  });

  // Vendas filtradas por busca e período (SEM filtro de status) - usado para totalizadores
  const salesForCounters = filteredSales;
  
  // DEBUG: Log do resultado do filtro
  useEffect(() => {
    if (period && sales.length > 0) {
      console.log('[SALES-PAGE] ✅ Resultado do filtro:', {
        periodo: period,
        totalVendasOriginais: sales.length,
        vendasFiltradas: salesForCounters.length,
        percentual: Math.round((salesForCounters.length / sales.length) * 100) + '%'
      });
      
      // Mostrar distribuição por mês das vendas originais
      const vendasPorMes: Record<string, number> = {};
      sales.forEach(sale => {
        const [dia, mes, ano] = sale.data.split('/');
        const chave = `${mes}/${ano}`;
        vendasPorMes[chave] = (vendasPorMes[chave] || 0) + 1;
      });
      console.log('[SALES-PAGE] 📊 Distribuição das vendas por mês:', vendasPorMes);
    }
  }, [period, sales.length, salesForCounters.length]);

  // Aplicar filtro de status SOMENTE para a tabela (se não estiver usando paginação do backend)
  if (!paginationFromAPI) {
    filteredSales = filteredSales.filter(sale => {
      const matchesStatus = statusFilter === "all" || sale.status === statusFilter;
      return matchesStatus;
    });
  }

  // Ordenar vendas
  if (sortField) {
    filteredSales = [...filteredSales].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Tratamento especial para datas
      if (sortField === "data") {
        const dateA = new Date(a.data.split("/").reverse().join("-"));
        const dateB = new Date(b.data.split("/").reverse().join("-"));
        aValue = dateA.getTime() as any;
        bValue = dateB.getTime() as any;
      }

      // Tratamento especial para valores numéricos
      if (sortField === "valor") {
        return sortDirection === "asc" 
          ? (a.valor - b.valor) 
          : (b.valor - a.valor);
      }

      // Comparação para strings
      if (typeof aValue === "string" && typeof bValue === "string") {
        const comparison = aValue.localeCompare(bValue, "pt-BR");
        return sortDirection === "asc" ? comparison : -comparison;
      }

      // Comparação para números e outros tipos
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }

  // Calcular estatísticas - usar stats do backend se disponível, senão calcular no frontend
  const stats = useMemo(() => {
    // Se temos stats do backend, usar elas (mais preciso)
    if (statsFromAPI) {
      return {
        total: Number(statsFromAPI.total || 0),
        totalVendas: Number(statsFromAPI.totalVendas || 0),
        concluidas: Number(statsFromAPI.concluidas || 0),
        totalConcluidas: Number(statsFromAPI.totalConcluidas || 0),
        emAndamento: Number(statsFromAPI.emAndamento || 0),
        totalEmAndamento: Number(statsFromAPI.totalEmAndamento || 0),
        ticketMedio: Number(statsFromAPI.ticketMedio || 0),
        outrosPedidosTotal: Number(statsFromAPI.outrosPedidosTotal || 0),
        outrosPedidosConcluidos: Number(statsFromAPI.outrosPedidosConcluidos || 0),
        outrosPedidosEmAndamento: Number(statsFromAPI.outrosPedidosEmAndamento || 0),
      };
    }
    
    // Fallback: calcular no frontend (para compatibilidade)
    const naturezasGeramReceita = new Set(
      naturezasOperacao
        .filter(n => n.geraReceita)
        .map(n => n.id)
    );
    
    const vendasGeramReceitaNaoCanceladas = salesForCounters.filter(s => 
      naturezasGeramReceita.has(s.naturezaOperacaoId) && s.status !== 'Cancelado'
    );
    
    const vendasConcluidas = salesForCounters.filter(s =>
      naturezasGeramReceita.has(s.naturezaOperacaoId) && isStatusConcluido(s.status)
    );
    
    const vendasEmAndamento = salesForCounters.filter(s =>
      naturezasGeramReceita.has(s.naturezaOperacaoId) &&
      s.status !== 'Cancelado' &&
      !isStatusConcluido(s.status)
    );
    
    const vendasOutrosPedidosNaoCanceladas = salesForCounters.filter(s => 
      !naturezasGeramReceita.has(s.naturezaOperacaoId) && s.status !== 'Cancelado'
    );
    
    const outrosPedidosConcluidos = salesForCounters.filter(s =>
      !naturezasGeramReceita.has(s.naturezaOperacaoId) && isStatusConcluido(s.status)
    );
    
    const outrosPedidosEmAndamento = salesForCounters.filter(s =>
      !naturezasGeramReceita.has(s.naturezaOperacaoId) &&
      s.status !== 'Cancelado' &&
      !isStatusConcluido(s.status)
    );
    
    return {
      total: vendasGeramReceitaNaoCanceladas.reduce((sum, sale) => sum + sale.valor, 0),
      totalVendas: vendasGeramReceitaNaoCanceladas.length,
      concluidas: vendasConcluidas.length,
      totalConcluidas: vendasConcluidas.reduce((sum, sale) => sum + sale.valor, 0),
      emAndamento: vendasEmAndamento.length,
      totalEmAndamento: vendasEmAndamento.reduce((sum, sale) => sum + sale.valor, 0),
      ticketMedio: vendasGeramReceitaNaoCanceladas.length > 0 
        ? vendasGeramReceitaNaoCanceladas.reduce((sum, sale) => sum + sale.valor, 0) / vendasGeramReceitaNaoCanceladas.length 
        : 0,
      outrosPedidosTotal: vendasOutrosPedidosNaoCanceladas.reduce((sum, sale) => sum + sale.valor, 0),
      outrosPedidosConcluidos: outrosPedidosConcluidos.length,
      outrosPedidosEmAndamento: outrosPedidosEmAndamento.length,
    };
  }, [statsFromAPI, salesForCounters, naturezasOperacao]);

  // Paginação - usar dados do backend se disponível, senão calcular no frontend
  const totalPaginas = paginationFromAPI?.total_pages || Math.ceil(filteredSales.length / itensPorPagina);
  const totalRegistros = paginationFromAPI?.total || filteredSales.length;
  
  // Se usando paginação do backend, não precisa fazer slice (já vem paginado)
  // Se não, fazer paginação no frontend
  const salesPaginadas = paginationFromAPI ? sales : filteredSales.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  // Recarregar dados quando página ou itens por página mudarem
  useEffect(() => {
    if (!loading) {
      carregarDados();
    }
  }, [paginaAtual, itensPorPagina, carregarDados]);

  // Reset página quando filtros mudam
  useEffect(() => {
    setPaginaAtual(1);
  }, [searchTerm, statusFilter, period, dateRange]);

  const handleViewSale = (sale: Sale) => {
    // Se houver callback de visualização, usar ele (tela completa)
    if (onVisualizarVenda) {
      onVisualizarVenda(sale.id);
    } else {
      // Fallback para o dialog antigo
      setSelectedSale(sale);
      setViewDialogOpen(true);
    }
  };

  const handleDeleteSale = (saleId: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (sale) {
      setDeleteConfirm({
        open: true,
        id: saleId,
        cliente: sale.cliente,
      });
    }
  };

  const confirmDelete = async () => {
    if (deleteConfirm.id) {
      try {
        await api.delete('vendas', deleteConfirm.id);
        setSales(sales.filter(s => s.id !== deleteConfirm.id));
        toast.success('Venda excluída com sucesso!');
      } catch (error: any) {
        console.error('[SALES-PAGE] Erro ao excluir venda:', error);
        toast.error(`Erro ao excluir venda: ${error.message || 'Erro desconhecido'}`);
      } finally {
        setDeleteConfirm({ open: false, id: null, cliente: null });
      }
    }
  };

  const handleSincronizarVenda = async (saleId: string) => {
    try {
      setSincronizandoVenda(saleId);
      toast.info('Sincronizando status com Tiny ERP...');
      
      // Buscar venda completa do backend
      const vendaCompleta = await api.getById('vendas', saleId);
      
      if (!vendaCompleta) {
        toast.error('Venda não encontrada');
        return;
      }
      
      console.log('[SALES-PAGE] Venda recuperada do backend:', {
        id: vendaCompleta.id,
        numero: vendaCompleta.numero,
        integracaoERP: vendaCompleta.integracaoERP
      });
      
      if (!vendaCompleta.integracaoERP?.erpPedidoId) {
        toast.warning('Esta venda ainda não foi enviada ao ERP');
        return;
      }
      
      // Sincronizar com o Tiny ERP
      const sucesso = await tinyERPSyncService.sincronizarVendaManual(
        vendaCompleta,
        async (vendaAtualizada) => {
          console.log('[SALES-PAGE] Venda atualizada após sincronização:', {
            id: vendaAtualizada.id,
            numero: vendaAtualizada.numero,
            status: vendaAtualizada.status,
            integracaoERP: vendaAtualizada.integracaoERP,
            notaFiscalId: vendaAtualizada.integracaoERP?.notaFiscalId,
            notaFiscalNumero: vendaAtualizada.integracaoERP?.notaFiscalNumero,
            notaFiscalChave: vendaAtualizada.integracaoERP?.notaFiscalChave
          });
          
          // Atualizar venda no backend
          await api.update('vendas', vendaAtualizada.id, vendaAtualizada);
          
          // Atualizar lista local
          const vendaConvertida = convertVendaToSale(vendaAtualizada);
          setSales(prevSales => 
            prevSales.map(s => s.id === vendaConvertida.id ? vendaConvertida : s)
          );
        }
      );
      
      if (sucesso) {
        toast.success('Status sincronizado com sucesso!');
      } else {
        toast.error('Não foi possvel sincronizar o status');
      }
    } catch (error: any) {
      console.error('[SALES-PAGE] Erro ao sincronizar venda:', error);
      toast.error(`Erro ao sincronizar: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setSincronizandoVenda(null);
    }
  };
  // Enviar pedido manualmente ao ERP
  const handleEnviarParaERP = async (saleId: string) => {
    try {
      setEnviandoParaERP(saleId);
      console.log('[SALES-PAGE] Enviando pedido ao ERP:', saleId);
      toast.info('Enviando pedido ao ERP...');
      
      // Buscar venda completa do backend
      const vendaCompleta = await api.getById('vendas', saleId);
      
      if (!vendaCompleta) {
        toast.error('Venda não encontrada');
        return;
      }
      
      console.log('[SALES-PAGE] Venda encontrada:', {
        id: vendaCompleta.id,
        numero: vendaCompleta.numero,
        empresaFaturamentoId: vendaCompleta.empresaFaturamentoId,
        status: vendaCompleta.status,
        temIntegracaoERP: !!vendaCompleta.integracaoERP?.erpPedidoId,
      });
      
      // Verificar se já foi enviado
      if (vendaCompleta.integracaoERP?.erpPedidoId) {
        toast.warning('Este pedido já foi enviado ao ERP');
        return;
      }
      
      // Verificar se é rascunho
      if (vendaCompleta.status === 'Rascunho') {
        toast.error('Pedidos com status "Rascunho" não podem ser enviados ao ERP');
        return;
      }
      
      // Verificar se tem itens
      if (!vendaCompleta.itens || vendaCompleta.itens.length === 0) {
        toast.error('Não é possível enviar pedido sem itens ao ERP');
        return;
      }
      
      // Verificar se empresa está definida (a Edge Function deriva o token pela empresa do pedido)
      if (!vendaCompleta.empresaFaturamentoId) {
        toast.error('Empresa de faturamento não definida para este pedido');
        return;
      }

      // Enviar ao ERP (Tiny) via Edge Function (token + natureza por empresa)
      const resposta = await api.vendas.enviarAoERP(vendaCompleta.id);

      console.log('[SALES-PAGE] Resposta do envio Tiny:', resposta);

      const tinyId = resposta?.tiny?.pedido_id || resposta?.tiny?.pedidoId || null;
      const tinyNumero = resposta?.tiny?.pedido_numero || resposta?.tiny?.pedidoNumero || null;

      toast.success(
        tinyId
          ? `Pedido enviado ao ERP com sucesso! (Tiny ID: ${tinyId}${tinyNumero ? ` / Nº: ${tinyNumero}` : ''})`
          : 'Pedido enviado ao ERP com sucesso!'
      );

      // Recarregar lista para refletir id_tiny/idTiny e bloquear novas ações
      await carregarDados();

    } catch (error: any) {
      console.error('[SALES-PAGE] Erro ao enviar pedido ao ERP:', error);
      toast.error(`Erro ao enviar ao ERP: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setEnviandoParaERP(null);
    }
  };

  // Componente para cabeçalho ordenável
  const SortableHeader = ({ field, children }: { field: keyof Sale; children: React.ReactNode }) => {
    const isActive = sortField === field;
    
    return (
      <TableHead>
        <Button
          variant="ghost"
          onClick={() => handleSort(field)}
          className="h-auto p-0 hover:bg-transparent"
        >
          <span className="flex items-center gap-1">
            {children}
            {isActive ? (
              sortDirection === "asc" ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )
            ) : (
              <ArrowUpDown className="h-3 w-3 opacity-50" />
            )}
          </span>
        </Button>
      </TableHead>
    );
  };

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Vendas Totais</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-2xl font-bold cursor-help">
                    {formatDisplayValue(stats.total)}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{formatCurrency(stats.total)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalVendas} transações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Concluídas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-2xl font-bold cursor-help">
                    {formatDisplayValue(stats.totalConcluidas)}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{formatCurrency(stats.totalConcluidas)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.concluidas} vendas ({filteredSales.length > 0 ? Math.round((stats.concluidas / filteredSales.length) * 100) : 0}% do total)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Em Andamento</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-2xl font-bold cursor-help">
                    {formatDisplayValue(stats.totalEmAndamento)}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{formatCurrency(stats.totalEmAndamento)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.emAndamento} oportunidades ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Ticket Médio</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-2xl font-bold cursor-help">
                    {formatDisplayValue(stats.ticketMedio)}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{formatCurrency(stats.ticketMedio)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <p className="text-xs text-muted-foreground mt-1">
              por transação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <CardTitle className="text-sm">Outros Pedidos</CardTitle>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Operações que não geram receita</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Operações que não geram receita</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardHeader>
          <CardContent>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-2xl font-bold cursor-help">
                    {formatDisplayValue(stats.outrosPedidosTotal)}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{formatCurrency(stats.outrosPedidosTotal)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.outrosPedidosConcluidos} concluídos · {stats.outrosPedidosEmAndamento} em andamento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros de Período */}
      <div className="flex flex-wrap gap-2">
        <Select value={period === "custom" ? "" : period} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-[200px]">
            <CalendarIcon className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Selecione o período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="current_month">Mês atual</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="365">Último ano</SelectItem>
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
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={handleDateSelect}
              numberOfMonths={2}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Filtros e Ações */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button size="sm" onClick={onNovaVenda}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Pedido
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={syncing}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Mais Opções</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSincronizarTinyERP} disabled={syncing}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Sincronizando...' : 'Sincronizar com Tiny ERP'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onIntegracaoERP}>
                    <Plug className="h-4 w-4 mr-2" />
                    Integração ERP
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" style={{ display: 'none' }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Venda (OLD)
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl" aria-describedby={undefined}>
                  <DialogHeader>
                    <DialogTitle>Registrar Nova Venda</DialogTitle>
                    <DialogDescription>
                      Preencha os dados da nova transação de venda
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Cliente</Label>
                        <Input placeholder="Nome do cliente" />
                      </div>
                      <div className="space-y-2">
                        <Label>Empresa</Label>
                        <Input placeholder="Nome da empresa" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Vendedor</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="js">João Silva</SelectItem>
                            <SelectItem value="ms">Maria Santos</SelectItem>
                            <SelectItem value="co">Carlos Oliveira</SelectItem>
                            <SelectItem value="ap">Ana Paula</SelectItem>
                            <SelectItem value="pc">Pedro Costa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Valor (R$)</Label>
                        <Input type="number" placeholder="0.00" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Natureza de Operaão *</Label>
                        <Popover open={naturezaPopoverOpen} onOpenChange={setNaturezaPopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={naturezaPopoverOpen}
                              className="w-full justify-between"
                            >
                              {selectedNatureza || "Selecione a natureza..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0">
                            <Command>
                              <CommandInput placeholder="Buscar natureza..." />
                              <CommandList>
                                <CommandEmpty>Nenhuma natureza encontrada.</CommandEmpty>
                                <CommandGroup>
                                  {naturezasOperacao.map((natureza) => (
                                    <CommandItem
                                      key={natureza}
                                      value={natureza}
                                      onSelect={(currentValue) => {
                                        setSelectedNatureza(currentValue === selectedNatureza ? "" : currentValue);
                                        setNaturezaPopoverOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          selectedNatureza === natureza ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                      {natureza}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="concluida">Concluída</SelectItem>
                            <SelectItem value="em_andamento">Em Andamento</SelectItem>
                            <SelectItem value="pendente">Pendente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Produtos/Serviços</Label>
                      <Input placeholder="Ex: Produto Premium, Suporte Técnico" />
                    </div>
                    <div className="space-y-2">
                      <Label>Observações</Label>
                      <Textarea placeholder="Adicione observações sobre a venda..." rows={3} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={() => setAddDialogOpen(false)}>
                      Salvar Venda
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Barra de Busca e Filtros */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID, OC, Código, CNPJ, Nome/Razão Social/Fantasia, Grupo/Rede ou Vendedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {/* ✅ CORRIGIDO: Listar TODOS os StatusVenda do banco */}
                  <SelectItem value="Rascunho">Rascunho</SelectItem>
                  <SelectItem value="Em Análise">Em Análise</SelectItem>
                  <SelectItem value="Em aberto">Em aberto</SelectItem>
                  <SelectItem value="Aprovado">Aprovado</SelectItem>
                  <SelectItem value="Preparando envio">Preparando envio</SelectItem>
                  <SelectItem value="Faturado">Faturado</SelectItem>
                  <SelectItem value="Pronto para envio">Pronto para envio</SelectItem>
                  <SelectItem value="Enviado">Enviado</SelectItem>
                  <SelectItem value="Entregue">Entregue</SelectItem>
                  <SelectItem value="Não Entregue">Não Entregue</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            <Select 
              value={itensPorPagina.toString()} 
              onValueChange={(value) => {
                setItensPorPagina(parseInt(value));
                setPaginaAtual(1);
              }}
            >
              <SelectTrigger className="w-full md:w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / página</SelectItem>
                <SelectItem value="25">25 / página</SelectItem>
                <SelectItem value="50">50 / página</SelectItem>
                <SelectItem value="100">100 / página</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabs por Status - ✅ CORRIGIDO: Todos os StatusVenda */}
          <Tabs defaultValue="all" className="w-full">
            <div className="overflow-x-auto">
              <TabsList className="inline-flex w-auto min-w-full h-auto">
                <TabsTrigger value="all" onClick={() => setStatusFilter("all")} className="whitespace-nowrap">
                  Todas ({salesForCounters.length})
                </TabsTrigger>
                <TabsTrigger value="Rascunho" onClick={() => setStatusFilter("Rascunho")} className="whitespace-nowrap">
                  Rascunho ({salesForCounters.filter(s => s.status === "Rascunho").length})
                </TabsTrigger>
                <TabsTrigger value="Em Análise" onClick={() => setStatusFilter("Em Análise")} className="whitespace-nowrap">
                  Em Análise ({salesForCounters.filter(s => s.status === "Em Análise").length})
                </TabsTrigger>
                <TabsTrigger value="Em aberto" onClick={() => setStatusFilter("Em aberto")} className="whitespace-nowrap">
                  Em aberto ({salesForCounters.filter(s => s.status === "Em aberto").length})
                </TabsTrigger>
                <TabsTrigger value="Aprovado" onClick={() => setStatusFilter("Aprovado")} className="whitespace-nowrap">
                  Aprovado ({salesForCounters.filter(s => s.status === "Aprovado").length})
                </TabsTrigger>
                <TabsTrigger value="Preparando envio" onClick={() => setStatusFilter("Preparando envio")} className="whitespace-nowrap">
                  Preparando envio ({salesForCounters.filter(s => s.status === "Preparando envio").length})
                </TabsTrigger>
                <TabsTrigger value="Faturado" onClick={() => setStatusFilter("Faturado")} className="whitespace-nowrap">
                  Faturado ({salesForCounters.filter(s => s.status === "Faturado").length})
                </TabsTrigger>
                <TabsTrigger value="Pronto para envio" onClick={() => setStatusFilter("Pronto para envio")} className="whitespace-nowrap">
                  Pronto para envio ({salesForCounters.filter(s => s.status === "Pronto para envio").length})
                </TabsTrigger>
                <TabsTrigger value="Enviado" onClick={() => setStatusFilter("Enviado")} className="whitespace-nowrap">
                  Enviado ({salesForCounters.filter(s => s.status === "Enviado").length})
                </TabsTrigger>
                <TabsTrigger value="Entregue" onClick={() => setStatusFilter("Entregue")} className="whitespace-nowrap">
                  Entregue ({salesForCounters.filter(s => s.status === "Entregue").length})
                </TabsTrigger>
                <TabsTrigger value="Não Entregue" onClick={() => setStatusFilter("Não Entregue")} className="whitespace-nowrap">
                  Não Entregue ({salesForCounters.filter(s => s.status === "Não Entregue").length})
                </TabsTrigger>
                <TabsTrigger value="Cancelado" onClick={() => setStatusFilter("Cancelado")} className="whitespace-nowrap">
                  Cancelado ({salesForCounters.filter(s => s.status === "Cancelado").length})
                </TabsTrigger>
              </TabsList>
            </div>
          </Tabs>

          {/* Tabela de Vendas */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader field="id">ID / OC</SortableHeader>
                  <SortableHeader field="cliente">Cliente / Empresa</SortableHeader>
                  <SortableHeader field="vendedor">Vendedor</SortableHeader>
                  <SortableHeader field="naturezaOperacao">Natureza</SortableHeader>
                  <SortableHeader field="valor">Valor</SortableHeader>
                  <SortableHeader field="status">Status</SortableHeader>
                  <SortableHeader field="data">Data</SortableHeader>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesPaginadas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhuma venda encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  salesPaginadas.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">
                        <div>
                          <p>{sale.id}</p>
                          {sale.ordemCompraCliente && (
                            <p className="text-xs text-muted-foreground">OC: {sale.ordemCompraCliente}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sale.cliente}</p>
                          <p className="text-sm text-muted-foreground">{sale.empresa}</p>
                          {sale.clienteGrupoRede && (
                            <p className="text-xs text-muted-foreground">Rede: {sale.clienteGrupoRede}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {sale.vendedorIniciais}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{sale.vendedor}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Tag className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{sale.naturezaOperacao}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          R$ {sale.valor.toLocaleString('pt-BR')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[sale.status].variant}>
                          {statusConfig[sale.status].label}
                        </Badge>
                        {sale.probabilidade && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {sale.probabilidade}% prob.
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {sale.data}
                        {sale.dataFechamento && (
                          <p className="text-xs">Fechada: {sale.dataFechamento}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleViewSale(sale)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                // Se pedido foi enviado ao ERP, redirecionar para visualização
                                if (sale.integracaoERP?.erpPedidoId) {
                                  handleViewSale(sale);
                                } else {
                                  onEditarVenda?.(sale.id);
                                }
                              }}
                              disabled={!!sale.integracaoERP?.erpPedidoId}
                              className={sale.integracaoERP?.erpPedidoId ? 'opacity-50 cursor-not-allowed' : ''}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                              {sale.integracaoERP?.erpPedidoId && (
                                <span className="ml-2 text-xs">(Bloqueado)</span>
                              )}
                            </DropdownMenuItem>
                            {sale.integracaoERP?.erpPedidoId ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleSincronizarVenda(sale.id)}
                                  disabled={sincronizandoVenda === sale.id}
                                >
                                  <RefreshCw className={`h-4 w-4 mr-2 ${sincronizandoVenda === sale.id ? 'animate-spin' : ''}`} />
                                  {sincronizandoVenda === sale.id ? 'Sincronizando...' : 'Sincronizar Status'}
                                </DropdownMenuItem>
                              </>
                            ) : sale.status !== 'Rascunho' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleEnviarParaERP(sale.id)}
                                  disabled={enviandoParaERP === sale.id}
                                >
                                  <Send className={`h-4 w-4 mr-2 ${enviandoParaERP === sale.id ? 'animate-pulse' : ''}`} />
                                  {enviandoParaERP === sale.id ? 'Enviando...' : 'Enviar ao ERP'}
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDeleteSale(sale.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
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

          {/* Paginação */}
          {(paginationFromAPI ? sales.length > 0 : filteredSales.length > 0) && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {paginationFromAPI ? (
                  <>Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a {Math.min(paginaAtual * itensPorPagina, totalRegistros)} de {totalRegistros} venda(s)</>
                ) : (
                  <>Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a {Math.min(paginaAtual * itensPorPagina, filteredSales.length)} de {filteredSales.length} venda(s)</>
                )}
              </div>
              
              {totalPaginas > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setPaginaAtual(Math.max(1, paginaAtual - 1))}
                        className={paginaAtual === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                      .filter(page => {
                        // Mostra primeira, última, atual e páginas adjacentes
                        return page === 1 || 
                               page === totalPaginas || 
                               Math.abs(page - paginaAtual) <= 1;
                      })
                      .map((page, index, array) => {
                        // Adiciona ellipsis se houver gap
                        const showEllipsis = index > 0 && page - array[index - 1] > 1;
                        
                        return (
                          <div key={page} className="flex items-center">
                            {showEllipsis && (
                              <PaginationItem>
                                <PaginationEllipsis />
                              </PaginationItem>
                            )}
                            <PaginationItem>
                              <PaginationLink
                                onClick={() => setPaginaAtual(page)}
                                isActive={paginaAtual === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          </div>
                        );
                      })}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setPaginaAtual(Math.min(totalPaginas, paginaAtual + 1))}
                        className={paginaAtual === totalPaginas ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalhes */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl" aria-describedby={undefined}>
          {selectedSale && (
            <>
              <DialogHeader>
                <DialogTitle>Detalhes da Venda</DialogTitle>
                <DialogDescription>{selectedSale.id}</DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-muted-foreground">Cliente</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{selectedSale.cliente}</p>
                      </div>
                      {selectedSale.clienteCodigo && (
                        <p className="text-sm text-muted-foreground ml-6">
                          Código: {selectedSale.clienteCodigo}
                        </p>
                      )}
                      {selectedSale.clienteCnpj && (
                        <p className="text-sm text-muted-foreground ml-6">
                          CNPJ: {selectedSale.clienteCnpj}
                        </p>
                      )}
                      {selectedSale.clienteRazaoSocial && (
                        <p className="text-sm text-muted-foreground ml-6">
                          Razão Social: {selectedSale.clienteRazaoSocial}
                        </p>
                      )}
                      {selectedSale.clienteNomeFantasia && (
                        <p className="text-sm text-muted-foreground ml-6">
                          Nome Fantasia: {selectedSale.clienteNomeFantasia}
                        </p>
                      )}
                    </div>
                    {selectedSale.ordemCompraCliente && (
                      <div>
                        <Label className="text-muted-foreground">Ordem de Compra (OC)</Label>
                        <p className="font-medium mt-1">{selectedSale.ordemCompraCliente}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-muted-foreground">Empresa</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{selectedSale.empresa}</p>
                      </div>
                    </div>
                    {selectedSale.clienteGrupoRede && (
                      <div>
                        <Label className="text-muted-foreground">Grupo/Rede</Label>
                        <p className="font-medium mt-1">{selectedSale.clienteGrupoRede}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-muted-foreground">Vendedor Responsável</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{selectedSale.vendedorIniciais}</AvatarFallback>
                        </Avatar>
                        <p className="font-medium">{selectedSale.vendedor}</p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Natureza de Operação</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{selectedSale.naturezaOperacao}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="text-muted-foreground">Valor Total</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <p className="text-2xl font-bold">
                          R$ {selectedSale.valor.toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <div className="mt-2">
                        <Badge variant={statusConfig[selectedSale.status].variant}>
                          {statusConfig[selectedSale.status].label}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Data da Venda</Label>
                      <p className="font-medium mt-1">{selectedSale.data}</p>
                    </div>
                    {selectedSale.dataFechamento && (
                      <div>
                        <Label className="text-muted-foreground">Data de Fechamento</Label>
                        <p className="font-medium mt-1">{selectedSale.dataFechamento}</p>
                      </div>
                    )}
                    {selectedSale.probabilidade && (
                      <div>
                        <Label className="text-muted-foreground">Probabilidade</Label>
                        <p className="font-medium mt-1">{selectedSale.probabilidade}%</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Produtos/Serviços</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedSale.produtos.map((produto, idx) => (
                      <Badge key={idx} variant="secondary">
                        {produto}
                      </Badge>
                    ))}
                  </div>
                </div>

                {selectedSale.observacoes && (
                  <div>
                    <Label className="text-muted-foreground">Observações</Label>
                    <p className="mt-1 text-sm">{selectedSale.observacoes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <DeleteConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}
        onConfirm={confirmDelete}
        title="Excluir Venda"
        description={`Tem certeza que deseja excluir a venda de "${deleteConfirm.cliente}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
}
