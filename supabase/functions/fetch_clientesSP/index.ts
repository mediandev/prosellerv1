import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
serve(async (req)=>{
  // URLs e Tokens
  const TINY_API_URL = "https://api.tiny.com.br/api2/contatos.pesquisa.php";
  const TINY_API_TOKEN = "004e4fc38f54e442f241dde5a7b2cc1657e127c6"; // Token da empresa Cantico Distribuidora (ES)
  const SUPABASE_URL = "https://xxoiqfraeolsqsmsheue.supabase.co/rest/v1";
  const SUPABASE_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4b2lxZnJhZW9sc3FzbXNoZXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1ODQ5MDIsImV4cCI6MjA0MjE2MDkwMn0.m8A1mUf3GyAl_17FjltxkgBr-xRQYZw9YEDUVUBdttA";
  try {
    console.log("Buscando dados da API do Tiny...");
    // Requisição para a API do Tiny
    const tinyResponse = await fetch(TINY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        token: TINY_API_TOKEN,
        formato: "json"
      })
    });
    if (!tinyResponse.ok) {
      console.error("Erro ao buscar dados do Tiny:", tinyResponse.statusText);
      return new Response("Erro ao buscar dados do Tiny", {
        status: 500
      });
    }
    const tinyData = await tinyResponse.json();
    console.log("Filtrando contatos Pessoa Jurídica fora de SP...");
    // Filtrando os contatos Pessoa Jurídica fora de SP
    const filteredContacts = tinyData.retorno.contatos.filter((item)=>{
      const contact = item.contato;
      return contact.tipo_pessoa === "J" && contact.uf !== "SP"; // Pessoa Jurídica fora de SP
    });
    console.log(`Contatos filtrados: ${filteredContacts.length}`);
    for (const item of filteredContacts){
      const contact = item.contato;
      // Inserir na tabela "cliente"
      const clientePayload = {
        nome: contact.nome,
        nome_fantasia: contact.fantasia || null,
        codigo_sequencial: contact.id,
        ref_tipo_pessoa_id_FK: 2,
        cpf_cnpj: contact.cpf_cnpj
      };
      const clienteResponse = await fetch(`${SUPABASE_URL}/cliente`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_API_KEY,
          Authorization: `Bearer ${SUPABASE_API_KEY}`,
          Prefer: "return=representation"
        },
        body: JSON.stringify(clientePayload)
      });
      if (!clienteResponse.ok) {
        console.error(`Erro ao inserir cliente ${contact.nome}:`, await clienteResponse.text());
        continue;
      }
      const clienteData = await clienteResponse.json();
      const clienteId = clienteData[0]?.cliente_id;
      if (!clienteId) {
        console.error(`Erro: cliente_id não retornado para ${contact.nome}`);
        continue;
      }
      // Inserir na tabela "cliente_contato"
      const contatoPayload = {
        telefone: contact.fone || null,
        telefone_adicional: null,
        website: null,
        email: contact.email || null,
        email_nf: null,
        observacao: null,
        cliente_id: clienteId
      };
      await fetch(`${SUPABASE_URL}/cliente_contato`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_API_KEY,
          Authorization: `Bearer ${SUPABASE_API_KEY}`
        },
        body: JSON.stringify(contatoPayload)
      });
      console.log(`Contato inserido para cliente: ${contact.nome}`);
      // Inserir na tabela "cliente_endereço"
      const enderecoPayload = {
        cep: contact.cep || null,
        rua: contact.endereco || null,
        bairro: contact.bairro || null,
        cidade: contact.cidade || null,
        uf: contact.uf || null,
        numero: contact.numero || null,
        complemento: contact.complemento || null,
        ref_tipo_endereco_id_FK: null,
        cliente_id: clienteId
      };
      await fetch(`${SUPABASE_URL}/cliente_endereço`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_API_KEY,
          Authorization: `Bearer ${SUPABASE_API_KEY}`
        },
        body: JSON.stringify(enderecoPayload)
      });
      console.log(`Endereço inserido para cliente: ${contact.nome}`);
    }
    return new Response("Dados sincronizados com sucesso!", {
      status: 200
    });
  } catch (error) {
    console.error("Erro durante a execução:", error);
    return new Response("Erro durante a execução da função", {
      status: 500
    });
  }
});
