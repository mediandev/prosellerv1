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

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400',
      }
    })
  }

  try {
    console.log('[TIPOS-PRODUTO-V2] Step 1: Starting authentication...')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)

    if (authError || !user) {
      console.error('[TIPOS-PRODUTO-V2] Authentication failed:', { error: authError })
      return createAuthErrorResponse(authError || 'Unauthorized')
    }

    console.log('[TIPOS-PRODUTO-V2] Authentication successful:', { userId: user.id, tipo: user.tipo })

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    })

    // Extrair action do body ou query params
    let action: string
    let body: any = {}

    if (req.method === 'GET') {
      const url = new URL(req.url)
      action = url.searchParams.get('action') || 'list'
    } else {
      try {
        body = await req.json()
      } catch {
        body = {}
      }
      action = body.action || 'list'
    }

    console.log('[TIPOS-PRODUTO-V2] Action:', action)

    switch (action) {
      case 'list': {
        console.log('[TIPOS-PRODUTO-V2] Listing tipos de produto...')

        // Buscar todos os tipos de produto
        const { data: tipos, error: tiposError } = await supabase
          .from('ref_tipo_produto')
          .select('id, nome, created_at')
          .order('nome', { ascending: true })

        if (tiposError) {
          console.error('[TIPOS-PRODUTO-V2] Query Error:', tiposError)
          throw new Error(`Database operation failed: ${tiposError.message}`)
        }

        // Formatar os dados para o frontend
        const formattedTipos = (tipos || []).map((tipo: any) => ({
          id: String(tipo.id),
          nome: tipo.nome || '',
          descricao: undefined, // A tabela não tem campo descricao
          ativo: true, // Tipos não têm campo ativo, sempre true
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

      case 'create': {
        console.log('[TIPOS-PRODUTO-V2] Creating tipo de produto...', body)

        // Validações
        if (!body.nome || body.nome.trim() === '') {
          throw new Error('Nome do tipo de produto é obrigatório')
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

        // Formatar resposta para o frontend
        const formattedTipo = {
          id: String(novoTipo.id),
          nome: novoTipo.nome || '',
          descricao: body.descricao || undefined, // Manter descricao se fornecida (mesmo que não seja salva no banco)
          ativo: true,
          createdAt: novoTipo.created_at ? new Date(novoTipo.created_at).toISOString() : new Date().toISOString(),
          updatedAt: novoTipo.created_at ? new Date(novoTipo.created_at).toISOString() : new Date().toISOString(),
        }

        const duration = Date.now() - startTime
        console.log(`[TIPOS-PRODUTO-V2] SUCCESS: Created tipo de produto ${formattedTipo.id} (${duration}ms)`)

        return createHttpSuccessResponse(
          formattedTipo,
          201,
          { userId: user.id, duration: `${duration}ms` }
        )
      }

      case 'update': {
        console.log('[TIPOS-PRODUTO-V2] Updating tipo de produto...', body)

        if (!body.id) {
          throw new Error('ID é obrigatório para atualização')
        }

        // Validações
        if (!body.nome || body.nome.trim() === '') {
          throw new Error('Nome do tipo de produto é obrigatório')
        }

        // Verificar se tipo existe
        const { data: existingTipo } = await supabase
          .from('ref_tipo_produto')
          .select('id, nome')
          .eq('id', parseInt(body.id))
          .single()

        if (!existingTipo) {
          throw new Error('Tipo de produto não encontrado')
        }

        // Verificar se já existe outro tipo com mesmo nome (case insensitive)
        const { data: duplicateTipo } = await supabase
          .from('ref_tipo_produto')
          .select('id, nome')
          .ilike('nome', body.nome.trim())
          .neq('id', parseInt(body.id))
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
          .eq('id', parseInt(body.id))
          .select('id, nome, created_at')
          .single()

        if (updateError) {
          console.error('[TIPOS-PRODUTO-V2] Update Error:', updateError)
          throw new Error(`Database operation failed: ${updateError.message}`)
        }

        // Formatar resposta para o frontend
        const formattedTipo = {
          id: String(tipoAtualizado.id),
          nome: tipoAtualizado.nome || '',
          descricao: body.descricao || undefined,
          ativo: true,
          createdAt: tipoAtualizado.created_at ? new Date(tipoAtualizado.created_at).toISOString() : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        const duration = Date.now() - startTime
        console.log(`[TIPOS-PRODUTO-V2] SUCCESS: Updated tipo de produto ${formattedTipo.id} (${duration}ms)`)

        return createHttpSuccessResponse(
          formattedTipo,
          200,
          { userId: user.id, duration: `${duration}ms` }
        )
      }

      case 'delete': {
        console.log('[TIPOS-PRODUTO-V2] Deleting tipo de produto...', body)

        if (!body.id) {
          throw new Error('ID é obrigatório para exclusão')
        }

        // Verificar se tipo existe
        const { data: existingTipo } = await supabase
          .from('ref_tipo_produto')
          .select('id, nome')
          .eq('id', parseInt(body.id))
          .single()

        if (!existingTipo) {
          throw new Error('Tipo de produto não encontrado')
        }

        // Verificar se há produtos usando este tipo
        const { data: produtosComTipo, error: checkError } = await supabase
          .from('produto')
          .select('produto_id, descricao')
          .eq('tipo_id', parseInt(body.id))
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
          .eq('id', parseInt(body.id))

        if (deleteError) {
          console.error('[TIPOS-PRODUTO-V2] Delete Error:', deleteError)
          throw new Error(`Database operation failed: ${deleteError.message}`)
        }

        const duration = Date.now() - startTime
        console.log(`[TIPOS-PRODUTO-V2] SUCCESS: Deleted tipo de produto ${body.id} (${duration}ms)`)

        return createHttpSuccessResponse(
          { id: body.id, deleted: true },
          200,
          { userId: user.id, duration: `${duration}ms` }
        )
      }

      default:
        throw new Error(`Ação inválida: ${action}. Use: list, create, update ou delete`)
    }
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

