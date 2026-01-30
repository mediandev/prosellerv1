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
  } catch {
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

function formatErrorResponse(error: unknown): Response {
  let statusCode = 500
  let errorMessage = 'Internal server error'
  if (error instanceof Error) {
    errorMessage = error.message
    if (error.message.includes('Unauthorized') || error.message.includes('authentication')) statusCode = 401
    else if (error.message.includes('permission') || error.message.includes('forbidden')) statusCode = 403
    else if (error.message.includes('not found') || error.message.includes('não encontrado')) statusCode = 404
    else if (error.message.includes('validation') || error.message.includes('invalid') || error.message.includes('obrigatório')) statusCode = 400
  }
  console.error('[CLIENTES-V2] Error:', { message: errorMessage, statusCode })
  return new Response(
    JSON.stringify({ success: false, error: errorMessage, timestamp: new Date().toISOString() }),
    { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function mapClienteListItem(row: Record<string, unknown>): Record<string, unknown> {
  const id = row.cliente_id ?? row.id
  const statusAprovacao = row.status_aprovacao ?? row.statusAprovacao ?? 'pendente'
  let situacao = (row as any).situacao ?? 'Análise'
  if (statusAprovacao === 'aprovado') situacao = 'Ativo'
  else if (statusAprovacao === 'rejeitado') situacao = 'Reprovado'
  else if (statusAprovacao === 'pendente') situacao = 'Análise'
  return {
    id: id != null ? String(id) : '',
    razaoSocial: row.nome ?? row.razaoSocial ?? '',
    nomeFantasia: row.nome_fantasia ?? row.nomeFantasia ?? '',
    cpfCnpj: row.cpf_cnpj ?? row.cpfCnpj ?? '',
    codigo: row.codigo ?? '',
    statusAprovacao,
    situacao,
    segmentoId: row.segmento_id != null ? String(row.segmento_id) : undefined,
    segmentoMercado: row.segmento_nome ?? row.tipo_segmento ?? row.segmentoMercado ?? row.grupo_rede ?? '',
    grupoRede: row.grupo_rede ?? row.grupoRede ?? '',
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  }
}

function mapClienteCompleto(rpc: {
  cliente?: Record<string, unknown>
  contato?: Record<string, unknown> | null
  endereco?: Record<string, unknown> | null
  vendedores?: unknown[]
  condicoes_cliente?: unknown[]
  conta_corrente_cliente?: unknown[]
}): Record<string, unknown> {
  const c = rpc.cliente ?? {}
  const statusAprovacao = (c as any).status_aprovacao ?? (c as any).statusAprovacao ?? 'pendente'
  let situacao = (c as any).situacao ?? 'Análise'
  if (statusAprovacao === 'aprovado') situacao = 'Ativo'
  else if (statusAprovacao === 'rejeitado') situacao = 'Reprovado'
  else if (statusAprovacao === 'pendente') situacao = 'Análise'

  const contato = rpc.contato ?? {}
  const endereco = rpc.endereco ?? {}
  const vendedores = Array.isArray(rpc.vendedores) ? rpc.vendedores : []
  const vendedorAtribuido = vendedores[0] as Record<string, unknown> | undefined

  return {
    id: (c as any).cliente_id != null ? String((c as any).cliente_id) : (c as any).id,
    razaoSocial: (c as any).nome ?? (c as any).razaoSocial ?? '',
    nomeFantasia: (c as any).nome_fantasia ?? (c as any).nomeFantasia ?? '',
    cpfCnpj: (c as any).cpf_cnpj ?? (c as any).cpfCnpj ?? '',
    codigo: (c as any).codigo ?? '',
    inscricaoEstadual: (c as any).inscricao_estadual ?? (c as any).inscricaoEstadual ?? '',
    statusAprovacao,
    situacao,
    segmentoId: (c as any).segmento_id != null ? String((c as any).segmento_id) : undefined,
    segmentoMercado: (c as any).segmento_nome ?? (c as any).tipo_segmento ?? (c as any).segmentoMercado ?? '',
    grupoRede: (c as any).grupo_rede ?? (c as any).grupoRede ?? '',
    observacoesInternas: (c as any).observacao_interna ?? (c as any).observacoesInternas ?? '',
    listaPrecos: (c as any).lista_de_preco != null ? String((c as any).lista_de_preco) : (c as any).listaPrecos ?? '',
    descontoPadrao: Number((c as any).desconto ?? (c as any).descontoPadrao ?? 0),
    descontoFinanceiro: Number((c as any).desconto_financeiro ?? (c as any).descontoFinanceiro ?? 0),
    pedidoMinimo: Number((c as any).pedido_minimo ?? (c as any).pedidoMinimo ?? 0),
    condicoesPagamentoAssociadas: Array.isArray((c as any).condicoesdisponiveis) ? (c as any).condicoesdisponiveis.map((x: unknown) => String(x)) : [],
    vendedoresAtribuidos: vendedores.map((v: any) => ({ id: v.user_id ?? v.id, nome: v.nome ?? '', email: v.email ?? '' })),
    vendedorAtribuido: vendedorAtribuido ? { id: (vendedorAtribuido as any).user_id ?? (vendedorAtribuido as any).id, nome: (vendedorAtribuido as any).nome ?? '', email: (vendedorAtribuido as any).email ?? '' } : undefined,
    contato: {
      emailPrincipal: (contato as any).email ?? '',
      emailNFe: (contato as any).email_nf ?? '',
      telefoneFixoPrincipal: (contato as any).telefone ?? '',
      telefoneCelularPrincipal: (contato as any).telefone_adicional ?? '',
      site: (contato as any).website ?? '',
    },
    endereco: {
      cep: (endereco as any).cep ?? '',
      logradouro: (endereco as any).rua ?? (endereco as any).logradouro ?? '',
      numero: (endereco as any).numero ?? '',
      complemento: (endereco as any).complemento ?? '',
      bairro: (endereco as any).bairro ?? '',
      uf: (endereco as any).uf ?? '',
      municipio: (endereco as any).cidade ?? (endereco as any).municipio ?? '',
    },
    condicoesCliente: rpc.condicoes_cliente ?? [],
    contaCorrenteCliente: rpc.conta_corrente_cliente ?? [],
    createdAt: (c as any).created_at ?? (c as any).createdAt,
    updatedAt: (c as any).updated_at ?? (c as any).updatedAt,
  }
}

serve(async (req) => {
  const startTime = Date.now()
  console.log('[CLIENTES-V2] Request:', { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsHeaders, 'Access-Control-Max-Age': '86400' } })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)
    if (authError || !user) {
      return createAuthErrorResponse(authError ?? 'Unauthorized')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    })

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter((p) => p)
    const functionIndex = pathParts.indexOf('clientes-v2')
    const clienteId = functionIndex >= 0 && functionIndex < pathParts.length - 1
      ? pathParts[functionIndex + 1]
      : url.searchParams.get('id')

    if (req.method === 'GET') {
      if (clienteId) {
        const idNum = parseInt(clienteId, 10)
        if (isNaN(idNum) || idNum <= 0) throw new Error('ID inválido')
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_cliente_completo_v2', {
          p_cliente_id: idNum,
          p_requesting_user_id: user.id,
        })
        if (rpcError) throw new Error(rpcError.message)
        if (!rpcData) throw new Error('Cliente não encontrado')
        const mapped = mapClienteCompleto(rpcData as any)
        const duration = Date.now() - startTime
        return createHttpSuccessResponse(mapped, 200, { userId: user.id, duration: `${duration}ms` })
      }

      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
      const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10)))
      const search = url.searchParams.get('search') || null
      const statusAprovacao = url.searchParams.get('status_aprovacao') || null
      const vendedor = url.searchParams.get('vendedor') || null

      const { data: rpcData, error: rpcError } = await supabase.rpc('list_clientes_v2', {
        p_requesting_user_id: user.id,
        p_status_aprovacao_filter: statusAprovacao,
        p_search: search,
        p_vendedor_filter: vendedor,
        p_page: page,
        p_limit: limit,
      })
      if (rpcError) throw new Error(rpcError.message)
      const raw = (rpcData as any) || {}
      const items = Array.isArray(raw.clientes) ? raw.clientes : []
      const clientes = items.map((row: Record<string, unknown>) => mapClienteListItem(row))
      const pagination = {
        page: raw.page ?? page,
        limit: raw.limit ?? limit,
        total: raw.total ?? clientes.length,
        total_pages: (raw.total_pages ?? Math.ceil((raw.total ?? 0) / (raw.limit ?? limit))) || 1,
      }
      const duration = Date.now() - startTime
      return createHttpSuccessResponse(
        { clientes, pagination },
        200,
        { userId: user.id, duration: `${duration}ms` }
      )
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      const nome = body.nome ?? body.razaoSocial ?? ''
      if (!nome || String(nome).trim().length < 2) throw new Error('Nome deve ter pelo menos 2 caracteres')
      const p = {
        p_nome: String(nome).trim(),
        p_nome_fantasia: body.nomeFantasia ?? body.nome_fantasia ?? null,
        p_cpf_cnpj: body.cpfCnpj ?? body.cpf_cnpj ? String(body.cpfCnpj ?? body.cpf_cnpj).replace(/\D/g, '') : null,
        p_inscricao_estadual: body.inscricaoEstadual ?? body.inscricao_estadual ?? null,
        p_codigo: body.codigo ?? null,
        p_grupo_rede: body.grupoRede ?? body.grupo_rede ?? null,
        p_lista_de_preco: body.listaPrecos ?? body.lista_de_preco != null ? Number(body.listaPrecos ?? body.lista_de_preco) : null,
        p_desconto_financeiro: body.descontoFinanceiro ?? body.desconto_financeiro ?? 0,
        p_pedido_minimo: body.pedidoMinimo ?? body.pedido_minimo ?? 0,
        p_vendedoresatribuidos: body.vendedoresAtribuidos ?? body.vendedoresatribuidos ?? (body.vendedorAtribuido?.id ? [body.vendedorAtribuido.id] : null),
        p_observacao_interna: body.observacoesInternas ?? body.observacao_interna ?? null,
        p_segmento_id: body.segmentoId ?? body.segmento_id != null ? Number(body.segmentoId ?? body.segmento_id) : null,
        p_telefone: body.telefoneFixoPrincipal ?? body.telefone ?? body.contato?.telefoneFixoPrincipal ?? null,
        p_email: body.emailPrincipal ?? body.email ?? body.contato?.emailPrincipal ?? null,
        p_cep: body.cep ?? body.endereco?.cep ?? null,
        p_rua: body.logradouro ?? body.endereco?.logradouro ?? body.rua ?? null,
        p_numero: body.numero ?? body.endereco?.numero ?? null,
        p_bairro: body.bairro ?? body.endereco?.bairro ?? null,
        p_cidade: body.municipio ?? body.endereco?.municipio ?? body.cidade ?? null,
        p_uf: body.uf ?? body.endereco?.uf ?? null,
        p_criado_por: user.id,
      }
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_cliente_v2', p)
      if (rpcError) throw new Error(rpcError.message)
      const row = Array.isArray(rpcData) && rpcData[0] ? rpcData[0] : rpcData
      const created = mapClienteListItem(row as Record<string, unknown>)
      const duration = Date.now() - startTime
      return createHttpSuccessResponse(created, 201, { userId: user.id, duration: `${duration}ms` })
    }

    if (req.method === 'PUT') {
      const body = await req.json().catch(() => ({}))
      const id = clienteId ?? body.id
      if (!id) throw new Error('ID é obrigatório para atualização')
      const idNum = parseInt(String(id), 10)
      if (isNaN(idNum) || idNum <= 0) throw new Error('ID inválido')
      const nome = body.nome ?? body.razaoSocial ?? ''
      if (!nome || String(nome).trim().length < 2) throw new Error('Nome deve ter pelo menos 2 caracteres')
      const { data: rpcData, error: rpcError } = await supabase.rpc('update_cliente_v2', {
        p_cliente_id: idNum,
        p_nome: String(nome).trim(),
        p_nome_fantasia: body.nomeFantasia ?? body.nome_fantasia ?? null,
        p_cpf_cnpj: body.cpfCnpj ?? body.cpf_cnpj ? String(body.cpfCnpj ?? body.cpf_cnpj).replace(/\D/g, '') : null,
        p_inscricao_estadual: body.inscricaoEstadual ?? body.inscricao_estadual ?? null,
        p_codigo: body.codigo ?? null,
        p_grupo_rede: body.grupoRede ?? body.grupo_rede ?? null,
        p_lista_de_preco: body.listaPrecos ?? body.lista_de_preco != null ? Number(body.listaPrecos ?? body.lista_de_preco) : null,
        p_desconto_financeiro: body.descontoFinanceiro ?? body.desconto_financeiro ?? null,
        p_pedido_minimo: body.pedidoMinimo ?? body.pedido_minimo ?? null,
        p_vendedoresatribuidos: body.vendedoresAtribuidos ?? body.vendedoresatribuidos ?? null,
        p_observacao_interna: body.observacoesInternas ?? body.observacao_interna ?? null,
        p_segmento_id: body.segmentoId ?? body.segmento_id != null ? Number(body.segmentoId ?? body.segmento_id) : null,
        p_atualizado_por: user.id,
      })
      if (rpcError) throw new Error(rpcError.message)
      const row = Array.isArray(rpcData) && rpcData[0] ? rpcData[0] : rpcData
      const updated = mapClienteListItem({ ...row, cliente_id: idNum } as Record<string, unknown>)
      const duration = Date.now() - startTime
      return createHttpSuccessResponse(updated, 200, { userId: user.id, duration: `${duration}ms` })
    }

    if (req.method === 'DELETE') {
      const id = clienteId ?? url.searchParams.get('id')
      if (!id) throw new Error('ID é obrigatório para exclusão')
      const idNum = parseInt(String(id), 10)
      if (isNaN(idNum) || idNum <= 0) throw new Error('ID inválido')
      const { error: rpcError } = await supabase.rpc('delete_cliente_v2', {
        p_cliente_id: idNum,
        p_deleted_by: user.id,
      })
      if (rpcError) throw new Error(rpcError.message)
      const duration = Date.now() - startTime
      return createHttpSuccessResponse({ success: true, message: 'Cliente excluído com sucesso' }, 200, { userId: user.id, duration: `${duration}ms` })
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed', timestamp: new Date().toISOString() }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return formatErrorResponse(error)
  }
})
