-- ============================================================================
-- Migration 042: Políticas RLS para Metas de Vendedor
-- ============================================================================
-- Descrição: Garante que as políticas RLS estão corretas para a tabela metas_vendedor
--            Permitindo SELECT para vendedores (suas próprias metas) e backoffice (todas)
--            Permitindo INSERT/UPDATE/DELETE apenas para backoffice
-- Data: 2026-02-03
-- ============================================================================

-- Garantir que RLS está ativo
ALTER TABLE public.metas_vendedor ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas (evita duplicatas ao reaplicar)
DROP POLICY IF EXISTS "Authenticated can select metas_vendedor" ON public.metas_vendedor;
DROP POLICY IF EXISTS "Authenticated can insert metas_vendedor" ON public.metas_vendedor;
DROP POLICY IF EXISTS "Authenticated can update metas_vendedor" ON public.metas_vendedor;
DROP POLICY IF EXISTS "Authenticated can delete metas_vendedor" ON public.metas_vendedor;
DROP POLICY IF EXISTS "Service role full access metas_vendedor" ON public.metas_vendedor;

-- SELECT: Vendedores veem apenas suas metas, backoffice vê todas
-- (Mantém política existente se funcionar, senão cria nova)
DO $$
BEGIN
  -- Verificar se política já existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'metas_vendedor' 
    AND policyname = 'metas_select_own_or_backoffice'
  ) THEN
    CREATE POLICY "metas_select_own_or_backoffice"
      ON public.metas_vendedor
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user u
          WHERE u.user_id = auth.uid()
          AND u.tipo = 'backoffice'
          AND u.ativo = TRUE
          AND u.deleted_at IS NULL
        )
        OR
        vendedor_id = auth.uid()
      );
  END IF;
END $$;

-- INSERT: Apenas backoffice pode inserir
CREATE POLICY "Authenticated can insert metas_vendedor"
  ON public.metas_vendedor
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user u
      WHERE u.user_id = auth.uid()
      AND u.tipo = 'backoffice'
      AND u.ativo = TRUE
      AND u.deleted_at IS NULL
    )
  );

-- UPDATE: Apenas backoffice pode atualizar
CREATE POLICY "Authenticated can update metas_vendedor"
  ON public.metas_vendedor
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user u
      WHERE u.user_id = auth.uid()
      AND u.tipo = 'backoffice'
      AND u.ativo = TRUE
      AND u.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user u
      WHERE u.user_id = auth.uid()
      AND u.tipo = 'backoffice'
      AND u.ativo = TRUE
      AND u.deleted_at IS NULL
    )
  );

-- DELETE: Apenas backoffice pode excluir
CREATE POLICY "Authenticated can delete metas_vendedor"
  ON public.metas_vendedor
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user u
      WHERE u.user_id = auth.uid()
      AND u.tipo = 'backoffice'
      AND u.ativo = TRUE
      AND u.deleted_at IS NULL
    )
  );

-- Service role: acesso total
CREATE POLICY "Service role full access metas_vendedor"
  ON public.metas_vendedor
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "metas_select_own_or_backoffice" ON public.metas_vendedor IS 
'Permite que vendedores vejam apenas suas próprias metas e backoffice veja todas';

COMMENT ON POLICY "Authenticated can insert metas_vendedor" ON public.metas_vendedor IS 
'Permite que apenas usuários backoffice insiram metas';

COMMENT ON POLICY "Authenticated can update metas_vendedor" ON public.metas_vendedor IS 
'Permite que apenas usuários backoffice atualizem metas';

COMMENT ON POLICY "Authenticated can delete metas_vendedor" ON public.metas_vendedor IS 
'Permite que apenas usuários backoffice excluam metas';
