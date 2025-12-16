import { toast } from "sonner@2.0.3";
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

interface ProductABCFilters {
  dataInicio: string;
  dataFim: string;
  uf: string;
  empresaEmitenteId: string;
  vendedorId: string;
  clienteId: string;
}

interface ProductABCData {
  produtoId: string;
  codigoSku: string;
  descricaoProduto: string;
  quantidadeTotal: number;
  valorTotal: number;
  percentual: number;
  percentualAcumulado: number;
  curvaABC: "A" | "B" | "C";
}

interface ProductABCReportPageProps {
  onBack: () => void;
}

export function ProductABCReportPage({ onBack }: ProductABCReportPageProps) {
  // Estados de dados
  const [vendas, setVendas] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar dados do Supabase
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      console.log('[ABC-PRODUTOS-PAGE] Carregando dados da API...');
      const [vendasAPI, clientesAPI, vendedoresAPI] = await Promise.all([
        api.get('vendas'),
        api.get('clientes'),
        api.get('vendedores'),
      ]);
      
      setVendas(Array.isArray(vendasAPI) ? vendasAPI : []);
      setClientes(Array.isArray(clientesAPI) ? clientesAPI : []);
      setVendedores(Array.isArray(vendedoresAPI) ? vendedoresAPI : []);
      console.log('[ABC-PRODUTOS-PAGE] Dados carregados');
    } catch (error) {
      console.error('[ABC-PRODUTOS-PAGE] Erro ao carregar dados:', error);
      setVendas([]);
      setClientes([]);
      setVendedores([]);
      toast.error('Erro ao carregar dados da API.');
    } finally {
      setLoading(false);
    }
  };

  const [filters, setFilters] = useState<ProductABCFilters>({
    dataInicio: "",
    dataFim: "",
    uf: "all",
    empresaEmitenteId: "all",
    vendedorId: "all",
    clienteId: "all",
  });

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
        if (venda.dataPedido < dataInicio) return false;
      }

      // Filtro de data fim
      if (filters.dataFim) {
        const dataFim = new Date(filters.dataFim);
        if (venda.dataPedido > dataFim) return false;
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

      // Filtro de Vendedor
      if (filters.vendedorId && filters.vendedorId !== "all" && venda.vendedorId !== filters.vendedorId) {
        return false;
      }

      // Filtro de Cliente
      if (filters.clienteId && filters.clienteId !== "all" && venda.clienteId !== filters.clienteId) {
        return false;
      }

      return true;
    });
  }, [filters, vendas, clientes]);

  // Calcular Curva ABC de Produtos
  const abcData = useMemo(() => {
    // Agrupar itens por produto
    const productMap = new Map<string, { 
      codigoSku: string;
      descricao: string; 
      quantidade: number; 
      valor: number;
    }>();

    filteredSales.forEach((venda) => {
      venda.itens.forEach((item) => {
        const current = productMap.get(item.produtoId) || { 
          codigoSku: item.codigoSku,
          descricao: item.descricaoProduto,
          quantidade: 0, 
          valor: 0 
        };
        productMap.set(item.produtoId, {
          codigoSku: item.codigoSku,
          descricao: item.descricaoProduto,
          quantidade: current.quantidade + item.quantidade,
          valor: current.valor + item.subtotal,
        });
      });
    });

    // Calcular total de vendas
    const totalVendas = Array.from(productMap.values()).reduce((sum, item) => sum + item.valor, 0);

    // Criar array de produtos com dados
    const produtosData: ProductABCData[] = Array.from(productMap.entries()).map(([produtoId, data]) => {
      return {
        produtoId,
        codigoSku: data.codigoSku,
        descricaoProduto: data.descricao,
        quantidadeTotal: data.quantidade,
        valorTotal: data.valor,
        percentual: totalVendas > 0 ? (data.valor / totalVendas) * 100 : 0,
        percentualAcumulado: 0,
        curvaABC: "C",
      };
    });

    // Ordenar por valor decrescente
    produtosData.sort((a, b) => b.valorTotal - a.valorTotal);

    // Calcular percentual acumulado e classificar curva ABC
    let acumulado = 0;
    produtosData.forEach((produto) => {
      acumulado += produto.percentual;
      produto.percentualAcumulado = acumulado;

      if (acumulado <= 80) {
        produto.curvaABC = "A";
      } else if (acumulado <= 95) {
        produto.curvaABC = "B";
      } else {
        produto.curvaABC = "C";
      }
    });

    return produtosData;
  }, [filteredSales]);

  // Calcular totais
  const totals = useMemo(() => {
    return abcData.reduce(
      (acc, produto) => ({
        produtos: acc.produtos + 1,
        quantidade: acc.quantidade + produto.quantidadeTotal,
        valor: acc.valor + produto.valorTotal,
      }),
      { produtos: 0, quantidade: 0, valor: 0 }
    );
  }, [abcData]);

  // Calcular estatísticas por curva
  const curvaStats = useMemo(() => {
    const stats = {
      A: { produtos: 0, valor: 0 },
      B: { produtos: 0, valor: 0 },
      C: { produtos: 0, valor: 0 },
    };

    abcData.forEach((produto) => {
      stats[produto.curvaABC].produtos++;
      stats[produto.curvaABC].valor += produto.valorTotal;
    });

    return stats;
  }, [abcData]);

  // Limpar filtros
  const clearFilters = () => {
    setFilters({
      dataInicio: "",
      dataFim: "",
      uf: "all",
      empresaEmitenteId: "all",
      vendedorId: "all",
      clienteId: "all",
    });
  };

  // Exportar para Excel
  const exportToExcel = () => {
    const headers = ["Código SKU", "Descrição do Produto", "Quantidade Total", "Valor Total", "Curva ABC", "% Participação", "% Acumulado"];
    const rows = abcData.map((produto) => [
      produto.codigoSku,
      produto.descricaoProduto,
      produto.quantidadeTotal.toString(),
      `R$ ${produto.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      produto.curvaABC,
      `${produto.percentual.toFixed(2)}%`,
      `${produto.percentualAcumulado.toFixed(2)}%`,
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.join(";"))
      .join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `curva-abc-produtos-${new Date().toISOString().split('T')[0]}.csv`;
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
            <h1>Curva ABC de Produtos</h1>
            <p className="text-muted-foreground">
              Análise de produtos por participação no faturamento do período
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
                {(filters.dataInicio || filters.dataFim || (filters.uf && filters.uf !== "all") || (filters.empresaEmitenteId && filters.empresaEmitenteId !== "all") || (filters.vendedorId && filters.vendedorId !== "all") || (filters.clienteId && filters.clienteId !== "all")) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Limpar Filtros
                  </Button>
                )}
              </div>

              {/* Linha 1: Datas + UF compactados, Empresa Emitente com largura flexível */}
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
              </div>

              {/* Linha 2: Cliente e Vendedor com largura ampliada */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
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

                <div className="space-y-2">
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
            </div>

            {/* Estatísticas por Curva */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Curva A</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {curvaStats.A.produtos}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {totals.produtos > 0 ? ((curvaStats.A.produtos / totals.produtos) * 100).toFixed(1) : 0}% dos produtos
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">
                        R$ {(curvaStats.A.valor / 1000).toFixed(1)}k
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ~80% do faturamento
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Curva B</p>
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        {curvaStats.B.produtos}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {totals.produtos > 0 ? ((curvaStats.B.produtos / totals.produtos) * 100).toFixed(1) : 0}% dos produtos
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                        R$ {(curvaStats.B.valor / 1000).toFixed(1)}k
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ~15% do faturamento
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Curva C</p>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {curvaStats.C.produtos}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {totals.produtos > 0 ? ((curvaStats.C.produtos / totals.produtos) * 100).toFixed(1) : 0}% dos produtos
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-red-600 dark:text-red-400">
                        R$ {(curvaStats.C.valor / 1000).toFixed(1)}k
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ~5% do faturamento
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Resumo e Ações */}
            <div className="flex items-center justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{totals.produtos}</span> produtos • 
                <span className="font-medium text-foreground ml-1">{totals.quantidade}</span> unidades vendidas • 
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
                    <TableHead>Código SKU</TableHead>
                    <TableHead>Descrição do Produto</TableHead>
                    <TableHead className="text-right">Qtd. Total</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead>Curva ABC</TableHead>
                    <TableHead className="text-right">% Participação</TableHead>
                    <TableHead className="text-right">% Acumulado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {abcData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhum produto encontrado com os filtros selecionados
                      </TableCell>
                    </TableRow>
                  ) : (
                    abcData.map((produto) => (
                      <TableRow key={produto.produtoId}>
                        <TableCell className="font-mono text-sm">{produto.codigoSku}</TableCell>
                        <TableCell>{produto.descricaoProduto}</TableCell>
                        <TableCell className="text-right">{produto.quantidadeTotal}</TableCell>
                        <TableCell className="text-right font-medium">
                          R$ {produto.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getCurvaColor(produto.curvaABC)}>
                            Curva {produto.curvaABC}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {produto.percentual.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right">
                          {produto.percentualAcumulado.toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    ))
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