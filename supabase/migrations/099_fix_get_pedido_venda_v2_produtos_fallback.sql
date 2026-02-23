-- Migration 099: preencher campos de itens do pedido com fallback do catálogo de produtos
-- Contexto:
-- Alguns pedidos legados possuem null em pedido_venda_produtos
-- (numero, codigo_sku, codigo_ean, valor_tabela, subtotal, peso_*, unidade).
-- Esta migração torna o get_pedido_venda_v2 resiliente sem alterar o dado histórico.

CREATE OR REPLACE FUNCTION public.get_pedido_venda_v2(p_pedido_id bigint, p_requesting_user_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_tipo TEXT;
  v_is_backoffice BOOLEAN;
  v_pedido JSON;
  v_produtos JSON;
  v_result JSON;
BEGIN
  IF p_pedido_id IS NULL THEN
    RAISE EXCEPTION 'pedido_id é obrigatório';
  END IF;

  IF p_requesting_user_id IS NOT NULL THEN
    SELECT u.tipo
      INTO v_user_tipo
    FROM public."user" u
    WHERE u.user_id = p_requesting_user_id
      AND u.ativo = TRUE
      AND u.deleted_at IS NULL;

    v_is_backoffice := (v_user_tipo = 'backoffice');
  ELSE
    v_is_backoffice := FALSE;
  END IF;

  SELECT JSON_BUILD_OBJECT(
    'id', pv."pedido_venda_ID"::TEXT,
    'numero', pv.numero_pedido,
    'clienteId', pv.cliente_id::TEXT,
    'nomeCliente', COALESCE(c.nome, pv.nome_cliente),
    'cnpjCliente', COALESCE(c.cpf_cnpj, pv.cnpj_cliente),
    'inscricaoEstadualCliente', COALESCE(c.inscricao_estadual, pv.inscricao_estadual_cliente),
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
  )
  INTO v_pedido
  FROM public.pedido_venda pv
  LEFT JOIN public.cliente c ON c.cliente_id = pv.cliente_id
  LEFT JOIN public.natureza_operacao no ON no.id = pv.natureza_id
  LEFT JOIN public.dados_vendedor dv ON dv.user_id::uuid = pv.vendedor_uuid::uuid
  LEFT JOIN public.listas_preco lp ON lp.id = pv.lista_preco_id
  LEFT JOIN public.ref_empresas_subsidiarias re ON re.id = pv.empresa_faturamento_id
  LEFT JOIN public."Condicao_De_Pagamento" cp
    ON cp."Condição_ID"::text = pv.id_condicao::text
  WHERE pv."pedido_venda_ID" = p_pedido_id
    AND pv.deleted_at IS NULL
    AND (v_is_backoffice OR pv.vendedor_uuid = p_requesting_user_id);

  IF v_pedido IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado ou sem permissão de acesso';
  END IF;

  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'id', x.pedido_venda_produtos_id::TEXT,
      'numero', x.numero,
      'produtoId', x.produto_id::TEXT,
      'descricaoProduto', x.descricao_produto,
      'codigoSku', x.codigo_sku,
      'codigoEan', x.codigo_ean,
      'valorTabela', x.valor_tabela,
      'percentualDesconto', x.percentual_desconto,
      'valorUnitario', x.valor_unitario,
      'quantidade', x.quantidade,
      'subtotal', x.subtotal,
      'pesoBruto', x.peso_bruto,
      'pesoLiquido', x.peso_liquido,
      'unidade', x.unidade
    )
    ORDER BY x.ordem_item, x.pedido_venda_produtos_id
  )
  INTO v_produtos
  FROM (
    SELECT
      pvp.pedido_venda_produtos_id,
      pvp.produto_id,
      COALESCE(pvp.numero, ROW_NUMBER() OVER (ORDER BY pvp.pedido_venda_produtos_id)) AS numero,
      COALESCE(NULLIF(pvp.descricao, ''), pr.descricao, 'Produto sem descrição') AS descricao_produto,
      COALESCE(NULLIF(pvp.codigo_sku, ''), pr.codigo_sku) AS codigo_sku,
      COALESCE(NULLIF(pvp.codigo_ean, ''), pr.gtin) AS codigo_ean,
      COALESCE(pvp.valor_tabela, pvp.valor_unitario, pr.preco_venda, 0) AS valor_tabela,
      COALESCE(pvp.percentual_desconto, 0) AS percentual_desconto,
      COALESCE(pvp.valor_unitario, pvp.valor_tabela, pr.preco_venda, 0) AS valor_unitario,
      COALESCE(pvp.quantidade, 0) AS quantidade,
      COALESCE(
        pvp.subtotal,
        COALESCE(pvp.valor_unitario, pvp.valor_tabela, pr.preco_venda, 0) * COALESCE(pvp.quantidade, 0)
      ) AS subtotal,
      COALESCE(pvp.peso_bruto, pr.peso_bruto, 0) AS peso_bruto,
      COALESCE(pvp.peso_liquido, pr.peso_liquido, 0) AS peso_liquido,
      COALESCE(NULLIF(pvp.unidade, ''), pr.sigla_unidade, 'UN') AS unidade,
      COALESCE(pvp.numero, 2147483647) AS ordem_item
    FROM public.pedido_venda_produtos pvp
    LEFT JOIN public.produto pr
      ON pr.produto_id = pvp.produto_id
     AND pr.deleted_at IS NULL
    WHERE pvp.pedido_venda_id = p_pedido_id
  ) x;

  SELECT JSON_BUILD_OBJECT(
    'pedido', v_pedido,
    'produtos', COALESCE(v_produtos, '[]'::JSON)
  )
  INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in get_pedido_venda_v2 for pedido %: %', p_pedido_id, SQLERRM;
    RAISE;
END;
$function$;
