// F-001 · Edge Function de DIAGNOSTICO read-only.
//
// Dado um pedido_venda_ID que ja foi enviado ao Tiny, faz GET na API
// Tiny `pedido.obter.php` usando o token da empresa de faturamento e
// retorna a natureza de operacao que esta GRAVADA no pedido dentro do
// Tiny. Permite confirmar se o tinyValor escolhido pelo ProSeller foi
// efetivamente respeitado pelo Tiny — sem depender de visualizacao
// manual no painel do Tiny pelo cliente.
//
// Read-only: faz apenas GET. Nao altera nada no Tiny nem no banco.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateJWT } from '../_shared/auth.ts';
import { formatErrorResponse, createBadRequestError, createNotFoundError } from '../_shared/errors.ts';
import { corsHeaders, createHttpSuccessResponse } from '../_shared/types.ts';
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey);
    if (authError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: authError || 'Unauthorized'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json().catch(()=>({}));
    const pedidoRaw = body?.pedido_venda_ID ?? body?.pedido_venda_id ?? body?.pedidoId ?? body?.id;
    const pedidoId = parseInt(String(pedidoRaw), 10);
    if (!Number.isFinite(pedidoId) || isNaN(pedidoId) || pedidoId <= 0) {
      throw createBadRequestError('pedido_venda_ID invalido', {
        pedido_venda_ID: pedidoRaw
      });
    }
    const { data: pedido, error: pedidoError } = await supabase.from('pedido_venda').select('pedido_venda_ID,id_tiny,empresa_faturamento_id,tiny_natureza_enviada,tiny_optante_aplicado,tiny_fallback_used,numero_pedido,cliente_id').eq('pedido_venda_ID', pedidoId).maybeSingle();
    if (pedidoError) throw createBadRequestError('Falha ao buscar pedido', {
      code: pedidoError.code,
      message: pedidoError.message
    });
    if (!pedido) throw createNotFoundError('Pedido', String(pedidoId));
    if (!pedido.id_tiny) throw createBadRequestError('Pedido nao tem id_tiny — nao foi enviado ao Tiny ainda', {
      pedido_venda_ID: pedidoId
    });
    const { data: empresa, error: empresaError } = await supabase.from('ref_empresas_subsidiarias').select('id, nome, chave_api').eq('id', pedido.empresa_faturamento_id).is('deleted_at', null).maybeSingle();
    if (empresaError) throw createBadRequestError('Falha ao buscar empresa', {
      code: empresaError.code,
      message: empresaError.message
    });
    if (!empresa?.chave_api) throw createBadRequestError('Empresa sem chave_api configurada', {
      empresa_id: pedido.empresa_faturamento_id
    });
    const url = `https://api.tiny.com.br/api2/pedido.obter.php?token=${encodeURIComponent(empresa.chave_api)}&id=${encodeURIComponent(pedido.id_tiny)}&formato=json`;
    const tinyRes = await fetch(url);
    const tinyText = await tinyRes.text();
    let tinyData = null;
    try {
      tinyData = JSON.parse(tinyText);
    } catch  {}
    const tinyPedido = tinyData?.retorno?.pedido;
    const naturezaNoTiny = tinyPedido?.natureza_operacao;
    const idNaturezaNoTiny = tinyPedido?.id_natureza_operacao;
    return createHttpSuccessResponse({
      pedido_venda_ID: pedido.pedido_venda_ID,
      numero_pedido: pedido.numero_pedido,
      id_tiny: pedido.id_tiny,
      empresa: {
        id: empresa.id,
        nome: empresa.nome
      },
      proseller_audit: {
        tiny_natureza_enviada: pedido.tiny_natureza_enviada,
        tiny_optante_aplicado: pedido.tiny_optante_aplicado,
        tiny_fallback_used: pedido.tiny_fallback_used
      },
      tiny_real: {
        natureza_operacao_nome_ou_id: naturezaNoTiny,
        id_natureza_operacao: idNaturezaNoTiny,
        status_processamento: tinyData?.retorno?.status_processamento,
        status: tinyData?.retorno?.status
      },
      bate: pedido.tiny_natureza_enviada ? String(pedido.tiny_natureza_enviada) === String(idNaturezaNoTiny || naturezaNoTiny) : null,
      tiny_raw: tinyData
    }, 200, {
      userId: user.id
    });
  } catch (error) {
    return formatErrorResponse(error, true);
  }
});
