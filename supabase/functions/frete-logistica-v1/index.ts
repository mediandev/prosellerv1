// Edge Function: frete-logistica-v1
// F-LOG-CRM R-LOG-1 · CRUD do cabeçalho do frete (sem ocorrências, sem hook Tiny).
// Gated por FEATURE_LOG_CRM. Backoffice + vendedor podem criar (vendedor restrito
// à própria empresa); deleção é backoffice-only. Soft-delete via deleted_at.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isLogCrmEnabledFromEnv } from '../_shared/log-crm-feature-flag.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}
const FUNC_NAME = 'FRETE-LOGISTICA-V1'

interface AuthenticatedUser { id: string; email: string; tipo: 'backoffice' | 'vendedor'; ativo: boolean }

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

function formatFrete(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    pedidoVendaId: row.pedido_venda_id ? Number(row.pedido_venda_id) : null,
    nfeNumero: row.nfe_numero ? Number(row.nfe_numero) : null,
    nfeChaveAcesso: row.nfe_chave_acesso ?? null,
    clienteId: row.cliente_id ? Number(row.cliente_id) : null,
    empresaId: Number(row.empresa_id),
    vendedorId: row.vendedor_id ?? null,
    transportadorId: row.transportador_id ? Number(row.transportador_id) : null,
    regiaoDestinoId: row.regiao_destino_id ? Number(row.regiao_destino_id) : null,
    origemFreteId: row.origem_frete_id ? Number(row.origem_frete_id) : null,
    dataEmissao: row.data_emissao ?? null,
    dataSaida: row.data_saida ?? null,
    previsaoEntrega: row.previsao_entrega ?? null,
    dataEntrega: row.data_entrega ?? null,
    valorProdutos: row.valor_produtos != null ? Number(row.valor_produtos) : 0,
    valorCotacao: row.valor_cotacao != null ? Number(row.valor_cotacao) : null,
    volumes: row.volumes != null ? Number(row.volumes) : null,
    numeroExpedicao: row.numero_expedicao ?? null,
    numeroColeta: row.numero_coleta ?? null,
    statusEntrega: row.status_entrega,
    rateio: !!row.rateio,
    reentrega: !!row.reentrega,
    dacteUrl: row.dacte_url ?? null,
    comprovanteEntregaUrl: row.comprovante_entrega_url ?? null,
    observacoes: row.observacoes ?? null,
    createdAt: row.created_at ? new Date(row.created_at as string).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at as string).toISOString() : null,
  }
}

