// Edge Function: ssw-sweep-v1
// F-LOG-CRM R-LOG-4 · Varredura horária de rastreio SSW.
// Chamada pelo pg_cron (net.http_post) — deploy com --no-verify-jwt.
// Protegida por header x-sweep-secret == env SSW_SWEEP_SECRET.
// Gated por FEATURE_LOG_CRM + FEATURE_LOG_CRM_SSW.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isLogCrmEnabledFromEnv, isLogCrmSswEnabledFromEnv } from '../_shared/log-crm-feature-flag.ts'
import { sweepSsw } from '../_shared/ssw-refresh.ts'

const FUNC_NAME = 'SSW-SWEEP-V1'

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json(405, { success: false, error: 'Método não permitido' })
  }

  // Proteção: secret compartilhado com o pg_cron.
  const expected = Deno.env.get('SSW_SWEEP_SECRET') ?? ''
  const provided = req.headers.get('x-sweep-secret') ?? ''
  if (!expected || provided !== expected) {
    return json(401, { success: false, error: 'Unauthorized' })
  }

  if (!isLogCrmEnabledFromEnv()) {
    return json(200, { success: true, data: { skipped: 'FEATURE_LOG_CRM desligada' } })
  }
  if (!isLogCrmSswEnabledFromEnv()) {
    return json(200, { success: true, data: { skipped: 'FEATURE_LOG_CRM_SSW desligada' } })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      throw new Error('Variáveis de ambiente SUPABASE_URL/SERVICE_ROLE ausentes')
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

    // Cron horário: respeita o cache de 30 min (force=false) — não martela o SSW.
    const result = await sweepSsw(supabase, { force: false, limit: 500 })
    console.log(`[${FUNC_NAME}] varredura: ${result.atualizados}/${result.candidatos} atualizados`)
    return json(200, { success: true, data: result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[${FUNC_NAME}] erro:`, msg)
    return json(500, { success: false, error: msg })
  }
})
