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
      error: null,
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
    else if (error.message.includes('not found')) statusCode = 404
    else if (error.message.includes('validation') || error.message.includes('invalid')) statusCode = 400
  }
  console.error('[DASHBOARD-V2] Error:', { message: errorMessage, statusCode })
  return new Response(
    JSON.stringify({ success: false, error: errorMessage, timestamp: new Date().toISOString() }),
    { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

type DashboardFilters = {
  vendedores?: string[]
  naturezas?: string[]
  segmentos?: string[]
  statusClientes?: string[]
  ufs?: string[]
  statusVendas?: 'concluidas' | 'todas'
  curvasABC?: string[]
}

type Pedido = {
  id?: string
  clienteId?: string
  nomeCliente?: string
  nomeVendedor?: string
  vendedorId?: string
  nomeNaturezaOperacao?: string
  segmentoNome?: string
  statusCliente?: string
  clienteUf?: string
  status?: string
  dataPedido?: string
  valorPedido?: number
  valorFaturado?: number
  totalQuantidades?: number
  geraReceita?: boolean
}

type ClienteListItem = {
  id: string
  situacao?: string
  statusAprovacao?: string
}

function parseJsonParam<T>(value: string | null, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function normalizeText(value?: string | null): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function inferClienteSituacao(raw: any): string {
  const statusAprovacao = normalizeText(raw?.statusAprovacao ?? raw?.status_aprovacao)
  let situacao = String(raw?.situacao_nome ?? raw?.situacao ?? '').trim()

  if (!situacao || normalizeText(situacao) === 'analise') {
    if (statusAprovacao === 'aprovado') situacao = 'Ativo'
    else if (statusAprovacao === 'rejeitado') situacao = 'Reprovado'
    else if (statusAprovacao === 'pendente') situacao = 'Analise'
  }

  return situacao
}

function statusCancelado(status?: string): boolean {
  const s = (status || '').toLowerCase()
  return s.includes('cancelad')
}

function statusConcluido(status?: string): boolean {
  const normalized = (status || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  return [
    'concluida',
    'concluido',
    'faturada',
    'faturado',
    'finalizada',
    'finalizado',
  ].includes(normalized)
}

function parseDateOnly(input?: string | null): Date | null {
  if (!input) return null
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return null
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function getPeriodRange(
  period: string,
  dateFrom?: string | null,
  dateTo?: string | null
): { start: Date; end: Date; prevStart: Date; prevEnd: Date; year?: number; month?: number } {
  const today = new Date()
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  let start: Date
  let end: Date
  let year: number | undefined
  let month: number | undefined

  if (period === 'custom') {
    const from = parseDateOnly(dateFrom) ?? todayDate
    const to = parseDateOnly(dateTo) ?? from
    start = from <= to ? from : to
    end = from <= to ? to : from
  } else if (period === 'current_month') {
    start = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)
    end = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0)
    year = start.getFullYear()
    month = start.getMonth() + 1
  } else if (/^\d{4}-\d{2}$/.test(period)) {
    const [y, m] = period.split('-').map(Number)
    start = new Date(y, m - 1, 1)
    end = new Date(y, m, 0)
    year = y
    month = m
  } else if (/^\d+$/.test(period)) {
    const days = Math.max(1, parseInt(period, 10))
    end = todayDate
    start = new Date(todayDate)
    start.setDate(start.getDate() - (days - 1))
    year = end.getFullYear()
    month = end.getMonth() + 1
  } else {
    start = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)
    end = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0)
    year = start.getFullYear()
    month = start.getMonth() + 1
  }

  if ((!year || !month) && period === 'custom' && start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    year = end.getFullYear()
    month = end.getMonth() + 1
  }

  const spanDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)
  const prevEnd = new Date(start)
  prevEnd.setDate(prevEnd.getDate() - 1)
  const prevStart = new Date(prevEnd)
  prevStart.setDate(prevStart.getDate() - (spanDays - 1))

  return { start, end, prevStart, prevEnd, year, month }
}

function inRange(date: Date, start: Date, end: Date): boolean {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return d >= start && d <= end
}

function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

function getPedidoValor(p: Pedido): number {
  const faturado = toNumber((p as any).valorFaturado)
  const pedido = toNumber(p.valorPedido)
  return faturado > 0 ? faturado : pedido
}

function getPedidoQuantidade(p: Pedido): number {
  return toNumber((p as any).totalQuantidades)
}

function calcularVariacao(atual: number, anterior: number): number {
  if (!anterior) return atual > 0 ? 100 : 0
  return ((atual - anterior) / anterior) * 100
}

