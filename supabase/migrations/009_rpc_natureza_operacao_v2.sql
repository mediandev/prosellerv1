-- ============================================================================
-- Migration 009: Funções RPC para Naturezas de Operação (v2)
-- ============================================================================
-- Descrição: Cria funções RPC para gerenciamento de naturezas de operação
--            seguindo padrão arquitetural com validações, soft delete e auditoria
-- Data: 2026-01-23
-- ============================================================================

-- ============================================================================
-- 1. FUNÇÃO: create_natureza_operacao_v2
-- ============================================================================
-- Cria uma nova natureza de operação com validações completas
-- ============================================================================

CREATE OR REPLACE FUNCTION create_natureza_operacao_v2(
  p_nome TEXT,
  p_codigo TEXT DEFAULT NULL,
  p_descricao TEXT DEFAULT NULL,
  p_gera_comissao BOOLEAN DEFAULT TRUE,
  p_gera_receita BOOLEAN DEFAULT TRUE,
  p_tiny_id TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  nome TEXT,
  codigo TEXT,
  descricao TEXT,
  gera_comissao BOOLEAN,
  gera_receita BOOLEAN,
  ativo BOOLEAN,
  tiny_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_natureza_id BIGINT;
  v_user_tipo TEXT;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_nome IS NULL OR LENGTH(TRIM(p_nome)) < 2 THEN
    RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
  END IF;

  -- Verificar se nome já existe (case-insensitive)
  IF EXISTS (
    SELECT 1 FROM public.natureza_operacao n
    WHERE LOWER(TRIM(n.nome)) = LOWER(TRIM(p_nome))
    AND n.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Natureza de operação com este nome já existe';
  END IF;

  -- Verificar se código já existe (se fornecido)
  IF p_codigo IS NOT NULL AND TRIM(p_codigo) != '' THEN
    IF EXISTS (
      SELECT 1 FROM public.natureza_operacao n
      WHERE n.codigo = TRIM(p_codigo)
      AND n.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Natureza de operação com este código já existe';
    END IF;
  END IF;

  -- 2. VERIFICAR PERMISSÕES (se created_by fornecido)
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
      RAISE EXCEPTION 'Apenas usuários backoffice podem criar naturezas de operação';
    END IF;
  END IF;

  -- 3. CRIAR NATUREZA DE OPERAÇÃO
  INSERT INTO public.natureza_operacao (
    nome,
    codigo,
    descricao,
    tem_comissao,
    gera_receita,
    ativo,
    tiny_id,
    created_at,
    updated_at
  ) VALUES (
    TRIM(p_nome),
    NULLIF(TRIM(p_codigo), ''),
    NULLIF(TRIM(p_descricao), ''),
    COALESCE(p_gera_comissao, TRUE),
    COALESCE(p_gera_receita, TRUE),
    TRUE,
    NULLIF(TRIM(p_tiny_id), ''),
    NOW(),
    NOW()
  )
  RETURNING natureza_operacao.id INTO v_natureza_id;

  -- 4. RETORNAR DADOS DA NATUREZA CRIADA
  RETURN QUERY
  SELECT 
    n.id,
    n.nome,
    n.codigo,
    n.descricao,
    n.tem_comissao AS gera_comissao,
    n.gera_receita,
    n.ativo,
    n.tiny_id,
    n.created_at,
    n.updated_at
  FROM public.natureza_operacao n
  WHERE n.id = v_natureza_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_natureza_operacao_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION create_natureza_operacao_v2 IS 
'Cria uma nova natureza de operação com validações de nome único e código único';

GRANT EXECUTE ON FUNCTION create_natureza_operacao_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION create_natureza_operacao_v2 FROM anon;

-- ============================================================================
-- 2. FUNÇÃO: list_natureza_operacao_v2
-- ============================================================================
-- Lista naturezas de operação com filtros e paginação
-- ============================================================================

CREATE OR REPLACE FUNCTION list_natureza_operacao_v2(
  p_requesting_user_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_apenas_ativas BOOLEAN DEFAULT FALSE,
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
  v_naturezas JSON;
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
  FROM public.natureza_operacao n
  WHERE n.deleted_at IS NULL
    AND (NOT p_apenas_ativas OR n.ativo = TRUE)
    AND (
      p_search IS NULL OR
      TRIM(p_search) = '' OR
      LOWER(n.nome) LIKE '%' || LOWER(p_search) || '%' OR
      LOWER(COALESCE(n.codigo, '')) LIKE '%' || LOWER(p_search) || '%' OR
      LOWER(COALESCE(n.descricao, '')) LIKE '%' || LOWER(p_search) || '%'
    );

  -- 3. BUSCAR NATUREZAS
  SELECT JSON_BUILD_OBJECT(
    'naturezas', COALESCE(JSON_AGG(natureza_data), '[]'::JSON),
    'total', v_total_count,
    'page', p_page,
    'limit', p_limit,
    'total_pages', CEIL(v_total_count::NUMERIC / p_limit)
  )
  INTO v_naturezas
  FROM (
    SELECT JSON_BUILD_OBJECT(
      'id', n.id::TEXT,
      'nome', n.nome,
      'codigo', n.codigo,
      'descricao', n.descricao,
      'geraComissao', n.tem_comissao,
      'geraReceita', n.gera_receita,
      'ativo', n.ativo,
      'tiny_id', n.tiny_id,
      'createdAt', n.created_at,
      'updatedAt', n.updated_at
    ) AS natureza_data
    FROM public.natureza_operacao n
    WHERE n.deleted_at IS NULL
      AND (NOT p_apenas_ativas OR n.ativo = TRUE)
      AND (
        p_search IS NULL OR
        TRIM(p_search) = '' OR
        LOWER(n.nome) LIKE '%' || LOWER(p_search) || '%' OR
        LOWER(COALESCE(n.codigo, '')) LIKE '%' || LOWER(p_search) || '%' OR
        LOWER(COALESCE(n.descricao, '')) LIKE '%' || LOWER(p_search) || '%'
      )
    ORDER BY n.nome ASC
    LIMIT p_limit
    OFFSET v_offset
  ) AS naturezas_subquery;

  RETURN v_naturezas;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in list_natureza_operacao_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION list_natureza_operacao_v2 IS 
'Lista naturezas de operação com filtros, paginação e busca';

GRANT EXECUTE ON FUNCTION list_natureza_operacao_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION list_natureza_operacao_v2 TO anon;

-- ============================================================================
-- 3. FUNÇÃO: get_natureza_operacao_v2
-- ============================================================================
-- Busca uma natureza de operação específica por ID
-- ============================================================================

CREATE OR REPLACE FUNCTION get_natureza_operacao_v2(
  p_id BIGINT
)
RETURNS TABLE (
  id BIGINT,
  nome TEXT,
  codigo TEXT,
  descricao TEXT,
  gera_comissao BOOLEAN,
  gera_receita BOOLEAN,
  ativo BOOLEAN,
  tiny_id TEXT,
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
    n.id,
    n.nome,
    n.codigo,
    n.descricao,
    n.tem_comissao AS gera_comissao,
    n.gera_receita,
    n.ativo,
    n.tiny_id,
    n.created_at,
    n.updated_at
  FROM public.natureza_operacao n
  WHERE n.id = p_id
    AND n.deleted_at IS NULL;

  -- 3. VERIFICAR SE ENCONTROU
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Natureza de operação não encontrada';
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in get_natureza_operacao_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION get_natureza_operacao_v2 IS 
'Busca uma natureza de operação específica por ID';

GRANT EXECUTE ON FUNCTION get_natureza_operacao_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION get_natureza_operacao_v2 TO anon;

-- ============================================================================
-- 4. FUNÇÃO: update_natureza_operacao_v2
-- ============================================================================
-- Atualiza uma natureza de operação existente
-- ============================================================================

CREATE OR REPLACE FUNCTION update_natureza_operacao_v2(
  p_id BIGINT,
  p_nome TEXT DEFAULT NULL,
  p_codigo TEXT DEFAULT NULL,
  p_descricao TEXT DEFAULT NULL,
  p_gera_comissao BOOLEAN DEFAULT NULL,
  p_gera_receita BOOLEAN DEFAULT NULL,
  p_ativo BOOLEAN DEFAULT NULL,
  p_tiny_id TEXT DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  nome TEXT,
  codigo TEXT,
  descricao TEXT,
  gera_comissao BOOLEAN,
  gera_receita BOOLEAN,
  ativo BOOLEAN,
  tiny_id TEXT,
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

  -- Verificar se natureza existe
  IF NOT EXISTS (
    SELECT 1 FROM public.natureza_operacao n
    WHERE n.id = p_id AND n.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Natureza de operação não encontrada';
  END IF;

  -- Validar nome se fornecido
  IF p_nome IS NOT NULL THEN
    IF LENGTH(TRIM(p_nome)) < 2 THEN
      RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
    END IF;

    -- Verificar se nome já existe em outro registro
    IF EXISTS (
      SELECT 1 FROM public.natureza_operacao n
      WHERE LOWER(TRIM(n.nome)) = LOWER(TRIM(p_nome))
      AND n.id != p_id
      AND n.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Natureza de operação com este nome já existe';
    END IF;
  END IF;

  -- Verificar código se fornecido
  IF p_codigo IS NOT NULL AND TRIM(p_codigo) != '' THEN
    IF EXISTS (
      SELECT 1 FROM public.natureza_operacao n
      WHERE n.codigo = TRIM(p_codigo)
      AND n.id != p_id
      AND n.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Natureza de operação com este código já existe';
    END IF;
  END IF;

  -- 2. VERIFICAR PERMISSÕES (se updated_by fornecido)
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
      RAISE EXCEPTION 'Apenas usuários backoffice podem atualizar naturezas de operação';
    END IF;
  END IF;

  -- 3. ATUALIZAR NATUREZA
  UPDATE public.natureza_operacao n
  SET
    nome = COALESCE(NULLIF(TRIM(p_nome), ''), n.nome),
    codigo = CASE 
      WHEN p_codigo IS NULL THEN n.codigo
      WHEN TRIM(p_codigo) = '' THEN NULL
      ELSE TRIM(p_codigo)
    END,
    descricao = CASE 
      WHEN p_descricao IS NULL THEN n.descricao
      WHEN TRIM(p_descricao) = '' THEN NULL
      ELSE TRIM(p_descricao)
    END,
    tem_comissao = COALESCE(p_gera_comissao, n.tem_comissao),
    gera_receita = COALESCE(p_gera_receita, n.gera_receita),
    ativo = COALESCE(p_ativo, n.ativo),
    tiny_id = CASE 
      WHEN p_tiny_id IS NULL THEN n.tiny_id
      WHEN TRIM(p_tiny_id) = '' THEN NULL
      ELSE TRIM(p_tiny_id)
    END,
    updated_at = NOW()
  WHERE n.id = p_id;

  -- 4. RETORNAR DADOS ATUALIZADOS
  RETURN QUERY
  SELECT 
    n.id,
    n.nome,
    n.codigo,
    n.descricao,
    n.tem_comissao AS gera_comissao,
    n.gera_receita,
    n.ativo,
    n.tiny_id,
    n.created_at,
    n.updated_at
  FROM public.natureza_operacao n
  WHERE n.id = p_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_natureza_operacao_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION update_natureza_operacao_v2 IS 
'Atualiza uma natureza de operação existente com validações';

GRANT EXECUTE ON FUNCTION update_natureza_operacao_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION update_natureza_operacao_v2 FROM anon;

-- ============================================================================
-- 5. FUNÇÃO: delete_natureza_operacao_v2
-- ============================================================================
-- Exclui (soft delete) uma natureza de operação
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_natureza_operacao_v2(
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

  -- Verificar se natureza existe
  IF NOT EXISTS (
    SELECT 1 FROM public.natureza_operacao
    WHERE id = p_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Natureza de operação não encontrada';
  END IF;

  -- Verificar se está em uso em pedidos
  SELECT EXISTS(
    SELECT 1 FROM public.pedido_venda
    WHERE natureza_operacao = (
      SELECT nome FROM public.natureza_operacao WHERE id = p_id
    )
    AND deleted_at IS NULL
  ) INTO v_em_uso;

  IF v_em_uso THEN
    RAISE EXCEPTION 'Natureza de operação está em uso e não pode ser excluída';
  END IF;

  -- 2. VERIFICAR PERMISSÕES (se deleted_by fornecido)
  IF p_deleted_by IS NOT NULL THEN
    SELECT tipo INTO v_user_tipo
    FROM public.user
    WHERE user_id = p_deleted_by
    AND ativo = TRUE
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem excluir naturezas de operação';
    END IF;
  END IF;

  -- 3. SOFT DELETE
  UPDATE public.natureza_operacao
  SET
    deleted_at = NOW(),
    ativo = FALSE,
    updated_at = NOW()
  WHERE id = p_id;

  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in delete_natureza_operacao_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION delete_natureza_operacao_v2 IS 
'Exclui (soft delete) uma natureza de operação, verificando se está em uso';

GRANT EXECUTE ON FUNCTION delete_natureza_operacao_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION delete_natureza_operacao_v2 FROM anon;
