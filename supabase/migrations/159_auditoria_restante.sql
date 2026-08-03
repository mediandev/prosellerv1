-- Migration 159: AUDITORIA — fecha a lista acordada com o cliente.
--
-- Cobre preços, listas de preço, produtos, naturezas de operação, condições de
-- pagamento, metas, empresas de faturamento (inclusive a chave de API) e frete.
--
-- ==================== UMA LACUNA QUE NÃO ESCONDO ====================
-- Destas tabelas, SÓ `frete_logistica` guarda quem alterou. As demais não têm
-- coluna de autoria e nenhum caminho do sistema informa o usuário. Portanto, o
-- registro delas sai com autor **'Sistema'**.
--
-- Registrar assim mesmo é melhor que não registrar: "o preço do produto X passou
-- de 10 para 12 em 03/08" responde a maior parte das perguntas reais, mesmo sem
-- o nome. E é honesto — 'Sistema' diz "não sei quem foi", enquanto chutar um
-- nome seria pior que o silêncio.
--
-- Para ganhar o "quem" aqui seria preciso, tabela a tabela: criar a coluna e
-- fazer cada Edge Function preenchê-la. Está mapeado, não feito.
--
-- ==================== EXCLUSÃO SUAVE, DE FORMA GENÉRICA ====================
-- Em pedidos (155), clientes (157) e usuários (158) escrevi um gatilho por
-- tabela para tratar o soft delete. Aqui são oito tabelas — repetir isso oito
-- vezes seria convite a divergência. O gatilho genérico da migration 154 passa a
-- entender `deleted_at` sozinho. Os gatilhos de dinheiro que já o usam continuam
-- funcionando igual: as tabelas deles não têm `deleted_at`, então o ramo novo
-- simplesmente não dispara.

CREATE OR REPLACE FUNCTION public.tg_auditoria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_entidade   text := TG_ARGV[0];
  v_pk         text := TG_ARGV[1];
  v_col_user   text := NULLIF(TG_ARGV[2], '');
  v_novo       jsonb := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END;
  v_velho      jsonb := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END;
  v_fonte      jsonb := COALESCE(v_novo, v_velho);
  v_id         text;
  v_user       uuid;
  v_mudancas   jsonb := '[]'::jsonb;
  v_col        text;
  v_de         text;
  v_para       text;
  i            int;
BEGIN
  v_id := v_fonte ->> v_pk;

  IF v_col_user IS NOT NULL THEN
    BEGIN
      v_user := (v_fonte ->> v_col_user)::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_user := NULL;
    END;
  END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.auditoria_registrar('criou', v_entidade, v_id, v_user,
      format('criou %s #%s', v_entidade, v_id), NULL);
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM public.auditoria_registrar('excluiu', v_entidade, v_id, v_user,
      format('excluiu %s #%s', v_entidade, v_id), v_velho);
    RETURN OLD;
  END IF;

  -- Exclusão suave: chega como UPDATE de `deleted_at`. Tratada ANTES da
  -- comparação de campos, senão a ação mais grave viraria "alterou deleted_at".
  IF (v_velho ? 'deleted_at') THEN
    IF v_velho ->> 'deleted_at' IS NULL AND v_novo ->> 'deleted_at' IS NOT NULL THEN
      PERFORM public.auditoria_registrar('excluiu', v_entidade, v_id, v_user,
        format('excluiu %s #%s', v_entidade, v_id), v_velho);
      RETURN NEW;
    END IF;
    IF v_velho ->> 'deleted_at' IS NOT NULL AND v_novo ->> 'deleted_at' IS NULL THEN
      PERFORM public.auditoria_registrar('restaurou', v_entidade, v_id, v_user,
        format('restaurou %s #%s', v_entidade, v_id), NULL);
      RETURN NEW;
    END IF;
  END IF;

  FOR i IN 3 .. (array_length(TG_ARGV, 1) - 1) LOOP
    v_col  := TG_ARGV[i];
    v_de   := v_velho ->> v_col;
    v_para := v_novo  ->> v_col;
    IF v_de IS DISTINCT FROM v_para THEN
      v_mudancas := v_mudancas || jsonb_build_object('campo', v_col, 'de', v_de, 'para', v_para);
    END IF;
  END LOOP;

  IF jsonb_array_length(v_mudancas) > 0 THEN
    PERFORM public.auditoria_registrar('alterou', v_entidade, v_id, v_user,
      format('alterou %s #%s', v_entidade, v_id), v_mudancas);
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================== PREÇOS ==============================
-- O preço de venda por lista é a informação mais sensível deste bloco.
DROP TRIGGER IF EXISTS trg_auditoria_preco ON public.produtos_listas_precos;
CREATE TRIGGER trg_auditoria_preco
  AFTER INSERT OR UPDATE OR DELETE ON public.produtos_listas_precos
  FOR EACH ROW EXECUTE FUNCTION public.tg_auditoria('Preço', 'id', '', 'preco', 'lista_preco_id', 'produto_id');

DROP TRIGGER IF EXISTS trg_auditoria_lista_preco ON public.listas_preco;
CREATE TRIGGER trg_auditoria_lista_preco
  AFTER INSERT OR UPDATE OR DELETE ON public.listas_preco
  FOR EACH ROW EXECUTE FUNCTION public.tg_auditoria('Lista de preço', 'id', '', 'nome', 'desconto', 'ativo');

DROP TRIGGER IF EXISTS trg_auditoria_comissionamento ON public.listas_preco_comissionamento;
CREATE TRIGGER trg_auditoria_comissionamento
  AFTER INSERT OR UPDATE OR DELETE ON public.listas_preco_comissionamento
  FOR EACH ROW EXECUTE FUNCTION public.tg_auditoria('Comissionamento da lista', 'id', '');

