import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { TrendingUp, TrendingDown, Minus, Loader2, DollarSign, Package, Calendar } from 'lucide-react';
import { api } from '../services/api';
import { CustomerIndicators } from '../types/customerIndicators';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface CustomerIndicatorsTabProps {
  clienteId: string;
}

const createEmptyIndicators = (clienteId: string): CustomerIndicators => ({
  clienteId,
  roi: {
    investimento: 0,
    receita: 0,
    percentual: 0,
  },
  mix: {
    totalDisponivel: 0,
    totalAtivo: 0,
    percentual: 0,
    variacaoMesAnterior: 0,
  },
  ltv: {
    totalReceita: 0,
    totalPedidos: 0,
  },
  performance: {
    monthlyData: [],
    quarterlyData: [],
    averageLast12Months: 0,
  },
});

const normalizeIndicators = (payload: any, clienteId: string): CustomerIndicators => {
  const base = createEmptyIndicators(clienteId);

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return base;
  }

  return {
    clienteId: String(payload.clienteId || clienteId),
    roi: {
      investimento: Number(payload?.roi?.investimento || 0),
      receita: Number(payload?.roi?.receita || 0),
      percentual: Number(payload?.roi?.percentual || 0),
    },
    mix: {
      totalDisponivel: Number(payload?.mix?.totalDisponivel || 0),
      totalAtivo: Number(payload?.mix?.totalAtivo || 0),
      percentual: Number(payload?.mix?.percentual || 0),
      variacaoMesAnterior: Number(payload?.mix?.variacaoMesAnterior || 0),
    },
    ltv: {
      totalReceita: Number(payload?.ltv?.totalReceita || 0),
      totalPedidos: Number(payload?.ltv?.totalPedidos || 0),
      primeiroPedido: payload?.ltv?.primeiroPedido,
      ultimoPedido: payload?.ltv?.ultimoPedido,
    },
    performance: {
      monthlyData: Array.isArray(payload?.performance?.monthlyData) ? payload.performance.monthlyData : [],
      quarterlyData: Array.isArray(payload?.performance?.quarterlyData) ? payload.performance.quarterlyData : [],
      averageLast12Months: Number(payload?.performance?.averageLast12Months || 0),
    },
  };
};

