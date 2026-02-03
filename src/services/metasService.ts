// Serviço para gestão de metas de vendas com integração Supabase

import { api } from './api';

export interface VendedorMeta {
  id: string;
  vendedorId: string;
  vendedorNome: string;
  ano: number;
  mes: number;
  metaMensal: number;
  vendidoMes: number;
  criadoPor?: string;
  dataCriacao?: string;
  dataAtualizacao?: string;
}

/**
 * Busca meta de um vendedor específico por período
 */
export async function buscarMetaVendedor(
  vendedorId: string,
  ano: number,
  mes: number
): Promise<number> {
  try {
    const response = await api.metas.buscarPorVendedor(vendedorId, ano, mes);
    return response?.metaMensal || 0;
  } catch (error) {
    console.error('[METAS] Erro ao buscar meta do vendedor:', error);
    return 0;
  }
}

/**
 * Busca meta total de todos os vendedores em um período
 */
export async function buscarMetaTotal(
  ano: number,
  mes: number
): Promise<number> {
  try {
    const response = await api.metas.buscarTotal(ano, mes);
    
    // A resposta pode vir como objeto com total ou diretamente como número
    if (typeof response === 'number') {
      return response;
    } else if (response && typeof response === 'object') {
      // Verificar diferentes formatos de resposta
      if ('total' in response) {
        return (response as any).total || 0;
      } else if ('data' in response && typeof (response as any).data === 'object') {
        const data = (response as any).data;
        return data?.total || 0;
      }
    }
    
    return 0;
  } catch (error) {
    console.error('[METAS] Erro ao buscar meta total:', error);
    return 0;
  }
}

/**
 * Busca todas as metas (backoffice) ou apenas do vendedor logado
 * Opcionalmente filtra por ano e mês
 */
export async function buscarTodasMetas(ano?: number, mes?: number): Promise<VendedorMeta[]> {
  try {
    console.log('[METAS SERVICE] Buscando metas com filtros:', { ano, mes });
    const response = await api.metas.buscarTodas(ano, mes);
    
    console.log('[METAS SERVICE] Resposta recebida do api.metas.buscarTodas:', response);
    console.log('[METAS SERVICE] Tipo da resposta:', typeof response);
    console.log('[METAS SERVICE] É array?', Array.isArray(response));
    
    // A resposta deve vir como array de metas da Edge Function
    if (!Array.isArray(response)) {
      console.warn('[METAS SERVICE] Resposta não é um array:', response);
      console.warn('[METAS SERVICE] Tentando extrair array de objeto:', response);
      
      // Tentar extrair se for um objeto com propriedade metas
      if (response && typeof response === 'object' && 'metas' in response && Array.isArray((response as any).metas)) {
        const metasArray = (response as any).metas;
        console.log('[METAS SERVICE] Array extraído de response.metas:', metasArray.length);
        return mapearMetas(metasArray);
      }
      
      return [];
    }
    
    console.log(`[METAS SERVICE] Processando ${response.length} metas`);
    return mapearMetas(response);
  } catch (error) {
    console.error('[METAS SERVICE] Erro ao buscar todas as metas:', error);
    return [];
  }
}

function mapearMetas(metasArray: any[]): VendedorMeta[] {
  return metasArray.map((m: any): VendedorMeta => {
    const meta: VendedorMeta = {
      id: String(m.id || m.vendedorId + '-' + m.ano + '-' + m.mes),
      vendedorId: String(m.vendedorId || m.vendedor_id || ''),
      vendedorNome: m.vendedorNome || m.vendedor_nome || '',
      ano: typeof m.ano === 'number' ? m.ano : parseInt(String(m.ano || '0')),
      mes: typeof m.mes === 'number' ? m.mes : parseInt(String(m.mes || '0')),
      metaMensal: typeof m.metaMensal === 'number' ? m.metaMensal : parseFloat(String(m.metaMensal || m.meta_valor || '0')),
      vendidoMes: typeof m.vendidoMes === 'number' ? m.vendidoMes : parseFloat(String(m.vendidoMes || '0')),
      criadoPor: m.criadoPor || m.criado_por,
      dataCriacao: m.dataCriacao || m.data_criacao,
      dataAtualizacao: m.dataAtualizacao || m.data_atualizacao,
    };
    
    console.log('[METAS SERVICE] Meta mapeada:', { id: meta.id, vendedorId: meta.vendedorId, vendedorNome: meta.vendedorNome, ano: meta.ano, mes: meta.mes });
    return meta;
  });
}

