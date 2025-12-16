/**
 * Serviço para converter dados reais do Supabase para o formato do Dashboard
 * Substituiu completamente o uso de mockTransactions
 * @updated 2025-11-16
 */
import { Venda } from '../types/venda';
import { Cliente } from '../types/customer';
import { api } from './api';

export interface Transaction {
  id: string;
  cliente: string;
  vendedor: string;
  valor: number;
  quantidade?: number;
  natureza: string;
  segmento: string;
  statusCliente: string;
  grupoRede?: string;
  uf: string;
  data: string; // formato DD/MM/YYYY
  periodo: string;
  dia: string;
  semana?: number;
}

export interface TopSeller {
  vendedor: string;
  valor: number;
  vendas: number;
}

/**
 * Carregar dados de vendas e clientes do Supabase e converter para formato do Dashboard
 */
export async function carregarDadosDashboard(): Promise<Transaction[]> {
  try {
    console.log('[DASHBOARD-SERVICE] Carregando vendas...');
    
    // Carregar vendas
    const vendas: Venda[] = await api.get('vendas');
    console.log('[DASHBOARD-SERVICE] Vendas carregadas:', vendas.length);
    
    // Carregar clientes para obter informações adicionais (segmento, UF, etc.)
    const clientes: Cliente[] = await api.get('clientes');
    console.log('[DASHBOARD-SERVICE] Clientes carregados:', clientes.length);
    
    // Criar mapa de clientes para acesso rápido
    const clientesMap = new Map<string, Cliente>();
    clientes.forEach(cliente => {
      clientesMap.set(cliente.id, cliente);
    });
    
    // Converter vendas para transações
    const transactions: Transaction[] = vendas.map(venda => {
      const cliente = clientesMap.get(venda.clienteId);
      
      // Converter data de Date para string DD/MM/YYYY
      const dataVenda = venda.dataPedido instanceof Date 
        ? venda.dataPedido 
        : new Date(venda.dataPedido);
      
      const dia = String(dataVenda.getDate()).padStart(2, '0');
      const mes = String(dataVenda.getMonth() + 1).padStart(2, '0');
      const ano = dataVenda.getFullYear();
      const dataFormatada = `${dia}/${mes}/${ano}`;
      
      // Obter dia da semana
      const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const diaSemana = diasSemana[dataVenda.getDay()];
      
      // Calcular semana do mês (1-5)
      const diaDoMes = dataVenda.getDate();
      const semanaDoMes = Math.ceil(diaDoMes / 7);
      
      return {
        id: venda.numero, // Usar número do pedido como ID
        cliente: venda.nomeCliente,
        vendedor: venda.nomeVendedor,
        valor: venda.valorPedido,
        quantidade: venda.totalQuantidades,
        natureza: venda.nomeNaturezaOperacao,
        segmento: cliente?.segmentoMercado || 'Não Classificado',
        statusCliente: cliente?.situacao || 'Ativo',
        grupoRede: cliente?.grupoRede,
        uf: cliente?.uf || 'N/A',
        data: dataFormatada,
        periodo: `Sem ${semanaDoMes}`,
        dia: diaSemana,
        semana: semanaDoMes,
      };
    });
    
    console.log('[DASHBOARD-SERVICE] Transações convertidas:', transactions.length);
    return transactions;
    
  } catch (error) {
    console.error('[DASHBOARD-SERVICE] Erro ao carregar dados:', error);
    throw error;
  }
}

/**
 * Filtrar transações por período (mês/ano)
 */
export function filtrarPorPeriodo(
  transactions: Transaction[], 
  periodo: string
): { current: Transaction[], previous: Transaction[] } {
  
  if (!periodo || !periodo.includes('-')) {
    console.warn('[DASHBOARD-SERVICE] Período inválido:', periodo);
    return { current: transactions, previous: [] };
  }
  
  const [year, month] = periodo.split('-');
  const yearNum = parseInt(year);
  const monthNum = parseInt(month);
  
  if (isNaN(yearNum) || isNaN(monthNum)) {
    console.warn('[DASHBOARD-SERVICE] Período inválido (não numérico):', periodo);
    return { current: transactions, previous: [] };
  }
  
  // Filtrar transações do período atual
  const current = transactions.filter(transaction => {
    const [day, transMonth, transYear] = transaction.data.split('/');
    const transYearNum = parseInt(transYear);
    const transMonthNum = parseInt(transMonth);
    
    return transYearNum === yearNum && transMonthNum === monthNum;
  });
  
  // Calcular mês anterior
  let prevYear = yearNum;
  let prevMonth = monthNum - 1;
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear = yearNum - 1;
  }
  
  // Filtrar transações do período anterior
  const previous = transactions.filter(transaction => {
    const [day, transMonth, transYear] = transaction.data.split('/');
    const transYearNum = parseInt(transYear);
    const transMonthNum = parseInt(transMonth);
    
    return transYearNum === prevYear && transMonthNum === prevMonth;
  });
  
  console.log(`[DASHBOARD-SERVICE] Período ${periodo}:`, {
    atual: current.length,
    anterior: previous.length,
    mesAnterior: `${prevYear}-${String(prevMonth).padStart(2, '0')}`
  });
  
  return { current, previous };
}

