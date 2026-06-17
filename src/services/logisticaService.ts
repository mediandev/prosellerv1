// logisticaService.ts — wrappers HTTP das 4 Edge Functions do F-LOG-CRM R-LOG-1.
// Padrão segue tinyNaturezaOperacaoService.ts: fetch direto contra /functions/v1.
// Gating por feature flag fica nas Edge Functions (503 se OFF) e na UI
// (LogisticaPage renderiza placeholder se VITE_FEATURE_LOG_CRM != 'true').

import { getAuthToken } from './api';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://xxoiqfraeolsqsmsheue.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4b2lxZnJhZW9sc3FzbXNoZXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1ODQ5MDIsImV4cCI6MjA0MjE2MDkwMn0.m8A1mUf3GyAl_17FjltxkgBr-xRQYZw9YEDUVUBdttA';

export const isLogisticaEnabled = (): boolean =>
  import.meta.env.VITE_FEATURE_LOG_CRM === 'true';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

async function call(
  fn:
    | 'transportador-logistica-v1'
    | 'regiao-destino-v1'
    | 'origem-frete-v1'
    | 'frete-logistica-v1'
    | 'pedido-venda-v2',
  method: Method,
  options: {
    id?: string;
    body?: Record<string, unknown>;
    query?: Record<string, string | boolean | number | undefined>;
  } = {},
): Promise<unknown> {
  const token = getAuthToken();
  if (!token) throw new Error('Usuário não autenticado.');

  const url = new URL(`${SUPABASE_URL}/functions/v1/${fn}${options.id ? `/${options.id}` : ''}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }

  const response = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 503) {
      throw new Error('Logística ainda não está habilitada neste ambiente.');
    }
    throw new Error(payload?.error || `Erro ${response.status} em ${fn}`);
  }
  return payload?.data ?? payload;
}

// ---------- Transportadores ----------
export const transportadorService = {
  list: (params?: { apenasAtivos?: boolean }) =>
    call('transportador-logistica-v1', 'GET', {
      query: { apenas_ativos: params?.apenasAtivos ? 'true' : undefined },
    }),
  get: (id: string) => call('transportador-logistica-v1', 'GET', { id }),
  create: (body: Record<string, unknown>) => call('transportador-logistica-v1', 'POST', { body }),
  update: (id: string, body: Record<string, unknown>) =>
    call('transportador-logistica-v1', 'PUT', { id, body }),
  remove: (id: string) => call('transportador-logistica-v1', 'DELETE', { id }),
};

// ---------- Regiões destino ----------
export const regiaoDestinoService = {
  list: (params?: { apenasAtivos?: boolean }) =>
    call('regiao-destino-v1', 'GET', { query: { apenas_ativos: params?.apenasAtivos ? 'true' : undefined } }),
  get: (id: string) => call('regiao-destino-v1', 'GET', { id }),
  create: (body: Record<string, unknown>) => call('regiao-destino-v1', 'POST', { body }),
  update: (id: string, body: Record<string, unknown>) =>
    call('regiao-destino-v1', 'PUT', { id, body }),
  remove: (id: string) => call('regiao-destino-v1', 'DELETE', { id }),
};

// ---------- Origens frete ----------
export const origemFreteService = {
  list: (params?: { empresaId?: number; apenasAtivos?: boolean }) =>
    call('origem-frete-v1', 'GET', {
      query: {
        empresa_id: params?.empresaId,
        apenas_ativos: params?.apenasAtivos ? 'true' : undefined,
      },
    }),
  get: (id: string) => call('origem-frete-v1', 'GET', { id }),
  create: (body: Record<string, unknown>) => call('origem-frete-v1', 'POST', { body }),
  update: (id: string, body: Record<string, unknown>) =>
    call('origem-frete-v1', 'PUT', { id, body }),
  remove: (id: string) => call('origem-frete-v1', 'DELETE', { id }),
};

// ---------- Fretes ----------
export const freteService = {
  list: (params?: { empresaId?: number; statusEntrega?: string; limit?: number }) =>
    call('frete-logistica-v1', 'GET', {
      query: {
        empresa_id: params?.empresaId,
        status_entrega: params?.statusEntrega,
        limit: params?.limit,
      },
    }),
  get: (id: string) => call('frete-logistica-v1', 'GET', { id }),
  create: (body: Record<string, unknown>) => call('frete-logistica-v1', 'POST', { body }),
  update: (id: string, body: Record<string, unknown>) =>
    call('frete-logistica-v1', 'PUT', { id, body }),
  remove: (id: string) => call('frete-logistica-v1', 'DELETE', { id }),
};

// ---------- R-LOG-2: Busca, Torre de Controle, Detalhe ----------

import type {
  ListFretesFilters,
  FreteLogisticaEnriched,
  DashboardBuckets,
  OcorrenciaSSW,
} from '@shared/types/frete-logistica';

/** Busca paginada com filtros (R-LOG-2). Aceita 7 filtros + limit/offset. */
export async function listFretes(
  filters: ListFretesFilters = {},
): Promise<{ fretes: FreteLogisticaEnriched[]; total: number; limit: number; offset: number }> {
  const data = (await call('frete-logistica-v1', 'GET', {
    query: {
      action: 'list',
      empresa_id: filters.empresaId,
      cliente_id: filters.clienteId,
      transportador_id: filters.transportadorId,
      status_entrega: filters.statusEntrega && filters.statusEntrega.length > 0
        ? filters.statusEntrega.join(',')
        : undefined,
      data_inicio: filters.dataInicio,
      data_fim: filters.dataFim,
      nfe_numero: filters.nfeNumero,
      pedido_venda_id: filters.pedidoVendaId,
      limit: filters.limit,
      offset: filters.offset,
    },
  })) as {
    fretes: FreteLogisticaEnriched[];
    total: number;
    limit: number;
    offset: number;
  };
  return data;
}

/** Torre de Controle: 5 buckets de status (R-LOG-2). */
export async function listFretesByStatus(): Promise<DashboardBuckets> {
  const data = (await call('frete-logistica-v1', 'GET', {
    query: { action: 'list_by_status' },
  })) as DashboardBuckets;
  return data;
}

/** Detalhe + timeline de ocorrências (R-LOG-2). Timeline pode estar vazia (R-LOG-4). */
export async function getFreteWithOcorrencias(
  id: string | number,
): Promise<{ frete: FreteLogisticaEnriched; ocorrencias: OcorrenciaSSW[] }> {
  const data = (await call('frete-logistica-v1', 'GET', {
    query: { action: 'get_with_ocorrencias', id: String(id) },
  })) as { frete: FreteLogisticaEnriched; ocorrencias: OcorrenciaSSW[] };
  return data;
}

export interface PedidoOption {
  id: string;
  numero: string;
  clienteId: number;
  nomeCliente: string;
  empresaFaturamentoId: number;
  nomeEmpresaFaturamento: string;
  valorProdutos: number;
  status?: string;
  dataPedido?: string;
}

export async function searchPedidos(search: string): Promise<PedidoOption[]> {
  const data = (await call('pedido-venda-v2', 'GET', {
    query: { search, limit: '10', page: '1' },
  })) as { pedidos?: any[] };
  return (data?.pedidos || []).map((p: any) => ({
    id: String(p.id),
    numero: p.numero || String(p.id),
    clienteId: Number(p.clienteId),
    nomeCliente: p.nomeCliente || '',
    empresaFaturamentoId: Number(p.empresaFaturamentoId),
    nomeEmpresaFaturamento: p.nomeEmpresaFaturamento || '',
    valorProdutos: Number(p.valorPedido || 0),
    status: p.status || undefined,
    dataPedido: p.dataPedido || undefined,
  }));
}
