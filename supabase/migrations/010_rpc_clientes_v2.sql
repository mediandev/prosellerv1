-- ============================================================================
-- Migration 010: Funções RPC para Clientes (v2)
-- ============================================================================
-- Descrição: Cria funções RPC para gerenciar clientes com dados relacionados
-- Data: 2025-01-19
-- ============================================================================

-- ============================================================================
-- 1. FUNÇÃO: list_clientes_v2
-- ============================================================================
-- Lista todos os clientes com dados relacionados (contato, endereço, tipo pessoa, situação)
-- Retorna dados formatados prontos para uso no frontend
-- ============================================================================

CREATE OR REPLACE FUNCTION list_clientes_v2()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'id', c.cliente_id,
      'codigo', c.codigo,
      'nome', c.nome,
      'nomeFantasia', c.nome_fantasia,
      'cpfCnpj', c.cpf_cnpj,
      'tipoPessoa', CASE 
        WHEN tp.nome = 'J' OR tp.nome_completo ILIKE '%jurídica%' THEN 'Pessoa Jurídica'
        WHEN tp.nome = 'F' OR tp.nome_completo ILIKE '%física%' THEN 'Pessoa Física'
        ELSE 'Pessoa Jurídica'
      END,
      'situacao', CASE 
        WHEN s.nome = 'ATIVO' THEN 'Ativo'
        WHEN s.nome = 'INATIVO' THEN 'Inativo'
        WHEN s.nome = 'EXCLUIDO' THEN 'Excluído'
        ELSE 'Ativo'
      END,
      'segmentoMercado', COALESCE(c.tipo_segmento, ''),
      'grupoRede', COALESCE(c.grupo_rede, ''),
      'statusAprovacao', COALESCE(c.status_aprovacao, 'pendente'),
      'emailPrincipal', cc.email,
      'telefoneFixoPrincipal', cc.telefone,
      'telefoneCelularPrincipal', cc.telefone_adicional,
      'emailNFe', cc.email_nf,
      'site', cc.website,
      'cep', ce.cep,
      'logradouro', ce.rua,
      'numero', ce.numero,
      'complemento', ce.complemento,
      'bairro', ce.bairro,
      'uf', ce.uf,
      'municipio', ce.cidade,
      'inscricaoEstadual', c.inscricao_estadual,
      'inscricaoMunicipal', c.inscricao_municipal,
      'observacoesInternas', c.observacao_interna,
      'dataCadastro', c.created_at,
      'dataAtualizacao', c.updated_at
    )
    ORDER BY c.nome
  )
  INTO v_result
  FROM cliente c
  LEFT JOIN ref_tipo_pessoa tp ON c."ref_tipo_pessoa_id_FK" = tp.ref_tipo_pessoa_id
  LEFT JOIN ref_situacao s ON c.ref_situacao_id = s.ref_situacao_id
  LEFT JOIN cliente_contato cc ON c.cliente_id = cc.cliente_id
  LEFT JOIN cliente_endereço ce ON c.cliente_id = ce.cliente_id
  WHERE c.deleted_at IS NULL;

  RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;

COMMENT ON FUNCTION list_clientes_v2 IS 
'Lista todos os clientes com dados relacionados (contato, endereço, tipo pessoa, situação)';

GRANT EXECUTE ON FUNCTION list_clientes_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION list_clientes_v2 TO anon;
