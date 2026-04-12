-- Fix: vendedor assigned via cliente.vendedoresatribuidos could read cliente
-- but not cliente_endereco because policy only checked cliente_vendedores table.
-- This aligns endereco SELECT policy with access rules used in RPCs.

DROP POLICY IF EXISTS "cliente_endereco_select_assigned_or_backoffice" ON public."cliente_endereço";

CREATE POLICY "cliente_endereco_select_assigned_or_backoffice"
  ON public."cliente_endereço"
  FOR SELECT
  TO authenticated
  USING (
    is_user_backoffice(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.cliente c
      WHERE c.cliente_id = "cliente_endereço".cliente_id
        AND c.deleted_at IS NULL
        AND (
          auth.uid() = ANY(c.vendedoresatribuidos)
          OR (c.criado_por = auth.uid() AND c.status_aprovacao = 'pendente')
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.cliente_vendedores cv
      WHERE cv.cliente_id = "cliente_endereço".cliente_id
        AND cv.vendedor_id = auth.uid()
    )
  );

