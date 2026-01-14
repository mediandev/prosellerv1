-- ============================================================================
-- Migration 007: Funções RPC para Clientes (v2)
-- ============================================================================
-- Descrição: Cria funções RPC para gerenciamento de clientes seguindo
--            padrão arquitetural com validações, soft delete, workflow
--            de aprovação e relacionamentos
-- Data: 2025-01-16
-- ============================================================================

-- ============================================================================
-- 1. FUNÇÃO: create_cliente_v2
-- ============================================================================
-- Cria um novo cliente com validações e relacionamentos
-- ============================================================================

CREATE OR REPLACE FUNCTION create_cliente_v2(
  p_nome TEXT,
  p_nome_fantasia TEXT DEFAULT NULL,
  p_cpf_cnpj TEXT DEFAULT NULL,
  p_ref_tipo_pessoa_id_FK BIGINT DEFAULT NULL,
  p_inscricao_estadual TEXT DEFAULT NULL,
  p_inscricao_municipal TEXT DEFAULT NULL,
  p_codigo TEXT DEFAULT NULL,
  p_grupo_rede TEXT DEFAULT NULL,
  p_lista_de_preco BIGINT DEFAULT NULL,
  p_desconto_financeiro NUMERIC DEFAULT 0,
  p_pedido_minimo NUMERIC DEFAULT 0,
  p_vendedoresatribuidos UUID[] DEFAULT NULL,
  p_observacao_interna TEXT DEFAULT NULL,
  p_tipo_segmento TEXT DEFAULT NULL,
  p_IE_isento BOOLEAN DEFAULT FALSE,
  -- Dados de contato
  p_telefone TEXT DEFAULT NULL,
  p_telefone_adicional TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_email_nf TEXT DEFAULT NULL,
  p_website TEXT DEFAULT NULL,
  p_observacao_contato TEXT DEFAULT NULL,
  -- Dados de endereço
  p_cep TEXT DEFAULT NULL,
  p_rua TEXT DEFAULT NULL,
  p_numero TEXT DEFAULT NULL,
  p_complemento TEXT DEFAULT NULL,
  p_bairro TEXT DEFAULT NULL,
  p_cidade TEXT DEFAULT NULL,
  p_uf TEXT DEFAULT NULL,
  p_ref_tipo_endereco_id_FK BIGINT DEFAULT NULL,
  -- Auditoria
  p_criado_por UUID DEFAULT NULL
)
RETURNS TABLE (
  cliente_id BIGINT,
  nome TEXT,
  nome_fantasia TEXT,
  cpf_cnpj TEXT,
  codigo TEXT,
  status_aprovacao TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_cliente_id BIGINT;
  v_user_tipo TEXT;
  v_status_aprovacao TEXT;
  v_ref_situacao_id INTEGER;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_nome IS NULL OR LENGTH(TRIM(p_nome)) < 2 THEN
    RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
  END IF;

  -- Validar CPF/CNPJ se fornecido
  IF p_cpf_cnpj IS NOT NULL THEN
    IF LENGTH(REPLACE(p_cpf_cnpj, '.', '')) NOT IN (11, 14) THEN
      RAISE EXCEPTION 'CPF/CNPJ inválido';
    END IF;
  END IF;

  -- 2. VERIFICAR PERMISSÕES E DEFINIR STATUS
  IF p_criado_por IS NOT NULL THEN
    SELECT tipo INTO v_user_tipo
    FROM public.user
    WHERE user_id = p_criado_por
    AND ativo = TRUE
    AND deleted_at IS NULL;

    IF v_user_tipo IS NULL THEN
      RAISE EXCEPTION 'Usuário não autorizado';
    END IF;

    -- Vendedor cria cliente pendente, backoffice cria aprovado
    IF v_user_tipo = 'vendedor' THEN
      v_status_aprovacao := 'pendente';
      v_ref_situacao_id := (SELECT ref_situacao_id FROM public.ref_situacao WHERE nome = 'Análise' LIMIT 1);
    ELSE
      v_status_aprovacao := 'aprovado';
      v_ref_situacao_id := (SELECT ref_situacao_id FROM public.ref_situacao WHERE nome = 'Ativo' LIMIT 1);
    END IF;
  ELSE
    v_status_aprovacao := 'pendente';
    v_ref_situacao_id := (SELECT ref_situacao_id FROM public.ref_situacao WHERE nome = 'Análise' LIMIT 1);
  END IF;

  -- 3. GERAR CÓDIGO SE NÃO FORNECIDO
  -- (Implementar lógica de geração automática se necessário)

  -- 4. CRIAR CLIENTE
  INSERT INTO public.cliente (
    nome,
    nome_fantasia,
    cpf_cnpj,
    ref_tipo_pessoa_id_FK,
    inscricao_estadual,
    inscricao_municipal,
    codigo,
    grupo_rede,
    lista_de_preco,
    desconto_financeiro,
    pedido_minimo,
    vendedoresatribuidos,
    observacao_interna,
    tipo_segmento,
    IE_isento,
    status_aprovacao,
    ref_situacao_id,
    criado_por,
    created_at
  ) VALUES (
    TRIM(p_nome),
    NULLIF(TRIM(p_nome_fantasia), ''),
    NULLIF(REPLACE(REPLACE(REPLACE(p_cpf_cnpj, '.', ''), '/', ''), '-', ''), ''),
    p_ref_tipo_pessoa_id_FK,
    NULLIF(TRIM(p_inscricao_estadual), ''),
    NULLIF(TRIM(p_inscricao_municipal), ''),
    NULLIF(TRIM(p_codigo), ''),
    NULLIF(TRIM(p_grupo_rede), ''),
    p_lista_de_preco,
    COALESCE(p_desconto_financeiro, 0),
    COALESCE(p_pedido_minimo, 0),
    p_vendedoresatribuidos,
    NULLIF(TRIM(p_observacao_interna), ''),
    NULLIF(TRIM(p_tipo_segmento), ''),
    COALESCE(p_IE_isento, FALSE),
    v_status_aprovacao,
    v_ref_situacao_id,
    p_criado_por,
    NOW()
  )
  RETURNING cliente_id INTO v_cliente_id;

  -- 5. CRIAR CONTATO SE FORNECIDO
  IF p_telefone IS NOT NULL OR p_email IS NOT NULL THEN
    INSERT INTO public.cliente_contato (
      cliente_id,
      telefone,
      telefone_adicional,
      email,
      email_nf,
      website,
      observacao
    ) VALUES (
      v_cliente_id,
      NULLIF(TRIM(p_telefone), ''),
      NULLIF(TRIM(p_telefone_adicional), ''),
      NULLIF(LOWER(TRIM(p_email)), ''),
      NULLIF(LOWER(TRIM(p_email_nf)), ''),
      NULLIF(TRIM(p_website), ''),
      NULLIF(TRIM(p_observacao_contato), '')
    )
    ON CONFLICT (cliente_id) DO UPDATE SET
      telefone = COALESCE(NULLIF(TRIM(p_telefone), ''), cliente_contato.telefone),
      telefone_adicional = COALESCE(NULLIF(TRIM(p_telefone_adicional), ''), cliente_contato.telefone_adicional),
      email = COALESCE(NULLIF(LOWER(TRIM(p_email)), ''), cliente_contato.email),
      email_nf = COALESCE(NULLIF(LOWER(TRIM(p_email_nf)), ''), cliente_contato.email_nf),
      website = COALESCE(NULLIF(TRIM(p_website), ''), cliente_contato.website),
      observacao = COALESCE(NULLIF(TRIM(p_observacao_contato), ''), cliente_contato.observacao);
  END IF;

  -- 6. CRIAR ENDEREÇO SE FORNECIDO
  IF p_cep IS NOT NULL OR p_rua IS NOT NULL THEN
    INSERT INTO public.cliente_endereço (
      cliente_id,
      cep,
      rua,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      ref_tipo_endereco_id_FK
    ) VALUES (
      v_cliente_id,
      NULLIF(REPLACE(TRIM(p_cep), '-', ''), ''),
      NULLIF(TRIM(p_rua), ''),
      NULLIF(TRIM(p_numero), ''),
      NULLIF(TRIM(p_complemento), ''),
      NULLIF(TRIM(p_bairro), ''),
      NULLIF(TRIM(p_cidade), ''),
      NULLIF(UPPER(TRIM(p_uf)), ''),
      p_ref_tipo_endereco_id_FK
    )
    ON CONFLICT (cliente_id) DO UPDATE SET
      cep = COALESCE(NULLIF(REPLACE(TRIM(p_cep), '-', ''), ''), cliente_endereço.cep),
      rua = COALESCE(NULLIF(TRIM(p_rua), ''), cliente_endereço.rua),
      numero = COALESCE(NULLIF(TRIM(p_numero), ''), cliente_endereço.numero),
      complemento = COALESCE(NULLIF(TRIM(p_complemento), ''), cliente_endereço.complemento),
      bairro = COALESCE(NULLIF(TRIM(p_bairro), ''), cliente_endereço.bairro),
      cidade = COALESCE(NULLIF(TRIM(p_cidade), ''), cliente_endereço.cidade),
      uf = COALESCE(NULLIF(UPPER(TRIM(p_uf)), ''), cliente_endereço.uf),
      ref_tipo_endereco_id_FK = COALESCE(p_ref_tipo_endereco_id_FK, cliente_endereço.ref_tipo_endereco_id_FK);
  END IF;

  -- 7. RETORNAR DADOS DO CLIENTE CRIADO
  RETURN QUERY
  SELECT 
    c.cliente_id,
    c.nome,
    c.nome_fantasia,
    c.cpf_cnpj,
    c.codigo,
    c.status_aprovacao,
    c.created_at
  FROM public.cliente c
  WHERE c.cliente_id = v_cliente_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_cliente_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION create_cliente_v2 IS 
'Cria um novo cliente com validações, relacionamentos e workflow de aprovação';

GRANT EXECUTE ON FUNCTION create_cliente_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION create_cliente_v2 FROM anon;

-- ============================================================================
-- 2. FUNÇÃO: update_cliente_v2
-- ============================================================================
-- Atualiza um cliente existente
-- ============================================================================

CREATE OR REPLACE FUNCTION update_cliente_v2(
  p_cliente_id BIGINT,
  p_nome TEXT DEFAULT NULL,
  p_nome_fantasia TEXT DEFAULT NULL,
  p_cpf_cnpj TEXT DEFAULT NULL,
  p_inscricao_estadual TEXT DEFAULT NULL,
  p_codigo TEXT DEFAULT NULL,
  p_grupo_rede TEXT DEFAULT NULL,
  p_lista_de_preco BIGINT DEFAULT NULL,
  p_desconto_financeiro NUMERIC DEFAULT NULL,
  p_pedido_minimo NUMERIC DEFAULT NULL,
  p_vendedoresatribuidos UUID[] DEFAULT NULL,
  p_observacao_interna TEXT DEFAULT NULL,
  p_atualizado_por UUID DEFAULT NULL
)
RETURNS TABLE (
  cliente_id BIGINT,
  nome TEXT,
  nome_fantasia TEXT,
  cpf_cnpj TEXT,
  codigo TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_user_tipo TEXT;
  v_cliente_owner UUID;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_id é obrigatório';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.cliente
    WHERE cliente_id = p_cliente_id
    AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Cliente não encontrado';
  END IF;

  -- 2. VERIFICAR PERMISSÕES
  IF p_atualizado_por IS NOT NULL THEN
    SELECT tipo INTO v_user_tipo
    FROM public.user
    WHERE user_id = p_atualizado_por
    AND ativo = TRUE
    AND deleted_at IS NULL;

    IF v_user_tipo IS NULL THEN
      RAISE EXCEPTION 'Usuário não autorizado';
    END IF;

    -- Verificar se vendedor pode editar este cliente
    IF v_user_tipo = 'vendedor' THEN
      SELECT criado_por INTO v_cliente_owner
      FROM public.cliente
      WHERE cliente_id = p_cliente_id;

      -- Vendedor só pode editar clientes que criou E que estão aprovados
      IF v_cliente_owner != p_atualizado_por THEN
        RAISE EXCEPTION 'Vendedores só podem editar clientes que criaram';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM public.cliente
        WHERE cliente_id = p_cliente_id
        AND status_aprovacao = 'aprovado'
      ) THEN
        RAISE EXCEPTION 'Vendedores só podem editar clientes aprovados';
      END IF;
    END IF;
  END IF;

  -- 3. VALIDAR NOME SE FORNECIDO
  IF p_nome IS NOT NULL AND LENGTH(TRIM(p_nome)) < 2 THEN
    RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
  END IF;

  -- 4. ATUALIZAR CLIENTE
  UPDATE public.cliente
  SET
    nome = COALESCE(NULLIF(TRIM(p_nome), ''), nome),
    nome_fantasia = COALESCE(NULLIF(TRIM(p_nome_fantasia), ''), nome_fantasia),
    cpf_cnpj = COALESCE(NULLIF(REPLACE(REPLACE(REPLACE(p_cpf_cnpj, '.', ''), '/', ''), '-', ''), ''), cpf_cnpj),
    inscricao_estadual = COALESCE(NULLIF(TRIM(p_inscricao_estadual), ''), inscricao_estadual),
    codigo = COALESCE(NULLIF(TRIM(p_codigo), ''), codigo),
    grupo_rede = COALESCE(NULLIF(TRIM(p_grupo_rede), ''), grupo_rede),
    lista_de_preco = COALESCE(p_lista_de_preco, lista_de_preco),
    desconto_financeiro = COALESCE(p_desconto_financeiro, desconto_financeiro),
    pedido_minimo = COALESCE(p_pedido_minimo, pedido_minimo),
    vendedoresatribuidos = COALESCE(p_vendedoresatribuidos, vendedoresatribuidos),
    observacao_interna = COALESCE(NULLIF(TRIM(p_observacao_interna), ''), observacao_interna),
    atualizado_por = p_atualizado_por,
    updated_at = NOW()
  WHERE cliente_id = p_cliente_id;

  -- 5. RETORNAR DADOS ATUALIZADOS
  RETURN QUERY
  SELECT 
    c.cliente_id,
    c.nome,
    c.nome_fantasia,
    c.cpf_cnpj,
    c.codigo,
    c.updated_at
  FROM public.cliente c
  WHERE c.cliente_id = p_cliente_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_cliente_v2 for cliente %: %', p_cliente_id, SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION update_cliente_v2 IS 
'Atualiza um cliente existente com validações e verificação de permissões';

GRANT EXECUTE ON FUNCTION update_cliente_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION update_cliente_v2 FROM anon;

-- ============================================================================
-- 3. FUNÇÃO: delete_cliente_v2
-- ============================================================================
-- Soft delete de cliente
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_cliente_v2(
  p_cliente_id BIGINT,
  p_deleted_by UUID DEFAULT NULL
)
RETURNS TABLE (
  cliente_id BIGINT,
  deleted_at TIMESTAMPTZ
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
  IF p_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_id é obrigatório';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.cliente
    WHERE cliente_id = p_cliente_id
    AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Cliente não encontrado ou já excluído';
  END IF;

  -- 2. VERIFICAR PERMISSÕES
  IF p_deleted_by IS NOT NULL THEN
    SELECT tipo INTO v_user_tipo
    FROM public.user
    WHERE user_id = p_deleted_by
    AND ativo = TRUE
    AND deleted_at IS NULL;

    IF v_user_tipo IS NULL THEN
      RAISE EXCEPTION 'Usuário não autorizado';
    END IF;

    -- Apenas backoffice pode excluir clientes
    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem excluir clientes';
    END IF;
  END IF;

  -- 3. SOFT DELETE
  UPDATE public.cliente
  SET
    deleted_at = NOW(),
    ref_situacao_id = (SELECT ref_situacao_id FROM public.ref_situacao WHERE nome = 'Excluído' LIMIT 1)
  WHERE cliente_id = p_cliente_id;

  -- 4. RETORNAR DADOS
  RETURN QUERY
  SELECT 
    c.cliente_id,
    c.deleted_at
  FROM public.cliente c
  WHERE c.cliente_id = p_cliente_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in delete_cliente_v2 for cliente %: %', p_cliente_id, SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION delete_cliente_v2 IS 
'Realiza soft delete de um cliente (apenas backoffice)';

GRANT EXECUTE ON FUNCTION delete_cliente_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION delete_cliente_v2 FROM anon;

-- ============================================================================
-- 4. FUNÇÃO: get_cliente_by_id_v2
-- ============================================================================
-- Busca cliente por ID com relacionamentos
-- ============================================================================

CREATE OR REPLACE FUNCTION get_cliente_by_id_v2(
  p_cliente_id BIGINT,
  p_requesting_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_tipo TEXT;
  v_cliente_owner UUID;
  v_cliente_data JSON;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_id é obrigatório';
  END IF;

  -- 2. VERIFICAR PERMISSÕES
  IF p_requesting_user_id IS NOT NULL THEN
    SELECT tipo INTO v_user_tipo
    FROM public.user
    WHERE user_id = p_requesting_user_id
    AND ativo = TRUE
    AND deleted_at IS NULL;

    IF v_user_tipo = 'vendedor' THEN
      -- Vendedor só pode ver clientes aprovados que criou ou que estão atribuídos a ele
      SELECT criado_por INTO v_cliente_owner
      FROM public.cliente
      WHERE cliente_id = p_cliente_id;

      IF NOT EXISTS (
        SELECT 1 FROM public.cliente
        WHERE cliente_id = p_cliente_id
        AND deleted_at IS NULL
        AND status_aprovacao = 'aprovado'
        AND (
          criado_por = p_requesting_user_id
          OR p_requesting_user_id = ANY(vendedoresatribuidos)
        )
      ) THEN
        RAISE EXCEPTION 'Cliente não encontrado ou sem permissão de acesso';
      END IF;
    END IF;
  END IF;

  -- 3. BUSCAR CLIENTE COM RELACIONAMENTOS
  SELECT JSON_BUILD_OBJECT(
    'cliente', row_to_json(c.*),
    'contato', (SELECT row_to_json(cc.*) FROM public.cliente_contato cc WHERE cc.cliente_id = c.cliente_id),
    'endereco', (SELECT row_to_json(ce.*) FROM public.cliente_endereço ce WHERE ce.cliente_id = c.cliente_id)
  )
  INTO v_cliente_data
  FROM public.cliente c
  WHERE c.cliente_id = p_cliente_id
  AND c.deleted_at IS NULL;

  IF v_cliente_data IS NULL THEN
    RAISE EXCEPTION 'Cliente não encontrado';
  END IF;

  RETURN v_cliente_data;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in get_cliente_by_id_v2 for cliente %: %', p_cliente_id, SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION get_cliente_by_id_v2 IS 
'Busca um cliente por ID com relacionamentos e verificação de permissões';

GRANT EXECUTE ON FUNCTION get_cliente_by_id_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION get_cliente_by_id_v2 FROM anon;

-- ============================================================================
-- 5. FUNÇÃO: list_clientes_v2
-- ============================================================================
-- Lista clientes com filtros e paginação
-- ============================================================================

CREATE OR REPLACE FUNCTION list_clientes_v2(
  p_requesting_user_id UUID DEFAULT NULL,
  p_status_aprovacao_filter TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_vendedor_filter UUID DEFAULT NULL,
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
  v_user_tipo TEXT;
  v_clientes JSON;
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
    SELECT tipo INTO v_user_tipo
    FROM public.user
    WHERE user_id = p_requesting_user_id
    AND ativo = TRUE
    AND deleted_at IS NULL;
  END IF;

  v_offset := (p_page - 1) * p_limit;

  -- 3. CONTAR TOTAL
  SELECT COUNT(*)
  INTO v_total_count
  FROM public.cliente c
  WHERE c.deleted_at IS NULL
    AND (p_status_aprovacao_filter IS NULL OR c.status_aprovacao = p_status_aprovacao_filter)
    AND (
      p_search IS NULL OR
      LOWER(c.nome) LIKE '%' || LOWER(p_search) || '%' OR
      LOWER(c.nome_fantasia) LIKE '%' || LOWER(p_search) || '%' OR
      LOWER(c.cpf_cnpj) LIKE '%' || LOWER(p_search) || '%' OR
      LOWER(c.codigo) LIKE '%' || LOWER(p_search) || '%'
    )
    AND (
      v_user_tipo = 'backoffice' OR
      (v_user_tipo = 'vendedor' AND (
        c.criado_por = p_requesting_user_id
        OR p_requesting_user_id = ANY(c.vendedoresatribuidos)
      ) AND c.status_aprovacao = 'aprovado')
    )
    AND (p_vendedor_filter IS NULL OR p_vendedor_filter = ANY(c.vendedoresatribuidos));

  -- 4. BUSCAR CLIENTES
  SELECT JSON_BUILD_OBJECT(
    'clientes', COALESCE(JSON_AGG(cliente_data), '[]'::JSON),
    'total', v_total_count,
    'page', p_page,
    'limit', p_limit,
    'total_pages', CEIL(v_total_count::NUMERIC / p_limit)
  )
  INTO v_clientes
  FROM (
    SELECT 
      c.cliente_id,
      c.nome,
      c.nome_fantasia,
      c.cpf_cnpj,
      c.codigo,
      c.status_aprovacao,
      c.grupo_rede,
      c.created_at,
      c.updated_at
    FROM public.cliente c
    WHERE c.deleted_at IS NULL
      AND (p_status_aprovacao_filter IS NULL OR c.status_aprovacao = p_status_aprovacao_filter)
      AND (
        p_search IS NULL OR
        LOWER(c.nome) LIKE '%' || LOWER(p_search) || '%' OR
        LOWER(c.nome_fantasia) LIKE '%' || LOWER(p_search) || '%' OR
        LOWER(c.cpf_cnpj) LIKE '%' || LOWER(p_search) || '%' OR
        LOWER(c.codigo) LIKE '%' || LOWER(p_search) || '%'
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
    LIMIT p_limit
    OFFSET v_offset
  ) AS cliente_data;

  RETURN v_clientes;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in list_clientes_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION list_clientes_v2 IS 
'Lista clientes com filtros, paginação e verificação de permissões';

GRANT EXECUTE ON FUNCTION list_clientes_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION list_clientes_v2 FROM anon;

-- ============================================================================
-- 6. FUNÇÃO: aprovar_cliente_v2
-- ============================================================================
-- Aprova um cliente pendente
-- ============================================================================

CREATE OR REPLACE FUNCTION aprovar_cliente_v2(
  p_cliente_id BIGINT,
  p_aprovado_por UUID
)
RETURNS TABLE (
  cliente_id BIGINT,
  status_aprovacao TEXT,
  data_aprovacao DATE,
  aprovado_por UUID
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
  IF p_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_id é obrigatório';
  END IF;

  IF p_aprovado_por IS NULL THEN
    RAISE EXCEPTION 'aprovado_por é obrigatório';
  END IF;

  -- 2. VERIFICAR PERMISSÕES - Apenas backoffice pode aprovar
  SELECT tipo INTO v_user_tipo
  FROM public.user
  WHERE user_id = p_aprovado_por
  AND ativo = TRUE
  AND deleted_at IS NULL;

  IF v_user_tipo IS NULL THEN
    RAISE EXCEPTION 'Usuário não autorizado';
  END IF;

  IF v_user_tipo != 'backoffice' THEN
    RAISE EXCEPTION 'Apenas usuários backoffice podem aprovar clientes';
  END IF;

  -- 3. VERIFICAR SE CLIENTE EXISTE E ESTÁ PENDENTE
  IF NOT EXISTS (
    SELECT 1 FROM public.cliente
    WHERE cliente_id = p_cliente_id
    AND deleted_at IS NULL
    AND status_aprovacao = 'pendente'
  ) THEN
    RAISE EXCEPTION 'Cliente não encontrado ou não está pendente de aprovação';
  END IF;

  -- 4. APROVAR CLIENTE
  UPDATE public.cliente
  SET
    status_aprovacao = 'aprovado',
    data_aprovacao = CURRENT_DATE,
    aprovado_por = p_aprovado_por,
    ref_situacao_id = (SELECT ref_situacao_id FROM public.ref_situacao WHERE nome = 'Ativo' LIMIT 1),
    updated_at = NOW()
  WHERE cliente_id = p_cliente_id;

  -- 5. RETORNAR DADOS
  RETURN QUERY
  SELECT 
    c.cliente_id,
    c.status_aprovacao,
    c.data_aprovacao,
    c.aprovado_por
  FROM public.cliente c
  WHERE c.cliente_id = p_cliente_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in aprovar_cliente_v2 for cliente %: %', p_cliente_id, SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION aprovar_cliente_v2 IS 
'Aprova um cliente pendente (apenas backoffice)';

GRANT EXECUTE ON FUNCTION aprovar_cliente_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION aprovar_cliente_v2 FROM anon;

-- ============================================================================
-- 7. FUNÇÃO: rejeitar_cliente_v2
-- ============================================================================
-- Rejeita um cliente pendente
-- ============================================================================

CREATE OR REPLACE FUNCTION rejeitar_cliente_v2(
  p_cliente_id BIGINT,
  p_motivo_rejeicao TEXT,
  p_rejeitado_por UUID
)
RETURNS TABLE (
  cliente_id BIGINT,
  status_aprovacao TEXT,
  motivo_rejeicao TEXT
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
  IF p_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_id é obrigatório';
  END IF;

  IF p_rejeitado_por IS NULL THEN
    RAISE EXCEPTION 'rejeitado_por é obrigatório';
  END IF;

  IF p_motivo_rejeicao IS NULL OR LENGTH(TRIM(p_motivo_rejeicao)) < 5 THEN
    RAISE EXCEPTION 'Motivo da rejeição deve ter pelo menos 5 caracteres';
  END IF;

  -- 2. VERIFICAR PERMISSÕES - Apenas backoffice pode rejeitar
  SELECT tipo INTO v_user_tipo
  FROM public.user
  WHERE user_id = p_rejeitado_por
  AND ativo = TRUE
  AND deleted_at IS NULL;

  IF v_user_tipo IS NULL THEN
    RAISE EXCEPTION 'Usuário não autorizado';
  END IF;

  IF v_user_tipo != 'backoffice' THEN
    RAISE EXCEPTION 'Apenas usuários backoffice podem rejeitar clientes';
  END IF;

  -- 3. VERIFICAR SE CLIENTE EXISTE E ESTÁ PENDENTE
  IF NOT EXISTS (
    SELECT 1 FROM public.cliente
    WHERE cliente_id = p_cliente_id
    AND deleted_at IS NULL
    AND status_aprovacao = 'pendente'
  ) THEN
    RAISE EXCEPTION 'Cliente não encontrado ou não está pendente de aprovação';
  END IF;

  -- 4. REJEITAR CLIENTE
  UPDATE public.cliente
  SET
    status_aprovacao = 'rejeitado',
    motivo_rejeicao = TRIM(p_motivo_rejeicao),
    ref_situacao_id = (SELECT ref_situacao_id FROM public.ref_situacao WHERE nome = 'Inativo' LIMIT 1),
    updated_at = NOW()
  WHERE cliente_id = p_cliente_id;

  -- 5. RETORNAR DADOS
  RETURN QUERY
  SELECT 
    c.cliente_id,
    c.status_aprovacao,
    c.motivo_rejeicao
  FROM public.cliente c
  WHERE c.cliente_id = p_cliente_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in rejeitar_cliente_v2 for cliente %: %', p_cliente_id, SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION rejeitar_cliente_v2 IS 
'Rejeita um cliente pendente com motivo (apenas backoffice)';

GRANT EXECUTE ON FUNCTION rejeitar_cliente_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION rejeitar_cliente_v2 FROM anon;

-- ============================================================================
-- 8. FUNÇÃO: get_cliente_completo_v2
-- ============================================================================
-- Busca cliente completo com todos os relacionamentos
-- ============================================================================

CREATE OR REPLACE FUNCTION get_cliente_completo_v2(
  p_cliente_id BIGINT,
  p_requesting_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_tipo TEXT;
  v_cliente_completo JSON;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_id é obrigatório';
  END IF;

  -- 2. VERIFICAR PERMISSÕES (mesma lógica de get_cliente_by_id_v2)
  IF p_requesting_user_id IS NOT NULL THEN
    SELECT tipo INTO v_user_tipo
    FROM public.user
    WHERE user_id = p_requesting_user_id
    AND ativo = TRUE
    AND deleted_at IS NULL;

    IF v_user_tipo = 'vendedor' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.cliente
        WHERE cliente_id = p_cliente_id
        AND deleted_at IS NULL
        AND status_aprovacao = 'aprovado'
        AND (
          criado_por = p_requesting_user_id
          OR p_requesting_user_id = ANY(vendedoresatribuidos)
        )
      ) THEN
        RAISE EXCEPTION 'Cliente não encontrado ou sem permissão de acesso';
      END IF;
    END IF;
  END IF;

  -- 3. BUSCAR CLIENTE COMPLETO
  SELECT JSON_BUILD_OBJECT(
    'cliente', row_to_json(c.*),
    'contato', (SELECT row_to_json(cc.*) FROM public.cliente_contato cc WHERE cc.cliente_id = c.cliente_id),
    'endereco', (SELECT row_to_json(ce.*) FROM public.cliente_endereço ce WHERE ce.cliente_id = c.cliente_id),
    'vendedores', (
      SELECT JSON_AGG(row_to_json(dv.*))
      FROM public.dados_vendedor dv
      WHERE dv.user_id = ANY(c.vendedoresatribuidos)
      AND dv.deleted_at IS NULL
    )
  )
  INTO v_cliente_completo
  FROM public.cliente c
  WHERE c.cliente_id = p_cliente_id
  AND c.deleted_at IS NULL;

  IF v_cliente_completo IS NULL THEN
    RAISE EXCEPTION 'Cliente não encontrado';
  END IF;

  RETURN v_cliente_completo;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in get_cliente_completo_v2 for cliente %: %', p_cliente_id, SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION get_cliente_completo_v2 IS 
'Busca cliente completo com todos os relacionamentos e verificação de permissões';

GRANT EXECUTE ON FUNCTION get_cliente_completo_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION get_cliente_completo_v2 FROM anon;
