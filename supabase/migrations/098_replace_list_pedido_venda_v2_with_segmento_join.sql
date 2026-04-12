-- Migration 098: Replace list_pedido_venda_v2 to include segmento data directly from cliente
-- Source of truth for dashboard segment chart:
-- cliente.segmento_id -> segmento_cliente.id (name from segmento_cliente.nome)

CREATE OR REPLACE FUNCTION public.list_pedido_venda_v2(
  p_requesting_user_id uuid DEFAULT NULL::uuid,
  p_search text DEFAULT NULL::text,
  p_status text DEFAULT NULL::text,
  p_vendedor_id uuid DEFAULT NULL::uuid,
  p_cliente_id bigint DEFAULT NULL::bigint,
  p_data_inicio date DEFAULT NULL::date,
  p_data_fim date DEFAULT NULL::date,
  p_page integer DEFAULT 1,
  p_limit integer DEFAULT 100
)
RETURNS json
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_offset INTEGER;
  v_total_count INTEGER;
  v_user_tipo TEXT;
  v_is_backoffice BOOLEAN;
  v_pedidos JSON;
  v_stats JSON;
  v_result JSON;
BEGIN
  IF p_page < 1 THEN
    RAISE EXCEPTION 'Page must be greater than 0';
  END IF;

  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 100';
  END IF;

  v_offset := (p_page - 1) * p_limit;

  IF p_requesting_user_id IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public."user" u
    WHERE u.user_id = p_requesting_user_id
      AND u.ativo = TRUE
      AND u.deleted_at IS NULL;

    IF FOUND THEN
      v_is_backoffice := (v_user_tipo = 'backoffice');
    ELSE
      v_is_backoffice := FALSE;
    END IF;
  ELSE
    v_is_backoffice := FALSE;
  END IF;

  SELECT COUNT(*)
    INTO v_total_count
  FROM public.pedido_venda pv
  LEFT JOIN public.cliente c ON c.cliente_id = pv.cliente_id
  LEFT JOIN public.natureza_operacao no ON no.id = pv.natureza_id
  WHERE pv.deleted_at IS NULL
    AND (v_is_backoffice OR pv.vendedor_uuid = p_requesting_user_id)
    AND (p_search IS NULL OR
      c.nome ILIKE '%' || p_search || '%' OR
      c.nome_fantasia ILIKE '%' || p_search || '%' OR
      pv.numero_pedido ILIKE '%' || p_search || '%' OR
      pv.ordem_cliente ILIKE '%' || p_search || '%' OR
      pv."pedido_venda_ID"::TEXT ILIKE '%' || p_search || '%'
    )
    AND (p_status IS NULL OR pv.status = p_status)
    AND (p_vendedor_id IS NULL OR pv.vendedor_uuid = p_vendedor_id)
    AND (p_cliente_id IS NULL OR pv.cliente_id = p_cliente_id)
    AND (p_data_inicio IS NULL OR pv.data_venda >= p_data_inicio)
    AND (p_data_fim IS NULL OR pv.data_venda <= p_data_fim);

  SELECT JSON_AGG(x.obj ORDER BY x.data_venda DESC, x.ts DESC)
    INTO v_pedidos
  FROM (
    SELECT
      JSON_BUILD_OBJECT(
        'id', pv."pedido_venda_ID"::TEXT,
        'numero', pv.numero_pedido,
        'clienteId', pv.cliente_id::TEXT,
        'nomeCliente', COALESCE(c.nome, pv.nome_cliente),
        'cnpjCliente', COALESCE(c.cpf_cnpj, pv.cnpj_cliente),
        'inscricaoEstadualCliente', COALESCE(c.inscricao_estadual, pv.inscricao_estadual_cliente),
        'segmentoId', c.segmento_id::TEXT,
        'segmentoNome', COALESCE(sc.nome, 'Não Classificado'),
        'statusCliente', COALESCE(rs.nome, 'Ativo'),
        'clienteGrupoRede', c.grupo_rede,
        'clienteUf', ce.uf,
        'vendedorId', pv.vendedor_uuid::TEXT,
        'nomeVendedor', COALESCE(dv.nome_fantasia, pv.nome_vendedor),
        'naturezaOperacaoId', COALESCE(no.id::TEXT, pv.natureza_id::TEXT),
        'nomeNaturezaOperacao', COALESCE(no.nome, pv.nome_natureza_operacao),
        'empresaFaturamentoId', pv.empresa_faturamento_id::TEXT,
        'nomeEmpresaFaturamento', COALESCE(re.nome, pv.nome_empresa_faturamento),
        'listaPrecoId', pv.lista_preco_id::TEXT,
        'nomeListaPreco', COALESCE(lp.nome, pv.nome_lista_preco),
        'percentualDescontoPadrao', pv.percentual_desconto_padrao,
        'condicaoPagamentoId', pv.id_condicao::TEXT,
        'nomeCondicaoPagamento', COALESCE(cp."Descrição", pv.nome_condicao_pagamento),
        'valorPedido', pv.valor_total,
        'valorTotalProdutos', pv.valor_total_produtos,
        'percentualDescontoExtra', pv.percentual_desconto_extra,
        'valorDescontoExtra', pv.valor_desconto_extra,
        'totalQuantidades', pv.total_quantidades,
        'totalItens', pv.total_itens,
        'pesoBrutoTotal', pv.peso_bruto_total,
        'pesoLiquidoTotal', pv.peso_liquido_total,
        'status', pv.status,
        'dataPedido', pv.data_venda,
        'ordemCompraCliente', pv.ordem_cliente,
        'observacoesInternas', pv.observacao_interna,
        'observacoesNotaFiscal', pv.observacao,
        'createdAt', pv.timestamp,
        'updatedAt', pv.updated_at,
        'createdBy', pv.created_by::TEXT,
        'idTiny', pv.id_tiny,
        'geraReceita', COALESCE(no.gera_receita, FALSE)
      ) AS obj,
      pv.data_venda AS data_venda,
      pv.timestamp AS ts
    FROM public.pedido_venda pv
    LEFT JOIN public.cliente c ON c.cliente_id = pv.cliente_id
    LEFT JOIN public.segmento_cliente sc ON sc.id = c.segmento_id
    LEFT JOIN public.ref_situacao rs ON rs.ref_situacao_id = c.ref_situacao_id
    LEFT JOIN public."cliente_endereço" ce ON ce.cliente_id = c.cliente_id
    LEFT JOIN public.natureza_operacao no ON no.id = pv.natureza_id
    LEFT JOIN public.dados_vendedor dv ON dv.user_id::uuid = pv.vendedor_uuid::uuid
    LEFT JOIN public.listas_preco lp ON lp.id = pv.lista_preco_id
    LEFT JOIN public.ref_empresas_subsidiarias re ON re.id = pv.empresa_faturamento_id
    LEFT JOIN public."Condicao_De_Pagamento" cp ON cp."Condição_ID" = pv.id_condicao
    WHERE pv.deleted_at IS NULL
      AND (v_is_backoffice OR pv.vendedor_uuid = p_requesting_user_id)
      AND (p_search IS NULL OR
        c.nome ILIKE '%' || p_search || '%' OR
        c.nome_fantasia ILIKE '%' || p_search || '%' OR
        pv.numero_pedido ILIKE '%' || p_search || '%' OR
        pv.ordem_cliente ILIKE '%' || p_search || '%' OR
        pv."pedido_venda_ID"::TEXT ILIKE '%' || p_search || '%'
      )
      AND (p_status IS NULL OR pv.status = p_status)
      AND (p_vendedor_id IS NULL OR pv.vendedor_uuid = p_vendedor_id)
      AND (p_cliente_id IS NULL OR pv.cliente_id = p_cliente_id)
      AND (p_data_inicio IS NULL OR pv.data_venda >= p_data_inicio)
      AND (p_data_fim IS NULL OR pv.data_venda <= p_data_fim)
    ORDER BY pv.data_venda DESC, pv.timestamp DESC
    LIMIT p_limit
    OFFSET v_offset
  ) x;

  SELECT JSON_BUILD_OBJECT(
    'total', COALESCE(SUM(CASE WHEN COALESCE(no.gera_receita, FALSE) = TRUE AND pv.status != 'Cancelado' THEN pv.valor_total ELSE 0 END), 0),
    'totalVendas', COUNT(CASE WHEN COALESCE(no.gera_receita, FALSE) = TRUE AND pv.status != 'Cancelado' THEN 1 END),
    'concluidas', COUNT(CASE WHEN COALESCE(no.gera_receita, FALSE) = TRUE AND pv.status = 'Concluído' THEN 1 END),
    'totalConcluidas', COALESCE(SUM(CASE WHEN COALESCE(no.gera_receita, FALSE) = TRUE AND pv.status = 'Concluído' THEN pv.valor_total ELSE 0 END), 0),
    'emAndamento', COUNT(CASE WHEN COALESCE(no.gera_receita, FALSE) = TRUE AND pv.status != 'Cancelado' AND pv.status != 'Concluído' THEN 1 END),
    'totalEmAndamento', COALESCE(SUM(CASE WHEN COALESCE(no.gera_receita, FALSE) = TRUE AND pv.status != 'Cancelado' AND pv.status != 'Concluído' THEN pv.valor_total ELSE 0 END), 0),
    'ticketMedio', CASE
      WHEN COUNT(CASE WHEN COALESCE(no.gera_receita, FALSE) = TRUE AND pv.status != 'Cancelado' THEN 1 END) > 0
      THEN COALESCE(SUM(CASE WHEN COALESCE(no.gera_receita, FALSE) = TRUE AND pv.status != 'Cancelado' THEN pv.valor_total ELSE 0 END), 0) /
           COUNT(CASE WHEN COALESCE(no.gera_receita, FALSE) = TRUE AND pv.status != 'Cancelado' THEN 1 END)
      ELSE 0
    END,
    'outrosPedidosTotal', COALESCE(SUM(CASE WHEN COALESCE(no.gera_receita, FALSE) = FALSE AND pv.status != 'Cancelado' THEN pv.valor_total ELSE 0 END), 0),
    'outrosPedidosConcluidos', COUNT(CASE WHEN COALESCE(no.gera_receita, FALSE) = FALSE AND pv.status = 'Concluído' THEN 1 END),
    'outrosPedidosEmAndamento', COUNT(CASE WHEN COALESCE(no.gera_receita, FALSE) = FALSE AND pv.status != 'Cancelado' AND pv.status != 'Concluído' THEN 1 END)
  )
    INTO v_stats
  FROM public.pedido_venda pv
  LEFT JOIN public.natureza_operacao no ON no.id = pv.natureza_id
  WHERE pv.deleted_at IS NULL
    AND (v_is_backoffice OR pv.vendedor_uuid = p_requesting_user_id)
    AND (p_search IS NULL OR
      EXISTS (
        SELECT 1 FROM public.cliente c2
        WHERE c2.cliente_id = pv.cliente_id
          AND (
            c2.nome ILIKE '%' || p_search || '%' OR
            c2.nome_fantasia ILIKE '%' || p_search || '%'
          )
      ) OR
      pv.numero_pedido ILIKE '%' || p_search || '%' OR
      pv.ordem_cliente ILIKE '%' || p_search || '%' OR
      pv."pedido_venda_ID"::TEXT ILIKE '%' || p_search || '%'
    )
    AND (p_status IS NULL OR pv.status = p_status)
    AND (p_vendedor_id IS NULL OR pv.vendedor_uuid = p_vendedor_id)
    AND (p_cliente_id IS NULL OR pv.cliente_id = p_cliente_id)
    AND (p_data_inicio IS NULL OR pv.data_venda >= p_data_inicio)
    AND (p_data_fim IS NULL OR pv.data_venda <= p_data_fim);

  SELECT JSON_BUILD_OBJECT(
    'pedidos', COALESCE(v_pedidos, '[]'::JSON),
    'pagination', JSON_BUILD_OBJECT(
      'page', p_page,
      'limit', p_limit,
      'total', v_total_count,
      'total_pages', CASE WHEN v_total_count = 0 THEN 1 ELSE CEIL(v_total_count::NUMERIC / p_limit)::INTEGER END
    ),
    'stats', COALESCE(v_stats, '{}'::JSON)
  )
    INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in list_pedido_venda_v2: %', SQLERRM;
    RAISE;
END;
$function$;
