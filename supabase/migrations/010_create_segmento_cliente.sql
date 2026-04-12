-- ============================================================================
-- Migration 010: Criar Tabela segmento_cliente
-- ============================================================================
-- Descrição: Cria tabela para gerenciar segmentos de cliente do sistema
-- Data: 2026-01-23
-- ============================================================================

-- Criar tabela segmento_cliente
CREATE TABLE IF NOT EXISTS public.segmento_cliente (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT segmento_cliente_nome_check CHECK (LENGTH(TRIM(nome)) >= 2)
);

-- Criar índice único para nome (case-insensitive, excluindo soft deletes)
CREATE UNIQUE INDEX IF NOT EXISTS idx_segmento_cliente_nome_unique 
ON public.segmento_cliente(LOWER(TRIM(nome))) 
WHERE deleted_at IS NULL;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_segmento_cliente_ativo 
ON public.segmento_cliente(ativo) 
WHERE deleted_at IS NULL AND ativo = TRUE;

CREATE INDEX IF NOT EXISTS idx_segmento_cliente_created_at 
ON public.segmento_cliente(created_at DESC) 
WHERE deleted_at IS NULL;

-- Comentários
COMMENT ON TABLE public.segmento_cliente IS 'Tabela de segmentos de cliente do sistema';
COMMENT ON COLUMN public.segmento_cliente.nome IS 'Nome do segmento de cliente';
COMMENT ON COLUMN public.segmento_cliente.descricao IS 'Descrição detalhada do segmento';
COMMENT ON COLUMN public.segmento_cliente.ativo IS 'Indica se o segmento está ativo no sistema';
COMMENT ON COLUMN public.segmento_cliente.created_at IS 'Data de criação do registro';
COMMENT ON COLUMN public.segmento_cliente.updated_at IS 'Data da última atualização';
COMMENT ON COLUMN public.segmento_cliente.deleted_at IS 'Data de exclusão (soft delete)';
