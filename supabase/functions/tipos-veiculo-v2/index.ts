import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface AuthenticatedUser {
  id: string
  email: string
  tipo: 'backoffice' | 'vendedor'
  ativo: boolean
}

async function validateJWT(
  req: Request,
  supabaseUrl: string,
  supabaseServiceKey: string
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
      error: null
    }
  } catch (error) {
    return { user: null, error: 'Authentication error' }
  }
}

function createAuthErrorResponse(message: string, statusCode: number = 401): Response {
  return new Response(
    JSON.stringify({ error: message, timestamp: new Date().toISOString() }),
    { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function createHttpSuccessResponse<T>(data: T, status: number = 200, meta?: Record<string, any>): Response {
  return new Response(
    JSON.stringify({ success: true, data, meta: { timestamp: new Date().toISOString(), ...meta } }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function formatErrorResponse(error: Error | unknown): Response {
  let statusCode = 500
  let errorMessage = 'Internal server error'
  if (error instanceof Error) {
    errorMessage = error.message
    if (error.message.includes('Unauthorized') || error.message.includes('authentication')) statusCode = 401
    else if (error.message.includes('permission') || error.message.includes('forbidden')) statusCode = 403
    else if (error.message.includes('not found')) statusCode = 404
    else if (error.message.includes('validation') || error.message.includes('invalid')) statusCode = 400
  }
  console.error('[ERROR]', { message: errorMessage, statusCode })
  return new Response(
    JSON.stringify({ success: false, error: errorMessage, timestamp: new Date().toISOString() }),
    { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function formatTipoVeiculo(row: any) {
  return {
    id: String(row.id),
    nome: row.nome,
    descricao: row.descricao || undefined,
    ativo: row.ativo ?? true,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  }
}

serve(async (req) => {
  const startTime = Date.now()
  console.log('[TIPOS-VEICULO-V2] Request received:', { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsHeaders, 'Access-Control-Max-Age': '86400' } })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)
    if (authError || !user) {
      return createAuthErrorResponse(authError || 'Unauthorized')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    })

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(p => p)
    const functionIndex = pathParts.indexOf('tipos-veiculo-v2')
    const tipoId = functionIndex >= 0 && functionIndex < pathParts.length - 1
      ? pathParts[functionIndex + 1]
      : url.searchParams.get('id')

    if (req.method === 'GET') {
      if (tipoId) {
        const { data: rows, error: rpcError } = await supabase
          .rpc('get_tipos_veiculo_v2', { p_id: tipoId })
        if (rpcError) throw new Error(`Database operation failed: ${rpcError.message}`)
        if (!rows || rows.length === 0) throw new Error('Tipo de veículo não encontrado')
        const formatted = formatTipoVeiculo(rows[0])
        return createHttpSuccessResponse(formatted, 200, { userId: user.id })
      }

      const search = url.searchParams.get('search') || null
      const apenasAtivos = url.searchParams.get('apenas_ativos') === 'true'
      const page = parseInt(url.searchParams.get('page') || '1')
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 100)

      const { data: rpcData, error: rpcError } = await supabase
        .rpc('list_tipos_veiculo_v2', {
          p_requesting_user_id: user.id,
          p_search: search,
          p_apenas_ativos: apenasAtivos,
          p_page: page,
          p_limit: limit,
        })
      if (rpcError) throw new Error(`Database operation failed: ${rpcError.message}`)

      const tipos = rpcData?.tipos || []
      const formattedList = tipos.map((t: any) => ({
        id: String(t.id),
        nome: t.nome,
        descricao: t.descricao || undefined,
        ativo: t.ativo ?? true,
        createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: t.updatedAt ? new Date(t.updatedAt).toISOString() : new Date().toISOString(),
      }))
      return createHttpSuccessResponse(formattedList, 200, { userId: user.id })
    }

    if (req.method === 'POST') {
      const body = await req.json()
      if (user.tipo !== 'backoffice') {
        throw new Error('Apenas usuários backoffice podem criar tipos de veículo')
      }
      if (!body.nome || body.nome.trim().length < 2) {
        throw new Error('Nome deve ter pelo menos 2 caracteres')
      }

      const { data: rows, error: rpcError } = await supabase
        .rpc('create_tipos_veiculo_v2', {
          p_nome: body.nome.trim(),
          p_descricao: body.descricao ? body.descricao.trim() : null,
          p_created_by: user.id,
        })
      if (rpcError) throw new Error(`Database operation failed: ${rpcError.message}`)
      if (!rows || rows.length === 0) throw new Error('Erro ao criar tipo de veículo')

      const formatted = formatTipoVeiculo(rows[0])
      return createHttpSuccessResponse(formatted, 201, { userId: user.id })
    }

    if (req.method === 'PUT') {
      const body = await req.json()
      const id = tipoId || body.id
      if (!id) throw new Error('ID é obrigatório para atualização')
      if (user.tipo !== 'backoffice') {
        throw new Error('Apenas usuários backoffice podem atualizar tipos de veículo')
      }

      const { data: rows, error: rpcError } = await supabase
        .rpc('update_tipos_veiculo_v2', {
          p_id: id,
          p_nome: body.nome ? body.nome.trim() : null,
          p_descricao: body.descricao !== undefined ? (body.descricao ? body.descricao.trim() : null) : null,
          p_ativo: body.ativo !== undefined ? body.ativo : null,
          p_updated_by: user.id,
        })
      if (rpcError) throw new Error(`Database operation failed: ${rpcError.message}`)
      if (!rows || rows.length === 0) throw new Error('Tipo de veículo não encontrado')

      const formatted = formatTipoVeiculo(rows[0])
      return createHttpSuccessResponse(formatted, 200, { userId: user.id })
    }

    if (req.method === 'DELETE') {
      const id = tipoId || url.searchParams.get('id')
      if (!id) throw new Error('ID é obrigatório para exclusão')
      if (user.tipo !== 'backoffice') {
        throw new Error('Apenas usuários backoffice podem excluir tipos de veículo')
      }

      const { error: deleteError } = await supabase
        .rpc('delete_tipos_veiculo_v2', { p_id: id, p_deleted_by: user.id })
      if (deleteError) throw new Error(`Database operation failed: ${deleteError.message}`)

      return createHttpSuccessResponse(
        { success: true, message: 'Tipo de veículo excluído com sucesso' },
        200,
        { userId: user.id }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed', timestamp: new Date().toISOString() }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[TIPOS-VEICULO-V2] EXCEPTION:', error instanceof Error ? error.message : String(error))
    return formatErrorResponse(error)
  }
})
