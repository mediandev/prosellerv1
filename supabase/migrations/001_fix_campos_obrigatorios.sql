-- ============================================================================
-- Migration 001: Adicionar Campos Obrigatórios Faltantes
-- ============================================================================
-- Descrição: Adiciona campos obrigatórios que estão faltando nas tabelas
--            principais conforme definido nos tipos TypeScript
-- Data: 2025-01-16
-- ============================================================================

-- ============================================================================
-- 1. TABELA: user
-- ============================================================================
-- Adicionar campos obrigatórios faltantes

ALTER TABLE public.user
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS tipo TEXT CHECK (tipo IN ('backoffice', 'vendedor')),
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE NOT NULL,
ADD COLUMN IF NOT EXISTS data_cadastro TIMESTAMPTZ DEFAULT NOW() NOT NULL,
ADD COLUMN IF NOT EXISTS ultimo_acesso TIMESTAMPTZ;

-- Comentários
COMMENT ON COLUMN public.user.email IS 'Email do usuário (obrigatório)';
COMMENT ON COLUMN public.user.tipo IS 'Tipo de usuário: backoffice ou vendedor';
COMMENT ON COLUMN public.user.ativo IS 'Indica se o usuário está ativo';
COMMENT ON COLUMN public.user.data_cadastro IS 'Data de cadastro do usuário';
COMMENT ON COLUMN public.user.ultimo_acesso IS 'Data do último acesso ao sistema';

-- ============================================================================
-- 2. TABELA: dados_vendedor
-- ============================================================================
-- Adicionar campos obrigatórios faltantes

ALTER TABLE public.dados_vendedor
ADD COLUMN IF NOT EXISTS iniciais TEXT,
ADD COLUMN IF NOT EXISTS data_admissao DATE,
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('ativo', 'inativo', 'excluido')) DEFAULT 'ativo',
ADD COLUMN IF NOT EXISTS cnpj TEXT,
ADD COLUMN IF NOT EXISTS razao_social TEXT,
ADD COLUMN IF NOT EXISTS inscricao_estadual TEXT,
ADD COLUMN IF NOT EXISTS observacoes_internas TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Comentários
COMMENT ON COLUMN public.dados_vendedor.iniciais IS 'Iniciais do vendedor (ex: "JD" para João da Silva)';
COMMENT ON COLUMN public.dados_vendedor.data_admissao IS 'Data de admissão do vendedor';
COMMENT ON COLUMN public.dados_vendedor.status IS 'Status do vendedor: ativo, inativo ou excluido';
COMMENT ON COLUMN public.dados_vendedor.cnpj IS 'CNPJ (separado de CPF)';
COMMENT ON COLUMN public.dados_vendedor.razao_social IS 'Razão social (dados PJ)';
COMMENT ON COLUMN public.dados_vendedor.inscricao_estadual IS 'Inscrição estadual (dados PJ)';
COMMENT ON COLUMN public.dados_vendedor.observacoes_internas IS 'Observações internas sobre o vendedor';
COMMENT ON COLUMN public.dados_vendedor.created_at IS 'Data de criação do registro';
COMMENT ON COLUMN public.dados_vendedor.updated_at IS 'Data da última atualização';
COMMENT ON COLUMN public.dados_vendedor.deleted_at IS 'Data de exclusão (soft delete)';

-- ============================================================================
-- 3. TABELA: cliente
-- ============================================================================
-- Adicionar campos obrigatórios faltantes

ALTER TABLE public.cliente
ADD COLUMN IF NOT EXISTS codigo TEXT,
ADD COLUMN IF NOT EXISTS grupo_rede TEXT,
ADD COLUMN IF NOT EXISTS desconto_financeiro NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS pedido_minimo NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS status_aprovacao TEXT CHECK (status_aprovacao IN ('aprovado', 'pendente', 'rejeitado')) DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS motivo_rejeicao TEXT,
ADD COLUMN IF NOT EXISTS aprovado_por UUID,
ADD COLUMN IF NOT EXISTS data_aprovacao DATE,
ADD COLUMN IF NOT EXISTS endereco_entrega_diferente BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS criado_por UUID,
ADD COLUMN IF NOT EXISTS atualizado_por UUID;

