-- ============================================================================
-- Migration 004: Corrigir Políticas RLS
-- ============================================================================
-- Descrição: Remove políticas permissivas de teste e cria políticas granulares
--            seguindo arquitetura: vendedores veem apenas seus dados,
--            backoffice vê tudo, service_role bypassa RLS
-- Data: 2025-01-16
-- IMPORTANTE: Esta migration remove políticas existentes. Revisar antes de aplicar!
-- ============================================================================

-- ============================================================================
-- 1. REMOVER POLÍTICAS DE TESTE E PERMISSIVAS
-- ============================================================================

-- Remover políticas com nomes de teste
DROP POLICY IF EXISTS "teste" ON public.cliente;
DROP POLICY IF EXISTS "test" ON public.cliente;
DROP POLICY IF EXISTS "trete" ON public.cliente;
DROP POLICY IF EXISTS "trtrt" ON public.cliente_contato;
DROP POLICY IF EXISTS "trtr" ON public.cliente_endereço;
DROP POLICY IF EXISTS "Test" ON public.cliente_vendedores;
DROP POLICY IF EXISTS "TEST" ON public.condições_cliente;
DROP POLICY IF EXISTS "Teste" ON public.contatos_associados;
DROP POLICY IF EXISTS "Teste" ON public.dados_comissao;
DROP POLICY IF EXISTS "teste" ON public.dados_vendedor;
DROP POLICY IF EXISTS "teste" ON public.detalhes_pedido_venda;
DROP POLICY IF EXISTS "teste" ON public.listas_preco;
DROP POLICY IF EXISTS "true" ON public.listas_preco_comissionamento;
DROP POLICY IF EXISTS "true" ON public.marcas;
DROP POLICY IF EXISTS "true" ON public.natureza_operacao;
DROP POLICY IF EXISTS "tes" ON public.pedido_venda;
DROP POLICY IF EXISTS "test" ON public.pedido_venda_produtos;
DROP POLICY IF EXISTS "test" ON public.produto;
DROP POLICY IF EXISTS "test" ON public.produto_vendedor;
DROP POLICY IF EXISTS "teste" ON public.produtos_listas_precos;
DROP POLICY IF EXISTS "test" ON public.ref_empresas_subsidiarias;
DROP POLICY IF EXISTS "test" ON public.ref_forma_pagamento;
DROP POLICY IF EXISTS "ler" ON public.ref_origem_produto;
DROP POLICY IF EXISTS "test" ON public.ref_permissão_produto;
DROP POLICY IF EXISTS "test" ON public.ref_tipo_pessoa;
DROP POLICY IF EXISTS "true" ON public.ref_tipo_produto;
DROP POLICY IF EXISTS "teste" ON public.user;
DROP POLICY IF EXISTS "test" ON public.vendedor_comissão;
DROP POLICY IF EXISTS "true" ON public.vendedor_comissão;
DROP POLICY IF EXISTS "teste" ON public.vendedores_cliente;

-- Remover políticas allow_all muito permissivas (serão substituídas)
-- NOTA: Manter temporariamente para não quebrar o sistema
-- Serão substituídas pelas políticas granulares abaixo

-- ============================================================================
-- 2. HABILITAR RLS EM TABELAS FALTANTES
-- ============================================================================

ALTER TABLE public.metas_vendedor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_situacao ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. POLÍTICAS PARA TABELA: user
-- ============================================================================

-- SELECT: Usuários podem ver seu próprio perfil e backoffice vê todos
DROP POLICY IF EXISTS "users_select_own_or_backoffice" ON public.user;
CREATE POLICY "users_select_own_or_backoffice"
  ON public.user
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()  -- Próprio perfil
    OR EXISTS (
      SELECT 1 FROM public.user
      WHERE id = auth.uid()
      AND tipo = 'backoffice'
    )  -- Backoffice vê todos
  );

-- UPDATE: Usuários podem atualizar apenas seu próprio perfil
DROP POLICY IF EXISTS "users_update_own" ON public.user;
CREATE POLICY "users_update_own"
  ON public.user
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- INSERT: Apenas backoffice pode criar usuários
DROP POLICY IF EXISTS "users_insert_backoffice" ON public.user;
CREATE POLICY "users_insert_backoffice"
  ON public.user
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user
      WHERE id = auth.uid()
      AND tipo = 'backoffice'
    )
  );

