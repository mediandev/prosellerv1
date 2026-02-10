-- Migration 086: Incluir idTiny (id_tiny) no payload da listagem de pedidos (v2)
-- ============================================================================
-- MotivaÃ§Ã£o: a Edge Function tiny-enviar-pedido-venda-v1 grava pv.id_tiny ao enviar
-- ao Tiny. O frontend precisa disso na listagem para bloquear reenvio/ediÃ§Ã£o e
-- habilitar aÃ§Ãµes de sincronizaÃ§Ã£o.
-- Data: 2026-02-10
-- ============================================================================

CREATE OR REPLACE FUNCTION list_pedido_venda_v2(
  p_requesting_user_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_vendedor_id UUID DEFAULT NULL,
  p_cliente_id BIGINT DEFAULT NULL,
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 100
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
DECLARE
  v_offset INTEGER;
  v_total_count INTEGER;
  v_user_tipo TEXT;
  v_is_backoffice BOOLEAN;
  v_pedidos JSON;
  v_stats JSON;
  v_result JSON;
BEGIN
  -- 1. VALIDACOES
  IF p_page < 1 THEN
    RAISE EXCEPTION 'Page must be greater than 0';
  END IF;

  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 100';
  END IF;

  v_offset := (p_page - 1) * p_limit;

  -- 2. VERIFICAR TIPO DE USUARIO
  IF p_requesting_user_id IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
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

  -- 3. CONTAR TOTAL DE PEDIDOS (com filtros)
  SELECT COUNT(*)
  INTO v_total_count
  FROM public.pedido_venda pv
  LEFT JOIN public.cliente c ON c.cliente_id = pv.cliente_id
  LEFT JOIN public.natureza_operacao no ON no.nome = pv.natureza_operacao
  WHERE pv.deleted_at IS NULL
  AND (
    v_is_backoffice
    OR pv.vendedor_uuid = p_requesting_user_id
  )
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

  -- 4. BUSCAR PEDIDOS COM PAGINACAO
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'id', pv."pedido_venda_ID"::TEXT,
      'numero', pv.numero_pedido,
      'clienteId', pv.cliente_id::TEXT,
      'nomeCliente', pv.nome_cliente,
      'cnpjCliente', pv.cnpj_cliente,
      'inscricaoEstadualCliente', pv.inscricao_estadual_cliente,
      'vendedorId', pv.vendedor_uuid::TEXT,
      'nomeVendedor', pv.nome_vendedor,
      'naturezaOperacaoId', no.id::TEXT,
      'nomeNaturezaOperacao', pv.nome_natureza_operacao,
      'empresaFaturamentoId', pv.empresa_faturamento_id::TEXT,
      'nomeEmpresaFaturamento', pv.nome_empresa_faturamento,
      'listaPrecoId', pv.lista_preco_id::TEXT,
      'nomeListaPreco', pv.nome_lista_preco,
      'percentualDescontoPadrao', pv.percentual_desconto_padrao,
      'condicaoPagamentoId', pv.id_condicao::TEXT,
      'nomeCondicaoPagamento', pv.nome_condicao_pagamento,
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
    )
  )
  INTO v_pedidos
  FROM public.pedido_venda pv
  LEFT JOIN public.cliente c ON c.cliente_id = pv.cliente_id
  LEFT JOIN public.natureza_operacao no ON no.nome = pv.natureza_operacao
  WHERE pv.deleted_at IS NULL
  AND (
    v_is_backoffice
    OR pv.vendedor_uuid = p_requesting_user_id
  )
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
  OFFSET v_offset;

  -- 5. CALCULAR ESTATISTICAS
  SELECT JSON_BUILD_OBJECT(
    'total', COALESCE(SUM(CASE WHEN COALESCE(no.gera_receita, FALSE) = TRUE AND pv.status != 'Cancelado' THEN pv.valor_total ELSE 0 END), 0),
    'totalVendas', COUNT(CASE WHEN COALESCE(no.gera_receita, FALSE) = TRUE AND pv.status != 'Cancelado' THEN 1 END),
    'concluidas', COUNT(CASE WHEN COALESCE(no.gera_receita, FALSE) = TRUE AND pv.status = 'ConcluÃ­do' THEN 1 END),
    'totalConcluidas', COALESCE(SUM(CASE WHEN COALESCE(no.gera_receita, FALSE) = TRUE AND pv.status = 'ConcluÃ­do' THEN pv.valor_total ELSE 0 END), 0),
    'emAndamento', COUNT(CASE WHEN COALESCE(no.gera_receita, FALSE) = TRUE AND pv.status != 'Cancelado' AND pv.status != 'ConcluÃ­do' THEN 1 END),
    'totalEmAndamento', COALESCE(SUM(CASE WHEN COALESCE(no.gera_receita, FALSE) = TRUE AND pv.status != 'Cancelado' AND pv.status != 'ConcluÃ­do' THEN pv.valor_total ELSE 0 END), 0),
    'ticketMedio', CASE
      WHEN COUNT(CASE WHEN COALESCE(no.gera_receita, FALSE) = TRUE AND pv.status != 'Cancelado' THEN 1 END) > 0
      THEN COALESCE(SUM(CASE WHEN COALESCE(no.gera_receita, FALSE) = TRUE AND pv.status != 'Cancelado' THEN pv.valor_total ELSE 0 END), 0) /
           COUNT(CASE WHEN COALESCE(no.gera_receita, FALSE) = TRUE AND pv.status != 'Cancelado' THEN 1 END)
      ELSE 0
    END,
    'outrosPedidosTotal', COALESCE(SUM(CASE WHEN COALESCE(no.gera_receita, FALSE) = FALSE AND pv.status != 'Cancelado' THEN pv.valor_total ELSE 0 END), 0),
    'outrosPedidosConcluidos', COUNT(CASE WHEN COALESCE(no.gera_receita, FALSE) = FALSE AND pv.status = 'ConcluÃ­do' THEN 1 END),
    'outrosPedidosEmAndamento', COUNT(CASE WHEN COALESCE(no.gera_receita, FALSE) = FALSE AND pv.status != 'Cancelado' AND pv.status != 'ConcluÃ­do' THEN 1 END)
  )
  INTO v_stats
  FROM public.pedido_venda pv
  LEFT JOIN public.natureza_operacao no ON no.nome = pv.natureza_operacao
  WHERE pv.deleted_at IS NULL
  AND (
    v_is_backoffice
    OR pv.vendedor_uuid = p_requesting_user_id
  )
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

  -- 6. RETORNAR RESULTADO
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
$$;

