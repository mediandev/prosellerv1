-- ============================================================================
-- Migration 081: Permitir máscara no CPF/CNPJ em create_cliente_v2 e update_cliente_v2
-- ============================================================================
-- Descrição: Remove a limpeza automática de máscara (. / -) ao salvar CPF/CNPJ
-- Data: 2026-02-06
-- ============================================================================

-- 1. Atualizar update_cliente_v2
CREATE OR REPLACE FUNCTION update_cliente_v2(
  p_cliente_id BIGINT,
  p_nome TEXT DEFAULT NULL,
  p_nome_fantasia TEXT DEFAULT NULL,
  p_cpf_cnpj TEXT DEFAULT NULL,
  p_ref_tipo_pessoa_id_fk BIGINT DEFAULT NULL,
  p_inscricao_estadual TEXT DEFAULT NULL,
  p_codigo TEXT DEFAULT NULL,
  p_grupo_rede TEXT DEFAULT NULL,
  p_grupo_id UUID DEFAULT NULL,
  p_lista_de_preco BIGINT DEFAULT NULL,
  p_desconto_financeiro NUMERIC DEFAULT NULL,
  p_pedido_minimo NUMERIC DEFAULT NULL,
  p_vendedoresatribuidos UUID[] DEFAULT NULL,
  p_observacao_interna TEXT DEFAULT NULL,
  p_segmento_id BIGINT DEFAULT NULL,
  p_ref_situacao_id INTEGER DEFAULT NULL,
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
  p_ref_tipo_endereco_id_fk BIGINT DEFAULT NULL,
  p_empresa_faturamento_id BIGINT DEFAULT NULL,
  p_condicoes_pagamento_ids BIGINT[] DEFAULT NULL,
  p_atualizado_por UUID DEFAULT NULL
)
RETURNS TABLE (cliente_id BIGINT, nome TEXT, nome_fantasia TEXT, cpf_cnpj TEXT, codigo TEXT, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY INVOKER VOLATILE SET search_path = public
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
    SELECT 1 FROM public.cliente c
    WHERE c.cliente_id = p_cliente_id
    AND c.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Cliente não encontrado';
  END IF;

  -- 2. VERIFICAR PERMISSÕES
  IF p_atualizado_por IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_atualizado_por
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF v_user_tipo IS NULL THEN
      RAISE EXCEPTION 'Usuário não autorizado';
    END IF;

    IF v_user_tipo = 'vendedor' THEN
      SELECT c.criado_por INTO v_cliente_owner
      FROM public.cliente c
      WHERE c.cliente_id = p_cliente_id;

      IF v_cliente_owner != p_atualizado_por THEN
        RAISE EXCEPTION 'Vendedores só podem editar clientes que criaram';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM public.cliente c
        WHERE c.cliente_id = p_cliente_id
        AND c.status_aprovacao = 'aprovado'
      ) THEN
        RAISE EXCEPTION 'Vendedores só podem editar clientes aprovados';
      END IF;
    END IF;
  END IF;

  IF p_nome IS NOT NULL AND LENGTH(TRIM(p_nome)) < 2 THEN
    RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
  END IF;

  -- 3. VALIDAR ref_tipo_pessoa_id_fk SE FORNECIDO
  IF p_ref_tipo_pessoa_id_fk IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.ref_tipo_pessoa rtp
      WHERE rtp.ref_tipo_pessoa_id = p_ref_tipo_pessoa_id_fk
    ) THEN
      RAISE EXCEPTION 'Tipo de pessoa inválido';
    END IF;
  END IF;

  -- 4. ATUALIZAR CLIENTE - Qualificar todas as colunas para evitar ambiguidade
  -- ALTERAÇÃO: Removido REPLACE do cpf_cnpj para permitir máscara
  UPDATE public.cliente c SET
    nome = COALESCE(NULLIF(TRIM(p_nome), ''), c.nome),
    nome_fantasia = COALESCE(NULLIF(TRIM(p_nome_fantasia), ''), c.nome_fantasia),
    cpf_cnpj = COALESCE(NULLIF(p_cpf_cnpj, ''), c.cpf_cnpj),
    "ref_tipo_pessoa_id_FK" = CASE WHEN p_ref_tipo_pessoa_id_fk IS NOT NULL THEN p_ref_tipo_pessoa_id_fk ELSE c."ref_tipo_pessoa_id_FK" END,
    inscricao_estadual = COALESCE(NULLIF(TRIM(p_inscricao_estadual), ''), c.inscricao_estadual),
    codigo = COALESCE(NULLIF(TRIM(p_codigo), ''), c.codigo),
    grupo_rede = COALESCE(NULLIF(TRIM(p_grupo_rede), ''), c.grupo_rede),
    grupo_id = CASE WHEN p_grupo_id IS NOT NULL THEN p_grupo_id ELSE c.grupo_id END,
    lista_de_preco = COALESCE(p_lista_de_preco, c.lista_de_preco),
    desconto_financeiro = COALESCE(p_desconto_financeiro, c.desconto_financeiro),
    pedido_minimo = COALESCE(p_pedido_minimo, c.pedido_minimo),
    vendedoresatribuidos = COALESCE(p_vendedoresatribuidos, c.vendedoresatribuidos),
    observacao_interna = COALESCE(NULLIF(TRIM(p_observacao_interna), ''), c.observacao_interna),
    segmento_id = CASE WHEN p_segmento_id IS NOT NULL THEN p_segmento_id ELSE c.segmento_id END,
    ref_situacao_id = CASE WHEN p_ref_situacao_id IS NOT NULL THEN p_ref_situacao_id ELSE c.ref_situacao_id END,
    "empresaFaturamento" = CASE WHEN p_empresa_faturamento_id IS NOT NULL THEN p_empresa_faturamento_id ELSE c."empresaFaturamento" END,
    atualizado_por = p_atualizado_por,
    updated_at = NOW()
  WHERE c.cliente_id = p_cliente_id;

  -- 5. ATUALIZAR CONTATO SE FORNECIDO
  IF p_telefone IS NOT NULL OR p_email IS NOT NULL OR p_telefone_adicional IS NOT NULL OR p_email_nf IS NOT NULL OR p_website IS NOT NULL OR p_observacao_contato IS NOT NULL THEN
    INSERT INTO public.cliente_contato (
      cliente_id, 
      telefone, 
      telefone_adicional, 
      email, 
      email_nf, 
      website, 
      observacao
    )
    VALUES (
      p_cliente_id,
      NULLIF(TRIM(p_telefone), ''),
      NULLIF(TRIM(p_telefone_adicional), ''),
      NULLIF(LOWER(TRIM(p_email)), ''),
      NULLIF(LOWER(TRIM(p_email_nf)), ''),
      NULLIF(TRIM(p_website), ''),
      NULLIF(TRIM(p_observacao_contato), '')
    )
    ON CONFLICT ON CONSTRAINT cliente_contato_pkey DO UPDATE SET
      telefone = COALESCE(NULLIF(TRIM(p_telefone), ''), EXCLUDED.telefone),
      telefone_adicional = COALESCE(NULLIF(TRIM(p_telefone_adicional), ''), EXCLUDED.telefone_adicional),
      email = COALESCE(NULLIF(LOWER(TRIM(p_email)), ''), EXCLUDED.email),
      email_nf = COALESCE(NULLIF(LOWER(TRIM(p_email_nf)), ''), EXCLUDED.email_nf),
      website = COALESCE(NULLIF(TRIM(p_website), ''), EXCLUDED.website),
      observacao = COALESCE(NULLIF(TRIM(p_observacao_contato), ''), EXCLUDED.observacao);
  END IF;

  -- 6. ATUALIZAR ENDEREÇO SE FORNECIDO
  IF p_cep IS NOT NULL OR p_rua IS NOT NULL OR p_numero IS NOT NULL OR p_complemento IS NOT NULL OR p_bairro IS NOT NULL OR p_cidade IS NOT NULL OR p_uf IS NOT NULL THEN
    INSERT INTO public.cliente_endereço (
      cliente_id,
      cep,
      rua,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      "ref_tipo_endereco_id_FK"
    )
    VALUES (
      p_cliente_id,
      NULLIF(REPLACE(TRIM(p_cep), '-', ''), ''),
      NULLIF(TRIM(p_rua), ''),
      NULLIF(TRIM(p_numero), ''),
      NULLIF(TRIM(p_complemento), ''),
      NULLIF(TRIM(p_bairro), ''),
      NULLIF(TRIM(p_cidade), ''),
      NULLIF(UPPER(TRIM(p_uf)), ''),
      p_ref_tipo_endereco_id_fk
    )
    ON CONFLICT ON CONSTRAINT cliente_endereço_pkey DO UPDATE SET
      cep = COALESCE(NULLIF(REPLACE(TRIM(p_cep), '-', ''), ''), EXCLUDED.cep),
      rua = COALESCE(NULLIF(TRIM(p_rua), ''), EXCLUDED.rua),
      numero = COALESCE(NULLIF(TRIM(p_numero), ''), EXCLUDED.numero),
      complemento = COALESCE(NULLIF(TRIM(p_complemento), ''), EXCLUDED.complemento),
      bairro = COALESCE(NULLIF(TRIM(p_bairro), ''), EXCLUDED.bairro),
      cidade = COALESCE(NULLIF(TRIM(p_cidade), ''), EXCLUDED.cidade),
      uf = COALESCE(NULLIF(UPPER(TRIM(p_uf)), ''), EXCLUDED.uf),
      "ref_tipo_endereco_id_FK" = COALESCE(p_ref_tipo_endereco_id_fk, EXCLUDED."ref_tipo_endereco_id_FK");
  END IF;

  -- 7. ATUALIZAR CONDIÇÕES DE PAGAMENTO SE FORNECIDO
  IF p_condicoes_pagamento_ids IS NOT NULL THEN
    -- Remover condições antigas
    DELETE FROM public.condições_cliente cc
    WHERE cc."ID_cliente" = p_cliente_id;

    -- Inserir novas condições
    IF array_length(p_condicoes_pagamento_ids, 1) > 0 THEN
      INSERT INTO public.condições_cliente ("ID_cliente", "ID_condições")
      SELECT p_cliente_id, unnest(p_condicoes_pagamento_ids)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- 8. RETORNAR DADOS ATUALIZADOS
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

COMMENT ON FUNCTION update_cliente_v2 IS 'Atualiza cliente sem limpar máscara do CNPJ';


-- 2. Atualizar create_cliente_v2
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
  -- CORREÇÃO: Validar apenas números, pois a máscara é permitida
  IF p_cpf_cnpj IS NOT NULL AND LENGTH(regexp_replace(p_cpf_cnpj, '\D', '', 'g')) NOT IN (11, 14) THEN RAISE EXCEPTION 'CPF/CNPJ inválido'; END IF;
  
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
  -- ALTERAÇÃO: Removido REPLACE do cpf_cnpj para permitir máscara
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
    NULLIF(p_cpf_cnpj, ''), 
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

COMMENT ON FUNCTION create_cliente_v2 IS 'Cria cliente sem limpar máscara do CNPJ';
