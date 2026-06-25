-- Migration 138: log de falhas na consulta do regime tributário (Simples Nacional)
-- ao enviar pedido ao Tiny (ReceitaWS). Suporta o bloqueio duro (D3) + auditoria (D2).

CREATE TABLE IF NOT EXISTS public.regime_lookup_falha (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id      bigint NULL,
  pedido_venda_id bigint NULL,
  empresa_id      bigint NULL,
  cnpj            text NULL,
  razao_social    text NULL,
  motivo          text NULL,          -- reason do lookup (rate_limited/timeout/...)
  trace_id        text NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_regime_lookup_falha_cliente ON public.regime_lookup_falha (cliente_id);
CREATE INDEX IF NOT EXISTS idx_regime_lookup_falha_created ON public.regime_lookup_falha (created_at DESC);

ALTER TABLE public.regime_lookup_falha ENABLE ROW LEVEL SECURITY;

-- Leitura para usuários autenticados (painel/consulta). Escrita é via service role na edge.
CREATE POLICY "authenticated_read_regime_lookup_falha" ON public.regime_lookup_falha
  FOR SELECT
  TO authenticated
  USING (true);
