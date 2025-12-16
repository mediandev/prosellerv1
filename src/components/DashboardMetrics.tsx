import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { TrendingUp, TrendingDown, DollarSign, Target, Users, ShoppingCart, Calendar as CalendarIcon, Filter, Map, Package, UserCheck, Receipt, ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { Button } from "./ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { format } from "date-fns@4.1.0";
import { ptBR } from "date-fns@4.1.0/locale";
import { useAuth } from "../contexts/AuthContext";
import { buscarMetaVendedor, buscarMetaTotal } from "../services/metasService";
import { toast } from "sonner@2.0.3";
import {
  Transaction,
  carregarDadosDashboard,
  filtrarPorPeriodo,
  calculateMetricsWithComparison,
} from "../services/dashboardDataService";

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  subtitle?: string; // Linha adicional de descrição
}

function MetricCard({ title, value, change, icon, subtitle }: MetricCardProps) {
  const isPositive = change >= 0;
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pt-4 pb-1">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-4 w-4 text-muted-foreground">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-0">
        <div className="text-2xl font-bold leading-none mb-0.5">{value}</div>
        <div className="min-h-[14px] flex items-center mb-0.5">
          {subtitle && (
            <p className="text-xs text-muted-foreground leading-tight">{subtitle}</p>
          )}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-xs cursor-help">
                {isPositive ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={isPositive ? "text-green-500" : "text-red-500"}>
                  {isPositive ? "+" : ""}{change.toFixed(1)}%
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Comparado ao período anterior</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}

export interface DashboardFilters {
  vendedores: string[];
  naturezas: string[];
  segmentos: string[];
  statusClientes: string[];
  ufs: string[];
}

interface DashboardMetricsProps {
  period: string;
  onPeriodChange: (period: string) => void;
  onCustomDateRangeChange?: (range: { from: Date | undefined; to: Date | undefined }) => void;
  filters: DashboardFilters;
  onFiltersChange?: (filters: DashboardFilters) => void;
  onTransactionsChange?: (transactions: Transaction[]) => void; // Callback para enviar transações filtradas
}

// Dados mockados para diferentes períodos
const periodData: Record<string, Array<{
  title: string;
  value: string;
  change: number;
  icon: JSX.Element;
}>> = {
  "7": [
    {
      title: "Vendas Totais",
      value: "R$ 89.250",
      change: 18.5,
      icon: <DollarSign className="h-4 w-4" />,
    },
    {
      title: "Meta do Período",
      value: "85%",
      change: 10.2,
      icon: <Target className="h-4 w-4" />,
    },
    {
      title: "Vendedores Ativos",
      value: "18",
      change: 5.9,
      icon: <Users className="h-4 w-4" />,
    },
    {
      title: "Negócios Fechados",
      value: "32",
      change: 23.1,
      icon: <ShoppingCart className="h-4 w-4" />,
    },
  ],
  "30": [
    {
      title: "Vendas Totais",
      value: "R$ 458.450",
      change: 12.5,
      icon: <DollarSign className="h-4 w-4" />,
    },
    {
      title: "Meta do Mês",
      value: "78%",
      change: 5.2,
      icon: <Target className="h-4 w-4" />,
    },
    {
      title: "Vendedores Ativos",
      value: "24",
      change: 8.3,
      icon: <Users className="h-4 w-4" />,
    },
    {
      title: "Negócios Fechados",
      value: "127",
      change: 15.8,
      icon: <ShoppingCart className="h-4 w-4" />,
    },
  ],
  "90": [
    {
      title: "Vendas Totais",
      value: "R$ 1.287.900",
      change: 8.7,
      icon: <DollarSign className="h-4 w-4" />,
    },
    {
      title: "Meta do Trimestre",
      value: "72%",
      change: 3.5,
      icon: <Target className="h-4 w-4" />,
    },
    {
      title: "Vendedores Ativos",
      value: "26",
      change: 4.0,
      icon: <Users className="h-4 w-4" />,
    },
    {
      title: "Negócios Fechados",
      value: "358",
      change: 11.2,
      icon: <ShoppingCart className="h-4 w-4" />,
    },
  ],
  "current_month": [
    {
      title: "Vendas Totais",
      value: "R$ 387.250",
      change: 9.8,
      icon: <DollarSign className="h-4 w-4" />,
    },
    {
      title: "Meta do Mês",
      value: "71%",
      change: 3.5,
      icon: <Target className="h-4 w-4" />,
    },
    {
      title: "Vendedores Ativos",
      value: "23",
      change: 4.5,
      icon: <Users className="h-4 w-4" />,
    },
    {
      title: "Negócios Fechados",
      value: "109",
      change: 12.3,
      icon: <ShoppingCart className="h-4 w-4" />,
    },
  ],
  "365": [
    {
      title: "Vendas Totais",
      value: "R$ 5.245.800",
      change: 22.3,
      icon: <DollarSign className="h-4 w-4" />,
    },
    {
      title: "Meta Anual",
      value: "88%",
      change: 15.8,
      icon: <Target className="h-4 w-4" />,
    },
    {
      title: "Vendedores Ativos",
      value: "29",
      change: 20.8,
      icon: <Users className="h-4 w-4" />,
    },
    {
      title: "Negócios Fechados",
      value: "1.456",
      change: 28.5,
      icon: <ShoppingCart className="h-4 w-4" />,
    },
  ],
  "custom": [
    {
      title: "Vendas Totais",
      value: "R$ 245.800",
      change: 14.2,
      icon: <DollarSign className="h-4 w-4" />,
    },
    {
      title: "Meta do Período",
      value: "82%",
      change: 7.5,
      icon: <Target className="h-4 w-4" />,
    },
    {
      title: "Vendedores Ativos",
      value: "21",
      change: 6.7,
      icon: <Users className="h-4 w-4" />,
    },
    {
      title: "Negócios Fechados",
      value: "78",
      change: 18.9,
      icon: <ShoppingCart className="h-4 w-4" />,
    },
  ],
};

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export function DashboardMetrics({ period, onPeriodChange, onCustomDateRangeChange, filters, onFiltersChange, onTransactionsChange }: DashboardMetricsProps) {
  const { usuario } = useAuth();
  const ehVendedor = usuario?.tipo === 'vendedor';
  
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  
  // Estado para armazenar todas as transações carregadas do Supabase
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para armazenar a meta do período
  const [metaMensal, setMetaMensal] = useState<number>(0);
  
  // Carregar dados do Supabase ao montar o componente
  useEffect(() => {
    async function loadData() {
      try {
        console.log('[DASHBOARD] Iniciando carregamento de dados...');
        setLoading(true);
        const transactions = await carregarDadosDashboard();
        setAllTransactions(transactions);
        console.log('[DASHBOARD] Dados carregados com sucesso:', transactions.length, 'transações');
      } catch (error) {
        console.error('[DASHBOARD] Erro ao carregar dados:', error);
        toast.error('Erro ao carregar dados do dashboard');
        setAllTransactions([]);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);
  
  // Carregar meta do período
  useEffect(() => {
    async function loadMeta() {
      if (!period || !period.includes('-')) return;
      
      const [year, month] = period.split('-').map(Number);
      
      try {
        let meta = 0;
        
        if (ehVendedor && usuario) {
          // Para vendedores, buscar meta individual
          meta = await buscarMetaVendedor(usuario.id, year, month);
          console.log('[DASHBOARD] Meta individual carregada:', meta);
        } else {
          // Para backoffice, buscar meta total
          meta = await buscarMetaTotal(year, month);
          console.log('[DASHBOARD] Meta total carregada:', meta);
        }
        
        setMetaMensal(meta);
      } catch (error) {
        console.error('[DASHBOARD] Erro ao carregar meta:', error);
        setMetaMensal(0);
      }
    }
    
    loadMeta();
  }, [period, ehVendedor, usuario]);
  
  // Inicializar ano baseado no período atual
  const getYearFromPeriod = (period: string) => {
    const year = period.split('-')[0];
    return parseInt(year) || 2025;
  };
  const [selectedYear, setSelectedYear] = useState(getYearFromPeriod(period));
  
  // Estados dos filtros avançados - sincronizados com props
  const [selectedVendedor, setSelectedVendedor] = useState<string[]>(filters.vendedores);
  const [selectedNatureza, setSelectedNatureza] = useState<string[]>(filters.naturezas);
  const [selectedSegmento, setSelectedSegmento] = useState<string[]>(filters.segmentos);
  const [selectedStatusCliente, setSelectedStatusCliente] = useState<string[]>(filters.statusClientes);
  const [selectedUF, setSelectedUF] = useState<string[]>(filters.ufs);
  
  // Sincronizar estados locais com filtros externos
  useEffect(() => {
    setSelectedVendedor(filters.vendedores);
    setSelectedNatureza(filters.naturezas);
    setSelectedSegmento(filters.segmentos);
    setSelectedStatusCliente(filters.statusClientes);
    setSelectedUF(filters.ufs);
  }, [filters]);

  // Sincronizar ano selecionado com o período
  useEffect(() => {
    const year = getYearFromPeriod(period);
    if (year !== selectedYear) {
      setSelectedYear(year);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);
  
  // Popovers para os filtros
  const [vendedorPopoverOpen, setVendedorPopoverOpen] = useState(false);
  const [naturezaPopoverOpen, setNaturezaPopoverOpen] = useState(false);
  const [ufPopoverOpen, setUfPopoverOpen] = useState(false);
  
  // Filter transactions based on selected filters
  const filterTransactions = (transactions: Transaction[]) => {
    return transactions.filter(transaction => {
      // Filtro automático para vendedores: mostrar apenas suas próprias transações
      if (ehVendedor && usuario) {
        if (transaction.vendedor !== usuario.nome) {
          return false;
        }
      }
      
      if (selectedVendedor.length > 0 && !selectedVendedor.includes(transaction.vendedor)) {
        return false;
      }
      if (selectedNatureza.length > 0 && !selectedNatureza.includes(transaction.natureza)) {
        return false;
      }
      if (selectedSegmento.length > 0 && !selectedSegmento.includes(transaction.segmento)) {
        return false;
      }
      if (selectedStatusCliente.length > 0 && !selectedStatusCliente.includes(transaction.statusCliente)) {
        return false;
      }
      if (selectedUF.length > 0 && transaction.uf && !selectedUF.includes(transaction.uf)) {
        return false;
      }
      return true;
    });
  };
  
  const filteredTransactions = useMemo(() => {
    if (loading || allTransactions.length === 0) {
      return [];
    }
    const { current } = filtrarPorPeriodo(allTransactions, period);
    return filterTransactions(current);
  }, [loading, allTransactions, period, selectedVendedor, selectedNatureza, selectedSegmento, selectedStatusCliente, selectedUF, ehVendedor, usuario]);
  
  // Notificar componente pai sempre que as transações filtradas mudarem
  useEffect(() => {
    onTransactionsChange?.(filteredTransactions);
  }, [filteredTransactions, onTransactionsChange]);
  
  // Calculate metrics from filtered transactions with comparison to previous period
  const metrics = useMemo(() => {
    if (loading || allTransactions.length === 0) {
      return {
        vendasTotais: 0,
        vendasTotaisChange: 0,
        ticketMedio: 0,
        ticketMedioChange: 0,
        produtosVendidos: 0,
        produtosVendidosChange: 0,
        positivacao: 0,
        positivacaoChange: 0,
        positivacaoCount: 0,
        positivacaoTotal: 0,
        vendedoresAtivos: 0,
        vendedoresAtivosChange: 0,
        porcentagemMeta: 0,
        porcentagemMetaChange: 0,
        negociosFechados: 0,
      };
    }
    
    const { current, previous } = filtrarPorPeriodo(allTransactions, period);
    const filteredCurrent = filterTransactions(current);
    const filteredPrevious = filterTransactions(previous);
    
    return calculateMetricsWithComparison(filteredCurrent, filteredPrevious, metaMensal);
  }, [loading, allTransactions, period, selectedVendedor, selectedNatureza, selectedSegmento, selectedStatusCliente, selectedUF, ehVendedor, usuario, metaMensal]);
  const [segmentoPopoverOpen, setSegmentoPopoverOpen] = useState(false);
  
  // Extrair valores únicos das transações para os filtros
  const vendedores = useMemo(() => {
    const unique = new Set(allTransactions.map(t => t.vendedor));
    return Array.from(unique).sort();
  }, [allTransactions]);
  
  const naturezas = useMemo(() => {
    const unique = new Set(allTransactions.map(t => t.natureza));
    return Array.from(unique).sort();
  }, [allTransactions]);
  
  const segmentos = useMemo(() => {
    const unique = new Set(allTransactions.map(t => t.segmento));
    return Array.from(unique).sort();
  }, [allTransactions]);
  
  const statusClientes = useMemo(() => {
    const unique = new Set(allTransactions.map(t => t.statusCliente));
    return Array.from(unique).sort();
  }, [allTransactions]);
  
  const ufs = useMemo(() => {
    const unique = new Set(allTransactions.map(t => t.uf).filter(uf => uf && uf !== 'N/A'));
    return Array.from(unique).sort();
  }, [allTransactions]);
  
  const toggleFilter = (value: string, currentFilters: string[], setFilters: (filters: string[]) => void) => {
    const newFilters = currentFilters.includes(value) 
      ? currentFilters.filter(item => item !== value)
      : [...currentFilters, value];
    setFilters(newFilters);
  };
  
  const clearAllFilters = () => {
    setSelectedVendedor([]);
    setSelectedNatureza([]);
    setSelectedSegmento([]);
    setSelectedStatusCliente([]);
    setSelectedUF([]);
  };
  
  // Notify parent component when filters change
  useEffect(() => {
    onFiltersChange?.({
      vendedores: selectedVendedor,
      naturezas: selectedNatureza,
      segmentos: selectedSegmento,
      statusClientes: selectedStatusCliente,
      ufs: selectedUF,
    });
  }, [selectedVendedor, selectedNatureza, selectedSegmento, selectedStatusCliente, selectedUF, onFiltersChange]);
  
  const activeFiltersCount = 
    (ehVendedor ? 0 : selectedVendedor.length) + 
    selectedNatureza.length + 
    selectedSegmento.length + 
    selectedStatusCliente.length +
    selectedUF.length;

  const handleDateSelect = (range: DateRange | undefined) => {
    if (range) {
      setDateRange(range);
      if (range.from && range.to) {
        onPeriodChange("custom");
        onCustomDateRangeChange?.(range);
        setIsCalendarOpen(false);
      }
    }
  };

  const formatDateRange = () => {
    if (!dateRange.from || !dateRange.to) return "Selecionar período";
    return `${format(dateRange.from, "dd/MM/yy", { locale: ptBR })} - ${format(dateRange.to, "dd/MM/yy", { locale: ptBR })}`;
  };

  const getPeriodLabel = (periodValue: string) => {
    if (!periodValue || !periodValue.includes('-')) {
      return "Selecione o período";
    }
    
    const [year, month] = periodValue.split('-');
    const monthIndex = parseInt(month) - 1;
    
    const mesesNomes = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${mesesNomes[monthIndex]} ${year}`;
    }
    
    return "Selecione o período";
  };

  const handleMonthSelect = (month: number) => {
    const periodValue = `${selectedYear}-${String(month).padStart(2, '0')}`;
    onPeriodChange(periodValue);
    setMonthPickerOpen(false);
  };

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Visão geral do desempenho de vendas
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Popover open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[200px] justify-start">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {getPeriodLabel(period)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-4" align="start">
              <div className="space-y-4">
                {/* Navegação de Ano */}
                <div className="flex items-center justify-between px-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setSelectedYear(Math.max(2020, selectedYear - 1))}
                    disabled={selectedYear <= 2020}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-lg font-semibold">{selectedYear}</div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setSelectedYear(Math.min(2030, selectedYear + 1))}
                    disabled={selectedYear >= 2030}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Grid de Meses */}
                <div className="grid grid-cols-3 gap-2">
                  {meses.map((mes, index) => {
                    const monthValue = `${selectedYear}-${String(index + 1).padStart(2, '0')}`;
                    const isSelected = period === monthValue;
                    return (
                      <Button
                        key={mes}
                        variant={isSelected ? "default" : "outline"}
                        className="h-auto py-3 px-4 text-sm font-medium"
                        onClick={() => handleMonthSelect(index + 1)}
                      >
                        {mes.substring(0, 3)}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant={activeFiltersCount > 0 ? "default" : "outline"}
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            {activeFiltersCount > 0 ? (
              <>
                <Badge variant="secondary" className="mr-2 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-white text-primary">
                  {activeFiltersCount}
                </Badge>
                Filtros
              </>
            ) : (
              <>
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Filtros Avançados */}
      {filtersOpen && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className={`grid gap-4 md:grid-cols-2 ${ehVendedor ? 'lg:grid-cols-4' : 'lg:grid-cols-5'}`}>
              {/* Filtro Vendedor - Oculto para vendedores */}
              {!ehVendedor && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vendedor</label>
                  <Popover open={vendedorPopoverOpen} onOpenChange={setVendedorPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <Users className="h-4 w-4 mr-2" />
                        {selectedVendedor.length > 0 
                          ? `${selectedVendedor.length} selecionado(s)` 
                          : "Todos os vendedores"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[250px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar vendedor..." />
                        <CommandList>
                          <CommandEmpty>Nenhum vendedor encontrado.</CommandEmpty>
                          <CommandGroup>
                            {vendedores.map((vendedor) => (
                              <CommandItem
                                key={vendedor}
                                onSelect={() => toggleFilter(vendedor, selectedVendedor, setSelectedVendedor)}
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <div className={`h-4 w-4 border rounded flex items-center justify-center ${
                                    selectedVendedor.includes(vendedor) ? 'bg-primary border-primary' : 'border-input'
                                  }`}>
                                    {selectedVendedor.includes(vendedor) && (
                                      <div className="h-2 w-2 bg-white rounded-sm" />
                                    )}
                                  </div>
                                  <span>{vendedor}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Filtro Natureza de Operação */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Natureza de Operação</label>
                <Popover open={naturezaPopoverOpen} onOpenChange={setNaturezaPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {selectedNatureza.length > 0 
                        ? `${selectedNatureza.length} selecionada(s)` 
                        : "Todas as naturezas"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar natureza..." />
                      <CommandList>
                        <CommandEmpty>Nenhuma natureza encontrada.</CommandEmpty>
                        <CommandGroup>
                          {naturezas.map((natureza) => (
                            <CommandItem
                              key={natureza}
                              onSelect={() => toggleFilter(natureza, selectedNatureza, setSelectedNatureza)}
                            >
                              <div className="flex items-center gap-2 w-full">
                                <div className={`h-4 w-4 border rounded flex items-center justify-center ${
                                  selectedNatureza.includes(natureza) ? 'bg-primary border-primary' : 'border-input'
                                }`}>
                                  {selectedNatureza.includes(natureza) && (
                                    <div className="h-2 w-2 bg-white rounded-sm" />
                                  )}
                                </div>
                                <span>{natureza}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Filtro Segmento de Cliente */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Segmento de Cliente</label>
                <Popover open={segmentoPopoverOpen} onOpenChange={setSegmentoPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Target className="h-4 w-4 mr-2" />
                      {selectedSegmento.length > 0 
                        ? `${selectedSegmento.length} selecionado(s)` 
                        : "Todos os segmentos"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar segmento..." />
                      <CommandList>
                        <CommandEmpty>Nenhum segmento encontrado.</CommandEmpty>
                        <CommandGroup>
                          {segmentos.map((segmento) => (
                            <CommandItem
                              key={segmento}
                              onSelect={() => toggleFilter(segmento, selectedSegmento, setSelectedSegmento)}
                            >
                              <div className="flex items-center gap-2 w-full">
                                <div className={`h-4 w-4 border rounded flex items-center justify-center ${
                                  selectedSegmento.includes(segmento) ? 'bg-primary border-primary' : 'border-input'
                                }`}>
                                  {selectedSegmento.includes(segmento) && (
                                    <div className="h-2 w-2 bg-white rounded-sm" />
                                  )}
                                </div>
                                <span>{segmento}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Filtro UF */}
              <div className="space-y-2">
                <label className="text-sm font-medium">UF</label>
                <Popover open={ufPopoverOpen} onOpenChange={setUfPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Map className="h-4 w-4 mr-2" />
                      {selectedUF.length > 0 
                        ? `${selectedUF.length} selecionada(s)` 
                        : "Todas as UFs"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar UF..." />
                      <CommandList>
                        <CommandEmpty>Nenhuma UF encontrada.</CommandEmpty>
                        <CommandGroup>
                          {ufs.map((uf) => (
                            <CommandItem
                              key={uf}
                              onSelect={() => toggleFilter(uf, selectedUF, setSelectedUF)}
                            >
                              <div className="flex items-center gap-2 w-full">
                                <div className={`h-4 w-4 border rounded flex items-center justify-center ${
                                  selectedUF.includes(uf) ? 'bg-primary border-primary' : 'border-input'
                                }`}>
                                  {selectedUF.includes(uf) && (
                                    <div className="h-2 w-2 bg-white rounded-sm" />
                                  )}
                                </div>
                                <span>{uf}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Filtro Status do Cliente */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status do Cliente</label>
                <Select
                  value={selectedStatusCliente[0] || "all"}
                  onValueChange={(value) => setSelectedStatusCliente(value === "all" ? [] : [value])}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    {statusClientes.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Botão limpar filtros */}
            {activeFiltersCount > 0 && (
              <div className="flex justify-end pt-2 border-t">
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  Limpar todos os filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      <div className={`grid gap-4 md:grid-cols-2 ${ehVendedor ? 'lg:grid-cols-5' : 'lg:grid-cols-6'}`}>
        <MetricCard
          title="Vendas Totais"
          value={`R$ ${(metrics.vendasTotais / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`}
          change={metrics.vendasTotaisChange}
          icon={<DollarSign className="h-4 w-4" />}
          subtitle={`${metrics.negociosFechados} vendas realizadas`}
        />
        <MetricCard
          title="Ticket Médio"
          value={`R$ ${(metrics.ticketMedio / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`}
          change={metrics.ticketMedioChange}
          icon={<Receipt className="h-4 w-4" />}
        />
        <MetricCard
          title="Produtos Vendidos"
          value={metrics.produtosVendidos.toString()}
          change={metrics.produtosVendidosChange}
          icon={<Package className="h-4 w-4" />}
        />
        <MetricCard
          title="Positivação"
          value={`${metrics.positivacao.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`}
          change={metrics.positivacaoChange}
          icon={<UserCheck className="h-4 w-4" />}
          subtitle={`${metrics.positivacaoCount} de ${metrics.positivacaoTotal} clientes`}
        />
        {!ehVendedor && (
          <MetricCard
            title="Vendedores Ativos"
            value={metrics.vendedoresAtivos.toString()}
            change={metrics.vendedoresAtivosChange}
            icon={<Users className="h-4 w-4" />}
          />
        )}
        <MetricCard
          title="Meta do Período"
          value={`${metrics.porcentagemMeta.toFixed(2)}%`}
          change={metrics.porcentagemMetaChange}
          icon={<Target className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}