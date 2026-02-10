import { useState, useMemo, useEffect } from "react";
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Transaction } from '../services/dashboardDataService';
import { DashboardFilters } from './DashboardMetrics';
import { buscarMetaVendedor, buscarMetaTotal } from '../services/metasService';
import { isStatusConcluido } from "../utils/statusVendaUtils";
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

// Função auxiliar para agrupar transações por período separando por status
function groupTransactionsByPeriodAndStatus(transactions: Transaction[], groupBy: 'dia' | 'mes' = 'dia') {
  const groupedConcluidas: Record<string, number> = {};
  const groupedPendentes: Record<string, number> = {};
  
  console.log('[SALES CHART] 🔍 Total de transações recebidas:', transactions.length);
  
  let concluidasCount = 0;
  let pendentesCount = 0;
  let outrosCount = 0;
  
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
    
    // Separar por status
    const statusConcluido = isStatusConcluido(t.status || '');
    const statusPendente = [
      'Pendente', 'pendente',
      'Em Andamento', 'em andamento', 'Em andamento',
      'Em Análise', 'em análise', 'Em análise',
      'Enviado', 'enviado',
      'Aprovado', 'aprovado'
    ].includes(t.status || '');
    
    if (statusConcluido) {
      groupedConcluidas[key] = (groupedConcluidas[key] || 0) + t.valor;
      concluidasCount++;
    } else if (statusPendente) {
      groupedPendentes[key] = (groupedPendentes[key] || 0) + t.valor;
      pendentesCount++;
    } else {
      outrosCount++;
      console.log('[SALES CHART] ⚠️ Transação com status não reconhecido:', {
        id: t.id,
        cliente: t.cliente,
        status: t.status,
        valor: t.valor
      });
    }
  });
  
  console.log('[SALES CHART] 📊 Separação por status:', {
    concluidas: concluidasCount,
    pendentes: pendentesCount,
    outros: outrosCount
  });
  
  // Obter todas as datas únicas
  const allDates = new Set([...Object.keys(groupedConcluidas), ...Object.keys(groupedPendentes)]);
  
  console.log('[SALES CHART] 📅 Datas únicas:', Array.from(allDates));
  
  // Converter para array e ordenar por data
  return Array.from(allDates)
    .map(name => ({
      name,
      concluidas: groupedConcluidas[name] || 0,
      pendentes: groupedPendentes[name] || 0
    }))
    .sort((a, b) => {
      // Ordenar por data corretamente
      const dateA = groupBy === 'mes' ? a.name : a.name.split('/').reverse().join('-');
      const dateB = groupBy === 'mes' ? b.name : b.name.split('/').reverse().join('-');
      return dateA.localeCompare(dateB);
    });
}

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
  
  // Determinar se o período é compatível com meta mensal e calcular ano/mês
  const getPeriodoMeta = useMemo(() => {
    const hoje = new Date();
    
    // Se for "current_month", usar mês atual
    if (period === "current_month") {
      return {
        compativel: true,
        year: hoje.getFullYear(),
        month: hoje.getMonth() + 1
      };
    }
    
    // Se for formato YYYY-MM (legado), extrair ano e mês
    if (period && period.includes('-')) {
      const [year, month] = period.split('-').map(Number);
      if (!isNaN(year) && !isNaN(month)) {
        return {
          compativel: true,
          year,
          month
        };
      }
    }
    
    // Para outros períodos (7, 30, 90, 365, custom), não mostrar meta
    return { compativel: false, year: 0, month: 0 };
  }, [period]);
  
  // Carregar meta do período
  useEffect(() => {
    async function loadMeta() {
      if (!getPeriodoMeta.compativel) {
        console.log('[SALES CHART] ⚠️ Período não compatível com meta:', period);
        setMetaPeriodo(0);
        return;
      }
      
      const { year, month } = getPeriodoMeta;
      console.log('[SALES CHART] 📊 Carregando meta para período:', { year, month });
      
      try {
        let metaMensal = 0;
        
        if (ehVendedor && usuario) {
          // Meta individual do vendedor
          console.log('[SALES CHART] 👤 Buscando meta do vendedor:', usuario.id);
          metaMensal = await buscarMetaVendedor(usuario.id, year, month);
          console.log('[SALES CHART] ✅ Meta do vendedor:', metaMensal);
        } else if (filters?.vendedores && filters.vendedores.length > 0) {
          // Meta dos vendedores selecionados nos filtros
          console.log('[SALES CHART] 👥 Buscando meta dos vendedores filtrados:', filters.vendedores);
          
          // ✅ CORRIGIDO: Buscar IDs reais dos vendedores via API
          try {
            const usuariosData = await api.get('usuarios');
            const vendedoresMap = new Map(
              usuariosData
                .filter((u: any) => u.tipo === 'vendedor')
                .map((u: any) => [u.nome, u.id])
            );
            
            const vendedorIds = filters.vendedores
              .map(nome => vendedoresMap.get(nome))
              .filter(Boolean) as string[];
            
            console.log('[SALES CHART] 🔍 IDs dos vendedores filtrados:', vendedorIds);
            
            // Buscar meta de cada vendedor e somar
            const metas = await Promise.all(
              vendedorIds.map(id => buscarMetaVendedor(id, year, month))
            );
            console.log('[SALES CHART] 📊 Metas individuais:', metas);
            metaMensal = metas.reduce((sum, meta) => sum + meta, 0);
            console.log('[SALES CHART] ✅ Meta total dos filtrados:', metaMensal);
          } catch (error) {
            console.error('[SALES CHART] ❌ Erro ao buscar vendedores:', error);
          }
        } else {
          // Meta total de todos os vendedores
          console.log('[SALES CHART] 🌐 Buscando meta total de todos os vendedores');
          metaMensal = await buscarMetaTotal(year, month);
          console.log('[SALES CHART] ✅ Meta total:', metaMensal);
        }
        
        setMetaPeriodo(metaMensal);
      } catch (error) {
        console.error('[SALES CHART] ❌ Erro ao carregar meta:', error);
        setMetaPeriodo(0);
      }
    }
    
    loadMeta();
  }, [getPeriodoMeta, ehVendedor, usuario, filters]);
  
  // Calculate chart data from filtered transactions
  const data = useMemo(() => {
    // Se não houver transações filtradas após aplicar os filtros, retornar array vazio
    if (transactions.length === 0) {
      return [];
    }
    
    // Agrupar por período e status (concluídas vs pendentes)
    const grouped = groupTransactionsByPeriodAndStatus(transactions, 'dia');
    
    // Calcular vendas acumuladas para cada categoria
    let acumuladoConcluidas = 0;
    let acumuladoPendentes = 0;
    
    const dataWithAccumulated = grouped.map(g => {
      acumuladoConcluidas += g.concluidas;
      acumuladoPendentes += g.pendentes;
      return {
        periodo: g.name,
        vendasConcluidas: acumuladoConcluidas,
        vendasPendentes: acumuladoPendentes,
        // Manter vendasAcumuladas para compatibilidade com a meta
        vendasAcumuladas: acumuladoConcluidas
      };
    });
    
    return dataWithAccumulated;
  }, [transactions]); // Corrigido: incluir transactions nas dependências
  
  // Calcular se a meta foi atingida
  const metaAtingida = getPeriodoMeta.compativel && data.length > 0 && data[data.length - 1].vendasAcumuladas >= metaPeriodo;
  
  // ✅ Calcular o valor máximo do gráfico para incluir a meta
  const maxValue = useMemo(() => {
    if (data.length === 0) return 0;
    
    const maxVendas = Math.max(
      ...data.map(d => Math.max(d.vendasConcluidas, d.vendasPendentes))
    );
    
    console.log('[SALES CHART] 📊 Calculando domínio do eixo Y:', {
      maxVendas,
      metaPeriodo,
      isPeriodoComMeta: getPeriodoMeta.compativel
    });
    
    // Se há meta, garantir que o eixo Y vai até pelo menos a meta
    if (getPeriodoMeta.compativel && metaPeriodo > 0) {
      const maxWithMeta = Math.max(maxVendas, metaPeriodo) * 1.1; // 10% a mais para dar espaço
      console.log('[SALES CHART] ✅ Domínio ajustado com meta:', maxWithMeta);
      return maxWithMeta;
    }
    
    const maxNormal = maxVendas * 1.1;
    console.log('[SALES CHART] ✅ Domínio normal:', maxNormal);
    return maxNormal;
  }, [data, getPeriodoMeta, metaPeriodo]);
  
  // Obter descrição do período
  const getDescricaoPeriodo = () => {
    if (!getPeriodoMeta.compativel) {
      return "Vendas Concluídas (verde) e Vendas a Concluir (amarelo tracejado)";
    }
    
    const metaFormatada = `R$ ${metaPeriodo.toLocaleString('pt-BR')}`;
    
    return `Concluídas (verde) e Vendas a Concluir (amarelo) vs meta de ${metaFormatada}`;
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
              yAxisId="1"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              domain={[0, maxValue]}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              formatter={(value: number, name: string) => {
                const label = name === 'vendasConcluidas' 
                  ? 'Vendas Concluídas' 
                  : name === 'vendasPendentes'
                  ? 'Vendas a Concluir'
                  : 'Vendas Acumuladas';
                return [`R$ ${value.toLocaleString('pt-BR')}`, label];
              }}
            />
            <Legend 
              formatter={(value: string) => {
                if (value === 'vendasConcluidas') return 'Vendas Concluídas';
                if (value === 'vendasPendentes') return 'Vendas a Concluir';
                return value;
              }}
            />
            
            {/* Linha de referência da meta do período (apenas se aplicável) */}
            {getPeriodoMeta.compativel && metaPeriodo > 0 && (
              <ReferenceLine 
                yAxisId="1"
                y={metaPeriodo} 
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{ 
                  value: `Meta: R$ ${(metaPeriodo / 1000).toFixed(0)}k`,
                  position: 'insideTopRight',
                  fill: "#3b82f6",
                  fontSize: 12,
                  fontWeight: 600
                }}
              />
            )}
            
            {/* Linha verde - Vendas Concluídas */}
            <Line 
              yAxisId="1"
              type="monotone" 
              dataKey="vendasConcluidas" 
              stroke="#22c55e"
              strokeWidth={3}
              name="vendasConcluidas"
              dot={{ fill: "#22c55e", r: 5 }}
              activeDot={{ r: 7 }}
            />
            
            {/* Linha amarela - Vendas a Concluir */}
            <Line 
              yAxisId="1"
              type="monotone" 
              dataKey="vendasPendentes" 
              stroke="#eab308"
              strokeWidth={3}
              name="vendasPendentes"
              dot={{ fill: "#eab308", r: 5 }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
          </ResponsiveContainer>
        </div>
        )}
      </CardContent>
    </Card>
  );
}