-- Comentários
COMMENT ON COLUMN public.cliente.codigo IS 'Código do cliente (manual ou automático)';
COMMENT ON COLUMN public.cliente.grupo_rede IS 'Grupo/rede do cliente';
COMMENT ON COLUMN public.cliente.desconto_financeiro IS 'Desconto financeiro percentual';
COMMENT ON COLUMN public.cliente.pedido_minimo IS 'Valor mínimo do pedido';
COMMENT ON COLUMN public.cliente.status_aprovacao IS 'Status de aprovação: aprovado, pendente ou rejeitado';
COMMENT ON COLUMN public.cliente.motivo_rejeicao IS 'Motivo da rejeição (se aplicável)';
COMMENT ON COLUMN public.cliente.aprovado_por IS 'ID do usuário que aprovou';
COMMENT ON COLUMN public.cliente.data_aprovacao IS 'Data da aprovação';
COMMENT ON COLUMN public.cliente.endereco_entrega_diferente IS 'Indica se endereço de entrega é diferente';
COMMENT ON COLUMN public.cliente.created_at IS 'Data de criação do registro';
COMMENT ON COLUMN public.cliente.updated_at IS 'Data da última atualização';
COMMENT ON COLUMN public.cliente.deleted_at IS 'Data de exclusão (soft delete)';
COMMENT ON COLUMN public.cliente.criado_por IS 'ID do usuário que criou';
COMMENT ON COLUMN public.cliente.atualizado_por IS 'ID do usuário que atualizou';

-- ============================================================================
-- 4. TABELA: produto
-- ============================================================================
-- Adicionar campos obrigatórios faltantes

ALTER TABLE public.produto
ADD COLUMN IF NOT EXISTS foto TEXT,
ADD COLUMN IF NOT EXISTS situacao TEXT CHECK (situacao IN ('Ativo', 'Inativo', 'Excluído')) DEFAULT 'Ativo',
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE NOT NULL,
ADD COLUMN IF NOT EXISTS disponivel BOOLEAN DEFAULT TRUE NOT NULL,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS nome_marca TEXT,
ADD COLUMN IF NOT EXISTS nome_tipo_produto TEXT,
ADD COLUMN IF NOT EXISTS sigla_unidade TEXT;

-- Comentários
COMMENT ON COLUMN public.produto.foto IS 'URL da foto do produto';
COMMENT ON COLUMN public.produto.situacao IS 'Situação do produto: Ativo, Inativo ou Excluído';
COMMENT ON COLUMN public.produto.ativo IS 'Indica se o produto está ativo';
COMMENT ON COLUMN public.produto.disponivel IS 'Indica se o produto está disponível para venda';
COMMENT ON COLUMN public.produto.created_at IS 'Data de criação do registro';
COMMENT ON COLUMN public.produto.updated_at IS 'Data da última atualização';
COMMENT ON COLUMN public.produto.deleted_at IS 'Data de exclusão (soft delete)';
COMMENT ON COLUMN public.produto.nome_marca IS 'Nome da marca (desnormalizado para performance)';
COMMENT ON COLUMN public.produto.nome_tipo_produto IS 'Nome do tipo de produto (desnormalizado)';
COMMENT ON COLUMN public.produto.sigla_unidade IS 'Sigla da unidade (desnormalizado)';

-- ============================================================================
-- 5. TABELA: pedido_venda
-- ============================================================================
-- Adicionar campos obrigatórios faltantes

