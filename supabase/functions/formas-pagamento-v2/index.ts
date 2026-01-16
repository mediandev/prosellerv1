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
  console.log('[FORMAS-PAGAMENTO-V2] Request received:', { method: req.method, url: req.url, timestamp: new Date().toISOString() })

  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400',
      }
    })
  }

  try {
    console.log('[FORMAS-PAGAMENTO-V2] Step 1: Starting authentication...')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)

    if (authError || !user) {
      console.error('[FORMAS-PAGAMENTO-V2] Authentication failed:', { error: authError })
      return createAuthErrorResponse(authError || 'Unauthorized')
    }

    console.log('[FORMAS-PAGAMENTO-V2] Authentication successful:', { userId: user.id, tipo: user.tipo })

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

    console.log('[FORMAS-PAGAMENTO-V2] Action:', action)

    switch (action) {
      case 'list': {
        console.log('[FORMAS-PAGAMENTO-V2] Listing formas de pagamento...')
        
        const { data: formas, error: queryError } = await supabase
          .from('ref_forma_pagamento')
          .select('id, nome, descricao, usar_em_conta_corrente, usar_em_condicoes_pagamento, ativo, created_at, updated_at')
          .order('nome', { ascending: true })

        if (queryError) {
          console.error('[FORMAS-PAGAMENTO-V2] Query Error:', queryError)
          throw new Error(`Database operation failed: ${queryError.message}`)
        }

        const formattedFormas = (formas || []).map((forma: any) => ({
          id: forma.id.toString(),
          nome: forma.nome || '',
          descricao: forma.descricao || '',
          ativo: forma.ativo !== false,
          usarEmContaCorrente: forma.usar_em_conta_corrente !== false,
          usarEmCondicoesPagamento: forma.usar_em_condicoes_pagamento !== false,
          dataCriacao: forma.created_at || new Date().toISOString(),
          dataAtualizacao: forma.updated_at || forma.created_at || new Date().toISOString(),
        }))

        const duration = Date.now() - startTime
        console.log(`[FORMAS-PAGAMENTO-V2] SUCCESS: Listed ${formattedFormas.length} formas de pagamento (${duration}ms)`)

        return createHttpSuccessResponse(
          { formas: formattedFormas, total: formattedFormas.length },
          200,
          { userId: user.id, duration: `${duration}ms` }
        )
      }

      case 'create': {
        console.log('[FORMAS-PAGAMENTO-V2] Creating forma de pagamento...', body)

        if (!body.nome || body.nome.trim() === '') {
          throw new Error('Nome é obrigatório')
        }

        const { data: novaForma, error: insertError } = await supabase
          .from('ref_forma_pagamento')
          .insert({
            nome: body.nome.trim(),
            descricao: body.descricao || null,
            usar_em_conta_corrente: body.usarEmContaCorrente !== false,
            usar_em_condicoes_pagamento: body.usarEmCondicoesPagamento !== false,
            ativo: body.ativo !== false,
          })
          .select('id, nome, descricao, usar_em_conta_corrente, usar_em_condicoes_pagamento, ativo, created_at, updated_at')
          .single()

        if (insertError) {
          console.error('[FORMAS-PAGAMENTO-V2] Insert Error:', insertError)
          throw new Error(`Database operation failed: ${insertError.message}`)
        }

        const formattedForma = {
          id: novaForma.id.toString(),
          nome: novaForma.nome || '',
          descricao: novaForma.descricao || '',
          ativo: novaForma.ativo !== false,
          usarEmContaCorrente: novaForma.usar_em_conta_corrente !== false,
          usarEmCondicoesPagamento: novaForma.usar_em_condicoes_pagamento !== false,
          dataCriacao: novaForma.created_at || new Date().toISOString(),
          dataAtualizacao: novaForma.updated_at || novaForma.created_at || new Date().toISOString(),
        }

        const duration = Date.now() - startTime
        console.log(`[FORMAS-PAGAMENTO-V2] SUCCESS: Created forma de pagamento ${formattedForma.id} (${duration}ms)`)

        return createHttpSuccessResponse(
          { forma: formattedForma },
          201,
          { userId: user.id, duration: `${duration}ms` }
        )
      }

      case 'update': {
        console.log('[FORMAS-PAGAMENTO-V2] Updating forma de pagamento...', body)

        if (!body.id) {
          throw new Error('ID é obrigatório para atualização')
        }

        const updateData: any = {}
        if (body.nome !== undefined) updateData.nome = body.nome.trim()
        if (body.descricao !== undefined) updateData.descricao = body.descricao || null
        if (body.usarEmContaCorrente !== undefined) updateData.usar_em_conta_corrente = body.usarEmContaCorrente
        if (body.usarEmCondicoesPagamento !== undefined) updateData.usar_em_condicoes_pagamento = body.usarEmCondicoesPagamento
        if (body.ativo !== undefined) updateData.ativo = body.ativo

        const { data: formaAtualizada, error: updateError } = await supabase
          .from('ref_forma_pagamento')
          .update(updateData)
          .eq('id', parseInt(body.id))
          .select('id, nome, descricao, usar_em_conta_corrente, usar_em_condicoes_pagamento, ativo, created_at, updated_at')
          .single()

        if (updateError) {
          console.error('[FORMAS-PAGAMENTO-V2] Update Error:', updateError)
          throw new Error(`Database operation failed: ${updateError.message}`)
        }

        if (!formaAtualizada) {
          throw new Error('Forma de pagamento não encontrada')
        }

        const formattedForma = {
          id: formaAtualizada.id.toString(),
          nome: formaAtualizada.nome || '',
          descricao: formaAtualizada.descricao || '',
          ativo: formaAtualizada.ativo !== false,
          usarEmContaCorrente: formaAtualizada.usar_em_conta_corrente !== false,
          usarEmCondicoesPagamento: formaAtualizada.usar_em_condicoes_pagamento !== false,
          dataCriacao: formaAtualizada.created_at || new Date().toISOString(),
          dataAtualizacao: formaAtualizada.updated_at || formaAtualizada.created_at || new Date().toISOString(),
        }

        const duration = Date.now() - startTime
        console.log(`[FORMAS-PAGAMENTO-V2] SUCCESS: Updated forma de pagamento ${formattedForma.id} (${duration}ms)`)

        return createHttpSuccessResponse(
          { forma: formattedForma },
          200,
          { userId: user.id, duration: `${duration}ms` }
        )
      }

      case 'delete': {
        console.log('[FORMAS-PAGAMENTO-V2] Deleting forma de pagamento...', body)

        if (!body.id) {
          throw new Error('ID é obrigatório para exclusão')
        }

        // Verificar se há condições de pagamento usando esta forma
        const { data: condicoes, error: checkError } = await supabase
          .from('Condicao_De_Pagamento')
          .select('Condição_ID')
          .eq('forma_pagamento_id', parseInt(body.id))
          .limit(1)

        if (checkError) {
          console.error('[FORMAS-PAGAMENTO-V2] Check Error:', checkError)
          throw new Error(`Database operation failed: ${checkError.message}`)
        }

        if (condicoes && condicoes.length > 0) {
          throw new Error('Não é possível excluir esta forma de pagamento pois existem condições de pagamento vinculadas')
        }

        const { error: deleteError } = await supabase
          .from('ref_forma_pagamento')
          .delete()
          .eq('id', parseInt(body.id))

        if (deleteError) {
          console.error('[FORMAS-PAGAMENTO-V2] Delete Error:', deleteError)
          throw new Error(`Database operation failed: ${deleteError.message}`)
        }

        const duration = Date.now() - startTime
        console.log(`[FORMAS-PAGAMENTO-V2] SUCCESS: Deleted forma de pagamento ${body.id} (${duration}ms)`)

        return createHttpSuccessResponse(
          { success: true, message: 'Forma de pagamento excluída com sucesso' },
          200,
          { userId: user.id, duration: `${duration}ms` }
        )
      }

      default:
        throw new Error(`Ação inválida: ${action}. Use: list, create, update ou delete`)
    }
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[FORMAS-PAGAMENTO-V2] EXCEPTION:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`
    })
    return formatErrorResponse(error)
  }
})
