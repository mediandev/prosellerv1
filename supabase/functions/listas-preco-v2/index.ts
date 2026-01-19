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

// Helper: Log detalhado
function logDetailed(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(data && { data }),
  }
  console.log(JSON.stringify(logEntry))
}

serve(async (req) => {
  const startTime = Date.now()
  logDetailed('INFO', '[LISTAS-PRECO-V2] Request received', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries()),
  })

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
    logDetailed('INFO', '[LISTAS-PRECO-V2] Step 1: Starting authentication...')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)

    if (authError || !user) {
      logDetailed('ERROR', '[LISTAS-PRECO-V2] Authentication failed', { error: authError })
      return createAuthErrorResponse(authError || 'Unauthorized')
    }

    logDetailed('INFO', '[LISTAS-PRECO-V2] Authentication successful', {
      userId: user.id,
      tipo: user.tipo,
      email: user.email,
    })

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
        logDetailed('INFO', '[LISTAS-PRECO-V2] Request body parsed', { action: body.action, bodyKeys: Object.keys(body) })
      } catch {
        body = {}
        logDetailed('WARN', '[LISTAS-PRECO-V2] Failed to parse request body, using empty object')
      }
      action = body.action || 'list'
    }

    logDetailed('INFO', '[LISTAS-PRECO-V2] Action determined', { action, method: req.method })

    switch (action) {
      case 'list': {
        logDetailed('INFO', '[LISTAS-PRECO-V2] Executing list action via RPC...')
        
        // Chamar função RPC que retorna listas formatadas
        const rpcStartTime = Date.now()
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('list_listas_preco_v2')

        const rpcDuration = Date.now() - rpcStartTime
        logDetailed('INFO', '[LISTAS-PRECO-V2] RPC call completed', {
          duration: `${rpcDuration}ms`,
          hasError: !!rpcError,
          dataType: rpcData ? typeof rpcData : 'null',
        })

        if (rpcError) {
          logDetailed('ERROR', '[LISTAS-PRECO-V2] RPC Error', {
            error: rpcError.message,
            code: rpcError.code,
            details: rpcError.details,
            hint: rpcError.hint,
          })
          throw new Error(`Database operation failed: ${rpcError.message}`)
        }

        // Parse JSON response from RPC
        const listas = Array.isArray(rpcData) ? rpcData : (typeof rpcData === 'string' ? JSON.parse(rpcData) : [])

        // Formatar os dados para o frontend - apenas dados básicos para listagem
        const formattedListas = (listas || []).map((lista: any) => {
          // A RPC retorna: id, nome, total_produtos, total_faixas_comissao, tipo_comissao, ativo, created_at, updated_at
          const tipoComissao = lista.tipo_comissao || (lista.total_faixas_comissao > 0 ? 'conforme_desconto' : 'fixa')
          
          return {
            id: String(lista.id),
            nome: lista.nome || '',
            produtos: [], // Não carregar produtos na listagem - será carregado no get individual
            tipoComissao,
            percentualFixo: tipoComissao === 'fixa' ? (lista.percentual_fixo || 10) : undefined,
            faixasDesconto: [], // Não carregar faixas na listagem - será carregado no get individual
            totalProdutos: lista.total_produtos || 0,
            totalFaixas: lista.total_faixas_comissao || 0,
            ativo: lista.ativo !== false,
            createdAt: lista.created_at ? new Date(lista.created_at).toISOString() : new Date().toISOString(),
            updatedAt: lista.updated_at ? new Date(lista.updated_at).toISOString() : new Date().toISOString(),
          }
        })

        const duration = Date.now() - startTime
        logDetailed('INFO', '[LISTAS-PRECO-V2] SUCCESS: Listed listas de preço', {
          count: formattedListas.length,
          totalDuration: `${duration}ms`,
          rpcDuration: `${rpcDuration}ms`,
        })

        return createHttpSuccessResponse(
          formattedListas,
          200,
          { userId: user.id, duration: `${duration}ms`, rpcDuration: `${rpcDuration}ms` }
        )
      }

      case 'get': {
        logDetailed('INFO', '[LISTAS-PRECO-V2] Executing get action via RPC...', { id: body.id })

        if (!body.id) {
          throw new Error('ID é obrigatório para buscar lista de preço')
        }

        const rpcStartTime = Date.now()
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_lista_preco_v2', {
            p_lista_preco_id: parseInt(body.id),
          })

        const rpcDuration = Date.now() - rpcStartTime
        logDetailed('INFO', '[LISTAS-PRECO-V2] RPC get call completed', {
          duration: `${rpcDuration}ms`,
          hasError: !!rpcError,
          listaId: body.id,
        })

        if (rpcError) {
          logDetailed('ERROR', '[LISTAS-PRECO-V2] RPC Error on get', {
            error: rpcError.message,
            code: rpcError.code,
            listaId: body.id,
          })
          throw new Error(`Database operation failed: ${rpcError.message}`)
        }

        // Parse JSON response from RPC
        const lista = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData

        // Formatar para o frontend
        const produtos = Array.isArray(lista.produtos) ? lista.produtos : []
        const faixas = Array.isArray(lista.faixas_comissao) ? lista.faixas_comissao : []
        const tipoComissao = faixas.length > 0 ? 'conforme_desconto' : 'fixa'

        const formattedLista = {
          id: String(lista.id),
          nome: lista.nome || '',
          produtos: produtos.map((p: any) => ({
            produtoId: String(p.produtoId || p.produto_id),
            preco: parseFloat(p.preco || 0),
          })),
          tipoComissao,
          percentualFixo: tipoComissao === 'fixa' && faixas.length > 0 ? parseFloat(faixas[0]?.percentualComissao || faixas[0]?.comissao || 0) : undefined,
          faixasDesconto: faixas.map((f: any, index: number) => ({
            id: String(f.id || `faixa-${index}`),
            descontoMin: parseFloat(f.descontoMin || f.desconto_minimo || 0),
            descontoMax: f.descontoMax !== null && f.descontoMax !== undefined ? parseFloat(f.descontoMax || f.desconto_maximo || 100) : null,
            percentualComissao: parseFloat(f.percentualComissao || f.comissao || 0),
          })),
          ativo: lista.ativo !== false,
          createdAt: lista.created_at ? new Date(lista.created_at).toISOString() : new Date().toISOString(),
          updatedAt: lista.updated_at ? new Date(lista.updated_at).toISOString() : new Date().toISOString(),
        }

        const duration = Date.now() - startTime
        logDetailed('INFO', '[LISTAS-PRECO-V2] SUCCESS: Retrieved lista de preço', {
          listaId: formattedLista.id,
          produtosCount: formattedLista.produtos.length,
          faixasCount: formattedLista.faixasDesconto.length,
          totalDuration: `${duration}ms`,
          rpcDuration: `${rpcDuration}ms`,
        })

        return createHttpSuccessResponse(
          formattedLista,
          200,
          { userId: user.id, duration: `${duration}ms`, rpcDuration: `${rpcDuration}ms` }
        )
      }

      case 'create': {
        logDetailed('INFO', '[LISTAS-PRECO-V2] Executing create action via RPC...', {
          nome: body.nome,
          tipoComissao: body.tipoComissao,
          produtosCount: body.produtos?.length || 0,
          faixasCount: body.faixasDesconto?.length || 0,
        })

        // Validações
        if (!body.nome || body.nome.trim() === '') {
          throw new Error('Nome da lista de preço é obrigatório')
        }

        // Preparar dados para RPC
        const produtosJsonb = body.produtos && Array.isArray(body.produtos) 
          ? body.produtos.map((p: any) => ({
              produtoId: String(p.produtoId || p.produto_id),
              preco: parseFloat(p.preco || 0),
            }))
          : []

        const faixasJsonb = body.faixasDesconto && Array.isArray(body.faixasDesconto)
          ? body.faixasDesconto.map((f: any) => ({
              descontoMin: parseFloat(f.descontoMin || 0),
              descontoMax: f.descontoMax !== null && f.descontoMax !== undefined ? parseFloat(f.descontoMax) : null,
              percentualComissao: parseFloat(f.percentualComissao || 0),
            }))
          : []

        // Determinar tipo de comissão baseado nas faixas
        const tipoComissao = body.tipoComissao || (faixasJsonb.length > 0 ? 'conforme_desconto' : 'fixa')
        
        // Preparar percentual fixo apenas se tipo for fixa
        const percentualFixo = tipoComissao === 'fixa' 
          ? (body.percentualFixo ? parseFloat(body.percentualFixo) : 10) 
          : null

        logDetailed('INFO', '[LISTAS-PRECO-V2] RPC parameters prepared', {
          tipoComissao,
          percentualFixo,
          produtosCount: produtosJsonb.length,
          faixasCount: faixasJsonb.length,
        })

        const rpcStartTime = Date.now()
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('create_lista_preco_v2', {
            p_nome: body.nome.trim(),
            p_desconto: body.desconto ? parseFloat(body.desconto) : 0,
            p_ativo: body.ativo !== undefined ? body.ativo : true,
            p_codigo_sequencial: body.codigo_sequencial || null,
            p_produtos: produtosJsonb.length > 0 ? produtosJsonb : null,
            p_tipo_comissao: tipoComissao,
            p_percentual_fixo: percentualFixo,
            p_faixas_comissao: faixasJsonb.length > 0 ? faixasJsonb : null,
          })

        const rpcDuration = Date.now() - rpcStartTime
        logDetailed('INFO', '[LISTAS-PRECO-V2] RPC create call completed', {
          duration: `${rpcDuration}ms`,
          hasError: !!rpcError,
        })

        if (rpcError) {
          logDetailed('ERROR', '[LISTAS-PRECO-V2] RPC Error on create', {
            error: rpcError.message,
            code: rpcError.code,
            details: rpcError.details,
          })
          throw new Error(`Database operation failed: ${rpcError.message}`)
        }

        // Parse JSON response from RPC
        const lista = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData

        // Formatar para o frontend
        const produtos = Array.isArray(lista.produtos) ? lista.produtos : []
        const faixas = Array.isArray(lista.faixas_comissao) ? lista.faixas_comissao : []
        const tipoComissao = faixas.length > 0 ? 'conforme_desconto' : 'fixa'

        const formattedLista = {
          id: String(lista.id),
          nome: lista.nome || '',
          produtos: produtos.map((p: any) => ({
            produtoId: String(p.produtoId || p.produto_id),
            preco: parseFloat(p.preco || 0),
          })),
          tipoComissao,
          percentualFixo: tipoComissao === 'fixa' && faixas.length > 0 ? parseFloat(faixas[0]?.percentualComissao || faixas[0]?.comissao || 0) : undefined,
          faixasDesconto: faixas.map((f: any, index: number) => ({
            id: String(f.id || `faixa-${index}`),
            descontoMin: parseFloat(f.descontoMin || f.desconto_minimo || 0),
            descontoMax: f.descontoMax !== null && f.descontoMax !== undefined ? parseFloat(f.descontoMax || f.desconto_maximo || 100) : null,
            percentualComissao: parseFloat(f.percentualComissao || f.comissao || 0),
          })),
          ativo: lista.ativo !== false,
          createdAt: lista.created_at ? new Date(lista.created_at).toISOString() : new Date().toISOString(),
          updatedAt: lista.updated_at ? new Date(lista.updated_at).toISOString() : new Date().toISOString(),
        }

        const duration = Date.now() - startTime
        logDetailed('INFO', '[LISTAS-PRECO-V2] SUCCESS: Created lista de preço', {
          listaId: formattedLista.id,
          nome: formattedLista.nome,
          produtosCount: formattedLista.produtos.length,
          faixasCount: formattedLista.faixasDesconto.length,
          totalDuration: `${duration}ms`,
          rpcDuration: `${rpcDuration}ms`,
        })

        return createHttpSuccessResponse(
          formattedLista,
          201,
          { userId: user.id, duration: `${duration}ms`, rpcDuration: `${rpcDuration}ms` }
        )
      }

      case 'update': {
        logDetailed('INFO', '[LISTAS-PRECO-V2] Executing update action via RPC...', {
          id: body.id,
          nome: body.nome,
          tipoComissao: body.tipoComissao,
        })

        if (!body.id) {
          throw new Error('ID é obrigatório para atualização')
        }

        // Preparar dados para RPC
        const produtosJsonb = body.produtos && Array.isArray(body.produtos)
          ? body.produtos.map((p: any) => ({
              produtoId: String(p.produtoId || p.produto_id),
              preco: parseFloat(p.preco || 0),
            }))
          : null

        const faixasJsonb = body.faixasDesconto && Array.isArray(body.faixasDesconto)
          ? body.faixasDesconto.map((f: any) => ({
              descontoMin: parseFloat(f.descontoMin || 0),
              descontoMax: f.descontoMax !== null && f.descontoMax !== undefined ? parseFloat(f.descontoMax) : null,
              percentualComissao: parseFloat(f.percentualComissao || 0),
            }))
          : null

        const rpcStartTime = Date.now()
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('update_lista_preco_v2', {
            p_lista_preco_id: parseInt(body.id),
            p_nome: body.nome ? body.nome.trim() : null,
            p_desconto: body.desconto !== undefined ? parseFloat(body.desconto) : null,
            p_ativo: body.ativo !== undefined ? body.ativo : null,
            p_codigo_sequencial: body.codigo_sequencial !== undefined ? body.codigo_sequencial : null,
            p_produtos: produtosJsonb as any,
            p_tipo_comissao: body.tipoComissao || null,
            p_percentual_fixo: body.percentualFixo !== undefined ? parseFloat(body.percentualFixo) : null,
            p_faixas_comissao: faixasJsonb as any,
          })

        const rpcDuration = Date.now() - rpcStartTime
        logDetailed('INFO', '[LISTAS-PRECO-V2] RPC update call completed', {
          duration: `${rpcDuration}ms`,
          hasError: !!rpcError,
          listaId: body.id,
        })

        if (rpcError) {
          logDetailed('ERROR', '[LISTAS-PRECO-V2] RPC Error on update', {
            error: rpcError.message,
            code: rpcError.code,
            listaId: body.id,
          })
          throw new Error(`Database operation failed: ${rpcError.message}`)
        }

        // Parse JSON response from RPC
        const lista = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData

        // Formatar para o frontend
        const produtos = Array.isArray(lista.produtos) ? lista.produtos : []
        const faixas = Array.isArray(lista.faixas_comissao) ? lista.faixas_comissao : []
        const tipoComissao = faixas.length > 0 ? 'conforme_desconto' : 'fixa'

        const formattedLista = {
          id: String(lista.id),
          nome: lista.nome || '',
          produtos: produtos.map((p: any) => ({
            produtoId: String(p.produtoId || p.produto_id),
            preco: parseFloat(p.preco || 0),
          })),
          tipoComissao,
          percentualFixo: tipoComissao === 'fixa' && faixas.length > 0 ? parseFloat(faixas[0]?.percentualComissao || faixas[0]?.comissao || 0) : undefined,
          faixasDesconto: faixas.map((f: any, index: number) => ({
            id: String(f.id || `faixa-${index}`),
            descontoMin: parseFloat(f.descontoMin || f.desconto_minimo || 0),
            descontoMax: f.descontoMax !== null && f.descontoMax !== undefined ? parseFloat(f.descontoMax || f.desconto_maximo || 100) : null,
            percentualComissao: parseFloat(f.percentualComissao || f.comissao || 0),
          })),
          ativo: lista.ativo !== false,
          createdAt: lista.created_at ? new Date(lista.created_at).toISOString() : new Date().toISOString(),
          updatedAt: lista.updated_at ? new Date(lista.updated_at).toISOString() : new Date().toISOString(),
        }

        const duration = Date.now() - startTime
        logDetailed('INFO', '[LISTAS-PRECO-V2] SUCCESS: Updated lista de preço', {
          listaId: formattedLista.id,
          produtosCount: formattedLista.produtos.length,
          faixasCount: formattedLista.faixasDesconto.length,
          totalDuration: `${duration}ms`,
          rpcDuration: `${rpcDuration}ms`,
        })

        return createHttpSuccessResponse(
          formattedLista,
          200,
          { userId: user.id, duration: `${duration}ms`, rpcDuration: `${rpcDuration}ms` }
        )
      }

      case 'delete': {
        logDetailed('INFO', '[LISTAS-PRECO-V2] Executing delete action via RPC...', { id: body.id })

        if (!body.id) {
          throw new Error('ID é obrigatório para exclusão')
        }

        const rpcStartTime = Date.now()
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('delete_lista_preco_v2', {
            p_lista_preco_id: parseInt(body.id),
          })

        const rpcDuration = Date.now() - rpcStartTime
        logDetailed('INFO', '[LISTAS-PRECO-V2] RPC delete call completed', {
          duration: `${rpcDuration}ms`,
          hasError: !!rpcError,
          listaId: body.id,
        })

        if (rpcError) {
          logDetailed('ERROR', '[LISTAS-PRECO-V2] RPC Error on delete', {
            error: rpcError.message,
            code: rpcError.code,
            listaId: body.id,
          })
          throw new Error(`Database operation failed: ${rpcError.message}`)
        }

        const duration = Date.now() - startTime
        logDetailed('INFO', '[LISTAS-PRECO-V2] SUCCESS: Deleted lista de preço', {
          listaId: body.id,
          totalDuration: `${duration}ms`,
          rpcDuration: `${rpcDuration}ms`,
        })

        return createHttpSuccessResponse(
          { id: body.id, deleted: true },
          200,
          { userId: user.id, duration: `${duration}ms`, rpcDuration: `${rpcDuration}ms` }
        )
      }

      default:
        throw new Error(`Ação inválida: ${action}. Use: list, get, create, update ou delete`)
    }
  } catch (error) {
    const duration = Date.now() - startTime
    logDetailed('ERROR', '[LISTAS-PRECO-V2] EXCEPTION', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
    })
    return formatErrorResponse(error)
  }
})