ALTER TABLE public.pedido_venda
ADD COLUMN IF NOT EXISTS lista_preco_id BIGINT,
ADD COLUMN IF NOT EXISTS nome_lista_preco TEXT,
ADD COLUMN IF NOT EXISTS percentual_desconto_padrao NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS nome_cliente TEXT,
ADD COLUMN IF NOT EXISTS cnpj_cliente TEXT,
ADD COLUMN IF NOT EXISTS inscricao_estadual_cliente TEXT,
ADD COLUMN IF NOT EXISTS nome_vendedor TEXT,
ADD COLUMN IF NOT EXISTS nome_natureza_operacao TEXT,
ADD COLUMN IF NOT EXISTS empresa_faturamento_id BIGINT,
ADD COLUMN IF NOT EXISTS nome_empresa_faturamento TEXT,
ADD COLUMN IF NOT EXISTS nome_condicao_pagamento TEXT,
ADD COLUMN IF NOT EXISTS total_quantidades NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_itens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS peso_bruto_total NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS peso_liquido_total NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_total_produtos NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS percentual_desconto_extra NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_desconto_extra NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS created_by UUID,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Comentários
COMMENT ON COLUMN public.pedido_venda.lista_preco_id IS 'ID da lista de preços (FK)';
COMMENT ON COLUMN public.pedido_venda.nome_lista_preco IS 'Nome da lista de preços (desnormalizado)';
COMMENT ON COLUMN public.pedido_venda.percentual_desconto_padrao IS 'Percentual de desconto padrão';
COMMENT ON COLUMN public.pedido_venda.nome_cliente IS 'Nome do cliente (desnormalizado)';
COMMENT ON COLUMN public.pedido_venda.cnpj_cliente IS 'CNPJ do cliente (desnormalizado)';
COMMENT ON COLUMN public.pedido_venda.inscricao_estadual_cliente IS 'IE do cliente (desnormalizado)';
COMMENT ON COLUMN public.pedido_venda.nome_vendedor IS 'Nome do vendedor (desnormalizado)';
COMMENT ON COLUMN public.pedido_venda.nome_natureza_operacao IS 'Nome da natureza de operação (desnormalizado)';
COMMENT ON COLUMN public.pedido_venda.empresa_faturamento_id IS 'ID da empresa de faturamento (FK)';
COMMENT ON COLUMN public.pedido_venda.nome_empresa_faturamento IS 'Nome da empresa (desnormalizado)';
COMMENT ON COLUMN public.pedido_venda.nome_condicao_pagamento IS 'Nome da condição de pagamento (desnormalizado)';
COMMENT ON COLUMN public.pedido_venda.total_quantidades IS 'Total de quantidades (calculado)';
COMMENT ON COLUMN public.pedido_venda.total_itens IS 'Total de itens (calculado)';
COMMENT ON COLUMN public.pedido_venda.peso_bruto_total IS 'Peso bruto total (calculado)';
COMMENT ON COLUMN public.pedido_venda.peso_liquido_total IS 'Peso líquido total (calculado)';
COMMENT ON COLUMN public.pedido_venda.valor_total_produtos IS 'Valor total dos produtos (calculado)';
COMMENT ON COLUMN public.pedido_venda.percentual_desconto_extra IS 'Percentual de desconto extra';
COMMENT ON COLUMN public.pedido_venda.valor_desconto_extra IS 'Valor do desconto extra';
COMMENT ON COLUMN public.pedido_venda.updated_at IS 'Data da última atualização';
COMMENT ON COLUMN public.pedido_venda.created_by IS 'ID do usuário que criou';
COMMENT ON COLUMN public.pedido_venda.deleted_at IS 'Data de exclusão (soft delete)';

-- ============================================================================
-- 6. TABELA: pedido_venda_produtos
-- ============================================================================
-- Adicionar campos obrigatórios faltantes

ALTER TABLE public.pedido_venda_produtos
ADD COLUMN IF NOT EXISTS numero INTEGER,
ADD COLUMN IF NOT EXISTS codigo_sku TEXT,
ADD COLUMN IF NOT EXISTS codigo_ean TEXT,
ADD COLUMN IF NOT EXISTS valor_tabela NUMERIC,
ADD COLUMN IF NOT EXISTS percentual_desconto NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS subtotal NUMERIC,
ADD COLUMN IF NOT EXISTS peso_bruto NUMERIC,
ADD COLUMN IF NOT EXISTS peso_liquido NUMERIC,
ADD COLUMN IF NOT EXISTS unidade TEXT;

-- Comentários
COMMENT ON COLUMN public.pedido_venda_produtos.numero IS 'Número do item na lista (ordenação)';
COMMENT ON COLUMN public.pedido_venda_produtos.codigo_sku IS 'Código SKU do produto (desnormalizado)';
COMMENT ON COLUMN public.pedido_venda_produtos.codigo_ean IS 'Código EAN do produto (desnormalizado)';
COMMENT ON COLUMN public.pedido_venda_produtos.valor_tabela IS 'Valor na lista de preços';
COMMENT ON COLUMN public.pedido_venda_produtos.percentual_desconto IS 'Percentual de desconto aplicado';
COMMENT ON COLUMN public.pedido_venda_produtos.subtotal IS 'Subtotal do item (calculado)';
COMMENT ON COLUMN public.pedido_venda_produtos.peso_bruto IS 'Peso bruto unitário';
COMMENT ON COLUMN public.pedido_venda_produtos.peso_liquido IS 'Peso líquido unitário';
COMMENT ON COLUMN public.pedido_venda_produtos.unidade IS 'Sigla da unidade';

-- ============================================================================
-- 7. TABELA: vendedor_comissão
-- ============================================================================
-- Adicionar campos obrigatórios faltantes (modelo novo de comissões)

