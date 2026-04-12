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
    "Distribuidor": "#3b82f6", // blue-500
    "Perfumaria": "#f59e0b", // amber-500
    "Varejo": "#10b981", // green-500
    "Atacado": "#8b5cf6", // purple-500
    "E-commerce": "#ec4899", // pink-500
    "Indústria": "#ef4444", // red-500
  };
  
  // Cores de fallback para segmentos não mapeados
  const FALLBACK_COLORS = [
    "#3b82f6", // blue-500
    "#f59e0b", // amber-500
    "#10b981", // green-500
    "#8b5cf6", // purple-500
    "#ec4899", // pink-500
    "#ef4444", // red-500
    "#14b8a6", // teal-500
    "#f97316", // orange-500
  ];
  
  // Função para obter cor de um segmento
  const getSegmentColor = (segmentName: string, index: number) => {
    return COLORS[segmentName] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
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
            <div className="h-[240px] min-h-[240px] relative">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={segmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
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
                          fill={getSegmentColor(entry.name, index)}
                          fillOpacity={opacity}
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
            <div className="flex flex-col gap-2">
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
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: getSegmentColor(entry.name, index) }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{entry.name}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {entry.percentage}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        R$ {entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
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