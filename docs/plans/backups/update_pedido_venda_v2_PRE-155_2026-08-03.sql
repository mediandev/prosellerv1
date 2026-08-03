CREATE OR REPLACE FUNCTION public.update_pedido_venda_v2(p_pedido_id bigint, p_cliente_id bigint DEFAULT NULL::bigint, p_vendedor_uuid uuid DEFAULT NULL::uuid, p_numero_pedido text DEFAULT NULL::text, p_natureza_operacao text DEFAULT NULL::text, p_empresa_faturamento_id bigint DEFAULT NULL::bigint, p_lista_preco_id bigint DEFAULT NULL::bigint, p_percentual_desconto_padrao numeric DEFAULT NULL::numeric, p_id_condicao bigint DEFAULT NULL::bigint, p_ordem_cliente text DEFAULT NULL::text, p_observacao text DEFAULT NULL::text, p_observacao_interna text DEFAULT NULL::text, p_data_venda date DEFAULT NULL::date, p_status text DEFAULT NULL::text, p_valor_total numeric DEFAULT NULL::numeric, p_valor_total_produtos numeric DEFAULT NULL::numeric, p_percentual_desconto_extra numeric DEFAULT NULL::numeric, p_valor_desconto_extra numeric DEFAULT NULL::numeric, p_total_quantidades numeric DEFAULT NULL::numeric, p_total_itens integer DEFAULT NULL::integer, p_peso_bruto_total numeric DEFAULT NULL::numeric, p_peso_liquido_total numeric DEFAULT NULL::numeric, p_produtos jsonb DEFAULT NULL::jsonb, p_updated_by uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$                                                                                                                                                                                                     
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
    IF p_pedido_id IS NULL THEN                                                                                                                                                                             
      RAISE EXCEPTION 'pedido_id é obrigatório';               
    END IF;                               

    SELECT pv.vendedor_uuid INTO v_pedido_owner                                                                                                                                                             
    FROM public.pedido_venda pv           
    WHERE pv."pedido_venda_ID" = p_pedido_id                                                                                                                                                                
    AND pv.deleted_at IS NULL;                                                                                                                                                                              
                                          
    IF NOT FOUND THEN                                                                                                                                                                                       
      RAISE EXCEPTION 'Pedido não encontrado';                                                                                                                                                              
    END IF;
                                                                                                                                                                                                            
    IF p_updated_by IS NOT NULL THEN                           
      SELECT u.tipo INTO v_user_tipo      
      FROM public."user" u
      WHERE u.user_id = p_updated_by                                                                                                                                                                        
      AND u.ativo = TRUE                      
      AND u.deleted_at IS NULL;                                                                                                                                                                             
                                                               
      IF NOT FOUND THEN                                                                                                                                                                                     
        RAISE EXCEPTION 'Usuário não encontrado ou inativo';
      END IF;                                                                                                                                                                                               
                                                               
      v_is_backoffice := (v_user_tipo = 'backoffice');
                                                                                                                                                                                                            
      IF NOT v_is_backoffice AND v_pedido_owner != p_updated_by THEN
        RAISE EXCEPTION 'Você não tem permissão para editar este pedido';                                                                                                                                   
      END IF;                                                  
                                                                                                                                                                                                            
      IF p_vendedor_uuid IS NOT NULL AND p_vendedor_uuid != v_pedido_owner THEN
        IF NOT v_is_backoffice THEN                                                                                                                                                                         
          RAISE EXCEPTION 'Vendedores não podem alterar o vendedor do pedido';
        END IF;                                                                                                                                                                                             
      END IF;                                                  
    ELSE                                                                                                                                                                                                    
      v_is_backoffice := FALSE;                                                                                                                                                                             
    END IF;
                                                                                                                                                                                                            
    IF p_cliente_id IS NOT NULL THEN                           
      SELECT c.nome INTO v_cliente_nome   
      FROM public.cliente c
      WHERE c.cliente_id = p_cliente_id                                                                                                                                                                     
      AND c.deleted_at IS NULL;
    END IF;                                                                                                                                                                                                 
                                                               
    IF p_vendedor_uuid IS NOT NULL THEN
      SELECT COALESCE(dv.nome, u.nome, u.email, 'Vendedor') INTO v_vendedor_nome                                                                                                                            
      FROM public."user" u                    
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
      FROM public.ref_empresas_subsidiarias e
      WHERE e.id = p_empresa_faturamento_id                                                                                                                                                                 
      AND e.deleted_at IS NULL;
    END IF;                                                                                                                                                                                                 
                                                               
    IF p_lista_preco_id IS NOT NULL THEN
      SELECT lp.nome INTO v_lista_preco_nome                                                                                                                                                                
      FROM public.listas_preco lp
      WHERE lp.id = p_lista_preco_id;                                                                                                                                                                       
    END IF;                                                    
                                          
    IF p_id_condicao IS NOT NULL THEN
      SELECT cp."Descrição" INTO v_condicao_nome                                                                                                                                                            
      FROM public."Condicao_De_Pagamento" cp
      WHERE cp."Condição_ID" = p_id_condicao;                                                                                                                                                               
    END IF;                                                    

    UPDATE public.pedido_venda pv                                                                                                                                                                           
    SET
      cliente_id = COALESCE(p_cliente_id, pv.cliente_id),                                                                                                                                                   
      vendedor_uuid = COALESCE(p_vendedor_uuid, pv.vendedor_uuid),
      numero_pedido = COALESCE(NULLIF(TRIM(p_numero_pedido), ''), pv.numero_pedido),
      natureza_operacao = COALESCE(NULLIF(TRIM(p_natureza_operacao), ''), pv.natureza_operacao),
      natureza_id = COALESCE(v_natureza_id, pv.natureza_id),                                                                                                                                                
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
                                                               
    IF p_produtos IS NOT NULL THEN                                                                                                                                                                          
      DELETE FROM public.pedido_venda_produtos pvp             
      WHERE pvp.pedido_venda_id = p_pedido_id;                                                                                                                                                              
                                                               
      IF jsonb_array_length(p_produtos) > 0 THEN                                                                                                                                                            
        FOR v_produto IN SELECT * FROM jsonb_array_elements(p_produtos)
        LOOP                                  
          INSERT INTO public.pedido_venda_produtos (                                                                                                                                                        
            pedido_venda_id, produto_id, numero, descricao, codigo_sku, codigo_ean,
            valor_tabela, percentual_desconto, valor_unitario, quantidade, subtotal,                                                                                                                        
            peso_bruto, peso_liquido, unidade                  
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
                                                                                                                                                                                                            
    RETURN get_pedido_venda_v2(p_pedido_id, p_updated_by);     
                                          
  EXCEPTION
    WHEN OTHERS THEN                                                                                                                                                                                        
      RAISE LOG 'Error in update_pedido_venda_v2 for pedido %: %', p_pedido_id, SQLERRM;
      RAISE;                                                                                                                                                                                                
  END;                                                         
  $function$
