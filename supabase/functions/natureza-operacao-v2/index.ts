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
  console.log('[NATUREZA-OPERACAO-V2] Request received:', { method: req.method, url: req.url, timestamp: new Date().toISOString() })

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
    console.log('[NATUREZA-OPERACAO-V2] Step 1: Starting authentication...')
    
    // 1. AUTENTICAÇÃO
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)
    
    if (authError || !user) {
      console.error('[NATUREZA-OPERACAO-V2] Authentication failed:', authError)
      return createAuthErrorResponse(authError || 'Unauthorized')
    }

    console.log('[NATUREZA-OPERACAO-V2] Step 2: User authenticated:', { userId: user.id, tipo: user.tipo })

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    })

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(p => p)
    // Extrair ID se estiver no path (formato: /functions/v1/natureza-operacao-v2/:id)
    // O path será algo como: ['functions', 'v1', 'natureza-operacao-v2', '123']
    // Encontrar o índice de 'natureza-operacao-v2' e pegar o próximo elemento como ID
    const functionIndex = pathParts.indexOf('natureza-operacao-v2')
    const naturezaId = functionIndex >= 0 && functionIndex < pathParts.length - 1
      ? pathParts[functionIndex + 1]
      : url.searchParams.get('id')

    console.log('[NATUREZA-OPERACAO-V2] Step 3: Processing request:', { 
      naturezaId, 
      method: req.method, 
      pathParts, 
      functionIndex,
      url: req.url,
      pathname: url.pathname
    })

    // 2. ROTEAMENTO POR MÉTODO
    if (req.method === 'GET') {
      if (naturezaId) {
        // GET /natureza-operacao-v2/:id
        console.log('[NATUREZA-OPERACAO-V2] Getting natureza by ID:', naturezaId)
        
        const { data: natureza, error: naturezaError } = await supabase
          .rpc('get_natureza_operacao_v2', {
            p_id: parseInt(naturezaId)
          })

        if (naturezaError) {
          console.error('[NATUREZA-OPERACAO-V2] RPC Error:', naturezaError)
          throw new Error(`Database operation failed: ${naturezaError.message}`)
        }

        if (!natureza || natureza.length === 0) {
          throw new Error('Natureza de operação não encontrada')
        }

        const formattedNatureza = {
          id: String(natureza[0].id),
          nome: natureza[0].nome,
          codigo: natureza[0].codigo || undefined,
          descricao: natureza[0].descricao || undefined,
          geraComissao: natureza[0].gera_comissao,
          geraReceita: natureza[0].gera_receita,
          ativo: natureza[0].ativo,
          tiny_id: natureza[0].tiny_id || undefined,
          createdAt: natureza[0].created_at ? new Date(natureza[0].created_at).toISOString() : new Date().toISOString(),
          updatedAt: natureza[0].updated_at ? new Date(natureza[0].updated_at).toISOString() : new Date().toISOString(),
        }

        const duration = Date.now() - startTime
        console.log(`[NATUREZA-OPERACAO-V2] SUCCESS: Natureza retrieved (${duration}ms)`)

        return createHttpSuccessResponse(
          formattedNatureza,
          200,
          { userId: user.id, duration: `${duration}ms` }
        )
      } else {
        // GET /natureza-operacao-v2 (listar todas)
        console.log('[NATUREZA-OPERACAO-V2] Listing naturezas...')
        
        const search = url.searchParams.get('search') || null
        const apenasAtivas = url.searchParams.get('apenas_ativas') === 'true'
        const page = parseInt(url.searchParams.get('page') || '1')
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 100)

        const { data: rpcData, error: rpcError } = await supabase
          .rpc('list_natureza_operacao_v2', {
            p_requesting_user_id: user.id,
            p_search: search,
            p_apenas_ativas: apenasAtivas,
            p_page: page,
            p_limit: limit,
          })

        if (rpcError) {
          console.error('[NATUREZA-OPERACAO-V2] RPC Error:', rpcError)
          throw new Error(`Database operation failed: ${rpcError.message}`)
        }

        const naturezas = rpcData?.naturezas || []
        const formattedNaturezas = naturezas.map((n: any) => ({
          id: String(n.id),
          nome: n.nome,
          codigo: n.codigo || undefined,
          descricao: n.descricao || undefined,
          geraComissao: n.geraComissao,
          geraReceita: n.geraReceita,
          ativo: n.ativo,
          tiny_id: n.tiny_id || undefined,
          createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : new Date().toISOString(),
          updatedAt: n.updatedAt ? new Date(n.updatedAt).toISOString() : new Date().toISOString(),
        }))

        const duration = Date.now() - startTime
        console.log(`[NATUREZA-OPERACAO-V2] SUCCESS: Listed ${formattedNaturezas.length} naturezas (${duration}ms)`)

        return createHttpSuccessResponse(
          {
            naturezas: formattedNaturezas,
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
        console.log('[NATUREZA-OPERACAO-V2] Creating natureza...', body)

        // Verificar permissões - apenas backoffice pode criar
        if (user.tipo !== 'backoffice') {
          throw new Error('Apenas usuários backoffice podem criar naturezas de operação')
        }

        // Validações
        if (!body.nome || body.nome.trim().length < 2) {
          throw new Error('Nome deve ter pelo menos 2 caracteres')
        }

        const { data: natureza, error: naturezaError } = await supabase
          .rpc('create_natureza_operacao_v2', {
            p_nome: body.nome.trim(),
            p_codigo: body.codigo ? body.codigo.trim() : null,
            p_descricao: body.descricao ? body.descricao.trim() : null,
            p_gera_comissao: body.geraComissao !== undefined ? body.geraComissao : true,
            p_gera_receita: body.geraReceita !== undefined ? body.geraReceita : true,
            p_tiny_id: body.tiny_id ? body.tiny_id.trim() : null,
            p_created_by: user.id,
          })

        if (naturezaError) {
          console.error('[NATUREZA-OPERACAO-V2] RPC Error:', naturezaError)
          throw new Error(`Database operation failed: ${naturezaError.message}`)
        }

        if (!natureza || natureza.length === 0) {
          throw new Error('Erro ao criar natureza de operação')
        }

        const formattedNatureza = {
          id: String(natureza[0].id),
          nome: natureza[0].nome,
          codigo: natureza[0].codigo || undefined,
          descricao: natureza[0].descricao || undefined,
          geraComissao: natureza[0].gera_comissao,
          geraReceita: natureza[0].gera_receita,
          ativo: natureza[0].ativo,
          tiny_id: natureza[0].tiny_id || undefined,
          createdAt: natureza[0].created_at ? new Date(natureza[0].created_at).toISOString() : new Date().toISOString(),
          updatedAt: natureza[0].updated_at ? new Date(natureza[0].updated_at).toISOString() : new Date().toISOString(),
        }

        const duration = Date.now() - startTime
        console.log(`[NATUREZA-OPERACAO-V2] SUCCESS: Natureza created (${duration}ms)`)

        return createHttpSuccessResponse(
          formattedNatureza,
          201,
          { userId: user.id, duration: `${duration}ms` }
        )
      }
    }

    if (req.method === 'PUT') {
      const body = await req.json()
      // Priorizar ID do path, depois do body
      const id = naturezaId || body.id

      console.log('[NATUREZA-OPERACAO-V2] PUT Request details:', {
        naturezaIdFromPath: naturezaId,
        idFromBody: body.id,
        finalId: id,
        pathParts,
        url: req.url
      })

      if (!id) {
        console.error('[NATUREZA-OPERACAO-V2] ID missing:', {
          naturezaId,
          bodyId: body.id,
          pathParts,
          url: req.url
        })
        throw new Error('ID é obrigatório para atualização')
      }

      // Validar se o ID é um número válido
      const idNum = parseInt(id)
      if (isNaN(idNum) || idNum <= 0) {
        throw new Error(`ID inválido: ${id}`)
      }

      console.log('[NATUREZA-OPERACAO-V2] Updating natureza:', { id: idNum, body })

      // Verificar permissões - apenas backoffice pode atualizar
      if (user.tipo !== 'backoffice') {
        throw new Error('Apenas usuários backoffice podem atualizar naturezas de operação')
      }

      const { data: natureza, error: naturezaError } = await supabase
        .rpc('update_natureza_operacao_v2', {
          p_id: idNum,
          p_nome: body.nome ? body.nome.trim() : null,
          p_codigo: body.codigo !== undefined ? (body.codigo ? body.codigo.trim() : null) : null,
          p_descricao: body.descricao !== undefined ? (body.descricao ? body.descricao.trim() : null) : null,
          p_gera_comissao: body.geraComissao !== undefined ? body.geraComissao : null,
          p_gera_receita: body.geraReceita !== undefined ? body.geraReceita : null,
          p_ativo: body.ativo !== undefined ? body.ativo : null,
          p_tiny_id: body.tiny_id !== undefined ? (body.tiny_id ? body.tiny_id.trim() : null) : null,
          p_updated_by: user.id,
        })

      if (naturezaError) {
        console.error('[NATUREZA-OPERACAO-V2] RPC Error:', naturezaError)
        throw new Error(`Database operation failed: ${naturezaError.message}`)
      }

      if (!natureza || natureza.length === 0) {
        throw new Error('Natureza de operação não encontrada')
      }

      const formattedNatureza = {
        id: String(natureza[0].id),
        nome: natureza[0].nome,
        codigo: natureza[0].codigo || undefined,
        descricao: natureza[0].descricao || undefined,
        geraComissao: natureza[0].gera_comissao,
        geraReceita: natureza[0].gera_receita,
        ativo: natureza[0].ativo,
        tiny_id: natureza[0].tiny_id || undefined,
        createdAt: natureza[0].created_at ? new Date(natureza[0].created_at).toISOString() : new Date().toISOString(),
        updatedAt: natureza[0].updated_at ? new Date(natureza[0].updated_at).toISOString() : new Date().toISOString(),
      }

      const duration = Date.now() - startTime
      console.log(`[NATUREZA-OPERACAO-V2] SUCCESS: Natureza updated (${duration}ms)`)

      return createHttpSuccessResponse(
        formattedNatureza,
        200,
        { userId: user.id, duration: `${duration}ms` }
      )
    }

    if (req.method === 'DELETE') {
      const id = naturezaId || url.searchParams.get('id')

      if (!id) {
        throw new Error('ID é obrigatório para exclusão')
      }

      console.log('[NATUREZA-OPERACAO-V2] Deleting natureza:', id)

      // Verificar permissões - apenas backoffice pode excluir
      if (user.tipo !== 'backoffice') {
        throw new Error('Apenas usuários backoffice podem excluir naturezas de operação')
      }

      const { error: deleteError } = await supabase
        .rpc('delete_natureza_operacao_v2', {
          p_id: parseInt(id),
          p_deleted_by: user.id,
        })

      if (deleteError) {
        console.error('[NATUREZA-OPERACAO-V2] RPC Error:', deleteError)
        throw new Error(`Database operation failed: ${deleteError.message}`)
      }

      const duration = Date.now() - startTime
      console.log(`[NATUREZA-OPERACAO-V2] SUCCESS: Natureza deleted (${duration}ms)`)

      return createHttpSuccessResponse(
        { success: true, message: 'Natureza de operação excluída com sucesso' },
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
    console.error('[NATUREZA-OPERACAO-V2] EXCEPTION:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`
    })
    return formatErrorResponse(error)
  }
})
