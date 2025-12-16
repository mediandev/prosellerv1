import { useState, useMemo, useEffect } from "react";
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Transaction } from '../services/dashboardDataService'; // Importar do service correto
import { DashboardFilters } from './DashboardMetrics'; // Corrigir import
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";
import { TrendingUp, Target } from "lucide-react";

// Função auxiliar para buscar meta de um vendedor específico
async function buscarMetaVendedor(vendedorId: string, year: number, month: number): Promise<number> {
  try {
    const metas = await api.get('metas');
    const meta = metas.find((m: any) => 
      m.usuarioId === vendedorId && 
      m.ano === year && 
      m.mes === month
    );
    return meta?.valor || 0;
  } catch (error) {
    console.error('[SALES CHART] Erro ao buscar meta do vendedor:', error);
    return 0;
  }
}

// Função auxiliar para buscar meta total (soma de todos os vendedores)
async function buscarMetaTotal(year: number, month: number): Promise<number> {
  try {
    const metas = await api.get('metas');
    const metasMes = metas.filter((m: any) => m.ano === year && m.mes === month);
    return metasMes.reduce((sum: number, m: any) => sum + (m.valor || 0), 0);
  } catch (error) {
    console.error('[SALES CHART] Erro ao buscar meta total:', error);
    return 0;
  }
}

