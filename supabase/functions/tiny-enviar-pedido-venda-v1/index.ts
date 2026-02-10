import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import { validateJWT } from '../_shared/auth.ts'
import { formatErrorResponse, createAuthorizationError, createBadRequestError, createNotFoundError } from '../_shared/errors.ts'
import { corsHeaders, createHttpSuccessResponse } from '../_shared/types.ts'

type TinyRetorno = {
  retorno?: any
}

function newTraceId(): string {
  // Crypto is available in Edge Runtime.
  return crypto.randomUUID()
}

function digitsOnly(input: string): string {
  return input.replace(/\D/g, '')
}

function formatDateBR(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = String(date.getFullYear())
  return `${dd}/${mm}/${yyyy}`
}

function toNumber(value: any, fallback = 0): number {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
  const n = Number(String(value).replace(',', '.'))
  return Number.isFinite(n) ? n : fallback
}

function maskToken(token: string): string {
  const t = token.trim()
  if (t.length <= 6) return '***'
  return `${t.slice(0, 2)}***${t.slice(-4)}`
}

function pickTinyRegistro(retorno: any): { id?: string; numero?: string } {
  // Tiny retorna em formatos diferentes. Tentamos ser tolerantes.
  const registros = retorno?.registros
  const status = retorno?.status
  if (!registros) return {}

  // Formato 1: registros: { registro: { id, numero } }
  const r1 = registros?.registro
  if (r1 && typeof r1 === 'object' && !Array.isArray(r1)) {
    return { id: r1.id ? String(r1.id) : undefined, numero: r1.numero ? String(r1.numero) : undefined }
  }

  // Formato 2: registros: [ { registro: { id, numero } } ]
  if (Array.isArray(registros) && registros.length > 0) {
    const reg = registros[0]?.registro
    if (reg && typeof reg === 'object') {
      return { id: reg.id ? String(reg.id) : undefined, numero: reg.numero ? String(reg.numero) : undefined }
    }
  }

  // Formato 3: registros: { registro: [ { id, numero } ] }
  if (Array.isArray(r1) && r1.length > 0) {
    const reg = r1[0]
    if (reg && typeof reg === 'object') {
      return { id: reg.id ? String(reg.id) : undefined, numero: reg.numero ? String(reg.numero) : undefined }
    }
  }

  // Formato 4 (fallback): registros: { registro: [ { sequencia, status, id, numero } ] } (ou estruturas parecidas)
  if (r1 && typeof r1 === 'object') {
    const reg = (r1 as any)?.registro
    if (reg && typeof reg === 'object' && !Array.isArray(reg)) {
      return { id: reg.id ? String(reg.id) : undefined, numero: reg.numero ? String(reg.numero) : undefined }
    }
    if (Array.isArray(reg) && reg.length > 0) {
      return { id: reg[0]?.id ? String(reg[0]?.id) : undefined, numero: reg[0]?.numero ? String(reg[0]?.numero) : undefined }
    }
  }

  // Fallback: nenhum registro reconhecido.
  console.warn('[TINY] Unable to extract registro from retorno:', { status, keys: Object.keys(retorno || {}) })
  return {}
}

function convertTipoPessoa(refTipoPessoaId: any): 'F' | 'J' {
  // Convention: 1 = Fisica, 2 = Juridica (fallback pelo tamanho do CPF/CNPJ fora daqui).
  const n = parseInt(String(refTipoPessoaId ?? ''), 10)
  if (n === 1) return 'F'
  if (n === 2) return 'J'
  return 'J'
}

