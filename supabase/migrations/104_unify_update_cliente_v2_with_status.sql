-- Unify update_cliente_v2 into a single signature that supports status_aprovacao.
-- This removes overload ambiguity and keeps backward compatibility by using
-- default NULL for p_status_aprovacao.

DROP FUNCTION IF EXISTS public.update_cliente_v2(
  bigint, text, text, text, bigint, text, text, text, uuid, bigint, numeric, numeric, uuid[],
  text, bigint, integer, text, text, text, text, text, text, text, text, text, text, text,
  text, text, bigint, bigint, bigint[], uuid
);

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
  p_status_aprovacao text DEFAULT NULL::text
)
RETURNS TABLE(cliente_id bigint, nome text, nome_fantasia text, cpf_cnpj text, codigo text, updated_at timestamp with time zone)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_tipo TEXT;
  v_cliente_owner UUID;
  v_status_aprovacao TEXT;
BEGIN
  IF p_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_id é obrigatório';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.cliente c
    WHERE c.cliente_id = p_cliente_id
      AND c.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Cliente não encontrado';
  END IF;

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
        SELECT 1
        FROM public.cliente c
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

  IF p_ref_tipo_pessoa_id_fk IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.ref_tipo_pessoa rtp
      WHERE rtp.ref_tipo_pessoa_id = p_ref_tipo_pessoa_id_fk
    ) THEN
      RAISE EXCEPTION 'Tipo de pessoa inválido';
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
    status_aprovacao = CASE WHEN v_status_aprovacao IS NOT NULL THEN v_status_aprovacao ELSE c.status_aprovacao END,
    "empresaFaturamento" = CASE WHEN p_empresa_faturamento_id IS NOT NULL THEN p_empresa_faturamento_id ELSE c."empresaFaturamento" END,
    atualizado_por = p_atualizado_por,
    updated_at = NOW()
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

  IF p_condicoes_pagamento_ids IS NOT NULL THEN
    DELETE FROM public.condições_cliente cc
    WHERE cc."ID_cliente" = p_cliente_id;

    IF array_length(p_condicoes_pagamento_ids, 1) > 0 THEN
      INSERT INTO public.condições_cliente ("ID_cliente", "ID_condições")
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
  text, text, bigint, bigint, bigint[], uuid, text
) TO authenticated;

