import { getAuthToken } from './api';
import {
  TinyEmpresaNaturezaOperacao,
  TinyEmpresaNaturezaOperacaoUpsertInput,
} from '../types/tinyNaturezaOperacao';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://xxoiqfraeolsqsmsheue.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4b2lxZnJhZW9sc3FzbXNoZXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1ODQ5MDIsImV4cCI6MjA0MjE2MDkwMn0.m8A1mUf3GyAl_17FjltxkgBr-xRQYZw9YEDUVUBdttA';

async function callTinyNaturezaEdge(
  method: 'GET' | 'POST',
  body?: Record<string, unknown>,
  query?: Record<string, string>
) {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Usuário não autenticado.');
  }

  const url = new URL(`${SUPABASE_URL}/functions/v1/tiny-empresa-natureza-operacao-v2`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || 'Erro ao consultar mapeamento de natureza.');
  }

  return payload?.data ?? payload;
}

function getAuthHeaders(token: string, extra?: Record<string, string>) {
  return {
    Authorization: `Bearer ${token}`,
    apikey: SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    ...(extra || {}),
  };
}

async function listByEmpresaRest(empresaId: string): Promise<TinyEmpresaNaturezaOperacao[]> {
  const token = getAuthToken();
  if (!token) throw new Error('Usuário não autenticado.');

  const url = new URL(`${SUPABASE_URL}/rest/v1/tiny_empresa_natureza_operacao`);
  url.searchParams.set('empresa_id', `eq.${empresaId}`);
  url.searchParams.set('deleted_at', 'is.null');
  url.searchParams.set(
    'select',
    'id,empresa_id,natureza_operacao_id,tiny_valor,ativo,natureza_operacao:natureza_operacao_id(id,nome)'
  );
  url.searchParams.set('order', 'natureza_operacao_id.asc');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getAuthHeaders(token),
  });

  const payload = await response.json().catch(() => []);
  if (!response.ok) {
    throw new Error('Erro ao consultar mapeamento de natureza (REST).');
  }

  const rows = Array.isArray(payload) ? payload : [];
  return rows.map((row: any) => ({
    id: String(row.id),
    empresaId: String(row.empresa_id),
    naturezaOperacaoId: String(row.natureza_operacao_id),
    naturezaOperacaoNome: row.natureza_operacao?.nome || '',
    tinyValor: row.tiny_valor || '',
    ativo: row.ativo ?? true,
  }));
}

async function upsertRest(input: TinyEmpresaNaturezaOperacaoUpsertInput) {
  const token = getAuthToken();
  if (!token) throw new Error('Usuário não autenticado.');

  const empresaId = Number(input.empresaId);
  const naturezaOperacaoId = Number(input.naturezaOperacaoId);
  const tinyValor = String(input.tinyValor || '').trim();

  if (!tinyValor) {
    const url = new URL(`${SUPABASE_URL}/rest/v1/tiny_empresa_natureza_operacao`);
    url.searchParams.set('empresa_id', `eq.${empresaId}`);
    url.searchParams.set('natureza_operacao_id', `eq.${naturezaOperacaoId}`);
    url.searchParams.set('deleted_at', 'is.null');

    const response = await fetch(url.toString(), {
      method: 'PATCH',
      headers: getAuthHeaders(token, { Prefer: 'return=minimal' }),
      body: JSON.stringify({
        deleted_at: new Date().toISOString(),
        ativo: false,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error('Erro ao remover mapeamento (REST).');
    }
    return { success: true };
  }

  const url = new URL(`${SUPABASE_URL}/rest/v1/tiny_empresa_natureza_operacao`);
  url.searchParams.set('on_conflict', 'empresa_id,natureza_operacao_id');

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: getAuthHeaders(token, {
      Prefer: 'resolution=merge-duplicates,return=representation',
    }),
    body: JSON.stringify([
      {
        empresa_id: empresaId,
        natureza_operacao_id: naturezaOperacaoId,
        tiny_valor: tinyValor,
        ativo: input.ativo !== false,
        deleted_at: null,
        updated_at: new Date().toISOString(),
      },
    ]),
  });

  const payload = await response.json().catch(() => []);
  if (!response.ok) {
    throw new Error('Erro ao salvar mapeamento (REST).');
  }

  const row = Array.isArray(payload) ? payload[0] : payload;
  return {
    id: String(row?.id || ''),
    empresaId: String(row?.empresa_id || input.empresaId),
    naturezaOperacaoId: String(row?.natureza_operacao_id || input.naturezaOperacaoId),
    tinyValor: row?.tiny_valor || tinyValor,
    ativo: row?.ativo ?? (input.ativo !== false),
  };
}

export const tinyNaturezaOperacaoService = {
  async listByEmpresa(empresaId: string): Promise<TinyEmpresaNaturezaOperacao[]> {
    try {
      const data = await callTinyNaturezaEdge('GET', undefined, { empresa_id: empresaId });
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn('[tinyNaturezaOperacaoService] Edge indisponível em listByEmpresa, usando REST fallback.', error);
      return listByEmpresaRest(empresaId);
    }
  },

  async upsert(input: TinyEmpresaNaturezaOperacaoUpsertInput) {
    try {
      return await callTinyNaturezaEdge('POST', input);
    } catch (error) {
      console.warn('[tinyNaturezaOperacaoService] Edge indisponível em upsert, usando REST fallback.', error);
      return upsertRest(input);
    }
  },

  async saveBulk(
    empresaId: string,
    items: Array<{ naturezaOperacaoId: string; tinyValor: string; ativo?: boolean }>
  ) {
    await Promise.all(
      items.map((item) =>
        this.upsert({
          empresaId,
          naturezaOperacaoId: item.naturezaOperacaoId,
          tinyValor: item.tinyValor,
          ativo: item.ativo ?? true,
        })
      )
    );
  },
};
