import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
serve(async (req)=>{
  // URLs e Tokens
  const TINY_API_URL = "https://api.tiny.com.br/api2/contatos.pesquisa.php";
  const TINY_API_TOKEN = "c4370c8c43eabbc139faa857c2a9f9cfeed86da9"; // Token da DAP Distribuidora (SP)
  try {
    console.log("Buscando dados da API do Tiny com paginação...");
    let totalContatos = 0;
    let paginaAtual = 1;
    let numeroPaginas = 1;
    do {
      console.log(`Buscando página ${paginaAtual} de ${numeroPaginas}...`);
      // Requisição para a API do Tiny com a página atual
      const tinyResponse = await fetch(TINY_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          token: TINY_API_TOKEN,
          formato: "json",
          pagina: paginaAtual.toString()
        })
      });
      if (!tinyResponse.ok) {
        console.error(`Erro ao buscar dados do Tiny na página ${paginaAtual}:`, tinyResponse.statusText);
        return new Response(`Erro ao buscar dados do Tiny na página ${paginaAtual}`, {
          status: 500
        });
      }
      const tinyData = await tinyResponse.json();
      // Filtrando os contatos apenas de SP e Pessoa Jurídica
      const contatosFiltrados = tinyData.retorno.contatos.filter((item)=>{
        const contact = item.contato;
        return contact.tipo_pessoa === "J" && contact.uf === "SP"; // Pessoa Jurídica de SP
      });
      // Incrementa o total de contatos filtrados
      totalContatos += contatosFiltrados.length;
      // Atualiza o controle de paginação
      paginaAtual = tinyData.retorno.pagina + 1;
      numeroPaginas = tinyData.retorno.numero_paginas;
    }while (paginaAtual <= numeroPaginas)
    console.log(`Total de contatos Pessoa Jurídica de SP encontrados: ${totalContatos}`);
    // Retorna a contagem para a chamada
    return new Response(JSON.stringify({
      totalContatos
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Erro durante a execução:", error);
    return new Response("Erro durante a execução da função", {
      status: 500
    });
  }
});
