import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

async function validateJWT(req: Request, supabaseUrl: string, supabaseServiceKey: string) {
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
    return { user: { id: userData.user_id, email: userData.email || authUser.email || '', tipo: userData.tipo, ativo: userData.ativo }, error: null }
  } catch {
    return { user: null, error: 'Authentication error' }
  }
}

function ok(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

function err(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)
  if (!user) return err(authError || 'Unauthorized', 401)

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const url = new URL(req.url)

  try {
    if (req.method === 'GET') {
      const clienteId = url.searchParams.get('cliente_id')
      if (!clienteId) return err('cliente_id obrigatorio')

      const { data, error } = await supabase
        .from('status_mix')
        .select('*')
        .eq('cliente_id', Number(clienteId))

      if (error) throw error

      const mapped = (data || []).map((row: any) => ({
        id: String(row.id),
        clienteId: String(row.cliente_id),
        produtoId: String(row.produto_id),
        status: row.status,
        ativadoManualmente: row.ativado_manualmente,
        codigoSkuCliente: row.codigo_sku_cliente ?? undefined,
        dataUltimoPedido: row.data_ultimo_pedido ?? undefined,
        dataCriacao: row.created_at,
        dataAtualizacao: row.updated_at,
      }))

      return ok(mapped)
    }

    if (req.method === 'PUT') {
      const body = await req.json()
      const clienteId = Number(body.clienteId ?? body.cliente_id)
      const produtoId = Number(body.produtoId ?? body.produto_id)
      if (!clienteId || !produtoId) return err('clienteId e produtoId obrigatorios')

      const upsertData: any = {
        cliente_id: clienteId,
        produto_id: produtoId,
        status: body.status ?? 'inativo',
        ativado_manualmente: body.ativadoManualmente ?? false,
        updated_at: new Date().toISOString(),
      }
      if (body.codigoSkuCliente !== undefined) upsertData.codigo_sku_cliente = body.codigoSkuCliente || null
      if (body.dataUltimoPedido !== undefined) upsertData.data_ultimo_pedido = body.dataUltimoPedido || null

      const { data, error } = await supabase
        .from('status_mix')
        .upsert(upsertData, { onConflict: 'cliente_id,produto_id' })
        .select()
        .single()

      if (error) throw error

      return ok({
        id: String(data.id),
        clienteId: String(data.cliente_id),
        produtoId: String(data.produto_id),
        status: data.status,
        ativadoManualmente: data.ativado_manualmente,
        codigoSkuCliente: data.codigo_sku_cliente ?? undefined,
        dataUltimoPedido: data.data_ultimo_pedido ?? undefined,
        dataCriacao: data.created_at,
        dataAtualizacao: data.updated_at,
      })
    }

    return err('Method not allowed', 405)
  } catch (e: any) {
    console.error('[STATUS-MIX-V2] Error:', e)
    return err(e.message || 'Internal server error', 500)
  }
})