/**
 * Cria ou atualiza uma meta
 */
export async function salvarMeta(
  vendedorId: string,
  ano: number,
  mes: number,
  metaMensal: number,
  vendidoMes: number = 0
): Promise<VendedorMeta | null> {
  try {
    const response = await api.metas.salvar({
      vendedorId,
      ano,
      mes,
      metaMensal,
      vendidoMes,
    });
    
    // Mapear resposta para formato VendedorMeta
    if (!response) return null;
    
    return {
      id: String(response.id || vendedorId + '-' + ano + '-' + mes),
      vendedorId: String(response.vendedorId || response.vendedor_id || vendedorId),
      vendedorNome: response.vendedorNome || response.vendedor_nome || '',
      ano: typeof response.ano === 'number' ? response.ano : parseInt(String(response.ano || ano)),
      mes: typeof response.mes === 'number' ? response.mes : parseInt(String(response.mes || mes)),
      metaMensal: typeof response.metaMensal === 'number' ? response.metaMensal : parseFloat(String(response.metaMensal || metaMensal)),
      vendidoMes: typeof response.vendidoMes === 'number' ? response.vendidoMes : parseFloat(String(response.vendidoMes || vendidoMes)),
      criadoPor: response.criadoPor || response.criado_por,
      dataCriacao: response.dataCriacao || response.data_criacao,
      dataAtualizacao: response.dataAtualizacao || response.data_atualizacao,
    };
  } catch (error) {
    console.error('[METAS] Erro ao salvar meta:', error);
    return null;
  }
}

/**
 * Atualiza uma meta existente
 */
export async function atualizarMeta(
  vendedorId: string,
  ano: number,
  mes: number,
  metaMensal: number,
  vendidoMes?: number
): Promise<VendedorMeta | null> {
  try {
    const response = await api.metas.atualizar(vendedorId, ano, mes, {
      metaMensal,
      vendidoMes,
    });
    
    // Mapear resposta para formato VendedorMeta
    if (!response) return null;
    
    return {
      id: String(response.id || vendedorId + '-' + ano + '-' + mes),
      vendedorId: String(response.vendedorId || response.vendedor_id || vendedorId),
      vendedorNome: response.vendedorNome || response.vendedor_nome || '',
      ano: typeof response.ano === 'number' ? response.ano : parseInt(String(response.ano || ano)),
      mes: typeof response.mes === 'number' ? response.mes : parseInt(String(response.mes || mes)),
      metaMensal: typeof response.metaMensal === 'number' ? response.metaMensal : parseFloat(String(response.metaMensal || metaMensal)),
      vendidoMes: typeof response.vendidoMes === 'number' ? response.vendidoMes : parseFloat(String(response.vendidoMes || vendidoMes || '0')),
      criadoPor: response.criadoPor || response.criado_por,
      dataCriacao: response.dataCriacao || response.data_criacao,
      dataAtualizacao: response.dataAtualizacao || response.data_atualizacao,
    };
  } catch (error) {
    console.error('[METAS] Erro ao atualizar meta:', error);
    return null;
  }
}

/**
 * Deleta uma meta
 */
export async function deletarMeta(
  vendedorId: string,
  ano: number,
  mes: number
): Promise<boolean> {
  try {
    await api.metas.deletar(vendedorId, ano, mes);
    return true;
  } catch (error) {
    console.error('[METAS] Erro ao deletar meta:', error);
    return false;
  }
}

/**
 * Copia metas de um período para outro
 */
export async function copiarMetas(
  deAno: number,
  deMes: number,
  paraAno: number,
  paraMes: number
): Promise<{ success: boolean; copiedCount?: number }> {
  try {
    const response = await api.metas.copiar({
      deAno,
      deMes,
      paraAno,
      paraMes,
    });
    return response;
  } catch (error) {
    console.error('[METAS] Erro ao copiar metas:', error);
    return { success: false };
  }
}