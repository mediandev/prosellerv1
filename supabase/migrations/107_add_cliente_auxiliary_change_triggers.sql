-- Log changes in auxiliary cliente tables into cliente_historico_alteracoes.

CREATE OR REPLACE FUNCTION public.registrar_log_alteracao_cliente_auxiliar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_old jsonb := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END;
  v_new jsonb := CASE WHEN TG_OP IN ('UPDATE', 'INSERT') THEN to_jsonb(NEW) ELSE NULL END;
  v_source jsonb := COALESCE(v_new, v_old, '{}'::jsonb);
  v_key text;
  v_cliente_id bigint;
  v_campos_alterados jsonb := '[]'::jsonb;
  v_usuario_id uuid;
  v_usuario_nome text;
  v_descricao text;
BEGIN
  v_cliente_id := COALESCE(
    (v_new ->> 'ID_cliente')::bigint,
    (v_old ->> 'ID_cliente')::bigint,
    (v_new ->> 'cliente_id')::bigint,
    (v_old ->> 'cliente_id')::bigint
  );

  IF v_cliente_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT c.atualizado_por,
         COALESCE(u.nome, u.email, 'Sistema')
    INTO v_usuario_id, v_usuario_nome
    FROM public.cliente c
    LEFT JOIN public."user" u
      ON u.user_id = c.atualizado_por
     AND u.deleted_at IS NULL
   WHERE c.cliente_id = v_cliente_id
   LIMIT 1;

  -- Ignore create flow and any system changes without an explicit updater.
  IF v_usuario_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  FOR v_key IN
    SELECT jsonb_object_keys(v_source)
  LOOP
    IF TG_TABLE_NAME = 'condições_cliente' AND v_key = 'ID_cliente' THEN
      CONTINUE;
    END IF;

    IF TG_TABLE_NAME <> 'condições_cliente' AND v_key = 'cliente_id' THEN
      CONTINUE;
    END IF;

    IF TG_OP = 'UPDATE' AND (v_old -> v_key) IS NOT DISTINCT FROM (v_new -> v_key) THEN
      CONTINUE;
    END IF;

    v_campos_alterados := v_campos_alterados || jsonb_build_array(
      jsonb_build_object(
        'campo', format('%s.%s', TG_TABLE_NAME, v_key),
        'label', CASE
          WHEN TG_TABLE_NAME = 'cliente_contato' THEN format('Contato: %s', public.cliente_historico_label(v_key))
          WHEN TG_TABLE_NAME = 'cliente_endereço' THEN format('Endereço: %s', public.cliente_historico_label(v_key))
          WHEN TG_TABLE_NAME = 'condições_cliente' AND v_key = 'ID_condições' THEN 'Condição de Pagamento'
          ELSE public.cliente_historico_label(v_key)
        END,
        'valorAnterior', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE v_old -> v_key END,
        'valorNovo', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE v_new -> v_key END
      )
    );
  END LOOP;

  IF jsonb_array_length(v_campos_alterados) = 0 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_descricao := CASE
    WHEN TG_TABLE_NAME = 'cliente_contato' AND TG_OP = 'INSERT' THEN 'Contato adicionado'
    WHEN TG_TABLE_NAME = 'cliente_contato' AND TG_OP = 'UPDATE' THEN format('%s campo(s) de contato alterado(s)', jsonb_array_length(v_campos_alterados))
    WHEN TG_TABLE_NAME = 'cliente_contato' AND TG_OP = 'DELETE' THEN 'Contato removido'
    WHEN TG_TABLE_NAME = 'cliente_endereço' AND TG_OP = 'INSERT' THEN 'Endereço adicionado'
    WHEN TG_TABLE_NAME = 'cliente_endereço' AND TG_OP = 'UPDATE' THEN format('%s campo(s) de endereço alterado(s)', jsonb_array_length(v_campos_alterados))
    WHEN TG_TABLE_NAME = 'cliente_endereço' AND TG_OP = 'DELETE' THEN 'Endereço removido'
    WHEN TG_TABLE_NAME = 'condições_cliente' AND TG_OP = 'INSERT' THEN 'Condição de pagamento adicionada'
    WHEN TG_TABLE_NAME = 'condições_cliente' AND TG_OP = 'UPDATE' THEN format('%s campo(s) de condição comercial alterado(s)', jsonb_array_length(v_campos_alterados))
    WHEN TG_TABLE_NAME = 'condições_cliente' AND TG_OP = 'DELETE' THEN 'Condição de pagamento removida'
    ELSE format('%s campo(s) alterado(s)', jsonb_array_length(v_campos_alterados))
  END;

  INSERT INTO public.cliente_historico_alteracoes (
    cliente_id,
    tipo,
    descricao,
    campos_alterados,
    usuario_id,
    usuario_nome,
    metadados
  )
  VALUES (
    v_cliente_id,
    'edicao',
    v_descricao,
    v_campos_alterados,
    v_usuario_id,
    COALESCE(v_usuario_nome, 'Sistema'),
    jsonb_build_object(
      'origem', 'trigger_cliente_auxiliar',
      'tabela', TG_TABLE_NAME,
      'operacao', TG_OP
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trg_cliente_contato_historico_alteracoes ON public.cliente_contato;
CREATE TRIGGER trg_cliente_contato_historico_alteracoes
AFTER INSERT OR UPDATE OR DELETE ON public.cliente_contato
FOR EACH ROW
EXECUTE FUNCTION public.registrar_log_alteracao_cliente_auxiliar();

DROP TRIGGER IF EXISTS trg_cliente_endereco_historico_alteracoes ON public."cliente_endereço";
CREATE TRIGGER trg_cliente_endereco_historico_alteracoes
AFTER INSERT OR UPDATE OR DELETE ON public."cliente_endereço"
FOR EACH ROW
EXECUTE FUNCTION public.registrar_log_alteracao_cliente_auxiliar();

DROP TRIGGER IF EXISTS trg_condicoes_cliente_historico_alteracoes ON public."condições_cliente";
CREATE TRIGGER trg_condicoes_cliente_historico_alteracoes
AFTER INSERT OR UPDATE OR DELETE ON public."condições_cliente"
FOR EACH ROW
EXECUTE FUNCTION public.registrar_log_alteracao_cliente_auxiliar();
