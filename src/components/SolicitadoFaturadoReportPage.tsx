import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Download, Filter, X, ArrowLeft, Calendar as CalendarIcon, RefreshCw } from "lucide-react";
import { companyService } from "../services/companyService";
import { Combobox } from "./ui/combobox";
import { api } from "../services/api";
import { toast } from "sonner@2.0.3";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { ptBR } from "date-fns/locale";
import { format } from "date-fns";
import { Checkbox } from "./ui/checkbox";
import { isStatusConcluido } from "../utils/statusVendaUtils";

type GroupBy = "none" | "grupo" | "vendedor" | "natureza";

interface SolicitadoFaturadoFilters {
  dataInicio: string;
  dataFim: string;
  vendedorId: string;
  grupoRede: string;
  naturezaOperacaoId: string;
  uf: string;
  empresaEmitenteId: string;
  groupBy: GroupBy;
  statusVendas: "concluidas" | "todas";
  apenasComCorte: boolean; // Novo filtro
}

interface SolicitadoFaturadoData {
  produtoId: string;
  descricaoProduto: string;
  codigoSku: string;
  quantidadeSolicitado: number;
  valorSolicitado: number;
  pedidosSolicitado: number;
  quantidadeFaturado: number;
  valorFaturado: number;
  pedidosFaturado: number;
  perdaQuantidade: number;
  perdaPercentual: number;
}

interface SolicitadoFaturadoReportPageProps {
  onBack: () => void;
}

