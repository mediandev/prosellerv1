-- ============================================================================
-- Migration 014: Funções RPC para Grupos/Redes (v2)
-- ============================================================================
-- Descrição: Cria funções RPC para gerenciamento de grupos/redes de clientes
--            seguindo padrão arquitetural com validações, soft delete e auditoria
-- Data: 2026-01-29
-- ============================================================================

-- ============================================================================
-- 1. FUNÇÃO: create_grupos_redes_v2
-- ============================================================================

CREATE OR REPLACE FUNCTION create_grupos_redes_v2(
  p_nome TEXT,
  p_descricao TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  nome TEXT,
  descricao TEXT,
  ativo BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_grupo_id UUID;
  v_user_tipo TEXT;
BEGIN
  IF p_nome IS NULL OR LENGTH(TRIM(p_nome)) < 2 THEN
    RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.grupos_redes gr
    WHERE LOWER(TRIM(gr.nome)) = LOWER(TRIM(p_nome))
    AND gr.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Grupo/rede com este nome já existe';
  END IF;

  IF p_created_by IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_created_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem criar grupos/redes';
    END IF;
  END IF;

  INSERT INTO public.grupos_redes (
    nome,
    descricao,
    ativo,
    created_at,
    updated_at
  ) VALUES (
    TRIM(p_nome),
    NULLIF(TRIM(p_descricao), ''),
    TRUE,
    NOW(),
    NOW()
  )
  RETURNING grupos_redes.id INTO v_grupo_id;

  RETURN QUERY
  SELECT
    g.id,
    g.nome,
    g.descricao,
    g.ativo,
    g.created_at,
    g.updated_at
  FROM public.grupos_redes g
  WHERE g.id = v_grupo_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_grupos_redes_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION create_grupos_redes_v2 IS
'Cria um novo grupo/rede com validações de nome único';

GRANT EXECUTE ON FUNCTION create_grupos_redes_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION create_grupos_redes_v2 FROM anon;

-- ============================================================================
-- 2. FUNÇÃO: list_grupos_redes_v2
-- ============================================================================

CREATE OR REPLACE FUNCTION list_grupos_redes_v2(
  p_requesting_user_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_apenas_ativos BOOLEAN DEFAULT FALSE,
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 100
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

  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 100';
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

COMMENT ON FUNCTION list_grupos_redes_v2 IS
'Lista grupos/redes com filtros, paginação e busca';

GRANT EXECUTE ON FUNCTION list_grupos_redes_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION list_grupos_redes_v2 TO anon;

-- ============================================================================
-- 3. FUNÇÃO: get_grupos_redes_v2
-- ============================================================================

CREATE OR REPLACE FUNCTION get_grupos_redes_v2(
  p_id UUID
)
RETURNS TABLE (
  id UUID,
  nome TEXT,
  descricao TEXT,
  ativo BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
BEGIN
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'ID é obrigatório';
  END IF;

  RETURN QUERY
  SELECT
    g.id,
    g.nome,
    g.descricao,
    g.ativo,
    g.created_at,
    g.updated_at
  FROM public.grupos_redes g
  WHERE g.id = p_id
    AND g.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Grupo/rede não encontrado';
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in get_grupos_redes_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION get_grupos_redes_v2 IS
'Busca um grupo/rede específico por ID';

GRANT EXECUTE ON FUNCTION get_grupos_redes_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION get_grupos_redes_v2 TO anon;

-- ============================================================================
-- 4. FUNÇÃO: update_grupos_redes_v2
-- ============================================================================

CREATE OR REPLACE FUNCTION update_grupos_redes_v2(
  p_id UUID,
  p_nome TEXT DEFAULT NULL,
  p_descricao TEXT DEFAULT NULL,
  p_ativo BOOLEAN DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  nome TEXT,
  descricao TEXT,
  ativo BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_user_tipo TEXT;
BEGIN
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'ID é obrigatório';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.grupos_redes gr
    WHERE gr.id = p_id AND gr.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Grupo/rede não encontrado';
  END IF;

  IF p_nome IS NOT NULL THEN
    IF LENGTH(TRIM(p_nome)) < 2 THEN
      RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.grupos_redes gr
      WHERE LOWER(TRIM(gr.nome)) = LOWER(TRIM(p_nome))
      AND gr.id != p_id
      AND gr.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Grupo/rede com este nome já existe';
    END IF;
  END IF;

  IF p_updated_by IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_updated_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem atualizar grupos/redes';
    END IF;
  END IF;

  UPDATE public.grupos_redes
  SET
    nome = COALESCE(NULLIF(TRIM(p_nome), ''), grupos_redes.nome),
    descricao = CASE
      WHEN p_descricao IS NULL THEN grupos_redes.descricao
      WHEN TRIM(p_descricao) = '' THEN NULL
      ELSE TRIM(p_descricao)
    END,
    ativo = COALESCE(p_ativo, grupos_redes.ativo),
    updated_at = NOW()
  WHERE grupos_redes.id = p_id;

  RETURN QUERY
  SELECT
    g.id,
    g.nome,
    g.descricao,
    g.ativo,
    g.created_at,
    g.updated_at
  FROM public.grupos_redes g
  WHERE g.id = p_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_grupos_redes_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION update_grupos_redes_v2 IS
'Atualiza um grupo/rede existente com validações';

GRANT EXECUTE ON FUNCTION update_grupos_redes_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION update_grupos_redes_v2 FROM anon;

-- ============================================================================
-- 5. FUNÇÃO: delete_grupos_redes_v2
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_grupos_redes_v2(
  p_id UUID,
  p_deleted_by UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_user_tipo TEXT;
  v_nome_grupo TEXT;
  v_em_uso BOOLEAN;
BEGIN
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'ID é obrigatório';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.grupos_redes gr
    WHERE gr.id = p_id AND gr.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Grupo/rede não encontrado';
  END IF;

  SELECT g.nome INTO v_nome_grupo
  FROM public.grupos_redes g
  WHERE g.id = p_id;

  SELECT EXISTS(
    SELECT 1 FROM public.cliente c
    WHERE TRIM(COALESCE(c.grupo_rede, '')) = TRIM(v_nome_grupo)
    AND c.deleted_at IS NULL
  ) INTO v_em_uso;

  IF v_em_uso THEN
    RAISE EXCEPTION 'Grupo/rede está em uso por clientes e não pode ser excluído';
  END IF;

  IF p_deleted_by IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_deleted_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem excluir grupos/redes';
    END IF;
  END IF;

  UPDATE public.grupos_redes
  SET
    deleted_at = NOW(),
    ativo = FALSE,
    updated_at = NOW()
  WHERE grupos_redes.id = p_id;

  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in delete_grupos_redes_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION delete_grupos_redes_v2 IS
'Exclui (soft delete) um grupo/rede, verificando se está em uso por clientes';

GRANT EXECUTE ON FUNCTION delete_grupos_redes_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION delete_grupos_redes_v2 FROM anon;