ALTER TABLE public.vendedor_comissão
ADD COLUMN IF NOT EXISTS periodo TEXT,
ADD COLUMN IF NOT EXISTS oc_cliente TEXT,
ADD COLUMN IF NOT EXISTS cliente_id BIGINT,
ADD COLUMN IF NOT EXISTS cliente_nome TEXT,
ADD COLUMN IF NOT EXISTS percentual_comissao NUMERIC,
ADD COLUMN IF NOT EXISTS regra_aplicada TEXT CHECK (regra_aplicada IN ('aliquota_fixa_vendedor', 'lista_preco_fixa', 'lista_preco_faixas')),
ADD COLUMN IF NOT EXISTS lista_preco_id BIGINT,
ADD COLUMN IF NOT EXISTS lista_preco_nome TEXT,
ADD COLUMN IF NOT EXISTS desconto_aplicado NUMERIC,
ADD COLUMN IF NOT EXISTS faixa_desconto_id BIGINT,
ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS editado_por UUID,
ADD COLUMN IF NOT EXISTS editado_em TIMESTAMPTZ;

-- Comentários
COMMENT ON COLUMN public.vendedor_comissão.periodo IS 'Período da comissão (formato: "2025-10")';
COMMENT ON COLUMN public.vendedor_comissão.oc_cliente IS 'Ordem de Compra do Cliente';
COMMENT ON COLUMN public.vendedor_comissão.cliente_id IS 'ID do cliente (facilita queries)';
COMMENT ON COLUMN public.vendedor_comissão.cliente_nome IS 'Nome do cliente (desnormalizado)';
COMMENT ON COLUMN public.vendedor_comissão.percentual_comissao IS 'Percentual de comissão aplicado';
COMMENT ON COLUMN public.vendedor_comissão.regra_aplicada IS 'Regra de comissão aplicada';
COMMENT ON COLUMN public.vendedor_comissão.lista_preco_id IS 'ID da lista de preços (se aplicável)';
COMMENT ON COLUMN public.vendedor_comissão.lista_preco_nome IS 'Nome da lista de preços (desnormalizado)';
COMMENT ON COLUMN public.vendedor_comissão.desconto_aplicado IS 'Percentual de desconto aplicado';
COMMENT ON COLUMN public.vendedor_comissão.faixa_desconto_id IS 'ID da faixa de desconto (se aplicável)';
COMMENT ON COLUMN public.vendedor_comissão.criado_em IS 'Data de criação';
COMMENT ON COLUMN public.vendedor_comissão.editado_por IS 'ID do usuário que editou';
COMMENT ON COLUMN public.vendedor_comissão.editado_em IS 'Data da edição';

-- ============================================================================
-- 8. TABELA: metas_vendedor
-- ============================================================================
-- Corrigir tipo de dados

-- Primeiro, verificar se há dados e converter
DO $$
BEGIN
  -- Converter vendedor_id de VARCHAR para UUID se possível
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'metas_vendedor' 
    AND column_name = 'vendedor_id' 
    AND data_type = 'character varying'
  ) THEN
    -- Criar coluna temporária
    ALTER TABLE public.metas_vendedor
    ADD COLUMN IF NOT EXISTS vendedor_uuid UUID;
    
    -- Tentar converter valores válidos
    UPDATE public.metas_vendedor
    SET vendedor_uuid = vendedor_id::UUID
    WHERE vendedor_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    
    -- Remover coluna antiga e renomear
    ALTER TABLE public.metas_vendedor
    DROP COLUMN IF EXISTS vendedor_id;
    
    ALTER TABLE public.metas_vendedor
    RENAME COLUMN vendedor_uuid TO vendedor_id;
    
    -- Tornar NOT NULL
    ALTER TABLE public.metas_vendedor
    ALTER COLUMN vendedor_id SET NOT NULL;
  END IF;
  
  -- Converter mes de VARCHAR para INTEGER
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'metas_vendedor' 
    AND column_name = 'mes' 
    AND data_type = 'character varying'
  ) THEN
    ALTER TABLE public.metas_vendedor
    ADD COLUMN IF NOT EXISTS mes_int INTEGER;
    
    UPDATE public.metas_vendedor
    SET mes_int = CASE 
      WHEN mes ~ '^[0-9]+$' THEN mes::INTEGER
      ELSE NULL
    END;
    
    ALTER TABLE public.metas_vendedor
    DROP COLUMN IF EXISTS mes;
    
    ALTER TABLE public.metas_vendedor
    RENAME COLUMN mes_int TO mes;
    
    ALTER TABLE public.metas_vendedor
    ALTER COLUMN mes SET NOT NULL;
    
    -- Adicionar constraint
    ALTER TABLE public.metas_vendedor
    ADD CONSTRAINT chk_mes_valido CHECK (mes >= 1 AND mes <= 12);
  END IF;
END $$;

-- Comentários
COMMENT ON COLUMN public.metas_vendedor.vendedor_id IS 'ID do vendedor (UUID, FK para dados_vendedor.user_id)';
COMMENT ON COLUMN public.metas_vendedor.mes IS 'Mês da meta (1-12)';

