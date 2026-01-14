import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { 
  Transaction,
  calculatePositivation,
  calculateCustomerDistribution
} from "../services/dashboardDataService";
import { Users } from "lucide-react";
import { DashboardFilters } from "./DashboardMetrics";

interface CustomerWalletCardProps {
  transactions: Transaction[];
  currentFilters: DashboardFilters;
  onFilterChange: (filters: DashboardFilters) => void;
  vendedorNome?: string; // Nome do vendedor para filtrar (se aplicável)
}

interface CustomerDistribution {
  active: number;
  inactive: number;
  total: number;
  activePercentage: string;
  inactivePercentage: string;
}

export function CustomerWalletCard({ transactions, currentFilters, onFilterChange, vendedorNome }: CustomerWalletCardProps) {
  // Estado para positivação
  const [positivation, setPositivation] = useState({
    positivatedCount: 0,
    totalCustomers: 0,
    positivationPercentage: 0,
  });
  
  // Estado para distribuição de clientes
  const [distribution, setDistribution] = useState<CustomerDistribution>({
    active: 0,
    inactive: 0,
    total: 0,
    activePercentage: "0.0",
    inactivePercentage: "0.0",
  });
  
  // Carregar positivação quando transactions ou vendedorNome mudarem
  useEffect(() => {
    async function loadPositivation() {
      const pos = await calculatePositivation(transactions, vendedorNome);
      setPositivation(pos);
    }
    loadPositivation();
  }, [transactions, vendedorNome]);
  
  // Carregar distribuição de clientes
  useEffect(() => {
    async function loadDistribution() {
      const dist = await calculateCustomerDistribution(vendedorNome);
      setDistribution(dist);
    }
    loadDistribution();
  }, [vendedorNome]);
  
  // Estado local para rastrear qual fatia está selecionada (se houver)
  const selectedStatus = currentFilters.statusClientes.length === 1 ? currentFilters.statusClientes[0] : null;
  
  // Dados para o gráfico de rosca
  const chartData = [
    { name: "Ativos", value: distribution.active, percentage: distribution.activePercentage, status: "Ativo" },
    { name: "Inativos", value: distribution.inactive, percentage: distribution.inactivePercentage, status: "Inativo" },
  ];
  
  // Cores para o gráfico
  const COLORS = {
    Ativos: "#10b981", // green-500
    Inativos: "#f59e0b", // amber-500
  };
  
  // Handler para click nas fatias
  const handleSliceClick = (data: any) => {
    const clickedStatus = data.status;
    
    // Se o status já está selecionado, remove o filtro
    if (selectedStatus === clickedStatus) {
      onFilterChange({
        ...currentFilters,
        statusClientes: [],
      });
    } else {
      // Caso contrário, aplica o filtro do status clicado
      onFilterChange({
        ...currentFilters,
        statusClientes: [clickedStatus],
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Carteira de Clientes</CardTitle>
          <Users className="h-5 w-5 text-muted-foreground" />
        </div>
        {selectedStatus && (
          <p className="text-xs text-muted-foreground mt-1">
            Filtrado por: {selectedStatus === "Ativo" ? "Clientes Ativos" : "Clientes Inativos"}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Gráfico de Rosca - Distribuição Ativo/Inativo */}
        <div className="space-y-4">
          <div className="h-[240px] min-h-[240px] relative">
            {distribution.total > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                    onClick={handleSliceClick}
                    style={{ cursor: 'pointer' }}
                  >
                    {chartData.map((entry, index) => {
                      const isSelected = selectedStatus === entry.status;
                      const isOtherSelected = selectedStatus && selectedStatus !== entry.status;
                      const opacity = isOtherSelected ? 0.3 : 1;
                      
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[entry.name as keyof typeof COLORS]}
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
                      `${value} clientes (${props.payload.percentage}%)`,
                      name
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-center">
                <p className="text-muted-foreground">Carregando dados dos clientes...</p>
              </div>
            )}
            {/* Texto centralizado absoluto */}
            {distribution.total > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-3xl font-bold">
                  {distribution.total}
                </div>
                <div className="text-sm text-muted-foreground">
                  Clientes
                </div>
              </div>
            )}
          </div>
          
          {/* Legenda Manual */}
          {distribution.total > 0 && (
            <div className="flex justify-center gap-6">
              {chartData.map((entry, index) => {
                const isSelected = selectedStatus === entry.status;
                const isOtherSelected = selectedStatus && selectedStatus !== entry.status;
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
                      style={{ backgroundColor: COLORS[entry.name as keyof typeof COLORS] }}
                    />
                    <span className="text-sm">
                      {entry.name}: {entry.value} ({entry.percentage}%)
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Barra de Progresso - Positivação */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Positivação no Período</span>
            <span className="text-muted-foreground">
              {positivation.positivatedCount} de {positivation.totalCustomers} clientes
            </span>
          </div>
          <Progress 
            value={positivation.positivationPercentage} 
            className="h-3"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {positivation.positivationPercentage.toFixed(1)}% dos clientes realizaram compras
            </span>
          </div>
        </div>
        
        {/* Informações adicionais */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Clientes Ativos</p>
            <p className="text-2xl font-bold text-green-600">{distribution.active}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Clientes Inativos</p>
            <p className="text-2xl font-bold text-amber-600">{distribution.inactive}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}