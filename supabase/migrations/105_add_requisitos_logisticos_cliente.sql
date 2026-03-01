-- Add JSONB storage for requisitos logisticos on cliente and wire it into
-- the RPCs used by clientes-v2.

ALTER TABLE public.cliente
  ADD COLUMN IF NOT EXISTS requisitos_logisticos jsonb;

COMMENT ON COLUMN public.cliente.requisitos_logisticos IS
'Armazena o payload JSON de requisitos logisticos do cliente.';

CREATE OR REPLACE FUNCTION public.create_cliente_v2(
  p_nome text,
  p_nome_fantasia text DEFAULT NULL::text,
  p_cpf_cnpj text DEFAULT NULL::text,
  p_ref_tipo_pessoa_id_fk bigint DEFAULT NULL::bigint,
  p_inscricao_estadual text DEFAULT NULL::text,
  p_inscricao_municipal text DEFAULT NULL::text,
  p_codigo text DEFAULT NULL::text,
  p_grupo_rede text DEFAULT NULL::text,
  p_lista_de_preco bigint DEFAULT NULL::bigint,
  p_desconto_financeiro numeric DEFAULT 0,
  p_pedido_minimo numeric DEFAULT 0,
  p_vendedoresatribuidos uuid[] DEFAULT NULL::uuid[],
  p_observacao_interna text DEFAULT NULL::text,
  p_tipo_segmento text DEFAULT NULL::text,
  p_ie_isento boolean DEFAULT false,
  p_telefone text DEFAULT NULL::text,
  p_telefone_adicional text DEFAULT NULL::text,
  p_email text DEFAULT NULL::text,
  p_email_nf text DEFAULT NULL::text,
  p_website text DEFAULT NULL::text,
  p_observacao_contato text DEFAULT NULL::text,
  p_cep text DEFAULT NULL::text,
  p_rua text DEFAULT NULL::text,
  p_numero text DEFAULT NULL::text,
  p_complemento text DEFAULT NULL::text,
  p_bairro text DEFAULT NULL::text,
  p_cidade text DEFAULT NULL::text,
  p_uf text DEFAULT NULL::text,
  p_ref_tipo_endereco_id_fk bigint DEFAULT NULL::bigint,
  p_criado_por uuid DEFAULT NULL::uuid,
  p_requisitos_logisticos jsonb DEFAULT NULL::jsonb
)
RETURNS TABLE (
  cliente_id bigint,
  nome text,
  nome_fantasia text,
  cpf_cnpj text,
  codigo text,
  status_aprovacao text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $function$
DECLARE
  v_cliente_id bigint;
  v_user_tipo text;
  v_status_aprovacao text;
  v_ref_situacao_id integer;
BEGIN
  IF p_nome IS NULL OR length(trim(p_nome)) < 2 THEN
    RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
  END IF;

  IF p_cpf_cnpj IS NOT NULL THEN
    IF length(replace(p_cpf_cnpj, '.', '')) NOT IN (11, 14) THEN
      RAISE EXCEPTION 'CPF/CNPJ invalido';
    END IF;
  END IF;

  IF p_criado_por IS NOT NULL THEN
    SELECT tipo INTO v_user_tipo
    FROM public.user
    WHERE user_id = p_criado_por
      AND ativo = true
      AND deleted_at IS NULL;

    IF v_user_tipo IS NULL THEN
      RAISE EXCEPTION 'Usuario nao autorizado';
    END IF;

    IF v_user_tipo = 'vendedor' THEN
      v_status_aprovacao := 'pendente';
      v_ref_situacao_id := (
        SELECT ref_situacao_id
        FROM public.ref_situacao
        WHERE nome = 'Analise'
        LIMIT 1
      );
    ELSE
      v_status_aprovacao := 'aprovado';
      v_ref_situacao_id := (
        SELECT ref_situacao_id
        FROM public.ref_situacao
        WHERE nome = 'Ativo'
        LIMIT 1
      );
    END IF;
  ELSE
    v_status_aprovacao := 'pendente';
    v_ref_situacao_id := (
      SELECT ref_situacao_id
      FROM public.ref_situacao
      WHERE nome = 'Analise'
      LIMIT 1
    );
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
    lista_de_preco,
    desconto_financeiro,
    pedido_minimo,
    vendedoresatribuidos,
    observacao_interna,
    tipo_segmento,
    "IE_isento",
    status_aprovacao,
    ref_situacao_id,
    criado_por,
    created_at,
    requisitos_logisticos
  )
  VALUES (
    trim(p_nome),
    NULLIF(trim(p_nome_fantasia), ''),
    NULLIF(replace(replace(replace(p_cpf_cnpj, '.', ''), '/', ''), '-', ''), ''),
    p_ref_tipo_pessoa_id_fk,
    NULLIF(trim(p_inscricao_estadual), ''),
    NULLIF(trim(p_inscricao_municipal), ''),
    NULLIF(trim(p_codigo), ''),
    NULLIF(trim(p_grupo_rede), ''),
    p_lista_de_preco,
    COALESCE(p_desconto_financeiro, 0),
    COALESCE(p_pedido_minimo, 0),
    p_vendedoresatribuidos,
    NULLIF(trim(p_observacao_interna), ''),
    NULLIF(trim(p_tipo_segmento), ''),
    COALESCE(p_ie_isento, false),
    v_status_aprovacao,
    v_ref_situacao_id,
    p_criado_por,
    now(),
    p_requisitos_logisticos
  )
  RETURNING cliente.cliente_id INTO v_cliente_id;

  IF p_telefone IS NOT NULL OR p_email IS NOT NULL THEN
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
      v_cliente_id,
      NULLIF(trim(p_telefone), ''),
      NULLIF(trim(p_telefone_adicional), ''),
      NULLIF(lower(trim(p_email)), ''),
      NULLIF(lower(trim(p_email_nf)), ''),
      NULLIF(trim(p_website), ''),
      NULLIF(trim(p_observacao_contato), '')
    );
  END IF;

  IF p_cep IS NOT NULL OR p_rua IS NOT NULL THEN
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
      v_cliente_id,
      NULLIF(replace(trim(p_cep), '-', ''), ''),
      NULLIF(trim(p_rua), ''),
      NULLIF(trim(p_numero), ''),
      NULLIF(trim(p_complemento), ''),
      NULLIF(trim(p_bairro), ''),
      NULLIF(trim(p_cidade), ''),
      NULLIF(upper(trim(p_uf)), ''),
      p_ref_tipo_endereco_id_fk
    );
  END IF;

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
$function$;

