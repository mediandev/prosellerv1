-- Preserva CPF/CNPJ exatamente como enviado pelo frontend (com máscara)
-- e remove validação baseada em sanitização.
DO $$
DECLARE
  v_oid oid;
  v_def text;
BEGIN
  FOR v_oid IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'create_cliente_v2'
  LOOP
    SELECT pg_get_functiondef(v_oid) INTO v_def;

    v_def := regexp_replace(
      v_def,
      E'\\n\\s*IF p_cpf_cnpj IS NOT NULL AND LENGTH\\(regexp_replace\\(p_cpf_cnpj, ''\\\\D'', '''', ''g''\\)\\) NOT IN \\(11, 14\\) THEN\\s*\\n\\s*RAISE EXCEPTION ''CPF/CNPJ inválido'';\\s*\\n\\s*END IF;\\s*\\n',
      E'\n',
      'g'
    );

    v_def := replace(
      v_def,
      'NULLIF(regexp_replace(p_cpf_cnpj, ''\\D'', '''', ''g''), '''')',
      'NULLIF(p_cpf_cnpj, '''')'
    );

    EXECUTE v_def;
  END LOOP;
END $$;
