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

function corsHeaders(extra?: Record<string, string>) {
  return { ...CORS, ...extra ?? {} };
}

function now() {
  return Date.now();
}

async function withTimeout<T>(p: Promise<T>, label: string, ms = 25000): Promise<T> {
  const start = now();
  const timeout = new Promise<never>((_, rej) =>
    setTimeout(() => rej(new Error(`Timeout em ${label} (${ms}ms)`)), ms)
  );
  try {
    const out = await Promise.race([p, timeout]);
    console.log(`✅ ${label} em ${now() - start}ms`);
    return out;
  } catch (e) {
    console.error(`❌ ${label} falhou após ${now() - start}ms:`, e);
    throw e;
  }
}

type SupabaseClient = ReturnType<typeof createClient>;

// ─────────────────────────────────────────────────────────
// Handler: Pedido (lógica original)
// ─────────────────────────────────────────────────────────
async function handlePedido(
  supabase: SupabaseClient,
  dados: Record<string, unknown>,
  traceId: string
): Promise<Record<string, unknown>> {
  if (!dados || (!dados.id && !dados.idVendaTiny)) {
    throw new Error("Campo 'dados.id' ou 'dados.idVendaTiny' não encontrado no webhook.");
  }

  const idTiny = String(dados.id ?? dados.idVendaTiny);
  console.log(`📦 [${traceId}] Pedido id_tiny: ${idTiny}`);

  const { data: pedidoLocal, error: pedidoError } = await withTimeout(
    supabase
      .from("pedido_venda")
      .select("pedido_venda_ID, empresa_faturamento_id")
      .eq("id_tiny", idTiny)
      .maybeSingle(),
    "Buscar pedido local pelo id_tiny"
  );

  if (pedidoError) throw new Error(`Erro ao buscar pedido: ${pedidoError.message}`);
  if (!pedidoLocal) throw new Error(`Pedido com id_tiny=${idTiny} não encontrado.`);

  const nomeEmpresa = pedidoLocal.empresa_faturamento_id;
  if (!nomeEmpresa) {
    throw new Error(`Pedido ${pedidoLocal.pedido_venda_ID} encontrado, mas campo 'empresa_faturamento_id' está vazio.`);
  }

  const { data: empresaSub, error: empresaError } = await withTimeout(
    supabase
      .from("ref_empresas_subsidiarias")
      .select("chave_api")
      .eq("id", nomeEmpresa)
      .single(),
    "Buscar chave_api da empresa"
  );

  if (empresaError || !empresaSub?.chave_api) {
    throw new Error(`Erro ao buscar chave API para empresa '${nomeEmpresa}': ${empresaError?.message ?? "Chave não encontrada"}`);
  }

  const apiToken = empresaSub.chave_api;
  const urlTiny = `https://api.tiny.com.br/api2/pedido.obter.php?token=${apiToken}&id=${idTiny}&formato=json`;
  console.log(`🌐 [${traceId}] Consultando Tiny: ${urlTiny.replace(apiToken, "***")}`);

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

  const novoValorTotal = parseFloat(pedidoTinyDetalhes.total_pedido);
  const novaSituacao = pedidoTinyDetalhes.situacao;

  console.log(`📝 [${traceId}] Atualizando Pedido ${pedidoLocal.pedido_venda_ID} → Valor: ${novoValorTotal}, Status: ${novaSituacao}`);

  const { error: updateError } = await withTimeout(
    supabase
      .from("pedido_venda")
      .update({
        valor_total: isNaN(novoValorTotal) ? 0 : novoValorTotal,
        status: novaSituacao
      })
      .eq("pedido_venda_ID", pedidoLocal.pedido_venda_ID),
    "Update pedido_venda"
  );

  if (updateError) throw new Error(`Erro ao atualizar Supabase: ${updateError.message}`);

  console.log(`🏁 [${traceId}] Pedido atualizado com sucesso.`);
  return { success: true, pedidoVendaId: pedidoLocal.pedido_venda_ID };
}

