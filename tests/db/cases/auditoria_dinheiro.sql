-- Invariante da migration 154 — a auditoria registra ação com impacto e NUNCA
-- derruba a operação do usuário.
--
-- O que este caso protege, em ordem de importância:
--   1. A blindagem: se o registro de auditoria falhar, a operação segue. Perder
--      uma linha de auditoria é ruim; impedir um pagamento é pior.
--   2. A captura em si: criar, alterar e excluir viram registro legível.
--   3. O silêncio correto: UPDATE que não mexe em campo vigiado NÃO vira linha
--      (senão a auditoria vira ruído e ninguém lê — o defeito que ela combate).

DO $$
DECLARE
  v_user   uuid;
  v_lanc   bigint;
  v_antes  int;
  v_depois int;
  r        record;
BEGIN
  INSERT INTO auth.users (id) VALUES (gen_random_uuid()) RETURNING id INTO v_user;
  INSERT INTO public."user" (user_id, nome, email)
       VALUES (v_user, 'Fulano de Teste', 'fulano@teste.com');

  -- ---------- 1. criação vira registro, com o nome de quem fez ----------
  SELECT count(*) INTO v_antes FROM auditoria;

  INSERT INTO lancamentos_comissao (vendedor_uuid, data_lancamento, tipo, valor, descricao, periodo, criado_por)
       VALUES (v_user, current_date, 'credito', 1500.00, 'bônus de teste', '2026-08', v_user)
    RETURNING id INTO v_lanc;

  SELECT * INTO r FROM auditoria ORDER BY id DESC LIMIT 1;
  ASSERT r.acao = 'criou',
    format('esperava acao "criou", veio "%s"', r.acao);
  ASSERT r.entidade = 'Lançamento de comissão',
    format('entidade errada: "%s"', r.entidade);
  ASSERT r.usuario_nome = 'Fulano de Teste',
    format('a auditoria não identificou quem fez — veio "%s"', r.usuario_nome);

  -- ---------- 2. alteração de campo vigiado registra o de/para ----------
  UPDATE lancamentos_comissao SET valor = 2000.00 WHERE id = v_lanc;

  SELECT * INTO r FROM auditoria ORDER BY id DESC LIMIT 1;
  ASSERT r.acao = 'alterou', format('esperava "alterou", veio "%s"', r.acao);
  ASSERT r.detalhe @> '[{"campo":"valor","de":"1500.00","para":"2000.00"}]'::jsonb,
    format('o de/para do valor não foi registrado: %s', r.detalhe::text);

  -- ---------- 3. alteração de campo NÃO vigiado fica em silêncio ----------
  SELECT count(*) INTO v_antes FROM auditoria;
  UPDATE lancamentos_comissao SET data_lancamento = current_date - 1 WHERE id = v_lanc;
  SELECT count(*) INTO v_depois FROM auditoria;
  ASSERT v_depois = v_antes,
    'campo fora da lista vigiada gerou registro — a auditoria viraria ruído';

  -- ---------- 4. exclusão registra, guardando o que foi apagado ----------
  DELETE FROM lancamentos_comissao WHERE id = v_lanc;
  SELECT * INTO r FROM auditoria ORDER BY id DESC LIMIT 1;
  ASSERT r.acao = 'excluiu', format('esperava "excluiu", veio "%s"', r.acao);
  ASSERT (r.detalhe ->> 'valor') = '2000.00',
    format('o valor excluído não foi preservado: %s', r.detalhe::text);

  -- ---------- 5. BLINDAGEM: auditoria quebrada não derruba a operação ----------
  -- Simula falha total do registro: uma restrição que recusa toda gravação de
  -- auditoria. É o pior caso realista (tabela cheia, coluna alterada, permissão
  -- perdida) e o mais simples de reproduzir.
  ALTER TABLE public.auditoria ADD CONSTRAINT chk_auditoria_falha_proposital CHECK (false) NOT VALID;

  BEGIN
    INSERT INTO lancamentos_comissao (vendedor_uuid, data_lancamento, tipo, valor, descricao, periodo, criado_por)
         VALUES (v_user, current_date, 'debito', 99.00, 'débito de teste', '2026-08', v_user);
  EXCEPTION WHEN check_violation THEN
    -- Só este erro prova a falha da blindagem: é a restrição de auditoria
    -- vazando para a transação do usuário. Qualquer outro erro é problema do
    -- próprio cenário de teste e deve subir como está, sem culpar a blindagem.
    RAISE EXCEPTION 'REGRESSÃO 154: auditoria quebrada DERRUBOU o lançamento (%). A blindagem falhou.', SQLERRM;
  END;

  ASSERT EXISTS (SELECT 1 FROM lancamentos_comissao WHERE valor = 99.00),
    'REGRESSÃO 154: o lançamento não foi gravado mesmo sem erro — a blindagem engoliu a operação';
END $$;
