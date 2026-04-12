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
    else if (error.message.includes('not found') || error.message.includes('não encontrada')) statusCode = 404
    else if (error.message.includes('validation') || error.message.includes('invalid')) statusCode = 400
  }
  console.error('[LISTAS-PRECO-V2] Error:', { message: errorMessage, statusCode })
  return new Response(
    JSON.stringify({ success: false, error: errorMessage, timestamp: new Date().toISOString() }),
    { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function formatListaPreco(row: {
  id: number
  nome: string | null
  data_criacao: string | null
  desconto: number | null
  ativo: boolean | null
  total_produtos?: number
  total_faixas?: number
  tipo_comissao?: 'fixa' | 'conforme_desconto'
  percentual_fixo?: number
}, produtos: Array<{ 
  produto_id: number
  preco: number | null
  descricao?: string | null
  codigo_sku?: string | null
  gtin?: string | null
  ncm?: string | null
  cest?: string | null
  peso_liquido?: number | null
  peso_bruto?: number | null
  situacao?: string | null
  ativo?: boolean | null
  disponivel?: boolean | null
}> = [], faixas: Array<{ id: number; desconto_minimo: number; desconto_maximo: number; comissao: number }> = []) {
  const tipoComissao = row.tipo_comissao ?? (faixas.length > 0 ? 'conforme_desconto' as const : 'fixa' as const)
  const percentualFixo = row.percentual_fixo ?? (row.desconto != null ? Number(row.desconto) : 10)
  const faixasFormatted = faixas.map((f) => ({
    id: String(f.id),
    descontoMin: Number(f.desconto_minimo),
    descontoMax: f.desconto_maximo != null ? Number(f.desconto_maximo) : null,
    percentualComissao: Number(f.comissao),
  }))
  const produtosFormatted = produtos.map((p) => ({
    produtoId: String(p.produto_id),
    preco: Number(p.preco ?? 0),
    // Incluir informações completas do produto se disponíveis
    ...(p.descricao ? { descricao: p.descricao } : {}),
    ...(p.codigo_sku ? { codigoSku: p.codigo_sku } : {}),
    ...(p.gtin ? { codigoEan: p.gtin } : {}),
    ...(p.ncm ? { ncm: p.ncm } : {}),
    ...(p.cest ? { cest: p.cest } : {}),
    ...(p.peso_liquido != null ? { pesoLiquido: Number(p.peso_liquido) } : {}),
    ...(p.peso_bruto != null ? { pesoBruto: Number(p.peso_bruto) } : {}),
    ...(p.situacao ? { situacao: p.situacao } : {}),
    ...(p.ativo != null ? { ativo: p.ativo } : {}),
    ...(p.disponivel != null ? { disponivel: p.disponivel } : {}),
  }))
  return {
    id: String(row.id),
    nome: row.nome ?? '',
    produtos: produtosFormatted,
    tipoComissao,
    ...(tipoComissao === 'fixa' ? { percentualFixo } : {}),
    faixasDesconto: faixasFormatted,
    totalProdutos: row.total_produtos ?? produtos.length,
    totalFaixas: row.total_faixas ?? faixas.length,
    ativo: row.ativo !== false,
    createdAt: row.data_criacao ? new Date(row.data_criacao).toISOString() : new Date().toISOString(),
    updatedAt: row.data_criacao ? new Date(row.data_criacao).toISOString() : new Date().toISOString(),
  }
}

serve(async (req) => {
  const startTime = Date.now()
  console.log('[LISTAS-PRECO-V2] Request:', { method: req.method, url: req.url })

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
    const functionIndex = pathParts.indexOf('listas-preco-v2')
    const listaId = functionIndex >= 0 && functionIndex < pathParts.length - 1
      ? pathParts[functionIndex + 1]
      : url.searchParams.get('id')

    if (req.method === 'GET') {
      if (listaId) {
        const idNum = parseInt(listaId, 10)
        if (isNaN(idNum) || idNum <= 0) {
          throw new Error('ID inválido')
        }
        const { data: lista, error: listaError } = await supabase
          .from('listas_preco')
          .select('id, nome, data_criacao, desconto, ativo')
          .eq('id', idNum)
          .single()

        if (listaError || !lista) {
          throw new Error('Lista de preço não encontrada')
        }

        // Buscar produtos com informações completas usando RPC
        let produtos: any[] = []
        const { data: produtosCompletos, error: produtosError } = await supabase
          .rpc('get_lista_preco_produtos_completos', { p_lista_preco_id: idNum })

        if (produtosError || !produtosCompletos) {
          console.error('[LISTAS-PRECO-V2] Erro ao buscar produtos completos:', produtosError)
          // Fallback: buscar apenas produto_id e preco
          const { data: produtosSimples } = await supabase
            .from('produtos_listas_precos')
            .select('produto_id, preco')
            .eq('lista_preco_id', idNum)
          
          produtos = produtosSimples || []
        } else {
          produtos = produtosCompletos
        }

        const { data: faixas } = await supabase
          .from('listas_preco_comissionamento')
          .select('id, desconto_minimo, desconto_maximo, comissao')
          .eq('lista_preco_id', idNum)
          .order('desconto_minimo', { ascending: true })

        const tipoComissao = (faixas?.length ?? 0) > 0 ? 'conforme_desconto' as const : 'fixa' as const
        const percentualFixo = lista.desconto != null ? Number(lista.desconto) : 10
        const formatted = formatListaPreco(
          { ...lista, tipo_comissao: tipoComissao, percentual_fixo: percentualFixo, total_faixas: faixas?.length ?? 0, total_produtos: produtos?.length ?? 0 },
          produtos ?? [],
          faixas ?? []
        )

        const duration = Date.now() - startTime
        return createHttpSuccessResponse(formatted, 200, { userId: user.id, duration: `${duration}ms` })
      }

      const { data: listas, error: listError } = await supabase
        .from('listas_preco')
        .select('id, nome, data_criacao, desconto, ativo')
        .order('nome', { ascending: true })

      if (listError) {
        throw new Error(`Database operation failed: ${listError.message}`)
      }

      const listasComContagens = await Promise.all(
        (listas ?? []).map(async (lp) => {
          const [{ count: totalProdutos }, { count: totalFaixas }] = await Promise.all([
            supabase.from('produtos_listas_precos').select('id', { count: 'exact', head: true }).eq('lista_preco_id', lp.id),
            supabase.from('listas_preco_comissionamento').select('id', { count: 'exact', head: true }).eq('lista_preco_id', lp.id),
          ])
          const tipoComissao = (totalFaixas ?? 0) > 0 ? 'conforme_desconto' as const : 'fixa' as const
          const percentualFixo = lp.desconto != null ? Number(lp.desconto) : 10
          return formatListaPreco(
            { ...lp, total_produtos: totalProdutos ?? 0, total_faixas: totalFaixas ?? 0, tipo_comissao: tipoComissao, percentual_fixo: percentualFixo },
            [],
            []
          )
        })
      )

      const duration = Date.now() - startTime
      return createHttpSuccessResponse(listasComContagens, 200, { userId: user.id, duration: `${duration}ms` })
    }

    if (req.method === 'POST') {
      if (user.tipo !== 'backoffice') {
        throw new Error('Apenas usuários backoffice podem criar listas de preço')
      }
      const body = await req.json()
      if (!body.nome || String(body.nome).trim().length < 2) {
        throw new Error('Nome da lista deve ter pelo menos 2 caracteres')
      }
      const insert: { nome: string; ativo?: boolean; desconto?: number } = {
        nome: String(body.nome).trim(),
        ativo: body.ativo !== false,
      }
      if (body.tipoComissao === 'fixa' && body.percentualFixo != null) {
        insert.desconto = Number(body.percentualFixo)
      }
      const { data: nova, error: insertError } = await supabase
        .from('listas_preco')
        .insert(insert)
        .select('id, nome, data_criacao, desconto, ativo')
        .single()
      if (insertError) throw new Error(`Database operation failed: ${insertError.message}`)
      const formatted = formatListaPreco(nova, [], [])
      const duration = Date.now() - startTime
      return createHttpSuccessResponse(formatted, 201, { userId: user.id, duration: `${duration}ms` })
    }

    if (req.method === 'PUT') {
      const body = await req.json().catch(() => ({}))
      const id = listaId ?? body.id
      if (!id) throw new Error('ID é obrigatório para atualização')
      const idNum = parseInt(String(id), 10)
      if (isNaN(idNum) || idNum <= 0) throw new Error('ID inválido')
      if (user.tipo !== 'backoffice') {
        throw new Error('Apenas usuários backoffice podem atualizar listas de preço')
      }
      if (!body?.nome || String(body.nome).trim().length < 2) {
        throw new Error('Nome da lista deve ter pelo menos 2 caracteres')
      }
      const update: { nome?: string; ativo?: boolean; desconto?: number } = {
        nome: String(body.nome).trim(),
        ativo: body.ativo !== false,
      }
      if (body.tipoComissao === 'fixa' && body.percentualFixo != null) {
        update.desconto = Number(body.percentualFixo)
      }
      const { data: atualizada, error: updateError } = await supabase
        .from('listas_preco')
        .update(update)
        .eq('id', idNum)
        .select('id, nome, data_criacao, desconto, ativo')
        .single()
      if (updateError) throw new Error(`Database operation failed: ${updateError.message}`)
      if (!atualizada) throw new Error('Lista de preço não encontrada')
      const { data: produtos } = await supabase.from('produtos_listas_precos').select('produto_id, preco').eq('lista_preco_id', idNum)
      const { data: faixas } = await supabase.from('listas_preco_comissionamento').select('id, desconto_minimo, desconto_maximo, comissao').eq('lista_preco_id', idNum).order('desconto_minimo', { ascending: true })
      const tipoComissao = (faixas?.length ?? 0) > 0 ? 'conforme_desconto' as const : 'fixa' as const
      const percentualFixo = atualizada.desconto != null ? Number(atualizada.desconto) : 10
      const formatted = formatListaPreco(
        { ...atualizada, tipo_comissao: tipoComissao, percentual_fixo: percentualFixo, total_produtos: produtos?.length ?? 0, total_faixas: faixas?.length ?? 0 },
        produtos ?? [],
        faixas ?? []
      )
      const duration = Date.now() - startTime
      return createHttpSuccessResponse(formatted, 200, { userId: user.id, duration: `${duration}ms` })
    }

    if (req.method === 'DELETE') {
      const id = listaId || url.searchParams.get('id')
      if (!id) throw new Error('ID é obrigatório para exclusão')
      const idNum = parseInt(String(id), 10)
      if (isNaN(idNum) || idNum <= 0) throw new Error('ID inválido')
      if (user.tipo !== 'backoffice') {
        throw new Error('Apenas usuários backoffice podem excluir listas de preço')
      }
      const { data: existing } = await supabase.from('listas_preco').select('id').eq('id', idNum).single()
      if (!existing) throw new Error('Lista de preço não encontrada')
      await supabase.from('produtos_listas_precos').delete().eq('lista_preco_id', idNum)
      await supabase.from('listas_preco_comissionamento').delete().eq('lista_preco_id', idNum)
      const { error: deleteError } = await supabase.from('listas_preco').delete().eq('id', idNum)
      if (deleteError) throw new Error(`Database operation failed: ${deleteError.message}`)
      const duration = Date.now() - startTime
      return createHttpSuccessResponse({ success: true, message: 'Lista de preço excluída com sucesso' }, 200, { userId: user.id, duration: `${duration}ms` })
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed', timestamp: new Date().toISOString() }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return formatErrorResponse(error)
  }
})
