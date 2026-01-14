import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Transaction } from "../services/dashboardDataService";
import { DashboardFilters } from "./DashboardMetrics";
import { TrendingUp } from "lucide-react";

interface ABCCurveCardProps {
  transactions: Transaction[]; // Transações filtradas do período (para exibir proporção)
  allTransactions: Transaction[]; // TODAS as transações (incluindo canceladas - legado, deprecated)
  rawTransactions: Transaction[]; // 🆕 NOVO: TODAS as transações SEM filtro de período (para calcular curva ABC)
  currentFilters: DashboardFilters;
  onFilterChange: (filters: DashboardFilters) => void;
}

export function ABCCurveCard({ transactions, allTransactions, rawTransactions, currentFilters, onFilterChange }: ABCCurveCardProps) {
  // Estado local para rastrear qual fatia está selecionada (se houver)
  const selectedCurva = currentFilters.curvasABC.length === 1 ? currentFilters.curvasABC[0] : null;
  
  // Calcular Curva ABC com base nos ÚLTIMOS 12 MESES
  const abcData = useMemo(() => {
    /**
     * CONCEITO DA CURVA ABC (Princípio de Pareto):
     * 
     * A Curva ABC classifica clientes por importância de faturamento:
     * - Curva A: Clientes que representam até 80% do faturamento acumulado (clientes VIP)
     * - Curva B: Clientes que representam de 80% a 95% do faturamento acumulado (clientes promissores)
     * - Curva C: Clientes que representam acima de 95% do faturamento acumulado (clientes de volume)
     * 
     * Metodologia:
     * 1. Ordenar clientes do MAIOR para o MENOR faturamento
     * 2. Calcular percentual individual de cada cliente
     * 3. Calcular percentual ACUMULADO progressivamente
     * 4. Classificar pela posição no acumulado (A/B/C)
     * 
     * 🎯 IMPORTANTE: Classificação ABC calculada com dados dos ÚLTIMOS 12 MESES
     *    (não do período filtrado no Dashboard)
     */
    
    // PASSO 1: Filtrar transações dos últimos 12 meses
    const hoje = new Date();
    const dozesMesesAtras = new Date(hoje);
    dozesMesesAtras.setMonth(hoje.getMonth() - 12);
    
    const transacoesUltimos12Meses = rawTransactions.filter(t => {
      if (!t.data) return false;
      
      // ❌ EXCLUIR vendas canceladas do cálculo ABC
      if (t.cancelado) return false;
      
      // Converter a data da transação para Date
      const partesData = t.data.split('/'); // formato: "DD/MM/YYYY"
      const dataTransacao = new Date(
        parseInt(partesData[2]), // ano
        parseInt(partesData[1]) - 1, // mês (0-indexed)
        parseInt(partesData[0]) // dia
      );
      
      return dataTransacao >= dozesMesesAtras && dataTransacao <= hoje;
    });
    
    // PASSO 2: Agrupar vendas por cliente (últimos 12 meses)
    const clientMapTotal = new Map<string, { valor: number; nomeCliente: string }>();
    
    transacoesUltimos12Meses.forEach(t => {
      // ✅ EXIGIR clienteId - vendas sem clienteId são dados inconsistentes que devem ser corrigidos
      if (!t.clienteId) {
        console.warn('[CURVA ABC] Venda sem clienteId ignorada:', t);
        return;
      }
      
      const current = clientMapTotal.get(t.clienteId) || { valor: 0, nomeCliente: t.cliente };
      clientMapTotal.set(t.clienteId, {
        valor: current.valor + t.valor,
        nomeCliente: t.cliente,
      });
    });
    
    // PASSO 3: Criar array de clientes com dados
    const clientesData = Array.from(clientMapTotal.entries()).map(([clienteId, data]) => ({
      clienteId,
      nomeCliente: data.nomeCliente,
      valor: data.valor,
      percentual: 0,
      percentualAcumulado: 0,
      curvaABC: "C" as "A" | "B" | "C",
    }));
    
    console.log(`[CURVA ABC] 💰 Clientes encontrados:`, clientesData.map(c => ({
      nome: c.nomeCliente,
      valor: c.valor.toFixed(2)
    })));
    
    // PASSO 4: Ordenar clientes por valor DECRESCENTE (do maior para o menor)
    clientesData.sort((a, b) => b.valor - a.valor);
    
    console.log(`[CURVA ABC] 📊 Clientes ordenados por valor (maior → menor):`, clientesData.map(c => ({
      nome: c.nomeCliente,
      valor: c.valor.toFixed(2)
    })));
    
    // PASSO 5: Calcular total de vendas
    const totalVendas = clientesData.reduce((sum, item) => sum + item.valor, 0);
    
    console.log(`[CURVA ABC] 💵 Total de vendas (últimos 12 meses): R$ ${totalVendas.toFixed(2)}`);
    
    // PASSO 6: Calcular percentual individual e acumulado, DEPOIS classificar pela Curva ABC
    let acumulado = 0;
    clientesData.forEach((cliente, index) => {
      // Calcular percentual individual
      cliente.percentual = totalVendas > 0 ? (cliente.valor / totalVendas) * 100 : 0;
      
      // Acumular percentual
      acumulado += cliente.percentual;
      cliente.percentualAcumulado = acumulado;
      
      // 🔧 LÓGICA CORRIGIDA DA CURVA ABC:
      // A classificação é feita ANTES de acumular, não depois!
      // Verificamos o acumulado ANTERIOR para saber em qual curva o cliente entra
      const acumuladoAnterior = acumulado - cliente.percentual;
      
      // Curva A: Clientes que quando adicionados NÃO ultrapassam 80% (ou o primeiro a ultrapassar)
      // Curva B: Clientes que quando adicionados ficam entre 80% e 95%
      // Curva C: Clientes que quando adicionados ultrapassam 95%
      if (acumuladoAnterior < 80) {
        cliente.curvaABC = "A";
      } else if (acumuladoAnterior < 95) {
        cliente.curvaABC = "B";
      } else {
        cliente.curvaABC = "C";
      }
    });
    
    console.log(`[CURVA ABC] 🎯 Classificação ABC final:`, clientesData.map(c => ({
      nome: c.nomeCliente,
      valor: c.valor.toFixed(2),
      percentual: c.percentual.toFixed(2) + '%',
      percentualAcumulado: c.percentualAcumulado.toFixed(2) + '%',
      curva: c.curvaABC
    })));
    
    // PASSO 7: Agrupar clientes do PERÍODO FILTRADO por curva ABC
    const clientesNoPeriodo = new Set(
      transactions
        .filter(t => t.clienteId) // ✅ EXIGIR clienteId
        .map(t => t.clienteId)
    );
    
    // Contar quantos clientes de cada curva aparecem no período
    const totalClientes = clientesData.length; // ✅ MUDANÇA: Usar TODOS os clientes dos últimos 12 meses
    let curvaA = 0;
    let curvaB = 0;
    let curvaC = 0;
    let valorA = 0;
    let valorB = 0;
    let valorC = 0;
    
    // 🆕 Contar quantos clientes de cada curva compraram no período (para calcular % de ativação)
    let curvaA_ativos = 0;
    let curvaB_ativos = 0;
    let curvaC_ativos = 0;
    
    // Calcular valores dos clientes no período filtrado (não nos últimos 12 meses)
    const valoresPeriodoFiltrado = new Map<string, number>();
    transactions.forEach(t => {
      // ✅ EXIGIR clienteId - vendas sem clienteId são dados inconsistentes
      if (!t.clienteId) {
        console.warn('[CURVA ABC] Transação sem clienteId ignorada no período:', t);
        return;
      }
      const current = valoresPeriodoFiltrado.get(t.clienteId) || 0;
      valoresPeriodoFiltrado.set(t.clienteId, current + t.valor);
    });
    
    const totalVendasPeriodoFiltrado = Array.from(valoresPeriodoFiltrado.values()).reduce((sum, v) => sum + v, 0);
    
    clientesData.forEach((cliente) => {
      // ✅ MUDANÇA: Incluir TODOS os clientes dos últimos 12 meses (classificação ABC)
      // Se o cliente não comprou no período filtrado, seu valor será 0
      const valorNoPeriodo = valoresPeriodoFiltrado.get(cliente.clienteId) || 0;
      const comprouNoPeriodo = clientesNoPeriodo.has(cliente.clienteId);
      
      if (cliente.curvaABC === "A") {
        curvaA++;
        valorA += valorNoPeriodo;
        if (comprouNoPeriodo) curvaA_ativos++;
      } else if (cliente.curvaABC === "B") {
        curvaB++;
        valorB += valorNoPeriodo;
        if (comprouNoPeriodo) curvaB_ativos++;
      } else {
        curvaC++;
        valorC += valorNoPeriodo;
        if (comprouNoPeriodo) curvaC_ativos++;
      }
    });
    
    const items = [
      {
        name: "Curva A",
        clientes: curvaA,
        valor: valorA,
        percentage: totalClientes > 0 ? ((curvaA / totalClientes) * 100).toFixed(1) : "0.0",
        valorPercentage: totalVendasPeriodoFiltrado > 0 ? ((valorA / totalVendasPeriodoFiltrado) * 100).toFixed(1) : "0.0",
        ativacaoPercentage: curvaA > 0 ? ((curvaA_ativos / curvaA) * 100).toFixed(1) : "0.0",
        clientesAtivos: curvaA_ativos,
        clientesInativos: curvaA - curvaA_ativos,
      },
      {
        name: "Curva B",
        clientes: curvaB,
        valor: valorB,
        percentage: totalClientes > 0 ? ((curvaB / totalClientes) * 100).toFixed(1) : "0.0",
        valorPercentage: totalVendasPeriodoFiltrado > 0 ? ((valorB / totalVendasPeriodoFiltrado) * 100).toFixed(1) : "0.0",
        ativacaoPercentage: curvaB > 0 ? ((curvaB_ativos / curvaB) * 100).toFixed(1) : "0.0",
        clientesAtivos: curvaB_ativos,
        clientesInativos: curvaB - curvaB_ativos,
      },
      {
        name: "Curva C",
        clientes: curvaC,
        valor: valorC,
        percentage: totalClientes > 0 ? ((curvaC / totalClientes) * 100).toFixed(1) : "0.0",
        valorPercentage: totalVendasPeriodoFiltrado > 0 ? ((valorC / totalVendasPeriodoFiltrado) * 100).toFixed(1) : "0.0",
        ativacaoPercentage: curvaC > 0 ? ((curvaC_ativos / curvaC) * 100).toFixed(1) : "0.0",
        clientesAtivos: curvaC_ativos,
        clientesInativos: curvaC - curvaC_ativos,
      },
    ].filter(item => item.clientes > 0);
    
    // Adicionar descrição dinâmica baseada na porcentagem real
    return items.map(item => ({
      ...item,
      description: `${item.valorPercentage}% do faturamento • ${item.ativacaoPercentage}% com compras no período`,
    }));
  }, [transactions, allTransactions, rawTransactions]);
  
  // 🆕 Preparar dados para o gráfico: cada curva vira 2 fatias (ativos + inativos)
  const chartData = useMemo(() => {
    const data: any[] = [];
    
    abcData.forEach(curva => {
      // Adicionar fatia de clientes ATIVOS (cor sólida)
      if (curva.clientesAtivos > 0) {
        data.push({
          name: `${curva.name} - Ativos`,
          curvaOriginal: curva.name,
          value: curva.clientesAtivos,
          tipo: 'ativo',
          ativacaoPercentage: curva.ativacaoPercentage,
          valorPercentage: curva.valorPercentage,
          totalClientes: curva.clientes,
        });
      }
      
      // Adicionar fatia de clientes INATIVOS (cor transparente)
      if (curva.clientesInativos > 0) {
        data.push({
          name: `${curva.name} - Inativos`,
          curvaOriginal: curva.name,
          value: curva.clientesInativos,
          tipo: 'inativo',
          ativacaoPercentage: curva.ativacaoPercentage,
          valorPercentage: curva.valorPercentage,
          totalClientes: curva.clientes,
        });
      }
    });
    
    return data;
  }, [abcData]);
  
  // Cores para as curvas
  const COLORS: Record<string, string> = {
    "Curva A": "#10b981", // green-500
    "Curva B": "#f59e0b", // amber-500
    "Curva C": "#ef4444", // red-500
  };
  
  // Handler para click nas fatias
  const handleSliceClick = (data: any) => {
    const clickedCurve = data.curvaOriginal;
    
    // Por enquanto, apenas destacar visualmente (não aplicar filtro real já que não temos essa dimensão)
    if (selectedCurva === clickedCurve) {
      onFilterChange({ ...currentFilters, curvasABC: [] });
    } else {
      onFilterChange({ ...currentFilters, curvasABC: [clickedCurve] });
    }
  };
  
  // Calcular total de clientes
  const totalClientes = abcData.reduce((sum, item) => sum + item.clientes, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Curva ABC de Clientes</CardTitle>
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
        </div>
        {selectedCurva && (
          <p className="text-xs text-muted-foreground mt-1">
            Filtrado por: {selectedCurva}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {abcData.length === 0 ? (
          <div className="flex items-center justify-center h-[240px] text-center">
            <p className="text-muted-foreground">Nenhum cliente no período selecionado</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Gráfico de Rosca com Fatias Bicolores */}
            <div className="h-[240px] min-h-[240px] relative">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  {/* Anel ÚNICO: Cada curva dividida em ativos (sólido) + inativos (transparente) */}
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={1}
                    dataKey="value"
                    onClick={handleSliceClick}
                    style={{ cursor: 'pointer' }}
                  >
                    {chartData.map((entry, index) => {
                      const isSelected = selectedCurva === entry.curvaOriginal;
                      const isOtherSelected = selectedCurva && selectedCurva !== entry.curvaOriginal;
                      
                      // Cor sólida para ativos, transparente para inativos
                      const opacity = entry.tipo === 'ativo' ? 1 : 0.3;
                      const finalOpacity = isOtherSelected ? opacity * 0.3 : opacity;
                      
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[entry.curvaOriginal] || "#94a3b8"}
                          fillOpacity={finalOpacity}
                          stroke={isSelected ? "#fff" : "none"}
                          strokeWidth={isSelected ? 2 : 0}
                        />
                      );
                    })}
                  </Pie>
                  
                  <Tooltip 
                    wrapperStyle={{ zIndex: 1000 }}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.96)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                    formatter={(value: number, name: string, entry: any) => {
                      // Acessar dados do payload corretamente
                      const payload = entry.payload;
                      const tipoLabel = payload.tipo === 'ativo' ? 'com compra' : 'sem compra';
                      const percentualAtivacao = payload.ativacaoPercentage || '0.0';
                      const curvaNome = payload.curvaOriginal || '';
                      
                      return [
                        `${value} cliente${value !== 1 ? 's' : ''} ${tipoLabel}`,
                        curvaNome
                      ];
                    }}
                    labelFormatter={() => ''}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Texto centralizado absoluto */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-3xl font-bold">
                  {totalClientes}
                </div>
                <div className="text-sm text-muted-foreground">
                  Clientes
                </div>
              </div>
            </div>

            {/* Legenda simplificada */}
            <div className="flex flex-col gap-2">
              {abcData.map((entry, index) => {
                const isSelected = selectedCurva === entry.name;
                const isOtherSelected = selectedCurva && selectedCurva !== entry.name;
                const opacity = isOtherSelected ? 0.3 : 1;
                
                return (
                  <div 
                    key={`legend-${index}`} 
                    className="flex items-center gap-2 cursor-pointer transition-opacity"
                    style={{ opacity }}
                    onClick={() => handleSliceClick({ curvaOriginal: entry.name })}
                  >
                    {/* Indicador de cor simples */}
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: COLORS[entry.name] || "#94a3b8" }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{entry.name}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {entry.clientes} clientes ({entry.percentage}%)
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{entry.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Legenda explicativa */}
            <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
              <p>📊 Classificação ABC com dados dos últimos 12 meses</p>
              <p>💡 Tom sólido = clientes com compras no período • Tom claro = clientes sem compras no período</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}