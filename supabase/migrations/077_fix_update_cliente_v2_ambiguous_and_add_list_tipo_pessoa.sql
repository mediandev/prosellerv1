-- ============================================================================
-- Migration 077: Corrigir ambiguidade em update_cliente_v2 e criar função para listar tipos de pessoa
-- ============================================================================
-- Descrição: 
-- 1. Corrige erro de ambiguidade na função update_cliente_v2
-- 2. Cria função RPC para listar tipos de pessoa
-- Data: 2026-02-04
-- ============================================================================

-- ============================================================================
-- 1. CORRIGIR FUNÇÃO update_cliente_v2 - Remover ambiguidade
-- ============================================================================

CREATE OR REPLACE FUNCTION update_cliente_v2(
  p_cliente_id BIGINT,
  p_nome TEXT DEFAULT NULL,
  p_nome_fantasia TEXT DEFAULT NULL,
  p_cpf_cnpj TEXT DEFAULT NULL,
  p_ref_tipo_pessoa_id_fk BIGINT DEFAULT NULL,
  p_inscricao_estadual TEXT DEFAULT NULL,
  p_codigo TEXT DEFAULT NULL,
  p_grupo_rede TEXT DEFAULT NULL,
  p_grupo_id UUID DEFAULT NULL,
  p_lista_de_preco BIGINT DEFAULT NULL,
  p_desconto_financeiro NUMERIC DEFAULT NULL,
  p_pedido_minimo NUMERIC DEFAULT NULL,
  p_vendedoresatribuidos UUID[] DEFAULT NULL,
  p_observacao_interna TEXT DEFAULT NULL,
  p_segmento_id BIGINT DEFAULT NULL,
  p_ref_situacao_id INTEGER DEFAULT NULL,
  p_telefone TEXT DEFAULT NULL,
  p_telefone_adicional TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_email_nf TEXT DEFAULT NULL,
  p_website TEXT DEFAULT NULL,
  p_observacao_contato TEXT DEFAULT NULL,
  p_cep TEXT DEFAULT NULL,
  p_rua TEXT DEFAULT NULL,
  p_numero TEXT DEFAULT NULL,
  p_complemento TEXT DEFAULT NULL,
  p_bairro TEXT DEFAULT NULL,
  p_cidade TEXT DEFAULT NULL,
  p_uf TEXT DEFAULT NULL,
  p_ref_tipo_endereco_id_fk BIGINT DEFAULT NULL,
  p_empresa_faturamento_id BIGINT DEFAULT NULL,
  p_condicoes_pagamento_ids BIGINT[] DEFAULT NULL,
  p_atualizado_por UUID DEFAULT NULL
)
RETURNS TABLE (cliente_id BIGINT, nome TEXT, nome_fantasia TEXT, cpf_cnpj TEXT, codigo TEXT, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY INVOKER VOLATILE SET search_path = public
AS $$
DECLARE 
  v_user_tipo TEXT; 
  v_cliente_owner UUID;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_id é obrigatório';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.cliente c
    WHERE c.cliente_id = p_cliente_id
    AND c.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Cliente não encontrado';
  END IF;

  -- 2. VERIFICAR PERMISSÕES
  IF p_atualizado_por IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_atualizado_por
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF v_user_tipo IS NULL THEN
      RAISE EXCEPTION 'Usuário não autorizado';
    END IF;

    IF v_user_tipo = 'vendedor' THEN
      SELECT c.criado_por INTO v_cliente_owner
      FROM public.cliente c
      WHERE c.cliente_id = p_cliente_id;

      IF v_cliente_owner != p_atualizado_por THEN
        RAISE EXCEPTION 'Vendedores só podem editar clientes que criaram';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM public.cliente c
        WHERE c.cliente_id = p_cliente_id
        AND c.status_aprovacao = 'aprovado'
      ) THEN
        RAISE EXCEPTION 'Vendedores só podem editar clientes aprovados';
      END IF;
    END IF;
  END IF;

  IF p_nome IS NOT NULL AND LENGTH(TRIM(p_nome)) < 2 THEN
    RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
  END IF;

  -- 3. VALIDAR ref_tipo_pessoa_id_fk SE FORNECIDO
  IF p_ref_tipo_pessoa_id_fk IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.ref_tipo_pessoa rtp
      WHERE rtp.ref_tipo_pessoa_id = p_ref_tipo_pessoa_id_fk
    ) THEN
      RAISE EXCEPTION 'Tipo de pessoa inválido';
    END IF;
  END IF;

  -- 4. ATUALIZAR CLIENTE
  UPDATE public.cliente SET
    nome = COALESCE(NULLIF(TRIM(p_nome), ''), nome),
    nome_fantasia = COALESCE(NULLIF(TRIM(p_nome_fantasia), ''), nome_fantasia),
    cpf_cnpj = COALESCE(NULLIF(REPLACE(REPLACE(REPLACE(p_cpf_cnpj, '.', ''), '/', ''), '-', ''), ''), cpf_cnpj),
    "ref_tipo_pessoa_id_FK" = CASE WHEN p_ref_tipo_pessoa_id_fk IS NOT NULL THEN p_ref_tipo_pessoa_id_fk ELSE "ref_tipo_pessoa_id_FK" END,
    inscricao_estadual = COALESCE(NULLIF(TRIM(p_inscricao_estadual), ''), inscricao_estadual),
    codigo = COALESCE(NULLIF(TRIM(p_codigo), ''), codigo),
    grupo_rede = COALESCE(NULLIF(TRIM(p_grupo_rede), ''), grupo_rede),
    grupo_id = CASE WHEN p_grupo_id IS NOT NULL THEN p_grupo_id ELSE grupo_id END,
    lista_de_preco = COALESCE(p_lista_de_preco, lista_de_preco),
    desconto_financeiro = COALESCE(p_desconto_financeiro, desconto_financeiro),
    pedido_minimo = COALESCE(p_pedido_minimo, pedido_minimo),
    vendedoresatribuidos = COALESCE(p_vendedoresatribuidos, vendedoresatribuidos),
    observacao_interna = COALESCE(NULLIF(TRIM(p_observacao_interna), ''), observacao_interna),
    segmento_id = CASE WHEN p_segmento_id IS NOT NULL THEN p_segmento_id ELSE segmento_id END,
    ref_situacao_id = CASE WHEN p_ref_situacao_id IS NOT NULL THEN p_ref_situacao_id ELSE ref_situacao_id END,
    empresaFaturamento = CASE WHEN p_empresa_faturamento_id IS NOT NULL THEN p_empresa_faturamento_id ELSE empresaFaturamento END,
    atualizado_por = p_atualizado_por,
    updated_at = NOW()
  WHERE cliente.cliente_id = p_cliente_id;

  -- 5. ATUALIZAR CONTATO SE FORNECIDO
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
      NULLIF(TRIM(p_telefone), ''),
      NULLIF(TRIM(p_telefone_adicional), ''),
      NULLIF(LOWER(TRIM(p_email)), ''),
      NULLIF(LOWER(TRIM(p_email_nf)), ''),
      NULLIF(TRIM(p_website), ''),
      NULLIF(TRIM(p_observacao_contato), '')
    )
    ON CONFLICT ON CONSTRAINT cliente_contato_pkey DO UPDATE SET
      telefone = COALESCE(NULLIF(TRIM(p_telefone), ''), EXCLUDED.telefone),
      telefone_adicional = COALESCE(NULLIF(TRIM(p_telefone_adicional), ''), EXCLUDED.telefone_adicional),
      email = COALESCE(NULLIF(LOWER(TRIM(p_email)), ''), EXCLUDED.email),
      email_nf = COALESCE(NULLIF(LOWER(TRIM(p_email_nf)), ''), EXCLUDED.email_nf),
      website = COALESCE(NULLIF(TRIM(p_website), ''), EXCLUDED.website),
      observacao = COALESCE(NULLIF(TRIM(p_observacao_contato), ''), EXCLUDED.observacao);
  END IF;

  -- 6. ATUALIZAR ENDEREÇO SE FORNECIDO
  IF p_cep IS NOT NULL OR p_rua IS NOT NULL OR p_numero IS NOT NULL OR p_complemento IS NOT NULL OR p_bairro IS NOT NULL OR p_cidade IS NOT NULL OR p_uf IS NOT NULL THEN
    INSERT INTO public.cliente_endereço (
      cliente_id,
      cep,
      rua,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      ref_tipo_endereco_id_FK
    )
    VALUES (
      p_cliente_id,
      NULLIF(REPLACE(TRIM(p_cep), '-', ''), ''),
      NULLIF(TRIM(p_rua), ''),
      NULLIF(TRIM(p_numero), ''),
      NULLIF(TRIM(p_complemento), ''),
      NULLIF(TRIM(p_bairro), ''),
      NULLIF(TRIM(p_cidade), ''),
      NULLIF(UPPER(TRIM(p_uf)), ''),
      p_ref_tipo_endereco_id_fk
    )
    ON CONFLICT ON CONSTRAINT cliente_endereço_pkey DO UPDATE SET
      cep = COALESCE(NULLIF(REPLACE(TRIM(p_cep), '-', ''), ''), EXCLUDED.cep),
      rua = COALESCE(NULLIF(TRIM(p_rua), ''), EXCLUDED.rua),
      numero = COALESCE(NULLIF(TRIM(p_numero), ''), EXCLUDED.numero),
      complemento = COALESCE(NULLIF(TRIM(p_complemento), ''), EXCLUDED.complemento),
      bairro = COALESCE(NULLIF(TRIM(p_bairro), ''), EXCLUDED.bairro),
      cidade = COALESCE(NULLIF(TRIM(p_cidade), ''), EXCLUDED.cidade),
      uf = COALESCE(NULLIF(UPPER(TRIM(p_uf)), ''), EXCLUDED.uf),
      ref_tipo_endereco_id_FK = COALESCE(p_ref_tipo_endereco_id_fk, EXCLUDED.ref_tipo_endereco_id_FK);
  END IF;

  -- 7. ATUALIZAR CONDIÇÕES DE PAGAMENTO SE FORNECIDO
  IF p_condicoes_pagamento_ids IS NOT NULL THEN
    -- Remover condições antigas
    DELETE FROM public.condições_cliente cc
    WHERE cc.ID_cliente = p_cliente_id;

    -- Inserir novas condições
    IF array_length(p_condicoes_pagamento_ids, 1) > 0 THEN
      INSERT INTO public.condições_cliente (ID_cliente, ID_condições)
      SELECT p_cliente_id, unnest(p_condicoes_pagamento_ids)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- 8. RETORNAR DADOS ATUALIZADOS
  RETURN QUERY
  SELECT 
    c.cliente_id, 
    c.nome, 
    c.nome_fantasia, 
    c.cpf_cnpj, 
    c.codigo, 
    c.updated_at
  FROM public.cliente c
  WHERE c.cliente_id = p_cliente_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_cliente_v2 for cliente %: %', p_cliente_id, SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION update_cliente_v2 IS 'Atualiza cliente com suporte para ref_tipo_pessoa_id_fk, grupo_id, segmento_id, ref_situacao_id, empresa_faturamento_id e condições de pagamento - Corrigido ambiguidade';

-- ============================================================================
-- 2. CRIAR FUNÇÃO RPC PARA LISTAR TIPOS DE PESSOA
-- ============================================================================

CREATE OR REPLACE FUNCTION list_ref_tipo_pessoa_v2()
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
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
$$;

COMMENT ON FUNCTION list_ref_tipo_pessoa_v2 IS 'Lista todos os tipos de pessoa disponíveis';

GRANT EXECUTE ON FUNCTION list_ref_tipo_pessoa_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION list_ref_tipo_pessoa_v2 TO anon;
