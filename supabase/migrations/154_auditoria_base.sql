-- Migration 154: AUDITORIA — base + captura do grupo "dinheiro".
--
-- Decisão do cliente (2026-08-03): registrar ações com impacto (não toda
-- alteração de campo), visível só com permissão específica, sem prazo de expurgo.
--
-- ============================ COMO SE SABE "QUEM" ============================
-- Um gatilho no banco não sabe quem é o usuário do app: a autenticação é um JWT
-- próprio guardado no navegador, e cada chamada REST é uma transação separada
-- (então `SET LOCAL` numa chamada não vale na seguinte).
--
-- Resolução em três degraus, do mais confiável para o menos:
--   1. `app.usuario_id` — quando a chamada define explicitamente (RPCs podem);
--   2. a coluna de autoria da própria linha (editado_por, criado_por, ...) —
--      é o padrão que a migration 107 já usa para o histórico de cliente;
--   3. 'Sistema' — mudança sem autor identificável (cron, integração, script).
--
-- O degrau 3 é honesto de propósito: é melhor registrar "Sistema" do que atribuir
-- a ação à pessoa errada. Onde 'Sistema' aparecer demais, é sinal de que falta
-- autoria na origem — e isso vira trabalho, não suposição.
--
-- ========================= POR QUE ESTE RECORTE =========================
-- Esta migration cobre COMISSÕES e CONTA CORRENTE (o grupo de maior risco).
-- Pedidos ficam para a próxima: `pedido_venda` NÃO tem coluna de autoria — não há
-- como dizer quem excluiu um pedido sem antes criar essa coluna e preenchê-la nas
-- Edge Functions. Registrar "Sistema" em toda exclusão de pedido seria uma
-- auditoria que não audita.

-- ---------------------------------------------------------------- tabela
CREATE TABLE IF NOT EXISTS public.auditoria (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ocorrido_em   timestamptz NOT NULL DEFAULT now(),
  acao          text NOT NULL,          -- criou | alterou | excluiu | ...
  entidade      text NOT NULL,          -- rótulo legível: 'Comissão', 'Conta Corrente'
  entidade_id   text,                   -- id do registro afetado (texto: PKs variam)
  usuario_id    uuid,
  usuario_nome  text NOT NULL DEFAULT 'Sistema',
  descricao     text NOT NULL,          -- frase pronta para leitura humana
  detalhe       jsonb,                  -- campos alterados: [{campo, de, para}]
  origem        text NOT NULL DEFAULT 'banco'
);

COMMENT ON TABLE public.auditoria IS
  'Registro de ações com impacto (migration 154). Sem expurgo: mantido para auditoria de todo o período de uso.';

CREATE INDEX IF NOT EXISTS ix_auditoria_ocorrido ON public.auditoria (ocorrido_em DESC);
CREATE INDEX IF NOT EXISTS ix_auditoria_entidade ON public.auditoria (entidade, ocorrido_em DESC);
CREATE INDEX IF NOT EXISTS ix_auditoria_usuario  ON public.auditoria (usuario_id, ocorrido_em DESC);

ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

-- Leitura liberada ao papel `authenticated`; QUEM pode ver é decidido pela
-- permissão `auditoria.visualizar` na aplicação (mesmo padrão da sentinela).
DROP POLICY IF EXISTS "authenticated_read_auditoria" ON public.auditoria;
CREATE POLICY "authenticated_read_auditoria" ON public.auditoria
  FOR SELECT TO authenticated USING (true);

-- Ninguém edita nem apaga registro de auditoria: sem policy de UPDATE/DELETE.
-- Os gatilhos escrevem como SECURITY DEFINER, contornando o RLS.

