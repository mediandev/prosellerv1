-- Migration 108: Fix segmento inconsistencies
-- 5 clients have tipo_segmento with numeric ID string but segmento_id NULL
-- 10 clients have segmento_id but tipo_segmento NULL

-- Fix clients with tipo_segmento = numeric ID but segmento_id NULL
-- Map tipo_segmento value (stored as text ID) to segmento_id
UPDATE public.cliente
SET segmento_id = tipo_segmento::BIGINT,
    tipo_segmento = (SELECT nome FROM public.segmento_cliente WHERE id = tipo_segmento::BIGINT),
    updated_at = NOW()
WHERE segmento_id IS NULL
  AND tipo_segmento IS NOT NULL
  AND tipo_segmento ~ '^\d+$'
  AND EXISTS (SELECT 1 FROM public.segmento_cliente WHERE id = tipo_segmento::BIGINT);

-- Fix clients with segmento_id but tipo_segmento NULL
UPDATE public.cliente
SET tipo_segmento = sc.nome,
    updated_at = NOW()
FROM public.segmento_cliente sc
WHERE cliente.segmento_id = sc.id
  AND cliente.tipo_segmento IS NULL
  AND cliente.segmento_id IS NOT NULL;
