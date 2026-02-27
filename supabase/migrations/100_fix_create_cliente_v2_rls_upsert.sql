-- Fix RLS failure for vendedor when creating cliente.
-- In create_cliente_v2, INSERT ... ON CONFLICT for cliente_contato and
-- cliente_endereco can fail under authenticated RLS context.
-- For create flow we only need plain INSERTs in child tables.

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

    -- cliente_contato: remove UPSERT block, keep plain INSERT
    v_def := regexp_replace(
      v_def,
      E'\\n\\s*ON CONFLICT ON CONSTRAINT cliente_[^\\s]+_pkey DO UPDATE SET\\n\\s*telefone = COALESCE\\([^\\n]+\\n\\s*telefone_adicional = COALESCE\\([^\\n]+\\n\\s*email = COALESCE\\([^\\n]+\\n\\s*email_nf = COALESCE\\([^\\n]+\\n\\s*website = COALESCE\\([^\\n]+\\n\\s*observacao = COALESCE\\([^\\n]+',
      E';',
      'g'
    );

    -- cliente_endereco: remove UPSERT block, keep plain INSERT
    v_def := regexp_replace(
      v_def,
      E'\\n\\s*ON CONFLICT ON CONSTRAINT cliente_[^\\s]+_pkey DO UPDATE SET\\n\\s*cep = COALESCE\\([^\\n]+\\n\\s*rua = COALESCE\\([^\\n]+\\n\\s*numero = COALESCE\\([^\\n]+\\n\\s*complemento = COALESCE\\([^\\n]+\\n\\s*bairro = COALESCE\\([^\\n]+\\n\\s*cidade = COALESCE\\([^\\n]+\\n\\s*uf = COALESCE\\([^\\n]+\\n\\s*\"ref_tipo_endereco_id_FK\" = COALESCE\\([^\\n]+',
      E';',
      'g'
    );

    EXECUTE v_def;
  END LOOP;
END $$;
