/**
 * Serviço para calcular métricas da equipe baseado em dados reais de vendas
 */
import { api } from './api';
import { Venda } from '../types/venda';
import { Seller } from '../types';

export interface VendedorMetrics {
  vendedorId: string;
  vendedorNome: string;
  vendasMes: number;
  qtdFechamentos: number;
  positivacao: number;
  meta: number;
  progressoMeta: number;
}

/**
 * Calcular métricas de vendas por vendedor para um período específico
 */
export async function calcularMetricasVendedores(
  periodo: string, // formato: YYYY-MM
  vendedores: Seller[]
): Promise<Map<string, VendedorMetrics>> {
  try {
    console.log('[TEAM-METRICS] Calculando métricas para período:', periodo);
    console.log('[TEAM-METRICS] Vendedores:', vendedores.length);
    
    // Buscar todas as vendas
    const vendas: Venda[] = await api.get('vendas');
    console.log('[TEAM-METRICS] Total de vendas carregadas:', vendas.length);
    
    // Buscar naturezas de operação para filtrar apenas as que geram receita
    const naturezas = await api.naturezasOperacao.list();
    const naturezasReceitaIds = new Set(
      naturezas.filter(n => n.geraReceita).map(n => n.id)
    );
    
    // Filtrar vendas do período e que geram receita
    const [ano, mes] = periodo.split('-');
    const vendasDoPeriodo = vendas.filter(venda => {
      const dataVenda = venda.dataPedido instanceof Date 
        ? venda.dataPedido 
        : new Date(venda.dataPedido);
      
      const anoVenda = dataVenda.getFullYear();
      const mesVenda = dataVenda.getMonth() + 1;
      
      // Verificar se está no período correto
      const noPeriodo = anoVenda === parseInt(ano) && mesVenda === parseInt(mes);
      
      // Verificar se não foi cancelada
      const naoCancelada = !['Cancelado', 'cancelado', 'Cancelada', 'cancelada'].includes(venda.status);
      
      // Verificar se gera receita
      const geraReceita = naturezasReceitaIds.has(venda.naturezaOperacaoId);
      
      return noPeriodo && naoCancelada && geraReceita;
    });
    
    console.log('[TEAM-METRICS] Vendas do período:', vendasDoPeriodo.length);
    
    // Criar mapa de métricas por vendedor
    const metricsMap = new Map<string, VendedorMetrics>();
    
    // Inicializar métricas para cada vendedor
    vendedores.forEach(vendedor => {
      // Buscar meta do período
      const anoNum = parseInt(ano);
      const mesNum = parseInt(mes);
      const metaAno = vendedor.metasAnuais?.find(m => m.ano === anoNum);
      const metaMes = metaAno?.metas.find(m => m.mes === mesNum);
      const metaValor = metaMes?.valor || 0;
      
      metricsMap.set(vendedor.id, {
        vendedorId: vendedor.id,
        vendedorNome: vendedor.nome,
        vendasMes: 0,
        qtdFechamentos: 0,
        positivacao: 0,
        meta: metaValor,
        progressoMeta: 0
      });
    });
    
    // Calcular métricas por vendedor
    vendasDoPeriodo.forEach(venda => {
      const metrics = metricsMap.get(venda.vendedorId);
      if (metrics) {
        // Somar valor da venda (usar valorFaturado se disponível, senão total)
        const valorVenda = venda.valorFaturado || venda.total || venda.valorPedido || venda.valorTotalProdutos || 0;
        metrics.vendasMes += valorVenda;
        
        // Incrementar quantidade de fechamentos
        metrics.qtdFechamentos += 1;
      }
    });
    
    // Calcular positivação (clientes únicos) para cada vendedor
    vendedores.forEach(vendedor => {
      const clientesUnicos = new Set(
        vendasDoPeriodo
          .filter(v => v.vendedorId === vendedor.id)
          .map(v => v.clienteId)
      );
      
      const metrics = metricsMap.get(vendedor.id);
      if (metrics) {
        metrics.positivacao = clientesUnicos.size;
        
        // Calcular progresso da meta
        if (metrics.meta > 0) {
          metrics.progressoMeta = Math.round((metrics.vendasMes / metrics.meta) * 100);
        }
      }
    });
    
    console.log('[TEAM-METRICS] Métricas calculadas:', metricsMap.size);
    return metricsMap;
    
  } catch (error) {
    console.error('[TEAM-METRICS] Erro ao calcular métricas:', error);
    // Retornar mapa vazio em caso de erro
    return new Map();
  }
}

/**
 * Obter métricas de um vendedor específico
 */
export function getVendedorMetrics(
  vendedorId: string,
  metricsMap: Map<string, VendedorMetrics>
): VendedorMetrics {
  return metricsMap.get(vendedorId) || {
    vendedorId,
    vendedorNome: '',
    vendasMes: 0,
    qtdFechamentos: 0,
    positivacao: 0,
    meta: 0,
    progressoMeta: 0
  };
}
