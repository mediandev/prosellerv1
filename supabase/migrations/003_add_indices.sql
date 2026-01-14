-- ============================================================================
-- Migration 003: Adicionar Índices para Performance
-- ============================================================================
-- Descrição: Adiciona índices em campos usados frequentemente em queries
--            e em campos usados em RLS policies
-- Data: 2025-01-16
-- ============================================================================

-- ============================================================================
-- 1. ÍNDICES PARA TABELA: cliente
-- ============================================================================

-- Índice em cpf_cnpj (busca frequente)
CREATE INDEX IF NOT EXISTS idx_cliente_cpf_cnpj 
ON public.cliente(cpf_cnpj) 
WHERE deleted_at IS NULL;

-- Índice em codigo_sequencial (busca frequente)
CREATE INDEX IF NOT EXISTS idx_cliente_codigo_sequencial 
ON public.cliente(codigo_sequencial) 
WHERE deleted_at IS NULL;

-- Índice em status_aprovacao (filtro frequente)
CREATE INDEX IF NOT EXISTS idx_cliente_status_aprovacao 
ON public.cliente(status_aprovacao) 
WHERE deleted_at IS NULL;

-- Índice em criado_por (filtro por usuário)
CREATE INDEX IF NOT EXISTS idx_cliente_criado_por 
ON public.cliente(criado_por) 
WHERE deleted_at IS NULL;

-- Índice composto em (ref_situacao_id, deleted_at)
CREATE INDEX IF NOT EXISTS idx_cliente_situacao_deleted 
ON public.cliente(ref_situacao_id, deleted_at) 
WHERE deleted_at IS NULL;

-- ============================================================================
-- 2. ÍNDICES PARA TABELA: pedido_venda
-- ============================================================================

-- Índice em vendedor_uuid (filtro frequente)
CREATE INDEX IF NOT EXISTS idx_pedido_venda_vendedor_uuid 
ON public.pedido_venda(vendedor_uuid) 
WHERE deleted_at IS NULL;

-- Índice em cliente_id (filtro frequente)
CREATE INDEX IF NOT EXISTS idx_pedido_venda_cliente_id 
ON public.pedido_venda(cliente_id) 
WHERE deleted_at IS NULL;

-- Índice em data_venda (ordenação/filtro frequente)
CREATE INDEX IF NOT EXISTS idx_pedido_venda_data_venda 
ON public.pedido_venda(data_venda DESC) 
WHERE deleted_at IS NULL;

-- Índice em status (filtro frequente)
CREATE INDEX IF NOT EXISTS idx_pedido_venda_status 
ON public.pedido_venda(status) 
WHERE deleted_at IS NULL;

-- Índice em created_by (filtro por usuário)
CREATE INDEX IF NOT EXISTS idx_pedido_venda_created_by 
ON public.pedido_venda(created_by) 
WHERE deleted_at IS NULL;

-- Índice composto em (vendedor_uuid, data_venda)
CREATE INDEX IF NOT EXISTS idx_pedido_venda_vendedor_data 
ON public.pedido_venda(vendedor_uuid, data_venda DESC) 
WHERE deleted_at IS NULL;

-- Índice composto em (cliente_id, data_venda)
CREATE INDEX IF NOT EXISTS idx_pedido_venda_cliente_data 
ON public.pedido_venda(cliente_id, data_venda DESC) 
WHERE deleted_at IS NULL;

-- ============================================================================
-- 3. ÍNDICES PARA TABELA: produto
-- ============================================================================

-- Índice em codigo_sku (busca frequente)
CREATE INDEX IF NOT EXISTS idx_produto_codigo_sku 
ON public.produto(codigo_sku) 
WHERE deleted_at IS NULL;

-- Índice em marca (filtro frequente)
CREATE INDEX IF NOT EXISTS idx_produto_marca 
ON public.produto(marca) 
WHERE deleted_at IS NULL;

-- Índice em tipo_id (filtro frequente)
CREATE INDEX IF NOT EXISTS idx_produto_tipo_id 
ON public.produto(tipo_id) 
WHERE deleted_at IS NULL;

-- Índice em situacao (filtro frequente)
CREATE INDEX IF NOT EXISTS idx_produto_situacao 
ON public.produto(situacao) 
WHERE deleted_at IS NULL;

-- Índice em disponivel (filtro frequente)
CREATE INDEX IF NOT EXISTS idx_produto_disponivel 
ON public.produto(disponivel) 
WHERE deleted_at IS NULL;

-- Índice composto em (marca, tipo_id, disponivel)
CREATE INDEX IF NOT EXISTS idx_produto_marca_tipo_disponivel 
ON public.produto(marca, tipo_id, disponivel) 
WHERE deleted_at IS NULL AND disponivel = TRUE;

-- ============================================================================
-- 4. ÍNDICES PARA TABELA: dados_vendedor
-- ============================================================================

-- Índice em email (busca frequente)
CREATE INDEX IF NOT EXISTS idx_dados_vendedor_email 
ON public.dados_vendedor(email) 
WHERE deleted_at IS NULL;

