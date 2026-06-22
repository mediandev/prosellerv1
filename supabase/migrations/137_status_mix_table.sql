-- Migration 137: tabela status_mix para controlar mix de produtos por cliente

CREATE TABLE IF NOT EXISTS public.status_mix (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id bigint NOT NULL,
  produto_id bigint NOT NULL,
  status text NOT NULL DEFAULT 'inativo' CHECK (status IN ('ativo', 'inativo')),
  ativado_manualmente boolean NOT NULL DEFAULT false,
  codigo_sku_cliente text,
  data_ultimo_pedido timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cliente_id, produto_id)
);

ALTER TABLE public.status_mix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_manage_status_mix" ON public.status_mix
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_status_mix_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER status_mix_updated_at
  BEFORE UPDATE ON public.status_mix
  FOR EACH ROW EXECUTE FUNCTION public.update_status_mix_updated_at();
