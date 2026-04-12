-- ============================================================================
-- Migration 008: Adicionar Campos Faltantes em natureza_operacao
-- ============================================================================
-- Descrição: Adiciona campos necessários para o gerenciamento completo de
--            naturezas de operação conforme esperado pelo frontend
-- Data: 2026-01-23
-- ============================================================================

-- Adicionar campos faltantes
ALTER TABLE public.natureza_operacao
ADD COLUMN IF NOT EXISTS codigo TEXT,
ADD COLUMN IF NOT EXISTS descricao TEXT,
ADD COLUMN IF NOT EXISTS gera_receita BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE NOT NULL,
ADD COLUMN IF NOT EXISTS tiny_id TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Renomear campo existente para padronizar (se necessário)
-- tem_comissao já existe, vamos manter mas adicionar alias gera_comissao
-- A função RPC vai mapear tem_comissao para geraComissao

-- Comentários
COMMENT ON COLUMN public.natureza_operacao.codigo IS 'Código CFOP da natureza de operação';
COMMENT ON COLUMN public.natureza_operacao.descricao IS 'Descrição detalhada da natureza de operação';
COMMENT ON COLUMN public.natureza_operacao.gera_receita IS 'Indica se vendas com esta natureza geram receita';
COMMENT ON COLUMN public.natureza_operacao.ativo IS 'Indica se a natureza está ativa no sistema';
COMMENT ON COLUMN public.natureza_operacao.tiny_id IS 'ID da natureza no sistema Tiny ERP (integração)';
COMMENT ON COLUMN public.natureza_operacao.created_at IS 'Data de criação do registro';
COMMENT ON COLUMN public.natureza_operacao.updated_at IS 'Data da última atualização';
COMMENT ON COLUMN public.natureza_operacao.deleted_at IS 'Data de exclusão (soft delete)';

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_natureza_operacao_ativo 
ON public.natureza_operacao(ativo) 
WHERE deleted_at IS NULL AND ativo = TRUE;

CREATE INDEX IF NOT EXISTS idx_natureza_operacao_codigo 
ON public.natureza_operacao(codigo) 
WHERE deleted_at IS NULL AND codigo IS NOT NULL;

-- Atualizar registros existentes para ter valores padrão
UPDATE public.natureza_operacao
SET 
  ativo = COALESCE(ativo, TRUE),
  gera_receita = COALESCE(gera_receita, TRUE),
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW())
WHERE created_at IS NULL OR updated_at IS NULL;