-- Índice em status (filtro frequente)
CREATE INDEX IF NOT EXISTS idx_dados_vendedor_status 
ON public.dados_vendedor(status) 
WHERE deleted_at IS NULL;

-- Índice em codigo_sequencial (busca frequente)
CREATE INDEX IF NOT EXISTS idx_dados_vendedor_codigo_sequencial 
ON public.dados_vendedor(codigo_sequencial) 
WHERE deleted_at IS NULL;

-- ============================================================================
-- 5. ÍNDICES PARA TABELA: user
-- ============================================================================

-- Índice em email (busca frequente)
CREATE INDEX IF NOT EXISTS idx_user_email 
ON public.user(email) 
WHERE email IS NOT NULL;

-- Índice em tipo (filtro frequente)
CREATE INDEX IF NOT EXISTS idx_user_tipo 
ON public.user(tipo) 
WHERE tipo IS NOT NULL;

-- Índice em ativo (filtro frequente)
CREATE INDEX IF NOT EXISTS idx_user_ativo 
ON public.user(ativo) 
WHERE ativo = TRUE;

-- Índice composto em (tipo, ativo)
CREATE INDEX IF NOT EXISTS idx_user_tipo_ativo 
ON public.user(tipo, ativo) 
WHERE ativo = TRUE;

-- ============================================================================
-- 6. ÍNDICES PARA TABELA: vendedor_comissão
-- ============================================================================

-- Índice em vendedor_uuid (filtro frequente)
CREATE INDEX IF NOT EXISTS idx_vendedor_comissao_vendedor_uuid 
ON public.vendedor_comissão(vendedor_uuid);

-- Índice em periodo (filtro frequente)
CREATE INDEX IF NOT EXISTS idx_vendedor_comissao_periodo 
ON public.vendedor_comissão(periodo) 
WHERE periodo IS NOT NULL;

-- Índice em pedido_id (join frequente)
CREATE INDEX IF NOT EXISTS idx_vendedor_comissao_pedido_id 
ON public.vendedor_comissão(pedido_id) 
WHERE pedido_id IS NOT NULL;

-- Índice em cliente_id (join frequente)
CREATE INDEX IF NOT EXISTS idx_vendedor_comissao_cliente_id 
ON public.vendedor_comissão(cliente_id) 
WHERE cliente_id IS NOT NULL;

-- Índice composto em (vendedor_uuid, periodo)
CREATE INDEX IF NOT EXISTS idx_vendedor_comissao_vendedor_periodo 
ON public.vendedor_comissão(vendedor_uuid, periodo) 
WHERE periodo IS NOT NULL;

-- Índice em data_inicio (ordenação/filtro)
CREATE INDEX IF NOT EXISTS idx_vendedor_comissao_data_inicio 
ON public.vendedor_comissão(data_inicio DESC) 
WHERE data_inicio IS NOT NULL;

-- ============================================================================
-- 7. ÍNDICES PARA TABELA: pedido_venda_produtos
-- ============================================================================

-- Índice composto em (pedido_venda_id, numero) para ordenação
CREATE INDEX IF NOT EXISTS idx_pedido_venda_produtos_pedido_numero 
ON public.pedido_venda_produtos(pedido_venda_id, numero) 
WHERE numero IS NOT NULL;

-- Índice em produto_id (join frequente)
CREATE INDEX IF NOT EXISTS idx_pedido_venda_produtos_produto_id 
ON public.pedido_venda_produtos(produto_id);

-- ============================================================================
-- 8. ÍNDICES PARA TABELA: metas_vendedor
-- ============================================================================

-- Índice composto em (vendedor_id, ano, mes) - já existe como UNIQUE
-- Adicionar índice em ano para filtros
CREATE INDEX IF NOT EXISTS idx_metas_vendedor_ano 
ON public.metas_vendedor(ano DESC);

-- Índice composto em (vendedor_id, ano)
CREATE INDEX IF NOT EXISTS idx_metas_vendedor_vendedor_ano 
ON public.metas_vendedor(vendedor_id, ano DESC);

-- ============================================================================
-- 9. ÍNDICES PARA CAMPOS DE AUDITORIA (created_at, updated_at)
-- ============================================================================

-- Índices em created_at para ordenação temporal
CREATE INDEX IF NOT EXISTS idx_cliente_created_at 
ON public.cliente(created_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_produto_created_at 
ON public.produto(created_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_dados_vendedor_created_at 
ON public.dados_vendedor(created_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_created_at 
ON public.user(data_cadastro DESC);

-- Índices em updated_at para ordenação temporal
CREATE INDEX IF NOT EXISTS idx_cliente_updated_at 
ON public.cliente(updated_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_produto_updated_at 
ON public.produto(updated_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_dados_vendedor_updated_at 
ON public.dados_vendedor(updated_at DESC) 
WHERE deleted_at IS NULL;

-- ============================================================================
-- 10. ÍNDICES PARA SOFT DELETE (deleted_at)
-- ============================================================================

-- Índices parciais em deleted_at IS NULL para queries que filtram ativos
-- (já cobertos pelos índices acima com WHERE deleted_at IS NULL)

