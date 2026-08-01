-- bootstrap.sql — o que o Supabase fornece de fábrica e o baseline pressupõe.
-- Roda ANTES de supabase/schema_baseline.sql num Postgres limpo.

-- Extensões usadas pelo schema.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Roles do Supabase (as policies fazem GRANT ... TO estes papéis).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END $$;

-- Stub do schema `auth`. As policies chamam auth.uid(); nos testes de RPC o que
-- importa é a lógica da função, não a identidade — devolver NULL basta e mantém
-- o comportamento determinístico.
CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
  LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text
  LANGUAGE sql STABLE AS $$ SELECT current_setting('role', true) $$;

-- `auth.users` é alvo de FK em controle_comissao_periodo, lancamentos_comissao e
-- pagamentos_comissao. Só o `id` importa para as FKs; as demais colunas do
-- GoTrue não participam de nenhuma regra de negócio deste schema.
CREATE TABLE IF NOT EXISTS auth.users (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text
);

-- As sequences referenciadas por DEFAULT nextval() no baseline NÃO ficam aqui:
-- são extraídas do próprio schema_baseline.sql por scripts/db-test.sh, para a
-- lista não envelhecer. (Colunas IDENTITY criam a sua sozinhas.)
