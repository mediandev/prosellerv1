import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Input } from "./ui/input";
import { api } from "../services/api";
import { format } from "date-fns@4.1.0";
import { ChevronLeft, ChevronRight, Download, DollarSign, TrendingUp, Wallet } from "lucide-react";
import { toSafeNumber, formatCurrencyBRL } from "../utils/number";

interface SellerCommissionsPageProps {
  period: string;
  onPeriodChange: (period: string) => void;
  customDateRange: { from: Date | undefined; to: Date | undefined };
  onCustomDateRangeChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
}

interface VendaComissao {
  id: string;
  dataVenda: string;
  ocCliente: string;
  clienteNome: string;
  valorTotalVenda: number;
  percentualComissao: number;
  valorComissao: number;
}

interface ResumoComissaoVendedor {
  periodo: string;
  totalVendas: number;
  totalComissao: number;
  totalCreditos: number;
  totalDebitos: number;
  totalPagos: number;
  saldoFinal: number;
  status: string;
}

const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const getCurrentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const normalizePeriod = (period: string) => {
  if (/^\d{4}-\d{2}$/.test(period)) return period;
  return getCurrentPeriod();
};

const parsePeriodInput = (value: string): string | null => {
  const normalized = value.trim();
  const match = normalized.match(/^(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const month = Number(match[1]);
  const year = Number(match[2]);
  if (month < 1 || month > 12 || year < 2000 || year > 2100) return null;
  return `${year}-${String(month).padStart(2, "0")}`;
};

const formatPeriodInput = (period: string) => {
  const [year, month] = period.split("-");
  if (!year || !month) return "";
  return `${month}/${year}`;
};

export function SellerCommissionsPage({
  period,
  onPeriodChange,
}: SellerCommissionsPageProps) {
  const { usuario } = useAuth();
  const normalizedPeriod = normalizePeriod(period);
  const [periodInput, setPeriodInput] = useState(formatPeriodInput(normalizedPeriod));
  const [loading, setLoading] = useState(false);
  const [vendas, setVendas] = useState<VendaComissao[]>([]);
  const [resumo, setResumo] = useState<ResumoComissaoVendedor | null>(null);

  useEffect(() => {
    if (period !== normalizedPeriod) {
      onPeriodChange(normalizedPeriod);
      return;
    }
    setPeriodInput(formatPeriodInput(normalizedPeriod));
  }, [period, normalizedPeriod, onPeriodChange]);

  useEffect(() => {
    const carregarComissoes = async () => {
      if (!usuario?.id) {
        setVendas([]);
        setResumo(null);
        return;
      }

      setLoading(true);
      try {
        const [vendasApi, relatorioApi] = await Promise.all([
          api.comissoes.getVendas(normalizedPeriod, usuario.id),
          api.comissoes.getRelatorio(normalizedPeriod, usuario.id),
        ]);

        const relatorioRow = Array.isArray(relatorioApi)
          ? relatorioApi.find((r: any) => String(r.vendedor_id || r.vendedorId) === usuario.id)
          : null;

        setResumo(
          relatorioRow
            ? {
                periodo: String(relatorioRow.periodo || normalizedPeriod),
                totalVendas: toSafeNumber(relatorioRow.total_vendas ?? relatorioRow.totalVendas, 0),
                totalComissao: toSafeNumber(relatorioRow.total_comissao ?? relatorioRow.totalComissao, 0),
                totalCreditos: toSafeNumber(relatorioRow.total_creditos ?? relatorioRow.totalCreditos, 0),
                totalDebitos: toSafeNumber(relatorioRow.total_debitos ?? relatorioRow.totalDebitos, 0),
                totalPagos: toSafeNumber(relatorioRow.total_pagos ?? relatorioRow.totalPagos, 0),
                saldoFinal: toSafeNumber(relatorioRow.saldo_final ?? relatorioRow.saldoFinal, 0),
                status: String(relatorioRow.status || "aberto"),
              }
            : null
        );

        const mapped = (Array.isArray(vendasApi) ? vendasApi : [])
          .filter((v: any) => String(v.vendedor_uuid || v.vendedorId || "") === usuario.id)
          .map((v: any) => {
            const valorTotalVenda = toSafeNumber(v.valor_total ?? v.valorTotalVenda, 0);
            const percentualComissao = toSafeNumber(v.percentual_comissao ?? v.percentualComissao, 0);
            const valorComissao =
              toSafeNumber(v.valor_comissao ?? v.valorComissao, NaN) ||
              Number(((valorTotalVenda * percentualComissao) / 100).toFixed(2));

            return {
              id: String(v.vendedor_comissao_id || v.id || crypto.randomUUID()),
              dataVenda: String(v.data_inicio || v.dataVenda || new Date().toISOString()),
              ocCliente: String(v.oc_cliente || v.ocCliente || ""),
              clienteNome: String(v.cliente_nome || v.clienteNome || "Cliente não informado"),
              valorTotalVenda,
              percentualComissao,
              valorComissao,
            };
          });

        if (mapped.length === 0 && relatorioRow) {
          setVendas([]);
        } else {
          setVendas(mapped);
        }
      } catch (error) {
        console.error("[SELLER-COMISSOES] Erro ao carregar comissões:", error);
        setVendas([]);
        setResumo(null);
      } finally {
        setLoading(false);
      }
    };

    carregarComissoes();
  }, [normalizedPeriod, usuario?.id]);

  const totais = useMemo(() => {
    const totalComissoesVendas = vendas.reduce((acc, item) => acc + toSafeNumber(item.valorComissao, 0), 0);
    const totalVendasLista = vendas.reduce((acc, item) => acc + toSafeNumber(item.valorTotalVenda, 0), 0);
    const percentualMedioLista = vendas.length
      ? vendas.reduce((acc, item) => acc + toSafeNumber(item.percentualComissao, 0), 0) / vendas.length
      : 0;

    const totalComissoes = resumo ? toSafeNumber(resumo.totalComissao, totalComissoesVendas) : totalComissoesVendas;
    const totalVendas = resumo ? toSafeNumber(resumo.totalVendas, totalVendasLista) : totalVendasLista;
    const percentualMedio = totalVendas > 0
      ? (totalComissoes / totalVendas) * 100
      : percentualMedioLista;

    return {
      totalComissoes,
      totalVendas,
      percentualMedio,
      totalCreditos: toSafeNumber(resumo?.totalCreditos, 0),
      totalDebitos: toSafeNumber(resumo?.totalDebitos, 0),
      totalPagos: toSafeNumber(resumo?.totalPagos, 0),
      saldoFinal: toSafeNumber(resumo?.saldoFinal, 0),
      status: resumo?.status || "aberto",
    };
  }, [vendas, resumo]);

  const periodLabel = useMemo(() => {
    const [year, month] = normalizedPeriod.split("-").map(Number);
    const monthName = meses[(month || 1) - 1];
    return `${monthName}/${year}`;
  }, [normalizedPeriod]);

  const alterarMes = (delta: number) => {
    const [year, month] = normalizedPeriod.split("-").map(Number);
    const base = new Date(year, (month || 1) - 1, 1);
    base.setMonth(base.getMonth() + delta);
    const next = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}`;
    onPeriodChange(next);
  };

  const aplicarPeriodoDigitado = () => {
    const parsed = parsePeriodInput(periodInput);
    if (!parsed) {
      setPeriodInput(formatPeriodInput(normalizedPeriod));
      return;
    }
    onPeriodChange(parsed);
  };

  const exportarCSV = () => {
    const headers = ["Data Venda", "OC Cliente", "Cliente", "Valor Venda", "% Comissão", "Valor Comissão"];
    const rows = vendas.map((venda) => [
      format(new Date(venda.dataVenda), "dd/MM/yyyy"),
      venda.ocCliente,
      venda.clienteNome,
      venda.valorTotalVenda.toFixed(2),
      venda.percentualComissao.toFixed(2),
      venda.valorComissao.toFixed(2),
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `minhas-comissoes-${normalizedPeriod}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Período</label>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" onClick={() => alterarMes(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input
              value={periodInput}
              onChange={(e) => setPeriodInput(e.target.value)}
              onBlur={aplicarPeriodoDigitado}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  aplicarPeriodoDigitado();
                }
              }}
              className="w-32 text-center"
              placeholder="MM/AAAA"
            />
            <Button type="button" variant="outline" size="icon" onClick={() => alterarMes(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{periodLabel}</p>
        </div>

        <Button onClick={exportarCSV} variant="outline" className="gap-2 ml-auto">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Comissões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">{formatCurrencyBRL(totais.totalComissoes)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{vendas.length} vendas no período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor Total Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-2xl font-bold text-blue-600">{formatCurrencyBRL(totais.totalVendas)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total de vendas realizadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">% Comissão Média</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold text-green-600">{totais.percentualMedio.toFixed(2)}%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Percentual médio de comissão</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Créditos</p>
              <p className="font-semibold">{formatCurrencyBRL(totais.totalCreditos)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Débitos</p>
              <p className="font-semibold">{formatCurrencyBRL(totais.totalDebitos)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pagos</p>
              <p className="font-semibold">{formatCurrencyBRL(totais.totalPagos)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saldo Final</p>
              <p className="font-semibold">{formatCurrencyBRL(totais.saldoFinal)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="font-semibold capitalize">{totais.status}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Minhas Comissões</CardTitle>
          <CardDescription>Acompanhe todas as suas comissões por venda realizada</CardDescription>
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
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Carregando comissões...
                    </TableCell>
                  </TableRow>
                ) : vendas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhuma comissão encontrada para o período selecionado
                    </TableCell>
                  </TableRow>
                ) : (
                  vendas.map((comissao) => (
                    <TableRow key={comissao.id}>
                      <TableCell>{format(new Date(comissao.dataVenda), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="font-medium">{comissao.ocCliente}</TableCell>
                      <TableCell>{comissao.clienteNome}</TableCell>
                      <TableCell className="text-right">{formatCurrencyBRL(comissao.valorTotalVenda)}</TableCell>
                      <TableCell className="text-right">{comissao.percentualComissao.toFixed(2)}%</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrencyBRL(comissao.valorComissao)}</TableCell>
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
