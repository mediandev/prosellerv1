import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Download, Filter, X } from "lucide-react";
import { Badge } from "./ui/badge";
import { api } from "../services/api";
import { toast } from "sonner@2.0.3";

interface ProductABCFilters {
  dataInicio: string;
  dataFim: string;
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

export function ProductABCReport() {
  const [filters, setFilters] = useState<ProductABCFilters>({
    dataInicio: "",
    dataFim: "",
  });

  const [salesData, setSalesData] = useState([]);

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        const response = await api.get('vendas');
        setSalesData(Array.isArray(response) ? response : []);
      } catch (error) {
        console.error('[ABC-PRODUTOS] Erro ao carregar vendas:', error);
        setSalesData([]);
        toast.error("Erro ao carregar dados de vendas da API.");
      }
    };

    fetchSalesData();
  }, []);

  // Filtrar vendas
  const filteredSales = useMemo(() => {
    return salesData.filter((venda) => {
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

      return true;
    });
  }, [filters, salesData]);

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
    <Card>
      <CardHeader>
        <CardTitle>Curva ABC de Produtos</CardTitle>
        <p className="text-sm text-muted-foreground">
          Análise de produtos por participação no faturamento do período
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
            {(filters.dataInicio || filters.dataFim) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
  );
}