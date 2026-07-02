-- Migration 143: generate_vendedor_comissao pula pedidos soft-deletados.
-- BUG: pedidos excluídos (deleted_at) ainda podiam gerar/entrar na comissão.
-- FIX: carrega deleted_at e retorna 'pedido_deletado_sem_comissao' sem gerar,
-- no mesmo padrão do skip de Bonificação. Fonte única da geração de comissão.

CREATE OR REPLACE FUNCTION public.generate_vendedor_comissao(p_pedido_id bigint, p_data_faturamento date DEFAULT NULL::date)
 RETURNS TABLE(ret_vendedor_comissao_id bigint, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  declare
    v_pedido record;
    v_tipo_comissao bigint;
    v_aliquota_fixa numeric;
    v_lista_preco_id bigint;
    v_desconto_cliente numeric := 0;
    v_percentual numeric := 0;
    v_valor_comissao numeric := 0;
    v_existente_id bigint;
    v_data_ref date;
    v_periodo text;
  begin
    -- 1) Carrega pedido (+ ordem_cliente e nome_cliente para o relatório)
    select pv."pedido_venda_ID"      as pedido_id,
           pv.vendedor_uuid,
           pv.cliente_id,
           coalesce(pv.valor_total,0) as valor_total,
           coalesce(pv.data_venda::date, current_date) as data_venda,
           pv.natureza_operacao,
           pv.ordem_cliente          as oc_cliente,
           pv.nome_cliente           as nome_cliente,
           pv.deleted_at             as deleted_at
    into v_pedido
    from public.pedido_venda pv
    where pv."pedido_venda_ID" = p_pedido_id;

    if not found then
      raise exception 'Pedido % não encontrado.', p_pedido_id using errcode='P0002';
    end if;

    -- Pedido excluído (soft delete) NÃO gera comissão (fix: comissão de pedidos excluídos).
    if v_pedido.deleted_at is not null then
      return query select null::bigint, 'pedido_deletado_sem_comissao';
      return;
    end if;

    if v_pedido.vendedor_uuid is null then
      raise exception 'Pedido % sem vendedor_uuid.', p_pedido_id;
    end if;

    -- Data de referência: usar data de faturamento se fornecida, senão data atual
    v_data_ref := coalesce(p_data_faturamento, current_date);
    v_periodo := to_char(v_data_ref, 'YYYY-MM');

    -- 1.1) Regra: pedidos de Bonificação NÃO geram comissão
    if v_pedido.natureza_operacao = 'Bonificação' then
      return query select null::bigint, 'bonificacao_sem_comissao';
      return;
    end if;

    -- 2) Tipo de comissão do vendedor
    select dv."Comissão", dv.aliquotafixa
    into v_tipo_comissao, v_aliquota_fixa
    from public.dados_vendedor dv
    where dv.user_id = v_pedido.vendedor_uuid;

    if not found then
      raise exception 'Vendedor % não encontrado em dados_vendedor.', v_pedido.vendedor_uuid;
    end if;

    if v_tipo_comissao = 2 then
      v_percentual := coalesce(v_aliquota_fixa, 0);

    elsif v_tipo_comissao = 1 then
      select c.lista_de_preco::bigint,
             coalesce(c.desconto, 0)
      into v_lista_preco_id, v_desconto_cliente
      from public.cliente c
      where c.cliente_id = v_pedido.cliente_id;

      if not found then
        raise exception 'Cliente % não encontrado.', v_pedido.cliente_id;
      end if;

      select lpc.comissao
      into v_percentual
      from public.listas_preco_comissionamento lpc
      where lpc.lista_preco_id = v_lista_preco_id
        and v_desconto_cliente between lpc.desconto_minimo and lpc.desconto_maximo
      order by lpc.desconto_minimo asc, lpc.id asc
      limit 1;

      if v_percentual is null then
        v_percentual := 0;
      end if;

    else
      raise exception 'Tipo de comissão inválido (dados_vendedor."Comissão" = %). Esperado 1 ou 2.',
  v_tipo_comissao;
    end if;

    -- 4) Calcula valor
    v_valor_comissao := round((v_pedido.valor_total::numeric * v_percentual / 100), 2);

    -- 5) Verifica se já existe e ATUALIZA ou INSERE
    select vc.vendedor_comissao_id
    into v_existente_id
    from public."vendedor_comissão" as vc
    where vc.pedido_id = v_pedido.pedido_id
    limit 1;

    if v_existente_id is not null then
      update public."vendedor_comissão"
      set valor_total = v_pedido.valor_total,
          valor_comissao = v_valor_comissao,
          percentual_comissao = v_percentual,
          periodo = v_periodo,
          cliente_id = v_pedido.cliente_id,
          oc_cliente = v_pedido.oc_cliente,
          cliente_nome = v_pedido.nome_cliente,
          editado_em = now()
      where vendedor_comissao_id = v_existente_id;

      return query select v_existente_id::bigint, 'updated';
    else
      insert into public."vendedor_comissão"(
        vendedor_uuid,
        data_inicio,
        data_final,
        valor_total,
        valor_comissao,
        efetivada,
        pedido_id,
        debito,
        percentual_comissao,
        periodo,
        cliente_id,
        oc_cliente,
        cliente_nome
      ) values (
        v_pedido.vendedor_uuid,
        v_data_ref,
        v_data_ref,
        v_pedido.valor_total,
        v_valor_comissao,
        true,
        v_pedido.pedido_id,
        false,
        v_percentual,
        v_periodo,
        v_pedido.cliente_id,
        v_pedido.oc_cliente,
        v_pedido.nome_cliente
      )
      returning vendedor_comissao_id into v_existente_id;

      return query select v_existente_id::bigint, 'created';
    end if;
  end;
  $function$
