-- 134_fix_get_preview_comissoes_casts.sql
-- Bug: comissoes-v2/preview retorna 500 "structure of query does not match function result type".
-- Causa: o resultado do RETURN QUERY de get_preview_comissoes não bate com o RETURNS TABLE
--        declarado (ex.: u.nome é varchar e não text, ou tipo numérico de valor_total difere) —
--        prod divergiu do baseline (122) ou um tipo de coluna mudou.
-- Fix: re-aplica a função com CASTS EXPLÍCITOS nas colunas de saída, garantindo que o tipo
--      retornado seja exatamente o declarado. Sem mudança de lógica/valores.

CREATE OR REPLACE FUNCTION public.get_preview_comissoes(p_periodo text, p_vendedor_uuid uuid DEFAULT NULL::uuid)
 RETURNS TABLE(vendedor_id uuid, vendedor_nome text, qtd_pedidos bigint, valor_total_pedidos numeric, comissao_estimada numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  BEGIN
      RETURN QUERY
      SELECT
          pv.vendedor_uuid::uuid                          as vendedor_id,
          u.nome::text                                     as vendedor_nome,
          COUNT(pv."pedido_venda_ID")::bigint              as qtd_pedidos,
          COALESCE(SUM(pv.valor_total), 0)::numeric        as valor_total_pedidos,
          COALESCE(SUM(
              ROUND(
                  pv.valor_total::numeric *
                  CASE
                      WHEN dv."Comissão" = 2 THEN COALESCE(dv.aliquotafixa, 0)
                      WHEN dv."Comissão" = 1 THEN COALESCE((
                          SELECT lpc.comissao
                          FROM public.listas_preco_comissionamento lpc
                          WHERE lpc.lista_preco_id = c.lista_de_preco::bigint
                            AND COALESCE(c.desconto, 0) BETWEEN lpc.desconto_minimo AND lpc.desconto_maximo
                          ORDER BY lpc.desconto_minimo ASC, lpc.id ASC
                          LIMIT 1
                      ), 0)
                      ELSE 0
                  END / 100
              , 2)
          ), 0)::numeric                                   as comissao_estimada
      FROM public.pedido_venda pv
      JOIN public."user" u ON u.user_id = pv.vendedor_uuid
      LEFT JOIN public.dados_vendedor dv ON dv.user_id = pv.vendedor_uuid
      LEFT JOIN public.cliente c ON c.cliente_id = pv.cliente_id
      WHERE pv.status IN ('Em aberto', 'Aprovado', 'Preparando envio', 'Pronto para envio', 'Enviado')
        AND pv.natureza_operacao IS DISTINCT FROM 'Bonificação'
        AND NOT EXISTS (
            SELECT 1 FROM public."vendedor_comissão" vc
            WHERE vc.pedido_id = pv."pedido_venda_ID"
        )
        AND (p_vendedor_uuid IS NULL OR pv.vendedor_uuid = p_vendedor_uuid)
      GROUP BY pv.vendedor_uuid, u.nome;
  END;
  $function$
;
