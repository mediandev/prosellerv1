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

// Helper: Processar prazo de pagamento (ex: "10/20/30" -> parcelas: 3, prazo: 30, intervalo: [10, 20, 30])
function processarPrazoPagamento(prazoInput: string): {
  quantidadeParcelas: number
  prazoPagamento: number
  intervaloParcela: number[]
} {
  if (!prazoInput || prazoInput.trim() === '') {
    return { quantidadeParcelas: 1, prazoPagamento: 0, intervaloParcela: [] }
  }

  const valores = prazoInput
    .split('/')
    .map(v => v.trim())
    .filter(v => v !== '')
    .map(v => parseFloat(v))
    .filter(v => !isNaN(v) && v >= 0)

  if (valores.length === 0) {
    return { quantidadeParcelas: 1, prazoPagamento: 0, intervaloParcela: [] }
  }

  const quantidadeParcelas = valores.length
  const prazoPagamento = valores[valores.length - 1] // Último valor
  const intervaloParcela = valores

  return { quantidadeParcelas, prazoPagamento, intervaloParcela }
}

// Helper: Gerar descrição automaticamente
function gerarDescricao(
  formaPagamentoNome: string,
  prazoInput: string,
  desconto: number
): string {
  const { prazoPagamento } = processarPrazoPagamento(prazoInput)
  const prazoTexto = prazoPagamento === 0 ? 'À vista' : `${prazoPagamento} dias`
  const descontoTexto = desconto > 0 ? `desc extra ${desconto}%` : 'desc extra 0%'
  
  return `${formaPagamentoNome} - ${prazoTexto} - ${descontoTexto}`
}

