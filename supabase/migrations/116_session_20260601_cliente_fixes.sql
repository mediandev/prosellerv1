-- Migration 116 — Backport das correções da sessão 2026-06-01 (cliente).
-- Estas funções JÁ estão aplicadas em produção; esta migration alinha o repositório.
-- Inclui: #variable_conflict use_column (ambiguidade cliente_id), código automático
-- (max+1 com pg_advisory_xact_lock) + situação nova nasce ATIVO em create_cliente_v2;
-- situacao_nome (join ref_situacao) em get_cliente_completo_v2 e list_clientes_v2.

-- ===== create_cliente_v2 =====
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
;

-- ===== update_cliente_v2 =====
CREATE OR REPLACE FUNCTION public.update_cliente_v2(p_cliente_id bigint, p_nome text DEFAULT NULL::text, p_nome_fantasia text DEFAULT NULL::text, p_cpf_cnpj text DEFAULT NULL::text, p_ref_tipo_pessoa_id_fk bigint DEFAULT NULL::bigint, p_inscricao_estadual text DEFAULT NULL::text, p_codigo text DEFAULT NULL::text, p_grupo_rede text DEFAULT NULL::text, p_grupo_id uuid DEFAULT NULL::uuid, p_lista_de_preco bigint DEFAULT NULL::bigint, p_desconto_financeiro numeric DEFAULT NULL::numeric, p_pedido_minimo numeric DEFAULT NULL::numeric, p_vendedoresatribuidos uuid[] DEFAULT NULL::uuid[], p_observacao_interna text DEFAULT NULL::text, p_segmento_id bigint DEFAULT NULL::bigint, p_ref_situacao_id integer DEFAULT NULL::integer, p_telefone text DEFAULT NULL::text, p_telefone_adicional text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_email_nf text DEFAULT NULL::text, p_website text DEFAULT NULL::text, p_observacao_contato text DEFAULT NULL::text, p_cep text DEFAULT NULL::text, p_rua text DEFAULT NULL::text, p_numero text DEFAULT NULL::text, p_complemento text DEFAULT NULL::text, p_bairro text DEFAULT NULL::text, p_cidade text DEFAULT NULL::text, p_uf text DEFAULT NULL::text, p_ref_tipo_endereco_id_fk bigint DEFAULT NULL::bigint, p_empresa_faturamento_id bigint DEFAULT NULL::bigint, p_condicoes_pagamento_ids bigint[] DEFAULT NULL::bigint[], p_atualizado_por uuid DEFAULT NULL::uuid, p_status_aprovacao text DEFAULT NULL::text, p_set_requisitos_logisticos boolean DEFAULT false, p_requisitos_logisticos jsonb DEFAULT NULL::jsonb, p_desconto numeric DEFAULT NULL::numeric, p_condicao_padrao bigint DEFAULT NULL::bigint)
 RETURNS TABLE(cliente_id bigint, nome text, nome_fantasia text, cpf_cnpj text, codigo text, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_user_tipo text;
  v_cliente_owner uuid;
  v_status_aprovacao text;
BEGIN
  IF p_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_id e obrigatorio';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.cliente c
    WHERE c.cliente_id = p_cliente_id
      AND c.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Cliente nao encontrado';
  END IF;

  IF p_atualizado_por IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_atualizado_por
      AND u.ativo = true
      AND u.deleted_at IS NULL;

    IF v_user_tipo IS NULL THEN
      RAISE EXCEPTION 'Usuario nao autorizado';
    END IF;

    IF v_user_tipo = 'vendedor' THEN
      SELECT c.criado_por INTO v_cliente_owner
      FROM public.cliente c
      WHERE c.cliente_id = p_cliente_id;

      IF v_cliente_owner != p_atualizado_por THEN
        RAISE EXCEPTION 'Vendedores so podem editar clientes que criaram';
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM public.cliente c
        WHERE c.cliente_id = p_cliente_id
          AND c.status_aprovacao = 'aprovado'
      ) THEN
        RAISE EXCEPTION 'Vendedores so podem editar clientes aprovados';
      END IF;
    END IF;
  END IF;

  IF p_nome IS NOT NULL AND length(trim(p_nome)) < 2 THEN
    RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
  END IF;

  IF p_ref_tipo_pessoa_id_fk IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.ref_tipo_pessoa rtp
      WHERE rtp.ref_tipo_pessoa_id = p_ref_tipo_pessoa_id_fk
    ) THEN
      RAISE EXCEPTION 'Tipo de pessoa invalido';
    END IF;
  END IF;

  IF p_status_aprovacao IS NOT NULL THEN
    v_status_aprovacao := lower(trim(p_status_aprovacao));
    IF v_status_aprovacao NOT IN ('aprovado', 'pendente', 'rejeitado') THEN
      RAISE EXCEPTION 'status_aprovacao invalido: %', p_status_aprovacao;
    END IF;
  ELSE
    v_status_aprovacao := NULL;
  END IF;

  UPDATE public.cliente c SET
    nome = COALESCE(NULLIF(trim(p_nome), ''), c.nome),
    nome_fantasia = COALESCE(NULLIF(trim(p_nome_fantasia), ''), c.nome_fantasia),
    cpf_cnpj = COALESCE(NULLIF(p_cpf_cnpj, ''), c.cpf_cnpj),
    "ref_tipo_pessoa_id_FK" = CASE WHEN p_ref_tipo_pessoa_id_fk IS NOT NULL THEN p_ref_tipo_pessoa_id_fk ELSE c."ref_tipo_pessoa_id_FK" END,
    inscricao_estadual = COALESCE(NULLIF(trim(p_inscricao_estadual), ''), c.inscricao_estadual),
    codigo = COALESCE(NULLIF(trim(p_codigo), ''), c.codigo),
    grupo_rede = COALESCE(NULLIF(trim(p_grupo_rede), ''), c.grupo_rede),
    grupo_id = CASE WHEN p_grupo_id IS NOT NULL THEN p_grupo_id ELSE c.grupo_id END,
    lista_de_preco = COALESCE(p_lista_de_preco, c.lista_de_preco),
    desconto_financeiro = COALESCE(p_desconto_financeiro, c.desconto_financeiro),
    pedido_minimo = COALESCE(p_pedido_minimo, c.pedido_minimo),
    vendedoresatribuidos = COALESCE(p_vendedoresatribuidos, c.vendedoresatribuidos),
    observacao_interna = COALESCE(NULLIF(trim(p_observacao_interna), ''), c.observacao_interna),
    segmento_id = CASE WHEN p_segmento_id IS NOT NULL THEN p_segmento_id ELSE c.segmento_id END,
    ref_situacao_id = CASE WHEN p_ref_situacao_id IS NOT NULL THEN p_ref_situacao_id ELSE c.ref_situacao_id END,
    status_aprovacao = CASE WHEN v_status_aprovacao IS NOT NULL THEN v_status_aprovacao ELSE c.status_aprovacao END,
    "empresaFaturamento" = CASE WHEN p_empresa_faturamento_id IS NOT NULL THEN p_empresa_faturamento_id ELSE c."empresaFaturamento" END,
    requisitos_logisticos = CASE WHEN p_set_requisitos_logisticos THEN p_requisitos_logisticos ELSE c.requisitos_logisticos END,
    desconto = COALESCE(p_desconto, c.desconto),
    condicao_padrao = CASE WHEN p_condicao_padrao IS NOT NULL THEN p_condicao_padrao ELSE c.condicao_padrao END,
    atualizado_por = p_atualizado_por,
    updated_at = now()
  WHERE c.cliente_id = p_cliente_id;

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
      NULLIF(trim(p_telefone), ''),
      NULLIF(trim(p_telefone_adicional), ''),
      NULLIF(lower(trim(p_email)), ''),
      NULLIF(lower(trim(p_email_nf)), ''),
      NULLIF(trim(p_website), ''),
      NULLIF(trim(p_observacao_contato), '')
    )
    ON CONFLICT ON CONSTRAINT cliente_contato_pkey DO UPDATE SET
      telefone = COALESCE(NULLIF(trim(p_telefone), ''), EXCLUDED.telefone),
      telefone_adicional = COALESCE(NULLIF(trim(p_telefone_adicional), ''), EXCLUDED.telefone_adicional),
      email = COALESCE(NULLIF(lower(trim(p_email)), ''), EXCLUDED.email),
      email_nf = COALESCE(NULLIF(lower(trim(p_email_nf)), ''), EXCLUDED.email_nf),
      website = COALESCE(NULLIF(trim(p_website), ''), EXCLUDED.website),
      observacao = COALESCE(NULLIF(trim(p_observacao_contato), ''), EXCLUDED.observacao);
  END IF;

  IF p_cep IS NOT NULL OR p_rua IS NOT NULL OR p_numero IS NOT NULL OR p_complemento IS NOT NULL OR p_bairro IS NOT NULL OR p_cidade IS NOT NULL OR p_uf IS NOT NULL THEN
    INSERT INTO public."cliente_endereço" (
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
      NULLIF(REPLACE(trim(p_cep), '-', ''), ''),
      NULLIF(trim(p_rua), ''),
      NULLIF(trim(p_numero), ''),
      NULLIF(trim(p_complemento), ''),
      NULLIF(trim(p_bairro), ''),
      NULLIF(trim(p_cidade), ''),
      NULLIF(UPPER(trim(p_uf)), ''),
      p_ref_tipo_endereco_id_fk
    )
    ON CONFLICT ON CONSTRAINT "cliente_endereço_pkey" DO UPDATE SET
      cep = COALESCE(NULLIF(REPLACE(trim(p_cep), '-', ''), ''), EXCLUDED.cep),
      rua = COALESCE(NULLIF(trim(p_rua), ''), EXCLUDED.rua),
      numero = COALESCE(NULLIF(trim(p_numero), ''), EXCLUDED.numero),
      complemento = COALESCE(NULLIF(trim(p_complemento), ''), EXCLUDED.complemento),
      bairro = COALESCE(NULLIF(trim(p_bairro), ''), EXCLUDED.bairro),
      cidade = COALESCE(NULLIF(trim(p_cidade), ''), EXCLUDED.cidade),
      uf = COALESCE(NULLIF(UPPER(trim(p_uf)), ''), EXCLUDED.uf),
      "ref_tipo_endereco_id_FK" = COALESCE(p_ref_tipo_endereco_id_fk, EXCLUDED."ref_tipo_endereco_id_FK");
  END IF;

  IF p_condicoes_pagamento_ids IS NOT NULL THEN
    DELETE FROM public."condições_cliente" cc
    WHERE cc."ID_cliente" = p_cliente_id;

    IF array_length(p_condicoes_pagamento_ids, 1) > 0 THEN
      INSERT INTO public."condições_cliente" ("ID_cliente", "ID_condições")
      SELECT p_cliente_id, unnest(p_condicoes_pagamento_ids)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN QUERY
  SELECT c.cliente_id, c.nome, c.nome_fantasia, c.cpf_cnpj, c.codigo, c.updated_at
  FROM public.cliente c
  WHERE c.cliente_id = p_cliente_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_cliente_v2 for cliente %: %', p_cliente_id, SQLERRM;
    RAISE;
