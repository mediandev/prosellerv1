#!/usr/bin/env python3
"""
drift-check — detecta divergência entre PRODUÇÃO e o repositório.

Motivo (item 4 da estabilização): edge functions, RPCs e migrations vão para
produção por comando MANUAL. O CI só vê o que passa pelo GitHub, então o caminho
que efetivamente muda produção não tinha verificação nenhuma. Já houve divergência
repo↔prod de verdade (auditoria 2026-06-01).

Duas verificações:

  A) FUNÇÕES — sha256 da definição de cada função do schema `public` em prod,
     comparado com `docs/specs/prod-functions.lock.json`. Detecta função alterada
     fora do fluxo, função nova não versionada e função removida.

  B) ENUMS — valores de enum usados no código-fonte que NÃO existem no enum do
     banco. Foi assim que "Aguardando Agendamento" entrou no front sem existir no
     tipo `status_entrega_frete`: arrastar o card para essa coluna falha em prod.

Uso:
    python3 scripts/drift-check.py            # verifica; sai 1 se houver divergência
    python3 scripts/drift-check.py --update   # regrava o lock com o estado atual de prod

Requer SUPABASE_ACCESS_TOKEN (está no .envrc). Somente leitura no banco.
"""

import hashlib
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
LOCK = REPO / "docs/specs/prod-functions.lock.json"
PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "xxoiqfraeolsqsmsheue")

# Onde procurar literais de enum. Pares (glob, nome do enum no banco).
FONTES_ENUM = [
    ("src/components/logistica/**/*.tsx", "status_entrega_frete"),
    ("src/components/logistica/**/*.ts", "status_entrega_frete"),
    ("supabase/functions/_shared/*.ts", "status_entrega_frete"),
    ("supabase/functions/frete-logistica-v1/*.ts", "status_entrega_frete"),
]

# Literais que aparecem nesses arquivos mas não são valores de status.
IGNORAR_LITERAIS = {"Todos", "Todas", "todos", "", "-", "—"}


def sql(query: str):
    token = os.environ.get("SUPABASE_ACCESS_TOKEN")
    if not token:
        sys.exit("SUPABASE_ACCESS_TOKEN ausente (rode `source .envrc`).")
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
        data=json.dumps({"query": query}).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0",
        },
        method="POST",
    )
    return json.loads(urllib.request.urlopen(req, timeout=120).read().decode() or "[]")


def funcoes_prod() -> dict:
    rows = sql(
        """
        SELECT p.proname AS nome,
               pg_get_function_identity_arguments(p.oid) AS args,
               pg_get_functiondef(p.oid) AS def
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.prokind = 'f'
         ORDER BY 1, 2;
        """
    )
    return {
        f"{r['nome']}({r['args']})": hashlib.sha256(r["def"].encode()).hexdigest()
        for r in rows
    }


def enums_prod() -> dict:
    rows = sql(
        """
        SELECT t.typname AS enum, e.enumlabel AS valor
          FROM pg_type t
          JOIN pg_enum e ON e.enumtypid = t.oid
          JOIN pg_namespace n ON n.oid = t.typnamespace
         WHERE n.nspname = 'public'
         ORDER BY 1, e.enumsortorder;
        """
    )
    out: dict = {}
    for r in rows:
        out.setdefault(r["enum"], []).append(r["valor"])
    return out


def checar_funcoes(atual: dict) -> list:
    if not LOCK.exists():
        return ["lock ausente — rode `python3 scripts/drift-check.py --update`"]

    lock = json.loads(LOCK.read_text())["funcoes"]
    problemas = []
    for chave, sha in sorted(atual.items()):
        if chave not in lock:
            problemas.append(f"FUNÇÃO NOVA em prod, ausente no lock: {chave}")
        elif lock[chave] != sha:
            problemas.append(f"FUNÇÃO ALTERADA em prod (definição difere do lock): {chave}")
    for chave in sorted(lock):
        if chave not in atual:
            problemas.append(f"FUNÇÃO SUMIU de prod (existe no lock): {chave}")
    return problemas


