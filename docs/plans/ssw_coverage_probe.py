#!/usr/bin/env python3
"""
Sondagem READ-ONLY de cobertura SSW.
Chama https://ssw.inf.br/api/trackingdanfe para cada frete com chave e aplica
o MESMO mapeamento do sistema (frete-logistica-helpers.ts) para prever como o
Dashboard (Torre de Controle) ficaria. NÃO grava nada.
"""
import os, json, re, time, urllib.request

REF = "xxoiqfraeolsqsmsheue"
TOKEN = os.environ["SUPABASE_ACCESS_TOKEN"]
UA = "Mozilla/5.0 (ssw-probe)"

def mgmt_sql(query):
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{REF}/database/query",
        data=json.dumps({"query": query}).encode(),
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json", "User-Agent": UA},
        method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())

def ssw(chave):
    req = urllib.request.Request("https://ssw.inf.br/api/trackingdanfe",
        data=json.dumps({"chave_nfe": chave}).encode(),
        headers={"Content-Type": "application/json", "User-Agent": UA}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())
    except Exception as e:
        return {"success": False, "message": f"erro: {e}"}

def map_status(tipo, oc):
    up = oc.upper()
    if tipo == 'Entrega' and re.search(r'\(01\)', oc): return 'Entregue'
    if re.search(r'DEVOLU[CÇ][AÃ]O\s+ENTREGUE', oc, re.I) or re.search(r'DEVOLVIDO\s*-\s*ENTREGUE', oc, re.I): return 'Devolvido - Entregue'
    if re.search(r'DEVOLVID[AO]', oc, re.I) or re.search(r'DEVOLU[CÇ][AÃ]O', oc, re.I): return 'Devolvido - Trânsito'
    if re.search(r'RECUSAD[AO]', oc, re.I): return 'Recusado'
    if tipo == 'Cliente' and re.search(r'\(02\)', oc): return 'Agendado'
    if re.search(r'AGENDAD[AO]\s*\(08\)', oc, re.I): return 'Agendado'
    if re.search(r'REENTREGA', up): return 'Em Trânsito - Reentrega'
    return 'Em Trânsito'

rows = mgmt_sql("""
  select f.id, e.nome empresa, f.nfe_chave_acesso chave
  from public.frete_logistica f
  join public.ref_empresas_subsidiarias e on e.id = f.empresa_id
  where f.deleted_at is null and f.nfe_chave_acesso is not null
  order by f.id;
""")
print(f"Sondando SSW para {len(rows)} fretes com chave...\n")

found = {}   # empresa -> {ok, nao}
status_count = {}
exemplos = []
for r in rows:
    resp = ssw(r["chave"]); time.sleep(0.1)
    emp = r["empresa"]; found.setdefault(emp, {"ok": 0, "nao": 0})
    if resp.get("success"):
        found[emp]["ok"] += 1
        tr = resp.get("documento", {}).get("tracking", [])
        st = map_status(tr[-1]["tipo"], tr[-1]["ocorrencia"]) if tr else "Em Trânsito"
        status_count[st] = status_count.get(st, 0) + 1
        if len(exemplos) < 8 and tr:
            exemplos.append(f"  frete {r['id']} ({emp}): {len(tr)} eventos | último: {tr[-1]['ocorrencia'][:45]} -> {st}")
    else:
        found[emp]["nao"] += 1

print("Cobertura SSW por empresa (transportadora na rede SSW?):")
for emp, c in found.items():
    print(f"  {emp:24} encontrados: {c['ok']:3}  | não localizados: {c['nao']:3}")

print("\nStatus resultante (dos encontrados no SSW):")
for st, n in sorted(status_count.items(), key=lambda x: -x[1]):
    print(f"  {st:24} {n}")

# Buckets do dashboard
buckets = {
  "Em Trânsito": ["Em Trânsito", "Em Trânsito - Reentrega"],
  "Reentrega": ["Em Trânsito - Reentrega"],
  "Agendados": ["Agendado"],
  "Devoluções em Trânsito": ["Devolvido - Trânsito"],
  "Recusadas": ["Recusado"],
}
print("\nComo o Dashboard (Torre de Controle) ficaria:")
for card, sts in buckets.items():
    n = sum(status_count.get(s, 0) for s in sts)
    print(f"  {card:26} {n}")

print("\nExemplos:")
print("\n".join(exemplos) if exemplos else "  (nenhum)")
print("\n>>> SONDAGEM read-only: nada gravado.")
