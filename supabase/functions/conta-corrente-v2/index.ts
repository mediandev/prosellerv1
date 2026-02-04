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

function createHttpSuccessResponse<T>(data: T, status: number = 200, meta?: Record<string, unknown>): Response {
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
  console.error('[CONTA-CORRENTE-V2] Error:', { message: errorMessage, statusCode })
  return new Response(
    JSON.stringify({ success: false, error: errorMessage, timestamp: new Date().toISOString() }),
    { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function formatCompromisso(row: any) {
  // Garantir que cliente_id seja tratado corretamente
  const clienteId = row.cliente_id != null && row.cliente_id !== undefined && row.cliente_id !== 'undefined'
    ? String(row.cliente_id)
    : (row.clienteId != null && row.clienteId !== undefined && row.clienteId !== 'undefined' ? String(row.clienteId) : '')
  
  // Garantir que categoria_id seja tratado corretamente
  const categoriaId = row.categoria_id != null && row.categoria_id !== undefined && row.categoria_id !== 'undefined'
    ? String(row.categoria_id)
    : (row.categoriaId != null && row.categoriaId !== undefined && row.categoriaId !== 'undefined' ? String(row.categoriaId) : undefined)
  
  return {
    id: String(row.id || ''),
    clienteId: clienteId,
    clienteNome: row.cliente_nome || row.clienteNome || 'Cliente sem nome',
    clienteGrupoRede: row.cliente_grupo_rede || row.clienteGrupoRede || undefined,
    vendedorUuid: row.vendedor_uuid || row.vendedorUuid ? String(row.vendedor_uuid || row.vendedorUuid) : undefined,
    data: row.data,
    valor: Number(row.valor || 0),
    titulo: row.titulo || '',
    descricao: row.descricao_longa || row.descricao || undefined,
    tipoCompromisso: row.tipo_compromisso || row.tipoCompromisso || 'Investimento',
    categoriaId: categoriaId,
    categoria: row.categoria || row.categoria_nome || undefined,
    arquivosAnexos: Array.isArray(row.arquivos_anexos) ? row.arquivos_anexos : (Array.isArray(row.arquivosAnexos) ? row.arquivosAnexos : []),
    valorPago: Number(row.valor_pago || row.valorPago || 0),
    valorPendente: Number(row.valor_pendente || row.valorPendente || row.valor || 0),
    status: row.status || 'Pendente',
    dataCriacao: row.created_at || row.dataCriacao ? new Date(row.created_at || row.dataCriacao).toISOString() : new Date().toISOString(),
    criadoPor: row.criado_por || row.criadoPor || 'Sistema',
  }
}

function formatPagamento(row: any) {
  // Garantir que conta_corrente_id/compromissoId seja tratado corretamente
  // A RPC retorna como compromissoId (camelCase), mas também pode vir como conta_corrente_id (snake_case)
  const compromissoId = row.compromissoId != null && row.compromissoId !== undefined && row.compromissoId !== 'undefined'
    ? String(row.compromissoId)
    : (row.conta_corrente_id != null && row.conta_corrente_id !== undefined && row.conta_corrente_id !== 'undefined' 
      ? String(row.conta_corrente_id) 
      : '')
  
  // Garantir que categoria_id seja tratado corretamente
  const categoriaId = row.categoria_id != null && row.categoria_id !== undefined && row.categoria_id !== 'undefined'
    ? String(row.categoria_id)
    : (row.categoriaId != null && row.categoriaId !== undefined && row.categoriaId !== 'undefined' ? String(row.categoriaId) : undefined)
  
  // Garantir que dataPagamento seja tratado corretamente
  const dataPagamento = row.dataPagamento || row.data_pagamento || row.dataCriacao || row.created_at || new Date().toISOString()
  
  return {
    id: String(row.id),
    compromissoId: compromissoId,
    dataPagamento: dataPagamento,
    formaPagamento: row.formaPagamento || row.forma_pagamento || '',
    valor: Number(row.valor || row.valor_pago || 0),
    categoriaId: categoriaId,
    categoria: row.categoria || row.categoria_nome || undefined,
    arquivoComprovante: row.arquivoComprovante || row.arquivo_comprovante || undefined,
    dataCriacao: row.dataCriacao || row.created_at ? new Date(row.dataCriacao || row.created_at).toISOString() : new Date().toISOString(),
    criadoPor: row.criadoPor || row.criado_por || 'Sistema',
  }
}

serve(async (req) => {
  const startTime = Date.now()
  console.log('[CONTA-CORRENTE-V2] Request received:', { method: req.method, url: req.url })

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { ...corsHeaders, 'Access-Control-Max-Age': '86400' }
    })
  }

  try {
    // 1. AUTENTICAÇÃO
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)
    if (authError || !user) {
      return createAuthErrorResponse(authError || 'Unauthorized')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    })

    // 2. EXTRAIR PATH E PARÂMETROS
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(p => p)
    const functionIndex = pathParts.indexOf('conta-corrente-v2')
    
    // Extrair compromissoId e pagamentoId do path
    let compromissoId: string | null = null
    let pagamentoId: string | null = null
    let isPagamentosEndpoint = false
    
    if (functionIndex >= 0) {
      const afterFunction = pathParts.slice(functionIndex + 1)
      if (afterFunction.length > 0) {
        compromissoId = afterFunction[0]
        if (afterFunction[1] === 'pagamentos') {
          isPagamentosEndpoint = true
          if (afterFunction.length > 2) {
            pagamentoId = afterFunction[2]
          }
        }
      }
    }

    // Se não encontrou no path, tenta query params
    if (!compromissoId) {
      compromissoId = url.searchParams.get('id') || null
    }

    console.log('[CONTA-CORRENTE-V2] Request details:', { 
      compromissoId, 
      pagamentoId,
      isPagamentosEndpoint,
      method: req.method, 
      pathParts, 
      functionIndex,
      url: req.url,
    })

    // 3. ROTEAMENTO PARA ENDPOINTS DE PAGAMENTOS
    if (isPagamentosEndpoint && compromissoId) {
      const compromissoIdNum = parseInt(compromissoId, 10)
      if (isNaN(compromissoIdNum) || compromissoIdNum <= 0) {
        throw new Error(`ID de compromisso inválido: ${compromissoId}`)
      }

      if (req.method === 'GET') {
        // GET /conta-corrente-v2/:id/pagamentos - Listar pagamentos
        console.log('[CONTA-CORRENTE-V2] Listing pagamentos for compromisso:', compromissoIdNum)
        
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('list_pagamentos_conta_corrente_v2', {
            p_conta_corrente_id: compromissoIdNum,
            p_requesting_user_id: user.id,
          })

        if (rpcError) {
          console.error('[CONTA-CORRENTE-V2] RPC Error:', rpcError)
          throw new Error(`Database operation failed: ${rpcError.message}`)
        }

        const pagamentos = Array.isArray(rpcData) ? rpcData.map(formatPagamento) : []
        const duration = Date.now() - startTime
        return createHttpSuccessResponse(pagamentos, 200, { userId: user.id, duration: `${duration}ms` })
      }

      if (req.method === 'POST') {
        // POST /conta-corrente-v2/:id/pagamentos - Criar pagamento
        console.log('[CONTA-CORRENTE-V2] Creating pagamento for compromisso:', compromissoIdNum)
        
        const body = await req.json().catch(() => ({}))
        
        if (!body.dataPagamento && !body.data_pagamento) {
          throw new Error('dataPagamento é obrigatória')
        }
        if (!body.formaPagamento && !body.forma_pagamento && !body.formaPagamentoId && !body.forma_pagamento_id) {
          throw new Error('formaPagamento ou formaPagamentoId é obrigatório')
        }
        if (!body.valor && !body.valorPago && !body.valor_pago) {
          throw new Error('valor é obrigatório')
        }

        // Processar formaPagamentoId - pode vir como ID (número ou string) ou objeto
        let formaPagamentoId: number | null = null
        let formaPagamento: string | null = null
        
        if (body.formaPagamentoId || body.forma_pagamento_id) {
          // Se formaPagamentoId foi fornecido, usar como ID
          if (typeof body.formaPagamentoId === 'object' && body.formaPagamentoId.id) {
            formaPagamentoId = Number(body.formaPagamentoId.id)
          } else if (typeof body.forma_pagamento_id === 'object' && body.forma_pagamento_id.id) {
            formaPagamentoId = Number(body.forma_pagamento_id.id)
          } else if (typeof body.formaPagamentoId === 'string' && body.formaPagamentoId.trim() !== '') {
            formaPagamentoId = parseInt(body.formaPagamentoId.trim(), 10)
          } else if (typeof body.forma_pagamento_id === 'string' && body.forma_pagamento_id.trim() !== '') {
            formaPagamentoId = parseInt(body.forma_pagamento_id.trim(), 10)
          } else if (typeof body.formaPagamentoId === 'number') {
            formaPagamentoId = body.formaPagamentoId
          } else if (typeof body.forma_pagamento_id === 'number') {
            formaPagamentoId = body.forma_pagamento_id
          }
        } else if (body.formaPagamento || body.forma_pagamento) {
          // Se formaPagamento foi fornecido, verificar se é um número (ID) ou texto (nome)
          const formaPagamentoValue = body.formaPagamento || body.forma_pagamento
          if (typeof formaPagamentoValue === 'string') {
            const parsed = parseInt(formaPagamentoValue.trim(), 10)
            if (!isNaN(parsed) && parsed > 0) {
              // É um número, tratar como ID
              formaPagamentoId = parsed
            } else {
              // É texto, tratar como nome
              formaPagamento = formaPagamentoValue.trim()
            }
          } else if (typeof formaPagamentoValue === 'number') {
            formaPagamentoId = formaPagamentoValue
          }
        }

        // Processar categoriaId - pode vir como UUID (string) ou objeto
        let categoriaId: string | null = null
        if (body.categoriaId || body.categoria_id) {
          if (typeof body.categoriaId === 'object' && body.categoriaId.id) {
            categoriaId = String(body.categoriaId.id)
          } else if (typeof body.categoria_id === 'object' && body.categoria_id.id) {
            categoriaId = String(body.categoria_id.id)
          } else if (typeof body.categoriaId === 'string' && body.categoriaId.trim() !== '') {
            categoriaId = body.categoriaId.trim()
          } else if (typeof body.categoria_id === 'string' && body.categoria_id.trim() !== '') {
            categoriaId = body.categoria_id.trim()
          } else if (typeof body.categoriaId === 'number') {
            categoriaId = String(body.categoriaId)
          } else if (typeof body.categoria_id === 'number') {
            categoriaId = String(body.categoria_id)
          }
        }

        const { data: rpcData, error: rpcError } = await supabase
          .rpc('create_pagamento_conta_corrente_v2', {
            p_conta_corrente_id: compromissoIdNum,
            p_data_pagamento: body.dataPagamento || body.data_pagamento,
            p_forma_pagamento: formaPagamento || null,
            p_forma_pagamento_id: formaPagamentoId,
            p_valor_pago: Number(body.valor || body.valorPago || body.valor_pago || 0),
            p_categoria_id: categoriaId,
            p_arquivo_comprovante: body.arquivoComprovante || body.arquivo_comprovante || null,
            p_created_by: user.id,
          })

        if (rpcError) {
          console.error('[CONTA-CORRENTE-V2] RPC Error:', rpcError)
          throw new Error(`Database operation failed: ${rpcError.message}`)
        }

        if (!rpcData || rpcData.length === 0) {
          throw new Error('Erro ao criar pagamento')
        }

        const pagamento = formatPagamento(rpcData[0])
        const duration = Date.now() - startTime
        return createHttpSuccessResponse(pagamento, 201, { userId: user.id, duration: `${duration}ms` })
      }

      if (req.method === 'PUT' && pagamentoId) {
        // PUT /conta-corrente-v2/:id/pagamentos/:pagamentoId - Atualizar pagamento
        const pagamentoIdNum = parseInt(pagamentoId, 10)
        if (isNaN(pagamentoIdNum) || pagamentoIdNum <= 0) {
          throw new Error(`ID de pagamento inválido: ${pagamentoId}`)
        }

        console.log('[CONTA-CORRENTE-V2] Updating pagamento:', pagamentoIdNum)
        
        const body = await req.json().catch(() => ({}))

        // Processar formaPagamentoId - pode vir como ID (número ou string) ou objeto
        let formaPagamentoId: number | null | undefined = undefined
        let formaPagamento: string | null = null
        
        if (body.formaPagamentoId !== undefined || body.forma_pagamento_id !== undefined) {
          // Se formaPagamentoId foi fornecido explicitamente
          if (body.formaPagamentoId === null || body.forma_pagamento_id === null) {
            formaPagamentoId = null
          } else if (typeof body.formaPagamentoId === 'object' && body.formaPagamentoId.id) {
            formaPagamentoId = Number(body.formaPagamentoId.id)
          } else if (typeof body.forma_pagamento_id === 'object' && body.forma_pagamento_id.id) {
            formaPagamentoId = Number(body.forma_pagamento_id.id)
          } else if (typeof body.formaPagamentoId === 'string' && body.formaPagamentoId.trim() !== '') {
            formaPagamentoId = parseInt(body.formaPagamentoId.trim(), 10)
          } else if (typeof body.forma_pagamento_id === 'string' && body.forma_pagamento_id.trim() !== '') {
            formaPagamentoId = parseInt(body.forma_pagamento_id.trim(), 10)
          } else if (typeof body.formaPagamentoId === 'number') {
            formaPagamentoId = body.formaPagamentoId
          } else if (typeof body.forma_pagamento_id === 'number') {
            formaPagamentoId = body.forma_pagamento_id
          }
        } else if (body.formaPagamento !== undefined || body.forma_pagamento !== undefined) {
          // Se formaPagamento foi fornecido, verificar se é um número (ID) ou texto (nome)
          const formaPagamentoValue = body.formaPagamento || body.forma_pagamento
          if (formaPagamentoValue === null) {
            formaPagamento = null
          } else if (typeof formaPagamentoValue === 'string') {
            const parsed = parseInt(formaPagamentoValue.trim(), 10)
            if (!isNaN(parsed) && parsed > 0) {
              // É um número, tratar como ID
              formaPagamentoId = parsed
            } else {
              // É texto, tratar como nome
              formaPagamento = formaPagamentoValue.trim()
            }
          } else if (typeof formaPagamentoValue === 'number') {
            formaPagamentoId = formaPagamentoValue
          }
        }

        // Processar categoriaId - pode vir como UUID (string) ou objeto
        let categoriaId: string | null = null
        if (body.categoriaId !== undefined || body.categoria_id !== undefined) {
          if (body.categoriaId === null || body.categoria_id === null) {
            categoriaId = null
          } else if (typeof body.categoriaId === 'object' && body.categoriaId.id) {
            categoriaId = String(body.categoriaId.id)
          } else if (typeof body.categoria_id === 'object' && body.categoria_id.id) {
            categoriaId = String(body.categoria_id.id)
          } else if (typeof body.categoriaId === 'string' && body.categoriaId.trim() !== '') {
            categoriaId = body.categoriaId.trim()
          } else if (typeof body.categoria_id === 'string' && body.categoria_id.trim() !== '') {
            categoriaId = body.categoria_id.trim()
          } else if (typeof body.categoriaId === 'number') {
            categoriaId = String(body.categoriaId)
          } else if (typeof body.categoria_id === 'number') {
            categoriaId = String(body.categoria_id)
          }
        }

        const { data: rpcData, error: rpcError } = await supabase
          .rpc('update_pagamento_conta_corrente_v2', {
            p_id: pagamentoIdNum,
            p_data_pagamento: body.dataPagamento || body.data_pagamento || null,
            p_forma_pagamento: formaPagamento !== undefined ? formaPagamento : null,
            p_forma_pagamento_id: formaPagamentoId,
            p_valor_pago: body.valor || body.valorPago || body.valor_pago ? Number(body.valor || body.valorPago || body.valor_pago) : null,
            p_categoria_id: categoriaId,
            p_arquivo_comprovante: body.arquivoComprovante || body.arquivo_comprovante || null,
            p_updated_by: user.id,
          })

        if (rpcError) {
          console.error('[CONTA-CORRENTE-V2] RPC Error:', rpcError)
          throw new Error(`Database operation failed: ${rpcError.message}`)
        }

        if (!rpcData || rpcData.length === 0) {
          throw new Error('Pagamento não encontrado')
        }

        const pagamento = formatPagamento(rpcData[0])
        const duration = Date.now() - startTime
        return createHttpSuccessResponse(pagamento, 200, { userId: user.id, duration: `${duration}ms` })
      }

      if (req.method === 'DELETE' && pagamentoId) {
        // DELETE /conta-corrente-v2/:id/pagamentos/:pagamentoId - Excluir pagamento
        const pagamentoIdNum = parseInt(pagamentoId, 10)
        if (isNaN(pagamentoIdNum) || pagamentoIdNum <= 0) {
          throw new Error(`ID de pagamento inválido: ${pagamentoId}`)
        }

        console.log('[CONTA-CORRENTE-V2] Deleting pagamento:', pagamentoIdNum)

        const { error: deleteError } = await supabase
          .rpc('delete_pagamento_conta_corrente_v2', {
            p_id: pagamentoIdNum,
            p_deleted_by: user.id,
          })

        if (deleteError) {
          console.error('[CONTA-CORRENTE-V2] RPC Error:', deleteError)
          throw new Error(`Database operation failed: ${deleteError.message}`)
        }

        const duration = Date.now() - startTime
        return createHttpSuccessResponse(
          { success: true, message: 'Pagamento excluído com sucesso' },
          200,
          { userId: user.id, duration: `${duration}ms` }
        )
      }
    }

    // 4. ROTEAMENTO PARA ENDPOINTS DE COMPROMISSOS
    if (req.method === 'GET') {
      if (compromissoId) {
        // GET /conta-corrente-v2/:id - Buscar por ID
        console.log('[CONTA-CORRENTE-V2] Getting compromisso by ID:', compromissoId)
        
        const compromissoIdNum = parseInt(compromissoId, 10)
        if (isNaN(compromissoIdNum) || compromissoIdNum <= 0) {
          throw new Error(`ID inválido: ${compromissoId}`)
        }

        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_conta_corrente_v2', {
            p_id: compromissoIdNum,
            p_requesting_user_id: user.id,
          })

        if (rpcError) {
          console.error('[CONTA-CORRENTE-V2] RPC Error:', rpcError)
          throw new Error(`Database operation failed: ${rpcError.message}`)
        }

        if (!rpcData || !rpcData.compromisso) {
          throw new Error('Compromisso não encontrado')
        }

        const compromisso = formatCompromisso(rpcData.compromisso)
        const pagamentos = Array.isArray(rpcData.pagamentos) 
          ? rpcData.pagamentos.map(formatPagamento) 
          : []

        const duration = Date.now() - startTime
        return createHttpSuccessResponse(
          { compromisso, pagamentos },
          200,
          { userId: user.id, duration: `${duration}ms` }
        )
      } else {
        // GET /conta-corrente-v2 - Listar todos
        console.log('[CONTA-CORRENTE-V2] Listing compromissos...')
        
        const dataInicio = url.searchParams.get('dataInicio') || url.searchParams.get('data_inicio') || null
        const dataFim = url.searchParams.get('dataFim') || url.searchParams.get('data_fim') || null
        const clienteId = url.searchParams.get('cliente') || url.searchParams.get('cliente_id') 
          ? parseInt(url.searchParams.get('cliente') || url.searchParams.get('cliente_id') || '0', 10) 
          : null
        const tipoCompromisso = url.searchParams.get('tipo') || url.searchParams.get('tipo_compromisso') || null
        const status = url.searchParams.get('status') || null
        const grupoRedeId = url.searchParams.get('grupoRede') || url.searchParams.get('grupo_rede_id') || null
        const busca = url.searchParams.get('busca') || url.searchParams.get('search') || null
        const page = parseInt(url.searchParams.get('page') || '1', 10)
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 100)

        console.log('[CONTA-CORRENTE-V2] Calling RPC with params:', {
          p_requesting_user_id: user.id,
          p_data_inicio: dataInicio,
          p_data_fim: dataFim,
          p_cliente_id: clienteId,
          p_tipo_compromisso: tipoCompromisso,
          p_status: status,
          p_grupo_rede_id: grupoRedeId,
          p_busca: busca,
          p_page: page,
          p_limit: limit,
        })

        const { data: rpcData, error: rpcError } = await supabase
          .rpc('list_conta_corrente_v2', {
            p_requesting_user_id: user.id,
            p_data_inicio: dataInicio,
            p_data_fim: dataFim,
            p_cliente_id: clienteId,
            p_tipo_compromisso: tipoCompromisso,
            p_status: status,
            p_grupo_rede_id: grupoRedeId,
            p_busca: busca,
            p_page: page,
            p_limit: limit,
          })

        if (rpcError) {
          console.error('[CONTA-CORRENTE-V2] RPC Error:', rpcError)
          throw new Error(`Database operation failed: ${rpcError.message}`)
        }

        if (!rpcData) {
          throw new Error('No data returned from database')
        }

        const compromissos = Array.isArray(rpcData.compromissos) 
          ? rpcData.compromissos.map(formatCompromisso)
          : []

        const duration = Date.now() - startTime
        console.log('[CONTA-CORRENTE-V2] Returning response:', {
          compromissos: compromissos.length,
          pagination: rpcData.pagination,
          estatisticas: rpcData.estatisticas,
          duration: `${duration}ms`,
        })
        return createHttpSuccessResponse(
          {
            compromissos,
            pagination: rpcData.pagination,
            estatisticas: rpcData.estatisticas,
          },
          200,
          { userId: user.id, duration: `${duration}ms` }
        )
      }
    }

    if (req.method === 'POST') {
      // POST /conta-corrente-v2 - Criar novo compromisso
      console.log('[CONTA-CORRENTE-V2] Creating compromisso...')
      
      const body = await req.json().catch(() => ({}))
      
      // Validações básicas
      if (!body.clienteId && !body.cliente_id) {
        throw new Error('clienteId é obrigatório')
      }
      if (!body.data && !body.dataCompromisso && !body.data_compromisso) {
        throw new Error('data é obrigatória')
      }
      if (!body.valor || (body.valor && Number(body.valor) <= 0)) {
        throw new Error('valor deve ser maior que zero')
      }
      if (!body.titulo) {
        throw new Error('titulo é obrigatório')
      }
      if (!body.tipoCompromisso && !body.tipo_compromisso) {
        throw new Error('tipoCompromisso é obrigatório')
      }

      const tipoCompromisso = (body.tipoCompromisso || body.tipo_compromisso || '').toLowerCase()
      if (tipoCompromisso !== 'investimento' && tipoCompromisso !== 'ressarcimento') {
        throw new Error('tipoCompromisso deve ser "investimento" ou "ressarcimento"')
      }

      // Processar categoriaId - pode vir como UUID (string) ou objeto
      let categoriaId: string | null = null
      if (body.categoriaId || body.categoria_id) {
        if (typeof body.categoriaId === 'object' && body.categoriaId.id) {
          categoriaId = String(body.categoriaId.id)
        } else if (typeof body.categoria_id === 'object' && body.categoria_id.id) {
          categoriaId = String(body.categoria_id.id)
        } else if (typeof body.categoriaId === 'string' && body.categoriaId.trim() !== '') {
          categoriaId = body.categoriaId.trim()
        } else if (typeof body.categoria_id === 'string' && body.categoria_id.trim() !== '') {
          categoriaId = body.categoria_id.trim()
        } else if (typeof body.categoriaId === 'number') {
          categoriaId = String(body.categoriaId)
        } else if (typeof body.categoria_id === 'number') {
          categoriaId = String(body.categoria_id)
        }
      }

      const { data: rpcData, error: rpcError } = await supabase
        .rpc('create_conta_corrente_v2', {
          p_cliente_id: parseInt(String(body.clienteId || body.cliente_id), 10),
          p_data: body.data || body.dataCompromisso || body.data_compromisso,
          p_valor: Number(body.valor),
          p_titulo: body.titulo,
          p_tipo_compromisso: tipoCompromisso,
          p_categoria_id: categoriaId,
          p_descricao_longa: body.descricao || body.descricaoLonga || body.descricao_longa || null,
          p_vendedor_uuid: body.vendedorUuid || body.vendedor_uuid || null,
          p_arquivos_anexos: Array.isArray(body.arquivosAnexos || body.arquivos_anexos) 
            ? body.arquivosAnexos || body.arquivos_anexos 
            : [],
          p_created_by: user.id,
        })

      if (rpcError) {
        console.error('[CONTA-CORRENTE-V2] RPC Error:', rpcError)
        throw new Error(`Database operation failed: ${rpcError.message}`)
      }

      if (!rpcData || rpcData.length === 0) {
        throw new Error('Erro ao criar compromisso')
      }

      const compromisso = formatCompromisso(rpcData[0])
      const duration = Date.now() - startTime
      return createHttpSuccessResponse(compromisso, 201, { userId: user.id, duration: `${duration}ms` })
    }

    if (req.method === 'PUT') {
      // PUT /conta-corrente-v2/:id - Atualizar compromisso
      if (!compromissoId) {
        throw new Error('ID é obrigatório para atualização')
      }

      const compromissoIdNum = parseInt(compromissoId, 10)
      if (isNaN(compromissoIdNum) || compromissoIdNum <= 0) {
        throw new Error(`ID inválido: ${compromissoId}`)
      }

      console.log('[CONTA-CORRENTE-V2] Updating compromisso:', compromissoIdNum)
      
      const body = await req.json().catch(() => ({}))

      // Validar tipo_compromisso se fornecido
      if (body.tipoCompromisso || body.tipo_compromisso) {
        const tipoCompromisso = (body.tipoCompromisso || body.tipo_compromisso || '').toLowerCase()
        if (tipoCompromisso !== 'investimento' && tipoCompromisso !== 'ressarcimento') {
          throw new Error('tipoCompromisso deve ser "investimento" ou "ressarcimento"')
        }
      }

      // Processar categoriaId - pode vir como UUID (string) ou objeto
      let categoriaId: string | null = null
      if (body.categoriaId !== undefined || body.categoria_id !== undefined) {
        if (body.categoriaId === null || body.categoria_id === null) {
          categoriaId = null
        } else if (typeof body.categoriaId === 'object' && body.categoriaId.id) {
          categoriaId = String(body.categoriaId.id)
        } else if (typeof body.categoria_id === 'object' && body.categoria_id.id) {
          categoriaId = String(body.categoria_id.id)
        } else if (typeof body.categoriaId === 'string' && body.categoriaId.trim() !== '') {
          categoriaId = body.categoriaId.trim()
        } else if (typeof body.categoria_id === 'string' && body.categoria_id.trim() !== '') {
          categoriaId = body.categoria_id.trim()
        } else if (typeof body.categoriaId === 'number') {
          categoriaId = String(body.categoriaId)
        } else if (typeof body.categoria_id === 'number') {
          categoriaId = String(body.categoria_id)
        }
      }

      const { data: rpcData, error: rpcError } = await supabase
        .rpc('update_conta_corrente_v2', {
          p_id: compromissoIdNum,
          p_data: body.data || body.dataCompromisso || body.data_compromisso || null,
          p_valor: body.valor ? Number(body.valor) : null,
          p_titulo: body.titulo || null,
          p_descricao_longa: body.descricao || body.descricaoLonga || body.descricao_longa || null,
          p_tipo_compromisso: body.tipoCompromisso || body.tipo_compromisso || null,
          p_categoria_id: categoriaId,
          p_arquivos_anexos: body.arquivosAnexos || body.arquivos_anexos || null,
          p_updated_by: user.id,
        })

      if (rpcError) {
        console.error('[CONTA-CORRENTE-V2] RPC Error:', rpcError)
        throw new Error(`Database operation failed: ${rpcError.message}`)
      }

      if (!rpcData || rpcData.length === 0) {
        throw new Error('Compromisso não encontrado')
      }

      const compromisso = formatCompromisso(rpcData[0])
      const duration = Date.now() - startTime
      return createHttpSuccessResponse(compromisso, 200, { userId: user.id, duration: `${duration}ms` })
    }

    if (req.method === 'DELETE') {
      // DELETE /conta-corrente-v2/:id - Excluir compromisso
      // Nota: A tabela não possui deleted_at, então DELETE físico não é recomendado
      // Por enquanto, retornamos erro informando que não está implementado
      throw new Error('Exclusão de compromisso não está implementada. A tabela não possui campo deleted_at.')
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return formatErrorResponse(error)
  }
})
