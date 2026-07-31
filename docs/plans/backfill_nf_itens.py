# Backfill one-off: popula nota_fiscal_item para pedidos já faturados.
# Fluxo por pedido: pedido.obter (Tiny) -> id_nota_fiscal -> nota.fiscal.obter -> INSERT.
# Throttle 2.2s entre chamadas Tiny (respeita ~30 req/min). Idempotente:
# pula pedidos que já têm itens; DELETE+INSERT por nota.
import os, json, time, urllib.request, urllib.parse, sys

TOK = os.environ['SUPABASE_ACCESS_TOKEN']
REF = 'xxoiqfraeolsqsmsheue'

def sql(query):
    req = urllib.request.Request(f'https://api.supabase.com/v1/projects/{REF}/database/query',
        data=json.dumps({'query': query}).encode(),
        headers={'Authorization': f'Bearer {TOK}','Content-Type':'application/json','User-Agent':'Mozilla/5.0'}, method='POST')
    return json.loads(urllib.request.urlopen(req, timeout=60).read().decode() or '[]')

def tiny(endpoint, token, id_):
    data = urllib.parse.urlencode({'token': token, 'id': id_, 'formato': 'json'}).encode()
    req = urllib.request.Request(f'https://api.tiny.com.br/api2/{endpoint}', data=data, headers={'User-Agent':'Mozilla/5.0'})
    time.sleep(2.2)
    return json.loads(urllib.request.urlopen(req, timeout=30).read().decode())

def esc(s):
    return "NULL" if s is None else "'" + str(s).replace("'", "''") + "'"

# pedidos alvo: pós-faturamento, com id_tiny, sem itens já gravados
alvos = sql("""select pv."pedido_venda_ID" pid, pv.id_tiny, pv.empresa_faturamento_id emp
 from pedido_venda pv
 where pv.id_tiny is not null and pv.deleted_at is null
   and pv.status in ('Entregue','Enviado','Faturado','Pronto para envio','Preparando envio')
   and not exists (select 1 from nota_fiscal_item n where n.pedido_venda_id = pv."pedido_venda_ID")
 order by pv."pedido_venda_ID";""")
print(f"alvos: {len(alvos)}", flush=True)

tokens = {str(r['id']): r['chave_api'] for r in sql("select id, chave_api from ref_empresas_subsidiarias where chave_api is not null;")}

ok = sem_nota = err = 0
for i, a in enumerate(alvos):
    pid, idt, emp = a['pid'], a['id_tiny'], str(a['emp'])
    tk = tokens.get(emp)
    if not tk:
        err += 1; continue
    try:
        ped = tiny('pedido.obter.php', tk, idt)
        p = (ped.get('retorno') or {}).get('pedido') or {}
        idnf = p.get('id_nota_fiscal')
        if not idnf or str(idnf) in ('0',''):
            sem_nota += 1
            continue
        nf = tiny('nota.fiscal.obter.php', tk, idnf)
        nota = (nf.get('retorno') or {}).get('nota_fiscal') or {}
        itens = nota.get('itens') or []
        rows = []
        de = str(nota.get('data_emissao') or '')
        dpart = de.split('/')
        diso = f"'{dpart[2][:4]}-{dpart[1]}-{dpart[0]}'" if len(dpart) == 3 else "NULL"
        for w in itens:
            it = w.get('item') if isinstance(w, dict) and 'item' in w else w
            if not it: continue
            qtd = float(str(it.get('quantidade') or 0) or 0)
            vu = float(str(it.get('valor_unitario') or 0) or 0)
            vt = float(str(it.get('valor_total') or it.get('valor') or 0) or 0) or qtd*vu
            rows.append(f"({pid},{esc(str(idnf))},{esc(nota.get('numero'))},{diso},{esc(it.get('codigo'))},{esc(it.get('descricao'))},{qtd},{vu},{vt})")
        if rows:
            sql(f"delete from nota_fiscal_item where id_nota_tiny = {esc(str(idnf))};")
            sql("insert into nota_fiscal_item (pedido_venda_id,id_nota_tiny,numero_nota,data_emissao,codigo_sku,descricao,quantidade,valor_unitario,valor_total) values " + ",".join(rows) + ";")
            ok += 1
        else:
            sem_nota += 1
    except Exception as e:
        err += 1
        print(f"  pedido {pid}: ERRO {e}", flush=True)
    if (i+1) % 25 == 0:
        print(f"[{i+1}/{len(alvos)}] ok={ok} sem_nota={sem_nota} err={err}", flush=True)

print(f"FIM: ok={ok} sem_nota={sem_nota} err={err}", flush=True)