// Função auxiliar para agrupar transações por período
function groupTransactionsByPeriod(transactions: Transaction[], groupBy: 'dia' | 'mes' = 'dia') {
  const grouped: Record<string, number> = {};
  
  transactions.forEach(t => {
    // t.data está no formato DD/MM/YYYY - precisamos parseá-lo corretamente
    const [day, month, year] = t.data.split('/').map(Number);
    const date = new Date(year, month - 1, day); // month - 1 porque Date usa 0-11 para meses
    
    let key: string;
    
    if (groupBy === 'mes') {
      // Formato YYYY-MM
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    } else {
      // Formato DD/MM
      key = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    
    grouped[key] = (grouped[key] || 0) + t.valor; // Usar t.valor ao invés de t.amount
  });
  
  // Converter para array e ordenar por data
  return Object.entries(grouped)
    .map(([name, valor]) => ({ name, valor }))
    .sort((a, b) => {
      // Ordenar por data corretamente
      const dateA = groupBy === 'mes' ? a.name : a.name.split('/').reverse().join('-');
      const dateB = groupBy === 'mes' ? b.name : b.name.split('/').reverse().join('-');
      return dateA.localeCompare(dateB);
    });
}

// Mapeamento de vendedores (temporário - será obtido via API futuramente)
const VENDEDOR_TO_USER_ID: Record<string, string> = {
  "João Silva": "user-2",
  "Maria Santos": "user-3",
  "Pedro Costa": "user-4",
  "Ana Lima": "user-5",
};

interface SalesChartProps {
  period: string;
  filters?: DashboardFilters;
  transactions: Transaction[]; // Receber transações já filtradas
}

export function SalesChart({ period, filters, transactions }: SalesChartProps) {
  const { usuario } = useAuth();
  const ehVendedor = usuario?.tipo === 'vendedor';
  
  // Estado para armazenar a meta do período
  const [metaPeriodo, setMetaPeriodo] = useState<number>(0);
  
  // Determinar se o período é compatível com meta mensal
  const isPeriodoComMeta = useMemo(() => {
    // Períodos no formato YYYY-MM sempre são compatíveis com meta mensal
    return period && period.includes('-');
  }, [period]);
  
  // Carregar meta do período
  useEffect(() => {
    async function loadMeta() {
      if (!isPeriodoComMeta || !period.includes('-')) {
        setMetaPeriodo(0);
        return;
      }
      
      const [year, month] = period.split('-').map(Number);
      
      try {
        let metaMensal = 0;
        
        if (ehVendedor && usuario) {
          // Meta individual do vendedor
          metaMensal = await buscarMetaVendedor(usuario.id, year, month);
        } else if (filters?.vendedores && filters.vendedores.length > 0) {
          // Meta dos vendedores selecionados nos filtros
          const vendedorIds = filters.vendedores.map(nome => 
            Object.entries(VENDEDOR_TO_USER_ID).find(([vNome]) => vNome === nome)?.[1]
          ).filter(Boolean) as string[];
          
          // Buscar meta de cada vendedor e somar
          const metas = await Promise.all(
            vendedorIds.map(id => buscarMetaVendedor(id, year, month))
          );
          metaMensal = metas.reduce((sum, meta) => sum + meta, 0);
        } else {
          // Meta total de todos os vendedores
          metaMensal = await buscarMetaTotal(year, month);
        }
        
        setMetaPeriodo(metaMensal);
      } catch (error) {
        console.error('[SALES CHART] Erro ao carregar meta:', error);
        setMetaPeriodo(0);
      }
    }
    
    loadMeta();
  }, [isPeriodoComMeta, period, ehVendedor, usuario, filters]);
  
  // Calculate chart data from filtered transactions
  const data = useMemo(() => {
    // Se não houver transações filtradas após aplicar os filtros, retornar array vazio
    if (transactions.length === 0) {
      return [];
    }
    
    // Group by period (retorna array com { name, valor })
    const grouped = groupTransactionsByPeriod(transactions, 'dia');
    
    // Calcular vendas acumuladas
    let acumulado = 0;
    const dataWithAccumulated = grouped.map(g => {
      acumulado += g.valor; // Corrigido: usar g.valor ao invés de g.vendas
      return {
        periodo: g.name, // Corrigido: usar g.name ao invés de g.periodo
        vendasAcumuladas: acumulado
      };
    });
    
    return dataWithAccumulated;
  }, [transactions]); // Corrigido: incluir transactions nas dependências
  
  // Calcular se a meta foi atingida
  const metaAtingida = isPeriodoComMeta && data.length > 0 && data[data.length - 1].vendasAcumuladas >= metaPeriodo;
  
  // Obter descrição do período
  const getDescricaoPeriodo = () => {
    if (!isPeriodoComMeta) {
      return "Evolução das vendas acumuladas no período selecionado";
    }
    
    const metaFormatada = `R$ ${metaPeriodo.toLocaleString('pt-BR')}`;
    
    switch (period) {
      case "current_month":
        return `Evolução das vendas acumuladas vs meta mensal de ${metaFormatada}`;
      case "90":
        return `Evolução das vendas acumuladas vs meta trimestral de ${metaFormatada}`;
      case "365":
        return `Evolução das vendas acumuladas vs meta anual de ${metaFormatada}`;
      default:
        return `Evolução das vendas acumuladas vs meta de ${metaFormatada}`;
    }
  };
  
  return (
    <Card className={ehVendedor ? "col-span-7" : "col-span-4"}>
      <CardHeader>
        <CardTitle>Performance de Vendas</CardTitle>
        <CardDescription>
          {getDescricaoPeriodo()}
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[350px] text-muted-foreground">
            <div className="text-center">
              <p className="text-sm">Nenhuma venda registrada no período selecionado</p>
            </div>
          </div>
        ) : (
        <div className="min-h-[350px] h-[350px]">
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data}>
            <defs>
              <linearGradient id="colorVendasAcumuladas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={metaAtingida ? "#22c55e" : "#3b82f6"} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={metaAtingida ? "#22c55e" : "#3b82f6"} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="periodo" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              formatter={(value: number) => [
                `R$ ${value.toLocaleString('pt-BR')}`,
                'Vendas Acumuladas'
              ]}
            />
            <Legend 
              formatter={(value: string) => {
                if (value === 'vendasAcumuladas') return 'Vendas Acumuladas';
                return value;
              }}
            />
            
            {/* Linha de referência da meta do período (apenas se aplicável) */}
            {isPeriodoComMeta && metaPeriodo > 0 && (
              <ReferenceLine 
                y={metaPeriodo} 
                stroke={metaAtingida ? "#22c55e" : "#f59e0b"}
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{ 
                  value: `Meta: R$ ${(metaPeriodo / 1000).toFixed(0)}k`,
                  position: 'insideTopRight',
                  fill: metaAtingida ? "#22c55e" : "#f59e0b",
                  fontSize: 12,
                  fontWeight: 600
                }}
              />
            )}
            
            {/* Linha de vendas acumuladas */}
            <Line 
              type="monotone" 
              dataKey="vendasAcumuladas" 
              stroke={metaAtingida ? "#22c55e" : "#3b82f6"}
              strokeWidth={3}
              name="vendasAcumuladas"
              dot={{ fill: metaAtingida ? "#22c55e" : "#3b82f6", r: 5 }}
              activeDot={{ r: 7 }}
              fill="url(#colorVendasAcumuladas)"
            />
          </LineChart>
          </ResponsiveContainer>
        </div>
        )}
      </CardContent>
    </Card>
  );
}