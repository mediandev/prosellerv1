import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Venda, StatusVenda } from "../types/venda";
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
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { api } from '../services/api';
import { tinyERPSyncService } from '../services/tinyERPSync';

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
  vendedorIniciais: string;
  valor: number;
  produtos: string[];
  naturezaOperacao: string;
  status: "concluida" | "em_andamento" | "pendente" | "cancelada";
  data: string;
  dataFechamento?: string;
  observacoes?: string;
  probabilidade?: number;
  integracaoERP?: {
    erpPedidoId?: string;
    erpNumeroPedido?: string;
  };
}

// Função para converter Venda para Sale
const convertVendaToSale = (venda: Venda): Sale => {
  const statusMap: Record<StatusVenda, Sale['status']> = {
    'Rascunho': 'pendente',
    'Em Análise': 'pendente',     // Em Análise (Em Aberto no Tiny) = Pendente na UI
    'Aprovado': 'em_andamento',
    'Faturado': 'concluida',
    'Concluído': 'concluida',  // Mapeia "Concluído" para "concluida"
    'Cancelado': 'cancelada',
  };

  // Extrair iniciais do vendedor
  const iniciais = venda.nomeVendedor
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  return {
    id: venda.id,
    numero: venda.numero,
    cliente: venda.nomeCliente,
    clienteCodigo: venda.clienteCodigo,
    clienteCnpj: venda.clienteCnpj,
    clienteRazaoSocial: venda.clienteRazaoSocial,
    clienteNomeFantasia: venda.clienteNomeFantasia,
    clienteGrupoRede: venda.clienteGrupoRede,
    ordemCompraCliente: venda.ordemCompraCliente,
    empresa: venda.nomeEmpresaFaturamento,
    vendedor: venda.nomeVendedor,
    vendedorIniciais: iniciais,
    valor: venda.valorPedido,
    produtos: venda.itens.map(item => item.descricaoProduto),
    naturezaOperacao: venda.nomeNaturezaOperacao,
    status: statusMap[venda.status] || 'pendente',
    data: format(new Date(venda.dataPedido), "dd/MM/yyyy", { locale: ptBR }),
    dataFechamento: venda.status === 'Faturado' ? format(new Date(venda.updatedAt), "dd/MM/yyyy", { locale: ptBR }) : undefined,
    observacoes: venda.observacoesInternas,
    integracaoERP: venda.integracaoERP,
  };
};

