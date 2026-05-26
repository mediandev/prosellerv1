-- Migration 112: Remove client codes embedded in nome (razão social)
-- Pattern: "COMPANY NAME (12345)" → "COMPANY NAME"
-- Affects ~480 clients

BEGIN;

UPDATE public.cliente
SET nome = TRIM(REGEXP_REPLACE(nome, '\s*\(\d+\)\s*$', '')),
    updated_at = NOW()
WHERE nome ~ '\(\d+\)\s*$'
  AND deleted_at IS NULL;

COMMIT;
