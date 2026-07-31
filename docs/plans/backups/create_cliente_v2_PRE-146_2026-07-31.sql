CREATE OR REPLACE FUNCTION public.create_cliente_v2(p_nome text, p_nome_fantasia text DEFAULT NULL::text, p_cpf_cnpj text DEFAULT NULL::text, p_ref_tipo_pessoa_id_fk bigint DEFAULT NULL::bigint, p_inscricao_estadual text DEFAULT NULL::text, p_inscricao_municipal text DEFAULT NULL::text, p_codigo text DEFAULT NULL::text, p_grupo_rede text DEFAULT NULL::text, p_grupo_id uuid DEFAULT NULL::uuid, p_lista_de_preco bigint DEFAULT NULL::bigint, p_desconto_financeiro numeric DEFAULT 0, p_pedido_minimo numeric DEFAULT 0, p_vendedoresatribuidos uuid[] DEFAULT NULL::uuid[], p_observacao_interna text DEFAULT NULL::text, p_tipo_segmento text DEFAULT NULL::text, p_segmento_id bigint DEFAULT NULL::bigint, p_ie_isento boolean DEFAULT false, p_empresa_faturamento_id bigint DEFAULT NULL::bigint, p_desconto numeric DEFAULT NULL::numeric, p_condicao_padrao bigint DEFAULT NULL::bigint, p_condicoes_pagamento_ids bigint[] DEFAULT NULL::bigint[], p_telefone text DEFAULT NULL::text, p_telefone_adicional text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_email_nf text DEFAULT NULL::text, p_website text DEFAULT NULL::text, p_observacao_contato text DEFAULT NULL::text, p_cep text DEFAULT NULL::text, p_rua text DEFAULT NULL::text, p_numero text DEFAULT NULL::text, p_complemento text DEFAULT NULL::text, p_bairro text DEFAULT NULL::text, p_cidade text DEFAULT NULL::text, p_uf text DEFAULT NULL::text, p_ref_tipo_endereco_id_fk bigint DEFAULT NULL::bigint, p_criado_por uuid DEFAULT NULL::uuid, p_requisitos_logisticos jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(cliente_id bigint, nome text, nome_fantasia text, cpf_cnpj text, codigo text, status_aprovacao text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_cliente_id BIGINT;
  v_status_aprovacao TEXT;
  v_ref_situacao_id INTEGER;
  v_codigo TEXT;
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
      v_ref_situacao_id := 1;
    END IF;
  ELSE
    v_status_aprovacao := 'aprovado';
    v_ref_situacao_id := 1;
  END IF;

  -- Código automático: se não vier código, gera (maior código numérico + 1).
  -- pg_advisory_xact_lock serializa a geração p/ evitar código duplicado em cadastros simultâneos.
  -- MAX considera TODAS as linhas (inclui excluídas) para nunca reutilizar um código.
  v_codigo := NULLIF(TRIM(p_codigo), '');
  IF v_codigo IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('cliente_codigo_auto'));
    SELECT (COALESCE(MAX(codigo::bigint), 0) + 1)::text
      INTO v_codigo
      FROM public.cliente
     WHERE codigo ~ '^[0-9]+$';
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
    v_codigo,
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
$function$