const statusConfig = {
  concluida: { label: "Concluída", variant: "default" as const, color: "text-green-500" },
  em_andamento: { label: "Em Andamento", variant: "secondary" as const, color: "text-blue-500" },
  pendente: { label: "Pendente", variant: "outline" as const, color: "text-yellow-500" },
  cancelada: { label: "Cancelada", variant: "destructive" as const, color: "text-red-500" }
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

export function SalesPage({ 
  onNovaVenda, 
  onVisualizarVenda, 
  onEditarVenda,
  onIntegracaoERP,
  period = "30",
  onPeriodChange,
  customDateRange = { from: undefined, to: undefined },
  onCustomDateRangeChange
}: SalesPageProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Carregar vendas do Supabase
  useEffect(() => {
    carregarVendas();
  }, []);

  const carregarVendas = async () => {
    try {
      console.log('[SALES-PAGE] Carregando vendas da API...');
      const vendasAPI = await api.get('vendas');
      console.log('[SALES-PAGE] Vendas recebidas da API:', vendasAPI.length);
      const vendasConvertidas = vendasAPI.map(convertVendaToSale);
      setSales(vendasConvertidas);
      console.log('[SALES-PAGE] Vendas convertidas e carregadas:', vendasConvertidas.length);
    } catch (error) {
      console.error('[SALES-PAGE] Erro ao carregar vendas:', error);
      setSales([]);
      toast.error('Erro ao conectar com o banco de dados. Usando dados de demonstração.');
    } finally {
      setLoading(false);
    }
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    id: string | null;
    cliente: string | null;
  }>({
    open: false,
    id: null,
    cliente: null,
  });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [naturezaPopoverOpen, setNaturezaPopoverOpen] = useState(false);
  const [selectedNatureza, setSelectedNatureza] = useState<string>("");
  const [sortField, setSortField] = useState<keyof Sale | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>(customDateRange);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [sincronizandoVenda, setSincronizandoVenda] = useState<string | null>(null);
  const [corrigindoIntegracao, setCorrigindoIntegracao] = useState(false);
  const [dialogCorrigirOpen, setDialogCorrigirOpen] = useState(false);

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
  let filteredSales = sales.filter(sale => {
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
    
    const matchesStatus = statusFilter === "all" || sale.status === statusFilter;
    
    // Filtro por período
    let matchesPeriod = true;
    if (period && period !== "custom") {
      const saleDate = new Date(sale.data.split("/").reverse().join("-"));
      const now = new Date();
      now.setHours(23, 59, 59, 999); // Fim do dia atual
      
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
          matchesPeriod = saleDate >= startOfMonth && saleDate <= now;
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
    } else if (period === "custom" && dateRange.from && dateRange.to) {
      const saleDate = new Date(sale.data.split("/").reverse().join("-"));
      const from = new Date(dateRange.from);
      from.setHours(0, 0, 0, 0);
      const to = new Date(dateRange.to);
      to.setHours(23, 59, 59, 999);
      matchesPeriod = saleDate >= from && saleDate <= to;
    }
    
    return matchesSearch && matchesStatus && matchesPeriod;
  });

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

  // Calcular estatísticas baseadas nas vendas FILTRADAS
  const stats = useMemo(() => {
    return {
      total: filteredSales.reduce((sum, sale) => sum + sale.valor, 0),
      concluidas: filteredSales.filter(s => s.status === "concluida").length,
      emAndamento: filteredSales.filter(s => s.status === "em_andamento").length,
      ticketMedio: filteredSales.length > 0 ? filteredSales.reduce((sum, sale) => sum + sale.valor, 0) / filteredSales.length : 0
    };
  }, [filteredSales]);

  // Paginação
  const totalPaginas = Math.ceil(filteredSales.length / itensPorPagina);
  const indiceInicial = (paginaAtual - 1) * itensPorPagina;
  const indiceFinal = indiceInicial + itensPorPagina;
  const salesPaginadas = filteredSales.slice(indiceInicial, indiceFinal);

  // Reset página quando filtros mudam
  useMemo(() => {
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
        toast.error('Não foi possível sincronizar o status');
      }
    } catch (error: any) {
      console.error('[SALES-PAGE] Erro ao sincronizar venda:', error);
      toast.error(`Erro ao sincronizar: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setSincronizandoVenda(null);
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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Vendas Totais</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(stats.total / 1000).toFixed(1)}k
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredSales.length} transações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Concluídas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.concluidas}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredSales.length > 0 ? Math.round((stats.concluidas / filteredSales.length) * 100) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Em Andamento</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emAndamento}</div>
            <p className="text-xs text-muted-foreground mt-1">
              oportunidades ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Ticket Médio</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(stats.ticketMedio / 1000).toFixed(1)}k
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              por transação
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
            <div>
              <CardTitle>Todas as Vendas</CardTitle>
              <CardDescription>
                Gerencie e acompanhe todas as transações de vendas
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button size="sm" onClick={onNovaVenda}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Venda
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Mais Opções</DropdownMenuLabel>
                  <DropdownMenuSeparator />
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
                        <Label>Natureza de Operação *</Label>
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
                <SelectItem value="concluida">Concluídas</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="cancelada">Canceladas</SelectItem>
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

          {/* Tabs por Status */}
          <Tabs defaultValue="all" className="w-full">
            <div className="overflow-x-auto">
              <TabsList className="inline-flex w-auto min-w-full h-auto">
                <TabsTrigger value="all" onClick={() => setStatusFilter("all")} className="whitespace-nowrap">
                  Todas ({sales.length})
                </TabsTrigger>
                <TabsTrigger value="concluida" onClick={() => setStatusFilter("concluida")} className="whitespace-nowrap">
                  Concluídas ({sales.filter(s => s.status === "concluida").length})
                </TabsTrigger>
                <TabsTrigger value="em_andamento" onClick={() => setStatusFilter("em_andamento")} className="whitespace-nowrap">
                  Em Andamento ({sales.filter(s => s.status === "em_andamento").length})
                </TabsTrigger>
                <TabsTrigger value="pendente" onClick={() => setStatusFilter("pendente")} className="whitespace-nowrap">
                  Pendentes ({sales.filter(s => s.status === "pendente").length})
                </TabsTrigger>
                <TabsTrigger value="cancelada" onClick={() => setStatusFilter("cancelada")} className="whitespace-nowrap">
                  Canceladas ({sales.filter(s => s.status === "cancelada").length})
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
                            {sale.integracaoERP?.erpPedidoId && (
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
          {filteredSales.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Mostrando {indiceInicial + 1} a {Math.min(indiceFinal, filteredSales.length)} de {filteredSales.length} venda(s)
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