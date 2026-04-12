import { getAuthToken } from './api';
import type { DashboardFilters } from '../components/DashboardMetrics';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://xxoiqfraeolsqsmsheue.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export interface DashboardSnapshot {
  period: string;
  dateRange: { from: string; to: string };
  summary: {
    metaMensal: number;
    cards: {
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
    };
  };
  customerWallet: {
    distribution: {
      active: number;
      inactive: number;
      total: number;
      activePercentage: string;
      inactivePercentage: string;
    };
    positivation: {
      positivatedCount: number;
      totalCustomers: number;
      positivationPercentage: number;
    };
  };
  debug?: Record<string, unknown>;
}

export async function fetchDashboardSnapshot(params: {
  period: string;
  filters: DashboardFilters;
  customDateRange?: { from?: Date; to?: Date };
}): Promise<DashboardSnapshot> {
  const token = getAuthToken();
  const qs = new URLSearchParams();
  qs.set('period', params.period);
  qs.set('filters', JSON.stringify(params.filters || {}));

  if (params.period === 'custom' && params.customDateRange?.from && params.customDateRange?.to) {
    const from = params.customDateRange.from.toISOString().slice(0, 10);
    const to = params.customDateRange.to.toISOString().slice(0, 10);
    qs.set('date_from', from);
    qs.set('date_to', to);
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/dashboard-v2?${qs.toString()}`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  }
  if (data?.success === false) {
    throw new Error(data?.error || 'Erro ao carregar snapshot do dashboard');
  }
  return (data?.data || data) as DashboardSnapshot;
}