function filtrarPedidos(pedidos: Pedido[], filters: DashboardFilters, enforcedSellerName?: string): Pedido[] {
  const vendedores = new Set((filters.vendedores || []).filter(Boolean))
  const naturezas = new Set((filters.naturezas || []).filter(Boolean))
  const segmentos = new Set((filters.segmentos || []).filter(Boolean))
  const statusClientes = new Set((filters.statusClientes || []).filter(Boolean))
  const ufs = new Set((filters.ufs || []).filter(Boolean))

  return pedidos.filter((p) => {
    if (p.geraReceita === false) return false

    if (enforcedSellerName && p.nomeVendedor !== enforcedSellerName) return false
    if (vendedores.size > 0 && !vendedores.has(p.nomeVendedor || '')) return false
    if (naturezas.size > 0 && !naturezas.has(p.nomeNaturezaOperacao || '')) return false
    if (segmentos.size > 0 && !segmentos.has(p.segmentoNome || '')) return false
    if (statusClientes.size > 0 && !statusClientes.has(p.statusCliente || '')) return false
    if (ufs.size > 0 && !ufs.has(p.clienteUf || '')) return false

    if (filters.statusVendas === 'concluidas' && !statusConcluido(p.status)) return false

    return true
  })
}

async function fetchAllClientes(
  supabase: any,
  requestingUserId: string
): Promise<ClienteListItem[]> {
  const all: ClienteListItem[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const { data: rpcData, error } = await supabase.rpc('list_clientes_v2', {
      p_requesting_user_id: requestingUserId,
      p_status_aprovacao_filter: null,
      p_search: null,
      p_vendedor_filter: null,
      p_page: page,
      p_limit: 100,
    })
    if (error) {
      throw new Error(`Database operation failed: ${error.message}`)
    }
    const raw = (rpcData as any) || {}
    const clientes = Array.isArray(raw.clientes) ? raw.clientes : []
    totalPages = Number(raw.total_pages || 1)
    for (const c of clientes) {
      all.push({
        id: String(c.id || ''),
        situacao: inferClienteSituacao(c),
        statusAprovacao: c.statusAprovacao || c.status_aprovacao,
      })
    }
    page += 1
  }
  return all
}

async function fetchPedidosDashboard(
  supabase: any,
  requestingUserId: string
): Promise<Pedido[]> {
  const all: Pedido[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const { data: rpcData, error } = await supabase.rpc('list_pedido_venda_v2', {
      p_requesting_user_id: requestingUserId,
      p_search: null,
      p_status: null,
      p_vendedor_id: null,
      p_cliente_id: null,
      p_data_inicio: null,
      p_data_fim: null,
      p_page: page,
      p_limit: 100,
    })

    if (error) {
      throw new Error(`Database operation failed: ${error.message}`)
    }

    const raw = (rpcData as any) || {}
    const pedidos = Array.isArray(raw.pedidos) ? raw.pedidos : []
    all.push(...(pedidos as Pedido[]))

    totalPages = Number(raw?.pagination?.total_pages ?? raw?.total_pages ?? 1)
    if (!Number.isFinite(totalPages) || totalPages < 1) totalPages = 1
    page += 1
  }

  return all
}

async function fetchMetaTotalPeriodo(
  supabase: any,
  ano: number,
  mes: number
): Promise<number> {
  const { data, error } = await supabase.rpc('get_meta_total_vendedor_v2', {
    p_ano: ano,
    p_mes: mes,
  })
  if (error) {
    throw new Error(`Database operation failed: ${error.message}`)
  }
  return toNumber((data as any)?.total ?? data)
}

