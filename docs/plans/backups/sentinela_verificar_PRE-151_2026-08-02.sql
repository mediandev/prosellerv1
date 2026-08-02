CREATE OR REPLACE FUNCTION public.sentinela_verificar()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_novos integer := 0;
  v_cnt integer;
BEGIN
  -- ===== Regra 1: comissão de pedido excluído (invariante da migration 143/147) =====
  INSERT INTO sentinela_alerta (regra, chave, detalhe)
  SELECT 'comissao_pedido_excluido',
         'comissao_pedido_excluido:' || vc.vendedor_comissao_id,
         jsonb_build_object('pedido_id', vc.pedido_id, 'valor', vc.valor_comissao)
    FROM "vendedor_comissão" vc
    JOIN pedido_venda p ON p."pedido_venda_ID" = vc.pedido_id
   WHERE p.deleted_at IS NOT NULL AND vc.valor_comissao > 0
  ON CONFLICT (chave) WHERE resolvido_em IS NULL DO NOTHING;
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_novos := v_novos + v_cnt;

  UPDATE sentinela_alerta a SET resolvido_em = now()
   WHERE a.resolvido_em IS NULL AND a.regra = 'comissao_pedido_excluido'
     AND NOT EXISTS (
       SELECT 1 FROM "vendedor_comissão" vc
       JOIN pedido_venda p ON p."pedido_venda_ID" = vc.pedido_id
       WHERE p.deleted_at IS NOT NULL AND vc.valor_comissao > 0
         AND a.chave = 'comissao_pedido_excluido:' || vc.vendedor_comissao_id);

  -- ===== Regra 2: pedido "enviado" sem confirmação do Tiny (invariante V1.71) =====
  INSERT INTO sentinela_alerta (regra, chave, detalhe)
  SELECT 'pedido_aberto_sem_tiny',
         'pedido_aberto_sem_tiny:' || p."pedido_venda_ID",
         jsonb_build_object('numero', p.numero_pedido, 'status', p.status)
    FROM pedido_venda p
   WHERE p.status IN ('Em aberto', 'Enviado') AND p.id_tiny IS NULL AND p.deleted_at IS NULL
  ON CONFLICT (chave) WHERE resolvido_em IS NULL DO NOTHING;
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_novos := v_novos + v_cnt;

  UPDATE sentinela_alerta a SET resolvido_em = now()
   WHERE a.resolvido_em IS NULL AND a.regra = 'pedido_aberto_sem_tiny'
     AND NOT EXISTS (
       SELECT 1 FROM pedido_venda p
       WHERE p.status IN ('Em aberto','Enviado') AND p.id_tiny IS NULL AND p.deleted_at IS NULL
         AND a.chave = 'pedido_aberto_sem_tiny:' || p."pedido_venda_ID");

  -- ===== Regra 3: frete com entrega registrada preso em status não-terminal (invariante sticky) =====
  INSERT INTO sentinela_alerta (regra, chave, detalhe)
  SELECT 'frete_entregue_preso',
         'frete_entregue_preso:' || f.id,
         jsonb_build_object('nfe', f.nfe_numero, 'status', f.status_entrega)
    FROM frete_logistica f
   WHERE f.status_entrega NOT IN ('Entregue', 'Devolvido - Entregue') AND f.deleted_at IS NULL
     AND EXISTS (SELECT 1 FROM frete_logistica_ocorrencia o
                  WHERE o.frete_id = f.id AND o.descricao_ocorrencia ILIKE '%MERCADORIA ENTREGUE%')
  ON CONFLICT (chave) WHERE resolvido_em IS NULL DO NOTHING;
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_novos := v_novos + v_cnt;

  UPDATE sentinela_alerta a SET resolvido_em = now()
   WHERE a.resolvido_em IS NULL AND a.regra = 'frete_entregue_preso'
     AND NOT EXISTS (
       SELECT 1 FROM frete_logistica f
       WHERE f.status_entrega NOT IN ('Entregue','Devolvido - Entregue') AND f.deleted_at IS NULL
         AND EXISTS (SELECT 1 FROM frete_logistica_ocorrencia o
                      WHERE o.frete_id = f.id AND o.descricao_ocorrencia ILIKE '%MERCADORIA ENTREGUE%')
         AND a.chave = 'frete_entregue_preso:' || f.id);

  -- ===== Regra 4: CEP fora do padrão (invariante migration 146: só dígitos, 8 posições) =====
  INSERT INTO sentinela_alerta (regra, chave, detalhe)
  SELECT 'cep_invalido',
         'cep_invalido:' || e.cliente_id,
         jsonb_build_object('cep', e.cep)
    FROM "cliente_endereço" e
   WHERE e.cep IS NOT NULL AND (e.cep ~ '\D' OR length(e.cep) <> 8)
  ON CONFLICT (chave) WHERE resolvido_em IS NULL DO NOTHING;
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_novos := v_novos + v_cnt;

  UPDATE sentinela_alerta a SET resolvido_em = now()
   WHERE a.resolvido_em IS NULL AND a.regra = 'cep_invalido'
     AND NOT EXISTS (
       SELECT 1 FROM "cliente_endereço" e
       WHERE e.cep IS NOT NULL AND (e.cep ~ '\D' OR length(e.cep) <> 8)
         AND a.chave = 'cep_invalido:' || e.cliente_id);

  -- ===== Regra 5 (GENERALIZADA na migration 150): campo de cliente apagado e ainda vazio =====
  -- Substitui `wipe_observacao`. Cobre `cliente`, `cliente_contato` e `cliente_endereço`.
  -- Janela de 26h (cron diário + folga). Confirma contra a base ANTES de alertar.
  INSERT INTO sentinela_alerta (regra, chave, detalhe)
  SELECT DISTINCT ON (w.cliente_id, w.campo)
         'wipe_campo_cliente',
         'wipe_campo_cliente:' || w.cliente_id || ':' || w.campo,
         jsonb_build_object(
           'cliente_id', w.cliente_id,
           'campo', w.campo,
           'label', w.label,
           'valor_anterior', w.valor_anterior,
           'quando', w.quando,
           'usuario', w.usuario)
    FROM (
      SELECT h.cliente_id,
             e->>'campo'  AS campo,
             e->>'label'  AS label,
             e->>'valorAnterior' AS valor_anterior,
             h.data_hora  AS quando,
             h.usuario_nome AS usuario,
             CASE WHEN position('.' IN e->>'campo') > 0
                  THEN split_part(e->>'campo', '.', 1)
                  ELSE 'cliente' END AS tabela,
             CASE WHEN position('.' IN e->>'campo') > 0
                  THEN split_part(e->>'campo', '.', 2)
                  ELSE e->>'campo' END AS coluna
        FROM cliente_historico_alteracoes h,
             LATERAL jsonb_array_elements(h.campos_alterados) e
       WHERE h.data_hora > now() - interval '26 hours'
         AND COALESCE(e->>'valorNovo', '') = ''
         AND COALESCE(e->>'valorAnterior', '') <> ''
         -- chaves técnicas: mudam por reinserção, não são perda de dado do usuário
         AND e->>'campo' NOT IN (
               'condições_cliente.id', 'condições_cliente.ID_condições',
               'codigo_tiny_id_externo', 'id', 'updated_at', 'created_at')
    ) w
   WHERE public.sentinela_campo_ainda_vazio(w.tabela, w.cliente_id, w.coluna)
   ORDER BY w.cliente_id, w.campo, w.quando DESC
  ON CONFLICT (chave) WHERE resolvido_em IS NULL DO NOTHING;
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_novos := v_novos + v_cnt;

  -- Auto-resolução: o campo voltou a ter valor -> perda reparada.
  UPDATE sentinela_alerta a SET resolvido_em = now()
   WHERE a.resolvido_em IS NULL AND a.regra = 'wipe_campo_cliente'
     AND NOT public.sentinela_campo_ainda_vazio(
           CASE WHEN position('.' IN (a.detalhe->>'campo')) > 0
                THEN split_part(a.detalhe->>'campo', '.', 1) ELSE 'cliente' END,
           (a.detalhe->>'cliente_id')::bigint,
           CASE WHEN position('.' IN (a.detalhe->>'campo')) > 0
                THEN split_part(a.detalhe->>'campo', '.', 2) ELSE a.detalhe->>'campo' END);

  -- ===== Regra 6: cliente novo sem condição de pagamento (regra do lote V1.72) =====
  INSERT INTO sentinela_alerta (regra, chave, detalhe)
  SELECT 'cliente_novo_sem_condicao',
         'cliente_novo_sem_condicao:' || c.cliente_id,
         jsonb_build_object('nome', c.nome, 'criado_em', c.created_at)
    FROM cliente c
   WHERE c.created_at > '2026-07-29' AND c.deleted_at IS NULL
     AND NOT EXISTS (SELECT 1 FROM "condições_cliente" cc WHERE cc."ID_cliente" = c.cliente_id)
  ON CONFLICT (chave) WHERE resolvido_em IS NULL DO NOTHING;
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_novos := v_novos + v_cnt;

  UPDATE sentinela_alerta a SET resolvido_em = now()
   WHERE a.resolvido_em IS NULL AND a.regra = 'cliente_novo_sem_condicao'
     AND NOT EXISTS (
       SELECT 1 FROM cliente c
       WHERE c.created_at > '2026-07-29' AND c.deleted_at IS NULL
         AND NOT EXISTS (SELECT 1 FROM "condições_cliente" cc WHERE cc."ID_cliente" = c.cliente_id)
         AND a.chave = 'cliente_novo_sem_condicao:' || c.cliente_id);

  -- ===== Regra 7: condição parcelada com nome divergente do intervalo (invariante V1.70) =====
  INSERT INTO sentinela_alerta (regra, chave, detalhe)
  SELECT 'condicao_nome_divergente',
         'condicao_nome_divergente:' || cp."Condição_ID",
         jsonb_build_object('nome', cp."Descrição", 'intervalo', array_to_string(cp.intervalo_parcela, '/'))
    FROM "Condicao_De_Pagamento" cp
   WHERE array_length(cp.intervalo_parcela, 1) > 1
     AND position(array_to_string(cp.intervalo_parcela, '/') IN COALESCE(cp."Descrição", '')) = 0
  ON CONFLICT (chave) WHERE resolvido_em IS NULL DO NOTHING;
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_novos := v_novos + v_cnt;

  UPDATE sentinela_alerta a SET resolvido_em = now()
   WHERE a.resolvido_em IS NULL AND a.regra = 'condicao_nome_divergente'
     AND NOT EXISTS (
       SELECT 1 FROM "Condicao_De_Pagamento" cp
       WHERE array_length(cp.intervalo_parcela, 1) > 1
         AND position(array_to_string(cp.intervalo_parcela, '/') IN COALESCE(cp."Descrição", '')) = 0
         AND a.chave = 'condicao_nome_divergente:' || cp."Condição_ID");

  RETURN v_novos;
END;
$function$
