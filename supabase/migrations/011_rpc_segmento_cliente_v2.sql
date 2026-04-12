-- ============================================================================
-- Migration 011: Funções RPC para Segmentos de Cliente (v2)
-- ============================================================================
-- Descrição: Cria funções RPC para gerenciamento de segmentos de cliente
--            seguindo padrão arquitetural com validações, soft delete e auditoria
-- Data: 2026-01-23
-- ============================================================================

-- ============================================================================
-- 1. FUNÇÃO: create_segmento_cliente_v2
-- ============================================================================
-- Cria um novo segmento de cliente com validações completas
-- ============================================================================

CREATE OR REPLACE FUNCTION create_segmento_cliente_v2(
  p_nome TEXT,
  p_descricao TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
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
  v_segmento_id BIGINT;
  v_user_tipo TEXT;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_nome IS NULL OR LENGTH(TRIM(p_nome)) < 2 THEN
    RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
  END IF;

  -- Verificar se nome já existe (case-insensitive)
  IF EXISTS (
    SELECT 1 FROM public.segmento_cliente sc
    WHERE LOWER(TRIM(sc.nome)) = LOWER(TRIM(p_nome))
    AND sc.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Segmento de cliente com este nome já existe';
  END IF;

  -- 2. VERIFICAR PERMISSÕES (se created_by fornecido)
  IF p_created_by IS NOT NULL THEN
    SELECT tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_created_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem criar segmentos de cliente';
    END IF;
  END IF;

  -- 3. CRIAR SEGMENTO DE CLIENTE
  INSERT INTO public.segmento_cliente (
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
  RETURNING segmento_cliente.id INTO v_segmento_id;

  -- 4. RETORNAR DADOS DO SEGMENTO CRIADO
  RETURN QUERY
  SELECT 
    s.id,
    s.nome,
    s.descricao,
    s.ativo,
    s.created_at,
    s.updated_at
  FROM public.segmento_cliente s
  WHERE s.id = v_segmento_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_segmento_cliente_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION create_segmento_cliente_v2 IS 
'Cria um novo segmento de cliente com validações de nome único';

GRANT EXECUTE ON FUNCTION create_segmento_cliente_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION create_segmento_cliente_v2 FROM anon;

-- ============================================================================
-- 2. FUNÇÃO: list_segmento_cliente_v2
-- ============================================================================
-- Lista segmentos de cliente com filtros e paginação
-- ============================================================================

CREATE OR REPLACE FUNCTION list_segmento_cliente_v2(
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
  v_segmentos JSON;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_page < 1 THEN
    RAISE EXCEPTION 'Page must be greater than 0';
  END IF;

  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 100';
  END IF;

  v_offset := (p_page - 1) * p_limit;

  -- 2. CONTAR TOTAL
  SELECT COUNT(*)
  INTO v_total_count
  FROM public.segmento_cliente s
  WHERE s.deleted_at IS NULL
    AND (NOT p_apenas_ativos OR s.ativo = TRUE)
    AND (
      p_search IS NULL OR
      TRIM(p_search) = '' OR
      LOWER(s.nome) LIKE '%' || LOWER(p_search) || '%' OR
      LOWER(COALESCE(s.descricao, '')) LIKE '%' || LOWER(p_search) || '%'
    );

  -- 3. BUSCAR SEGMENTOS
  SELECT JSON_BUILD_OBJECT(
    'segmentos', COALESCE(JSON_AGG(segmento_data), '[]'::JSON),
    'total', v_total_count,
    'page', p_page,
    'limit', p_limit,
    'total_pages', CEIL(v_total_count::NUMERIC / p_limit)
  )
  INTO v_segmentos
  FROM (
    SELECT JSON_BUILD_OBJECT(
      'id', s.id::TEXT,
      'nome', s.nome,
      'descricao', s.descricao,
      'ativo', s.ativo,
      'createdAt', s.created_at,
      'updatedAt', s.updated_at
    ) AS segmento_data
    FROM public.segmento_cliente s
    WHERE s.deleted_at IS NULL
      AND (NOT p_apenas_ativos OR s.ativo = TRUE)
      AND (
        p_search IS NULL OR
        TRIM(p_search) = '' OR
        LOWER(s.nome) LIKE '%' || LOWER(p_search) || '%' OR
        LOWER(COALESCE(s.descricao, '')) LIKE '%' || LOWER(p_search) || '%'
      )
    ORDER BY s.nome ASC
    LIMIT p_limit
    OFFSET v_offset
  ) AS segmentos_subquery;

  RETURN v_segmentos;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in list_segmento_cliente_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION list_segmento_cliente_v2 IS 
'Lista segmentos de cliente com filtros, paginação e busca';

GRANT EXECUTE ON FUNCTION list_segmento_cliente_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION list_segmento_cliente_v2 TO anon;

-- ============================================================================
-- 3. FUNÇÃO: get_segmento_cliente_v2
-- ============================================================================
-- Busca um segmento de cliente específico por ID
-- ============================================================================

CREATE OR REPLACE FUNCTION get_segmento_cliente_v2(
  p_id BIGINT
)
RETURNS TABLE (
  id BIGINT,
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
  -- 1. VALIDAÇÕES
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'ID é obrigatório';
  END IF;

  -- 2. BUSCAR E RETORNAR
  RETURN QUERY
  SELECT 
    s.id,
    s.nome,
    s.descricao,
    s.ativo,
    s.created_at,
    s.updated_at
  FROM public.segmento_cliente s
  WHERE s.id = p_id
    AND s.deleted_at IS NULL;

  -- 3. VERIFICAR SE ENCONTROU
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Segmento de cliente não encontrado';
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in get_segmento_cliente_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION get_segmento_cliente_v2 IS 
'Busca um segmento de cliente específico por ID';

GRANT EXECUTE ON FUNCTION get_segmento_cliente_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION get_segmento_cliente_v2 TO anon;

-- ============================================================================
-- 4. FUNÇÃO: update_segmento_cliente_v2
-- ============================================================================
-- Atualiza um segmento de cliente existente
-- ============================================================================

CREATE OR REPLACE FUNCTION update_segmento_cliente_v2(
  p_id BIGINT,
  p_nome TEXT DEFAULT NULL,
  p_descricao TEXT DEFAULT NULL,
  p_ativo BOOLEAN DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
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
  -- 1. VALIDAÇÕES
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'ID é obrigatório';
  END IF;

  -- Verificar se segmento existe
  IF NOT EXISTS (
    SELECT 1 FROM public.segmento_cliente sc
    WHERE sc.id = p_id AND sc.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Segmento de cliente não encontrado';
  END IF;

  -- Validar nome se fornecido
  IF p_nome IS NOT NULL THEN
    IF LENGTH(TRIM(p_nome)) < 2 THEN
      RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
    END IF;

    -- Verificar se nome já existe em outro registro
    IF EXISTS (
      SELECT 1 FROM public.segmento_cliente sc
      WHERE LOWER(TRIM(sc.nome)) = LOWER(TRIM(p_nome))
      AND sc.id != p_id
      AND sc.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Segmento de cliente com este nome já existe';
    END IF;
  END IF;

  -- 2. VERIFICAR PERMISSÕES (se updated_by fornecido)
  IF p_updated_by IS NOT NULL THEN
    SELECT tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_updated_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem atualizar segmentos de cliente';
    END IF;
  END IF;

  -- 3. ATUALIZAR SEGMENTO
  UPDATE public.segmento_cliente
  SET
    nome = COALESCE(NULLIF(TRIM(p_nome), ''), public.segmento_cliente.nome),
    descricao = CASE 
      WHEN p_descricao IS NULL THEN public.segmento_cliente.descricao
      WHEN TRIM(p_descricao) = '' THEN NULL
      ELSE TRIM(p_descricao)
    END,
    ativo = COALESCE(p_ativo, public.segmento_cliente.ativo),
    updated_at = NOW()
  WHERE public.segmento_cliente.id = p_id;

  -- 4. RETORNAR DADOS ATUALIZADOS
  RETURN QUERY
  SELECT 
    s.id,
    s.nome,
    s.descricao,
    s.ativo,
    s.created_at,
    s.updated_at
  FROM public.segmento_cliente s
  WHERE s.id = p_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_segmento_cliente_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION update_segmento_cliente_v2 IS 
'Atualiza um segmento de cliente existente com validações';

GRANT EXECUTE ON FUNCTION update_segmento_cliente_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION update_segmento_cliente_v2 FROM anon;

-- ============================================================================
-- 5. FUNÇÃO: delete_segmento_cliente_v2
-- ============================================================================
-- Exclui (soft delete) um segmento de cliente
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_segmento_cliente_v2(
  p_id BIGINT,
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
  v_em_uso BOOLEAN;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'ID é obrigatório';
  END IF;

  -- Verificar se segmento existe
  IF NOT EXISTS (
    SELECT 1 FROM public.segmento_cliente sc
    WHERE sc.id = p_id AND sc.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Segmento de cliente não encontrado';
  END IF;

  -- Verificar se está em uso em clientes
  SELECT EXISTS(
    SELECT 1 FROM public.cliente c
    WHERE c.tipo_segmento = (
      SELECT sc2.nome FROM public.segmento_cliente sc2 WHERE sc2.id = p_id
    )
    AND c.deleted_at IS NULL
  ) INTO v_em_uso;

  IF v_em_uso THEN
    RAISE EXCEPTION 'Segmento de cliente está em uso e não pode ser excluído';
  END IF;

  -- 2. VERIFICAR PERMISSÕES (se deleted_by fornecido)
  IF p_deleted_by IS NOT NULL THEN
    SELECT tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_deleted_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem excluir segmentos de cliente';
    END IF;
  END IF;

  -- 3. SOFT DELETE
  UPDATE public.segmento_cliente
  SET
    deleted_at = NOW(),
    ativo = FALSE,
    updated_at = NOW()
  WHERE public.segmento_cliente.id = p_id;

  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in delete_segmento_cliente_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION delete_segmento_cliente_v2 IS 
'Exclui (soft delete) um segmento de cliente, verificando se está em uso';

GRANT EXECUTE ON FUNCTION delete_segmento_cliente_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION delete_segmento_cliente_v2 FROM anon;