async function tinyIncluirPedidoJson(params: {
  token: string
  traceId: string
  pedidoTiny: any
}): Promise<TinyRetorno> {
  const url = `https://api.tiny.com.br/api2/pedido.incluir.php?token=${encodeURIComponent(params.token)}&formato=json`
  console.log('[TINY] POST pedido.incluir.php', { traceId: params.traceId, url })
  // Tiny API expects the parameter `pedido` in the POST body (urlencoded/form-data),
  // even when `formato=json` is used for the response format.
  const form = new URLSearchParams()
  form.append('pedido', JSON.stringify(params.pedidoTiny))

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  })

  const text = await res.text()
  let data: any = null
  try {
    data = JSON.parse(text)
  } catch {
    throw createBadRequestError('Resposta invalida do Tiny (nao-JSON)', {
      endpoint: 'pedido.incluir.php',
      http_status: res.status,
      response_text: text,
    })
  }

  if (!res.ok) {
    throw createBadRequestError('Erro HTTP ao chamar Tiny', {
      endpoint: 'pedido.incluir.php',
      http_status: res.status,
      tiny: data,
    })
  }

  const retorno = data?.retorno
  const statusProc = retorno?.status_processamento
  const status = retorno?.status

  // Tiny:
  // - `status` = "Erro" indica falha.
  // - `status_processamento` pode ser "3" mesmo em sucesso (processado), entao nao usar isso como erro.
  const statusLower = String(status || '').toLowerCase()
  const hasErrosArray = Array.isArray(retorno?.erros) && retorno.erros.length > 0
  const hasCodigoErro = retorno?.codigo_erro !== null && retorno?.codigo_erro !== undefined && String(retorno.codigo_erro).trim() !== ''
  if (statusLower === 'erro' || hasErrosArray || hasCodigoErro) {
    throw createBadRequestError('Erro retornado pelo Tiny', {
      endpoint: 'pedido.incluir.php',
      tiny: data,
      status_processamento: statusProc,
    })
  }

  return data
}