export function SolicitadoFaturadoReportPage({ onBack }: SolicitadoFaturadoReportPageProps) {
  // Estados de dados
  const [vendas, setVendas] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [naturezas, setNaturezas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Carregar dados do Supabase
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      console.log('[SOLICITADO-FATURADO] Carregando dados da API...');
      const [vendasAPI, clientesData, vendedoresData, naturezasData] = await Promise.all([
        api.get('vendas'),
        api.get('clientes'),
        api.get('vendedores'),
        api.get('naturezas-operacao'),
      ]);
      
      setVendas(Array.isArray(vendasAPI) ? vendasAPI : []);
      setClientes(Array.isArray(clientesData) ? clientesData : []);
      setVendedores(Array.isArray(vendedoresData) ? vendedoresData : []);
      setNaturezas(Array.isArray(naturezasData) ? naturezasData : []);
      console.log('[SOLICITADO-FATURADO] Dados carregados');
    } catch (error) {
      console.error('[SOLICITADO-FATURADO] Erro ao carregar dados:', error);
      setVendas([]);
      setClientes([]);
      setVendedores([]);
      setNaturezas([]);
      toast.error('Erro ao carregar dados da API.');
    } finally {
      setLoading(false);
    }
  };

  // Forçar sincronização com ERP
  const forcarSincronizacao = async () => {
    try {
      setSyncing(true);
      toast.info('Iniciando sincronização com o ERP...');
      
      // Chamar endpoint de sincronização
      const response = await api.post('sync-erp', {});
      
      if (response.success) {
        const { sincronizadas, naoEncontradas, erros, apiBloqueada } = response;
        
        let mensagem = `Sincronização concluída!\n`;
        if (sincronizadas > 0) mensagem += `✅ ${sincronizadas} venda(s) sincronizada(s)\n`;
        if (naoEncontradas > 0) mensagem += `⚠️ ${naoEncontradas} venda(s) não encontrada(s) no ERP\n`;
        if (erros > 0) mensagem += `❌ ${erros} erro(s)\n`;
        if (apiBloqueada) mensagem += `\n🚫 API bloqueada por rate limit. Aguarde alguns minutos antes de sincronizar novamente.`;
        
        toast.success(mensagem);
        
        // Recarregar dados apenas se houve sincronizações bem-sucedidas
        if (sincronizadas > 0) {
          await carregarDados();
        }
      } else {
        toast.error('Erro na sincronização: ' + (response.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('[SOLICITADO-FATURADO] Erro ao sincronizar:', error);
      toast.error('Erro ao sincronizar com o ERP');
    } finally {
      setSyncing(false);
    }
  };

  const [filters, setFilters] = useState<SolicitadoFaturadoFilters>({
    dataInicio: "",
    dataFim: "",
    vendedorId: "all",
    grupoRede: "all",
    naturezaOperacaoId: "all",
    uf: "all",
    empresaEmitenteId: "all",
    groupBy: "none",
    statusVendas: "todas",
    apenasComCorte: false,
  });

  // Estados para controle de período - padrão alterado para "365" (último ano)
  const [period, setPeriod] = useState<string>("365");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Atualizar filtros de data quando o período muda
  useEffect(() => {
    if (period && period !== "custom") {
      const hoje = new Date();
      let dataInicio = new Date();
      
      switch (period) {
        case "7":
          dataInicio.setDate(hoje.getDate() - 7);
          break;
        case "30":
          dataInicio.setDate(hoje.getDate() - 30);
          break;
        case "current_month":
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
          break;
        case "90":
          dataInicio.setDate(hoje.getDate() - 90);
          break;
        case "365":
          dataInicio.setDate(hoje.getDate() - 365);
          break;
      }
      
      setFilters(prev => ({
        ...prev,
        dataInicio: format(dataInicio, 'yyyy-MM-dd'),
        dataFim: format(hoje, 'yyyy-MM-dd'),
      }));
    }
  }, [period]);

  // Handler para mudança de período pré-configurado
  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    if (value !== "custom") {
      setDateRange({});
    }
  };

  // Handler para seleção de período personalizado
  const handleDateSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      setDateRange(range);
      setPeriod("custom");
      setFilters(prev => ({
        ...prev,
        dataInicio: format(range.from, 'yyyy-MM-dd'),
        dataFim: format(range.to, 'yyyy-MM-dd'),
      }));
      setIsCalendarOpen(false);
    } else if (range) {
      setDateRange(range);
    }
  };

  // Formatar range de datas personalizado
  const formatDateRange = () => {
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, "dd/MMM", { locale: ptBR })} - ${format(dateRange.to, "dd/MMM/yyyy", { locale: ptBR })}`;
    }
    return "";
  };

  // Obter UFs únicas dos clientes
  const ufsDisponiveis = useMemo(() => {
    const ufs = new Set<string>();
    clientes.forEach(c => {
      if (c.uf) ufs.add(c.uf);
    });
    return Array.from(ufs).sort();
  }, [clientes]);

  // Obter Grupos/Redes únicos
  const gruposRedes = useMemo(() => {
    const grupos = new Set<string>();
    clientes.forEach(c => {
      if (c.grupoRede) grupos.add(c.grupoRede);
    });
    return Array.from(grupos).sort();
  }, [clientes]);

  // Filtrar vendas
  const filteredSales = useMemo(() => {
    return vendas.filter((venda) => {
      // Filtro de data início e fim
      if (filters.dataInicio || filters.dataFim) {
        const dataPedido = typeof venda.dataPedido === 'string' 
          ? new Date(venda.dataPedido) 
          : venda.dataPedido;
        
        if (filters.dataInicio) {
          const dataInicio = new Date(filters.dataInicio);
          dataInicio.setHours(0, 0, 0, 0);
          if (dataPedido < dataInicio) return false;
        }

        if (filters.dataFim) {
          const dataFim = new Date(filters.dataFim);
          dataFim.setHours(23, 59, 59, 999);
          if (dataPedido > dataFim) return false;
        }
      }

      // Filtro de vendedor
      if (filters.vendedorId && filters.vendedorId !== "all" && venda.vendedorId !== filters.vendedorId) {
        return false;
      }

      // Filtro de grupo/rede
      if (filters.grupoRede && filters.grupoRede !== "all") {
        const cliente = clientes.find(c => c.id === venda.clienteId);
        if (cliente?.grupoRede !== filters.grupoRede) return false;
      }

      // Filtro de natureza de operação
      if (filters.naturezaOperacaoId && filters.naturezaOperacaoId !== "all" && venda.naturezaOperacaoId !== filters.naturezaOperacaoId) {
        return false;
      }

      // Filtro de UF
      if (filters.uf && filters.uf !== "all") {
        const cliente = clientes.find(c => c.id === venda.clienteId);
        if (cliente?.uf !== filters.uf) return false;
      }

      // Filtro de Empresa Emitente
      if (filters.empresaEmitenteId && filters.empresaEmitenteId !== "all" && venda.empresaFaturamentoId !== filters.empresaEmitenteId) {
        return false;
      }

      // Filtro de status
      if (filters.statusVendas === "concluidas") {
        if (!isStatusConcluido(venda.status || '')) {
          return false;
        }
      }

      return true;
    });
  }, [vendas, filters, clientes]);

  // Calcular análise Solicitado X Faturado
  const analiseData = useMemo(() => {

    const produtoMap = new Map<string, {
      produtoId?: string;
      descricaoProduto: string;
      codigoSku: string;
      codigoEan?: string;
      quantidadeSolicitado: number;
      valorSolicitado: number;
      pedidosSolicitadoSet: Set<string>;
      quantidadeFaturado: number;
      valorFaturado: number;
      pedidosFaturadoSet: Set<string>;
    }>();

    /**
     * Determina a chave de agrupamento para um item
     * Prioridade: produtoId -> EAN -> SKU
     */
    const getItemKey = (item: any): string => {
      if (item.produtoId) return `id:${item.produtoId}`;
      if (item.codigoEan) return `ean:${item.codigoEan}`;
      return `sku:${item.codigoSku}`;
    };

    filteredSales.forEach((venda) => {
      // Processar itens solicitados
      if (venda.itens && Array.isArray(venda.itens)) {
        venda.itens.forEach((item: any) => {
          const key = getItemKey(item);
          const current = produtoMap.get(key) || {
            produtoId: item.produtoId,
            descricaoProduto: item.descricaoProduto,
            codigoSku: item.codigoSku,
            codigoEan: item.codigoEan,
            quantidadeSolicitado: 0,
            valorSolicitado: 0,
            pedidosSolicitadoSet: new Set<string>(),
            quantidadeFaturado: 0,
            valorFaturado: 0,
            pedidosFaturadoSet: new Set<string>(),
          };

          current.quantidadeSolicitado += item.quantidade || 0;
          current.valorSolicitado += item.subtotal || 0;
          current.pedidosSolicitadoSet.add(venda.id);

          produtoMap.set(key, current);
        });
      }

      // Processar itens faturados (se existirem)
      if (venda.itensFaturados && Array.isArray(venda.itensFaturados)) {
        venda.itensFaturados.forEach((item: any) => {
          // Usar mesma lógica de chave: produtoId -> EAN -> SKU
          const key = getItemKey(item);
          
          const current = produtoMap.get(key) || {
            produtoId: item.produtoId,
            descricaoProduto: item.descricaoProduto || item.descricao,
            codigoSku: item.codigoSku || item.codigo,
            codigoEan: item.codigoEan,
            quantidadeSolicitado: 0,
            valorSolicitado: 0,
            pedidosSolicitadoSet: new Set<string>(),
            quantidadeFaturado: 0,
            valorFaturado: 0,
            pedidosFaturadoSet: new Set<string>(),
          };

          current.quantidadeFaturado += item.quantidade || 0;
          current.valorFaturado += item.subtotal || item.valorTotal || 0;
          current.pedidosFaturadoSet.add(venda.id);

          produtoMap.set(key, current);
        });
      }
    });

    // Converter Map para array e calcular perdas
    const data: SolicitadoFaturadoData[] = Array.from(produtoMap.entries()).map(([codigoSku, info]) => {
      const perdaQuantidade = Math.max(0, info.quantidadeSolicitado - info.quantidadeFaturado);
      const perdaPercentual = info.quantidadeSolicitado > 0 
        ? (perdaQuantidade / info.quantidadeSolicitado) * 100 
        : 0;

      return {
        produtoId: info.produtoId || codigoSku,
        descricaoProduto: info.descricaoProduto,
        codigoSku: info.codigoSku,
        quantidadeSolicitado: info.quantidadeSolicitado,
        valorSolicitado: info.valorSolicitado,
        pedidosSolicitado: info.pedidosSolicitadoSet.size,
        quantidadeFaturado: info.quantidadeFaturado,
        valorFaturado: info.valorFaturado,
        pedidosFaturado: info.pedidosFaturadoSet.size,
        perdaQuantidade,
        perdaPercentual,
      };
    });

    // Aplicar filtro de apenas com corte
    const dataFiltrada = filters.apenasComCorte 
      ? data.filter(d => d.perdaQuantidade > 0)
      : data;

    // Ordenar por perda de quantidade (decrescente)
    return dataFiltrada.sort((a, b) => b.perdaQuantidade - a.perdaQuantidade);
  }, [filteredSales, filters.apenasComCorte]);

  // Limpar filtros
  const clearFilters = () => {
    setFilters({
      dataInicio: "",
      dataFim: "",
      vendedorId: "all",
      grupoRede: "all",
      naturezaOperacaoId: "all",
      uf: "all",
      empresaEmitenteId: "all",
      groupBy: "none",
      statusVendas: "todas",
      apenasComCorte: false,
    });
    setPeriod("365"); // Voltar para "Último ano" ao limpar filtros
    setDateRange({});
  };

  // Exportar para Excel
  const exportarExcel = () => {
    if (analiseData.length === 0) {
      toast.error('Não há dados para exportar');
      return;
    }

    const headers = [
      'Código SKU',
      'Descrição',
      'Qtd. Solicitado',
      'Valor Solicitado',
      'Pedidos (Solicitado)',
      'Qtd. Faturado',
      'Valor Faturado',
      'Pedidos (Faturado)',
      'Perda Qtd.',
      'Perda %'
    ];

    const rows = analiseData.map(item => [
      item.codigoSku,
      item.descricaoProduto,
      item.quantidadeSolicitado.toFixed(2),
      item.valorSolicitado.toFixed(2),
      item.pedidosSolicitado,
      item.quantidadeFaturado.toFixed(2),
      item.valorFaturado.toFixed(2),
      item.pedidosFaturado,
      item.perdaQuantidade.toFixed(2),
      item.perdaPercentual.toFixed(2) + '%'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analise-solicitado-faturado-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast.success('Relatório exportado com sucesso!');
  };

  // Formatação de moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1>Análise Solicitado X Faturado</h1>
            <p className="text-muted-foreground">
              Comparação entre quantidades/valores solicitados e faturados por produto
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* Filtros */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
                </h3>
                {(filters.dataInicio || filters.dataFim || (filters.vendedorId && filters.vendedorId !== "all") || (filters.grupoRede && filters.grupoRede !== "all") || (filters.naturezaOperacaoId && filters.naturezaOperacaoId !== "all") || (filters.uf && filters.uf !== "all") || (filters.empresaEmitenteId && filters.empresaEmitenteId !== "all") || filters.apenasComCorte) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Limpar Filtros
                  </Button>
                )}
              </div>

              {/* Linha 1: Período Pré-configurado + Personalizado, UF, Vendedor */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex flex-wrap gap-2">
                  {/* Período Pré-configurado */}
                  <div className="space-y-2">
                    <Label>Período</Label>
                    <Select value={period === "custom" ? "" : period} onValueChange={handlePeriodChange}>
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
                  </div>

                  {/* Período Personalizado */}
                  <div className="space-y-2">
                    <Label>Personalizado</Label>
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

                  <div className="space-y-2">
                    <Label>UF</Label>
                    <Select value={filters.uf} onValueChange={(value) => setFilters({ ...filters, uf: value })}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem key="uf-all" value="all">Todas</SelectItem>
                        {ufsDisponiveis.map((uf) => (
                          <SelectItem key={uf} value={uf}>
                            {uf}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2 flex-1 min-w-[250px]">
                  <Label>Vendedor</Label>
                  <Combobox
                    options={[
                      { value: "all", label: "Todos os vendedores" },
                      ...vendedores.map((seller) => ({
                        value: seller.id,
                        label: seller.nome,
                      })),
                    ]}
                    value={filters.vendedorId}
                    onValueChange={(value) => setFilters({ ...filters, vendedorId: value || "all" })}
                    placeholder="Todos os vendedores"
                    searchPlaceholder="Pesquisar vendedor..."
                    emptyText="Nenhum vendedor encontrado."
                  />
                </div>
              </div>

              {/* Linha 2: Grupo/Rede, Natureza de Operação, Empresa Emitente, Agrupar Por */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
                <div className="space-y-2 lg:col-span-3">
                  <Label>Grupo/Rede</Label>
                  <Select value={filters.grupoRede} onValueChange={(value) => setFilters({ ...filters, grupoRede: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os grupos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem key="grp-all" value="all">Todos os grupos</SelectItem>
                      {gruposRedes.map((grupo) => (
                        <SelectItem key={grupo} value={grupo}>
                          {grupo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 lg:col-span-3">
                  <Label>Natureza de Operação</Label>
                  <Select value={filters.naturezaOperacaoId} onValueChange={(value) => setFilters({ ...filters, naturezaOperacaoId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as naturezas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem key="nat-all" value="all">Todas as naturezas</SelectItem>
                      {naturezas.map((natureza) => (
                        <SelectItem key={natureza.id} value={natureza.id}>
                          {natureza.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 lg:col-span-3">
                  <Label>Empresa Emitente</Label>
                  <Select value={filters.empresaEmitenteId} onValueChange={(value) => setFilters({ ...filters, empresaEmitenteId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as empresas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem key="emp-all" value="all">Todas as empresas</SelectItem>
                      {companyService.getAllSync().map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.nomeFantasia}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 lg:col-span-3">
                  <Label>Agrupar Por</Label>
                  <Select value={filters.groupBy} onValueChange={(value: GroupBy) => setFilters({ ...filters, groupBy: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem key="agr-none" value="none">Sem agrupamento</SelectItem>
                      <SelectItem key="agr-grupo" value="grupo">Grupo/Rede</SelectItem>
                      <SelectItem key="agr-vend" value="vendedor">Vendedor</SelectItem>
                      <SelectItem key="agr-nat" value="natureza">Natureza de Operação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 lg:col-span-3">
                  <Label>Status das Vendas</Label>
                  <Select value={filters.statusVendas} onValueChange={(value: "concluidas" | "todas") => setFilters({ ...filters, statusVendas: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem key="st-todas" value="todas">Todas</SelectItem>
                      <SelectItem key="st-concl" value="concluidas">Concluídas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Linha 3: Checkbox "Mostrar somente produtos com corte no pedido" */}
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="apenasComCorte" 
                  checked={filters.apenasComCorte}
                  onCheckedChange={(checked) => setFilters({ ...filters, apenasComCorte: checked as boolean })}
                />
                <label
                  htmlFor="apenasComCorte"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Mostrar somente produtos com corte no pedido
                </label>
              </div>
            </div>

            {/* Resumo e Ações */}
            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                {analiseData.length} produto{analiseData.length !== 1 ? 's' : ''} • R$ {analiseData.reduce((sum, item) => sum + item.valorSolicitado, 0).toFixed(2)}
              </p>
              <div className="flex items-center space-x-2">
                <Button onClick={exportarExcel} disabled={analiseData.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Excel
                </Button>
                <Button onClick={forcarSincronizacao} disabled={syncing}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sincronizar ERP
                </Button>
              </div>
            </div>

            {/* Tabela */}
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando dados...</p>
              </div>
            ) : analiseData.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum dado encontrado para os filtros selecionados.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código SKU</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Qtd. Solicitado</TableHead>
                      <TableHead className="text-right">Valor Solicitado</TableHead>
                      <TableHead className="text-right">Pedidos</TableHead>
                      <TableHead className="text-right">Qtd. Faturado</TableHead>
                      <TableHead className="text-right">Valor Faturado</TableHead>
                      <TableHead className="text-right">Pedidos</TableHead>
                      <TableHead className="text-right">Perda Qtd.</TableHead>
                      <TableHead className="text-right">Perda %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analiseData.map((item) => (
                      <TableRow key={item.produtoId}>
                        <TableCell>{item.codigoSku}</TableCell>
                        <TableCell>{item.descricaoProduto}</TableCell>
                        <TableCell className="text-right">{item.quantidadeSolicitado.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.valorSolicitado)}</TableCell>
                        <TableCell className="text-right">{item.pedidosSolicitado}</TableCell>
                        <TableCell className="text-right">{item.quantidadeFaturado.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.valorFaturado)}</TableCell>
                        <TableCell className="text-right">{item.pedidosFaturado}</TableCell>
                        <TableCell className="text-right">
                          {item.perdaQuantidade > 0 ? (
                            <span className="text-red-600 dark:text-red-400">
                              {item.perdaQuantidade.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.perdaPercentual > 0 ? (
                            <span className="text-red-600 dark:text-red-400">
                              {item.perdaPercentual.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
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
      </div>
    </div>
  );
}
