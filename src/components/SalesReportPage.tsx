import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Download, Filter, X, ArrowLeft } from "lucide-react";
import { Badge } from "./ui/badge";
import { Combobox } from "./ui/combobox";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

type GroupBy = "none" | "cliente" | "grupo" | "vendedor" | "natureza";

interface SalesFilters {
  dataInicio: string;
  dataFim: string;
  vendedorId: string;
  clienteId: string;
  naturezaOperacaoId: string;
  uf: string;
  empresaEmitenteId: string;
  groupBy: GroupBy;
}

interface SalesReportPageProps {
  onBack: () => void;
}

export function SalesReportPage({ onBack }: SalesReportPageProps) {
  const { user } = useAuth();
  
  const [filters, setFilters] = useState<SalesFilters>({
    dataInicio: "",
    dataFim: "",
    vendedorId: "all",
    clienteId: "all",
    naturezaOperacaoId: "all",
    uf: "all",
    empresaEmitenteId: "all",
    groupBy: "none",
  });

  const [vendas, setVendas] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [naturezasOperacao, setNaturezasOperacao] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Buscar dados da API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('[SalesReportPage] Iniciando busca de dados...');
        
        // Buscar cada endpoint individualmente para identificar qual está falhando
        let vendasData: any[] = [];
        let vendedoresData: any[] = [];
        let clientesData: any[] = [];
        let naturezasData: any[] = [];
        let empresasData: any[] = [];
        
        try {
          console.log('[SalesReportPage] Buscando vendas...');
          vendasData = await api.get('vendas');
          console.log('[SalesReportPage] Vendas recebidas:', vendasData?.length || 0);
        } catch (error) {
          console.error('[SalesReportPage] Erro ao buscar vendas:', error);
          vendasData = [];
        }
        
        try {
          console.log('[SalesReportPage] Buscando vendedores...');
          vendedoresData = await api.get('vendedores');
          console.log('[SalesReportPage] Vendedores recebidos:', vendedoresData?.length || 0);
        } catch (error) {
          console.error('[SalesReportPage] Erro ao buscar vendedores:', error);
          vendedoresData = [];
        }
        
        try {
          console.log('[SalesReportPage] Buscando clientes...');
          clientesData = await api.get('clientes');
          console.log('[SalesReportPage] Clientes recebidos:', clientesData?.length || 0);
        } catch (error) {
          console.error('[SalesReportPage] Erro ao buscar clientes:', error);
          clientesData = [];
        }
        
        try {
          console.log('[SalesReportPage] Buscando naturezas de operação...');
          naturezasData = await api.get('naturezas-operacao');
          console.log('[SalesReportPage] Naturezas recebidas:', naturezasData?.length || 0);
        } catch (error) {
          console.error('[SalesReportPage] Erro ao buscar naturezas:', error);
          naturezasData = [];
        }
        
        try {
          console.log('[SalesReportPage] Buscando empresas...');
          empresasData = await api.get('empresas');
          console.log('[SalesReportPage] Empresas recebidas:', empresasData?.length || 0);
        } catch (error) {
          console.error('[SalesReportPage] Erro ao buscar empresas:', error);
          empresasData = [];
        }
        
        setVendas(vendasData || []);
        setVendedores(vendedoresData || []);
        setClientes(clientesData || []);
        setNaturezasOperacao(naturezasData || []);
        setEmpresas(empresasData || []);
        
        console.log('[SalesReportPage] Dados finais configurados:', {
          vendas: vendasData?.length || 0,
          vendedores: vendedoresData?.length || 0,
          clientes: clientesData?.length || 0,
          naturezas: naturezasData?.length || 0,
          empresas: empresasData?.length || 0
        });
      } catch (error) {
        console.error('[SalesReportPage] Erro geral ao buscar dados:', error);
        setVendas([]);
        setVendedores([]);
        setClientes([]);
        setNaturezasOperacao([]);
        setEmpresas([]);
      } finally {
        setLoading(false);
        console.log('[SalesReportPage] Carregamento finalizado');
      }
    };

    // Executa mesmo sem user para não travar na tela de loading
    fetchData();
  }, []);

  // Obter UFs únicas dos clientes
  const ufsDisponiveis = useMemo(() => {
    const ufs = new Set<string>();
    clientes.forEach(c => {
      if (c.uf) ufs.add(c.uf);
    });
    return Array.from(ufs).sort();
  }, [clientes]);

  // Filtrar vendas
  const filteredSales = useMemo(() => {
    return vendas.filter((venda) => {
      // Filtro de data início
      if (filters.dataInicio) {
        const dataInicio = new Date(filters.dataInicio);
        const vendaData = new Date(venda.dataPedido);
        if (vendaData < dataInicio) return false;
      }

      // Filtro de data fim
      if (filters.dataFim) {
        const dataFim = new Date(filters.dataFim);
        const vendaData = new Date(venda.dataPedido);
        if (vendaData > dataFim) return false;
      }

      // Filtro de vendedor
      if (filters.vendedorId && filters.vendedorId !== "all" && venda.vendedorId !== filters.vendedorId) {
        return false;
      }

      // Filtro de cliente
      if (filters.clienteId && filters.clienteId !== "all" && venda.clienteId !== filters.clienteId) {
        return false;
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
  }, [filters, vendas, clientes]);

  // Agrupar vendas
  const groupedSales = useMemo(() => {
    if (filters.groupBy === "none") {
      return filteredSales;
    }

    const groups = new Map<string, typeof filteredSales>();

    filteredSales.forEach((venda) => {
      let groupKey = "";
      
      switch (filters.groupBy) {
        case "cliente":
          groupKey = venda.nomeCliente;
          break;
        case "grupo":
          const cliente = clientes.find(c => c.id === venda.clienteId);
          groupKey = cliente?.grupoRede || "Sem Grupo";
          break;
        case "vendedor":
          groupKey = venda.nomeVendedor;
          break;
        case "natureza":
          groupKey = venda.nomeNaturezaOperacao;
          break;
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(venda);
    });

    return Array.from(groups.entries()).flatMap(([groupName, vendas]) => {
      return [
        { isGroupHeader: true, groupName, vendas } as any,
        ...vendas,
      ];
    });
  }, [filteredSales, filters.groupBy, clientes]);

  // Calcular totais
  const totals = useMemo(() => {
    return filteredSales.reduce(
      (acc, venda) => ({
        quantidade: acc.quantidade + 1,
        valor: acc.valor + venda.valorPedido,
      }),
      { quantidade: 0, valor: 0 }
    );
  }, [filteredSales]);

  // Limpar filtros
  const clearFilters = () => {
    setFilters({
      dataInicio: "",
      dataFim: "",
      vendedorId: "all",
      clienteId: "all",
      naturezaOperacaoId: "all",
      uf: "all",
      empresaEmitenteId: "all",
      groupBy: "none",
    });
  };

  // Exportar para Excel
  const exportToExcel = () => {
    const headers = ["Data", "ID da Venda", "OC Cliente", "Grupo/Rede", "Cliente", "CNPJ", "UF", "Empresa Emitente", "Natureza Operação", "Valor Total"];
    const rows = filteredSales.map((venda) => {
      const cliente = clientes.find(c => c.id === venda.clienteId);
      return [
        venda.dataPedido.toLocaleDateString('pt-BR'),
        venda.id,
        venda.ordemCompraCliente || "-",
        cliente?.grupoRede || "-",
        venda.nomeCliente,
        cliente?.cpfCnpj || "-",
        cliente?.uf || "-",
        venda.nomeEmpresaFaturamento,
        venda.nomeNaturezaOperacao,
        `R$ ${venda.valorPedido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.join(";"))
      .join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-vendas-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
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
            <h1>Relatório de Vendas</h1>
            <p className="text-muted-foreground">
              Relação de vendas com filtros personalizados e opões de agrupamento
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
                {(filters.dataInicio || filters.dataFim || (filters.vendedorId && filters.vendedorId !== "all") || (filters.clienteId && filters.clienteId !== "all") || (filters.naturezaOperacaoId && filters.naturezaOperacaoId !== "all") || (filters.uf && filters.uf !== "all") || (filters.empresaEmitenteId && filters.empresaEmitenteId !== "all")) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Limpar Filtros
                  </Button>
                )}
              </div>

              {/* Linha 1: Datas + UF compactados, Cliente (pesquisável) com largura flexível */}
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
                        <SelectItem value="all">Todas</SelectItem>
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
                  <Label>Cliente</Label>
                  <Combobox
                    options={[
                      { value: "all", label: "Todos os clientes" },
                      ...clientes.map((customer) => ({
                        value: customer.id,
                        label: customer.razaoSocial,
                      })),
                    ]}
                    value={filters.clienteId}
                    onValueChange={(value) => setFilters({ ...filters, clienteId: value || "all" })}
                    placeholder="Todos os clientes"
                    searchPlaceholder="Pesquisar cliente..."
                    emptyText="Nenhum cliente encontrado."
                  />
                </div>
              </div>

              {/* Linha 2: Vendedor, Natureza de Operação, Empresa Emitente, Agrupar Por */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
                <div className="space-y-2 lg:col-span-3">
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

                <div className="space-y-2 lg:col-span-3">
                  <Label>Natureza de Operação</Label>
                  <Select value={filters.naturezaOperacaoId} onValueChange={(value) => setFilters({ ...filters, naturezaOperacaoId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as naturezas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as naturezas</SelectItem>
                      {naturezasOperacao.map((natureza) => (
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
                      <SelectItem value="all">Todas as empresas</SelectItem>
                      {empresas.map((company) => (
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
                      <SelectItem value="none">Sem agrupamento</SelectItem>
                      <SelectItem value="cliente">Cliente</SelectItem>
                      <SelectItem value="grupo">Grupo/Rede</SelectItem>
                      <SelectItem value="vendedor">Vendedor</SelectItem>
                      <SelectItem value="natureza">Natureza de Operação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Resumo e Ações */}
            <div className="flex items-center justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{totals.quantidade}</span> vendas encontradas • 
                <span className="font-medium text-foreground ml-1">
                  R$ {totals.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <Button onClick={exportToExcel} disabled={filteredSales.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
            </div>

            {/* Tabela */}
            <div className="border rounded-lg">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">
                  Carregando dados...
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>ID da Venda</TableHead>
                      <TableHead>OC Cliente</TableHead>
                      <TableHead>Grupo/Rede</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>UF</TableHead>
                      <TableHead>Empresa Emitente</TableHead>
                      <TableHead>Natureza Operação</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedSales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                          Nenhuma venda encontrada com os filtros selecionados
                        </TableCell>
                      </TableRow>
                    ) : (
                      groupedSales.map((item, index) => {
                        if (item.isGroupHeader) {
                          const groupTotal = item.vendas.reduce((sum: number, v: any) => sum + v.valorPedido, 0);
                          return (
                            <TableRow key={`group-${index}`} className="bg-muted/50">
                              <TableCell colSpan={9} className="font-medium">
                                {item.groupName} ({item.vendas.length} vendas)
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                R$ {groupTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          );
                        }

                        const venda = item;
                        const cliente = clientes.find(c => c.id === venda.clienteId);
                        const vendaData = new Date(venda.dataPedido);

                        return (
                          <TableRow key={venda.id}>
                            <TableCell>{vendaData.toLocaleDateString('pt-BR')}</TableCell>
                            <TableCell className="font-mono text-sm">{venda.id}</TableCell>
                            <TableCell>{venda.ordemCompraCliente || "-"}</TableCell>
                            <TableCell>{cliente?.grupoRede || "-"}</TableCell>
                            <TableCell>{venda.nomeCliente}</TableCell>
                            <TableCell className="font-mono text-sm">{cliente?.cpfCnpj || "-"}</TableCell>
                            <TableCell>{cliente?.uf || "-"}</TableCell>
                            <TableCell>{venda.nomeEmpresaFaturamento}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{venda.nomeNaturezaOperacao}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              R$ {venda.valorPedido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}