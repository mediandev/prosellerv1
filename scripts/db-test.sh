#!/usr/bin/env bash
# db-test.sh — roda os casos de tests/db/cases/*.sql contra um Postgres.
#
# Motivo (item 3 da estabilização): as funções PL/pgSQL — onde nasceram os
# incidentes mais caros — não tinham teste algum. Vitest não roda SQL, Deno não
# roda SQL, e o CI só via essas duas suítes. A única verificação era um ensaio
# BEGIN…ROLLBACK manual. Este script transforma o ensaio em comando.
#
# Cada caso roda na SUA transação, sempre revertida — nenhum caso deixa resíduo,
# nem quando falha.
#
# Alvos:
#   (padrão)        banco efêmero em Docker, reconstruído do schema versionado
#   --target=prod   produção, dentro de transação revertida (ensaio final de migration)
set -euo pipefail

cd "$(dirname "$0")/.."

TARGET="local"
for arg in "$@"; do
  case "$arg" in
    --target=*) TARGET="${arg#*=}" ;;
    *) echo "argumento desconhecido: $arg" >&2; exit 2 ;;
  esac
done

CONTAINER="proseller-dbtest"
IMAGE="${PGTEST_IMAGE:-postgres:16-alpine}"
PORT="${PGTEST_PORT:-55432}"

if [ "$TARGET" = "prod" ]; then
  : "${SUPABASE_DB_URL:?defina SUPABASE_DB_URL (ou rode: source .envrc)}"
  PSQL=(psql "$SUPABASE_DB_URL" -X -q -v ON_ERROR_STOP=1)
  echo "alvo: PRODUÇÃO (toda transação será revertida)"
else
  export PGPASSWORD=test
  PSQL=(psql -h localhost -p "$PORT" -U postgres -d proseller -X -q -v ON_ERROR_STOP=1)

  if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
    echo "subindo $IMAGE em :$PORT ..."
    docker run -d --name "$CONTAINER" \
      -e POSTGRES_PASSWORD=test -e POSTGRES_DB=proseller \
      -p "$PORT":5432 "$IMAGE" >/dev/null
  elif [ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER")" != "true" ]; then
    docker start "$CONTAINER" >/dev/null
  fi

  until "${PSQL[@]}" -c 'select 1' >/dev/null 2>&1; do sleep 1; done

  echo "reconstruindo schema a partir do repositório ..."
  "${PSQL[@]}" -c 'drop schema if exists public cascade;
                   drop schema if exists auth cascade;
                   create schema public;' >/dev/null

  "${PSQL[@]}" -f tests/db/bootstrap.sql >/dev/null

  # Sequences referenciadas por DEFAULT nextval() — extraídas do próprio schema
  # para a lista nunca envelhecer em relação a ele.
  grep -o "nextval('[^']*'" supabase/schema_baseline.sql \
    | sed "s/nextval('//;s/'$//" | sort -u \
    | awk '{print "CREATE SEQUENCE IF NOT EXISTS " $0 ";"}' \
    | "${PSQL[@]}" >/dev/null

  # Duas passagens no baseline: ele declara as POLICIES antes das FUNÇÕES que
  # elas chamam (as funções vivem na migration 122). A 1ª passagem cria tabelas,
  # constraints e índices; a 2ª, depois das funções, fecha as policies que
  # faltaram. Tolerante a erro de propósito — o gate é a contagem no fim.
  PSQL_SOFT=("${PSQL[@]/-v ON_ERROR_STOP=1/}")
  "${PSQL_SOFT[@]}" -f supabase/schema_baseline.sql >/dev/null 2>&1 || true

  # Views: o baseline versionou só tabelas. A migration 122 depende delas
  # (exportar_clientes RETURNS SETOF cliente_exportacao, que é uma view).
  "${PSQL_SOFT[@]}" -f supabase/schema_views.sql >/dev/null 2>&1 || true

  # Funções: baseline de prod (122) + tudo que veio depois. As migrations
  # anteriores a 122 já estão refletidas no baseline — reaplicá-las quebraria.
  for f in supabase/migrations/*.sql; do
    n="$(basename "$f")"
    num="${n%%_*}"
    case "$num" in
      ''|*[!0-9]*) continue ;;                 # nome fora do padrão NNN_
    esac
    [ "$((10#$num))" -ge 122 ] || continue
    case "$n" in *backup*) continue ;; esac    # arquivos *_backup_* são registro histórico
    "${PSQL[@]}" -f "$f" >/dev/null 2>&1 || echo "  aviso: $n não aplicou (segue)"
  done

  # 2ª passagem: policies que dependiam das funções.
  "${PSQL_SOFT[@]}" -f supabase/schema_baseline.sql >/dev/null 2>&1 || true

  n_tab=$("${PSQL[@]}" -tAc "select count(*) from information_schema.tables
            where table_schema='public';")
  n_func=$("${PSQL[@]}" -tAc "select count(*) from pg_proc p
             join pg_namespace nsp on nsp.oid=p.pronamespace where nsp.nspname='public';")
  echo "schema pronto: $n_tab tabelas, $n_func funções"

  # Gate: reconstrução incompleta invalidaria os casos silenciosamente.
  if [ "$n_tab" -lt 60 ] || [ "$n_func" -lt 100 ]; then
    echo "ERRO: reconstrução incompleta (esperado >=60 tabelas e >=100 funções)." >&2
    exit 3
  fi
fi

falhas=0
total=0
for caso in tests/db/cases/*.sql; do
  [ -e "$caso" ] || { echo "nenhum caso em tests/db/cases/"; exit 0; }
  total=$((total + 1))
  nome="$(basename "$caso" .sql)"
  saida="$( { echo 'BEGIN;'; cat "$caso"; echo 'ROLLBACK;'; } | "${PSQL[@]}" 2>&1 )" && ok=1 || ok=0
  if [ "$ok" = 1 ]; then
    echo "  ok    $nome"
  else
    falhas=$((falhas + 1))
    echo "  FALHA $nome"
    echo "$saida" | sed 's/^/          /'
  fi
done

echo ""
if [ "$falhas" -eq 0 ]; then
  echo "$total caso(s) — todos passaram"
else
  echo "$total caso(s) — $falhas falharam"
fi
exit $((falhas > 0 ? 1 : 0))
