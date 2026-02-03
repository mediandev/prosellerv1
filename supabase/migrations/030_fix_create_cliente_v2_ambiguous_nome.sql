-- ============================================================================
-- Migration 030: Corrigir ambiguidade na coluna "nome" em create_cliente_v2
-- ============================================================================
-- Problema: "column reference \"nome\" is ambiguous" ao criar cliente
-- Solução: Qualificar explicitamente a coluna "nome" nas subconsultas
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
    IF v_user_tipo = 'vendedor' THEN 
      v_status_aprovacao := 'pendente'; 
      SELECT ref_situacao_id INTO v_ref_situacao_id FROM public.ref_situacao rs WHERE rs.nome = 'Análise' LIMIT 1;
    ELSE 
      v_status_aprovacao := 'aprovado'; 
      SELECT ref_situacao_id INTO v_ref_situacao_id FROM public.ref_situacao rs WHERE rs.nome = 'Ativo' LIMIT 1;
    END IF;
  ELSE 
    v_status_aprovacao := 'pendente'; 
    SELECT ref_situacao_id INTO v_ref_situacao_id FROM public.ref_situacao rs WHERE rs.nome = 'Análise' LIMIT 1;
  END IF;

  -- Usar aspas para colunas com case sensitivity
  INSERT INTO public.cliente (
    nome, 
    nome_fantasia, 
    cpf_cnpj, 
    "ref_tipo_pessoa_id_FK", 
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
    segmento_id, 
    "IE_isento", 
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
    p_segmento_id, 
    COALESCE(p_IE_isento, FALSE), 
    v_status_aprovacao, 
    v_ref_situacao_id, 
    p_criado_por, 
    NOW()
  )
  RETURNING cliente_id INTO v_cliente_id;

  IF p_telefone IS NOT NULL OR p_email IS NOT NULL THEN
    INSERT INTO public.cliente_contato (cliente_id, telefone, telefone_adicional, email, email_nf, website, observacao)
    VALUES (v_cliente_id, NULLIF(TRIM(p_telefone), ''), NULLIF(TRIM(p_telefone_adicional), ''), NULLIF(LOWER(TRIM(p_email)), ''), NULLIF(LOWER(TRIM(p_email_nf)), ''), NULLIF(TRIM(p_website), ''), NULLIF(TRIM(p_observacao_contato), ''))
    ON CONFLICT ON CONSTRAINT cliente_contato_pkey DO UPDATE SET 
      telefone = COALESCE(NULLIF(TRIM(p_telefone), ''), EXCLUDED.telefone), 
      telefone_adicional = COALESCE(NULLIF(TRIM(p_telefone_adicional), ''), EXCLUDED.telefone_adicional), 
      email = COALESCE(NULLIF(LOWER(TRIM(p_email)), ''), EXCLUDED.email), 
      email_nf = COALESCE(NULLIF(LOWER(TRIM(p_email_nf)), ''), EXCLUDED.email_nf), 
      website = COALESCE(NULLIF(TRIM(p_website), ''), EXCLUDED.website), 
      observacao = COALESCE(NULLIF(TRIM(p_observacao_contato), ''), EXCLUDED.observacao);
  END IF;

  IF p_cep IS NOT NULL OR p_rua IS NOT NULL THEN
    INSERT INTO public.cliente_endereço (cliente_id, cep, rua, numero, complemento, bairro, cidade, uf, ref_tipo_endereco_id_FK)
    VALUES (v_cliente_id, NULLIF(REPLACE(TRIM(p_cep), '-', ''), ''), NULLIF(TRIM(p_rua), ''), NULLIF(TRIM(p_numero), ''), NULLIF(TRIM(p_complemento), ''), NULLIF(TRIM(p_bairro), ''), NULLIF(TRIM(p_cidade), ''), NULLIF(UPPER(TRIM(p_uf)), ''), p_ref_tipo_endereco_id_FK)
    ON CONFLICT ON CONSTRAINT cliente_endereço_pkey DO UPDATE SET 
      cep = COALESCE(NULLIF(REPLACE(TRIM(p_cep), '-', ''), ''), EXCLUDED.cep), 
      rua = COALESCE(NULLIF(TRIM(p_rua), ''), EXCLUDED.rua), 
      numero = COALESCE(NULLIF(TRIM(p_numero), ''), EXCLUDED.numero), 
      complemento = COALESCE(NULLIF(TRIM(p_complemento), ''), EXCLUDED.complemento), 
      bairro = COALESCE(NULLIF(TRIM(p_bairro), ''), EXCLUDED.bairro), 
      cidade = COALESCE(NULLIF(TRIM(p_cidade), ''), EXCLUDED.cidade), 
      uf = COALESCE(NULLIF(UPPER(TRIM(p_uf)), ''), EXCLUDED.uf), 
      ref_tipo_endereco_id_FK = COALESCE(p_ref_tipo_endereco_id_FK, EXCLUDED.ref_tipo_endereco_id_FK);
  END IF;

  RETURN QUERY SELECT c.cliente_id, c.nome, c.nome_fantasia, c.cpf_cnpj, c.codigo, c.status_aprovacao, c.created_at FROM public.cliente c WHERE c.cliente_id = v_cliente_id;
EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error in create_cliente_v2: %', SQLERRM; RAISE;
END;
$$;

COMMENT ON FUNCTION create_cliente_v2 IS 'Cria cliente com segmento_id (FK segmento_cliente) - Corrigido case sensitivity e ambiguidades usando ON CONSTRAINT e EXCLUDED';