-- ------------------------------------------------- resolução do usuário
CREATE OR REPLACE FUNCTION public.auditoria_usuario(p_usuario_id uuid)
RETURNS TABLE (usuario_id uuid, usuario_nome text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  -- Degrau 1: definido explicitamente pela chamada.
  BEGIN
    v_id := NULLIF(current_setting('app.usuario_id', true), '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_id := NULL;   -- valor mal formado não pode derrubar a operação do usuário
  END;

  -- Degrau 2: autoria da própria linha.
  v_id := COALESCE(v_id, p_usuario_id);

  RETURN QUERY
    SELECT v_id,
           COALESCE(
             (SELECT COALESCE(u.nome, u.email) FROM public."user" u
               WHERE u.user_id = v_id AND u.deleted_at IS NULL LIMIT 1),
             'Sistema');   -- degrau 3
END;
$function$;

-- ------------------------------------------------------ escrita blindada
CREATE OR REPLACE FUNCTION public.auditoria_registrar(
  p_acao        text,
  p_entidade    text,
  p_entidade_id text,
  p_usuario_id  uuid,
  p_descricao   text,
  p_detalhe     jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  u record;
BEGIN
  SELECT * INTO u FROM public.auditoria_usuario(p_usuario_id);
  INSERT INTO public.auditoria (acao, entidade, entidade_id, usuario_id, usuario_nome, descricao, detalhe)
  VALUES (p_acao, p_entidade, p_entidade_id, u.usuario_id, u.usuario_nome, p_descricao, p_detalhe);
EXCEPTION WHEN OTHERS THEN
  -- BLINDAGEM: falha ao auditar NUNCA pode derrubar a operação do usuário.
  -- Perder um registro de auditoria é ruim; impedir um pagamento é pior.
  RAISE WARNING '[AUDITORIA] falha ao registrar (%): %', p_acao, SQLERRM;
END;
$function$;

-- ------------------------------------------- gatilho genérico reutilizável
-- TG_ARGV[0] = rótulo da entidade   TG_ARGV[1] = coluna da PK
-- TG_ARGV[2] = coluna de autoria (opcional)
-- TG_ARGV[3..] = colunas a comparar no UPDATE (se vazio, não registra UPDATE)
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

  -- UPDATE: só registra se alguma das colunas vigiadas mudou de fato.
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

-- =========================== GATILHOS: DINHEIRO ===========================

-- Comissão do vendedor: valor, efetivação e débito são o que muda dinheiro.
DROP TRIGGER IF EXISTS trg_auditoria_comissao ON public."vendedor_comissão";
CREATE TRIGGER trg_auditoria_comissao
  AFTER INSERT OR UPDATE OR DELETE ON public."vendedor_comissão"
  FOR EACH ROW EXECUTE FUNCTION public.tg_auditoria(
    'Comissão', 'vendedor_comissao_id', 'editado_por',
    'valor_comissao', 'percentual_comissao', 'efetivada', 'debito', 'periodo');

-- Lançamentos (crédito/débito manual) — todo INSERT/DELETE importa.
DROP TRIGGER IF EXISTS trg_auditoria_lancamento ON public.lancamentos_comissao;
CREATE TRIGGER trg_auditoria_lancamento
  AFTER INSERT OR UPDATE OR DELETE ON public.lancamentos_comissao
  FOR EACH ROW EXECUTE FUNCTION public.tg_auditoria(
    'Lançamento de comissão', 'id', 'criado_por',
    'valor', 'tipo', 'periodo', 'descricao');

-- Pagamento de comissão.
DROP TRIGGER IF EXISTS trg_auditoria_pagamento_comissao ON public.pagamentos_comissao;
CREATE TRIGGER trg_auditoria_pagamento_comissao
  AFTER INSERT OR UPDATE OR DELETE ON public.pagamentos_comissao
  FOR EACH ROW EXECUTE FUNCTION public.tg_auditoria(
    'Pagamento de comissão', 'id', 'realizado_por',
    'valor', 'data_pagamento', 'forma_pagamento', 'periodo');

-- Fechamento/reabertura de período.
DROP TRIGGER IF EXISTS trg_auditoria_periodo_comissao ON public.controle_comissao_periodo;
CREATE TRIGGER trg_auditoria_periodo_comissao
  AFTER INSERT OR UPDATE OR DELETE ON public.controle_comissao_periodo
  FOR EACH ROW EXECUTE FUNCTION public.tg_auditoria(
    'Período de comissão', 'id', 'fechado_por',
    'status', 'saldo_final', 'saldo_anterior', 'data_fechamento');

-- Conta corrente do cliente. Sem coluna de autoria: cai em 'Sistema' até que a
-- origem passe a informar o usuário (ver nota no topo).
DROP TRIGGER IF EXISTS trg_auditoria_conta_corrente ON public.conta_corrente_cliente;
CREATE TRIGGER trg_auditoria_conta_corrente
  AFTER INSERT OR UPDATE OR DELETE ON public.conta_corrente_cliente
  FOR EACH ROW EXECUTE FUNCTION public.tg_auditoria(
    'Conta Corrente', 'id', '',
    'valor', 'data', 'titulo', 'tipo_compromisso', 'categoria_id');