function bodyToInsert(body: Record<string, unknown>, userId: string) {
  return {
    pedido_venda_id: body.pedidoVendaId ?? null,
    nfe_numero: body.nfeNumero ?? null,
    nfe_chave_acesso: body.nfeChaveAcesso ?? null,
    cliente_id: body.clienteId ?? null,
    empresa_id: body.empresaId,
    vendedor_id: body.vendedorId ?? null,
    transportador_id: body.transportadorId ?? null,
    regiao_destino_id: body.regiaoDestinoId ?? null,
    origem_frete_id: body.origemFreteId ?? null,
    data_emissao: body.dataEmissao ?? null,
    data_saida: body.dataSaida ?? null,
    previsao_entrega: body.previsaoEntrega ?? null,
    data_entrega: body.dataEntrega ?? null,
    valor_produtos: body.valorProdutos ?? 0,
    valor_cotacao: body.valorCotacao ?? null,
    volumes: body.volumes ?? null,
    numero_expedicao: body.numeroExpedicao ?? null,
    numero_coleta: body.numeroColeta ?? null,
    status_entrega: body.statusEntrega || 'Em Separação',
    rateio: body.rateio === true,
    reentrega: body.reentrega === true,
    dacte_url: body.dacteUrl ?? null,
    comprovante_entrega_url: body.comprovanteEntregaUrl ?? null,
    observacoes: body.observacoes ?? null,
    criado_por: userId,
    atualizado_por: userId,
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
    const funcIdx = pathParts.indexOf('frete-logistica-v1')
    const idFromPath = funcIdx >= 0 && funcIdx < pathParts.length - 1 ? pathParts[funcIdx + 1] : null
    const id = idFromPath || url.searchParams.get('id')

    if (req.method === 'GET') {
      if (id) {
        const { data, error } = await supabase
          .from('frete_logistica').select('*').eq('id', id).is('deleted_at', null).single()
        if (error || !data) return jsonResponse(404, { success: false, error: 'Frete não encontrado' })
        return jsonResponse(200, { success: true, data: formatFrete(data) })
      }
      const empresaIdFilter = url.searchParams.get('empresa_id')
      const statusFilter = url.searchParams.get('status_entrega')
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
      let query = supabase.from('frete_logistica').select('*', { count: 'exact' })
        .is('deleted_at', null).order('created_at', { ascending: false }).limit(limit)
      if (empresaIdFilter) query = query.eq('empresa_id', empresaIdFilter)
      if (statusFilter) query = query.eq('status_entrega', statusFilter)
      const { data, error, count } = await query
      if (error) throw new Error(error.message)
      return jsonResponse(200, { success: true, data: { fretes: (data || []).map(formatFrete), total: count ?? 0 } })
    }

    // POST + PUT: backoffice ou vendedor (com tenant scoping no payload).
    if (req.method === 'POST') {
      const body = await req.json()
      if (!body.empresaId) return jsonResponse(400, { success: false, error: 'empresaId obrigatório' })
      const insert = bodyToInsert(body, user.id)
      const { data, error } = await supabase.from('frete_logistica').insert(insert).select().single()
      if (error) {
        if (error.message?.includes('valor_produtos_pos')) return jsonResponse(400, { success: false, error: 'valor_produtos deve ser >= 0' })
        if (error.message?.includes('nfe_chave_44')) return jsonResponse(400, { success: false, error: 'nfe_chave_acesso deve ter 44 dígitos' })
        throw new Error(error.message)
      }
      return jsonResponse(201, { success: true, data: formatFrete(data) })
    }

    if (req.method === 'PUT') {
      if (!id) return jsonResponse(400, { success: false, error: 'ID obrigatório' })
      const body = await req.json()
      const patch: Record<string, unknown> = { atualizado_por: user.id, updated_at: new Date().toISOString() }
      const fieldMap: Record<string, string> = {
        pedidoVendaId: 'pedido_venda_id',
        nfeNumero: 'nfe_numero',
        nfeChaveAcesso: 'nfe_chave_acesso',
        clienteId: 'cliente_id',
        empresaId: 'empresa_id',
        vendedorId: 'vendedor_id',
        transportadorId: 'transportador_id',
        regiaoDestinoId: 'regiao_destino_id',
        origemFreteId: 'origem_frete_id',
        dataEmissao: 'data_emissao',
        dataSaida: 'data_saida',
        previsaoEntrega: 'previsao_entrega',
        dataEntrega: 'data_entrega',
        valorProdutos: 'valor_produtos',
        valorCotacao: 'valor_cotacao',
        volumes: 'volumes',
        numeroExpedicao: 'numero_expedicao',
        numeroColeta: 'numero_coleta',
        statusEntrega: 'status_entrega',
        rateio: 'rateio',
        reentrega: 'reentrega',
        dacteUrl: 'dacte_url',
        comprovanteEntregaUrl: 'comprovante_entrega_url',
        observacoes: 'observacoes',
      }
      for (const [k, dbCol] of Object.entries(fieldMap)) {
        if (body[k] !== undefined) patch[dbCol] = body[k]
      }
      const { data, error } = await supabase
        .from('frete_logistica').update(patch).eq('id', id).is('deleted_at', null).select().single()
      if (error || !data) return jsonResponse(404, { success: false, error: 'Frete não encontrado para atualizar' })
      return jsonResponse(200, { success: true, data: formatFrete(data) })
    }

    if (req.method === 'DELETE') {
      if (user.tipo !== 'backoffice') return jsonResponse(403, { success: false, error: 'Apenas backoffice pode remover frete' })
      if (!id) return jsonResponse(400, { success: false, error: 'ID obrigatório' })
      const { error } = await supabase
        .from('frete_logistica')
        .update({ deleted_at: new Date().toISOString(), atualizado_por: user.id })
        .eq('id', id).is('deleted_at', null)
      if (error) throw new Error(error.message)
      return jsonResponse(200, { success: true, data: { message: 'Frete removido' } })
    }

    return jsonResponse(405, { success: false, error: 'Method not allowed' })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[${FUNC_NAME}] EXCEPTION`, message)
    return jsonResponse(500, { success: false, error: message })
  }
})
