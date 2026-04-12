-- ============================================================================
-- Migration 028: Incluir segmento_id nas RPCs de cliente
-- ============================================================================
-- create_cliente_v2: adicionar parâmetro p_segmento_id e coluna segmento_id no INSERT
-- update_cliente_v2: parâmetro p_segmento_id e UPDATE segmento_id
-- list_clientes_v2: retornar segmento_id e segmento_nome (join segmento_cliente)
-- ============================================================================

-- 1. create_cliente_v2: adicionar p_segmento_id e inserir segmento_id (mantém lógica da 007)
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
  p_segmento_id BIGINT DEFAULT NULL,
  p_IE_isento BOOLEAN DEFAULT FALSE,
  p_telefone TEXT DEFAULT NULL,
  p_telefone_adicional TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_email_nf TEXT DEFAULT NULL,
  p_website TEXT DEFAULT NULL,
  p_observacao_contato TEXT DEFAULT NULL,
  p_cep TEXT DEFAULT NULL,
  p_rua TEXT DEFAULT NULL,
  p_numero TEXT DEFAULT NULL,
  p_complemento TEXT DEFAULT NULL,
  p_bairro TEXT DEFAULT NULL,
  p_cidade TEXT DEFAULT NULL,
  p_uf TEXT DEFAULT NULL,
  p_ref_tipo_endereco_id_FK BIGINT DEFAULT NULL,
  p_criado_por UUID DEFAULT NULL
)
RETURNS TABLE (cliente_id BIGINT, nome TEXT, nome_fantasia TEXT, cpf_cnpj TEXT, codigo TEXT, status_aprovacao TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY INVOKER VOLATILE SET search_path = public
AS $$
DECLARE v_cliente_id BIGINT; v_user_tipo TEXT; v_status_aprovacao TEXT; v_ref_situacao_id INTEGER;
BEGIN
  IF p_nome IS NULL OR LENGTH(TRIM(p_nome)) < 2 THEN RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres'; END IF;
  IF p_cpf_cnpj IS NOT NULL AND LENGTH(REPLACE(p_cpf_cnpj, '.', '')) NOT IN (11, 14) THEN RAISE EXCEPTION 'CPF/CNPJ inválido'; END IF;
  IF p_criado_por IS NOT NULL THEN
    SELECT tipo INTO v_user_tipo FROM public.user WHERE user_id = p_criado_por AND ativo = TRUE AND deleted_at IS NULL;
    IF v_user_tipo IS NULL THEN RAISE EXCEPTION 'Usuário não autorizado'; END IF;
    IF v_user_tipo = 'vendedor' THEN v_status_aprovacao := 'pendente'; v_ref_situacao_id := (SELECT ref_situacao_id FROM public.ref_situacao WHERE nome = 'Análise' LIMIT 1);
    ELSE v_status_aprovacao := 'aprovado'; v_ref_situacao_id := (SELECT ref_situacao_id FROM public.ref_situacao WHERE nome = 'Ativo' LIMIT 1); END IF;
  ELSE v_status_aprovacao := 'pendente'; v_ref_situacao_id := (SELECT ref_situacao_id FROM public.ref_situacao WHERE nome = 'Análise' LIMIT 1); END IF;

  INSERT INTO public.cliente (nome, nome_fantasia, cpf_cnpj, ref_tipo_pessoa_id_FK, inscricao_estadual, inscricao_municipal, codigo, grupo_rede, lista_de_preco, desconto_financeiro, pedido_minimo, vendedoresatribuidos, observacao_interna, tipo_segmento, segmento_id, IE_isento, status_aprovacao, ref_situacao_id, criado_por, created_at)
  VALUES (TRIM(p_nome), NULLIF(TRIM(p_nome_fantasia), ''), NULLIF(REPLACE(REPLACE(REPLACE(p_cpf_cnpj, '.', ''), '/', ''), '-', ''), ''), p_ref_tipo_pessoa_id_FK, NULLIF(TRIM(p_inscricao_estadual), ''), NULLIF(TRIM(p_inscricao_municipal), ''), NULLIF(TRIM(p_codigo), ''), NULLIF(TRIM(p_grupo_rede), ''), p_lista_de_preco, COALESCE(p_desconto_financeiro, 0), COALESCE(p_pedido_minimo, 0), p_vendedoresatribuidos, NULLIF(TRIM(p_observacao_interna), ''), NULLIF(TRIM(p_tipo_segmento), ''), p_segmento_id, COALESCE(p_IE_isento, FALSE), v_status_aprovacao, v_ref_situacao_id, p_criado_por, NOW())
  RETURNING cliente_id INTO v_cliente_id;

  IF p_telefone IS NOT NULL OR p_email IS NOT NULL THEN
    INSERT INTO public.cliente_contato (cliente_id, telefone, telefone_adicional, email, email_nf, website, observacao)
    VALUES (v_cliente_id, NULLIF(TRIM(p_telefone), ''), NULLIF(TRIM(p_telefone_adicional), ''), NULLIF(LOWER(TRIM(p_email)), ''), NULLIF(LOWER(TRIM(p_email_nf)), ''), NULLIF(TRIM(p_website), ''), NULLIF(TRIM(p_observacao_contato), ''))
    ON CONFLICT (cliente_id) DO UPDATE SET telefone = COALESCE(NULLIF(TRIM(p_telefone), ''), cliente_contato.telefone), telefone_adicional = COALESCE(NULLIF(TRIM(p_telefone_adicional), ''), cliente_contato.telefone_adicional), email = COALESCE(NULLIF(LOWER(TRIM(p_email)), ''), cliente_contato.email), email_nf = COALESCE(NULLIF(LOWER(TRIM(p_email_nf)), ''), cliente_contato.email_nf), website = COALESCE(NULLIF(TRIM(p_website), ''), cliente_contato.website), observacao = COALESCE(NULLIF(TRIM(p_observacao_contato), ''), cliente_contato.observacao);
  END IF;

  IF p_cep IS NOT NULL OR p_rua IS NOT NULL THEN
    INSERT INTO public.cliente_endereço (cliente_id, cep, rua, numero, complemento, bairro, cidade, uf, ref_tipo_endereco_id_FK)
    VALUES (v_cliente_id, NULLIF(REPLACE(TRIM(p_cep), '-', ''), ''), NULLIF(TRIM(p_rua), ''), NULLIF(TRIM(p_numero), ''), NULLIF(TRIM(p_complemento), ''), NULLIF(TRIM(p_bairro), ''), NULLIF(TRIM(p_cidade), ''), NULLIF(UPPER(TRIM(p_uf)), ''), p_ref_tipo_endereco_id_FK)
    ON CONFLICT (cliente_id) DO UPDATE SET cep = COALESCE(NULLIF(REPLACE(TRIM(p_cep), '-', ''), ''), cliente_endereço.cep), rua = COALESCE(NULLIF(TRIM(p_rua), ''), cliente_endereço.rua), numero = COALESCE(NULLIF(TRIM(p_numero), ''), cliente_endereço.numero), complemento = COALESCE(NULLIF(TRIM(p_complemento), ''), cliente_endereço.complemento), bairro = COALESCE(NULLIF(TRIM(p_bairro), ''), cliente_endereço.bairro), cidade = COALESCE(NULLIF(TRIM(p_cidade), ''), cliente_endereço.cidade), uf = COALESCE(NULLIF(UPPER(TRIM(p_uf)), ''), cliente_endereço.uf), ref_tipo_endereco_id_FK = COALESCE(p_ref_tipo_endereco_id_FK, cliente_endereço.ref_tipo_endereco_id_FK);
  END IF;

  RETURN QUERY SELECT c.cliente_id, c.nome, c.nome_fantasia, c.cpf_cnpj, c.codigo, c.status_aprovacao, c.created_at FROM public.cliente c WHERE c.cliente_id = v_cliente_id;
EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error in create_cliente_v2: %', SQLERRM; RAISE;
END;
$$;

-- 2. update_cliente_v2: adicionar p_segmento_id e atualizar segmento_id
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
  p_segmento_id BIGINT DEFAULT NULL,
  p_atualizado_por UUID DEFAULT NULL
)
RETURNS TABLE (cliente_id BIGINT, nome TEXT, nome_fantasia TEXT, cpf_cnpj TEXT, codigo TEXT, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY INVOKER VOLATILE SET search_path = public
AS $$
DECLARE v_user_tipo TEXT; v_cliente_owner UUID;
BEGIN
  IF p_cliente_id IS NULL THEN RAISE EXCEPTION 'cliente_id é obrigatório'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.cliente WHERE cliente_id = p_cliente_id AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Cliente não encontrado'; END IF;
  IF p_atualizado_por IS NOT NULL THEN
    SELECT tipo INTO v_user_tipo FROM public.user WHERE user_id = p_atualizado_por AND ativo = TRUE AND deleted_at IS NULL;
    IF v_user_tipo IS NULL THEN RAISE EXCEPTION 'Usuário não autorizado'; END IF;
    IF v_user_tipo = 'vendedor' THEN
      SELECT criado_por INTO v_cliente_owner FROM public.cliente WHERE cliente_id = p_cliente_id;
      IF v_cliente_owner != p_atualizado_por THEN RAISE EXCEPTION 'Vendedores só podem editar clientes que criaram'; END IF;
      IF NOT EXISTS (SELECT 1 FROM public.cliente WHERE cliente_id = p_cliente_id AND status_aprovacao = 'aprovado') THEN RAISE EXCEPTION 'Vendedores só podem editar clientes aprovados'; END IF;
    END IF;
  END IF;
  IF p_nome IS NOT NULL AND LENGTH(TRIM(p_nome)) < 2 THEN RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres'; END IF;

  UPDATE public.cliente SET
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
    segmento_id = CASE WHEN p_segmento_id IS NOT NULL THEN p_segmento_id ELSE segmento_id END,
    atualizado_por = p_atualizado_por,
    updated_at = NOW()
  WHERE cliente_id = p_cliente_id;

  RETURN QUERY SELECT c.cliente_id, c.nome, c.nome_fantasia, c.cpf_cnpj, c.codigo, c.updated_at FROM public.cliente c WHERE c.cliente_id = p_cliente_id;
EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error in update_cliente_v2 for cliente %: %', p_cliente_id, SQLERRM; RAISE;
END;
$$;

-- 3. list_clientes_v2: incluir segmento_id e segmento_nome (join segmento_cliente)
CREATE OR REPLACE FUNCTION list_clientes_v2(
  p_limit INTEGER DEFAULT 10,
  p_page INTEGER DEFAULT 1,
  p_requesting_user_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_status_aprovacao_filter TEXT DEFAULT NULL,
  p_vendedor_filter UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql SECURITY INVOKER STABLE SET search_path = public
AS $$
DECLARE v_offset INTEGER; v_total_count INTEGER; v_user_tipo TEXT; v_clientes JSON;
BEGIN
  IF p_page < 1 THEN RAISE EXCEPTION 'Page must be greater than 0'; END IF;
  IF p_limit < 1 OR p_limit > 100 THEN RAISE EXCEPTION 'Limit must be between 1 and 100'; END IF;
  IF p_requesting_user_id IS NOT NULL THEN
    SELECT tipo INTO v_user_tipo FROM public.user WHERE user_id = p_requesting_user_id AND ativo = TRUE AND deleted_at IS NULL;
  END IF;
  v_offset := (p_page - 1) * p_limit;

  SELECT COUNT(*) INTO v_total_count FROM public.cliente c
  WHERE c.deleted_at IS NULL
    AND (p_status_aprovacao_filter IS NULL OR c.status_aprovacao = p_status_aprovacao_filter)
    AND (p_search IS NULL OR LOWER(c.nome) LIKE '%' || LOWER(p_search) || '%' OR LOWER(c.nome_fantasia) LIKE '%' || LOWER(p_search) || '%' OR LOWER(c.cpf_cnpj) LIKE '%' || LOWER(p_search) || '%' OR LOWER(c.codigo) LIKE '%' || LOWER(p_search) || '%')
    AND (v_user_tipo = 'backoffice' OR (v_user_tipo = 'vendedor' AND (c.criado_por = p_requesting_user_id OR p_requesting_user_id = ANY(c.vendedoresatribuidos)) AND c.status_aprovacao = 'aprovado'))
    AND (p_vendedor_filter IS NULL OR p_vendedor_filter = ANY(c.vendedoresatribuidos));

  SELECT JSON_BUILD_OBJECT(
    'clientes', COALESCE(JSON_AGG(cliente_data), '[]'::JSON),
    'total', v_total_count, 'page', p_page, 'limit', p_limit, 'total_pages', CEIL(v_total_count::NUMERIC / p_limit)
  ) INTO v_clientes
  FROM (
    SELECT
      c.cliente_id,
      c.nome,
      c.nome_fantasia,
      c.cpf_cnpj,
      c.codigo,
      c.status_aprovacao,
      c.grupo_rede,
      c.segmento_id,
      sc.nome AS segmento_nome,
      c.created_at,
      c.updated_at
    FROM public.cliente c
    LEFT JOIN public.segmento_cliente sc ON sc.id = c.segmento_id AND sc.deleted_at IS NULL
    WHERE c.deleted_at IS NULL
      AND (p_status_aprovacao_filter IS NULL OR c.status_aprovacao = p_status_aprovacao_filter)
      AND (p_search IS NULL OR LOWER(c.nome) LIKE '%' || LOWER(p_search) || '%' OR LOWER(c.nome_fantasia) LIKE '%' || LOWER(p_search) || '%' OR LOWER(c.cpf_cnpj) LIKE '%' || LOWER(p_search) || '%' OR LOWER(c.codigo) LIKE '%' || LOWER(p_search) || '%')
      AND (v_user_tipo = 'backoffice' OR (v_user_tipo = 'vendedor' AND (c.criado_por = p_requesting_user_id OR p_requesting_user_id = ANY(c.vendedoresatribuidos)) AND c.status_aprovacao = 'aprovado'))
      AND (p_vendedor_filter IS NULL OR p_vendedor_filter = ANY(c.vendedoresatribuidos))
    ORDER BY c.created_at DESC
    LIMIT p_limit
    OFFSET v_offset
  ) AS cliente_data;

  RETURN v_clientes;
EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error in list_clientes_v2: %', SQLERRM; RAISE;
END;
$$;

COMMENT ON FUNCTION create_cliente_v2 IS 'Cria cliente com segmento_id (FK segmento_cliente)';
COMMENT ON FUNCTION update_cliente_v2 IS 'Atualiza cliente incluindo segmento_id';
COMMENT ON FUNCTION list_clientes_v2 IS 'Lista clientes com segmento_id e segmento_nome';

GRANT EXECUTE ON FUNCTION create_cliente_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION update_cliente_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION list_clientes_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION list_clientes_v2 FROM anon;
