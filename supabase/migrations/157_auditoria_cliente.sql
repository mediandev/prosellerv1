-- Migration 157: AUDITORIA de clientes.
--
-- Mesmo padrão da 155 (pedidos), e o mesmo achado: `delete_cliente_v2` já RECEBE
-- `p_deleted_by`, usa só para checar permissão e descarta. Basta guardar.
--
-- ============ UMA DECISÃO DELIBERADA: NÃO MEXER EM update_cliente_v2 ============
-- A aprovação de cliente passa por `update_cliente_v2`, que NÃO grava
-- `aprovado_por` (por isso a coluna está zerada em 967 clientes). O conserto
-- óbvio seria alterar essa função — mas ela é a que causou o incidente de perda
-- de dados de março (migration 140), tem 22 KB e toca cadastro, contato e
-- endereço de uma vez.
--
-- Para o que a auditoria precisa, `atualizado_por` basta: é gravado por essa mesma
-- função e identifica quem fez a aprovação. Trocar risco alto por benefício nulo
-- não se justifica. Se um dia `aprovado_por` passar a ser preenchido, o gatilho
-- abaixo já o prefere.
--
-- ============ RELAÇÃO COM `cliente_historico_alteracoes` ============
-- Aquele histórico (migration 107) registra TODO campo alterado e é o que
-- permitiu recuperar os dados perdidos. A auditoria é outra coisa: só as ações
-- com impacto, para leitura humana. Não substitui nem duplica — convivem.

ALTER TABLE public.cliente
  ADD COLUMN IF NOT EXISTS excluido_por uuid REFERENCES public."user"(user_id) ON DELETE SET NULL;

COMMENT ON COLUMN public.cliente.excluido_por IS 'Quem excluiu (migration 157). Exclusão é soft delete.';

