-- Migration 141: detalhe do cliente passa a retornar grupo_rede_nome.
-- BUG: get_cliente_completo_v2 devolvia grupo_id e grupo_rede (texto, null) mas NAO o
-- nome do grupo via join. O mapper (clientes-v2) faz grupo_rede_nome ?? grupo_rede ?? ''
-- -> caia em vazio, e o cliente achava que o Grupo/Rede nao havia sido salvo (dado estava
-- correto em grupo_id). FIX: adicionar grupo_rede_nome no mesmo padrao de segmento_nome.

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
          'grupo_rede_nome', (SELECT gr.nome FROM public.grupos_redes gr WHERE gr.id = c.grupo_id),
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
