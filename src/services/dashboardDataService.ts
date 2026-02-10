/**
 * Serviço para converter dados reais do Supabase para o formato do Dashboard
 * Substituiu completamente o uso de mockTransactions
 * @updated 2025-11-16
 * @updated 2025-12-11 - Adicionado filtro de naturezas que geram receita e uso de valores faturados
 * @updated 2025-12-13 - Corrigido cálculo de positivação para usar dados reais do Supabase
 * @updated 2025-12-18 - Corrigido para buscar vendedor por ID em vez de nome
 */
import { Venda } from '../types/venda';
import { Cliente } from '../types/customer';
import { NaturezaOperacao } from '../types/naturezaOperacao';
import { Seller } from '../types';
import { api } from './api';

export interface Transaction {
  id: string;
  vendaId?: string; // ID real da venda no Supabase (para navegação)
  cliente: string;
  clienteId: string; // 🆕 ID do cliente (para agrupamentos corretos)
  vendedor: string; // Nome do vendedor (para exibição)
  vendedorId: string; // ID do vendedor (para filtros e agrupamentos)
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
  faturado: boolean; // Se é valor faturado ou provisório
  status?: string; // Status da venda (ex: 'pendente', 'concluída', etc)
  cancelado?: boolean; // Se a venda foi cancelada (não deve ser contabilizada nos totais)
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
    
    // Carregar naturezas de operação para filtrar receitas
    const naturezas: NaturezaOperacao[] = await api.naturezasOperacao.list();
    console.log('[DASHBOARD-SERVICE] Naturezas de operação carregadas:', naturezas.length);
    
    // 🆕 Carregar vendedores para mapear ID -> Nome
    const vendedores: Seller[] = await api.get('vendedores');
    console.log('[DASHBOARD-SERVICE] Vendedores carregados:', vendedores.length);
    
    // Criar mapa de clientes para acesso rápido
    const clientesMap = new Map<string, Cliente>();
    clientes.forEach(cliente => {
      clientesMap.set(cliente.id, cliente);
    });
    
    // Criar mapa de naturezas de operação para acesso rápido
    const naturezasMap = new Map<string, NaturezaOperacao>();
    naturezas.forEach(natureza => {
      naturezasMap.set(natureza.id, natureza);
    });
    
    // 🆕 Criar mapa de vendedores para acesso rápido (ID -> Nome)
    const vendedoresMap = new Map<string, string>();
    vendedores.forEach(vendedor => {
      vendedoresMap.set(vendedor.id, vendedor.nome);
    });
    
