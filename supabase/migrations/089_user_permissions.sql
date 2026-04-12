-- 089_user_permissions.sql
-- Persistencia de permissoes explicitas no usuario e backfill de defaults por tipo.

CREATE OR REPLACE FUNCTION public.default_user_permissions_v2(p_tipo TEXT)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_tipo = 'backoffice' THEN
    RETURN to_jsonb(ARRAY[
      'clientes.visualizar','clientes.criar','clientes.editar','clientes.excluir','clientes.todos','clientes.aprovar',
      'vendas.visualizar','vendas.criar','vendas.editar','vendas.excluir','vendas.todas',
      'relatorios.visualizar','relatorios.todos',
      'config.minhas_empresas','config.geral',
      'usuarios.visualizar','usuarios.criar','usuarios.editar','usuarios.excluir','usuarios.permissoes',
      'contacorrente.visualizar','contacorrente.criar','contacorrente.editar','contacorrente.excluir',
      'produtos.visualizar','produtos.criar','produtos.editar','produtos.excluir',
      'comissoes.visualizar','comissoes.lancamentos.editar','comissoes.lancamentos.excluir',
      'configuracoes.editar','configuracoes.excluir'
    ]);
  END IF;

  RETURN to_jsonb(ARRAY[
    'clientes.visualizar','clientes.criar','clientes.editar',
    'vendas.visualizar','vendas.criar','vendas.editar',
    'produtos.visualizar',
    'comissoes.visualizar',
    'relatorios.visualizar',
    'contacorrente.visualizar','contacorrente.criar'
  ]);
END;
$$;

ALTER TABLE public."user"
  ADD COLUMN IF NOT EXISTS permissoes JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_permissoes_array_chk'
      AND conrelid = 'public.user'::regclass
  ) THEN
    ALTER TABLE public."user"
      ADD CONSTRAINT user_permissoes_array_chk
      CHECK (jsonb_typeof(permissoes) = 'array');
  END IF;
END;
$$;

UPDATE public."user"
SET permissoes = public.default_user_permissions_v2(tipo)
WHERE permissoes IS NULL
   OR permissoes = '[]'::jsonb;

COMMENT ON COLUMN public."user".permissoes IS 'Permissoes explicitas do usuario (array JSONB de strings).';
