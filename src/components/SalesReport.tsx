import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Download, Filter, X } from "lucide-react";
import { mockVendas } from "../data/mockVendas";
import { mockSellers } from "../data/mockSellers";
import { clientes } from "../data/mockCustomers";
import { mockNaturezasOperacao } from "../data/mockNaturezasOperacao";
import { Badge } from "./ui/badge";

type GroupBy = "none" | "cliente" | "grupo" | "vendedor" | "natureza";

interface SalesFilters {
  dataInicio: string;
  dataFim: string;
  vendedorId: string;
  clienteId: string;
  naturezaOperacaoId: string;
  groupBy: GroupBy;
}

export function SalesReport() {
  const [filters, setFilters] = useState<SalesFilters>({
    dataInicio: "",
    dataFim: "",
    vendedorId: "all",
    clienteId: "all",
    naturezaOperacaoId: "all",
    groupBy: "none",
  });

  // Filtrar vendas
  const filteredSales = useMemo(() => {
    return mockVendas.filter((venda) => {
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

      // Filtro de cliente
      if (filters.clienteId && filters.clienteId !== "all" && venda.clienteId !== filters.clienteId) {
        return false;
      }

      // Filtro de natureza de operação
      if (filters.naturezaOperacaoId && filters.naturezaOperacaoId !== "all" && venda.naturezaOperacaoId !== filters.naturezaOperacaoId) {
        return false;
      }

      return true;
    });
  }, [filters]);

  // Agrupar vendas
  const groupedSales = useMemo(() => {
    if (filters.groupBy === "none") {
      return filteredSales;
    }

    const groups = new Map<string, Venda[]>();
    
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
          // 🆕 CORRIGIDO: Buscar vendedor por ID, não por nome
          const vendedor = mockSellers.find(v => v.id === venda.vendedorId);
          groupKey = vendedor?.nome || venda.nomeVendedor || "Vendedor não identificado";
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
  }, [filteredSales, filters.groupBy, clientes, mockSellers]);

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
      groupBy: "none",
    });
  };

  // Exportar para Excel
  const exportToExcel = () => {
    const headers = ["Data", "ID da Venda", "OC Cliente", "Grupo/Rede", "Cliente", "Natureza Operação", "Valor Total"];
    const rows = filteredSales.map((venda) => {
      const cliente = clientes.find(c => c.id === venda.clienteId);
      return [
        venda.dataPedido.toLocaleDateString('pt-BR'),
        venda.id,
        venda.ordemCompraCliente || "-",
        cliente?.grupoRede || "-",
        venda.nomeCliente,
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
    <Card>
      <CardHeader>
        <CardTitle>Relatório de Vendas</CardTitle>
        <p className="text-sm text-muted-foreground">
          Relação de vendas com filtros personalizados e opções de agrupamento
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
            {(filters.dataInicio || filters.dataFim || (filters.vendedorId && filters.vendedorId !== "all") || (filters.clienteId && filters.clienteId !== "all") || (filters.naturezaOperacaoId && filters.naturezaOperacaoId !== "all")) && (
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
                  {mockSellers.map((seller) => (
                    <SelectItem key={seller.id} value={seller.id}>
                      {seller.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cliente */}
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={filters.clienteId} onValueChange={(value) => setFilters({ ...filters, clienteId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {clientes.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.razaoSocial}
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
                  {mockNaturezasOperacao.map((natureza) => (
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>ID da Venda</TableHead>
                <TableHead>OC Cliente</TableHead>
                <TableHead>Grupo/Rede</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Natureza Operação</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhuma venda encontrada com os filtros selecionados
                  </TableCell>
                </TableRow>
              ) : (
                groupedSales.map((item, index) => {
                  if (item.isGroupHeader) {
                    const groupTotal = item.vendas.reduce((sum: number, v: any) => sum + v.valorPedido, 0);
                    return (
                      <TableRow key={`group-${index}`} className="bg-muted/50">
                        <TableCell colSpan={6} className="font-medium">
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

                  return (
                    <TableRow key={venda.id}>
                      <TableCell>{venda.dataPedido.toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="font-mono text-sm">{venda.id}</TableCell>
                      <TableCell>{venda.ordemCompraCliente || "-"}</TableCell>
                      <TableCell>{cliente?.grupoRede || "-"}</TableCell>
                      <TableCell>{venda.nomeCliente}</TableCell>
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
        </div>
      </CardContent>
    </Card>
  );
}