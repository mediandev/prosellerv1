// supabase/functions/<sua-funcao>/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
// ─────────────────────────────────────────────────────────
// Utilitários
// ─────────────────────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json"
};
function corsHeaders(extra) {
  return {
    ...CORS,
    ...extra ?? {}
  };
}
function convertTipoPessoa(tipo) {
  if (tipo === 1) return "F";
  if (tipo === 2) return "J";
  if (tipo === 3) return "E";
  return "";
}
function now() {
  return Date.now();
}
async function withTimeout(p, label, ms = 25000 // 25s por etapa
) {
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
// ─────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders()
    });
  }
  const traceId = crypto.randomUUID();
  console.log(`▶️  [${traceId}] Início`);
  try {
    // Env por request (melhor prática no Edge)
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    // Preferir SERVICE_ROLE se existir; senão, ANON
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
    // 1) Parse request
    const raw = await withTimeout(req.text(), "Ler corpo do request", 5000);
    console.log(`🔹 [${traceId}] Request recebido: ${raw}`);
    let body;
    try {
      body = JSON.parse(raw);
    } catch (e) {
      throw new Error(`Erro ao parsear JSON: ${e?.message ?? e}`);
    }
    const { API_Code, pedido_venda_ID, useAlternateVendor } = body;
    // Validação ajustada para aceitar false no boolean
    if (!API_Code || pedido_venda_ID == null || typeof useAlternateVendor === 'undefined') {
      throw new Error("Dados de requisição inválidos (API_Code, pedido_venda_ID, useAlternateVendor)");
    }
    const pedidoId = Number(pedido_venda_ID);
    if (!Number.isFinite(pedidoId)) {
      throw new Error("pedido_venda_ID deve ser numérico");
    }
    const TINY_API_TOKEN = API_Code;
    const TINY_API_ENDPOINT = `https://api.tiny.com.br/api2/pedido.incluir.php?token=${TINY_API_TOKEN}&formato=json`;
    // 2) Buscar pedido
    const { data: pedido, error: pedidoError } = await withTimeout(supabase.from("pedido_venda").select("cliente_id, vendedor_uuid, ordem_cliente, observacao, observacao_interna, natureza_operacao").eq("pedido_venda_ID", pedidoId).single(), "Buscar pedido_venda");
    if (pedidoError || !pedido) {
      throw new Error(`Erro ao buscar pedido: ${pedidoError?.message ?? "vazio"}`);
    }
    console.log(`📦 [${traceId}] Pedido encontrado: ${JSON.stringify(pedido)}`);
    // 3) Consultas paralelas que não dependem umas das outras
    const naturezaPromise = supabase.from("natureza_operacao").select("tem_comissao").eq("nome", pedido.natureza_operacao).maybeSingle();
    const clientePromise = supabase.from("cliente_completo").select("*").eq("cliente_id", pedido.cliente_id).single();
    const detalhesPromise = supabase.from("detalhes_pedido_venda").select("id_condicao").eq("pedido_venda_id", pedidoId).single();
    const produtosPromise = supabase.from("pedido_venda_produtos").select("quantidade, valor_unitario, produto_id, descricao").eq("pedido_venda_id", pedidoId);
    const [{ data: natureza, error: natErr }, { data: cliente, error: clienteErr }, { data: detalhes, error: detalhesErr }, { data: itens, error: itensErr }] = await withTimeout(Promise.all([
      naturezaPromise,
      clientePromise,
      detalhesPromise,
      produtosPromise
    ]), "Consultas paralelas (natureza/cliente/detalhes/itens)", 25000);
    let shouldGenerateCommission = false;
    if (!natErr && natureza) shouldGenerateCommission = natureza.tem_comissao === true;
    if (clienteErr || !cliente) {
      throw new Error(`Erro ao buscar cliente: ${clienteErr?.message ?? "vazio"}`);
    }
    if (detalhesErr || !detalhes?.id_condicao) {
      throw new Error("Erro ao buscar detalhes do pedido ou id_condicao ausente");
    }
    if (itensErr || !itens || itens.length === 0) {
      throw new Error(`Erro ao buscar itens do pedido: ${itensErr?.message ?? "sem itens"}`);
    }
    // 4) Buscar SKUs (depende de itens)
    const uniqueProductIds = [
      ...new Set(itens.map((p)=>p.produto_id))
    ];
    const { data: produtosInfo, error: produtosInfoErr } = await withTimeout(supabase.from("produto").select("produto_id, codigo_sku").in("produto_id", uniqueProductIds), "Buscar SKUs dos produtos");
    if (produtosInfoErr || !produtosInfo) {
      throw new Error(`Erro ao buscar informações de produtos: ${produtosInfoErr?.message ?? "vazio"}`);
    }
    const skuMap = {};
    for (const p of produtosInfo)skuMap[p.produto_id] = p.codigo_sku;
    // 5) Condição de pagamento
    const { data: condicaoPagamento, error: condicaoErr } = await withTimeout(supabase.from("Condicao_De_Pagamento").select("intervalo_parcela, Desconto").eq("Condição_ID", detalhes.id_condicao).single(), "Buscar Condicao_De_Pagamento");
    if (condicaoErr || !condicaoPagamento) {
      throw new Error("Nenhuma condição de pagamento encontrada");
    }
    // 6) Cálculos
    const valorTotalPedido = itens.reduce((sum, p)=>sum + p.quantidade * p.valor_unitario, 0);
    const descontoExtra = condicaoPagamento.Desconto ? valorTotalPedido * (condicaoPagamento.Desconto / 100) : 0;
    const valorTotalComDesconto = +(valorTotalPedido - descontoExtra).toFixed(2);
    // Atualizar valor_total
    await withTimeout(supabase.from("pedido_venda").update({
      valor_total: valorTotalComDesconto
    }).eq("pedido_venda_ID", pedidoId), "Atualizar valor_total do pedido");
    // 7) Parcelas
    const intervalosRaw = condicaoPagamento.intervalo_parcela;
    const intervalos = Array.isArray(intervalosRaw) ? intervalosRaw : intervalosRaw != null ? [
      intervalosRaw
    ] : [];
    const parcelas = intervalos.length > 0 ? intervalos.map((dias)=>({
        parcela: {
          dias,
          valor: (valorTotalComDesconto / intervalos.length).toFixed(2),
          forma_pagamento: "boleto",
          meio_pagamento: "Bradesco"
        }
      })) : [];
    // 8) Payload Tiny
    const idVendedor = useAlternateVendor ? "499363725" : "344238287";
    const pedidoTiny = {
      pedido: {
        id_vendedor: idVendedor,
        nome_vendedor: "KAREN SOARES NUNES- SP",
        data_pedido: new Date().toISOString().slice(0, 10).split("-").reverse().join("/"),
        cliente: {
          codigo: cliente.cliente_id,
          nome: cliente.nome,
          nome_fantasia: cliente.nome_fantasia,
          tipo_pessoa: convertTipoPessoa(cliente.ref_tipo_pessoa_id_FK),
          cpf_cnpj: cliente.cpf_cnpj,
          ie: cliente.inscricao_estadual || "",
          rg: "",
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
    // 9) POST Tiny (com timeout)
    console.log(`🌐 [${traceId}] Enviando para Tiny...`);
    const payload = new URLSearchParams();
    payload.append("pedido", JSON.stringify(pedidoTiny));
    const tinyText = await withTimeout((async ()=>{
      const res = await fetch(TINY_API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: payload.toString()
      });
      const txt = await res.text();
      if (!res.ok) {
        throw new Error(`Tiny HTTP ${res.status}: ${txt}`);
      }
      return txt;
    })(), "POST Tiny", 25000);
    let tinyResponse;
    try {
      tinyResponse = JSON.parse(tinyText);
    } catch  {
      // Tiny às vezes retorna erro em HTML/Texto
      tinyResponse = {
        raw: tinyText
      };
    }
    // 10) Salvar retorno do Tiny (ID e Numero) no Supabase - NOVO BLOCO ADICIONADO
    try {
      const retorno = tinyResponse?.retorno;
      if (retorno?.status === 'OK' || retorno?.status === 'Processado') {
        let registro = null;
        // Lógica robusta para tratar Objeto vs Array no Tiny
        if (retorno.registros) {
          // Se for o formato de objeto direto: { registros: { registro: {...} } }
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
      } else {
        console.warn(`⚠️ [${traceId}] Tiny não retornou status OK:`, JSON.stringify(tinyResponse));
      }
    } catch (updateError) {
      // Loga o erro mas não quebra o request, pois o pedido já foi criado no Tiny
      console.error(`❌ [${traceId}] Erro ao salvar ID Tiny no banco:`, updateError);
    }
    const bodyOut = {
      success: true,
      trace_id: traceId,
      data: {
        pedido_id: pedidoId,
        should_generate_commission: shouldGenerateCommission,
        parcelas,
        valor_total: valorTotalComDesconto,
        desconto_extra: +descontoExtra.toFixed(2),
        tiny_response: tinyResponse
      }
    };
    console.log(`🏁 [${traceId}] OK`);
    return new Response(JSON.stringify(bodyOut), {
      headers: corsHeaders()
    });
  } catch (error) {
    console.error(`💥 [${traceId}] Erro:`, error);
    return new Response(JSON.stringify({
      success: false,
      trace_id: traceId,
      error: String(error?.message ?? error),
      timestamp: new Date().toISOString()
    }), {
      headers: corsHeaders(),
      status: 500
    });
  }
});
