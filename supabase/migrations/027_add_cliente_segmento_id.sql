-- ============================================================================
-- Migration 027: Adicionar segmento_id na tabela cliente (FK segmento_cliente)
-- ============================================================================
-- Referencia a tabela segmento_cliente para segmento do cliente
-- ============================================================================

ALTER TABLE public.cliente
ADD COLUMN IF NOT EXISTS segmento_id BIGINT REFERENCES public.segmento_cliente(id);

CREATE INDEX IF NOT EXISTS idx_cliente_segmento_id
ON public.cliente(segmento_id)
WHERE deleted_at IS NULL AND segmento_id IS NOT NULL;

COMMENT ON COLUMN public.cliente.segmento_id IS 'Referência ao segmento do cliente (tabela segmento_cliente)';
