import { useState, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { format } from "date-fns@4.1.0";
import { ptBR } from "date-fns@4.1.0/locale";
import { Calendar as CalendarIcon, Download, DollarSign, TrendingUp, Wallet, CheckCircle2, AlertCircle } from "lucide-react";
import { mockComissoesVendas } from "../data/mockComissoes";
import { ComissaoVenda } from "../types/comissao";
import { cn } from "./ui/utils";

interface SellerCommissionsPageProps {
  period: string;
  onPeriodChange: (period: string) => void;
  customDateRange: { from: Date | undefined; to: Date | undefined };
  onCustomDateRangeChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
}

export function SellerCommissionsPage({
  period,
  onPeriodChange,
  customDateRange,
  onCustomDateRangeChange,
}: SellerCommissionsPageProps) {
  const { usuario } = useAuth();

  // Filtrar comissões do vendedor logado
  const minhasComissoes = useMemo(() => {
    if (!usuario) return [];
    return mockComissoesVendas.filter(c => c.vendedorId === usuario.id);
  }, [usuario]);

  // Filtrar por status - Como ComissaoVenda não tem status, filtrar por todas
  const comissoesFiltradas = useMemo(() => {
    return minhasComissoes;
  }, [minhasComissoes]);

  // Calcular totais - Para vendedor, todas as comissões são consideradas aprovadas
  const totais = useMemo(() => {
    const total = minhasComissoes.reduce((acc, c) => acc + c.valorComissao, 0);
    
    return { 
      total, 
      aprovadas: total, // Todas aprovadas por padrão
      pendentes: 0, 
      pagas: 0 
    };
  }, [minhasComissoes]);

  const exportarCSV = () => {
    const headers = ["Data Venda", "OC Cliente", "Cliente", "Valor Venda", "% Comissão", "Valor Comissão"];
    const rows = comissoesFiltradas.map(c => [
      format(new Date(c.dataVenda), "dd/MM/yyyy"),
      c.ocCliente,
      c.clienteNome,
      c.valorTotalVenda.toFixed(2),
      c.percentualComissao.toFixed(2),
      c.valorComissao.toFixed(2)
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `minhas-comissoes-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium mb-2 block">Período</label>
          <Select value={period} onValueChange={onPeriodChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">Mês Atual</SelectItem>
              <SelectItem value="last_month">Mês Anterior</SelectItem>
              <SelectItem value="current_quarter">Trimestre Atual</SelectItem>
              <SelectItem value="current_year">Ano Atual</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Último Ano</SelectItem>
              <SelectItem value="custom">Período Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {period === "custom" && (
          <>
            <div>
              <label className="text-sm font-medium mb-2 block">Data Início</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal", !customDateRange.from && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customDateRange.from ? format(customDateRange.from, "dd/MM/yyyy") : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customDateRange.from}
                    onSelect={(date) => onCustomDateRangeChange({ ...customDateRange, from: date })}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Data Fim</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal", !customDateRange.to && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customDateRange.to ? format(customDateRange.to, "dd/MM/yyyy") : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customDateRange.to}
                    onSelect={(date) => onCustomDateRangeChange({ ...customDateRange, to: date })}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </>
        )}

        <Button onClick={exportarCSV} variant="outline" className="gap-2 ml-auto">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Comissões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">
                {totais.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {minhasComissoes.length} vendas no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor Total Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-2xl font-bold text-blue-600">
                {minhasComissoes.reduce((acc, c) => acc + c.valorTotalVenda, 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de vendas realizadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">% Comissão Média</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold text-green-600">
                {minhasComissoes.length > 0 
                  ? (minhasComissoes.reduce((acc, c) => acc + c.percentualComissao, 0) / minhasComissoes.length).toFixed(2)
                  : 0}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Percentual médio de comissão
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Comissões */}
      <Card>
        <CardHeader>
          <CardTitle>Minhas Comissões</CardTitle>
          <CardDescription>
            Acompanhe todas as suas comissões por venda realizada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Venda</TableHead>
                  <TableHead>OC Cliente</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Valor Venda</TableHead>
                  <TableHead className="text-right">% Comissão</TableHead>
                  <TableHead className="text-right">Valor Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comissoesFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhuma comissão encontrada para o período selecionado
                    </TableCell>
                  </TableRow>
                ) : (
                  comissoesFiltradas.map((comissao) => (
                    <TableRow key={comissao.id}>
                      <TableCell>{format(new Date(comissao.dataVenda), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="font-medium">{comissao.ocCliente}</TableCell>
                      <TableCell>{comissao.clienteNome}</TableCell>
                      <TableCell className="text-right">
                        {comissao.valorTotalVenda.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </TableCell>
                      <TableCell className="text-right">{comissao.percentualComissao.toFixed(2)}%</TableCell>
                      <TableCell className="text-right font-medium">
                        {comissao.valorComissao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
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
  );
}
