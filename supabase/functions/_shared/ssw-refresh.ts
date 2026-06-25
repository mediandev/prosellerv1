// SSW refresh — fonte única da lógica de atualização de rastreio SSW de um frete.
// Usado por:
//   - frete-logistica-v1 (detalhe on-demand + action=ssw_sweep do Kanban)
//   - ssw-sweep-v1 (cron horário)
// Mantém o comportamento histórico do handleGetWithOcorrencias (cache 30 min),
// com a opção `force` para o botão "Atualizar agora" da tela de detalhe.

import { fetchSswTracking, mapSswToOcorrencias, isCacheStale } from './ssw-client.ts'
import { isTerminalStatus, resolveFreteStatusFromTracking } from './frete-logistica-helpers.ts'

// Status terminais — não evoluem mais via SSW. Tudo o que NÃO está aqui é
// considerado "ativo" e elegível para varredura (robusto a drift de status,
// já que há duas definições divergentes de status no projeto).
const TERMINAL_FILTER = '("Entregue","Devolvido - Entregue")'

export interface FreteLite {
  id: string | number
  nfe_chave_acesso: string | null
  status_entrega: string
}

export interface RefreshResult {
  polled: boolean
  newStatus?: string
}

/**
 * Atualiza as ocorrências SSW de UM frete. Respeita cache de 30 min salvo
 * quando `force` é true (botão "Atualizar agora"). Não lança — devolve
 * { polled:false } em qualquer falha para não derrubar varreduras em lote.
 */
export async function refreshSswForFrete(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  frete: FreteLite,
  opts: { force?: boolean } = {},
): Promise<RefreshResult> {
  const id = String(frete.id)
  const chaveNfe = frete.nfe_chave_acesso
  const currentStatus = frete.status_entrega

  if (!chaveNfe || !/^[0-9]{44}$/.test(chaveNfe)) return { polled: false }
  if (isTerminalStatus(currentStatus)) return { polled: false }

  // Cache: pula se a última ocorrência for recente (salvo force).
  if (!opts.force) {
    const { data: latestOcorr } = await supabase
      .from('frete_logistica_ocorrencia')
      .select('created_at')
      .eq('frete_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (!isCacheStale(latestOcorr?.created_at as string | null | undefined)) {
      return { polled: false }
    }
  }

  const sswResponse = await fetchSswTracking(chaveNfe)
  if (!sswResponse.success || sswResponse.documento.tracking.length === 0) {
    // Sem dados novos — preserva ocorrências existentes.
    return { polled: false }
  }

  const inserts = mapSswToOcorrencias(sswResponse, id)
  await supabase.from('frete_logistica_ocorrencia').delete().eq('frete_id', id)
  const { error: insertErr } = await supabase
    .from('frete_logistica_ocorrencia')
    .insert(inserts)
  if (insertErr) return { polled: false }

  const newStatus = resolveFreteStatusFromTracking(
    sswResponse.documento.tracking.map((t) => ({ tipo: t.tipo, ocorrencia: t.ocorrencia })),
  )
  const statusPatch: Record<string, unknown> = {
    status_entrega: newStatus,
    updated_at: new Date().toISOString(),
  }
  if (newStatus === 'Entregue') {
    const last = sswResponse.documento.tracking[sswResponse.documento.tracking.length - 1]
    if (last?.data_hora_efetiva) {
      const d = new Date(last.data_hora_efetiva)
      if (!isNaN(d.getTime())) statusPatch.data_entrega = d.toISOString().split('T')[0]
    }
  }
  await supabase.from('frete_logistica').update(statusPatch).eq('id', id)
  return { polled: true, newStatus }
}

export interface SweepResult {
  candidatos: number
  atualizados: number
}

/**
 * Varre fretes não-terminais com chave NFe e atualiza o rastreio de cada um.
 * Usado pelo botão "Atualizar" do Kanban (escopo opcional por ids/empresa) e
 * pelo cron horário (varredura geral). Respeita cache salvo `force`.
 */
export async function sweepSsw(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  opts: { empresaId?: string | null; ids?: string[]; limit?: number; force?: boolean } = {},
): Promise<SweepResult> {
  let query = supabase
    .from('frete_logistica')
    .select('id, nfe_chave_acesso, status_entrega')
    .is('deleted_at', null)
    .not('nfe_chave_acesso', 'is', null)
    .not('status_entrega', 'in', TERMINAL_FILTER)
    .order('updated_at', { ascending: true, nullsFirst: true })
    .limit(opts.limit ?? 300)

  if (opts.empresaId) query = query.eq('empresa_id', opts.empresaId)
  if (opts.ids && opts.ids.length > 0) query = query.in('id', opts.ids)

  const { data, error } = await query
  if (error) return { candidatos: 0, atualizados: 0 }

  const candidatos = (data ?? []) as FreteLite[]
  let atualizados = 0
  for (const frete of candidatos) {
    try {
      const r = await refreshSswForFrete(supabase, frete, { force: opts.force })
      if (r.polled) atualizados++
    } catch (_err) {
      // segue a varredura — uma falha pontual não derruba o lote
    }
  }
  return { candidatos: candidatos.length, atualizados }
}
