// Edge Function: romaneio-logistica-v1
// Gerencia Romaneios de Expedição: listagem, criação e detalhamento.
//
// GET  (sem params)                       → lista romaneios da empresa do usuário
// GET  ?id=<uuid>                         → detalhe de um romaneio com fretes
// GET  ?action=listar_disponiveis         → fretes disponíveis para incluir num romaneio
//        &empresa_id=X [&transportador_id=Y]
// POST action=create                      → cria romaneio + muda fretes para Em Trânsito

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

interface AuthUser { id: string; tipo: string }

async function validateJWT(req: Request, supabaseUrl: string, serviceKey: string): Promise<AuthUser | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const sb = createClient(supabaseUrl, serviceKey, { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error } = await sb.auth.getUser(token)
  if (error || !user) return null
  const { data: row } = await sb.from('user').select('user_id, tipo, ativo').eq('user_id', user.id).eq('ativo', true).is('deleted_at', null).single()
  if (!row) return null
  return { id: row.user_id, tipo: row.tipo }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const authUser = await validateJWT(req, supabaseUrl, serviceKey)
  if (!authUser) return json(401, { error: 'Não autorizado.' })

  const url = new URL(req.url)

  // ──────────────────────────────────────────────────────────────────────────
  // GET
  // ──────────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const action = url.searchParams.get('action')
    const id = url.searchParams.get('id')

    // GET ?action=listar_disponiveis — fretes prontos para romaneio
    if (action === 'listar_disponiveis') {
      const empresaId = url.searchParams.get('empresa_id')
      const transportadorId = url.searchParams.get('transportador_id')
      if (!empresaId) return json(400, { error: 'empresa_id é obrigatório.' })

      // IDs de fretes já em algum romaneio
      const { data: jaUsados } = await admin
        .from('romaneio_frete')
        .select('frete_id')

      const freteIdsUsados = (jaUsados ?? []).map((r: { frete_id: number }) => r.frete_id)

      let query = admin
        .from('frete_logistica')
        .select(`
          id,
          nfe_numero,
          nfe_chave_acesso,
          pedido_venda_id,
          volumes,
          peso_bruto,
          valor_produtos,
          valor_cotacao,
          transportador_id,
          cliente:cliente_id ( cliente_id, nome_razao_social ),
          transportador:transportador_id ( id, razao_social, nome_fantasia )
        `)
        .eq('empresa_id', empresaId)
        .in('status_entrega', ['Em Separação', 'Aguardando Coleta'])
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(200)

      if (freteIdsUsados.length > 0) {
        query = query.not('id', 'in', `(${freteIdsUsados.join(',')})`)
      }

      if (transportadorId) {
        query = query.eq('transportador_id', transportadorId)
      }

      const { data, error } = await query
      if (error) return json(500, { error: error.message })

      // Enriquecer com endereço do cliente
      const enriched = await Promise.all((data ?? []).map(async (f: Record<string, unknown>) => {
        const clienteObj = f.cliente as { cliente_id?: number; nome_razao_social?: string } | null
        let cidade: string | null = null
        let uf: string | null = null
        let cep: string | null = null
        if (clienteObj?.cliente_id) {
          const { data: end } = await admin
            .from('cliente_endereço')
            .select('cidade, uf, cep')
            .eq('cliente_id', clienteObj.cliente_id)
            .single()
          cidade = end?.cidade ?? null
          uf = end?.uf ?? null
          cep = end?.cep ?? null
        }
        const transp = f.transportador as { razao_social?: string; nome_fantasia?: string } | null
        return {
          freteId: String(f.id),
          nfeNumero: f.nfe_numero ?? null,
          nfeChaveAcesso: f.nfe_chave_acesso ?? null,
          pedidoVendaId: f.pedido_venda_id ?? null,
          clienteNome: clienteObj?.nome_razao_social ?? null,
          clienteCidade: cidade,
          clienteUf: uf,
          clienteCep: cep,
          transportadorId: f.transportador_id ?? null,
          transportadorNome: transp?.nome_fantasia ?? transp?.razao_social ?? null,
          volumes: f.volumes ?? null,
          pesoBruto: f.peso_bruto ?? null,
          valorProdutos: f.valor_produtos ?? 0,
          valorCotacao: f.valor_cotacao ?? null,
        }
      }))

      return json(200, { fretes: enriched })
    }

    // GET ?id=<uuid> — detalhe de um romaneio
    if (id) {
      const { data: rom, error: romErr } = await admin
        .from('romaneio_expedicao')
        .select(`
          id, numero, data_romaneio, observacoes, created_at,
          empresa:empresa_id ( id, razao_social, nome_fantasia, cnpj, endereco ),
          transportador:transportador_id ( id, razao_social, nome_fantasia, cnpj )
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single()

      if (romErr || !rom) return json(404, { error: 'Romaneio não encontrado.' })

      const { data: juncoes } = await admin
        .from('romaneio_frete')
        .select('frete_id')
        .eq('romaneio_id', id)

      const freteIds = (juncoes ?? []).map((j: { frete_id: number }) => j.frete_id)

      let fretes: unknown[] = []
      if (freteIds.length > 0) {
        const { data: fretesData } = await admin
          .from('frete_logistica')
          .select(`
            id,
            nfe_numero,
            pedido_venda_id,
            volumes,
            peso_bruto,
            valor_produtos,
            valor_cotacao,
            cliente:cliente_id ( cliente_id, nome_razao_social )
          `)
          .in('id', freteIds)
          .is('deleted_at', null)

        fretes = await Promise.all((fretesData ?? []).map(async (f: Record<string, unknown>) => {
          const clienteObj = f.cliente as { cliente_id?: number; nome_razao_social?: string } | null
          let cidade: string | null = null; let uf: string | null = null; let cep: string | null = null
          if (clienteObj?.cliente_id) {
            const { data: end } = await admin.from('cliente_endereço').select('cidade, uf, cep').eq('cliente_id', clienteObj.cliente_id).single()
            cidade = end?.cidade ?? null; uf = end?.uf ?? null; cep = end?.cep ?? null
          }
          return {
            freteId: String(f.id),
            nfeNumero: f.nfe_numero ?? null,
            pedidoVendaId: f.pedido_venda_id ?? null,
            clienteNome: clienteObj?.nome_razao_social ?? null,
            clienteCidade: cidade, clienteUf: uf, clienteCep: cep,
            volumes: f.volumes ?? null,
            pesoBruto: f.peso_bruto ?? null,
            valorProdutos: f.valor_produtos ?? 0,
            valorCotacao: f.valor_cotacao ?? null,
          }
        }))
      }

      const romObj = rom as Record<string, unknown>
      const empObj = romObj.empresa as Record<string, unknown> | null
      const transpObj = romObj.transportador as Record<string, unknown> | null

      const totalVolumes = fretes.reduce((s, f) => s + ((f as Record<string, number | null>).volumes ?? 0), 0)
      const totalPeso = fretes.reduce((s, f) => s + ((f as Record<string, number | null>).pesoBruto ?? 0), 0)
      const totalProdutos = fretes.reduce((s, f) => s + ((f as Record<string, number | null>).valorProdutos ?? 0), 0)

      return json(200, {
        id: romObj.id,
        numero: romObj.numero,
        dataRomaneio: romObj.data_romaneio,
        observacoes: romObj.observacoes ?? null,
        createdAt: romObj.created_at,
        empresaId: empObj?.id ?? null,
        empresaNome: (empObj?.nome_fantasia ?? empObj?.razao_social) ?? null,
        empresaRazaoSocial: empObj?.razao_social ?? null,
        empresaCnpj: empObj?.cnpj ?? null,
        empresaEndereco: empObj?.endereco ?? null,
        transportadorId: transpObj?.id ?? null,
        transportadorNome: (transpObj?.nome_fantasia ?? transpObj?.razao_social) ?? null,
        transportadorCnpj: transpObj?.cnpj ?? null,
        fretes,
        totais: { volumes: totalVolumes, pesoBruto: totalPeso, valorProdutos: totalProdutos },
      })
    }

    // GET sem params — lista romaneios
    const empresaIdFilter = url.searchParams.get('empresa_id')
    let listQuery = admin
      .from('romaneio_expedicao')
      .select(`
        id, numero, data_romaneio, created_at,
        transportador:transportador_id ( razao_social, nome_fantasia )
      `)
      .is('deleted_at', null)
      .order('numero', { ascending: false })
      .limit(100)

    if (empresaIdFilter) listQuery = listQuery.eq('empresa_id', empresaIdFilter)

    const { data: lista, error: listaErr } = await listQuery
    if (listaErr) return json(500, { error: listaErr.message })

    const listaComQtd = await Promise.all((lista ?? []).map(async (r: Record<string, unknown>) => {
      const { count } = await admin.from('romaneio_frete').select('*', { count: 'exact', head: true }).eq('romaneio_id', r.id)
      const transp = r.transportador as { razao_social?: string; nome_fantasia?: string } | null
      return {
        id: r.id,
        numero: r.numero,
        dataRomaneio: r.data_romaneio,
        createdAt: r.created_at,
        transportadorNome: transp?.nome_fantasia ?? transp?.razao_social ?? null,
        qtdFretes: count ?? 0,
      }
    }))

    return json(200, { romaneios: listaComQtd })
  }

  // ──────────────────────────────────────────────────────────────────────────
  // POST action=create
  // ──────────────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    let body: Record<string, unknown>
    try { body = await req.json() } catch { return json(400, { error: 'Body inválido.' }) }

    if (body.action !== 'create') return json(400, { error: 'action deve ser "create".' })

    const empresaId = body.empresaId as number | undefined
    const freteIds = body.freteIds as string[] | undefined
    const dataRomaneio = body.dataRomaneio as string | undefined
    const transportadorId = (body.transportadorId as number | undefined) ?? null
    const observacoes = (body.observacoes as string | undefined) ?? null

    if (!empresaId) return json(400, { error: 'empresaId é obrigatório.' })
    if (!freteIds?.length) return json(400, { error: 'freteIds não pode ser vazio.' })
    if (!dataRomaneio) return json(400, { error: 'dataRomaneio é obrigatório.' })

    // Próximo número sequencial por empresa (tolerante a race: UNIQUE faz retry implícito)
    const { data: maxRow } = await admin
      .from('romaneio_expedicao')
      .select('numero')
      .eq('empresa_id', empresaId)
      .is('deleted_at', null)
      .order('numero', { ascending: false })
      .limit(1)
      .single()

    const proximoNumero = ((maxRow as { numero: number } | null)?.numero ?? 0) + 1

    // Criar romaneio
    const { data: newRom, error: createErr } = await admin
      .from('romaneio_expedicao')
      .insert({
        numero: proximoNumero,
        empresa_id: empresaId,
        transportador_id: transportadorId,
        data_romaneio: dataRomaneio,
        observacoes,
        created_by: authUser.id,
      })
      .select('id, numero')
      .single()

    if (createErr || !newRom) return json(500, { error: createErr?.message ?? 'Erro ao criar romaneio.' })

    const romaneioId = (newRom as { id: string; numero: number }).id

    // Inserir junções
    const juncoes = freteIds.map((fid) => ({ romaneio_id: romaneioId, frete_id: Number(fid) }))
    const { error: juncErr } = await admin.from('romaneio_frete').insert(juncoes)
    if (juncErr) {
      // Rollback manual: deletar o romaneio criado
      await admin.from('romaneio_expedicao').delete().eq('id', romaneioId)
      return json(500, { error: `Erro ao vincular fretes: ${juncErr.message}` })
    }

    // Mudar status dos fretes para Em Trânsito
    const { error: updateErr } = await admin
      .from('frete_logistica')
      .update({ status_entrega: 'Em Trânsito', updated_at: new Date().toISOString() })
      .in('id', freteIds.map(Number))

    if (updateErr) {
      // Não desfaz o romaneio — log e continua (não é crítico que o status falhe)
      console.error('[romaneio-logistica-v1] Erro ao mudar status fretes:', updateErr.message)
    }

    return json(201, { romaneioId, numero: (newRom as { numero: number }).numero })
  }

  return json(405, { error: 'Método não permitido.' })
})
