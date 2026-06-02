-- Migration 114: Fix create_cliente_v2 to include missing fields
-- Fields that were collected by the UI but never saved on creation:
-- empresaFaturamento, desconto (desconto padrão), condicao_padrao, grupo_id
-- Also adds condicoes_pagamento support on create

CREATE OR REPLACE FUNCTION create_cliente_v2(
  p_nome TEXT,
  p_nome_fantasia TEXT DEFAULT NULL,
  p_cpf_cnpj TEXT DEFAULT NULL,
  p_ref_tipo_pessoa_id_FK BIGINT DEFAULT NULL,
  p_inscricao_estadual TEXT DEFAULT NULL,
  p_inscricao_municipal TEXT DEFAULT NULL,
  p_codigo TEXT DEFAULT NULL,
  p_grupo_rede TEXT DEFAULT NULL,
  p_grupo_id UUID DEFAULT NULL,
  p_lista_de_preco BIGINT DEFAULT NULL,
  p_desconto_financeiro NUMERIC DEFAULT 0,
  p_pedido_minimo NUMERIC DEFAULT 0,
  p_vendedoresatribuidos UUID[] DEFAULT NULL,
  p_observacao_interna TEXT DEFAULT NULL,
  p_tipo_segmento TEXT DEFAULT NULL,
  p_segmento_id BIGINT DEFAULT NULL,
  p_IE_isento BOOLEAN DEFAULT FALSE,
  p_empresa_faturamento_id BIGINT DEFAULT NULL,
  p_desconto NUMERIC DEFAULT NULL,
  p_condicao_padrao BIGINT DEFAULT NULL,
  p_condicoes_pagamento_ids BIGINT[] DEFAULT NULL,
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
  p_criado_por UUID DEFAULT NULL,
  p_requisitos_logisticos JSONB DEFAULT NULL
)
RETURNS TABLE (cliente_id BIGINT, nome TEXT, nome_fantasia TEXT, cpf_cnpj TEXT, codigo TEXT, status_aprovacao TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_cliente_id BIGINT;
  v_status_aprovacao TEXT;
  v_ref_situacao_id INTEGER;
BEGIN
  IF p_nome IS NULL OR LENGTH(TRIM(p_nome)) < 2 THEN
    RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
  END IF;

  IF p_criado_por IS NOT NULL THEN
    SELECT u.tipo INTO v_status_aprovacao
    FROM public."user" u
    WHERE u.user_id = p_criado_por AND u.ativo = TRUE AND u.deleted_at IS NULL;

    IF v_status_aprovacao = 'vendedor' THEN
      v_status_aprovacao := 'aprovado';
      v_ref_situacao_id := 1;
    ELSE
      v_status_aprovacao := 'aprovado';
      v_ref_situacao_id := 2;
    END IF;
  ELSE
    v_status_aprovacao := 'aprovado';
    v_ref_situacao_id := 2;
  END IF;

  INSERT INTO public.cliente (
    nome,
    nome_fantasia,
    cpf_cnpj,
    "ref_tipo_pessoa_id_FK",
    inscricao_estadual,
    inscricao_municipal,
    codigo,
    grupo_rede,
    grupo_id,
    lista_de_preco,
    desconto_financeiro,
    pedido_minimo,
    vendedoresatribuidos,
    observacao_interna,
    tipo_segmento,
    segmento_id,
    "IE_isento",
    "empresaFaturamento",
    desconto,
    condicao_padrao,
    status_aprovacao,
    ref_situacao_id,
    criado_por,
    requisitos_logisticos,
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
    p_grupo_id,
    p_lista_de_preco,
    COALESCE(p_desconto_financeiro, 0),
    COALESCE(p_pedido_minimo, 0),
    p_vendedoresatribuidos,
    NULLIF(TRIM(p_observacao_interna), ''),
    NULLIF(TRIM(p_tipo_segmento), ''),
    p_segmento_id,
    COALESCE(p_IE_isento, FALSE),
    p_empresa_faturamento_id,
    p_desconto,
    p_condicao_padrao,
    v_status_aprovacao,
    v_ref_situacao_id,
    p_criado_por,
    p_requisitos_logisticos,
    NOW()
  )
  RETURNING cliente.cliente_id INTO v_cliente_id;

  IF p_telefone IS NOT NULL OR p_email IS NOT NULL OR p_telefone_adicional IS NOT NULL OR p_email_nf IS NOT NULL OR p_website IS NOT NULL OR p_observacao_contato IS NOT NULL THEN
    INSERT INTO public.cliente_contato (cliente_id, telefone, telefone_adicional, email, email_nf, website, observacao)
    VALUES (v_cliente_id, NULLIF(TRIM(p_telefone), ''), NULLIF(TRIM(p_telefone_adicional), ''), NULLIF(LOWER(TRIM(p_email)), ''), NULLIF(LOWER(TRIM(p_email_nf)), ''), NULLIF(TRIM(p_website), ''), NULLIF(TRIM(p_observacao_contato), ''))
    ON CONFLICT (cliente_id) DO UPDATE SET
      telefone = COALESCE(NULLIF(TRIM(p_telefone), ''), cliente_contato.telefone),
      telefone_adicional = COALESCE(NULLIF(TRIM(p_telefone_adicional), ''), cliente_contato.telefone_adicional),
      email = COALESCE(NULLIF(LOWER(TRIM(p_email)), ''), cliente_contato.email),
      email_nf = COALESCE(NULLIF(LOWER(TRIM(p_email_nf)), ''), cliente_contato.email_nf),
      website = COALESCE(NULLIF(TRIM(p_website), ''), cliente_contato.website),
      observacao = COALESCE(NULLIF(TRIM(p_observacao_contato), ''), cliente_contato.observacao);
  END IF;

  IF p_cep IS NOT NULL OR p_rua IS NOT NULL OR p_numero IS NOT NULL OR p_complemento IS NOT NULL OR p_bairro IS NOT NULL OR p_cidade IS NOT NULL OR p_uf IS NOT NULL THEN
    INSERT INTO public."cliente_endereço" (cliente_id, cep, rua, numero, complemento, bairro, cidade, uf, "ref_tipo_endereco_id_FK")
    VALUES (
      v_cliente_id,
      NULLIF(REPLACE(TRIM(COALESCE(p_cep, '')), '-', ''), ''),
      NULLIF(TRIM(p_rua), ''),
      NULLIF(TRIM(p_numero), ''),
      NULLIF(TRIM(p_complemento), ''),
      NULLIF(TRIM(p_bairro), ''),
      NULLIF(TRIM(p_cidade), ''),
      NULLIF(UPPER(TRIM(p_uf)), ''),
      p_ref_tipo_endereco_id_FK
    )
    ON CONFLICT (cliente_id) DO UPDATE SET
      cep = COALESCE(NULLIF(REPLACE(TRIM(COALESCE(p_cep, '')), '-', ''), ''), "cliente_endereço".cep),
      rua = COALESCE(NULLIF(TRIM(p_rua), ''), "cliente_endereço".rua),
      numero = COALESCE(NULLIF(TRIM(p_numero), ''), "cliente_endereço".numero),
      complemento = COALESCE(NULLIF(TRIM(p_complemento), ''), "cliente_endereço".complemento),
      bairro = COALESCE(NULLIF(TRIM(p_bairro), ''), "cliente_endereço".bairro),
      cidade = COALESCE(NULLIF(TRIM(p_cidade), ''), "cliente_endereço".cidade),
      uf = COALESCE(NULLIF(UPPER(TRIM(p_uf)), ''), "cliente_endereço".uf),
      "ref_tipo_endereco_id_FK" = COALESCE(p_ref_tipo_endereco_id_FK, "cliente_endereço"."ref_tipo_endereco_id_FK");
  END IF;

  IF p_condicoes_pagamento_ids IS NOT NULL AND array_length(p_condicoes_pagamento_ids, 1) > 0 THEN
    INSERT INTO public."condições_cliente" ("ID_cliente", "ID_condições")
    SELECT v_cliente_id, unnest(p_condicoes_pagamento_ids)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN QUERY
  SELECT c.cliente_id, c.nome, c.nome_fantasia, c.cpf_cnpj, c.codigo, c.status_aprovacao, c.created_at
  FROM public.cliente c
  WHERE c.cliente_id = v_cliente_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_cliente_v2: %', SQLERRM;
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION create_cliente_v2 TO authenticated;
