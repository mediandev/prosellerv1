// romaneioService.ts — wrapper para romaneio-logistica-v1.
// Segue o mesmo padrão de logisticaService.ts (fetch direto contra /functions/v1).

import { getAuthToken } from './api';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://xxoiqfraeolsqsmsheue.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4b2lxZnJhZW9sc3FzbXNoZXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1ODQ5MDIsImV4cCI6MjA0MjE2MDkwMn0.m8A1mUf3GyAl_17FjltxkgBr-xRQYZw9YEDUVUBdttA';

const FUNC = `${SUPABASE_URL}/functions/v1/romaneio-logistica-v1`;

function headers() {
  const token = getAuthToken();
  if (!token) throw new Error('Usuário não autenticado.');
  return {
    Authorization: `Bearer ${token}`,
    apikey: SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  };
}

async function req<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { ...init, headers: { ...headers(), ...(init.headers ?? {}) } });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload?.error || `Erro ${res.status}`);
  return (payload?.data ?? payload) as T;
}

export interface FreteDisponivel {
  freteId: string;
  nfeNumero: number | null;
  nfeChaveAcesso: string | null;
  pedidoVendaId: number | null;
  clienteNome: string | null;
  clienteCidade: string | null;
  clienteUf: string | null;
  clienteCep: string | null;
  transportadorId: number | null;
  transportadorNome: string | null;
  volumes: number | null;
  pesoBruto: number | null;
  valorProdutos: number;
  valorCotacao: number | null;
}

export interface RomaneioListItem {
  id: string;
  numero: number;
  dataRomaneio: string;
  createdAt: string;
  transportadorNome: string | null;
  qtdFretes: number;
}

export interface FreteRomaneioDetalhe extends FreteDisponivel {}

export interface RomaneioDetalhe {
  id: string;
  numero: number;
  dataRomaneio: string;
  observacoes: string | null;
  createdAt: string;
  empresaId: number | null;
  empresaNome: string | null;
  empresaRazaoSocial: string | null;
  empresaCnpj: string | null;
  empresaEndereco: Record<string, string> | null;
  transportadorId: number | null;
  transportadorNome: string | null;
  transportadorCnpj: string | null;
  fretes: FreteRomaneioDetalhe[];
  totais: { volumes: number; pesoBruto: number; valorProdutos: number };
}

export async function listRomaneios(empresaId?: number): Promise<{ romaneios: RomaneioListItem[] }> {
  const url = new URL(FUNC);
  if (empresaId) url.searchParams.set('empresa_id', String(empresaId));
  return req<{ romaneios: RomaneioListItem[] }>(url.toString());
}

export async function getRomaneio(id: string): Promise<RomaneioDetalhe> {
  const url = new URL(FUNC);
  url.searchParams.set('id', id);
  return req<RomaneioDetalhe>(url.toString());
}

export async function listarFretesDisponiveis(
  empresaId: number,
  transportadorId?: number,
): Promise<{ fretes: FreteDisponivel[] }> {
  const url = new URL(FUNC);
  url.searchParams.set('action', 'listar_disponiveis');
  url.searchParams.set('empresa_id', String(empresaId));
  if (transportadorId) url.searchParams.set('transportador_id', String(transportadorId));
  return req<{ fretes: FreteDisponivel[] }>(url.toString());
}

export async function createRomaneio(payload: {
  empresaId: number;
  freteIds: string[];
  dataRomaneio: string;
  transportadorId?: number | null;
  observacoes?: string | null;
}): Promise<{ romaneioId: string; numero: number }> {
  return req<{ romaneioId: string; numero: number }>(FUNC, {
    method: 'POST',
    body: JSON.stringify({ action: 'create', ...payload }),
  });
}
