import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Transaction } from "../services/dashboardDataService";
import { DashboardFilters } from "./DashboardMetrics";
import { PieChartIcon } from "lucide-react";

interface SegmentSalesCardProps {
  transactions: Transaction[];
  currentFilters: DashboardFilters;
  onFilterChange: (filters: DashboardFilters) => void;
}

export function SegmentSalesCard({ transactions, currentFilters, onFilterChange }: SegmentSalesCardProps) {
  // Calcular vendas por segmento
  const segmentData = useMemo(() => {
    const segmentMap = new Map<string, number>();
    
    transactions.forEach(t => {
      const current = segmentMap.get(t.segmento) || 0;
      segmentMap.set(t.segmento, current + t.valor);
    });
    
    const total = Array.from(segmentMap.values()).reduce((sum, val) => sum + val, 0);
    
    return Array.from(segmentMap.entries())
      .map(([segmento, valor]) => ({
        name: segmento,
        value: valor,
        percentage: total > 0 ? ((valor / total) * 100).toFixed(1) : "0.0",
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);
  
  // Estado local para rastrear qual fatia está selecionada (se houver)
  const selectedSegment = currentFilters.segmentos.length === 1 ? currentFilters.segmentos[0] : null;
  
  // Cores para os segmentos
  const COLORS: Record<string, string> = {
    "VIP": "#8b5cf6", // purple-500
    "Premium": "#3b82f6", // blue-500
    "Corporativo": "#10b981", // green-500
    "PME": "#f59e0b", // amber-500
    "Standard": "#6b7280", // gray-500
    "Startup": "#ec4899", // pink-500
  };
  
  // Handler para click nas fatias
  const handleSliceClick = (data: any) => {
    const clickedSegment = data.name;
    
    // Se o segmento já está selecionado, remove o filtro
    if (selectedSegment === clickedSegment) {
      onFilterChange({
        ...currentFilters,
        segmentos: [],
      });
    } else {
      // Caso contrário, aplica o filtro do segmento clicado
      onFilterChange({
        ...currentFilters,
        segmentos: [clickedSegment],
      });
    }
  };
  
  // Calcular total de vendas
  const totalVendas = segmentData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Vendas por Segmento</CardTitle>
          <PieChartIcon className="h-5 w-5 text-muted-foreground" />
        </div>
        {selectedSegment && (
          <p className="text-xs text-muted-foreground mt-1">
            Filtrado por: {selectedSegment}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {segmentData.length === 0 ? (
          <div className="flex items-center justify-center h-[240px] text-center">
            <p className="text-muted-foreground">Nenhuma venda no período selecionado</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Gráfico de Rosca */}
            <div className="h-[200px] min-h-[200px] relative">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={segmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    onClick={handleSliceClick}
                    style={{ cursor: 'pointer' }}
                  >
                    {segmentData.map((entry, index) => {
                      const isSelected = selectedSegment === entry.name;
                      const isOtherSelected = selectedSegment && selectedSegment !== entry.name;
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
                      `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${props.payload.percentage}%)`,
                      name
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Texto centralizado absoluto */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-2xl font-bold">
                  R$ {(totalVendas / 1000).toFixed(1)}k
                </div>
              </div>
            </div>

            {/* Legenda Manual */}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
              {segmentData.map((entry, index) => {
                const isSelected = selectedSegment === entry.name;
                const isOtherSelected = selectedSegment && selectedSegment !== entry.name;
                const opacity = isOtherSelected ? 0.3 : 1;
                
                return (
                  <div 
                    key={`legend-${index}`} 
                    className="flex items-center gap-2 cursor-pointer transition-opacity"
                    style={{ opacity }}
                    onClick={() => handleSliceClick(entry)}
                  >
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[entry.name] || "#94a3b8" }}
                    />
                    <span className="text-sm">
                      {entry.name}: {entry.percentage}%
                    </span>
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
