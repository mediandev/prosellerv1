#!/usr/bin/env python3
"""
Vincula a transportadora (transportador_id) nos fretes já com NF-e.
Puxa o CNPJ do transportador da nota no Tiny (pedido.obter -> nota.obter) e casa
com transportador_logistica.cnpj. Também completa peso/volumes se faltarem.

  python3 link_transportadoras.py            # DRY-RUN
  python3 link_transportadoras.py --apply     # grava
"""
import os, sys, json, time, urllib.request

REF = "xxoiqfraeolsqsmsheue"
TOKEN = os.environ["SUPABASE_ACCESS_TOKEN"]
APPLY = "--apply" in sys.argv
PACE = 0.6
UA = "Mozilla/5.0 (link-transp)"

def mgmt_sql(query):
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{REF}/database/query",
        data=json.dumps({"query": query}).encode(),
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json", "User-Agent": UA},
        method="POST")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise SystemExit(f"Mgmt API {e.code}: {e.read().decode()[:200]}\nQUERY: {query[:120]}")

def tiny_get(url):
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                data = json.loads(r.read())
        except Exception:
            time.sleep(1.0*(attempt+1)); continue
        ret = data.get("retorno", {})
        if str(ret.get("codigo_erro")) in ("6","7") or ret.get("status_processamento")==2:
            time.sleep(2.0*(attempt+1)); continue
        return ret
    return {"status":"ERRO"}

# mapa cnpj(digitos) -> transportador_id
tmap = {}
for t in mgmt_sql("select id, regexp_replace(coalesce(cnpj,''),'[^0-9]','','g') doc from public.transportador_logistica where deleted_at is null"):
    if t.get("doc"): tmap[t["doc"]] = t["id"]
print(f"transportadores cadastrados: {len(tmap)}")

rows = mgmt_sql("""
  select f.id frete_id, f.peso_bruto, f.volumes, p.id_tiny, e.chave_api
  from public.frete_logistica f
  join public.pedido_venda p on p."pedido_venda_ID" = f.pedido_venda_id
  join public.ref_empresas_subsidiarias e on e.id = f.empresa_id
  where f.deleted_at is null and f.id > 1 and f.nfe_chave_acesso is not null
    and f.transportador_id is null and p.id_tiny is not null
  order by f.id;
""")
print(f"{'APLICAR' if APPLY else 'DRY-RUN'} | fretes sem transportadora: {len(rows)}\n")

stats = {"casado":0,"transp_nao_cadastrado":0,"sem_transp_na_nota":0,"erro":0,"gravados":0}
nomes_nao_cadastrados = {}
amostra = []

for row in rows:
    fid = row["frete_id"]; idt = row["id_tiny"]; ck = row["chave_api"]
    ped = tiny_get(f"https://api.tiny.com.br/api2/pedido.obter.php?token={ck}&id={idt}&formato=json"); time.sleep(PACE)
    if ped.get("status")!="OK": stats["erro"]+=1; continue
    idnf = ped.get("pedido",{}).get("id_nota_fiscal")
    if not idnf: stats["erro"]+=1; continue
    nf = tiny_get(f"https://api.tiny.com.br/api2/nota.fiscal.obter.php?token={ck}&id={idnf}&formato=json"); time.sleep(PACE)
    nota = nf.get("nota_fiscal") if nf.get("status")=="OK" else None
    if not nota: stats["erro"]+=1; continue

    transp = nota.get("transportador") or {}
    nome = transp.get("nome") or "?"
    doc = "".join(c for c in str(transp.get("cpf_cnpj") or transp.get("cnpj") or "") if c.isdigit())
    if not doc:
        stats["sem_transp_na_nota"]+=1; continue
    tid = tmap.get(doc)
    if not tid:
        stats["transp_nao_cadastrado"]+=1
        nomes_nao_cadastrados[f"{nome} ({doc})"] = nomes_nao_cadastrados.get(f"{nome} ({doc})",0)+1
        continue

    stats["casado"]+=1
    if len(amostra)<8: amostra.append(f"  frete {fid}: {nome} (cnpj {doc}) -> transportador_id {tid}")

    if APPLY:
        sets=[f"transportador_id={tid}","updated_at=now()"]
        if row.get("peso_bruto") is None:
            try:
                pb=float(str(nota.get("peso_bruto") or ""))
                if pb>0: sets.append(f"peso_bruto={pb}")
            except: pass
        res = mgmt_sql(f"update public.frete_logistica set {', '.join(sets)} where id={fid} and transportador_id is null;")
        if res==[] or isinstance(res,list): stats["gravados"]+=1

print("Amostra:"); print("\n".join(amostra) if amostra else "  (nenhuma)")
if nomes_nao_cadastrados:
    print("\nTransportadoras na nota SEM cadastro (cnpj não bate):")
    for k,v in sorted(nomes_nao_cadastrados.items(), key=lambda x:-x[1]): print(f"  {k}: {v} fretes")
print("\nResumo:", json.dumps(stats, ensure_ascii=False))
if not APPLY: print("\n>>> DRY-RUN: nada gravado.")