    // Converter vendas para transações
    const transactions: Transaction[] = vendas
      .filter(venda => {
        // Filtrar apenas vendas de naturezas que geram receita
        const natureza = naturezasMap.get(venda.naturezaOperacaoId);
        return natureza?.geraReceita === true;
      })
      .map(venda => {
        const cliente = clientesMap.get(venda.clienteId);
        const natureza = naturezasMap.get(venda.naturezaOperacaoId);
        
        // 🆕 Buscar nome do vendedor pelo ID
        const nomeVendedor = vendedoresMap.get(venda.vendedorId) || venda.nomeVendedor || 'Vendedor não identificado';
        
        // Verificar se a venda foi cancelada
        const statusCancelado = ['Cancelado', 'cancelado', 'Cancelada', 'cancelada'].includes(venda.status);
        
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
        
        // Usar valor faturado se disponível, senão usar valor do pedido (provisório)
        const valorFinal = venda.valorFaturado ?? venda.valorPedido;
        
        // Badge verde (faturado) se:
        // 1. Tem valorFaturado preenchido OU
        // 2. Status indica que já passou pelo faturamento (Faturado e etapas posteriores)
        const statusNorm = (venda.status || '')
          .toString()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim();
        const statusFaturadoSet = new Set([
          'faturado',
          'pronto para envio',
          'enviado',
          'entregue',
          'nao entregue',
          // Compat legado
          'concluido',
          'concluida',
        ]);
        const statusFaturado = statusFaturadoSet.has(statusNorm);
        const ehFaturado = (venda.valorFaturado !== undefined && venda.valorFaturado !== null) || statusFaturado;
        
        // Log detalhado para debug do sinalizador de faturamento
        if (venda.id === 'venda-1765486455478' || venda.numero === 'PV-2025-4554') {
          console.log('[DASHBOARD-SERVICE] 🔍 DEBUG VENDA:', {
            id: venda.id,
            numero: venda.numero,
            valorFaturado: venda.valorFaturado,
            valorPedido: venda.valorPedido,
            valorFinal,
            statusFaturado,
            ehFaturado,
            status: venda.status,
            statusCancelado,
            integracaoERP: venda.integracaoERP
          });
        }
        
        return {
          id: venda.numero, // Usar número do pedido como ID
          vendaId: venda.id, // ID real da venda no Supabase (para navegação)
          cliente: venda.nomeCliente,
          clienteId: venda.clienteId, // 🆕 ID do cliente
          vendedor: nomeVendedor, // 🆕 Nome buscado pelo ID
          vendedorId: venda.vendedorId, // 🆕 ID do vendedor
          valor: valorFinal,
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
          faturado: ehFaturado, // Se tem valor faturado ou é provisório
          status: venda.status, // Status da venda
          cancelado: statusCancelado, // Se a venda foi cancelada
        };
      });
    
    console.log('[DASHBOARD-SERVICE] Transações convertidas:', transactions.length);
    console.log('[DASHBOARD-SERVICE] Transações que geram receita:', transactions.length);
    
    // Log de vendas canceladas
    const vendasCanceladas = transactions.filter(t => t.cancelado);
    if (vendasCanceladas.length > 0) {
      console.log('[DASHBOARD-SERVICE] 🚫 Vendas canceladas encontradas (não serão contabilizadas nos totais):', {
        total: vendasCanceladas.length,
        vendas: vendasCanceladas.map(v => ({ id: v.id, cliente: v.cliente, valor: v.valor }))
      });
    }
    
    return transactions;
    
  } catch (error) {
    console.error('[DASHBOARD-SERVICE] Erro ao carregar dados:', error);
    throw error;
  }
}

/**
 * Filtrar transações por período
 * Suporta dois formatos:
 * 1. Período mensal: "YYYY-MM" (ex: "2025-12")
 * 2. Períodos pré-definidos: "7", "30", "current_month", "90", "365"
 * 3. Período customizado: "custom" (usa dateRange separado)
 */