-- Service role bypassa RLS
DROP POLICY IF EXISTS "service_role_bypass_user" ON public.user;
CREATE POLICY "service_role_bypass_user"
  ON public.user
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 4. POLÍTICAS PARA TABELA: dados_vendedor
-- ============================================================================

-- SELECT: Vendedores veem apenas seus dados, backoffice vê todos
DROP POLICY IF EXISTS "vendedores_select_own_or_backoffice" ON public.dados_vendedor;
CREATE POLICY "vendedores_select_own_or_backoffice"
  ON public.dados_vendedor
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()  -- Próprios dados
    OR EXISTS (
      SELECT 1 FROM public.user
      WHERE id = auth.uid()
      AND tipo = 'backoffice'
    )  -- Backoffice vê todos
    AND (deleted_at IS NULL)
  );

-- UPDATE: Vendedores atualizam apenas seus dados, backoffice atualiza todos
DROP POLICY IF EXISTS "vendedores_update_own_or_backoffice" ON public.dados_vendedor;
CREATE POLICY "vendedores_update_own_or_backoffice"
  ON public.dados_vendedor
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user
      WHERE id = auth.uid()
      AND tipo = 'backoffice'
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user
      WHERE id = auth.uid()
      AND tipo = 'backoffice'
    )
  );

-- INSERT: Apenas backoffice pode criar vendedores
DROP POLICY IF EXISTS "vendedores_insert_backoffice" ON public.dados_vendedor;
CREATE POLICY "vendedores_insert_backoffice"
  ON public.dados_vendedor
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user
      WHERE id = auth.uid()
      AND tipo = 'backoffice'
    )
  );

-- Service role bypassa RLS
DROP POLICY IF EXISTS "service_role_bypass_vendedor" ON public.dados_vendedor;
CREATE POLICY "service_role_bypass_vendedor"
  ON public.dados_vendedor
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 5. POLÍTICAS PARA TABELA: cliente
-- ============================================================================

-- SELECT: Vendedores veem apenas clientes atribuídos, backoffice vê todos
DROP POLICY IF EXISTS "clientes_select_assigned_or_backoffice" ON public.cliente;
CREATE POLICY "clientes_select_assigned_or_backoffice"
  ON public.cliente
  FOR SELECT
  TO authenticated
  USING (
    -- Backoffice vê todos
    EXISTS (
      SELECT 1 FROM public.user
      WHERE id = auth.uid()
      AND tipo = 'backoffice'
    )
    OR
    -- Vendedor vê apenas clientes atribuídos
    EXISTS (
      SELECT 1 FROM public.cliente_vendedores
      WHERE cliente_id = cliente.cliente_id
      AND vendedor_id = auth.uid()
    )
    OR
    -- Cliente criado pelo próprio vendedor (pendente de aprovação)
    (criado_por = auth.uid() AND status_aprovacao = 'pendente')
    AND (deleted_at IS NULL)
  );

-- UPDATE: Vendedores atualizam apenas clientes atribuídos, backoffice atualiza todos
DROP POLICY IF EXISTS "clientes_update_assigned_or_backoffice" ON public.cliente;
CREATE POLICY "clientes_update_assigned_or_backoffice"
  ON public.cliente
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user
      WHERE id = auth.uid()
      AND tipo = 'backoffice'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.cliente_vendedores
      WHERE cliente_id = cliente.cliente_id
      AND vendedor_id = auth.uid()
    )
    OR
    (criado_por = auth.uid() AND status_aprovacao = 'pendente')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user
      WHERE id = auth.uid()
      AND tipo = 'backoffice'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.cliente_vendedores
      WHERE cliente_id = cliente.cliente_id
      AND vendedor_id = auth.uid()
    )
    OR
    (criado_por = auth.uid() AND status_aprovacao = 'pendente')
  );

