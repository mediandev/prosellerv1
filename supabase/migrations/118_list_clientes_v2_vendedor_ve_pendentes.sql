-- 116_list_clientes_v2_vendedor_ve_pendentes.sql
--
-- Permite que vendedor enxergue na listagem os clientes PENDENTES que ele
-- mesmo criou (criado_por = p_requesting_user_id). Clientes aprovados seguem
-- a mesma regra de antes (vendedor vê os atribuídos OU os que criou).
-- Pendentes de OUTROS vendedores continuam invisíveis pro vendedor — só
-- backoffice vê todos.
--
-- Motivação: hoje vendedor cria um cliente, vê o toast verde de sucesso, mas
-- o cliente "some" da listagem porque nasce em status_aprovacao='pendente'
-- e a regra antiga só liberava clientes 'aprovado'. UX péssima e o usuário
-- (Valentim, dono) reportou. Decidido em 2026-05-18 com Lucas: melhor que
-- vendedor enxergue o pendente que ele criou, com badge "Pendente", do que
-- ficar achando que o cadastro falhou.
--
-- Backup da versão anterior em 116a_backup_list_clientes_v2_before_vendedor_pendente.sql.
--
-- Mudança cirúrgica em DUAS cláusulas idênticas dentro da RPC (a do COUNT e
-- a do SELECT interno). Antes:
--   (v_user_tipo = 'vendedor' AND (
--     c.criado_por = p_requesting_user_id
--     OR p_requesting_user_id = ANY(c.vendedoresatribuidos)
--   ) AND c.status_aprovacao = 'aprovado')
-- Depois:
--   (v_user_tipo = 'vendedor' AND (
--     (c.status_aprovacao = 'aprovado'
--      AND (c.criado_por = p_requesting_user_id
--           OR p_requesting_user_id = ANY(c.vendedoresatribuidos)))
--     OR
--     (c.status_aprovacao = 'pendente' AND c.criado_por = p_requesting_user_id)
--   ))
--
-- Refs: feat/inclusao-rapida-grupo-rede.

CREATE OR REPLACE FUNCTION public.list_clientes_v2(
  p_limit integer DEFAULT 10,
  p_page integer DEFAULT 1,
  p_requesting_user_id uuid DEFAULT NULL::uuid,
  p_search text DEFAULT NULL::text,
  p_status_aprovacao_filter text DEFAULT NULL::text,
  p_vendedor_filter uuid DEFAULT NULL::uuid
)
RETURNS json
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_offset INTEGER;
  v_total_count INTEGER;
  v_user_tipo TEXT;
  v_clientes JSON;
  v_search_norm TEXT;
  v_search_digits TEXT;
