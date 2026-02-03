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
  console.error('[PEDIDO-VENDA-V2] Error:', { message: errorMessage, statusCode })
  return new Response(
    JSON.stringify({ success: false, error: errorMessage, timestamp: new Date().toISOString() }),
    { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

serve(async (req) => {
  const startTime = Date.now()
  console.log('[PEDIDO-VENDA-V2] Request received:', { method: req.method, url: req.url })

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

    // 2. EXTRAIR ID DO PATH
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(p => p)
    const functionIndex = pathParts.indexOf('pedido-venda-v2')
    const pedidoId = functionIndex >= 0 && functionIndex < pathParts.length - 1
      ? pathParts[functionIndex + 1]
      : url.searchParams.get('id')

    console.log('[PEDIDO-VENDA-V2] Request details:', { 
      pedidoId, 
      method: req.method, 
      pathParts, 
      functionIndex,
      url: req.url,
      pathname: url.pathname
    })

    // 3. ROTEAMENTO POR MÉTODO
    if (req.method === 'GET') {
      if (pedidoId) {
        // GET /pedido-venda-v2/:id - Buscar por ID
        console.log('[PEDIDO-VENDA-V2] Getting pedido by ID:', pedidoId)
        
        const pedidoIdNum = parseInt(pedidoId, 10)
        if (isNaN(pedidoIdNum) || pedidoIdNum <= 0) {
          throw new Error(`ID inválido: ${pedidoId}`)
        }

        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_pedido_venda_v2', {
            p_pedido_id: pedidoIdNum,
            p_requesting_user_id: user.id,
          })

        if (rpcError) {
          console.error('[PEDIDO-VENDA-V2] RPC Error:', rpcError)
          throw new Error(`Database operation failed: ${rpcError.message}`)
        }

        if (!rpcData || !rpcData.pedido) {
          throw new Error('Pedido não encontrado')
        }

        const duration = Date.now() - startTime
        return createHttpSuccessResponse(rpcData, 200, { userId: user.id, duration: `${duration}ms` })
      } else {
        // GET /pedido-venda-v2 - Listar todos
        console.log('[PEDIDO-VENDA-V2] Listing pedidos...')
        
        const search = url.searchParams.get('search') || null
        // Converter "all" para null, pois a RPC espera null quando não há filtro
        const statusParam = url.searchParams.get('status')
        const status = (statusParam && statusParam !== 'all') ? statusParam : null
        const vendedorId = url.searchParams.get('vendedor') || null
        const clienteId = url.searchParams.get('cliente') ? parseInt(url.searchParams.get('cliente')!, 10) : null
        const dataInicio = url.searchParams.get('dataInicio') || null
        const dataFim = url.searchParams.get('dataFim') || null
        const page = parseInt(url.searchParams.get('page') || '1', 10)
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 100)

        console.log('[PEDIDO-VENDA-V2] Calling RPC with params:', {
          p_requesting_user_id: user.id,
          p_search: search,
          p_status: status,
          p_vendedor_id: vendedorId,
          p_cliente_id: clienteId,
          p_data_inicio: dataInicio,
          p_data_fim: dataFim,
          p_page: page,
          p_limit: limit,
        })

        const { data: rpcData, error: rpcError } = await supabase
          .rpc('list_pedido_venda_v2', {
            p_requesting_user_id: user.id,
            p_search: search,
            p_status: status,
            p_vendedor_id: vendedorId,
            p_cliente_id: clienteId,
            p_data_inicio: dataInicio,
            p_data_fim: dataFim,
            p_page: page,
            p_limit: limit,
          })

        console.log('[PEDIDO-VENDA-V2] RPC Response:', {
          hasData: !!rpcData,
          dataKeys: rpcData ? Object.keys(rpcData) : [],
          pedidosCount: rpcData?.pedidos ? (Array.isArray(rpcData.pedidos) ? rpcData.pedidos.length : 'not array') : 'no pedidos',
          pagination: rpcData?.pagination,
          stats: rpcData?.stats,
        })

        if (rpcError) {
          console.error('[PEDIDO-VENDA-V2] RPC Error:', rpcError)
          throw new Error(`Database operation failed: ${rpcError.message}`)
        }

        if (!rpcData) {
          console.error('[PEDIDO-VENDA-V2] RPC returned null/undefined data')
          throw new Error('No data returned from database')
        }

        const duration = Date.now() - startTime
        console.log('[PEDIDO-VENDA-V2] Returning response:', {
          pedidos: rpcData.pedidos ? (Array.isArray(rpcData.pedidos) ? rpcData.pedidos.length : 'not array') : 'no pedidos',
          pagination: rpcData.pagination,
          duration: `${duration}ms`,
        })
        return createHttpSuccessResponse(rpcData, 200, { userId: user.id, duration: `${duration}ms` })
      }
    }

    if (req.method === 'POST') {
      // POST /pedido-venda-v2 - Criar novo pedido
      console.log('[PEDIDO-VENDA-V2] Creating pedido...')
      
      const body = await req.json().catch(() => ({}))
      
      // Validações básicas
      if (!body.clienteId && !body.cliente_id) {
        throw new Error('clienteId é obrigatório')
      }
      if (!body.vendedorId && !body.vendedor_id) {
        throw new Error('vendedorId é obrigatório')
      }
      if (!body.naturezaOperacao && !body.natureza_operacao) {
        throw new Error('naturezaOperacao é obrigatória')
      }

      // Preparar produtos para JSONB
      let produtosJsonb = null
      if (body.produtos && Array.isArray(body.produtos) && body.produtos.length > 0) {
        produtosJsonb = body.produtos.map((p: any) => ({
          produtoId: p.produtoId || p.produto_id,
          numero: p.numero || 1,
          descricaoProduto: p.descricaoProduto || p.descricao || '',
          codigoSku: p.codigoSku || p.codigo_sku || '',
          codigoEan: p.codigoEan || p.codigo_ean || null,
          valorTabela: p.valorTabela || p.valor_tabela || 0,
          percentualDesconto: p.percentualDesconto || p.percentual_desconto || 0,
          valorUnitario: p.valorUnitario || p.valor_unitario || 0,
          quantidade: p.quantidade || 0,
          subtotal: p.subtotal || 0,
          pesoBruto: p.pesoBruto || p.peso_bruto || 0,
          pesoLiquido: p.pesoLiquido || p.peso_liquido || 0,
          unidade: p.unidade || '',
        }))
      }

      const { data: rpcData, error: rpcError } = await supabase
        .rpc('create_pedido_venda_v2', {
          p_cliente_id: parseInt(String(body.clienteId || body.cliente_id), 10),
          p_vendedor_uuid: body.vendedorId || body.vendedor_id,
          p_natureza_operacao: body.naturezaOperacao || body.natureza_operacao,
          p_numero_pedido: body.numero || body.numeroPedido || null,
          p_empresa_faturamento_id: body.empresaFaturamentoId || body.empresa_faturamento_id ? parseInt(String(body.empresaFaturamentoId || body.empresa_faturamento_id), 10) : null,
          p_lista_preco_id: body.listaPrecoId || body.lista_preco_id ? parseInt(String(body.listaPrecoId || body.lista_preco_id), 10) : null,
          p_percentual_desconto_padrao: body.percentualDescontoPadrao ?? body.percentual_desconto_padrao ?? 0,
          p_id_condicao: body.condicaoPagamentoId || body.condicao_pagamento_id ? parseInt(String(body.condicaoPagamentoId || body.condicao_pagamento_id), 10) : null,
          p_ordem_cliente: body.ordemCompraCliente || body.ordem_cliente || null,
          p_observacao: body.observacoesNotaFiscal || body.observacao || null,
          p_observacao_interna: body.observacoesInternas || body.observacao_interna || null,
          p_data_venda: body.dataPedido || body.data_venda || null,
          p_status: body.status || 'Rascunho',
          p_valor_total: body.valorPedido ?? body.valor_total ?? 0,
          p_valor_total_produtos: body.valorTotalProdutos ?? body.valor_total_produtos ?? 0,
          p_percentual_desconto_extra: body.percentualDescontoExtra ?? body.percentual_desconto_extra ?? 0,
          p_valor_desconto_extra: body.valorDescontoExtra ?? body.valor_desconto_extra ?? 0,
          p_total_quantidades: body.totalQuantidades ?? body.total_quantidades ?? 0,
          p_total_itens: body.totalItens ?? body.total_itens ?? 0,
          p_peso_bruto_total: body.pesoBrutoTotal ?? body.peso_bruto_total ?? 0,
          p_peso_liquido_total: body.pesoLiquidoTotal ?? body.peso_liquido_total ?? 0,
          p_produtos: produtosJsonb,
          p_created_by: user.id,
        })

      if (rpcError) {
        console.error('[PEDIDO-VENDA-V2] RPC Error:', rpcError)
        throw new Error(`Database operation failed: ${rpcError.message}`)
      }

      if (!rpcData || !rpcData.pedido) {
        throw new Error('Erro ao criar pedido')
      }

      const duration = Date.now() - startTime
      return createHttpSuccessResponse(rpcData, 201, { userId: user.id, duration: `${duration}ms` })
    }

    if (req.method === 'PUT') {
      // PUT /pedido-venda-v2/:id - Atualizar pedido
      const id = pedidoId || (await req.json().catch(() => ({}))).id
      if (!id) {
        throw new Error('ID é obrigatório para atualização')
      }

      const pedidoIdNum = parseInt(String(id), 10)
      if (isNaN(pedidoIdNum) || pedidoIdNum <= 0) {
        throw new Error(`ID inválido: ${id}`)
      }

      console.log('[PEDIDO-VENDA-V2] Updating pedido:', pedidoIdNum)
      
      const body = await req.json().catch(() => ({}))

      // Preparar produtos para JSONB (se fornecidos)
      let produtosJsonb = undefined
      if (body.produtos && Array.isArray(body.produtos)) {
        if (body.produtos.length === 0) {
          produtosJsonb = []
        } else {
          produtosJsonb = body.produtos.map((p: any) => ({
            produtoId: p.produtoId || p.produto_id,
            numero: p.numero || 1,
            descricaoProduto: p.descricaoProduto || p.descricao || '',
            codigoSku: p.codigoSku || p.codigo_sku || '',
            codigoEan: p.codigoEan || p.codigo_ean || null,
            valorTabela: p.valorTabela || p.valor_tabela || 0,
            percentualDesconto: p.percentualDesconto || p.percentual_desconto || 0,
            valorUnitario: p.valorUnitario || p.valor_unitario || 0,
            quantidade: p.quantidade || 0,
            subtotal: p.subtotal || 0,
            pesoBruto: p.pesoBruto || p.peso_bruto || 0,
            pesoLiquido: p.pesoLiquido || p.peso_liquido || 0,
            unidade: p.unidade || '',
          }))
        }
      }

      const { data: rpcData, error: rpcError } = await supabase
        .rpc('update_pedido_venda_v2', {
          p_pedido_id: pedidoIdNum,
          p_cliente_id: body.clienteId || body.cliente_id ? parseInt(String(body.clienteId || body.cliente_id), 10) : null,
          p_vendedor_uuid: body.vendedorId || body.vendedor_id || null,
          p_numero_pedido: body.numero || body.numeroPedido || null,
          p_natureza_operacao: body.naturezaOperacao || body.natureza_operacao || null,
          p_empresa_faturamento_id: body.empresaFaturamentoId || body.empresa_faturamento_id ? parseInt(String(body.empresaFaturamentoId || body.empresa_faturamento_id), 10) : null,
          p_lista_preco_id: body.listaPrecoId || body.lista_preco_id ? parseInt(String(body.listaPrecoId || body.lista_preco_id), 10) : null,
          p_percentual_desconto_padrao: body.percentualDescontoPadrao ?? body.percentual_desconto_padrao ?? null,
          p_id_condicao: body.condicaoPagamentoId || body.condicao_pagamento_id ? parseInt(String(body.condicaoPagamentoId || body.condicao_pagamento_id), 10) : null,
          p_ordem_cliente: body.ordemCompraCliente || body.ordem_cliente || null,
          p_observacao: body.observacoesNotaFiscal || body.observacao || null,
          p_observacao_interna: body.observacoesInternas || body.observacao_interna || null,
          p_data_venda: body.dataPedido || body.data_venda || null,
          p_status: body.status || null,
          p_valor_total: body.valorPedido ?? body.valor_total ?? null,
          p_valor_total_produtos: body.valorTotalProdutos ?? body.valor_total_produtos ?? null,
          p_percentual_desconto_extra: body.percentualDescontoExtra ?? body.percentual_desconto_extra ?? null,
          p_valor_desconto_extra: body.valorDescontoExtra ?? body.valor_desconto_extra ?? null,
          p_total_quantidades: body.totalQuantidades ?? body.total_quantidades ?? null,
          p_total_itens: body.totalItens ?? body.total_itens ?? null,
          p_peso_bruto_total: body.pesoBrutoTotal ?? body.peso_bruto_total ?? null,
          p_peso_liquido_total: body.pesoLiquidoTotal ?? body.peso_liquido_total ?? null,
          p_produtos: produtosJsonb,
          p_updated_by: user.id,
        })

      if (rpcError) {
        console.error('[PEDIDO-VENDA-V2] RPC Error:', rpcError)
        throw new Error(`Database operation failed: ${rpcError.message}`)
      }

      if (!rpcData || !rpcData.pedido) {
        throw new Error('Pedido não encontrado')
      }

      const duration = Date.now() - startTime
      return createHttpSuccessResponse(rpcData, 200, { userId: user.id, duration: `${duration}ms` })
    }

    if (req.method === 'DELETE') {
      // DELETE /pedido-venda-v2/:id - Excluir pedido
      const id = pedidoId || url.searchParams.get('id')
      if (!id) {
        throw new Error('ID é obrigatório para exclusão')
      }

      const pedidoIdNum = parseInt(String(id), 10)
      if (isNaN(pedidoIdNum) || pedidoIdNum <= 0) {
        throw new Error(`ID inválido: ${id}`)
      }

      console.log('[PEDIDO-VENDA-V2] Deleting pedido:', pedidoIdNum)

      const { error: deleteError } = await supabase
        .rpc('delete_pedido_venda_v2', {
          p_pedido_id: pedidoIdNum,
          p_deleted_by: user.id,
        })

      if (deleteError) {
        console.error('[PEDIDO-VENDA-V2] RPC Error:', deleteError)
        throw new Error(`Database operation failed: ${deleteError.message}`)
      }

      const duration = Date.now() - startTime
      return createHttpSuccessResponse(
        { success: true, message: 'Pedido excluído com sucesso' },
        200,
        { userId: user.id, duration: `${duration}ms` }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return formatErrorResponse(error)
  }
})