def checar_enums(enums: dict) -> list:
    """
    Literal de status usado no código que não existe no enum do banco.

    Escopo do arquivo, não da linha: a primeira versão desta função exigia a
    palavra "status" na MESMA linha do literal e por isso passou em silêncio
    justamente no caso real ("Aguardando Agendamento" aparece em listas e mapas
    de cor, sem a palavra status na linha). Um verificador que fica quieto no
    único defeito conhecido é pior que não ter verificador.

    Regra atual: se o arquivo já usa valores válidos deste enum, ele é um arquivo
    do domínio; então qualquer literal que PAREÇA um valor do mesmo enum
    (compartilha a primeira palavra) mas não exista no banco é divergência.
    """
    problemas = []
    literal = re.compile(r"['\"]([A-ZÀ-Ú][^'\"]{2,40})['\"]")

    for padrao, nome_enum in FONTES_ENUM:
        validos = set(enums.get(nome_enum, []))
        if not validos:
            continue
        primeiras_validas = {v.split()[0].split("-")[0].strip() for v in validos}

        for caminho in REPO.glob(padrao):
            try:
                linhas = caminho.read_text(encoding="utf-8").splitlines()
            except (OSError, UnicodeDecodeError):
                continue

            texto = "\n".join(linhas)
            if not any(v in texto for v in validos):
                continue  # arquivo não é do domínio deste enum

            for n, linha in enumerate(linhas, 1):
                for valor in literal.findall(linha):
                    if valor in IGNORAR_LITERAIS or valor in validos:
                        continue
                    primeira = valor.split()[0].split("-")[0].strip()
                    if primeira in primeiras_validas:
                        rel = caminho.relative_to(REPO)
                        problemas.append(
                            f'ENUM `{nome_enum}` não tem "{valor}" — usado em {rel}:{n}'
                        )
    return sorted(set(problemas))


def main() -> int:
    atualizar = "--update" in sys.argv
    funcoes = funcoes_prod()
    enums = enums_prod()

    if atualizar:
        LOCK.parent.mkdir(parents=True, exist_ok=True)
        LOCK.write_text(
            json.dumps(
                {
                    "_comentario": (
                        "Estado das funções de PRODUÇÃO. Gerado por scripts/drift-check.py "
                        "--update. Atualize APÓS todo deploy legítimo de RPC/migration; "
                        "uma diferença não explicada é divergência repo↔prod."
                    ),
                    "projeto": PROJECT_REF,
                    "funcoes": funcoes,
                    "enums": enums,
                },
                indent=2,
                ensure_ascii=False,
                sort_keys=True,
            )
            + "\n"
        )
        print(f"lock atualizado: {len(funcoes)} funções, {len(enums)} enums")
        return 0

    problemas = checar_funcoes(funcoes) + checar_enums(enums)

    # Divergências já conhecidas e conscientemente aceitas (cada uma com prazo/dono
    # em `docs/plans/EXECUCAO-LOTE-2026-07.md`). Existem para que o alarme fique
    # verde no que já está decidido e vermelho só no que é NOVO — um verificador
    # cronicamente vermelho é um verificador que ninguém lê.
    aceitas = []
    if LOCK.exists():
        aceitas = json.loads(LOCK.read_text()).get("divergencias_aceitas", [])

    ignoradas = [p for p in problemas if any(a in p for a in aceitas)]
    problemas = [p for p in problemas if p not in ignoradas]

    if ignoradas:
        print(f"({len(ignoradas)} divergência(s) conhecida(s) e aceita(s), não contam como falha)")

    if not problemas:
        print(f"sem divergência — {len(funcoes)} funções e {len(enums)} enums conferem")
        return 0

    print(f"{len(problemas)} DIVERGÊNCIA(S):\n")
    for p in problemas:
        print(f"  · {p}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