BEGIN
  -- 1. VALIDACOES
  IF p_page < 1 THEN
    RAISE EXCEPTION 'Page must be greater than 0';
  END IF;
  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 100';
  END IF;

  -- 2. PERMISSAO
  IF p_requesting_user_id IS NOT NULL THEN
    SELECT tipo INTO v_user_tipo
    FROM public.user
    WHERE user_id = p_requesting_user_id
      AND ativo = TRUE
      AND deleted_at IS NULL;
  END IF;

  v_offset := (p_page - 1) * p_limit;

  -- 3. NORMALIZACAO DO TERMO DE BUSCA
  v_search_norm := CASE WHEN p_search IS NULL THEN NULL
                        ELSE unaccent(LOWER(p_search)) END;
  v_search_digits := CASE WHEN p_search IS NULL THEN NULL
                           ELSE NULLIF(REGEXP_REPLACE(p_search, '[^0-9]', '', 'g'), '') END;

  -- 4. CONTAR TOTAL
  SELECT COUNT(*)
  INTO v_total_count
  FROM public.cliente c
  WHERE c.deleted_at IS NULL
    AND (p_status_aprovacao_filter IS NULL OR c.status_aprovacao = p_status_aprovacao_filter)
    AND (
      v_search_norm IS NULL OR
      unaccent(LOWER(c.nome))                       LIKE '%' || v_search_norm || '%' OR
      unaccent(LOWER(c.nome_fantasia))              LIKE '%' || v_search_norm || '%' OR
      unaccent(LOWER(COALESCE(c.grupo_rede, '')))   LIKE '%' || v_search_norm || '%' OR
      LOWER(c.codigo)                               LIKE '%' || LOWER(p_search) || '%' OR
      LOWER(c.cpf_cnpj)                             LIKE '%' || LOWER(p_search) || '%' OR
      (v_search_digits IS NOT NULL
       AND LENGTH(v_search_digits) >= 3
       AND REGEXP_REPLACE(COALESCE(c.cpf_cnpj, ''), '[^0-9]', '', 'g') LIKE '%' || v_search_digits || '%')
    )
    AND (
      v_user_tipo = 'backoffice' OR
      (v_user_tipo = 'vendedor' AND (
        (c.status_aprovacao = 'aprovado'
         AND (c.criado_por = p_requesting_user_id
              OR p_requesting_user_id = ANY(c.vendedoresatribuidos)))
        OR
        (c.status_aprovacao = 'pendente' AND c.criado_por = p_requesting_user_id)
      ))
    )
    AND (p_vendedor_filter IS NULL OR p_vendedor_filter = ANY(c.vendedoresatribuidos));

  -- 5. BUSCAR CLIENTES COM JOIN PARA grupo_rede_nome E segmento_nome
  SELECT JSON_BUILD_OBJECT(
    'clientes', COALESCE(
      (SELECT JSON_AGG(
        json_build_object(
          'cliente_id', sub.cliente_id,
          'nome', sub.nome,
          'nome_fantasia', sub.nome_fantasia,
          'cpf_cnpj', sub.cpf_cnpj,
          'tipoPessoa', sub."ref_tipo_pessoa_id_FK",
          'codigo', sub.codigo,
          'status_aprovacao', sub.status_aprovacao,
          'grupo_rede', sub.grupo_rede,
          'grupo_rede_nome', sub.grupo_rede_nome,
          'segmento_id', sub.segmento_id,
          'segmento_nome', sub.segmento_nome,
          'created_at', sub.created_at,
          'updated_at', sub.updated_at
        )
      )
      FROM (
        SELECT
          c.cliente_id,
          c.nome,
          c.nome_fantasia,
          c.cpf_cnpj,
          c."ref_tipo_pessoa_id_FK",
          c.codigo,
          c.status_aprovacao,
          c.grupo_rede,
          gr.nome AS grupo_rede_nome,
          c.segmento_id,
          sc.nome AS segmento_nome,
          c.created_at,
          c.updated_at
        FROM public.cliente c
        LEFT JOIN public.segmento_cliente sc ON sc.id = c.segmento_id AND sc.deleted_at IS NULL
        LEFT JOIN public.grupos_redes gr ON gr.id = c.grupo_id AND gr.deleted_at IS NULL
        WHERE c.deleted_at IS NULL
          AND (p_status_aprovacao_filter IS NULL OR c.status_aprovacao = p_status_aprovacao_filter)
          AND (
            v_search_norm IS NULL OR
            unaccent(LOWER(c.nome))                       LIKE '%' || v_search_norm || '%' OR
            unaccent(LOWER(c.nome_fantasia))              LIKE '%' || v_search_norm || '%' OR
            unaccent(LOWER(COALESCE(c.grupo_rede, '')))   LIKE '%' || v_search_norm || '%' OR
            LOWER(c.codigo)                               LIKE '%' || LOWER(p_search) || '%' OR
            LOWER(c.cpf_cnpj)                             LIKE '%' || LOWER(p_search) || '%' OR
            (v_search_digits IS NOT NULL
             AND LENGTH(v_search_digits) >= 3
             AND REGEXP_REPLACE(COALESCE(c.cpf_cnpj, ''), '[^0-9]', '', 'g') LIKE '%' || v_search_digits || '%')
          )
          AND (
            v_user_tipo = 'backoffice' OR
            (v_user_tipo = 'vendedor' AND (
              (c.status_aprovacao = 'aprovado'
               AND (c.criado_por = p_requesting_user_id
                    OR p_requesting_user_id = ANY(c.vendedoresatribuidos)))
              OR
              (c.status_aprovacao = 'pendente' AND c.criado_por = p_requesting_user_id)
            ))
          )
          AND (p_vendedor_filter IS NULL OR p_vendedor_filter = ANY(c.vendedoresatribuidos))
        ORDER BY c.created_at DESC
        LIMIT p_limit
        OFFSET v_offset
      ) sub),
      '[]'::JSON
    ),
    'total', v_total_count,
    'page', p_page,
    'limit', p_limit,
    'total_pages', CEIL(v_total_count::NUMERIC / p_limit)
  )
  INTO v_clientes;

  RETURN v_clientes;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in list_clientes_v2: %', SQLERRM;
    RAISE;
END;
$function$;
