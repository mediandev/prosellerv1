-- Change logs for cliente updates.

CREATE TABLE IF NOT EXISTS public.cliente_historico_alteracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id bigint NOT NULL REFERENCES public.cliente (cliente_id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'edicao' CHECK (tipo IN ('edicao', 'mudanca_status')),
  descricao text NOT NULL,
  campos_alterados jsonb NOT NULL DEFAULT '[]'::jsonb,
  usuario_id uuid,
  usuario_nome text,
  data_hora timestamp with time zone NOT NULL DEFAULT now(),
  metadados jsonb
);

CREATE INDEX IF NOT EXISTS idx_cliente_historico_alteracoes_cliente_data
  ON public.cliente_historico_alteracoes (cliente_id, data_hora DESC);

CREATE OR REPLACE FUNCTION public.cliente_historico_label(p_key text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT CASE p_key
    WHEN 'nome' THEN 'Razão Social'
    WHEN 'nome_fantasia' THEN 'Nome Fantasia'
    WHEN 'cpf_cnpj' THEN 'CPF/CNPJ'
    WHEN 'inscricao_estadual' THEN 'Inscrição Estadual'
    WHEN 'codigo' THEN 'Código'
    WHEN 'grupo_rede' THEN 'Grupo/Rede'
    WHEN 'grupo_id' THEN 'Grupo'
    WHEN 'lista_de_preco' THEN 'Lista de Preços'
    WHEN 'desconto' THEN 'Desconto Padrão'
    WHEN 'desconto_financeiro' THEN 'Desconto Financeiro'
    WHEN 'pedido_minimo' THEN 'Pedido Mínimo'
    WHEN 'vendedoresatribuidos' THEN 'Vendedores Atribuídos'
    WHEN 'observacao_interna' THEN 'Observações Internas'
    WHEN 'tipo_segmento' THEN 'Segmento de Mercado'
    WHEN 'segmento_id' THEN 'Segmento'
    WHEN 'status_aprovacao' THEN 'Status de Aprovação'
    WHEN 'ref_situacao_id' THEN 'Situação'
    WHEN 'empresaFaturamento' THEN 'Empresa de Faturamento'
    WHEN 'requisitos_logisticos' THEN 'Requisitos Logísticos'
    WHEN 'ref_tipo_pessoa_id_FK' THEN 'Tipo de Pessoa'
    WHEN 'codigo_origem' THEN 'Origem do Código'
    WHEN 'codigo_tiny_sistema' THEN 'Sistema Tiny'
    WHEN 'codigo_tiny_id_externo' THEN 'ID Externo Tiny'
    WHEN 'codigo_tiny_integration_ref' THEN 'Integração Tiny'
    WHEN 'deleted_at' THEN 'Exclusão'
    ELSE replace(initcap(replace(p_key, '_', ' ')), ' Id', ' ID')
  END;
$function$;

CREATE OR REPLACE FUNCTION public.registrar_log_alteracao_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_old jsonb := to_jsonb(OLD);
  v_new jsonb := to_jsonb(NEW);
  v_key text;
  v_campos_alterados jsonb := '[]'::jsonb;
  v_usuario_nome text;
  v_tipo text := 'edicao';
BEGIN
  IF NEW IS NOT DISTINCT FROM OLD THEN
    RETURN NEW;
  END IF;

  FOR v_key IN
    SELECT jsonb_object_keys(v_new)
  LOOP
    IF v_key IN ('updated_at', 'atualizado_por') THEN
      CONTINUE;
    END IF;

    IF (v_old -> v_key) IS DISTINCT FROM (v_new -> v_key) THEN
      v_campos_alterados := v_campos_alterados || jsonb_build_array(
        jsonb_build_object(
          'campo', v_key,
          'label', public.cliente_historico_label(v_key),
          'valorAnterior', v_old -> v_key,
          'valorNovo', v_new -> v_key
        )
      );
    END IF;
  END LOOP;

  IF jsonb_array_length(v_campos_alterados) = 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.status_aprovacao IS DISTINCT FROM OLD.status_aprovacao THEN
    v_tipo := 'mudanca_status';
  END IF;

  IF NEW.atualizado_por IS NOT NULL THEN
    SELECT COALESCE(u.nome, u.email, 'Sistema')
      INTO v_usuario_nome
      FROM public."user" u
     WHERE u.user_id = NEW.atualizado_por
       AND u.deleted_at IS NULL
     LIMIT 1;
  END IF;

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
    NEW.cliente_id,
    v_tipo,
    format('%s campo(s) alterado(s)', jsonb_array_length(v_campos_alterados)),
    v_campos_alterados,
    NEW.atualizado_por,
    COALESCE(v_usuario_nome, 'Sistema'),
    jsonb_build_object('origem', 'trigger_cliente')
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_cliente_historico_alteracoes ON public.cliente;

CREATE TRIGGER trg_cliente_historico_alteracoes
AFTER UPDATE ON public.cliente
FOR EACH ROW
EXECUTE FUNCTION public.registrar_log_alteracao_cliente();

GRANT SELECT ON public.cliente_historico_alteracoes TO authenticated;
REVOKE ALL ON public.cliente_historico_alteracoes FROM anon;

CREATE OR REPLACE FUNCTION public.get_cliente_completo_v2(
  p_cliente_id bigint,
  p_requesting_user_id uuid DEFAULT NULL::uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public
AS $function$
DECLARE
  v_user_tipo text;
  v_cliente_completo json;
BEGIN
  IF p_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_id e obrigatorio';
  END IF;

  IF p_requesting_user_id IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public."user" u
    WHERE u.user_id = p_requesting_user_id
      AND u.ativo = true
      AND u.deleted_at IS NULL;

    IF v_user_tipo = 'vendedor' THEN
      IF NOT EXISTS (
        SELECT 1
        FROM public.cliente c
        WHERE c.cliente_id = p_cliente_id
          AND c.deleted_at IS NULL
          AND c.status_aprovacao = 'aprovado'
          AND (
            c.criado_por = p_requesting_user_id
            OR p_requesting_user_id = ANY(c.vendedoresatribuidos)
          )
      ) THEN
        RAISE EXCEPTION 'Cliente nao encontrado ou sem permissao de acesso';
      END IF;
    END IF;
  END IF;

  SELECT json_build_object(
    'cliente',
      (
        row_to_json(c.*)::jsonb
        || jsonb_build_object(
          'segmento_nome', sc.nome,
          'requisitos_logisticos', c.requisitos_logisticos
        )
      )::json,
    'contato', (SELECT row_to_json(cc.*) FROM public.cliente_contato cc WHERE cc.cliente_id = c.cliente_id),
    'endereco', (SELECT row_to_json(ce.*) FROM public."cliente_endereço" ce WHERE ce.cliente_id = c.cliente_id),
    'vendedores', (
      SELECT COALESCE(json_agg(row_to_json(dv.*)), '[]'::json)
      FROM public.dados_vendedor dv
      WHERE dv.user_id = ANY(c.vendedoresatribuidos)
        AND dv.deleted_at IS NULL
    ),
    'condicoes_cliente', (
      SELECT COALESCE(json_agg(row_to_json(cond.*)), '[]'::json)
      FROM public."condições_cliente" cond
      WHERE cond."ID_cliente" = c.cliente_id
    ),
    'conta_corrente_cliente', (
      SELECT COALESCE(json_agg(row_to_json(ccc.*) ORDER BY ccc.data DESC, ccc.id DESC), '[]'::json)
      FROM public.conta_corrente_cliente ccc
      WHERE ccc.cliente_id = c.cliente_id
    ),
    'historico', (
      SELECT COALESCE(
        json_agg(
          json_build_object(
            'id', h.id::text,
            'entidadeTipo', 'cliente',
            'entidadeId', h.cliente_id::text,
            'tipo', h.tipo,
            'descricao', h.descricao,
            'camposAlterados', COALESCE(h.campos_alterados, '[]'::jsonb),
            'usuarioId', COALESCE(h.usuario_id::text, ''),
            'usuarioNome', COALESCE(h.usuario_nome, 'Sistema'),
            'dataHora', h.data_hora,
            'metadados', h.metadados
          )
          ORDER BY h.data_hora DESC, h.id DESC
        ),
        '[]'::json
      )
      FROM public.cliente_historico_alteracoes h
      WHERE h.cliente_id = c.cliente_id
    )
  )
  INTO v_cliente_completo
  FROM public.cliente c
  LEFT JOIN public.segmento_cliente sc
    ON sc.id = c.segmento_id
   AND sc.deleted_at IS NULL
  WHERE c.cliente_id = p_cliente_id
    AND c.deleted_at IS NULL;

  IF v_cliente_completo IS NULL THEN
    RAISE EXCEPTION 'Cliente nao encontrado';
  END IF;

  RETURN v_cliente_completo;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in get_cliente_completo_v2 for cliente %: %', p_cliente_id, SQLERRM;
    RAISE;
END;
$function$;

COMMENT ON FUNCTION public.get_cliente_completo_v2 IS
'Busca cliente completo com contato, endereco, vendedores, condicoes_cliente, conta_corrente_cliente, segmento_nome, requisitos_logisticos e historico de alteracoes.';
