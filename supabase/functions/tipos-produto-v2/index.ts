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
  console.log('[TIPOS-PRODUTO-V2] Request received:', { method: req.method, url: req.url, timestamp: new Date().toISOString() })

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
    console.log('[TIPOS-PRODUTO-V2] Step 1: Starting authentication...')
    
    // 1. AUTENTICAÇÃO
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)
    
    if (authError || !user) {
      console.error('[TIPOS-PRODUTO-V2] Authentication failed:', authError)
      return createAuthErrorResponse(authError || 'Unauthorized')
    }

    console.log('[TIPOS-PRODUTO-V2] Step 2: User authenticated:', { userId: user.id, tipo: user.tipo })

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    })

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(p => p)
    // Extrair ID se estiver no path (formato: /functions/v1/tipos-produto-v2/:id)
    const functionIndex = pathParts.indexOf('tipos-produto-v2')
    const tipoId = functionIndex >= 0 && functionIndex < pathParts.length - 1
      ? pathParts[functionIndex + 1]
      : url.searchParams.get('id')

    console.log('[TIPOS-PRODUTO-V2] Step 3: Processing request:', { 
      tipoId, 
      method: req.method, 
      pathParts, 
      functionIndex,
      url: req.url,
      pathname: url.pathname
    })

    // 2. ROTEAMENTO POR MÉTODO
    if (req.method === 'GET') {
      if (tipoId) {
        // GET /tipos-produto-v2/:id
        console.log('[TIPOS-PRODUTO-V2] Getting tipo by ID:', tipoId)
        
        const { data: tipo, error: tipoError } = await supabase
          .from('ref_tipo_produto')
          .select('id, nome, created_at')
          .eq('id', parseInt(tipoId))
          .single()

        if (tipoError) {
          console.error('[TIPOS-PRODUTO-V2] Query Error:', tipoError)
          throw new Error(`Database operation failed: ${tipoError.message}`)
        }

        if (!tipo) {
          throw new Error('Tipo de produto não encontrado')
        }

        const formattedTipo = {
          id: String(tipo.id),
          nome: tipo.nome || '',
          descricao: undefined,
          ativo: true,
          createdAt: tipo.created_at ? new Date(tipo.created_at).toISOString() : new Date().toISOString(),
          updatedAt: tipo.created_at ? new Date(tipo.created_at).toISOString() : new Date().toISOString(),
        }

        const duration = Date.now() - startTime
        console.log(`[TIPOS-PRODUTO-V2] SUCCESS: Tipo retrieved (${duration}ms)`)

        return createHttpSuccessResponse(
          formattedTipo,
          200,
          { userId: user.id, duration: `${duration}ms` }
        )
      } else {
        // GET /tipos-produto-v2 (listar todas)
        console.log('[TIPOS-PRODUTO-V2] Listing tipos de produto...')
        
        const { data: tipos, error: tiposError } = await supabase
          .from('ref_tipo_produto')
          .select('id, nome, created_at')
          .order('nome', { ascending: true })

        if (tiposError) {
          console.error('[TIPOS-PRODUTO-V2] Query Error:', tiposError)
          throw new Error(`Database operation failed: ${tiposError.message}`)
        }

        const formattedTipos = (tipos || []).map((tipo: any) => ({
          id: String(tipo.id),
          nome: tipo.nome || '',
          descricao: undefined,
          ativo: true,
          createdAt: tipo.created_at ? new Date(tipo.created_at).toISOString() : new Date().toISOString(),
          updatedAt: tipo.created_at ? new Date(tipo.created_at).toISOString() : new Date().toISOString(),
        }))

        const duration = Date.now() - startTime
        console.log(`[TIPOS-PRODUTO-V2] SUCCESS: Listed ${formattedTipos.length} tipos de produto (${duration}ms)`)

        return createHttpSuccessResponse(
          formattedTipos,
          200,
          { userId: user.id, duration: `${duration}ms` }
        )
      }
    }

    if (req.method === 'POST') {
      const body = await req.json()
      console.log('[TIPOS-PRODUTO-V2] Creating tipo de produto...', body)

      // Verificar permissões - apenas backoffice pode criar
      if (user.tipo !== 'backoffice') {
        throw new Error('Apenas usuários backoffice podem criar tipos de produto')
      }

      // Validações
      if (!body.nome || body.nome.trim().length < 2) {
        throw new Error('Nome do tipo de produto deve ter pelo menos 2 caracteres')
      }

      // Verificar se já existe tipo com mesmo nome (case insensitive)
      const { data: existingTipo } = await supabase
        .from('ref_tipo_produto')
        .select('id, nome')
        .ilike('nome', body.nome.trim())
        .single()

      if (existingTipo) {
        throw new Error('Já existe um tipo de produto com este nome')
      }

      // Inserir novo tipo de produto
      const { data: novoTipo, error: insertError } = await supabase
        .from('ref_tipo_produto')
        .insert({
          nome: body.nome.trim(),
        })
        .select('id, nome, created_at')
        .single()

      if (insertError) {
        console.error('[TIPOS-PRODUTO-V2] Insert Error:', insertError)
        throw new Error(`Database operation failed: ${insertError.message}`)
      }

      const formattedTipo = {
        id: String(novoTipo.id),
        nome: novoTipo.nome || '',
        descricao: body.descricao || undefined,
        ativo: true,
        createdAt: novoTipo.created_at ? new Date(novoTipo.created_at).toISOString() : new Date().toISOString(),
        updatedAt: novoTipo.created_at ? new Date(novoTipo.created_at).toISOString() : new Date().toISOString(),
      }

      const duration = Date.now() - startTime
      console.log(`[TIPOS-PRODUTO-V2] SUCCESS: Tipo created (${duration}ms)`)

      return createHttpSuccessResponse(
        formattedTipo,
        201,
        { userId: user.id, duration: `${duration}ms` }
      )
    }

    if (req.method === 'PUT') {
      const body = await req.json()
      // Priorizar ID do path, depois do body
      const id = tipoId || body.id

      console.log('[TIPOS-PRODUTO-V2] PUT Request details:', {
        tipoIdFromPath: tipoId,
        idFromBody: body.id,
        finalId: id,
        pathParts,
        url: req.url
      })

      if (!id) {
        console.error('[TIPOS-PRODUTO-V2] ID missing:', {
          tipoId,
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

      console.log('[TIPOS-PRODUTO-V2] Updating tipo de produto:', { id: idNum, body })

      // Verificar permissões - apenas backoffice pode atualizar
      if (user.tipo !== 'backoffice') {
        throw new Error('Apenas usuários backoffice podem atualizar tipos de produto')
      }

      // Validações
      if (!body.nome || body.nome.trim().length < 2) {
        throw new Error('Nome do tipo de produto deve ter pelo menos 2 caracteres')
      }

      // Verificar se tipo existe
      const { data: existingTipo } = await supabase
        .from('ref_tipo_produto')
        .select('id, nome')
        .eq('id', idNum)
        .single()

      if (!existingTipo) {
        throw new Error('Tipo de produto não encontrado')
      }

      // Verificar se já existe outro tipo com mesmo nome (case insensitive)
      const { data: duplicateTipo } = await supabase
        .from('ref_tipo_produto')
        .select('id, nome')
        .ilike('nome', body.nome.trim())
        .neq('id', idNum)
        .single()

      if (duplicateTipo) {
        throw new Error('Já existe outro tipo de produto com este nome')
      }

      // Atualizar tipo de produto
      const { data: tipoAtualizado, error: updateError } = await supabase
        .from('ref_tipo_produto')
        .update({
          nome: body.nome.trim(),
        })
        .eq('id', idNum)
        .select('id, nome, created_at')
        .single()

      if (updateError) {
        console.error('[TIPOS-PRODUTO-V2] Update Error:', updateError)
        throw new Error(`Database operation failed: ${updateError.message}`)
      }

      const formattedTipo = {
        id: String(tipoAtualizado.id),
        nome: tipoAtualizado.nome || '',
        descricao: body.descricao || undefined,
        ativo: true,
        createdAt: tipoAtualizado.created_at ? new Date(tipoAtualizado.created_at).toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const duration = Date.now() - startTime
      console.log(`[TIPOS-PRODUTO-V2] SUCCESS: Tipo updated (${duration}ms)`)

      return createHttpSuccessResponse(
        formattedTipo,
        200,
        { userId: user.id, duration: `${duration}ms` }
      )
    }

    if (req.method === 'DELETE') {
      const id = tipoId || url.searchParams.get('id')

      console.log('[TIPOS-PRODUTO-V2] DELETE Request details:', {
        tipoIdFromPath: tipoId,
        idFromQueryParams: url.searchParams.get('id'),
        finalId: id,
        pathParts,
        url: req.url
      })

      if (!id) {
        console.error('[TIPOS-PRODUTO-V2] ID missing:', {
          tipoId,
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

      console.log('[TIPOS-PRODUTO-V2] Deleting tipo de produto:', { id: idNum })

      // Verificar permissões - apenas backoffice pode excluir
      if (user.tipo !== 'backoffice') {
        throw new Error('Apenas usuários backoffice podem excluir tipos de produto')
      }

      // Verificar se tipo existe
      const { data: existingTipo } = await supabase
        .from('ref_tipo_produto')
        .select('id, nome')
        .eq('id', idNum)
        .single()

      if (!existingTipo) {
        throw new Error('Tipo de produto não encontrado')
      }

      // Verificar se há produtos usando este tipo
      const { data: produtosComTipo, error: checkError } = await supabase
        .from('produto')
        .select('produto_id, descricao')
        .eq('tipo_id', idNum)
        .is('deleted_at', null)
        .limit(1)

      if (checkError) {
        console.error('[TIPOS-PRODUTO-V2] Check Error:', checkError)
        throw new Error(`Database operation failed during dependency check: ${checkError.message}`)
      }

      if (produtosComTipo && produtosComTipo.length > 0) {
        throw new Error('Não é possível excluir este tipo de produto pois existem produtos associados a ele')
      }

      // Deletar tipo de produto
      const { error: deleteError } = await supabase
        .from('ref_tipo_produto')
        .delete()
        .eq('id', idNum)

      if (deleteError) {
        console.error('[TIPOS-PRODUTO-V2] Delete Error:', deleteError)
        throw new Error(`Database operation failed: ${deleteError.message}`)
      }

      const duration = Date.now() - startTime
      console.log(`[TIPOS-PRODUTO-V2] SUCCESS: Tipo deleted (${duration}ms)`)

      return createHttpSuccessResponse(
        { success: true, message: 'Tipo de produto excluído com sucesso' },
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
    console.error('[TIPOS-PRODUTO-V2] EXCEPTION:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`
    })
    return formatErrorResponse(error)
  }
})
