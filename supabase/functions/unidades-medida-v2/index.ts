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
    console.log('[UNIDADES-MEDIDA-V2] Step 1: Starting authentication...')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)

    if (authError || !user) {
      console.error('[UNIDADES-MEDIDA-V2] Authentication failed:', { error: authError })
      return createAuthErrorResponse(authError || 'Unauthorized')
    }

    console.log('[UNIDADES-MEDIDA-V2] Authentication successful:', { userId: user.id, tipo: user.tipo })

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

    console.log('[UNIDADES-MEDIDA-V2] Action:', action)

    switch (action) {
      case 'list': {
        console.log('[UNIDADES-MEDIDA-V2] Listing unidades de medida...')

        // Buscar todas as unidades de medida (apenas ativas)
        const { data: unidades, error: unidadesError } = await supabase
          .from('ref_unidade_medida')
          .select('id, nome, sigla, ativo, created_at')
          .eq('ativo', true)
          .order('nome', { ascending: true })

        if (unidadesError) {
          console.error('[UNIDADES-MEDIDA-V2] Query Error:', unidadesError)
          throw new Error(`Database operation failed: ${unidadesError.message}`)
        }

        // Formatar os dados para o frontend (converter nome para descricao)
        const formattedUnidades = (unidades || []).map((unidade: any) => ({
          id: String(unidade.id),
          sigla: unidade.sigla || '',
          descricao: unidade.nome || '', // nome do banco vira descricao no frontend
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

      case 'create': {
        console.log('[UNIDADES-MEDIDA-V2] Creating unidade de medida...', body)

        // Validações
        if (!body.sigla || body.sigla.trim() === '') {
          throw new Error('Sigla da unidade é obrigatória')
        }

        if (!body.descricao || body.descricao.trim() === '') {
          throw new Error('Descrição da unidade é obrigatória')
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
            nome: body.descricao.trim(), // descricao do frontend vira nome no banco
            ativo: true,
          })
          .select('id, nome, sigla, ativo, created_at')
          .single()

        if (insertError) {
          console.error('[UNIDADES-MEDIDA-V2] Insert Error:', insertError)
          throw new Error(`Database operation failed: ${insertError.message}`)
        }

        // Formatar resposta para o frontend
        const formattedUnidade = {
          id: String(novaUnidade.id),
          sigla: novaUnidade.sigla || '',
          descricao: novaUnidade.nome || '', // nome do banco vira descricao no frontend
          ativo: novaUnidade.ativo !== false,
          createdAt: novaUnidade.created_at ? new Date(novaUnidade.created_at).toISOString() : new Date().toISOString(),
          updatedAt: novaUnidade.created_at ? new Date(novaUnidade.created_at).toISOString() : new Date().toISOString(),
        }

        const duration = Date.now() - startTime
        console.log(`[UNIDADES-MEDIDA-V2] SUCCESS: Created unidade de medida ${formattedUnidade.id} (${duration}ms)`)

        return createHttpSuccessResponse(
          formattedUnidade,
          201,
          { userId: user.id, duration: `${duration}ms` }
        )
      }

      case 'update': {
        console.log('[UNIDADES-MEDIDA-V2] Updating unidade de medida...', body)

        if (!body.id) {
          throw new Error('ID é obrigatório para atualização')
        }

        // Validações
        if (!body.sigla || body.sigla.trim() === '') {
          throw new Error('Sigla da unidade é obrigatória')
        }

        if (!body.descricao || body.descricao.trim() === '') {
          throw new Error('Descrição da unidade é obrigatória')
        }

        // Verificar se unidade existe
        const { data: existingUnidade } = await supabase
          .from('ref_unidade_medida')
          .select('id, sigla, nome')
          .eq('id', parseInt(body.id))
          .single()

        if (!existingUnidade) {
          throw new Error('Unidade de medida não encontrada')
        }

        // Verificar se já existe outra unidade com mesma sigla (case insensitive)
        const { data: duplicateUnidade } = await supabase
          .from('ref_unidade_medida')
          .select('id, sigla')
          .ilike('sigla', body.sigla.trim().toUpperCase())
          .neq('id', parseInt(body.id))
          .single()

        if (duplicateUnidade) {
          throw new Error('Já existe outra unidade de medida com esta sigla')
        }

        // Atualizar unidade de medida
        const updateData: any = {
          sigla: body.sigla.trim().toUpperCase(),
          nome: body.descricao.trim(), // descricao do frontend vira nome no banco
        }

        // Atualizar campo ativo se fornecido
        if (body.ativo !== undefined) {
          updateData.ativo = body.ativo
        }

        const { data: unidadeAtualizada, error: updateError } = await supabase
          .from('ref_unidade_medida')
          .update(updateData)
          .eq('id', parseInt(body.id))
          .select('id, nome, sigla, ativo, created_at')
          .single()

        if (updateError) {
          console.error('[UNIDADES-MEDIDA-V2] Update Error:', updateError)
          throw new Error(`Database operation failed: ${updateError.message}`)
        }

        // Formatar resposta para o frontend
        const formattedUnidade = {
          id: String(unidadeAtualizada.id),
          sigla: unidadeAtualizada.sigla || '',
          descricao: unidadeAtualizada.nome || '', // nome do banco vira descricao no frontend
          ativo: unidadeAtualizada.ativo !== false,
          createdAt: unidadeAtualizada.created_at ? new Date(unidadeAtualizada.created_at).toISOString() : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        const duration = Date.now() - startTime
        console.log(`[UNIDADES-MEDIDA-V2] SUCCESS: Updated unidade de medida ${formattedUnidade.id} (${duration}ms)`)

        return createHttpSuccessResponse(
          formattedUnidade,
          200,
          { userId: user.id, duration: `${duration}ms` }
        )
      }

      case 'delete': {
        console.log('[UNIDADES-MEDIDA-V2] Deleting unidade de medida...', body)

        if (!body.id) {
          throw new Error('ID é obrigatório para exclusão')
        }

        // Verificar se unidade existe
        const { data: existingUnidade } = await supabase
          .from('ref_unidade_medida')
          .select('id, sigla, nome')
          .eq('id', parseInt(body.id))
          .single()

        if (!existingUnidade) {
          throw new Error('Unidade de medida não encontrada')
        }

        // Verificar se há produtos usando esta unidade
        const { data: produtosComUnidade, error: checkError } = await supabase
          .from('produto')
          .select('produto_id, descricao')
          .eq('unidade_id', parseInt(body.id))
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
          .eq('id', parseInt(body.id))

        if (deleteError) {
          console.error('[UNIDADES-MEDIDA-V2] Delete Error:', deleteError)
          throw new Error(`Database operation failed: ${deleteError.message}`)
        }

        const duration = Date.now() - startTime
        console.log(`[UNIDADES-MEDIDA-V2] SUCCESS: Deleted unidade de medida ${body.id} (${duration}ms)`)

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
    console.error('[UNIDADES-MEDIDA-V2] EXCEPTION:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`
    })
    return formatErrorResponse(error)
  }
})

