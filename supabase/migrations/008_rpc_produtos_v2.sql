-- ============================================================================
-- Migration 008: Funções RPC para Produtos (v2)
-- ============================================================================
-- Descrição: Cria função RPC para listar produtos formatados com dados
--            das tabelas auxiliares (marcas, tipos, unidades)
-- Data: 2025-01-17
-- ============================================================================

-- ============================================================================
-- 1. FUNÇÃO: list_produtos_v2
-- ============================================================================
-- Lista produtos formatados com JOINs nas tabelas auxiliares
-- Retorna dados formatados prontos para uso no frontend
-- ============================================================================

CREATE OR REPLACE FUNCTION list_produtos_v2()
RETURNS TABLE (
  produto_id BIGINT,
  foto TEXT,
  descricao TEXT,
  codigo_sku TEXT,
  codigo_ean TEXT,
  marca_id BIGINT,
  nome_marca TEXT,
  tipo_produto_id BIGINT,
  nome_tipo_produto TEXT,
  ncm TEXT,
  cest TEXT,
  unidade_id BIGINT,
  sigla_unidade TEXT,
  peso_liquido NUMERIC,
  peso_bruto NUMERIC,
  situacao TEXT,
  ativo BOOLEAN,
  disponivel BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
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
$$;

-- Comentário para documentação
COMMENT ON FUNCTION list_produtos_v2 IS 
'Lista todos os produtos formatados com dados das tabelas auxiliares (marcas, tipos, unidades).
Prioriza dados das tabelas auxiliares sobre campos desnormalizados.
Retorna apenas produtos não deletados (soft delete).';

-- Permissões
GRANT EXECUTE ON FUNCTION list_produtos_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION list_produtos_v2 TO anon;

-- ============================================================================
-- 2. FUNÇÃO: get_produto_v2
-- ============================================================================
-- Busca um produto específico por ID formatado com dados das tabelas auxiliares
-- ============================================================================

CREATE OR REPLACE FUNCTION get_produto_v2(
  p_produto_id BIGINT
)
RETURNS TABLE (
  produto_id BIGINT,
  foto TEXT,
  descricao TEXT,
  codigo_sku TEXT,
  codigo_ean TEXT,
  marca_id BIGINT,
  nome_marca TEXT,
  tipo_produto_id BIGINT,
  nome_tipo_produto TEXT,
  ncm TEXT,
  cest TEXT,
  unidade_id BIGINT,
  sigla_unidade TEXT,
  peso_liquido NUMERIC,
  peso_bruto NUMERIC,
  situacao TEXT,
  ativo BOOLEAN,
  disponivel BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
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
$$;

-- Comentário para documentação
COMMENT ON FUNCTION get_produto_v2 IS 
'Busca um produto específico por ID formatado com dados das tabelas auxiliares.
Prioriza dados das tabelas auxiliares sobre campos desnormalizados.
Lança exceção se produto não for encontrado ou estiver deletado.';

-- Permissões
GRANT EXECUTE ON FUNCTION get_produto_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION get_produto_v2 TO anon;

