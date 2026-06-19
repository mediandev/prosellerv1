// Edge Function: entrega-publica-v1
// Endpoint PÚBLICO (sem auth de usuário) para motoristas confirmarem entrega
// ou agendarem reentrega via chave de acesso NFe.
//
// GET  ?chave=<44digits>           → busca frete por nfe_chave_acesso
// POST action=confirmar_entrega    → upload foto + atualiza status → Entregue
// POST action=reportar_agendamento → atualiza status → Aguardando Agendamento + campos

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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  const url = new URL(req.url)

  // ─── GET: buscar frete por chave de acesso ────────────────────────────────
  if (req.method === 'GET') {
    const chave = url.searchParams.get('chave')?.replace(/\D/g, '') ?? ''
    if (chave.length !== 44) return json(400, { error: 'Chave de acesso inválida (44 dígitos).' })

    const { data, error } = await admin
      .from('frete_logistica')
      .select(`
        id,
        nfe_numero,
        status_entrega,
        pedido_venda:pedido_venda_id (
          cliente:cliente_id ( nome_razao_social ),
          empresa:empresa_id ( nome_fantasia, razao_social )
        )
      `)
      .eq('nfe_chave_acesso', chave)
      .is('deleted_at', null)
      .single()

    if (error || !data) return json(404, { error: 'Frete não encontrado para esta chave de acesso.' })

    const pedido = data.pedido_venda as Record<string, Record<string, string>> | null
    return json(200, {
      freteId: data.id,
      nfeNumero: data.nfe_numero ?? null,
      statusEntrega: data.status_entrega ?? null,
      clienteNome: pedido?.cliente?.nome_razao_social ?? null,
      empresaNome: pedido?.empresa?.nome_fantasia ?? pedido?.empresa?.razao_social ?? null,
    })
  }

  // ─── POST: confirmar entrega ou agendar ───────────────────────────────────
  if (req.method === 'POST') {
    let body: Record<string, unknown>
    try { body = await req.json() } catch { return json(400, { error: 'Body inválido.' }) }

    const action = body.action as string | undefined
    const freteId = body.freteId as string | undefined
    if (!freteId) return json(400, { error: 'freteId é obrigatório.' })

    // valida frete
    const { data: frete, error: fetchErr } = await admin
      .from('frete_logistica')
      .select('id, status_entrega')
      .eq('id', freteId)
      .is('deleted_at', null)
      .single()

    if (fetchErr || !frete) return json(404, { error: 'Frete não encontrado.' })
    if (frete.status_entrega === 'Entregue') return json(409, { error: 'Frete já foi marcado como Entregue.' })

    // ── confirmar_entrega ──────────────────────────────────────────────────
    if (action === 'confirmar_entrega') {
      const fotoBase64 = body.fotoBase64 as string | undefined
      const mimeType = (body.mimeType as string | undefined) ?? 'image/jpeg'
      if (!fotoBase64) return json(400, { error: 'fotoBase64 é obrigatório.' })

      const ext = mimeType.includes('pdf') ? 'pdf' : mimeType.split('/')[1] ?? 'jpg'
      const path = `${freteId}/comprovante-publico-${Date.now()}.${ext}`

      const bytes = Uint8Array.from(atob(fotoBase64), (c) => c.charCodeAt(0))
      const { error: uploadErr } = await admin.storage
        .from('logistica-comprovantes')
        .upload(path, bytes, { contentType: mimeType, upsert: false })

      if (uploadErr) return json(500, { error: `Falha no upload: ${uploadErr.message}` })

      const { data: urlData } = admin.storage
        .from('logistica-comprovantes')
        .getPublicUrl(path)

      const today = new Date().toISOString().slice(0, 10)
      const { error: updateErr } = await admin
        .from('frete_logistica')
        .update({
          status_entrega: 'Entregue',
          data_entrega: today,
          comprovante_entrega_url: urlData?.publicUrl ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', freteId)

      if (updateErr) return json(500, { error: `Falha ao atualizar frete: ${updateErr.message}` })
      return json(200, { ok: true })
    }

    // ── reportar_agendamento ───────────────────────────────────────────────
    if (action === 'reportar_agendamento') {
      const dataAgendamento = body.dataAgendamento as string | undefined
      if (!dataAgendamento) return json(400, { error: 'dataAgendamento é obrigatório.' })

      const { error: updateErr } = await admin
        .from('frete_logistica')
        .update({
          status_entrega: 'Aguardando Agendamento',
          data_agendamento: dataAgendamento,
          hora_agendamento: (body.horaAgendamento as string | null) ?? null,
          obs_agendamento: (body.obsAgendamento as string | null) ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', freteId)

      if (updateErr) return json(500, { error: `Falha ao atualizar frete: ${updateErr.message}` })
      return json(200, { ok: true })
    }

    return json(400, { error: `Ação desconhecida: ${action}` })
  }

  return json(405, { error: 'Método não permitido.' })
})
