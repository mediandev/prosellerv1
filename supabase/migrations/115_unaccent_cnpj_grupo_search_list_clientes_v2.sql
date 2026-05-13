-- Habilita unaccent e refaz list_clientes_v2 com:
--   (a) busca insensivel a acento via unaccent()
--   (b) busca CNPJ por digitos puros (REGEXP_REPLACE)
--   (c) busca tambem em c.grupo_rede
-- Reportado por Valentim em 13/05/2026.

CREATE EXTENSION IF NOT EXISTS unaccent;

DROP FUNCTION IF EXISTS list_clientes_v2(INTEGER, INTEGER, UUID, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION list_clientes_v2(
  p_limit INTEGER DEFAULT 10,
  p_page INTEGER DEFAULT 1,
  p_requesting_user_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_status_aprovacao_filter TEXT DEFAULT NULL,
  p_vendedor_filter UUID DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
DECLARE
  v_offset INTEGER;
  v_total_count INTEGER;
  v_user_tipo TEXT;
  v_clientes JSON;
  v_search_norm TEXT;
  v_search_digits TEXT;
BEGIN
  IF p_page < 1 THEN RAISE EXCEPTION 'Page must be greater than 0'; END IF;
  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 100';
  END IF;

  IF p_requesting_user_id IS NOT NULL THEN
    SELECT tipo INTO v_user_tipo FROM public.user
    WHERE user_id = p_requesting_user_id AND ativo = TRUE AND deleted_at IS NULL;
  END IF;

  v_offset := (p_page - 1) * p_limit;

  -- Normaliza termo de busca para acentos+lowercase
  v_search_norm := CASE WHEN p_search IS NULL THEN NULL
                        ELSE unaccent(LOWER(p_search)) END;
  -- Extrai so digitos do termo de busca (para casar CNPJ sem mascara)
  v_search_digits := CASE WHEN p_search IS NULL THEN NULL
                           ELSE NULLIF(REGEXP_REPLACE(p_search, '[^0-9]', '', 'g'), '') END;

  SELECT COUNT(*) INTO v_total_count
  FROM public.cliente c
  WHERE c.deleted_at IS NULL
    AND (p_status_aprovacao_filter IS NULL OR c.status_aprovacao = p_status_aprovacao_filter)
    AND (
      v_search_norm IS NULL OR
      unaccent(LOWER(c.nome))           LIKE '%' || v_search_norm || '%' OR
      unaccent(LOWER(c.nome_fantasia))  LIKE '%' || v_search_norm || '%' OR
      unaccent(LOWER(COALESCE(c.grupo_rede, ''))) LIKE '%' || v_search_norm || '%' OR
      LOWER(c.codigo)                   LIKE '%' || LOWER(p_search) || '%' OR
      LOWER(c.cpf_cnpj)                 LIKE '%' || LOWER(p_search) || '%' OR
      (v_search_digits IS NOT NULL
       AND LENGTH(v_search_digits) >= 3
       AND REGEXP_REPLACE(COALESCE(c.cpf_cnpj, ''), '[^0-9]', '', 'g') LIKE '%' || v_search_digits || '%')
    )
    AND (
      v_user_tipo = 'backoffice' OR
      (v_user_tipo = 'vendedor' AND (
        c.criado_por = p_requesting_user_id
        OR p_requesting_user_id = ANY(c.vendedoresatribuidos)
      ) AND c.status_aprovacao = 'aprovado')
    )
    AND (p_vendedor_filter IS NULL OR p_vendedor_filter = ANY(c.vendedoresatribuidos));

  SELECT JSON_BUILD_OBJECT(
    'clientes', COALESCE(JSON_AGG(cliente_data), '[]'::JSON),
    'total', v_total_count,
    'page', p_page,
    'limit', p_limit,
    'total_pages', CEIL(v_total_count::NUMERIC / p_limit)
  )
  INTO v_clientes
  FROM (
    SELECT c.cliente_id, c.nome, c.nome_fantasia, c.cpf_cnpj, c.codigo,
           c.status_aprovacao, c.grupo_rede, c.created_at, c.updated_at
    FROM public.cliente c
    WHERE c.deleted_at IS NULL
      AND (p_status_aprovacao_filter IS NULL OR c.status_aprovacao = p_status_aprovacao_filter)
      AND (
        v_search_norm IS NULL OR
        unaccent(LOWER(c.nome))           LIKE '%' || v_search_norm || '%' OR
        unaccent(LOWER(c.nome_fantasia))  LIKE '%' || v_search_norm || '%' OR
        unaccent(LOWER(COALESCE(c.grupo_rede, ''))) LIKE '%' || v_search_norm || '%' OR
        LOWER(c.codigo)                   LIKE '%' || LOWER(p_search) || '%' OR
        LOWER(c.cpf_cnpj)                 LIKE '%' || LOWER(p_search) || '%' OR
        (v_search_digits IS NOT NULL
         AND LENGTH(v_search_digits) >= 3
         AND REGEXP_REPLACE(COALESCE(c.cpf_cnpj, ''), '[^0-9]', '', 'g') LIKE '%' || v_search_digits || '%')
      )
      AND (
        v_user_tipo = 'backoffice' OR
        (v_user_tipo = 'vendedor' AND (
          c.criado_por = p_requesting_user_id
          OR p_requesting_user_id = ANY(c.vendedoresatribuidos)
        ) AND c.status_aprovacao = 'aprovado')
      )
      AND (p_vendedor_filter IS NULL OR p_vendedor_filter = ANY(c.vendedoresatribuidos))
    ORDER BY c.created_at DESC
    LIMIT p_limit OFFSET v_offset
  ) AS cliente_data;

  RETURN v_clientes;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in list_clientes_v2: %', SQLERRM;
  RAISE;
END;
$$;

COMMENT ON FUNCTION list_clientes_v2 IS
'Lista clientes com busca acento-insensivel, CNPJ digits-only e match em grupo_rede (V 1.31)';

GRANT EXECUTE ON FUNCTION list_clientes_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION list_clientes_v2 FROM anon;
