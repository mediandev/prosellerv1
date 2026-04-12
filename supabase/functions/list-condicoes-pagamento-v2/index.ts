import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  console.log('[LIST-CONDICOES-PAGAMENTO-V2] Request received:', { method: req.method, url: req.url, timestamp: new Date().toISOString() })

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[LIST-CONDICOES-PAGAMENTO-V2] Step 1: Starting authentication...')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)

    if (authError || !user) {
      console.error('[LIST-CONDICOES-PAGAMENTO-V2] Authentication failed:', { error: authError })
      return createAuthErrorResponse(authError || 'Unauthorized')
    }

    console.log('[LIST-CONDICOES-PAGAMENTO-V2] Authentication successful:', { userId: user.id, tipo: user.tipo })

    console.log('[LIST-CONDICOES-PAGAMENTO-V2] Step 2: Querying Condicao_De_Pagamento table...')

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    })

    // Query para buscar condições de pagamento
    // Primeiro, buscar as condições de pagamento
    const { data: condicoes, error: queryError } = await supabase
      .from('Condicao_De_Pagamento')
      .select(`
        Condição_ID,
        Parcelamento,
        Condição_de_crédito,
        Quantidade_parcelas,
        Desconto,
        Prazo_pagamento,
        Descrição,
        forma_pagamento_id,
        meio_pagamento,
        intervalo_parcela
      `)
      .order('Descrição', { ascending: true })
    
    if (queryError) {
      console.error('[LIST-CONDICOES-PAGAMENTO-V2] Query Error:', { 
        message: queryError.message, 
        details: queryError.details, 
        code: queryError.code 
      })
      throw new Error(`Database operation failed: ${queryError.message}`)
    }

    // Buscar formas de pagamento relacionadas
    const formaPagamentoIds = [...new Set((condicoes || [])
      .map((c: any) => c.forma_pagamento_id)
      .filter((id: any) => id !== null && id !== undefined))]
    
    let formasPagamento: any[] = []
    if (formaPagamentoIds.length > 0) {
      const { data, error } = await supabase
        .from('ref_forma_pagamento')
        .select('id, nome')
        .in('id', formaPagamentoIds)
      
      if (error) {
        console.error('[LIST-CONDICOES-PAGAMENTO-V2] Error fetching formas pagamento:', error)
      } else {
        formasPagamento = data || []
      }
    }

    // Buscar meios de pagamento relacionados
    const meioPagamentoIds = [...new Set((condicoes || [])
      .map((c: any) => c.meio_pagamento)
      .filter((id: any) => id !== null && id !== undefined))]
    
    let meiosPagamento: any[] = []
    if (meioPagamentoIds.length > 0) {
      const { data, error } = await supabase
        .from('ref_meio_pagamento')
        .select('ref_pagamento_id, nome')
        .in('ref_pagamento_id', meioPagamentoIds)
      
      if (error) {
        console.error('[LIST-CONDICOES-PAGAMENTO-V2] Error fetching meios pagamento:', error)
      } else {
        meiosPagamento = data || []
      }
    }

    // Criar mapas para lookup rápido - garantir que as chaves sejam do mesmo tipo
    const formaPagamentoMap = new Map(
      (formasPagamento || []).map((fp: any) => [
        Number(fp.id), // Garantir que a chave seja número
        fp.nome || ''
      ])
    )
    const meioPagamentoMap = new Map(
      (meiosPagamento || []).map((mp: any) => [
        Number(mp.ref_pagamento_id), // Garantir que a chave seja número
        mp.nome || ''
      ])
    )

    // Formatar os dados para o frontend
    const formattedCondicoes = (condicoes || []).map((cond: any) => {
      const formaPagamentoId = cond.forma_pagamento_id ? Number(cond.forma_pagamento_id) : null
      const meioPagamentoId = cond.meio_pagamento ? Number(cond.meio_pagamento) : null
      
      return {
        id: cond.Condição_ID,
        nome: cond.Descrição || '',
        formaPagamento: formaPagamentoId ? (formaPagamentoMap.get(formaPagamentoId) || null) : null,
        formaPagamentoId: formaPagamentoId,
        meioPagamento: meioPagamentoId ? (meioPagamentoMap.get(meioPagamentoId) || null) : null,
        meioPagamentoId: meioPagamentoId,
        prazo: cond.Prazo_pagamento || 0,
        parcelas: cond.Quantidade_parcelas || 1,
        desconto: cond.Desconto || 0,
        valorMinimo: null, // Campo não existe na tabela, mas pode ser adicionado depois
        parcelamento: cond.Parcelamento || false,
        condicaoCredito: cond.Condição_de_crédito || false,
        intervaloParcela: cond.intervalo_parcela || [],
      }
    })

    console.log('[LIST-CONDICOES-PAGAMENTO-V2] Query successful:', {
      total: formattedCondicoes.length
    })

    const duration = Date.now() - startTime
    console.log(`[LIST-CONDICOES-PAGAMENTO-V2] SUCCESS: Condições de pagamento listed by ${user.id} (${duration}ms)`)

    return createHttpSuccessResponse(
      {
        condicoes: formattedCondicoes,
        total: formattedCondicoes.length,
      },
      200,
      { userId: user.id, duration: `${duration}ms` }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[LIST-CONDICOES-PAGAMENTO-V2] EXCEPTION:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`
    })
    return formatErrorResponse(error)
  }
})
