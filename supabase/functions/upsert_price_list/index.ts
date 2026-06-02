import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
function toNumber(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim();
    if (normalized === '') return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
function normalizePayload(body) {
  if (!body || typeof body !== 'object') {
    throw new Error('Body inválido');
  }
  const lista = body.lista;
  if (!lista || typeof lista.nome !== 'string' || !lista.nome.trim()) {
    throw new Error('O campo lista.nome é obrigatório');
  }
  const itens = Array.isArray(body.itens) ? body.itens : [];
  if (!itens.length) {
    throw new Error('Ao menos um item deve ser informado');
  }
  const normalizedItems = itens.map((item)=>{
    const produtoId = Number(item.produto_id);
    const preco = toNumber(item.preco);
    if (!Number.isInteger(produtoId) || produtoId <= 0) {
      throw new Error('produto_id inválido em itens');
    }
    if (preco === null || preco <= 0) {
      throw new Error(`Preço inválido para o produto ${produtoId}`);
    }
    return {
      produto_id: produtoId,
      preco
    };
  });
  const commissions = Array.isArray(body.comissoes) ? body.comissoes : [];
  const normalizedCommissions = commissions.map((rule)=>{
    const descontoMinimo = toNumber(rule.desconto_minimo);
    const descontoMaximo = toNumber(rule.desconto_maximo);
    const comissao = toNumber(rule.comissao);
    if (descontoMinimo === null && descontoMaximo === null && comissao === null) {
      return null;
    }
    if (descontoMinimo === null || descontoMaximo === null || comissao === null) {
      throw new Error('Regra de comissionamento incompleta');
    }
    return {
      desconto_minimo: descontoMinimo,
      desconto_maximo: descontoMaximo,
      comissao
    };
  }).filter((rule)=>rule !== null);
  const payload = {
    lista: {
      id: lista.id ? Number(lista.id) : undefined,
      nome: lista.nome.trim(),
      desconto: toNumber(lista.desconto) ?? 0,
      ativo: typeof lista.ativo === 'boolean' ? lista.ativo : true,
      codigo_sequencial: lista.codigo_sequencial?.trim() || undefined
    },
    itens: normalizedItems,
    comissoes: normalizedCommissions
  };
  return payload;
}
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Método não suportado'
    }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({
      error: 'Missing authorization header'
    }), {
      status: 401,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase environment variables');
    return new Response(JSON.stringify({
      error: 'Configuração do Supabase ausente'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    global: {
      headers: {
        Authorization: authHeader
      }
    },
    auth: {
      persistSession: false
    }
  });
  try {
    const token = authHeader.replace('Bearer ', '');
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const rawBody = await req.json();
    const payload = normalizePayload(rawBody);
    const { data, error } = await supabase.rpc('upsert_price_list', {
      p_user_id: authData.user.id,
      p_lista: payload.lista,
      p_itens: payload.itens,
      p_regras: payload.comissoes
    });
    if (error) {
      console.error('RPC upsert_price_list error:', error);
      return new Response(JSON.stringify({
        error: error.message
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    return new Response(JSON.stringify({
      success: true,
      data,
      message: 'Lista de preços salva com sucesso'
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Unhandled error:', error);
    return new Response(JSON.stringify({
      error: error.message ?? 'Erro ao processar requisição'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
