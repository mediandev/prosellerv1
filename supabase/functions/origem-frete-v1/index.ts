// Edge Function: origem-frete-v1
// F-LOG-CRM R-LOG-1 · CRUD lookup com empresa_id obrigatório.
// Gated por FEATURE_LOG_CRM. Backoffice-only write.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isLogCrmEnabledFromEnv } from '../_shared/log-crm-feature-flag.ts';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};
const FUNC_NAME = 'ORIGEM-FRETE-V1';
function isFeatureEnabled() {
  return isLogCrmEnabledFromEnv();
}
function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}
async function validateJWT(req, supabaseUrl, supabaseServiceKey) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return {
      user: null,
      error: 'Missing authorization header'
    };
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authUser) return {
      user: null,
      error: 'Invalid or expired token'
    };
    const { data: userData, error: userError } = await supabase.from('user').select('user_id, email, tipo, ativo').eq('user_id', authUser.id).eq('ativo', true).is('deleted_at', null).single();
    if (userError || !userData) return {
      user: null,
      error: 'User not found or inactive'
    };
    return {
      user: {
        id: userData.user_id,
        email: userData.email || authUser.email || '',
        tipo: userData.tipo,
        ativo: userData.ativo
      },
      error: null
    };
  } catch  {
    return {
      user: null,
      error: 'Authentication error'
    };
  }
}
function format(row) {
  return {
    id: String(row.id),
    nome: row.nome,
    uf: row.uf ?? null,
    empresaId: Number(row.empresa_id),
    ativo: row.ativo,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null
  };
}
serve(async (req)=>{
  console.log(`[${FUNC_NAME}]`, {
    method: req.method,
    url: req.url
  });
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  if (!isFeatureEnabled()) {
    return jsonResponse(503, {
      success: false,
      error: 'Logística feature flag desligada (FEATURE_LOG_CRM)'
    });
  }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey);
    if (authError || !user) return jsonResponse(401, {
      success: false,
      error: authError || 'Unauthorized'
    });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const funcIdx = pathParts.indexOf('origem-frete-v1');
    const idFromPath = funcIdx >= 0 && funcIdx < pathParts.length - 1 ? pathParts[funcIdx + 1] : null;
    const id = idFromPath || url.searchParams.get('id');
    if (req.method === 'GET') {
      if (id) {
        const { data, error } = await supabase.from('origem_frete').select('*').eq('id', id).single();
        if (error || !data) return jsonResponse(404, {
          success: false,
          error: 'Origem não encontrada'
        });
        return jsonResponse(200, {
          success: true,
          data: format(data)
        });
      }
      const empresaIdFilter = url.searchParams.get('empresa_id');
      const apenasAtivos = url.searchParams.get('apenas_ativos') === 'true';
      let query = supabase.from('origem_frete').select('*', {
        count: 'exact'
      }).order('nome', {
        ascending: true
      });
      if (empresaIdFilter) query = query.eq('empresa_id', empresaIdFilter);
      if (apenasAtivos) query = query.eq('ativo', true);
      const { data, error, count } = await query;
      if (error) throw new Error(error.message);
      return jsonResponse(200, {
        success: true,
        data: {
          origens: (data || []).map(format),
          total: count ?? 0
        }
      });
    }
    if (req.method !== 'GET' && user.tipo !== 'backoffice') {
      return jsonResponse(403, {
        success: false,
        error: 'Apenas backoffice pode escrever origens'
      });
    }
    if (req.method === 'POST') {
      const body = await req.json();
      if (!body.nome || String(body.nome).trim().length < 2) {
        return jsonResponse(400, {
          success: false,
          error: 'Nome obrigatório (mínimo 2 caracteres)'
        });
      }
      if (!body.empresaId) return jsonResponse(400, {
        success: false,
        error: 'empresaId obrigatório'
      });
      const insert = {
        nome: String(body.nome).trim(),
        uf: body.uf ?? null,
        empresa_id: Number(body.empresaId)
      };
      const { data, error } = await supabase.from('origem_frete').insert(insert).select().single();
      if (error) {
        if (error.code === '23505') return jsonResponse(409, {
          success: false,
          error: 'Origem já cadastrada para esta empresa'
        });
        throw new Error(error.message);
      }
      return jsonResponse(201, {
        success: true,
        data: format(data)
      });
    }
    if (req.method === 'PUT') {
      if (!id) return jsonResponse(400, {
        success: false,
        error: 'ID obrigatório'
      });
      const body = await req.json();
      const patch = {
        updated_at: new Date().toISOString()
      };
      if (body.nome !== undefined) patch.nome = String(body.nome).trim();
      if (body.uf !== undefined) patch.uf = body.uf ?? null;
      if (body.empresaId !== undefined) patch.empresa_id = Number(body.empresaId);
      if (body.ativo !== undefined) patch.ativo = !!body.ativo;
      const { data, error } = await supabase.from('origem_frete').update(patch).eq('id', id).select().single();
      if (error || !data) return jsonResponse(404, {
        success: false,
        error: 'Origem não encontrada'
      });
      return jsonResponse(200, {
        success: true,
        data: format(data)
      });
    }
    if (req.method === 'DELETE') {
      if (!id) return jsonResponse(400, {
        success: false,
        error: 'ID obrigatório'
      });
      const { error } = await supabase.from('origem_frete').update({
        ativo: false
      }).eq('id', id);
      if (error) throw new Error(error.message);
      return jsonResponse(200, {
        success: true,
        data: {
          message: 'Origem desativada'
        }
      });
    }
    return jsonResponse(405, {
      success: false,
      error: 'Method not allowed'
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[${FUNC_NAME}] EXCEPTION`, message);
    return jsonResponse(500, {
      success: false,
      error: message
    });
  }
});