CREATE OR REPLACE FUNCTION public.delete_cliente_v2(p_cliente_id bigint, p_deleted_by uuid DEFAULT NULL::uuid)
 RETURNS TABLE(cliente_id bigint, deleted_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_tipo TEXT;
BEGIN
  IF p_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_id é obrigatório';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.cliente c
    WHERE c.cliente_id = p_cliente_id
      AND c.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Cliente não encontrado ou já excluído';
  END IF;

  IF p_deleted_by IS NOT NULL THEN
    SELECT u.tipo
      INTO v_user_tipo
      FROM public.user u
     WHERE u.user_id = p_deleted_by
       AND u.ativo = TRUE
       AND u.deleted_at IS NULL;

    IF v_user_tipo IS NULL THEN
      RAISE EXCEPTION 'Usuário não autorizado';
    END IF;

    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem excluir clientes';
    END IF;
  END IF;

  UPDATE public.cliente c
     SET deleted_at = NOW(),
         excluido_por = p_deleted_by,
         ref_situacao_id = COALESCE((
           SELECT rs.ref_situacao_id
           FROM public.ref_situacao rs
           WHERE UPPER(TRIM(rs.nome)) IN ('EXCLUÍDO', 'EXCLUIDO')
           LIMIT 1
         ), c.ref_situacao_id)
   WHERE c.cliente_id = p_cliente_id;

  RETURN QUERY
  SELECT c.cliente_id, c.deleted_at
    FROM public.cliente c
   WHERE c.cliente_id = p_cliente_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in delete_cliente_v2 for cliente %: %', p_cliente_id, SQLERRM;
    RAISE;
END;
$function$
;


-- ===================== GATILHO: CLIENTE =====================
CREATE OR REPLACE FUNCTION public.tg_auditoria_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id       text := COALESCE(NEW.cliente_id, OLD.cliente_id)::text;
  v_nome     text := COALESCE(NEW.nome, OLD.nome, v_id);
  v_mudancas jsonb := '[]'::jsonb;
  v_col      text;
  v_de       text;
  v_para     text;
  v_novo     jsonb;
  v_velho    jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.auditoria_registrar('criou', 'Cliente', v_id, NEW.criado_por,
      format('cadastrou o cliente %s', v_nome), NULL);
    RETURN NEW;
  END IF;

  -- Exclusão e restauração (soft delete), antes de qualquer outra comparação:
  -- são as ações mais graves e não podem virar "alteração de campo".
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    PERFORM public.auditoria_registrar('excluiu', 'Cliente', v_id,
      COALESCE(NEW.excluido_por, NEW.atualizado_por),
      format('excluiu o cliente %s', v_nome),
      jsonb_build_object('nome', v_nome, 'cpf_cnpj', OLD.cpf_cnpj, 'codigo', OLD.codigo));
    RETURN NEW;
  END IF;

  IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    PERFORM public.auditoria_registrar('restaurou', 'Cliente', v_id, NEW.atualizado_por,
      format('restaurou o cliente %s', v_nome), NULL);
    RETURN NEW;
  END IF;

  -- Aprovação / rejeição de cadastro pendente.
  IF NEW.status_aprovacao IS DISTINCT FROM OLD.status_aprovacao THEN
    PERFORM public.auditoria_registrar(
      CASE WHEN NEW.status_aprovacao = 'aprovado' THEN 'aprovou'
           WHEN NEW.status_aprovacao = 'rejeitado' THEN 'rejeitou'
           ELSE 'alterou' END,
      'Cliente', v_id, COALESCE(NEW.aprovado_por, NEW.atualizado_por),
      format('%s o cadastro de %s',
             CASE WHEN NEW.status_aprovacao = 'aprovado' THEN 'aprovou'
                  WHEN NEW.status_aprovacao = 'rejeitado' THEN 'rejeitou'
                  ELSE 'mudou a situação de' END, v_nome),
      jsonb_build_object('de', OLD.status_aprovacao, 'para', NEW.status_aprovacao,
                         'motivo', NEW.motivo_rejeicao));
    RETURN NEW;
  END IF;

  -- Campos com impacto comercial. Correção de telefone, e-mail ou observação NÃO
  -- entra aqui de propósito: já está em cliente_historico_alteracoes e encheria
  -- a auditoria de ruído, escondendo o que importa.
  v_novo  := to_jsonb(NEW);
  v_velho := to_jsonb(OLD);
  FOREACH v_col IN ARRAY ARRAY['vendedoresatribuidos','grupo_id','lista_de_preco',
                               'condicao_padrao','desconto','desconto_financeiro',
                               'pedido_minimo','ref_situacao_id','cpf_cnpj','codigo',
                               'empresaFaturamento'] LOOP
    v_de   := v_velho ->> v_col;
    v_para := v_novo  ->> v_col;
    IF v_de IS DISTINCT FROM v_para THEN
      v_mudancas := v_mudancas || jsonb_build_object('campo', v_col, 'de', v_de, 'para', v_para);
    END IF;
  END LOOP;

  IF jsonb_array_length(v_mudancas) > 0 THEN
    PERFORM public.auditoria_registrar('alterou', 'Cliente', v_id, NEW.atualizado_por,
      format('alterou o cliente %s', v_nome), v_mudancas);
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_auditoria_cliente ON public.cliente;
CREATE TRIGGER trg_auditoria_cliente
  AFTER INSERT OR UPDATE ON public.cliente
  FOR EACH ROW EXECUTE FUNCTION public.tg_auditoria_cliente();

-- ============== GATILHO: CONDIÇÕES DE PAGAMENTO DO CLIENTE ==============
-- Tabela separada: mudar as condições de um cliente é INSERT/DELETE ali, e não
-- apareceria na comparação de campos de `cliente`. Autoria vem de
-- cliente.atualizado_por — mesmo caminho que a migration 107 já usa.
CREATE OR REPLACE FUNCTION public.tg_auditoria_condicoes_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cliente bigint := COALESCE(NEW."ID_cliente", OLD."ID_cliente");
  v_nome    text;
  v_autor   uuid;
  v_cond    text;
BEGIN
  SELECT c.nome, c.atualizado_por INTO v_nome, v_autor
    FROM public.cliente c WHERE c.cliente_id = v_cliente;

  SELECT cp."Descrição" INTO v_cond
    FROM public."Condicao_De_Pagamento" cp
   WHERE cp."Condição_ID" = COALESCE(NEW."ID_condições", OLD."ID_condições");

  PERFORM public.auditoria_registrar('alterou', 'Cliente', v_cliente::text, v_autor,
    format('%s a condição de pagamento %s de %s',
           CASE TG_OP WHEN 'INSERT' THEN 'liberou' ELSE 'removeu' END,
           COALESCE(v_cond, '(sem nome)'), COALESCE(v_nome, v_cliente::text)),
    jsonb_build_object('operacao', TG_OP, 'condicao', v_cond));

  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trg_auditoria_condicoes_cliente ON public."condições_cliente";
CREATE TRIGGER trg_auditoria_condicoes_cliente
  AFTER INSERT OR DELETE ON public."condições_cliente"
  FOR EACH ROW EXECUTE FUNCTION public.tg_auditoria_condicoes_cliente();
