-- 091_cliente_codigo_prioridade_tiny.sql
-- Campos de rastreabilidade para codigo de cliente e validacao de unicidade logica.

ALTER TABLE public.cliente
  ADD COLUMN IF NOT EXISTS codigo_origem TEXT,
  ADD COLUMN IF NOT EXISTS codigo_tiny_sistema TEXT,
  ADD COLUMN IF NOT EXISTS codigo_tiny_id_externo TEXT,
  ADD COLUMN IF NOT EXISTS codigo_tiny_integration_ref TEXT,
  ADD COLUMN IF NOT EXISTS codigo_gerado_em TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cliente_codigo_origem_chk'
      AND conrelid = 'public.cliente'::regclass
  ) THEN
    ALTER TABLE public.cliente
      ADD CONSTRAINT cliente_codigo_origem_chk
      CHECK (codigo_origem IS NULL OR codigo_origem IN ('tiny_dap','tiny_cantico','sequencial','manual'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cliente_codigo_tiny_sistema_chk'
      AND conrelid = 'public.cliente'::regclass
  ) THEN
    ALTER TABLE public.cliente
      ADD CONSTRAINT cliente_codigo_tiny_sistema_chk
      CHECK (codigo_tiny_sistema IS NULL OR codigo_tiny_sistema IN ('dap','cantico'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_cliente_codigo_origem
  ON public.cliente (codigo_origem);

CREATE INDEX IF NOT EXISTS idx_cliente_codigo_tiny_externo
  ON public.cliente (codigo_tiny_id_externo)
  WHERE codigo_tiny_id_externo IS NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_cliente_codigo_unique_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.codigo IS NULL OR btrim(NEW.codigo) = '' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.cliente c
    WHERE c.codigo = NEW.codigo
      AND c.cliente_id <> NEW.cliente_id
      AND c.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Codigo de cliente ja utilizado: %', NEW.codigo;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_cliente_codigo_unique_v2 ON public.cliente;
CREATE TRIGGER trg_enforce_cliente_codigo_unique_v2
BEFORE INSERT OR UPDATE OF codigo
ON public.cliente
FOR EACH ROW
EXECUTE FUNCTION public.enforce_cliente_codigo_unique_v2();

COMMENT ON COLUMN public.cliente.codigo_origem IS 'Origem do codigo do cliente: tiny_dap, tiny_cantico, sequencial ou manual.';
COMMENT ON COLUMN public.cliente.codigo_tiny_sistema IS 'Sistema Tiny de origem do codigo (dap/cantico).';
COMMENT ON COLUMN public.cliente.codigo_tiny_id_externo IS 'Identificador/codigo do cliente vindo do Tiny de origem.';
COMMENT ON COLUMN public.cliente.codigo_tiny_integration_ref IS 'Referencia da integracao ERP usada no mapeamento do codigo.';
COMMENT ON COLUMN public.cliente.codigo_gerado_em IS 'Timestamp da definicao do codigo no cliente.';