/**
 * Agrupar transações por período (para gráficos)
 */
export function groupTransactionsByPeriod(
  transactions: Transaction[], 
  groupBy: 'dia' | 'semana' = 'dia'
): any[] {
  if (groupBy === 'dia') {
    // Agrupar por dia da semana
    const grouped = new Map<string, number>();
    const diasOrdem = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    
    // Inicializar todos os dias com 0
    diasOrdem.forEach(dia => grouped.set(dia, 0));
    
    // Somar vendas por dia
    transactions.forEach(t => {
      const atual = grouped.get(t.dia) || 0;
      grouped.set(t.dia, atual + t.valor);
    });
    
    // Retornar no formato para recharts
    return diasOrdem.map(dia => ({
      name: dia,
      valor: grouped.get(dia) || 0,
    }));
  } else {
    // Agrupar por semana
    const grouped = new Map<string, number>();
    
    transactions.forEach(t => {
      const periodo = t.periodo;
      const atual = grouped.get(periodo) || 0;
      grouped.set(periodo, atual + t.valor);
    });
    
    // Ordenar semanas
    return Array.from(grouped.entries())
      .sort((a, b) => {
        const numA = parseInt(a[0].replace('Sem ', ''));
        const numB = parseInt(b[0].replace('Sem ', ''));
        return numA - numB;
      })
      .map(([name, valor]) => ({ name, valor }));
  }
}

/**
 * Calcular top vendedores
 */
export function calculateTopSellers(transactions: Transaction[]): TopSeller[] {
  const vendedorMap = new Map<string, { valor: number, vendas: number }>();
  
  transactions.forEach(t => {
    const current = vendedorMap.get(t.vendedor) || { valor: 0, vendas: 0 };
    vendedorMap.set(t.vendedor, {
      valor: current.valor + t.valor,
      vendas: current.vendas + 1,
    });
  });
  
  return Array.from(vendedorMap.entries())
    .map(([vendedor, data]) => ({
      vendedor,
      valor: data.valor,
      vendas: data.vendas,
    }))
    .sort((a, b) => b.valor - a.valor);
}

/**
 * Calcular positivação (clientes únicos que compraram no período)
 */
export function calculatePositivation(transactions: Transaction[], vendedorNome?: string) {
  // Clientes únicos que compraram
  const uniqueCustomers = new Set(transactions.map(t => t.cliente));
  const positivatedCount = uniqueCustomers.size;
  
  // Total de clientes estimado baseado nos dados disponíveis
  // TODO: Melhorar buscando total real de clientes do Supabase
  const totalCustomers = positivatedCount > 0 ? positivatedCount : 1;
  
  const positivationPercentage = totalCustomers > 0
    ? (positivatedCount / totalCustomers) * 100
    : 0;
  
  return {
    positivatedCount,
    totalCustomers,
    positivationPercentage
  };
}

/**
 * Calcular distribuição de clientes por status
 * Retorna distribuição baseada nos dados reais do Supabase
 */
export async function calculateCustomerDistribution(vendedorNome?: string) {
  try {
    // Buscar clientes reais do Supabase
    const clientes: Cliente[] = await api.get('clientes');
    
    // Filtrar por vendedor se especificado
    let clientesFiltrados = clientes;
    if (vendedorNome) {
      clientesFiltrados = clientes.filter(c => c.nomeVendedor === vendedorNome);
    }
    
    // Contar ativos e inativos
    const active = clientesFiltrados.filter(c => c.situacao === 'Ativo').length;
    const inactive = clientesFiltrados.filter(c => c.situacao === 'Inativo').length;
    const total = active + inactive;
    
    return {
      active,
      inactive,
      total,
      activePercentage: total > 0 ? ((active / total) * 100).toFixed(1) : "0.0",
      inactivePercentage: total > 0 ? ((inactive / total) * 100).toFixed(1) : "0.0",
    };
  } catch (error) {
    console.error('[DASHBOARD-SERVICE] Erro ao calcular distribuição de clientes:', error);
    // Retornar valores padrão em caso de erro
    return {
      active: 0,
      inactive: 0,
      total: 0,
      activePercentage: "0.0",
      inactivePercentage: "0.0",
    };
  }
}