serve(async (req) => {
  const traceId = newTraceId()
  const startTime = Date.now()

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { ...corsHeaders, 'Access-Control-Max-Age': '86400' },
    })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, trace_id: traceId, error: 'Method not allowed', timestamp: new Date().toISOString() }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, trace_id: traceId, error: authError || 'Unauthorized', timestamp: new Date().toISOString() }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // IMPORTANT:
    // Use SERVICE_ROLE client for all DB operations. Do NOT forward the user's Authorization header here,
    // otherwise PostgREST will evaluate RLS as the end-user and admin-only tables (RLS enabled, no policies)
    // will become invisible (e.g. tiny_empresa_natureza_operacao).
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json().catch(() => ({}))
    const pedidoRaw = body?.pedido_venda_ID ?? body?.pedido_venda_id ?? body?.pedidoId ?? body?.id
    const dryRun = Boolean(body?.dry_run ?? body?.dryRun ?? false)

    const pedidoId = parseInt(String(pedidoRaw), 10)
    if (!Number.isFinite(pedidoId) || isNaN(pedidoId) || pedidoId <= 0) {
      throw createBadRequestError('pedido_venda_ID invalido', { pedido_venda_ID: pedidoRaw })
    }

    // 1) Carregar pedido
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedido_venda')
      .select(
        [
          'pedido_venda_ID',
          'cliente_id',
          'vendedor_uuid',
          'empresa_faturamento_id',
          'natureza_id',
          'natureza_operacao',
          'nome_natureza_operacao',
          'data_venda',
          'ordem_cliente',
          'observacao',
          'observacao_interna',
          'valor_total',
          'valor_total_produtos',
          'percentual_desconto_extra',
          'valor_desconto_extra',
          'id_condicao',
          'deleted_at',
        ].join(',')
      )
      .eq('pedido_venda_ID', pedidoId)
      .maybeSingle()

    if (pedidoError) {
      throw createBadRequestError('Falha ao buscar pedido', { code: pedidoError.code, message: pedidoError.message })
    }
    if (!pedido || pedido.deleted_at) {
      throw createNotFoundError('Pedido', String(pedidoId))
    }

    // Permissao: vendedor so pode enviar seus proprios pedidos.
    if (user.tipo === 'vendedor' && String(pedido.vendedor_uuid) !== String(user.id)) {
      throw createAuthorizationError('Insufficient permissions')
    }

    const empresaId = pedido.empresa_faturamento_id
    if (!empresaId) {
      throw createBadRequestError('Pedido sem empresa de faturamento definida', { pedido_venda_ID: pedidoId })
    }

    // 2) Empresa + token Tiny
    const { data: empresa, error: empresaError } = await supabase
      .from('ref_empresas_subsidiarias')
      .select('id, chave_api, ativo, deleted_at')
      .eq('id', empresaId)
      .eq('ativo', true)
      .is('deleted_at', null)
      .maybeSingle()

    if (empresaError) {
      throw createBadRequestError('Falha ao buscar empresa', { code: empresaError.code, message: empresaError.message })
    }
    if (!empresa) {
      throw createNotFoundError('Empresa', String(empresaId))
    }

    const tinyToken = String(empresa.chave_api || '').trim()
    if (!tinyToken) {
      throw createBadRequestError('Empresa sem chave_api do Tiny configurada', { empresa_id: empresaId })
    }

    // 3) Resolver natureza_operacao_id do pedido
    let naturezaOperacaoId: number | null = null
    if (pedido.natureza_id !== null && pedido.natureza_id !== undefined && String(pedido.natureza_id).trim() !== '') {
      const n = parseInt(String(pedido.natureza_id), 10)
      if (Number.isFinite(n) && !isNaN(n) && n > 0) naturezaOperacaoId = n
    }

    if (!naturezaOperacaoId) {
      const nomeNatureza = String(pedido.natureza_operacao || '').trim()
      if (!nomeNatureza) {
        throw createBadRequestError('Pedido sem natureza de operacao', { pedido_venda_ID: pedidoId })
      }
      const { data: natureza, error: naturezaError } = await supabase
        .from('natureza_operacao')
        .select('id')
        .eq('nome', nomeNatureza)
        .eq('ativo', true)
        .is('deleted_at', null)
        .maybeSingle()
      if (naturezaError) {
        throw createBadRequestError('Falha ao resolver natureza de operacao', { code: naturezaError.code, message: naturezaError.message })
      }
      if (!natureza?.id) {
        throw createBadRequestError('Natureza do pedido nao encontrada no cadastro interno', { natureza_operacao: nomeNatureza })
      }
      naturezaOperacaoId = parseInt(String(natureza.id), 10)
    }

    // 3b) Buscar mapeamento natureza Tiny por empresa
    const { data: mapNat, error: mapNatError } = await supabase
      .from('tiny_empresa_natureza_operacao')
      .select('tiny_valor')
      .eq('empresa_id', empresaId)
      .eq('natureza_operacao_id', naturezaOperacaoId)
      .eq('ativo', true)
      .is('deleted_at', null)
      .maybeSingle()

    if (mapNatError) {
      throw createBadRequestError('Falha ao buscar mapeamento de natureza Tiny', { code: mapNatError.code, message: mapNatError.message })
    }
    if (!mapNat?.tiny_valor) {
      throw createBadRequestError('Natureza de operacao nao mapeada para esta empresa no Tiny', {
        empresa_id: empresaId,
        natureza_operacao_id: naturezaOperacaoId,
      })
    }

    const tinyNaturezaValor = String(mapNat.tiny_valor).trim()
    if (!tinyNaturezaValor) {
      throw createBadRequestError('Mapeamento Tiny invalido (tiny_valor vazio)', { empresa_id: empresaId, natureza_operacao_id: naturezaOperacaoId })
    }

    // 4) Cliente completo
    const { data: cliente, error: clienteError } = await supabase
      .from('cliente_completo')
      .select('cliente_id,nome,nome_fantasia,cpf_cnpj,inscricao_estadual,cep,rua,bairro,cidade,uf,numero,complemento,telefone,email,ref_tipo_pessoa_id_FK')
      .eq('cliente_id', pedido.cliente_id)
      .maybeSingle()

    if (clienteError) {
      throw createBadRequestError('Falha ao buscar cliente', { code: clienteError.code, message: clienteError.message })
    }
    if (!cliente) {
      throw createNotFoundError('Cliente', String(pedido.cliente_id))
    }

    const cpfCnpj = digitsOnly(String(cliente.cpf_cnpj || ''))
    if (!(cpfCnpj.length === 11 || cpfCnpj.length === 14)) {
      throw createBadRequestError('CPF/CNPJ invalido para envio ao Tiny', { cpf_cnpj: cliente.cpf_cnpj })
    }

    const tipoPessoa: 'F' | 'J' =
      cpfCnpj.length === 14 ? 'J' : convertTipoPessoa((cliente as any).ref_tipo_pessoa_id_FK)

    const contatoCodigo = String(cliente.cliente_id)

    // `cliente_completo` nao expoe IE_isento; buscar na tabela base `cliente`.
    const { data: clienteBase, error: clienteBaseError } = await supabase
      .from('cliente')
      .select('IE_isento')
      .eq('cliente_id', pedido.cliente_id)
      .maybeSingle()
    if (clienteBaseError) {
      throw createBadRequestError('Falha ao buscar cliente (dados base)', {
        code: clienteBaseError.code,
        message: clienteBaseError.message,
      })
    }

    const ieIsento = Boolean((clienteBase as any)?.IE_isento)
    const inscricaoEstadual = String(cliente.inscricao_estadual || '').trim()
    const ieFinal = inscricaoEstadual ? inscricaoEstadual : (ieIsento ? 'ISENTO' : '')

    // 4b) Itens do pedido
    const { data: itensDb, error: itensError } = await supabase
      .from('pedido_venda_produtos')
      .select('produto_id,quantidade,valor_unitario,descricao,codigo_sku,unidade,codigo_ean,numero')
      .eq('pedido_venda_id', pedidoId)
      .order('numero', { ascending: true })

    if (itensError) {
      throw createBadRequestError('Falha ao buscar itens do pedido', { code: itensError.code, message: itensError.message })
    }
    if (!itensDb || itensDb.length === 0) {
      throw createBadRequestError('Pedido sem itens', { pedido_venda_ID: pedidoId })
    }

    const produtoIds = [...new Set(itensDb.map((i: any) => i.produto_id).filter((x: any) => x !== null && x !== undefined))]
    const { data: produtosDb, error: produtosError } = await supabase
      .from('produto')
      .select('produto_id,codigo_sku,descricao,sigla_unidade,preco_venda')
      .in('produto_id', produtoIds)

    if (produtosError) {
      throw createBadRequestError('Falha ao buscar produtos', { code: produtosError.code, message: produtosError.message })
    }

    const produtoMap = new Map<string, any>()
    ;(produtosDb || []).forEach((p: any) => produtoMap.set(String(p.produto_id), p))

    const itens = itensDb.map((i: any) => {
      const p = produtoMap.get(String(i.produto_id))
      const codigoSku = String(i.codigo_sku || p?.codigo_sku || i.produto_id).trim()
      const unidade = String(i.unidade || p?.sigla_unidade || 'UN').trim() || 'UN'
      const descricao = String(i.descricao || p?.descricao || '').trim() || `Produto ${codigoSku}`
      return {
        produtoId: String(i.produto_id),
        codigo: codigoSku,
        unidade,
        descricao,
        quantidade: toNumber(i.quantidade, 0),
        valorUnitario: toNumber(i.valor_unitario, toNumber(p?.preco_venda, 0)),
      }
    })

    // 5) Parcelas: usar condicao quando houver, senao 1 parcela
    let idCondicao: number | null = null
    if (pedido.id_condicao !== null && pedido.id_condicao !== undefined && String(pedido.id_condicao).trim() !== '') {
      const n = parseInt(String(pedido.id_condicao), 10)
      if (Number.isFinite(n) && !isNaN(n) && n > 0) idCondicao = n
    } else {
      const { data: det, error: detError } = await supabase
        .from('detalhes_pedido_venda')
        .select('id_condicao')
        .eq('pedido_venda_id', pedidoId)
        .maybeSingle()
      if (detError) {
        console.warn('[TINY] detalhes_pedido_venda lookup failed:', { traceId, code: detError.code, message: detError.message })
      } else if (det?.id_condicao) {
        const n = parseInt(String(det.id_condicao), 10)
        if (Number.isFinite(n) && !isNaN(n) && n > 0) idCondicao = n
      }
    }

    const valorTotal = toNumber(pedido.valor_total, 0) || itens.reduce((acc, it) => acc + it.quantidade * it.valorUnitario, 0)
    const descontoExtra1 = toNumber(pedido.valor_desconto_extra, 0)
    const valorFinal = Math.max(0, valorTotal - descontoExtra1)

    let intervalos: number[] = []
    if (idCondicao) {
      const { data: cond, error: condError } = await supabase
        .from('Condicao_De_Pagamento')
        .select('intervalo_parcela')
        .eq('Condição_ID', idCondicao)
        .maybeSingle()
      if (condError) {
        console.warn('[TINY] Condicao_De_Pagamento lookup failed:', { traceId, code: condError.code, message: condError.message })
      } else if (cond?.intervalo_parcela) {
        if (Array.isArray(cond.intervalo_parcela)) {
          intervalos = cond.intervalo_parcela.map((x: any) => parseInt(String(x), 10)).filter((n: any) => Number.isFinite(n) && !isNaN(n) && n >= 0)
        } else {
          const n = parseInt(String(cond.intervalo_parcela), 10)
          if (Number.isFinite(n) && !isNaN(n) && n >= 0) intervalos = [n]
        }
      }
    }
    if (intervalos.length === 0) intervalos = [0]

    const parcelas = (() => {
      const n = intervalos.length
      const base = Math.floor((valorFinal / n) * 100) / 100
      const list = intervalos.map((dias) => ({ dias, valor: base }))
      // Ajustar ultima parcela para fechar o total
      const soma = list.reduce((acc, p) => acc + p.valor, 0)
      const diff = Math.round((valorFinal - soma) * 100) / 100
      list[list.length - 1].valor = Math.max(0, Math.round((list[list.length - 1].valor + diff) * 100) / 100)
      return list
    })()

    // 6) Montar Payload Tiny (JSON)
    const dataPedido = new Date().toISOString().slice(0, 10).split('-').reverse().join('/')
    const descontoExtra = toNumber(pedido.valor_desconto_extra, 0)

    const parcelasTiny = parcelas.map((p) => ({
      parcela: {
        dias: p.dias,
        valor: toNumber(p.valor, 0).toFixed(2),
      },
    }))

    const pedidoTiny: any = {
      pedido: {
        data_pedido: dataPedido,
        cliente: {
          codigo: contatoCodigo,
          nome: String(cliente.nome || '').trim(),
          nome_fantasia: String((cliente as any).nome_fantasia || '').trim(),
          tipo_pessoa: tipoPessoa,
          cpf_cnpj: String((cliente as any).cpf_cnpj || '').trim(),
          ie: ieFinal || '',
          endereco: String((cliente as any).rua || '').trim(),
          numero: String((cliente as any).numero || '').trim(),
          complemento: String((cliente as any).complemento || '').trim(),
          bairro: String((cliente as any).bairro || '').trim(),
          cep: String((cliente as any).cep || '').trim(),
          cidade: String((cliente as any).cidade || '').trim(),
          uf: String((cliente as any).uf || '').trim(),
          fone: String((cliente as any).telefone || '').trim(),
        },
        numero_ordem_compra: String(pedido.ordem_cliente || '').trim() || undefined,
        obs: String(pedido.observacao || '').trim() || undefined,
        obs_internas: String(pedido.observacao_interna || '').trim() || undefined,
        valor_desconto: descontoExtra.toFixed(2),
        parcelas: parcelasTiny,
        itens: itens.map((it: any) => ({
          item: {
            codigo: it.codigo,
            quantidade: it.quantidade,
            valor_unitario: toNumber(it.valorUnitario, 0),
            descricao: it.descricao,
          },
        })),
      },
    }

    // Mantemos natureza operacao se houver mapeamento (opcional no payload)
    if (tinyNaturezaValor) pedidoTiny.pedido.natureza_operacao = String(tinyNaturezaValor).trim()

    if (dryRun) {
      const duration = Date.now() - startTime
      return createHttpSuccessResponse(
        {
          trace_id: traceId,
          pedido_venda_ID: pedidoId,
          empresa_id: empresaId,
          tiny: {
            token_masked: maskToken(tinyToken),
            natureza_operacao: tinyNaturezaValor,
          },
          pedido: pedidoTiny,
        },
        200,
        { userId: user.id, duration: `${duration}ms` }
      )
    }

    // 7) Enviar apenas o pedido (JSON) usando somente pedido.incluir.php
    const tinyResp = await tinyIncluirPedidoJson({ token: tinyToken, traceId, pedidoTiny })
    const retorno = tinyResp?.retorno
    const registro = pickTinyRegistro(retorno)
    if (!registro.id) {
      throw createBadRequestError('Tiny nao retornou id do pedido', { tiny: tinyResp })
    }

    // Atualizar pedido local
    const { error: updError } = await supabase
      .from('pedido_venda')
      .update({
        id_tiny: String(registro.id),
        numero_pedido: registro.numero || pedido.numero_pedido || null,
        updated_at: new Date().toISOString(),
      })
      .eq('pedido_venda_ID', pedidoId)

    if (updError) {
      throw createBadRequestError('Falha ao atualizar pedido_venda com id_tiny', { code: updError.code, message: updError.message })
    }

    const duration = Date.now() - startTime
    return createHttpSuccessResponse(
      {
        trace_id: traceId,
        pedido_venda_ID: pedidoId,
        empresa_id: empresaId,
        tiny: { pedido_id: registro.id, pedido_numero: registro.numero || null },
      },
      200,
      { userId: user.id, duration: `${duration}ms` }
    )
  } catch (error) {
    // Padronizar resposta e incluir trace_id nos detalhes.
    const res = formatErrorResponse(error, true)
    try {
      const payload = await res.clone().json()
      payload.trace_id = payload.trace_id || traceId
      return new Response(JSON.stringify(payload), { status: res.status, headers: res.headers })
    } catch {
      return res
    }
  }
})
