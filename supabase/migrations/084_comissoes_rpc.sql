-- ============================================================================
-- Migration 084: Funções RPC para Gestão de Comissões
-- ============================================================================
-- Descrição: 
-- Cria funções para o backend de gestão de comissões.
-- Data: 2026-02-06
-- ============================================================================

-- 1. Função para Obter Relatório de Comissões
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
        WHERE pc.periodo = p_periodo -- Pagamentos referentes a este período
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
        FROM public."user" u -- Corrigido para "user" singular e entre aspas
        WHERE u.tipo = 'vendedor' 
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


-- 2. Função para Criar Lançamento Manual
CREATE OR REPLACE FUNCTION public.create_lancamento_comissao_v2(
    p_vendedor_uuid uuid,
    p_tipo text,
    p_valor numeric,
    p_descricao text,
    p_periodo text,
    p_criado_por uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_lancamento_id bigint;
    v_status_periodo text;
BEGIN
    -- Verificar se o período está fechado
    SELECT status INTO v_status_periodo
    FROM public.controle_comissao_periodo
    WHERE vendedor_uuid = p_vendedor_uuid AND periodo = p_periodo;
    
    IF v_status_periodo IN ('fechado', 'pago') THEN
        RAISE EXCEPTION 'Não é possível adicionar lançamentos em um período fechado ou pago.';
    END IF;

    -- Inserir lançamento
    INSERT INTO public.lancamentos_comissao (
        vendedor_uuid,
        tipo,
        valor,
        descricao,
        periodo,
        criado_por
    ) VALUES (
        p_vendedor_uuid,
        p_tipo,
        p_valor,
        p_descricao,
        p_periodo,
        p_criado_por
    ) RETURNING id INTO v_lancamento_id;

    RETURN json_build_object('success', true, 'id', v_lancamento_id);
END;
$$;


-- 3. Função para Registrar Pagamento
CREATE OR REPLACE FUNCTION public.create_pagamento_comissao_v2(
    p_vendedor_uuid uuid,
    p_valor numeric,
    p_periodo text,
    p_forma_pagamento text,
    p_comprovante_url text,
    p_observacoes text,
    p_realizado_por uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pagamento_id bigint;
BEGIN
    -- Inserir pagamento
    INSERT INTO public.pagamentos_comissao (
        vendedor_uuid,
        data_pagamento,
        valor,
        periodo,
        forma_pagamento,
        comprovante_url,
        observacoes,
        realizado_por
    ) VALUES (
        p_vendedor_uuid,
        CURRENT_DATE,
        p_valor,
        p_periodo,
        p_forma_pagamento,
        p_comprovante_url,
        p_observacoes,
        p_realizado_por
    ) RETURNING id INTO v_pagamento_id;

    -- Atualizar status do período se saldo for totalmente pago (Lógica simplificada, pode ser expandida)
    -- Por enquanto apenas registra o pagamento

    RETURN json_build_object('success', true, 'id', v_pagamento_id);
END;
$$;


-- 4. Função para Fechar Período
CREATE OR REPLACE FUNCTION public.fechar_periodo_comissao_v2(
    p_vendedor_uuid uuid,
    p_periodo text,
    p_fechado_por uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_saldo_anterior numeric := 0;
    v_total_comissao numeric := 0;
    v_total_creditos numeric := 0;
    v_total_debitos numeric := 0;
    v_total_pagos numeric := 0;
    v_saldo_final numeric := 0;
    v_existente_id bigint;
    v_proximo_periodo text;
    v_ano int;
    v_mes int;
BEGIN
    -- Calcular totais
    SELECT COALESCE(SUM(valor_comissao), 0) INTO v_total_comissao
    FROM public.vendedor_comissão
    WHERE vendedor_uuid = p_vendedor_uuid AND periodo = p_periodo;

    SELECT 
        COALESCE(SUM(CASE WHEN tipo = 'credito' THEN valor ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tipo = 'debito' THEN valor ELSE 0 END), 0)
    INTO v_total_creditos, v_total_debitos
    FROM public.lancamentos_comissao
    WHERE vendedor_uuid = p_vendedor_uuid AND periodo = p_periodo;

    SELECT COALESCE(SUM(valor), 0) INTO v_total_pagos
    FROM public.pagamentos_comissao
    WHERE vendedor_uuid = p_vendedor_uuid AND periodo = p_periodo;

    -- Obter saldo anterior do controle (se existir)
    SELECT saldo_anterior INTO v_saldo_anterior
    FROM public.controle_comissao_periodo
    WHERE vendedor_uuid = p_vendedor_uuid AND periodo = p_periodo;
    
    -- Se não tem registro de controle, buscar do mês anterior (recursivo ou saldo inicial 0)
    IF v_saldo_anterior IS NULL THEN
        v_saldo_anterior := 0; 
        -- PODE-SE IMPLEMENTAR LOGICA DE BUSCAR MES ANTERIOR AQUI
    END IF;

    -- Calcular Saldo Final
    v_saldo_final := v_saldo_anterior + v_total_comissao + v_total_creditos - v_total_debitos - v_total_pagos;

    -- Upsert no controle de período
    INSERT INTO public.controle_comissao_periodo (
        vendedor_uuid,
        periodo,
        status,
        saldo_anterior,
        saldo_final,
        data_fechamento,
        fechado_por
    ) VALUES (
        p_vendedor_uuid,
        p_periodo,
        'fechado',
        v_saldo_anterior,
        v_saldo_final,
        NOW(),
        p_fechado_por
    ) ON CONFLICT (vendedor_uuid, periodo) DO UPDATE SET
        status = 'fechado',
        saldo_final = EXCLUDED.saldo_final,
        data_fechamento = NOW(),
        fechado_por = EXCLUDED.fechado_por;

    -- Criar registro para o próximo mês com saldo anterior = saldo final deste mês
    v_ano := CAST(SPLIT_PART(p_periodo, '-', 1) AS INT);
    v_mes := CAST(SPLIT_PART(p_periodo, '-', 2) AS INT);
    
    IF v_mes = 12 THEN
        v_ano := v_ano + 1;
        v_mes := 1;
    ELSE
        v_mes := v_mes + 1;
    END IF;
    
    v_proximo_periodo := TO_CHAR(v_ano, 'FM0000') || '-' || TO_CHAR(v_mes, 'FM00');

    INSERT INTO public.controle_comissao_periodo (
        vendedor_uuid,
        periodo,
        status,
        saldo_anterior
    ) VALUES (
        p_vendedor_uuid,
        v_proximo_periodo,
        'aberto',
        v_saldo_final
    ) ON CONFLICT (vendedor_uuid, periodo) DO UPDATE SET
        saldo_anterior = EXCLUDED.saldo_anterior;

    RETURN json_build_object('success', true, 'saldo_final', v_saldo_final, 'proximo_periodo', v_proximo_periodo);
END;
$$;
