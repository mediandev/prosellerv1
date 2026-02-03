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
    else if (error.message.includes('not found') || error.message.includes('não encontrado')) statusCode = 404
    else if (error.message.includes('validation') || error.message.includes('invalid') || error.message.includes('obrigatório')) statusCode = 400
  }
  console.error('[METAS-VENDEDOR-V2] Error:', { message: errorMessage, statusCode })
  return new Response(
    JSON.stringify({ success: false, error: errorMessage, timestamp: new Date().toISOString() }),
    { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

serve(async (req) => {
  const startTime = Date.now()
  console.log('[METAS-VENDEDOR-V2] Request received:', { method: req.method, url: req.url, timestamp: new Date().toISOString() })

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
    console.log('[METAS-VENDEDOR-V2] Step 1: Starting authentication...')
    
    // 1. AUTENTICAÇÃO
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)
    
    if (authError || !user) {
      console.error('[METAS-VENDEDOR-V2] Authentication failed:', authError)
      return createAuthErrorResponse(authError || 'Unauthorized')
    }

    console.log('[METAS-VENDEDOR-V2] Step 2: User authenticated:', { userId: user.id, tipo: user.tipo })

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    })

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(p => p)
    const functionIndex = pathParts.indexOf('metas-vendedor-v2')
    
    // Extrair ID ou ação especial do path
    const resourceId = functionIndex >= 0 && functionIndex < pathParts.length - 1
      ? pathParts[functionIndex + 1]
      : url.searchParams.get('id')
    
    // Verificar se é uma ação especial (copiar, total)
    const isCopiarAction = pathParts[functionIndex + 1] === 'copiar'
    const isTotalAction = pathParts[functionIndex + 1] === 'total'

    console.log('[METAS-VENDEDOR-V2] Step 3: Processing request:', { 
      resourceId, 
      method: req.method, 
      pathParts, 
      functionIndex,
      isCopiarAction,
      isTotalAction,
      url: req.url,
      pathname: url.pathname
    })

    // 2. ROTEAMENTO POR MÉTODO
    if (req.method === 'GET') {
      if (isTotalAction) {
        // GET /metas-vendedor-v2/total - Calcular total de metas
        console.log('[METAS-VENDEDOR-V2] Getting total metas...')
        
        const ano = parseInt(url.searchParams.get('ano') || String(new Date().getFullYear()))
        const mes = parseInt(url.searchParams.get('mes') || String(new Date().getMonth() + 1))

        if (isNaN(ano) || ano < 2000 || ano > 2100) {
          throw new Error('Ano inválido')
        }

        if (isNaN(mes) || mes < 1 || mes > 12) {
          throw new Error('Mês inválido (deve ser entre 1 e 12)')
        }

        const { data: totalData, error: totalError } = await supabase
          .rpc('get_meta_total_vendedor_v2', {
            p_ano: ano,
            p_mes: mes,
          })

        if (totalError) {
          console.error('[METAS-VENDEDOR-V2] RPC Error:', totalError)
          throw new Error(`Database operation failed: ${totalError.message}`)
        }

        const duration = Date.now() - startTime
        console.log(`[METAS-VENDEDOR-V2] SUCCESS: Total metas retrieved (${duration}ms)`)

        return createHttpSuccessResponse(
          {
            total: totalData?.total || 0,
            ano,
            mes,
          },
          200,
          { userId: user.id, duration: `${duration}ms` }
        )
      } else if (resourceId && !isCopiarAction && !isTotalAction) {
        // GET /metas-vendedor-v2/:id
        console.log('[METAS-VENDEDOR-V2] Getting meta by ID:', resourceId)
        
        const { data: meta, error: metaError } = await supabase
          .rpc('get_meta_vendedor_v2', {
            p_id: parseInt(resourceId)
          })

        if (metaError) {
          console.error('[METAS-VENDEDOR-V2] RPC Error:', metaError)
          throw new Error(`Database operation failed: ${metaError.message}`)
        }

        if (!meta || meta.length === 0) {
          throw new Error('Meta não encontrada')
        }

        const formattedMeta = {
          id: String(meta[0].id),
          vendedorId: meta[0].vendedor_id,
          vendedorNome: meta[0].vendedor_nome || '',
          ano: meta[0].ano,
          mes: meta[0].mes,
          metaMensal: parseFloat(meta[0].meta_valor || '0'),
          vendidoMes: 0, // Não está na tabela, será calculado no frontend
          dataCriacao: meta[0].data_criacao ? new Date(meta[0].data_criacao).toISOString() : new Date().toISOString(),
          dataAtualizacao: meta[0].data_atualizacao ? new Date(meta[0].data_atualizacao).toISOString() : undefined,
        }

        const duration = Date.now() - startTime
        console.log(`[METAS-VENDEDOR-V2] SUCCESS: Meta retrieved (${duration}ms)`)

        return createHttpSuccessResponse(
          formattedMeta,
          200,
          { userId: user.id, duration: `${duration}ms` }
        )
      } else {
        // GET /metas-vendedor-v2 (listar todas)
        console.log('[METAS-VENDEDOR-V2] Listing metas...')
        
        const ano = url.searchParams.get('ano') ? parseInt(url.searchParams.get('ano')!) : null
        const mes = url.searchParams.get('mes') ? parseInt(url.searchParams.get('mes')!) : null
        const vendedorId = url.searchParams.get('vendedor_id') || null
        const page = parseInt(url.searchParams.get('page') || '1')
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 100)

        const { data: rpcData, error: rpcError } = await supabase
          .rpc('list_metas_vendedor_v2', {
            p_requesting_user_id: user.id,
            p_ano: ano,
            p_mes: mes,
            p_vendedor_id: vendedorId,
            p_page: page,
            p_limit: limit,
          })

        if (rpcError) {
          console.error('[METAS-VENDEDOR-V2] RPC Error:', rpcError)
          throw new Error(`Database operation failed: ${rpcError.message}`)
        }

        const metas = rpcData?.metas || []
        const formattedMetas = metas.map((m: any) => ({
          id: String(m.id),
          vendedorId: m.vendedor_id,
          vendedorNome: m.vendedor_nome || '',
          ano: m.ano,
          mes: m.mes,
          metaMensal: parseFloat(m.meta_valor || '0'),
          vendidoMes: 0, // Não está na tabela, será calculado no frontend
          dataCriacao: m.data_criacao ? new Date(m.data_criacao).toISOString() : new Date().toISOString(),
          dataAtualizacao: m.data_atualizacao ? new Date(m.data_atualizacao).toISOString() : undefined,
        }))

        const duration = Date.now() - startTime
        console.log(`[METAS-VENDEDOR-V2] SUCCESS: Listed ${formattedMetas.length} metas (${duration}ms)`)

        return createHttpSuccessResponse(
          {
            metas: formattedMetas,
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
      const action = body.action || (isCopiarAction ? 'copiar' : 'create')

      if (action === 'copiar' || isCopiarAction) {
        // POST /metas-vendedor-v2/copiar - Copiar metas entre períodos
        console.log('[METAS-VENDEDOR-V2] Copiando metas...', body)

        // Verificar permissões - apenas backoffice pode copiar
        if (user.tipo !== 'backoffice') {
          throw new Error('Apenas usuários backoffice podem copiar metas')
        }

        const deAno = body.deAno || body.de_ano
        const deMes = body.deMes || body.de_mes
        const paraAno = body.paraAno || body.para_ano
        const paraMes = body.paraMes || body.para_mes

        if (!deAno || !deMes || !paraAno || !paraMes) {
          throw new Error('Parâmetros deAno, deMes, paraAno e paraMes são obrigatórios')
        }

        if (deMes < 1 || deMes > 12 || paraMes < 1 || paraMes > 12) {
          throw new Error('Mês inválido (deve ser entre 1 e 12)')
        }

        const { data: copiarData, error: copiarError } = await supabase
          .rpc('copiar_metas_vendedor_v2', {
            p_de_ano: parseInt(deAno),
            p_de_mes: parseInt(deMes),
            p_para_ano: parseInt(paraAno),
            p_para_mes: parseInt(paraMes),
            p_created_by: user.id,
          })

        if (copiarError) {
          console.error('[METAS-VENDEDOR-V2] RPC Error:', copiarError)
          throw new Error(`Database operation failed: ${copiarError.message}`)
        }

        const duration = Date.now() - startTime
        console.log(`[METAS-VENDEDOR-V2] SUCCESS: Metas copied (${duration}ms)`)

        return createHttpSuccessResponse(
          {
            success: true,
            copiedCount: copiarData?.copied_count || 0,
            message: `${copiarData?.copied_count || 0} metas copiadas com sucesso`,
          },
          200,
          { userId: user.id, duration: `${duration}ms` }
        )
      } else {
        // POST /metas-vendedor-v2 - Criar meta
        console.log('[METAS-VENDEDOR-V2] Creating meta...', body)

        // Verificar permissões - apenas backoffice pode criar
        if (user.tipo !== 'backoffice') {
          throw new Error('Apenas usuários backoffice podem criar metas')
        }

        // Validações
        if (!body.vendedorId && !body.vendedor_id) {
          throw new Error('vendedorId é obrigatório')
        }

        if (!body.ano || !body.mes) {
          throw new Error('ano e mes são obrigatórios')
        }

        const mes = parseInt(body.mes)
        if (isNaN(mes) || mes < 1 || mes > 12) {
          throw new Error('Mês inválido (deve ser entre 1 e 12)')
        }

        const metaMensal = parseFloat(body.metaMensal || body.meta_mensal || '0')
        if (isNaN(metaMensal) || metaMensal < 0) {
          throw new Error('metaMensal deve ser um número maior ou igual a 0')
        }

        const { data: meta, error: metaError } = await supabase
          .rpc('create_meta_vendedor_v2', {
            p_vendedor_id: body.vendedorId || body.vendedor_id,
            p_ano: parseInt(body.ano),
            p_mes: mes,
            p_meta_valor: metaMensal,
            p_meta_percentual_crescimento: body.metaPercentualCrescimento || body.meta_percentual_crescimento || null,
            p_periodo_referencia: body.periodoReferencia || body.periodo_referencia || null,
            p_created_by: user.id,
          })

        if (metaError) {
          console.error('[METAS-VENDEDOR-V2] RPC Error:', metaError)
          throw new Error(`Database operation failed: ${metaError.message}`)
        }

        if (!meta || meta.length === 0) {
          throw new Error('Erro ao criar meta')
        }

        const formattedMeta = {
          id: String(meta[0].id),
          vendedorId: meta[0].vendedor_id,
          vendedorNome: meta[0].vendedor_nome || '',
          ano: meta[0].ano,
          mes: meta[0].mes,
          metaMensal: parseFloat(meta[0].meta_valor || '0'),
          vendidoMes: 0,
          dataCriacao: meta[0].data_criacao ? new Date(meta[0].data_criacao).toISOString() : new Date().toISOString(),
          dataAtualizacao: meta[0].data_atualizacao ? new Date(meta[0].data_atualizacao).toISOString() : undefined,
        }

        const duration = Date.now() - startTime
        console.log(`[METAS-VENDEDOR-V2] SUCCESS: Meta created (${duration}ms)`)

        return createHttpSuccessResponse(
          formattedMeta,
          201,
          { userId: user.id, duration: `${duration}ms` }
        )
      }
    }

    if (req.method === 'PUT') {
      const body = await req.json()
      // Priorizar ID do path, depois do body
      const id = resourceId || body.id

      if (!id) {
        throw new Error('ID é obrigatório para atualização')
      }

      // Validar se o ID é um número válido
      const idNum = parseInt(id)
      if (isNaN(idNum) || idNum <= 0) {
        throw new Error(`ID inválido: ${id}`)
      }

      console.log('[METAS-VENDEDOR-V2] Updating meta:', { id: idNum, body })

      // Verificar permissões - apenas backoffice pode atualizar
      if (user.tipo !== 'backoffice') {
        throw new Error('Apenas usuários backoffice podem atualizar metas')
      }

      // Validações opcionais
      if (body.mes !== undefined) {
        const mes = parseInt(body.mes)
        if (isNaN(mes) || mes < 1 || mes > 12) {
          throw new Error('Mês inválido (deve ser entre 1 e 12)')
        }
      }

      if (body.metaMensal !== undefined || body.meta_mensal !== undefined) {
        const metaMensal = parseFloat(body.metaMensal || body.meta_mensal || '0')
        if (isNaN(metaMensal) || metaMensal < 0) {
          throw new Error('metaMensal deve ser um número maior ou igual a 0')
        }
      }

      const { data: meta, error: metaError } = await supabase
        .rpc('update_meta_vendedor_v2', {
          p_id: idNum,
          p_vendedor_id: body.vendedorId || body.vendedor_id || null,
          p_ano: body.ano ? parseInt(body.ano) : null,
          p_mes: body.mes ? parseInt(body.mes) : null,
          p_meta_valor: body.metaMensal !== undefined || body.meta_mensal !== undefined 
            ? parseFloat(body.metaMensal || body.meta_mensal || '0') 
            : null,
          p_meta_percentual_crescimento: body.metaPercentualCrescimento !== undefined || body.meta_percentual_crescimento !== undefined
            ? (body.metaPercentualCrescimento || body.meta_percentual_crescimento || null)
            : null,
          p_periodo_referencia: body.periodoReferencia !== undefined || body.periodo_referencia !== undefined
            ? (body.periodoReferencia || body.periodo_referencia || null)
            : null,
          p_updated_by: user.id,
        })

      if (metaError) {
        console.error('[METAS-VENDEDOR-V2] RPC Error:', metaError)
        throw new Error(`Database operation failed: ${metaError.message}`)
      }

      if (!meta || meta.length === 0) {
        throw new Error('Meta não encontrada')
      }

      const formattedMeta = {
        id: String(meta[0].id),
        vendedorId: meta[0].vendedor_id,
        vendedorNome: meta[0].vendedor_nome || '',
        ano: meta[0].ano,
        mes: meta[0].mes,
        metaMensal: parseFloat(meta[0].meta_valor || '0'),
        vendidoMes: 0,
        dataCriacao: meta[0].data_criacao ? new Date(meta[0].data_criacao).toISOString() : new Date().toISOString(),
        dataAtualizacao: meta[0].data_atualizacao ? new Date(meta[0].data_atualizacao).toISOString() : undefined,
      }

      const duration = Date.now() - startTime
      console.log(`[METAS-VENDEDOR-V2] SUCCESS: Meta updated (${duration}ms)`)

      return createHttpSuccessResponse(
        formattedMeta,
        200,
        { userId: user.id, duration: `${duration}ms` }
      )
    }

    if (req.method === 'DELETE') {
      const id = resourceId || url.searchParams.get('id')

      if (!id) {
        throw new Error('ID é obrigatório para exclusão')
      }

      console.log('[METAS-VENDEDOR-V2] Deleting meta:', id)

      // Verificar permissões - apenas backoffice pode excluir
      if (user.tipo !== 'backoffice') {
        throw new Error('Apenas usuários backoffice podem excluir metas')
      }

      const { error: deleteError } = await supabase
        .rpc('delete_meta_vendedor_v2', {
          p_id: parseInt(id),
          p_deleted_by: user.id,
        })

      if (deleteError) {
        console.error('[METAS-VENDEDOR-V2] RPC Error:', deleteError)
        throw new Error(`Database operation failed: ${deleteError.message}`)
      }

      const duration = Date.now() - startTime
      console.log(`[METAS-VENDEDOR-V2] SUCCESS: Meta deleted (${duration}ms)`)

      return createHttpSuccessResponse(
        { success: true, message: 'Meta excluída com sucesso' },
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
    console.error('[METAS-VENDEDOR-V2] EXCEPTION:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`
    })
    return formatErrorResponse(error)
  }
})
