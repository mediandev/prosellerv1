// Edge Function: ssw-tracking-v1
// F-LOG-CRM R-LOG-4 · Wrapper standalone da API SSW Tracking.
// Gated por FEATURE_LOG_CRM + FEATURE_LOG_CRM_SSW.
// Uso principal: debug e teste manual. O fluxo on-demand passa por
// frete-logistica-v1 → _shared/ssw-client.ts (sem HTTP hop).
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isLogCrmEnabledFromEnv, isLogCrmSswEnabledFromEnv } from '../_shared/log-crm-feature-flag.ts';
import { fetchSswTracking, mapSswToOcorrencias } from '../_shared/ssw-client.ts';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};
const FUNC_NAME = 'SSW-TRACKING-V1';
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
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return {
    userId: null,
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
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return {
    userId: null,
    error: 'Invalid or expired token'
  };
  const { data: userData, error: userError } = await supabase.from('user').select('user_id, ativo').eq('user_id', user.id).eq('ativo', true).is('deleted_at', null).single();
  if (userError || !userData) return {
    userId: null,
    error: 'User not found or inactive'
  };
  return {
    userId: userData.user_id,
    error: null
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
  if (!isLogCrmEnabledFromEnv()) {
    return jsonResponse(503, {
      success: false,
      error: 'Logística feature flag desligada (FEATURE_LOG_CRM)'
    });
  }
  if (!isLogCrmSswEnabledFromEnv()) {
    return jsonResponse(503, {
      success: false,
      error: 'SSW Tracking desligado (FEATURE_LOG_CRM_SSW)'
    });
  }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const { userId, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey);
    if (authError || !userId) return jsonResponse(401, {
      success: false,
      error: authError || 'Unauthorized'
    });
    const url = new URL(req.url);
    const chaveNfe = url.searchParams.get('chave_nfe');
    if (!chaveNfe || !/^[0-9]{44}$/.test(chaveNfe)) {
      return jsonResponse(400, {
        success: false,
        error: 'chave_nfe deve ter 44 dígitos numéricos'
      });
    }
    console.log(`[${FUNC_NAME}] Consultando SSW para chave ${chaveNfe.substring(0, 10)}...`);
    const sswResponse = await fetchSswTracking(chaveNfe);
    if (!sswResponse.success) {
      console.log(`[${FUNC_NAME}] SSW retornou erro: ${sswResponse.message}`);
      return jsonResponse(200, {
        success: true,
        ssw_success: false,
        message: sswResponse.message,
        ocorrencias: []
      });
    }
    const ocorrencias = mapSswToOcorrencias(sswResponse, '0');
    console.log(`[${FUNC_NAME}] SSW retornou ${ocorrencias.length} ocorrências`);
    return jsonResponse(200, {
      success: true,
      ssw_success: true,
      message: sswResponse.message,
      header: sswResponse.documento.header,
      ocorrencias,
      raw_tracking: sswResponse.documento.tracking
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
