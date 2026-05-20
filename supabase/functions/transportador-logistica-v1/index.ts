// Edge Function: transportador-logistica-v1
// F-LOG-CRM R-LOG-1 · CRUD direto via supabase-js (sem RPC).
// Gated por FEATURE_LOG_CRM (default OFF → 503).
// Padrão: validateJWT + tenant scoping inline. Soft-delete via `deleted_at`.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isLogCrmEnabledFromEnv } from '../_shared/log-crm-feature-flag.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

const FUNC_NAME = 'TRANSPORTADOR-LOGISTICA-V1'

interface AuthenticatedUser {
  id: string
  email: string
  tipo: 'backoffice' | 'vendedor'
  ativo: boolean
}

function isFeatureEnabled(): boolean {
  return isLogCrmEnabledFromEnv()
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function validateJWT(
  req: Request,
  supabaseUrl: string,
  supabaseServiceKey: string,
): Promise<{ user: AuthenticatedUser | null; error: string | null }> {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return { user: null, error: 'Missing authorization header' }
    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authUser) return { user: null, error: 'Invalid or expired token' }
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('user_id, email, tipo, ativo')
      .eq('user_id', authUser.id)
      .eq('ativo', true)
      .is('deleted_at', null)
      .single()
    if (userError || !userData) return { user: null, error: 'User not found or inactive' }
    return {
      user: {
        id: userData.user_id,
        email: userData.email || authUser.email || '',
        tipo: userData.tipo as 'backoffice' | 'vendedor',
        ativo: userData.ativo,
      },
      error: null,
    }
  } catch {
    return { user: null, error: 'Authentication error' }
  }
}

function maskCnpj(cnpj: string | null | undefined): string {
  if (!cnpj || cnpj.length < 8) return '****'
  return cnpj.slice(0, 4) + '******' + cnpj.slice(-4)
}

function digitsOnly(s: string | null | undefined): string {
  return (s || '').replace(/\D/g, '')
}

