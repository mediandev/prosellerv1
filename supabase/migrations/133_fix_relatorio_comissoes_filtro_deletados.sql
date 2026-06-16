-- Migration 133: Fix get_relatorio_comissoes_v2 — exibindo usuários soft-deletados
-- ============================================================================
-- Bug: a CTE vendedores_ativos em get_relatorio_comissoes_v2 (migration 084)
--      não filtrava deleted_at IS NULL nem ativo = TRUE. Resultado: usuários
--      soft-deletados continuavam aparecendo na tela de Gestão de Comissões
--      com 0 vendas / R$ 0,00, poluindo a listagem.
-- Fix: adicionar AND u.ativo = TRUE AND u.deleted_at IS NULL na CTE.
-- Data: 2026-06-16
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_relatorio_comissoes_v2(
    p_periodo text,
    p_vendedor_uuid uuid DEFAULT NULL
)
RETURNS TABLE (
    vendedor_id uuid,
    vendedor_nome text,
    periodo text,
    total_vendas numeric,
    total_comissao numeric,
    total_creditos numeric,
    total_debitos numeric,
    total_pagos numeric,
    saldo_anterior numeric,
    saldo_final numeric,
    status text,
    data_fechamento timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH vendas_agrupadas AS (
        SELECT
            vc.vendedor_uuid,
            COALESCE(SUM(vc.valor_total), 0) as total_vendas,
            COALESCE(SUM(vc.valor_comissao), 0) as total_comissao
        FROM public.vendedor_comissão vc
        WHERE vc.periodo = p_periodo
        GROUP BY vc.vendedor_uuid
    ),
    lancamentos_agrupados AS (
        SELECT
            lc.vendedor_uuid,
            COALESCE(SUM(CASE WHEN lc.tipo = 'credito' THEN lc.valor ELSE 0 END), 0) as total_creditos,
            COALESCE(SUM(CASE WHEN lc.tipo = 'debito' THEN lc.valor ELSE 0 END), 0) as total_debitos
        FROM public.lancamentos_comissao lc
        WHERE lc.periodo = p_periodo
        GROUP BY lc.vendedor_uuid
    ),
    pagamentos_agrupados AS (
        SELECT
            pc.vendedor_uuid,
            COALESCE(SUM(pc.valor), 0) as total_pagos
        FROM public.pagamentos_comissao pc
        WHERE pc.periodo = p_periodo
        GROUP BY pc.vendedor_uuid
    ),
    controle_periodo AS (
        SELECT
            cp.vendedor_uuid,
            cp.status,
            cp.saldo_anterior,
            cp.saldo_final,
            cp.data_fechamento
        FROM public.controle_comissao_periodo cp
        WHERE cp.periodo = p_periodo
    ),
    vendedores_ativos AS (
        SELECT u.user_id, u.nome
        FROM public."user" u
        WHERE u.tipo = 'vendedor'
          AND u.ativo = TRUE
          AND u.deleted_at IS NULL
          AND (p_vendedor_uuid IS NULL OR u.user_id = p_vendedor_uuid)
    )
    SELECT
        v.user_id as vendedor_id,
        v.nome as vendedor_nome,
        p_periodo as periodo,
        COALESCE(va.total_vendas, 0) as total_vendas,
        COALESCE(va.total_comissao, 0) as total_comissao,
        COALESCE(la.total_creditos, 0) as total_creditos,
        COALESCE(la.total_debitos, 0) as total_debitos,
        COALESCE(pa.total_pagos, 0) as total_pagos,
        COALESCE(cp.saldo_anterior, 0) as saldo_anterior,
        CASE
            WHEN cp.status = 'fechado' OR cp.status = 'pago' THEN cp.saldo_final
            ELSE (COALESCE(cp.saldo_anterior, 0) + COALESCE(va.total_comissao, 0) + COALESCE(la.total_creditos, 0) - COALESCE(la.total_debitos, 0) - COALESCE(pa.total_pagos, 0))
        END as saldo_final,
        COALESCE(cp.status, 'aberto') as status,
        cp.data_fechamento
    FROM vendedores_ativos v
    LEFT JOIN vendas_agrupadas va ON va.vendedor_uuid = v.user_id
    LEFT JOIN lancamentos_agrupados la ON la.vendedor_uuid = v.user_id
    LEFT JOIN pagamentos_agrupados pa ON pa.vendedor_uuid = v.user_id
    LEFT JOIN controle_periodo cp ON cp.vendedor_uuid = v.user_id;
END;
$$;