serve(async (req) => {
  const startTime = Date.now()
  console.log('[CONDICOES-PAGAMENTO-V2] Request received:', { method: req.method, url: req.url, timestamp: new Date().toISOString() })

  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400',
      }
    })
  }

  try {
    console.log('[CONDICOES-PAGAMENTO-V2] Step 1: Starting authentication...')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)

    if (authError || !user) {
      console.error('[CONDICOES-PAGAMENTO-V2] Authentication failed:', { error: authError })
      return createAuthErrorResponse(authError || 'Unauthorized')
    }

    console.log('[CONDICOES-PAGAMENTO-V2] Authentication successful:', { userId: user.id, tipo: user.tipo })

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

    console.log('[CONDICOES-PAGAMENTO-V2] Action:', action)

    switch (action) {
      case 'list': {
        console.log('[CONDICOES-PAGAMENTO-V2] Listing condições de pagamento...')
        
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
            intervalo_parcela,
            valor_minimo
          `)
          .order('Descrição', { ascending: true })
        
        if (queryError) {
          console.error('[CONDICOES-PAGAMENTO-V2] Query Error:', queryError)
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
            console.error('[CONDICOES-PAGAMENTO-V2] Error fetching formas pagamento:', error)
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
            console.error('[CONDICOES-PAGAMENTO-V2] Error fetching meios pagamento:', error)
          } else {
            meiosPagamento = data || []
          }
        }

        // Criar mapas para lookup rápido
        const formaPagamentoMap = new Map(
          (formasPagamento || []).map((fp: any) => [
            Number(fp.id),
            fp.nome || ''
          ])
        )
        const meioPagamentoMap = new Map(
          (meiosPagamento || []).map((mp: any) => [
            Number(mp.ref_pagamento_id),
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
            valorMinimo: cond.valor_minimo || 0,
            parcelamento: cond.Parcelamento || false,
            condicaoCredito: cond.Condição_de_crédito || false,
            intervaloParcela: cond.intervalo_parcela || [],
          }
        })

        const duration = Date.now() - startTime
        console.log(`[CONDICOES-PAGAMENTO-V2] SUCCESS: Listed ${formattedCondicoes.length} condições de pagamento (${duration}ms)`)

        return createHttpSuccessResponse(
          { condicoes: formattedCondicoes, total: formattedCondicoes.length },
          200,
          { userId: user.id, duration: `${duration}ms` }
        )
      }

      case 'create': {
        console.log('[CONDICOES-PAGAMENTO-V2] Creating condição de pagamento...', body)

        if (!body.formaPagamentoId) {
          throw new Error('Forma de pagamento é obrigatória')
        }

        if (!body.prazoPagamento || body.prazoPagamento.trim() === '') {
          throw new Error('Prazo de pagamento é obrigatório')
        }

        // Processar prazo de pagamento
        const { quantidadeParcelas, prazoPagamento, intervaloParcela } = processarPrazoPagamento(body.prazoPagamento)

        // Buscar nome da forma de pagamento
        const { data: formaPagamento } = await supabase
          .from('ref_forma_pagamento')
          .select('nome')
          .eq('id', parseInt(body.formaPagamentoId))
          .single()

        if (!formaPagamento) {
          throw new Error('Forma de pagamento não encontrada')
        }

        // Gerar descrição automaticamente
        const descricao = body.descricao || gerarDescricao(
          formaPagamento.nome,
          body.prazoPagamento,
          body.descontoExtra || 0
        )

        const { data: novaCondicao, error: insertError } = await supabase
          .from('Condicao_De_Pagamento')
          .insert({
            Descrição: descricao,
            forma_pagamento_id: parseInt(body.formaPagamentoId),
            meio_pagamento: body.meioPagamentoId ? parseInt(body.meioPagamentoId) : null,
            Prazo_pagamento: prazoPagamento,
            Quantidade_parcelas: quantidadeParcelas,
            Desconto: body.descontoExtra || 0,
            valor_minimo: body.valorMinimo || body.valorPedidoMinimo || 0,
            Parcelamento: quantidadeParcelas > 1,
            Condição_de_crédito: body.condicaoCredito || false,
            intervalo_parcela: intervaloParcela,
          })
          .select('Condição_ID, Descrição, forma_pagamento_id, meio_pagamento, Prazo_pagamento, Quantidade_parcelas, Desconto, valor_minimo, Parcelamento, Condição_de_crédito, intervalo_parcela')
          .single()

        if (insertError) {
          console.error('[CONDICOES-PAGAMENTO-V2] Insert Error:', insertError)
          throw new Error(`Database operation failed: ${insertError.message}`)
        }

        const formattedCondicao = {
          id: novaCondicao.Condição_ID,
          nome: novaCondicao.Descrição || '',
          formaPagamento: formaPagamento.nome,
          formaPagamentoId: novaCondicao.forma_pagamento_id,
          meioPagamento: null,
          meioPagamentoId: novaCondicao.meio_pagamento,
          prazo: novaCondicao.Prazo_pagamento || 0,
          parcelas: novaCondicao.Quantidade_parcelas || 1,
          desconto: novaCondicao.Desconto || 0,
          valorMinimo: novaCondicao.valor_minimo || 0,
          parcelamento: novaCondicao.Parcelamento || false,
          condicaoCredito: novaCondicao.Condição_de_crédito || false,
          intervaloParcela: novaCondicao.intervalo_parcela || [],
        }

        const duration = Date.now() - startTime
        console.log(`[CONDICOES-PAGAMENTO-V2] SUCCESS: Created condição de pagamento ${formattedCondicao.id} (${duration}ms)`)

        return createHttpSuccessResponse(
          { condicao: formattedCondicao },
          201,
          { userId: user.id, duration: `${duration}ms` }
        )
      }

      case 'update': {
        console.log('[CONDICOES-PAGAMENTO-V2] Updating condição de pagamento...', body)

        if (!body.id) {
          throw new Error('ID é obrigatório para atualização')
        }

        const updateData: any = {}

        if (body.formaPagamentoId !== undefined) {
          updateData.forma_pagamento_id = parseInt(body.formaPagamentoId)
        }

        if (body.prazoPagamento !== undefined) {
          const { quantidadeParcelas, prazoPagamento, intervaloParcela } = processarPrazoPagamento(body.prazoPagamento)
          updateData.Prazo_pagamento = prazoPagamento
          updateData.Quantidade_parcelas = quantidadeParcelas
          updateData.Parcelamento = quantidadeParcelas > 1
          updateData.intervalo_parcela = intervaloParcela
        }

        if (body.descontoExtra !== undefined) {
          updateData.Desconto = body.descontoExtra
        }

        if (body.valorMinimo !== undefined || body.valorPedidoMinimo !== undefined) {
          updateData.valor_minimo = body.valorMinimo || body.valorPedidoMinimo || 0
        }

        if (body.condicaoCredito !== undefined) {
          updateData.Condição_de_crédito = body.condicaoCredito
        }

        // Se descrição foi fornecida ou se precisa regenerar
        if (body.descricao !== undefined) {
          updateData.Descrição = body.descricao
        } else if (body.formaPagamentoId !== undefined || body.prazoPagamento !== undefined || body.descontoExtra !== undefined) {
          // Buscar forma de pagamento para gerar descrição
          const formaId = body.formaPagamentoId || (await supabase
            .from('Condicao_De_Pagamento')
            .select('forma_pagamento_id')
            .eq('Condição_ID', parseInt(body.id))
            .single()).data?.forma_pagamento_id

          if (formaId) {
            const { data: formaPagamento } = await supabase
              .from('ref_forma_pagamento')
              .select('nome')
              .eq('id', parseInt(formaId))
              .single()

            if (formaPagamento) {
              const prazoInput = body.prazoPagamento || (await supabase
                .from('Condicao_De_Pagamento')
                .select('intervalo_parcela')
                .eq('Condição_ID', parseInt(body.id))
                .single()).data?.intervalo_parcela?.join('/') || '0'

              const desconto = body.descontoExtra !== undefined ? body.descontoExtra : (await supabase
                .from('Condicao_De_Pagamento')
                .select('Desconto')
                .eq('Condição_ID', parseInt(body.id))
                .single()).data?.Desconto || 0

              updateData.Descrição = gerarDescricao(formaPagamento.nome, prazoInput, desconto)
            }
          }
        }

        const { data: condicaoAtualizada, error: updateError } = await supabase
          .from('Condicao_De_Pagamento')
          .update(updateData)
          .eq('Condição_ID', parseInt(body.id))
          .select('Condição_ID, Descrição, forma_pagamento_id, meio_pagamento, Prazo_pagamento, Quantidade_parcelas, Desconto, valor_minimo, Parcelamento, Condição_de_crédito, intervalo_parcela')
          .single()

        if (updateError) {
          console.error('[CONDICOES-PAGAMENTO-V2] Update Error:', updateError)
          throw new Error(`Database operation failed: ${updateError.message}`)
        }

        if (!condicaoAtualizada) {
          throw new Error('Condição de pagamento não encontrada')
        }

        // Buscar nome da forma de pagamento
        const { data: formaPagamento } = await supabase
          .from('ref_forma_pagamento')
          .select('nome')
          .eq('id', condicaoAtualizada.forma_pagamento_id)
          .single()

        const formattedCondicao = {
          id: condicaoAtualizada.Condição_ID,
          nome: condicaoAtualizada.Descrição || '',
          formaPagamento: formaPagamento?.nome || null,
          formaPagamentoId: condicaoAtualizada.forma_pagamento_id,
          meioPagamento: null,
          meioPagamentoId: condicaoAtualizada.meio_pagamento,
          prazo: condicaoAtualizada.Prazo_pagamento || 0,
          parcelas: condicaoAtualizada.Quantidade_parcelas || 1,
          desconto: condicaoAtualizada.Desconto || 0,
          valorMinimo: condicaoAtualizada.valor_minimo || 0,
          parcelamento: condicaoAtualizada.Parcelamento || false,
          condicaoCredito: condicaoAtualizada.Condição_de_crédito || false,
          intervaloParcela: condicaoAtualizada.intervalo_parcela || [],
        }

        const duration = Date.now() - startTime
        console.log(`[CONDICOES-PAGAMENTO-V2] SUCCESS: Updated condição de pagamento ${formattedCondicao.id} (${duration}ms)`)

        return createHttpSuccessResponse(
          { condicao: formattedCondicao },
          200,
          { userId: user.id, duration: `${duration}ms` }
        )
      }

      case 'delete': {
        console.log('[CONDICOES-PAGAMENTO-V2] Deleting condição de pagamento...', body)

        if (!body.id) {
          throw new Error('ID é obrigatório para exclusão')
        }

        const { error: deleteError } = await supabase
          .from('Condicao_De_Pagamento')
          .delete()
          .eq('Condição_ID', parseInt(body.id))

        if (deleteError) {
          console.error('[CONDICOES-PAGAMENTO-V2] Delete Error:', deleteError)
          throw new Error(`Database operation failed: ${deleteError.message}`)
        }

        const duration = Date.now() - startTime
        console.log(`[CONDICOES-PAGAMENTO-V2] SUCCESS: Deleted condição de pagamento ${body.id} (${duration}ms)`)

        return createHttpSuccessResponse(
          { success: true, message: 'Condição de pagamento excluída com sucesso' },
          200,
          { userId: user.id, duration: `${duration}ms` }
        )
      }

      default:
        throw new Error(`Ação inválida: ${action}. Use: list, create, update ou delete`)
    }
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[CONDICOES-PAGAMENTO-V2] EXCEPTION:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`
    })
    return formatErrorResponse(error)
  }
})
