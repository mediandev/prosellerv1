-- Invariante da migration 146 — CEP é gravado só com dígitos, zeros à esquerda intactos.
--
-- O incidente: a função fazia REPLACE(p_cep, '-', ''), removendo o hífen mas
-- deixando o ponto. "13.345-400" virava "13.345400" — um CEP quebrado, que
-- nenhuma integração aceita. E a normalização ingênua (cast para número) comeria
-- os zeros à esquerda de CEPs como "01310-100", que são 498 na base.
--
-- Correção: regexp_replace(..., '\D', '', 'g') — mantém texto, tira tudo que não
-- é dígito. A máscara passou a ser responsabilidade da exibição.

DO $$
DECLARE
  v_cliente_id bigint;
  v_situacao   integer;
  v_cep        text;
BEGIN
  INSERT INTO ref_situacao (nome) VALUES ('Ativo teste')
    RETURNING ref_situacao_id INTO v_situacao;

  INSERT INTO cliente (nome, ref_situacao_id)
       VALUES ('Cliente CEP', v_situacao)
    RETURNING cliente_id INTO v_cliente_id;

  -- CEP com máscara completa (ponto e hífen), como vem do formulário.
  PERFORM public.update_cliente_v2(
    p_cliente_id => v_cliente_id,
    p_cep        => '13.345-400'
  );

  SELECT cep INTO v_cep FROM "cliente_endereço" WHERE cliente_id = v_cliente_id;
  ASSERT v_cep = '13345400',
    format('REGRESSÃO 146: esperava "13345400" (só dígitos), veio "%s"', v_cep);

  -- Zero à esquerda: o caso que uma normalização numérica destruiria.
  PERFORM public.update_cliente_v2(
    p_cliente_id => v_cliente_id,
    p_cep        => '01310-100'
  );

  SELECT cep INTO v_cep FROM "cliente_endereço" WHERE cliente_id = v_cliente_id;
  ASSERT v_cep = '01310100',
    format('REGRESSÃO 146: zero à esquerda perdido — esperava "01310100", veio "%s"', v_cep);
  ASSERT length(v_cep) = 8,
    format('REGRESSÃO 146: CEP deve ter 8 posições, veio %s', length(v_cep));

  -- Idempotência: gravar um CEP já limpo não pode alterá-lo.
  PERFORM public.update_cliente_v2(p_cliente_id => v_cliente_id, p_cep => '01310100');
  SELECT cep INTO v_cep FROM "cliente_endereço" WHERE cliente_id = v_cliente_id;
  ASSERT v_cep = '01310100',
    format('REGRESSÃO 146: CEP já normalizado foi alterado para "%s"', v_cep);
END $$;
