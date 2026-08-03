-- Invariante da migration 155 — auditoria de pedidos, incluindo o soft delete.
--
-- O ponto delicado: excluir pedido NÃO é DELETE, é UPDATE de `deleted_at`.
-- Um gatilho ingênuo registraria a exclusão como "alteração de deleted_at" e
-- esconderia a ação mais grave no meio das corriqueiras. Este caso fixa que
-- exclusão aparece como exclusão.

DO $$
DECLARE
  v_user     uuid;
  v_outro    uuid;
  v_cliente  bigint;
  v_situacao integer;
  v_pedido   bigint;
  v_antes    int;
  v_depois   int;
  r          record;
BEGIN
  -- ---------- cenário ----------
  INSERT INTO auth.users (id) VALUES (gen_random_uuid()) RETURNING id INTO v_user;
  INSERT INTO public."user" (user_id, nome, email, tipo, ativo)
       VALUES (v_user, 'Quem Criou', 'criou@teste.com', 'backoffice', true);
  INSERT INTO auth.users (id) VALUES (gen_random_uuid()) RETURNING id INTO v_outro;
  INSERT INTO public."user" (user_id, nome, email, tipo, ativo)
       VALUES (v_outro, 'Quem Excluiu', 'excluiu@teste.com', 'backoffice', true);

  -- pedido_venda.vendedor_uuid tem FK para dados_vendedor (não para "user"):
  -- sem esta linha o INSERT do pedido é recusado.
  INSERT INTO dados_vendedor (user_id) VALUES (v_user);

  INSERT INTO ref_situacao (nome) VALUES ('Ativo teste') RETURNING ref_situacao_id INTO v_situacao;
  INSERT INTO cliente (nome, ref_situacao_id) VALUES ('Cliente do Pedido', v_situacao)
    RETURNING cliente_id INTO v_cliente;

  -- ---------- 1. criação registra, com o autor ----------
  -- vendedor_uuid tem DEFAULT gen_random_uuid() e FK para dados_vendedor:
  -- omitir a coluna gera um UUID aleatório que a FK recusa. Informar explicitamente.
  INSERT INTO pedido_venda (cliente_id, numero_pedido, status, valor_total, created_by, vendedor_uuid)
       VALUES (v_cliente, 'PV-TESTE-001', 'Rascunho', 1000.00, v_user, v_user)
    RETURNING "pedido_venda_ID" INTO v_pedido;

  SELECT * INTO r FROM auditoria ORDER BY id DESC LIMIT 1;
  ASSERT r.acao = 'criou' AND r.entidade = 'Pedido',
    format('esperava criação de Pedido, veio %s/%s', r.acao, r.entidade);
  ASSERT r.usuario_nome = 'Quem Criou',
    format('autor da criação errado: "%s"', r.usuario_nome);
  ASSERT r.descricao LIKE '%PV-TESTE-001%',
    format('a descrição não identifica o pedido: "%s"', r.descricao);

  -- ---------- 2. alteração de valor registra de/para ----------
  UPDATE pedido_venda SET valor_total = 1500.00, updated_by = v_user
   WHERE "pedido_venda_ID" = v_pedido;

  SELECT * INTO r FROM auditoria ORDER BY id DESC LIMIT 1;
  ASSERT r.acao = 'alterou', format('esperava "alterou", veio "%s"', r.acao);
  ASSERT r.detalhe @> '[{"campo":"valor_total"}]'::jsonb,
    format('a mudança de valor não foi registrada: %s', r.detalhe::text);

  -- ---------- 3. campo fora da lista não vira registro ----------
  SELECT count(*) INTO v_antes FROM auditoria;
  UPDATE pedido_venda SET observacao = 'anotação qualquer' WHERE "pedido_venda_ID" = v_pedido;
  SELECT count(*) INTO v_depois FROM auditoria;
  ASSERT v_depois = v_antes,
    'observação gerou registro de auditoria — viraria ruído';

  -- ---------- 4. EXCLUSÃO aparece como exclusão, não como alteração ----------
  UPDATE pedido_venda SET deleted_at = now(), deleted_by = v_outro
   WHERE "pedido_venda_ID" = v_pedido;

  SELECT * INTO r FROM auditoria ORDER BY id DESC LIMIT 1;
  ASSERT r.acao = 'excluiu',
    format('REGRESSÃO 155: exclusão (soft delete) registrada como "%s" — some no meio das alterações', r.acao);
  ASSERT r.usuario_nome = 'Quem Excluiu',
    format('quem excluiu saiu errado: "%s" (não pode herdar o criador)', r.usuario_nome);
  ASSERT (r.detalhe ->> 'valor_total')::numeric = 1500.00,
    format('o valor do pedido excluído não foi preservado: %s', r.detalhe::text);

  -- ---------- 5. restauração também é registrada ----------
  UPDATE pedido_venda SET deleted_at = NULL, updated_by = v_user
   WHERE "pedido_venda_ID" = v_pedido;

  SELECT * INTO r FROM auditoria ORDER BY id DESC LIMIT 1;
  ASSERT r.acao = 'restaurou',
    format('restauração de pedido excluído não foi registrada (veio "%s")', r.acao);

  -- ---------- 6. BLINDAGEM: auditoria quebrada não impede excluir ----------
  ALTER TABLE public.auditoria ADD CONSTRAINT chk_auditoria_falha_proposital CHECK (false) NOT VALID;
  BEGIN
    UPDATE pedido_venda SET deleted_at = now(), deleted_by = v_outro
     WHERE "pedido_venda_ID" = v_pedido;
  EXCEPTION WHEN check_violation THEN
    RAISE EXCEPTION 'REGRESSÃO 155: auditoria quebrada IMPEDIU a exclusão do pedido (%)', SQLERRM;
  END;

  ASSERT (SELECT deleted_at IS NOT NULL FROM pedido_venda WHERE "pedido_venda_ID" = v_pedido),
    'REGRESSÃO 155: a exclusão não foi gravada mesmo sem erro';
END $$;
