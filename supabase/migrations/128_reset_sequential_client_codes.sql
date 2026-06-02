-- Migration 113: Reset all client codes and generate new sequential ones
-- Codes start from 1, no zero-padding, ordered alphabetically by nome
-- Also creates a de-para (old→new) reference table

BEGIN;

-- 0. Temporarily disable the uniqueness trigger
ALTER TABLE public.cliente DISABLE TRIGGER trg_enforce_cliente_codigo_unique_v2;

-- 1. Create de-para table for transition reference
CREATE TABLE IF NOT EXISTS public.cliente_codigo_depara (
  cliente_id BIGINT PRIMARY KEY REFERENCES public.cliente(cliente_id),
  codigo_antigo TEXT,
  codigo_novo TEXT NOT NULL,
  migrado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Save current codes and compute new sequential codes
INSERT INTO public.cliente_codigo_depara (cliente_id, codigo_antigo, codigo_novo)
SELECT
  c.cliente_id,
  c.codigo,
  ROW_NUMBER() OVER (ORDER BY c.nome ASC, c.cliente_id ASC)::TEXT
FROM public.cliente c
WHERE c.deleted_at IS NULL
ON CONFLICT (cliente_id) DO UPDATE
SET codigo_antigo = EXCLUDED.codigo_antigo,
    codigo_novo = EXCLUDED.codigo_novo,
    migrado_em = NOW();

-- 3. Clear ALL codes first (avoids uniqueness conflicts)
UPDATE public.cliente
SET codigo = NULL,
    codigo_origem = NULL,
    codigo_tiny_sistema = NULL,
    codigo_tiny_id_externo = NULL,
    codigo_tiny_integration_ref = NULL,
    codigo_gerado_em = NULL
WHERE deleted_at IS NULL;

-- 4. Apply new sequential codes
UPDATE public.cliente c
SET
  codigo = dp.codigo_novo,
  codigo_origem = 'sequencial',
  codigo_gerado_em = NOW(),
  updated_at = NOW()
FROM public.cliente_codigo_depara dp
WHERE c.cliente_id = dp.cliente_id
  AND c.deleted_at IS NULL;

-- 5. Clear codes on soft-deleted clients
UPDATE public.cliente
SET
  codigo = NULL,
  codigo_origem = NULL,
  codigo_tiny_sistema = NULL,
  codigo_tiny_id_externo = NULL,
  codigo_tiny_integration_ref = NULL,
  codigo_gerado_em = NULL,
  updated_at = NOW()
WHERE deleted_at IS NOT NULL;

-- 6. Re-enable the uniqueness trigger
ALTER TABLE public.cliente ENABLE TRIGGER trg_enforce_cliente_codigo_unique_v2;

COMMIT;