-- INSERT: Vendedores podem criar clientes (pendentes de aprovação), backoffice cria aprovados
DROP POLICY IF EXISTS "clientes_insert_vendedor_or_backoffice" ON public.cliente;
CREATE POLICY "clientes_insert_vendedor_or_backoffice"
  ON public.cliente
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Backoffice pode criar aprovados
    (
      EXISTS (
        SELECT 1 FROM public.user
        WHERE id = auth.uid()
        AND tipo = 'backoffice'
      )
      AND status_aprovacao IN ('aprovado', 'pendente')
    )
    OR
    -- Vendedor cria apenas pendentes
    (
      status_aprovacao = 'pendente'
      AND criado_por = auth.uid()
    )
  );

-- Service role bypassa RLS
DROP POLICY IF EXISTS "service_role_bypass_cliente" ON public.cliente;
CREATE POLICY "service_role_bypass_cliente"
  ON public.cliente
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 6. POLÍTICAS PARA TABELA: pedido_venda
-- ============================================================================

-- SELECT: Vendedores veem apenas seus pedidos, backoffice vê todos
DROP POLICY IF EXISTS "pedidos_select_own_or_backoffice" ON public.pedido_venda;
CREATE POLICY "pedidos_select_own_or_backoffice"
  ON public.pedido_venda
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user
      WHERE id = auth.uid()
      AND tipo = 'backoffice'
    )
    OR
    vendedor_uuid = auth.uid()
    AND (deleted_at IS NULL)
  );

-- UPDATE: Vendedores atualizam apenas seus pedidos, backoffice atualiza todos
DROP POLICY IF EXISTS "pedidos_update_own_or_backoffice" ON public.pedido_venda;
CREATE POLICY "pedidos_update_own_or_backoffice"
  ON public.pedido_venda
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user
      WHERE id = auth.uid()
      AND tipo = 'backoffice'
    )
    OR
    vendedor_uuid = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user
      WHERE id = auth.uid()
      AND tipo = 'backoffice'
    )
    OR
    vendedor_uuid = auth.uid()
  );

-- INSERT: Vendedores criam pedidos para si, backoffice pode criar para qualquer vendedor
DROP POLICY IF EXISTS "pedidos_insert_own_or_backoffice" ON public.pedido_venda;
CREATE POLICY "pedidos_insert_own_or_backoffice"
  ON public.pedido_venda
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user
      WHERE id = auth.uid()
      AND tipo = 'backoffice'
    )
    OR
    vendedor_uuid = auth.uid()
  );

-- Service role bypassa RLS
DROP POLICY IF EXISTS "service_role_bypass_pedido" ON public.pedido_venda;
CREATE POLICY "service_role_bypass_pedido"
  ON public.pedido_venda
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 7. POLÍTICAS PARA TABELA: produto
-- ============================================================================

-- SELECT: Todos os usuários autenticados podem ver produtos disponíveis
DROP POLICY IF EXISTS "produtos_select_available" ON public.produto;
CREATE POLICY "produtos_select_available"
  ON public.produto
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      disponivel = TRUE  -- Vendedores veem apenas disponíveis
      OR EXISTS (
        SELECT 1 FROM public.user
        WHERE id = auth.uid()
        AND tipo = 'backoffice'
      )  -- Backoffice vê todos
    )
  );

-- UPDATE/INSERT/DELETE: Apenas backoffice
DROP POLICY IF EXISTS "produtos_modify_backoffice" ON public.produto;
CREATE POLICY "produtos_modify_backoffice"
  ON public.produto
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user
      WHERE id = auth.uid()
      AND tipo = 'backoffice'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user
      WHERE id = auth.uid()
      AND tipo = 'backoffice'
    )
  );

-- Service role bypassa RLS
DROP POLICY IF EXISTS "service_role_bypass_produto" ON public.produto;
CREATE POLICY "service_role_bypass_produto"
  ON public.produto
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 8. POLÍTICAS PARA TABELA: vendedor_comissão
-- ============================================================================

-- SELECT: Vendedores veem apenas suas comissões, backoffice vê todas
DROP POLICY IF EXISTS "comissoes_select_own_or_backoffice" ON public.vendedor_comissão;
CREATE POLICY "comissoes_select_own_or_backoffice"
  ON public.vendedor_comissão
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user
      WHERE id = auth.uid()
      AND tipo = 'backoffice'
    )
    OR
    vendedor_uuid = auth.uid()
  );