-- ============================== PRODUTOS ==============================
-- Fora da lista de propósito: peso, dimensões, foto, estoque. São operacionais e
-- mudam com frequência; encheriam a auditoria e esconderiam o que importa.
DROP TRIGGER IF EXISTS trg_auditoria_produto ON public.produto;
CREATE TRIGGER trg_auditoria_produto
  AFTER INSERT OR UPDATE ON public.produto
  FOR EACH ROW EXECUTE FUNCTION public.tg_auditoria(
    'Produto', 'produto_id', '', 'descricao', 'codigo_sku', 'preco_venda', 'ativo', 'situacao', 'ncm');

-- ==================== CONFIGURAÇÕES QUE MUDAM O FATURAMENTO ====================
DROP TRIGGER IF EXISTS trg_auditoria_natureza ON public.natureza_operacao;
CREATE TRIGGER trg_auditoria_natureza
  AFTER INSERT OR UPDATE ON public.natureza_operacao
  FOR EACH ROW EXECUTE FUNCTION public.tg_auditoria(
    'Natureza de operação', 'id', '', 'nome', 'tem_comissao', 'gera_receita', 'ativo', 'tiny_id');

DROP TRIGGER IF EXISTS trg_auditoria_condicao ON public."Condicao_De_Pagamento";
CREATE TRIGGER trg_auditoria_condicao
  AFTER INSERT OR UPDATE OR DELETE ON public."Condicao_De_Pagamento"
  FOR EACH ROW EXECUTE FUNCTION public.tg_auditoria(
    'Condição de pagamento', 'Condição_ID', '',
    'Descrição', 'Parcelamento', 'Quantidade_parcelas', 'Prazo_pagamento',
    'Desconto', 'valor_minimo', 'intervalo_parcela', 'Condição_de_crédito');

DROP TRIGGER IF EXISTS trg_auditoria_meta ON public.metas_vendedor;
CREATE TRIGGER trg_auditoria_meta
  AFTER INSERT OR UPDATE OR DELETE ON public.metas_vendedor
  FOR EACH ROW EXECUTE FUNCTION public.tg_auditoria(
    'Meta', 'id', '', 'meta_valor', 'meta_percentual_crescimento', 'ano', 'mes', 'vendedor_id');

-- Mapeamento natureza <-> Tiny: define a natureza que sai na nota fiscal.
DROP TRIGGER IF EXISTS trg_auditoria_natureza_tiny ON public.tiny_empresa_natureza_operacao;
CREATE TRIGGER trg_auditoria_natureza_tiny
  AFTER INSERT OR UPDATE ON public.tiny_empresa_natureza_operacao
  FOR EACH ROW EXECUTE FUNCTION public.tg_auditoria(
    'Natureza no ERP', 'id', '', 'tiny_valor', 'tiny_valor_simples', 'ativo');

-- Empresa de faturamento. `chave_api` entra na lista de campos VIGIADOS, mas a
-- descrição só diz QUE mudou — o valor nunca é copiado para a auditoria, porque
-- é credencial. (O gatilho grava de/para; por isso a chave é tratada à parte,
-- abaixo, com gatilho próprio.)
DROP TRIGGER IF EXISTS trg_auditoria_empresa ON public.ref_empresas_subsidiarias;
CREATE TRIGGER trg_auditoria_empresa
  AFTER INSERT OR UPDATE ON public.ref_empresas_subsidiarias
  FOR EACH ROW EXECUTE FUNCTION public.tg_auditoria(
    'Empresa de faturamento', 'id', '', 'nome', 'cnpj', 'razao_social',
    'inscricao_estadual', 'ativo');

-- Troca da CHAVE DE API do Tiny: gatilho separado para registrar o FATO sem
-- jamais gravar a credencial (nem a antiga nem a nova) na auditoria.
CREATE OR REPLACE FUNCTION public.tg_auditoria_chave_api()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.chave_api IS DISTINCT FROM OLD.chave_api THEN
    PERFORM public.auditoria_registrar('alterou', 'Empresa de faturamento', NEW.id::text, NULL,
      format('trocou a chave de API do ERP da empresa %s', COALESCE(NEW.nome, NEW.id::text)),
      jsonb_build_object('campo', 'chave_api',
                         'tinha_chave_antes', OLD.chave_api IS NOT NULL,
                         'tem_chave_agora', NEW.chave_api IS NOT NULL));
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_auditoria_chave_api ON public.ref_empresas_subsidiarias;
CREATE TRIGGER trg_auditoria_chave_api
  AFTER UPDATE ON public.ref_empresas_subsidiarias
  FOR EACH ROW EXECUTE FUNCTION public.tg_auditoria_chave_api();

-- ============================== LOGÍSTICA ==============================
-- Única tabela deste lote com autoria real (criado_por/atualizado_por).
-- `status_entrega` muda o tempo todo pelo rastreio automático do SSW; por isso
-- NÃO entra na lista — senão a auditoria viraria um log de rastreamento.
-- Excluir frete e trocar transportador são as ações de decisão humana.
DROP TRIGGER IF EXISTS trg_auditoria_frete ON public.frete_logistica;
CREATE TRIGGER trg_auditoria_frete
  AFTER INSERT OR UPDATE ON public.frete_logistica
  FOR EACH ROW EXECUTE FUNCTION public.tg_auditoria(
    'Frete', 'id', 'atualizado_por', 'transportador_id', 'valor_cotacao', 'nfe_numero');
