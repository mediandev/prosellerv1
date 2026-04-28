-- ============================================================================
-- Migration 111: Fix update_dados_vendedor_v2 — column reference "user_id" is ambiguous
-- ============================================================================
-- Bug: a função update_dados_vendedor_v2 (criada manualmente fora das migrations)
--      definia OUT params com `user_id`, `nome`, `cpf_cnpj`, etc. em RETURNS
--      TABLE. Como o UPDATE e o sub-SELECT EXISTS referenciavam `user_id` sem
--      qualificar, o Postgres ficava em ambiguidade entre a coluna da tabela
--      e o OUT param e levantava EXCEPTION. O edge function update-user-v2
--      capturava o erro e logava como warning, sem propagar — resultado: o
--      cadastro de vendedor parecia funcionar mas só o nome (gravado em
--      `public.user` por update_user_v2) sobrevivia. Todos os campos
--      adicionais (cpf, telefone, endereço, dados bancários, contatos, etc.)
--      eram silenciosamente perdidos.
--
-- Fix: alias `dv` no UPDATE e nos sub-SELECTs, com referências qualificadas.
--      Assinatura e RETURNS TABLE mantidos idênticos para não quebrar o
--      edge function que chama essa RPC.
--
-- Histórico: o fix já foi aplicado direto no banco via SQL Editor em
--            2026-04-27. Esta migration versiona a definição correta no repo.
-- Data: 2026-04-27
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_dados_vendedor_v2(
  p_user_id uuid,
  p_nome text DEFAULT NULL,
  p_iniciais text DEFAULT NULL,
  p_cpf text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_telefone text DEFAULT NULL,
  p_data_admissao date DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_cnpj text DEFAULT NULL,
  p_razao_social text DEFAULT NULL,
  p_nome_fantasia text DEFAULT NULL,
  p_inscricao_estadual text DEFAULT NULL,
  p_cep text DEFAULT NULL,
  p_logradouro text DEFAULT NULL,
  p_numero text DEFAULT NULL,
  p_complemento text DEFAULT NULL,
  p_bairro text DEFAULT NULL,
  p_cidade text DEFAULT NULL,
  p_estado text DEFAULT NULL,
  p_observacoes_internas text DEFAULT NULL,
  p_dados_bancarios jsonb DEFAULT NULL,
  p_contatos_adicionais jsonb DEFAULT NULL,
  p_updated_by uuid DEFAULT NULL
)
RETURNS TABLE(
  user_id uuid, nome text, iniciais text, cpf_cnpj text, email text,
  telefone text, data_admissao date, status text, cnpj text, razao_social text,
  nome_fantasia text, inscricao_estadual text, cep text, logradouro text,
  numero text, complemento text, bairro text, cidade text, estado text,
  observacoes_internas text, dados_bancarios jsonb, contatos_adicionais jsonb,
  updated_at timestamp with time zone
)
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

  IF p_status IS NOT NULL AND p_status NOT IN ('ativo', 'inativo', 'excluido') THEN
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
      nome                 = COALESCE(NULLIF(TRIM(p_nome), ''),                 dv.nome),
      iniciais             = COALESCE(NULLIF(TRIM(p_iniciais), ''),             dv.iniciais),
      cpf_cnpj             = COALESCE(NULLIF(TRIM(p_cpf), ''),                  dv.cpf_cnpj),
      email                = COALESCE(NULLIF(LOWER(TRIM(p_email)), ''),         dv.email),
      telefone             = COALESCE(NULLIF(TRIM(p_telefone), ''),             dv.telefone),
      data_admissao        = COALESCE(p_data_admissao,                          dv.data_admissao),
      status               = COALESCE(p_status,                                 dv.status),
      cnpj                 = COALESCE(NULLIF(TRIM(p_cnpj), ''),                 dv.cnpj),
      razao_social         = COALESCE(NULLIF(TRIM(p_razao_social), ''),         dv.razao_social),
      nome_fantasia        = COALESCE(NULLIF(TRIM(p_nome_fantasia), ''),        dv.nome_fantasia),
      inscricao_estadual   = COALESCE(NULLIF(TRIM(p_inscricao_estadual), ''),   dv.inscricao_estadual),
      cep                  = COALESCE(NULLIF(TRIM(p_cep), ''),                  dv.cep),
      logradouro           = COALESCE(NULLIF(TRIM(p_logradouro), ''),           dv.logradouro),
      numero               = COALESCE(NULLIF(TRIM(p_numero), ''),               dv.numero),
      complemento          = COALESCE(NULLIF(TRIM(p_complemento), ''),          dv.complemento),
      bairro               = COALESCE(NULLIF(TRIM(p_bairro), ''),               dv.bairro),
      cidade               = COALESCE(NULLIF(TRIM(p_cidade), ''),               dv.cidade),
      estado               = COALESCE(NULLIF(TRIM(p_estado), ''),               dv.estado),
      observacoes_internas = COALESCE(NULLIF(TRIM(p_observacoes_internas), ''), dv.observacoes_internas),
      dados_bancarios      = COALESCE(p_dados_bancarios,     dv.dados_bancarios,     '{}'::JSONB),
      contatos_adicionais  = COALESCE(p_contatos_adicionais, dv.contatos_adicionais, '[]'::JSONB),
      updated_at           = NOW()
    WHERE dv.user_id = p_user_id
      AND dv.deleted_at IS NULL;
  ELSE
    INSERT INTO public.dados_vendedor (
      user_id, nome, iniciais, cpf_cnpj, email, telefone, data_admissao, status,
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
    RAISE LOG 'Error in update_dados_vendedor_v2 for user %: %', p_user_id, SQLERRM;
    RAISE;
END;
$function$;

COMMENT ON FUNCTION public.update_dados_vendedor_v2 IS
'Upsert dos campos extras de um vendedor em dados_vendedor. Chamada pelo edge function update-user-v2. v111: corrige column reference ambiguous user_id qualificando referências com alias dv.';
