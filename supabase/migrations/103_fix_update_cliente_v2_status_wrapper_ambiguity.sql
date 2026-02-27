-- Fix ambiguity in update_cliente_v2 overload wrapper.
-- Use positional call to dispatch to the legacy 33-arg function.

CREATE OR REPLACE FUNCTION public.update_cliente_v2(
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
RETURNS TABLE(
  cliente_id bigint,
  nome text,
  nome_fantasia text,
  cpf_cnpj text,
  codigo text,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_status_aprovacao text;
BEGIN
  PERFORM public.update_cliente_v2(
    p_cliente_id,
    p_nome,
    p_nome_fantasia,
    p_cpf_cnpj,
    p_ref_tipo_pessoa_id_fk,
    p_inscricao_estadual,
    p_codigo,
    p_grupo_rede,
    p_grupo_id,
    p_lista_de_preco,
    p_desconto_financeiro,
    p_pedido_minimo,
    p_vendedoresatribuidos,
    p_observacao_interna,
    p_segmento_id,
    p_ref_situacao_id,
    p_telefone,
    p_telefone_adicional,
    p_email,
    p_email_nf,
    p_website,
    p_observacao_contato,
    p_cep,
    p_rua,
    p_numero,
    p_complemento,
    p_bairro,
    p_cidade,
    p_uf,
    p_ref_tipo_endereco_id_fk,
    p_empresa_faturamento_id,
    p_condicoes_pagamento_ids,
    p_atualizado_por
  );

  IF p_status_aprovacao IS NOT NULL THEN
    v_status_aprovacao := lower(trim(p_status_aprovacao));
    IF v_status_aprovacao NOT IN ('aprovado', 'pendente', 'rejeitado') THEN
      RAISE EXCEPTION 'status_aprovacao invalido: %', p_status_aprovacao;
    END IF;

    UPDATE public.cliente c
       SET status_aprovacao = v_status_aprovacao,
           updated_at = now(),
           atualizado_por = COALESCE(p_atualizado_por, c.atualizado_por)
     WHERE c.cliente_id = p_cliente_id;
  END IF;

  RETURN QUERY
  SELECT c.cliente_id, c.nome, c.nome_fantasia, c.cpf_cnpj, c.codigo, c.updated_at
    FROM public.cliente c
   WHERE c.cliente_id = p_cliente_id;
END;
$function$;

