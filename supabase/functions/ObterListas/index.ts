import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const TINY_API_TOKEN = 'a13261d8de313b39bb694164e5067a642c3d12b9';
const TINY_API_BASE_URL = 'https://api.tiny.com.br/api2';
// Helper function to make API requests
async function tinyApiRequest(endpoint, params) {
  const url = `${TINY_API_BASE_URL}/${endpoint}?token=${TINY_API_TOKEN}&formato=json&${new URLSearchParams(params)}`;
  const response = await fetch(url);
  return response.json();
}
async function fetchPriceListExceptions(supabaseClient, idListaPreco, insertedPriceListId) {
  const exceptions = await tinyApiRequest('listas.precos.excecoes.php', {
    idListaPreco: idListaPreco.toString()
  });
  if (exceptions.retorno.status === 'OK') {
    for (const item of exceptions.retorno.registros){
      const { id_produto, preco } = item.registro;
      // Find the corresponding produto_id
      const { data: productData, error: productError } = await supabaseClient.from('produto').select('id').eq('codigo_sequencial', id_produto.toString()).single();
      if (productError) {
        console.error(`Error finding product: ${productError.message}`);
        continue;
      }
      if (productData) {
        // Insert into produtos_listas_precos table
        const { error: insertError } = await supabaseClient.from('produtos_listas_precos').insert({
          produto_id: productData.id,
          lista_preco_id: insertedPriceListId,
          preco: preco
        });
        if (insertError) {
          console.error(`Error inserting product price: ${insertError.message}`);
        }
      }
    }
  }
}
serve(async (req)=>{
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Create Supabase client
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')
        }
      }
    });
    // Fetch and store price lists
    const priceLists = await tinyApiRequest('listas.precos.php', {});
    if (priceLists.retorno.status === 'OK') {
      for (const item of priceLists.retorno.registros){
        const { id, descricao, acrescimo_desconto } = item.registro;
        // Insert into listas_preco table
        const { data: insertedPriceList, error: insertError } = await supabaseClient.from('listas_preco').insert({
          nome: descricao,
          desconto: acrescimo_desconto,
          ativo: true,
          codigo_sequencial: id.toString()
        }).select().single();
        if (insertError) {
          throw new Error(`Error inserting price list: ${insertError.message}`);
        }
        // Fetch exceptions for each price list
        await fetchPriceListExceptions(supabaseClient, id, insertedPriceList.id);
      }
      return new Response(JSON.stringify({
        message: 'Price lists fetched and stored successfully'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    } else {
      throw new Error(priceLists.retorno.erros[0].erro);
    }
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
