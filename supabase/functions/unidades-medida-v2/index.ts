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
  console.log('[UNIDADES-MEDIDA-V2] Request received:', { method: req.method, url: req.url, timestamp: new Date().toISOString() })

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
    console.log('[UNIDADES-MEDIDA-V2] Step 1: Starting authentication...')
    
    // 1. AUTENTICAÇÃO
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)
    
    if (authError || !user) {
      console.error('[UNIDADES-MEDIDA-V2] Authentication failed:', authError)
      return createAuthErrorResponse(authError || 'Unauthorized')
    }

    console.log('[UNIDADES-MEDIDA-V2] Step 2: User authenticated:', { userId: user.id, tipo: user.tipo })

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    })

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(p => p)
    // Extrair ID se estiver no path (formato: /functions/v1/unidades-medida-v2/:id)
    const functionIndex = pathParts.indexOf('unidades-medida-v2')
    const unidadeId = functionIndex >= 0 && functionIndex < pathParts.length - 1
      ? pathParts[functionIndex + 1]
      : url.searchParams.get('id')

    console.log('[UNIDADES-MEDIDA-V2] Step 3: Processing request:', { 
      unidadeId, 
      method: req.method, 
      pathParts, 
      functionIndex,
      url: req.url,
      pathname: url.pathname
    })

    // 2. ROTEAMENTO POR MÉTODO
    if (req.method === 'GET') {
      if (unidadeId) {
        // GET /unidades-medida-v2/:id
        console.log('[UNIDADES-MEDIDA-V2] Getting unidade by ID:', unidadeId)
        
        const { data: unidade, error: unidadeError } = await supabase
          .from('ref_unidade_medida')
          .select('id, nome, sigla, ativo, created_at')
          .eq('id', parseInt(unidadeId))
          .single()

        if (unidadeError) {
          console.error('[UNIDADES-MEDIDA-V2] Query Error:', unidadeError)
          throw new Error(`Database operation failed: ${unidadeError.message}`)
        }

        if (!unidade) {
          throw new Error('Unidade de medida não encontrada')
        }

        const formattedUnidade = {
          id: String(unidade.id),
          sigla: unidade.sigla || '',
          descricao: unidade.nome || '',
          ativo: unidade.ativo !== false,
          createdAt: unidade.created_at ? new Date(unidade.created_at).toISOString() : new Date().toISOString(),
          updatedAt: unidade.created_at ? new Date(unidade.created_at).toISOString() : new Date().toISOString(),
        }

        const duration = Date.now() - startTime
        console.log(`[UNIDADES-MEDIDA-V2] SUCCESS: Unidade retrieved (${duration}ms)`)

        return createHttpSuccessResponse(
          formattedUnidade,
          200,
          { userId: user.id, duration: `${duration}ms` }
        )
      } else {
        // GET /unidades-medida-v2 (listar todas)
        console.log('[UNIDADES-MEDIDA-V2] Listing unidades de medida...')
        
        const apenasAtivas = url.searchParams.get('apenas_ativas') === 'true'
        
        let query = supabase
          .from('ref_unidade_medida')
          .select('id, nome, sigla, ativo, created_at')
          .order('nome', { ascending: true })
        
        if (apenasAtivas) {
          query = query.eq('ativo', true)
        }
        
        const { data: unidades, error: unidadesError } = await query

        if (unidadesError) {
          console.error('[UNIDADES-MEDIDA-V2] Query Error:', unidadesError)
          throw new Error(`Database operation failed: ${unidadesError.message}`)
        }

        const formattedUnidades = (unidades || []).map((unidade: any) => ({
          id: String(unidade.id),
          sigla: unidade.sigla || '',
          descricao: unidade.nome || '',
          ativo: unidade.ativo !== false,
          createdAt: unidade.created_at ? new Date(unidade.created_at).toISOString() : new Date().toISOString(),
          updatedAt: unidade.created_at ? new Date(unidade.created_at).toISOString() : new Date().toISOString(),
        }))

        const duration = Date.now() - startTime
        console.log(`[UNIDADES-MEDIDA-V2] SUCCESS: Listed ${formattedUnidades.length} unidades de medida (${duration}ms)`)

        return createHttpSuccessResponse(
          formattedUnidades,
          200,
          { userId: user.id, duration: `${duration}ms` }
        )
      }
    }

    if (req.method === 'POST') {
      const body = await req.json()
      console.log('[UNIDADES-MEDIDA-V2] Creating unidade de medida...', body)

      // Verificar permissões - apenas backoffice pode criar
      if (user.tipo !== 'backoffice') {
        throw new Error('Apenas usuários backoffice podem criar unidades de medida')
      }

      // Validações
      if (!body.sigla || body.sigla.trim().length < 1) {
        throw new Error('Sigla da unidade é obrigatória')
      }

      if (!body.descricao || body.descricao.trim().length < 2) {
        throw new Error('Descrição da unidade deve ter pelo menos 2 caracteres')
      }

      // Verificar se já existe unidade com mesma sigla (case insensitive)
      const { data: existingUnidade } = await supabase
        .from('ref_unidade_medida')
        .select('id, sigla')
        .ilike('sigla', body.sigla.trim().toUpperCase())
        .single()

      if (existingUnidade) {
        throw new Error('Já existe uma unidade de medida com esta sigla')
      }

      // Inserir nova unidade de medida
      const { data: novaUnidade, error: insertError } = await supabase
        .from('ref_unidade_medida')
        .insert({
          sigla: body.sigla.trim().toUpperCase(),
          nome: body.descricao.trim(),
          ativo: body.ativo !== undefined ? body.ativo : true,
        })
        .select('id, nome, sigla, ativo, created_at')
        .single()

      if (insertError) {
        console.error('[UNIDADES-MEDIDA-V2] Insert Error:', insertError)
        throw new Error(`Database operation failed: ${insertError.message}`)
      }

      const formattedUnidade = {
        id: String(novaUnidade.id),
        sigla: novaUnidade.sigla || '',
        descricao: novaUnidade.nome || '',
        ativo: novaUnidade.ativo !== false,
        createdAt: novaUnidade.created_at ? new Date(novaUnidade.created_at).toISOString() : new Date().toISOString(),
        updatedAt: novaUnidade.created_at ? new Date(novaUnidade.created_at).toISOString() : new Date().toISOString(),
      }

      const duration = Date.now() - startTime
      console.log(`[UNIDADES-MEDIDA-V2] SUCCESS: Unidade created (${duration}ms)`)

      return createHttpSuccessResponse(
        formattedUnidade,
        201,
        { userId: user.id, duration: `${duration}ms` }
      )
    }

    if (req.method === 'PUT') {
      const body = await req.json()
      // Priorizar ID do path, depois do body
      const id = unidadeId || body.id

      console.log('[UNIDADES-MEDIDA-V2] PUT Request details:', {
        unidadeIdFromPath: unidadeId,
        idFromBody: body.id,
        finalId: id,
        pathParts,
        url: req.url
      })

      if (!id) {
        console.error('[UNIDADES-MEDIDA-V2] ID missing:', {
          unidadeId,
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

      console.log('[UNIDADES-MEDIDA-V2] Updating unidade de medida:', { id: idNum, body })

      // Verificar permissões - apenas backoffice pode atualizar
      if (user.tipo !== 'backoffice') {
        throw new Error('Apenas usuários backoffice podem atualizar unidades de medida')
      }

      // Validações
      if (!body.sigla || body.sigla.trim().length < 1) {
        throw new Error('Sigla da unidade é obrigatória')
      }

      if (!body.descricao || body.descricao.trim().length < 2) {
        throw new Error('Descrição da unidade deve ter pelo menos 2 caracteres')
      }

      // Verificar se unidade existe
      const { data: existingUnidade } = await supabase
        .from('ref_unidade_medida')
        .select('id, sigla, nome')
        .eq('id', idNum)
        .single()

      if (!existingUnidade) {
        throw new Error('Unidade de medida não encontrada')
      }

      // Verificar se já existe outra unidade com mesma sigla (case insensitive)
      const { data: duplicateUnidade } = await supabase
        .from('ref_unidade_medida')
        .select('id, sigla')
        .ilike('sigla', body.sigla.trim().toUpperCase())
        .neq('id', idNum)
        .single()

      if (duplicateUnidade) {
        throw new Error('Já existe outra unidade de medida com esta sigla')
      }

      // Atualizar unidade de medida
      const updateData: any = {
        sigla: body.sigla.trim().toUpperCase(),
        nome: body.descricao.trim(),
      }

      // Atualizar campo ativo se fornecido
      if (body.ativo !== undefined) {
        updateData.ativo = body.ativo
      }

      const { data: unidadeAtualizada, error: updateError } = await supabase
        .from('ref_unidade_medida')
        .update(updateData)
        .eq('id', idNum)
        .select('id, nome, sigla, ativo, created_at')
        .single()

      if (updateError) {
        console.error('[UNIDADES-MEDIDA-V2] Update Error:', updateError)
        throw new Error(`Database operation failed: ${updateError.message}`)
      }

      const formattedUnidade = {
        id: String(unidadeAtualizada.id),
        sigla: unidadeAtualizada.sigla || '',
        descricao: unidadeAtualizada.nome || '',
        ativo: unidadeAtualizada.ativo !== false,
        createdAt: unidadeAtualizada.created_at ? new Date(unidadeAtualizada.created_at).toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const duration = Date.now() - startTime
      console.log(`[UNIDADES-MEDIDA-V2] SUCCESS: Unidade updated (${duration}ms)`)

      return createHttpSuccessResponse(
        formattedUnidade,
        200,
        { userId: user.id, duration: `${duration}ms` }
      )
    }

    if (req.method === 'DELETE') {
      const id = unidadeId || url.searchParams.get('id')

      console.log('[UNIDADES-MEDIDA-V2] DELETE Request details:', {
        unidadeIdFromPath: unidadeId,
        idFromQueryParams: url.searchParams.get('id'),
        finalId: id,
        pathParts,
        url: req.url
      })

      if (!id) {
        console.error('[UNIDADES-MEDIDA-V2] ID missing:', {
          unidadeId,
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

      console.log('[UNIDADES-MEDIDA-V2] Deleting unidade de medida:', { id: idNum })

      // Verificar permissões - apenas backoffice pode excluir
      if (user.tipo !== 'backoffice') {
        throw new Error('Apenas usuários backoffice podem excluir unidades de medida')
      }

      // Verificar se unidade existe
      const { data: existingUnidade } = await supabase
        .from('ref_unidade_medida')
        .select('id, sigla, nome')
        .eq('id', idNum)
        .single()

      if (!existingUnidade) {
        throw new Error('Unidade de medida não encontrada')
      }

      // Verificar se há produtos usando esta unidade
      const { data: produtosComUnidade, error: checkError } = await supabase
        .from('produto')
        .select('produto_id, descricao')
        .eq('unidade_id', idNum)
        .is('deleted_at', null)
        .limit(1)

      if (checkError) {
        console.error('[UNIDADES-MEDIDA-V2] Check Error:', checkError)
        throw new Error(`Database operation failed during dependency check: ${checkError.message}`)
      }

      if (produtosComUnidade && produtosComUnidade.length > 0) {
        throw new Error('Não é possível excluir esta unidade de medida pois existem produtos associados a ela')
      }

      // Deletar unidade de medida
      const { error: deleteError } = await supabase
        .from('ref_unidade_medida')
        .delete()
        .eq('id', idNum)

      if (deleteError) {
        console.error('[UNIDADES-MEDIDA-V2] Delete Error:', deleteError)
        throw new Error(`Database operation failed: ${deleteError.message}`)
      }

      const duration = Date.now() - startTime
      console.log(`[UNIDADES-MEDIDA-V2] SUCCESS: Unidade deleted (${duration}ms)`)

      return createHttpSuccessResponse(
        { success: true, message: 'Unidade de medida excluída com sucesso' },
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
    console.error('[UNIDADES-MEDIDA-V2] EXCEPTION:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`
    })
    return formatErrorResponse(error)
  }
})
