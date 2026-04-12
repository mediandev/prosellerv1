-- ============================================================================
-- Migration 024: Funções RPC para Empresas (ref_empresas_subsidiarias) v2
-- ============================================================================
-- Descrição: CRUD para empresas. id da tabela é BIGINT (compatível com pedido_venda).
-- create/update/delete com SECURITY DEFINER.
-- Data: 2026-01-29
-- ============================================================================

CREATE OR REPLACE FUNCTION create_empresas_v2(
  p_cnpj TEXT,
  p_razao_social TEXT,
  p_nome_fantasia TEXT DEFAULT NULL,
  p_inscricao_estadual TEXT DEFAULT NULL,
  p_endereco JSONB DEFAULT '{}'::JSONB,
  p_contas_bancarias JSONB DEFAULT '[]'::JSONB,
  p_integracoes_erp JSONB DEFAULT '[]'::JSONB,
  p_created_by UUID DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  cnpj TEXT,
  razao_social TEXT,
  nome_fantasia TEXT,
  inscricao_estadual TEXT,
  endereco JSONB,
  contas_bancarias JSONB,
  integracoes_erp JSONB,
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
  v_id BIGINT;
  v_cnpj_norm TEXT;
  v_user_tipo TEXT;
BEGIN
  IF p_cnpj IS NULL OR TRIM(p_cnpj) = '' THEN
    RAISE EXCEPTION 'CNPJ é obrigatório';
  END IF;
  IF p_razao_social IS NULL OR LENGTH(TRIM(p_razao_social)) < 2 THEN
    RAISE EXCEPTION 'Razão social deve ter pelo menos 2 caracteres';
  END IF;

  v_cnpj_norm := REGEXP_REPLACE(TRIM(p_cnpj), '\D', '', 'g');
  IF v_cnpj_norm <> '' AND EXISTS (
    SELECT 1 FROM public.ref_empresas_subsidiarias e
    WHERE REGEXP_REPLACE(TRIM(COALESCE(e.cnpj, '')), '\D', '', 'g') = v_cnpj_norm
    AND e.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Já existe uma empresa cadastrada com este CNPJ';
  END IF;

  IF p_created_by IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_created_by AND u.ativo = TRUE AND u.deleted_at IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;
    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem criar empresas';
    END IF;
  END IF;

  INSERT INTO public.ref_empresas_subsidiarias (
    nome, cnpj, razao_social, nome_fantasia, inscricao_estadual,
    endereco, contas_bancarias, integracoes_erp, ativo, created_at, updated_at
  )
  VALUES (
    COALESCE(NULLIF(TRIM(p_nome_fantasia), ''), TRIM(p_razao_social)),
    TRIM(p_cnpj),
    TRIM(p_razao_social),
    NULLIF(TRIM(COALESCE(p_nome_fantasia, '')), ''),
    NULLIF(TRIM(COALESCE(p_inscricao_estadual, '')), ''),
    COALESCE(p_endereco, '{}'::JSONB),
    COALESCE(p_contas_bancarias, '[]'::JSONB),
    COALESCE(p_integracoes_erp, '[]'::JSONB),
    TRUE,
    NOW(),
    NOW()
  )
  RETURNING ref_empresas_subsidiarias.id INTO v_id;

  RETURN QUERY
  SELECT e.id, e.cnpj, e.razao_social, e.nome_fantasia, e.inscricao_estadual,
         e.endereco, e.contas_bancarias, e.integracoes_erp, e.ativo, e.created_at, e.updated_at
  FROM public.ref_empresas_subsidiarias e
  WHERE e.id = v_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_empresas_v2: %', SQLERRM;
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION create_empresas_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION create_empresas_v2 FROM anon;

-- ============================================================================
-- 2. list_empresas_v2
-- ============================================================================

CREATE OR REPLACE FUNCTION list_empresas_v2(
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
  FROM public.ref_empresas_subsidiarias e
  WHERE e.deleted_at IS NULL
    AND (NOT p_apenas_ativos OR e.ativo = TRUE)
    AND (
      p_search IS NULL OR TRIM(p_search) = '' OR
      LOWER(COALESCE(e.razao_social, e.nome, '')) LIKE '%' || LOWER(p_search) || '%' OR
      LOWER(COALESCE(e.nome_fantasia, e.nome, '')) LIKE '%' || LOWER(p_search) || '%' OR
      LOWER(COALESCE(e.cnpj, '')) LIKE '%' || LOWER(p_search) || '%'
    );

  SELECT JSON_BUILD_OBJECT(
    'empresas', COALESCE(JSON_AGG(item_data), '[]'::JSON),
    'total', v_total_count,
    'page', p_page,
    'limit', p_limit,
    'total_pages', CEIL(v_total_count::NUMERIC / NULLIF(p_limit, 0))
  )
  INTO v_resultado
  FROM (
    SELECT JSON_BUILD_OBJECT(
      'id', e.id::TEXT,
      'cnpj', e.cnpj,
      'razaoSocial', COALESCE(e.razao_social, e.nome, ''),
      'nomeFantasia', COALESCE(e.nome_fantasia, e.razao_social, e.nome, ''),
      'inscricaoEstadual', e.inscricao_estadual,
      'chaveApi', COALESCE(e.chave_api, ''),
      'endereco', COALESCE(e.endereco, '{}'::JSONB),
      'contasBancarias', COALESCE(e.contas_bancarias, '[]'::JSONB),
      'integracoesERP', COALESCE(e.integracoes_erp, '[]'::JSONB),
      'ativo', e.ativo,
      'createdAt', e.created_at,
      'updatedAt', e.updated_at
    ) AS item_data
    FROM public.ref_empresas_subsidiarias e
    WHERE e.deleted_at IS NULL
      AND (NOT p_apenas_ativos OR e.ativo = TRUE)
      AND (
        p_search IS NULL OR TRIM(p_search) = '' OR
        LOWER(COALESCE(e.razao_social, e.nome, '')) LIKE '%' || LOWER(p_search) || '%' OR
        LOWER(COALESCE(e.nome_fantasia, e.nome, '')) LIKE '%' || LOWER(p_search) || '%' OR
        LOWER(COALESCE(e.cnpj, '')) LIKE '%' || LOWER(p_search) || '%'
      )
    ORDER BY COALESCE(e.razao_social, e.nome) ASC NULLS LAST
    LIMIT p_limit
    OFFSET v_offset
  ) AS sub;

  RETURN v_resultado;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in list_empresas_v2: %', SQLERRM;
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION list_empresas_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION list_empresas_v2 TO anon;

-- ============================================================================
-- 3. get_empresas_v2
-- ============================================================================

CREATE OR REPLACE FUNCTION get_empresas_v2(p_id BIGINT)
RETURNS TABLE (
  id BIGINT,
  cnpj TEXT,
  razao_social TEXT,
  nome_fantasia TEXT,
  inscricao_estadual TEXT,
  chave_api TEXT,
  endereco JSONB,
  contas_bancarias JSONB,
  integracoes_erp JSONB,
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
  SELECT e.id, e.cnpj,
         COALESCE(e.razao_social, e.nome)::TEXT,
         COALESCE(e.nome_fantasia, e.razao_social, e.nome)::TEXT,
         e.inscricao_estadual,
         COALESCE(e.chave_api, '')::TEXT,
         e.endereco, e.contas_bancarias, e.integracoes_erp,
         e.ativo, e.created_at, e.updated_at
  FROM public.ref_empresas_subsidiarias e
  WHERE e.id = p_id AND e.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empresa não encontrada';
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in get_empresas_v2: %', SQLERRM;
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION get_empresas_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION get_empresas_v2 TO anon;

-- ============================================================================
-- 4. update_empresas_v2
-- ============================================================================

CREATE OR REPLACE FUNCTION update_empresas_v2(
  p_id BIGINT,
  p_cnpj TEXT DEFAULT NULL,
  p_razao_social TEXT DEFAULT NULL,
  p_nome_fantasia TEXT DEFAULT NULL,
  p_inscricao_estadual TEXT DEFAULT NULL,
  p_endereco JSONB DEFAULT NULL,
  p_contas_bancarias JSONB DEFAULT NULL,
  p_integracoes_erp JSONB DEFAULT NULL,
  p_ativo BOOLEAN DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  cnpj TEXT,
  razao_social TEXT,
  nome_fantasia TEXT,
  inscricao_estadual TEXT,
  endereco JSONB,
  contas_bancarias JSONB,
  integracoes_erp JSONB,
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
  v_cnpj_norm TEXT;
  v_user_tipo TEXT;
BEGIN
  IF p_id IS NULL THEN RAISE EXCEPTION 'ID é obrigatório'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.ref_empresas_subsidiarias e
    WHERE e.id = p_id AND e.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Empresa não encontrada';
  END IF;

  IF p_cnpj IS NOT NULL AND TRIM(p_cnpj) <> '' THEN
    v_cnpj_norm := REGEXP_REPLACE(TRIM(p_cnpj), '\D', '', 'g');
    IF EXISTS (
      SELECT 1 FROM public.ref_empresas_subsidiarias e
      WHERE REGEXP_REPLACE(TRIM(COALESCE(e.cnpj, '')), '\D', '', 'g') = v_cnpj_norm
      AND e.id <> p_id AND e.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Já existe uma empresa cadastrada com este CNPJ';
    END IF;
  END IF;

  IF p_razao_social IS NOT NULL AND LENGTH(TRIM(p_razao_social)) < 2 THEN
    RAISE EXCEPTION 'Razão social deve ter pelo menos 2 caracteres';
  END IF;

  IF p_updated_by IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_updated_by AND u.ativo = TRUE AND u.deleted_at IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'Usuário não encontrado ou inativo'; END IF;
    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem atualizar empresas';
    END IF;
  END IF;

  UPDATE public.ref_empresas_subsidiarias e
  SET
    nome = COALESCE(NULLIF(TRIM(p_nome_fantasia), ''), e.nome),
    cnpj = COALESCE(NULLIF(TRIM(p_cnpj), ''), e.cnpj),
    razao_social = COALESCE(NULLIF(TRIM(p_razao_social), ''), e.razao_social),
    nome_fantasia = CASE WHEN p_nome_fantasia IS NULL THEN e.nome_fantasia WHEN TRIM(p_nome_fantasia) = '' THEN NULL ELSE TRIM(p_nome_fantasia) END,
    inscricao_estadual = CASE WHEN p_inscricao_estadual IS NULL THEN e.inscricao_estadual WHEN TRIM(p_inscricao_estadual) = '' THEN NULL ELSE TRIM(p_inscricao_estadual) END,
    endereco = COALESCE(p_endereco, e.endereco),
    contas_bancarias = COALESCE(p_contas_bancarias, e.contas_bancarias),
    integracoes_erp = COALESCE(p_integracoes_erp, e.integracoes_erp),
    ativo = COALESCE(p_ativo, e.ativo),
    updated_at = NOW()
  WHERE e.id = p_id;

  RETURN QUERY
  SELECT e.id, e.cnpj, e.razao_social, e.nome_fantasia, e.inscricao_estadual,
         e.endereco, e.contas_bancarias, e.integracoes_erp, e.ativo, e.created_at, e.updated_at
  FROM public.ref_empresas_subsidiarias e
  WHERE e.id = p_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_empresas_v2: %', SQLERRM;
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION update_empresas_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION update_empresas_v2 FROM anon;

-- ============================================================================
-- 5. delete_empresas_v2
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_empresas_v2(
  p_id BIGINT,
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
    SELECT 1 FROM public.ref_empresas_subsidiarias e
    WHERE e.id = p_id AND e.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Empresa não encontrada';
  END IF;

  IF p_deleted_by IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_deleted_by AND u.ativo = TRUE AND u.deleted_at IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'Usuário não encontrado ou inativo'; END IF;
    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem excluir empresas';
    END IF;
  END IF;

  UPDATE public.ref_empresas_subsidiarias e
  SET deleted_at = NOW(), ativo = FALSE, updated_at = NOW()
  WHERE e.id = p_id;

  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in delete_empresas_v2: %', SQLERRM;
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_empresas_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION delete_empresas_v2 FROM anon;