-- UPDATE/INSERT: Apenas backoffice
DROP POLICY IF EXISTS "comissoes_modify_backoffice" ON public.vendedor_comissão;
CREATE POLICY "comissoes_modify_backoffice"
  ON public.vendedor_comissão
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user
      WHERE id = auth.uid()
      AND tipo = 'backoffice'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user
      WHERE id = auth.uid()
      AND tipo = 'backoffice'
    )
  );

-- Service role bypassa RLS
DROP POLICY IF EXISTS "service_role_bypass_comissao" ON public.vendedor_comissão;
CREATE POLICY "service_role_bypass_comissao"
  ON public.vendedor_comissão
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 9. POLÍTICAS PARA TABELA: metas_vendedor
-- ============================================================================

-- SELECT: Vendedores veem apenas suas metas, backoffice vê todas
DROP POLICY IF EXISTS "metas_select_own_or_backoffice" ON public.metas_vendedor;
CREATE POLICY "metas_select_own_or_backoffice"
  ON public.metas_vendedor
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user
      WHERE id = auth.uid()
      AND tipo = 'backoffice'
    )
    OR
    vendedor_id = auth.uid()
  );

-- UPDATE/INSERT/DELETE: Apenas backoffice
DROP POLICY IF EXISTS "metas_modify_backoffice" ON public.metas_vendedor;
CREATE POLICY "metas_modify_backoffice"
  ON public.metas_vendedor
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user
      WHERE id = auth.uid()
      AND tipo = 'backoffice'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user
      WHERE id = auth.uid()
      AND tipo = 'backoffice'
    )
  );

-- Service role bypassa RLS
DROP POLICY IF EXISTS "service_role_bypass_metas" ON public.metas_vendedor;
CREATE POLICY "service_role_bypass_metas"
  ON public.metas_vendedor
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 10. POLÍTICAS PARA TABELAS RELACIONADAS (cliente_contato, cliente_endereço, etc.)
-- ============================================================================

-- Aplicar mesma lógica de cliente para tabelas relacionadas
-- (vendedores veem apenas de clientes atribuídos, backoffice vê todos)

-- cliente_contato
DROP POLICY IF EXISTS "cliente_contato_select_assigned_or_backoffice" ON public.cliente_contato;
CREATE POLICY "cliente_contato_select_assigned_or_backoffice"
  ON public.cliente_contato
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user
      WHERE id = auth.uid()
      AND tipo = 'backoffice'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.cliente_vendedores
      WHERE cliente_id = cliente_contato.cliente_id
      AND vendedor_id = auth.uid()
    )
  );

-- cliente_endereço
DROP POLICY IF EXISTS "cliente_endereco_select_assigned_or_backoffice" ON public.cliente_endereço;
CREATE POLICY "cliente_endereco_select_assigned_or_backoffice"
  ON public.cliente_endereço
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user
      WHERE id = auth.uid()
      AND tipo = 'backoffice'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.cliente_vendedores
      WHERE cliente_id = cliente_endereço.cliente_id
      AND vendedor_id = auth.uid()
    )
  );

-- pedido_venda_produtos (herda permissões do pedido_venda)
DROP POLICY IF EXISTS "pedido_produtos_select_own_or_backoffice" ON public.pedido_venda_produtos;
CREATE POLICY "pedido_produtos_select_own_or_backoffice"
  ON public.pedido_venda_produtos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user
      WHERE id = auth.uid()
      AND tipo = 'backoffice'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.pedido_venda
      WHERE pedido_venda_ID = pedido_venda_produtos.pedido_venda_id
      AND vendedor_uuid = auth.uid()
    )
  );

-- ============================================================================
-- NOTA IMPORTANTE
-- ============================================================================
-- As políticas "allow_all" antigas foram mantidas temporariamente para não
-- quebrar o sistema. Elas devem ser removidas manualmente após validar que
-- as novas políticas estão funcionando corretamente.
--
-- Para remover as políticas antigas, execute:
-- DROP POLICY IF EXISTS "allow_all" ON public.<tabela>;
--
-- Tabelas com políticas "allow_all" que devem ser removidas:
-- - cliente, cliente_contato, cliente_endereço, cliente_vendedores
-- - pedido_venda, pedido_venda_produtos
-- - produto, produtos_listas_precos
-- - dados_vendedor, user
-- - E outras conforme necessário

