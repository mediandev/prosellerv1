CREATE OR REPLACE FUNCTION public.create_pedido_venda_v2(p_cliente_id bigint, p_vendedor_uuid uuid, p_natureza_operacao text, p_numero_pedido text DEFAULT NULL::text, p_empresa_faturamento_id bigint DEFAULT NULL::bigint, p_lista_preco_id bigint DEFAULT NULL::bigint, p_percentual_desconto_padrao numeric DEFAULT 0, p_id_condicao bigint DEFAULT NULL::bigint, p_ordem_cliente text DEFAULT NULL::text, p_observacao text DEFAULT NULL::text, p_observacao_interna text DEFAULT NULL::text, p_data_venda date DEFAULT NULL::date, p_status text DEFAULT 'Rascunho'::text, p_valor_total numeric DEFAULT 0, p_valor_total_produtos numeric DEFAULT 0, p_percentual_desconto_extra numeric DEFAULT 0, p_valor_desconto_extra numeric DEFAULT 0, p_total_quantidades numeric DEFAULT 0, p_total_itens integer DEFAULT 0, p_peso_bruto_total numeric DEFAULT 0, p_peso_liquido_total numeric DEFAULT 0, p_produtos jsonb DEFAULT NULL::jsonb, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$DECLARE
  v_pedido_id BIGINT;
  v_cliente_nome TEXT;
  v_cliente_cnpj TEXT;
  v_cliente_inscricao_estadual TEXT;
  v_vendedor_nome TEXT;
  v_natureza_operacao_nome TEXT;
  v_empresa_faturamento_nome TEXT;
  v_lista_preco_nome TEXT;
  v_condicao_pagamento_nome TEXT;
  v_produto JSONB;
  v_numero_item INTEGER;
BEGIN
  -- Validações básicas
  IF p_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_id é obrigatório';
  END IF;

  IF p_vendedor_uuid IS NULL THEN
    RAISE EXCEPTION 'vendedor_uuid é obrigatório';
  END IF;

  IF p_natureza_operacao IS NULL OR TRIM(p_natureza_operacao) = '' THEN
    RAISE EXCEPTION 'natureza_operacao é obrigatória';
  END IF;

  -- Verificar se cliente existe
  SELECT c.nome, c.cpf_cnpj, c.inscricao_estadual
  INTO v_cliente_nome, v_cliente_cnpj, v_cliente_inscricao_estadual
  FROM public.cliente c
  WHERE c.cliente_id = p_cliente_id
    AND c.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente não encontrado';
  END IF;

  -- Verificar se vendedor existe
  SELECT COALESCE(dv.nome, u.nome, u.email, 'Vendedor não identificado')
  INTO v_vendedor_nome
  FROM public.user u
  LEFT JOIN public.dados_vendedor dv ON dv.user_id = u.user_id AND dv.deleted_at IS NULL
  WHERE u.user_id = p_vendedor_uuid
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vendedor não encontrado ou inativo';
  END IF;

  -- Verificar se natureza de operação existe
  SELECT no.nome INTO v_natureza_operacao_nome
  FROM public.natureza_operacao no
  WHERE no.nome = p_natureza_operacao
    AND no.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Natureza de operação não encontrada';
  END IF;

  -- Buscar nome da empresa de faturamento (se fornecida)
  IF p_empresa_faturamento_id IS NOT NULL THEN
    SELECT COALESCE(emp.razao_social, emp.nome_fantasia)
    INTO v_empresa_faturamento_nome
    FROM public.ref_empresas_subsidiarias emp
    WHERE emp.id = p_empresa_faturamento_id
      AND emp.deleted_at IS NULL;
  END IF;

  -- Buscar nome da lista de preço (se fornecida)
  IF p_lista_preco_id IS NOT NULL THEN
    SELECT lp.nome INTO v_lista_preco_nome
    FROM public.listas_preco lp
    WHERE lp.id = p_lista_preco_id;
  END IF;

  -- Buscar nome da condição de pagamento (se fornecida)
  IF p_id_condicao IS NOT NULL THEN
    SELECT cp."Descrição" INTO v_condicao_pagamento_nome
    FROM public."Condicao_De_Pagamento" cp
    WHERE cp."Condição_ID" = p_id_condicao;
  END IF;

  -- Inserir pedido
  INSERT INTO public.pedido_venda (
    cliente_id,
    vendedor_uuid,
    natureza_operacao,
    numero_pedido,
    empresa_faturamento_id,
    lista_preco_id,
    percentual_desconto_padrao,
    id_condicao,
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
    cnpj_cliente,
    inscricao_estadual_cliente,
    nome_vendedor,
    nome_natureza_operacao,
    nome_empresa_faturamento,
    empresa_faturou,
    nome_lista_preco,
    nome_condicao_pagamento,
    timestamp,
    created_by
  ) VALUES (
    p_cliente_id,
    p_vendedor_uuid,
    p_natureza_operacao,
    p_numero_pedido,
    p_empresa_faturamento_id,
    p_lista_preco_id,
    p_percentual_desconto_padrao,
    p_id_condicao,
    p_ordem_cliente,
    p_observacao,
    p_observacao_interna,
    COALESCE(p_data_venda, CURRENT_DATE),
    COALESCE(p_status, 'Rascunho'),
    p_valor_total,
    p_valor_total_produtos,
    p_percentual_desconto_extra,
    p_valor_desconto_extra,
    p_total_quantidades,
    p_total_itens,
    p_peso_bruto_total,
    p_peso_liquido_total,
    v_cliente_nome,
    v_cliente_cnpj,
    v_cliente_inscricao_estadual,
    v_vendedor_nome,
    v_natureza_operacao_nome,
    v_empresa_faturamento_nome,
    v_empresa_faturamento_nome,
    v_lista_preco_nome,
    v_condicao_pagamento_nome,
    NOW(),
    p_created_by
  )
  RETURNING "pedido_venda_ID" INTO v_pedido_id;

  -- Inserir produtos (se fornecidos)
  IF p_produtos IS NOT NULL AND jsonb_array_length(p_produtos) > 0 THEN
    v_numero_item := 1;
    FOR v_produto IN SELECT * FROM jsonb_array_elements(p_produtos)
    LOOP
      INSERT INTO public.pedido_venda_produtos (
        pedido_venda_id,
        numero,
        produto_id,
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
        v_numero_item,
        (v_produto->>'produtoId')::BIGINT,
        v_produto->>'descricaoProduto',
        v_produto->>'codigoSku',
        NULLIF(v_produto->>'codigoEan', ''),
        COALESCE((v_produto->>'valorTabela')::NUMERIC, 0),
        COALESCE((v_produto->>'percentualDesconto')::NUMERIC, 0),
        COALESCE((v_produto->>'valorUnitario')::NUMERIC, 0),
        COALESCE((v_produto->>'quantidade')::NUMERIC, 0),
        COALESCE((v_produto->>'subtotal')::NUMERIC, 0),
        COALESCE((v_produto->>'pesoBruto')::NUMERIC, 0),
        COALESCE((v_produto->>'pesoLiquido')::NUMERIC, 0),
        v_produto->>'unidade'
      );
      v_numero_item := v_numero_item + 1;
    END LOOP;
  END IF;

  -- Retornar pedido criado
  RETURN (
    SELECT JSON_BUILD_OBJECT(
      'pedido', (
        SELECT JSON_BUILD_OBJECT(
          'id', pv."pedido_venda_ID"::TEXT,
          'numero', pv.numero_pedido,
          'clienteId', pv.cliente_id::TEXT,
          'nomeCliente', pv.nome_cliente,
          'vendedorId', pv.vendedor_uuid::TEXT,
          'nomeVendedor', pv.nome_vendedor,
          'naturezaOperacao', pv.natureza_operacao,
          'valorPedido', pv.valor_total,
          'status', pv.status,
          'dataPedido', pv.data_venda,
          'createdAt', pv.timestamp
        )
        FROM public.pedido_venda pv
        WHERE pv."pedido_venda_ID" = v_pedido_id
      )
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_pedido_venda_v2: %', SQLERRM;
    RAISE;
END;$function$
