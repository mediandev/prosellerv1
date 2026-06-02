-- ============================================================================
-- BASELINE — Snapshot das funções (public) de PRODUÇÃO em 2026-06-01.
-- Gerado via pg_get_functiondef. Objetivo: o git passar a reproduzir o backend
-- que já roda em prod (muitas funções existiam só em prod, fora das migrations).
-- Idempotente (CREATE OR REPLACE = mesma definição de prod). NÃO precisa rodar em
-- prod (já está aplicado); serve para reprodutibilidade/rebuild e versionamento.
-- Total de funções: 128
-- ============================================================================

-- ---- add_condicao_disponivel ----
CREATE OR REPLACE FUNCTION public.add_condicao_disponivel(p_cliente_id integer, p_valor integer[])
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE public.cliente
  SET condicoesdisponiveis = COALESCE(condicoesdisponiveis, '{}'::INTEGER[]) || p_valor
  WHERE cliente_id = p_cliente_id;
END;
$function$
;

-- ---- add_condicoes_disponiveis ----
CREATE OR REPLACE FUNCTION public.add_condicoes_disponiveis(p_cliente_id bigint, p_valores bigint[])
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE public.cliente
  SET condicoesdisponiveis = COALESCE(condicoesdisponiveis, '{}') || p_valores
  WHERE cliente_id = p_cliente_id;
END;
$function$
;

-- ---- adicionar_vendedor_atribuido ----
CREATE OR REPLACE FUNCTION public.adicionar_vendedor_atribuido(p_cliente_id integer, p_vendedor_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE public.cliente
    SET vendedoresatribuidos = COALESCE(vendedoresatribuidos, '{}'::UUID[]) || p_vendedor_ids
    WHERE cliente_id = p_cliente_id;
END;
$function$
;

-- ---- aprovar_cliente_v2 ----
CREATE OR REPLACE FUNCTION public.aprovar_cliente_v2(p_cliente_id bigint, p_aprovado_por uuid)
 RETURNS TABLE(cliente_id bigint, status_aprovacao text, data_aprovacao date, aprovado_por uuid)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_tipo TEXT;
BEGIN
  IF p_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_id é obrigatório';
  END IF;

  IF p_aprovado_por IS NULL THEN
    RAISE EXCEPTION 'aprovado_por é obrigatório';
  END IF;

  SELECT tipo INTO v_user_tipo
  FROM public.user
  WHERE user_id = p_aprovado_por
  AND ativo = TRUE
  AND deleted_at IS NULL;

  IF v_user_tipo IS NULL THEN
    RAISE EXCEPTION 'Usuário não autorizado';
  END IF;

  IF v_user_tipo != 'backoffice' THEN
    RAISE EXCEPTION 'Apenas usuários backoffice podem aprovar clientes';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.cliente
    WHERE cliente_id = p_cliente_id
    AND deleted_at IS NULL
    AND status_aprovacao = 'pendente'
  ) THEN
    RAISE EXCEPTION 'Cliente não encontrado ou não está pendente de aprovação';
  END IF;

  UPDATE public.cliente
  SET
    status_aprovacao = 'aprovado',
    data_aprovacao = CURRENT_DATE,
    aprovado_por = p_aprovado_por,
    ref_situacao_id = (SELECT ref_situacao_id FROM public.ref_situacao WHERE nome = 'Ativo' LIMIT 1),
    updated_at = NOW()
  WHERE cliente_id = p_cliente_id;

  RETURN QUERY
  SELECT 
    c.cliente_id,
    c.status_aprovacao,
    c.data_aprovacao,
    c.aprovado_por
  FROM public.cliente c
  WHERE c.cliente_id = p_cliente_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in aprovar_cliente_v2 for cliente %: %', p_cliente_id, SQLERRM;
    RAISE;
END;
$function$
;

-- ---- cliente_historico_label ----
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
$function$
;

-- ---- copiar_metas_vendedor_v2 ----
CREATE OR REPLACE FUNCTION public.copiar_metas_vendedor_v2(p_de_ano integer, p_de_mes integer, p_para_ano integer, p_para_mes integer, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS TABLE(copied_count integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_tipo TEXT;
  v_copied_count INTEGER := 0;
BEGIN
  IF p_de_ano IS NULL OR p_de_ano < 2000 OR p_de_ano > 2100 THEN
    RAISE EXCEPTION 'Ano de origem inválido';
  END IF;

  IF p_de_mes IS NULL OR p_de_mes < 1 OR p_de_mes > 12 THEN
    RAISE EXCEPTION 'Mês de origem inválido';
  END IF;

  IF p_para_ano IS NULL OR p_para_ano < 2000 OR p_para_ano > 2100 THEN
    RAISE EXCEPTION 'Ano de destino inválido';
  END IF;

  IF p_para_mes IS NULL OR p_para_mes < 1 OR p_para_mes > 12 THEN
    RAISE EXCEPTION 'Mês de destino inválido';
  END IF;

  IF p_created_by IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_created_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem copiar metas';
    END IF;
  END IF;

  -- COPIAR METAS usando ON CONFLICT com o índice único
  INSERT INTO public.metas_vendedor (
    vendedor_id,
    ano,
    mes,
    meta_valor,
    meta_percentual_crescimento,
    periodo_referencia,
    data_criacao,
    data_atualizacao
  )
  SELECT 
    m.vendedor_id,
    p_para_ano,
    p_para_mes,
    m.meta_valor,
    m.meta_percentual_crescimento,
    m.periodo_referencia,
    NOW(),
    NOW()
  FROM public.metas_vendedor m
  WHERE m.ano = p_de_ano
  AND m.mes = p_de_mes
  ON CONFLICT (vendedor_id, ano, mes) DO NOTHING;

  GET DIAGNOSTICS v_copied_count = ROW_COUNT;

  RETURN QUERY
  SELECT v_copied_count;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in copiar_metas_vendedor_v2: %', SQLERRM;
    RAISE;
END;
$function$
;

-- ---- create_categorias_conta_corrente_v2 ----
CREATE OR REPLACE FUNCTION public.create_categorias_conta_corrente_v2(p_nome text, p_descricao text DEFAULT NULL::text, p_cor text DEFAULT NULL::text, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, nome text, descricao text, cor text, ativo boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE v_id UUID; v_user_tipo TEXT; BEGIN IF p_nome IS NULL OR LENGTH(TRIM(p_nome)) < 2 THEN RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres'; END IF; IF EXISTS ( SELECT 1 FROM public.categorias_conta_corrente c WHERE LOWER(TRIM(c.nome)) = LOWER(TRIM(p_nome)) AND c.deleted_at IS NULL ) THEN RAISE EXCEPTION 'Categoria de conta corrente com este nome já existe'; END IF; IF p_created_by IS NOT NULL THEN SELECT u.tipo INTO v_user_tipo FROM public.user u WHERE u.user_id = p_created_by AND u.ativo = TRUE AND u.deleted_at IS NULL; IF NOT FOUND THEN RAISE EXCEPTION 'Usuário não encontrado ou inativo'; END IF; IF v_user_tipo != 'backoffice' THEN RAISE EXCEPTION 'Apenas usuários backoffice podem criar categorias de conta corrente'; END IF; END IF; INSERT INTO public.categorias_conta_corrente (nome, descricao, cor, ativo, created_at, updated_at) VALUES ( TRIM(p_nome), NULLIF(TRIM(p_descricao), ''), NULLIF(TRIM(p_cor), ''), TRUE, NOW(), NOW() ) RETURNING categorias_conta_corrente.id INTO v_id; RETURN QUERY SELECT c.id, c.nome, c.descricao, c.cor, c.ativo, c.created_at, c.updated_at FROM public.categorias_conta_corrente c WHERE c.id = v_id; EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error in create_categorias_conta_corrente_v2: %', SQLERRM; RAISE; END; $function$
;

-- ---- create_cliente_v2 ----
CREATE OR REPLACE FUNCTION public.create_cliente_v2(p_nome text, p_nome_fantasia text DEFAULT NULL::text, p_cpf_cnpj text DEFAULT NULL::text, p_ref_tipo_pessoa_id_fk bigint DEFAULT NULL::bigint, p_inscricao_estadual text DEFAULT NULL::text, p_inscricao_municipal text DEFAULT NULL::text, p_codigo text DEFAULT NULL::text, p_grupo_rede text DEFAULT NULL::text, p_grupo_id uuid DEFAULT NULL::uuid, p_lista_de_preco bigint DEFAULT NULL::bigint, p_desconto_financeiro numeric DEFAULT 0, p_pedido_minimo numeric DEFAULT 0, p_vendedoresatribuidos uuid[] DEFAULT NULL::uuid[], p_observacao_interna text DEFAULT NULL::text, p_tipo_segmento text DEFAULT NULL::text, p_segmento_id bigint DEFAULT NULL::bigint, p_ie_isento boolean DEFAULT false, p_empresa_faturamento_id bigint DEFAULT NULL::bigint, p_desconto numeric DEFAULT NULL::numeric, p_condicao_padrao bigint DEFAULT NULL::bigint, p_condicoes_pagamento_ids bigint[] DEFAULT NULL::bigint[], p_telefone text DEFAULT NULL::text, p_telefone_adicional text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_email_nf text DEFAULT NULL::text, p_website text DEFAULT NULL::text, p_observacao_contato text DEFAULT NULL::text, p_cep text DEFAULT NULL::text, p_rua text DEFAULT NULL::text, p_numero text DEFAULT NULL::text, p_complemento text DEFAULT NULL::text, p_bairro text DEFAULT NULL::text, p_cidade text DEFAULT NULL::text, p_uf text DEFAULT NULL::text, p_ref_tipo_endereco_id_fk bigint DEFAULT NULL::bigint, p_criado_por uuid DEFAULT NULL::uuid, p_requisitos_logisticos jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(cliente_id bigint, nome text, nome_fantasia text, cpf_cnpj text, codigo text, status_aprovacao text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_cliente_id BIGINT;
  v_status_aprovacao TEXT;
  v_ref_situacao_id INTEGER;
  v_codigo TEXT;
BEGIN
  IF p_nome IS NULL OR LENGTH(TRIM(p_nome)) < 2 THEN
    RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
  END IF;

  IF p_criado_por IS NOT NULL THEN
    SELECT u.tipo INTO v_status_aprovacao
    FROM public."user" u
    WHERE u.user_id = p_criado_por AND u.ativo = TRUE AND u.deleted_at IS NULL;

    IF v_status_aprovacao = 'vendedor' THEN
      v_status_aprovacao := 'aprovado';
      v_ref_situacao_id := 1;
    ELSE
      v_status_aprovacao := 'aprovado';
      v_ref_situacao_id := 1;
    END IF;
  ELSE
    v_status_aprovacao := 'aprovado';
    v_ref_situacao_id := 1;
  END IF;

  -- Código automático: se não vier código, gera (maior código numérico + 1).
  -- pg_advisory_xact_lock serializa a geração p/ evitar código duplicado em cadastros simultâneos.
  -- MAX considera TODAS as linhas (inclui excluídas) para nunca reutilizar um código.
  v_codigo := NULLIF(TRIM(p_codigo), '');
  IF v_codigo IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('cliente_codigo_auto'));
    SELECT (COALESCE(MAX(codigo::bigint), 0) + 1)::text
      INTO v_codigo
      FROM public.cliente
     WHERE codigo ~ '^[0-9]+$';
  END IF;

  INSERT INTO public.cliente (
    nome,
    nome_fantasia,
    cpf_cnpj,
    "ref_tipo_pessoa_id_FK",
    inscricao_estadual,
    inscricao_municipal,
    codigo,
    grupo_rede,
    grupo_id,
    lista_de_preco,
    desconto_financeiro,
    pedido_minimo,
    vendedoresatribuidos,
    observacao_interna,
    tipo_segmento,
    segmento_id,
    "IE_isento",
    "empresaFaturamento",
    desconto,
    condicao_padrao,
    status_aprovacao,
    ref_situacao_id,
    criado_por,
    requisitos_logisticos,
    created_at
  ) VALUES (
    TRIM(p_nome),
    NULLIF(TRIM(p_nome_fantasia), ''),
    NULLIF(p_cpf_cnpj, ''),
    p_ref_tipo_pessoa_id_FK,
    NULLIF(TRIM(p_inscricao_estadual), ''),
    NULLIF(TRIM(p_inscricao_municipal), ''),
    v_codigo,
    NULLIF(TRIM(p_grupo_rede), ''),
    p_grupo_id,
    p_lista_de_preco,
    COALESCE(p_desconto_financeiro, 0),
    COALESCE(p_pedido_minimo, 0),
    p_vendedoresatribuidos,
    NULLIF(TRIM(p_observacao_interna), ''),
    NULLIF(TRIM(p_tipo_segmento), ''),
    p_segmento_id,
    COALESCE(p_IE_isento, FALSE),
    p_empresa_faturamento_id,
    p_desconto,
    p_condicao_padrao,
    v_status_aprovacao,
    v_ref_situacao_id,
    p_criado_por,
    p_requisitos_logisticos,
    NOW()
  )
  RETURNING cliente.cliente_id INTO v_cliente_id;

  IF p_telefone IS NOT NULL OR p_email IS NOT NULL OR p_telefone_adicional IS NOT NULL OR p_email_nf IS NOT NULL OR p_website IS NOT NULL OR p_observacao_contato IS NOT NULL THEN
    INSERT INTO public.cliente_contato (cliente_id, telefone, telefone_adicional, email, email_nf, website, observacao)
    VALUES (v_cliente_id, NULLIF(TRIM(p_telefone), ''), NULLIF(TRIM(p_telefone_adicional), ''), NULLIF(LOWER(TRIM(p_email)), ''), NULLIF(LOWER(TRIM(p_email_nf)), ''), NULLIF(TRIM(p_website), ''), NULLIF(TRIM(p_observacao_contato), ''))
    ON CONFLICT (cliente_id) DO UPDATE SET
      telefone = COALESCE(NULLIF(TRIM(p_telefone), ''), cliente_contato.telefone),
      telefone_adicional = COALESCE(NULLIF(TRIM(p_telefone_adicional), ''), cliente_contato.telefone_adicional),
      email = COALESCE(NULLIF(LOWER(TRIM(p_email)), ''), cliente_contato.email),
      email_nf = COALESCE(NULLIF(LOWER(TRIM(p_email_nf)), ''), cliente_contato.email_nf),
      website = COALESCE(NULLIF(TRIM(p_website), ''), cliente_contato.website),
      observacao = COALESCE(NULLIF(TRIM(p_observacao_contato), ''), cliente_contato.observacao);
  END IF;

  IF p_cep IS NOT NULL OR p_rua IS NOT NULL OR p_numero IS NOT NULL OR p_complemento IS NOT NULL OR p_bairro IS NOT NULL OR p_cidade IS NOT NULL OR p_uf IS NOT NULL THEN
    INSERT INTO public."cliente_endereço" (cliente_id, cep, rua, numero, complemento, bairro, cidade, uf, "ref_tipo_endereco_id_FK")
    VALUES (
      v_cliente_id,
      NULLIF(REPLACE(TRIM(COALESCE(p_cep, '')), '-', ''), ''),
      NULLIF(TRIM(p_rua), ''),
      NULLIF(TRIM(p_numero), ''),
      NULLIF(TRIM(p_complemento), ''),
      NULLIF(TRIM(p_bairro), ''),
      NULLIF(TRIM(p_cidade), ''),
      NULLIF(UPPER(TRIM(p_uf)), ''),
      p_ref_tipo_endereco_id_FK
    )
    ON CONFLICT (cliente_id) DO UPDATE SET
      cep = COALESCE(NULLIF(REPLACE(TRIM(COALESCE(p_cep, '')), '-', ''), ''), "cliente_endereço".cep),
      rua = COALESCE(NULLIF(TRIM(p_rua), ''), "cliente_endereço".rua),
      numero = COALESCE(NULLIF(TRIM(p_numero), ''), "cliente_endereço".numero),
      complemento = COALESCE(NULLIF(TRIM(p_complemento), ''), "cliente_endereço".complemento),
      bairro = COALESCE(NULLIF(TRIM(p_bairro), ''), "cliente_endereço".bairro),
      cidade = COALESCE(NULLIF(TRIM(p_cidade), ''), "cliente_endereço".cidade),
      uf = COALESCE(NULLIF(UPPER(TRIM(p_uf)), ''), "cliente_endereço".uf),
      "ref_tipo_endereco_id_FK" = COALESCE(p_ref_tipo_endereco_id_FK, "cliente_endereço"."ref_tipo_endereco_id_FK");
  END IF;

  IF p_condicoes_pagamento_ids IS NOT NULL AND array_length(p_condicoes_pagamento_ids, 1) > 0 THEN
    INSERT INTO public."condições_cliente" ("ID_cliente", "ID_condições")
    SELECT v_cliente_id, unnest(p_condicoes_pagamento_ids)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN QUERY
  SELECT c.cliente_id, c.nome, c.nome_fantasia, c.cpf_cnpj, c.codigo, c.status_aprovacao, c.created_at
  FROM public.cliente c
  WHERE c.cliente_id = v_cliente_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_cliente_v2: %', SQLERRM;
    RAISE;
END;
$function$
;

-- ---- create_conta_corrente_v2 ----
CREATE OR REPLACE FUNCTION public.create_conta_corrente_v2(p_cliente_id bigint, p_data date, p_valor numeric, p_titulo text, p_tipo_compromisso text, p_descricao_longa text DEFAULT NULL::text, p_vendedor_uuid uuid DEFAULT NULL::uuid, p_categoria_id uuid DEFAULT NULL::uuid, p_arquivos_anexos text[] DEFAULT ARRAY[]::text[], p_created_by uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id bigint, cliente_id bigint, cliente_nome text, cliente_grupo_rede text, vendedor_uuid uuid, data date, valor numeric, titulo text, descricao_longa text, tipo_compromisso text, categoria_id uuid, categoria_nome text, arquivos_anexos text[], valor_pago numeric, valor_pendente numeric, status text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ DECLARE v_new_id BIGINT; v_user_tipo TEXT; v_cliente_nome TEXT; v_grupo_rede_nome TEXT; BEGIN IF p_cliente_id IS NULL THEN RAISE EXCEPTION 'cliente_id é obrigatório'; END IF; IF p_data IS NULL THEN RAISE EXCEPTION 'data é obrigatória'; END IF; IF p_valor IS NULL OR p_valor <= 0 THEN RAISE EXCEPTION 'valor deve ser maior que zero'; END IF; IF p_titulo IS NULL OR LENGTH(TRIM(p_titulo)) < 2 THEN RAISE EXCEPTION 'título deve ter pelo menos 2 caracteres'; END IF; IF p_tipo_compromisso IS NULL OR LOWER(p_tipo_compromisso) NOT IN ('investimento', 'ressarcimento') THEN RAISE EXCEPTION 'tipo_compromisso deve ser "investimento" ou "ressarcimento"'; END IF; SELECT c.nome, c.nome_fantasia, gr.nome INTO v_cliente_nome, v_cliente_nome, v_grupo_rede_nome FROM public.cliente c LEFT JOIN public.grupos_redes gr ON gr.id = c.grupo_id WHERE c.cliente_id = p_cliente_id AND c.deleted_at IS NULL; IF NOT FOUND THEN RAISE EXCEPTION 'Cliente não encontrado'; END IF; IF p_created_by IS NOT NULL THEN SELECT u.tipo INTO v_user_tipo FROM public.user u WHERE u.user_id = p_created_by AND u.ativo = TRUE AND u.deleted_at IS NULL; IF NOT FOUND THEN RAISE EXCEPTION 'Usuário não encontrado ou inativo'; END IF; IF v_user_tipo = 'vendedor' THEN IF NOT EXISTS (SELECT 1 FROM public.cliente_vendedores cv WHERE cv.cliente_id = p_cliente_id AND cv.vendedor_id = p_created_by) THEN RAISE EXCEPTION 'Vendedor não tem permissão para criar compromisso para este cliente'; END IF; END IF; END IF; INSERT INTO public.conta_corrente_cliente (cliente_id, vendedor_uuid, data, valor, titulo, descricao_longa, tipo_compromisso, categoria_id, arquivos_anexos, created_at) VALUES (p_cliente_id, p_vendedor_uuid, p_data, p_valor, TRIM(p_titulo), p_descricao_longa, LOWER(p_tipo_compromisso), p_categoria_id, COALESCE(p_arquivos_anexos, ARRAY[]::TEXT[]), NOW()) RETURNING conta_corrente_cliente.id INTO v_new_id; RETURN QUERY SELECT ccc.id, ccc.cliente_id, COALESCE(c.nome, c.nome_fantasia, 'Cliente sem nome') AS cliente_nome, gr.nome AS cliente_grupo_rede, ccc.vendedor_uuid, ccc.data, ccc.valor, ccc.titulo, ccc.descricao_longa, INITCAP(ccc.tipo_compromisso) AS tipo_compromisso, ccc.categoria_id, cat.nome AS categoria_nome, COALESCE(ccc.arquivos_anexos, ARRAY[]::TEXT[]) AS arquivos_anexos, 0::NUMERIC AS valor_pago, ccc.valor AS valor_pendente, 'Pendente'::TEXT AS status, ccc.created_at FROM public.conta_corrente_cliente ccc INNER JOIN public.cliente c ON c.cliente_id = ccc.cliente_id LEFT JOIN public.grupos_redes gr ON gr.id = c.grupo_id LEFT JOIN public.categorias_conta_corrente cat ON cat.id = ccc.categoria_id AND cat.deleted_at IS NULL WHERE ccc.id = v_new_id; EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error in create_conta_corrente_v2: %', SQLERRM; RAISE; END; $function$
;

-- ---- create_empresas_v2 ----
CREATE OR REPLACE FUNCTION public.create_empresas_v2(p_cnpj text, p_razao_social text, p_nome_fantasia text DEFAULT NULL::text, p_inscricao_estadual text DEFAULT NULL::text, p_endereco jsonb DEFAULT '{}'::jsonb, p_contas_bancarias jsonb DEFAULT '[]'::jsonb, p_integracoes_erp jsonb DEFAULT '[]'::jsonb, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id bigint, cnpj text, razao_social text, nome_fantasia text, inscricao_estadual text, endereco jsonb, contas_bancarias jsonb, integracoes_erp jsonb, ativo boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_id BIGINT; v_cnpj_norm TEXT; v_user_tipo TEXT;
BEGIN
  IF p_cnpj IS NULL OR TRIM(p_cnpj) = '' THEN RAISE EXCEPTION 'CNPJ é obrigatório'; END IF;
  IF p_razao_social IS NULL OR LENGTH(TRIM(p_razao_social)) < 2 THEN RAISE EXCEPTION 'Razão social deve ter pelo menos 2 caracteres'; END IF;
  v_cnpj_norm := REGEXP_REPLACE(TRIM(p_cnpj), '\D', '', 'g');
  IF v_cnpj_norm <> '' AND EXISTS (SELECT 1 FROM public.ref_empresas_subsidiarias e WHERE REGEXP_REPLACE(TRIM(COALESCE(e.cnpj, '')), '\D', '', 'g') = v_cnpj_norm AND e.deleted_at IS NULL) THEN RAISE EXCEPTION 'Já existe uma empresa cadastrada com este CNPJ'; END IF;
  IF p_created_by IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo FROM public.user u WHERE u.user_id = p_created_by AND u.ativo = TRUE AND u.deleted_at IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'Usuário não encontrado ou inativo'; END IF;
    IF v_user_tipo != 'backoffice' THEN RAISE EXCEPTION 'Apenas usuários backoffice podem criar empresas'; END IF;
  END IF;
  INSERT INTO public.ref_empresas_subsidiarias (nome, cnpj, razao_social, nome_fantasia, inscricao_estadual, endereco, contas_bancarias, integracoes_erp, ativo, created_at, updated_at)
  VALUES (COALESCE(NULLIF(TRIM(p_nome_fantasia), ''), TRIM(p_razao_social)), TRIM(p_cnpj), TRIM(p_razao_social), NULLIF(TRIM(COALESCE(p_nome_fantasia, '')), ''), NULLIF(TRIM(COALESCE(p_inscricao_estadual, '')), ''), COALESCE(p_endereco, '{}'::JSONB), COALESCE(p_contas_bancarias, '[]'::JSONB), COALESCE(p_integracoes_erp, '[]'::JSONB), TRUE, NOW(), NOW())
  RETURNING ref_empresas_subsidiarias.id INTO v_id;
  RETURN QUERY SELECT e.id, e.cnpj, e.razao_social, e.nome_fantasia, e.inscricao_estadual, e.endereco, e.contas_bancarias, e.integracoes_erp, e.ativo, e.created_at, e.updated_at FROM public.ref_empresas_subsidiarias e WHERE e.id = v_id;
EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error in create_empresas_v2: %', SQLERRM; RAISE;
END;
$function$
;

-- ---- create_grupos_redes_v2 ----
CREATE OR REPLACE FUNCTION public.create_grupos_redes_v2(p_nome text, p_descricao text DEFAULT NULL::text, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, nome text, descricao text, ativo boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_grupo_id UUID;
  v_user_tipo TEXT;
BEGIN
  IF p_nome IS NULL OR LENGTH(TRIM(p_nome)) < 2 THEN
    RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.grupos_redes gr
    WHERE LOWER(TRIM(gr.nome)) = LOWER(TRIM(p_nome))
      AND gr.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Grupo/rede com este nome já existe';
  END IF;

  IF p_created_by IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_created_by
      AND u.ativo = TRUE
      AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    IF v_user_tipo NOT IN ('backoffice', 'vendedor') THEN
      RAISE EXCEPTION 'Tipo de usuário inválido para criar grupos/redes';
    END IF;
  END IF;

  INSERT INTO public.grupos_redes (
    nome, descricao, ativo, created_at, updated_at
  ) VALUES (
    TRIM(p_nome),
    NULLIF(TRIM(p_descricao), ''),
    TRUE,
    NOW(),
    NOW()
  )
  RETURNING grupos_redes.id INTO v_grupo_id;

  RETURN QUERY
  SELECT g.id, g.nome, g.descricao, g.ativo, g.created_at, g.updated_at
  FROM public.grupos_redes g
  WHERE g.id = v_grupo_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_grupos_redes_v2: %', SQLERRM;
    RAISE;
END;
$function$
;

-- ---- create_lancamento_comissao_v2 ----
CREATE OR REPLACE FUNCTION public.create_lancamento_comissao_v2(p_vendedor_uuid uuid, p_tipo text, p_valor numeric, p_descricao text, p_periodo text, p_criado_por uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_lancamento_id bigint;
    v_status_periodo text;
BEGIN
    -- Verificar se o período está fechado
    SELECT status INTO v_status_periodo
    FROM public.controle_comissao_periodo
    WHERE vendedor_uuid = p_vendedor_uuid AND periodo = p_periodo;
    
    IF v_status_periodo IN ('fechado', 'pago') THEN
        RAISE EXCEPTION 'Não é possível adicionar lançamentos em um período fechado ou pago.';
    END IF;

    -- Inserir lançamento
    INSERT INTO public.lancamentos_comissao (
        vendedor_uuid,
        tipo,
        valor,
        descricao,
        periodo,
        criado_por
    ) VALUES (
        p_vendedor_uuid,
        p_tipo,
        p_valor,
        p_descricao,
        p_periodo,
        p_criado_por
    ) RETURNING id INTO v_lancamento_id;

    RETURN json_build_object('success', true, 'id', v_lancamento_id);
END;
$function$
;

-- ---- create_lista_preco_v2 ----
CREATE OR REPLACE FUNCTION public.create_lista_preco_v2(p_nome text, p_desconto numeric DEFAULT 0, p_ativo boolean DEFAULT true, p_codigo_sequencial text DEFAULT NULL::text, p_produtos jsonb DEFAULT '[]'::jsonb, p_tipo_comissao text DEFAULT 'fixa'::text, p_percentual_fixo numeric DEFAULT NULL::numeric, p_faixas_comissao jsonb DEFAULT '[]'::jsonb)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lista_preco_id BIGINT;
  v_result JSON;
  v_produto_item JSONB;
  v_faixa_item JSONB;
BEGIN
  -- Validações
  IF p_nome IS NULL OR LENGTH(TRIM(p_nome)) < 3 THEN
    RAISE EXCEPTION 'Nome da lista de preço deve ter pelo menos 3 caracteres';
  END IF;

  IF p_tipo_comissao NOT IN ('fixa', 'conforme_desconto') THEN
    RAISE EXCEPTION 'Tipo de comissão inválido. Use: fixa ou conforme_desconto';
  END IF;

  -- Validar percentual fixo apenas se tipo for fixa
  IF p_tipo_comissao = 'fixa' THEN
    IF p_percentual_fixo IS NULL THEN
      RAISE EXCEPTION 'Percentual fixo é obrigatório quando tipo de comissão é fixa';
    END IF;
    IF p_percentual_fixo < 0 OR p_percentual_fixo > 100 THEN
      RAISE EXCEPTION 'Percentual fixo deve estar entre 0 e 100';
    END IF;
  END IF;

  -- Verificar duplicidade de nome
  IF EXISTS (
    SELECT 1 FROM listas_preco 
    WHERE LOWER(TRIM(nome)) = LOWER(TRIM(p_nome))
  ) THEN
    RAISE EXCEPTION 'Já existe uma lista de preço com este nome';
  END IF;

  -- Criar lista de preço
  INSERT INTO listas_preco (
    nome,
    desconto,
    ativo,
    codigo_sequencial
  ) VALUES (
    TRIM(p_nome),
    COALESCE(p_desconto, 0),
    COALESCE(p_ativo, true),
    p_codigo_sequencial
  )
  RETURNING id INTO v_lista_preco_id;

  -- Inserir produtos
  IF p_produtos IS NOT NULL AND jsonb_typeof(p_produtos) = 'array' AND jsonb_array_length(p_produtos) > 0 THEN
    FOR v_produto_item IN SELECT * FROM jsonb_array_elements(p_produtos)
    LOOP
      INSERT INTO produtos_listas_precos (
        lista_preco_id,
        produto_id,
        preco
      ) VALUES (
        v_lista_preco_id,
        (v_produto_item->>'produtoId')::BIGINT,
        (v_produto_item->>'preco')::NUMERIC
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- Inserir faixas de comissão (se tipo for conforme_desconto)
  IF p_tipo_comissao = 'conforme_desconto' AND p_faixas_comissao IS NOT NULL AND jsonb_typeof(p_faixas_comissao) = 'array' AND jsonb_array_length(p_faixas_comissao) > 0 THEN
    FOR v_faixa_item IN SELECT * FROM jsonb_array_elements(p_faixas_comissao)
    LOOP
      INSERT INTO listas_preco_comissionamento (
        lista_preco_id,
        desconto_minimo,
        desconto_maximo,
        comissao
      ) VALUES (
        v_lista_preco_id,
        (v_faixa_item->>'descontoMin')::NUMERIC,
        CASE 
          WHEN v_faixa_item->>'descontoMax' IS NULL OR v_faixa_item->>'descontoMax' = 'null' THEN NULL
          ELSE (v_faixa_item->>'descontoMax')::NUMERIC
        END,
        (v_faixa_item->>'percentualComissao')::NUMERIC
      );
    END LOOP;
  END IF;

  -- Retornar dados criados
  SELECT JSON_BUILD_OBJECT(
    'lista', JSON_BUILD_OBJECT(
      'id', lp.id,
      'nome', lp.nome,
      'desconto', lp.desconto,
      'ativo', lp.ativo,
      'codigo_sequencial', lp.codigo_sequencial,
      'created_at', lp.data_criacao,
      'updated_at', lp.data_criacao
    ),
    'produtos', COALESCE(
      (SELECT JSON_AGG(JSON_BUILD_OBJECT(
        'produto_id', plp.produto_id,
        'preco', plp.preco
      )) FROM produtos_listas_precos plp WHERE plp.lista_preco_id = v_lista_preco_id),
      '[]'::JSON
    ),
    'faixas_comissao', COALESCE(
      (SELECT JSON_AGG(JSON_BUILD_OBJECT(
        'id', lpc.id,
        'desconto_minimo', lpc.desconto_minimo,
        'desconto_maximo', lpc.desconto_maximo,
        'comissao', lpc.comissao
      )) FROM listas_preco_comissionamento lpc WHERE lpc.lista_preco_id = v_lista_preco_id),
      '[]'::JSON
    )
  )
  INTO v_result
  FROM listas_preco lp
  WHERE lp.id = v_lista_preco_id;

  RETURN v_result;
END;
$function$
;

-- ---- create_meta_vendedor_v2 ----
CREATE OR REPLACE FUNCTION public.create_meta_vendedor_v2(p_vendedor_id uuid, p_ano integer, p_mes integer, p_meta_valor numeric, p_meta_percentual_crescimento numeric DEFAULT NULL::numeric, p_periodo_referencia text DEFAULT NULL::text, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id integer, vendedor_id uuid, vendedor_nome text, ano integer, mes integer, meta_valor numeric, meta_percentual_crescimento numeric, periodo_referencia text, data_criacao timestamp with time zone, data_atualizacao timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_meta_id INTEGER;
  v_user_tipo TEXT;
  v_vendedor_nome TEXT;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_vendedor_id IS NULL THEN
    RAISE EXCEPTION 'vendedor_id é obrigatório';
  END IF;

  IF p_ano IS NULL OR p_ano < 2000 OR p_ano > 2100 THEN
    RAISE EXCEPTION 'Ano inválido (deve ser entre 2000 e 2100)';
  END IF;

  IF p_mes IS NULL OR p_mes < 1 OR p_mes > 12 THEN
    RAISE EXCEPTION 'Mês inválido (deve ser entre 1 e 12)';
  END IF;

  IF p_meta_valor IS NULL OR p_meta_valor < 0 THEN
    RAISE EXCEPTION 'meta_valor deve ser um número maior ou igual a 0';
  END IF;

  -- 2. VERIFICAR SE VENDEDOR EXISTE E OBTER NOME
  -- Usar LEFT JOIN para permitir vendedores sem registro em dados_vendedor
  SELECT 
    COALESCE(dv.nome, u.nome, u.email, 'Vendedor') AS nome,
    u.tipo
  INTO v_vendedor_nome, v_user_tipo
  FROM public.user u
  LEFT JOIN public.dados_vendedor dv ON dv.user_id = u.user_id AND dv.deleted_at IS NULL
  WHERE u.user_id = p_vendedor_id
  AND u.ativo = TRUE
  AND u.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vendedor não encontrado ou inativo';
  END IF;

  -- Verificar se é realmente um vendedor
  IF v_user_tipo != 'vendedor' THEN
    RAISE EXCEPTION 'Usuário não é um vendedor';
  END IF;

  -- 3. VERIFICAR PERMISSÕES (se created_by fornecido)
  IF p_created_by IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_created_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem criar metas';
    END IF;
  END IF;

  -- 4. VERIFICAR UNICIDADE (vendedor_id + ano + mês)
  IF EXISTS (
    SELECT 1 FROM public.metas_vendedor m
    WHERE m.vendedor_id = p_vendedor_id
    AND m.ano = p_ano
    AND m.mes = p_mes
  ) THEN
    RAISE EXCEPTION 'Já existe uma meta para este vendedor no período especificado';
  END IF;

  -- 5. CRIAR META
  INSERT INTO public.metas_vendedor (
    vendedor_id,
    ano,
    mes,
    meta_valor,
    meta_percentual_crescimento,
    periodo_referencia,
    data_criacao,
    data_atualizacao
  ) VALUES (
    p_vendedor_id,
    p_ano,
    p_mes,
    p_meta_valor,
    p_meta_percentual_crescimento,
    p_periodo_referencia,
    NOW(),
    NOW()
  )
  RETURNING metas_vendedor.id INTO v_meta_id;

  -- 6. RETORNAR DADOS DA META CRIADA
  RETURN QUERY
  SELECT 
    m.id,
    m.vendedor_id,
    COALESCE(dv.nome, u.nome, u.email, 'Vendedor') AS vendedor_nome,
    m.ano,
    m.mes,
    m.meta_valor,
    m.meta_percentual_crescimento,
    m.periodo_referencia,
    m.data_criacao,
    m.data_atualizacao
  FROM public.metas_vendedor m
  LEFT JOIN public.dados_vendedor dv ON dv.user_id = m.vendedor_id AND dv.deleted_at IS NULL
  LEFT JOIN public.user u ON u.user_id = m.vendedor_id
  WHERE m.id = v_meta_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_meta_vendedor_v2: %', SQLERRM;
    RAISE;
END;
$function$
;

-- ---- create_natureza_operacao_v2 ----
CREATE OR REPLACE FUNCTION public.create_natureza_operacao_v2(p_nome text, p_codigo text DEFAULT NULL::text, p_descricao text DEFAULT NULL::text, p_gera_comissao boolean DEFAULT true, p_gera_receita boolean DEFAULT true, p_tiny_id text DEFAULT NULL::text, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id bigint, nome text, codigo text, descricao text, gera_comissao boolean, gera_receita boolean, ativo boolean, tiny_id text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_natureza_id BIGINT;
  v_user_tipo TEXT;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_nome IS NULL OR LENGTH(TRIM(p_nome)) < 2 THEN
    RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
  END IF;

  -- Verificar se nome já existe (case-insensitive)
  IF EXISTS (
    SELECT 1 FROM public.natureza_operacao n
    WHERE LOWER(TRIM(n.nome)) = LOWER(TRIM(p_nome))
    AND n.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Natureza de operação com este nome já existe';
  END IF;

  -- Verificar se código já existe (se fornecido)
  IF p_codigo IS NOT NULL AND TRIM(p_codigo) != '' THEN
    IF EXISTS (
      SELECT 1 FROM public.natureza_operacao n
      WHERE n.codigo = TRIM(p_codigo)
      AND n.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Natureza de operação com este código já existe';
    END IF;
  END IF;

  -- 2. VERIFICAR PERMISSÕES (se created_by fornecido)
  IF p_created_by IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_created_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem criar naturezas de operação';
    END IF;
  END IF;

  -- 3. CRIAR NATUREZA DE OPERAÇÃO
  INSERT INTO public.natureza_operacao (
    nome,
    codigo,
    descricao,
    tem_comissao,
    gera_receita,
    ativo,
    tiny_id,
    created_at,
    updated_at
  ) VALUES (
    TRIM(p_nome),
    NULLIF(TRIM(p_codigo), ''),
    NULLIF(TRIM(p_descricao), ''),
    COALESCE(p_gera_comissao, TRUE),
    COALESCE(p_gera_receita, TRUE),
    TRUE,
    NULLIF(TRIM(p_tiny_id), ''),
    NOW(),
    NOW()
  )
  RETURNING natureza_operacao.id INTO v_natureza_id;

  -- 4. RETORNAR DADOS DA NATUREZA CRIADA
  RETURN QUERY
  SELECT 
    n.id,
    n.nome,
    n.codigo,
    n.descricao,
    n.tem_comissao AS gera_comissao,
    n.gera_receita,
    n.ativo,
    n.tiny_id,
    n.created_at,
    n.updated_at
  FROM public.natureza_operacao n
  WHERE n.id = v_natureza_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_natureza_operacao_v2: %', SQLERRM;
    RAISE;
END;
$function$
;

-- ---- create_pagamento_comissao_v2 ----
CREATE OR REPLACE FUNCTION public.create_pagamento_comissao_v2(p_vendedor_uuid uuid, p_valor numeric, p_periodo text, p_forma_pagamento text, p_comprovante_url text, p_observacoes text, p_realizado_por uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_pagamento_id bigint;
BEGIN
    -- Inserir pagamento
    INSERT INTO public.pagamentos_comissao (
        vendedor_uuid,
        data_pagamento,
        valor,
        periodo,
        forma_pagamento,
        comprovante_url,
        observacoes,
        realizado_por
    ) VALUES (
        p_vendedor_uuid,
        CURRENT_DATE,
        p_valor,
        p_periodo,
        p_forma_pagamento,
        p_comprovante_url,
        p_observacoes,
        p_realizado_por
    ) RETURNING id INTO v_pagamento_id;

    -- Atualizar status do período se saldo for totalmente pago (Lógica simplificada, pode ser expandida)
    -- Por enquanto apenas registra o pagamento

    RETURN json_build_object('success', true, 'id', v_pagamento_id);
END;
$function$
;

-- ---- create_pagamento_conta_corrente_v2 ----
CREATE OR REPLACE FUNCTION public.create_pagamento_conta_corrente_v2(p_conta_corrente_id bigint, p_data_pagamento date, p_forma_pagamento text, p_valor_pago numeric, p_arquivo_comprovante text DEFAULT NULL::text, p_categoria_id uuid DEFAULT NULL::uuid, p_forma_pagamento_id bigint DEFAULT NULL::bigint, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id bigint, conta_corrente_id bigint, data_pagamento date, forma_pagamento text, valor_pago numeric, categoria_id uuid, categoria_nome text, arquivo_comprovante text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ DECLARE v_new_id BIGINT; v_user_tipo TEXT; v_cliente_id BIGINT; v_valor_compromisso NUMERIC; v_valor_total_pago NUMERIC; v_forma_pagamento_nome TEXT; BEGIN IF p_conta_corrente_id IS NULL THEN RAISE EXCEPTION 'conta_corrente_id é obrigatório'; END IF; IF p_data_pagamento IS NULL THEN RAISE EXCEPTION 'data_pagamento é obrigatória'; END IF; IF p_forma_pagamento_id IS NOT NULL THEN SELECT ref_fp.nome INTO v_forma_pagamento_nome FROM public.ref_forma_pagamento ref_fp WHERE ref_fp.id = p_forma_pagamento_id AND (ref_fp.ativo IS NULL OR ref_fp.ativo = TRUE); IF NOT FOUND THEN RAISE EXCEPTION 'Forma de pagamento não encontrada ou inativa'; END IF; IF p_forma_pagamento IS NULL OR LENGTH(TRIM(p_forma_pagamento)) = 0 THEN ELSE v_forma_pagamento_nome := p_forma_pagamento; END IF; ELSE IF p_forma_pagamento IS NULL OR LENGTH(TRIM(p_forma_pagamento)) < 2 THEN RAISE EXCEPTION 'forma_pagamento é obrigatória e deve ter pelo menos 2 caracteres'; END IF; v_forma_pagamento_nome := TRIM(p_forma_pagamento); END IF; IF p_valor_pago IS NULL OR p_valor_pago <= 0 THEN RAISE EXCEPTION 'valor_pago deve ser maior que zero'; END IF; SELECT ccc.cliente_id, ccc.valor INTO v_cliente_id, v_valor_compromisso FROM public.conta_corrente_cliente ccc WHERE ccc.id = p_conta_corrente_id; IF NOT FOUND THEN RAISE EXCEPTION 'Compromisso não encontrado'; END IF; IF p_created_by IS NOT NULL THEN SELECT u.tipo INTO v_user_tipo FROM public.user u WHERE u.user_id = p_created_by AND u.ativo = TRUE AND u.deleted_at IS NULL; IF NOT FOUND THEN RAISE EXCEPTION 'Usuário não encontrado ou inativo'; END IF; IF v_user_tipo = 'vendedor' THEN IF NOT EXISTS (SELECT 1 FROM public.cliente_vendedores cv WHERE cv.cliente_id = v_cliente_id AND cv.vendedor_id = p_created_by) THEN RAISE EXCEPTION 'Vendedor não tem permissão para criar pagamento para este compromisso'; END IF; END IF; END IF; SELECT COALESCE(SUM(pac.valor_pago), 0) INTO v_valor_total_pago FROM public.pagamento_acordo_cliente pac WHERE pac.conta_corrente_id = p_conta_corrente_id; IF (v_valor_total_pago + p_valor_pago) > v_valor_compromisso THEN RAISE EXCEPTION 'Valor total pago não pode exceder o valor do compromisso'; END IF; INSERT INTO public.pagamento_acordo_cliente (conta_corrente_id, data_pagamento, forma_pagamento, forma_pagamento_id, valor_pago, categoria_id, arquivo_comprovante, created_at) VALUES (p_conta_corrente_id, p_data_pagamento, v_forma_pagamento_nome, p_forma_pagamento_id, p_valor_pago, p_categoria_id, p_arquivo_comprovante, NOW()) RETURNING pagamento_acordo_cliente.id INTO v_new_id; RETURN QUERY SELECT pac.id AS id, pac.conta_corrente_id AS conta_corrente_id, pac.data_pagamento AS data_pagamento, pac.forma_pagamento AS forma_pagamento, pac.valor_pago AS valor_pago, pac.categoria_id AS categoria_id, cat.nome AS categoria_nome, pac.arquivo_comprovante AS arquivo_comprovante, pac.created_at AS created_at FROM public.pagamento_acordo_cliente pac LEFT JOIN public.categorias_conta_corrente cat ON cat.id = pac.categoria_id AND cat.deleted_at IS NULL WHERE pac.id = v_new_id; EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error in create_pagamento_conta_corrente_v2: %', SQLERRM; RAISE; END; $function$
;

-- ---- create_pedido_venda_v2 ----
CREATE OR REPLACE FUNCTION public.create_pedido_venda_v2(p_cliente_id bigint, p_vendedor_uuid uuid, p_natureza_operacao text, p_numero_pedido text DEFAULT NULL::text, p_empresa_faturamento_id bigint DEFAULT NULL::bigint, p_lista_preco_id bigint DEFAULT NULL::bigint, p_percentual_desconto_padrao numeric DEFAULT 0, p_id_condicao bigint DEFAULT NULL::bigint, p_ordem_cliente text DEFAULT NULL::text, p_observacao text DEFAULT NULL::text, p_observacao_interna text DEFAULT NULL::text, p_data_venda date DEFAULT NULL::date, p_status text DEFAULT 'Rascunho'::text, p_valor_total numeric DEFAULT 0, p_valor_total_produtos numeric DEFAULT 0, p_percentual_desconto_extra numeric DEFAULT 0, p_valor_desconto_extra numeric DEFAULT 0, p_total_quantidades numeric DEFAULT 0, p_total_itens integer DEFAULT 0, p_peso_bruto_total numeric DEFAULT 0, p_peso_liquido_total numeric DEFAULT 0, p_produtos jsonb DEFAULT NULL::jsonb, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$DECLARE
  v_pedido_id BIGINT;
  v_cliente_nome TEXT;
  v_cliente_cnpj TEXT;
  v_cliente_inscricao_estadual TEXT;
  v_vendedor_nome TEXT;
  v_natureza_operacao_nome TEXT;
  v_empresa_faturamento_nome TEXT;
  v_lista_preco_nome TEXT;
  v_condicao_pagamento_nome TEXT;
  v_produto JSONB;
  v_numero_item INTEGER;
BEGIN
  -- Validações básicas
  IF p_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_id é obrigatório';
  END IF;

  IF p_vendedor_uuid IS NULL THEN
    RAISE EXCEPTION 'vendedor_uuid é obrigatório';
  END IF;

  IF p_natureza_operacao IS NULL OR TRIM(p_natureza_operacao) = '' THEN
    RAISE EXCEPTION 'natureza_operacao é obrigatória';
  END IF;

  -- Verificar se cliente existe
  SELECT c.nome, c.cpf_cnpj, c.inscricao_estadual
  INTO v_cliente_nome, v_cliente_cnpj, v_cliente_inscricao_estadual
  FROM public.cliente c
  WHERE c.cliente_id = p_cliente_id
    AND c.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente não encontrado';
  END IF;

  -- Verificar se vendedor existe
  SELECT COALESCE(dv.nome, u.nome, u.email, 'Vendedor não identificado')
  INTO v_vendedor_nome
  FROM public.user u
  LEFT JOIN public.dados_vendedor dv ON dv.user_id = u.user_id AND dv.deleted_at IS NULL
  WHERE u.user_id = p_vendedor_uuid
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vendedor não encontrado ou inativo';
  END IF;

  -- Verificar se natureza de operação existe
  SELECT no.nome INTO v_natureza_operacao_nome
  FROM public.natureza_operacao no
  WHERE no.nome = p_natureza_operacao
    AND no.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Natureza de operação não encontrada';
  END IF;

  -- Buscar nome da empresa de faturamento (se fornecida)
  IF p_empresa_faturamento_id IS NOT NULL THEN
    SELECT COALESCE(emp.razao_social, emp.nome_fantasia)
    INTO v_empresa_faturamento_nome
    FROM public.ref_empresas_subsidiarias emp
    WHERE emp.id = p_empresa_faturamento_id
      AND emp.deleted_at IS NULL;
  END IF;

  -- Buscar nome da lista de preço (se fornecida)
  IF p_lista_preco_id IS NOT NULL THEN
    SELECT lp.nome INTO v_lista_preco_nome
    FROM public.listas_preco lp
    WHERE lp.id = p_lista_preco_id;
  END IF;

  -- Buscar nome da condição de pagamento (se fornecida)
  IF p_id_condicao IS NOT NULL THEN
    SELECT cp."Descrição" INTO v_condicao_pagamento_nome
    FROM public."Condicao_De_Pagamento" cp
    WHERE cp."Condição_ID" = p_id_condicao;
  END IF;

  -- Inserir pedido
  INSERT INTO public.pedido_venda (
    cliente_id,
    vendedor_uuid,
    natureza_operacao,
    numero_pedido,
    empresa_faturamento_id,
    lista_preco_id,
    percentual_desconto_padrao,
    id_condicao,
    ordem_cliente,
    observacao,
    observacao_interna,
    data_venda,
    status,
    valor_total,
    valor_total_produtos,
    percentual_desconto_extra,
    valor_desconto_extra,
    total_quantidades,
    total_itens,
    peso_bruto_total,
    peso_liquido_total,
    nome_cliente,
    cnpj_cliente,
    inscricao_estadual_cliente,
    nome_vendedor,
    nome_natureza_operacao,
    nome_empresa_faturamento,
    empresa_faturou,
    nome_lista_preco,
    nome_condicao_pagamento,
    timestamp,
    created_by
  ) VALUES (
    p_cliente_id,
    p_vendedor_uuid,
    p_natureza_operacao,
    p_numero_pedido,
    p_empresa_faturamento_id,
    p_lista_preco_id,
    p_percentual_desconto_padrao,
    p_id_condicao,
    p_ordem_cliente,
    p_observacao,
    p_observacao_interna,
    COALESCE(p_data_venda, CURRENT_DATE),
    COALESCE(p_status, 'Rascunho'),
    p_valor_total,
    p_valor_total_produtos,
    p_percentual_desconto_extra,
    p_valor_desconto_extra,
    p_total_quantidades,
    p_total_itens,
    p_peso_bruto_total,
    p_peso_liquido_total,
    v_cliente_nome,
    v_cliente_cnpj,
    v_cliente_inscricao_estadual,
    v_vendedor_nome,
    v_natureza_operacao_nome,
    v_empresa_faturamento_nome,
    v_empresa_faturamento_nome,
    v_lista_preco_nome,
    v_condicao_pagamento_nome,
    NOW(),
    p_created_by
  )
  RETURNING "pedido_venda_ID" INTO v_pedido_id;

  -- Inserir produtos (se fornecidos)
  IF p_produtos IS NOT NULL AND jsonb_array_length(p_produtos) > 0 THEN
    v_numero_item := 1;
    FOR v_produto IN SELECT * FROM jsonb_array_elements(p_produtos)
    LOOP
      INSERT INTO public.pedido_venda_produtos (
        pedido_venda_id,
        numero,
        produto_id,
        descricao,
        codigo_sku,
        codigo_ean,
        valor_tabela,
        percentual_desconto,
        valor_unitario,
        quantidade,
        subtotal,
        peso_bruto,
        peso_liquido,
        unidade
      ) VALUES (
        v_pedido_id,
        v_numero_item,
        (v_produto->>'produtoId')::BIGINT,
        v_produto->>'descricaoProduto',
        v_produto->>'codigoSku',
        NULLIF(v_produto->>'codigoEan', ''),
        COALESCE((v_produto->>'valorTabela')::NUMERIC, 0),
        COALESCE((v_produto->>'percentualDesconto')::NUMERIC, 0),
        COALESCE((v_produto->>'valorUnitario')::NUMERIC, 0),
        COALESCE((v_produto->>'quantidade')::NUMERIC, 0),
        COALESCE((v_produto->>'subtotal')::NUMERIC, 0),
        COALESCE((v_produto->>'pesoBruto')::NUMERIC, 0),
        COALESCE((v_produto->>'pesoLiquido')::NUMERIC, 0),
        v_produto->>'unidade'
      );
      v_numero_item := v_numero_item + 1;
    END LOOP;
  END IF;

  -- Retornar pedido criado
  RETURN (
    SELECT JSON_BUILD_OBJECT(
      'pedido', (
        SELECT JSON_BUILD_OBJECT(
          'id', pv."pedido_venda_ID"::TEXT,
          'numero', pv.numero_pedido,
          'clienteId', pv.cliente_id::TEXT,
          'nomeCliente', pv.nome_cliente,
          'vendedorId', pv.vendedor_uuid::TEXT,
          'nomeVendedor', pv.nome_vendedor,
          'naturezaOperacao', pv.natureza_operacao,
          'valorPedido', pv.valor_total,
          'status', pv.status,
          'dataPedido', pv.data_venda,
          'createdAt', pv.timestamp
        )
        FROM public.pedido_venda pv
        WHERE pv."pedido_venda_ID" = v_pedido_id
      )
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_pedido_venda_v2: %', SQLERRM;
    RAISE;
END;$function$
;

-- ---- create_segmento_cliente_v2 ----
CREATE OR REPLACE FUNCTION public.create_segmento_cliente_v2(p_nome text, p_descricao text DEFAULT NULL::text, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id bigint, nome text, descricao text, ativo boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_segmento_id BIGINT;
  v_user_tipo TEXT;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_nome IS NULL OR LENGTH(TRIM(p_nome)) < 2 THEN
    RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
  END IF;

  -- Verificar se nome já existe (case-insensitive)
  IF EXISTS (
    SELECT 1 FROM public.segmento_cliente sc
    WHERE LOWER(TRIM(sc.nome)) = LOWER(TRIM(p_nome))
    AND sc.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Segmento de cliente com este nome já existe';
  END IF;

  -- 2. VERIFICAR PERMISSÕES (se created_by fornecido) - CORRIGIDO: qualificado com alias
  IF p_created_by IS NOT NULL THEN
    SELECT tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_created_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem criar segmentos de cliente';
    END IF;
  END IF;

  -- 3. CRIAR SEGMENTO DE CLIENTE
  INSERT INTO public.segmento_cliente (
    nome,
    descricao,
    ativo,
    created_at,
    updated_at
  ) VALUES (
    TRIM(p_nome),
    NULLIF(TRIM(p_descricao), ''),
    TRUE,
    NOW(),
    NOW()
  )
  RETURNING segmento_cliente.id INTO v_segmento_id;

  -- 4. RETORNAR DADOS DO SEGMENTO CRIADO
  RETURN QUERY
  SELECT 
    s.id,
    s.nome,
    s.descricao,
    s.ativo,
    s.created_at,
    s.updated_at
  FROM public.segmento_cliente s
  WHERE s.id = v_segmento_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_segmento_cliente_v2: %', SQLERRM;
    RAISE;
END;
$function$
;

-- ---- create_tipos_veiculo_v2 ----
CREATE OR REPLACE FUNCTION public.create_tipos_veiculo_v2(p_nome text, p_descricao text DEFAULT NULL::text, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, nome text, descricao text, ativo boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE v_id UUID; v_user_tipo TEXT; BEGIN IF p_nome IS NULL OR LENGTH(TRIM(p_nome)) < 2 THEN RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres'; END IF; IF EXISTS ( SELECT 1 FROM public.tipos_veiculo tv WHERE LOWER(TRIM(tv.nome)) = LOWER(TRIM(p_nome)) AND tv.deleted_at IS NULL ) THEN RAISE EXCEPTION 'Tipo de veículo com este nome já existe'; END IF; IF p_created_by IS NOT NULL THEN SELECT u.tipo INTO v_user_tipo FROM public.user u WHERE u.user_id = p_created_by AND u.ativo = TRUE AND u.deleted_at IS NULL; IF NOT FOUND THEN RAISE EXCEPTION 'Usuário não encontrado ou inativo'; END IF; IF v_user_tipo != 'backoffice' THEN RAISE EXCEPTION 'Apenas usuários backoffice podem criar tipos de veículo'; END IF; END IF; INSERT INTO public.tipos_veiculo (nome, descricao, ativo, created_at, updated_at) VALUES (TRIM(p_nome), NULLIF(TRIM(p_descricao), ''), TRUE, NOW(), NOW()) RETURNING tipos_veiculo.id INTO v_id; RETURN QUERY SELECT t.id, t.nome, t.descricao, t.ativo, t.created_at, t.updated_at FROM public.tipos_veiculo t WHERE t.id = v_id; EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error in create_tipos_veiculo_v2: %', SQLERRM; RAISE; END; $function$
;

-- ---- create_user_v2 ----
CREATE OR REPLACE FUNCTION public.create_user_v2(p_email text, p_nome text, p_tipo text, p_ref_user_role_id bigint DEFAULT NULL::bigint, p_user_login text DEFAULT NULL::text, p_created_by uuid DEFAULT NULL::uuid, p_auth_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(user_id uuid, nome text, email text, tipo text, ativo boolean, data_cadastro timestamp with time zone, ref_user_role_id bigint, user_login text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_email_exists BOOLEAN;
BEGIN
  IF p_email IS NULL OR TRIM(p_email) = '' THEN
    RAISE EXCEPTION 'Email é obrigatório';
  END IF;

  IF p_nome IS NULL OR LENGTH(TRIM(p_nome)) < 2 THEN
    RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
  END IF;

  IF p_tipo IS NULL OR p_tipo NOT IN ('backoffice', 'vendedor') THEN
    RAISE EXCEPTION 'Tipo deve ser "backoffice" ou "vendedor"';
  END IF;

  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Formato de email inválido';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public."user" u2
    WHERE LOWER(u2.email) = LOWER(p_email)
      AND u2.deleted_at IS NULL
  ) INTO v_email_exists;

  IF v_email_exists THEN
    RAISE EXCEPTION 'Email já cadastrado';
  END IF;

  IF p_created_by IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public."user" u3
      WHERE u3.user_id = p_created_by
        AND u3.tipo = 'backoffice'
        AND u3.ativo = TRUE
        AND u3.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem criar usuários';
    END IF;
  END IF;

  INSERT INTO public."user" (
    user_id,
    email,
    nome,
    tipo,
    ref_user_role_id,
    user_login,
    ativo,
    data_cadastro,
    deleted_at,
    deleted_by,
    permissoes
  ) VALUES (
    COALESCE(p_auth_user_id, gen_random_uuid()),
    LOWER(TRIM(p_email)),
    TRIM(p_nome),
    p_tipo,
    p_ref_user_role_id,
    COALESCE(p_user_login, LOWER(TRIM(p_email))),
    TRUE,
    NOW(),
    NULL,
    NULL,
    '[]'::jsonb
  )
  ON CONFLICT ON CONSTRAINT user_pkey DO UPDATE SET
    email            = EXCLUDED.email,
    nome             = EXCLUDED.nome,
    tipo             = EXCLUDED.tipo,
    ref_user_role_id = EXCLUDED.ref_user_role_id,
    user_login       = EXCLUDED.user_login,
    ativo            = TRUE,
    data_cadastro    = NOW(),
    deleted_at       = NULL,
    deleted_by       = NULL,
    permissoes       = '[]'::jsonb
  RETURNING public."user".user_id INTO v_user_id;

  RETURN QUERY
  SELECT
    u.user_id,
    u.nome,
    u.email,
    u.tipo,
    u.ativo,
    u.data_cadastro,
    u.ref_user_role_id,
    u.user_login
  FROM public."user" u
  WHERE u.user_id = v_user_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_user_v2: %', SQLERRM;
    RAISE;
END;
$function$
;

-- ---- default_user_permissions_v2 ----
CREATE OR REPLACE FUNCTION public.default_user_permissions_v2(p_tipo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
  IF p_tipo = 'backoffice' THEN
    RETURN to_jsonb(ARRAY[
      'clientes.visualizar','clientes.criar','clientes.editar','clientes.excluir','clientes.todos','clientes.aprovar',
      'vendas.visualizar','vendas.criar','vendas.editar','vendas.excluir','vendas.todas',
      'relatorios.visualizar','relatorios.todos',
      'config.minhas_empresas','config.geral',
      'usuarios.visualizar','usuarios.criar','usuarios.editar','usuarios.excluir','usuarios.permissoes',
      'contacorrente.visualizar','contacorrente.criar','contacorrente.editar','contacorrente.excluir',
      'produtos.visualizar','produtos.criar','produtos.editar','produtos.excluir',
      'comissoes.visualizar','comissoes.lancamentos.editar','comissoes.lancamentos.excluir',
      'configuracoes.editar','configuracoes.excluir'
    ]);
  END IF;

  RETURN to_jsonb(ARRAY[
    'clientes.visualizar','clientes.criar','clientes.editar',
    'vendas.visualizar','vendas.criar','vendas.editar',
    'produtos.visualizar',
    'comissoes.visualizar',
    'relatorios.visualizar',
    'contacorrente.visualizar','contacorrente.criar'
  ]);
END;
$function$
;

-- ---- delete_categorias_conta_corrente_v2 ----
CREATE OR REPLACE FUNCTION public.delete_categorias_conta_corrente_v2(p_id uuid, p_deleted_by uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE v_user_tipo TEXT; BEGIN IF p_id IS NULL THEN RAISE EXCEPTION 'ID é obrigatório'; END IF; IF NOT EXISTS ( SELECT 1 FROM public.categorias_conta_corrente c WHERE c.id = p_id AND c.deleted_at IS NULL ) THEN RAISE EXCEPTION 'Categoria de conta corrente não encontrada'; END IF; IF p_deleted_by IS NOT NULL THEN SELECT u.tipo INTO v_user_tipo FROM public.user u WHERE u.user_id = p_deleted_by AND u.ativo = TRUE AND u.deleted_at IS NULL; IF NOT FOUND THEN RAISE EXCEPTION 'Usuário não encontrado ou inativo'; END IF; IF v_user_tipo != 'backoffice' THEN RAISE EXCEPTION 'Apenas usuários backoffice podem excluir categorias de conta corrente'; END IF; END IF; UPDATE public.categorias_conta_corrente SET deleted_at = NOW(), ativo = FALSE, updated_at = NOW() WHERE categorias_conta_corrente.id = p_id; RETURN TRUE; EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error in delete_categorias_conta_corrente_v2: %', SQLERRM; RAISE; END; $function$
;

-- ---- delete_cliente_v2 ----
CREATE OR REPLACE FUNCTION public.delete_cliente_v2(p_cliente_id bigint, p_deleted_by uuid DEFAULT NULL::uuid)
 RETURNS TABLE(cliente_id bigint, deleted_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_tipo TEXT;
BEGIN
  IF p_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_id é obrigatório';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.cliente c
    WHERE c.cliente_id = p_cliente_id
      AND c.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Cliente não encontrado ou já excluído';
  END IF;

  IF p_deleted_by IS NOT NULL THEN
    SELECT u.tipo
      INTO v_user_tipo
      FROM public.user u
     WHERE u.user_id = p_deleted_by
       AND u.ativo = TRUE
       AND u.deleted_at IS NULL;

    IF v_user_tipo IS NULL THEN
      RAISE EXCEPTION 'Usuário não autorizado';
    END IF;

    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem excluir clientes';
    END IF;
  END IF;

  UPDATE public.cliente c
     SET deleted_at = NOW(),
         ref_situacao_id = COALESCE((
           SELECT rs.ref_situacao_id
           FROM public.ref_situacao rs
           WHERE UPPER(TRIM(rs.nome)) IN ('EXCLUÍDO', 'EXCLUIDO')
           LIMIT 1
         ), c.ref_situacao_id)
   WHERE c.cliente_id = p_cliente_id;

  RETURN QUERY
  SELECT c.cliente_id, c.deleted_at
    FROM public.cliente c
   WHERE c.cliente_id = p_cliente_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in delete_cliente_v2 for cliente %: %', p_cliente_id, SQLERRM;
    RAISE;
END;
$function$
;

-- ---- delete_empresas_v2 ----
CREATE OR REPLACE FUNCTION public.delete_empresas_v2(p_id bigint, p_deleted_by uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_user_tipo TEXT;
BEGIN
  IF p_id IS NULL THEN RAISE EXCEPTION 'ID é obrigatório'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ref_empresas_subsidiarias e WHERE e.id = p_id AND e.deleted_at IS NULL) THEN RAISE EXCEPTION 'Empresa não encontrada'; END IF;
  IF p_deleted_by IS NOT NULL THEN SELECT u.tipo INTO v_user_tipo FROM public.user u WHERE u.user_id = p_deleted_by AND u.ativo = TRUE AND u.deleted_at IS NULL; IF NOT FOUND THEN RAISE EXCEPTION 'Usuário não encontrado ou inativo'; END IF; IF v_user_tipo != 'backoffice' THEN RAISE EXCEPTION 'Apenas usuários backoffice podem excluir empresas'; END IF; END IF;
  UPDATE public.ref_empresas_subsidiarias e SET deleted_at = NOW(), ativo = FALSE, updated_at = NOW() WHERE e.id = p_id;
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error in delete_empresas_v2: %', SQLERRM; RAISE;
END;
$function$
;

-- ---- delete_grupos_redes_v2 ----
CREATE OR REPLACE FUNCTION public.delete_grupos_redes_v2(p_id uuid, p_deleted_by uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ DECLARE v_user_tipo TEXT; v_nome_grupo TEXT; v_em_uso BOOLEAN; BEGIN IF p_id IS NULL THEN RAISE EXCEPTION 'ID é obrigatório'; END IF; IF NOT EXISTS ( SELECT 1 FROM public.grupos_redes gr WHERE gr.id = p_id AND gr.deleted_at IS NULL ) THEN RAISE EXCEPTION 'Grupo/rede não encontrado'; END IF; SELECT g.nome INTO v_nome_grupo FROM public.grupos_redes g WHERE g.id = p_id; SELECT EXISTS( SELECT 1 FROM public.cliente c WHERE TRIM(COALESCE(c.grupo_rede, '')) = TRIM(v_nome_grupo) AND c.deleted_at IS NULL ) INTO v_em_uso; IF v_em_uso THEN RAISE EXCEPTION 'Grupo/rede está em uso por clientes e não pode ser excluído'; END IF; IF p_deleted_by IS NOT NULL THEN SELECT u.tipo INTO v_user_tipo FROM public.user u WHERE u.user_id = p_deleted_by AND u.ativo = TRUE AND u.deleted_at IS NULL; IF NOT FOUND THEN RAISE EXCEPTION 'Usuário não encontrado ou inativo'; END IF; IF v_user_tipo != 'backoffice' THEN RAISE EXCEPTION 'Apenas usuários backoffice podem excluir grupos/redes'; END IF; END IF; UPDATE public.grupos_redes SET deleted_at = NOW(), ativo = FALSE, updated_at = NOW() WHERE grupos_redes.id = p_id; RETURN TRUE; EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error in delete_grupos_redes_v2: %', SQLERRM; RAISE; END; $function$
;

-- ---- delete_lista_preco_v2 ----
CREATE OR REPLACE FUNCTION public.delete_lista_preco_v2(p_lista_preco_id bigint)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lista_nome TEXT;
BEGIN
  -- Verificar se lista existe
  SELECT nome INTO v_lista_nome
  FROM listas_preco
  WHERE id = p_lista_preco_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lista de preço não encontrada';
  END IF;

  -- Verificar se há clientes usando esta lista
  IF EXISTS (
    SELECT 1 FROM cliente 
    WHERE lista_de_preco = p_lista_preco_id
    AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Não é possível excluir esta lista de preço pois existem clientes associados a ela';
  END IF;

  -- Verificar se há pedidos usando esta lista
  IF EXISTS (
    SELECT 1 FROM pedido_venda 
    WHERE lista_preco_id = p_lista_preco_id
    AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Não é possível excluir esta lista de preço pois existem pedidos associados a ela';
  END IF;

  -- Verificar se há comissões usando esta lista
  IF EXISTS (
    SELECT 1 FROM vendedor_comissão 
    WHERE lista_preco_id = p_lista_preco_id
  ) THEN
    RAISE EXCEPTION 'Não é possível excluir esta lista de preço pois existem comissões associadas a ela';
  END IF;

  -- Deletar produtos da lista (cascade)
  DELETE FROM produtos_listas_precos WHERE lista_preco_id = p_lista_preco_id;

  -- Deletar faixas de comissão (cascade)
  DELETE FROM listas_preco_comissionamento WHERE lista_preco_id = p_lista_preco_id;

  -- Deletar lista
  DELETE FROM listas_preco WHERE id = p_lista_preco_id;

  RETURN JSON_BUILD_OBJECT(
    'id', p_lista_preco_id,
    'nome', v_lista_nome,
    'deleted', true
  );
END;
$function$
;

-- ---- delete_meta_vendedor_v2 ----
CREATE OR REPLACE FUNCTION public.delete_meta_vendedor_v2(p_id integer, p_deleted_by uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_tipo TEXT;
BEGIN
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'ID é obrigatório';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.metas_vendedor m
    WHERE m.id = p_id
  ) THEN
    RAISE EXCEPTION 'Meta não encontrada';
  END IF;

  IF p_deleted_by IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_deleted_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem excluir metas';
    END IF;
  END IF;

  DELETE FROM public.metas_vendedor m
  WHERE m.id = p_id;

  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in delete_meta_vendedor_v2: %', SQLERRM;
    RAISE;
END;
$function$
;

-- ---- delete_natureza_operacao_v2 ----
CREATE OR REPLACE FUNCTION public.delete_natureza_operacao_v2(p_id bigint, p_deleted_by uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_tipo TEXT;
  v_em_uso BOOLEAN;
  v_nome_atual TEXT;
BEGIN
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'ID é obrigatório';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.natureza_operacao
    WHERE id = p_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Natureza de operação não encontrada';
  END IF;

  IF p_deleted_by IS NOT NULL THEN
    SELECT tipo INTO v_user_tipo
    FROM public."user"
    WHERE user_id = p_deleted_by
    AND ativo = TRUE
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem excluir naturezas de operação';
    END IF;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.pedido_venda
    WHERE natureza_id = p_id
    AND deleted_at IS NULL
  ) INTO v_em_uso;

  SELECT nome INTO v_nome_atual
  FROM public.natureza_operacao WHERE id = p_id;

  IF v_em_uso THEN
    UPDATE public.natureza_operacao
    SET
      ativo = FALSE,
      nome = CASE
        WHEN nome NOT LIKE '%(Excluído)' THEN nome || ' (Excluído)'
        ELSE nome
      END,
      deleted_at = NOW(),
      updated_at = NOW()
    WHERE id = p_id;
  ELSE
    UPDATE public.natureza_operacao
    SET
      deleted_at = NOW(),
      updated_at = NOW()
    WHERE id = p_id;
  END IF;

  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in delete_natureza_operacao_v2: %', SQLERRM;
    RAISE;
END;
$function$
;

-- ---- delete_pagamento_conta_corrente_v2 ----
CREATE OR REPLACE FUNCTION public.delete_pagamento_conta_corrente_v2(p_id bigint, p_deleted_by uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_tipo TEXT;
  v_conta_corrente_id BIGINT;
  v_cliente_id BIGINT;
BEGIN
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'ID é obrigatório';
  END IF;

  SELECT pac.conta_corrente_id
  INTO v_conta_corrente_id
  FROM public.pagamento_acordo_cliente pac
  WHERE pac.id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pagamento não encontrado';
  END IF;

  SELECT ccc.cliente_id
  INTO v_cliente_id
  FROM public.conta_corrente_cliente ccc
  WHERE ccc.id = v_conta_corrente_id;

  IF p_deleted_by IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_deleted_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    IF v_user_tipo = 'vendedor' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.cliente_vendedores cv
        WHERE cv.cliente_id = v_cliente_id
        AND cv.vendedor_id = p_deleted_by
      ) THEN
        RAISE EXCEPTION 'Vendedor não tem permissão para excluir este pagamento';
      END IF;
    END IF;
  END IF;

  DELETE FROM public.pagamento_acordo_cliente pac
  WHERE pac.id = p_id;

  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in delete_pagamento_conta_corrente_v2: %', SQLERRM;
    RAISE;
END;
$function$
;

-- ---- delete_pedido_venda_v2 ----
CREATE OR REPLACE FUNCTION public.delete_pedido_venda_v2(p_pedido_id bigint, p_deleted_by uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_user_tipo TEXT; v_is_backoffice BOOLEAN; v_pedido_owner UUID;
BEGIN
  IF p_pedido_id IS NULL THEN RAISE EXCEPTION 'pedido_id é obrigatório'; END IF;
  SELECT pv.vendedor_uuid INTO v_pedido_owner FROM public.pedido_venda pv WHERE pv."pedido_venda_ID" = p_pedido_id AND pv.deleted_at IS NULL; IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF p_deleted_by IS NOT NULL THEN SELECT u.tipo INTO v_user_tipo FROM public.user u WHERE u.user_id = p_deleted_by AND u.ativo = TRUE AND u.deleted_at IS NULL; IF NOT FOUND THEN RAISE EXCEPTION 'Usuário não encontrado ou inativo'; END IF; v_is_backoffice := (v_user_tipo = 'backoffice'); IF NOT v_is_backoffice AND v_pedido_owner != p_deleted_by THEN RAISE EXCEPTION 'Você não tem permissão para excluir este pedido'; END IF; END IF;
  UPDATE public.pedido_venda pv SET deleted_at = NOW(), updated_at = NOW() WHERE pv."pedido_venda_ID" = p_pedido_id;
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error in delete_pedido_venda_v2 for pedido %: %', p_pedido_id, SQLERRM; RAISE;
END;
$function$
;

-- ---- delete_segmento_cliente_v2 ----
CREATE OR REPLACE FUNCTION public.delete_segmento_cliente_v2(p_id bigint, p_deleted_by uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_tipo TEXT;
  v_em_uso BOOLEAN;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'ID é obrigatório';
  END IF;

  -- Verificar se segmento existe
  IF NOT EXISTS (
    SELECT 1 FROM public.segmento_cliente sc
    WHERE sc.id = p_id AND sc.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Segmento de cliente não encontrado';
  END IF;

  -- Verificar se está em uso em clientes - CORRIGIDO: usando coluna correta tipo_segmento
  SELECT EXISTS(
    SELECT 1 FROM public.cliente c
    WHERE c.tipo_segmento = (
      SELECT sc2.nome FROM public.segmento_cliente sc2 WHERE sc2.id = p_id
    )
    AND c.deleted_at IS NULL
  ) INTO v_em_uso;

  IF v_em_uso THEN
    RAISE EXCEPTION 'Segmento de cliente está em uso e não pode ser excluído';
  END IF;

  -- 2. VERIFICAR PERMISSÕES (se deleted_by fornecido)
  IF p_deleted_by IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_deleted_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem excluir segmentos de cliente';
    END IF;
  END IF;

  -- 3. SOFT DELETE
  UPDATE public.segmento_cliente sc
  SET
    deleted_at = NOW(),
    ativo = FALSE,
    updated_at = NOW()
  WHERE sc.id = p_id;

  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in delete_segmento_cliente_v2: %', SQLERRM;
    RAISE;
END;
$function$
;

-- ---- delete_tipos_veiculo_v2 ----
CREATE OR REPLACE FUNCTION public.delete_tipos_veiculo_v2(p_id uuid, p_deleted_by uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE v_user_tipo TEXT; BEGIN IF p_id IS NULL THEN RAISE EXCEPTION 'ID é obrigatório'; END IF; IF NOT EXISTS ( SELECT 1 FROM public.tipos_veiculo tv WHERE tv.id = p_id AND tv.deleted_at IS NULL ) THEN RAISE EXCEPTION 'Tipo de veículo não encontrado'; END IF; IF p_deleted_by IS NOT NULL THEN SELECT u.tipo INTO v_user_tipo FROM public.user u WHERE u.user_id = p_deleted_by AND u.ativo = TRUE AND u.deleted_at IS NULL; IF NOT FOUND THEN RAISE EXCEPTION 'Usuário não encontrado ou inativo'; END IF; IF v_user_tipo != 'backoffice' THEN RAISE EXCEPTION 'Apenas usuários backoffice podem excluir tipos de veículo'; END IF; END IF; UPDATE public.tipos_veiculo SET deleted_at = NOW(), ativo = FALSE, updated_at = NOW() WHERE tipos_veiculo.id = p_id; RETURN TRUE; EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error in delete_tipos_veiculo_v2: %', SQLERRM; RAISE; END; $function$
;

-- ---- delete_user_v2 ----
CREATE OR REPLACE FUNCTION public.delete_user_v2(p_user_id uuid, p_deleted_by uuid DEFAULT NULL::uuid)
 RETURNS TABLE(user_id uuid, deleted_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_user_tipo TEXT;
BEGIN
  -- 1. VALIDACOES
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id e obrigatorio';
  END IF;

  -- Verificar se usuario existe
  IF NOT EXISTS (
    SELECT 1
    FROM public.user u
    WHERE u.user_id = p_user_id
      AND u.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Usuario nao encontrado ou ja excluido';
  END IF;

  -- 2. VERIFICAR PERMISSOES
  IF p_deleted_by IS NOT NULL THEN
    SELECT u.tipo INTO v_current_user_tipo
    FROM public.user u
    WHERE u.user_id = p_deleted_by
      AND u.ativo = TRUE
      AND u.deleted_at IS NULL;

    IF v_current_user_tipo IS NULL THEN
      RAISE EXCEPTION 'Usuario nao autorizado';
    END IF;

    IF v_current_user_tipo <> 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuarios backoffice podem excluir usuarios';
    END IF;
  END IF;

  -- 3. SOFT DELETE
  UPDATE public.user AS u
  SET
    ativo      = FALSE,
    deleted_at = NOW()
  WHERE u.user_id = p_user_id;

  -- 4. RETORNAR DADOS
  RETURN QUERY
  SELECT
    u.user_id,
    u.deleted_at
  FROM public.user u
  WHERE u.user_id = p_user_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in delete_user_v2 for user %: %', p_user_id, SQLERRM;
    RAISE;
END;
$function$
;

-- ---- delete_zero_discount_rows ----
CREATE OR REPLACE FUNCTION public.delete_zero_discount_rows()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if NEW.desconto_minimo = 0 and NEW.desconto_maximo = 0 and NEW.comissao = 0 then
    delete from public.listas_preco_comissionamento where id = NEW.id;
  end if;
  return null; -- Retorna null pois a linha já foi inserida e pode ser excluída
end;
$function$
;

-- ---- enforce_cliente_codigo_unique_v2 ----
CREATE OR REPLACE FUNCTION public.enforce_cliente_codigo_unique_v2()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.codigo IS NULL OR btrim(NEW.codigo) = '' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.cliente c
    WHERE c.codigo = NEW.codigo
      AND c.cliente_id <> NEW.cliente_id
      AND c.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Codigo de cliente ja utilizado: %', NEW.codigo;
  END IF;

  RETURN NEW;
END;
$function$
;

-- ---- exportar_clientes ----
CREATE OR REPLACE FUNCTION public.exportar_clientes()
 RETURNS SETOF cliente_exportacao
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$                                                                                                          
    SELECT * FROM public.cliente_exportacao ORDER BY created_at DESC;
  $function$
;

-- ---- fechar_periodo_comissao_v2 ----
CREATE OR REPLACE FUNCTION public.fechar_periodo_comissao_v2(p_vendedor_uuid uuid, p_periodo text, p_fechado_por uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_saldo_anterior numeric := 0;
    v_total_comissao numeric := 0;
    v_total_creditos numeric := 0;
    v_total_debitos numeric := 0;
    v_total_pagos numeric := 0;
    v_saldo_final numeric := 0;
    v_existente_id bigint;
    v_proximo_periodo text;
    v_ano int;
    v_mes int;
BEGIN
    -- Calcular totais
    SELECT COALESCE(SUM(valor_comissao), 0) INTO v_total_comissao
    FROM public.vendedor_comissão
    WHERE vendedor_uuid = p_vendedor_uuid AND periodo = p_periodo;

    SELECT 
        COALESCE(SUM(CASE WHEN tipo = 'credito' THEN valor ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tipo = 'debito' THEN valor ELSE 0 END), 0)
    INTO v_total_creditos, v_total_debitos
    FROM public.lancamentos_comissao
    WHERE vendedor_uuid = p_vendedor_uuid AND periodo = p_periodo;

    SELECT COALESCE(SUM(valor), 0) INTO v_total_pagos
    FROM public.pagamentos_comissao
    WHERE vendedor_uuid = p_vendedor_uuid AND periodo = p_periodo;

    -- Obter saldo anterior do controle (se existir)
    SELECT saldo_anterior INTO v_saldo_anterior
    FROM public.controle_comissao_periodo
    WHERE vendedor_uuid = p_vendedor_uuid AND periodo = p_periodo;
    
    -- Se não tem registro de controle, buscar do mês anterior (recursivo ou saldo inicial 0)
    IF v_saldo_anterior IS NULL THEN
        v_saldo_anterior := 0; 
        -- PODE-SE IMPLEMENTAR LOGICA DE BUSCAR MES ANTERIOR AQUI
    END IF;

    -- Calcular Saldo Final
    v_saldo_final := v_saldo_anterior + v_total_comissao + v_total_creditos - v_total_debitos - v_total_pagos;

    -- Upsert no controle de período
    INSERT INTO public.controle_comissao_periodo (
        vendedor_uuid,
        periodo,
        status,
        saldo_anterior,
        saldo_final,
        data_fechamento,
        fechado_por
    ) VALUES (
        p_vendedor_uuid,
        p_periodo,
        'fechado',
        v_saldo_anterior,
        v_saldo_final,
        NOW(),
        p_fechado_por
    ) ON CONFLICT (vendedor_uuid, periodo) DO UPDATE SET
        status = 'fechado',
        saldo_final = EXCLUDED.saldo_final,
        data_fechamento = NOW(),
        fechado_por = EXCLUDED.fechado_por;

    -- Criar registro para o próximo mês com saldo anterior = saldo final deste mês
    v_ano := CAST(SPLIT_PART(p_periodo, '-', 1) AS INT);
    v_mes := CAST(SPLIT_PART(p_periodo, '-', 2) AS INT);
    
    IF v_mes = 12 THEN
        v_ano := v_ano + 1;
        v_mes := 1;
    ELSE
        v_mes := v_mes + 1;
    END IF;
    
    v_proximo_periodo := TO_CHAR(v_ano, 'FM0000') || '-' || TO_CHAR(v_mes, 'FM00');

    INSERT INTO public.controle_comissao_periodo (
        vendedor_uuid,
        periodo,
        status,
        saldo_anterior
    ) VALUES (
        p_vendedor_uuid,
        v_proximo_periodo,
        'aberto',
        v_saldo_final
    ) ON CONFLICT (vendedor_uuid, periodo) DO UPDATE SET
        saldo_anterior = EXCLUDED.saldo_anterior;

    RETURN json_build_object('success', true, 'saldo_final', v_saldo_final, 'proximo_periodo', v_proximo_periodo);
END;
$function$
;

-- ---- fill_pedido_venda_lookup_ids ----
CREATE OR REPLACE FUNCTION public.fill_pedido_venda_lookup_ids()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  v_lista_preco_nome text;
  v_natureza_nome text;
  v_empresa_nome text;
begin
  v_lista_preco_nome := nullif(btrim(coalesce(new.lista_de_preco, new.nome_lista_preco)), '');
  v_natureza_nome := nullif(btrim(coalesce(new.natureza_operacao, new.nome_natureza_operacao)), '');
  v_empresa_nome := nullif(btrim(coalesce(new.empresa_faturou, new.nome_empresa_faturamento)), '');

  if new.lista_preco_id is null and v_lista_preco_nome is not null then
    select lp.id
      into new.lista_preco_id
      from public.listas_preco as lp
     where lp.ativo is true
       and lower(btrim(lp.nome)) = lower(v_lista_preco_nome)
     order by lp.id
     limit 1;
  end if;

  if new.natureza_id is null and v_natureza_nome is not null then
    select no.id
      into new.natureza_id
      from public.natureza_operacao as no
     where no.ativo is true
       and no.deleted_at is null
       and lower(btrim(no.nome)) = lower(v_natureza_nome)
     order by no.id
     limit 1;
  end if;

  if new.empresa_faturamento_id is null and v_empresa_nome is not null then
    select re.id
      into new.empresa_faturamento_id
      from public.ref_empresas_subsidiarias as re
     where re.ativo is true
       and re.deleted_at is null
       and (
         lower(btrim(re.nome)) = lower(v_empresa_nome)
         or lower(btrim(coalesce(re.nome_fantasia, ''))) = lower(v_empresa_nome)
         or lower(btrim(coalesce(re.razao_social, ''))) = lower(v_empresa_nome)
         or lower(btrim(coalesce(re."identificação", ''))) = lower(v_empresa_nome)
       )
     order by
       case
         when lower(btrim(re.nome)) = lower(v_empresa_nome) then 0
         when lower(btrim(coalesce(re.nome_fantasia, ''))) = lower(v_empresa_nome) then 1
         when lower(btrim(coalesce(re.razao_social, ''))) = lower(v_empresa_nome) then 2
         else 3
       end,
       re.id
     limit 1;
  end if;

  return new;
end;
$function$
;

-- ---- fill_pedido_venda_produtos_snapshot_fields ----
CREATE OR REPLACE FUNCTION public.fill_pedido_venda_produtos_snapshot_fields()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  v_codigo_sku text;
  v_codigo_ean text;
  v_peso_bruto numeric;
  v_peso_liquido numeric;
  v_unidade text;
begin
  if new.produto_id is null then
    return new;
  end if;

  select
    pr.codigo_sku,
    pr.gtin,
    pr.peso_bruto,
    pr.peso_liquido,
    coalesce(nullif(btrim(pr.sigla_unidade), ''), nullif(btrim(rum.sigla), ''))
  into
    v_codigo_sku,
    v_codigo_ean,
    v_peso_bruto,
    v_peso_liquido,
    v_unidade
  from public.produto as pr
  left join public.ref_unidade_medida as rum
    on rum.id = pr.unidade_id
  where pr.produto_id = new.produto_id
  limit 1;

  if nullif(btrim(new.codigo_sku), '') is null then
    new.codigo_sku := v_codigo_sku;
  end if;

  if nullif(btrim(new.codigo_ean), '') is null then
    new.codigo_ean := v_codigo_ean;
  end if;

  if new.peso_bruto is null then
    new.peso_bruto := v_peso_bruto;
  end if;

  if new.peso_liquido is null then
    new.peso_liquido := v_peso_liquido;
  end if;

  if nullif(btrim(new.unidade), '') is null then
    new.unidade := coalesce(v_unidade, 'UN');
  end if;

  return new;
end;
$function$
;

-- ---- filtrar_comissoes_vendedor ----
CREATE OR REPLACE FUNCTION public.filtrar_comissoes_vendedor(user_uuid uuid, search_text text)
 RETURNS TABLE(vendedor_comissao_id bigint, vendedor_uuid uuid, vendedor_nome text, data_inicio date, data_final date, valor_total numeric, valor_comissao numeric, produtos_nomes text, produtos_ids integer[], produtos_quantidades integer[], produtos_valores numeric[], efetivada boolean)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH user_role AS (
    SELECT "ref_user_role_id" AS role_id
    FROM "user"
    WHERE "user_id" = user_uuid
  ),
  produtos_info AS (
    SELECT 
      vc.vendedor_comissao_id,
      array_agg(
        CASE 
          WHEN LENGTH(p.descricao) > 24 THEN LEFT(p.descricao, 21) || '(...)'
          ELSE p.descricao
        END
        ORDER BY u.ord
      ) AS produtos_nomes,
      array_agg(p.produto_id::INTEGER ORDER BY u.ord) AS produtos_ids,
      array_agg(
        (regexp_match(qtde.str, '^[0-9]+ - ([0-9]+) - [0-9.]+$'))[1]::INTEGER 
        ORDER BY u.ord
      ) AS produtos_quantidades,
      array_agg(
        (regexp_match(qtde.str, '^[0-9]+ - [0-9]+ - ([0-9.]+)$'))[1]::NUMERIC 
        ORDER BY u.ord
      ) AS produtos_valores
    FROM "vendedor_comissão" vc
    CROSS JOIN user_role ur
    LEFT JOIN LATERAL unnest(vc.id_produtos) WITH ORDINALITY AS u(produto_id, ord) ON TRUE
    LEFT JOIN produto p ON p.produto_id = u.produto_id
    LEFT JOIN LATERAL unnest(vc.produtos_qtde) WITH ORDINALITY AS qtde(str, qord) ON TRUE
    WHERE 
      ur.role_id = 1  -- Admin: não filtra
      OR 
      (ur.role_id != 1 AND vc.vendedor_uuid = user_uuid)  -- Não admin: filtra pelo UUID
    GROUP BY vc.vendedor_comissao_id
  )
  SELECT 
    vc.vendedor_comissao_id,
    vc.vendedor_uuid,
    u.nome AS vendedor_nome,
    vc.data_inicio,
    vc.data_final,
    vc.valor_total,
    vc.valor_comissao,
    array_to_string(pi.produtos_nomes, ', ') AS produtos_nomes,
    pi.produtos_ids,
    pi.produtos_quantidades,
    pi.produtos_valores,
    vc.efetivada
  FROM "vendedor_comissão" vc
  CROSS JOIN user_role ur
  LEFT JOIN produtos_info pi ON pi.vendedor_comissao_id = vc.vendedor_comissao_id
  LEFT JOIN "user" u ON u."user_id" = vc.vendedor_uuid
  WHERE 
    (ur.role_id = 1  -- Admin: não filtra
    OR 
    (ur.role_id != 1 AND vc.vendedor_uuid = user_uuid))  -- Não admin: filtra pelo UUID
    AND
    (
      search_text IS NULL 
      OR search_text = '' 
      OR u.nome ILIKE '%' || search_text || '%'
      OR vc.valor_total::TEXT ILIKE '%' || search_text || '%'
      OR vc.valor_comissao::TEXT ILIKE '%' || search_text || '%'
      OR EXISTS (
        SELECT 1
        FROM unnest(pi.produtos_nomes) AS produto_nome
        WHERE produto_nome ILIKE '%' || search_text || '%'
      )
    );
END;
$function$
;

-- ---- filtrar_produtos ----
CREATE OR REPLACE FUNCTION public.filtrar_produtos(p_vendedor_id uuid, p_search_text text DEFAULT NULL::text, p_tipo_id bigint DEFAULT NULL::bigint, p_marca_id bigint DEFAULT NULL::bigint)
 RETURNS TABLE(id bigint, nome text, descricao text, ref_permissao_id bigint, codigo_sku text, ref_unidade_id text, preco_venda numeric, peso_bruto numeric, peso_liquido numeric, marca text)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    p.produto_id       AS id,
    p.descricao        AS nome,
    p.descricao        AS descricao,
    p.ref_permissao_id,
    p.codigo_sku,
    p.ref_unidade_id,
    p.preco_venda,
    p.peso_bruto,
    p.peso_liquido,
    m.descricao        AS marca
  FROM produto p
  LEFT JOIN produto_vendedor pv
    ON p.produto_id     = pv."Id_produto"
   AND pv."Id_vendedor" = p_vendedor_id
  LEFT JOIN "user" u
    ON u."user_id"      = p_vendedor_id
  LEFT JOIN marcas m
    ON p.marca          = m.id
  WHERE 
    -- permissão do usuário
    (
      u."ref_user_role_id" = 1
      OR (
        u."ref_user_role_id" = 2
        AND (
          (p.ref_permissao_id = 1 OR pv."Condição_associada" = 1) OR
          (p.ref_permissao_id = 2 AND pv."Condição_associada" = 2) OR
          (p.ref_permissao_id = 3 AND pv."Condição_associada" <> 3)
        )
      )
    )
    -- filtro de texto
    AND (
      p_search_text IS NULL
      OR p_search_text = ''
      OR p.descricao  ILIKE '%' || p_search_text || '%'
      OR p.codigo_sku ILIKE '%' || p_search_text || '%'
    )
    -- se p_tipo_id for NULL ou 0, ignora; caso contrário filtra
    AND (
      p_tipo_id IS NULL
      OR p_tipo_id = 0
      OR p.tipo_id = p_tipo_id
    )
    -- mesma lógica para marca
    AND (
      p_marca_id IS NULL
      OR p_marca_id = 0
      OR p.marca = p_marca_id
    )
  ORDER BY 
    (p.codigo_sku ~ '^\d+$') DESC,
    p.codigo_sku DESC;
END;
$function$
;

-- ---- filtrar_produtosBB ----
CREATE OR REPLACE FUNCTION public."filtrar_produtosBB"(vendedor_id integer, relacionamento_tipo text)
 RETURNS TABLE(id integer, nome text, tipo_relacionamento text)
 LANGUAGE plpgsql
AS $function$BEGIN
  IF relacionamento_tipo = 'positivo' THEN
    RETURN QUERY
    SELECT * FROM produtos p
    WHERE EXISTS (
        SELECT 1 FROM relacao_vendedor_produto r
        WHERE r.produto_id = p.id
        AND r.vendedor_id = vendedor_id
        AND p.tipo_relacionamento = 'positivo'
    );
  ELSIF relacionamento_tipo = 'negativo' THEN
    RETURN QUERY
    SELECT * FROM produtos p
    WHERE NOT EXISTS (
        SELECT 1 FROM relacao_vendedor_produto r
        WHERE r.produto_id = p.id
        AND r.vendedor_id = vendedor_id
        AND p.tipo_relacionamento = 'negativo'
    );
  ELSE
    RETURN QUERY
    SELECT * FROM produtos;
  END IF;
END;$function$
;

-- ---- filtrar_produtosTT ----
CREATE OR REPLACE FUNCTION public."filtrar_produtosTT"(vendedor_id uuid)
 RETURNS TABLE(id bigint, nome text, descricao text, ref_permissao_id bigint, codigo_sku text, ref_unidade_id bigint, preco_venda numeric)
 LANGUAGE plpgsql
AS $function$BEGIN
  RETURN QUERY
  SELECT 
    p.produto_id AS id,
    p.descricao AS nome,
    p.descricao AS descricao,
    p.ref_permissao_id,
    p.codigo_sku,
    p.ref_unidade_id,
    p.preco_venda
  FROM produto p
  LEFT JOIN produto_vendedor pv ON p.produto_id = pv."Id_produto" AND pv."Id_vendedor" = vendedor_id
  LEFT JOIN "user" u ON u."user_id" = vendedor_id  -- Junção com a tabela user
  WHERE 
    (
      -- Caso o usuário seja um admin (ref_user_role_id = 1), mostra todos os produtos
      u."ref_user_role_id (FK)" = 1
    ) OR
    (
      -- Caso o usuário tenha o papel 2, aplica as condições de filtragem
      u."ref_user_role_id (FK)" = 2 AND (
        (p.ref_permissao_id = 1 OR pv."Condição_associada" = 1) OR  -- Condição 1: Não filtrar (mostra todos os produtos)
        (p.ref_permissao_id = 2 AND pv."Condição_associada" = 2) OR  -- Condição 2: Permitir somente para o vendedor específico
        (p.ref_permissao_id = 3 AND pv."Condição_associada" != 3)    -- Condição 3: Não permitir para o vendedor específico
      )
    );
END;$function$
;

-- ---- fn_buscar_produtos_lista_preco ----
CREATE OR REPLACE FUNCTION public.fn_buscar_produtos_lista_preco(p_lista_preco_id bigint, p_search_text text DEFAULT ''::text)
 RETURNS SETOF vw_produtos_listas_precos
 LANGUAGE plpgsql
AS $function$DECLARE
  -- sem variáveis locais adicionais
BEGIN
  RETURN QUERY
  SELECT *
  FROM vw_produtos_listas_precos
  WHERE lista_preco_id = p_lista_preco_id
    AND (
      p_search_text = '' OR
      descricao_produto ILIKE '%' || p_search_text || '%' OR
      gtin              ILIKE '%' || p_search_text || '%' OR
      (
        -- se foi digitado um número seguido de espaço, busca pelo SKU exato
        p_search_text ~ '^\d+\s+$'
        AND codigo_sku = TRIM(p_search_text)
      )
      OR
      (
        -- nos demais casos, faz o LIKE padrão
        p_search_text !~ '^\d+\s+$'
        AND codigo_sku ILIKE '%' || p_search_text || '%'
      )
    )
  ORDER BY
    -- Ordenação robusta que funciona para SKUs alfanuméricos
    CASE
      WHEN codigo_sku ~ '^\d+$' THEN CAST(codigo_sku AS bigint)
      ELSE NULL
    END DESC NULLS LAST,
    -- Fallback alfabético
    codigo_sku DESC;
END;$function$
;

-- ---- fn_consulta_condicoes_por_ids ----
CREATE OR REPLACE FUNCTION public.fn_consulta_condicoes_por_ids(ids_incluir integer[])
 RETURNS json
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN (
    SELECT json_build_object(
             'data',
             COALESCE(json_agg(t), '[]'::json)
           )
    FROM (
      SELECT *
      FROM public."Condicao_De_Pagamento"
      WHERE (ids_incluir IS NULL OR array_length(ids_incluir, 1) = 0)
         OR "Condição_ID" = ANY(ids_incluir)
    ) t
  );
END;
$function$
;

-- ---- generate_vendedor_comissao ----
CREATE OR REPLACE FUNCTION public.generate_vendedor_comissao(p_pedido_id bigint, p_data_faturamento date DEFAULT NULL::date)
 RETURNS TABLE(ret_vendedor_comissao_id bigint, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$                                                                                                  
  declare                                                  
    v_pedido record;                                                                                             
    v_tipo_comissao bigint;                                                                                      
    v_aliquota_fixa numeric;                  
    v_lista_preco_id bigint;                                                                                     
    v_desconto_cliente numeric := 0;                       
    v_percentual numeric := 0;                                                                                   
    v_valor_comissao numeric := 0;
    v_existente_id bigint;                                                                                       
    v_data_ref date;                                       
    v_periodo text;                                                                                              
  begin                                                    
    -- 1) Carrega pedido                                                                                         
    select pv."pedido_venda_ID"      as pedido_id,
           pv.vendedor_uuid,                                                                                     
           pv.cliente_id,                                  
           coalesce(pv.valor_total,0) as valor_total,                                                            
           coalesce(pv.data_venda::date, current_date) as data_venda,                                            
           pv.natureza_operacao                                                                                  
    into v_pedido                                                                                                
    from public.pedido_venda pv                                                                                  
    where pv."pedido_venda_ID" = p_pedido_id;                                                                    
                                                                                                                 
    if not found then                                                                                            
      raise exception 'Pedido % não encontrado.', p_pedido_id using errcode='P0002';                             
    end if;                                                                                                      
                                          
    if v_pedido.vendedor_uuid is null then                                                                       
      raise exception 'Pedido % sem vendedor_uuid.', p_pedido_id;                                                
    end if;                                   
                                                                                                                 
    -- Data de referência: usar data de faturamento se fornecida, senão data atual
    v_data_ref := coalesce(p_data_faturamento, current_date);                                                    
    v_periodo := to_char(v_data_ref, 'YYYY-MM');
                                                                                                                 
    -- 1.1) Regra: pedidos de Bonificação NÃO geram comissão
    if v_pedido.natureza_operacao = 'Bonificação' then                                                           
      return query select null::bigint, 'bonificacao_sem_comissao';                                              
      return;                                                                                                    
    end if;                                                                                                      
                                                                                                                 
    -- 2) Tipo de comissão do vendedor                                                                           
    select dv."Comissão", dv.aliquotafixa                                                                        
    into v_tipo_comissao, v_aliquota_fixa                                                                        
    from public.dados_vendedor dv                          
    where dv.user_id = v_pedido.vendedor_uuid;
                                                                                                                 
    if not found then                     
      raise exception 'Vendedor % não encontrado em dados_vendedor.', v_pedido.vendedor_uuid;                    
    end if;                                                                                                      
  
    if v_tipo_comissao = 2 then                                                                                  
      v_percentual := coalesce(v_aliquota_fixa, 0);        

    elsif v_tipo_comissao = 1 then                                                                               
      select c.lista_de_preco::bigint,    
             coalesce(c.desconto, 0)                                                                             
      into v_lista_preco_id, v_desconto_cliente                                                                  
      from public.cliente c
      where c.cliente_id = v_pedido.cliente_id;                                                                  
                                                           
      if not found then                                                                                          
        raise exception 'Cliente % não encontrado.', v_pedido.cliente_id;
      end if;                                                                                                    
  
      select lpc.comissao                                                                                        
      into v_percentual                                    
      from public.listas_preco_comissionamento lpc
      where lpc.lista_preco_id = v_lista_preco_id                                                                
        and v_desconto_cliente between lpc.desconto_minimo and lpc.desconto_maximo
      order by lpc.desconto_minimo asc, lpc.id asc                                                               
      limit 1;                                                                                                   
  
      if v_percentual is null then                                                                               
        v_percentual := 0;                                 
      end if;                                                                                                    
                                                                                                                 
    else
      raise exception 'Tipo de comissão inválido (dados_vendedor."Comissão" = %). Esperado 1 ou 2.',             
  v_tipo_comissao;                                         
    end if;                               

    -- 4) Calcula valor                                                                                          
    v_valor_comissao := round((v_pedido.valor_total::numeric * v_percentual / 100), 2);
                                                                                                                 
    -- 5) Verifica se já existe e ATUALIZA ou INSERE                                                             
    select vc.vendedor_comissao_id
    into v_existente_id                                                                                          
    from public."vendedor_comissão" as vc                  
    where vc.pedido_id = v_pedido.pedido_id                                                                      
    limit 1;                                                                                                     
                                          
    if v_existente_id is not null then                                                                           
      update public."vendedor_comissão"                                                                          
      set valor_total = v_pedido.valor_total,
          valor_comissao = v_valor_comissao,                                                                     
          percentual_comissao = v_percentual,              
          periodo = v_periodo,                
          editado_em = now()                                                                                     
      where vendedor_comissao_id = v_existente_id;
                                                                                                                 
      return query select v_existente_id::bigint, 'updated';
    else                                                                                                         
      insert into public."vendedor_comissão"(              
        vendedor_uuid,                                                                                           
        data_inicio,
        data_final,                                                                                              
        valor_total,                                       
        valor_comissao,
        efetivada,                                                                                               
        pedido_id,
        debito,                                                                                                  
        percentual_comissao,                               
        periodo
      ) values (                                                                                                 
        v_pedido.vendedor_uuid,
        v_data_ref,                                                                                              
        v_data_ref,                                        
        v_pedido.valor_total,             
        v_valor_comissao,
        true,                                                                                                    
        v_pedido.pedido_id,
        false,                                                                                                   
        v_percentual,                                      
        v_periodo                             
      )                                   
      returning vendedor_comissao_id into v_existente_id;
                                                                                                                 
      return query select v_existente_id::bigint, 'created';
    end if;                                                                                                      
  end;                                                     
  $function$
;

-- ---- get_analise_investimento_retorno ----
CREATE OR REPLACE FUNCTION public.get_analise_investimento_retorno(p_cliente_id bigint DEFAULT NULL::bigint, p_data_inicio date DEFAULT NULL::date, p_data_fim date DEFAULT NULL::date, p_natureza_operacao text DEFAULT NULL::text)
 RETURNS TABLE(cliente_id bigint, cliente_nome text, cliente_fantasia text, total_investimentos numeric, total_vendas numeric, percentual_retorno numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        c.cliente_id,
        c.nome as cliente_nome,
        c.nome_fantasia as cliente_fantasia,
        COALESCE(SUM(CASE WHEN ccc.tipo_compromisso = 'investimento' THEN ccc.valor ELSE 0 END), 0) as total_investimentos,
        COALESCE(SUM(pv.valor_total), 0) as total_vendas,
        CASE 
            WHEN COALESCE(SUM(CASE WHEN ccc.tipo_compromisso = 'investimento' THEN ccc.valor ELSE 0 END), 0) > 0 
            THEN (COALESCE(SUM(pv.valor_total), 0) / COALESCE(SUM(CASE WHEN ccc.tipo_compromisso = 'investimento' THEN ccc.valor ELSE 0 END), 0)) * 100
            ELSE 0 
        END as percentual_retorno
    FROM public.cliente c
    LEFT JOIN public.conta_corrente_cliente ccc ON c.cliente_id = ccc.cliente_id
        AND (p_data_inicio IS NULL OR ccc.data >= p_data_inicio)
        AND (p_data_fim IS NULL OR ccc.data <= p_data_fim)
    LEFT JOIN public.pedido_venda pv ON c.cliente_id = pv.cliente_id
        AND (p_data_inicio IS NULL OR pv.data_pedido >= p_data_inicio)
        AND (p_data_fim IS NULL OR pv.data_pedido <= p_data_fim)
        AND (p_natureza_operacao IS NULL OR pv.natureza_operacao = p_natureza_operacao)
    WHERE 
        (p_cliente_id IS NULL OR c.cliente_id = p_cliente_id)
    GROUP BY c.cliente_id, c.nome, c.nome_fantasia
    HAVING 
        COALESCE(SUM(CASE WHEN ccc.tipo_compromisso = 'investimento' THEN ccc.valor ELSE 0 END), 0) > 0
        OR COALESCE(SUM(pv.valor_total), 0) > 0
    ORDER BY total_investimentos DESC;
END;
$function$
;

-- ---- get_categorias_conta_corrente_v2 ----
CREATE OR REPLACE FUNCTION public.get_categorias_conta_corrente_v2(p_id uuid)
 RETURNS TABLE(id uuid, nome text, descricao text, cor text, ativo boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$ BEGIN IF p_id IS NULL THEN RAISE EXCEPTION 'ID é obrigatório'; END IF; RETURN QUERY SELECT c.id, c.nome, c.descricao, c.cor, c.ativo, c.created_at, c.updated_at FROM public.categorias_conta_corrente c WHERE c.id = p_id AND c.deleted_at IS NULL; IF NOT FOUND THEN RAISE EXCEPTION 'Categoria de conta corrente não encontrada'; END IF; EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error in get_categorias_conta_corrente_v2: %', SQLERRM; RAISE; END; $function$
;

-- ---- get_cliente_by_id_v2 ----
CREATE OR REPLACE FUNCTION public.get_cliente_by_id_v2(p_cliente_id bigint, p_requesting_user_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_tipo TEXT;
  v_cliente_data JSON;
BEGIN
  IF p_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_id é obrigatório';
  END IF;

  IF p_requesting_user_id IS NOT NULL THEN
    SELECT tipo INTO v_user_tipo
    FROM public.user
    WHERE user_id = p_requesting_user_id
    AND ativo = TRUE
    AND deleted_at IS NULL;

    IF v_user_tipo = 'vendedor' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.cliente
        WHERE cliente_id = p_cliente_id
        AND deleted_at IS NULL
        AND status_aprovacao = 'aprovado'
        AND (
          criado_por = p_requesting_user_id
          OR p_requesting_user_id = ANY(vendedoresatribuidos)
        )
      ) THEN
        RAISE EXCEPTION 'Cliente não encontrado ou sem permissão de acesso';
      END IF;
    END IF;
  END IF;

  SELECT JSON_BUILD_OBJECT(
    'cliente', row_to_json(c.*),
    'contato', (SELECT row_to_json(cc.*) FROM public.cliente_contato cc WHERE cc.cliente_id = c.cliente_id),
    'endereco', (SELECT row_to_json(ce.*) FROM public.cliente_endereço ce WHERE ce.cliente_id = c.cliente_id)
  )
  INTO v_cliente_data
  FROM public.cliente c
  WHERE c.cliente_id = p_cliente_id
  AND c.deleted_at IS NULL;

  IF v_cliente_data IS NULL THEN
    RAISE EXCEPTION 'Cliente não encontrado';
  END IF;

  RETURN v_cliente_data;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in get_cliente_by_id_v2 for cliente %: %', p_cliente_id, SQLERRM;
    RAISE;
END;
$function$
;

-- ---- get_cliente_completo_v2 ----
CREATE OR REPLACE FUNCTION public.get_cliente_completo_v2(p_cliente_id bigint, p_requesting_user_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
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
          'situacao_nome', (SELECT rs.nome FROM public.ref_situacao rs WHERE rs.ref_situacao_id = c.ref_situacao_id),
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
            'metadados', COALESCE(h.metadados, '{}'::jsonb)
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
$function$
;

-- ---- get_clientes_autocomplete ----
CREATE OR REPLACE FUNCTION public.get_clientes_autocomplete(p_search_term text DEFAULT ''::text)
 RETURNS TABLE(cliente_id bigint, nome text, nome_fantasia text, cpf_cnpj text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        c.cliente_id,
        c.nome,
        c.nome_fantasia,
        c.cpf_cnpj
    FROM public.cliente c
    WHERE 
        p_search_term = '' OR
        LOWER(c.nome) LIKE LOWER('%' || p_search_term || '%') OR
        LOWER(c.nome_fantasia) LIKE LOWER('%' || p_search_term || '%') OR
        LOWER(c.cpf_cnpj) LIKE LOWER('%' || p_search_term || '%')
    ORDER BY c.nome
    LIMIT 50;
END;
$function$
;

-- ---- get_comissoes_vendedor ----
CREATE OR REPLACE FUNCTION public.get_comissoes_vendedor(p_vendedor_id uuid, p_mes_referencia text)
 RETURNS TABLE(vendedor_uuid uuid, nome_vendedor text, saldo_anterior numeric, saldo_mes numeric, saldo_total numeric, comissao_pedido jsonb)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
    SELECT
      dv.user_id       AS vendedor_uuid,
      dv.nome          AS nome_vendedor,

      -- 1) SALDO ANTERIOR: somar todas as comissões (com débito = negativo)
      --    cuja data_inicio seja STRICTAMENTE ANTERIOR ao mês referência
      COALESCE(
        SUM(
          CASE
            WHEN TO_CHAR(vc.data_inicio, 'YYYY-MM') < p_mes_referencia 
            THEN 
              CASE 
                WHEN vc.debito THEN -COALESCE(vc.valor_comissao, 0)
                ELSE  COALESCE(vc.valor_comissao, 0)
              END
            ELSE 0
          END
        ), 
        0
      ) AS saldo_anterior,

      -- 2) SALDO DO MÊS: somar todas as comissões cuja data_inicio esteja NO MÊS referência
      COALESCE(
        SUM(
          CASE
            WHEN TO_CHAR(vc.data_inicio, 'YYYY-MM') = p_mes_referencia 
            THEN 
              CASE 
                WHEN vc.debito THEN -COALESCE(vc.valor_comissao, 0)
                ELSE  COALESCE(vc.valor_comissao, 0)
              END
            ELSE 0
          END
        ), 
        0
      ) AS saldo_mes,

      -- 3) SALDO TOTAL: soma condicional de (tudo que aconteceu antes OU dentro do mês)
      COALESCE(
        SUM(
          CASE
            WHEN TO_CHAR(vc.data_inicio, 'YYYY-MM') <= p_mes_referencia
            THEN 
              CASE 
                WHEN vc.debito THEN -COALESCE(vc.valor_comissao, 0)
                ELSE  COALESCE(vc.valor_comissao, 0)
              END
            ELSE 0
          END
        ), 
        0
      ) AS saldo_total,

      -- 4) LISTA DE COMISSÕES DO MÊS (JSONB_AGG só agrega as linhas do mês referência)
      COALESCE(
        JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'vendedor_comissao_id', vc.vendedor_comissao_id,
            'pedido_id',             vc.pedido_id,
            'data_inicio',           vc.data_inicio,
            'valor_comissao',
              REPLACE(
                REPLACE(
                  REPLACE(
                    TO_CHAR(
                      COALESCE(vc.valor_comissao, 0),
                      'FM9,999,999,990.00'
                    ),
                    ',', 'X'
                  ),
                  '.', ','
                ),
                'X', '.'
              ),
            'valor_total_pedido',
              REPLACE(
                REPLACE(
                  REPLACE(
                    TO_CHAR(
                      COALESCE(pv.valor_total, 0),
                      'FM9,999,999,990.00'
                    ),
                    ',', 'X'
                  ),
                  '.', ','
                ),
                'X', '.'
              ),
            'cliente_id',            pv.cliente_id,
            'cliente_nome',          c.nome,
            'numero_pedido',         pv.numero_pedido,
            'debito',                vc.debito,
            'observacao',            vc.observacao
          )
        ) FILTER (
          WHERE TO_CHAR(vc.data_inicio, 'YYYY-MM') = p_mes_referencia
        ),
        '[]'::jsonb
      ) AS comissao_pedido

    FROM public.dados_vendedor dv

    -- OBSERVAÇÃO IMPORTANTE: retiramos o filtro “AND TO_CHAR(vc.data_inicio, 'YYYY-MM') = p_mes_referencia”
    -- do JOIN, pois agora precisamos de TODAS AS LINHAS de “vendedor_comissão” para calcular
    -- saldo_anterior, saldo_mes e saldo_total em agregações condicionais.
    LEFT JOIN public.vendedor_comissão vc
      ON dv.user_id = vc.vendedor_uuid

    LEFT JOIN public.pedido_venda pv
      ON vc.pedido_id = pv."pedido_venda_ID"

    LEFT JOIN public.cliente c
      ON pv.cliente_id = c.cliente_id

    WHERE dv.user_id = p_vendedor_id
      -- (Não filtramos por data aqui, pois somamos condicionalmente acima)

    GROUP BY dv.user_id, dv.nome
    ORDER BY dv.nome;
END;
$function$
;

-- ---- get_condicoes_pagamento_por_cliente ----
CREATE OR REPLACE FUNCTION public.get_condicoes_pagamento_por_cliente(p_cliente bigint)
 RETURNS TABLE("Condição_ID" bigint, "Parcelamento" boolean, "Condição_de_crédito" boolean, "Quantidade_parcelas" double precision, "Desconto" double precision, "Prazo_pagamento" double precision, "Descrição" text, forma_pagamento_id bigint, meio_pagamento bigint, intervalo_parcela bigint[])
 LANGUAGE sql
AS $function$
  select distinct
    cp."Condição_ID",
    cp."Parcelamento",
    cp."Condição_de_crédito",
    cp."Quantidade_parcelas",
    cp."Desconto",
    cp."Prazo_pagamento",
    cp."Descrição",
    cp.forma_pagamento_id,
    cp.meio_pagamento,
    cp.intervalo_parcela
  from cliente c
  -- Desempacota o array de condições disponíveis para o cliente
  join lateral unnest(c.condicoesdisponiveis) as condicao_id on true
  -- Junta com a tabela de condições de pagamento
  join "Condicao_De_Pagamento" cp on cp."Condição_ID" = condicao_id
  where c.cliente_id = p_cliente;
$function$
;

-- ---- get_condicoes_pagamento_por_vendedor ----
CREATE OR REPLACE FUNCTION public.get_condicoes_pagamento_por_vendedor(p_vendedor uuid)
 RETURNS TABLE("Condição_ID" bigint, "Parcelamento" boolean, "Condição_de_crédito" boolean, "Quantidade_parcelas" double precision, "Desconto" double precision, "Prazo_pagamento" double precision, "Descrição" text, forma_pagamento_id bigint, meio_pagamento bigint, intervalo_parcela bigint[])
 LANGUAGE sql
AS $function$
  select distinct
    cp."Condição_ID",
    cp."Parcelamento",
    cp."Condição_de_crédito",
    cp."Quantidade_parcelas",
    cp."Desconto",
    cp."Prazo_pagamento",
    cp."Descrição",
    cp.forma_pagamento_id,
    cp.meio_pagamento,
    cp.intervalo_parcela
  from cliente c
  -- Descompacta o array de condições disponíveis para cada cliente
  join lateral unnest(c.condicoesdisponiveis) as condicao_id on true
  -- Faz a junção com a tabela de condições de pagamento
  join "Condicao_De_Pagamento" cp on cp."Condição_ID" = condicao_id
  -- Filtra os clientes que possuem o vendedor informado no array vendedoresatribuidos
  where p_vendedor = any(c.vendedoresatribuidos);
$function$
;

-- ---- get_conta_corrente_cliente ----
CREATE OR REPLACE FUNCTION public.get_conta_corrente_cliente(p_cliente_id bigint DEFAULT NULL::bigint, p_vendedor_uuid uuid DEFAULT NULL::uuid, p_data_inicio date DEFAULT NULL::date, p_data_fim date DEFAULT NULL::date, p_tipo_compromisso text DEFAULT NULL::text)
 RETURNS TABLE(id bigint, cliente_id bigint, vendedor_uuid uuid, vendedor_nome text, vendedor_fantasia text, cliente_nome text, cliente_fantasia text, data date, valor numeric, titulo text, descricao_longa text, arquivos_anexos text[], tipo_compromisso text, created_at timestamp with time zone, total_pago numeric, saldo_restante numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        vw.id,
        vw.cliente_id,
        vw.vendedor_uuid,
        vw.vendedor_nome,
        vw.vendedor_fantasia,
        vw.cliente_nome,
        vw.cliente_fantasia,
        vw.data,
        vw.valor,
        vw.titulo,
        vw.descricao_longa,
        vw.arquivos_anexos,
        vw.tipo_compromisso,
        vw.created_at,
        vw.total_pago,
        vw.saldo_restante
    FROM public.vw_conta_corrente_cliente vw
    WHERE 
        (p_cliente_id IS NULL OR vw.cliente_id = p_cliente_id)
        AND (p_vendedor_uuid IS NULL OR vw.vendedor_uuid = p_vendedor_uuid)
        AND (p_data_inicio IS NULL OR vw.data >= p_data_inicio)
        AND (p_data_fim IS NULL OR vw.data <= p_data_fim)
        AND (p_tipo_compromisso IS NULL OR vw.tipo_compromisso = p_tipo_compromisso)
    ORDER BY vw.data DESC, vw.created_at DESC;
END;
$function$
;

-- ---- get_conta_corrente_v2 ----
CREATE OR REPLACE FUNCTION public.get_conta_corrente_v2(p_id bigint, p_requesting_user_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$ DECLARE v_user_tipo TEXT; v_is_backoffice BOOLEAN; v_compromisso JSON; v_pagamentos JSON; v_result JSON; BEGIN IF p_id IS NULL THEN RAISE EXCEPTION 'ID é obrigatório'; END IF; IF p_requesting_user_id IS NOT NULL THEN SELECT u.tipo INTO v_user_tipo FROM public.user u WHERE u.user_id = p_requesting_user_id AND u.ativo = TRUE AND u.deleted_at IS NULL; IF FOUND THEN v_is_backoffice := (v_user_tipo = 'backoffice'); ELSE v_is_backoffice := FALSE; END IF; ELSE v_is_backoffice := FALSE; END IF; SELECT JSON_BUILD_OBJECT('id', ccc.id::TEXT, 'clienteId', ccc.cliente_id::TEXT, 'clienteNome', COALESCE(c.nome, c.nome_fantasia, 'Cliente sem nome'), 'clienteGrupoRede', gr.nome, 'vendedorUuid', ccc.vendedor_uuid::TEXT, 'data', ccc.data, 'valor', ccc.valor, 'titulo', ccc.titulo, 'descricao', ccc.descricao_longa, 'tipoCompromisso', INITCAP(ccc.tipo_compromisso), 'categoriaId', CASE WHEN ccc.categoria_id IS NOT NULL THEN ccc.categoria_id::TEXT ELSE NULL END, 'categoria', cat.nome, 'arquivosAnexos', COALESCE(ccc.arquivos_anexos, ARRAY[]::TEXT[]), 'valorPago', COALESCE(SUM(pac.valor_pago), 0), 'valorPendente', ccc.valor - COALESCE(SUM(pac.valor_pago), 0), 'status', CASE WHEN COALESCE(SUM(pac.valor_pago), 0) = 0 THEN 'Pendente' WHEN COALESCE(SUM(pac.valor_pago), 0) >= ccc.valor THEN 'Pago Integralmente' ELSE 'Pago Parcialmente' END, 'dataCriacao', ccc.created_at, 'criadoPor', 'Sistema') INTO v_compromisso FROM public.conta_corrente_cliente ccc INNER JOIN public.cliente c ON c.cliente_id = ccc.cliente_id LEFT JOIN public.grupos_redes gr ON gr.id = c.grupo_id LEFT JOIN public.categorias_conta_corrente cat ON cat.id = ccc.categoria_id AND cat.deleted_at IS NULL LEFT JOIN public.pagamento_acordo_cliente pac ON pac.conta_corrente_id = ccc.id WHERE ccc.id = p_id AND (v_is_backoffice OR EXISTS (SELECT 1 FROM public.cliente_vendedores cv WHERE cv.cliente_id = c.cliente_id AND cv.vendedor_id = p_requesting_user_id)) GROUP BY ccc.id, ccc.cliente_id, ccc.categoria_id, cat.nome, c.nome, c.nome_fantasia, gr.nome, ccc.vendedor_uuid, ccc.data, ccc.valor, ccc.titulo, ccc.descricao_longa, ccc.tipo_compromisso, ccc.arquivos_anexos, ccc.created_at; IF v_compromisso IS NULL THEN RAISE EXCEPTION 'Compromisso não encontrado'; END IF; SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT('id', pac.id::TEXT, 'compromissoId', pac.conta_corrente_id::TEXT, 'dataPagamento', pac.data_pagamento, 'formaPagamento', pac.forma_pagamento, 'valor', pac.valor_pago, 'categoriaId', CASE WHEN pac.categoria_id IS NOT NULL THEN pac.categoria_id::TEXT ELSE NULL END, 'categoria', cat_pag.nome, 'arquivoComprovante', pac.arquivo_comprovante, 'dataCriacao', pac.created_at, 'criadoPor', 'Sistema') ORDER BY pac.data_pagamento DESC, pac.created_at DESC), '[]'::JSON) INTO v_pagamentos FROM public.pagamento_acordo_cliente pac LEFT JOIN public.categorias_conta_corrente cat_pag ON cat_pag.id = pac.categoria_id AND cat_pag.deleted_at IS NULL WHERE pac.conta_corrente_id = p_id; SELECT JSON_BUILD_OBJECT('compromisso', v_compromisso, 'pagamentos', COALESCE(v_pagamentos, '[]'::JSON)) INTO v_result; RETURN v_result; EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error in get_conta_corrente_v2: %', SQLERRM; RAISE; END; $function$
;

-- ---- get_dados_vendedor ----
CREATE OR REPLACE FUNCTION public.get_dados_vendedor(vendedor_ids uuid[])
 RETURNS TABLE(user_id uuid, nome_fantasia text, codigo_sequencial text, ref_tipo_pessoa_id bigint, cpf_cnpj text, telefone text, telefone_adicional text, website text, email text, email_nf text, observacao_contato text, cep text, logradouro text, numero text, complemento text, bairro text, cidade text, estado text, observacao text, "Comissão" bigint, nome text, aliquotafixa numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Se a lista for vazia, retorna um conjunto vazio diretamente
    IF array_length(vendedor_ids, 1) IS NULL THEN
        RETURN;
    END IF;

    -- Retorna os vendedores cujos IDs estão na lista passada
    RETURN QUERY 
    SELECT 
        dv.user_id,
        dv.nome_fantasia,
        dv.codigo_sequencial,
        dv.ref_tipo_pessoa_id,
        dv.cpf_cnpj,
        dv.telefone,
        dv.telefone_adicional,
        dv.website,
        dv.email,
        dv.email_nf,
        dv.observacao_contato,
        dv.cep,
        dv.logradouro,
        dv.numero,
        dv.complemento,
        dv.bairro,
        dv.cidade,
        dv.estado,
        dv.observacao,
        dv."Comissão",
        dv.nome,
        dv.aliquotafixa
    FROM public.dados_vendedor dv
    WHERE dv.user_id = ANY(vendedor_ids);
END;
$function$
;

-- ---- get_dados_vendedor_completo_v2 ----
CREATE OR REPLACE FUNCTION public.get_dados_vendedor_completo_v2(p_user_id uuid, p_requesting_user_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_requesting_user_tipo TEXT;
  v_result JSON;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id é obrigatório';
  END IF;

  -- 2. VERIFICAR PERMISSÕES
  IF p_requesting_user_id IS NOT NULL THEN
    SELECT u.tipo INTO v_requesting_user_tipo
    FROM public.user u
    WHERE u.user_id = p_requesting_user_id
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    -- Vendedor só pode ver próprio perfil
    IF v_requesting_user_tipo = 'vendedor' AND p_requesting_user_id != p_user_id THEN
      RAISE EXCEPTION 'Vendedores só podem ver seu próprio perfil';
    END IF;
  END IF;

  -- 3. BUSCAR DADOS COMPLETOS
  SELECT JSON_BUILD_OBJECT(
    'user_id', u.user_id,
    'nome', u.nome,
    'email', u.email,
    'tipo', u.tipo,
    'ativo', u.ativo,
    'data_cadastro', u.data_cadastro,
    'ultimo_acesso', u.ultimo_acesso,
    'ref_user_role_id', u.ref_user_role_id,
    'user_login', u.user_login,
    'first_login', u.first_login,
    'dados_vendedor', CASE 
      WHEN dv.user_id IS NOT NULL THEN JSON_BUILD_OBJECT(
        'iniciais', dv.iniciais,
        'cpf', dv.cpf_cnpj,
        'telefone', dv.telefone,
        'data_admissao', dv.data_admissao,
        'status', dv.status,
        'cnpj', dv.cnpj,
        'razao_social', dv.razao_social,
        'nome_fantasia', dv.nome_fantasia,
        'inscricao_estadual', dv.inscricao_estadual,
        'cep', dv.cep,
        'logradouro', dv.logradouro,
        'numero', dv.numero,
        'complemento', dv.complemento,
        'bairro', dv.bairro,
        'cidade', dv.cidade,
        'estado', dv.estado,
        'observacoes_internas', dv.observacoes_internas,
        'dados_bancarios', COALESCE(dv.dados_bancarios, '{}'::JSONB),
        'contatos_adicionais', COALESCE(dv.contatos_adicionais, '[]'::JSONB),
        'aliquotafixa', dv.aliquotafixa
      )
      ELSE NULL
    END
  )
  INTO v_result
  FROM public.user u
  LEFT JOIN public.dados_vendedor dv ON dv.user_id = u.user_id AND dv.deleted_at IS NULL
  WHERE u.user_id = p_user_id
  AND u.deleted_at IS NULL;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Vendedor não encontrado';
  END IF;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in get_dados_vendedor_completo_v2 for user %: %', p_user_id, SQLERRM;
    RAISE;
END;
$function$
;

-- ---- get_empresas_v2 ----
CREATE OR REPLACE FUNCTION public.get_empresas_v2(p_id bigint)
 RETURNS TABLE(id bigint, cnpj text, razao_social text, nome_fantasia text, inscricao_estadual text, chave_api text, endereco jsonb, contas_bancarias jsonb, integracoes_erp jsonb, ativo boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_id IS NULL THEN RAISE EXCEPTION 'ID é obrigatório'; END IF;
  RETURN QUERY SELECT e.id, e.cnpj, COALESCE(e.razao_social, e.nome)::TEXT, COALESCE(e.nome_fantasia, e.razao_social, e.nome)::TEXT, e.inscricao_estadual, COALESCE(e.chave_api, '')::TEXT, e.endereco, e.contas_bancarias, e.integracoes_erp, e.ativo, e.created_at, e.updated_at FROM public.ref_empresas_subsidiarias e WHERE e.id = p_id AND e.deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Empresa não encontrada'; END IF;
EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error in get_empresas_v2: %', SQLERRM; RAISE;
END;
$function$
;

-- ---- get_estatisticas_conta_corrente ----
CREATE OR REPLACE FUNCTION public.get_estatisticas_conta_corrente(p_vendedor_uuid uuid DEFAULT NULL::uuid, p_data_inicio date DEFAULT NULL::date, p_data_fim date DEFAULT NULL::date)
 RETURNS TABLE(total_investimentos numeric, total_ressarcimentos numeric, total_pagamentos numeric, saldo_geral numeric, quantidade_compromissos bigint, quantidade_pagamentos bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN tipo_compromisso = 'investimento' THEN valor ELSE 0 END), 0) as total_investimentos,
        COALESCE(SUM(CASE WHEN tipo_compromisso = 'ressarcimento' THEN valor ELSE 0 END), 0) as total_ressarcimentos,
        COALESCE(SUM(pac.valor_pago), 0) as total_pagamentos,
        COALESCE(SUM(CASE WHEN tipo_compromisso = 'investimento' THEN valor ELSE -valor END), 0) - COALESCE(SUM(pac.valor_pago), 0) as saldo_geral,
        COUNT(ccc.id) as quantidade_compromissos,
        COUNT(pac.id) as quantidade_pagamentos
    FROM public.conta_corrente_cliente ccc
    LEFT JOIN public.pagamento_acordo_cliente pac ON ccc.id = pac.conta_corrente_id
    WHERE 
        (p_vendedor_uuid IS NULL OR ccc.vendedor_uuid = p_vendedor_uuid)
        AND (p_data_inicio IS NULL OR ccc.data >= p_data_inicio)
        AND (p_data_fim IS NULL OR ccc.data <= p_data_fim);
END;
$function$
;

-- ---- get_grupos_redes_v2 ----
CREATE OR REPLACE FUNCTION public.get_grupos_redes_v2(p_id uuid)
 RETURNS TABLE(id uuid, nome text, descricao text, ativo boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$ BEGIN IF p_id IS NULL THEN RAISE EXCEPTION 'ID é obrigatório'; END IF; RETURN QUERY SELECT g.id, g.nome, g.descricao, g.ativo, g.created_at, g.updated_at FROM public.grupos_redes g WHERE g.id = p_id AND g.deleted_at IS NULL; IF NOT FOUND THEN RAISE EXCEPTION 'Grupo/rede não encontrado'; END IF; EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error in get_grupos_redes_v2: %', SQLERRM; RAISE; END; $function$
;

-- ---- get_lista_preco_produtos_completos ----
CREATE OR REPLACE FUNCTION public.get_lista_preco_produtos_completos(p_lista_preco_id bigint)
 RETURNS TABLE(produto_id bigint, preco numeric, descricao text, codigo_sku text, gtin text, ncm text, cest text, peso_liquido numeric, peso_bruto numeric, situacao text, ativo boolean, disponivel boolean)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    plp.produto_id,
    plp.preco,
    p.descricao,
    p.codigo_sku,
    p.gtin,
    p.ncm,
    p.cest,
    p.peso_liquido,
    p.peso_bruto,
    p.situacao,
    p.ativo,
    p.disponivel
  FROM public.produtos_listas_precos plp
  INNER JOIN public.produto p ON p.produto_id = plp.produto_id
  WHERE plp.lista_preco_id = p_lista_preco_id
  ORDER BY p.descricao;
END;
$function$
;

-- ---- get_lista_preco_v2 ----
CREATE OR REPLACE FUNCTION public.get_lista_preco_v2(p_lista_preco_id bigint)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
  v_lista_preco RECORD;
  v_produtos JSON;
  v_faixas JSON;
BEGIN
  -- Buscar dados da lista
  SELECT 
    lp.id,
    lp.nome,
    COALESCE(lp.desconto, 0) as desconto,
    COALESCE(lp.ativo, true) as ativo,
    lp.codigo_sequencial,
    lp.data_criacao
  INTO v_lista_preco
  FROM listas_preco lp
  WHERE lp.id = p_lista_preco_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lista de preço não encontrada';
  END IF;

  -- Buscar produtos da lista
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'produtoId', plp.produto_id,
      'preco', plp.preco
    )
  )
  INTO v_produtos
  FROM produtos_listas_precos plp
  WHERE plp.lista_preco_id = p_lista_preco_id;

  -- Buscar faixas de comissão
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'id', lpc.id,
      'descontoMin', lpc.desconto_minimo,
      'descontoMax', lpc.desconto_maximo,
      'percentualComissao', lpc.comissao
    )
    ORDER BY lpc.desconto_minimo
  )
  INTO v_faixas
  FROM listas_preco_comissionamento lpc
  WHERE lpc.lista_preco_id = p_lista_preco_id;

  -- Montar resposta
  -- Verificar se há faixas (v_faixas pode ser NULL ou array vazio)
  v_result := JSON_BUILD_OBJECT(
    'id', v_lista_preco.id,
    'nome', v_lista_preco.nome,
    'desconto', v_lista_preco.desconto,
    'ativo', v_lista_preco.ativo,
    'codigo_sequencial', v_lista_preco.codigo_sequencial,
    'produtos', COALESCE(v_produtos, '[]'::JSON),
    'faixas_comissao', COALESCE(v_faixas, '[]'::JSON),
    'tipo_comissao', CASE 
      WHEN v_faixas IS NOT NULL 
        AND jsonb_typeof(v_faixas::jsonb) = 'array' 
        AND jsonb_array_length(v_faixas::jsonb) > 0 
      THEN 'conforme_desconto'
      ELSE 'fixa'
    END,
    'created_at', v_lista_preco.data_criacao,
    'updated_at', v_lista_preco.data_criacao
  );

  RETURN v_result;
END;
$function$
;

-- ---- get_meta_total_vendedor_v2 ----
CREATE OR REPLACE FUNCTION public.get_meta_total_vendedor_v2(p_ano integer, p_mes integer)
 RETURNS TABLE(total numeric)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total NUMERIC;
BEGIN
  IF p_ano IS NULL OR p_ano < 2000 OR p_ano > 2100 THEN
    RAISE EXCEPTION 'Ano inválido';
  END IF;

  IF p_mes IS NULL OR p_mes < 1 OR p_mes > 12 THEN
    RAISE EXCEPTION 'Mês inválido';
  END IF;

  SELECT COALESCE(SUM(m.meta_valor), 0)
  INTO v_total
  FROM public.metas_vendedor m
  WHERE m.ano = p_ano
  AND m.mes = p_mes;

  RETURN QUERY
  SELECT v_total;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in get_meta_total_vendedor_v2: %', SQLERRM;
    RAISE;
END;
$function$
;

-- ---- get_meta_vendedor_v2 ----
CREATE OR REPLACE FUNCTION public.get_meta_vendedor_v2(p_id integer)
 RETURNS TABLE(id integer, vendedor_id uuid, vendedor_nome text, ano integer, mes integer, meta_valor numeric, meta_percentual_crescimento numeric, periodo_referencia text, data_criacao timestamp with time zone, data_atualizacao timestamp with time zone)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'ID é obrigatório';
  END IF;

  RETURN QUERY
  SELECT 
    m.id,
    m.vendedor_id,
    COALESCE(dv.nome, u.nome, '') AS vendedor_nome,
    m.ano,
    m.mes,
    m.meta_valor,
    m.meta_percentual_crescimento,
    m.periodo_referencia,
    m.data_criacao,
    m.data_atualizacao
  FROM public.metas_vendedor m
  LEFT JOIN public.dados_vendedor dv ON dv.user_id = m.vendedor_id
  LEFT JOIN public.user u ON u.user_id = m.vendedor_id
  WHERE m.id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meta não encontrada';
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in get_meta_vendedor_v2: %', SQLERRM;
    RAISE;
END;
$function$
;

-- ---- get_natureza_operacao_v2 ----
CREATE OR REPLACE FUNCTION public.get_natureza_operacao_v2(p_id bigint)
 RETURNS TABLE(id bigint, nome text, codigo text, descricao text, gera_comissao boolean, gera_receita boolean, ativo boolean, tiny_id text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  -- 1. VALIDAÇÕES
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'ID é obrigatório';
  END IF;

  -- 2. BUSCAR E RETORNAR
  RETURN QUERY
  SELECT 
    n.id,
    n.nome,
    n.codigo,
    n.descricao,
    n.tem_comissao AS gera_comissao,
    n.gera_receita,
    n.ativo,
    n.tiny_id,
    n.created_at,
    n.updated_at
  FROM public.natureza_operacao n
  WHERE n.id = p_id
    AND n.deleted_at IS NULL;

  -- 3. VERIFICAR SE ENCONTROU
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Natureza de operação não encontrada';
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in get_natureza_operacao_v2: %', SQLERRM;
    RAISE;
END;
$function$
;

-- ---- get_pedido_venda_v2 ----
CREATE OR REPLACE FUNCTION public.get_pedido_venda_v2(p_pedido_id bigint, p_requesting_user_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$DECLARE
  v_user_tipo TEXT;
  v_is_backoffice BOOLEAN;
  v_pedido JSON;
  v_produtos JSON;
  v_result JSON;
BEGIN
  IF p_pedido_id IS NULL THEN
    RAISE EXCEPTION 'pedido_id é obrigatório';
  END IF;

  -- Permissão
  IF p_requesting_user_id IS NOT NULL THEN
    SELECT u.tipo
      INTO v_user_tipo
    FROM public."user" u
    WHERE u.user_id = p_requesting_user_id
      AND u.ativo = TRUE
      AND u.deleted_at IS NULL;

    v_is_backoffice := (v_user_tipo = 'backoffice');
  ELSE
    v_is_backoffice := FALSE;
  END IF;

  -- Pedido (puxando nomes via tabelas, com fallback para campos do pv)
  SELECT JSON_BUILD_OBJECT(
    'id', pv."pedido_venda_ID"::TEXT,
    'numero', pv.numero_pedido,

    'clienteId', pv.cliente_id::TEXT,
    'nomeCliente', COALESCE(c.nome, pv.nome_cliente),
    'cnpjCliente', COALESCE(c.cpf_cnpj, pv.cnpj_cliente),
    'inscricaoEstadualCliente', COALESCE(c.inscricao_estadual, pv.inscricao_estadual_cliente),

    'vendedorId', pv.vendedor_uuid::TEXT,
    'nomeVendedor', COALESCE(dv.nome_fantasia, pv.nome_vendedor),

    'naturezaOperacaoId', COALESCE(no.id::TEXT, pv.natureza_id::TEXT),
    'nomeNaturezaOperacao', COALESCE(no.nome, pv.nome_natureza_operacao),

    'empresaFaturamentoId', pv.empresa_faturamento_id::TEXT,
    'nomeEmpresaFaturamento', COALESCE(re.nome, pv.nome_empresa_faturamento),

    'listaPrecoId', pv.lista_preco_id::TEXT,
    'nomeListaPreco', COALESCE(lp.nome, pv.nome_lista_preco),

    'percentualDescontoPadrao', pv.percentual_desconto_padrao,

    'condicaoPagamentoId', pv.id_condicao::INT,
    'nomeCondicaoPagamento', COALESCE(cp."Descrição", pv.nome_condicao_pagamento),

    'valorPedido', pv.valor_total,
    'valorTotalProdutos', pv.valor_total_produtos,
    'percentualDescontoExtra', pv.percentual_desconto_extra,
    'valorDescontoExtra', pv.valor_desconto_extra,
    'totalQuantidades', pv.total_quantidades,
    'totalItens', pv.total_itens,
    'pesoBrutoTotal', pv.peso_bruto_total,
    'pesoLiquidoTotal', pv.peso_liquido_total,

    'status', pv.status,
    'dataPedido', pv.data_venda,
    'ordemCompraCliente', pv.ordem_cliente,

    'observacoesInternas', pv.observacao_interna,
    'observacoesNotaFiscal', pv.observacao,

    'createdAt', pv.timestamp,
    'updatedAt', pv.updated_at,
    'createdBy', pv.created_by::TEXT,
    'idTiny', pv.id_tiny,

    'geraReceita', COALESCE(no.gera_receita, FALSE)
  )
  INTO v_pedido
  FROM public.pedido_venda pv
  LEFT JOIN public.cliente c ON c.cliente_id = pv.cliente_id
  LEFT JOIN public.natureza_operacao no ON no.id = pv.natureza_id
  LEFT JOIN public.dados_vendedor dv ON dv.user_id::uuid = pv.vendedor_uuid::uuid
  LEFT JOIN public.listas_preco lp ON lp.id = pv.lista_preco_id
  LEFT JOIN public.ref_empresas_subsidiarias re ON re.id = pv.empresa_faturamento_id
  LEFT JOIN public."Condicao_De_Pagamento" cp
    ON cp."Condição_ID"::text = pv.id_condicao::text
  WHERE pv."pedido_venda_ID" = p_pedido_id
    AND pv.deleted_at IS NULL
    AND (v_is_backoffice OR pv.vendedor_uuid = p_requesting_user_id);

  IF v_pedido IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado ou sem permissão de acesso';
  END IF;

  -- Produtos com fallback para dados de catálogo (produto)
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'id', x.pedido_venda_produtos_id::TEXT,
      'numero', x.numero,
      'produtoId', x.produto_id::TEXT,
      'descricaoProduto', x.descricao_produto,
      'codigoSku', x.codigo_sku,
      'codigoEan', x.codigo_ean,
      'valorTabela', x.valor_tabela,
      'percentualDesconto', x.percentual_desconto,
      'valorUnitario', x.valor_unitario,
      'quantidade', x.quantidade,
      'subtotal', x.subtotal,
      'pesoBruto', x.peso_bruto,
      'pesoLiquido', x.peso_liquido,
      'unidade', x.unidade
    )
    ORDER BY x.ordem_item, x.pedido_venda_produtos_id
  )
  INTO v_produtos
  FROM (
    SELECT
      pvp.pedido_venda_produtos_id,
      pvp.produto_id,
      COALESCE(
        pvp.numero,
        ROW_NUMBER() OVER (ORDER BY pvp.pedido_venda_produtos_id)
      ) AS numero,
      COALESCE(NULLIF(pvp.descricao, ''), pr.descricao, 'Produto sem descrição') AS descricao_produto,
      COALESCE(NULLIF(pvp.codigo_sku, ''), pr.codigo_sku) AS codigo_sku,
      COALESCE(NULLIF(pvp.codigo_ean, ''), pr.gtin) AS codigo_ean,
      COALESCE(pvp.valor_tabela, pvp.valor_unitario, pr.preco_venda, 0) AS valor_tabela,
      COALESCE(pvp.percentual_desconto, 0) AS percentual_desconto,
      COALESCE(pvp.valor_unitario, pvp.valor_tabela, pr.preco_venda, 0) AS valor_unitario,
      COALESCE(pvp.quantidade, 0) AS quantidade,
      COALESCE(
        pvp.subtotal,
        COALESCE(pvp.valor_unitario, pvp.valor_tabela, pr.preco_venda, 0) * COALESCE(pvp.quantidade, 0)
      ) AS subtotal,
      COALESCE(pvp.peso_bruto, pr.peso_bruto, 0) AS peso_bruto,
      COALESCE(pvp.peso_liquido, pr.peso_liquido, 0) AS peso_liquido,
      COALESCE(NULLIF(pvp.unidade, ''), pr.sigla_unidade, 'UN') AS unidade,
      COALESCE(pvp.numero, 2147483647) AS ordem_item
    FROM public.pedido_venda_produtos pvp
    LEFT JOIN public.produto pr
      ON pr.produto_id = pvp.produto_id
    WHERE pvp.pedido_venda_id = p_pedido_id
  ) x;

  SELECT JSON_BUILD_OBJECT(
    'pedido', v_pedido,
    'produtos', COALESCE(v_produtos, '[]'::JSON)
  )
  INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in get_pedido_venda_v2 for pedido %: %', p_pedido_id, SQLERRM;
    RAISE;
END;$function$
;

-- ---- get_preview_comissoes ----
CREATE OR REPLACE FUNCTION public.get_preview_comissoes(p_periodo text, p_vendedor_uuid uuid DEFAULT NULL::uuid)
 RETURNS TABLE(vendedor_id uuid, vendedor_nome text, qtd_pedidos bigint, valor_total_pedidos numeric, comissao_estimada numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  BEGIN                                                                                                          
      RETURN QUERY                                              
      SELECT
          pv.vendedor_uuid as vendedor_id,
          u.nome as vendedor_nome,            
          COUNT(pv."pedido_venda_ID") as qtd_pedidos,
          COALESCE(SUM(pv.valor_total), 0) as valor_total_pedidos,
          COALESCE(SUM(                                                                                          
              ROUND(                      
                  pv.valor_total::numeric *                                                                      
                  CASE                                                                                           
                      WHEN dv."Comissão" = 2 THEN COALESCE(dv.aliquotafixa, 0)
                      WHEN dv."Comissão" = 1 THEN COALESCE((                                                     
                          SELECT lpc.comissao                                                                    
                          FROM public.listas_preco_comissionamento lpc
                          WHERE lpc.lista_preco_id = c.lista_de_preco::bigint                                    
                            AND COALESCE(c.desconto, 0) BETWEEN lpc.desconto_minimo AND lpc.desconto_maximo
                          ORDER BY lpc.desconto_minimo ASC, lpc.id ASC                                           
                          LIMIT 1                               
                      ), 0)                                                                                      
                      ELSE 0                                                                                     
                  END / 100                                                                                      
              , 2)                                                                                               
          ), 0) as comissao_estimada                                                                             
      FROM public.pedido_venda pv
      JOIN public."user" u ON u.user_id = pv.vendedor_uuid                                                       
      LEFT JOIN public.dados_vendedor dv ON dv.user_id = pv.vendedor_uuid
      LEFT JOIN public.cliente c ON c.cliente_id = pv.cliente_id
      WHERE pv.status IN ('Em aberto', 'Aprovado', 'Preparando envio', 'Pronto para envio', 'Enviado')           
        AND pv.natureza_operacao IS DISTINCT FROM 'Bonificação'
        AND NOT EXISTS (                                                                                         
            SELECT 1 FROM public."vendedor_comissão" vc         
            WHERE vc.pedido_id = pv."pedido_venda_ID"                                                            
        )                                                                                                        
        AND (p_vendedor_uuid IS NULL OR pv.vendedor_uuid = p_vendedor_uuid)                                      
      GROUP BY pv.vendedor_uuid, u.nome;                                                                         
  END;                                                                                                           
  $function$
;

-- ---- get_price_list_detail ----
CREATE OR REPLACE FUNCTION public.get_price_list_detail(p_lista_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSONB;
BEGIN
  IF p_lista_id IS NULL THEN
    RAISE EXCEPTION 'lista_id é obrigatório';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.listas_preco WHERE id = p_lista_id) THEN
    RAISE EXCEPTION 'Lista de preço % não encontrada', p_lista_id;
  END IF;

  SELECT jsonb_build_object(
    'lista', jsonb_build_object(
      'id', lp.id,
      'nome', lp.nome,
      'desconto', lp.desconto,
      'ativo', lp.ativo,
      'codigo_sequencial', lp.codigo_sequencial,
      'data_criacao', lp.data_criacao
    ),
    'itens', COALESCE(
      (
        SELECT jsonb_agg(
                 jsonb_build_object(
                   'id', plp.id,
                   'produto_id', plp.produto_id,
                   'descricao', pr.descricao,
                   'sku', pr.codigo_sku,
                   'preco', plp.preco,
                   'gtin', pr.gtin
                 )
                 ORDER BY pr.descricao
               )
        FROM public.produtos_listas_precos plp
        LEFT JOIN public.produto pr ON pr.produto_id = plp.produto_id
        WHERE plp.lista_preco_id = lp.id
      ),
      '[]'::JSONB
    ),
    'regras', COALESCE(
      (
        SELECT jsonb_agg(
                 jsonb_build_object(
                   'id', lpc.id,
                   'desconto_minimo', lpc.desconto_minimo,
                   'desconto_maximo', lpc.desconto_maximo,
                   'comissao', lpc.comissao
                 )
                 ORDER BY lpc.desconto_minimo
               )
        FROM public.listas_preco_comissionamento lpc
        WHERE lpc.lista_preco_id = lp.id
      ),
      '[]'::JSONB
    )
  )
  INTO v_result
  FROM public.listas_preco lp
  WHERE lp.id = p_lista_id;

  RETURN v_result;
END;
$function$
;

-- ---- get_produto_v2 ----
CREATE OR REPLACE FUNCTION public.get_produto_v2(p_produto_id bigint)
 RETURNS TABLE(produto_id bigint, foto text, descricao text, codigo_sku text, codigo_ean text, marca_id bigint, nome_marca text, tipo_produto_id bigint, nome_tipo_produto text, ncm text, cest text, unidade_id bigint, sigla_unidade text, peso_liquido numeric, peso_bruto numeric, situacao text, ativo boolean, disponivel boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validações
  IF p_produto_id IS NULL THEN
    RAISE EXCEPTION 'produto_id é obrigatório';
  END IF;

  RETURN QUERY
  SELECT 
    p.produto_id,
    p.foto,
    p.descricao,
    p.codigo_sku,
    p.gtin AS codigo_ean,
    p.marca AS marca_id,
    COALESCE(m.descricao, p.nome_marca, '') AS nome_marca,
    p.tipo_id AS tipo_produto_id,
    COALESCE(t.nome, p.nome_tipo_produto, '') AS nome_tipo_produto,
    p.ncm,
    p.cest,
    p.unidade_id,
    COALESCE(u.sigla, p.sigla_unidade, '') AS sigla_unidade,
    COALESCE(p.peso_liquido, 0) AS peso_liquido,
    COALESCE(p.peso_bruto, 0) AS peso_bruto,
    COALESCE(p.situacao, 'Ativo') AS situacao,
    COALESCE(p.ativo, true) AS ativo,
    COALESCE(p.disponivel, true) AS disponivel,
    p.created_at,
    p.updated_at
  FROM produto p
  LEFT JOIN marcas m ON m.id = p.marca
  LEFT JOIN ref_tipo_produto t ON t.id = p.tipo_id
  LEFT JOIN ref_unidade_medida u ON u.id = p.unidade_id
  WHERE p.produto_id = p_produto_id
    AND p.deleted_at IS NULL;

  -- Verificar se produto foi encontrado
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in get_produto_v2 for produto_id %: %', p_produto_id, SQLERRM;
    RAISE;
END;
$function$
;

-- ---- get_relatorio_comissoes_v2 ----
CREATE OR REPLACE FUNCTION public.get_relatorio_comissoes_v2(p_periodo text, p_vendedor_uuid uuid DEFAULT NULL::uuid)
 RETURNS TABLE(vendedor_id uuid, vendedor_nome text, periodo text, total_vendas numeric, total_comissao numeric, total_creditos numeric, total_debitos numeric, total_pagos numeric, saldo_anterior numeric, saldo_final numeric, status text, data_fechamento timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    WITH vendas_agrupadas AS (
        SELECT 
            vc.vendedor_uuid,
            COALESCE(SUM(vc.valor_total), 0) as total_vendas,
            COALESCE(SUM(vc.valor_comissao), 0) as total_comissao
        FROM public.vendedor_comissão vc
        WHERE 
            (vc.periodo = p_periodo) 
            OR (vc.periodo IS NULL AND TO_CHAR(vc.data_inicio, 'YYYY-MM') = p_periodo)
        GROUP BY vc.vendedor_uuid
    ),
    lancamentos_agrupados AS (
        SELECT 
            lc.vendedor_uuid,
            COALESCE(SUM(CASE WHEN lc.tipo = 'credito' THEN lc.valor ELSE 0 END), 0) as total_creditos,
            COALESCE(SUM(CASE WHEN lc.tipo = 'debito' THEN lc.valor ELSE 0 END), 0) as total_debitos
        FROM public.lancamentos_comissao lc
        WHERE lc.periodo = p_periodo
        GROUP BY lc.vendedor_uuid
    ),
    pagamentos_agrupados AS (
        SELECT 
            pc.vendedor_uuid,
            COALESCE(SUM(pc.valor), 0) as total_pagos
        FROM public.pagamentos_comissao pc
        WHERE pc.periodo = p_periodo
        GROUP BY pc.vendedor_uuid
    ),
    controle_periodo AS (
        SELECT 
            cp.vendedor_uuid,
            cp.status,
            cp.saldo_anterior,
            cp.saldo_final,
            cp.data_fechamento
        FROM public.controle_comissao_periodo cp
        WHERE cp.periodo = p_periodo
    ),
    vendedores_ativos AS (
        SELECT u.user_id, u.nome 
        FROM public."user" u
        WHERE u.tipo = 'vendedor' 
        AND (p_vendedor_uuid IS NULL OR u.user_id = p_vendedor_uuid)
    )
    SELECT 
        v.user_id as vendedor_id,
        v.nome as vendedor_nome,
        p_periodo as periodo,
        COALESCE(va.total_vendas, 0) as total_vendas,
        COALESCE(va.total_comissao, 0) as total_comissao,
        COALESCE(la.total_creditos, 0) as total_creditos,
        COALESCE(la.total_debitos, 0) as total_debitos,
        COALESCE(pa.total_pagos, 0) as total_pagos,
        COALESCE(cp.saldo_anterior, 0) as saldo_anterior,
        CASE 
            WHEN cp.status = 'fechado' OR cp.status = 'pago' THEN cp.saldo_final
            ELSE (COALESCE(cp.saldo_anterior, 0) + COALESCE(va.total_comissao, 0) + COALESCE(la.total_creditos, 0) - COALESCE(la.total_debitos, 0) - COALESCE(pa.total_pagos, 0))
        END as saldo_final,
        COALESCE(cp.status, 'aberto') as status,
        cp.data_fechamento
    FROM vendedores_ativos v
    LEFT JOIN vendas_agrupadas va ON va.vendedor_uuid = v.user_id
    LEFT JOIN lancamentos_agrupados la ON la.vendedor_uuid = v.user_id
    LEFT JOIN pagamentos_agrupados pa ON pa.vendedor_uuid = v.user_id
    LEFT JOIN controle_periodo cp ON cp.vendedor_uuid = v.user_id;
END;
$function$
;

-- ---- get_segmento_cliente_v2 ----
CREATE OR REPLACE FUNCTION public.get_segmento_cliente_v2(p_id bigint)
 RETURNS TABLE(id bigint, nome text, descricao text, ativo boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'ID e obrigatorio';
  END IF;

  RETURN QUERY
  SELECT 
    s.id,
    s.nome,
    s.descricao,
    s.ativo,
    s.created_at,
    s.updated_at
  FROM public.segmento_cliente s
  WHERE s.id = p_id
    AND s.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Segmento de cliente nao encontrado';
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in get_segmento_cliente_v2: %', SQLERRM;
    RAISE;
END;
$function$
;

-- ---- get_tipos_veiculo_v2 ----
CREATE OR REPLACE FUNCTION public.get_tipos_veiculo_v2(p_id uuid)
 RETURNS TABLE(id uuid, nome text, descricao text, ativo boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$ BEGIN IF p_id IS NULL THEN RAISE EXCEPTION 'ID é obrigatório'; END IF; RETURN QUERY SELECT t.id, t.nome, t.descricao, t.ativo, t.created_at, t.updated_at FROM public.tipos_veiculo t WHERE t.id = p_id AND t.deleted_at IS NULL; IF NOT FOUND THEN RAISE EXCEPTION 'Tipo de veículo não encontrado'; END IF; EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error in get_tipos_veiculo_v2: %', SQLERRM; RAISE; END; $function$
;

-- ---- get_user_by_id_v2 ----
CREATE OR REPLACE FUNCTION public.get_user_by_id_v2(p_user_id uuid, p_requesting_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(user_id uuid, nome text, email text, tipo text, ativo boolean, data_cadastro timestamp with time zone, ultimo_acesso timestamp with time zone, ref_user_role_id bigint, user_login text, first_login boolean)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_requesting_user_tipo TEXT;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id é obrigatório';
  END IF;

  -- 2. VERIFICAR PERMISSÕES
  IF p_requesting_user_id IS NOT NULL THEN
    -- Usar alias explícito para evitar ambiguidade
    SELECT u.tipo INTO v_requesting_user_tipo
    FROM public.user u
    WHERE u.user_id = p_requesting_user_id
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    -- Vendedor só pode ver próprio perfil
    IF v_requesting_user_tipo = 'vendedor' AND p_requesting_user_id != p_user_id THEN
      RAISE EXCEPTION 'Vendedores só podem ver seu próprio perfil';
    END IF;
  END IF;

  -- 3. BUSCAR USUÁRIO
  RETURN QUERY
  SELECT 
    u.user_id,
    u.nome,
    u.email,
    u.tipo,
    u.ativo,
    u.data_cadastro,
    u.ultimo_acesso,
    u.ref_user_role_id,
    u.user_login,
    u.first_login
  FROM public.user u
  WHERE u.user_id = p_user_id
  AND u.deleted_at IS NULL;

  -- Verificar se encontrou
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in get_user_by_id_v2 for user %: %', p_user_id, SQLERRM;
    RAISE;
END;
$function$
;

-- ---- get_vendedor_comissao ----
CREATE OR REPLACE FUNCTION public.get_vendedor_comissao(p_vendedor_id uuid, p_mes_referencia text)
 RETURNS TABLE(vendedor_uuid uuid, nome_vendedor text, saldo_anterior numeric, saldo_mes numeric, saldo_total numeric, comissao_pedido jsonb)
 LANGUAGE plpgsql
AS $function$BEGIN
  RETURN QUERY
    SELECT
      dv.user_id       AS vendedor_uuid,
      dv.nome          AS nome_vendedor,

      -- 1) SALDO ANTERIOR: somar todas as comissões (com débito = negativo)
      --    cuja data_inicio seja STRICTAMENTE ANTERIOR ao mês referência
      COALESCE(
        SUM(
          CASE
            WHEN TO_CHAR(vc.data_inicio, 'YYYY-MM') < p_mes_referencia 
            THEN 
              CASE 
                WHEN vc.debito THEN -COALESCE(vc.valor_comissao, 0)
                ELSE  COALESCE(vc.valor_comissao, 0)
              END
            ELSE 0
          END
        ), 
        0
      ) AS saldo_anterior,

      -- 2) SALDO DO MÊS: somar todas as comissões cuja data_inicio esteja NO MÊS referência
      COALESCE(
        SUM(
          CASE
            WHEN TO_CHAR(vc.data_inicio, 'YYYY-MM') = p_mes_referencia 
            THEN 
              CASE 
                WHEN vc.debito THEN -COALESCE(vc.valor_comissao, 0)
                ELSE  COALESCE(vc.valor_comissao, 0)
              END
            ELSE 0
          END
        ), 
        0
      ) AS saldo_mes,

      -- 3) SALDO TOTAL: soma condicional de (tudo que aconteceu antes OU dentro do mês)
      COALESCE(
        SUM(
          CASE
            WHEN TO_CHAR(vc.data_inicio, 'YYYY-MM') <= p_mes_referencia
            THEN 
              CASE 
                WHEN vc.debito THEN -COALESCE(vc.valor_comissao, 0)
                ELSE  COALESCE(vc.valor_comissao, 0)
              END
            ELSE 0
          END
        ), 
        0
      ) AS saldo_total,

      -- 4) LISTA DE COMISSÕES DO MÊS (JSONB_AGG só agrega as linhas do mês referência)
      COALESCE(
        JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'vendedor_comissao_id', vc.vendedor_comissao_id,
            'pedido_id',             vc.pedido_id,
            'data_inicio',           vc.data_inicio,
            'valor_comissao',
              REPLACE(
                REPLACE(
                  REPLACE(
                    TO_CHAR(
                      COALESCE(vc.valor_comissao, 0),
                      'FM9,999,999,990.00'
                    ),
                    ',', 'X'
                  ),
                  '.', ','
                ),
                'X', '.'
              ),
            'valor_total_pedido',
              REPLACE(
                REPLACE(
                  REPLACE(
                    TO_CHAR(
                      COALESCE(pv.valor_total, 0),
                      'FM9,999,999,990.00'
                    ),
                    ',', 'X'
                  ),
                  '.', ','
                ),
                'X', '.'
              ),
            'cliente_id',            pv.cliente_id,
            'cliente_nome',          c.nome,
            'numero_pedido',         pv.numero_pedido,
            'debito',                vc.debito,
            'observacao',            vc.observacao
          )
          ORDER BY vc.data_inicio ASC
        ) FILTER (
          WHERE TO_CHAR(vc.data_inicio, 'YYYY-MM') = p_mes_referencia
        ),
        '[]'::jsonb
      ) AS comissao_pedido

    FROM public.dados_vendedor dv

    -- OBSERVAÇÃO IMPORTANTE: retiramos o filtro “AND TO_CHAR(vc.data_inicio, 'YYYY-MM') = p_mes_referencia”
    -- do JOIN, pois agora precisamos de TODAS AS LINHAS de “vendedor_comissão” para calcular
    -- saldo_anterior, saldo_mes e saldo_total em agregações condicionais.
    LEFT JOIN public.vendedor_comissão vc
      ON dv.user_id = vc.vendedor_uuid

    LEFT JOIN public.pedido_venda pv
      ON vc.pedido_id = pv."pedido_venda_ID"

    LEFT JOIN public.cliente c
      ON pv.cliente_id = c.cliente_id

    WHERE dv.user_id = p_vendedor_id
      -- (Não filtramos por data aqui, pois somamos condicionalmente acima)

    GROUP BY dv.user_id, dv.nome
    ORDER BY dv.nome;
END;$function$
;

-- ---- get_vendedores_conta_corrente ----
CREATE OR REPLACE FUNCTION public.get_vendedores_conta_corrente()
 RETURNS TABLE(vendedor_uuid uuid, vendedor_nome text, vendedor_fantasia text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        dv.user_id as vendedor_uuid,
        dv.nome as vendedor_nome,
        dv.nome_fantasia as vendedor_fantasia
    FROM public.dados_vendedor dv
    INNER JOIN public.conta_corrente_cliente ccc ON dv.user_id = ccc.vendedor_uuid
    ORDER BY dv.nome;
END;
$function$
;

-- ---- is_user_backoffice ----
CREATE OR REPLACE FUNCTION public.is_user_backoffice(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tipo TEXT;
BEGIN
  SELECT u.tipo INTO v_tipo
  FROM public.user u
  WHERE u.user_id = p_user_id
  AND u.ativo = TRUE
  AND u.deleted_at IS NULL
  LIMIT 1;
  
  RETURN COALESCE(v_tipo = 'backoffice', FALSE);
END;
$function$
;

-- ---- list_categorias_conta_corrente_v2 ----
CREATE OR REPLACE FUNCTION public.list_categorias_conta_corrente_v2(p_requesting_user_id uuid DEFAULT NULL::uuid, p_search text DEFAULT NULL::text, p_apenas_ativos boolean DEFAULT false, p_page integer DEFAULT 1, p_limit integer DEFAULT 100)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$ DECLARE v_offset INTEGER; v_total_count INTEGER; v_resultado JSON; BEGIN IF p_page < 1 THEN RAISE EXCEPTION 'Page must be greater than 0'; END IF; IF p_limit < 1 OR p_limit > 100 THEN RAISE EXCEPTION 'Limit must be between 1 and 100'; END IF; v_offset := (p_page - 1) * p_limit; SELECT COUNT(*) INTO v_total_count FROM public.categorias_conta_corrente c WHERE c.deleted_at IS NULL AND (NOT p_apenas_ativos OR c.ativo = TRUE) AND ( p_search IS NULL OR TRIM(p_search) = '' OR LOWER(c.nome) LIKE '%' || LOWER(p_search) || '%' OR LOWER(COALESCE(c.descricao, '')) LIKE '%' || LOWER(p_search) || '%' ); SELECT JSON_BUILD_OBJECT( 'categorias', COALESCE(JSON_AGG(item_data), '[]'::JSON), 'total', v_total_count, 'page', p_page, 'limit', p_limit, 'total_pages', CEIL(v_total_count::NUMERIC / NULLIF(p_limit, 0)) ) INTO v_resultado FROM ( SELECT JSON_BUILD_OBJECT( 'id', c.id::TEXT, 'nome', c.nome, 'descricao', c.descricao, 'cor', c.cor, 'ativo', c.ativo, 'createdAt', c.created_at, 'updatedAt', c.updated_at ) AS item_data FROM public.categorias_conta_corrente c WHERE c.deleted_at IS NULL AND (NOT p_apenas_ativos OR c.ativo = TRUE) AND ( p_search IS NULL OR TRIM(p_search) = '' OR LOWER(c.nome) LIKE '%' || LOWER(p_search) || '%' OR LOWER(COALESCE(c.descricao, '')) LIKE '%' || LOWER(p_search) || '%' ) ORDER BY c.nome ASC LIMIT p_limit OFFSET v_offset ) AS sub; RETURN v_resultado; EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error in list_categorias_conta_corrente_v2: %', SQLERRM; RAISE; END; $function$
;

-- ---- list_clientes_v2 ----
CREATE OR REPLACE FUNCTION public.list_clientes_v2(p_limit integer DEFAULT 10, p_page integer DEFAULT 1, p_requesting_user_id uuid DEFAULT NULL::uuid, p_search text DEFAULT NULL::text, p_status_aprovacao_filter text DEFAULT NULL::text, p_vendedor_filter uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_offset INTEGER;
  v_total_count INTEGER;
  v_user_tipo TEXT;
  v_clientes JSON;
  v_search_norm TEXT;
  v_search_digits TEXT;
BEGIN
  -- 1. VALIDACOES
  IF p_page < 1 THEN
    RAISE EXCEPTION 'Page must be greater than 0';
  END IF;
  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 100';
  END IF;

  -- 2. PERMISSAO
  IF p_requesting_user_id IS NOT NULL THEN
    SELECT tipo INTO v_user_tipo
    FROM public.user
    WHERE user_id = p_requesting_user_id
      AND ativo = TRUE
      AND deleted_at IS NULL;
  END IF;

  v_offset := (p_page - 1) * p_limit;

  -- 3. NORMALIZACAO DO TERMO DE BUSCA
  v_search_norm := CASE WHEN p_search IS NULL THEN NULL
                        ELSE unaccent(LOWER(p_search)) END;
  v_search_digits := CASE WHEN p_search IS NULL THEN NULL
                           ELSE NULLIF(REGEXP_REPLACE(p_search, '[^0-9]', '', 'g'), '') END;

  -- 4. CONTAR TOTAL
  SELECT COUNT(*)
  INTO v_total_count
  FROM public.cliente c
  WHERE c.deleted_at IS NULL
    AND (p_status_aprovacao_filter IS NULL OR c.status_aprovacao = p_status_aprovacao_filter)
    AND (
      v_search_norm IS NULL OR
      unaccent(LOWER(c.nome))                       LIKE '%' || v_search_norm || '%' OR
      unaccent(LOWER(c.nome_fantasia))              LIKE '%' || v_search_norm || '%' OR
      unaccent(LOWER(COALESCE(c.grupo_rede, '')))   LIKE '%' || v_search_norm || '%' OR
      LOWER(c.codigo)                               LIKE '%' || LOWER(p_search) || '%' OR
      LOWER(c.cpf_cnpj)                             LIKE '%' || LOWER(p_search) || '%' OR
      (v_search_digits IS NOT NULL
       AND LENGTH(v_search_digits) >= 3
       AND REGEXP_REPLACE(COALESCE(c.cpf_cnpj, ''), '[^0-9]', '', 'g') LIKE '%' || v_search_digits || '%')
    )
    AND (
      v_user_tipo = 'backoffice' OR
      (v_user_tipo = 'vendedor' AND (
        (c.status_aprovacao = 'aprovado'
         AND (c.criado_por = p_requesting_user_id
              OR p_requesting_user_id = ANY(c.vendedoresatribuidos)))
        OR
        (c.status_aprovacao = 'pendente' AND c.criado_por = p_requesting_user_id)
      ))
    )
    AND (p_vendedor_filter IS NULL OR p_vendedor_filter = ANY(c.vendedoresatribuidos));

  -- 5. BUSCAR CLIENTES COM JOIN PARA grupo_rede_nome E segmento_nome
  SELECT JSON_BUILD_OBJECT(
    'clientes', COALESCE(
      (SELECT JSON_AGG(
        json_build_object(
          'cliente_id', sub.cliente_id,
          'nome', sub.nome,
          'nome_fantasia', sub.nome_fantasia,
          'cpf_cnpj', sub.cpf_cnpj,
          'tipoPessoa', sub."ref_tipo_pessoa_id_FK",
          'codigo', sub.codigo,
          'status_aprovacao', sub.status_aprovacao,
          'grupo_rede', sub.grupo_rede,
          'grupo_rede_nome', sub.grupo_rede_nome,
          'segmento_id', sub.segmento_id,
          'segmento_nome', sub.segmento_nome,
          'ref_situacao_id', sub.ref_situacao_id,
          'situacao_nome', sub.situacao_nome,
          'created_at', sub.created_at,
          'updated_at', sub.updated_at
        )
      )
      FROM (
        SELECT
          c.cliente_id,
          c.nome,
          c.nome_fantasia,
          c.cpf_cnpj,
          c."ref_tipo_pessoa_id_FK",
          c.codigo,
          c.status_aprovacao,
          c.grupo_rede,
          gr.nome AS grupo_rede_nome,
          c.segmento_id,
          sc.nome AS segmento_nome,
          c.ref_situacao_id,
          rs.nome AS situacao_nome,
          c.created_at,
          c.updated_at
        FROM public.cliente c
        LEFT JOIN public.segmento_cliente sc ON sc.id = c.segmento_id AND sc.deleted_at IS NULL
        LEFT JOIN public.grupos_redes gr ON gr.id = c.grupo_id AND gr.deleted_at IS NULL
        LEFT JOIN public.ref_situacao rs ON rs.ref_situacao_id = c.ref_situacao_id
        WHERE c.deleted_at IS NULL
          AND (p_status_aprovacao_filter IS NULL OR c.status_aprovacao = p_status_aprovacao_filter)
          AND (
            v_search_norm IS NULL OR
            unaccent(LOWER(c.nome))                       LIKE '%' || v_search_norm || '%' OR
            unaccent(LOWER(c.nome_fantasia))              LIKE '%' || v_search_norm || '%' OR
            unaccent(LOWER(COALESCE(c.grupo_rede, '')))   LIKE '%' || v_search_norm || '%' OR
            LOWER(c.codigo)                               LIKE '%' || LOWER(p_search) || '%' OR
            LOWER(c.cpf_cnpj)                             LIKE '%' || LOWER(p_search) || '%' OR
            (v_search_digits IS NOT NULL
             AND LENGTH(v_search_digits) >= 3
             AND REGEXP_REPLACE(COALESCE(c.cpf_cnpj, ''), '[^0-9]', '', 'g') LIKE '%' || v_search_digits || '%')
          )
          AND (
            v_user_tipo = 'backoffice' OR
            (v_user_tipo = 'vendedor' AND (
              (c.status_aprovacao = 'aprovado'
               AND (c.criado_por = p_requesting_user_id
                    OR p_requesting_user_id = ANY(c.vendedoresatribuidos)))
              OR
              (c.status_aprovacao = 'pendente' AND c.criado_por = p_requesting_user_id)
            ))
          )
          AND (p_vendedor_filter IS NULL OR p_vendedor_filter = ANY(c.vendedoresatribuidos))
        ORDER BY c.created_at DESC
        LIMIT p_limit
        OFFSET v_offset
      ) sub),
      '[]'::JSON
    ),
    'total', v_total_count,
    'page', p_page,
    'limit', p_limit,
    'total_pages', CEIL(v_total_count::NUMERIC / p_limit)
  )
  INTO v_clientes;

  RETURN v_clientes;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in list_clientes_v2: %', SQLERRM;
    RAISE;
END;
$function$
;

-- ---- list_conta_corrente_v2 ----
CREATE OR REPLACE FUNCTION public.list_conta_corrente_v2(p_requesting_user_id uuid DEFAULT NULL::uuid, p_data_inicio date DEFAULT NULL::date, p_data_fim date DEFAULT NULL::date, p_cliente_id bigint DEFAULT NULL::bigint, p_tipo_compromisso text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_grupo_rede_id uuid DEFAULT NULL::uuid, p_busca text DEFAULT NULL::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 100)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$ DECLARE v_offset INTEGER; v_total_count INTEGER; v_user_tipo TEXT; v_is_backoffice BOOLEAN; v_compromissos JSON; v_stats JSON; v_result JSON; BEGIN IF p_page < 1 THEN RAISE EXCEPTION 'Page must be greater than 0'; END IF; IF p_limit < 1 OR p_limit > 100 THEN RAISE EXCEPTION 'Limit must be between 1 and 100'; END IF; v_offset := (p_page - 1) * p_limit; IF p_requesting_user_id IS NOT NULL THEN SELECT u.tipo INTO v_user_tipo FROM public.user u WHERE u.user_id = p_requesting_user_id AND u.ativo = TRUE AND u.deleted_at IS NULL; IF FOUND THEN v_is_backoffice := (v_user_tipo = 'backoffice'); ELSE v_is_backoffice := FALSE; END IF; ELSE v_is_backoffice := FALSE; END IF; SELECT COUNT(DISTINCT ccc.id) INTO v_total_count FROM public.conta_corrente_cliente ccc INNER JOIN public.cliente c ON c.cliente_id = ccc.cliente_id LEFT JOIN public.grupos_redes gr ON gr.id = c.grupo_id WHERE (v_is_backoffice OR EXISTS (SELECT 1 FROM public.cliente_vendedores cv WHERE cv.cliente_id = c.cliente_id AND cv.vendedor_id = p_requesting_user_id)) AND (p_data_inicio IS NULL OR ccc.data >= p_data_inicio) AND (p_data_fim IS NULL OR ccc.data <= p_data_fim) AND (p_cliente_id IS NULL OR ccc.cliente_id = p_cliente_id) AND (p_tipo_compromisso IS NULL OR LOWER(ccc.tipo_compromisso) = LOWER(p_tipo_compromisso)) AND (p_grupo_rede_id IS NULL OR c.grupo_id = p_grupo_rede_id) AND (p_busca IS NULL OR ccc.titulo ILIKE '%' || p_busca || '%' OR ccc.descricao_longa ILIKE '%' || p_busca || '%' OR c.nome ILIKE '%' || p_busca || '%' OR c.nome_fantasia ILIKE '%' || p_busca || '%' OR COALESCE(gr.nome, '') ILIKE '%' || p_busca || '%'); SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT('id', compromisso_completo.id::TEXT, 'clienteId', COALESCE(compromisso_completo.cliente_id::TEXT, ''), 'clienteNome', COALESCE(compromisso_completo.cliente_nome, 'Cliente sem nome'), 'clienteGrupoRede', compromisso_completo.cliente_grupo_rede, 'vendedorUuid', CASE WHEN compromisso_completo.vendedor_uuid IS NOT NULL THEN compromisso_completo.vendedor_uuid::TEXT ELSE NULL END, 'data', compromisso_completo.data, 'valor', compromisso_completo.valor, 'titulo', COALESCE(compromisso_completo.titulo, ''), 'descricao', compromisso_completo.descricao_longa, 'tipoCompromisso', INITCAP(COALESCE(compromisso_completo.tipo_compromisso, 'Investimento')), 'categoriaId', CASE WHEN compromisso_completo.categoria_id IS NOT NULL THEN compromisso_completo.categoria_id::TEXT ELSE NULL END, 'categoria', compromisso_completo.categoria_nome, 'arquivosAnexos', COALESCE(compromisso_completo.arquivos_anexos, ARRAY[]::TEXT[]), 'valorPago', compromisso_completo.valor_pago, 'valorPendente', compromisso_completo.valor - compromisso_completo.valor_pago, 'status', COALESCE(compromisso_completo.status, 'Pendente'), 'dataCriacao', compromisso_completo.created_at, 'criadoPor', 'Sistema')), '[]'::JSON) INTO v_compromissos FROM (SELECT ccc.id, ccc.cliente_id, ccc.categoria_id, cat.nome AS categoria_nome, COALESCE(c.nome, c.nome_fantasia, 'Cliente sem nome') AS cliente_nome, gr.nome AS cliente_grupo_rede, ccc.vendedor_uuid, ccc.data, ccc.valor, ccc.titulo, ccc.descricao_longa, ccc.tipo_compromisso, ccc.arquivos_anexos, ccc.created_at, COALESCE(SUM(pac.valor_pago), 0) AS valor_pago, CASE WHEN COALESCE(SUM(pac.valor_pago), 0) = 0 THEN 'Pendente' WHEN COALESCE(SUM(pac.valor_pago), 0) >= ccc.valor THEN 'Pago Integralmente' ELSE 'Pago Parcialmente' END AS status FROM (SELECT ccc.id FROM public.conta_corrente_cliente ccc INNER JOIN public.cliente c ON c.cliente_id = ccc.cliente_id LEFT JOIN public.grupos_redes gr ON gr.id = c.grupo_id WHERE (v_is_backoffice OR EXISTS (SELECT 1 FROM public.cliente_vendedores cv WHERE cv.cliente_id = c.cliente_id AND cv.vendedor_id = p_requesting_user_id)) AND (p_data_inicio IS NULL OR ccc.data >= p_data_inicio) AND (p_data_fim IS NULL OR ccc.data <= p_data_fim) AND (p_cliente_id IS NULL OR ccc.cliente_id = p_cliente_id) AND (p_tipo_compromisso IS NULL OR LOWER(ccc.tipo_compromisso) = LOWER(p_tipo_compromisso)) AND (p_grupo_rede_id IS NULL OR c.grupo_id = p_grupo_rede_id) AND (p_busca IS NULL OR ccc.titulo ILIKE '%' || p_busca || '%' OR ccc.descricao_longa ILIKE '%' || p_busca || '%' OR c.nome ILIKE '%' || p_busca || '%' OR c.nome_fantasia ILIKE '%' || p_busca || '%' OR COALESCE(gr.nome, '') ILIKE '%' || p_busca || '%') ORDER BY ccc.data DESC, ccc.created_at DESC LIMIT p_limit OFFSET v_offset) AS compromissos_filtrados INNER JOIN public.conta_corrente_cliente ccc ON ccc.id = compromissos_filtrados.id INNER JOIN public.cliente c ON c.cliente_id = ccc.cliente_id LEFT JOIN public.grupos_redes gr ON gr.id = c.grupo_id LEFT JOIN public.categorias_conta_corrente cat ON cat.id = ccc.categoria_id AND cat.deleted_at IS NULL LEFT JOIN public.pagamento_acordo_cliente pac ON pac.conta_corrente_id = ccc.id GROUP BY ccc.id, ccc.cliente_id, ccc.categoria_id, cat.nome, c.nome, c.nome_fantasia, gr.nome, ccc.vendedor_uuid, ccc.data, ccc.valor, ccc.titulo, ccc.descricao_longa, ccc.tipo_compromisso, ccc.arquivos_anexos, ccc.created_at ORDER BY ccc.data DESC, ccc.created_at DESC) AS compromisso_completo; IF p_status IS NOT NULL THEN SELECT COALESCE(JSON_AGG(item), '[]'::JSON) INTO v_compromissos FROM json_array_elements(v_compromissos) AS item WHERE (item->>'status') = p_status; END IF; WITH compromissos_com_status AS (SELECT ccc.id, ccc.valor, COALESCE(SUM(pac.valor_pago), 0) AS valor_pago, CASE WHEN COALESCE(SUM(pac.valor_pago), 0) = 0 THEN 'Pendente' WHEN COALESCE(SUM(pac.valor_pago), 0) >= ccc.valor THEN 'Pago Integralmente' ELSE 'Pago Parcialmente' END AS status FROM public.conta_corrente_cliente ccc INNER JOIN public.cliente c ON c.cliente_id = ccc.cliente_id LEFT JOIN public.grupos_redes gr ON gr.id = c.grupo_id LEFT JOIN public.pagamento_acordo_cliente pac ON pac.conta_corrente_id = ccc.id WHERE (v_is_backoffice OR EXISTS (SELECT 1 FROM public.cliente_vendedores cv WHERE cv.cliente_id = c.cliente_id AND cv.vendedor_id = p_requesting_user_id)) AND (p_data_inicio IS NULL OR ccc.data >= p_data_inicio) AND (p_data_fim IS NULL OR ccc.data <= p_data_fim) AND (p_cliente_id IS NULL OR ccc.cliente_id = p_cliente_id) AND (p_tipo_compromisso IS NULL OR LOWER(ccc.tipo_compromisso) = LOWER(p_tipo_compromisso)) AND (p_grupo_rede_id IS NULL OR c.grupo_id = p_grupo_rede_id) AND (p_busca IS NULL OR ccc.titulo ILIKE '%' || p_busca || '%' OR ccc.descricao_longa ILIKE '%' || p_busca || '%' OR c.nome ILIKE '%' || p_busca || '%' OR c.nome_fantasia ILIKE '%' || p_busca || '%' OR COALESCE(gr.nome, '') ILIKE '%' || p_busca || '%') GROUP BY ccc.id, ccc.valor) SELECT JSON_BUILD_OBJECT('totalCompromissos', COALESCE(SUM(CASE WHEN p_status IS NULL OR status = p_status THEN valor ELSE 0 END), 0), 'totalPagamentos', COALESCE(SUM(CASE WHEN p_status IS NULL OR status = p_status THEN valor_pago ELSE 0 END), 0), 'totalPendente', COALESCE(SUM(CASE WHEN p_status IS NULL OR status = p_status THEN valor - valor_pago ELSE 0 END), 0), 'quantidadeCompromissos', COUNT(CASE WHEN p_status IS NULL OR status = p_status THEN 1 END), 'quantidadePagamentos', (SELECT COUNT(DISTINCT pac.id) FROM public.pagamento_acordo_cliente pac INNER JOIN compromissos_com_status ccs ON ccs.id = pac.conta_corrente_id WHERE (p_status IS NULL OR ccs.status = p_status))) INTO v_stats FROM compromissos_com_status; SELECT JSON_BUILD_OBJECT('compromissos', COALESCE(v_compromissos, '[]'::JSON), 'estatisticas', COALESCE(v_stats, '{}'::JSON), 'pagination', JSON_BUILD_OBJECT('page', p_page, 'limit', p_limit, 'total', v_total_count, 'total_pages', CEIL(v_total_count::NUMERIC / NULLIF(p_limit, 0)))) INTO v_result; RETURN v_result; EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error in list_conta_corrente_v2: %', SQLERRM; RAISE; END; $function$
;

-- ---- list_empresas_v2 ----
CREATE OR REPLACE FUNCTION public.list_empresas_v2(p_requesting_user_id uuid DEFAULT NULL::uuid, p_search text DEFAULT NULL::text, p_apenas_ativos boolean DEFAULT false, p_page integer DEFAULT 1, p_limit integer DEFAULT 100)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE v_offset INTEGER; v_total_count INTEGER; v_resultado JSON;
BEGIN
  IF p_page < 1 THEN RAISE EXCEPTION 'Page must be greater than 0'; END IF;
  IF p_limit < 1 OR p_limit > 100 THEN RAISE EXCEPTION 'Limit must be between 1 and 100'; END IF;
  v_offset := (p_page - 1) * p_limit;
  SELECT COUNT(*) INTO v_total_count FROM public.ref_empresas_subsidiarias e WHERE e.deleted_at IS NULL AND (NOT p_apenas_ativos OR e.ativo = TRUE) AND (p_search IS NULL OR TRIM(p_search) = '' OR LOWER(COALESCE(e.razao_social, e.nome, '')) LIKE '%' || LOWER(p_search) || '%' OR LOWER(COALESCE(e.nome_fantasia, e.nome, '')) LIKE '%' || LOWER(p_search) || '%' OR LOWER(COALESCE(e.cnpj, '')) LIKE '%' || LOWER(p_search) || '%');
  SELECT JSON_BUILD_OBJECT('empresas', COALESCE(JSON_AGG(item_data), '[]'::JSON), 'total', v_total_count, 'page', p_page, 'limit', p_limit, 'total_pages', CEIL(v_total_count::NUMERIC / NULLIF(p_limit, 0))) INTO v_resultado
  FROM (SELECT JSON_BUILD_OBJECT('id', e.id::TEXT, 'cnpj', e.cnpj, 'razaoSocial', COALESCE(e.razao_social, e.nome, ''), 'nomeFantasia', COALESCE(e.nome_fantasia, e.razao_social, e.nome, ''), 'inscricaoEstadual', e.inscricao_estadual, 'chaveApi', COALESCE(e.chave_api, ''), 'endereco', COALESCE(e.endereco, '{}'::JSONB), 'contasBancarias', COALESCE(e.contas_bancarias, '[]'::JSONB), 'integracoesERP', COALESCE(e.integracoes_erp, '[]'::JSONB), 'ativo', e.ativo, 'createdAt', e.created_at, 'updatedAt', e.updated_at) AS item_data FROM public.ref_empresas_subsidiarias e WHERE e.deleted_at IS NULL AND (NOT p_apenas_ativos OR e.ativo = TRUE) AND (p_search IS NULL OR TRIM(p_search) = '' OR LOWER(COALESCE(e.razao_social, e.nome, '')) LIKE '%' || LOWER(p_search) || '%' OR LOWER(COALESCE(e.nome_fantasia, e.nome, '')) LIKE '%' || LOWER(p_search) || '%' OR LOWER(COALESCE(e.cnpj, '')) LIKE '%' || LOWER(p_search) || '%') ORDER BY COALESCE(e.razao_social, e.nome) ASC NULLS LAST LIMIT p_limit OFFSET v_offset) AS sub;
  RETURN v_resultado;
EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error in list_empresas_v2: %', SQLERRM; RAISE;
END;
$function$
;

-- ---- list_grupos_redes_v2 ----
CREATE OR REPLACE FUNCTION public.list_grupos_redes_v2(p_requesting_user_id uuid DEFAULT NULL::uuid, p_search text DEFAULT NULL::text, p_apenas_ativos boolean DEFAULT false, p_page integer DEFAULT 1, p_limit integer DEFAULT 500)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_offset INTEGER;
  v_total_count INTEGER;
  v_resultado JSON;
BEGIN
  IF p_page < 1 THEN
    RAISE EXCEPTION 'Page must be greater than 0';
  END IF;

  IF p_limit < 1 OR p_limit > 500 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 500';
  END IF;

  v_offset := (p_page - 1) * p_limit;

  SELECT COUNT(*)
  INTO v_total_count
  FROM public.grupos_redes g
  WHERE g.deleted_at IS NULL
    AND (NOT p_apenas_ativos OR g.ativo = TRUE)
    AND (
      p_search IS NULL OR
      TRIM(p_search) = '' OR
      LOWER(g.nome) LIKE '%' || LOWER(p_search) || '%' OR
      LOWER(COALESCE(g.descricao, '')) LIKE '%' || LOWER(p_search) || '%'
    );

  SELECT JSON_BUILD_OBJECT(
    'grupos', COALESCE(JSON_AGG(item_data), '[]'::JSON),
    'total', v_total_count,
    'page', p_page,
    'limit', p_limit,
    'total_pages', CEIL(v_total_count::NUMERIC / NULLIF(p_limit, 0))
  )
  INTO v_resultado
  FROM (
    SELECT JSON_BUILD_OBJECT(
      'id', g.id::TEXT,
      'nome', g.nome,
      'descricao', g.descricao,
      'ativo', g.ativo,
      'createdAt', g.created_at,
      'updatedAt', g.updated_at
    ) AS item_data
    FROM public.grupos_redes g
    WHERE g.deleted_at IS NULL
      AND (NOT p_apenas_ativos OR g.ativo = TRUE)
      AND (
        p_search IS NULL OR
        TRIM(p_search) = '' OR
        LOWER(g.nome) LIKE '%' || LOWER(p_search) || '%' OR
        LOWER(COALESCE(g.descricao, '')) LIKE '%' || LOWER(p_search) || '%'
      )
    ORDER BY g.nome ASC
    LIMIT p_limit
    OFFSET v_offset
  ) AS sub;

  RETURN v_resultado;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in list_grupos_redes_v2: %', SQLERRM;
    RAISE;
END;
$function$
;

-- ---- list_listas_preco_v2 ----
CREATE OR REPLACE FUNCTION public.list_listas_preco_v2()
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
BEGIN
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'id', lp.id,
      'nome', lp.nome,
      'desconto', COALESCE(lp.desconto, 0),
      'ativo', COALESCE(lp.ativo, true),
      'codigo_sequencial', lp.codigo_sequencial,
      'total_produtos', COALESCE(produtos_count.total, 0),
      'total_faixas_comissao', COALESCE(faixas_count.total, 0),
      'tipo_comissao', CASE 
        WHEN faixas_count.total > 0 THEN 'conforme_desconto'
        ELSE 'fixa'
      END,
      'created_at', lp.data_criacao,
      'updated_at', lp.data_criacao
    )
    ORDER BY lp.nome
  )
  INTO v_result
  FROM listas_preco lp
  LEFT JOIN (
    SELECT 
      lista_preco_id,
      COUNT(*) as total
    FROM produtos_listas_precos
    GROUP BY lista_preco_id
  ) produtos_count ON produtos_count.lista_preco_id = lp.id
  LEFT JOIN (
    SELECT 
      lista_preco_id,
      COUNT(*) as total
    FROM listas_preco_comissionamento
    GROUP BY lista_preco_id
  ) faixas_count ON faixas_count.lista_preco_id = lp.id;

  RETURN COALESCE(v_result, '[]'::JSON);
END;
$function$
;

-- ---- list_metas_vendedor_v2 ----
CREATE OR REPLACE FUNCTION public.list_metas_vendedor_v2(p_requesting_user_id uuid DEFAULT NULL::uuid, p_ano integer DEFAULT NULL::integer, p_mes integer DEFAULT NULL::integer, p_vendedor_id uuid DEFAULT NULL::uuid, p_page integer DEFAULT 1, p_limit integer DEFAULT 100)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_offset INTEGER;
  v_total_count INTEGER;
  v_metas JSON;
BEGIN
  IF p_page < 1 THEN
    RAISE EXCEPTION 'Page must be greater than 0';
  END IF;

  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 100';
  END IF;

  v_offset := (p_page - 1) * p_limit;

  SELECT COUNT(*)
  INTO v_total_count
  FROM public.metas_vendedor m
  WHERE (p_ano IS NULL OR m.ano = p_ano)
  AND (p_mes IS NULL OR m.mes = p_mes)
  AND (p_vendedor_id IS NULL OR m.vendedor_id = p_vendedor_id);

  SELECT JSON_BUILD_OBJECT(
    'metas', COALESCE(JSON_AGG(meta_data), '[]'::JSON),
    'total', v_total_count,
    'page', p_page,
    'limit', p_limit,
    'total_pages', CEIL(v_total_count::NUMERIC / p_limit)
  )
  INTO v_metas
  FROM (
    SELECT JSON_BUILD_OBJECT(
      'id', m.id,
      'vendedor_id', m.vendedor_id,
      'vendedor_nome', COALESCE(dv.nome, u.nome, ''),
      'ano', m.ano,
      'mes', m.mes,
      'meta_valor', m.meta_valor,
      'meta_percentual_crescimento', m.meta_percentual_crescimento,
      'periodo_referencia', m.periodo_referencia,
      'data_criacao', m.data_criacao,
      'data_atualizacao', m.data_atualizacao
    ) AS meta_data
    FROM public.metas_vendedor m
    LEFT JOIN public.dados_vendedor dv ON dv.user_id = m.vendedor_id
    LEFT JOIN public.user u ON u.user_id = m.vendedor_id
    WHERE (p_ano IS NULL OR m.ano = p_ano)
    AND (p_mes IS NULL OR m.mes = p_mes)
    AND (p_vendedor_id IS NULL OR m.vendedor_id = p_vendedor_id)
    ORDER BY m.ano DESC, m.mes DESC, m.vendedor_id
    LIMIT p_limit
    OFFSET v_offset
  ) AS metas_subquery;

  RETURN v_metas;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in list_metas_vendedor_v2: %', SQLERRM;
    RAISE;
END;
$function$
;

-- ---- list_natureza_operacao_v2 ----
CREATE OR REPLACE FUNCTION public.list_natureza_operacao_v2(p_requesting_user_id uuid DEFAULT NULL::uuid, p_search text DEFAULT NULL::text, p_apenas_ativas boolean DEFAULT false, p_page integer DEFAULT 1, p_limit integer DEFAULT 100)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_offset INTEGER;
  v_total_count INTEGER;
  v_naturezas JSON;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_page < 1 THEN
    RAISE EXCEPTION 'Page must be greater than 0';
  END IF;

  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 100';
  END IF;

  v_offset := (p_page - 1) * p_limit;

  -- 2. CONTAR TOTAL
  SELECT COUNT(*)
  INTO v_total_count
  FROM public.natureza_operacao n
  WHERE n.deleted_at IS NULL
    AND (NOT p_apenas_ativas OR n.ativo = TRUE)
    AND (
      p_search IS NULL OR
      TRIM(p_search) = '' OR
      LOWER(n.nome) LIKE '%' || LOWER(p_search) || '%' OR
      LOWER(COALESCE(n.codigo, '')) LIKE '%' || LOWER(p_search) || '%' OR
      LOWER(COALESCE(n.descricao, '')) LIKE '%' || LOWER(p_search) || '%'
    );

  -- 3. BUSCAR NATUREZAS
  SELECT JSON_BUILD_OBJECT(
    'naturezas', COALESCE(JSON_AGG(natureza_data), '[]'::JSON),
    'total', v_total_count,
    'page', p_page,
    'limit', p_limit,
    'total_pages', CEIL(v_total_count::NUMERIC / p_limit)
  )
  INTO v_naturezas
  FROM (
    SELECT JSON_BUILD_OBJECT(
      'id', n.id::TEXT,
      'nome', n.nome,
      'codigo', n.codigo,
      'descricao', n.descricao,
      'geraComissao', n.tem_comissao,
      'geraReceita', n.gera_receita,
      'ativo', n.ativo,
      'tiny_id', n.tiny_id,
      'createdAt', n.created_at,
      'updatedAt', n.updated_at
    ) AS natureza_data
    FROM public.natureza_operacao n
    WHERE n.deleted_at IS NULL
      AND (NOT p_apenas_ativas OR n.ativo = TRUE)
      AND (
        p_search IS NULL OR
        TRIM(p_search) = '' OR
        LOWER(n.nome) LIKE '%' || LOWER(p_search) || '%' OR
        LOWER(COALESCE(n.codigo, '')) LIKE '%' || LOWER(p_search) || '%' OR
        LOWER(COALESCE(n.descricao, '')) LIKE '%' || LOWER(p_search) || '%'
      )
    ORDER BY n.nome ASC
    LIMIT p_limit
    OFFSET v_offset
  ) AS naturezas_subquery;

  RETURN v_naturezas;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in list_natureza_operacao_v2: %', SQLERRM;
    RAISE;
END;
$function$
;

-- ---- list_notificacoes_v2 ----
CREATE OR REPLACE FUNCTION public.list_notificacoes_v2(p_usuario_id uuid, p_status text DEFAULT NULL::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_incluir_arquivadas boolean DEFAULT false)
 RETURNS TABLE(id uuid, tipo text, titulo text, mensagem text, link text, status text, usuario_id uuid, data_criacao timestamp with time zone, data_leitura timestamp with time zone, dados_adicionais jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.tipo,
    n.titulo,
    n.mensagem,
    n.link,
    n.status,
    n.usuario_id,
    n.data_criacao,
    n.data_leitura,
    n.dados_adicionais
  FROM public.notificacao n
  WHERE n.usuario_id = p_usuario_id
    AND (p_status IS NULL OR n.status = p_status)
    AND (p_incluir_arquivadas OR n.status <> 'arquivada')
  ORDER BY n.data_criacao DESC
  LIMIT GREATEST(COALESCE(p_limit, 50), 1)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$function$
;

-- ---- list_pagamentos_conta_corrente_v2 ----
CREATE OR REPLACE FUNCTION public.list_pagamentos_conta_corrente_v2(p_conta_corrente_id bigint, p_requesting_user_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$ DECLARE v_user_tipo TEXT; v_is_backoffice BOOLEAN; v_pagamentos JSON; BEGIN IF p_conta_corrente_id IS NULL THEN RAISE EXCEPTION 'conta_corrente_id é obrigatório'; END IF; IF p_requesting_user_id IS NOT NULL THEN SELECT u.tipo INTO v_user_tipo FROM public.user u WHERE u.user_id = p_requesting_user_id AND u.ativo = TRUE AND u.deleted_at IS NULL; IF FOUND THEN v_is_backoffice := (v_user_tipo = 'backoffice'); ELSE v_is_backoffice := FALSE; END IF; ELSE v_is_backoffice := FALSE; END IF; IF NOT EXISTS (SELECT 1 FROM public.conta_corrente_cliente ccc INNER JOIN public.cliente c ON c.cliente_id = ccc.cliente_id WHERE ccc.id = p_conta_corrente_id AND (v_is_backoffice OR EXISTS (SELECT 1 FROM public.cliente_vendedores cv WHERE cv.cliente_id = c.cliente_id AND cv.vendedor_id = p_requesting_user_id))) THEN RAISE EXCEPTION 'Compromisso não encontrado ou sem permissão de acesso'; END IF; SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT('id', pac.id::TEXT, 'compromissoId', pac.conta_corrente_id::TEXT, 'dataPagamento', pac.data_pagamento, 'formaPagamento', pac.forma_pagamento, 'valor', pac.valor_pago, 'categoriaId', CASE WHEN pac.categoria_id IS NOT NULL THEN pac.categoria_id::TEXT ELSE NULL END, 'categoria', cat.nome, 'arquivoComprovante', pac.arquivo_comprovante, 'dataCriacao', pac.created_at, 'criadoPor', 'Sistema') ORDER BY pac.data_pagamento DESC, pac.created_at DESC), '[]'::JSON) INTO v_pagamentos FROM public.pagamento_acordo_cliente pac LEFT JOIN public.categorias_conta_corrente cat ON cat.id = pac.categoria_id AND cat.deleted_at IS NULL WHERE pac.conta_corrente_id = p_conta_corrente_id; RETURN v_pagamentos; EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error in list_pagamentos_conta_corrente_v2: %', SQLERRM; RAISE; END; $function$
;

-- ---- list_pedido_venda_v2 ----
CREATE OR REPLACE FUNCTION public.list_pedido_venda_v2(p_requesting_user_id uuid DEFAULT NULL::uuid, p_search text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_vendedor_id uuid DEFAULT NULL::uuid, p_cliente_id bigint DEFAULT NULL::bigint, p_data_inicio date DEFAULT NULL::date, p_data_fim date DEFAULT NULL::date, p_page integer DEFAULT 1, p_limit integer DEFAULT 100)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_offset INTEGER;
  v_total_count INTEGER;
  v_user_tipo TEXT;
  v_is_backoffice BOOLEAN;
  v_pedidos JSON;
  v_stats JSON;
  v_result JSON;
BEGIN
  IF p_page < 1 THEN
    RAISE EXCEPTION 'Page must be greater than 0';
  END IF;

  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 100';
  END IF;

  v_offset := (p_page - 1) * p_limit;

  IF p_requesting_user_id IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public."user" u
    WHERE u.user_id = p_requesting_user_id
      AND u.ativo = TRUE
      AND u.deleted_at IS NULL;

    IF FOUND THEN
      v_is_backoffice := (v_user_tipo = 'backoffice');
    ELSE
      v_is_backoffice := FALSE;
    END IF;
  ELSE
    v_is_backoffice := FALSE;
  END IF;

  SELECT COUNT(*)
    INTO v_total_count
  FROM public.pedido_venda pv
  LEFT JOIN public.cliente c ON c.cliente_id = pv.cliente_id
  WHERE pv.deleted_at IS NULL
    AND (v_is_backoffice OR pv.vendedor_uuid = p_requesting_user_id)
    AND (p_search IS NULL OR
      c.nome ILIKE '%' || p_search || '%' OR
      c.nome_fantasia ILIKE '%' || p_search || '%' OR
      pv.numero_pedido ILIKE '%' || p_search || '%' OR
      pv.ordem_cliente ILIKE '%' || p_search || '%' OR
      pv."pedido_venda_ID"::TEXT ILIKE '%' || p_search || '%'
    )
    AND (p_status IS NULL OR pv.status = p_status)
    AND (p_vendedor_id IS NULL OR pv.vendedor_uuid = p_vendedor_id)
    AND (p_cliente_id IS NULL OR pv.cliente_id = p_cliente_id)
    AND (p_data_inicio IS NULL OR pv.data_venda >= p_data_inicio)
    AND (p_data_fim IS NULL OR pv.data_venda <= p_data_fim);

  SELECT JSON_AGG(x.obj ORDER BY x.data_venda DESC, x.ts DESC)
    INTO v_pedidos
  FROM (
    SELECT
      JSON_BUILD_OBJECT(
        'id', pv."pedido_venda_ID"::TEXT,
        'numero', pv.numero_pedido,
        'clienteId', pv.cliente_id::TEXT,
        'nomeCliente', COALESCE(c.nome, pv.nome_cliente),
        'cnpjCliente', COALESCE(c.cpf_cnpj, pv.cnpj_cliente),
        'inscricaoEstadualCliente', COALESCE(c.inscricao_estadual, pv.inscricao_estadual_cliente),
        'segmentoId', c.segmento_id::TEXT,
        'segmentoNome', COALESCE(sc.nome, 'Não Classificado'),
        'statusCliente', COALESCE(rs.nome, 'Ativo'),
        'clienteGrupoRede', c.grupo_rede,
        'clienteUf', ce.uf,
        'vendedorId', pv.vendedor_uuid::TEXT,
        'nomeVendedor', COALESCE(dv.nome_fantasia, pv.nome_vendedor),
        'naturezaOperacaoId', COALESCE(no.id::TEXT, pv.natureza_id::TEXT),
        'nomeNaturezaOperacao', COALESCE(no.nome, pv.nome_natureza_operacao, pv.natureza_operacao),
        'empresaFaturamentoId', pv.empresa_faturamento_id::TEXT,
        'nomeEmpresaFaturamento', COALESCE(re.nome, pv.nome_empresa_faturamento),
        'listaPrecoId', pv.lista_preco_id::TEXT,
        'nomeListaPreco', COALESCE(lp.nome, pv.nome_lista_preco),
        'percentualDescontoPadrao', pv.percentual_desconto_padrao,
        'condicaoPagamentoId', pv.id_condicao::TEXT,
        'nomeCondicaoPagamento', COALESCE(cp."Descrição", pv.nome_condicao_pagamento),
        'valorPedido', pv.valor_total,
        'valorTotalProdutos', pv.valor_total_produtos,
        'percentualDescontoExtra', pv.percentual_desconto_extra,
        'valorDescontoExtra', pv.valor_desconto_extra,
        'totalQuantidades', pv.total_quantidades,
        'totalItens', pv.total_itens,
        'pesoBrutoTotal', pv.peso_bruto_total,
        'pesoLiquidoTotal', pv.peso_liquido_total,
        'status', pv.status,
        'dataPedido', pv.data_venda,
        'ordemCompraCliente', pv.ordem_cliente,
        'observacoesInternas', pv.observacao_interna,
        'observacoesNotaFiscal', pv.observacao,
        'createdAt', pv.timestamp,
        'updatedAt', pv.updated_at,
        'createdBy', pv.created_by::TEXT,
        'idTiny', pv.id_tiny,
        'geraReceita', COALESCE(no.gera_receita, FALSE)
      ) AS obj,
      pv.data_venda AS data_venda,
      pv.timestamp AS ts
    FROM public.pedido_venda pv
    LEFT JOIN public.cliente c ON c.cliente_id = pv.cliente_id
    LEFT JOIN public.segmento_cliente sc ON sc.id = c.segmento_id
    LEFT JOIN public.ref_situacao rs ON rs.ref_situacao_id = c.ref_situacao_id
    LEFT JOIN LATERAL (
      SELECT ce.uf
      FROM public."cliente_endereço" ce
      WHERE ce.cliente_id = c.cliente_id
      LIMIT 1
    ) ce ON TRUE
    LEFT JOIN LATERAL (
      SELECT no.id, no.nome, no.gera_receita
      FROM public.natureza_operacao no
      WHERE no.id = pv.natureza_id
         OR no.nome = pv.natureza_operacao
         OR no.nome = pv.nome_natureza_operacao
      ORDER BY
        CASE
          WHEN no.id = pv.natureza_id THEN 0
          WHEN no.nome = pv.natureza_operacao THEN 1
          WHEN no.nome = pv.nome_natureza_operacao THEN 2
          ELSE 3
        END
      LIMIT 1
    ) no ON TRUE
    LEFT JOIN public.dados_vendedor dv ON dv.user_id::uuid = pv.vendedor_uuid::uuid
    LEFT JOIN public.listas_preco lp ON lp.id = pv.lista_preco_id
    LEFT JOIN public.ref_empresas_subsidiarias re ON re.id = pv.empresa_faturamento_id
    LEFT JOIN public."Condicao_De_Pagamento" cp ON cp."Condição_ID" = pv.id_condicao
    WHERE pv.deleted_at IS NULL
      AND (v_is_backoffice OR pv.vendedor_uuid = p_requesting_user_id)
      AND (p_search IS NULL OR
        c.nome ILIKE '%' || p_search || '%' OR
        c.nome_fantasia ILIKE '%' || p_search || '%' OR
        pv.numero_pedido ILIKE '%' || p_search || '%' OR
        pv.ordem_cliente ILIKE '%' || p_search || '%' OR
        pv."pedido_venda_ID"::TEXT ILIKE '%' || p_search || '%'
      )
      AND (p_status IS NULL OR pv.status = p_status)
      AND (p_vendedor_id IS NULL OR pv.vendedor_uuid = p_vendedor_id)
      AND (p_cliente_id IS NULL OR pv.cliente_id = p_cliente_id)
      AND (p_data_inicio IS NULL OR pv.data_venda >= p_data_inicio)
      AND (p_data_fim IS NULL OR pv.data_venda <= p_data_fim)
    ORDER BY pv.data_venda DESC, pv.timestamp DESC
    LIMIT p_limit
    OFFSET v_offset
  ) x;

  SELECT JSON_BUILD_OBJECT(
    'total', COALESCE(SUM(CASE WHEN COALESCE(no.gera_receita, FALSE) = TRUE AND pv.status != 'Cancelado' THEN pv.valor_total ELSE 0 END), 0),
    'totalVendas', COUNT(CASE WHEN COALESCE(no.gera_receita, FALSE) = TRUE AND pv.status != 'Cancelado' THEN 1 END),
    'concluidas', COUNT(CASE WHEN COALESCE(no.gera_receita, FALSE) = TRUE AND pv.status IN ('Faturado', 'Pronto para envio', 'Enviado', 'Entregue', 'Não Entregue', 'Nao Entregue', 'Concluído', 'Concluido') THEN 1 END),
    'totalConcluidas', COALESCE(SUM(CASE WHEN COALESCE(no.gera_receita, FALSE) = TRUE AND pv.status IN ('Faturado', 'Pronto para envio', 'Enviado', 'Entregue', 'Não Entregue', 'Nao Entregue', 'Concluído', 'Concluido') THEN pv.valor_total ELSE 0 END), 0),
    'emAndamento', COUNT(CASE WHEN COALESCE(no.gera_receita, FALSE) = TRUE AND pv.status != 'Cancelado' AND pv.status NOT IN ('Faturado', 'Pronto para envio', 'Enviado', 'Entregue', 'Não Entregue', 'Nao Entregue', 'Concluído', 'Concluido') THEN 1 END),
    'totalEmAndamento', COALESCE(SUM(CASE WHEN COALESCE(no.gera_receita, FALSE) = TRUE AND pv.status != 'Cancelado' AND pv.status NOT IN ('Faturado', 'Pronto para envio', 'Enviado', 'Entregue', 'Não Entregue', 'Nao Entregue', 'Concluído', 'Concluido') THEN pv.valor_total ELSE 0 END), 0),
    'ticketMedio', CASE
      WHEN COUNT(CASE WHEN COALESCE(no.gera_receita, FALSE) = TRUE AND pv.status != 'Cancelado' THEN 1 END) > 0
      THEN COALESCE(SUM(CASE WHEN COALESCE(no.gera_receita, FALSE) = TRUE AND pv.status != 'Cancelado' THEN pv.valor_total ELSE 0 END), 0) /
           COUNT(CASE WHEN COALESCE(no.gera_receita, FALSE) = TRUE AND pv.status != 'Cancelado' THEN 1 END)
      ELSE 0
    END,
    'outrosPedidosTotal', COALESCE(SUM(CASE WHEN COALESCE(no.gera_receita, FALSE) = FALSE AND pv.status != 'Cancelado' THEN pv.valor_total ELSE 0 END), 0),
    'outrosPedidosConcluidos', COUNT(CASE WHEN COALESCE(no.gera_receita, FALSE) = FALSE AND pv.status IN ('Faturado', 'Pronto para envio', 'Enviado', 'Entregue', 'Não Entregue', 'Nao Entregue', 'Concluído', 'Concluido') THEN 1 END),
    'outrosPedidosEmAndamento', COUNT(CASE WHEN COALESCE(no.gera_receita, FALSE) = FALSE AND pv.status != 'Cancelado' AND pv.status NOT IN ('Faturado', 'Pronto para envio', 'Enviado', 'Entregue', 'Não Entregue', 'Nao Entregue', 'Concluído', 'Concluido') THEN 1 END)
  )
    INTO v_stats
  FROM public.pedido_venda pv
  LEFT JOIN LATERAL (
    SELECT no.id, no.nome, no.gera_receita
    FROM public.natureza_operacao no
    WHERE no.id = pv.natureza_id
       OR no.nome = pv.natureza_operacao
       OR no.nome = pv.nome_natureza_operacao
    ORDER BY
      CASE
        WHEN no.id = pv.natureza_id THEN 0
        WHEN no.nome = pv.natureza_operacao THEN 1
        WHEN no.nome = pv.nome_natureza_operacao THEN 2
        ELSE 3
      END
    LIMIT 1
  ) no ON TRUE
  WHERE pv.deleted_at IS NULL
    AND (v_is_backoffice OR pv.vendedor_uuid = p_requesting_user_id)
    AND (p_search IS NULL OR
      EXISTS (
        SELECT 1 FROM public.cliente c2
        WHERE c2.cliente_id = pv.cliente_id
          AND (
            c2.nome ILIKE '%' || p_search || '%' OR
            c2.nome_fantasia ILIKE '%' || p_search || '%'
          )
      ) OR
      pv.numero_pedido ILIKE '%' || p_search || '%' OR
      pv.ordem_cliente ILIKE '%' || p_search || '%' OR
      pv."pedido_venda_ID"::TEXT ILIKE '%' || p_search || '%'
    )
    AND (p_status IS NULL OR pv.status = p_status)
    AND (p_vendedor_id IS NULL OR pv.vendedor_uuid = p_vendedor_id)
    AND (p_cliente_id IS NULL OR pv.cliente_id = p_cliente_id)
    AND (p_data_inicio IS NULL OR pv.data_venda >= p_data_inicio)
    AND (p_data_fim IS NULL OR pv.data_venda <= p_data_fim);

  SELECT JSON_BUILD_OBJECT(
    'pedidos', COALESCE(v_pedidos, '[]'::JSON),
    'pagination', JSON_BUILD_OBJECT(
      'page', p_page,
      'limit', p_limit,
      'total', v_total_count,
      'total_pages', CASE WHEN v_total_count = 0 THEN 1 ELSE CEIL(v_total_count::NUMERIC / p_limit)::INTEGER END
    ),
    'stats', COALESCE(v_stats, '{}'::JSON)
  )
    INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in list_pedido_venda_v2: %', SQLERRM;
    RAISE;
END;
$function$
;

-- ---- list_produtos_v2 ----
CREATE OR REPLACE FUNCTION public.list_produtos_v2()
 RETURNS TABLE(produto_id bigint, foto text, descricao text, codigo_sku text, codigo_ean text, marca_id bigint, nome_marca text, tipo_produto_id bigint, nome_tipo_produto text, ncm text, cest text, unidade_id bigint, sigla_unidade text, peso_liquido numeric, peso_bruto numeric, situacao text, ativo boolean, disponivel boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.produto_id,
    p.foto,
    p.descricao,
    p.codigo_sku,
    p.gtin AS codigo_ean,
    p.marca AS marca_id,
    COALESCE(m.descricao, p.nome_marca, '') AS nome_marca,
    p.tipo_id AS tipo_produto_id,
    COALESCE(t.nome, p.nome_tipo_produto, '') AS nome_tipo_produto,
    p.ncm,
    p.cest,
    p.unidade_id,
    COALESCE(u.sigla, p.sigla_unidade, '') AS sigla_unidade,
    COALESCE(p.peso_liquido, 0) AS peso_liquido,
    COALESCE(p.peso_bruto, 0) AS peso_bruto,
    COALESCE(p.situacao, 'Ativo') AS situacao,
    COALESCE(p.ativo, true) AS ativo,
    COALESCE(p.disponivel, true) AS disponivel,
    p.created_at,
    p.updated_at
  FROM produto p
  LEFT JOIN marcas m ON m.id = p.marca
  LEFT JOIN ref_tipo_produto t ON t.id = p.tipo_id
  LEFT JOIN ref_unidade_medida u ON u.id = p.unidade_id
  WHERE p.deleted_at IS NULL
  ORDER BY p.created_at DESC;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in list_produtos_v2: %', SQLERRM;
    RAISE;
END;
$function$
;

-- ---- list_ref_tipo_pessoa_v2 ----
CREATE OR REPLACE FUNCTION public.list_ref_tipo_pessoa_v2()
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_resultado JSON;
BEGIN
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'ref_tipo_pessoa_id', rtp.ref_tipo_pessoa_id,
      'nome_completo', rtp.nome_completo,
      'nome', rtp.nome
    )
    ORDER BY rtp.ref_tipo_pessoa_id
  )
  INTO v_resultado
  FROM public.ref_tipo_pessoa rtp;

  RETURN COALESCE(v_resultado, '[]'::JSON);
END;
$function$
;

-- ---- list_segmento_cliente_v2 ----
CREATE OR REPLACE FUNCTION public.list_segmento_cliente_v2(p_requesting_user_id uuid DEFAULT NULL::uuid, p_search text DEFAULT NULL::text, p_apenas_ativos boolean DEFAULT false, p_page integer DEFAULT 1, p_limit integer DEFAULT 100)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_offset INTEGER;
  v_total_count INTEGER;
  v_segmentos JSON;
BEGIN
  IF p_page < 1 THEN
    RAISE EXCEPTION 'Page must be greater than 0';
  END IF;

  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 100';
  END IF;

  v_offset := (p_page - 1) * p_limit;

  SELECT COUNT(*)
  INTO v_total_count
  FROM public.segmento_cliente s
  WHERE s.deleted_at IS NULL
    AND (NOT p_apenas_ativos OR s.ativo = TRUE)
    AND (
      p_search IS NULL OR
      TRIM(p_search) = '' OR
      LOWER(s.nome) LIKE '%' || LOWER(p_search) || '%' OR
      LOWER(COALESCE(s.descricao, '')) LIKE '%' || LOWER(p_search) || '%'
    );

  SELECT JSON_BUILD_OBJECT(
    'segmentos', COALESCE(JSON_AGG(segmento_data), '[]'::JSON),
    'total', v_total_count,
    'page', p_page,
    'limit', p_limit,
    'total_pages', CEIL(v_total_count::NUMERIC / p_limit)
  )
  INTO v_segmentos
  FROM (
    SELECT JSON_BUILD_OBJECT(
      'id', s.id::TEXT,
      'nome', s.nome,
      'descricao', s.descricao,
      'ativo', s.ativo,
      'createdAt', s.created_at,
      'updatedAt', s.updated_at
    ) AS segmento_data
    FROM public.segmento_cliente s
    WHERE s.deleted_at IS NULL
      AND (NOT p_apenas_ativos OR s.ativo = TRUE)
      AND (
        p_search IS NULL OR
        TRIM(p_search) = '' OR
        LOWER(s.nome) LIKE '%' || LOWER(p_search) || '%' OR
        LOWER(COALESCE(s.descricao, '')) LIKE '%' || LOWER(p_search) || '%'
      )
    ORDER BY s.nome ASC
    LIMIT p_limit
    OFFSET v_offset
  ) AS segmentos_subquery;

  RETURN v_segmentos;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in list_segmento_cliente_v2: %', SQLERRM;
    RAISE;
END;
$function$
;

-- ---- list_tipos_veiculo_v2 ----
CREATE OR REPLACE FUNCTION public.list_tipos_veiculo_v2(p_requesting_user_id uuid DEFAULT NULL::uuid, p_search text DEFAULT NULL::text, p_apenas_ativos boolean DEFAULT false, p_page integer DEFAULT 1, p_limit integer DEFAULT 100)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$ DECLARE v_offset INTEGER; v_total_count INTEGER; v_resultado JSON; BEGIN IF p_page < 1 THEN RAISE EXCEPTION 'Page must be greater than 0'; END IF; IF p_limit < 1 OR p_limit > 100 THEN RAISE EXCEPTION 'Limit must be between 1 and 100'; END IF; v_offset := (p_page - 1) * p_limit; SELECT COUNT(*) INTO v_total_count FROM public.tipos_veiculo t WHERE t.deleted_at IS NULL AND (NOT p_apenas_ativos OR t.ativo = TRUE) AND ( p_search IS NULL OR TRIM(p_search) = '' OR LOWER(t.nome) LIKE '%' || LOWER(p_search) || '%' OR LOWER(COALESCE(t.descricao, '')) LIKE '%' || LOWER(p_search) || '%' ); SELECT JSON_BUILD_OBJECT( 'tipos', COALESCE(JSON_AGG(item_data), '[]'::JSON), 'total', v_total_count, 'page', p_page, 'limit', p_limit, 'total_pages', CEIL(v_total_count::NUMERIC / NULLIF(p_limit, 0)) ) INTO v_resultado FROM ( SELECT JSON_BUILD_OBJECT( 'id', t.id::TEXT, 'nome', t.nome, 'descricao', t.descricao, 'ativo', t.ativo, 'createdAt', t.created_at, 'updatedAt', t.updated_at ) AS item_data FROM public.tipos_veiculo t WHERE t.deleted_at IS NULL AND (NOT p_apenas_ativos OR t.ativo = TRUE) AND ( p_search IS NULL OR TRIM(p_search) = '' OR LOWER(t.nome) LIKE '%' || LOWER(p_search) || '%' OR LOWER(COALESCE(t.descricao, '')) LIKE '%' || LOWER(p_search) || '%' ) ORDER BY t.nome ASC LIMIT p_limit OFFSET v_offset ) AS sub; RETURN v_resultado; EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error in list_tipos_veiculo_v2: %', SQLERRM; RAISE; END; $function$
;

-- ---- list_users_v2 ----
CREATE OR REPLACE FUNCTION public.list_users_v2(p_requesting_user_id uuid DEFAULT NULL::uuid, p_tipo_filter text DEFAULT NULL::text, p_ativo_filter boolean DEFAULT NULL::boolean, p_search text DEFAULT NULL::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 10)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_offset INTEGER;
  v_total_count INTEGER;
  v_requesting_user_tipo TEXT;
  v_users JSON;
BEGIN
  IF p_page < 1 THEN
    RAISE EXCEPTION 'Page must be greater than 0';
  END IF;

  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 100';
  END IF;

  IF p_requesting_user_id IS NOT NULL THEN
    SELECT tipo INTO v_requesting_user_tipo
    FROM public.user
    WHERE user_id = p_requesting_user_id
    AND ativo = TRUE
    AND deleted_at IS NULL;

    IF v_requesting_user_tipo = 'vendedor' THEN
      RETURN JSON_BUILD_OBJECT(
        'users', (
          SELECT JSON_AGG(row_to_json(u))
          FROM (
            SELECT 
              user_id,
              nome,
              email,
              tipo,
              ativo,
              data_cadastro,
              ultimo_acesso
            FROM public.user
            WHERE user_id = p_requesting_user_id
            AND deleted_at IS NULL
          ) u
        ),
        'total', 1,
        'page', 1,
        'limit', 1,
        'total_pages', 1
      );
    END IF;
  END IF;

  v_offset := (p_page - 1) * p_limit;

  SELECT COUNT(*)
  INTO v_total_count
  FROM public.user
  WHERE deleted_at IS NULL
    AND (p_tipo_filter IS NULL OR tipo = p_tipo_filter)
    AND (p_ativo_filter IS NULL OR ativo = p_ativo_filter)
    AND (
      p_search IS NULL OR
      LOWER(nome) LIKE '%' || LOWER(p_search) || '%' OR
      LOWER(email) LIKE '%' || LOWER(p_search) || '%'
    );

  SELECT JSON_BUILD_OBJECT(
    'users', COALESCE(JSON_AGG(user_data), '[]'::JSON),
    'total', v_total_count,
    'page', p_page,
    'limit', p_limit,
    'total_pages', CEIL(v_total_count::NUMERIC / p_limit)
  )
  INTO v_users
  FROM (
    SELECT 
      user_id,
      nome,
      email,
      tipo,
      ativo,
      data_cadastro,
      ultimo_acesso,
      ref_user_role_id,
      user_login,
      first_login
    FROM public.user
    WHERE deleted_at IS NULL
      AND (p_tipo_filter IS NULL OR tipo = p_tipo_filter)
      AND (p_ativo_filter IS NULL OR ativo = p_ativo_filter)
      AND (
        p_search IS NULL OR
        LOWER(nome) LIKE '%' || LOWER(p_search) || '%' OR
        LOWER(email) LIKE '%' || LOWER(p_search) || '%'
      )
    ORDER BY data_cadastro DESC
    LIMIT p_limit
    OFFSET v_offset
  ) AS user_data;

  RETURN v_users;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in list_users_v2: %', SQLERRM;
    RAISE;
END;
$function$
;

-- ---- listar_clientes ----
CREATE OR REPLACE FUNCTION public.listar_clientes(p_is_admin text, p_vendedor_id uuid, p_search text, p_tipo_cliente text, p_limit integer, p_page integer)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_data      jsonb;
  v_total     bigint;
  v_last_page integer;
  v_is_admin_boolean boolean;
  v_tipo_cliente_normalized text;
BEGIN
  -- Converter p_is_admin: aceita boolean ou string "true"/"false"
  IF p_is_admin IS NULL THEN
    v_is_admin_boolean := false;
  ELSIF LOWER(TRIM(p_is_admin)) IN ('true', '1', 't', 'yes', 'y') THEN
    v_is_admin_boolean := true;
  ELSIF LOWER(TRIM(p_is_admin)) IN ('false', '0', 'f', 'no', 'n', '') THEN
    v_is_admin_boolean := false;
  ELSE
    -- Tentar converter diretamente (caso já seja boolean como string)
    BEGIN
      v_is_admin_boolean := p_is_admin::boolean;
    EXCEPTION
      WHEN OTHERS THEN
        v_is_admin_boolean := false;
    END;
  END IF;

  -- Normalizar p_tipo_cliente: converter "null" string para NULL
  IF p_tipo_cliente IS NULL OR TRIM(p_tipo_cliente) = '' OR LOWER(TRIM(p_tipo_cliente)) = 'null' THEN
    v_tipo_cliente_normalized := NULL;
  ELSE
    v_tipo_cliente_normalized := TRIM(p_tipo_cliente);
  END IF;

  -- 1) Total de registros que satisfazem os filtros
  SELECT COUNT(*) 
    INTO v_total
  FROM public.cliente c
  LEFT JOIN public.cliente_contato cc
    ON c.cliente_id = cc.cliente_id
  LEFT JOIN public."cliente_endereço" ce
    ON c.cliente_id = ce.cliente_id
  WHERE c.deleted_at IS NULL
    AND (
      v_is_admin_boolean
      OR (p_vendedor_id IS NOT NULL
          AND p_vendedor_id = ANY(c.vendedoresatribuidos))
    )
    AND (
      p_search IS NULL
      OR TRIM(p_search) = ''
      OR c.nome           ILIKE '%' || p_search || '%'
      OR c.nome_fantasia  ILIKE '%' || p_search || '%'
      OR c.marca_mae      ILIKE '%' || p_search || '%'
      OR c.codigo_sequencial ILIKE '%' || p_search || '%'
      OR c.cpf_cnpj       ILIKE '%' || p_search || '%'
    )
    AND (
      v_tipo_cliente_normalized IS NULL
      OR c.tipo_segmento  ILIKE '%' || v_tipo_cliente_normalized || '%'
    );

  -- 2) Calcula última página
  IF v_total = 0 THEN
    v_last_page := 1;
  ELSE
    v_last_page := CEIL(v_total::numeric / p_limit)::integer;
  END IF;

  -- 3) Monta os dados da página
  SELECT json_agg(row_to_json(r))
    INTO v_data
  FROM (
    SELECT
      c.cliente_id,
      c.nome,
      c.nome_fantasia,
      c.cpf_cnpj,
      c."ref_tipo_pessoa_id_FK",
      c.vendedoresatribuidos,
      c.marca_mae,
      cc.telefone,
      cc.email,
      ce.cidade,
      concat_ws(' - ', c.nome, c.cpf_cnpj, c.nome_fantasia) AS nome_cnpj_fantasia
    FROM public.cliente c
    LEFT JOIN public.cliente_contato cc
      ON c.cliente_id = cc.cliente_id
    LEFT JOIN public."cliente_endereço" ce
      ON c.cliente_id = ce.cliente_id
    WHERE c.deleted_at IS NULL
      AND (
        v_is_admin_boolean
        OR (p_vendedor_id IS NOT NULL
            AND p_vendedor_id = ANY(c.vendedoresatribuidos))
      )
      AND (
        p_search IS NULL
        OR TRIM(p_search) = ''
        OR c.nome           ILIKE '%' || p_search || '%'
        OR c.nome_fantasia  ILIKE '%' || p_search || '%'
        OR c.marca_mae      ILIKE '%' || p_search || '%'
        OR c.codigo_sequencial ILIKE '%' || p_search || '%'
        OR c.cpf_cnpj       ILIKE '%' || p_search || '%'
      )
      AND (
        v_tipo_cliente_normalized IS NULL
        OR c.tipo_segmento  ILIKE '%' || v_tipo_cliente_normalized || '%'
      )
    ORDER BY c.nome ASC
    LIMIT  p_limit
    OFFSET (p_page - 1) * p_limit
  ) AS r;

  -- 4) Retorna o JSON com dados + metadados
  RETURN jsonb_build_object(
    'data',         COALESCE(v_data, '[]'::jsonb),
    'total',        v_total,
    'last_page',    v_last_page,
    'current_page', p_page
  );
END;
$function$
;

-- ---- listar_vendedores_comissoes ----
CREATE OR REPLACE FUNCTION public.listar_vendedores_comissoes(mes_referencia text)
 RETURNS TABLE(vendedor_uuid uuid, nome_vendedor text, saldo_mes text, comissao_pedido jsonb)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
    SELECT
      dv.user_id AS vendedor_uuid,
      dv.nome    AS nome_vendedor,

      -- Formata milhares com '.' e decimais com ','
      REPLACE(
        REPLACE(
          REPLACE(
            TO_CHAR(
              COALESCE(
                SUM(
                  CASE 
                    WHEN vc.debito THEN -COALESCE(vc.valor_comissao, 0)
                    ELSE COALESCE(vc.valor_comissao, 0)
                  END
                ),
                0
              ),
              'FM999G999G990D00'
            ),
            ',', 'X'
          ),
          '.', ','
        ),
        'X', '.'
      ) AS saldo_mes,

      COALESCE(
        JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'pedido_id',          vc.pedido_id,
            'data_inicio',        vc.data_inicio,
            'valor_comissao',     REPLACE(
                                     REPLACE(
                                       REPLACE(
                                         TO_CHAR(COALESCE(vc.valor_comissao,0),'FM999G999G990D00'),
                                         ',', 'X'
                                       ),
                                       '.', ','
                                     ),
                                     'X', '.'
                                   ),
            'valor_total_pedido', REPLACE(
                                     REPLACE(
                                       REPLACE(
                                         TO_CHAR(COALESCE(pv.valor_total,0),'FM999G999G990D00'),
                                         ',', 'X'
                                       ),
                                       '.', ','
                                     ),
                                     'X', '.'
                                   ),
            'cliente_id',         pv.cliente_id,
            'numero_pedido',      pv.numero_pedido,
            'debito',             vc.debito
          )
        ) FILTER (WHERE vc.pedido_id IS NOT NULL),
        '[]'::jsonb
      ) AS comissao_pedido

    FROM dados_vendedor dv
    LEFT JOIN vendedor_comissão vc
      ON dv.user_id = vc.vendedor_uuid
     AND TO_CHAR(vc.data_inicio, 'YYYY-MM') = mes_referencia
    LEFT JOIN pedido_venda pv
      ON vc.pedido_id = pv."pedido_venda_ID"

    GROUP BY dv.user_id, dv.nome
    ORDER BY dv.nome;
END;
$function$
;

-- ---- minha_funcao_comissoes ----
CREATE OR REPLACE FUNCTION public.minha_funcao_comissoes(p_vendedor_id uuid, mes_referencia text)
 RETURNS TABLE(vendedor_uuid uuid, nome_vendedor text, saldo_mes text, comissao_pedido jsonb)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
    SELECT
      dv.user_id AS vendedor_uuid,
      dv.nome    AS nome_vendedor,

      /* saldo_mes formatado como “1.234,56” */
      REPLACE(
        REPLACE(
          REPLACE(
            TO_CHAR(
              COALESCE(
                SUM(
                  CASE
                    WHEN vc.debito THEN -COALESCE(vc.valor_comissao, 0)
                    ELSE  COALESCE(vc.valor_comissao, 0)
                  END
                ), 
                0
              ),
              'FM999G999G990D00'
            ),
            ',', 'X'
          ),
          '.', ','
        ),
        'X', '.'
      ) AS saldo_mes,

      /* comissao_pedido como JSONB com mesmos formatos */
      COALESCE(
        JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'pedido_id',           vc.pedido_id,
            'data_inicio',         vc.data_inicio,
            'valor_comissao',
              REPLACE(
                REPLACE(
                  REPLACE(
                    TO_CHAR(COALESCE(vc.valor_comissao,0), 'FM999G999G990D00'),
                    ',', 'X'
                  ),
                  '.', ','
                ),
                'X', '.'
              ),
            'valor_total_pedido',
              REPLACE(
                REPLACE(
                  REPLACE(
                    TO_CHAR(COALESCE(pv.valor_total,0), 'FM999G999G990D00'),
                    ',', 'X'
                  ),
                  '.', ','
                ),
                'X', '.'
              ),
            'cliente_id',          pv.cliente_id,
            'numero_pedido',       pv.numero_pedido,
            'debito',              vc.debito
          )
        ) FILTER (WHERE vc.pedido_id IS NOT NULL),
        '[]'::jsonb
      ) AS comissao_pedido

    FROM dados_vendedor dv
    LEFT JOIN vendedor_comissão vc
      ON dv.user_id = vc.vendedor_uuid
     AND TO_CHAR(vc.data_inicio, 'YYYY-MM') = mes_referencia
    LEFT JOIN pedido_venda pv
      ON vc.pedido_id = pv."pedido_venda_ID"
   WHERE dv.user_id = p_vendedor_id
    GROUP BY dv.user_id, dv.nome
    ORDER BY dv.nome;
END;
$function$
;

-- ---- preencher_cliente_nome_vendedor_comissao ----
CREATE OR REPLACE FUNCTION public.preencher_cliente_nome_vendedor_comissao()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  -- Busca o nome do cliente baseado no cliente_id
  if new.cliente_id is not null then
    select c.nome
    into new.cliente_nome
    from public.cliente c
    where c.cliente_id = new.cliente_id;
  end if;

  return new;
end;
$function$
;

-- ---- registrar_log_alteracao_cliente ----
CREATE OR REPLACE FUNCTION public.registrar_log_alteracao_cliente()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
;

-- ---- registrar_log_alteracao_cliente_auxiliar ----
CREATE OR REPLACE FUNCTION public.registrar_log_alteracao_cliente_auxiliar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
;

-- ---- rejeitar_cliente_v2 ----
CREATE OR REPLACE FUNCTION public.rejeitar_cliente_v2(p_cliente_id bigint, p_motivo_rejeicao text, p_rejeitado_por uuid)
 RETURNS TABLE(cliente_id bigint, status_aprovacao text, motivo_rejeicao text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_tipo TEXT;
BEGIN
  IF p_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_id é obrigatório';
  END IF;

  IF p_rejeitado_por IS NULL THEN
    RAISE EXCEPTION 'rejeitado_por é obrigatório';
  END IF;

  IF p_motivo_rejeicao IS NULL OR LENGTH(TRIM(p_motivo_rejeicao)) < 5 THEN
    RAISE EXCEPTION 'Motivo da rejeição deve ter pelo menos 5 caracteres';
  END IF;

  SELECT tipo INTO v_user_tipo
  FROM public.user
  WHERE user_id = p_rejeitado_por
  AND ativo = TRUE
  AND deleted_at IS NULL;

  IF v_user_tipo IS NULL THEN
    RAISE EXCEPTION 'Usuário não autorizado';
  END IF;

  IF v_user_tipo != 'backoffice' THEN
    RAISE EXCEPTION 'Apenas usuários backoffice podem rejeitar clientes';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.cliente
    WHERE cliente_id = p_cliente_id
    AND deleted_at IS NULL
    AND status_aprovacao = 'pendente'
  ) THEN
    RAISE EXCEPTION 'Cliente não encontrado ou não está pendente de aprovação';
  END IF;

  UPDATE public.cliente
  SET
    status_aprovacao = 'rejeitado',
    motivo_rejeicao = TRIM(p_motivo_rejeicao),
    ref_situacao_id = (SELECT ref_situacao_id FROM public.ref_situacao WHERE nome = 'Inativo' LIMIT 1),
    updated_at = NOW()
  WHERE cliente_id = p_cliente_id;

  RETURN QUERY
  SELECT 
    c.cliente_id,
    c.status_aprovacao,
    c.motivo_rejeicao
  FROM public.cliente c
  WHERE c.cliente_id = p_cliente_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in rejeitar_cliente_v2 for cliente %: %', p_cliente_id, SQLERRM;
    RAISE;
END;
$function$
;

-- ---- remove_condicao_disponivel ----
CREATE OR REPLACE FUNCTION public.remove_condicao_disponivel(p_cliente_id bigint, p_valor bigint)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE public.cliente
  SET condicoesdisponiveis = array_remove(condicoesdisponiveis, p_valor)
  WHERE cliente_id = p_cliente_id;
END;
$function$
;

-- ---- remover_vendedor_atribuido ----
CREATE OR REPLACE FUNCTION public.remover_vendedor_atribuido(p_cliente_id integer, p_vendedor_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE public.cliente
    SET vendedoresatribuidos = array(
        SELECT unnest(vendedoresatribuidos) 
        EXCEPT 
        SELECT unnest(p_vendedor_ids)
    )
    WHERE cliente_id = p_cliente_id;
END;
$function$
;

-- ---- rpc_condicoes_disponiveis ----
CREATE OR REPLACE FUNCTION public.rpc_condicoes_disponiveis(ids_excluir bigint[])
 RETURNS json
 LANGUAGE sql
 STABLE
AS $function$SELECT json_build_object(
         'data',
         COALESCE(json_agg(t), '[]'::json)
       )
FROM (
  SELECT *
  FROM public."Condicao_De_Pagamento"
  WHERE 
    -- Inclui registros onde ids_excluir é nulo ou vazio
    (ids_excluir IS NULL OR array_length(ids_excluir, 1) = 0)
    
    -- Garante que a condição só filtra registros se ids_excluir não for NULL
    OR "Condição_ID" NOT IN (
      SELECT unnest(ids_excluir) 
      FROM public."Condicao_De_Pagamento" 
      WHERE ids_excluir IS NOT NULL 
        AND array_length(ids_excluir, 1) > 0
    )
) t;$function$
;

-- ---- rpc_insert_condicao_pagamento ----
CREATE OR REPLACE FUNCTION public.rpc_insert_condicao_pagamento(p_descricao text, p_parcelamento boolean DEFAULT NULL::boolean, p_condicao_credito boolean DEFAULT NULL::boolean, p_quantidade_parcelas double precision DEFAULT NULL::double precision, p_desconto double precision DEFAULT NULL::double precision, p_prazo_pagamento double precision DEFAULT NULL::double precision, p_forma_pagamento_id bigint DEFAULT NULL::bigint, p_meio_pagamento bigint DEFAULT NULL::bigint, p_intervalo_parcela bigint[] DEFAULT NULL::bigint[])
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_exists boolean;
  v_new_id bigint;
  v_row record;
BEGIN
  IF p_descricao IS NULL OR btrim(p_descricao) = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Descrição é obrigatória.');
  END IF;

  -- Verifica existencia (case-insensitive, trim)
  SELECT EXISTS (
    SELECT 1 FROM public."Condicao_De_Pagamento"
    WHERE normalize_description(descricao) = normalize_description(p_descricao)
  ) INTO v_exists;

  -- If normalize_description helper doesn't exist, fallback to lower(trim(...))
  IF v_exists IS NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public."Condicao_De_Pagamento"
      WHERE lower(btrim(descricao)) = lower(btrim(p_descricao))
    ) INTO v_exists;
  END IF;

  IF v_exists THEN
    RETURN jsonb_build_object('success', false, 'message', 'Já existe essa condição de pagamento.');
  END IF;

  INSERT INTO public."Condicao_De_Pagamento"(
    "Parcelamento",
    "Condição_de_crédito",
    "Quantidade_parcelas",
    "Desconto",
    "Prazo_pagamento",
    "Descrição",
    forma_pagamento_id,
    meio_pagamento,
    intervalo_parcela
  ) VALUES (
    p_parcelamento,
    p_condicao_credito,
    p_quantidade_parcelas,
    p_desconto,
    p_prazo_pagamento,
    p_descricao,
    p_forma_pagamento_id,
    p_meio_pagamento,
    p_intervalo_parcela
  )
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('success', true, 'message', 'Condição de pagamento inserida com sucesso.', 'data', to_jsonb(v_row));
EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object('success', false, 'message', sqlerrm);
END;
$function$
;

-- ---- rpc_list_clientes ----
CREATE OR REPLACE FUNCTION public.rpc_list_clientes(p_limit integer, p_page integer, p_is_admin boolean, p_vendedor_id uuid DEFAULT NULL::uuid, p_search text DEFAULT NULL::text, p_tipo_cliente text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_data      jsonb;
  v_total     bigint;
  v_last_page integer;
BEGIN
  -- 1) Total de registros que satisfazem os filtros
  SELECT COUNT(*) 
    INTO v_total
  FROM public.cliente c
  LEFT JOIN public.cliente_contato cc
    ON c.cliente_id = cc.cliente_id
  LEFT JOIN public."cliente_endereço" ce
    ON c.cliente_id = ce.cliente_id
  WHERE
    ( p_is_admin
      OR (p_vendedor_id IS NOT NULL
          AND p_vendedor_id = ANY(c.vendedoresatribuidos))
    )
    AND (
      p_search IS NULL
      OR c.nome           ILIKE '%' || p_search || '%'
      OR c.nome_fantasia  ILIKE '%' || p_search || '%'
      OR c.marca_mae      ILIKE '%' || p_search || '%'
      OR c.codigo_sequencial ILIKE '%' || p_search || '%'
      OR c.cpf_cnpj       ILIKE '%' || p_search || '%'
    )
    AND (
      p_tipo_cliente IS NULL
      OR p_tipo_cliente = ''
      OR lower(p_tipo_cliente) = 'null'
      OR c.tipo_segmento  ILIKE '%' || p_tipo_cliente || '%'
    );

  -- 2) Calcula última página
  IF v_total = 0 THEN
    v_last_page := 1;
  ELSE
    v_last_page := CEIL(v_total::numeric / p_limit)::integer;
  END IF;

  -- 3) Monta os dados da página
  SELECT json_agg(row_to_json(r))
    INTO v_data
  FROM (
    SELECT
      c.cliente_id,
      c.nome,
      c.nome_fantasia,
      c.cpf_cnpj,
      c."ref_tipo_pessoa_id_FK",
      c.vendedoresatribuidos,
      c.marca_mae,
      cc.telefone,
      cc.email,
      ce.cidade
    FROM public.cliente c
    LEFT JOIN public.cliente_contato cc
      ON c.cliente_id = cc.cliente_id
    LEFT JOIN public."cliente_endereço" ce
      ON c.cliente_id = ce.cliente_id
    WHERE
      ( p_is_admin
        OR (p_vendedor_id IS NOT NULL
            AND p_vendedor_id = ANY(c.vendedoresatribuidos))
      )
      AND (
        p_search IS NULL
        OR c.nome           ILIKE '%' || p_search || '%'
        OR c.nome_fantasia  ILIKE '%' || p_search || '%'
        OR c.marca_mae      ILIKE '%' || p_search || '%'
        OR c.codigo_sequencial ILIKE '%' || p_search || '%'
        OR c.cpf_cnpj       ILIKE '%' || p_search || '%'
      )
      AND (
        p_tipo_cliente IS NULL
        OR p_tipo_cliente = ''
        OR lower(p_tipo_cliente) = 'null'
        OR c.tipo_segmento  ILIKE '%' || p_tipo_cliente || '%'
      )
    ORDER BY c.nome ASC
    LIMIT  p_limit
    OFFSET (p_page - 1) * p_limit
  ) AS r;

  -- 4) Retorna o JSON com dados + metadados
  RETURN jsonb_build_object(
    'data',         COALESCE(v_data, '[]'::jsonb),
    'total',        v_total,
    'last_page',    v_last_page,
    'current_page', p_page
  );
END;
$function$
;

-- ---- rpc_list_pedido_venda ----
CREATE OR REPLACE FUNCTION public.rpc_list_pedido_venda(p_limit integer, p_page integer, p_vendedor_uuid uuid, p_is_vendedor boolean, p_month_date text DEFAULT NULL::text, p_natureza_operacao text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_vendedor_filter_uuid uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$DECLARE
  -- converte “YYYY-MM” em primeiro dia do mês; '' ou NULL vira NULL
  v_month_start DATE := CASE
    WHEN p_month_date IS NULL OR p_month_date = '' THEN NULL
    ELSE to_date(p_month_date, 'YYYY-MM')
  END;

  -- trata NULL, '' ou 'todos' (case-insensitive) como empty (sem filtro)
  v_natureza TEXT := CASE
    WHEN p_natureza_operacao IS NULL
      OR p_natureza_operacao = ''
      OR lower(p_natureza_operacao) = 'todos'
    THEN ''
    ELSE p_natureza_operacao
  END;

  -- resultado JSON da página atual
  v_data        JSONB;

  -- totais gerais (todas as páginas)
  v_total_count BIGINT;
  v_total_value NUMERIC;

  -- última página
  v_last_page   INTEGER;

  -- totais da página atual
  v_page_count  INTEGER;
  v_page_value  NUMERIC;
BEGIN

  ----------------------------------------------------------------------------
  -- 1) TOTAL GERAL DE PEDIDOS E SOMA GERAL DE valor_total
  ----------------------------------------------------------------------------
  SELECT
    COUNT(*),
    COALESCE(SUM(pv.valor_total), 0)
  INTO
    v_total_count,
    v_total_value
  FROM pedido_venda pv
  LEFT JOIN cliente c
    ON pv.cliente_id = c.cliente_id
  WHERE
    ((p_is_vendedor AND pv.vendedor_uuid = p_vendedor_uuid)
     OR
     (NOT p_is_vendedor
      AND (p_vendedor_filter_uuid IS NULL
           OR pv.vendedor_uuid = p_vendedor_filter_uuid)))
    -- filtro de mês
    AND (
      v_month_start IS NULL
      OR (pv.data_venda >= v_month_start
          AND pv.data_venda < (v_month_start + INTERVAL '1 month')::DATE)
    )
    -- filtro de natureza ('' = sem filtro, inclui também 'todos')
    AND (
      v_natureza = ''
      OR pv.natureza_operacao = v_natureza
    )
    -- filtro de busca
    AND (
      p_search IS NULL
      OR c.nome           ILIKE '%' || p_search || '%'
      OR c.marca_mae      ILIKE '%' || p_search || '%'
      OR pv.ordem_cliente ILIKE '%' || p_search || '%'
      OR pv."pedido_venda_ID"::TEXT ILIKE '%' || p_search || '%'
    );

  ----------------------------------------------------------------------------
  -- 2) CÁLCULO DA ÚLTIMA PÁGINA
  ----------------------------------------------------------------------------
  IF v_total_count = 0 THEN
    v_last_page := 1;
  ELSE
    v_last_page := CEIL(v_total_count::NUMERIC / p_limit)::INTEGER;
  END IF;

  ----------------------------------------------------------------------------
  -- 3) BUSCAR DADOS DA PÁGINA ATUAL EM JSON
  ----------------------------------------------------------------------------
  SELECT
    json_agg(row_to_json(r))
  INTO
    v_data
  FROM (
    SELECT
      pv."pedido_venda_ID"  AS pedido_venda_id,
      pv.cliente_id         AS cliente_id,
      c.nome                AS nome_cliente,
      pv.vendedor_uuid      AS vendedor_uuid,
      pv.natureza_operacao  AS natureza_operacao,
      pv.numero_pedido      AS numero_pedido,
      pv.observacao         AS observacao,
      pv.observacao_interna AS observacao_interna,
      -- formata valor_total
      replace(
        replace(
          replace(
            to_char(pv.valor_total, 'FM9,999,990.00'),
            '.', '#'
          ),
          ',', '.'
        ),
        '#', ','
      )                     AS valor_total,
      pv.timestamp          AS timestamp,
      pv.data_venda         AS data_venda,
      pv.ordem_cliente      AS ordem_cliente,
      pv.id_condicao        AS id_condicao
    FROM pedido_venda pv
    LEFT JOIN cliente c
      ON pv.cliente_id = c.cliente_id
    WHERE
      ((p_is_vendedor AND pv.vendedor_uuid = p_vendedor_uuid)
       OR
       (NOT p_is_vendedor
        AND (p_vendedor_filter_uuid IS NULL
             OR pv.vendedor_uuid = p_vendedor_filter_uuid)))
      -- filtro de mês
      AND (
        v_month_start IS NULL
        OR (pv.data_venda >= v_month_start
            AND pv.data_venda < (v_month_start + INTERVAL '1 month')::DATE)
      )
      -- filtro de natureza ('' = sem filtro, inclui também 'todos')
      AND (
        v_natureza = ''
        OR pv.natureza_operacao = v_natureza
      )
      -- filtro de busca
      AND (
        p_search IS NULL
        OR c.nome           ILIKE '%' || p_search || '%'
        OR c.marca_mae      ILIKE '%' || p_search || '%'
        OR pv.ordem_cliente ILIKE '%' || p_search || '%'
        OR pv."pedido_venda_ID"::TEXT ILIKE '%' || p_search || '%'
      )
    ORDER BY
      pv.data_venda DESC,
      pv.timestamp DESC
    LIMIT  p_limit
    OFFSET (p_page - 1) * p_limit
  ) AS r;

  ----------------------------------------------------------------------------
  -- 4) TOTAL DE REGISTROS NA PÁGINA
  ----------------------------------------------------------------------------
  IF v_data IS NULL THEN
    v_page_count := 0;
  ELSE
    v_page_count := jsonb_array_length(v_data);
  END IF;

  ----------------------------------------------------------------------------
  -- 5) SOMA DE valor_total NA PÁGINA
  ----------------------------------------------------------------------------
  SELECT
    COALESCE(SUM(sub.valor_total), 0)
  INTO
    v_page_value
  FROM (
    SELECT pv.valor_total
    FROM pedido_venda pv
    LEFT JOIN cliente c
      ON pv.cliente_id = c.cliente_id
    WHERE
      ((p_is_vendedor AND pv.vendedor_uuid = p_vendedor_uuid)
       OR
       (NOT p_is_vendedor
        AND (p_vendedor_filter_uuid IS NULL
             OR pv.vendedor_uuid = p_vendedor_filter_uuid)))
      -- filtro de mês
      AND (
        v_month_start IS NULL
        OR (pv.data_venda >= v_month_start
            AND pv.data_venda < (v_month_start + INTERVAL '1 month')::DATE)
      )
      -- filtro de natureza ('' = sem filtro, inclui também 'todos')
      AND (
        v_natureza = ''
        OR pv.natureza_operacao = v_natureza
      )
      -- filtro de busca
      AND (
        p_search IS NULL
        OR c.nome           ILIKE '%' || p_search || '%'
        OR c.marca_mae      ILIKE '%' || p_search || '%'
        OR pv.ordem_cliente ILIKE '%' || p_search || '%'
        OR pv."pedido_venda_ID"::TEXT ILIKE '%' || p_search || '%'
      )
    ORDER BY
      pv.data_venda DESC,
      pv.timestamp DESC
    LIMIT  p_limit
    OFFSET (p_page - 1) * p_limit
  ) AS sub;

  ----------------------------------------------------------------------------
  -- 6) MONTAGEM DO JSON DE RETORNO
  ----------------------------------------------------------------------------
  RETURN jsonb_build_object(
    'data'               , COALESCE(v_data, '[]'::JSONB),
    'total_order_count'  , v_total_count,
    'last_page'          , v_last_page,
    'current_page'       , p_page,
    'page_order_count'   , v_page_count,
    'total_order_value'  , v_total_value,
    'page_order_value'   , v_page_value
  );

END;$function$
;

-- ---- rpc_list_pedido_venda_paged ----
CREATE OR REPLACE FUNCTION public.rpc_list_pedido_venda_paged(p_limit integer, p_page integer, p_is_vendedor boolean, p_vendedor_uuid uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_data  jsonb;
  v_total bigint;
BEGIN
  -- 1) calcula total de registros que satisfazem o filtro
  SELECT COUNT(*)
    INTO v_total
  FROM pedido_venda pv
  WHERE
    NOT p_is_vendedor
    OR pv.vendedor_uuid = p_vendedor_uuid;

  -- 2) agrega página de resultados em JSON
  SELECT json_agg(row_to_json(r))
    INTO v_data
  FROM (
    SELECT
      pv."pedido_venda_ID"    AS pedido_venda_id,
      pv.cliente_id,
      c.nome                  AS nome_cliente,
      pv.vendedor_uuid,
      pv.natureza_operacao,
      pv.numero_pedido,
      pv.observacao,
      pv.observacao_interna,
      pv.valor_total,
      pv.timestamp,
      pv.data_venda,
      pv.ordem_cliente,
      pv.id_condicao
    FROM pedido_venda pv
    LEFT JOIN cliente c
      ON pv.cliente_id = c.cliente_id
    WHERE
      NOT p_is_vendedor
      OR pv.vendedor_uuid = p_vendedor_uuid
    ORDER BY pv.data_venda DESC, pv.timestamp DESC
    LIMIT  p_limit
    OFFSET (p_page - 1) * p_limit
  ) AS r;

  -- 3) devolve o objeto com dados + total
  RETURN jsonb_build_object(
    'data',  COALESCE(v_data, '[]'::jsonb),
    'total', v_total
  );
END;
$function$
;

-- ---- rpc_listar_clientes ----
CREATE OR REPLACE FUNCTION public.rpc_listar_clientes(p_limit integer, p_page integer, p_is_admin boolean, p_vendedor_id uuid DEFAULT NULL::uuid, p_search text DEFAULT NULL::text, p_tipo_cliente text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_data      jsonb;
  v_total     bigint;
  v_last_page integer;
BEGIN
  -- 1) Total de registros que satisfazem os filtros
  SELECT COUNT(*) 
    INTO v_total
  FROM public.cliente c
  LEFT JOIN public.cliente_contato cc
    ON c.cliente_id = cc.cliente_id
  LEFT JOIN public."cliente_endereço" ce
    ON c.cliente_id = ce.cliente_id
  WHERE
    ( p_is_admin
      OR (p_vendedor_id IS NOT NULL
          AND p_vendedor_id = ANY(c.vendedoresatribuidos))
    )
    AND (
      p_search IS NULL
      OR c.nome           ILIKE '%' || p_search || '%'
      OR c.nome_fantasia  ILIKE '%' || p_search || '%'
      OR c.marca_mae      ILIKE '%' || p_search || '%'
      OR c.codigo_sequencial ILIKE '%' || p_search || '%'
      OR c.cpf_cnpj       ILIKE '%' || p_search || '%'
    )
    AND (
      p_tipo_cliente IS NULL
      OR p_tipo_cliente = ''
      OR lower(p_tipo_cliente) = 'null'
      OR c.tipo_segmento  ILIKE '%' || p_tipo_cliente || '%'
    );

  -- 2) Calcula última página
  IF v_total = 0 THEN
    v_last_page := 1;
  ELSE
    v_last_page := CEIL(v_total::numeric / p_limit)::integer;
  END IF;

  -- 3) Monta os dados da página
  SELECT json_agg(row_to_json(r))
    INTO v_data
  FROM (
    SELECT
      c.cliente_id,
      c.nome,
      c.nome_fantasia,
      c.cpf_cnpj,
      c."ref_tipo_pessoa_id_FK",
      c.vendedoresatribuidos,
      c.marca_mae,
      cc.telefone,
      cc.email,
      ce.cidade
    FROM public.cliente c
    LEFT JOIN public.cliente_contato cc
      ON c.cliente_id = cc.cliente_id
    LEFT JOIN public."cliente_endereço" ce
      ON c.cliente_id = ce.cliente_id
    WHERE
      ( p_is_admin
        OR (p_vendedor_id IS NOT NULL
            AND p_vendedor_id = ANY(c.vendedoresatribuidos))
      )
      AND (
        p_search IS NULL
        OR c.nome           ILIKE '%' || p_search || '%'
        OR c.nome_fantasia  ILIKE '%' || p_search || '%'
        OR c.marca_mae      ILIKE '%' || p_search || '%'
        OR c.codigo_sequencial ILIKE '%' || p_search || '%'
        OR c.cpf_cnpj       ILIKE '%' || p_search || '%'
      )
      AND (
        p_tipo_cliente IS NULL
        OR p_tipo_cliente = ''
        OR lower(p_tipo_cliente) = 'null'
        OR c.tipo_segmento  ILIKE '%' || p_tipo_cliente || '%'
      )
    ORDER BY c.nome ASC
    LIMIT  p_limit
    OFFSET (p_page - 1) * p_limit
  ) AS r;

  -- 4) Retorna o JSON com dados + metadados
  RETURN jsonb_build_object(
    'data',         COALESCE(v_data, '[]'::jsonb),
    'total',        v_total,
    'last_page',    v_last_page,
    'current_page', p_page
  );
END;
$function$
;

-- ---- search_price_list_products ----
CREATE OR REPLACE FUNCTION public.search_price_list_products(p_search text DEFAULT ''::text, p_lista_id bigint DEFAULT NULL::bigint, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_search TEXT := COALESCE(TRIM(p_search), '');
  v_limit INTEGER := LEAST(GREATEST(p_limit, 1), 200);
  v_offset INTEGER := GREATEST(p_offset, 0);
  v_total BIGINT;
  v_items JSONB;
BEGIN
  SELECT COUNT(*)
    INTO v_total
  FROM public.produto pr
  WHERE
    (v_search = ''::text)
    OR pr.descricao ILIKE '%' || v_search || '%'
    OR pr.codigo_sku ILIKE '%' || v_search || '%'
    OR pr.gtin ILIKE '%' || v_search || '%';

  WITH base AS (
    SELECT
      pr.produto_id,
      pr.descricao,
      pr.codigo_sku,
      pr.gtin,
      COALESCE(plp.preco, pr.preco_venda) AS preco_lista,
      plp.lista_preco_id
    FROM public.produto pr
    LEFT JOIN public.produtos_listas_precos plp
      ON plp.produto_id = pr.produto_id
     AND (p_lista_id IS NULL OR plp.lista_preco_id = p_lista_id)
    WHERE
      (v_search = ''::text)
      OR pr.descricao ILIKE '%' || v_search || '%'
      OR pr.codigo_sku ILIKE '%' || v_search || '%'
      OR pr.gtin ILIKE '%' || v_search || '%'
    ORDER BY pr.descricao ASC
    LIMIT v_limit
    OFFSET v_offset
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(base)), '[]'::jsonb)
    INTO v_items
  FROM base;

  RETURN jsonb_build_object(
    'items', v_items,
    'total', v_total,
    'limit', v_limit,
    'offset', v_offset
  );
END;
$function$
;

-- ---- tg_pedido_venda_generate_comissao ----
CREATE OR REPLACE FUNCTION public.tg_pedido_venda_generate_comissao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id bigint;
  v_status text;
begin
  -- usa os nomes CORRETOS da função generate_vendedor_comissao
  select ret_vendedor_comissao_id, status
    into v_id, v_status
  from public.generate_vendedor_comissao(NEW."pedido_venda_ID");

  -- (opcional) log
  perform pg_notify(
    'comissao_log',
    json_build_object(
      'pedido_id', NEW."pedido_venda_ID",
      'status', v_status,
      'vendedor_comissao_id', v_id
    )::text
  );

  return NEW;
exception
  when others then
    raise notice 'Falha ao gerar comissão do pedido %: %', NEW."pedido_venda_ID", SQLERRM;
    return NEW;
end;
$function$
;

-- ---- trigger_comissao_faturado ----
CREATE OR REPLACE FUNCTION public.trigger_comissao_faturado()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$                   
  BEGIN                                                                                                          
    -- Só gerar quando status MUDA PARA 'Faturado'                                                               
    IF NEW.status = 'Faturado' AND (OLD.status IS NULL OR OLD.status <> 'Faturado') THEN                         
      PERFORM generate_vendedor_comissao(NEW."pedido_venda_ID", current_date);                                   
    END IF;                                                                                                      
    RETURN NEW;                                                                                                  
  END;                                                                                                           
  $function$
;

-- ---- update_categorias_conta_corrente_v2 ----
CREATE OR REPLACE FUNCTION public.update_categorias_conta_corrente_v2(p_id uuid, p_nome text DEFAULT NULL::text, p_descricao text DEFAULT NULL::text, p_cor text DEFAULT NULL::text, p_ativo boolean DEFAULT NULL::boolean, p_updated_by uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, nome text, descricao text, cor text, ativo boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE v_user_tipo TEXT; BEGIN IF p_id IS NULL THEN RAISE EXCEPTION 'ID é obrigatório'; END IF; IF NOT EXISTS ( SELECT 1 FROM public.categorias_conta_corrente c WHERE c.id = p_id AND c.deleted_at IS NULL ) THEN RAISE EXCEPTION 'Categoria de conta corrente não encontrada'; END IF; IF p_nome IS NOT NULL THEN IF LENGTH(TRIM(p_nome)) < 2 THEN RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres'; END IF; IF EXISTS ( SELECT 1 FROM public.categorias_conta_corrente c WHERE LOWER(TRIM(c.nome)) = LOWER(TRIM(p_nome)) AND c.id != p_id AND c.deleted_at IS NULL ) THEN RAISE EXCEPTION 'Categoria de conta corrente com este nome já existe'; END IF; END IF; IF p_updated_by IS NOT NULL THEN SELECT u.tipo INTO v_user_tipo FROM public.user u WHERE u.user_id = p_updated_by AND u.ativo = TRUE AND u.deleted_at IS NULL; IF NOT FOUND THEN RAISE EXCEPTION 'Usuário não encontrado ou inativo'; END IF; IF v_user_tipo != 'backoffice' THEN RAISE EXCEPTION 'Apenas usuários backoffice podem atualizar categorias de conta corrente'; END IF; END IF; UPDATE public.categorias_conta_corrente SET nome = COALESCE(NULLIF(TRIM(p_nome), ''), categorias_conta_corrente.nome), descricao = CASE WHEN p_descricao IS NULL THEN categorias_conta_corrente.descricao WHEN TRIM(p_descricao) = '' THEN NULL ELSE TRIM(p_descricao) END, cor = CASE WHEN p_cor IS NULL THEN categorias_conta_corrente.cor WHEN TRIM(p_cor) = '' THEN NULL ELSE TRIM(p_cor) END, ativo = COALESCE(p_ativo, categorias_conta_corrente.ativo), updated_at = NOW() WHERE categorias_conta_corrente.id = p_id; RETURN QUERY SELECT c.id, c.nome, c.descricao, c.cor, c.ativo, c.created_at, c.updated_at FROM public.categorias_conta_corrente c WHERE c.id = p_id; EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error in update_categorias_conta_corrente_v2: %', SQLERRM; RAISE; END; $function$
;

-- ---- update_cliente_v2 ----
CREATE OR REPLACE FUNCTION public.update_cliente_v2(p_cliente_id bigint, p_nome text DEFAULT NULL::text, p_nome_fantasia text DEFAULT NULL::text, p_cpf_cnpj text DEFAULT NULL::text, p_ref_tipo_pessoa_id_fk bigint DEFAULT NULL::bigint, p_inscricao_estadual text DEFAULT NULL::text, p_codigo text DEFAULT NULL::text, p_grupo_rede text DEFAULT NULL::text, p_grupo_id uuid DEFAULT NULL::uuid, p_lista_de_preco bigint DEFAULT NULL::bigint, p_desconto_financeiro numeric DEFAULT NULL::numeric, p_pedido_minimo numeric DEFAULT NULL::numeric, p_vendedoresatribuidos uuid[] DEFAULT NULL::uuid[], p_observacao_interna text DEFAULT NULL::text, p_segmento_id bigint DEFAULT NULL::bigint, p_ref_situacao_id integer DEFAULT NULL::integer, p_telefone text DEFAULT NULL::text, p_telefone_adicional text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_email_nf text DEFAULT NULL::text, p_website text DEFAULT NULL::text, p_observacao_contato text DEFAULT NULL::text, p_cep text DEFAULT NULL::text, p_rua text DEFAULT NULL::text, p_numero text DEFAULT NULL::text, p_complemento text DEFAULT NULL::text, p_bairro text DEFAULT NULL::text, p_cidade text DEFAULT NULL::text, p_uf text DEFAULT NULL::text, p_ref_tipo_endereco_id_fk bigint DEFAULT NULL::bigint, p_empresa_faturamento_id bigint DEFAULT NULL::bigint, p_condicoes_pagamento_ids bigint[] DEFAULT NULL::bigint[], p_atualizado_por uuid DEFAULT NULL::uuid, p_status_aprovacao text DEFAULT NULL::text, p_set_requisitos_logisticos boolean DEFAULT false, p_requisitos_logisticos jsonb DEFAULT NULL::jsonb, p_desconto numeric DEFAULT NULL::numeric, p_condicao_padrao bigint DEFAULT NULL::bigint)
 RETURNS TABLE(cliente_id bigint, nome text, nome_fantasia text, cpf_cnpj text, codigo text, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_user_tipo text;
  v_cliente_owner uuid;
  v_status_aprovacao text;
BEGIN
  IF p_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_id e obrigatorio';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.cliente c
    WHERE c.cliente_id = p_cliente_id
      AND c.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Cliente nao encontrado';
  END IF;

  IF p_atualizado_por IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_atualizado_por
      AND u.ativo = true
      AND u.deleted_at IS NULL;

    IF v_user_tipo IS NULL THEN
      RAISE EXCEPTION 'Usuario nao autorizado';
    END IF;

    IF v_user_tipo = 'vendedor' THEN
      SELECT c.criado_por INTO v_cliente_owner
      FROM public.cliente c
      WHERE c.cliente_id = p_cliente_id;

      IF v_cliente_owner != p_atualizado_por THEN
        RAISE EXCEPTION 'Vendedores so podem editar clientes que criaram';
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM public.cliente c
        WHERE c.cliente_id = p_cliente_id
          AND c.status_aprovacao = 'aprovado'
      ) THEN
        RAISE EXCEPTION 'Vendedores so podem editar clientes aprovados';
      END IF;
    END IF;
  END IF;

  IF p_nome IS NOT NULL AND length(trim(p_nome)) < 2 THEN
    RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
  END IF;

  IF p_ref_tipo_pessoa_id_fk IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.ref_tipo_pessoa rtp
      WHERE rtp.ref_tipo_pessoa_id = p_ref_tipo_pessoa_id_fk
    ) THEN
      RAISE EXCEPTION 'Tipo de pessoa invalido';
    END IF;
  END IF;

  IF p_status_aprovacao IS NOT NULL THEN
    v_status_aprovacao := lower(trim(p_status_aprovacao));
    IF v_status_aprovacao NOT IN ('aprovado', 'pendente', 'rejeitado') THEN
      RAISE EXCEPTION 'status_aprovacao invalido: %', p_status_aprovacao;
    END IF;
  ELSE
    v_status_aprovacao := NULL;
  END IF;

  UPDATE public.cliente c SET
    nome = COALESCE(NULLIF(trim(p_nome), ''), c.nome),
    nome_fantasia = COALESCE(NULLIF(trim(p_nome_fantasia), ''), c.nome_fantasia),
    cpf_cnpj = COALESCE(NULLIF(p_cpf_cnpj, ''), c.cpf_cnpj),
    "ref_tipo_pessoa_id_FK" = CASE WHEN p_ref_tipo_pessoa_id_fk IS NOT NULL THEN p_ref_tipo_pessoa_id_fk ELSE c."ref_tipo_pessoa_id_FK" END,
    inscricao_estadual = COALESCE(NULLIF(trim(p_inscricao_estadual), ''), c.inscricao_estadual),
    codigo = COALESCE(NULLIF(trim(p_codigo), ''), c.codigo),
    grupo_rede = COALESCE(NULLIF(trim(p_grupo_rede), ''), c.grupo_rede),
    grupo_id = CASE WHEN p_grupo_id IS NOT NULL THEN p_grupo_id ELSE c.grupo_id END,
    lista_de_preco = COALESCE(p_lista_de_preco, c.lista_de_preco),
    desconto_financeiro = COALESCE(p_desconto_financeiro, c.desconto_financeiro),
    pedido_minimo = COALESCE(p_pedido_minimo, c.pedido_minimo),
    vendedoresatribuidos = COALESCE(p_vendedoresatribuidos, c.vendedoresatribuidos),
    observacao_interna = COALESCE(NULLIF(trim(p_observacao_interna), ''), c.observacao_interna),
    segmento_id = CASE WHEN p_segmento_id IS NOT NULL THEN p_segmento_id ELSE c.segmento_id END,
    ref_situacao_id = CASE WHEN p_ref_situacao_id IS NOT NULL THEN p_ref_situacao_id ELSE c.ref_situacao_id END,
    status_aprovacao = CASE WHEN v_status_aprovacao IS NOT NULL THEN v_status_aprovacao ELSE c.status_aprovacao END,
    "empresaFaturamento" = CASE WHEN p_empresa_faturamento_id IS NOT NULL THEN p_empresa_faturamento_id ELSE c."empresaFaturamento" END,
    requisitos_logisticos = CASE WHEN p_set_requisitos_logisticos THEN p_requisitos_logisticos ELSE c.requisitos_logisticos END,
    desconto = COALESCE(p_desconto, c.desconto),
    condicao_padrao = CASE WHEN p_condicao_padrao IS NOT NULL THEN p_condicao_padrao ELSE c.condicao_padrao END,
    atualizado_por = p_atualizado_por,
    updated_at = now()
  WHERE c.cliente_id = p_cliente_id;

  IF p_telefone IS NOT NULL OR p_email IS NOT NULL OR p_telefone_adicional IS NOT NULL OR p_email_nf IS NOT NULL OR p_website IS NOT NULL OR p_observacao_contato IS NOT NULL THEN
    INSERT INTO public.cliente_contato (
      cliente_id,
      telefone,
      telefone_adicional,
      email,
      email_nf,
      website,
      observacao
    )
    VALUES (
      p_cliente_id,
      NULLIF(trim(p_telefone), ''),
      NULLIF(trim(p_telefone_adicional), ''),
      NULLIF(lower(trim(p_email)), ''),
      NULLIF(lower(trim(p_email_nf)), ''),
      NULLIF(trim(p_website), ''),
      NULLIF(trim(p_observacao_contato), '')
    )
    ON CONFLICT ON CONSTRAINT cliente_contato_pkey DO UPDATE SET
      telefone = COALESCE(NULLIF(trim(p_telefone), ''), EXCLUDED.telefone),
      telefone_adicional = COALESCE(NULLIF(trim(p_telefone_adicional), ''), EXCLUDED.telefone_adicional),
      email = COALESCE(NULLIF(lower(trim(p_email)), ''), EXCLUDED.email),
      email_nf = COALESCE(NULLIF(lower(trim(p_email_nf)), ''), EXCLUDED.email_nf),
      website = COALESCE(NULLIF(trim(p_website), ''), EXCLUDED.website),
      observacao = COALESCE(NULLIF(trim(p_observacao_contato), ''), EXCLUDED.observacao);
  END IF;

  IF p_cep IS NOT NULL OR p_rua IS NOT NULL OR p_numero IS NOT NULL OR p_complemento IS NOT NULL OR p_bairro IS NOT NULL OR p_cidade IS NOT NULL OR p_uf IS NOT NULL THEN
    INSERT INTO public."cliente_endereço" (
      cliente_id,
      cep,
      rua,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      "ref_tipo_endereco_id_FK"
    )
    VALUES (
      p_cliente_id,
      NULLIF(REPLACE(trim(p_cep), '-', ''), ''),
      NULLIF(trim(p_rua), ''),
      NULLIF(trim(p_numero), ''),
      NULLIF(trim(p_complemento), ''),
      NULLIF(trim(p_bairro), ''),
      NULLIF(trim(p_cidade), ''),
      NULLIF(UPPER(trim(p_uf)), ''),
      p_ref_tipo_endereco_id_fk
    )
    ON CONFLICT ON CONSTRAINT "cliente_endereço_pkey" DO UPDATE SET
      cep = COALESCE(NULLIF(REPLACE(trim(p_cep), '-', ''), ''), EXCLUDED.cep),
      rua = COALESCE(NULLIF(trim(p_rua), ''), EXCLUDED.rua),
      numero = COALESCE(NULLIF(trim(p_numero), ''), EXCLUDED.numero),
      complemento = COALESCE(NULLIF(trim(p_complemento), ''), EXCLUDED.complemento),
      bairro = COALESCE(NULLIF(trim(p_bairro), ''), EXCLUDED.bairro),
      cidade = COALESCE(NULLIF(trim(p_cidade), ''), EXCLUDED.cidade),
      uf = COALESCE(NULLIF(UPPER(trim(p_uf)), ''), EXCLUDED.uf),
      "ref_tipo_endereco_id_FK" = COALESCE(p_ref_tipo_endereco_id_fk, EXCLUDED."ref_tipo_endereco_id_FK");
  END IF;

  IF p_condicoes_pagamento_ids IS NOT NULL THEN
    DELETE FROM public."condições_cliente" cc
    WHERE cc."ID_cliente" = p_cliente_id;

    IF array_length(p_condicoes_pagamento_ids, 1) > 0 THEN
      INSERT INTO public."condições_cliente" ("ID_cliente", "ID_condições")
      SELECT p_cliente_id, unnest(p_condicoes_pagamento_ids)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN QUERY
  SELECT c.cliente_id, c.nome, c.nome_fantasia, c.cpf_cnpj, c.codigo, c.updated_at
  FROM public.cliente c
  WHERE c.cliente_id = p_cliente_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_cliente_v2 for cliente %: %', p_cliente_id, SQLERRM;
    RAISE;
END;
$function$
;

-- ---- update_conta_corrente_v2 ----
CREATE OR REPLACE FUNCTION public.update_conta_corrente_v2(p_id bigint, p_data date DEFAULT NULL::date, p_valor numeric DEFAULT NULL::numeric, p_titulo text DEFAULT NULL::text, p_descricao_longa text DEFAULT NULL::text, p_tipo_compromisso text DEFAULT NULL::text, p_categoria_id uuid DEFAULT NULL::uuid, p_arquivos_anexos text[] DEFAULT NULL::text[], p_updated_by uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id bigint, cliente_id bigint, cliente_nome text, cliente_grupo_rede text, vendedor_uuid uuid, data date, valor numeric, titulo text, descricao_longa text, tipo_compromisso text, categoria_id uuid, categoria_nome text, arquivos_anexos text[], valor_pago numeric, valor_pendente numeric, status text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ DECLARE v_user_tipo TEXT; v_cliente_id BIGINT; BEGIN IF p_id IS NULL THEN RAISE EXCEPTION 'ID é obrigatório'; END IF; SELECT ccc.cliente_id INTO v_cliente_id FROM public.conta_corrente_cliente ccc WHERE ccc.id = p_id; IF NOT FOUND THEN RAISE EXCEPTION 'Compromisso não encontrado'; END IF; IF p_updated_by IS NOT NULL THEN SELECT u.tipo INTO v_user_tipo FROM public.user u WHERE u.user_id = p_updated_by AND u.ativo = TRUE AND u.deleted_at IS NULL; IF NOT FOUND THEN RAISE EXCEPTION 'Usuário não encontrado ou inativo'; END IF; IF v_user_tipo = 'vendedor' THEN IF NOT EXISTS (SELECT 1 FROM public.cliente_vendedores cv WHERE cv.cliente_id = v_cliente_id AND cv.vendedor_id = p_updated_by) THEN RAISE EXCEPTION 'Vendedor não tem permissão para atualizar este compromisso'; END IF; END IF; END IF; IF p_titulo IS NOT NULL AND LENGTH(TRIM(p_titulo)) < 2 THEN RAISE EXCEPTION 'título deve ter pelo menos 2 caracteres'; END IF; IF p_valor IS NOT NULL AND p_valor <= 0 THEN RAISE EXCEPTION 'valor deve ser maior que zero'; END IF; IF p_tipo_compromisso IS NOT NULL AND LOWER(p_tipo_compromisso) NOT IN ('investimento', 'ressarcimento') THEN RAISE EXCEPTION 'tipo_compromisso deve ser "investimento" ou "ressarcimento"'; END IF; UPDATE public.conta_corrente_cliente ccc SET data = COALESCE(p_data, ccc.data), valor = COALESCE(p_valor, ccc.valor), titulo = COALESCE(NULLIF(TRIM(p_titulo), ''), ccc.titulo), descricao_longa = CASE WHEN p_descricao_longa IS NULL THEN ccc.descricao_longa ELSE p_descricao_longa END, tipo_compromisso = COALESCE(LOWER(p_tipo_compromisso), ccc.tipo_compromisso), categoria_id = CASE WHEN p_categoria_id IS NULL THEN ccc.categoria_id ELSE p_categoria_id END, arquivos_anexos = COALESCE(p_arquivos_anexos, ccc.arquivos_anexos) WHERE ccc.id = p_id; RETURN QUERY SELECT ccc.id, ccc.cliente_id, COALESCE(c.nome, c.nome_fantasia, 'Cliente sem nome') AS cliente_nome, gr.nome AS cliente_grupo_rede, ccc.vendedor_uuid, ccc.data, ccc.valor, ccc.titulo, ccc.descricao_longa, INITCAP(ccc.tipo_compromisso) AS tipo_compromisso, ccc.categoria_id, cat.nome AS categoria_nome, COALESCE(ccc.arquivos_anexos, ARRAY[]::TEXT[]) AS arquivos_anexos, COALESCE(SUM(pac.valor_pago), 0) AS valor_pago, ccc.valor - COALESCE(SUM(pac.valor_pago), 0) AS valor_pendente, CASE WHEN COALESCE(SUM(pac.valor_pago), 0) = 0 THEN 'Pendente' WHEN COALESCE(SUM(pac.valor_pago), 0) >= ccc.valor THEN 'Pago Integralmente' ELSE 'Pago Parcialmente' END AS status, ccc.created_at FROM public.conta_corrente_cliente ccc INNER JOIN public.cliente c ON c.cliente_id = ccc.cliente_id LEFT JOIN public.grupos_redes gr ON gr.id = c.grupo_id LEFT JOIN public.categorias_conta_corrente cat ON cat.id = ccc.categoria_id AND cat.deleted_at IS NULL LEFT JOIN public.pagamento_acordo_cliente pac ON pac.conta_corrente_id = ccc.id WHERE ccc.id = p_id GROUP BY ccc.id, ccc.cliente_id, ccc.categoria_id, cat.nome, c.nome, c.nome_fantasia, gr.nome, ccc.vendedor_uuid, ccc.data, ccc.valor, ccc.titulo, ccc.descricao_longa, ccc.tipo_compromisso, ccc.arquivos_anexos, ccc.created_at; EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error in update_conta_corrente_v2: %', SQLERRM; RAISE; END; $function$
;

-- ---- update_dados_vendedor_v2 ----
CREATE OR REPLACE FUNCTION public.update_dados_vendedor_v2(p_user_id uuid, p_nome text DEFAULT NULL::text, p_iniciais text DEFAULT NULL::text, p_cpf text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_telefone text DEFAULT NULL::text, p_data_admissao date DEFAULT NULL::date, p_status text DEFAULT NULL::text, p_cnpj text DEFAULT NULL::text, p_razao_social text DEFAULT NULL::text, p_nome_fantasia text DEFAULT NULL::text, p_inscricao_estadual text DEFAULT NULL::text, p_cep text DEFAULT NULL::text, p_logradouro text DEFAULT NULL::text, p_numero text DEFAULT NULL::text, p_complemento text DEFAULT NULL::text, p_bairro text DEFAULT NULL::text, p_cidade text DEFAULT NULL::text, p_estado text DEFAULT NULL::text, p_observacoes_internas text DEFAULT NULL::text, p_dados_bancarios jsonb DEFAULT NULL::jsonb, p_contatos_adicionais jsonb DEFAULT NULL::jsonb, p_updated_by uuid DEFAULT NULL::uuid)
 RETURNS TABLE(user_id uuid, nome text, iniciais text, cpf_cnpj text, email text, telefone text, data_admissao date, status text, cnpj text, razao_social text, nome_fantasia text, inscricao_estadual text, cep text, logradouro text, numero text, complemento text, bairro text, cidade text, estado text, observacoes_internas text, dados_bancarios jsonb, contatos_adicionais jsonb, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$                                                                 
  DECLARE
    v_exists BOOLEAN;                                                           
    v_current_user_tipo TEXT;
  BEGIN                                                                         
    IF p_user_id IS NULL THEN
      RAISE EXCEPTION 'user_id é obrigatório';                                  
    END IF;                                                                     
  
    IF p_status IS NOT NULL AND p_status NOT IN ('ativo', 'inativo', 'excluido')
   THEN           
      RAISE EXCEPTION 'Status deve ser "ativo", "inativo" ou "excluido"';       
    END IF;                                                                     
  
    IF p_updated_by IS NOT NULL THEN                                            
      SELECT u.tipo INTO v_current_user_tipo
      FROM public.user u                                                        
      WHERE u.user_id = p_updated_by
        AND u.ativo = TRUE                                                      
        AND u.deleted_at IS NULL;
                                                                                
      IF v_current_user_tipo IS NULL THEN
        RAISE EXCEPTION 'Usuário não autorizado';                               
      END IF;     
                                                                                
      IF v_current_user_tipo = 'vendedor' AND p_updated_by <> p_user_id THEN    
        RAISE EXCEPTION 'Vendedores só podem atualizar seu próprio perfil';     
      END IF;                                                                   
    END IF;       
                                                                                
    SELECT EXISTS(
      SELECT 1 FROM public.dados_vendedor dv
      WHERE dv.user_id = p_user_id                                              
        AND dv.deleted_at IS NULL
    ) INTO v_exists;                                                            
                  
    IF v_exists THEN                                                            
      UPDATE public.dados_vendedor AS dv
      SET                                                                       
        nome                 = COALESCE(NULLIF(TRIM(p_nome), ''),
    dv.nome),                                                                   
        iniciais             = COALESCE(NULLIF(TRIM(p_iniciais), ''),
    dv.iniciais),                                                               
        cpf_cnpj             = COALESCE(NULLIF(TRIM(p_cpf), ''),
    dv.cpf_cnpj),                                                               
        email                = COALESCE(NULLIF(LOWER(TRIM(p_email)), ''),
    dv.email),                                                                  
        telefone             = COALESCE(NULLIF(TRIM(p_telefone), ''),
    dv.telefone),                                                               
        data_admissao        = COALESCE(p_data_admissao,
    dv.data_admissao),                                                          
        status               = COALESCE(p_status,
    dv.status),                                                                 
        cnpj                 = COALESCE(NULLIF(TRIM(p_cnpj), ''),
    dv.cnpj),                                                                   
        razao_social         = COALESCE(NULLIF(TRIM(p_razao_social), ''),
    dv.razao_social),                                                           
        nome_fantasia        = COALESCE(NULLIF(TRIM(p_nome_fantasia), ''),
    dv.nome_fantasia),                                                          
        inscricao_estadual   = COALESCE(NULLIF(TRIM(p_inscricao_estadual), ''),
    dv.inscricao_estadual),                                                     
        cep                  = COALESCE(NULLIF(TRIM(p_cep), ''),
    dv.cep),                                                                    
        logradouro           = COALESCE(NULLIF(TRIM(p_logradouro), ''),
    dv.logradouro),                                                             
        numero               = COALESCE(NULLIF(TRIM(p_numero), ''),
    dv.numero),                                                                 
        complemento          = COALESCE(NULLIF(TRIM(p_complemento), ''),
    dv.complemento),                                                            
        bairro               = COALESCE(NULLIF(TRIM(p_bairro), ''),
    dv.bairro),                                                                 
        cidade               = COALESCE(NULLIF(TRIM(p_cidade), ''),
    dv.cidade),                                                                 
        estado               = COALESCE(NULLIF(TRIM(p_estado), ''),
    dv.estado),                                                                 
        observacoes_internas = COALESCE(NULLIF(TRIM(p_observacoes_internas),
  ''), dv.observacoes_internas),                                                
        dados_bancarios      = COALESCE(p_dados_bancarios,
  dv.dados_bancarios,     '{}'::JSONB),                                         
        contatos_adicionais  = COALESCE(p_contatos_adicionais,
  dv.contatos_adicionais, '[]'::JSONB),                                         
        updated_at           = NOW()
      WHERE dv.user_id = p_user_id                                              
        AND dv.deleted_at IS NULL;                                              
    ELSE
      INSERT INTO public.dados_vendedor (                                       
        user_id, nome, iniciais, cpf_cnpj, email, telefone, data_admissao,
  status,                                                                       
        cnpj, razao_social, nome_fantasia, inscricao_estadual,
        cep, logradouro, numero, complemento, bairro, cidade, estado,           
        observacoes_internas, dados_bancarios, contatos_adicionais,
        created_at, updated_at                                                  
      ) VALUES (  
        p_user_id,                                                              
        NULLIF(TRIM(p_nome), ''),
        NULLIF(TRIM(p_iniciais), ''),
        NULLIF(TRIM(p_cpf), ''),                                                
        NULLIF(LOWER(TRIM(p_email)), ''),
        NULLIF(TRIM(p_telefone), ''),                                           
        p_data_admissao,
        COALESCE(p_status, 'ativo'),                                            
        NULLIF(TRIM(p_cnpj), ''),
        NULLIF(TRIM(p_razao_social), ''),                                       
        NULLIF(TRIM(p_nome_fantasia), ''),
        NULLIF(TRIM(p_inscricao_estadual), ''),                                 
        NULLIF(TRIM(p_cep), ''),
        NULLIF(TRIM(p_logradouro), ''),                                         
        NULLIF(TRIM(p_numero), ''),                                             
        NULLIF(TRIM(p_complemento), ''),
        NULLIF(TRIM(p_bairro), ''),                                             
        NULLIF(TRIM(p_cidade), ''),                                             
        NULLIF(TRIM(p_estado), ''),
        NULLIF(TRIM(p_observacoes_internas), ''),                               
        COALESCE(p_dados_bancarios, '{}'::JSONB),                               
        COALESCE(p_contatos_adicionais, '[]'::JSONB),
        NOW(),                                                                  
        NOW()     
      );                                                                        
    END IF;       

    RETURN QUERY
    SELECT
      dv.user_id, dv.nome, dv.iniciais, dv.cpf_cnpj, dv.email, dv.telefone,
      dv.data_admissao, dv.status, dv.cnpj, dv.razao_social, dv.nome_fantasia,  
      dv.inscricao_estadual, dv.cep, dv.logradouro, dv.numero, dv.complemento,  
      dv.bairro, dv.cidade, dv.estado, dv.observacoes_internas,                 
      dv.dados_bancarios, dv.contatos_adicionais, dv.updated_at                 
    FROM public.dados_vendedor dv                                               
    WHERE dv.user_id = p_user_id
      AND dv.deleted_at IS NULL;                                                
                  
  EXCEPTION                                                                     
    WHEN OTHERS THEN
      RAISE LOG 'Error in update_dados_vendedor_v2 for user %: %', p_user_id,   
  SQLERRM;                                                                      
      RAISE;
  END;                                                                          
  $function$
;

-- ---- update_empresas_v2 ----
CREATE OR REPLACE FUNCTION public.update_empresas_v2(p_id bigint, p_cnpj text DEFAULT NULL::text, p_razao_social text DEFAULT NULL::text, p_nome_fantasia text DEFAULT NULL::text, p_inscricao_estadual text DEFAULT NULL::text, p_endereco jsonb DEFAULT NULL::jsonb, p_contas_bancarias jsonb DEFAULT NULL::jsonb, p_integracoes_erp jsonb DEFAULT NULL::jsonb, p_ativo boolean DEFAULT NULL::boolean, p_updated_by uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id bigint, cnpj text, razao_social text, nome_fantasia text, inscricao_estadual text, endereco jsonb, contas_bancarias jsonb, integracoes_erp jsonb, ativo boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_cnpj_norm TEXT; v_user_tipo TEXT;
BEGIN
  IF p_id IS NULL THEN RAISE EXCEPTION 'ID é obrigatório'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ref_empresas_subsidiarias e WHERE e.id = p_id AND e.deleted_at IS NULL) THEN RAISE EXCEPTION 'Empresa não encontrada'; END IF;
  IF p_cnpj IS NOT NULL AND TRIM(p_cnpj) <> '' THEN v_cnpj_norm := REGEXP_REPLACE(TRIM(p_cnpj), '\D', '', 'g'); IF EXISTS (SELECT 1 FROM public.ref_empresas_subsidiarias e WHERE REGEXP_REPLACE(TRIM(COALESCE(e.cnpj, '')), '\D', '', 'g') = v_cnpj_norm AND e.id <> p_id AND e.deleted_at IS NULL) THEN RAISE EXCEPTION 'Já existe uma empresa cadastrada com este CNPJ'; END IF; END IF;
  IF p_razao_social IS NOT NULL AND LENGTH(TRIM(p_razao_social)) < 2 THEN RAISE EXCEPTION 'Razão social deve ter pelo menos 2 caracteres'; END IF;
  IF p_updated_by IS NOT NULL THEN SELECT u.tipo INTO v_user_tipo FROM public.user u WHERE u.user_id = p_updated_by AND u.ativo = TRUE AND u.deleted_at IS NULL; IF NOT FOUND THEN RAISE EXCEPTION 'Usuário não encontrado ou inativo'; END IF; IF v_user_tipo != 'backoffice' THEN RAISE EXCEPTION 'Apenas usuários backoffice podem atualizar empresas'; END IF; END IF;
  UPDATE public.ref_empresas_subsidiarias e SET nome = COALESCE(NULLIF(TRIM(p_nome_fantasia), ''), e.nome), cnpj = COALESCE(NULLIF(TRIM(p_cnpj), ''), e.cnpj), razao_social = COALESCE(NULLIF(TRIM(p_razao_social), ''), e.razao_social), nome_fantasia = CASE WHEN p_nome_fantasia IS NULL THEN e.nome_fantasia WHEN TRIM(p_nome_fantasia) = '' THEN NULL ELSE TRIM(p_nome_fantasia) END, inscricao_estadual = CASE WHEN p_inscricao_estadual IS NULL THEN e.inscricao_estadual WHEN TRIM(p_inscricao_estadual) = '' THEN NULL ELSE TRIM(p_inscricao_estadual) END, endereco = COALESCE(p_endereco, e.endereco), contas_bancarias = COALESCE(p_contas_bancarias, e.contas_bancarias), integracoes_erp = COALESCE(p_integracoes_erp, e.integracoes_erp), ativo = COALESCE(p_ativo, e.ativo), updated_at = NOW() WHERE e.id = p_id;
  RETURN QUERY SELECT e.id, e.cnpj, e.razao_social, e.nome_fantasia, e.inscricao_estadual, e.endereco, e.contas_bancarias, e.integracoes_erp, e.ativo, e.created_at, e.updated_at FROM public.ref_empresas_subsidiarias e WHERE e.id = p_id;
EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error in update_empresas_v2: %', SQLERRM; RAISE;
END;
$function$
;

-- ---- update_grupos_redes_v2 ----
CREATE OR REPLACE FUNCTION public.update_grupos_redes_v2(p_id uuid, p_nome text DEFAULT NULL::text, p_descricao text DEFAULT NULL::text, p_ativo boolean DEFAULT NULL::boolean, p_updated_by uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, nome text, descricao text, ativo boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ DECLARE v_user_tipo TEXT; BEGIN IF p_id IS NULL THEN RAISE EXCEPTION 'ID é obrigatório'; END IF; IF NOT EXISTS ( SELECT 1 FROM public.grupos_redes gr WHERE gr.id = p_id AND gr.deleted_at IS NULL ) THEN RAISE EXCEPTION 'Grupo/rede não encontrado'; END IF; IF p_nome IS NOT NULL THEN IF LENGTH(TRIM(p_nome)) < 2 THEN RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres'; END IF; IF EXISTS ( SELECT 1 FROM public.grupos_redes gr WHERE LOWER(TRIM(gr.nome)) = LOWER(TRIM(p_nome)) AND gr.id != p_id AND gr.deleted_at IS NULL ) THEN RAISE EXCEPTION 'Grupo/rede com este nome já existe'; END IF; END IF; IF p_updated_by IS NOT NULL THEN SELECT u.tipo INTO v_user_tipo FROM public.user u WHERE u.user_id = p_updated_by AND u.ativo = TRUE AND u.deleted_at IS NULL; IF NOT FOUND THEN RAISE EXCEPTION 'Usuário não encontrado ou inativo'; END IF; IF v_user_tipo != 'backoffice' THEN RAISE EXCEPTION 'Apenas usuários backoffice podem atualizar grupos/redes'; END IF; END IF; UPDATE public.grupos_redes SET nome = COALESCE(NULLIF(TRIM(p_nome), ''), grupos_redes.nome), descricao = CASE WHEN p_descricao IS NULL THEN grupos_redes.descricao WHEN TRIM(p_descricao) = '' THEN NULL ELSE TRIM(p_descricao) END, ativo = COALESCE(p_ativo, grupos_redes.ativo), updated_at = NOW() WHERE grupos_redes.id = p_id; RETURN QUERY SELECT g.id, g.nome, g.descricao, g.ativo, g.created_at, g.updated_at FROM public.grupos_redes g WHERE g.id = p_id; EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error in update_grupos_redes_v2: %', SQLERRM; RAISE; END; $function$
;

-- ---- update_lista_preco_v2 ----
CREATE OR REPLACE FUNCTION public.update_lista_preco_v2(p_lista_preco_id bigint, p_nome text DEFAULT NULL::text, p_desconto numeric DEFAULT NULL::numeric, p_ativo boolean DEFAULT NULL::boolean, p_codigo_sequencial text DEFAULT NULL::text, p_produtos jsonb DEFAULT NULL::jsonb, p_tipo_comissao text DEFAULT NULL::text, p_percentual_fixo numeric DEFAULT NULL::numeric, p_faixas_comissao jsonb DEFAULT NULL::jsonb)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
  v_produto_item JSONB;
  v_faixa_item JSONB;
BEGIN
  -- Verificar se lista existe
  IF NOT EXISTS (SELECT 1 FROM listas_preco WHERE id = p_lista_preco_id) THEN
    RAISE EXCEPTION 'Lista de preço não encontrada';
  END IF;

  -- Validações
  IF p_nome IS NOT NULL AND LENGTH(TRIM(p_nome)) < 3 THEN
    RAISE EXCEPTION 'Nome da lista de preço deve ter pelo menos 3 caracteres';
  END IF;

  -- Verificar duplicidade de nome (se estiver alterando)
  IF p_nome IS NOT NULL AND EXISTS (
    SELECT 1 FROM listas_preco 
    WHERE LOWER(TRIM(nome)) = LOWER(TRIM(p_nome))
    AND id != p_lista_preco_id
  ) THEN
    RAISE EXCEPTION 'Já existe outra lista de preço com este nome';
  END IF;

  -- Atualizar dados da lista
  UPDATE listas_preco
  SET
    nome = COALESCE(TRIM(p_nome), nome),
    desconto = COALESCE(p_desconto, desconto),
    ativo = COALESCE(p_ativo, ativo),
    codigo_sequencial = COALESCE(p_codigo_sequencial, codigo_sequencial)
  WHERE id = p_lista_preco_id;

  -- Atualizar produtos (se fornecido)
  IF p_produtos IS NOT NULL THEN
    -- Remover produtos antigos
    DELETE FROM produtos_listas_precos WHERE lista_preco_id = p_lista_preco_id;
    
    -- Inserir novos produtos
    IF jsonb_array_length(p_produtos) > 0 THEN
      FOR v_produto_item IN SELECT * FROM jsonb_array_elements(p_produtos)
      LOOP
        INSERT INTO produtos_listas_precos (
          lista_preco_id,
          produto_id,
          preco
        ) VALUES (
          p_lista_preco_id,
          (v_produto_item->>'produtoId')::BIGINT,
          (v_produto_item->>'preco')::NUMERIC
        )
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  END IF;

  -- Atualizar faixas de comissão (se fornecido)
  IF p_faixas_comissao IS NOT NULL OR p_tipo_comissao IS NOT NULL THEN
    -- Remover faixas antigas
    DELETE FROM listas_preco_comissionamento WHERE lista_preco_id = p_lista_preco_id;
    
    -- Determinar tipo de comissão e inserir novas faixas
    IF p_tipo_comissao = 'conforme_desconto' AND p_faixas_comissao IS NOT NULL AND jsonb_array_length(p_faixas_comissao) > 0 THEN
      FOR v_faixa_item IN SELECT * FROM jsonb_array_elements(p_faixas_comissao)
      LOOP
        INSERT INTO listas_preco_comissionamento (
          lista_preco_id,
          desconto_minimo,
          desconto_maximo,
          comissao
        ) VALUES (
          p_lista_preco_id,
          (v_faixa_item->>'descontoMin')::NUMERIC,
          COALESCE((v_faixa_item->>'descontoMax')::NUMERIC, 999.99),
          (v_faixa_item->>'percentualComissao')::NUMERIC
        );
      END LOOP;
    ELSIF (p_tipo_comissao = 'fixa' OR (p_tipo_comissao IS NULL AND (p_faixas_comissao IS NULL OR jsonb_array_length(p_faixas_comissao) = 0))) AND p_percentual_fixo IS NOT NULL THEN
      INSERT INTO listas_preco_comissionamento (
        lista_preco_id,
        desconto_minimo,
        desconto_maximo,
        comissao
      ) VALUES (
        p_lista_preco_id,
        0,
        100,
        p_percentual_fixo
      );
    END IF;
  END IF;

  -- Retornar lista atualizada
  SELECT get_lista_preco_v2(p_lista_preco_id) INTO v_result;

  RETURN v_result;
END;
$function$
;

-- ---- update_meta_vendedor_v2 ----
CREATE OR REPLACE FUNCTION public.update_meta_vendedor_v2(p_id integer, p_vendedor_id uuid DEFAULT NULL::uuid, p_ano integer DEFAULT NULL::integer, p_mes integer DEFAULT NULL::integer, p_meta_valor numeric DEFAULT NULL::numeric, p_meta_percentual_crescimento numeric DEFAULT NULL::numeric, p_periodo_referencia text DEFAULT NULL::text, p_updated_by uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id integer, vendedor_id uuid, vendedor_nome text, ano integer, mes integer, meta_valor numeric, meta_percentual_crescimento numeric, periodo_referencia text, data_criacao timestamp with time zone, data_atualizacao timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_tipo TEXT;
  v_current_vendedor_id UUID;
  v_current_ano INTEGER;
  v_current_mes INTEGER;
BEGIN
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'ID é obrigatório';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.metas_vendedor m
    WHERE m.id = p_id
  ) THEN
    RAISE EXCEPTION 'Meta não encontrada';
  END IF;

  IF p_updated_by IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_updated_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem atualizar metas';
    END IF;
  END IF;

  IF p_ano IS NOT NULL AND (p_ano < 2000 OR p_ano > 2100) THEN
    RAISE EXCEPTION 'Ano inválido (deve ser entre 2000 e 2100)';
  END IF;

  IF p_mes IS NOT NULL AND (p_mes < 1 OR p_mes > 12) THEN
    RAISE EXCEPTION 'Mês inválido (deve ser entre 1 e 12)';
  END IF;

  IF p_meta_valor IS NOT NULL AND p_meta_valor < 0 THEN
    RAISE EXCEPTION 'meta_valor deve ser um número maior ou igual a 0';
  END IF;

  IF (p_vendedor_id IS NOT NULL OR p_ano IS NOT NULL OR p_mes IS NOT NULL) THEN
    SELECT m.vendedor_id, m.ano, m.mes
    INTO v_current_vendedor_id, v_current_ano, v_current_mes
    FROM public.metas_vendedor m
    WHERE m.id = p_id;

    IF EXISTS (
      SELECT 1 FROM public.metas_vendedor m
      WHERE m.id != p_id
      AND m.vendedor_id = COALESCE(p_vendedor_id, v_current_vendedor_id)
      AND m.ano = COALESCE(p_ano, v_current_ano)
      AND m.mes = COALESCE(p_mes, v_current_mes)
    ) THEN
      RAISE EXCEPTION 'Já existe outra meta para este vendedor no período especificado';
    END IF;
  END IF;

  UPDATE public.metas_vendedor m
  SET
    vendedor_id = COALESCE(p_vendedor_id, m.vendedor_id),
    ano = COALESCE(p_ano, m.ano),
    mes = COALESCE(p_mes, m.mes),
    meta_valor = COALESCE(p_meta_valor, m.meta_valor),
    meta_percentual_crescimento = CASE 
      WHEN p_meta_percentual_crescimento IS NOT NULL THEN p_meta_percentual_crescimento
      ELSE m.meta_percentual_crescimento
    END,
    periodo_referencia = CASE 
      WHEN p_periodo_referencia IS NOT NULL THEN NULLIF(TRIM(p_periodo_referencia), '')
      ELSE m.periodo_referencia
    END,
    data_atualizacao = NOW()
  WHERE m.id = p_id;

  RETURN QUERY
  SELECT 
    m.id,
    m.vendedor_id,
    COALESCE(dv.nome, u.nome, '') AS vendedor_nome,
    m.ano,
    m.mes,
    m.meta_valor,
    m.meta_percentual_crescimento,
    m.periodo_referencia,
    m.data_criacao,
    m.data_atualizacao
  FROM public.metas_vendedor m
  LEFT JOIN public.dados_vendedor dv ON dv.user_id = m.vendedor_id
  LEFT JOIN public.user u ON u.user_id = m.vendedor_id
  WHERE m.id = p_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_meta_vendedor_v2: %', SQLERRM;
    RAISE;
END;
$function$
;

-- ---- update_natureza_operacao_v2 ----
CREATE OR REPLACE FUNCTION public.update_natureza_operacao_v2(p_id bigint, p_nome text DEFAULT NULL::text, p_codigo text DEFAULT NULL::text, p_descricao text DEFAULT NULL::text, p_gera_comissao boolean DEFAULT NULL::boolean, p_gera_receita boolean DEFAULT NULL::boolean, p_ativo boolean DEFAULT NULL::boolean, p_tiny_id text DEFAULT NULL::text, p_updated_by uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id bigint, nome text, codigo text, descricao text, gera_comissao boolean, gera_receita boolean, ativo boolean, tiny_id text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_tipo TEXT;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'ID é obrigatório';
  END IF;

  -- Verificar se natureza existe
  IF NOT EXISTS (
    SELECT 1 FROM public.natureza_operacao n
    WHERE n.id = p_id AND n.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Natureza de operação não encontrada';
  END IF;

  -- Validar nome se fornecido
  IF p_nome IS NOT NULL THEN
    IF LENGTH(TRIM(p_nome)) < 2 THEN
      RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
    END IF;

    -- Verificar se nome já existe em outro registro
    IF EXISTS (
      SELECT 1 FROM public.natureza_operacao n
      WHERE LOWER(TRIM(n.nome)) = LOWER(TRIM(p_nome))
      AND n.id != p_id
      AND n.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Natureza de operação com este nome já existe';
    END IF;
  END IF;

  -- Verificar código se fornecido
  IF p_codigo IS NOT NULL AND TRIM(p_codigo) != '' THEN
    IF EXISTS (
      SELECT 1 FROM public.natureza_operacao n
      WHERE n.codigo = TRIM(p_codigo)
      AND n.id != p_id
      AND n.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Natureza de operação com este código já existe';
    END IF;
  END IF;

  -- 2. VERIFICAR PERMISSÕES (se updated_by fornecido)
  IF p_updated_by IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_updated_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem atualizar naturezas de operação';
    END IF;
  END IF;

  -- 3. ATUALIZAR NATUREZA
  UPDATE public.natureza_operacao n
  SET
    nome = COALESCE(NULLIF(TRIM(p_nome), ''), n.nome),
    codigo = CASE 
      WHEN p_codigo IS NULL THEN n.codigo
      WHEN TRIM(p_codigo) = '' THEN NULL
      ELSE TRIM(p_codigo)
    END,
    descricao = CASE 
      WHEN p_descricao IS NULL THEN n.descricao
      WHEN TRIM(p_descricao) = '' THEN NULL
      ELSE TRIM(p_descricao)
    END,
    tem_comissao = COALESCE(p_gera_comissao, n.tem_comissao),
    gera_receita = COALESCE(p_gera_receita, n.gera_receita),
    ativo = COALESCE(p_ativo, n.ativo),
    tiny_id = CASE 
      WHEN p_tiny_id IS NULL THEN n.tiny_id
      WHEN TRIM(p_tiny_id) = '' THEN NULL
      ELSE TRIM(p_tiny_id)
    END,
    updated_at = NOW()
  WHERE n.id = p_id;

  -- 4. RETORNAR DADOS ATUALIZADOS
  RETURN QUERY
  SELECT 
    n.id,
    n.nome,
    n.codigo,
    n.descricao,
    n.tem_comissao AS gera_comissao,
    n.gera_receita,
    n.ativo,
    n.tiny_id,
    n.created_at,
    n.updated_at
  FROM public.natureza_operacao n
  WHERE n.id = p_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_natureza_operacao_v2: %', SQLERRM;
    RAISE;
END;
$function$
;

-- ---- update_pagamento_conta_corrente_v2 ----
CREATE OR REPLACE FUNCTION public.update_pagamento_conta_corrente_v2(p_id bigint, p_data_pagamento date DEFAULT NULL::date, p_forma_pagamento text DEFAULT NULL::text, p_valor_pago numeric DEFAULT NULL::numeric, p_arquivo_comprovante text DEFAULT NULL::text, p_categoria_id uuid DEFAULT NULL::uuid, p_forma_pagamento_id bigint DEFAULT NULL::bigint, p_updated_by uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id bigint, conta_corrente_id bigint, data_pagamento date, forma_pagamento text, valor_pago numeric, categoria_id uuid, categoria_nome text, arquivo_comprovante text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ DECLARE v_user_tipo TEXT; v_conta_corrente_id BIGINT; v_cliente_id BIGINT; v_valor_compromisso NUMERIC; v_valor_total_pago NUMERIC; v_valor_pagamento_atual NUMERIC; v_forma_pagamento_nome TEXT; BEGIN IF p_id IS NULL THEN RAISE EXCEPTION 'ID é obrigatório'; END IF; SELECT pac.conta_corrente_id, pac.valor_pago INTO v_conta_corrente_id, v_valor_pagamento_atual FROM public.pagamento_acordo_cliente pac WHERE pac.id = p_id; IF NOT FOUND THEN RAISE EXCEPTION 'Pagamento não encontrado'; END IF; SELECT ccc.cliente_id, ccc.valor INTO v_cliente_id, v_valor_compromisso FROM public.conta_corrente_cliente ccc WHERE ccc.id = v_conta_corrente_id; IF NOT FOUND THEN RAISE EXCEPTION 'Compromisso não encontrado'; END IF; IF p_updated_by IS NOT NULL THEN SELECT u.tipo INTO v_user_tipo FROM public.user u WHERE u.user_id = p_updated_by AND u.ativo = TRUE AND u.deleted_at IS NULL; IF NOT FOUND THEN RAISE EXCEPTION 'Usuário não encontrado ou inativo'; END IF; IF v_user_tipo = 'vendedor' THEN IF NOT EXISTS (SELECT 1 FROM public.cliente_vendedores cv WHERE cv.cliente_id = v_cliente_id AND cv.vendedor_id = p_updated_by) THEN RAISE EXCEPTION 'Vendedor não tem permissão para atualizar este pagamento'; END IF; END IF; END IF; IF p_forma_pagamento_id IS NOT NULL THEN SELECT ref_fp.nome INTO v_forma_pagamento_nome FROM public.ref_forma_pagamento ref_fp WHERE ref_fp.id = p_forma_pagamento_id AND (ref_fp.ativo IS NULL OR ref_fp.ativo = TRUE); IF NOT FOUND THEN RAISE EXCEPTION 'Forma de pagamento não encontrada ou inativa'; END IF; ELSIF p_forma_pagamento IS NOT NULL THEN v_forma_pagamento_nome := TRIM(p_forma_pagamento); END IF; IF p_valor_pago IS NOT NULL AND p_valor_pago <= 0 THEN RAISE EXCEPTION 'valor_pago deve ser maior que zero'; END IF; IF v_forma_pagamento_nome IS NOT NULL AND LENGTH(v_forma_pagamento_nome) < 2 THEN RAISE EXCEPTION 'forma_pagamento deve ter pelo menos 2 caracteres'; END IF; IF p_valor_pago IS NOT NULL THEN SELECT COALESCE(SUM(pac2.valor_pago), 0) INTO v_valor_total_pago FROM public.pagamento_acordo_cliente pac2 WHERE pac2.conta_corrente_id = v_conta_corrente_id AND pac2.id != p_id; IF (v_valor_total_pago + p_valor_pago) > v_valor_compromisso THEN RAISE EXCEPTION 'Valor total pago não pode exceder o valor do compromisso'; END IF; END IF; UPDATE public.pagamento_acordo_cliente pac SET data_pagamento = COALESCE(p_data_pagamento, pac.data_pagamento), forma_pagamento = COALESCE(v_forma_pagamento_nome, pac.forma_pagamento), forma_pagamento_id = CASE WHEN p_forma_pagamento_id IS NULL THEN pac.forma_pagamento_id ELSE p_forma_pagamento_id END, valor_pago = COALESCE(p_valor_pago, pac.valor_pago), categoria_id = CASE WHEN p_categoria_id IS NULL THEN pac.categoria_id ELSE p_categoria_id END, arquivo_comprovante = CASE WHEN p_arquivo_comprovante IS NULL THEN pac.arquivo_comprovante ELSE p_arquivo_comprovante END WHERE pac.id = p_id; RETURN QUERY SELECT pac.id AS id, pac.conta_corrente_id AS conta_corrente_id, pac.data_pagamento AS data_pagamento, pac.forma_pagamento AS forma_pagamento, pac.valor_pago AS valor_pago, pac.categoria_id AS categoria_id, cat.nome AS categoria_nome, pac.arquivo_comprovante AS arquivo_comprovante, pac.created_at AS created_at FROM public.pagamento_acordo_cliente pac LEFT JOIN public.categorias_conta_corrente cat ON cat.id = pac.categoria_id AND cat.deleted_at IS NULL WHERE pac.id = p_id; EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error in update_pagamento_conta_corrente_v2: %', SQLERRM; RAISE; END; $function$
;

-- ---- update_pedido_venda_v2 ----
CREATE OR REPLACE FUNCTION public.update_pedido_venda_v2(p_pedido_id bigint, p_cliente_id bigint DEFAULT NULL::bigint, p_vendedor_uuid uuid DEFAULT NULL::uuid, p_numero_pedido text DEFAULT NULL::text, p_natureza_operacao text DEFAULT NULL::text, p_empresa_faturamento_id bigint DEFAULT NULL::bigint, p_lista_preco_id bigint DEFAULT NULL::bigint, p_percentual_desconto_padrao numeric DEFAULT NULL::numeric, p_id_condicao bigint DEFAULT NULL::bigint, p_ordem_cliente text DEFAULT NULL::text, p_observacao text DEFAULT NULL::text, p_observacao_interna text DEFAULT NULL::text, p_data_venda date DEFAULT NULL::date, p_status text DEFAULT NULL::text, p_valor_total numeric DEFAULT NULL::numeric, p_valor_total_produtos numeric DEFAULT NULL::numeric, p_percentual_desconto_extra numeric DEFAULT NULL::numeric, p_valor_desconto_extra numeric DEFAULT NULL::numeric, p_total_quantidades numeric DEFAULT NULL::numeric, p_total_itens integer DEFAULT NULL::integer, p_peso_bruto_total numeric DEFAULT NULL::numeric, p_peso_liquido_total numeric DEFAULT NULL::numeric, p_produtos jsonb DEFAULT NULL::jsonb, p_updated_by uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$                                                                                                                                                                                                     
  DECLARE                                                      
    v_user_tipo TEXT;
    v_is_backoffice BOOLEAN;                  
    v_pedido_owner UUID;                  
    v_cliente_nome TEXT;                      
    v_vendedor_nome TEXT;                                                                                                                                                                                   
    v_natureza_id BIGINT;
    v_empresa_nome TEXT;                                                                                                                                                                                    
    v_lista_preco_nome TEXT;                                   
    v_condicao_nome TEXT;                                                                                                                                                                                   
    v_produto JSONB;                                                                                                                                                                                        
  BEGIN
    IF p_pedido_id IS NULL THEN                                                                                                                                                                             
      RAISE EXCEPTION 'pedido_id é obrigatório';               
    END IF;                               

    SELECT pv.vendedor_uuid INTO v_pedido_owner                                                                                                                                                             
    FROM public.pedido_venda pv           
    WHERE pv."pedido_venda_ID" = p_pedido_id                                                                                                                                                                
    AND pv.deleted_at IS NULL;                                                                                                                                                                              
                                          
    IF NOT FOUND THEN                                                                                                                                                                                       
      RAISE EXCEPTION 'Pedido não encontrado';                                                                                                                                                              
    END IF;
                                                                                                                                                                                                            
    IF p_updated_by IS NOT NULL THEN                           
      SELECT u.tipo INTO v_user_tipo      
      FROM public."user" u
      WHERE u.user_id = p_updated_by                                                                                                                                                                        
      AND u.ativo = TRUE                      
      AND u.deleted_at IS NULL;                                                                                                                                                                             
                                                               
      IF NOT FOUND THEN                                                                                                                                                                                     
        RAISE EXCEPTION 'Usuário não encontrado ou inativo';
      END IF;                                                                                                                                                                                               
                                                               
      v_is_backoffice := (v_user_tipo = 'backoffice');
                                                                                                                                                                                                            
      IF NOT v_is_backoffice AND v_pedido_owner != p_updated_by THEN
        RAISE EXCEPTION 'Você não tem permissão para editar este pedido';                                                                                                                                   
      END IF;                                                  
                                                                                                                                                                                                            
      IF p_vendedor_uuid IS NOT NULL AND p_vendedor_uuid != v_pedido_owner THEN
        IF NOT v_is_backoffice THEN                                                                                                                                                                         
          RAISE EXCEPTION 'Vendedores não podem alterar o vendedor do pedido';
        END IF;                                                                                                                                                                                             
      END IF;                                                  
    ELSE                                                                                                                                                                                                    
      v_is_backoffice := FALSE;                                                                                                                                                                             
    END IF;
                                                                                                                                                                                                            
    IF p_cliente_id IS NOT NULL THEN                           
      SELECT c.nome INTO v_cliente_nome   
      FROM public.cliente c
      WHERE c.cliente_id = p_cliente_id                                                                                                                                                                     
      AND c.deleted_at IS NULL;
    END IF;                                                                                                                                                                                                 
                                                               
    IF p_vendedor_uuid IS NOT NULL THEN
      SELECT COALESCE(dv.nome, u.nome, u.email, 'Vendedor') INTO v_vendedor_nome                                                                                                                            
      FROM public."user" u                    
      LEFT JOIN public.dados_vendedor dv ON dv.user_id = u.user_id AND dv.deleted_at IS NULL                                                                                                                
      WHERE u.user_id = p_vendedor_uuid                        
      AND u.ativo = TRUE                                                                                                                                                                                    
      AND u.deleted_at IS NULL;               
    END IF;                                                                                                                                                                                                 
                                                               
    IF p_natureza_operacao IS NOT NULL THEN                                                                                                                                                                 
      SELECT no.id INTO v_natureza_id                          
      FROM public.natureza_operacao no                                                                                                                                                                      
      WHERE no.nome = p_natureza_operacao                      
      AND no.deleted_at IS NULL           
      LIMIT 1;
    END IF;                                                                                                                                                                                                 
   
    IF p_empresa_faturamento_id IS NOT NULL THEN                                                                                                                                                            
      SELECT e.razao_social INTO v_empresa_nome                
      FROM public.ref_empresas_subsidiarias e
      WHERE e.id = p_empresa_faturamento_id                                                                                                                                                                 
      AND e.deleted_at IS NULL;
    END IF;                                                                                                                                                                                                 
                                                               
    IF p_lista_preco_id IS NOT NULL THEN
      SELECT lp.nome INTO v_lista_preco_nome                                                                                                                                                                
      FROM public.listas_preco lp
      WHERE lp.id = p_lista_preco_id;                                                                                                                                                                       
    END IF;                                                    
                                          
    IF p_id_condicao IS NOT NULL THEN
      SELECT cp."Descrição" INTO v_condicao_nome                                                                                                                                                            
      FROM public."Condicao_De_Pagamento" cp
      WHERE cp."Condição_ID" = p_id_condicao;                                                                                                                                                               
    END IF;                                                    

    UPDATE public.pedido_venda pv                                                                                                                                                                           
    SET
      cliente_id = COALESCE(p_cliente_id, pv.cliente_id),                                                                                                                                                   
      vendedor_uuid = COALESCE(p_vendedor_uuid, pv.vendedor_uuid),
      numero_pedido = COALESCE(NULLIF(TRIM(p_numero_pedido), ''), pv.numero_pedido),
      natureza_operacao = COALESCE(NULLIF(TRIM(p_natureza_operacao), ''), pv.natureza_operacao),
      natureza_id = COALESCE(v_natureza_id, pv.natureza_id),                                                                                                                                                
      empresa_faturamento_id = COALESCE(p_empresa_faturamento_id, pv.empresa_faturamento_id),                                                                                                               
      nome_empresa_faturamento = COALESCE(v_empresa_nome, pv.nome_empresa_faturamento),                                                                                                                     
      lista_preco_id = COALESCE(p_lista_preco_id, pv.lista_preco_id),                                                                                                                                       
      nome_lista_preco = COALESCE(v_lista_preco_nome, pv.nome_lista_preco),                                                                                                                                 
      percentual_desconto_padrao = COALESCE(p_percentual_desconto_padrao, pv.percentual_desconto_padrao),
      id_condicao = COALESCE(p_id_condicao, pv.id_condicao),                                                                                                                                                
      nome_condicao_pagamento = COALESCE(v_condicao_nome, pv.nome_condicao_pagamento),                                                                                                                      
      ordem_cliente = COALESCE(NULLIF(TRIM(p_ordem_cliente), ''), pv.ordem_cliente),                                                                                                                        
      observacao = COALESCE(NULLIF(TRIM(p_observacao), ''), pv.observacao),                                                                                                                                 
      observacao_interna = COALESCE(NULLIF(TRIM(p_observacao_interna), ''), pv.observacao_interna),
      data_venda = COALESCE(p_data_venda, pv.data_venda),                                                                                                                                                   
      status = COALESCE(NULLIF(TRIM(p_status), ''), pv.status),
      valor_total = COALESCE(p_valor_total, pv.valor_total),                                                                                                                                                
      valor_total_produtos = COALESCE(p_valor_total_produtos, pv.valor_total_produtos),
      percentual_desconto_extra = COALESCE(p_percentual_desconto_extra, pv.percentual_desconto_extra),                                                                                                      
      valor_desconto_extra = COALESCE(p_valor_desconto_extra, pv.valor_desconto_extra),
      total_quantidades = COALESCE(p_total_quantidades, pv.total_quantidades),                                                                                                                              
      total_itens = COALESCE(p_total_itens, pv.total_itens),   
      peso_bruto_total = COALESCE(p_peso_bruto_total, pv.peso_bruto_total),                                                                                                                                 
      peso_liquido_total = COALESCE(p_peso_liquido_total, pv.peso_liquido_total),
      nome_cliente = COALESCE(v_cliente_nome, pv.nome_cliente),                                                                                                                                             
      nome_vendedor = COALESCE(v_vendedor_nome, pv.nome_vendedor),
      nome_natureza_operacao = COALESCE(NULLIF(TRIM(p_natureza_operacao), ''), pv.nome_natureza_operacao),                                                                                                  
      updated_at = NOW()                                       
    WHERE pv."pedido_venda_ID" = p_pedido_id;                                                                                                                                                               
                                                               
    IF p_produtos IS NOT NULL THEN                                                                                                                                                                          
      DELETE FROM public.pedido_venda_produtos pvp             
      WHERE pvp.pedido_venda_id = p_pedido_id;                                                                                                                                                              
                                                               
      IF jsonb_array_length(p_produtos) > 0 THEN                                                                                                                                                            
        FOR v_produto IN SELECT * FROM jsonb_array_elements(p_produtos)
        LOOP                                  
          INSERT INTO public.pedido_venda_produtos (                                                                                                                                                        
            pedido_venda_id, produto_id, numero, descricao, codigo_sku, codigo_ean,
            valor_tabela, percentual_desconto, valor_unitario, quantidade, subtotal,                                                                                                                        
            peso_bruto, peso_liquido, unidade                  
          ) VALUES (                                                                                                                                                                                        
            p_pedido_id,                                                                                                                                                                                    
            (v_produto->>'produtoId')::BIGINT,                                                                                                                                                              
            COALESCE((v_produto->>'numero')::INTEGER, 1),                                                                                                                                                   
            v_produto->>'descricaoProduto',                                                                                                                                                                 
            v_produto->>'codigoSku',                                                                                                                                                                        
            v_produto->>'codigoEan',                           
            COALESCE((v_produto->>'valorTabela')::NUMERIC, 0),                                                                                                                                              
            COALESCE((v_produto->>'percentualDesconto')::NUMERIC, 0),                                                                                                                                       
            COALESCE((v_produto->>'valorUnitario')::NUMERIC, 0),                                                                                                                                            
            COALESCE((v_produto->>'quantidade')::NUMERIC, 0),                                                                                                                                               
            COALESCE((v_produto->>'subtotal')::NUMERIC, 0),                                                                                                                                                 
            COALESCE((v_produto->>'pesoBruto')::NUMERIC, 0),
            COALESCE((v_produto->>'pesoLiquido')::NUMERIC, 0),                                                                                                                                              
            v_produto->>'unidade'                                                                                                                                                                           
          );                              
        END LOOP;                                                                                                                                                                                           
      END IF;                                                                                                                                                                                               
    END IF;
                                                                                                                                                                                                            
    RETURN get_pedido_venda_v2(p_pedido_id, p_updated_by);     
                                          
  EXCEPTION
    WHEN OTHERS THEN                                                                                                                                                                                        
      RAISE LOG 'Error in update_pedido_venda_v2 for pedido %: %', p_pedido_id, SQLERRM;
      RAISE;                                                                                                                                                                                                
  END;                                                         
  $function$
;

-- ---- update_segmento_cliente_v2 ----
CREATE OR REPLACE FUNCTION public.update_segmento_cliente_v2(p_id bigint, p_nome text DEFAULT NULL::text, p_descricao text DEFAULT NULL::text, p_ativo boolean DEFAULT NULL::boolean, p_updated_by uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id bigint, nome text, descricao text, ativo boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_tipo TEXT;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'ID é obrigatório';
  END IF;

  -- Verificar se segmento existe
  IF NOT EXISTS (
    SELECT 1 FROM public.segmento_cliente sc
    WHERE sc.id = p_id AND sc.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Segmento de cliente não encontrado';
  END IF;

  -- Validar nome se fornecido
  IF p_nome IS NOT NULL THEN
    IF LENGTH(TRIM(p_nome)) < 2 THEN
      RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
    END IF;

    -- Verificar se nome já existe em outro registro
    IF EXISTS (
      SELECT 1 FROM public.segmento_cliente sc
      WHERE LOWER(TRIM(sc.nome)) = LOWER(TRIM(p_nome))
      AND sc.id != p_id
      AND sc.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Segmento de cliente com este nome já existe';
    END IF;
  END IF;

  -- 2. VERIFICAR PERMISSÕES (se updated_by fornecido) - CORRIGIDO: qualificado com alias
  IF p_updated_by IS NOT NULL THEN
    SELECT tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_updated_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem atualizar segmentos de cliente';
    END IF;
  END IF;

  -- 3. ATUALIZAR SEGMENTO
  UPDATE public.segmento_cliente
  SET
    nome = COALESCE(NULLIF(TRIM(p_nome), ''), public.segmento_cliente.nome),
    descricao = CASE 
      WHEN p_descricao IS NULL THEN public.segmento_cliente.descricao
      WHEN TRIM(p_descricao) = '' THEN NULL
      ELSE TRIM(p_descricao)
    END,
    ativo = COALESCE(p_ativo, public.segmento_cliente.ativo),
    updated_at = NOW()
  WHERE public.segmento_cliente.id = p_id;

  -- 4. RETORNAR DADOS ATUALIZADOS
  RETURN QUERY
  SELECT 
    s.id,
    s.nome,
    s.descricao,
    s.ativo,
    s.created_at,
    s.updated_at
  FROM public.segmento_cliente s
  WHERE s.id = p_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_segmento_cliente_v2: %', SQLERRM;
    RAISE;
END;
$function$
;

-- ---- update_tipos_veiculo_v2 ----
CREATE OR REPLACE FUNCTION public.update_tipos_veiculo_v2(p_id uuid, p_nome text DEFAULT NULL::text, p_descricao text DEFAULT NULL::text, p_ativo boolean DEFAULT NULL::boolean, p_updated_by uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, nome text, descricao text, ativo boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE v_user_tipo TEXT; BEGIN IF p_id IS NULL THEN RAISE EXCEPTION 'ID é obrigatório'; END IF; IF NOT EXISTS ( SELECT 1 FROM public.tipos_veiculo tv WHERE tv.id = p_id AND tv.deleted_at IS NULL ) THEN RAISE EXCEPTION 'Tipo de veículo não encontrado'; END IF; IF p_nome IS NOT NULL THEN IF LENGTH(TRIM(p_nome)) < 2 THEN RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres'; END IF; IF EXISTS ( SELECT 1 FROM public.tipos_veiculo tv WHERE LOWER(TRIM(tv.nome)) = LOWER(TRIM(p_nome)) AND tv.id != p_id AND tv.deleted_at IS NULL ) THEN RAISE EXCEPTION 'Tipo de veículo com este nome já existe'; END IF; END IF; IF p_updated_by IS NOT NULL THEN SELECT u.tipo INTO v_user_tipo FROM public.user u WHERE u.user_id = p_updated_by AND u.ativo = TRUE AND u.deleted_at IS NULL; IF NOT FOUND THEN RAISE EXCEPTION 'Usuário não encontrado ou inativo'; END IF; IF v_user_tipo != 'backoffice' THEN RAISE EXCEPTION 'Apenas usuários backoffice podem atualizar tipos de veículo'; END IF; END IF; UPDATE public.tipos_veiculo SET nome = COALESCE(NULLIF(TRIM(p_nome), ''), tipos_veiculo.nome), descricao = CASE WHEN p_descricao IS NULL THEN tipos_veiculo.descricao WHEN TRIM(p_descricao) = '' THEN NULL ELSE TRIM(p_descricao) END, ativo = COALESCE(p_ativo, tipos_veiculo.ativo), updated_at = NOW() WHERE tipos_veiculo.id = p_id; RETURN QUERY SELECT t.id, t.nome, t.descricao, t.ativo, t.created_at, t.updated_at FROM public.tipos_veiculo t WHERE t.id = p_id; EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error in update_tipos_veiculo_v2: %', SQLERRM; RAISE; END; $function$
;

-- ---- update_updated_at_column ----
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

-- ---- update_user_v2 ----
CREATE OR REPLACE FUNCTION public.update_user_v2(p_user_id uuid, p_nome text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_tipo text DEFAULT NULL::text, p_ref_user_role_id bigint DEFAULT NULL::bigint, p_user_login text DEFAULT NULL::text, p_ativo boolean DEFAULT NULL::boolean, p_updated_by uuid DEFAULT NULL::uuid)
 RETURNS TABLE(user_id uuid, nome text, email text, tipo text, ativo boolean, data_cadastro timestamp with time zone, ultimo_acesso timestamp with time zone, ref_user_role_id bigint, user_login text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_user_tipo TEXT;
  v_is_own_profile BOOLEAN;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id é obrigatório';
  END IF;

  -- Verificar se usuário existe
  IF NOT EXISTS (
    SELECT 1 FROM public.user u
    WHERE u.user_id = p_user_id
    AND u.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  -- 2. VERIFICAR PERMISSÕES
  IF p_updated_by IS NOT NULL THEN
    -- Buscar tipo do usuário que está atualizando
    SELECT u.tipo INTO v_current_user_tipo
    FROM public.user u
    WHERE u.user_id = p_updated_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF v_current_user_tipo IS NULL THEN
      RAISE EXCEPTION 'Usuário não autorizado';
    END IF;

    -- Verificar se é o próprio perfil
    v_is_own_profile := (p_updated_by = p_user_id);

    -- Vendedor só pode atualizar próprio perfil (e não pode mudar tipo/ativo)
    IF v_current_user_tipo = 'vendedor' AND NOT v_is_own_profile THEN
      RAISE EXCEPTION 'Vendedores só podem atualizar seu próprio perfil';
    END IF;

    IF v_current_user_tipo = 'vendedor' AND (p_tipo IS NOT NULL OR p_ativo IS NOT NULL) THEN
      RAISE EXCEPTION 'Vendedores não podem alterar tipo ou status ativo';
    END IF;
  END IF;

  -- 3. VALIDAR EMAIL SE FORNECIDO
  IF p_email IS NOT NULL THEN
    IF TRIM(p_email) = '' THEN
      RAISE EXCEPTION 'Email não pode ser vazio';
    END IF;

    IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'Formato de email inválido';
    END IF;

    -- Verificar email único (exceto para o próprio usuário)
    IF EXISTS (
      SELECT 1 FROM public.user u
      WHERE LOWER(u.email) = LOWER(p_email)
      AND u.user_id != p_user_id
      AND u.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Email já cadastrado para outro usuário';
    END IF;
  END IF;

  -- 4. VALIDAR TIPO SE FORNECIDO
  IF p_tipo IS NOT NULL AND p_tipo NOT IN ('backoffice', 'vendedor') THEN
    RAISE EXCEPTION 'Tipo deve ser "backoffice" ou "vendedor"';
  END IF;

  -- 5. VALIDAR NOME SE FORNECIDO
  IF p_nome IS NOT NULL AND LENGTH(TRIM(p_nome)) < 2 THEN
    RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
  END IF;

  -- 6. ATUALIZAR USUÁRIO (qualificando todas as colunas da tabela)
  UPDATE public.user u
  SET
    nome = COALESCE(NULLIF(TRIM(p_nome), ''), u.nome),
    email = COALESCE(NULLIF(LOWER(TRIM(p_email)), ''), u.email),
    tipo = COALESCE(p_tipo, u.tipo),
    ref_user_role_id = COALESCE(p_ref_user_role_id, u.ref_user_role_id),
    user_login = COALESCE(NULLIF(TRIM(p_user_login), ''), u.user_login),
    ativo = COALESCE(p_ativo, u.ativo)
  WHERE u.user_id = p_user_id;

  -- 7. RETORNAR DADOS ATUALIZADOS
  RETURN QUERY
  SELECT 
    u.user_id,
    u.nome,
    u.email,
    u.tipo,
    u.ativo,
    u.data_cadastro,
    u.ultimo_acesso,
    u.ref_user_role_id,
    u.user_login
  FROM public.user u
  WHERE u.user_id = p_user_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_user_v2 for user %: %', p_user_id, SQLERRM;
    RAISE;
END;
$function$
;

-- ---- upsert_price_list ----
CREATE OR REPLACE FUNCTION public.upsert_price_list(p_user_id uuid, p_lista jsonb, p_itens jsonb, p_regras jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lista_id BIGINT;
  v_nome TEXT;
  v_codigo TEXT;
  v_desconto NUMERIC := 0;
  v_ativo BOOLEAN := TRUE;
  v_item JSONB;
  v_rule JSONB;
  v_produto_id BIGINT;
  v_preco NUMERIC;
  v_desconto_min NUMERIC;
  v_desconto_max NUMERIC;
  v_comissao NUMERIC;
  v_itens_count INTEGER := 0;
  v_regras_count INTEGER := 0;
  v_seen_products BIGINT[] := ARRAY[]::BIGINT[];
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public."user"
    WHERE user_id = p_user_id
      AND COALESCE(ref_user_role_id, 0) IN (1, 2)
  ) THEN
    RAISE EXCEPTION 'Usuário não possui permissão para gerenciar listas de preço';
  END IF;

  IF p_lista IS NULL OR jsonb_typeof(p_lista) <> 'object' THEN
    RAISE EXCEPTION 'Payload da lista é obrigatório';
  END IF;

  v_nome := trim(p_lista->>'nome');
  IF v_nome IS NULL OR v_nome = '' THEN
    RAISE EXCEPTION 'Nome da lista é obrigatório';
  END IF;

  v_codigo := NULLIF(trim(p_lista->>'codigo_sequencial'), '');
  IF COALESCE(p_lista->>'desconto', '') <> '' THEN
    v_desconto := (p_lista->>'desconto')::NUMERIC;
  END IF;
  IF COALESCE(p_lista->>'ativo', '') <> '' THEN
    v_ativo := (p_lista->>'ativo')::BOOLEAN;
  END IF;

  IF p_itens IS NULL OR jsonb_typeof(p_itens) <> 'array' THEN
    RAISE EXCEPTION 'Itens da lista são obrigatórios';
  END IF;

  IF COALESCE(p_lista->>'id', '') <> '' THEN
    v_lista_id := (p_lista->>'id')::BIGINT;

    UPDATE public.listas_preco
       SET nome = v_nome,
           desconto = v_desconto,
           ativo = v_ativo,
           codigo_sequencial = v_codigo
     WHERE id = v_lista_id
     RETURNING id INTO v_lista_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Lista de preço % não encontrada', p_lista->>'id';
    END IF;
  ELSE
    INSERT INTO public.listas_preco (nome, desconto, ativo, codigo_sequencial)
    VALUES (v_nome, v_desconto, v_ativo, v_codigo)
    RETURNING id INTO v_lista_id;
  END IF;

  DELETE FROM public.produtos_listas_precos
   WHERE lista_preco_id = v_lista_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    v_produto_id := NULLIF(v_item->>'produto_id', '')::BIGINT;
    v_preco := NULLIF(v_item->>'preco', '')::NUMERIC;

    IF v_produto_id IS NULL THEN
      RAISE EXCEPTION 'Produto inválido informado na lista';
    END IF;

    IF v_produto_id = ANY(v_seen_products) THEN
      RAISE EXCEPTION 'Produto % informado mais de uma vez', v_produto_id;
    END IF;
    v_seen_products := array_append(v_seen_products, v_produto_id);

    IF v_preco IS NULL OR v_preco <= 0 THEN
      RAISE EXCEPTION 'Preço inválido para o produto %', v_produto_id;
    END IF;

    INSERT INTO public.produtos_listas_precos (produto_id, lista_preco_id, preco)
    VALUES (v_produto_id, v_lista_id, v_preco);

    v_itens_count := v_itens_count + 1;
  END LOOP;

  IF v_itens_count = 0 THEN
    RAISE EXCEPTION 'Ao menos um item deve ser informado';
  END IF;

  DELETE FROM public.listas_preco_comissionamento
   WHERE lista_preco_id = v_lista_id;

  IF p_regras IS NOT NULL AND jsonb_typeof(p_regras) = 'array' THEN
    FOR v_rule IN SELECT * FROM jsonb_array_elements(p_regras)
    LOOP
      v_desconto_min := NULLIF(v_rule->>'desconto_minimo', '')::NUMERIC;
      v_desconto_max := NULLIF(v_rule->>'desconto_maximo', '')::NUMERIC;
      v_comissao := NULLIF(v_rule->>'comissao', '')::NUMERIC;

      IF v_desconto_min IS NULL AND v_desconto_max IS NULL AND v_comissao IS NULL THEN
        CONTINUE;
      END IF;

      IF v_desconto_min IS NULL OR v_desconto_max IS NULL OR v_comissao IS NULL THEN
        RAISE EXCEPTION 'Regra de comissionamento incompleta';
      END IF;

      IF v_desconto_min > v_desconto_max THEN
        RAISE EXCEPTION 'desconto_minimo não pode ser maior que desconto_maximo';
      END IF;

      IF EXISTS (
        SELECT 1
          FROM public.listas_preco_comissionamento lpc
         WHERE lpc.lista_preco_id = v_lista_id
           AND NOT (v_desconto_max < lpc.desconto_minimo OR v_desconto_min > lpc.desconto_maximo)
      ) THEN
        RAISE EXCEPTION 'Intervalo de desconto já utilizado em outra regra';
      END IF;

      INSERT INTO public.listas_preco_comissionamento (
        lista_preco_id,
        desconto_minimo,
        desconto_maximo,
        comissao
      ) VALUES (
        v_lista_id,
        v_desconto_min,
        v_desconto_max,
        v_comissao
      );

      v_regras_count := v_regras_count + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'lista_id', v_lista_id,
    'itens_count', v_itens_count,
    'regras_count', v_regras_count
  );
END;
$function$
;
