-- ============================================================================
-- Migration 022: Funções RPC para Categorias de Conta Corrente (v2)
-- ============================================================================
-- Descrição: Cria funções RPC para gerenciamento de categorias de conta corrente
-- create/update/delete com SECURITY DEFINER para evitar conflito com RLS.
-- Data: 2026-01-29
-- ============================================================================

CREATE OR REPLACE FUNCTION create_categorias_conta_corrente_v2(
  p_nome TEXT,
  p_descricao TEXT DEFAULT NULL,
  p_cor TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  nome TEXT,
  descricao TEXT,
  cor TEXT,
  ativo BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_user_tipo TEXT;
BEGIN
  IF p_nome IS NULL OR LENGTH(TRIM(p_nome)) < 2 THEN
    RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.categorias_conta_corrente c
    WHERE LOWER(TRIM(c.nome)) = LOWER(TRIM(p_nome))
    AND c.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Categoria de conta corrente com este nome já existe';
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
      RAISE EXCEPTION 'Apenas usuários backoffice podem criar categorias de conta corrente';
    END IF;
  END IF;

  INSERT INTO public.categorias_conta_corrente (nome, descricao, cor, ativo, created_at, updated_at)
  VALUES (
    TRIM(p_nome),
    NULLIF(TRIM(p_descricao), ''),
    NULLIF(TRIM(p_cor), ''),
    TRUE,
    NOW(),
    NOW()
  )
  RETURNING categorias_conta_corrente.id INTO v_id;

  RETURN QUERY
  SELECT c.id, c.nome, c.descricao, c.cor, c.ativo, c.created_at, c.updated_at
  FROM public.categorias_conta_corrente c
  WHERE c.id = v_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_categorias_conta_corrente_v2: %', SQLERRM;
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION create_categorias_conta_corrente_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION create_categorias_conta_corrente_v2 FROM anon;

-- ============================================================================
-- 2. list_categorias_conta_corrente_v2
-- ============================================================================

CREATE OR REPLACE FUNCTION list_categorias_conta_corrente_v2(
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
  IF p_page < 1 THEN RAISE EXCEPTION 'Page must be greater than 0'; END IF;
  IF p_limit < 1 OR p_limit > 100 THEN RAISE EXCEPTION 'Limit must be between 1 and 100'; END IF;
  v_offset := (p_page - 1) * p_limit;

  SELECT COUNT(*)
  INTO v_total_count
  FROM public.categorias_conta_corrente c
  WHERE c.deleted_at IS NULL
    AND (NOT p_apenas_ativos OR c.ativo = TRUE)
    AND (
      p_search IS NULL OR TRIM(p_search) = '' OR
      LOWER(c.nome) LIKE '%' || LOWER(p_search) || '%' OR
      LOWER(COALESCE(c.descricao, '')) LIKE '%' || LOWER(p_search) || '%'
    );

  SELECT JSON_BUILD_OBJECT(
    'categorias', COALESCE(JSON_AGG(item_data), '[]'::JSON),
    'total', v_total_count,
    'page', p_page,
    'limit', p_limit,
    'total_pages', CEIL(v_total_count::NUMERIC / NULLIF(p_limit, 0))
  )
  INTO v_resultado
  FROM (
    SELECT JSON_BUILD_OBJECT(
      'id', c.id::TEXT,
      'nome', c.nome,
      'descricao', c.descricao,
      'cor', c.cor,
      'ativo', c.ativo,
      'createdAt', c.created_at,
      'updatedAt', c.updated_at
    ) AS item_data
    FROM public.categorias_conta_corrente c
    WHERE c.deleted_at IS NULL
      AND (NOT p_apenas_ativos OR c.ativo = TRUE)
      AND (
        p_search IS NULL OR TRIM(p_search) = '' OR
        LOWER(c.nome) LIKE '%' || LOWER(p_search) || '%' OR
        LOWER(COALESCE(c.descricao, '')) LIKE '%' || LOWER(p_search) || '%'
      )
    ORDER BY c.nome ASC
    LIMIT p_limit
    OFFSET v_offset
  ) AS sub;

  RETURN v_resultado;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in list_categorias_conta_corrente_v2: %', SQLERRM;
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION list_categorias_conta_corrente_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION list_categorias_conta_corrente_v2 TO anon;

-- ============================================================================
-- 3. get_categorias_conta_corrente_v2
-- ============================================================================

CREATE OR REPLACE FUNCTION get_categorias_conta_corrente_v2(p_id UUID)
RETURNS TABLE (
  id UUID,
  nome TEXT,
  descricao TEXT,
  cor TEXT,
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
  IF p_id IS NULL THEN RAISE EXCEPTION 'ID é obrigatório'; END IF;

  RETURN QUERY
  SELECT c.id, c.nome, c.descricao, c.cor, c.ativo, c.created_at, c.updated_at
  FROM public.categorias_conta_corrente c
  WHERE c.id = p_id AND c.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Categoria de conta corrente não encontrada';
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in get_categorias_conta_corrente_v2: %', SQLERRM;
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION get_categorias_conta_corrente_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION get_categorias_conta_corrente_v2 TO anon;

-- ============================================================================
-- 4. update_categorias_conta_corrente_v2
-- ============================================================================

CREATE OR REPLACE FUNCTION update_categorias_conta_corrente_v2(
  p_id UUID,
  p_nome TEXT DEFAULT NULL,
  p_descricao TEXT DEFAULT NULL,
  p_cor TEXT DEFAULT NULL,
  p_ativo BOOLEAN DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  nome TEXT,
  descricao TEXT,
  cor TEXT,
  ativo BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_user_tipo TEXT;
BEGIN
  IF p_id IS NULL THEN RAISE EXCEPTION 'ID é obrigatório'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.categorias_conta_corrente c
    WHERE c.id = p_id AND c.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Categoria de conta corrente não encontrada';
  END IF;

  IF p_nome IS NOT NULL THEN
    IF LENGTH(TRIM(p_nome)) < 2 THEN
      RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.categorias_conta_corrente c
      WHERE LOWER(TRIM(c.nome)) = LOWER(TRIM(p_nome))
      AND c.id != p_id
      AND c.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Categoria de conta corrente com este nome já existe';
    END IF;
  END IF;

  IF p_updated_by IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_updated_by AND u.ativo = TRUE AND u.deleted_at IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'Usuário não encontrado ou inativo'; END IF;
    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem atualizar categorias de conta corrente';
    END IF;
  END IF;

  UPDATE public.categorias_conta_corrente
  SET
    nome = COALESCE(NULLIF(TRIM(p_nome), ''), categorias_conta_corrente.nome),
    descricao = CASE
      WHEN p_descricao IS NULL THEN categorias_conta_corrente.descricao
      WHEN TRIM(p_descricao) = '' THEN NULL
      ELSE TRIM(p_descricao)
    END,
    cor = CASE
      WHEN p_cor IS NULL THEN categorias_conta_corrente.cor
      WHEN TRIM(p_cor) = '' THEN NULL
      ELSE TRIM(p_cor)
    END,
    ativo = COALESCE(p_ativo, categorias_conta_corrente.ativo),
    updated_at = NOW()
  WHERE categorias_conta_corrente.id = p_id;

  RETURN QUERY
  SELECT c.id, c.nome, c.descricao, c.cor, c.ativo, c.created_at, c.updated_at
  FROM public.categorias_conta_corrente c
  WHERE c.id = p_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_categorias_conta_corrente_v2: %', SQLERRM;
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION update_categorias_conta_corrente_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION update_categorias_conta_corrente_v2 FROM anon;

-- ============================================================================
-- 5. delete_categorias_conta_corrente_v2
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_categorias_conta_corrente_v2(
  p_id UUID,
  p_deleted_by UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_user_tipo TEXT;
BEGIN
  IF p_id IS NULL THEN RAISE EXCEPTION 'ID é obrigatório'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.categorias_conta_corrente c
    WHERE c.id = p_id AND c.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Categoria de conta corrente não encontrada';
  END IF;

  IF p_deleted_by IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_deleted_by AND u.ativo = TRUE AND u.deleted_at IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'Usuário não encontrado ou inativo'; END IF;
    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem excluir categorias de conta corrente';
    END IF;
  END IF;

  UPDATE public.categorias_conta_corrente
  SET deleted_at = NOW(), ativo = FALSE, updated_at = NOW()
  WHERE categorias_conta_corrente.id = p_id;

  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in delete_categorias_conta_corrente_v2: %', SQLERRM;
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_categorias_conta_corrente_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION delete_categorias_conta_corrente_v2 FROM anon;