function formatTransportador(row: Record<string, unknown>) {
  const cnpj = (row.cnpj as string) || ''
  return {
    id: String(row.id),
    razaoSocial: row.razao_social,
    nomeFantasia: row.nome_fantasia ?? null,
    cnpj,
    inscricaoEstadual: row.inscricao_estadual ?? null,
    uf: row.uf ?? null,
    email: row.email ?? null,
    telefone: row.telefone ?? null,
    grupo: row.grupo,
    sswDominio: row.ssw_dominio ?? null,
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
    const funcIdx = pathParts.indexOf('transportador-logistica-v1')
    const idFromPath = funcIdx >= 0 && funcIdx < pathParts.length - 1 ? pathParts[funcIdx + 1] : null
    const id = idFromPath || url.searchParams.get('id')

    // ---------- GET ----------
    if (req.method === 'GET') {
      if (id) {
        const { data, error } = await supabase
          .from('transportador_logistica')
          .select('*')
          .eq('id', id)
          .is('deleted_at', null)
          .single()
        if (error || !data) return jsonResponse(404, { success: false, error: 'Transportador não encontrado' })
        return jsonResponse(200, { success: true, data: formatTransportador(data) })
      }
      const apenasAtivos = url.searchParams.get('apenas_ativos') === 'true'
      let query = supabase
        .from('transportador_logistica')
        .select('*', { count: 'exact' })
        .is('deleted_at', null)
        .order('razao_social', { ascending: true })
      if (apenasAtivos) query = query.eq('ativo', true)
      const { data, error, count } = await query
      if (error) throw new Error(error.message)
      return jsonResponse(200, {
        success: true,
        data: { transportadores: (data || []).map(formatTransportador), total: count ?? 0 },
      })
    }

    // Operações de escrita: backoffice only
    if (req.method !== 'GET' && user.tipo !== 'backoffice') {
      return jsonResponse(403, { success: false, error: 'Apenas backoffice pode escrever transportadores' })
    }

    // ---------- POST ----------
    if (req.method === 'POST') {
      const body = await req.json()
      const cnpjDigits = digitsOnly(body.cnpj)
      if (cnpjDigits.length !== 14) return jsonResponse(400, { success: false, error: 'CNPJ inválido (esperado 14 dígitos)' })
      if (!body.razaoSocial || String(body.razaoSocial).trim().length < 2) {
        return jsonResponse(400, { success: false, error: 'razaoSocial obrigatório' })
      }
      const insert = {
        razao_social: String(body.razaoSocial).trim(),
        nome_fantasia: body.nomeFantasia ? String(body.nomeFantasia).trim() : null,
        cnpj: cnpjDigits,
        inscricao_estadual: body.inscricaoEstadual ?? null,
        uf: body.uf ?? null,
        email: body.email ?? null,
        telefone: body.telefone ? digitsOnly(body.telefone) : null,
        grupo: body.grupo || 'OUTROS',
        ssw_dominio: body.sswDominio ?? null,
        criado_por: user.id,
        atualizado_por: user.id,
      }
      const { data, error } = await supabase
        .from('transportador_logistica')
        .insert(insert)
        .select()
        .single()
      if (error) {
        if ((error as { code?: string }).code === '23505') {
          return jsonResponse(409, { success: false, error: 'CNPJ já cadastrado' })
        }
        throw new Error(error.message)
      }
      console.log(`[${FUNC_NAME}] created`, { id: data.id, cnpjMasked: maskCnpj(cnpjDigits) })
      return jsonResponse(201, { success: true, data: formatTransportador(data) })
    }

    // ---------- PUT ----------
    if (req.method === 'PUT') {
      if (!id) return jsonResponse(400, { success: false, error: 'ID obrigatório' })
      const body = await req.json()
      const patch: Record<string, unknown> = { atualizado_por: user.id, updated_at: new Date().toISOString() }
      if (body.razaoSocial !== undefined) patch.razao_social = String(body.razaoSocial).trim()
      if (body.nomeFantasia !== undefined) patch.nome_fantasia = body.nomeFantasia ? String(body.nomeFantasia).trim() : null
      if (body.cnpj !== undefined) {
        const c = digitsOnly(body.cnpj)
        if (c.length !== 14) return jsonResponse(400, { success: false, error: 'CNPJ inválido' })
        patch.cnpj = c
      }
      if (body.inscricaoEstadual !== undefined) patch.inscricao_estadual = body.inscricaoEstadual ?? null
      if (body.uf !== undefined) patch.uf = body.uf ?? null
      if (body.email !== undefined) patch.email = body.email ?? null
      if (body.telefone !== undefined) patch.telefone = body.telefone ? digitsOnly(body.telefone) : null
      if (body.grupo !== undefined) patch.grupo = body.grupo
      if (body.sswDominio !== undefined) patch.ssw_dominio = body.sswDominio ?? null
      if (body.ativo !== undefined) patch.ativo = !!body.ativo
      const { data, error } = await supabase
        .from('transportador_logistica')
        .update(patch)
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single()
      if (error || !data) return jsonResponse(404, { success: false, error: 'Transportador não encontrado para atualizar' })
      return jsonResponse(200, { success: true, data: formatTransportador(data) })
    }

    // ---------- DELETE (soft) ----------
    if (req.method === 'DELETE') {
      if (!id) return jsonResponse(400, { success: false, error: 'ID obrigatório' })
      const { error } = await supabase
        .from('transportador_logistica')
        .update({ deleted_at: new Date().toISOString(), ativo: false, atualizado_por: user.id })
        .eq('id', id)
        .is('deleted_at', null)
      if (error) throw new Error(error.message)
      return jsonResponse(200, { success: true, data: { message: 'Transportador removido' } })
    }

    return jsonResponse(405, { success: false, error: 'Method not allowed' })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[${FUNC_NAME}] EXCEPTION`, message)
    return jsonResponse(500, { success: false, error: message })
  }
})
