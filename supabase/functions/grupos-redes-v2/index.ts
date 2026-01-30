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

function formatGrupoRede(row: any) {
  return {
    id: String(row.id),
    nome: row.nome,
    descricao: row.descricao || undefined,
    dataCriacao: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    dataAtualizacao: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    criadoPor: undefined,
    atualizadoPor: undefined,
  }
}

serve(async (req) => {
  const startTime = Date.now()
  console.log('[GRUPOS-REDES-V2] Request received:', { method: req.method, url: req.url, timestamp: new Date().toISOString() })

  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { ...corsHeaders, 'Access-Control-Max-Age': '86400' },
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)

    if (authError || !user) {
      console.error('[GRUPOS-REDES-V2] Authentication failed:', authError)
      return createAuthErrorResponse(authError || 'Unauthorized')
    }

    console.log('[GRUPOS-REDES-V2] User authenticated:', { userId: user.id, tipo: user.tipo })

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    })

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(p => p)
    const functionIndex = pathParts.indexOf('grupos-redes-v2')
    const grupoId = functionIndex >= 0 && functionIndex < pathParts.length - 1
      ? pathParts[functionIndex + 1]
      : url.searchParams.get('id')

    console.log('[GRUPOS-REDES-V2] Processing:', { grupoId, method: req.method, pathParts, url: req.url })

    if (req.method === 'GET') {
      if (grupoId) {
        console.log('[GRUPOS-REDES-V2] Getting grupo/rede by ID:', grupoId)

        const { data: rows, error: rpcError } = await supabase
          .rpc('get_grupos_redes_v2', { p_id: grupoId })

        if (rpcError) {
          console.error('[GRUPOS-REDES-V2] RPC Error:', rpcError)
          throw new Error(`Database operation failed: ${rpcError.message}`)
        }

        if (!rows || rows.length === 0) {
          throw new Error('Grupo/rede não encontrado')
        }

        const formatted = formatGrupoRede(rows[0])
        const duration = Date.now() - startTime
        console.log(`[GRUPOS-REDES-V2] SUCCESS: Grupo/rede retrieved (${duration}ms)`)
        return createHttpSuccessResponse(formatted, 200, { userId: user.id, duration: `${duration}ms` })
      }

      console.log('[GRUPOS-REDES-V2] Listing grupos/redes...')
      const search = url.searchParams.get('search') || null
      const apenasAtivos = url.searchParams.get('apenas_ativos') === 'true'
      const page = parseInt(url.searchParams.get('page') || '1')
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 100)

      const { data: rpcData, error: rpcError } = await supabase
        .rpc('list_grupos_redes_v2', {
          p_requesting_user_id: user.id,
          p_search: search,
          p_apenas_ativos: apenasAtivos,
          p_page: page,
          p_limit: limit,
        })

      if (rpcError) {
        console.error('[GRUPOS-REDES-V2] RPC Error:', rpcError)
        throw new Error(`Database operation failed: ${rpcError.message}`)
      }

      const grupos = rpcData?.grupos || []
      const formattedList = grupos.map((g: any) => ({
        id: String(g.id),
        nome: g.nome,
        descricao: g.descricao || undefined,
        dataCriacao: g.createdAt ? new Date(g.createdAt).toISOString() : undefined,
        dataAtualizacao: g.updatedAt ? new Date(g.updatedAt).toISOString() : undefined,
        criadoPor: undefined,
        atualizadoPor: undefined,
      }))

      const duration = Date.now() - startTime
      console.log(`[GRUPOS-REDES-V2] SUCCESS: Listed ${formattedList.length} grupos/redes (${duration}ms)`)
      return createHttpSuccessResponse(formattedList, 200, { userId: user.id, duration: `${duration}ms` })
    }

    if (req.method === 'POST') {
      const body = await req.json()
      console.log('[GRUPOS-REDES-V2] Creating grupo/rede...', body)

      if (user.tipo !== 'backoffice') {
        throw new Error('Apenas usuários backoffice podem criar grupos/redes')
      }

      if (!body.nome || body.nome.trim().length < 2) {
        throw new Error('Nome deve ter pelo menos 2 caracteres')
      }

      const { data: rows, error: rpcError } = await supabase
        .rpc('create_grupos_redes_v2', {
          p_nome: body.nome.trim(),
          p_descricao: body.descricao ? body.descricao.trim() : null,
          p_created_by: user.id,
        })

      if (rpcError) {
        console.error('[GRUPOS-REDES-V2] RPC Error:', rpcError)
        throw new Error(`Database operation failed: ${rpcError.message}`)
      }

      if (!rows || rows.length === 0) {
        throw new Error('Erro ao criar grupo/rede')
      }

      const formatted = formatGrupoRede(rows[0])
      const duration = Date.now() - startTime
      console.log(`[GRUPOS-REDES-V2] SUCCESS: Grupo/rede created (${duration}ms)`)
      return createHttpSuccessResponse(formatted, 201, { userId: user.id, duration: `${duration}ms` })
    }

    if (req.method === 'PUT') {
      const body = await req.json()
      const id = grupoId || body.id

      console.log('[GRUPOS-REDES-V2] PUT details:', { grupoIdFromPath: grupoId, idFromBody: body.id, finalId: id })

      if (!id) {
        throw new Error('ID é obrigatório para atualização')
      }

      console.log('[GRUPOS-REDES-V2] Updating grupo/rede:', id, body)

      if (user.tipo !== 'backoffice') {
        throw new Error('Apenas usuários backoffice podem atualizar grupos/redes')
      }

      const { data: rows, error: rpcError } = await supabase
        .rpc('update_grupos_redes_v2', {
          p_id: id,
          p_nome: body.nome ? body.nome.trim() : null,
          p_descricao: body.descricao !== undefined ? (body.descricao ? body.descricao.trim() : null) : null,
          p_ativo: body.ativo !== undefined ? body.ativo : null,
          p_updated_by: user.id,
        })

      if (rpcError) {
        console.error('[GRUPOS-REDES-V2] RPC Error:', rpcError)
        throw new Error(`Database operation failed: ${rpcError.message}`)
      }

      if (!rows || rows.length === 0) {
        throw new Error('Grupo/rede não encontrado')
      }

      const formatted = formatGrupoRede(rows[0])
      const duration = Date.now() - startTime
      console.log(`[GRUPOS-REDES-V2] SUCCESS: Grupo/rede updated (${duration}ms)`)
      return createHttpSuccessResponse(formatted, 200, { userId: user.id, duration: `${duration}ms` })
    }

    if (req.method === 'DELETE') {
      const id = grupoId || url.searchParams.get('id')

      console.log('[GRUPOS-REDES-V2] DELETE details:', { grupoIdFromPath: grupoId, idFromQuery: url.searchParams.get('id'), finalId: id })

      if (!id) {
        throw new Error('ID é obrigatório para exclusão')
      }

      console.log('[GRUPOS-REDES-V2] Deleting grupo/rede:', id)

      if (user.tipo !== 'backoffice') {
        throw new Error('Apenas usuários backoffice podem excluir grupos/redes')
      }

      const { error: deleteError } = await supabase
        .rpc('delete_grupos_redes_v2', {
          p_id: id,
          p_deleted_by: user.id,
        })

      if (deleteError) {
        console.error('[GRUPOS-REDES-V2] RPC Error:', deleteError)
        throw new Error(`Database operation failed: ${deleteError.message}`)
      }

      const duration = Date.now() - startTime
      console.log(`[GRUPOS-REDES-V2] SUCCESS: Grupo/rede deleted (${duration}ms)`)
      return createHttpSuccessResponse(
        { success: true, message: 'Grupo/rede excluído com sucesso' },
        200,
        { userId: user.id, duration: `${duration}ms` }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed', timestamp: new Date().toISOString() }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[GRUPOS-REDES-V2] EXCEPTION:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`
    })
    return formatErrorResponse(error)
  }
})
