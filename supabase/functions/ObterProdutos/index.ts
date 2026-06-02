import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
// Constantes
const TINY_TOKEN = 'a13261d8de313b39bb694164e5067a642c3d12b9';
const SUPABASE_URL = 'https://xxoiqfraeolsqsmsheue.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4b2lxZnJhZW9sc3FzbXNoZXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1ODQ5MDIsImV4cCI6MjA0MjE2MDkwMn0.m8A1mUf3GyAl_17FjltxkgBr-xRQYZw9YEDUVUBdttA';
// Inicializar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Função para buscar produto no Tiny
async function buscarProdutoTiny(produtoId) {
  const url = new URL('https://api.tiny.com.br/api2/produto.obter.php');
  url.searchParams.append('token', TINY_TOKEN);
  url.searchParams.append('id', produtoId);
  url.searchParams.append('formato', 'json');
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Erro na requisição HTTP: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  if (data.retorno.status !== 'OK') {
    const errorMessage = data.retorno.erros ? data.retorno.erros.map((e)=>e.erro).join(', ') : 'Erro desconhecido';
    throw new Error(`Erro na resposta do Tiny: ${data.retorno.status}. Código: ${data.retorno.codigo_erro}. Detalhes: ${errorMessage}`);
  }
  return data;
}
// Função principal
async function gerenciarProduto(req) {
  try {
    const { produtoId } = await req.json();
    if (!produtoId) {
      return new Response(JSON.stringify({
        erro: 'ID do produto não fornecido'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // Buscar produto no Tiny
    const tinyProduto = await buscarProdutoTiny(produtoId);
    if (!tinyProduto.retorno.produto) {
      return new Response(JSON.stringify({
        erro: 'Produto não encontrado no Tiny'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    const produtoData = tinyProduto.retorno.produto;
    // Mapear dados do Tiny para a estrutura do Supabase
    const produtoSupabase = {
      produto_id: produtoData.id,
      descricao: produtoData.nome,
      codigo_sku: produtoData.codigo,
      ref_origem_produto_id: parseInt(produtoData.origem) || null,
      ncm: produtoData.ncm,
      gtin: produtoData.gtin,
      cest: produtoData.cest,
      preco_venda: produtoData.preco,
      unidade: produtoData.unidade === 'UN' ? 1 : null,
      peso_liquido: produtoData.peso_liquido,
      peso_bruto: produtoData.peso_bruto,
      numero_volumes: 1,
      ref_tipo_embalagem_id: produtoData.tipoEmbalagem,
      ref_embalagem_id: null,
      largura: produtoData.larguraEmbalagem,
      altura: produtoData.alturaEmbalagem,
      comprimento: produtoData.comprimentoEmbalagem,
      controle_estoque: true,
      estoque_inicial: 0,
      estoque_minimo: produtoData.estoque_minimo,
      localizacao_estoque: produtoData.localizacao,
      dias_preparacao: produtoData.dias_preparacao,
      ref_permissao_id: null,
      codigo_sequencial: produtoData.id.toString()
    };
    // Inserir ou atualizar produto no Supabase
    const { data, error } = await supabase.from('produto').upsert(produtoSupabase).select().single();
    if (error) {
      return new Response(JSON.stringify({
        erro: `Erro ao inserir/atualizar produto no Supabase: ${error.message}`
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    return new Response(JSON.stringify({
      mensagem: 'Produto inserido/atualizado com sucesso',
      produto: data
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (erro) {
    console.error('Erro detalhado:', erro);
    return new Response(JSON.stringify({
      erro: `Erro ao processar requisição: ${erro.message}`
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
// Servir a função
serve(gerenciarProduto);
