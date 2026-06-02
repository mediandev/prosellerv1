-- Migration 110: Increase grupos_redes list limit from 100 to 500
-- With 150+ groups, the old limit of 100 caused groups after position 100
-- (alphabetically) to be inaccessible in the client form dropdown.

CREATE OR REPLACE FUNCTION list_grupos_redes_v2(
  p_requesting_user_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_apenas_ativos BOOLEAN DEFAULT FALSE,
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 500
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
DECLARE
  v_offset INTEGER;
  v_total_count INTEGER;
  v_resultado JSON;
BEGIN
  IF p_page < 1 THEN
    RAISE EXCEPTION 'Page must be greater than 0';
  END IF;

  IF p_limit < 1 OR p_limit > 500 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 500';
  END IF;

  v_offset := (p_page - 1) * p_limit;

  SELECT COUNT(*)
  INTO v_total_count
  FROM public.grupos_redes g
  WHERE g.deleted_at IS NULL
    AND (NOT p_apenas_ativos OR g.ativo = TRUE)
    AND (
      p_search IS NULL OR
      TRIM(p_search) = '' OR
      LOWER(g.nome) LIKE '%' || LOWER(p_search) || '%' OR
      LOWER(COALESCE(g.descricao, '')) LIKE '%' || LOWER(p_search) || '%'
    );

  SELECT JSON_BUILD_OBJECT(
    'grupos', COALESCE(JSON_AGG(item_data), '[]'::JSON),
    'total', v_total_count,
    'page', p_page,
    'limit', p_limit,
    'total_pages', CEIL(v_total_count::NUMERIC / NULLIF(p_limit, 0))
  )
  INTO v_resultado
  FROM (
    SELECT JSON_BUILD_OBJECT(
      'id', g.id::TEXT,
      'nome', g.nome,
      'descricao', g.descricao,
      'ativo', g.ativo,
      'createdAt', g.created_at,
      'updatedAt', g.updated_at
    ) AS item_data
    FROM public.grupos_redes g
    WHERE g.deleted_at IS NULL
      AND (NOT p_apenas_ativos OR g.ativo = TRUE)
      AND (
        p_search IS NULL OR
        TRIM(p_search) = '' OR
        LOWER(g.nome) LIKE '%' || LOWER(p_search) || '%' OR
        LOWER(COALESCE(g.descricao, '')) LIKE '%' || LOWER(p_search) || '%'
      )
    ORDER BY g.nome ASC
    LIMIT p_limit
    OFFSET v_offset
  ) AS sub;

  RETURN v_resultado;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in list_grupos_redes_v2: %', SQLERRM;
    RAISE;
END;
$$;