// ─────────────────────────────────────────────────────────
// Handler: NFe (nota fiscal autorizada pelo Tiny)
// ─────────────────────────────────────────────────────────
async function handleNfe(
  supabase: SupabaseClient,
  dados: Record<string, unknown>,
  traceId: string
): Promise<Record<string, unknown>> {
  const chaveAcesso = String(dados.chaveAcesso ?? "").trim();
  const numero = String(dados.numero ?? "").trim();
  // idPedidoEcommerce = id_tiny do pedido_venda no nosso banco
  const idPedidoEcommerce = String(dados.idPedidoEcommerce ?? dados.idPedidoVenda ?? "").trim();
  const idNotaFiscalTiny = dados.idNotaFiscalTiny ?? dados.id;

  if (!idPedidoEcommerce) {
    console.warn(`[${traceId}] NFe sem idPedidoEcommerce — ignorando`);
    return { success: true, message: "NFe sem idPedidoEcommerce, ignorado" };
  }

  // 1. Achar pedido_venda pelo id_tiny
  const { data: pedido, error: pedidoErr } = await supabase
    .from("pedido_venda")
    .select("pedido_venda_ID, empresa_faturamento_id")
    .eq("id_tiny", idPedidoEcommerce)
    .maybeSingle();

  if (pedidoErr) {
    console.error(`[${traceId}] Erro buscando pedido NFe:`, pedidoErr.message);
    return { success: false, error: pedidoErr.message };
  }

  if (!pedido) {
    console.warn(`[${traceId}] Pedido não encontrado para idPedidoEcommerce=${idPedidoEcommerce}`);
    return { success: true, message: "Pedido não encontrado, NFe ignorada" };
  }

  const pedidoVendaId = pedido.pedido_venda_ID;
  const empresaFaturamentoId = pedido.empresa_faturamento_id;

  // 2. Achar frete_logistica vinculado
  const { data: frete, error: freteErr } = await supabase
    .from("frete_logistica")
    .select("id")
    .eq("pedido_venda_id", pedidoVendaId)
    .is("deleted_at", null)
    .maybeSingle();

  if (freteErr || !frete) {
    console.warn(`[${traceId}] Frete não encontrado para pedido ${pedidoVendaId} — NFe não vinculada`);
    return { success: true, message: "Frete não encontrado, NFe ignorada" };
  }

  const freteId = frete.id;

  // 3. Atualizar nfe_numero + nfe_chave_acesso imediatamente
  const { error: updateNfeErr } = await supabase
    .from("frete_logistica")
    .update({
      nfe_numero: numero || null,
      nfe_chave_acesso: chaveAcesso || null,
      updated_at: new Date().toISOString()
    })
    .eq("id", freteId);

  if (updateNfeErr) {
    console.error(`[${traceId}] Erro atualizando NFe no frete:`, updateNfeErr.message);
    return { success: false, error: updateNfeErr.message };
  }

  console.log(`[${traceId}] ✅ NFe nº${numero} vinculada ao frete ${freteId}`);

  // 4. Enriquecer com nota.fiscal.obter.php (peso, volumes, transportador) — não-fatal
  if (idNotaFiscalTiny && empresaFaturamentoId) {
    try {
      const { data: empresa } = await supabase
        .from("ref_empresas_subsidiarias")
        .select("chave_api")
        .eq("id", empresaFaturamentoId)
        .single();

      if (empresa?.chave_api) {
        const urlNota = `https://api.tiny.com.br/api2/nota.fiscal.obter.php?token=${empresa.chave_api}&id=${idNotaFiscalTiny}&formato=json`;
        console.log(`[${traceId}] Buscando detalhes NFe: ${urlNota.replace(empresa.chave_api, "***")}`);

        const notaRes = await withTimeout(fetch(urlNota), "Fetch NFe detalhe", 20000);
        if (notaRes.ok) {
          const notaData = await notaRes.json();
          const nota = notaData?.retorno?.nota_fiscal;

          if (nota) {
            const extra: Record<string, unknown> = { updated_at: new Date().toISOString() };

            const pesoBruto = parseFloat(String(nota.peso_bruto ?? ""));
            if (!isNaN(pesoBruto) && pesoBruto > 0) extra.peso_bruto = pesoBruto;

            const volumes = parseInt(String(nota.volumes ?? nota.qtd_volumes ?? ""), 10);
            if (!isNaN(volumes) && volumes > 0) extra.volumes = volumes;

            // Tentar casar transportador pelo CNPJ
            const cnpjRaw = nota.transportador?.cpf_cnpj ?? nota.transportador?.cnpj ?? "";
            if (cnpjRaw) {
              const cnpj = String(cnpjRaw).replace(/\D/g, "");
              const { data: transp } = await supabase
                .from("transportador_logistica")
                .select("id")
                .or(`cnpj.eq.${cnpj},cpf.eq.${cnpj}`)
                .maybeSingle();
              if (transp?.id) extra.transportador_id = transp.id;
            }

            if (Object.keys(extra).length > 1) {
              await supabase.from("frete_logistica").update(extra).eq("id", freteId);
              console.log(`[${traceId}] Frete ${freteId} enriquecido: peso=${extra.peso_bruto}, vol=${extra.volumes}, transp=${extra.transportador_id ?? "não casado"}`);
            }
          }
        }
      }
    } catch (enrichErr) {
      // Não crítico — apenas loga
      console.warn(`[${traceId}] Enriquecimento NFe falhou (não crítico):`, enrichErr);
    }
  }

  return { success: true, freteId, nfeNumero: numero };
}

// ─────────────────────────────────────────────────────────
// Handler Principal
// ─────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  const traceId = crypto.randomUUID();
  console.log(`▶️  [${traceId}] Webhook Tiny Iniciado`);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      throw new Error("Variáveis de ambiente SUPABASE_URL/SERVICE_ROLE ausentes");
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
      global: { headers: { "X-Trace-Id": traceId } }
    });

    const rawBody = await withTimeout(req.text(), "Ler body", 5000);
    console.log(`🔹 [${traceId}] Payload recebido: ${rawBody}`);

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      // JSON inválido — ack para evitar retry infinito
      return new Response(JSON.stringify({ success: true, trace_id: traceId }), {
        headers: corsHeaders(),
        status: 200
      });
    }

    // Suporte a payload direto ou embrulhado em { body: ... }
    const dataWebhook = (payload.body ? payload.body : payload) as Record<string, unknown>;
    const dados = (dataWebhook.dados ?? {}) as Record<string, unknown>;
    const tipo = String(dataWebhook.tipo ?? "");

    console.log(`📦 [${traceId}] tipo=${tipo}`);

    let result: Record<string, unknown>;

    if (tipo === "nota_fiscal") {
      result = await handleNfe(supabase, dados, traceId);
    } else {
      result = await handlePedido(supabase, dados, traceId);
    }

    return new Response(JSON.stringify({ ...result, trace_id: traceId }), {
      headers: corsHeaders(),
      status: 200
    });

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`💥 [${traceId}] Erro:`, errMsg);
    // Sempre 200 → evita retry infinito do Tiny
    return new Response(JSON.stringify({ error: errMsg, trace_id: traceId }), {
      headers: corsHeaders(),
      status: 200
    });
  }
});
