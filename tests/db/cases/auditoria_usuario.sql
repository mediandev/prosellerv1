-- Invariante da migration 158 — auditoria de usuários e permissões.
--
-- Este é o grupo mais sensível: quem pode ver comissão, quem pode excluir pedido,
-- quem vira backoffice. O caso que mais importa é o 3 — a mudança de permissão
-- precisa dizer o que a pessoa GANHOU e o que PERDEU. Guardar as duas listas
-- inteiras e obrigar alguém a compará-las na mão é o mesmo que não registrar.

DO $$
DECLARE
  v_admin uuid;
  v_alvo  uuid;
  r       record;
BEGIN
  INSERT INTO auth.users (id) VALUES (gen_random_uuid()) RETURNING id INTO v_admin;
  INSERT INTO public."user" (user_id, nome, email, tipo, ativo)
       VALUES (v_admin, 'Admin Teste', 'admin@teste.com', 'backoffice', true);

  -- ---------- 1. criação registra ----------
  INSERT INTO auth.users (id) VALUES (gen_random_uuid()) RETURNING id INTO v_alvo;
  INSERT INTO public."user" (user_id, nome, email, tipo, ativo, permissoes)
       VALUES (v_alvo, 'Vendedor Novo', 'vend@teste.com', 'vendedor', true,
               '["vendas.visualizar"]'::jsonb);

  SELECT * INTO r FROM auditoria ORDER BY id DESC LIMIT 1;
  ASSERT r.acao = 'criou' AND r.entidade = 'Usuário',
    format('esperava criação de Usuário, veio %s/%s', r.acao, r.entidade);
  ASSERT r.descricao LIKE '%Vendedor Novo%',
    format('a descrição não identifica o usuário: "%s"', r.descricao);

  -- ---------- 2. virar backoffice tem registro próprio ----------
  UPDATE public."user" SET tipo = 'backoffice', atualizado_por = v_admin
   WHERE user_id = v_alvo;

  SELECT * INTO r FROM auditoria ORDER BY id DESC LIMIT 1;
  ASSERT r.descricao LIKE '%de vendedor para backoffice%',
    format('mudança de tipo mal descrita: "%s"', r.descricao);
  ASSERT r.usuario_nome = 'Admin Teste',
    format('quem promoveu saiu errado: "%s"', r.usuario_nome);

  -- ---------- 3. permissão: precisa dizer o que ganhou e o que perdeu ----------
  UPDATE public."user"
     SET permissoes = '["vendas.visualizar","comissoes.visualizar","usuarios.permissoes"]'::jsonb,
         atualizado_por = v_admin
   WHERE user_id = v_alvo;

  SELECT * INTO r FROM auditoria ORDER BY id DESC LIMIT 1;
  ASSERT r.descricao LIKE '%permissões%',
    format('mudança de permissão mal descrita: "%s"', r.descricao);
  ASSERT r.detalhe -> 'ganhou' @> '["comissoes.visualizar"]'::jsonb,
    format('não registrou a permissão GANHA: %s', r.detalhe::text);
  ASSERT r.detalhe -> 'ganhou' @> '["usuarios.permissoes"]'::jsonb,
    format('não registrou a escalada para gerenciar permissões: %s', r.detalhe::text);
  ASSERT jsonb_array_length(r.detalhe -> 'perdeu') = 0,
    format('inventou permissão perdida: %s', r.detalhe::text);

  -- ---------- 4. remoção de permissão aparece do lado certo ----------
  UPDATE public."user" SET permissoes = '["vendas.visualizar"]'::jsonb, atualizado_por = v_admin
   WHERE user_id = v_alvo;

  SELECT * INTO r FROM auditoria ORDER BY id DESC LIMIT 1;
  ASSERT r.detalhe -> 'perdeu' @> '["comissoes.visualizar"]'::jsonb,
    format('permissão retirada não apareceu em "perdeu": %s', r.detalhe::text);
  ASSERT jsonb_array_length(r.detalhe -> 'ganhou') = 0,
    format('inventou permissão ganha: %s', r.detalhe::text);

  -- ---------- 5. desativar acesso tem verbo próprio ----------
  UPDATE public."user" SET ativo = false, atualizado_por = v_admin WHERE user_id = v_alvo;
  SELECT * INTO r FROM auditoria ORDER BY id DESC LIMIT 1;
  ASSERT r.acao = 'desativou',
    format('corte de acesso registrado como "%s" — precisa de verbo próprio', r.acao);

  -- ---------- 6. exclusão ----------
  UPDATE public."user" SET deleted_at = now(), deleted_by = v_admin WHERE user_id = v_alvo;
  SELECT * INTO r FROM auditoria ORDER BY id DESC LIMIT 1;
  ASSERT r.acao = 'excluiu' AND r.usuario_nome = 'Admin Teste',
    format('exclusão de usuário: acao=%s autor=%s', r.acao, r.usuario_nome);

  -- ---------- 7. BLINDAGEM ----------
  ALTER TABLE public.auditoria ADD CONSTRAINT chk_auditoria_falha_proposital CHECK (false) NOT VALID;
  BEGIN
    UPDATE public."user" SET ativo = true, atualizado_por = v_admin WHERE user_id = v_alvo;
  EXCEPTION WHEN check_violation THEN
    RAISE EXCEPTION 'REGRESSÃO 158: auditoria quebrada IMPEDIU a alteração do usuário (%)', SQLERRM;
  END;
END $$;
