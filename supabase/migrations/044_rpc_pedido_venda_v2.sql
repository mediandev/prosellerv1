-- ============================================================================
-- Migration 044: Funções RPC para Pedidos de Venda (v2)
-- ============================================================================
-- Descrição: Cria funções RPC para gerenciamento completo de pedidos de venda
--            seguindo padrão arquitetural com validações, permissões e stats
-- Data: 2026-02-03
-- ============================================================================

-- ============================================================================
-- 1. FUNÇÃO: list_pedido_venda_v2
-- ============================================================================
-- Lista pedidos de venda com filtros, paginação e estatísticas
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
  -- 1. VALIDAÇÕES
  IF p_page < 1 THEN
    RAISE EXCEPTION 'Page must be greater than 0';
  END IF;

  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 100';
  END IF;

  v_offset := (p_page - 1) * p_limit;

  -- 2. VERIFICAR TIPO DE USUÁRIO
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

  -- 4. BUSCAR PEDIDOS COM PAGINAÇÃO
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

  -- 5. CALCULAR ESTATÍSTICAS
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

COMMENT ON FUNCTION list_pedido_venda_v2 IS 
'Lista pedidos de venda com filtros, paginação e estatísticas calculadas';

-- ============================================================================
-- 2. FUNÇÃO: get_pedido_venda_v2
-- ============================================================================
-- Busca um pedido de venda por ID com seus produtos
-- ============================================================================

CREATE OR REPLACE FUNCTION get_pedido_venda_v2(
  p_pedido_id BIGINT,
  p_requesting_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_tipo TEXT;
  v_is_backoffice BOOLEAN;
  v_pedido JSON;
  v_produtos JSON;
  v_result JSON;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_pedido_id IS NULL THEN
    RAISE EXCEPTION 'pedido_id é obrigatório';
  END IF;

  -- 2. VERIFICAR TIPO DE USUÁRIO
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

  -- 3. BUSCAR PEDIDO
  SELECT JSON_BUILD_OBJECT(
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
    'idTiny', pv.id_tiny
  )
  INTO v_pedido
  FROM public.pedido_venda pv
  LEFT JOIN public.natureza_operacao no ON no.nome = pv.natureza_operacao
  WHERE pv."pedido_venda_ID" = p_pedido_id
  AND pv.deleted_at IS NULL
  AND (
    v_is_backoffice 
    OR pv.vendedor_uuid = p_requesting_user_id
  );

  IF v_pedido IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado ou sem permissão de acesso';
  END IF;

  -- 4. BUSCAR PRODUTOS DO PEDIDO
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'id', pvp.pedido_venda_produtos_id::TEXT,
      'numero', pvp.numero,
      'produtoId', pvp.produto_id::TEXT,
      'descricaoProduto', pvp.descricao,
      'codigoSku', pvp.codigo_sku,
      'codigoEan', pvp.codigo_ean,
      'valorTabela', pvp.valor_tabela,
      'percentualDesconto', pvp.percentual_desconto,
      'valorUnitario', pvp.valor_unitario,
      'quantidade', pvp.quantidade,
      'subtotal', pvp.subtotal,
      'pesoBruto', pvp.peso_bruto,
      'pesoLiquido', pvp.peso_liquido,
      'unidade', pvp.unidade
    )
    ORDER BY pvp.numero
  )
  INTO v_produtos
  FROM public.pedido_venda_produtos pvp
  WHERE pvp.pedido_venda_id = p_pedido_id;

  -- 5. RETORNAR RESULTADO
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
$$;

COMMENT ON FUNCTION get_pedido_venda_v2 IS 
'Busca um pedido de venda por ID com seus produtos, verificando permissões';

-- ============================================================================
-- 3. FUNÇÃO: create_pedido_venda_v2
-- ============================================================================
-- Cria um novo pedido de venda com seus produtos
-- ============================================================================