export function CustomerIndicatorsTab({ clienteId }: CustomerIndicatorsTabProps) {
  const [indicators, setIndicators] = useState<CustomerIndicators | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIndicators();
  }, [clienteId]);

  const loadIndicators = async () => {
    setLoading(true);
    try {
      console.log('[INDICADORES] 🔍 Iniciando carregamento de indicadores para cliente:', clienteId);
      const data = await api.getCustom(`indicadores/${clienteId}`);
      console.log('[INDICADORES] ✅ Indicadores recebidos do backend:', {
        clienteId: data?.clienteId,
        roi: data?.roi,
        mix: data?.mix,
        ltv: data?.ltv,
        performanceMonths: data?.performance?.monthlyData?.length,
        performanceQuarters: data?.performance?.quarterlyData?.length
      });
      
      // Log detalhado do ROI
      if (data?.roi) {
        console.log('[INDICADORES-ROI] 💰 Dados de ROI:', {
          investimento: data.roi.investimento,
          receita: data.roi.receita,
          percentual: data.roi.percentual
        });
      }
      
      // Log detalhado do MIX
      if (data?.mix) {
        console.log('[INDICADORES-MIX] 📦 Dados de MIX:', {
          totalDisponivel: data.mix.totalDisponivel,
          totalAtivo: data.mix.totalAtivo,
          percentual: data.mix.percentual,
          variacaoMesAnterior: data.mix.variacaoMesAnterior
        });
      }
      
      // Log detalhado do LTV
      if (data?.ltv) {
        console.log('[INDICADORES-LTV] 📈 Dados de LTV:', {
          totalReceita: data.ltv.totalReceita,
          totalPedidos: data.ltv.totalPedidos,
          primeiroPedido: data.ltv.primeiroPedido,
          ultimoPedido: data.ltv.ultimoPedido
        });
      }
      
      // Log detalhado da Performance
      if (data?.performance) {
        console.log('[INDICADORES-PERFORMANCE] 📊 Dados de Performance:', {
          totalMeses: data.performance.monthlyData?.length || 0,
          totalTrimestres: data.performance.quarterlyData?.length || 0,
          mediaUltimos12Meses: data.performance.averageLast12Months
        });
        
        // Log COMPLETO de todos os dados mensais
        if (data.performance.monthlyData?.length > 0) {
          console.log('[INDICADORES-PERFORMANCE] 📋 TODOS OS DADOS MENSAIS:', 
            data.performance.monthlyData.map((m: any) => ({
              mes: m.monthName,
              ano: m.year,
              receita: m.revenue,
              trimestre: m.quarter,
              mesAtual: m.isCurrentMonth,
              projecao: m.projection
            }))
          );
        }
        
        // Log dos primeiros 3 meses para verificar dados
        if (data.performance.monthlyData?.length > 0) {
          console.log('[INDICADORES-PERFORMANCE] 📋 Primeiros 3 meses:', 
            data.performance.monthlyData.slice(0, 3).map((m: any) => ({
              mes: m.monthName,
              ano: m.year,
              receita: m.revenue,
              trimestre: m.quarter
            }))
          );
        }
        
        // Log dos meses com receita > 0
        const mesesComReceita = data.performance.monthlyData?.filter((m: any) => m.revenue > 0) || [];
        console.log('[INDICADORES-PERFORMANCE] 💰 Meses com receita > 0:', mesesComReceita.length, 'de', data.performance.monthlyData?.length || 0);
        
        if (mesesComReceita.length > 0) {
          console.log('[INDICADORES-PERFORMANCE] 📋 Meses com receita:', 
            mesesComReceita.map((m: any) => ({
              mes: m.monthName,
              receita: m.revenue
            }))
          );
        }
      }
      
      const normalizedData = normalizeIndicators(data, clienteId);
      setIndicators(normalizedData);
      console.log('[INDICADORES] ✅ Estado atualizado com sucesso');
    } catch (error) {
      console.error('[INDICADORES] ❌ Erro ao carregar indicadores:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!indicators) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Não foi possível carregar os indicadores</p>
      </div>
    );
  }

  // Preparar dados para o gráfico de performance
  const chartData = indicators.performance.monthlyData.map((m) => ({
    name: m.monthName.substring(0, 3), // Abreviar nome do mês
    fullName: m.monthName,
    year: m.year,
    month: m.month,
    quarter: m.quarter,
    Receita: m.revenue,
    Projeção: m.isCurrentMonth ? m.projection : undefined,
  }));

  // Cores por trimestre
  const quarterColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']; // Azul, Verde, Amarelo, Vermelho

  // Calcular totais por trimestre para a legenda
  const quarterTotals = indicators.performance.quarterlyData.reduce((acc, q) => {
    acc[q.quarter] = q.revenue;
    return acc;
  }, {} as Record<number, number>);

  return (
    <div className="space-y-6">
      {/* Linha 1: ROI, Mix e LTV */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* ROI */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>ROI (Retorno sobre Investimento)</CardDescription>
            <CardTitle className="text-3xl">
              {indicators.roi.percentual > 0 ? '+' : ''}
              {indicators.roi.percentual.toFixed(1)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Investimento:</span>
                <span className="font-medium">{formatCurrency(indicators.roi.investimento)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Receita gerada:</span>
                <span className="font-medium">{formatCurrency(indicators.roi.receita)}</span>
              </div>
            </div>
            {indicators.roi.investimento === 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Nenhum investimento registrado
              </p>
            )}
          </CardContent>
        </Card>

        {/* Mix */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Mix Cadastrado</CardDescription>
            <div className="flex items-center gap-2">
              <CardTitle className="text-3xl">
                {indicators.mix.percentual.toFixed(1)}%
              </CardTitle>
              {indicators.mix.variacaoMesAnterior !== 0 && (
                <Badge variant={indicators.mix.variacaoMesAnterior > 0 ? 'default' : 'secondary'}>
                  {indicators.mix.variacaoMesAnterior > 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1 inline" />
                  ) : indicators.mix.variacaoMesAnterior < 0 ? (
                    <TrendingDown className="h-3 w-3 mr-1 inline" />
                  ) : (
                    <Minus className="h-3 w-3 mr-1 inline" />
                  )}
                  {Math.abs(indicators.mix.variacaoMesAnterior)}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Produtos disponíveis:</span>
                <span className="font-medium">{indicators.mix.totalDisponivel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Produtos no mix:</span>
                <span className="font-medium">{indicators.mix.totalAtivo}</span>
              </div>
            </div>
            {indicators.mix.variacaoMesAnterior !== 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {indicators.mix.variacaoMesAnterior > 0 ? 'Crescimento' : 'Diminuição'} de {Math.abs(indicators.mix.variacaoMesAnterior)} produto
                {Math.abs(indicators.mix.variacaoMesAnterior) !== 1 ? 's' : ''} vs. mês anterior
              </p>
            )}
          </CardContent>
        </Card>

        {/* LTV */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>LTV (Lifetime Value)</CardDescription>
            <CardTitle className="text-3xl">
              {formatCurrency(indicators.ltv.totalReceita)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total de pedidos:</span>
                <span className="font-medium">{indicators.ltv.totalPedidos}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Primeiro pedido:</span>
                <span className="font-medium">{formatDate(indicators.ltv.primeiroPedido)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Último pedido:</span>
                <span className="font-medium">{formatDate(indicators.ltv.ultimoPedido)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Linha 2: Gráfico de Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Mensal</CardTitle>
          <CardDescription>Receita gerada pelo cliente nos últimos 12 meses</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis 
                    tickFormatter={(value) => 
                      new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(value)
                    }
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === 'Receita' ? 'Receita' : 'Projeção',
                    ]}
                    labelFormatter={(label, payload) => {
                      if (payload && payload.length > 0) {
                        const data = payload[0].payload;
                        return `${data.fullName} ${data.year}`;
                      }
                      return label;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Receita" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={quarterColors[(entry.quarter - 1) % 4]} />
                    ))}
                  </Bar>
                  <Bar dataKey="Projeção" fill="#94a3b8" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              {/* Legenda personalizada com totais por trimestre */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((q) => {
                  const quarterData = indicators.performance.quarterlyData.find(qd => qd.quarter === q);
                  if (!quarterData) return null;
                  
                  return (
                    <div key={q} className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: quarterColors[q - 1] }}
                      />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">{quarterData.quarterName}</p>
                        <p className="text-sm font-medium">{formatCurrency(quarterData.revenue)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Detalhamento mensal */}
              <div className="mt-6 border-t pt-4">
                <p className="text-sm font-medium mb-3">Detalhamento Mensal</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {indicators.performance.monthlyData.map((m) => (
                    <div
                      key={`${m.year}-${m.month}`}
                      className="p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: quarterColors[(m.quarter - 1) % 4] }}
                        />
                        <p className="text-xs font-medium">{m.monthName}</p>
                      </div>
                      <p className="text-sm font-semibold">{formatCurrency(m.revenue)}</p>
                      {m.isCurrentMonth && m.projection && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Projeção: {formatCurrency(m.projection)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma receita registrada nos últimos 12 meses</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


