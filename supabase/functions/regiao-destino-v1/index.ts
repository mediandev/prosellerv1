// Edge Function: regiao-destino-v1
// F-LOG-CRM R-LOG-1 · CRUD lookup. Gated por FEATURE_LOG_CRM. Backoffice-only write.
// `regiao_destino` não tem deleted_at — DELETE = soft set ativo=false.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isLogCrmEnabledFromEnv } from '../_shared/log-crm-feature-flag.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}
const FUNC_NAME = 'REGIAO-DESTINO-V1'

interface AuthenticatedUser {
  id: string; email: string; tipo: 'backoffice' | 'vendedor'; ativo: boolean
}

function isFeatureEnabled(): boolean { return isLogCrmEnabledFromEnv() }
function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

async function validateJWT(req: Request, supabaseUrl: string, supabaseServiceKey: string) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return { user: null as AuthenticatedUser | null, error: 'Missing authorization header' }
    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseServiceKey, { global: { headers: { Authorization: authHeader } } })
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authUser) return { user: null as AuthenticatedUser | null, error: 'Invalid or expired token' }
    const { data: userData, error: userError } = await supabase
      .from('user').select('user_id, email, tipo, ativo')
      .eq('user_id', authUser.id).eq('ativo', true).is('deleted_at', null).single()
    if (userError || !userData) return { user: null as AuthenticatedUser | null, error: 'User not found or inactive' }
    return {
      user: { id: userData.user_id, email: userData.email || authUser.email || '', tipo: userData.tipo as 'backoffice' | 'vendedor', ativo: userData.ativo },
      error: null as string | null,
    }
  } catch { return { user: null as AuthenticatedUser | null, error: 'Authentication error' } }
}

function format(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    nome: row.nome,
    uf: row.uf ?? null,
    ativo: row.ativo,
    createdAt: row.created_at ? new Date(row.created_at as string).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at as string).toISOString() : null,
  }
}

serve(async (req) => {
  console.log(`[${FUNC_NAME}]`, { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsHeaders, 'Access-Control-Max-Age': '86400' } })
  }
  if (!isFeatureEnabled()) {
    return jsonResponse(503, { success: false, error: 'Logística feature flag desligada (FEATURE_LOG_CRM)' })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)
    if (authError || !user) return jsonResponse(401, { success: false, error: authError || 'Unauthorized' })

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const funcIdx = pathParts.indexOf('regiao-destino-v1')
    const idFromPath = funcIdx >= 0 && funcIdx < pathParts.length - 1 ? pathParts[funcIdx + 1] : null
    const id = idFromPath || url.searchParams.get('id')

    if (req.method === 'GET') {
      if (id) {
        const { data, error } = await supabase.from('regiao_destino').select('*').eq('id', id).single()
        if (error || !data) return jsonResponse(404, { success: false, error: 'Região não encontrada' })
        return jsonResponse(200, { success: true, data: format(data) })
      }
      const apenasAtivos = url.searchParams.get('apenas_ativos') === 'true'
      let query = supabase.from('regiao_destino').select('*', { count: 'exact' }).order('nome', { ascending: true })
      if (apenasAtivos) query = query.eq('ativo', true)
      const { data, error, count } = await query
      if (error) throw new Error(error.message)
      return jsonResponse(200, { success: true, data: { regioes: (data || []).map(format), total: count ?? 0 } })
    }

    if (req.method !== 'GET' && user.tipo !== 'backoffice') {
      return jsonResponse(403, { success: false, error: 'Apenas backoffice pode escrever regiões' })
    }

    if (req.method === 'POST') {
      const body = await req.json()
      if (!body.nome || String(body.nome).trim().length < 2) {
        return jsonResponse(400, { success: false, error: 'Nome obrigatório (mínimo 2 caracteres)' })
      }
      const insert = {
        nome: String(body.nome).trim(),
        uf: body.uf ?? null,
      }
      const { data, error } = await supabase.from('regiao_destino').insert(insert).select().single()
      if (error) {
        if ((error as { code?: string }).code === '23505') return jsonResponse(409, { success: false, error: 'Região já cadastrada' })
        throw new Error(error.message)
      }
      return jsonResponse(201, { success: true, data: format(data) })
    }

    if (req.method === 'PUT') {
      if (!id) return jsonResponse(400, { success: false, error: 'ID obrigatório' })
      const body = await req.json()
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (body.nome !== undefined) patch.nome = String(body.nome).trim()
      if (body.uf !== undefined) patch.uf = body.uf ?? null
      if (body.ativo !== undefined) patch.ativo = !!body.ativo
      const { data, error } = await supabase.from('regiao_destino').update(patch).eq('id', id).select().single()
      if (error || !data) return jsonResponse(404, { success: false, error: 'Região não encontrada' })
      return jsonResponse(200, { success: true, data: format(data) })
    }

    if (req.method === 'DELETE') {
      if (!id) return jsonResponse(400, { success: false, error: 'ID obrigatório' })
      const { error } = await supabase.from('regiao_destino').update({ ativo: false }).eq('id', id)
      if (error) throw new Error(error.message)
      return jsonResponse(200, { success: true, data: { message: 'Região desativada' } })
    }

    return jsonResponse(405, { success: false, error: 'Method not allowed' })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[${FUNC_NAME}] EXCEPTION`, message)
    return jsonResponse(500, { success: false, error: message })
  }
})