DROP FUNCTION IF EXISTS public.update_cliente_v2(
  bigint, text, text, text, bigint, text, text, text, uuid, bigint, numeric, numeric, uuid[],
  text, bigint, integer, text, text, text, text, text, text, text, text, text, text, text,
  text, text, bigint, bigint, bigint[], uuid, text
);

CREATE FUNCTION public.update_cliente_v2(
  p_cliente_id bigint,
  p_nome text DEFAULT NULL::text,
  p_nome_fantasia text DEFAULT NULL::text,
  p_cpf_cnpj text DEFAULT NULL::text,
  p_ref_tipo_pessoa_id_fk bigint DEFAULT NULL::bigint,
  p_inscricao_estadual text DEFAULT NULL::text,
  p_codigo text DEFAULT NULL::text,
  p_grupo_rede text DEFAULT NULL::text,
  p_grupo_id uuid DEFAULT NULL::uuid,
  p_lista_de_preco bigint DEFAULT NULL::bigint,
  p_desconto_financeiro numeric DEFAULT NULL::numeric,
  p_pedido_minimo numeric DEFAULT NULL::numeric,
  p_vendedoresatribuidos uuid[] DEFAULT NULL::uuid[],
  p_observacao_interna text DEFAULT NULL::text,
  p_segmento_id bigint DEFAULT NULL::bigint,
  p_ref_situacao_id integer DEFAULT NULL::integer,
  p_telefone text DEFAULT NULL::text,
  p_telefone_adicional text DEFAULT NULL::text,
  p_email text DEFAULT NULL::text,
  p_email_nf text DEFAULT NULL::text,
  p_website text DEFAULT NULL::text,
  p_observacao_contato text DEFAULT NULL::text,
  p_cep text DEFAULT NULL::text,
  p_rua text DEFAULT NULL::text,
  p_numero text DEFAULT NULL::text,
  p_complemento text DEFAULT NULL::text,
  p_bairro text DEFAULT NULL::text,
  p_cidade text DEFAULT NULL::text,
  p_uf text DEFAULT NULL::text,
  p_ref_tipo_endereco_id_fk bigint DEFAULT NULL::bigint,
  p_empresa_faturamento_id bigint DEFAULT NULL::bigint,
  p_condicoes_pagamento_ids bigint[] DEFAULT NULL::bigint[],
  p_atualizado_por uuid DEFAULT NULL::uuid,
  p_status_aprovacao text DEFAULT NULL::text,
  p_set_requisitos_logisticos boolean DEFAULT false,
  p_requisitos_logisticos jsonb DEFAULT NULL::jsonb
)
RETURNS TABLE(cliente_id bigint, nome text, nome_fantasia text, cpf_cnpj text, codigo text, updated_at timestamp with time zone)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
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
      NULLIF(replace(trim(p_cep), '-', ''), ''),
      NULLIF(trim(p_rua), ''),
      NULLIF(trim(p_numero), ''),
      NULLIF(trim(p_complemento), ''),
      NULLIF(trim(p_bairro), ''),
      NULLIF(trim(p_cidade), ''),
      NULLIF(upper(trim(p_uf)), ''),
      p_ref_tipo_endereco_id_fk
    )
    ON CONFLICT ON CONSTRAINT "cliente_endereço_pkey" DO UPDATE SET
      cep = COALESCE(NULLIF(replace(trim(p_cep), '-', ''), ''), EXCLUDED.cep),
      rua = COALESCE(NULLIF(trim(p_rua), ''), EXCLUDED.rua),
      numero = COALESCE(NULLIF(trim(p_numero), ''), EXCLUDED.numero),
      complemento = COALESCE(NULLIF(trim(p_complemento), ''), EXCLUDED.complemento),
      bairro = COALESCE(NULLIF(trim(p_bairro), ''), EXCLUDED.bairro),
      cidade = COALESCE(NULLIF(trim(p_cidade), ''), EXCLUDED.cidade),
      uf = COALESCE(NULLIF(upper(trim(p_uf)), ''), EXCLUDED.uf),
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
$function$;

GRANT EXECUTE ON FUNCTION public.update_cliente_v2(
  bigint, text, text, text, bigint, text, text, text, uuid, bigint, numeric, numeric, uuid[],
  text, bigint, integer, text, text, text, text, text, text, text, text, text, text, text,
  text, text, bigint, bigint, bigint[], uuid, text, boolean, jsonb
) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_cliente_completo_v2(
  p_cliente_id bigint,
  p_requesting_user_id uuid DEFAULT NULL::uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public
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
    FROM public.user u
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
$function$;

COMMENT ON FUNCTION public.get_cliente_completo_v2 IS
'Busca cliente completo com contato, endereco, vendedores, condicoes_cliente, conta_corrente_cliente, segmento_nome e requisitos_logisticos.';