CREATE OR REPLACE FUNCTION create_pedido_venda_v2(
  p_cliente_id BIGINT,
  p_vendedor_uuid UUID,
  p_natureza_operacao TEXT,
  p_numero_pedido TEXT DEFAULT NULL,
  p_empresa_faturamento_id BIGINT DEFAULT NULL,
  p_lista_preco_id BIGINT DEFAULT NULL,
  p_percentual_desconto_padrao NUMERIC DEFAULT 0,
  p_id_condicao BIGINT DEFAULT NULL,
  p_ordem_cliente TEXT DEFAULT NULL,
  p_observacao TEXT DEFAULT NULL,
  p_observacao_interna TEXT DEFAULT NULL,
  p_data_venda DATE DEFAULT CURRENT_DATE,
  p_status TEXT DEFAULT 'Rascunho',
  p_valor_total NUMERIC DEFAULT 0,
  p_valor_total_produtos NUMERIC DEFAULT 0,
  p_percentual_desconto_extra NUMERIC DEFAULT 0,
  p_valor_desconto_extra NUMERIC DEFAULT 0,
  p_total_quantidades NUMERIC DEFAULT 0,
  p_total_itens INTEGER DEFAULT 0,
  p_peso_bruto_total NUMERIC DEFAULT 0,
  p_peso_liquido_total NUMERIC DEFAULT 0,
  p_produtos JSONB DEFAULT '[]'::JSONB,
  p_created_by UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_pedido_id BIGINT;
  v_user_tipo TEXT;
  v_cliente_nome TEXT;
  v_vendedor_nome TEXT;
  v_natureza_id BIGINT;
  v_empresa_nome TEXT;
  v_lista_preco_nome TEXT;
  v_condicao_nome TEXT;
  v_produto JSONB;
  v_produto_item RECORD;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_id é obrigatório';
  END IF;

  IF p_vendedor_uuid IS NULL THEN
    RAISE EXCEPTION 'vendedor_uuid é obrigatório';
  END IF;

  IF p_natureza_operacao IS NULL OR TRIM(p_natureza_operacao) = '' THEN
    RAISE EXCEPTION 'natureza_operacao é obrigatória';
  END IF;

  -- 2. VERIFICAR PERMISSÕES
  IF p_created_by IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_created_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    -- Vendedor só pode criar pedidos para si mesmo
    IF v_user_tipo = 'vendedor' AND p_vendedor_uuid != p_created_by THEN
      RAISE EXCEPTION 'Vendedores só podem criar pedidos para si mesmos';
    END IF;
  END IF;

  -- 3. VERIFICAR SE CLIENTE EXISTE
  SELECT c.nome INTO v_cliente_nome
  FROM public.cliente c
  WHERE c.cliente_id = p_cliente_id
  AND c.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente não encontrado';
  END IF;

  -- 4. VERIFICAR SE VENDEDOR EXISTE
  SELECT COALESCE(dv.nome, u.nome, u.email, 'Vendedor') INTO v_vendedor_nome
  FROM public.user u
  LEFT JOIN public.dados_vendedor dv ON dv.user_id = u.user_id AND dv.deleted_at IS NULL
  WHERE u.user_id = p_vendedor_uuid
  AND u.ativo = TRUE
  AND u.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vendedor não encontrado ou inativo';
  END IF;

  -- 5. VERIFICAR SE NATUREZA EXISTE
  SELECT no.id INTO v_natureza_id
  FROM public.natureza_operacao no
  WHERE no.nome = p_natureza_operacao
  AND no.deleted_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Natureza de operação não encontrada';
  END IF;

  -- 6. BUSCAR NOMES DE EMPRESA, LISTA DE PREÇO E CONDIÇÃO (se fornecidos)
  IF p_empresa_faturamento_id IS NOT NULL THEN
    SELECT e.razao_social INTO v_empresa_nome
    FROM public.empresa e
    WHERE e.empresa_id = p_empresa_faturamento_id
    AND e.deleted_at IS NULL;
  END IF;

  IF p_lista_preco_id IS NOT NULL THEN
    SELECT lp.nome INTO v_lista_preco_nome
    FROM public.lista_preco lp
    WHERE lp.lista_preco_id = p_lista_preco_id
    AND lp.deleted_at IS NULL;
  END IF;

  IF p_id_condicao IS NOT NULL THEN
    SELECT cp.nome INTO v_condicao_nome
    FROM public.condicao_pagamento cp
    WHERE cp.id_condicao = p_id_condicao
    AND cp.deleted_at IS NULL;
  END IF;

  -- 7. INSERIR PEDIDO
  INSERT INTO public.pedido_venda (
    cliente_id,
    vendedor_uuid,
    numero_pedido,
    natureza_operacao,
    empresa_faturamento_id,
    nome_empresa_faturamento,
    lista_preco_id,
    nome_lista_preco,
    percentual_desconto_padrao,
    id_condicao,
    nome_condicao_pagamento,
    ordem_cliente,
    observacao,
    observacao_interna,
    data_venda,
    status,
    valor_total,
    valor_total_produtos,
    percentual_desconto_extra,
    valor_desconto_extra,
    total_quantidades,
    total_itens,
    peso_bruto_total,
    peso_liquido_total,
    nome_cliente,
    nome_vendedor,
    nome_natureza_operacao,
    timestamp,
    created_by
  ) VALUES (
    p_cliente_id,
    p_vendedor_uuid,
    p_numero_pedido,
    p_natureza_operacao,
    p_empresa_faturamento_id,
    v_empresa_nome,
    p_lista_preco_id,
    v_lista_preco_nome,
    p_percentual_desconto_padrao,
    p_id_condicao,
    v_condicao_nome,
    p_ordem_cliente,
    p_observacao,
    p_observacao_interna,
    p_data_venda,
    p_status,
    p_valor_total,
    p_valor_total_produtos,
    p_percentual_desconto_extra,
    p_valor_desconto_extra,
    p_total_quantidades,
    p_total_itens,
    p_peso_bruto_total,
    p_peso_liquido_total,
    v_cliente_nome,
    v_vendedor_nome,
    p_natureza_operacao,
    NOW(),
    p_created_by
  )
  RETURNING "pedido_venda_ID" INTO v_pedido_id;

  -- 8. INSERIR PRODUTOS
  IF p_produtos IS NOT NULL AND jsonb_array_length(p_produtos) > 0 THEN
    FOR v_produto IN SELECT * FROM jsonb_array_elements(p_produtos)
    LOOP
      INSERT INTO public.pedido_venda_produtos (
        pedido_venda_id,
        produto_id,
        numero,
        descricao,
        codigo_sku,
        codigo_ean,
        valor_tabela,
        percentual_desconto,
        valor_unitario,
        quantidade,
        subtotal,
        peso_bruto,
        peso_liquido,
        unidade
      ) VALUES (
        v_pedido_id,
        (v_produto->>'produtoId')::BIGINT,
        COALESCE((v_produto->>'numero')::INTEGER, 1),
        v_produto->>'descricaoProduto',
        v_produto->>'codigoSku',
        v_produto->>'codigoEan',
        COALESCE((v_produto->>'valorTabela')::NUMERIC, 0),
        COALESCE((v_produto->>'percentualDesconto')::NUMERIC, 0),
        COALESCE((v_produto->>'valorUnitario')::NUMERIC, 0),
        COALESCE((v_produto->>'quantidade')::NUMERIC, 0),
        COALESCE((v_produto->>'subtotal')::NUMERIC, 0),
        COALESCE((v_produto->>'pesoBruto')::NUMERIC, 0),
        COALESCE((v_produto->>'pesoLiquido')::NUMERIC, 0),
        v_produto->>'unidade'
      );
    END LOOP;
  END IF;

  -- 9. RETORNAR PEDIDO CRIADO
  RETURN get_pedido_venda_v2(v_pedido_id, p_created_by);

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_pedido_venda_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION create_pedido_venda_v2 IS 
'Cria um novo pedido de venda com seus produtos, validando permissões e dependências';

-- ============================================================================
-- 4. FUNÇÃO: update_pedido_venda_v2
-- ============================================================================
-- Atualiza um pedido de venda existente e seus produtos
-- ============================================================================

CREATE OR REPLACE FUNCTION update_pedido_venda_v2(
  p_pedido_id BIGINT,
  p_cliente_id BIGINT DEFAULT NULL,
  p_vendedor_uuid UUID DEFAULT NULL,
  p_numero_pedido TEXT DEFAULT NULL,
  p_natureza_operacao TEXT DEFAULT NULL,
  p_empresa_faturamento_id BIGINT DEFAULT NULL,
  p_lista_preco_id BIGINT DEFAULT NULL,
  p_percentual_desconto_padrao NUMERIC DEFAULT NULL,
  p_id_condicao BIGINT DEFAULT NULL,
  p_ordem_cliente TEXT DEFAULT NULL,
  p_observacao TEXT DEFAULT NULL,
  p_observacao_interna TEXT DEFAULT NULL,
  p_data_venda DATE DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_valor_total NUMERIC DEFAULT NULL,
  p_valor_total_produtos NUMERIC DEFAULT NULL,
  p_percentual_desconto_extra NUMERIC DEFAULT NULL,
  p_valor_desconto_extra NUMERIC DEFAULT NULL,
  p_total_quantidades NUMERIC DEFAULT NULL,
  p_total_itens INTEGER DEFAULT NULL,
  p_peso_bruto_total NUMERIC DEFAULT NULL,
  p_peso_liquido_total NUMERIC DEFAULT NULL,
  p_produtos JSONB DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_user_tipo TEXT;
  v_is_backoffice BOOLEAN;
  v_pedido_owner UUID;
  v_cliente_nome TEXT;
  v_vendedor_nome TEXT;
  v_natureza_id BIGINT;
  v_empresa_nome TEXT;
  v_lista_preco_nome TEXT;
  v_condicao_nome TEXT;
  v_produto JSONB;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_pedido_id IS NULL THEN
    RAISE EXCEPTION 'pedido_id é obrigatório';
  END IF;

  -- 2. VERIFICAR SE PEDIDO EXISTE
  SELECT pv.vendedor_uuid INTO v_pedido_owner
  FROM public.pedido_venda pv
  WHERE pv."pedido_venda_ID" = p_pedido_id
  AND pv.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  -- 3. VERIFICAR PERMISSÕES
  IF p_updated_by IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_updated_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    v_is_backoffice := (v_user_tipo = 'backoffice');

    -- Vendedor só pode editar próprios pedidos
    IF NOT v_is_backoffice AND v_pedido_owner != p_updated_by THEN
      RAISE EXCEPTION 'Você não tem permissão para editar este pedido';
    END IF;

    -- Se está alterando vendedor, validar
    IF p_vendedor_uuid IS NOT NULL AND p_vendedor_uuid != v_pedido_owner THEN
      IF NOT v_is_backoffice THEN
        RAISE EXCEPTION 'Vendedores não podem alterar o vendedor do pedido';
      END IF;
    END IF;
  ELSE
    v_is_backoffice := FALSE;
  END IF;

  -- 4. ATUALIZAR NOMES SE IDs FORAM ALTERADOS
  IF p_cliente_id IS NOT NULL THEN
    SELECT c.nome INTO v_cliente_nome
    FROM public.cliente c
    WHERE c.cliente_id = p_cliente_id
    AND c.deleted_at IS NULL;
  END IF;

  IF p_vendedor_uuid IS NOT NULL THEN
    SELECT COALESCE(dv.nome, u.nome, u.email, 'Vendedor') INTO v_vendedor_nome
    FROM public.user u
    LEFT JOIN public.dados_vendedor dv ON dv.user_id = u.user_id AND dv.deleted_at IS NULL
    WHERE u.user_id = p_vendedor_uuid
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;
  END IF;

  IF p_natureza_operacao IS NOT NULL THEN
    SELECT no.id INTO v_natureza_id
    FROM public.natureza_operacao no
    WHERE no.nome = p_natureza_operacao
    AND no.deleted_at IS NULL
    LIMIT 1;
  END IF;

  IF p_empresa_faturamento_id IS NOT NULL THEN
    SELECT e.razao_social INTO v_empresa_nome
    FROM public.empresa e
    WHERE e.empresa_id = p_empresa_faturamento_id
    AND e.deleted_at IS NULL;
  END IF;

  IF p_lista_preco_id IS NOT NULL THEN
    SELECT lp.nome INTO v_lista_preco_nome
    FROM public.lista_preco lp
    WHERE lp.lista_preco_id = p_lista_preco_id
    AND lp.deleted_at IS NULL;
  END IF;

  IF p_id_condicao IS NOT NULL THEN
    SELECT cp.nome INTO v_condicao_nome
    FROM public.condicao_pagamento cp
    WHERE cp.id_condicao = p_id_condicao
    AND cp.deleted_at IS NULL;
  END IF;

  -- 5. ATUALIZAR PEDIDO
  UPDATE public.pedido_venda pv
  SET
    cliente_id = COALESCE(p_cliente_id, pv.cliente_id),
    vendedor_uuid = COALESCE(p_vendedor_uuid, pv.vendedor_uuid),
    numero_pedido = COALESCE(NULLIF(TRIM(p_numero_pedido), ''), pv.numero_pedido),
    natureza_operacao = COALESCE(NULLIF(TRIM(p_natureza_operacao), ''), pv.natureza_operacao),
    empresa_faturamento_id = COALESCE(p_empresa_faturamento_id, pv.empresa_faturamento_id),
    nome_empresa_faturamento = COALESCE(v_empresa_nome, pv.nome_empresa_faturamento),
    lista_preco_id = COALESCE(p_lista_preco_id, pv.lista_preco_id),
    nome_lista_preco = COALESCE(v_lista_preco_nome, pv.nome_lista_preco),
    percentual_desconto_padrao = COALESCE(p_percentual_desconto_padrao, pv.percentual_desconto_padrao),
    id_condicao = COALESCE(p_id_condicao, pv.id_condicao),
    nome_condicao_pagamento = COALESCE(v_condicao_nome, pv.nome_condicao_pagamento),
    ordem_cliente = COALESCE(NULLIF(TRIM(p_ordem_cliente), ''), pv.ordem_cliente),
    observacao = COALESCE(NULLIF(TRIM(p_observacao), ''), pv.observacao),
    observacao_interna = COALESCE(NULLIF(TRIM(p_observacao_interna), ''), pv.observacao_interna),
    data_venda = COALESCE(p_data_venda, pv.data_venda),
    status = COALESCE(NULLIF(TRIM(p_status), ''), pv.status),
    valor_total = COALESCE(p_valor_total, pv.valor_total),
    valor_total_produtos = COALESCE(p_valor_total_produtos, pv.valor_total_produtos),
    percentual_desconto_extra = COALESCE(p_percentual_desconto_extra, pv.percentual_desconto_extra),
    valor_desconto_extra = COALESCE(p_valor_desconto_extra, pv.valor_desconto_extra),
    total_quantidades = COALESCE(p_total_quantidades, pv.total_quantidades),
    total_itens = COALESCE(p_total_itens, pv.total_itens),
    peso_bruto_total = COALESCE(p_peso_bruto_total, pv.peso_bruto_total),
    peso_liquido_total = COALESCE(p_peso_liquido_total, pv.peso_liquido_total),
    nome_cliente = COALESCE(v_cliente_nome, pv.nome_cliente),
    nome_vendedor = COALESCE(v_vendedor_nome, pv.nome_vendedor),
    nome_natureza_operacao = COALESCE(NULLIF(TRIM(p_natureza_operacao), ''), pv.nome_natureza_operacao),
    updated_at = NOW()
  WHERE pv."pedido_venda_ID" = p_pedido_id;

  -- 6. ATUALIZAR PRODUTOS (se fornecidos)
  IF p_produtos IS NOT NULL THEN
    -- Deletar produtos existentes
    DELETE FROM public.pedido_venda_produtos pvp
    WHERE pvp.pedido_venda_id = p_pedido_id;

    -- Inserir novos produtos
    IF jsonb_array_length(p_produtos) > 0 THEN
      FOR v_produto IN SELECT * FROM jsonb_array_elements(p_produtos)
      LOOP
        INSERT INTO public.pedido_venda_produtos (
          pedido_venda_id,
          produto_id,
          numero,
          descricao,
          codigo_sku,
          codigo_ean,
          valor_tabela,
          percentual_desconto,
          valor_unitario,
          quantidade,
          subtotal,
          peso_bruto,
          peso_liquido,
          unidade
        ) VALUES (
          p_pedido_id,
          (v_produto->>'produtoId')::BIGINT,
          COALESCE((v_produto->>'numero')::INTEGER, 1),
          v_produto->>'descricaoProduto',
          v_produto->>'codigoSku',
          v_produto->>'codigoEan',
          COALESCE((v_produto->>'valorTabela')::NUMERIC, 0),
          COALESCE((v_produto->>'percentualDesconto')::NUMERIC, 0),
          COALESCE((v_produto->>'valorUnitario')::NUMERIC, 0),
          COALESCE((v_produto->>'quantidade')::NUMERIC, 0),
          COALESCE((v_produto->>'subtotal')::NUMERIC, 0),
          COALESCE((v_produto->>'pesoBruto')::NUMERIC, 0),
          COALESCE((v_produto->>'pesoLiquido')::NUMERIC, 0),
          v_produto->>'unidade'
        );
      END LOOP;
    END IF;
  END IF;

  -- 7. RETORNAR PEDIDO ATUALIZADO
  RETURN get_pedido_venda_v2(p_pedido_id, p_updated_by);

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_pedido_venda_v2 for pedido %: %', p_pedido_id, SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION update_pedido_venda_v2 IS 
'Atualiza um pedido de venda existente e seus produtos, validando permissões';

-- ============================================================================
-- 5. FUNÇÃO: delete_pedido_venda_v2
-- ============================================================================
-- Exclui um pedido de venda (soft delete)
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_pedido_venda_v2(
  p_pedido_id BIGINT,
  p_deleted_by UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_user_tipo TEXT;
  v_is_backoffice BOOLEAN;
  v_pedido_owner UUID;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_pedido_id IS NULL THEN
    RAISE EXCEPTION 'pedido_id é obrigatório';
  END IF;

  -- 2. VERIFICAR SE PEDIDO EXISTE
  SELECT pv.vendedor_uuid INTO v_pedido_owner
  FROM public.pedido_venda pv
  WHERE pv."pedido_venda_ID" = p_pedido_id
  AND pv.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  -- 3. VERIFICAR PERMISSÕES
  IF p_deleted_by IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_deleted_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    v_is_backoffice := (v_user_tipo = 'backoffice');

    -- Vendedor só pode excluir próprios pedidos
    IF NOT v_is_backoffice AND v_pedido_owner != p_deleted_by THEN
      RAISE EXCEPTION 'Você não tem permissão para excluir este pedido';
    END IF;
  END IF;

  -- 4. SOFT DELETE
  UPDATE public.pedido_venda pv
  SET
    deleted_at = NOW(),
    updated_at = NOW()
  WHERE pv."pedido_venda_ID" = p_pedido_id;

  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in delete_pedido_venda_v2 for pedido %: %', p_pedido_id, SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION delete_pedido_venda_v2 IS 
'Exclui um pedido de venda (soft delete) com validação de permissões';

-- ============================================================================
-- PERMISSÕES
-- ============================================================================

GRANT EXECUTE ON FUNCTION list_pedido_venda_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION get_pedido_venda_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION create_pedido_venda_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION update_pedido_venda_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION delete_pedido_venda_v2 TO authenticated;

REVOKE EXECUTE ON FUNCTION list_pedido_venda_v2 FROM anon;
REVOKE EXECUTE ON FUNCTION get_pedido_venda_v2 FROM anon;
REVOKE EXECUTE ON FUNCTION create_pedido_venda_v2 FROM anon;
REVOKE EXECUTE ON FUNCTION update_pedido_venda_v2 FROM anon;
REVOKE EXECUTE ON FUNCTION delete_pedido_venda_v2 FROM anon;
