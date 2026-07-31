-- Migration 149: itens reais da nota fiscal (base do relatório Solicitado × Faturado).
-- Fonte: webhook-tiny-atualizacao já consulta nota.fiscal.obter ao receber o evento
-- de NF emitida (para a logística); passamos a PERSISTIR os itens dessa mesma
-- resposta (zero chamadas novas ao Tiny). Estratégia de sync: DELETE por nota +
-- INSERT (idempotente, mesmo padrão das ocorrências SSW).

CREATE TABLE IF NOT EXISTS public.nota_fiscal_item (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_venda_id  bigint NOT NULL,
  id_nota_tiny     text NOT NULL,
  numero_nota      text,
  data_emissao     date,
  codigo_sku       text,
  descricao        text,
  quantidade       numeric NOT NULL DEFAULT 0,
  valor_unitario   numeric NOT NULL DEFAULT 0,
  valor_total      numeric NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nfi_pedido ON public.nota_fiscal_item (pedido_venda_id);
CREATE INDEX IF NOT EXISTS idx_nfi_nota   ON public.nota_fiscal_item (id_nota_tiny);

ALTER TABLE public.nota_fiscal_item ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_read_nfi" ON public.nota_fiscal_item;
CREATE POLICY "authenticated_read_nfi" ON public.nota_fiscal_item
  FOR SELECT TO authenticated USING (true);