async function fetchMetaVendedorPeriodo(
  supabase: any,
  requestingUserId: string,
  vendedorId: string,
  ano: number,
  mes: number
): Promise<number> {
  const { data: rpcData, error } = await supabase.rpc('list_metas_vendedor_v2', {
    p_requesting_user_id: requestingUserId,
    p_ano: ano,
    p_mes: mes,
    p_vendedor_id: vendedorId,
    p_page: 1,
    p_limit: 100,
  })
  if (error) {
    throw new Error(`Database operation failed: ${error.message}`)
  }
  const metas = Array.isArray((rpcData as any)?.metas) ? (rpcData as any).metas : []
  const meta = metas.find((m: any) => String(m.vendedor_id || m.vendedorId || '') === vendedorId)
  return toNumber(meta?.meta_valor ?? meta?.metaMensal)
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const { user, error } = await validateJWT(req, supabaseUrl, supabaseServiceKey)
    if (error || !user) return createAuthErrorResponse(error || 'Unauthorized')

    const authHeader = req.headers.get('Authorization') || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const url = new URL(req.url)
    const period = url.searchParams.get('period') || 'current_month'
    const dateFrom = url.searchParams.get('date_from')
    const dateTo = url.searchParams.get('date_to')
    const filters = parseJsonParam<DashboardFilters>(url.searchParams.get('filters'), {})

    const range = getPeriodRange(period, dateFrom, dateTo)

    const [pedidos, clientes, metaTotal] = await Promise.all([
      fetchPedidosDashboard(supabase, user.id),
      fetchAllClientes(supabase, user.id),
      range.year && range.month
        ? fetchMetaTotalPeriodo(supabase, range.year, range.month).catch(() => 0)
        : Promise.resolve(0),
    ])

    const enforcedSellerName = user.tipo === 'vendedor'
      ? (pedidos.find((p) => p.vendedorId === user.id)?.nomeVendedor || undefined)
      : undefined

    const pedidosFiltradosBase = filtrarPedidos(pedidos, filters, enforcedSellerName)

    const atuais = pedidosFiltradosBase.filter((p) => {
      const d = parseDateOnly(p.dataPedido)
      return d ? inRange(d, range.start, range.end) : false
    })

    const anteriores = pedidosFiltradosBase.filter((p) => {
      const d = parseDateOnly(p.dataPedido)
      return d ? inRange(d, range.prevStart, range.prevEnd) : false
    })

    const atuaisValidos = atuais.filter((p) => !statusCancelado(p.status))
    const anterioresValidos = anteriores.filter((p) => !statusCancelado(p.status))

    const vendasTotais = atuaisValidos.reduce((sum, p) => sum + getPedidoValor(p), 0)
    const vendasTotaisAnterior = anterioresValidos.reduce((sum, p) => sum + getPedidoValor(p), 0)
    const negociosFechados = atuaisValidos.length
    const negociosFechadosAnterior = anterioresValidos.length
    const ticketMedio = negociosFechados ? vendasTotais / negociosFechados : 0
    const ticketMedioAnterior = negociosFechadosAnterior ? vendasTotaisAnterior / negociosFechadosAnterior : 0
    const produtosVendidos = atuaisValidos.reduce((sum, p) => sum + getPedidoQuantidade(p), 0)
    const produtosVendidosAnterior = anterioresValidos.reduce((sum, p) => sum + getPedidoQuantidade(p), 0)

    const vendedoresAtivos = new Set(atuaisValidos.map((p) => p.nomeVendedor).filter(Boolean)).size
    const vendedoresAtivosAnterior = new Set(anterioresValidos.map((p) => p.nomeVendedor).filter(Boolean)).size

    const clientesAtivosOuInativos = clientes.filter((c) => c.situacao === 'Ativo' || c.situacao === 'Inativo')
    const walletActive = clientes.filter((c) => c.situacao === 'Ativo').length
    const walletInactive = clientes.filter((c) => c.situacao === 'Inativo').length
    const walletTotal = walletActive + walletInactive

    const clientesCompraramPeriodo = new Set(
      atuaisValidos
        .map((p) => String(p.clienteId || p.nomeCliente || '').trim())
        .filter(Boolean)
    ).size

    const clientesCompraramAnterior = new Set(
      anterioresValidos
        .map((p) => String(p.clienteId || p.nomeCliente || '').trim())
        .filter(Boolean)
    ).size

    const positivacao = walletTotal > 0 ? (clientesCompraramPeriodo / walletTotal) * 100 : 0
    const positivacaoAnterior = walletTotal > 0 ? (clientesCompraramAnterior / walletTotal) * 100 : 0

    let metaMensal = 0
    if (range.year && range.month) {
      if (user.tipo === 'vendedor') {
        metaMensal = await fetchMetaVendedorPeriodo(supabase, user.id, user.id, range.year, range.month).catch(() => 0)
      } else {
        metaMensal = metaTotal
      }
    }

    const porcentagemMeta = metaMensal > 0 ? (vendasTotais / metaMensal) * 100 : 0

    const payload = {
      period,
      dateRange: {
        from: range.start.toISOString().slice(0, 10),
        to: range.end.toISOString().slice(0, 10),
      },
      summary: {
        metaMensal,
        cards: {
          vendasTotais,
          vendasTotaisChange: calcularVariacao(vendasTotais, vendasTotaisAnterior),
          ticketMedio,
          ticketMedioChange: calcularVariacao(ticketMedio, ticketMedioAnterior),
          produtosVendidos,
          produtosVendidosChange: calcularVariacao(produtosVendidos, produtosVendidosAnterior),
          positivacao,
          positivacaoChange: calcularVariacao(positivacao, positivacaoAnterior),
          positivacaoCount: clientesCompraramPeriodo,
          positivacaoTotal: walletTotal,
          vendedoresAtivos,
          vendedoresAtivosChange: calcularVariacao(vendedoresAtivos, vendedoresAtivosAnterior),
          porcentagemMeta,
          porcentagemMetaChange: 0,
          negociosFechados,
        },
      },
      customerWallet: {
        distribution: {
          active: walletActive,
          inactive: walletInactive,
          total: walletTotal,
          activePercentage: walletTotal > 0 ? ((walletActive / walletTotal) * 100).toFixed(1) : '0.0',
          inactivePercentage: walletTotal > 0 ? ((walletInactive / walletTotal) * 100).toFixed(1) : '0.0',
        },
        positivation: {
          positivatedCount: clientesCompraramPeriodo,
          totalCustomers: walletTotal,
          positivationPercentage: Number(positivacao.toFixed(1)),
        },
      },
      debug: {
        userType: user.tipo,
        totalPedidosRecebidos: pedidos.length,
        totalPedidosFiltradosPeriodo: atuais.length,
        totalClientesListados: clientes.length,
        totalClientesAtivosInativos: clientesAtivosOuInativos.length,
      },
    }

    return createHttpSuccessResponse(payload, 200, { userId: user.id })
  } catch (error) {
    return formatErrorResponse(error)
  }
})