export function filtrarPorPeriodo(
  transactions: Transaction[], 
  periodo: string,
  customDateRange?: { from?: Date; to?: Date }
): { current: Transaction[], previous: Transaction[] } {
  
  // Se for período personalizado, usar dateRange
  if (periodo === "custom" && customDateRange?.from && customDateRange?.to) {
    const current = transactions.filter(transaction => {
      const [day, month, year] = transaction.data.split('/');
      const transDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return transDate >= customDateRange.from! && transDate <= customDateRange.to!;
    });
    
    // Calcular período anterior com a mesma duração
    const duration = customDateRange.to.getTime() - customDateRange.from.getTime();
    const previousFrom = new Date(customDateRange.from.getTime() - duration);
    const previousTo = new Date(customDateRange.to.getTime() - duration);
    
    const previous = transactions.filter(transaction => {
      const [day, month, year] = transaction.data.split('/');
      const transDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return transDate >= previousFrom && transDate <= previousTo;
    });
    
    return { current, previous };
  }
  
  // Se for período pré-definido em dias
  if (["7", "30", "90", "365", "current_month"].includes(periodo)) {
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    
    let dataInicio: Date;
    let dataFim: Date = hoje;
    let previousDataInicio: Date;
    let previousDataFim: Date;
    
    if (periodo === "current_month") {
      // Mês atual: do dia 1 até hoje
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      dataInicio.setHours(0, 0, 0, 0);
      
      // Período anterior: mês anterior completo
      previousDataFim = new Date(hoje.getFullYear(), hoje.getMonth(), 0); // Último dia do mês anterior
      previousDataFim.setHours(23, 59, 59, 999);
      previousDataInicio = new Date(previousDataFim.getFullYear(), previousDataFim.getMonth(), 1);
      previousDataInicio.setHours(0, 0, 0, 0);
    } else {
      // Período em dias
      const dias = parseInt(periodo);
      dataInicio = new Date(hoje);
      dataInicio.setDate(hoje.getDate() - dias);
      dataInicio.setHours(0, 0, 0, 0);
      
      // Período anterior com mesma duração
      previousDataFim = new Date(dataInicio);
      previousDataFim.setDate(dataInicio.getDate() - 1);
      previousDataFim.setHours(23, 59, 59, 999);
      previousDataInicio = new Date(previousDataFim);
      previousDataInicio.setDate(previousDataFim.getDate() - dias);
      previousDataInicio.setHours(0, 0, 0, 0);
    }
    
    const current = transactions.filter(transaction => {
      const [day, month, year] = transaction.data.split('/');
      const transDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      transDate.setHours(0, 0, 0, 0);
      return transDate >= dataInicio && transDate <= dataFim;
    });
    
    const previous = transactions.filter(transaction => {
      const [day, month, year] = transaction.data.split('/');
      const transDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      transDate.setHours(0, 0, 0, 0);
      return transDate >= previousDataInicio && transDate <= previousDataFim;
    });
    
    console.log(`[DASHBOARD-SERVICE] Período ${periodo}:`, {
      atual: current.length,
      anterior: previous.length,
      dataInicio: dataInicio.toLocaleDateString('pt-BR'),
      dataFim: dataFim.toLocaleDateString('pt-BR'),
      previousDataInicio: previousDataInicio.toLocaleDateString('pt-BR'),
      previousDataFim: previousDataFim.toLocaleDateString('pt-BR'),
    });
    
    return { current, previous };
  }
  
  // Formato antigo: YYYY-MM (manter compatibilidade)
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
 * Retorna dados baseados em clientes reais do Supabase
 */
export async function calculatePositivation(transactions: Transaction[], vendedorNome?: string) {
  // Clientes únicos que compraram no período
  const uniqueCustomers = new Set(transactions.map(t => t.cliente));
  const positivatedCount = uniqueCustomers.size;
  
  // Buscar total REAL de clientes cadastrados no Supabase
  let totalCustomers = 0;
  try {
    const clientes: Cliente[] = await api.get('clientes');
    
    // Filtrar por vendedor se especificado
    if (vendedorNome) {
      const clientesDoVendedor = clientes.filter(c => c.vendedorAtribuido?.nome === vendedorNome);
      // Contar apenas clientes Ativos e Inativos (mesma lógica de calculateCustomerDistribution)
      totalCustomers = clientesDoVendedor.filter(c => 
        c.situacao === 'Ativo' || c.situacao === 'Inativo'
      ).length;
    } else {
      // Contar apenas clientes Ativos e Inativos (mesma lógica de calculateCustomerDistribution)
      totalCustomers = clientes.filter(c => 
        c.situacao === 'Ativo' || c.situacao === 'Inativo'
      ).length;
    }
    
    console.log('[DASHBOARD-SERVICE] Positivação calculada:', {
      vendedorNome: vendedorNome || 'Todos',
      clientesQueCompraram: positivatedCount,
      totalClientes: totalCustomers,
      percentual: Math.round((positivatedCount / totalCustomers) * 100 * 10) / 10
    });
  } catch (error) {
    console.error('[DASHBOARD-SERVICE] Erro ao buscar clientes para positivação:', error);
    // Fallback: usar número de clientes que compraram
    totalCustomers = positivatedCount > 0 ? positivatedCount : 1;
  }
  
  const positivationPercentage = totalCustomers > 0
    ? Math.round((positivatedCount / totalCustomers) * 100 * 10) / 10 // Arredondar para 1 casa decimal
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
      clientesFiltrados = clientes.filter(c => c.vendedorAtribuido?.nome === vendedorNome);
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
export async function calculateMetricsWithComparison(
  currentTransactions: Transaction[],
  previousTransactions: Transaction[],
  metaMensal: number,
  vendedorNome?: string
): Promise<{
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
}> {
  // Métricas atuais
  // Filtrar vendas canceladas dos cálculos
  const transacoesValidas = currentTransactions.filter(t => !t.cancelado);
  const transacoesValidasAnterior = previousTransactions.filter(t => !t.cancelado);
  
  const vendasTotais = transacoesValidas.reduce((sum, t) => sum + t.valor, 0);
  const negociosFechados = transacoesValidas.length;
  const ticketMedio = negociosFechados > 0 ? vendasTotais / negociosFechados : 0;
  const produtosVendidos = transacoesValidas.reduce((sum, t) => sum + (t.quantidade || 0), 0);
  
  // Vendedores ativos
  const vendedoresUnicos = new Set(transacoesValidas.map(t => t.vendedor));
  const vendedoresAtivos = vendedoresUnicos.size;
  
  // Clientes únicos que compraram no período
  const clientesUnicos = new Set(transacoesValidas.map(t => t.cliente));
  const positivacaoCount = clientesUnicos.size;
  
  // Buscar total REAL de clientes cadastrados no sistema
  let positivacaoTotal = 0;
  try {
    const clientes: Cliente[] = await api.get('clientes');
    // Filtrar por vendedor se especificado
    if (vendedorNome) {
      const clientesDoVendedor = clientes.filter(c => c.vendedorAtribuido?.nome === vendedorNome);
      // Contar apenas clientes Ativos e Inativos
      positivacaoTotal = clientesDoVendedor.filter(c => 
        c.situacao === 'Ativo' || c.situacao === 'Inativo'
      ).length;
    } else {
      // Contar apenas clientes Ativos e Inativos
      positivacaoTotal = clientes.filter(c => 
        c.situacao === 'Ativo' || c.situacao === 'Inativo'
      ).length;
    }
  } catch (error) {
    console.error('[DASHBOARD-SERVICE] Erro ao buscar total de clientes:', error);
    // Fallback: usar o número de clientes únicos que compraram
    positivacaoTotal = positivacaoCount > 0 ? positivacaoCount : 1;
  }
  
  const positivacao = positivacaoTotal > 0 ? (positivacaoCount / positivacaoTotal) * 100 : 0;
  
  // Meta
  const porcentagemMeta = metaMensal > 0 ? (vendasTotais / metaMensal) * 100 : 0;
  
  // Métricas anteriores (para comparação)
  const vendasTotaisAnterior = transacoesValidasAnterior.reduce((sum, t) => sum + t.valor, 0);
  const negociosFechadosAnterior = transacoesValidasAnterior.length;
  const ticketMedioAnterior = negociosFechadosAnterior > 0 ? vendasTotaisAnterior / negociosFechadosAnterior : 0;
  const produtosVendidosAnterior = transacoesValidasAnterior.reduce((sum, t) => sum + (t.quantidade || 0), 0);
  
  const vendedoresUnicosAnterior = new Set(transacoesValidasAnterior.map(t => t.vendedor));
  const vendedoresAtivosAnterior = vendedoresUnicosAnterior.size;
  
  const clientesUnicosAnterior = new Set(transacoesValidasAnterior.map(t => t.cliente));
  const positivacaoCountAnterior = clientesUnicosAnterior.size;
  const positivacaoAnterior = positivacaoTotal > 0 
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
