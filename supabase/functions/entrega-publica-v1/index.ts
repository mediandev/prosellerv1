// Edge Function: entrega-publica-v1
// URL pública (sem auth) para motoristas confirmarem entrega ou agendamento.
// Spec: FUNCIONALIDADE DE COMPROVANTES DE ENTREGA.docx
// Fluxo: GET ?chave=<44digits> → dados da NF para conferência
//        POST action=confirmar_entrega → salva foto + status "Entregue"
//        POST action=reportar_agendamento → salva data/hora/obs + status "Agendado"

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const BUCKET = 'logistica-comprovantes'

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function todayBR(): string {
  return new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    .split('/')
    .reverse()
    .join('-')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsHeaders, 'Access-Control-Max-Age': '86400' } })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  const url = new URL(req.url)

  // ── GET: lookup por chave de acesso ──────────────────────────────────────
  if (req.method === 'GET') {
    const chave = (url.searchParams.get('chave') || '').replace(/\D/g, '')
    if (!chave || chave.length !== 44) {
      return json(400, { success: false, error: 'Chave de acesso deve ter 44 dígitos.' })
    }

    const { data: frete, error } = await supabase
      .from('frete_logistica')
      .select(`
        id,
        nfe_numero,
        status_entrega,
        cliente:cliente_id(nome),
        empresa:empresa_id(razao_social, nome_fantasia)
      `)
      .eq('nfe_chave_acesso', chave)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) return json(500, { success: false, error: 'Erro ao consultar frete.' })
    if (!frete) return json(404, { success: false, error: 'Nenhum frete encontrado para esta chave de acesso.' })

    const empresa = frete.empresa as Record<string, unknown> | null
    const cliente = frete.cliente as Record<string, unknown> | null

    return json(200, {
      success: true,
      data: {
        freteId: frete.id,
        nfeNumero: frete.nfe_numero,
        statusEntrega: frete.status_entrega,
        clienteNome: cliente?.nome ?? null,
        empresaNome: (empresa?.nome_fantasia || empresa?.razao_social) ?? null,
      },
    })
  }

  // ── POST: ações do motorista ──────────────────────────────────────────────
  if (req.method === 'POST') {
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return json(400, { success: false, error: 'Body JSON inválido.' })
    }

    const action = String(body.action || '')
    const freteId = String(body.freteId || '')

    if (!freteId) return json(400, { success: false, error: 'freteId obrigatório.' })

    // Verificar que o frete existe e não está já entregue
    const { data: freteCheck, error: checkErr } = await supabase
      .from('frete_logistica')
      .select('id, status_entrega')
      .eq('id', freteId)
      .is('deleted_at', null)
      .maybeSingle()

    if (checkErr || !freteCheck) return json(404, { success: false, error: 'Frete não encontrado.' })
    if (freteCheck.status_entrega === 'Entregue') {
      return json(409, { success: false, error: 'Este frete já foi marcado como entregue.' })
    }

    // ── confirmar_entrega ─────────────────────────────────────────────────
    if (action === 'confirmar_entrega') {
      const fotoBase64 = String(body.fotoBase64 || '')
      const mimeType = String(body.mimeType || 'image/jpeg')

      if (!fotoBase64) return json(400, { success: false, error: 'fotoBase64 obrigatório.' })

      // Decodificar base64 e fazer upload
      const base64Data = fotoBase64.replace(/^data:[^;]+;base64,/, '')
      const binaryStr = atob(base64Data)
      const bytes = new Uint8Array(binaryStr.length)
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)

      const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg'
      const path = `${freteId}/comprovante-publico-${Date.now()}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, bytes, { contentType: mimeType, upsert: false })

      if (uploadErr) {
        console.error('[ENTREGA-PUBLICA] upload error:', uploadErr.message)
        return json(500, { success: false, error: 'Falha ao salvar foto.' })
      }

      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 60 * 24 * 365)

      const comprovanteUrl = signed?.signedUrl ?? null

      const { error: updateErr } = await supabase
        .from('frete_logistica')
        .update({
          status_entrega: 'Entregue',
          data_entrega: todayBR(),
          comprovante_entrega_url: comprovanteUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', freteId)

      if (updateErr) return json(500, { success: false, error: 'Falha ao atualizar status.' })

      return json(200, { success: true, data: { message: 'Entrega confirmada com sucesso.' } })
    }

    // ── reportar_agendamento ──────────────────────────────────────────────
    if (action === 'reportar_agendamento') {
      const dataAgendamento = String(body.dataAgendamento || '')
      const horaAgendamento = String(body.horaAgendamento || '')
      const obsAgendamento = String(body.obsAgendamento || '')

      if (!dataAgendamento) return json(400, { success: false, error: 'dataAgendamento obrigatório.' })

      const { error: updateErr } = await supabase
        .from('frete_logistica')
        .update({
          status_entrega: 'Agendado',
          data_agendamento: dataAgendamento,
          hora_agendamento: horaAgendamento || null,
          obs_agendamento: obsAgendamento || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', freteId)

      if (updateErr) return json(500, { success: false, error: 'Falha ao salvar agendamento.' })

      return json(200, { success: true, data: { message: 'Agendamento registrado com sucesso.' } })
    }

    return json(400, { success: false, error: `action inválida: ${action}` })
  }

  return json(405, { success: false, error: 'Method not allowed' })
})
