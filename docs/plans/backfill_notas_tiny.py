#!/usr/bin/env python3
"""
Backfill de NF-e nos fretes a partir do Tiny (somente notas REAIS já existentes).

Fluxo por frete (id>1, pedido com id_tiny):
  pedido.obter -> id_nota_fiscal -> nota.fiscal.obter -> numero/chave/peso/volumes/transportador
  -> UPDATE frete_logistica

Uso:
  python3 backfill_notas_tiny.py            # DRY-RUN (nao grava nada)
  python3 backfill_notas_tiny.py --apply    # grava no banco
"""
import os, sys, json, time, urllib.request, urllib.parse

REF = "xxoiqfraeolsqsmsheue"
TOKEN = os.environ["SUPABASE_ACCESS_TOKEN"]
APPLY = "--apply" in sys.argv
PACE = 0.6  # s entre chamadas ao Tiny (respeitar rate limit)

UA = "Mozilla/5.0 (backfill-notas-tiny)"

def mgmt_sql(query):
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{REF}/database/query",
        data=json.dumps({"query": query}).encode(),
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json", "User-Agent": UA},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:300]
        raise SystemExit(f"Management API {e.code} em query:\n  {query.strip()[:120]}\n  -> {body}")

def tiny_get(url):
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                data = json.loads(r.read())
        except Exception as e:
            time.sleep(1.0 * (attempt + 1)); continue
        ret = data.get("retorno", {})
        # rate limit / bloqueio temporario -> backoff
        if str(ret.get("codigo_erro")) in ("6", "7") or ret.get("status_processamento") == "2":
            time.sleep(2.0 * (attempt + 1)); continue
        return ret
    return {"status": "ERRO_RATE_LIMIT"}

def sql_str(v):
    if v is None: return "NULL"
    return "'" + str(v).replace("'", "''") + "'"

# 1) candidatos + chave_api da empresa + mapa de transportadores
rows = mgmt_sql("""
  select f.id frete_id, f.nfe_numero, p.id_tiny, e.id empresa_id, e.nome empresa, e.chave_api
  from public.frete_logistica f
  join public.pedido_venda p on p."pedido_venda_ID" = f.pedido_venda_id
  join public.ref_empresas_subsidiarias e on e.id = f.empresa_id
  where f.deleted_at is null and f.id > 1 and p.id_tiny is not null
  order by f.id desc;
""")
transp_rows = mgmt_sql("select id, regexp_replace(coalesce(cnpj,''),'[^0-9]','','g') doc from public.transportador_logistica;")
transp_map = {r["doc"]: r["id"] for r in transp_rows if r.get("doc")}

print(f"{'APLICAR' if APPLY else 'DRY-RUN'} | candidatos: {len(rows)} fretes | transportadores cadastrados: {len(transp_map)}\n")

stats = {"com_nota": 0, "sem_nota": 0, "ja_tinha": 0, "erro": 0, "gravados": 0, "transp_casado": 0}
amostra = []

for row in rows:
    fid = row["frete_id"]; idt = row["id_tiny"]; chave_api = row["chave_api"]
    if row["nfe_numero"] is not None:
        stats["ja_tinha"] += 1
        continue
    if not chave_api:
        stats["erro"] += 1; continue

    ped = tiny_get(f"https://api.tiny.com.br/api2/pedido.obter.php?token={chave_api}&id={idt}&formato=json")
    time.sleep(PACE)
    if ped.get("status") != "OK":
        stats["erro"] += 1; continue
    id_nf = ped.get("pedido", {}).get("id_nota_fiscal")
    if not id_nf or str(id_nf) in ("0", ""):
        stats["sem_nota"] += 1; continue

    nf = tiny_get(f"https://api.tiny.com.br/api2/nota.fiscal.obter.php?token={chave_api}&id={id_nf}&formato=json")
    time.sleep(PACE)
    nota = nf.get("nota_fiscal") if nf.get("status") == "OK" else None
    if not nota:
        stats["erro"] += 1; continue

    numero = nota.get("numero")
    chave = nota.get("chave_acesso")
    try: numero_int = int(str(numero).lstrip("0") or "0")
    except: numero_int = None
    if not numero_int:
        stats["sem_nota"] += 1; continue

    peso = None
    try:
        pb = float(str(nota.get("peso_bruto") or ""))
        if pb > 0: peso = pb
    except: pass
    vol = None
    for k in ("volumes","qtd_volumes","quantidade_volumes","numero_volumes"):
        try:
            v = int(str(nota.get(k) or ""))
            if v > 0: vol = v; break
        except: pass
    transp = nota.get("transportador") or {}
    doc = "".join(ch for ch in str(transp.get("cpf_cnpj") or transp.get("cnpj") or "") if ch.isdigit())
    transp_id = transp_map.get(doc)
    if transp_id: stats["transp_casado"] += 1

    stats["com_nota"] += 1
    if len(amostra) < 8:
        amostra.append(f"  frete {fid} ({row['empresa']}): NFe {numero_int} | chave {str(chave)[:12]}… | peso {peso} | transp {transp.get('nome') or '—'}{' [casado]' if transp_id else ''}")

    if APPLY:
        sets = [f"nfe_numero = {numero_int}", f"nfe_chave_acesso = {sql_str(chave)}", "updated_at = now()"]
        if peso is not None: sets.append(f"peso_bruto = {peso}")
        if vol is not None: sets.append(f"volumes = {vol}")
        if transp_id: sets.append(f"transportador_id = {transp_id}")
        res = mgmt_sql(f"update public.frete_logistica set {', '.join(sets)} where id = {fid} and nfe_numero is null;")
        if isinstance(res, list) or res == []:
            stats["gravados"] += 1

print("Amostra de notas encontradas:")
print("\n".join(amostra) if amostra else "  (nenhuma)")
print("\nResumo:", json.dumps(stats, ensure_ascii=False))
if not APPLY:
    print("\n>>> DRY-RUN: nada foi gravado. Rode com --apply para gravar.")