END;
$function$
;

-- ===== get_cliente_completo_v2 =====
CREATE OR REPLACE FUNCTION public.get_cliente_completo_v2(p_cliente_id bigint, p_requesting_user_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_tipo text;
  v_cliente_completo json;
BEGIN
  IF p_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_id e obrigatorio';
  END IF;

  IF p_requesting_user_id IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public."user" u
    WHERE u.user_id = p_requesting_user_id
      AND u.ativo = true
      AND u.deleted_at IS NULL;

    IF v_user_tipo = 'vendedor' THEN
      IF NOT EXISTS (
        SELECT 1
        FROM public.cliente c
        WHERE c.cliente_id = p_cliente_id
          AND c.deleted_at IS NULL
          AND c.status_aprovacao = 'aprovado'
          AND (
            c.criado_por = p_requesting_user_id
            OR p_requesting_user_id = ANY(c.vendedoresatribuidos)
          )
      ) THEN
        RAISE EXCEPTION 'Cliente nao encontrado ou sem permissao de acesso';
      END IF;
    END IF;
  END IF;

  SELECT json_build_object(
    'cliente',
      (
        row_to_json(c.*)::jsonb
        || jsonb_build_object(
          'segmento_nome', sc.nome,
          'situacao_nome', (SELECT rs.nome FROM public.ref_situacao rs WHERE rs.ref_situacao_id = c.ref_situacao_id),
          'requisitos_logisticos', c.requisitos_logisticos
        )
      )::json,
    'contato', (SELECT row_to_json(cc.*) FROM public.cliente_contato cc WHERE cc.cliente_id = c.cliente_id),
    'endereco', (SELECT row_to_json(ce.*) FROM public."cliente_endereço" ce WHERE ce.cliente_id = c.cliente_id),
    'vendedores', (
      SELECT COALESCE(json_agg(row_to_json(dv.*)), '[]'::json)
      FROM public.dados_vendedor dv
      WHERE dv.user_id = ANY(c.vendedoresatribuidos)
        AND dv.deleted_at IS NULL
    ),
    'condicoes_cliente', (
      SELECT COALESCE(json_agg(row_to_json(cond.*)), '[]'::json)
      FROM public."condições_cliente" cond
      WHERE cond."ID_cliente" = c.cliente_id
    ),
    'conta_corrente_cliente', (
      SELECT COALESCE(json_agg(row_to_json(ccc.*) ORDER BY ccc.data DESC, ccc.id DESC), '[]'::json)
      FROM public.conta_corrente_cliente ccc
      WHERE ccc.cliente_id = c.cliente_id
    ),
    'historico', (
      SELECT COALESCE(
        json_agg(
          json_build_object(
            'id', h.id::text,
            'entidadeTipo', 'cliente',
            'entidadeId', h.cliente_id::text,
            'tipo', h.tipo,
            'descricao', h.descricao,
            'camposAlterados', COALESCE(h.campos_alterados, '[]'::jsonb),
            'usuarioId', COALESCE(h.usuario_id::text, ''),
            'usuarioNome', COALESCE(h.usuario_nome, 'Sistema'),
            'dataHora', h.data_hora,
            'metadados', COALESCE(h.metadados, '{}'::jsonb)
          )
          ORDER BY h.data_hora DESC, h.id DESC
        ),
        '[]'::json
      )
      FROM public.cliente_historico_alteracoes h
      WHERE h.cliente_id = c.cliente_id
    )
  )
  INTO v_cliente_completo
  FROM public.cliente c
  LEFT JOIN public.segmento_cliente sc
    ON sc.id = c.segmento_id
   AND sc.deleted_at IS NULL
  WHERE c.cliente_id = p_cliente_id
    AND c.deleted_at IS NULL;

  IF v_cliente_completo IS NULL THEN
    RAISE EXCEPTION 'Cliente nao encontrado';
  END IF;

  RETURN v_cliente_completo;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in get_cliente_completo_v2 for cliente %: %', p_cliente_id, SQLERRM;
    RAISE;
END;
$function$
;

-- ===== list_clientes_v2 =====
CREATE OR REPLACE FUNCTION public.list_clientes_v2(p_limit integer DEFAULT 10, p_page integer DEFAULT 1, p_requesting_user_id uuid DEFAULT NULL::uuid, p_search text DEFAULT NULL::text, p_status_aprovacao_filter text DEFAULT NULL::text, p_vendedor_filter uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_offset INTEGER;
  v_total_count INTEGER;
  v_user_tipo TEXT;
  v_clientes JSON;
  v_search_norm TEXT;
  v_search_digits TEXT;
BEGIN
  -- 1. VALIDACOES
  IF p_page < 1 THEN
    RAISE EXCEPTION 'Page must be greater than 0';
  END IF;
  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 100';
  END IF;

  -- 2. PERMISSAO
  IF p_requesting_user_id IS NOT NULL THEN
    SELECT tipo INTO v_user_tipo
    FROM public.user
    WHERE user_id = p_requesting_user_id
      AND ativo = TRUE
      AND deleted_at IS NULL;
  END IF;

  v_offset := (p_page - 1) * p_limit;

  -- 3. NORMALIZACAO DO TERMO DE BUSCA
  v_search_norm := CASE WHEN p_search IS NULL THEN NULL
                        ELSE unaccent(LOWER(p_search)) END;
  v_search_digits := CASE WHEN p_search IS NULL THEN NULL
                           ELSE NULLIF(REGEXP_REPLACE(p_search, '[^0-9]', '', 'g'), '') END;

  -- 4. CONTAR TOTAL
  SELECT COUNT(*)
  INTO v_total_count
  FROM public.cliente c
  WHERE c.deleted_at IS NULL
    AND (p_status_aprovacao_filter IS NULL OR c.status_aprovacao = p_status_aprovacao_filter)
    AND (
      v_search_norm IS NULL OR
      unaccent(LOWER(c.nome))                       LIKE '%' || v_search_norm || '%' OR
      unaccent(LOWER(c.nome_fantasia))              LIKE '%' || v_search_norm || '%' OR
      unaccent(LOWER(COALESCE(c.grupo_rede, '')))   LIKE '%' || v_search_norm || '%' OR
      LOWER(c.codigo)                               LIKE '%' || LOWER(p_search) || '%' OR
      LOWER(c.cpf_cnpj)                             LIKE '%' || LOWER(p_search) || '%' OR
      (v_search_digits IS NOT NULL
       AND LENGTH(v_search_digits) >= 3
       AND REGEXP_REPLACE(COALESCE(c.cpf_cnpj, ''), '[^0-9]', '', 'g') LIKE '%' || v_search_digits || '%')
    )
    AND (
      v_user_tipo = 'backoffice' OR
      (v_user_tipo = 'vendedor' AND (
        (c.status_aprovacao = 'aprovado'
         AND (c.criado_por = p_requesting_user_id
              OR p_requesting_user_id = ANY(c.vendedoresatribuidos)))
        OR
        (c.status_aprovacao = 'pendente' AND c.criado_por = p_requesting_user_id)
      ))
    )
    AND (p_vendedor_filter IS NULL OR p_vendedor_filter = ANY(c.vendedoresatribuidos));

  -- 5. BUSCAR CLIENTES COM JOIN PARA grupo_rede_nome E segmento_nome
  SELECT JSON_BUILD_OBJECT(
    'clientes', COALESCE(
      (SELECT JSON_AGG(
        json_build_object(
          'cliente_id', sub.cliente_id,
          'nome', sub.nome,
          'nome_fantasia', sub.nome_fantasia,
          'cpf_cnpj', sub.cpf_cnpj,
          'tipoPessoa', sub."ref_tipo_pessoa_id_FK",
          'codigo', sub.codigo,
          'status_aprovacao', sub.status_aprovacao,
          'grupo_rede', sub.grupo_rede,
          'grupo_rede_nome', sub.grupo_rede_nome,
          'segmento_id', sub.segmento_id,
          'segmento_nome', sub.segmento_nome,
          'ref_situacao_id', sub.ref_situacao_id,
          'situacao_nome', sub.situacao_nome,
          'created_at', sub.created_at,
          'updated_at', sub.updated_at
        )
      )
      FROM (
        SELECT
          c.cliente_id,
          c.nome,
          c.nome_fantasia,
          c.cpf_cnpj,
          c."ref_tipo_pessoa_id_FK",
          c.codigo,
          c.status_aprovacao,
          c.grupo_rede,
          gr.nome AS grupo_rede_nome,
          c.segmento_id,
          sc.nome AS segmento_nome,
          c.ref_situacao_id,
          rs.nome AS situacao_nome,
          c.created_at,
          c.updated_at
        FROM public.cliente c
        LEFT JOIN public.segmento_cliente sc ON sc.id = c.segmento_id AND sc.deleted_at IS NULL
        LEFT JOIN public.grupos_redes gr ON gr.id = c.grupo_id AND gr.deleted_at IS NULL
        LEFT JOIN public.ref_situacao rs ON rs.ref_situacao_id = c.ref_situacao_id
        WHERE c.deleted_at IS NULL
          AND (p_status_aprovacao_filter IS NULL OR c.status_aprovacao = p_status_aprovacao_filter)
          AND (
            v_search_norm IS NULL OR
            unaccent(LOWER(c.nome))                       LIKE '%' || v_search_norm || '%' OR
            unaccent(LOWER(c.nome_fantasia))              LIKE '%' || v_search_norm || '%' OR
            unaccent(LOWER(COALESCE(c.grupo_rede, '')))   LIKE '%' || v_search_norm || '%' OR
            LOWER(c.codigo)                               LIKE '%' || LOWER(p_search) || '%' OR
            LOWER(c.cpf_cnpj)                             LIKE '%' || LOWER(p_search) || '%' OR
            (v_search_digits IS NOT NULL
             AND LENGTH(v_search_digits) >= 3
             AND REGEXP_REPLACE(COALESCE(c.cpf_cnpj, ''), '[^0-9]', '', 'g') LIKE '%' || v_search_digits || '%')
          )
          AND (
            v_user_tipo = 'backoffice' OR
            (v_user_tipo = 'vendedor' AND (
              (c.status_aprovacao = 'aprovado'
               AND (c.criado_por = p_requesting_user_id
                    OR p_requesting_user_id = ANY(c.vendedoresatribuidos)))
              OR
              (c.status_aprovacao = 'pendente' AND c.criado_por = p_requesting_user_id)
            ))
          )
          AND (p_vendedor_filter IS NULL OR p_vendedor_filter = ANY(c.vendedoresatribuidos))
        ORDER BY c.created_at DESC
        LIMIT p_limit
        OFFSET v_offset
      ) sub),
      '[]'::JSON
    ),
    'total', v_total_count,
    'page', p_page,
    'limit', p_limit,
    'total_pages', CEIL(v_total_count::NUMERIC / p_limit)
  )
  INTO v_clientes;

  RETURN v_clientes;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in list_clientes_v2: %', SQLERRM;
    RAISE;
END;
$function$
;
