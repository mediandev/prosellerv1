-- Invariante da migration 157 — auditoria de clientes.
--
-- Pontos que este caso protege:
--   1. Exclusão (soft delete) aparece como exclusão, não como "alteração de campo".
--   2. Aprovação/rejeição de cadastro aparece com verbo próprio.
--   3. Mudança de vendedor atribuído é registrada — foi o caso dos 6 clientes do
--      Sergio Glezer, em que ninguém sabia se tinha sido defeito ou decisão.
--   4. Correção rotineira de cadastro NÃO polui a auditoria (fica no histórico).

DO $$
DECLARE
  v_user    uuid;
  v_outro   uuid;
  v_sit     integer;
  v_sit_ina integer;
  v_cli     bigint;
  v_antes   int;
  v_depois  int;
  r         record;
BEGIN
  INSERT INTO auth.users (id) VALUES (gen_random_uuid()) RETURNING id INTO v_user;
  INSERT INTO public."user" (user_id, nome, email, tipo, ativo)
       VALUES (v_user, 'Ana Cadastro', 'ana@teste.com', 'backoffice', true);
  INSERT INTO auth.users (id) VALUES (gen_random_uuid()) RETURNING id INTO v_outro;
  INSERT INTO public."user" (user_id, nome, email, tipo, ativo)
       VALUES (v_outro, 'Bruno Aprovador', 'bruno@teste.com', 'backoffice', true);

  INSERT INTO ref_situacao (nome) VALUES ('Ativo teste') RETURNING ref_situacao_id INTO v_sit;
  INSERT INTO ref_situacao (nome) VALUES ('Inativo teste') RETURNING ref_situacao_id INTO v_sit_ina;

  -- ---------- 1. cadastro registra, com quem cadastrou ----------
  INSERT INTO cliente (nome, ref_situacao_id, status_aprovacao, criado_por)
       VALUES ('Época Cosméticos', v_sit, 'pendente', v_user)
    RETURNING cliente_id INTO v_cli;

  SELECT * INTO r FROM auditoria ORDER BY id DESC LIMIT 1;
  ASSERT r.acao = 'criou' AND r.entidade = 'Cliente',
    format('esperava criação de Cliente, veio %s/%s', r.acao, r.entidade);
  ASSERT r.usuario_nome = 'Ana Cadastro',
    format('quem cadastrou saiu errado: "%s"', r.usuario_nome);

  -- ---------- 2. aprovação tem verbo próprio ----------
  UPDATE cliente SET status_aprovacao = 'aprovado', atualizado_por = v_outro
   WHERE cliente_id = v_cli;

  SELECT * INTO r FROM auditoria ORDER BY id DESC LIMIT 1;
  ASSERT r.acao = 'aprovou',
    format('aprovação registrada como "%s" — deveria ter verbo próprio', r.acao);
  ASSERT r.usuario_nome = 'Bruno Aprovador',
    format('quem aprovou saiu errado: "%s"', r.usuario_nome);

  -- ---------- 3. troca de vendedor atribuído é registrada ----------
  UPDATE cliente SET vendedoresatribuidos = ARRAY[v_user],
                     atualizado_por = v_outro
   WHERE cliente_id = v_cli;

  SELECT * INTO r FROM auditoria ORDER BY id DESC LIMIT 1;
  ASSERT r.acao = 'alterou' AND r.detalhe @> '[{"campo":"vendedoresatribuidos"}]'::jsonb,
    format('a troca de vendedor não foi registrada: %s', COALESCE(r.detalhe::text, '(nulo)'));

  -- ---------- 4. correção rotineira NÃO polui a auditoria ----------
  SELECT count(*) INTO v_antes FROM auditoria;
  UPDATE cliente SET nome_fantasia = 'Época', observacao_interna = 'ligar de manhã'
   WHERE cliente_id = v_cli;
  SELECT count(*) INTO v_depois FROM auditoria;
  ASSERT v_depois = v_antes,
    'correção de cadastro gerou registro — a auditoria viraria ruído e ninguém leria';

  -- ---------- 5. exclusão aparece como exclusão ----------
  UPDATE cliente SET deleted_at = now(), excluido_por = v_outro WHERE cliente_id = v_cli;

  SELECT * INTO r FROM auditoria ORDER BY id DESC LIMIT 1;
  ASSERT r.acao = 'excluiu',
    format('REGRESSÃO 157: exclusão registrada como "%s" — some entre as alterações', r.acao);
  ASSERT r.usuario_nome = 'Bruno Aprovador',
    format('quem excluiu saiu errado: "%s"', r.usuario_nome);
  ASSERT r.descricao LIKE '%Época Cosméticos%',
    format('a descrição não identifica o cliente: "%s"', r.descricao);

  -- ---------- 6. restauração é registrada ----------
  UPDATE cliente SET deleted_at = NULL, atualizado_por = v_user WHERE cliente_id = v_cli;
  SELECT * INTO r FROM auditoria ORDER BY id DESC LIMIT 1;
  ASSERT r.acao = 'restaurou',
    format('restauração não registrada (veio "%s")', r.acao);

  -- ---------- 7. condição de pagamento liberada/removida ----------
  INSERT INTO "Condicao_De_Pagamento" ("Descrição") VALUES ('30 dias');
  INSERT INTO "condições_cliente" ("ID_cliente", "ID_condições")
       VALUES (v_cli, (SELECT max("Condição_ID") FROM "Condicao_De_Pagamento"));

  SELECT * INTO r FROM auditoria ORDER BY id DESC LIMIT 1;
  ASSERT r.entidade = 'Cliente' AND r.descricao LIKE '%liberou a condição%',
    format('liberar condição de pagamento não foi registrado: "%s"', r.descricao);

  -- ---------- 8. BLINDAGEM ----------
  ALTER TABLE public.auditoria ADD CONSTRAINT chk_auditoria_falha_proposital CHECK (false) NOT VALID;
  BEGIN
    UPDATE cliente SET deleted_at = now(), excluido_por = v_outro WHERE cliente_id = v_cli;
  EXCEPTION WHEN check_violation THEN
    RAISE EXCEPTION 'REGRESSÃO 157: auditoria quebrada IMPEDIU a exclusão do cliente (%)', SQLERRM;
  END;
END $$;
