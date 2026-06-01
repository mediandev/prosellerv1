// supabase/functions/<sua-funcao>/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
/**
 * Boas práticas aplicadas:
 * - Deno.serve (melhor integração no Edge)
 * - Cliente Supabase criado por request
 * - Timeouts e Logs
 * - Tratamento do retorno dinâmico do Tiny (Objeto vs Array)
 */ const CORS_BASE = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json"
};
function corsHeaders(extra) {
  return {
    ...CORS_BASE,
    ...extra ?? {}
  };
}
function convertTipoPessoa(tipo) {
  if (tipo === 1) return "F";
  if (tipo === 2) return "J";
  if (tipo === 3) return "E";
  return "";
}
const DEFAULT_STAGE_TIMEOUT_MS = 25000;
function now() {
  return Date.now();
}
async function withTimeout(p, label, ms = DEFAULT_STAGE_TIMEOUT_MS) {
  const start = now();
  const timeout = new Promise((_, rej)=>setTimeout(()=>rej(new Error(`Timeout em ${label} (${ms}ms)`)), ms));
  try {
    const out = await Promise.race([
      p,
      timeout
    ]);
    const dur = now() - start;
    console.log(`✅ ${label} em ${dur}ms`);
    return out;
  } catch (e) {
    const dur = now() - start;
    console.error(`❌ ${label} falhou após ${dur}ms:`, e);
    throw e;
  }
}
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders()
    });
  }
  const traceId = crypto.randomUUID();
  console.log(`▶️  [${traceId}] Início`);
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const SUPABASE_KEY = SERVICE_ROLE || ANON;
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error("Variáveis de ambiente SUPABASE_URL/KEY ausentes");
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: false
      },
      global: {
        headers: {
          "X-Trace-Id": traceId
        }
      }
    });
    // 1) Parse do request
    const raw = await withTimeout(req.text(), "Ler corpo do request", 5000);
    let body;
    try {
      body = JSON.parse(raw);
    } catch (e) {
      throw new Error(`Erro ao parsear JSON: ${e?.message ?? e}`);
    }
    const { API_Code, pedido_venda_ID, id_vendedor, nome_vendedor } = body;
    if (!API_Code || !pedido_venda_ID) {
      throw new Error("Dados inválidos: API_Code e pedido_venda_ID são obrigatórios.");
    }
    const pedidoId = Number(pedido_venda_ID);
    if (!Number.isFinite(pedidoId)) {
      throw new Error("pedido_venda_ID deve ser numérico");
    }
    const TINY_API_TOKEN = API_Code;
    const TINY_API_ENDPOINT = `https://api.tiny.com.br/api2/pedido.incluir.php?token=${TINY_API_TOKEN}&formato=json`;
    // 2) Buscar pedido principal
    const { data: pedido, error: pedidoError } = await withTimeout(supabase.from("pedido_venda").select("cliente_id, vendedor_uuid, ordem_cliente, observacao, observacao_interna, natureza_operacao").eq("pedido_venda_ID", pedidoId).single(), "Buscar pedido_venda");
    if (pedidoError || !pedido) throw new Error(`Erro pedido: ${pedidoError?.message}`);
    // 3) Consultas paralelas
    const naturezaPromise = supabase.from("natureza_operacao").select("tem_comissao").eq("nome", pedido.natureza_operacao).maybeSingle();
    const clientePromise = supabase.from("cliente_completo").select("*").eq("cliente_id", pedido.cliente_id).single();
    const detalhesPromise = supabase.from("detalhes_pedido_venda").select("id_condicao").eq("pedido_venda_id", pedidoId).single();
    const itensPromise = supabase.from("pedido_venda_produtos").select("quantidade, valor_unitario, produto_id, descricao").eq("pedido_venda_id", pedidoId);
    const [{ data: natureza }, { data: cliente, error: clienteErr }, { data: detalhes, error: detalhesErr }, { data: itens, error: itensErr }] = await withTimeout(Promise.all([
      naturezaPromise,
      clientePromise,
      detalhesPromise,
      itensPromise
    ]), "Consultas paralelas");
    let shouldGenerateCommission = false;
    if (natureza) shouldGenerateCommission = natureza.tem_comissao === true;
    if (clienteErr || !cliente) throw new Error(`Erro cliente: ${clienteErr?.message}`);
    if (detalhesErr || !detalhes?.id_condicao) throw new Error("Erro detalhes/condição");
    if (itensErr || !itens || itens.length === 0) throw new Error("Erro itens");
    // 4) SKUs
    const uniqueProductIds = [
      ...new Set(itens.map((p)=>p.produto_id))
    ];
    const { data: produtosInfo } = await withTimeout(supabase.from("produto").select("produto_id, codigo_sku").in("produto_id", uniqueProductIds), "Buscar SKUs");
    const skuMap = {};
    if (produtosInfo) for (const p of produtosInfo)skuMap[p.produto_id] = p.codigo_sku;
    // 5) Condição Pagamento
    const { data: condicaoPagamento } = await withTimeout(supabase.from("Condicao_De_Pagamento").select("intervalo_parcela, Desconto").eq("Condição_ID", detalhes.id_condicao).single(), "Buscar Condicao_De_Pagamento");
    if (!condicaoPagamento) throw new Error("Condição pagto não encontrada");
    // 6) Cálculos
    const valorTotalPedido = itens.reduce((sum, p)=>sum + p.quantidade * p.valor_unitario, 0);
    const descontoExtra = condicaoPagamento.Desconto ? valorTotalPedido * (condicaoPagamento.Desconto / 100) : 0;
    const valorTotalComDesconto = +(valorTotalPedido - descontoExtra).toFixed(2);
    await supabase.from("pedido_venda").update({
      valor_total: valorTotalComDesconto
    }).eq("pedido_venda_ID", pedidoId);
    // 7) Parcelas
    const intervalosRaw = condicaoPagamento.intervalo_parcela;
    const intervalos = Array.isArray(intervalosRaw) ? intervalosRaw : intervalosRaw != null ? [
      intervalosRaw
    ] : [];
    const parcelas = intervalos.map((dias)=>({
        parcela: {
          dias,
          valor: (valorTotalComDesconto / intervalos.length).toFixed(2),
          forma_pagamento: "boleto",
          meio_pagamento: "Bradesco"
        }
      }));
    // 8) Montar Payload Tiny
    const pedidoTiny = {
      pedido: {
        data_pedido: new Date().toISOString().slice(0, 10).split("-").reverse().join("/"),
        cliente: {
          codigo: cliente.cliente_id,
          nome: cliente.nome,
          nome_fantasia: cliente.nome_fantasia,
          tipo_pessoa: convertTipoPessoa(cliente.ref_tipo_pessoa_id_FK),
          cpf_cnpj: cliente.cpf_cnpj,
          ie: cliente.inscricao_estadual || "",
          endereco: cliente.rua,
          numero: cliente.numero,
          complemento: cliente.complemento,
          bairro: cliente.bairro,
          cep: cliente.cep,
          cidade: cliente.cidade,
          uf: cliente.uf,
          fone: cliente.telefone
        },
        numero_ordem_compra: pedido.ordem_cliente,
        obs: pedido.observacao,
        obs_internas: pedido.observacao_interna,
        valor_desconto: descontoExtra.toFixed(2),
        parcelas,
        itens: itens.map((p)=>({
            item: {
              codigo: skuMap[p.produto_id] || p.produto_id,
              quantidade: p.quantidade,
              valor_unitario: p.valor_unitario,
              descricao: p.descricao
            }
          }))
      }
    };
    if (id_vendedor) pedidoTiny.pedido.id_vendedor = String(id_vendedor).trim();
    if (nome_vendedor) pedidoTiny.pedido.nome_vendedor = String(nome_vendedor).trim();
    // 9) Enviar ao Tiny
    console.log(`🌐 [${traceId}] Enviando para Tiny...`);
    const form = new URLSearchParams();
    form.append("pedido", JSON.stringify(pedidoTiny));
    const tinyText = await withTimeout(fetch(TINY_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: form.toString()
    }).then((r)=>r.text()), "POST Tiny");
    let tinyResponse;
    try {
      tinyResponse = JSON.parse(tinyText);
    } catch  {
      tinyResponse = {
        raw: tinyText
      };
    }
    // 10) Salvar retorno (ID/Numero) no Supabase - CORRIGIDO
    try {
      const retorno = tinyResponse?.retorno;
      if (retorno?.status === 'OK' || retorno?.status === 'Processado') {
        let registro = null;
        // Lógica robusta para tratar Objeto vs Array no Tiny
        if (retorno.registros) {
          // Se for o formato que você enviou: { registros: { registro: {...} } }
          if (retorno.registros.registro && !Array.isArray(retorno.registros.registro)) {
            registro = retorno.registros.registro;
          } else if (Array.isArray(retorno.registros)) {
            registro = retorno.registros[0]?.registro;
          } else if (Array.isArray(retorno.registros.registro)) {
            registro = retorno.registros.registro[0];
          }
        }
        if (registro && registro.id) {
          const idTinyGerado = String(registro.id);
          const numeroPedidoTiny = String(registro.numero);
          console.log(`📝 [${traceId}] Atualizando Supabase: TinyID=${idTinyGerado}, Num=${numeroPedidoTiny}`);
          await withTimeout(supabase.from("pedido_venda").update({
            id_tiny: idTinyGerado,
            numero_pedido: numeroPedidoTiny
          }).eq("pedido_venda_ID", pedidoId), "Atualizar id_tiny/numero_pedido");
        } else {
          console.warn(`⚠️ [${traceId}] Estrutura 'registro' não encontrada no JSON do Tiny.`);
        }
      }
    } catch (updateError) {
      console.error(`❌ [${traceId}] Erro ao salvar ID Tiny:`, updateError);
    }
    const out = {
      success: true,
      trace_id: traceId,
      data: {
        pedido_id: pedidoId,
        tiny_response: tinyResponse
      }
    };
    return new Response(JSON.stringify(out), {
      headers: corsHeaders()
    });
  } catch (error) {
    console.error(`💥 [${traceId}] Erro:`, error);
    return new Response(JSON.stringify({
      success: false,
      error: String(error?.message ?? error)
    }), {
      headers: corsHeaders(),
      status: 500
    });
  }
});
