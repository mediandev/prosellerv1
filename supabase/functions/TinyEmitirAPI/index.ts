import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// Configurações da API Tiny
const TINY_API_ENDPOINT = "https://api.tiny.com.br/api2/pedido.incluir.php";
// Configurações CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400"
};
console.log("Iniciando servidor...");
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const requestBody = await req.json();
    const { token, pedido } = requestBody;
    // Validação simples dos parâmetros
    if (!token || !pedido) {
      throw new Error("Token e pedido são obrigatórios.");
    }
    // Montagem do FormData para o Tiny
    const formData = new FormData();
    formData.append("token", token);
    formData.append("formato", "json");
    formData.append("pedido", JSON.stringify(pedido));
    console.log("Enviando dados ao Tiny...");
    console.log("Token:", token);
    console.log("Payload pedido:", JSON.stringify(pedido, null, 2));
    // Chamada da API Tiny
    const response = await fetch(TINY_API_ENDPOINT, {
      method: "POST",
      body: formData
    });
    console.log("Resposta HTTP do Tiny:", response.status, response.statusText);
    const responseText = await response.text();
    console.log("Resposta do Tiny (raw):", responseText);
    let tinyData;
    try {
      tinyData = JSON.parse(responseText);
      console.log("Resposta do Tiny (JSON):", tinyData);
    } catch (parseError) {
      throw new Error(`Erro ao parsear resposta do Tiny: ${responseText}`);
    }
    // Responder ao cliente
    return new Response(JSON.stringify({
      success: tinyData.retorno?.status !== "Erro",
      tinyResponse: tinyData
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Erro ao processar pedido:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 500
    });
  }
});
console.log("Servidor iniciado com sucesso.");
