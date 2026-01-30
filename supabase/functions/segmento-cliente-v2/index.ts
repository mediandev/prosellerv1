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

// Helper: Valida JWT
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

serve(async (req) => {
  const startTime = Date.now()
  console.log('[SEGMENTO-CLIENTE-V2] Request received:', { method: req.method, url: req.url, timestamp: new Date().toISOString() })

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400',
      }
    })
  }

  try {
    console.log('[SEGMENTO-CLIENTE-V2] Step 1: Starting authentication...')
    
    // 1. AUTENTICAÇÃO
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)
    
    if (authError || !user) {
      console.error('[SEGMENTO-CLIENTE-V2] Authentication failed:', authError)
      return createAuthErrorResponse(authError || 'Unauthorized')
    }

    console.log('[SEGMENTO-CLIENTE-V2] Step 2: User authenticated:', { userId: user.id, tipo: user.tipo })

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    })

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(p => p)
    // Extrair ID se estiver no path (formato: /functions/v1/segmento-cliente-v2/:id)
    // O path será algo como: ['functions', 'v1', 'segmento-cliente-v2', '123']
    // Encontrar o índice de 'segmento-cliente-v2' e pegar o próximo elemento como ID
    const functionIndex = pathParts.indexOf('segmento-cliente-v2')
    const segmentoId = functionIndex >= 0 && functionIndex < pathParts.length - 1
      ? pathParts[functionIndex + 1]
      : url.searchParams.get('id')

    console.log('[SEGMENTO-CLIENTE-V2] Step 3: Processing request:', { 
      segmentoId, 
      method: req.method, 
      pathParts, 
      functionIndex,
      url: req.url,
      pathname: url.pathname
    })

    // 2. ROTEAMENTO POR MÉTODO
    if (req.method === 'GET') {
      if (segmentoId) {
        // GET /segmento-cliente-v2/:id
        console.log('[SEGMENTO-CLIENTE-V2] Getting segmento by ID:', segmentoId)
        
        const { data: segmento, error: segmentoError } = await supabase
          .rpc('get_segmento_cliente_v2', {
            p_id: parseInt(segmentoId)
          })

        if (segmentoError) {
          console.error('[SEGMENTO-CLIENTE-V2] RPC Error:', segmentoError)
          throw new Error(`Database operation failed: ${segmentoError.message}`)
        }

        if (!segmento || segmento.length === 0) {
          throw new Error('Segmento de cliente não encontrado')
        }

        const formattedSegmento = {
          id: String(segmento[0].id),
          nome: segmento[0].nome,
          descricao: segmento[0].descricao || undefined,
          ativo: segmento[0].ativo,
          createdAt: segmento[0].created_at ? new Date(segmento[0].created_at).toISOString() : new Date().toISOString(),
          updatedAt: segmento[0].updated_at ? new Date(segmento[0].updated_at).toISOString() : new Date().toISOString(),
        }

        const duration = Date.now() - startTime
        console.log(`[SEGMENTO-CLIENTE-V2] SUCCESS: Segmento retrieved (${duration}ms)`)

        return createHttpSuccessResponse(
          formattedSegmento,
          200,
          { userId: user.id, duration: `${duration}ms` }
        )
      } else {
        // GET /segmento-cliente-v2 (listar todas)
        console.log('[SEGMENTO-CLIENTE-V2] Listing segmentos...')
        
        const search = url.searchParams.get('search') || null
        const apenasAtivos = url.searchParams.get('apenas_ativos') === 'true'
        const page = parseInt(url.searchParams.get('page') || '1')
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 100)

        const { data: rpcData, error: rpcError } = await supabase
          .rpc('list_segmento_cliente_v2', {
            p_requesting_user_id: user.id,
            p_search: search,
            p_apenas_ativos: apenasAtivos,
            p_page: page,
            p_limit: limit,
          })

        if (rpcError) {
          console.error('[SEGMENTO-CLIENTE-V2] RPC Error:', rpcError)
          throw new Error(`Database operation failed: ${rpcError.message}`)
        }

        const segmentos = rpcData?.segmentos || []
        const formattedSegmentos = segmentos.map((s: any) => ({
          id: String(s.id),
          nome: s.nome,
          descricao: s.descricao || undefined,
          ativo: s.ativo,
          createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : new Date().toISOString(),
          updatedAt: s.updatedAt ? new Date(s.updatedAt).toISOString() : new Date().toISOString(),
        }))

        const duration = Date.now() - startTime
        console.log(`[SEGMENTO-CLIENTE-V2] SUCCESS: Listed ${formattedSegmentos.length} segmentos (${duration}ms)`)

        return createHttpSuccessResponse(
          {
            segmentos: formattedSegmentos,
            pagination: {
              page: rpcData?.page || page,
              limit: rpcData?.limit || limit,
              total: rpcData?.total || 0,
              total_pages: rpcData?.total_pages || 0,
            }
          },
          200,
          { userId: user.id, duration: `${duration}ms` }
        )
      }
    }

    if (req.method === 'POST') {
      const body = await req.json()
      const action = body.action || 'create'

      if (action === 'create') {
        console.log('[SEGMENTO-CLIENTE-V2] Creating segmento...', body)

        // Verificar permissões - apenas backoffice pode criar
        if (user.tipo !== 'backoffice') {
          throw new Error('Apenas usuários backoffice podem criar segmentos de cliente')
        }

        // Validações
        if (!body.nome || body.nome.trim().length < 2) {
          throw new Error('Nome deve ter pelo menos 2 caracteres')
        }

        const { data: segmento, error: segmentoError } = await supabase
          .rpc('create_segmento_cliente_v2', {
            p_nome: body.nome.trim(),
            p_descricao: body.descricao ? body.descricao.trim() : null,
            p_created_by: user.id,
          })

        if (segmentoError) {
          console.error('[SEGMENTO-CLIENTE-V2] RPC Error:', segmentoError)
          throw new Error(`Database operation failed: ${segmentoError.message}`)
        }

        if (!segmento || segmento.length === 0) {
          throw new Error('Erro ao criar segmento de cliente')
        }

        const formattedSegmento = {
          id: String(segmento[0].id),
          nome: segmento[0].nome,
          descricao: segmento[0].descricao || undefined,
          ativo: segmento[0].ativo,
          createdAt: segmento[0].created_at ? new Date(segmento[0].created_at).toISOString() : new Date().toISOString(),
          updatedAt: segmento[0].updated_at ? new Date(segmento[0].updated_at).toISOString() : new Date().toISOString(),
        }

        const duration = Date.now() - startTime
        console.log(`[SEGMENTO-CLIENTE-V2] SUCCESS: Segmento created (${duration}ms)`)

        return createHttpSuccessResponse(
          formattedSegmento,
          201,
          { userId: user.id, duration: `${duration}ms` }
        )
      }
    }

    if (req.method === 'PUT') {
      const body = await req.json()
      const id = segmentoId || body.id

      if (!id) {
        throw new Error('ID é obrigatório para atualização')
      }

      console.log('[SEGMENTO-CLIENTE-V2] Updating segmento:', id, body)

      // Verificar permissões - apenas backoffice pode atualizar
      if (user.tipo !== 'backoffice') {
        throw new Error('Apenas usuários backoffice podem atualizar segmentos de cliente')
      }

      const { data: segmento, error: segmentoError } = await supabase
        .rpc('update_segmento_cliente_v2', {
          p_id: parseInt(id),
          p_nome: body.nome ? body.nome.trim() : null,
          p_descricao: body.descricao !== undefined ? (body.descricao ? body.descricao.trim() : null) : null,
          p_ativo: body.ativo !== undefined ? body.ativo : null,
          p_updated_by: user.id,
        })

      if (segmentoError) {
        console.error('[SEGMENTO-CLIENTE-V2] RPC Error:', segmentoError)
        throw new Error(`Database operation failed: ${segmentoError.message}`)
      }

      if (!segmento || segmento.length === 0) {
        throw new Error('Segmento de cliente não encontrado')
      }

      const formattedSegmento = {
        id: String(segmento[0].id),
        nome: segmento[0].nome,
        descricao: segmento[0].descricao || undefined,
        ativo: segmento[0].ativo,
        createdAt: segmento[0].created_at ? new Date(segmento[0].created_at).toISOString() : new Date().toISOString(),
        updatedAt: segmento[0].updated_at ? new Date(segmento[0].updated_at).toISOString() : new Date().toISOString(),
      }

      const duration = Date.now() - startTime
      console.log(`[SEGMENTO-CLIENTE-V2] SUCCESS: Segmento updated (${duration}ms)`)

      return createHttpSuccessResponse(
        formattedSegmento,
        200,
        { userId: user.id, duration: `${duration}ms` }
      )
    }

    if (req.method === 'DELETE') {
      const id = segmentoId || url.searchParams.get('id')

      console.log('[SEGMENTO-CLIENTE-V2] DELETE Request details:', {
        segmentoIdFromPath: segmentoId,
        idFromQueryParams: url.searchParams.get('id'),
        finalId: id,
        pathParts,
        url: req.url
      })

      if (!id) {
        console.error('[SEGMENTO-CLIENTE-V2] ID missing:', {
          segmentoId,
          queryParamId: url.searchParams.get('id'),
          pathParts,
          url: req.url
        })
        throw new Error('ID é obrigatório para exclusão')
      }

      // Validar se o ID é um número válido
      const idNum = parseInt(id)
      if (isNaN(idNum) || idNum <= 0) {
        throw new Error(`ID inválido: ${id}`)
      }

      console.log('[SEGMENTO-CLIENTE-V2] Deleting segmento:', { id: idNum })

      // Verificar permissões - apenas backoffice pode excluir
      if (user.tipo !== 'backoffice') {
        throw new Error('Apenas usuários backoffice podem excluir segmentos de cliente')
      }

      const { error: deleteError } = await supabase
        .rpc('delete_segmento_cliente_v2', {
          p_id: idNum,
          p_deleted_by: user.id,
        })

      if (deleteError) {
        console.error('[SEGMENTO-CLIENTE-V2] RPC Error:', deleteError)
        throw new Error(`Database operation failed: ${deleteError.message}`)
      }

      const duration = Date.now() - startTime
      console.log(`[SEGMENTO-CLIENTE-V2] SUCCESS: Segmento deleted (${duration}ms)`)

      return createHttpSuccessResponse(
        { success: true, message: 'Segmento de cliente excluído com sucesso' },
        200,
        { userId: user.id, duration: `${duration}ms` }
      )
    }

    // Método não suportado
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed', timestamp: new Date().toISOString() }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[SEGMENTO-CLIENTE-V2] EXCEPTION:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`
    })
    return formatErrorResponse(error)
  }
})