/**
 * Calcular métricas com comparação ao período anterior
 */
export function calculateMetricsWithComparison(
  currentTransactions: Transaction[],
  previousTransactions: Transaction[],
  metaMensal: number,
  vendedorNome?: string
): {
  vendasTotais: number;
  vendasTotaisChange: number;
  ticketMedio: number;
  ticketMedioChange: number;
  produtosVendidos: number;
  produtosVendidosChange: number;
  positivacao: number;
  positivacaoChange: number;
  positivacaoCount: number;
  positivacaoTotal: number;
  vendedoresAtivos: number;
  vendedoresAtivosChange: number;
  porcentagemMeta: number;
  porcentagemMetaChange: number;
  negociosFechados: number;
} {
  // Métricas atuais
  const vendasTotais = currentTransactions.reduce((sum, t) => sum + t.valor, 0);
  const negociosFechados = currentTransactions.length;
  const ticketMedio = negociosFechados > 0 ? vendasTotais / negociosFechados : 0;
  const produtosVendidos = currentTransactions.reduce((sum, t) => sum + (t.quantidade || 0), 0);
  
  // Vendedores ativos
  const vendedoresUnicos = new Set(currentTransactions.map(t => t.vendedor));
  const vendedoresAtivos = vendedoresUnicos.size;
  
  // Clientes únicos
  const clientesUnicos = new Set(currentTransactions.map(t => t.cliente));
  const positivacaoCount = clientesUnicos.size;
  
  // Total de clientes (estimado - pode ser ajustado se tivermos o total real)
  const positivacaoTotal = positivacaoCount > 0 ? positivacaoCount : 1;
  const positivacao = (positivacaoCount / positivacaoTotal) * 100;
  
  // Meta
  const porcentagemMeta = metaMensal > 0 ? (vendasTotais / metaMensal) * 100 : 0;
  
  // Métricas anteriores (para comparação)
  const vendasTotaisAnterior = previousTransactions.reduce((sum, t) => sum + t.valor, 0);
  const negociosFechadosAnterior = previousTransactions.length;
  const ticketMedioAnterior = negociosFechadosAnterior > 0 ? vendasTotaisAnterior / negociosFechadosAnterior : 0;
  const produtosVendidosAnterior = previousTransactions.reduce((sum, t) => sum + (t.quantidade || 0), 0);
  
  const vendedoresUnicosAnterior = new Set(previousTransactions.map(t => t.vendedor));
  const vendedoresAtivosAnterior = vendedoresUnicosAnterior.size;
  
  const clientesUnicosAnterior = new Set(previousTransactions.map(t => t.cliente));
  const positivacaoCountAnterior = clientesUnicosAnterior.size;
  const positivacaoAnterior = positivacaoCountAnterior > 0 
    ? (positivacaoCountAnterior / positivacaoTotal) * 100 
    : 0;
  
  // Calcular variações percentuais
  const calcularVariacao = (atual: number, anterior: number): number => {
    if (anterior === 0) return atual > 0 ? 100 : 0;
    return ((atual - anterior) / anterior) * 100;
  };
  
  return {
    vendasTotais,
    vendasTotaisChange: calcularVariacao(vendasTotais, vendasTotaisAnterior),
    ticketMedio,
    ticketMedioChange: calcularVariacao(ticketMedio, ticketMedioAnterior),
    produtosVendidos,
    produtosVendidosChange: calcularVariacao(produtosVendidos, produtosVendidosAnterior),
    positivacao,
    positivacaoChange: calcularVariacao(positivacao, positivacaoAnterior),
    positivacaoCount,
    positivacaoTotal,
    vendedoresAtivos,
    vendedoresAtivosChange: calcularVariacao(vendedoresAtivos, vendedoresAtivosAnterior),
    porcentagemMeta,
    porcentagemMetaChange: 0, // Não temos meta anterior para comparar
    negociosFechados,
  };
}