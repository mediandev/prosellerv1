// supabase/functions/webhook-tiny-atualizacao/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
// ─────────────────────────────────────────────────────────
// Utilitários & CORS
// ─────────────────────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json"
};
function corsHeaders(extra) {
  return {
    ...CORS,
    ...extra ?? {}
  };
}
function now() {
  return Date.now();
}
// Helper para timeout (mesma lógica das funções anteriores)
async function withTimeout(p, label, ms = 25000) {
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
// Handler Principal
// ─────────────────────────────────────────────────────────
Deno.serve(async (req)=>{
  // Trata preflight request (CORS)
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders()
    });
  }
  const traceId = crypto.randomUUID();
  console.log(`▶️  [${traceId}] Webhook Tiny Iniciado`);
  try {
    // 1) Setup do Cliente Supabase
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      throw new Error("Variáveis de ambiente SUPABASE_URL/SERVICE_ROLE ausentes");
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: {
        persistSession: false
      },
      global: {
        headers: {
          "X-Trace-Id": traceId
        }
      }
    });
    // 2) Ler e Validar o Body do Webhook
    const rawBody = await withTimeout(req.text(), "Ler body", 5000);
    console.log(`🔹 [${traceId}] Payload recebido: ${rawBody}`);
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      return new Response(JSON.stringify({
        success: true,
        trace_id: traceId
      }), {
        headers: corsHeaders(),
        status: 200
      });
    }
    // O payload pode vir direto ou dentro de uma propriedade "body" conforme seu exemplo
    const dataWebhook = payload.body ? payload.body : payload;
    const dadosTiny = dataWebhook.dados;
    const tipoEvento = dataWebhook.tipo;
    console.log(`📦 payload recebido: ${payload.body}`);
    // Verificações básicas
    if (!dadosTiny || !dadosTiny.id && !dadosTiny.idVendaTiny) {
      throw new Error("Campo 'dados.id' ou 'dados.idVendaTiny' não encontrado no webhook.");
    }
    // Prioriza id, mas usa idVendaTiny como fallback
    const idTiny = String(dadosTiny.id ?? dadosTiny.idVendaTiny);
    console.log(`📦 [${traceId}] Processando ID Tiny: ${idTiny} (Evento: ${tipoEvento})`);
    // 3) Buscar Pedido no Supabase para descobrir a "empresa_faturou"
    // Usamos maybeSingle para não estourar erro se não achar, tratamos manualmente
    const { data: pedidoLocal, error: pedidoError } = await withTimeout(supabase.from("pedido_venda").select("pedido_venda_ID, empresa_faturamento_id").eq("id_tiny", idTiny).maybeSingle(), "Buscar pedido local pelo id_tiny");
    if (pedidoError) throw new Error(`Erro ao buscar pedido: ${pedidoError.message}`);
    const nomeEmpresa = pedidoLocal.empresa_faturamento_id;
    if (!nomeEmpresa) {
      throw new Error(`Pedido ${pedidoLocal.pedido_venda_ID} encontrado, mas campo 'empresa_faturamento_id' está vazio.`);
    }
    // 4) Buscar Token da API na tabela de subsidiárias
    const { data: empresaSub, error: empresaError } = await withTimeout(supabase.from("ref_empresas_subsidiarias").select("chave_api").eq("id", nomeEmpresa) // Ajuste se a coluna for diferente de 'nome'
    .single(), "Buscar chave_api da empresa");
    if (empresaError || !empresaSub || !empresaSub.chave_api) {
      throw new Error(`Erro ao buscar chave API para empresa '${nomeEmpresa}': ${empresaError?.message ?? "Chave não encontrada"}`);
    }
    const apiToken = empresaSub.chave_api;
    // 5) Consultar Detalhes do Pedido no Tiny (pedido.obter)
    const urlTiny = `https://api.tiny.com.br/api2/pedido.obter.php?token=${apiToken}&id=${idTiny}&formato=json`;
    console.log(`🌐 [${traceId}] Consultando Tiny: ${urlTiny.replace(apiToken, "***")}`); // Log seguro
    const tinyRes = await withTimeout(fetch(urlTiny), "Fetch Tiny pedido.obter");
    if (!tinyRes.ok) throw new Error(`Erro HTTP Tiny: ${tinyRes.status}`);
    const tinyData = await tinyRes.json();
    const retornoTiny = tinyData.retorno;
    if (retornoTiny.status !== "OK") {
      throw new Error(`Tiny retornou erro: ${JSON.stringify(retornoTiny)}`);
    }
    const pedidoTinyDetalhes = retornoTiny.pedido;
    if (!pedidoTinyDetalhes) {
      throw new Error("Estrutura do retorno Tiny inválida: objeto 'pedido' ausente.");
    }
    // 6) Extrair dados para atualização
    // total_pedido vem como string ex: "61.20"
    const novoValorTotal = parseFloat(pedidoTinyDetalhes.total_pedido);
    // situacao vem como string ex: "Em aberto", "Cancelado", etc.
    const novaSituacao = pedidoTinyDetalhes.situacao;
    // Se precisar mapear o status do Tiny para um status interno, faça aqui.
    // Por enquanto, salvando a string crua que vem do Tiny.
    console.log(`📝 [${traceId}] Atualizando Pedido ${pedidoLocal.pedido_venda_ID} -> Valor: ${novoValorTotal}, Status: ${novaSituacao}`);
    // 7) Atualizar Supabase
    const { error: updateError } = await withTimeout(supabase.from("pedido_venda").update({
      valor_total: isNaN(novoValorTotal) ? 0 : novoValorTotal,
      status: novaSituacao
    }).eq("pedido_venda_ID", pedidoLocal.pedido_venda_ID), "Update pedido_venda");
    if (updateError) {
      throw new Error(`Erro ao atualizar Supabase: ${updateError.message}`);
    }
    console.log(`🏁 [${traceId}] Sucesso.`);
    return new Response(JSON.stringify({
      success: true,
      trace_id: traceId
    }), {
      headers: corsHeaders(),
      status: 200
    });
  } catch (error) {
    console.error(`💥 [${traceId}] Erro Fatal:`, error);
    // Retornamos 500 para o webhook saber que falhou, mas cuidado:
    // Se o Tiny receber erro, ele pode tentar reenviar várias vezes.
    // Dependendo da lógica de negócio, as vezes é melhor retornar 200 e logar o erro.
    return new Response(JSON.stringify({
      error: error.message,
      trace_id: traceId
    }), {
      headers: corsHeaders(),
      status: 200
    });
  }
});
