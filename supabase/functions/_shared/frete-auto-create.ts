// R-LOG-3: best-effort auto-create de frete_logistica após envio ao Tiny.
// Isolado em módulo para testabilidade (mock do supabase client).
// Nunca lança exceção — falha é logada e ignorada.

interface AutoFreteParams {
  pedidoVendaId: number
  empresaId: number
  clienteId: number | null
  vendedorId: string | null
  valorProdutos: number
  criadoPor: string
  traceId: string
}

export interface AutoFreteResult {
  created: boolean
  skipped: boolean
  error: string | null
}

export async function autoCreateFreteLogistica(
  supabase: { from: (table: string) => { insert: (row: Record<string, unknown>) => Promise<{ error: { code?: string; message?: string } | null }> } },
  params: AutoFreteParams,
): Promise<AutoFreteResult> {
  try {
    const { error } = await supabase.from('frete_logistica').insert({
      pedido_venda_id: params.pedidoVendaId,
      nfe_numero: null,
      nfe_chave_acesso: null,
      cliente_id: params.clienteId,
      empresa_id: params.empresaId,
      vendedor_id: params.vendedorId,
      valor_produtos: params.valorProdutos,
      status_entrega: 'Em Separação',
      rateio: false,
      reentrega: false,
      criado_por: params.criadoPor,
      atualizado_por: params.criadoPor,
    })

    if (error) {
      if (error.code === '23505') {
        console.log('[TINY] R-LOG-3 frete already exists (idempotent skip):', {
          traceId: params.traceId,
          pedidoVendaId: params.pedidoVendaId,
        })
        return { created: false, skipped: true, error: null }
      }
      console.warn('[TINY] R-LOG-3 auto-create frete failed (best-effort):', {
        traceId: params.traceId,
        pedidoVendaId: params.pedidoVendaId,
        code: error.code,
        message: error.message,
      })
      return { created: false, skipped: false, error: error.message ?? String(error) }
    }

    console.log('[TINY] R-LOG-3 frete_logistica auto-created:', {
      traceId: params.traceId,
      pedidoVendaId: params.pedidoVendaId,
      empresaId: params.empresaId,
    })
    return { created: true, skipped: false, error: null }
  } catch (ex) {
    console.warn('[TINY] R-LOG-3 auto-create frete exception (best-effort):', {
      traceId: params.traceId,
      pedidoVendaId: params.pedidoVendaId,
      error: String(ex),
    })
    return { created: false, skipped: false, error: String(ex) }
  }
}
