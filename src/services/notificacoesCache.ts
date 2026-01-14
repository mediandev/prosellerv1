import { api } from './api';

// Cache simples para notificações
let notificacoesCache: any[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 5000; // 5 segundos
let isFetching = false;
let pendingPromise: Promise<any[]> | null = null;

/**
 * Busca notificações com cache e debounce
 * - Cache de 5 segundos para evitar requisições excessivas
 * - Debounce para evitar múltiplas requisições simultâneas
 */
export const getNotificacoesWithCache = async (): Promise<any[]> => {
  const now = Date.now();
  
  // Se temos cache válido, retornar do cache
  if (now - lastFetchTime < CACHE_DURATION) {
    return notificacoesCache;
  }
  
  // Se já está buscando, retornar a promise pendente
  if (isFetching && pendingPromise) {
    return pendingPromise;
  }
  
  // Iniciar nova busca
  isFetching = true;
  pendingPromise = (async () => {
    try {
      const notificacoes = await api.get('notificacoes');
      notificacoesCache = notificacoes || [];
      lastFetchTime = Date.now();
      return notificacoesCache;
    } catch (error) {
      // Log silencioso para erros esperados (rede, autenticação)
      if (error instanceof Error && (error.message.includes('Failed to fetch') || error.message.includes('401'))) {
        console.log('[NOTIFICAÇÕES-CACHE] ℹ️ Servidor indisponível ou não autorizado, usando cache');
      } else {
        console.error('[NOTIFICAÇÕES-CACHE] ❌ Erro ao buscar notificações:', error);
      }
      
      // Em caso de erro, retornar cache antigo se tiver, senão array vazio
      return notificacoesCache.length > 0 ? notificacoesCache : [];
    } finally {
      isFetching = false;
      pendingPromise = null;
    }
  })();
  
  return pendingPromise;
};

/**
 * Limpa o cache de notificações
 * Use isso quando criar/atualizar/deletar notificações
 */
export const clearNotificacoesCache = () => {
  lastFetchTime = 0;
  notificacoesCache = [];
};

/**
 * Atualiza o cache local sem fazer requisição
 */
export const updateNotificacoesCache = (notificacoes: any[]) => {
  notificacoesCache = notificacoes;
  lastFetchTime = Date.now();
};