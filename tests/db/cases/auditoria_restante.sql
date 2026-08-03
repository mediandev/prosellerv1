-- Invariante da migration 159 — preços, produtos, configurações e frete.
--
-- Dois pontos que este caso existe para proteger:
--   1. A CHAVE DE API do ERP nunca pode ir parar na auditoria. Registrar que ela
--      mudou é necessário; copiar a credencial para uma tabela lida por gente é
--      criar um vazamento onde não havia.
--   2. Exclusão suave passou a ser tratada pelo gatilho GENÉRICO. Se essa
--      generalização quebrar, oito tabelas de uma vez deixam de registrar
--      exclusão — e em silêncio.

DO $$
DECLARE
  v_prod    bigint;
  v_lista   bigint;
  v_preco   bigint;
  v_emp     bigint;
  v_antes   int;
  v_depois  int;
  r         record;
BEGIN
  -- ---------- 1. preço: o de/para tem que aparecer ----------
  -- produto.ref_permissao_id tem DEFAULT 1 e FK: a linha de referência precisa existir.
  INSERT INTO "ref_permissão_produto" (ref_permissao_id, nome)
       VALUES (1, 'Padrão') ON CONFLICT DO NOTHING;
  INSERT INTO produto (descricao, codigo_sku, preco_venda, ativo)
       VALUES ('Produto de Teste', 'SKU-TESTE', 10.00, true)
    RETURNING produto_id INTO v_prod;
  INSERT INTO listas_preco (nome, ativo) VALUES ('Lista Teste', true) RETURNING id INTO v_lista;
  INSERT INTO produtos_listas_precos (produto_id, lista_preco_id, preco)
       VALUES (v_prod, v_lista, 10.00) RETURNING id INTO v_preco;

  UPDATE produtos_listas_precos SET preco = 12.50 WHERE id = v_preco;

  SELECT * INTO r FROM auditoria WHERE entidade = 'Preço' ORDER BY id DESC LIMIT 1;
  ASSERT r.acao = 'alterou', format('esperava "alterou" o preço, veio "%s"', r.acao);
  ASSERT r.detalhe @> '[{"campo":"preco","de":"10.00","para":"12.50"}]'::jsonb,
    format('o de/para do preço não foi registrado: %s', r.detalhe::text);

  -- ---------- 2. exclusão suave, pelo gatilho GENÉRICO ----------
  UPDATE produto SET deleted_at = now() WHERE produto_id = v_prod;
  SELECT * INTO r FROM auditoria WHERE entidade = 'Produto' ORDER BY id DESC LIMIT 1;
  ASSERT r.acao = 'excluiu',
    format('REGRESSÃO 159: exclusão suave genérica registrada como "%s" — 8 tabelas param de registrar exclusão em silêncio', r.acao);

  UPDATE produto SET deleted_at = NULL WHERE produto_id = v_prod;
  SELECT * INTO r FROM auditoria WHERE entidade = 'Produto' ORDER BY id DESC LIMIT 1;
  ASSERT r.acao = 'restaurou', format('restauração genérica não registrada (veio "%s")', r.acao);

  -- ---------- 3. campo fora da lista segue em silêncio ----------
  SELECT count(*) INTO v_antes FROM auditoria;
  UPDATE produto SET peso_bruto = 1.234, localizacao_estoque = 'A-12' WHERE produto_id = v_prod;
  SELECT count(*) INTO v_depois FROM auditoria;
  ASSERT v_depois = v_antes,
    'campo operacional de produto gerou registro — encheria a auditoria de ruído';

  -- ---------- 4. CHAVE DE API: registra o fato, NUNCA o valor ----------
  INSERT INTO ref_empresas_subsidiarias (nome, chave_api, ativo)
       VALUES ('Empresa Teste', 'chave-secreta-antiga', true) RETURNING id INTO v_emp;

  UPDATE ref_empresas_subsidiarias SET chave_api = 'chave-secreta-nova' WHERE id = v_emp;

  SELECT * INTO r FROM auditoria
   WHERE entidade = 'Empresa de faturamento' AND descricao LIKE '%chave de API%'
   ORDER BY id DESC LIMIT 1;
  ASSERT r.id IS NOT NULL, 'a troca da chave de API não foi registrada';

  ASSERT NOT EXISTS (
    SELECT 1 FROM auditoria a
     WHERE a.detalhe::text LIKE '%chave-secreta-antiga%'
        OR a.detalhe::text LIKE '%chave-secreta-nova%'
        OR a.descricao LIKE '%chave-secreta%'),
    'VAZAMENTO: a chave de API do ERP foi copiada para a auditoria';

  -- E o registro precisa continuar informativo mesmo sem o valor.
  ASSERT (r.detalhe ->> 'tinha_chave_antes')::boolean IS TRUE
     AND (r.detalhe ->> 'tem_chave_agora')::boolean IS TRUE,
    format('o registro da chave ficou sem informação útil: %s', r.detalhe::text);

  -- ---------- 5. condição de pagamento ----------
  INSERT INTO "Condicao_De_Pagamento" ("Descrição", "Prazo_pagamento")
       VALUES ('Condição Teste', 30);
  UPDATE "Condicao_De_Pagamento" SET "Prazo_pagamento" = 45
   WHERE "Condição_ID" = (SELECT max("Condição_ID") FROM "Condicao_De_Pagamento");

  SELECT * INTO r FROM auditoria WHERE entidade = 'Condição de pagamento' ORDER BY id DESC LIMIT 1;
  ASSERT r.detalhe @> '[{"campo":"Prazo_pagamento","de":"30","para":"45"}]'::jsonb,
    format('mudança de prazo não registrada: %s', r.detalhe::text);
END $$;
