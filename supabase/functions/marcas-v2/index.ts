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
  console.log('[MARCAS-V2] Request received:', { method: req.method, url: req.url, timestamp: new Date().toISOString() })

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
    console.log('[MARCAS-V2] Step 1: Starting authentication...')
    
    // 1. AUTENTICAÇÃO
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)
    
    if (authError || !user) {
      console.error('[MARCAS-V2] Authentication failed:', authError)
      return createAuthErrorResponse(authError || 'Unauthorized')
    }

    console.log('[MARCAS-V2] Step 2: User authenticated:', { userId: user.id, tipo: user.tipo })

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    })

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(p => p)
    // Extrair ID se estiver no path (formato: /functions/v1/marcas-v2/:id)
    const functionIndex = pathParts.indexOf('marcas-v2')
    const marcaId = functionIndex >= 0 && functionIndex < pathParts.length - 1
      ? pathParts[functionIndex + 1]
      : url.searchParams.get('id')

    console.log('[MARCAS-V2] Step 3: Processing request:', { 
      marcaId, 
      method: req.method, 
      pathParts, 
      functionIndex,
      url: req.url,
      pathname: url.pathname
    })

    // 2. ROTEAMENTO POR MÉTODO
    if (req.method === 'GET') {
      if (marcaId) {
        // GET /marcas-v2/:id
        console.log('[MARCAS-V2] Getting marca by ID:', marcaId)
        
        const { data: marca, error: marcaError } = await supabase
          .from('marcas')
          .select('id, descricao, created_at')
          .eq('id', parseInt(marcaId))
          .single()

        if (marcaError) {
          console.error('[MARCAS-V2] Query Error:', marcaError)
          throw new Error(`Database operation failed: ${marcaError.message}`)
        }

        if (!marca) {
          throw new Error('Marca não encontrada')
        }

        const formattedMarca = {
          id: String(marca.id),
          nome: marca.descricao || '',
          ativo: true,
          createdAt: marca.created_at ? new Date(marca.created_at).toISOString() : new Date().toISOString(),
          updatedAt: marca.created_at ? new Date(marca.created_at).toISOString() : new Date().toISOString(),
        }

        const duration = Date.now() - startTime
        console.log(`[MARCAS-V2] SUCCESS: Marca retrieved (${duration}ms)`)

        return createHttpSuccessResponse(
          formattedMarca,
          200,
          { userId: user.id, duration: `${duration}ms` }
        )
      } else {
        // GET /marcas-v2 (listar todas)
        console.log('[MARCAS-V2] Listing marcas...')
        
        const { data: marcas, error: marcasError } = await supabase
          .from('marcas')
          .select('id, descricao, created_at')
          .order('descricao', { ascending: true })

        if (marcasError) {
          console.error('[MARCAS-V2] Query Error:', marcasError)
          throw new Error(`Database operation failed: ${marcasError.message}`)
        }

        const formattedMarcas = (marcas || []).map((marca: any) => ({
          id: String(marca.id),
          nome: marca.descricao || '',
          ativo: true,
          createdAt: marca.created_at ? new Date(marca.created_at).toISOString() : new Date().toISOString(),
          updatedAt: marca.created_at ? new Date(marca.created_at).toISOString() : new Date().toISOString(),
        }))

        const duration = Date.now() - startTime
        console.log(`[MARCAS-V2] SUCCESS: Listed ${formattedMarcas.length} marcas (${duration}ms)`)

        return createHttpSuccessResponse(
          formattedMarcas,
          200,
          { userId: user.id, duration: `${duration}ms` }
        )
      }
    }

    if (req.method === 'POST') {
      const body = await req.json()
      console.log('[MARCAS-V2] Creating marca...', body)

      // Verificar permissões - apenas backoffice pode criar
      if (user.tipo !== 'backoffice') {
        throw new Error('Apenas usuários backoffice podem criar marcas')
      }

      // Validações
      if (!body.nome || body.nome.trim().length < 2) {
        throw new Error('Nome da marca deve ter pelo menos 2 caracteres')
      }

      // Verificar se já existe marca com mesmo nome (case insensitive)
      const { data: existingMarca } = await supabase
        .from('marcas')
        .select('id, descricao')
        .ilike('descricao', body.nome.trim())
        .single()

      if (existingMarca) {
        throw new Error('Já existe uma marca com este nome')
      }

      // Inserir nova marca
      const { data: novaMarca, error: insertError } = await supabase
        .from('marcas')
        .insert({
          descricao: body.nome.trim(),
        })
        .select('id, descricao, created_at')
        .single()

      if (insertError) {
        console.error('[MARCAS-V2] Insert Error:', insertError)
        throw new Error(`Database operation failed: ${insertError.message}`)
      }

      const formattedMarca = {
        id: String(novaMarca.id),
        nome: novaMarca.descricao || '',
        ativo: true,
        createdAt: novaMarca.created_at ? new Date(novaMarca.created_at).toISOString() : new Date().toISOString(),
        updatedAt: novaMarca.created_at ? new Date(novaMarca.created_at).toISOString() : new Date().toISOString(),
      }

      const duration = Date.now() - startTime
      console.log(`[MARCAS-V2] SUCCESS: Marca created (${duration}ms)`)

      return createHttpSuccessResponse(
        formattedMarca,
        201,
        { userId: user.id, duration: `${duration}ms` }
      )
    }

    if (req.method === 'PUT') {
      const body = await req.json()
      // Priorizar ID do path, depois do body
      const id = marcaId || body.id

      console.log('[MARCAS-V2] PUT Request details:', {
        marcaIdFromPath: marcaId,
        idFromBody: body.id,
        finalId: id,
        pathParts,
        url: req.url
      })

      if (!id) {
        console.error('[MARCAS-V2] ID missing:', {
          marcaId,
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

      console.log('[MARCAS-V2] Updating marca:', { id: idNum, body })

      // Verificar permissões - apenas backoffice pode atualizar
      if (user.tipo !== 'backoffice') {
        throw new Error('Apenas usuários backoffice podem atualizar marcas')
      }

      // Validações
      if (!body.nome || body.nome.trim().length < 2) {
        throw new Error('Nome da marca deve ter pelo menos 2 caracteres')
      }

      // Verificar se marca existe
      const { data: existingMarca } = await supabase
        .from('marcas')
        .select('id, descricao')
        .eq('id', idNum)
        .single()

      if (!existingMarca) {
        throw new Error('Marca não encontrada')
      }

      // Verificar se já existe outra marca com mesmo nome (case insensitive)
      const { data: duplicateMarca } = await supabase
        .from('marcas')
        .select('id, descricao')
        .ilike('descricao', body.nome.trim())
        .neq('id', idNum)
        .single()

      if (duplicateMarca) {
        throw new Error('Já existe outra marca com este nome')
      }

      // Atualizar marca
      const { data: marcaAtualizada, error: updateError } = await supabase
        .from('marcas')
        .update({
          descricao: body.nome.trim(),
        })
        .eq('id', idNum)
        .select('id, descricao, created_at')
        .single()

      if (updateError) {
        console.error('[MARCAS-V2] Update Error:', updateError)
        throw new Error(`Database operation failed: ${updateError.message}`)
      }

      const formattedMarca = {
        id: String(marcaAtualizada.id),
        nome: marcaAtualizada.descricao || '',
        ativo: true,
        createdAt: marcaAtualizada.created_at ? new Date(marcaAtualizada.created_at).toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const duration = Date.now() - startTime
      console.log(`[MARCAS-V2] SUCCESS: Marca updated (${duration}ms)`)

      return createHttpSuccessResponse(
        formattedMarca,
        200,
        { userId: user.id, duration: `${duration}ms` }
      )
    }

    if (req.method === 'DELETE') {
      const id = marcaId || url.searchParams.get('id')

      console.log('[MARCAS-V2] DELETE Request details:', {
        marcaIdFromPath: marcaId,
        idFromQueryParams: url.searchParams.get('id'),
        finalId: id,
        pathParts,
        url: req.url
      })

      if (!id) {
        console.error('[MARCAS-V2] ID missing:', {
          marcaId,
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

      console.log('[MARCAS-V2] Deleting marca:', { id: idNum })

      // Verificar permissões - apenas backoffice pode excluir
      if (user.tipo !== 'backoffice') {
        throw new Error('Apenas usuários backoffice podem excluir marcas')
      }

      // Verificar se marca existe
      const { data: existingMarca } = await supabase
        .from('marcas')
        .select('id, descricao')
        .eq('id', idNum)
        .single()

      if (!existingMarca) {
        throw new Error('Marca não encontrada')
      }

      // Verificar se há produtos usando esta marca
      const { data: produtosComMarca, error: checkError } = await supabase
        .from('produto')
        .select('produto_id, descricao')
        .eq('marca', idNum)
        .is('deleted_at', null)
        .limit(1)

      if (checkError) {
        console.error('[MARCAS-V2] Check Error:', checkError)
        throw new Error(`Database operation failed during dependency check: ${checkError.message}`)
      }

      if (produtosComMarca && produtosComMarca.length > 0) {
        throw new Error('Não é possível excluir esta marca pois existem produtos associados a ela')
      }

      // Deletar marca
      const { error: deleteError } = await supabase
        .from('marcas')
        .delete()
        .eq('id', idNum)

      if (deleteError) {
        console.error('[MARCAS-V2] Delete Error:', deleteError)
        throw new Error(`Database operation failed: ${deleteError.message}`)
      }

      const duration = Date.now() - startTime
      console.log(`[MARCAS-V2] SUCCESS: Marca deleted (${duration}ms)`)

      return createHttpSuccessResponse(
        { success: true, message: 'Marca excluída com sucesso' },
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
    console.error('[MARCAS-V2] EXCEPTION:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`
    })
    return formatErrorResponse(error)
  }
})
