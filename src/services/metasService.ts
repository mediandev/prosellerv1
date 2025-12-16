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
    return response?.total || 0;
  } catch (error) {
    console.error('[METAS] Erro ao buscar meta total:', error);
    return 0;
  }
}

/**
 * Busca todas as metas (backoffice) ou apenas do vendedor logado
 */
export async function buscarTodasMetas(): Promise<VendedorMeta[]> {
  try {
    const response = await api.metas.buscarTodas();
    return response || [];
  } catch (error) {
    console.error('[METAS] Erro ao buscar todas as metas:', error);
    return [];
  }
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
    return response;
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
    return response;
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