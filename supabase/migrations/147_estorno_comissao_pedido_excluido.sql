-- Migration 147: estorno automático de comissão quando o pedido é excluído.
-- Decisões do cliente (2026-07-31):
--   (a) vendedor sem período aberto  -> lançar débito no MÊS CORRENTE;
--   (b) período ainda aberto         -> APAGAR a linha de comissão;
--   (c) pedido restaurado depois     -> NÃO reverter automaticamente.
-- Regras derivadas:
--   - Período sem registro em controle_comissao_periodo = nunca fechado = ABERTO.
--   - Período FECHADO: a linha de comissão permanece (histórico do fechamento);
--     o estorno entra como lançamento de DÉBITO (saldo = ... + créditos − débitos)
--     no período aberto mais recente do vendedor (ou mês corrente).
--   - Valor 0 em período fechado: nada a estornar (débito de R$ 0 seria ruído).
-- Complementa a migration 143 (que impede GERAR comissão nova em pedido excluído).

CREATE OR REPLACE FUNCTION public.tg_estorno_comissao_pedido_excluido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_com record;
  v_status text;
  v_periodo_destino text;
BEGIN
  FOR v_com IN
    SELECT vc.vendedor_comissao_id,
           vc.vendedor_uuid,
           vc.periodo,
           COALESCE(vc.valor_comissao, 0) AS valor
      FROM public."vendedor_comissão" vc
     WHERE vc.pedido_id = NEW."pedido_venda_ID"
  LOOP
    -- Status do período da comissão (sem registro = nunca fechado = aberto)
    SELECT cp.status
      INTO v_status
      FROM public.controle_comissao_periodo cp
     WHERE cp.vendedor_uuid = v_com.vendedor_uuid
       AND cp.periodo = v_com.periodo;

    IF v_status IS DISTINCT FROM 'fechado' THEN
      -- (b) período aberto: estornar = remover a comissão da apuração
      DELETE FROM public."vendedor_comissão"
       WHERE vendedor_comissao_id = v_com.vendedor_comissao_id;

    ELSIF v_com.valor > 0 THEN
      -- período fechado: débito no período aberto mais recente do vendedor…
      SELECT max(cp.periodo)
        INTO v_periodo_destino
        FROM public.controle_comissao_periodo cp
       WHERE cp.vendedor_uuid = v_com.vendedor_uuid
         AND cp.status = 'aberto';

      -- …ou, sem período aberto, no mês corrente (a)
      v_periodo_destino := COALESCE(v_periodo_destino, to_char(current_date, 'YYYY-MM'));

      INSERT INTO public.lancamentos_comissao
        (vendedor_uuid, data_lancamento, tipo, valor, descricao, periodo)
      VALUES
        (v_com.vendedor_uuid,
         current_date,
         'debito',
         v_com.valor,
         format('Estorno automático — pedido %s excluído (comissão de %s, período já fechado)',
                COALESCE(NEW.numero_pedido, NEW."pedido_venda_ID"::text),
                v_com.periodo),
         v_periodo_destino);
    END IF;
  END LOOP;

  -- (c) restauração do pedido não é tratada aqui de propósito.
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_estorno_comissao_on_delete ON public.pedido_venda;

CREATE TRIGGER trg_estorno_comissao_on_delete
AFTER UPDATE OF deleted_at ON public.pedido_venda
FOR EACH ROW
WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
EXECUTE FUNCTION public.tg_estorno_comissao_pedido_excluido();
