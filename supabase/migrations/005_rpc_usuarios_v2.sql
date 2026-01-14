-- ============================================================================
-- Migration 005: Funções RPC para Usuários (v2)
-- ============================================================================
-- Descrição: Cria funções RPC para gerenciamento de usuários seguindo
--            padrão arquitetural com validações, soft delete e auditoria
-- Data: 2025-01-16
-- ============================================================================

-- ============================================================================
-- 1. FUNÇÃO: create_user_v2
-- ============================================================================
-- Cria um novo usuário com validações completas
-- ============================================================================

CREATE OR REPLACE FUNCTION create_user_v2(
  p_email TEXT,
  p_nome TEXT,
  p_tipo TEXT,
  p_ref_user_role_id BIGINT DEFAULT NULL,
  p_user_login TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  nome TEXT,
  email TEXT,
  tipo TEXT,
  ativo BOOLEAN,
  data_cadastro TIMESTAMPTZ,
  ref_user_role_id BIGINT,
  user_login TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_email_exists BOOLEAN;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_email IS NULL OR TRIM(p_email) = '' THEN
    RAISE EXCEPTION 'Email é obrigatório';
  END IF;

  IF p_nome IS NULL OR LENGTH(TRIM(p_nome)) < 2 THEN
    RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
  END IF;

  IF p_tipo IS NULL OR p_tipo NOT IN ('backoffice', 'vendedor') THEN
    RAISE EXCEPTION 'Tipo deve ser "backoffice" ou "vendedor"';
  END IF;

  -- Validar formato de email básico
  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Formato de email inválido';
  END IF;

  -- 2. VERIFICAR EMAIL ÚNICO
  SELECT EXISTS(
    SELECT 1 FROM public.user
    WHERE LOWER(email) = LOWER(p_email)
    AND deleted_at IS NULL
  ) INTO v_email_exists;

  IF v_email_exists THEN
    RAISE EXCEPTION 'Email já cadastrado';
  END IF;

  -- 3. VERIFICAR PERMISSÕES (se created_by fornecido)
  IF p_created_by IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user
      WHERE user_id = p_created_by
      AND tipo = 'backoffice'
      AND ativo = TRUE
      AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem criar usuários';
    END IF;
  END IF;

  -- 4. CRIAR USUÁRIO
  INSERT INTO public.user (
    email,
    nome,
    tipo,
    ref_user_role_id,
    user_login,
    ativo,
    data_cadastro
  ) VALUES (
    LOWER(TRIM(p_email)),
    TRIM(p_nome),
    p_tipo,
    p_ref_user_role_id,
    COALESCE(p_user_login, LOWER(TRIM(p_email))),
    TRUE,
    NOW()
  )
  RETURNING user_id INTO v_user_id;

  -- 5. RETORNAR DADOS DO USUÁRIO CRIADO
  RETURN QUERY
  SELECT 
    u.user_id,
    u.nome,
    u.email,
    u.tipo,
    u.ativo,
    u.data_cadastro,
    u.ref_user_role_id,
    u.user_login
  FROM public.user u
  WHERE u.user_id = v_user_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_user_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION create_user_v2 IS 
'Cria um novo usuário com validações de email único, tipo e permissões';

GRANT EXECUTE ON FUNCTION create_user_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION create_user_v2 FROM anon;

-- ============================================================================
-- 2. FUNÇÃO: update_user_v2
-- ============================================================================
-- Atualiza um usuário existente
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_v2(
  p_user_id UUID,
  p_nome TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_tipo TEXT DEFAULT NULL,
  p_ref_user_role_id BIGINT DEFAULT NULL,
  p_user_login TEXT DEFAULT NULL,
  p_ativo BOOLEAN DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  nome TEXT,
  email TEXT,
  tipo TEXT,
  ativo BOOLEAN,
  data_cadastro TIMESTAMPTZ,
  ultimo_acesso TIMESTAMPTZ,
  ref_user_role_id BIGINT,
  user_login TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_current_user_tipo TEXT;
  v_is_own_profile BOOLEAN;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id é obrigatório';
  END IF;

  -- Verificar se usuário existe
  IF NOT EXISTS (
    SELECT 1 FROM public.user
    WHERE user_id = p_user_id
    AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  -- 2. VERIFICAR PERMISSÕES
  IF p_updated_by IS NOT NULL THEN
    -- Buscar tipo do usuário que está atualizando
    SELECT tipo INTO v_current_user_tipo
    FROM public.user
    WHERE user_id = p_updated_by
    AND ativo = TRUE
    AND deleted_at IS NULL;

    IF v_current_user_tipo IS NULL THEN
      RAISE EXCEPTION 'Usuário não autorizado';
    END IF;

    -- Verificar se é o próprio perfil
    v_is_own_profile := (p_updated_by = p_user_id);

    -- Vendedor só pode atualizar próprio perfil (e não pode mudar tipo/ativo)
    IF v_current_user_tipo = 'vendedor' AND NOT v_is_own_profile THEN
      RAISE EXCEPTION 'Vendedores só podem atualizar seu próprio perfil';
    END IF;

    IF v_current_user_tipo = 'vendedor' AND (p_tipo IS NOT NULL OR p_ativo IS NOT NULL) THEN
      RAISE EXCEPTION 'Vendedores não podem alterar tipo ou status ativo';
    END IF;
  END IF;

  -- 3. VALIDAR EMAIL SE FORNECIDO
  IF p_email IS NOT NULL THEN
    IF TRIM(p_email) = '' THEN
      RAISE EXCEPTION 'Email não pode ser vazio';
    END IF;

    IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'Formato de email inválido';
    END IF;

    -- Verificar email único (exceto para o próprio usuário)
    IF EXISTS (
      SELECT 1 FROM public.user
      WHERE LOWER(email) = LOWER(p_email)
      AND user_id != p_user_id
      AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Email já cadastrado para outro usuário';
    END IF;
  END IF;

  -- 4. VALIDAR TIPO SE FORNECIDO
  IF p_tipo IS NOT NULL AND p_tipo NOT IN ('backoffice', 'vendedor') THEN
    RAISE EXCEPTION 'Tipo deve ser "backoffice" ou "vendedor"';
  END IF;

  -- 5. VALIDAR NOME SE FORNECIDO
  IF p_nome IS NOT NULL AND LENGTH(TRIM(p_nome)) < 2 THEN
    RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
  END IF;

  -- 6. ATUALIZAR USUÁRIO
  UPDATE public.user
  SET
    nome = COALESCE(NULLIF(TRIM(p_nome), ''), nome),
    email = COALESCE(NULLIF(LOWER(TRIM(p_email)), ''), email),
    tipo = COALESCE(p_tipo, tipo),
    ref_user_role_id = COALESCE(p_ref_user_role_id, ref_user_role_id),
    user_login = COALESCE(NULLIF(TRIM(p_user_login), ''), user_login),
    ativo = COALESCE(p_ativo, ativo)
  WHERE user_id = p_user_id;

  -- 7. RETORNAR DADOS ATUALIZADOS
  RETURN QUERY
  SELECT 
    u.user_id,
    u.nome,
    u.email,
    u.tipo,
    u.ativo,
    u.data_cadastro,
    u.ultimo_acesso,
    u.ref_user_role_id,
    u.user_login
  FROM public.user u
  WHERE u.user_id = p_user_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_user_v2 for user %: %', p_user_id, SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION update_user_v2 IS 
'Atualiza um usuário existente com validações e verificação de permissões';

GRANT EXECUTE ON FUNCTION update_user_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION update_user_v2 FROM anon;

-- ============================================================================
-- 3. FUNÇÃO: delete_user_v2
-- ============================================================================
-- Soft delete de usuário
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_user_v2(
  p_user_id UUID,
  p_deleted_by UUID DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  deleted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_current_user_tipo TEXT;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id é obrigatório';
  END IF;

  -- Verificar se usuário existe
  IF NOT EXISTS (
    SELECT 1 FROM public.user
    WHERE user_id = p_user_id
    AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Usuário não encontrado ou já excluído';
  END IF;

  -- 2. VERIFICAR PERMISSÕES
  IF p_deleted_by IS NOT NULL THEN
    SELECT tipo INTO v_current_user_tipo
    FROM public.user
    WHERE user_id = p_deleted_by
    AND ativo = TRUE
    AND deleted_at IS NULL;

    IF v_current_user_tipo IS NULL THEN
      RAISE EXCEPTION 'Usuário não autorizado';
    END IF;

    -- Apenas backoffice pode excluir usuários
    IF v_current_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem excluir usuários';
    END IF;
  END IF;

  -- 3. SOFT DELETE
  UPDATE public.user
  SET
    ativo = FALSE,
    deleted_at = NOW()
  WHERE user_id = p_user_id;

  -- 4. RETORNAR DADOS
  RETURN QUERY
  SELECT 
    u.user_id,
    u.deleted_at
  FROM public.user u
  WHERE u.user_id = p_user_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in delete_user_v2 for user %: %', p_user_id, SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION delete_user_v2 IS 
'Realiza soft delete de um usuário (apenas backoffice)';

GRANT EXECUTE ON FUNCTION delete_user_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION delete_user_v2 FROM anon;

-- ============================================================================
-- 4. FUNÇÃO: get_user_by_id_v2
-- ============================================================================
-- Busca usuário por ID
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_by_id_v2(
  p_user_id UUID,
  p_requesting_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  nome TEXT,
  email TEXT,
  tipo TEXT,
  ativo BOOLEAN,
  data_cadastro TIMESTAMPTZ,
  ultimo_acesso TIMESTAMPTZ,
  ref_user_role_id BIGINT,
  user_login TEXT,
  first_login BOOLEAN
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
DECLARE
  v_requesting_user_tipo TEXT;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id é obrigatório';
  END IF;

  -- 2. VERIFICAR PERMISSÕES
  IF p_requesting_user_id IS NOT NULL THEN
    SELECT tipo INTO v_requesting_user_tipo
    FROM public.user
    WHERE user_id = p_requesting_user_id
    AND ativo = TRUE
    AND deleted_at IS NULL;

    -- Vendedor só pode ver próprio perfil
    IF v_requesting_user_tipo = 'vendedor' AND p_requesting_user_id != p_user_id THEN
      RAISE EXCEPTION 'Vendedores só podem ver seu próprio perfil';
    END IF;
  END IF;

  -- 3. BUSCAR USUÁRIO
  RETURN QUERY
  SELECT 
    u.user_id,
    u.nome,
    u.email,
    u.tipo,
    u.ativo,
    u.data_cadastro,
    u.ultimo_acesso,
    u.ref_user_role_id,
    u.user_login,
    u.first_login
  FROM public.user u
  WHERE u.user_id = p_user_id
  AND u.deleted_at IS NULL;

  -- Verificar se encontrou
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in get_user_by_id_v2 for user %: %', p_user_id, SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION get_user_by_id_v2 IS 
'Busca um usuário por ID com verificação de permissões';

GRANT EXECUTE ON FUNCTION get_user_by_id_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION get_user_by_id_v2 FROM anon;

-- ============================================================================
-- 5. FUNÇÃO: list_users_v2
-- ============================================================================
-- Lista usuários com filtros e paginação
-- ============================================================================

CREATE OR REPLACE FUNCTION list_users_v2(
  p_requesting_user_id UUID DEFAULT NULL,
  p_tipo_filter TEXT DEFAULT NULL,
  p_ativo_filter BOOLEAN DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 10
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
  v_requesting_user_tipo TEXT;
  v_users JSON;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_page < 1 THEN
    RAISE EXCEPTION 'Page must be greater than 0';
  END IF;

  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 100';
  END IF;

  -- 2. VERIFICAR PERMISSÕES
  IF p_requesting_user_id IS NOT NULL THEN
    SELECT tipo INTO v_requesting_user_tipo
    FROM public.user
    WHERE user_id = p_requesting_user_id
    AND ativo = TRUE
    AND deleted_at IS NULL;

    -- Vendedor só pode ver próprio perfil
    IF v_requesting_user_tipo = 'vendedor' THEN
      RETURN JSON_BUILD_OBJECT(
        'users', (
          SELECT JSON_AGG(row_to_json(u))
          FROM (
            SELECT 
              user_id,
              nome,
              email,
              tipo,
              ativo,
              data_cadastro,
              ultimo_acesso
            FROM public.user
            WHERE user_id = p_requesting_user_id
            AND deleted_at IS NULL
          ) u
        ),
        'total', 1,
        'page', 1,
        'limit', 1,
        'total_pages', 1
      );
    END IF;
  END IF;

  -- Calcular offset
  v_offset := (p_page - 1) * p_limit;

  -- 3. CONTAR TOTAL
  SELECT COUNT(*)
  INTO v_total_count
  FROM public.user
  WHERE deleted_at IS NULL
    AND (p_tipo_filter IS NULL OR tipo = p_tipo_filter)
    AND (p_ativo_filter IS NULL OR ativo = p_ativo_filter)
    AND (
      p_search IS NULL OR
      LOWER(nome) LIKE '%' || LOWER(p_search) || '%' OR
      LOWER(email) LIKE '%' || LOWER(p_search) || '%'
    );

  -- 4. BUSCAR USUÁRIOS
  SELECT JSON_BUILD_OBJECT(
    'users', COALESCE(JSON_AGG(user_data), '[]'::JSON),
    'total', v_total_count,
    'page', p_page,
    'limit', p_limit,
    'total_pages', CEIL(v_total_count::NUMERIC / p_limit)
  )
  INTO v_users
  FROM (
    SELECT 
      user_id,
      nome,
      email,
      tipo,
      ativo,
      data_cadastro,
      ultimo_acesso,
      ref_user_role_id,
      user_login,
      first_login
    FROM public.user
    WHERE deleted_at IS NULL
      AND (p_tipo_filter IS NULL OR tipo = p_tipo_filter)
      AND (p_ativo_filter IS NULL OR ativo = p_ativo_filter)
      AND (
        p_search IS NULL OR
        LOWER(nome) LIKE '%' || LOWER(p_search) || '%' OR
        LOWER(email) LIKE '%' || LOWER(p_search) || '%'
      )
    ORDER BY data_cadastro DESC
    LIMIT p_limit
    OFFSET v_offset
  ) AS user_data;

  RETURN v_users;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in list_users_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION list_users_v2 IS 
'Lista usuários com filtros, paginação e verificação de permissões';

GRANT EXECUTE ON FUNCTION list_users_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION list_users_v2 FROM anon;
