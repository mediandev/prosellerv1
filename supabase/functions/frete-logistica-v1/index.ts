// Edge Function: frete-logistica-v1
// F-LOG-CRM R-LOG-1 · CRUD do cabeçalho do frete.
// F-LOG-CRM R-LOG-2 · Estende GET com 7 filtros, paginação (hard cap 100),
// action=list_by_status (5 buckets) e action=get_with_ocorrencias.
// F-LOG-CRM R-LOG-4 · get_with_ocorrencias agora faz polling SSW on-demand
// com cache 30 min (ADR-008). Gated por FEATURE_LOG_CRM_SSW.
// Gated por FEATURE_LOG_CRM. Backoffice + vendedor podem criar (vendedor restrito
// à própria empresa); deleção é backoffice-only. Soft-delete via deleted_at.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isLogCrmEnabledFromEnv, isLogCrmSswEnabledFromEnv } from '../_shared/log-crm-feature-flag.ts';
import { csvParam, clampLimit, clampOffset, DASHBOARD_BUCKETS, diasEmTransito, isTerminalStatus, resolveFreteStatusFromTracking } from '../_shared/frete-logistica-helpers.ts';
import { fetchSswTracking, mapSswToOcorrencias, isCacheStale } from '../_shared/ssw-client.ts';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};
const FUNC_NAME = 'FRETE-LOGISTICA-V1';
function isFeatureEnabled() {
  return isLogCrmEnabledFromEnv();
}
function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}
async function validateJWT(req, supabaseUrl, supabaseServiceKey) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return {
      user: null,
      error: 'Missing authorization header'
    };
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authUser) return {
      user: null,
      error: 'Invalid or expired token'
    };
    const { data: userData, error: userError } = await supabase.from('user').select('user_id, email, tipo, ativo').eq('user_id', authUser.id).eq('ativo', true).is('deleted_at', null).single();
    if (userError || !userData) return {
      user: null,
      error: 'User not found or inactive'
    };
    return {
      user: {
        id: userData.user_id,
        email: userData.email || authUser.email || '',
        tipo: userData.tipo,
        ativo: userData.ativo
      },
      error: null
    };
  } catch  {
    return {
      user: null,
      error: 'Authentication error'
    };
  }
}
function formatFrete(row) {
  return {
    id: String(row.id),
    pedidoVendaId: row.pedido_venda_id ? Number(row.pedido_venda_id) : null,
    nfeNumero: row.nfe_numero ? Number(row.nfe_numero) : null,
    nfeChaveAcesso: row.nfe_chave_acesso ?? null,
    clienteId: row.cliente_id ? Number(row.cliente_id) : null,
    empresaId: Number(row.empresa_id),
    vendedorId: row.vendedor_id ?? null,
    transportadorId: row.transportador_id ? Number(row.transportador_id) : null,
    regiaoDestinoId: row.regiao_destino_id ? Number(row.regiao_destino_id) : null,
    origemFreteId: row.origem_frete_id ? Number(row.origem_frete_id) : null,
    dataEmissao: row.data_emissao ?? null,
    dataSaida: row.data_saida ?? null,
    previsaoEntrega: row.previsao_entrega ?? null,
    dataEntrega: row.data_entrega ?? null,
    valorProdutos: row.valor_produtos != null ? Number(row.valor_produtos) : 0,
    valorCotacao: row.valor_cotacao != null ? Number(row.valor_cotacao) : null,
    volumes: row.volumes != null ? Number(row.volumes) : null,
    numeroExpedicao: row.numero_expedicao ?? null,
    numeroColeta: row.numero_coleta ?? null,
    statusEntrega: row.status_entrega,
    rateio: !!row.rateio,
    reentrega: !!row.reentrega,
    dacteUrl: row.dacte_url ?? null,
    comprovanteEntregaUrl: row.comprovante_entrega_url ?? null,
    observacoes: row.observacoes ?? null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null
  };
}
function enrichFrete(row) {
  const base = formatFrete(row);
  const cliente = row.cliente;
  const transportador = row.transportador;
  const empresa = row.empresa;
  const empresaNome = empresa ? typeof empresa.nome_fantasia === 'string' && empresa.nome_fantasia ? empresa.nome_fantasia : typeof empresa.razao_social === 'string' ? empresa.razao_social : null : null;
  return {
    ...base,
    clienteNome: cliente && typeof cliente.nome === 'string' ? cliente.nome : null,
    transportadorRazaoSocial: transportador && typeof transportador.razao_social === 'string' ? transportador.razao_social : null,
    empresaNome,
    diasEmTransito: diasEmTransito(base.dataSaida, base.dataEntrega)
  };
}
// FK joins via Postgrest. `cliente_id` referencia `cliente(cliente_id)`, `transportador_id`
// referencia `transportador_logistica(id)`, `empresa_id` referencia `ref_empresas_subsidiarias(id)`.
const SELECT_WITH_JOINS = '*, cliente:cliente_id(cliente_id, nome), transportador:transportador_id(id, razao_social), empresa:empresa_id(id, razao_social, nome_fantasia)';
function bodyToInsert(body, userId) {
  return {
    pedido_venda_id: body.pedidoVendaId ?? null,
    nfe_numero: body.nfeNumero ?? null,
    nfe_chave_acesso: body.nfeChaveAcesso ?? null,
    cliente_id: body.clienteId ?? null,
    empresa_id: body.empresaId,
    vendedor_id: body.vendedorId ?? null,
    transportador_id: body.transportadorId ?? null,
    regiao_destino_id: body.regiaoDestinoId ?? null,
    origem_frete_id: body.origemFreteId ?? null,
    data_emissao: body.dataEmissao ?? null,
    data_saida: body.dataSaida ?? null,
    previsao_entrega: body.previsaoEntrega ?? null,
    data_entrega: body.dataEntrega ?? null,
    valor_produtos: body.valorProdutos ?? 0,
    valor_cotacao: body.valorCotacao ?? null,
    volumes: body.volumes ?? null,
    numero_expedicao: body.numeroExpedicao ?? null,
    numero_coleta: body.numeroColeta ?? null,
    status_entrega: body.statusEntrega || 'Em Separação',
    rateio: body.rateio === true,
    reentrega: body.reentrega === true,
    dacte_url: body.dacteUrl ?? null,
    comprovante_entrega_url: body.comprovanteEntregaUrl ?? null,
    observacoes: body.observacoes ?? null,
    criado_por: userId,
    atualizado_por: userId
  };
}
function formatOcorrencia(row) {
  return {
    id: String(row.id),
    freteId: String(row.frete_id),
    codigoSsw: row.codigo_ssw ?? null,
    descricaoOcorrencia: row.descricao_ocorrencia ?? null,
    tipo: row.tipo ?? null,
    dataHora: row.data_hora ? new Date(row.data_hora).toISOString() : null,
    dominio: row.dominio ?? null,
    filial: row.filial ?? null,
    cidade: row.cidade ?? null,
    uf: row.uf ?? null,
    nomeRecebedor: row.nome_recebedor ?? null,
    nroDocRecebedor: row.nro_doc_recebedor ?? null,
    dataHoraEfetiva: row.data_hora_efetiva ? new Date(row.data_hora_efetiva).toISOString() : null,
    rawPayload: row.raw_payload ?? null
  };
}
async function handleListByStatus(supabase) {
  const buckets = {};
  for (const [label, statuses] of Object.entries(DASHBOARD_BUCKETS)){
    const { data, error } = await supabase.from('frete_logistica').select(SELECT_WITH_JOINS).in('status_entrega', statuses).is('deleted_at', null).order('data_emissao', {
      ascending: false,
      nullsFirst: false
    }).order('id', {
      ascending: false
    }).limit(20);
    if (error) throw new Error(error.message);
    buckets[label] = (data || []).map((row)=>enrichFrete(row));
  }
  return buckets;
}
async function handleGetWithOcorrencias(supabase, id) {
  const { data: freteRow, error: freteErr } = await supabase.from('frete_logistica').select(SELECT_WITH_JOINS).eq('id', id).is('deleted_at', null).single();
  if (freteErr || !freteRow) return {
    frete: null,
    ocorrencias: [],
    sswPolled: false
  };
  const frete = freteRow;
  const chaveNfe = frete.nfe_chave_acesso;
  const currentStatus = frete.status_entrega;
  let sswPolled = false;
  const shouldPollSsw = isLogCrmSswEnabledFromEnv() && !!chaveNfe && /^[0-9]{44}$/.test(chaveNfe) && !isTerminalStatus(currentStatus);
  if (shouldPollSsw) {
    const { data: latestOcorr } = await supabase.from('frete_logistica_ocorrencia').select('created_at').eq('frete_id', id).order('created_at', {
      ascending: false
    }).limit(1).single();
    const latestCreatedAt = latestOcorr?.created_at;
    if (isCacheStale(latestCreatedAt)) {
      console.log(`[${FUNC_NAME}] SSW polling para frete ${id}, chave ${chaveNfe.substring(0, 10)}...`);
      const sswResponse = await fetchSswTracking(chaveNfe);
      if (sswResponse.success && sswResponse.documento.tracking.length > 0) {
        const inserts = mapSswToOcorrencias(sswResponse, id);
        await supabase.from('frete_logistica_ocorrencia').delete().eq('frete_id', id);
        const { error: insertErr } = await supabase.from('frete_logistica_ocorrencia').insert(inserts);
        if (insertErr) {
          console.error(`[${FUNC_NAME}] Erro ao inserir ocorrências SSW:`, insertErr.message);
        } else {
          sswPolled = true;
          const newStatus = resolveFreteStatusFromTracking(sswResponse.documento.tracking.map((t)=>({
              tipo: t.tipo,
              ocorrencia: t.ocorrencia
            })));
          const statusPatch = {
            status_entrega: newStatus,
            updated_at: new Date().toISOString()
          };
          if (newStatus === 'Entregue') {
            const lastTracking = sswResponse.documento.tracking[sswResponse.documento.tracking.length - 1];
            if (lastTracking?.data_hora_efetiva) {
              const d = new Date(lastTracking.data_hora_efetiva);
              if (!isNaN(d.getTime())) {
                statusPatch.data_entrega = d.toISOString().split('T')[0];
              }
            }
          }
          await supabase.from('frete_logistica').update(statusPatch).eq('id', id);
          console.log(`[${FUNC_NAME}] Status atualizado para '${newStatus}', ${inserts.length} ocorrências inseridas`);
        }
      } else {
        console.log(`[${FUNC_NAME}] SSW sem dados novos (success=${sswResponse.success}, msg=${sswResponse.message}) — ocorrências existentes preservadas`);
      }
    }
  }
  const { data: freshFreteRow } = sswPolled ? await supabase.from('frete_logistica').select(SELECT_WITH_JOINS).eq('id', id).is('deleted_at', null).single() : {
    data: freteRow
  };
  const { data: ocorrRows, error: ocorrErr } = await supabase.from('frete_logistica_ocorrencia').select('*').eq('frete_id', id).order('data_hora', {
    ascending: false
  });
  if (ocorrErr) throw new Error(ocorrErr.message);
  return {
    frete: enrichFrete(freshFreteRow || freteRow),
    ocorrencias: (ocorrRows || []).map((row)=>formatOcorrencia(row)),
    sswPolled
  };
}
serve(async (req)=>{
  console.log(`[${FUNC_NAME}]`, {
    method: req.method,
    url: req.url
  });
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  if (!isFeatureEnabled()) {
    return jsonResponse(503, {
      success: false,
      error: 'Logística feature flag desligada (FEATURE_LOG_CRM)'
    });
  }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey);
    if (authError || !user) return jsonResponse(401, {
      success: false,
      error: authError || 'Unauthorized'
    });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const funcIdx = pathParts.indexOf('frete-logistica-v1');
    const idFromPath = funcIdx >= 0 && funcIdx < pathParts.length - 1 ? pathParts[funcIdx + 1] : null;
    const id = idFromPath || url.searchParams.get('id');
    const action = url.searchParams.get('action') || '';
    if (req.method === 'GET') {
      // R-LOG-2: Torre de Controle — 5 buckets de status.
      if (action === 'list_by_status') {
        const buckets = await handleListByStatus(supabase);
        return jsonResponse(200, {
          success: true,
          data: buckets
        });
      }
      // R-LOG-2: Detalhe + timeline.
      if (action === 'get_with_ocorrencias') {
        if (!id) return jsonResponse(400, {
          success: false,
          error: 'ID obrigatório'
        });
        const result = await handleGetWithOcorrencias(supabase, id);
        if (!result.frete) return jsonResponse(404, {
          success: false,
          error: 'Frete não encontrado'
        });
        return jsonResponse(200, {
          success: true,
          data: result
        });
      }
      // GET por id (mantém compat com R-LOG-1).
      if (id && !action) {
        const { data, error } = await supabase.from('frete_logistica').select('*').eq('id', id).is('deleted_at', null).single();
        if (error || !data) return jsonResponse(404, {
          success: false,
          error: 'Frete não encontrado'
        });
        return jsonResponse(200, {
          success: true,
          data: formatFrete(data)
        });
      }
      // GET list com filtros e paginação. action=list é explícito; ausência também é tratada como list.
      const empresaIdFilter = url.searchParams.get('empresa_id');
      const clienteIdFilter = url.searchParams.get('cliente_id');
      const transportadorIdFilter = url.searchParams.get('transportador_id');
      const statusFilters = csvParam(url.searchParams.get('status_entrega'));
      const dataInicio = url.searchParams.get('data_inicio');
      const dataFim = url.searchParams.get('data_fim');
      const nfeNumero = url.searchParams.get('nfe_numero');
      const limit = clampLimit(url.searchParams.get('limit'));
      const offset = clampOffset(url.searchParams.get('offset'));
      let query = supabase.from('frete_logistica').select(SELECT_WITH_JOINS, {
        count: 'exact'
      }).is('deleted_at', null).order('data_emissao', {
        ascending: false,
        nullsFirst: false
      }).order('id', {
        ascending: false
      }).range(offset, offset + limit - 1);
      if (empresaIdFilter) query = query.eq('empresa_id', empresaIdFilter);
      if (clienteIdFilter) query = query.eq('cliente_id', clienteIdFilter);
      if (transportadorIdFilter) query = query.eq('transportador_id', transportadorIdFilter);
      if (statusFilters.length > 0) query = query.in('status_entrega', statusFilters);
      if (dataInicio) query = query.gte('data_emissao', dataInicio);
      if (dataFim) query = query.lte('data_emissao', dataFim);
      if (nfeNumero) {
        // Cast numero NFE para texto e aplica ILIKE (números são bigint na tabela).
        // Postgrest: filter avançado via .filter() com operador casting.
        query = query.filter('nfe_numero::text', 'ilike', `%${nfeNumero}%`);
      }
      const { data, error, count } = await query;
      if (error) throw new Error(error.message);
      return jsonResponse(200, {
        success: true,
        data: {
          fretes: (data || []).map((row)=>enrichFrete(row)),
          total: count ?? 0,
          limit,
          offset
        }
      });
    }
    // POST + PUT: backoffice ou vendedor (com tenant scoping no payload).
    if (req.method === 'POST') {
      const body = await req.json();
      if (!body.empresaId) return jsonResponse(400, {
        success: false,
        error: 'empresaId obrigatório'
      });
      const insert = bodyToInsert(body, user.id);
      const { data, error } = await supabase.from('frete_logistica').insert(insert).select().single();
      if (error) {
        if (error.message?.includes('valor_produtos_pos')) return jsonResponse(400, {
          success: false,
          error: 'valor_produtos deve ser >= 0'
        });
        if (error.message?.includes('nfe_chave_44')) return jsonResponse(400, {
          success: false,
          error: 'nfe_chave_acesso deve ter 44 dígitos'
        });
        throw new Error(error.message);
      }
      return jsonResponse(201, {
        success: true,
        data: formatFrete(data)
      });
    }
    if (req.method === 'PUT') {
      if (!id) return jsonResponse(400, {
        success: false,
        error: 'ID obrigatório'
      });
      const body = await req.json();
      const patch = {
        atualizado_por: user.id,
        updated_at: new Date().toISOString()
      };
      const fieldMap = {
        pedidoVendaId: 'pedido_venda_id',
        nfeNumero: 'nfe_numero',
        nfeChaveAcesso: 'nfe_chave_acesso',
        clienteId: 'cliente_id',
        empresaId: 'empresa_id',
        vendedorId: 'vendedor_id',
        transportadorId: 'transportador_id',
        regiaoDestinoId: 'regiao_destino_id',
        origemFreteId: 'origem_frete_id',
        dataEmissao: 'data_emissao',
        dataSaida: 'data_saida',
        previsaoEntrega: 'previsao_entrega',
        dataEntrega: 'data_entrega',
        valorProdutos: 'valor_produtos',
        valorCotacao: 'valor_cotacao',
        volumes: 'volumes',
        numeroExpedicao: 'numero_expedicao',
        numeroColeta: 'numero_coleta',
        statusEntrega: 'status_entrega',
        rateio: 'rateio',
        reentrega: 'reentrega',
        dacteUrl: 'dacte_url',
        comprovanteEntregaUrl: 'comprovante_entrega_url',
        observacoes: 'observacoes'
      };
      for (const [k, dbCol] of Object.entries(fieldMap)){
        if (body[k] !== undefined) patch[dbCol] = body[k];
      }
      const { data, error } = await supabase.from('frete_logistica').update(patch).eq('id', id).is('deleted_at', null).select().single();
      if (error || !data) return jsonResponse(404, {
        success: false,
        error: 'Frete não encontrado para atualizar'
      });
      return jsonResponse(200, {
        success: true,
        data: formatFrete(data)
      });
    }
    if (req.method === 'DELETE') {
      if (user.tipo !== 'backoffice') return jsonResponse(403, {
        success: false,
        error: 'Apenas backoffice pode remover frete'
      });
      if (!id) return jsonResponse(400, {
        success: false,
        error: 'ID obrigatório'
      });
      const { error } = await supabase.from('frete_logistica').update({
        deleted_at: new Date().toISOString(),
        atualizado_por: user.id
      }).eq('id', id).is('deleted_at', null);
      if (error) throw new Error(error.message);
      return jsonResponse(200, {
        success: true,
        data: {
          message: 'Frete removido'
        }
      });
    }
    return jsonResponse(405, {
      success: false,
      error: 'Method not allowed'
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[${FUNC_NAME}] EXCEPTION`, message);
    return jsonResponse(500, {
      success: false,
      error: message
    });
  }
});
