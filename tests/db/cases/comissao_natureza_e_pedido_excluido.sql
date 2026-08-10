-- Invariantes das migrations 143 e 144 — quando NÃO se deve gerar comissão.
--
-- Correções entregues em julho que ficaram sem rede até agora. São de dinheiro:
-- se alguém quebrar uma delas, o sistema passa a comissionar venda que não
-- deveria comissionar, e nada avisa.
--
--   143: pedido excluído (soft delete) não gera comissão
--   144: a decisão passou a usar o FLAG `tem_comissao` do cadastro da natureza,
--        em vez de comparar o TEXTO 'Bonificação'. A comparação por texto era
--        sensível a acento e maiúscula — 'bonificação' ou 'BONIFICACAO' passavam
--        direto e geravam comissão indevida.

DO $$
DECLARE
  v_user    uuid;
  v_sit     integer;
  v_cli     bigint;
  v_nat_com bigint;   -- natureza QUE comissiona
  v_nat_sem bigint;   -- natureza que NÃO comissiona
  v_pedido  bigint;
  v_status  text;
BEGIN
  -- ---------- cenário ----------
  INSERT INTO auth.users (id) VALUES (gen_random_uuid()) RETURNING id INTO v_user;
  INSERT INTO public."user" (user_id, nome, email, tipo, ativo)
       VALUES (v_user, 'Vendedor Teste', 'vend@teste.com', 'vendedor', true);
  -- Tipo de comissão 2 = alíquota fixa. Sem isso a função recusa com "Tipo de
  -- comissão inválido" antes de chegar nas regras que este caso testa.
  -- A tabela de referência precisa existir (FK).
  INSERT INTO "dados_comissao" ("ref_comissão_id", "Descrição")
       VALUES (2, 'Alíquota fixa') ON CONFLICT DO NOTHING;
  INSERT INTO dados_vendedor (user_id, "Comissão", aliquotafixa)
       VALUES (v_user, 2, 5);

  INSERT INTO ref_situacao (nome) VALUES ('Ativo teste') RETURNING ref_situacao_id INTO v_sit;
  INSERT INTO cliente (nome, ref_situacao_id) VALUES ('Cliente Teste', v_sit)
    RETURNING cliente_id INTO v_cli;

  INSERT INTO natureza_operacao (nome, tem_comissao, ativo)
       VALUES ('Venda de mercadorias', true, true) RETURNING id INTO v_nat_com;
  INSERT INTO natureza_operacao (nome, tem_comissao, ativo)
       VALUES ('Bonificação', false, true) RETURNING id INTO v_nat_sem;

  -- ================= 1. Natureza sem comissão é bloqueada =================
  INSERT INTO pedido_venda (cliente_id, vendedor_uuid, numero_pedido, status,
                            valor_total, natureza_id, natureza_operacao)
       VALUES (v_cli, v_user, 'PV-BONIF', 'Faturado', 5000.00, v_nat_sem, 'Bonificação')
    RETURNING "pedido_venda_ID" INTO v_pedido;

  SELECT status INTO v_status
    FROM public.generate_vendedor_comissao(v_pedido, current_date);
  ASSERT v_status = 'natureza_sem_comissao',
    format('REGRESSÃO 144: natureza sem comissão gerou "%s" em vez de bloquear', v_status);
  ASSERT NOT EXISTS (SELECT 1 FROM "vendedor_comissão" WHERE pedido_id = v_pedido),
    'REGRESSÃO 144: comissão foi criada para natureza que não comissiona';

  -- ============ 2. O FLAG manda, não o nome (a correção da 144) ============
  -- Uma natureza chamada "Bonificação" mas marcada como comissionável DEVE
  -- comissionar; e uma com outro nome, marcada como não-comissionável, NÃO deve.
  -- É isto que a comparação por texto errava.
  UPDATE natureza_operacao SET tem_comissao = true WHERE id = v_nat_sem;

  SELECT status INTO v_status
    FROM public.generate_vendedor_comissao(v_pedido, current_date);
  ASSERT v_status <> 'natureza_sem_comissao',
    'REGRESSÃO 144: bloqueou pelo NOME "Bonificação" — deveria decidir pelo flag tem_comissao';

  UPDATE natureza_operacao SET tem_comissao = false WHERE id = v_nat_sem;  -- restaura

  -- ============ 3. Variação de acento/caixa não contorna a regra ============
  -- O defeito original: 'bonificação' minúsculo escapava do bloqueio.
  UPDATE natureza_operacao SET nome = 'bonificacao' WHERE id = v_nat_sem;
  DELETE FROM "vendedor_comissão" WHERE pedido_id = v_pedido;

  SELECT status INTO v_status
    FROM public.generate_vendedor_comissao(v_pedido, current_date);
  ASSERT v_status = 'natureza_sem_comissao',
    format('REGRESSÃO 144: "bonificacao" sem acento contornou o bloqueio (veio "%s")', v_status);

  -- ================= 4. Pedido excluído é bloqueado (143) =================
  DELETE FROM "vendedor_comissão" WHERE pedido_id = v_pedido;
  INSERT INTO pedido_venda (cliente_id, vendedor_uuid, numero_pedido, status,
                            valor_total, natureza_id, natureza_operacao, deleted_at)
       VALUES (v_cli, v_user, 'PV-EXCLUIDO', 'Faturado', 8000.00, v_nat_com,
               'Venda de mercadorias', now())
    RETURNING "pedido_venda_ID" INTO v_pedido;

  SELECT status INTO v_status
    FROM public.generate_vendedor_comissao(v_pedido, current_date);
  ASSERT v_status = 'pedido_deletado_sem_comissao',
    format('REGRESSÃO 143: pedido excluído gerou "%s" em vez de bloquear', v_status);
  ASSERT NOT EXISTS (SELECT 1 FROM "vendedor_comissão" WHERE pedido_id = v_pedido),
    'REGRESSÃO 143: comissão foi criada para pedido excluído';
END $$;
