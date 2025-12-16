import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Transaction } from "../services/dashboardDataService";
import { DashboardFilters } from "./DashboardMetrics";
import { TrendingUp } from "lucide-react";

interface ABCCurveCardProps {
  transactions: Transaction[];
  currentFilters: DashboardFilters;
  onFilterChange: (filters: DashboardFilters) => void;
}

export function ABCCurveCard({ transactions, currentFilters, onFilterChange }: ABCCurveCardProps) {
  const [selectedCurve, setSelectedCurve] = useState<string | null>(null);
  
  // Calcular Curva ABC
  const abcData = useMemo(() => {
    // Agrupar vendas por cliente
    const clientMap = new Map<string, number>();
    
    transactions.forEach(t => {
      const current = clientMap.get(t.cliente) || 0;
      clientMap.set(t.cliente, current + t.valor);
    });
    
    // Ordenar clientes por valor decrescente
    const sortedClients = Array.from(clientMap.entries())
      .sort((a, b) => b[1] - a[1]);
    
    const totalVendas = sortedClients.reduce((sum, [_, valor]) => sum + valor, 0);
    const totalClientes = sortedClients.length;
    
    // Calcular curva ABC
    let acumulado = 0;
    let curvaA = 0;
    let curvaB = 0;
    let curvaC = 0;
    let valorA = 0;
    let valorB = 0;
    let valorC = 0;
    
    sortedClients.forEach(([cliente, valor]) => {
      acumulado += valor;
      const percentualAcumulado = (acumulado / totalVendas) * 100;
      
      if (percentualAcumulado <= 80) {
        curvaA++;
        valorA += valor;
      } else if (percentualAcumulado <= 95) {
        curvaB++;
        valorB += valor;
      } else {
        curvaC++;
        valorC += valor;
      }
    });
    
    const items = [
      {
        name: "Curva A",
        clientes: curvaA,
        valor: valorA,
        percentage: totalClientes > 0 ? ((curvaA / totalClientes) * 100).toFixed(1) : "0.0",
        valorPercentage: totalVendas > 0 ? ((valorA / totalVendas) * 100).toFixed(1) : "0.0",
      },
      {
        name: "Curva B",
        clientes: curvaB,
        valor: valorB,
        percentage: totalClientes > 0 ? ((curvaB / totalClientes) * 100).toFixed(1) : "0.0",
        valorPercentage: totalVendas > 0 ? ((valorB / totalVendas) * 100).toFixed(1) : "0.0",
      },
      {
        name: "Curva C",
        clientes: curvaC,
        valor: valorC,
        percentage: totalClientes > 0 ? ((curvaC / totalClientes) * 100).toFixed(1) : "0.0",
        valorPercentage: totalVendas > 0 ? ((valorC / totalVendas) * 100).toFixed(1) : "0.0",
      },
    ].filter(item => item.clientes > 0);
    
    // Adicionar descrição dinâmica baseada na porcentagem real
    return items.map(item => ({
      ...item,
      description: `${item.valorPercentage}% do faturamento`,
    }));
  }, [transactions]);
  
  // Cores para as curvas
  const COLORS: Record<string, string> = {
    "Curva A": "#10b981", // green-500
    "Curva B": "#f59e0b", // amber-500
    "Curva C": "#ef4444", // red-500
  };
  
  // Handler para click nas fatias
  const handleSliceClick = (data: any) => {
    const clickedCurve = data.name;
    
    // Por enquanto, apenas destacar visualmente (não aplicar filtro real já que não temos essa dimensão)
    if (selectedCurve === clickedCurve) {
      setSelectedCurve(null);
    } else {
      setSelectedCurve(clickedCurve);
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
        {selectedCurve && (
          <p className="text-xs text-muted-foreground mt-1">
            Destacado: {selectedCurve}
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
            {/* Gráfico de Rosca */}
            <div className="h-[200px] min-h-[200px] relative">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={abcData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="clientes"
                    onClick={handleSliceClick}
                    style={{ cursor: 'pointer' }}
                  >
                    {abcData.map((entry, index) => {
                      const isSelected = selectedCurve === entry.name;
                      const isOtherSelected = selectedCurve && selectedCurve !== entry.name;
                      const opacity = isOtherSelected ? 0.3 : 1;
                      
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[entry.name] || "#94a3b8"}
                          fillOpacity={opacity}
                          stroke={isSelected ? "#fff" : "none"}
                          strokeWidth={isSelected ? 2 : 0}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string, props: any) => [
                      `${value} clientes (${props.payload.percentage}% do total)`,
                      name
                    ]}
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

            {/* Legenda Manual */}
            <div className="flex flex-col gap-2">
              {abcData.map((entry, index) => {
                const isSelected = selectedCurve === entry.name;
                const isOtherSelected = selectedCurve && selectedCurve !== entry.name;
                const opacity = isOtherSelected ? 0.3 : 1;
                
                return (
                  <div 
                    key={`legend-${index}`} 
                    className="flex items-center gap-2 cursor-pointer transition-opacity"
                    style={{ opacity }}
                    onClick={() => handleSliceClick(entry)}
                  >
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
