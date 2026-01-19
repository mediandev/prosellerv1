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
    console.log('[MARCAS-V2] Step 1: Starting authentication...')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)

    if (authError || !user) {
      console.error('[MARCAS-V2] Authentication failed:', { error: authError })
      return createAuthErrorResponse(authError || 'Unauthorized')
    }

    console.log('[MARCAS-V2] Authentication successful:', { userId: user.id, tipo: user.tipo })

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

    console.log('[MARCAS-V2] Action:', action)

    switch (action) {
      case 'list': {
        console.log('[MARCAS-V2] Listing marcas...')

        // Buscar todas as marcas
        const { data: marcas, error: marcasError } = await supabase
          .from('marcas')
          .select('id, descricao, created_at')
          .order('descricao', { ascending: true })

        if (marcasError) {
          console.error('[MARCAS-V2] Query Error:', marcasError)
          throw new Error(`Database operation failed: ${marcasError.message}`)
        }

        // Formatar os dados para o frontend (converter descricao para nome)
        const formattedMarcas = (marcas || []).map((marca: any) => ({
          id: String(marca.id),
          nome: marca.descricao || '',
          ativo: true, // Marcas não têm campo ativo, sempre true
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

      case 'create': {
        console.log('[MARCAS-V2] Creating marca...', body)

        // Validações
        if (!body.nome || body.nome.trim() === '') {
          throw new Error('Nome da marca é obrigatório')
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

        // Formatar resposta para o frontend
        const formattedMarca = {
          id: String(novaMarca.id),
          nome: novaMarca.descricao || '',
          ativo: true,
          createdAt: novaMarca.created_at ? new Date(novaMarca.created_at).toISOString() : new Date().toISOString(),
          updatedAt: novaMarca.created_at ? new Date(novaMarca.created_at).toISOString() : new Date().toISOString(),
        }

        const duration = Date.now() - startTime
        console.log(`[MARCAS-V2] SUCCESS: Created marca ${formattedMarca.id} (${duration}ms)`)

        return createHttpSuccessResponse(
          formattedMarca,
          201,
          { userId: user.id, duration: `${duration}ms` }
        )
      }

      case 'update': {
        console.log('[MARCAS-V2] Updating marca...', body)

        if (!body.id) {
          throw new Error('ID é obrigatório para atualização')
        }

        // Validações
        if (!body.nome || body.nome.trim() === '') {
          throw new Error('Nome da marca é obrigatório')
        }

        // Verificar se marca existe
        const { data: existingMarca } = await supabase
          .from('marcas')
          .select('id, descricao')
          .eq('id', parseInt(body.id))
          .single()

        if (!existingMarca) {
          throw new Error('Marca não encontrada')
        }

        // Verificar se já existe outra marca com mesmo nome (case insensitive)
        const { data: duplicateMarca } = await supabase
          .from('marcas')
          .select('id, descricao')
          .ilike('descricao', body.nome.trim())
          .neq('id', parseInt(body.id))
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
          .eq('id', parseInt(body.id))
          .select('id, descricao, created_at')
          .single()

        if (updateError) {
          console.error('[MARCAS-V2] Update Error:', updateError)
          throw new Error(`Database operation failed: ${updateError.message}`)
        }

        // Formatar resposta para o frontend
        const formattedMarca = {
          id: String(marcaAtualizada.id),
          nome: marcaAtualizada.descricao || '',
          ativo: true,
          createdAt: marcaAtualizada.created_at ? new Date(marcaAtualizada.created_at).toISOString() : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        const duration = Date.now() - startTime
        console.log(`[MARCAS-V2] SUCCESS: Updated marca ${formattedMarca.id} (${duration}ms)`)

        return createHttpSuccessResponse(
          formattedMarca,
          200,
          { userId: user.id, duration: `${duration}ms` }
        )
      }

      case 'delete': {
        console.log('[MARCAS-V2] Deleting marca...', body)

        if (!body.id) {
          throw new Error('ID é obrigatório para exclusão')
        }

        // Verificar se marca existe
        const { data: existingMarca } = await supabase
          .from('marcas')
          .select('id, descricao')
          .eq('id', parseInt(body.id))
          .single()

        if (!existingMarca) {
          throw new Error('Marca não encontrada')
        }

        // Verificar se há produtos usando esta marca
        const { data: produtosComMarca, error: checkError } = await supabase
          .from('produto')
          .select('produto_id, descricao')
          .eq('marca', parseInt(body.id))
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
          .eq('id', parseInt(body.id))

        if (deleteError) {
          console.error('[MARCAS-V2] Delete Error:', deleteError)
          throw new Error(`Database operation failed: ${deleteError.message}`)
        }

        const duration = Date.now() - startTime
        console.log(`[MARCAS-V2] SUCCESS: Deleted marca ${body.id} (${duration}ms)`)

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
    console.error('[MARCAS-V2] EXCEPTION:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`
    })
    return formatErrorResponse(error)
  }
})

