-- Recuperação dos campos de cliente_contato/cliente_endereço apagados pelo bug
-- do UPSERT (EXCLUDED) em update_cliente_v2 (ver migration 140).
-- Estratégia: restaurar o ÚLTIMO valor não-nulo registrado em
-- cliente_historico_alteracoes.valorAnterior, SOMENTE onde o valor atual está null
-- (idempotente: rodar de novo não sobrescreve valores já preenchidos).
--
-- PRÉ-REQUISITO: aplicar a migration 140 ANTES (estancar), senão um save novo
-- pode reapagar durante a janela.

-- Helper genérico por campo via CTE. Um bloco por coluna.

-- 1) observacao (89)
UPDATE public.cliente_contato cc
SET observacao = sub.old_val
FROM (
  SELECT DISTINCT ON (h.cliente_id) h.cliente_id, (e->>'valorAnterior') AS old_val
  FROM cliente_historico_alteracoes h, jsonb_array_elements(h.campos_alterados) e
  WHERE e->>'campo' = 'cliente_contato.observacao' AND e->'valorAnterior' <> 'null'::jsonb
  ORDER BY h.cliente_id, h.data_hora DESC
) sub
WHERE cc.cliente_id = sub.cliente_id AND cc.observacao IS NULL;

-- 2) email (9)
UPDATE public.cliente_contato cc
SET email = sub.old_val
FROM (
  SELECT DISTINCT ON (h.cliente_id) h.cliente_id, (e->>'valorAnterior') AS old_val
  FROM cliente_historico_alteracoes h, jsonb_array_elements(h.campos_alterados) e
  WHERE e->>'campo' = 'cliente_contato.email' AND e->'valorAnterior' <> 'null'::jsonb
  ORDER BY h.cliente_id, h.data_hora DESC
) sub
WHERE cc.cliente_id = sub.cliente_id AND cc.email IS NULL;

-- 3) email_nf (4 recuperáveis)
UPDATE public.cliente_contato cc
SET email_nf = sub.old_val
FROM (
  SELECT DISTINCT ON (h.cliente_id) h.cliente_id, (e->>'valorAnterior') AS old_val
  FROM cliente_historico_alteracoes h, jsonb_array_elements(h.campos_alterados) e
  WHERE e->>'campo' = 'cliente_contato.email_nf' AND e->'valorAnterior' <> 'null'::jsonb
  ORDER BY h.cliente_id, h.data_hora DESC
) sub
WHERE cc.cliente_id = sub.cliente_id AND cc.email_nf IS NULL;

-- 4) telefone (5)
UPDATE public.cliente_contato cc
SET telefone = sub.old_val
FROM (
  SELECT DISTINCT ON (h.cliente_id) h.cliente_id, (e->>'valorAnterior') AS old_val
  FROM cliente_historico_alteracoes h, jsonb_array_elements(h.campos_alterados) e
  WHERE e->>'campo' = 'cliente_contato.telefone' AND e->'valorAnterior' <> 'null'::jsonb
  ORDER BY h.cliente_id, h.data_hora DESC
) sub
WHERE cc.cliente_id = sub.cliente_id AND cc.telefone IS NULL;

-- 5) telefone_adicional (5)
UPDATE public.cliente_contato cc
SET telefone_adicional = sub.old_val
FROM (
  SELECT DISTINCT ON (h.cliente_id) h.cliente_id, (e->>'valorAnterior') AS old_val
  FROM cliente_historico_alteracoes h, jsonb_array_elements(h.campos_alterados) e
  WHERE e->>'campo' = 'cliente_contato.telefone_adicional' AND e->'valorAnterior' <> 'null'::jsonb
  ORDER BY h.cliente_id, h.data_hora DESC
) sub
WHERE cc.cliente_id = sub.cliente_id AND cc.telefone_adicional IS NULL;

-- 6) website (4)
UPDATE public.cliente_contato cc
SET website = sub.old_val
FROM (
  SELECT DISTINCT ON (h.cliente_id) h.cliente_id, (e->>'valorAnterior') AS old_val
  FROM cliente_historico_alteracoes h, jsonb_array_elements(h.campos_alterados) e
  WHERE e->>'campo' = 'cliente_contato.website' AND e->'valorAnterior' <> 'null'::jsonb
  ORDER BY h.cliente_id, h.data_hora DESC
) sub
WHERE cc.cliente_id = sub.cliente_id AND cc.website IS NULL;

-- 7) endereço.complemento (4)
UPDATE public."cliente_endereço" ce
SET complemento = sub.old_val
FROM (
  SELECT DISTINCT ON (h.cliente_id) h.cliente_id, (e->>'valorAnterior') AS old_val
  FROM cliente_historico_alteracoes h, jsonb_array_elements(h.campos_alterados) e
  WHERE e->>'campo' = 'cliente_endereço.complemento' AND e->'valorAnterior' <> 'null'::jsonb
  ORDER BY h.cliente_id, h.data_hora DESC
) sub
WHERE ce.cliente_id = sub.cliente_id AND ce.complemento IS NULL;
