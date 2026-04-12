import { useState, useEffect, useMemo, useRef } from "react";
import { ArrowLeft, Download, TrendingUp, DollarSign, Target, Calendar, Users, Filter, X, ShoppingCart, Percent, ChevronsUpDown, Check } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar as CalendarComponent } from "./ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { api } from "../services/api";
import { format } from "date-fns@4.1.0";
import { ptBR } from "date-fns@4.1.0/locale";
import { toast } from "sonner@2.0.3";
import * as XLSX from "xlsx";

interface RelatorioROIClienteProps {
  onNavigateBack: () => void;
}

interface ClienteROI {
  clienteId: string;
  clienteNome: string;
  vendedorNome: string;
  totalVendas: number;
  quantidadePedidos: number;
  ticketMedio: number;
  margemLucro: number;
  roi: number;
  primeiroPedido: string;
  ultimoPedido: string;
  diasAtivo: number;
  frequenciaCompra: number; // dias entre compras
  valorMedio: number;
}

interface ROIStats {
  totalClientes: number;
  roiMedio: number;
  ticketMedio: number;
  margemMedia: number;
  ltv: number;
  frequenciaMedia: number;
}

export function RelatorioROICliente({ onNavigateBack }: RelatorioROIClienteProps) {
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<ClienteROI[]>([]);
  const [allClientes, setAllClientes] = useState<Array<{ id: string; nomeFantasia: string; codigo: string; cpfCnpj: string }>>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<{ id: string; nomeFantasia: string; codigo: string; cpfCnpj: string } | null>(null);
  const [clientePopoverOpen, setClientePopoverOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [popoverWidth, setPopoverWidth] = useState<number>(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof ClienteROI>("roi");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Capturar largura do trigger quando o popover abrir
  useEffect(() => {
    if (clientePopoverOpen && triggerRef.current) {
      setPopoverWidth(triggerRef.current.offsetWidth);
    }
  }, [clientePopoverOpen]);

  // Carregar dados iniciais
  useEffect(() => {
    loadInitialData();
  }, []);

  // Carregar dados do relatório quando cliente mudar
  useEffect(() => {
    if (clienteSelecionado) {
      loadRelatorioData();
    }
  }, [clienteSelecionado]);

  const loadInitialData = async () => {
    try {
      const clientesRes = await api.get("clientes");
      console.log('[ROI] Clientes recebidos:', clientesRes);
      setAllClientes(clientesRes || []);
    } catch (error) {
      console.error("Erro ao carregar dados iniciais:", error);
      toast.error("Erro ao carregar dados iniciais");
    }
  };

  const loadRelatorioData = async () => {
    if (!clienteSelecionado) return;
    
    setLoading(true);
    try {
      const params: any = {
        clienteId: clienteSelecionado.id,
        periodo: '365', // Últimos 365 dias por padrão
      };

      console.log("[ROI] Carregando relatório com params:", params);
      const response = await api.get("relatorios/roi-clientes", { params });
      console.log("[ROI] Resposta recebida:", response);
      console.log("[ROI] Número de clientes:", response.clientes?.length || 0);
      setClientes(response.clientes || []);
    } catch (error) {
      console.error("Erro ao carregar relatório de ROI:", error);
      toast.error("Erro ao carregar relatório de ROI");
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar e ordenar dados
  const filteredAndSortedData = useMemo(() => {
    let filtered = [...clientes];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.clienteNome.toLowerCase().includes(term) ||
          c.vendedorNome.toLowerCase().includes(term)
      );
    }

    filtered.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const multiplier = sortDirection === "asc" ? 1 : -1;
      
      if (typeof aVal === "string" && typeof bVal === "string") {
        return multiplier * aVal.localeCompare(bVal);
      }
      
      return multiplier * ((aVal as number) - (bVal as number));
    });

    return filtered;
  }, [clientes, searchTerm, sortField, sortDirection]);

  // Calcular estatísticas
  const stats: ROIStats = useMemo(() => {
    if (clientes.length === 0) {
      return {
        totalClientes: 0,
        roiMedio: 0,
        ticketMedio: 0,
        margemMedia: 0,
        ltv: 0,
        frequenciaMedia: 0,
      };
    }

    const totalClientes = clientes.length;
    const roiMedio = clientes.reduce((sum, c) => sum + c.roi, 0) / totalClientes;
    const ticketMedio = clientes.reduce((sum, c) => sum + c.ticketMedio, 0) / totalClientes;
    const margemMedia = clientes.reduce((sum, c) => sum + c.margemLucro, 0) / totalClientes;
    const ltv = clientes.reduce((sum, c) => sum + c.totalVendas, 0) / totalClientes;
    const frequenciaMedia = clientes.reduce((sum, c) => sum + c.frequenciaCompra, 0) / totalClientes;

    return {
      totalClientes,
      roiMedio,
      ticketMedio,
      margemMedia,
      ltv,
      frequenciaMedia,
    };
  }, [clientes]);

  const handleSort = (field: keyof ClienteROI) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleExport = () => {
    try {
      const headers = [
        "Cliente",
        "Vendedor",
        "Total Vendas",
        "Qtd Pedidos",
        "Ticket Médio",
        "Margem Lucro (%)",
        "ROI (%)",
        "LTV",
        "Frequência (dias)",
        "Dias Ativo",
        "Primeiro Pedido",
        "Último Pedido",
      ];

      const rows = filteredAndSortedData.map((cliente) => [
        cliente.clienteNome,
        cliente.vendedorNome,
        cliente.totalVendas.toFixed(2),
        cliente.quantidadePedidos,
        cliente.ticketMedio.toFixed(2),
        cliente.margemLucro.toFixed(2),
        cliente.roi.toFixed(2),
        cliente.valorMedio.toFixed(2),
        cliente.frequenciaCompra.toFixed(0),
        cliente.diasAtivo,
        format(new Date(cliente.primeiroPedido), "dd/MM/yyyy"),
        format(new Date(cliente.ultimoPedido), "dd/MM/yyyy"),
      ]);

      const csvContent = [
        headers.join(";"),
        ...rows.map((row) => row.join(";")),
      ].join("\n");

      const blob = new Blob(["\ufeff" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio-roi-clientes-${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();

      toast.success("Relatório exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar relatório:", error);
      toast.error("Erro ao exportar relatório");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onNavigateBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1>Relatório de ROI de Clientes</h1>
            <p className="text-muted-foreground">
              Análise de retorno sobre investimento, lifetime value e métricas de performance por cliente
            </p>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                Total Clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalClientes}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Percent className="h-4 w-4 text-green-600" />
                ROI Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {stats.roiMedio.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-purple-600" />
                LTV Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-600">
                R$ {stats.ltv.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-orange-600" />
                Ticket Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600">
                R$ {stats.ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-600" />
                Margem Média
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-indigo-600">
                {stats.margemMedia.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4 text-cyan-600" />
                Frequência Média
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-cyan-600">
                {stats.frequenciaMedia.toFixed(0)} dias
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtro do Relatório</CardTitle>
            <CardDescription>Selecione o cliente para análise</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Seleção de Cliente */}
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Popover open={clientePopoverOpen} onOpenChange={setClientePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientePopoverOpen}
                    className="w-full justify-between"
                    ref={triggerRef}
                  >
                    {clienteSelecionado
                      ? `${clienteSelecionado.codigo} - ${clienteSelecionado.nomeFantasia}`
                      : "Selecione o cliente..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start" style={{ width: popoverWidth }}>
                  <Command>
                    <CommandInput placeholder="Buscar cliente..." />
                    <CommandList>
                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                      <CommandGroup>
                        {allClientes.map((cliente) => (
                          <CommandItem
                            key={cliente.id}
                            value={`${cliente.codigo} ${cliente.nomeFantasia} ${cliente.cpfCnpj}`}
                            onSelect={() => {
                              setClienteSelecionado(cliente);
                              setClientePopoverOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                clienteSelecionado?.id === cliente.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              }`}
                            />
                            <div className="flex flex-col">
                              <span>
                                {cliente.codigo} - {cliente.nomeFantasia}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                CNPJ: {cliente.cpfCnpj}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Dados de ROI por Cliente</CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Buscar cliente ou vendedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
                <Button onClick={handleExport} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Excel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando dados...
              </div>
            ) : filteredAndSortedData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum cliente encontrado com os filtros selecionados
              </div>
            ) : (
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("clienteNome")}
                      >
                        Cliente {sortField === "clienteNome" && (sortDirection === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("vendedorNome")}
                      >
                        Vendedor {sortField === "vendedorNome" && (sortDirection === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 text-right"
                        onClick={() => handleSort("roi")}
                      >
                        ROI (%) {sortField === "roi" && (sortDirection === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 text-right"
                        onClick={() => handleSort("totalVendas")}
                      >
                        LTV {sortField === "totalVendas" && (sortDirection === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 text-right"
                        onClick={() => handleSort("ticketMedio")}
                      >
                        Ticket Médio {sortField === "ticketMedio" && (sortDirection === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 text-right"
                        onClick={() => handleSort("margemLucro")}
                      >
                        Margem (%) {sortField === "margemLucro" && (sortDirection === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 text-right"
                        onClick={() => handleSort("quantidadePedidos")}
                      >
                        Pedidos {sortField === "quantidadePedidos" && (sortDirection === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 text-right"
                        onClick={() => handleSort("frequenciaCompra")}
                      >
                        Frequência {sortField === "frequenciaCompra" && (sortDirection === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 text-right"
                        onClick={() => handleSort("diasAtivo")}
                      >
                        Dias Ativo {sortField === "diasAtivo" && (sortDirection === "asc" ? "↑" : "↓")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedData.map((cliente) => (
                      <TableRow key={cliente.clienteId}>
                        <TableCell>{cliente.clienteNome}</TableCell>
                        <TableCell>{cliente.vendedorNome}</TableCell>
                        <TableCell className="text-right">
                          <span className={cliente.roi >= 100 ? "text-green-600 font-medium" : cliente.roi >= 50 ? "text-orange-600" : "text-red-600"}>
                            {cliente.roi.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          R$ {cliente.totalVendas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          R$ {cliente.ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          {cliente.margemLucro.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right">
                          {cliente.quantidadePedidos}
                        </TableCell>
                        <TableCell className="text-right">
                          {cliente.frequenciaCompra.toFixed(0)} dias
                        </TableCell>
                        <TableCell className="text-right">
                          {cliente.diasAtivo} dias
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações sobre o relatório */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Sobre as Métricas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>ROI (Return on Investment):</strong> Percentual de retorno sobre o investimento. Calculado com base na margem de lucro em relação ao custo de aquisição e manutenção do cliente.
            </p>
            <p>
              <strong>LTV (Lifetime Value):</strong> Valor total de vendas do cliente ao longo do período analisado.
            </p>
            <p>
              <strong>Ticket Médio:</strong> Valor médio de cada pedido realizado pelo cliente.
            </p>
            <p>
              <strong>Margem de Lucro:</strong> Percentual de lucro líquido sobre o valor total de vendas.
            </p>
            <p>
              <strong>Frequência de Compra:</strong> Intervalo médio em dias entre cada compra do cliente.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}