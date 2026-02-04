-- ============================================================================
-- Migration 068: RLS Policies para Conta Corrente
-- ============================================================================
-- Descrição: Adiciona políticas RLS para conta_corrente_cliente e 
--            pagamento_acordo_cliente
-- Data: 2026-02-03
-- ============================================================================

-- ============================================================================
-- RLS PARA conta_corrente_cliente
-- ============================================================================

-- Ativar RLS
ALTER TABLE public.conta_corrente_cliente ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated pode ver (backoffice vê tudo, vendedor vê apenas seus clientes via RPC)
-- Nota: A lógica de permissão é implementada nas funções RPC, então aqui permitimos
-- acesso geral para authenticated, mas as funções RPC filtram adequadamente
CREATE POLICY "conta_corrente_cliente_select_policy"
  ON public.conta_corrente_cliente
  FOR SELECT
  TO authenticated
  USING (true);

-- SELECT anônimo: não permitido
-- (não criamos política para anon, então acesso é negado por padrão)

-- INSERT: authenticated pode inserir
CREATE POLICY "conta_corrente_cliente_insert_policy"
  ON public.conta_corrente_cliente
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: authenticated pode atualizar
CREATE POLICY "conta_corrente_cliente_update_policy"
  ON public.conta_corrente_cliente
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE: authenticated pode excluir (se necessário no futuro)
-- Nota: A tabela não possui deleted_at, então DELETE físico não é recomendado
-- Mas deixamos a política caso seja necessário
CREATE POLICY "conta_corrente_cliente_delete_policy"
  ON public.conta_corrente_cliente
  FOR DELETE
  TO authenticated
  USING (true);

-- Service role: acesso total
CREATE POLICY "conta_corrente_cliente_service_role_access"
  ON public.conta_corrente_cliente
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- RLS PARA pagamento_acordo_cliente
-- ============================================================================

-- Ativar RLS
ALTER TABLE public.pagamento_acordo_cliente ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated pode ver
CREATE POLICY "pagamento_acordo_cliente_select_policy"
  ON public.pagamento_acordo_cliente
  FOR SELECT
  TO authenticated
  USING (true);

-- SELECT anônimo: não permitido
-- (não criamos política para anon, então acesso é negado por padrão)

-- INSERT: authenticated pode inserir
CREATE POLICY "pagamento_acordo_cliente_insert_policy"
  ON public.pagamento_acordo_cliente
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: authenticated pode atualizar
CREATE POLICY "pagamento_acordo_cliente_update_policy"
  ON public.pagamento_acordo_cliente
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE: authenticated pode excluir
CREATE POLICY "pagamento_acordo_cliente_delete_policy"
  ON public.pagamento_acordo_cliente
  FOR DELETE
  TO authenticated
  USING (true);

-- Service role: acesso total
CREATE POLICY "pagamento_acordo_cliente_service_role_access"
  ON public.pagamento_acordo_cliente
  TO service_role
  USING (true)
  WITH CHECK (true);
