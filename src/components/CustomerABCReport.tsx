import { useState, useMemo, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Download, Filter, X } from "lucide-react";
import { Badge } from "./ui/badge";
import { api } from "../services/api";
import { toast } from "sonner";
import { isStatusConcluido } from "../utils/statusVendaUtils";

type GroupBy = "none" | "grupo" | "vendedor" | "natureza";

interface CustomerABCFilters {
  dataInicio: string;
  dataFim: string;
  vendedorId: string;
  grupoRede: string;
  naturezaOperacaoId: string;
  groupBy: GroupBy;
  statusVendas: "concluidas" | "todas"; // NOVO: Filtro de status
}

interface CustomerABCData {
  clienteId: string;
  grupoRede: string;
  nomeCliente: string;
  cnpj: string;
  vendedor: string;
  valorTotal: number;
  percentual: number;
  percentualAcumulado: number;
  curvaABC: "A" | "B" | "C";
}

export function CustomerABCReport() {
  // Estados de dados
  const [vendas, setVendas] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [naturezas, setNaturezas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<CustomerABCFilters>({
    dataInicio: "",
    dataFim: "",
    vendedorId: "all",
    grupoRede: "all",
    naturezaOperacaoId: "all",
    groupBy: "none",
    statusVendas: "concluidas", // NOVO: Padrão = apenas concluídas
  });

  // Carregar dados do Supabase
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      console.log('[ABC-CLIENTES] Carregando dados da API...');
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
      console.log('[ABC-CLIENTES] Dados carregados:', {
        vendas: vendasAPI?.length || 0,
        clientes: clientesData?.length || 0,
        vendedores: vendedoresData?.length || 0,
        naturezas: naturezasData?.length || 0
      });
    } catch (error) {
      console.error('[ABC-CLIENTES] Erro ao carregar dados:', error);
      setVendas([]);
      setClientes([]);
      setVendedores([]);
      setNaturezas([]);
      toast.error('Erro ao carregar dados da API.');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar vendas
  const filteredSales = useMemo(() => {
    return vendas.filter((venda) => {
      // Filtro de data início
      if (filters.dataInicio) {
        const dataInicio = new Date(filters.dataInicio);
        if (venda.dataPedido < dataInicio) return false;
      }

      // Filtro de data fim
      if (filters.dataFim) {
        const dataFim = new Date(filters.dataFim);
        if (venda.dataPedido > dataFim) return false;
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

      // CORRIGIDO: Filtro de status - aceitar todas as variações de status concluído
      if (filters.statusVendas === "concluidas") {
        if (!isStatusConcluido(venda.status || '')) {
          return false;
        }
      }

      return true;
    });
  }, [filters]);

  // Calcular Curva ABC de Clientes
  const abcData = useMemo(() => {
    // Agrupar vendas por cliente
    const clientMap = new Map<string, { valor: number; vendedorId: string }>();

    filteredSales.forEach((venda) => {
      const current = clientMap.get(venda.clienteId) || { valor: 0, vendedorId: venda.vendedorId };
      clientMap.set(venda.clienteId, {
        valor: current.valor + venda.valorPedido,
        vendedorId: venda.vendedorId, // 🆕 Armazenar ID do vendedor
      });
    });

    // Calcular total de vendas
    const totalVendas = Array.from(clientMap.values()).reduce((sum, item) => sum + item.valor, 0);

    // Criar array de clientes com dados
    const clientesData: CustomerABCData[] = Array.from(clientMap.entries()).map(([clienteId, data]) => {
      const cliente = clientes.find(c => c.id === clienteId);
      // 🆕 Buscar nome do vendedor pelo ID
      const vendedor = vendedores.find(v => v.id === data.vendedorId);
      return {
        clienteId,
        grupoRede: cliente?.grupoRede || "-",
        nomeCliente: cliente?.razaoSocial || "Cliente Desconhecido",
        cnpj: cliente?.cnpj || "-",
        vendedor: vendedor?.nome || "Vendedor Desconhecido",
        valorTotal: data.valor,
        percentual: totalVendas > 0 ? (data.valor / totalVendas) * 100 : 0,
        percentualAcumulado: 0,
        curvaABC: "C",
      };
    });

    // Ordenar por valor decrescente
    clientesData.sort((a, b) => b.valorTotal - a.valorTotal);

    // Calcular percentual acumulado e classificar curva ABC
    let acumulado = 0;
    clientesData.forEach((cliente) => {
      // CORREÇÃO: Classificar ANTES de acumular o percentual atual
      if (acumulado < 80) {
        cliente.curvaABC = "A";
      } else if (acumulado < 95) {
        cliente.curvaABC = "B";
      } else {
        cliente.curvaABC = "C";
      }

      // Agora sim, acumular
      acumulado += cliente.percentual;
      cliente.percentualAcumulado = acumulado;
    });

    return clientesData;
  }, [filteredSales]);

  // Agrupar dados
  const groupedData = useMemo(() => {
    if (filters.groupBy === "none") {
      return abcData;
    }

    const groups = new Map<string, typeof abcData>();

    abcData.forEach((cliente) => {
      let groupKey = "";
      
      switch (filters.groupBy) {
        case "grupo":
          groupKey = cliente.grupoRede;
          break;
        case "vendedor":
          groupKey = cliente.vendedor;
          break;
        case "natureza":
          // Para natureza, precisamos buscar nas vendas
          const vendaCliente = filteredSales.find(v => v.clienteId === cliente.clienteId);
          groupKey = vendaCliente?.nomeNaturezaOperacao || "Sem Natureza";
          break;
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(cliente);
    });

    return Array.from(groups.entries()).flatMap(([groupName, clientes]) => {
      return [
        { isGroupHeader: true, groupName, clientes } as any,
        ...clientes,
      ];
    });
  }, [abcData, filters.groupBy, filteredSales]);

  // Calcular totais
  const totals = useMemo(() => {
    return abcData.reduce(
      (acc, cliente) => ({
        clientes: acc.clientes + 1,
        valor: acc.valor + cliente.valorTotal,
      }),
      { clientes: 0, valor: 0 }
    );
  }, [abcData]);

  // Obter grupos/redes únicos
  const gruposRedes = useMemo(() => {
    const grupos = new Set<string>();
    clientes.forEach(c => {
      if (c.grupoRede) grupos.add(c.grupoRede);
    });
    return Array.from(grupos);
  }, []);

  // Limpar filtros
  const clearFilters = () => {
    setFilters({
      dataInicio: "",
      dataFim: "",
      vendedorId: "all",
      grupoRede: "all",
      naturezaOperacaoId: "all",
      groupBy: "none",
      statusVendas: "concluidas", // NOVO: Padrão = apenas concluídas
    });
  };

  // Exportar para Excel
  const exportToExcel = () => {
    const headers = ["Grupo/Rede", "Cliente", "CNPJ", "Vendedor", "Curva ABC", "Valor Total", "% Participação", "% Acumulado"];
    const rows = abcData.map((cliente) => [
      cliente.grupoRede,
      cliente.nomeCliente,
      cliente.cnpj,
      cliente.vendedor,
      cliente.curvaABC,
      `R$ ${cliente.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `${cliente.percentual.toFixed(2)}%`,
      `${cliente.percentualAcumulado.toFixed(2)}%`,
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.join(";"))
      .join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `curva-abc-clientes-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Obter cor da badge da curva
  const getCurvaColor = (curva: "A" | "B" | "C") => {
    switch (curva) {
      case "A": return "default";
      case "B": return "secondary";
      case "C": return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Curva ABC de Clientes</CardTitle>
        <p className="text-sm text-muted-foreground">
          Análise de clientes por participação no faturamento do período
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filtros */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </h3>
            {(filters.dataInicio || filters.dataFim || (filters.vendedorId && filters.vendedorId !== "all") || (filters.grupoRede && filters.grupoRede !== "all") || (filters.naturezaOperacaoId && filters.naturezaOperacaoId !== "all")) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Período */}
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                className="w-[140px]"
                value={filters.dataInicio}
                onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                className="w-[140px]"
                value={filters.dataFim}
                onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
              />
            </div>

            {/* Vendedor */}
            <div className="space-y-2">
              <Label>Vendedor</Label>
              <Select value={filters.vendedorId} onValueChange={(value) => setFilters({ ...filters, vendedorId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os vendedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os vendedores</SelectItem>
                  {vendedores.map((seller) => (
                    <SelectItem key={seller.id} value={seller.id}>
                      {seller.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Grupo/Rede */}
            <div className="space-y-2">
              <Label>Grupo/Rede</Label>
              <Select value={filters.grupoRede} onValueChange={(value) => setFilters({ ...filters, grupoRede: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os grupos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os grupos</SelectItem>
                  {gruposRedes.map((grupo) => (
                    <SelectItem key={grupo} value={grupo}>
                      {grupo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Natureza de Operação */}
            <div className="space-y-2">
              <Label>Natureza de Operação</Label>
              <Select value={filters.naturezaOperacaoId} onValueChange={(value) => setFilters({ ...filters, naturezaOperacaoId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as naturezas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as naturezas</SelectItem>
                  {naturezas.map((natureza) => (
                    <SelectItem key={natureza.id} value={natureza.id}>
                      {natureza.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Agrupar Por */}
            <div className="space-y-2">
              <Label>Agrupar Por</Label>
              <Select value={filters.groupBy} onValueChange={(value: GroupBy) => setFilters({ ...filters, groupBy: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem agrupamento</SelectItem>
                  <SelectItem value="grupo">Grupo/Rede</SelectItem>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                  <SelectItem value="natureza">Natureza de Operação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status de Vendas */}
            <div className="space-y-2">
              <Label>Status de Vendas</Label>
              <Select value={filters.statusVendas} onValueChange={(value: "concluidas" | "todas") => setFilters({ ...filters, statusVendas: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="concluidas">Apenas concluídas</SelectItem>
                  <SelectItem value="todas">Todas as vendas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Resumo e Ações */}
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{totals.clientes}</span> clientes • 
            <span className="font-medium text-foreground ml-1">
              R$ {totals.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <Button onClick={exportToExcel} disabled={abcData.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        </div>

        {/* Tabela */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grupo/Rede</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Curva ABC</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-right">% Participação</TableHead>
                <TableHead className="text-right">% Acumulado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Nenhum cliente encontrado com os filtros selecionados
                  </TableCell>
                </TableRow>
              ) : (
                groupedData.map((item, index) => {
                  if (item.isGroupHeader) {
                    const groupTotal = item.clientes.reduce((sum: number, c: any) => sum + c.valorTotal, 0);
                    return (
                      <TableRow key={`group-${index}`} className="bg-muted/50">
                        <TableCell colSpan={5} className="font-medium">
                          {item.groupName} ({item.clientes.length} clientes)
                        </TableCell>
                        <TableCell colSpan={3} className="text-right font-medium">
                          R$ {groupTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    );
                  }

                  const cliente = item as CustomerABCData;

                  return (
                    <TableRow key={cliente.clienteId}>
                      <TableCell>{cliente.grupoRede}</TableCell>
                      <TableCell>{cliente.nomeCliente}</TableCell>
                      <TableCell className="font-mono text-sm">{cliente.cnpj}</TableCell>
                      <TableCell>{cliente.vendedor}</TableCell>
                      <TableCell>
                        <Badge variant={getCurvaColor(cliente.curvaABC)}>
                          Curva {cliente.curvaABC}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {cliente.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        {cliente.percentual.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {cliente.percentualAcumulado.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
