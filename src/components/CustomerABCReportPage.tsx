import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Download, Filter, X, ArrowLeft } from "lucide-react";
import { companyService } from "../services/companyService";
import { Badge } from "./ui/badge";
import { Combobox } from "./ui/combobox";
import { api } from "../services/api";
import { toast } from "sonner@2.0.3";

type GroupBy = "none" | "grupo" | "vendedor" | "natureza";

interface CustomerABCFilters {
  dataInicio: string;
  dataFim: string;
  vendedorId: string;
  grupoRede: string;
  naturezaOperacaoId: string;
  uf: string;
  empresaEmitenteId: string;
  groupBy: GroupBy;
}

interface CustomerABCData {
  clienteId: string;
  grupoRede: string;
  nomeCliente: string;
  cnpj: string;
  uf: string;
  vendedor: string;
  valorTotal: number;
  percentual: number;
  percentualAcumulado: number;
  curvaABC: "A" | "B" | "C";
}

interface CustomerABCReportPageProps {
  onBack: () => void;
}

export function CustomerABCReportPage({ onBack }: CustomerABCReportPageProps) {
  // Estados de dados
  const [vendas, setVendas] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [naturezas, setNaturezas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar dados do Supabase
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      console.log('[ABC-CLIENTES-PAGE] Carregando dados da API...');
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
      console.log('[ABC-CLIENTES-PAGE] Dados carregados');
    } catch (error) {
      console.error('[ABC-CLIENTES-PAGE] Erro ao carregar dados:', error);
      setVendas([]);
      setClientes([]);
      setVendedores([]);
      setNaturezas([]);
      toast.error('Erro ao carregar dados da API.');
    } finally {
      setLoading(false);
    }
  };

  const [filters, setFilters] = useState<CustomerABCFilters>({
    dataInicio: "",
    dataFim: "",
    vendedorId: "all",
    grupoRede: "all",
    naturezaOperacaoId: "all",
    uf: "all",
    empresaEmitenteId: "all",
    groupBy: "none",
  });

  // Obter UFs únicas dos clientes
  const ufsDisponiveis = useMemo(() => {
    const ufs = new Set<string>();
    clientes.forEach(c => {
      if (c.uf) ufs.add(c.uf);
    });
    return Array.from(ufs).sort();
  }, []);

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

      // Filtro de UF
      if (filters.uf && filters.uf !== "all") {
        const cliente = clientes.find(c => c.id === venda.clienteId);
        if (cliente?.uf !== filters.uf) return false;
      }

      // Filtro de Empresa Emitente
      if (filters.empresaEmitenteId && filters.empresaEmitenteId !== "all" && venda.empresaFaturamentoId !== filters.empresaEmitenteId) {
        return false;
      }

      return true;
    });
  }, [vendas, filters, clientes]);

  // Calcular Curva ABC de Clientes
  const abcData = useMemo(() => {
    // Agrupar vendas por cliente
    const clientMap = new Map<string, { valor: number; vendedor: string }>();

    filteredSales.forEach((venda) => {
      const current = clientMap.get(venda.clienteId) || { valor: 0, vendedor: venda.nomeVendedor };
      clientMap.set(venda.clienteId, {
        valor: current.valor + venda.valorPedido,
        vendedor: venda.nomeVendedor,
      });
    });

    // Calcular total de vendas
    const totalVendas = Array.from(clientMap.values()).reduce((sum, item) => sum + item.valor, 0);

    // Criar array de clientes com dados
    const clientesData: CustomerABCData[] = Array.from(clientMap.entries()).map(([clienteId, data]) => {
      const cliente = clientes.find(c => c.id === clienteId);
      return {
        clienteId,
        grupoRede: cliente?.grupoRede || "-",
        nomeCliente: cliente?.razaoSocial || "Cliente Desconhecido",
        cnpj: cliente?.cpfCnpj || "-",
        uf: cliente?.uf || "-",
        vendedor: data.vendedor,
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
      acumulado += cliente.percentual;
      cliente.percentualAcumulado = acumulado;

      if (acumulado <= 80) {
        cliente.curvaABC = "A";
      } else if (acumulado <= 95) {
        cliente.curvaABC = "B";
      } else {
        cliente.curvaABC = "C";
      }
    });

    return clientesData;
  }, [filteredSales, clientes]);

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
  }, [clientes]);

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
    });
  };

  // Exportar para Excel
  const exportToExcel = () => {
    const headers = ["Grupo/Rede", "Cliente", "CNPJ", "UF", "Vendedor", "Curva ABC", "Valor Total", "% Participação", "% Acumulado"];
    const rows = abcData.map((cliente) => [
      cliente.grupoRede,
      cliente.nomeCliente,
      cliente.cnpj,
      cliente.uf,
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1>Curva ABC de Clientes</h1>
            <p className="text-muted-foreground">
              Análise de clientes por participação no faturamento do período
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
                {(filters.dataInicio || filters.dataFim || (filters.vendedorId && filters.vendedorId !== "all") || (filters.grupoRede && filters.grupoRede !== "all") || (filters.naturezaOperacaoId && filters.naturezaOperacaoId !== "all") || (filters.uf && filters.uf !== "all") || (filters.empresaEmitenteId && filters.empresaEmitenteId !== "all")) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Limpar Filtros
                  </Button>
                )}
              </div>

              {/* Linha 1: Datas + UF compactados, Vendedor (pesquisável) com largura flexível */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex flex-wrap gap-4">
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
                    <TableHead>UF</TableHead>
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
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        Nenhum cliente encontrado com os filtros selecionados
                      </TableCell>
                    </TableRow>
                  ) : (
                    groupedData.map((item, index) => {
                      if (item.isGroupHeader) {
                        const groupTotal = item.clientes.reduce((sum: number, c: any) => sum + c.valorTotal, 0);
                        return (
                          <TableRow key={`group-${index}`} className="bg-muted/50">
                            <TableCell colSpan={6} className="font-medium">
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
                          <TableCell>{cliente.uf}</TableCell>
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
      </div>
    </div>
  );
}