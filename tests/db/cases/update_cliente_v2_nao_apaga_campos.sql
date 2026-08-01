-- Invariante da migration 140 — salvar cliente NÃO apaga campo não enviado.
--
-- O incidente: `update_cliente_v2` usava COALESCE(NULLIF(p_campo,''), EXCLUDED.campo)
-- no UPSERT. `EXCLUDED` é a linha PROPOSTA (ou seja, o próprio parâmetro nulo),
-- não a linha existente. Resultado: qualquer campo não enviado no formulário era
-- sobrescrito com NULL. 121 campos perdidos em 94 clientes, detectado só quando
-- o cliente reclamou (caso Época).
--
-- Este caso reproduz a forma exata do incidente: gravar um cliente completo e
-- depois mandar um update parcial, exigindo que o resto sobreviva.
--
-- Detalhe que importa (e que uma primeira versão deste teste errou): os blocos de
-- contato e endereço só executam se PELO MENOS UM campo daquele bloco vier
-- preenchido. Mandar só o nome não aciona o UPSERT e o teste passa até na versão
-- bugada — falso verde. Por isso o update abaixo envia UM campo de cada bloco
-- (telefone e cidade) e afirma que os demais campos DAQUELE bloco sobreviveram:
-- é exatamente esse o caminho que apagava dado em produção.

DO $$
DECLARE
  v_cliente_id bigint;
  v_situacao   integer;
  v_tipo       bigint;
  r            record;
BEGIN
  -- ---------- cenário ----------
  INSERT INTO ref_situacao (nome) VALUES ('Ativo teste')
    RETURNING ref_situacao_id INTO v_situacao;
  INSERT INTO ref_tipo_pessoa (nome) VALUES ('Jurídica teste')
    RETURNING ref_tipo_pessoa_id INTO v_tipo;

  INSERT INTO cliente (nome, nome_fantasia, cpf_cnpj, codigo, grupo_rede,
                       ref_situacao_id, "ref_tipo_pessoa_id_FK", observacao_interna)
       VALUES ('Época Cosméticos LTDA', 'Época', '48076228003026', 'C-9001',
               'Rede Época', v_situacao, v_tipo, 'cliente estratégico')
    RETURNING cliente_id INTO v_cliente_id;

  INSERT INTO cliente_contato (cliente_id, telefone, email, email_nf, observacao)
       VALUES (v_cliente_id, '11999998888', 'compras@epoca.com.br',
               'nf@epoca.com.br', 'falar com o Valentim');

  INSERT INTO "cliente_endereço" (cliente_id, cep, rua, numero, bairro, cidade, uf)
       VALUES (v_cliente_id, '13345400', 'Rua das Flores', '1000',
               'Centro', 'Indaiatuba', 'SP');

  -- ---------- ação: update PARCIAL — um campo por bloco ----------
  PERFORM public.update_cliente_v2(
    p_cliente_id => v_cliente_id,
    p_nome       => 'Época Cosméticos S/A',  -- bloco cliente
    p_telefone   => '11999998888',           -- bloco contato (só este)
    p_cidade     => 'Indaiatuba'             -- bloco endereço (só este)
  );

  -- ---------- verificação ----------
  SELECT c.nome, c.nome_fantasia, c.cpf_cnpj, c.codigo, c.grupo_rede,
         c.observacao_interna,
         ct.telefone, ct.email, ct.email_nf, ct.observacao,
         e.cep, e.rua, e.numero, e.bairro, e.cidade, e.uf
    INTO r
    FROM cliente c
    LEFT JOIN cliente_contato ct ON ct.cliente_id = c.cliente_id
    LEFT JOIN "cliente_endereço" e ON e.cliente_id = c.cliente_id
   WHERE c.cliente_id = v_cliente_id;

  ASSERT r.nome = 'Época Cosméticos S/A',
    format('o nome enviado deveria ter sido gravado; veio "%s"', r.nome);

  -- Estes são os campos que o incidente apagava.
  ASSERT r.nome_fantasia      = 'Época',                 'REGRESSÃO 140: nome_fantasia foi apagado';
  ASSERT r.cpf_cnpj           = '48076228003026',        'REGRESSÃO 140: cpf_cnpj foi apagado';
  ASSERT r.codigo             = 'C-9001',                'REGRESSÃO 140: codigo foi apagado';
  ASSERT r.grupo_rede         = 'Rede Época',            'REGRESSÃO 140: grupo_rede foi apagado';
  ASSERT r.observacao_interna = 'cliente estratégico',   'REGRESSÃO 140: observacao_interna foi apagada';

  ASSERT r.telefone   = '11999998888',          'REGRESSÃO 140: contato.telefone foi apagado';
  ASSERT r.email      = 'compras@epoca.com.br', 'REGRESSÃO 140: contato.email foi apagado';
  ASSERT r.email_nf   = 'nf@epoca.com.br',      'REGRESSÃO 140: contato.email_nf foi apagado';
  ASSERT r.observacao = 'falar com o Valentim', 'REGRESSÃO 140: contato.observacao foi apagada';

  ASSERT r.cep    = '13345400',       'REGRESSÃO 140: endereço.cep foi apagado';
  ASSERT r.rua    = 'Rua das Flores', 'REGRESSÃO 140: endereço.rua foi apagada';
  ASSERT r.numero = '1000',           'REGRESSÃO 140: endereço.numero foi apagado';
  ASSERT r.bairro = 'Centro',         'REGRESSÃO 140: endereço.bairro foi apagado';
  ASSERT r.cidade = 'Indaiatuba',     'REGRESSÃO 140: endereço.cidade foi apagada';
  ASSERT r.uf     = 'SP',             'REGRESSÃO 140: endereço.uf foi apagada';
END $$;
