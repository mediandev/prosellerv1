-- Invariantes das migrations 145 e 147 — dinheiro na conta corrente.
--
-- Duas correções de julho que ficaram sem rede até agora.
--
--   145: pagamento ACIMA do valor do compromisso deixou de ser bloqueado. Antes
--        a função recusava com exceção; o cliente decidiu que o sistema deve
--        aceitar, avisando o excedente na tela. **As outras 8 validações
--        continuam valendo** — este caso fixa isso, porque "remover um bloqueio"
--        é o tipo de mudança que derruba os vizinhos sem ninguém ver.
--
--   147: excluir pedido estorna a comissão. Período ABERTO: apaga a comissão.
--        Período FECHADO: mantém a comissão e lança um DÉBITO rastreável, porque
--        mexer em período fechado bagunçaria o que já foi pago.

DO $$
DECLARE
  v_user     uuid;
  v_sit      integer;
  v_cli      bigint;
  v_nat      bigint;
  v_compr    bigint;
  v_forma    bigint;
  v_pedido   bigint;
  v_pag      bigint;
  v_comissao bigint;
  v_debitos  int;
BEGIN
  -- ---------- cenário ----------
  INSERT INTO auth.users (id) VALUES (gen_random_uuid()) RETURNING id INTO v_user;
  INSERT INTO public."user" (user_id, nome, email, tipo, ativo)
       VALUES (v_user, 'Backoffice Teste', 'bo@teste.com', 'backoffice', true);
  INSERT INTO "dados_comissao" ("ref_comissão_id", "Descrição")
       VALUES (2, 'Alíquota fixa') ON CONFLICT DO NOTHING;
  INSERT INTO dados_vendedor (user_id, "Comissão", aliquotafixa) VALUES (v_user, 2, 5);

  INSERT INTO ref_situacao (nome) VALUES ('Ativo teste') RETURNING ref_situacao_id INTO v_sit;
  INSERT INTO cliente (nome, ref_situacao_id) VALUES ('Cliente CC', v_sit)
    RETURNING cliente_id INTO v_cli;
  -- pagamento_acordo_cliente tem CHECK restringindo a forma a três valores:
  -- abatimento_em_boleto, boleto, transferencia. O nome da forma cadastrada
  -- precisa ser um deles.
  INSERT INTO ref_forma_pagamento (nome, ativo) VALUES ('boleto', true)
    RETURNING id INTO v_forma;

  -- compromisso de R$ 1.000
  INSERT INTO conta_corrente_cliente (cliente_id, data, valor, titulo, tipo_compromisso)
       VALUES (v_cli, current_date, 1000.00, 'Compromisso Teste', 'investimento')
    RETURNING id INTO v_compr;

  -- ============ 145 · pagar ACIMA do compromisso é PERMITIDO ============
  -- A função devolve a LINHA criada (não o id) — por isso SELECT ... INTO.
  SELECT id INTO v_pag FROM public.create_pagamento_conta_corrente_v2(
    p_conta_corrente_id => v_compr,
    p_data_pagamento    => current_date,
    p_forma_pagamento   => 'boleto',
    p_valor_pago        => 1500.00,          -- R$ 500 acima
    p_arquivo_comprovante => NULL,
    p_categoria_id      => NULL,
    p_forma_pagamento_id => v_forma,
    p_created_by        => v_user);

  ASSERT v_pag IS NOT NULL,
    'REGRESSÃO 145: pagamento acima do compromisso foi recusado — o cliente decidiu que deve ser aceito';
  ASSERT EXISTS (SELECT 1 FROM pagamento_acordo_cliente WHERE id = v_pag AND valor_pago = 1500.00),
    'REGRESSÃO 145: o pagamento não foi gravado com o valor informado';

  -- ---- mas as OUTRAS validações não podem ter caído junto ----
  BEGIN
    PERFORM public.create_pagamento_conta_corrente_v2(
      v_compr, current_date, 'boleto', -50.00, NULL, NULL, v_forma, v_user);
    RAISE EXCEPTION 'REGRESSÃO 145: valor NEGATIVO foi aceito — a validação caiu junto com o bloqueio do excedente';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'REGRESSÃO%' THEN RAISE; END IF;   -- foi a nossa, propaga
  END;

  BEGIN
    PERFORM public.create_pagamento_conta_corrente_v2(
      999999999, current_date, 'boleto', 100.00, NULL, NULL, v_forma, v_user);
    RAISE EXCEPTION 'REGRESSÃO 145: aceitou pagamento para compromisso INEXISTENTE';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'REGRESSÃO%' THEN RAISE; END IF;
  END;

  -- ============ 147 · período ABERTO: excluir pedido APAGA a comissão ============
  INSERT INTO natureza_operacao (nome, tem_comissao, ativo)
       VALUES ('Venda de mercadorias', true, true) RETURNING id INTO v_nat;
  INSERT INTO pedido_venda (cliente_id, vendedor_uuid, numero_pedido, status,
                            valor_total, natureza_id, natureza_operacao)
       VALUES (v_cli, v_user, 'PV-EST-1', 'Faturado', 10000.00, v_nat, 'Venda de mercadorias')
    RETURNING "pedido_venda_ID" INTO v_pedido;

  INSERT INTO "vendedor_comissão" (vendedor_uuid, pedido_id, valor_total, valor_comissao,
                                   percentual_comissao, periodo, efetivada, cliente_id)
       VALUES (v_user, v_pedido, 10000.00, 500.00, 5, '2026-08', true, v_cli)
    RETURNING vendedor_comissao_id INTO v_comissao;

  UPDATE pedido_venda SET deleted_at = now() WHERE "pedido_venda_ID" = v_pedido;

  ASSERT NOT EXISTS (SELECT 1 FROM "vendedor_comissão" WHERE vendedor_comissao_id = v_comissao),
    'REGRESSÃO 147: período ABERTO — a comissão do pedido excluído deveria ter sido apagada';

  -- ============ 147 · período FECHADO: mantém a comissão e lança DÉBITO ============
  INSERT INTO pedido_venda (cliente_id, vendedor_uuid, numero_pedido, status,
                            valor_total, natureza_id, natureza_operacao)
       VALUES (v_cli, v_user, 'PV-EST-2', 'Faturado', 20000.00, v_nat, 'Venda de mercadorias')
    RETURNING "pedido_venda_ID" INTO v_pedido;

  INSERT INTO "vendedor_comissão" (vendedor_uuid, pedido_id, valor_total, valor_comissao,
                                   percentual_comissao, periodo, efetivada, cliente_id)
       VALUES (v_user, v_pedido, 20000.00, 1000.00, 5, '2026-07', true, v_cli)
    RETURNING vendedor_comissao_id INTO v_comissao;

  INSERT INTO controle_comissao_periodo (vendedor_uuid, periodo, status, data_fechamento, fechado_por)
       VALUES (v_user, '2026-07', 'fechado', now(), v_user);

  SELECT count(*) INTO v_debitos FROM lancamentos_comissao WHERE tipo = 'debito';
  UPDATE pedido_venda SET deleted_at = now() WHERE "pedido_venda_ID" = v_pedido;

  ASSERT EXISTS (SELECT 1 FROM "vendedor_comissão" WHERE vendedor_comissao_id = v_comissao),
    'REGRESSÃO 147: período FECHADO — a comissão NÃO pode ser apagada, o período já foi pago';
  ASSERT (SELECT count(*) FROM lancamentos_comissao WHERE tipo = 'debito') = v_debitos + 1,
    'REGRESSÃO 147: período FECHADO — deveria ter lançado um débito de estorno';
  ASSERT EXISTS (SELECT 1 FROM lancamentos_comissao
                  WHERE tipo = 'debito' AND valor = 1000.00 AND vendedor_uuid = v_user),
    'REGRESSÃO 147: o débito de estorno saiu com valor diferente da comissão';
END $$;
