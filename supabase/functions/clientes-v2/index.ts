import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};
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
function createAuthErrorResponse(message, statusCode = 401) {
  return new Response(JSON.stringify({
    error: message,
    timestamp: new Date().toISOString()
  }), {
    status: statusCode,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}
function createHttpSuccessResponse(data, status = 200, meta) {
  return new Response(JSON.stringify({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  }), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}
function formatErrorResponse(error) {
  let statusCode = 500;
  let errorMessage = 'Internal server error';
  if (error instanceof Error) {
    errorMessage = error.message;
    if (error.message.includes('Unauthorized') || error.message.includes('authentication')) statusCode = 401;
    else if (error.message.includes('permission') || error.message.includes('forbidden')) statusCode = 403;
    else if (error.message.includes('not found') || error.message.includes('nao encontrado')) statusCode = 404;
    else if (error.message.includes('validation') || error.message.includes('invalid') || error.message.includes('obrigatorio')) statusCode = 400;
  }
  console.error('[CLIENTES-V2] Error:', {
    message: errorMessage,
    statusCode
  });
  return new Response(JSON.stringify({
    success: false,
    error: errorMessage,
    timestamp: new Date().toISOString()
  }), {
    status: statusCode,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}
function mapClienteListItem(row) {
  const id = row.cliente_id ?? row.id;
  const statusAprovacao = row.status_aprovacao ?? row.statusAprovacao ?? 'pendente';
  // Situacao real vem do ref_situacao (situacao_nome). Só deriva do status como fallback (linhas legadas sem ref).
  let situacao = row.situacao_nome ?? row.situacao ?? null;
  if (!situacao) {
    if (statusAprovacao === 'aprovado') situacao = 'Ativo';
    else if (statusAprovacao === 'rejeitado') situacao = 'Reprovado';
    else situacao = 'Analise';
  }
  return {
    id: id != null ? String(id) : '',
    razaoSocial: row.nome ?? row.razaoSocial ?? '',
    nomeFantasia: row.nome_fantasia ?? row.nomeFantasia ?? '',
    cpfCnpj: row.cpf_cnpj ?? row.cpfCnpj ?? '',
    codigo: row.codigo ?? '',
    statusAprovacao,
    situacao,
    segmentoId: row.segmento_id != null ? String(row.segmento_id) : undefined,
    segmentoMercado: row.segmento_nome ?? row.tipo_segmento ?? row.segmentoMercado ?? '',
    grupoRede: row.grupo_id ?? row.grupo_rede_nome ?? row.grupo_rede ?? row.grupoRede ?? '',
    grupoId: row.grupo_id ?? row.grupoRede ?? undefined,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt
  };
}
function extractCondicaoPagamentoId(cond) {
  const raw = cond?.['ID_condi\u00e7\u00f5es'] ?? cond?.ID_condicoes ?? cond?.id_condicao ?? cond?.condicao_id;
  if (raw == null) return null;
  const id = String(raw);
  return id && id !== 'undefined' ? id : null;
}
function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
function extractRequisitosLogisticos(body) {
  if (!hasOwn(body, 'requisitosLogisticos') && !hasOwn(body, 'requisitos_logisticos')) {
    return {
      hasValue: false,
      value: null
    };
  }
  const raw = body.requisitosLogisticos ?? body.requisitos_logisticos;
  if (raw == null) {
    return {
      hasValue: true,
      value: null
    };
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('requisitosLogisticos deve ser um objeto JSON');
  }
  return {
    hasValue: true,
    value: raw
  };
}
function mapClienteCompleto(rpc) {
  const c = rpc.cliente ?? {};
  const statusAprovacao = c.status_aprovacao ?? c.statusAprovacao ?? 'pendente';
  // Priorizar situacao_nome do RPC, depois situacao, depois inferir de statusAprovacao
  let situacao = c.situacao_nome ?? c.situacao ?? 'Analise';
  if (!situacao || situacao === 'Analise') {
    if (statusAprovacao === 'aprovado') situacao = 'Ativo';
    else if (statusAprovacao === 'rejeitado') situacao = 'Reprovado';
    else if (statusAprovacao === 'pendente') situacao = 'Analise';
  }
  const contato = rpc.contato ?? {};
  const endereco = rpc.endereco ?? {};
  const vendedores = Array.isArray(rpc.vendedores) ? rpc.vendedores : [];
  const vendedorAtribuido = vendedores[0];
  return {
    id: c.cliente_id != null ? String(c.cliente_id) : c.id,
    razaoSocial: c.nome ?? c.razaoSocial ?? '',
    nomeFantasia: c.nome_fantasia ?? c.nomeFantasia ?? '',
    cpfCnpj: c.cpf_cnpj ?? c.cpfCnpj ?? '',
    codigo: c.codigo ?? '',
    inscricaoEstadual: c.inscricao_estadual ?? c.inscricaoEstadual ?? '',
    refTipoPessoaId: c.ref_tipo_pessoa_id_FK != null ? Number(c.ref_tipo_pessoa_id_FK) : undefined,
    tipoPessoa: c.tipo_pessoa_nome ?? c.tipoPessoa ?? (String(c.cpf_cnpj ?? '').replace(/\D/g, '').length === 11 ? 'Pessoa Fisica' : 'Pessoa Juridica'),
    statusAprovacao,
    situacao,
    segmentoId: c.segmento_id != null ? String(c.segmento_id) : undefined,
    segmentoMercado: c.segmento_nome ?? c.tipo_segmento ?? c.segmentoMercado ?? '',
    grupoRede: c.grupo_id ?? c.grupo_rede_nome ?? c.grupo_rede ?? c.grupoRede ?? '',
    grupoId: c.grupo_id ?? c.grupoRede ?? undefined,
    observacoesInternas: c.observacao_interna ?? c.observacoesInternas ?? '',
    listaPrecos: c.lista_de_preco != null ? String(c.lista_de_preco) : c.listaPrecos ?? '',
    descontoPadrao: Number(c.desconto ?? c.descontoPadrao ?? 0),
    descontoFinanceiro: Number(c.desconto_financeiro ?? c.descontoFinanceiro ?? 0),
    pedidoMinimo: Number(c.pedido_minimo ?? c.pedidoMinimo ?? 0),
    requisitosLogisticos: c.requisitos_logisticos ?? c.requisitosLogisticos ?? null,
    condicoesPagamentoAssociadas: Array.isArray(c.condicoesdisponiveis) ? c.condicoesdisponiveis.map((x)=>String(x)) : Array.isArray(rpc.condicoes_cliente) ? rpc.condicoes_cliente.map((cond)=>extractCondicaoPagamentoId(cond)).filter((id)=>Boolean(id)) : [],
    empresaFaturamento: c.empresaFaturamento != null ? String(c.empresaFaturamento) : undefined,
    vendedoresAtribuidos: vendedores.map((v)=>({
        id: v.user_id ?? v.id,
        nome: v.nome ?? '',
        email: v.email ?? ''
      })),
    vendedorAtribuido: vendedorAtribuido ? {
      id: vendedorAtribuido.user_id ?? vendedorAtribuido.id,
      nome: vendedorAtribuido.nome ?? '',
      email: vendedorAtribuido.email ?? ''
    } : undefined,
    contato: {
      emailPrincipal: contato.email ?? '',
      emailNFe: contato.email_nf ?? '',
      telefoneFixoPrincipal: contato.telefone ?? '',
      telefoneCelularPrincipal: contato.telefone_adicional ?? '',
      site: contato.website ?? ''
    },
    // Tambem mapear campos de contato no nivel raiz para compatibilidade
    emailPrincipal: contato.email ?? '',
    emailNFe: contato.email_nf ?? '',
    telefoneFixoPrincipal: contato.telefone ?? '',
    telefoneCelularPrincipal: contato.telefone_adicional ?? '',
    site: contato.website ?? '',
    endereco: {
      cep: endereco.cep ?? '',
      logradouro: endereco.rua ?? endereco.logradouro ?? '',
      numero: endereco.numero ?? '',
      complemento: endereco.complemento ?? '',
      bairro: endereco.bairro ?? '',
      uf: endereco.uf ?? '',
      municipio: endereco.cidade ?? endereco.municipio ?? ''
    },
    // Tambem mapear campos de endereco no nivel raiz para compatibilidade
    cep: endereco.cep ?? '',
    logradouro: endereco.rua ?? endereco.logradouro ?? '',
    numero: endereco.numero ?? '',
    complemento: endereco.complemento ?? '',
    bairro: endereco.bairro ?? '',
    uf: endereco.uf ?? '',
    municipio: endereco.cidade ?? endereco.municipio ?? '',
    condicoesCliente: rpc.condicoes_cliente ?? [],
    contaCorrenteCliente: rpc.conta_corrente_cliente ?? [],
    historico: Array.isArray(rpc.historico) ? rpc.historico : [],
    createdAt: c.created_at ?? c.createdAt,
    updatedAt: c.updated_at ?? c.updatedAt
  };
}
serve(async (req)=>{
  const startTime = Date.now();
  console.log('[CLIENTES-V2] Request:', {
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
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey);
    if (authError || !user) {
      return createAuthErrorResponse(authError ?? 'Unauthorized');
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization') || ''
        }
      }
    });
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter((p)=>p);
    const functionIndex = pathParts.indexOf('clientes-v2');
    const clienteId = functionIndex >= 0 && functionIndex < pathParts.length - 1 ? pathParts[functionIndex + 1] : url.searchParams.get('id');
    if (req.method === 'GET') {
      if (clienteId) {
        const idNum = parseInt(clienteId, 10);
        if (isNaN(idNum) || idNum <= 0) throw new Error('ID invalido');
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_cliente_completo_v2', {
          p_cliente_id: idNum,
          p_requesting_user_id: user.id
        });
        if (rpcError) throw new Error(rpcError.message);
        if (!rpcData) throw new Error('Cliente nao encontrado');
        const mapped = mapClienteCompleto(rpcData);
        const duration = Date.now() - startTime;
        return createHttpSuccessResponse(mapped, 200, {
          userId: user.id,
          duration: `${duration}ms`
        });
      }
      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10)));
      const search = url.searchParams.get('search') || null;
      const statusAprovacao = url.searchParams.get('status_aprovacao') || null;
      const vendedor = url.searchParams.get('vendedor') || null;
      const { data: rpcData, error: rpcError } = await supabase.rpc('list_clientes_v2', {
        p_requesting_user_id: user.id,
        p_status_aprovacao_filter: statusAprovacao,
        p_search: search,
        p_vendedor_filter: vendedor,
        p_page: page,
        p_limit: limit
      });
      if (rpcError) throw new Error(rpcError.message);
      const raw = rpcData || {};
      const items = Array.isArray(raw.clientes) ? raw.clientes : [];
      const clientes = items.map((row)=>mapClienteListItem(row));
      const pagination = {
        page: raw.page ?? page,
        limit: raw.limit ?? limit,
        total: raw.total ?? clientes.length,
        total_pages: (raw.total_pages ?? Math.ceil((raw.total ?? 0) / (raw.limit ?? limit))) || 1
      };
      const duration = Date.now() - startTime;
      return createHttpSuccessResponse({
        clientes,
        pagination
      }, 200, {
        userId: user.id,
        duration: `${duration}ms`
      });
    }
    if (req.method === 'POST') {
      const body = await req.json().catch(()=>({}));
      const nome = body.nome ?? body.razaoSocial ?? '';
      if (!nome || String(nome).trim().length < 2) throw new Error('Nome deve ter pelo menos 2 caracteres');
      const requisitosLogisticos = extractRequisitosLogisticos(body);
      // Extrair grupo_id (UUID) do grupoRede
      let grupoId = null;
      if (body.grupoRede || body.grupo_rede || body.grupoId || body.grupo_id) {
        // Usar nullish (??) aceitava string vazia ("") como valor válido — o frontend
        // envia grupoId: "" junto do UUID em grupoRede, então o grupo nunca era resolvido.
        // Pegar o primeiro valor realmente preenchido.
        const grupoValue = [
          body.grupoId,
          body.grupo_id,
          body.grupoRede,
          body.grupo_rede
        ].find((v)=>v != null && String(v).trim() !== '');
        // Verificar se e UUID (ID)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(grupoValue));
        if (isUUID) {
          grupoId = String(grupoValue);
        } else {
          // Se for nome, buscar ID
          const { data: grupoData, error: grupoError } = await supabase.from('grupos_redes').select('id').ilike('nome', String(grupoValue).trim()).single();
          if (!grupoError && grupoData) {
            grupoId = grupoData.id;
          }
        }
      }
      // Processar tipoPessoa - pode vir como objeto com ref_tipo_pessoa_id, ID inteiro ou string
      let refTipoPessoaId = null;
      if (body.tipoPessoa) {
        if (typeof body.tipoPessoa === 'object') {
          // Objeto com ref_tipo_pessoa_id ou id
          refTipoPessoaId = Number(body.tipoPessoa.ref_tipo_pessoa_id ?? body.tipoPessoa.id ?? body.tipoPessoa.tipoPessoaId ?? null);
        } else if (typeof body.tipoPessoa === 'string' && body.tipoPessoa.trim() !== '') {
          // Se for string nao vazia, converter para numero
          refTipoPessoaId = Number(body.tipoPessoa);
        } else if (typeof body.tipoPessoa === 'number') {
          refTipoPessoaId = body.tipoPessoa;
        }
      } else if (body.tipoPessoaId || body.ref_tipo_pessoa_id_FK || body.ref_tipo_pessoa_id) {
        refTipoPessoaId = Number(body.tipoPessoaId ?? body.ref_tipo_pessoa_id_FK ?? body.ref_tipo_pessoa_id);
      }
      const cpfCnpj = body.cpfCnpj ?? body.cpf_cnpj ?? null;
      // Processar empresaFaturamento
      let empresaFaturamentoId = null;
      if (body.empresaFaturamento) {
        if (typeof body.empresaFaturamento === 'object' && body.empresaFaturamento.id) {
          empresaFaturamentoId = Number(body.empresaFaturamento.id);
        } else if (typeof body.empresaFaturamento === 'number') {
          empresaFaturamentoId = body.empresaFaturamento;
        } else if (typeof body.empresaFaturamento === 'string' && body.empresaFaturamento.trim() !== '') {
          empresaFaturamentoId = Number(body.empresaFaturamento);
        }
      } else if (body.empresaFaturamentoId) {
        empresaFaturamentoId = Number(body.empresaFaturamentoId);
      }
      // Processar condicoesPagamento
      let condicoesPagamentoIds = null;
      if (body.condicoesPagamentoAssociadas && Array.isArray(body.condicoesPagamentoAssociadas) && body.condicoesPagamentoAssociadas.length > 0) {
        if (typeof body.condicoesPagamentoAssociadas[0] === 'object') {
          condicoesPagamentoIds = body.condicoesPagamentoAssociadas.map((c)=>Number(c.condicao_id ?? c.condicaoId ?? c.id ?? c)).filter((n)=>!isNaN(n));
        } else {
          condicoesPagamentoIds = body.condicoesPagamentoAssociadas.map((c)=>Number(c)).filter((n)=>!isNaN(n));
        }
      }
      const segmentoIdNum = body.segmentoId ?? body.segmento_id;
      const descontoPadrao = body.descontoPadrao ?? body.desconto ?? null;
      const p = {
        p_nome: String(nome).trim(),
        p_nome_fantasia: body.nomeFantasia ?? body.nome_fantasia ?? null,
        p_cpf_cnpj: cpfCnpj,
        p_ref_tipo_pessoa_id_fk: refTipoPessoaId,
        p_inscricao_estadual: body.inscricaoEstadual ?? body.inscricao_estadual ?? null,
        p_codigo: body.codigo ?? null,
        p_grupo_rede: grupoId ? null : body.grupoRede ?? body.grupo_rede ?? null,
        p_grupo_id: grupoId,
        p_segmento_id: segmentoIdNum != null ? Number(segmentoIdNum) : null,
        p_tipo_segmento: segmentoIdNum != null ? String(segmentoIdNum) : null,
        p_lista_de_preco: body.listaPrecos ?? body.lista_de_preco != null ? Number(body.listaPrecos ?? body.lista_de_preco) : null,
        p_desconto_financeiro: body.descontoFinanceiro ?? body.desconto_financeiro ?? 0,
        p_pedido_minimo: body.pedidoMinimo ?? body.pedido_minimo ?? 0,
        p_vendedoresatribuidos: (Array.isArray(body.vendedoresAtribuidos ?? body.vendedoresatribuidos) ? (body.vendedoresAtribuidos ?? body.vendedoresatribuidos).map((v) => String(v && typeof v === 'object' ? (v.id ?? v.user_id) : v)).filter((s) => s && s !== 'undefined' && s !== 'null') : (body.vendedorAtribuido?.id ? [String(body.vendedorAtribuido.id)] : null)),
        p_observacao_interna: body.observacoesInternas ?? body.observacao_interna ?? null,
        p_telefone: body.telefoneFixoPrincipal ?? body.telefone ?? body.contato?.telefoneFixoPrincipal ?? null,
        p_telefone_adicional: body.telefoneCelularPrincipal,
        p_website: body.site,
        p_email: body.emailPrincipal ?? body.email ?? body.contato?.emailPrincipal ?? null,
        p_email_nf: body.emailNf ?? body.email_nf ?? body.contato?.emailNf ?? null,
        p_cep: body.cep ?? body.endereco?.cep ?? null,
        p_rua: body.logradouro ?? body.endereco?.logradouro ?? body.rua ?? null,
        p_numero: body.numero ?? body.endereco?.numero ?? null,
        p_bairro: body.bairro ?? body.endereco?.bairro ?? null,
        p_cidade: body.municipio ?? body.endereco?.municipio ?? body.cidade ?? null,
        p_uf: body.uf ?? body.endereco?.uf ?? null,
        p_empresa_faturamento_id: empresaFaturamentoId,
        p_desconto: descontoPadrao != null ? Number(descontoPadrao) : null,
        p_condicao_padrao: body.condicaoPadrao ?? body.condicao_padrao != null ? Number(body.condicaoPadrao ?? body.condicao_padrao) : null,
        p_condicoes_pagamento_ids: condicoesPagamentoIds,
        p_criado_por: user.id,
        p_requisitos_logisticos: requisitosLogisticos.value
      };
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_cliente_v2', p);
      if (rpcError) throw new Error(rpcError.message);
      const row = Array.isArray(rpcData) && rpcData[0] ? rpcData[0] : rpcData;
      const created = mapClienteListItem(row);
      const duration = Date.now() - startTime;
      return createHttpSuccessResponse(created, 201, {
        userId: user.id,
        duration: `${duration}ms`
      });
    }
    if (req.method === 'PUT') {
      const body = await req.json().catch(()=>({}));
      const id = clienteId ?? body.id;
      if (!id) throw new Error('ID e obrigatorio para atualizacao');
      const idNum = parseInt(String(id), 10);
      if (isNaN(idNum) || idNum <= 0) throw new Error('ID invalido');
      const nome = body.nome ?? body.razaoSocial ?? '';
      if (!nome || String(nome).trim().length < 2) throw new Error('Nome deve ter pelo menos 2 caracteres');
      const requisitosLogisticos = extractRequisitosLogisticos(body);
      // Extrair grupo_id (UUID) do grupoRede
      let grupoId = null;
      if (body.grupoRede || body.grupo_rede || body.grupoId || body.grupo_id) {
        // Usar nullish (??) aceitava string vazia ("") como valor válido — o frontend
        // envia grupoId: "" junto do UUID em grupoRede, então o grupo nunca era resolvido.
        // Pegar o primeiro valor realmente preenchido.
        const grupoValue = [
          body.grupoId,
          body.grupo_id,
          body.grupoRede,
          body.grupo_rede
        ].find((v)=>v != null && String(v).trim() !== '');
        // Verificar se e UUID (ID)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(grupoValue));
        if (isUUID) {
          grupoId = String(grupoValue);
        } else {
          // Se for nome, buscar ID
          const { data: grupoData, error: grupoError } = await supabase.from('grupos_redes').select('id').ilike('nome', String(grupoValue).trim()).single();
          if (!grupoError && grupoData) {
            grupoId = grupoData.id;
          }
        }
      }
      // Priorizar ID de situacao enviado no payload; fallback por nome da situacao
      let refSituacaoId = body.ref_situacao_id != null ? Number(body.ref_situacao_id) : body.refSituacaoId != null ? Number(body.refSituacaoId) : null;
      const statusAprovacao = typeof body.status_aprovacao === 'string' ? body.status_aprovacao : typeof body.statusAprovacao === 'string' ? body.statusAprovacao : null;
      if ((refSituacaoId == null || Number.isNaN(refSituacaoId)) && body.situacao) {
        const { data: situacaoData, error: situacaoError } = await supabase.from('ref_situacao').select('ref_situacao_id').ilike('nome', String(body.situacao).trim()).single();
        if (!situacaoError && situacaoData) {
          refSituacaoId = situacaoData.ref_situacao_id;
        }
      }
      if (refSituacaoId != null && Number.isNaN(refSituacaoId)) refSituacaoId = null;
      // Processar vendedoresAtribuidos - pode vir como array de IDs ou array de objetos
      let vendedoresAtribuidosArray = null;
      if (body.vendedoresAtribuidos && Array.isArray(body.vendedoresAtribuidos) && body.vendedoresAtribuidos.length > 0) {
        // Se for array de objetos, extrair IDs
        if (typeof body.vendedoresAtribuidos[0] === 'object') {
          vendedoresAtribuidosArray = body.vendedoresAtribuidos.map((v)=>String(v.id || v.user_id || v));
        } else {
          // Se for array de IDs
          vendedoresAtribuidosArray = body.vendedoresAtribuidos.map((v)=>String(v));
        }
      } else if (body.vendedorAtribuido?.id) {
        // Fallback: se vier vendedorAtribuido como objeto unico ou se vendedoresAtribuidos estiver vazio
        vendedoresAtribuidosArray = [
          String(body.vendedorAtribuido.id)
        ];
      }
      // Processar condicoesPagamentoAssociadas - pode vir como array de IDs ou array de objetos
      let condicoesPagamentoIds = null;
      if (!body.condicoesPagamentoAssociadas && Array.isArray(body.condicoesCliente)) {
        condicoesPagamentoIds = body.condicoesCliente.map((c)=>extractCondicaoPagamentoId(c)).filter((id)=>Boolean(id)).map((id)=>Number(id));
      }
      if (body.condicoesPagamentoAssociadas) {
        if (Array.isArray(body.condicoesPagamentoAssociadas)) {
          if (body.condicoesPagamentoAssociadas.length > 0) {
            // Se for array de objetos, extrair IDs
            if (typeof body.condicoesPagamentoAssociadas[0] === 'object') {
              condicoesPagamentoIds = body.condicoesPagamentoAssociadas.map((c)=>extractCondicaoPagamentoId(c) ?? c.condicao_id ?? c.condicaoId ?? c.id).map((id)=>Number(id));
            } else {
              // Se for array de IDs (numeros ou strings)
              condicoesPagamentoIds = body.condicoesPagamentoAssociadas.map((c)=>Number(c));
            }
          }
        }
      }
      // Processar empresaFaturamento - pode vir como ID ou objeto
      let empresaFaturamentoId = null;
      if (body.empresaFaturamento) {
        if (typeof body.empresaFaturamento === 'object' && body.empresaFaturamento.id) {
          empresaFaturamentoId = Number(body.empresaFaturamento.id);
        } else if (typeof body.empresaFaturamento === 'string' && body.empresaFaturamento.trim() !== '') {
          // Se for string nao vazia, converter para numero
          empresaFaturamentoId = Number(body.empresaFaturamento);
        } else if (typeof body.empresaFaturamento === 'number') {
          empresaFaturamentoId = body.empresaFaturamento;
        }
      } else if (body.empresaFaturamentoId) {
        empresaFaturamentoId = Number(body.empresaFaturamentoId);
      }
      // Processar tipoPessoa - pode vir como objeto com ref_tipo_pessoa_id, ID inteiro ou string
      let refTipoPessoaId = null;
      if (body.tipoPessoa) {
        if (typeof body.tipoPessoa === 'object') {
          // Objeto com ref_tipo_pessoa_id ou id
          refTipoPessoaId = Number(body.tipoPessoa.ref_tipo_pessoa_id ?? body.tipoPessoa.id ?? body.tipoPessoa.tipoPessoaId ?? null);
        } else if (typeof body.tipoPessoa === 'string' && body.tipoPessoa.trim() !== '') {
          // Se for string nao vazia, converter para numero
          refTipoPessoaId = Number(body.tipoPessoa);
        } else if (typeof body.tipoPessoa === 'number') {
          refTipoPessoaId = body.tipoPessoa;
        }
      } else if (body.tipoPessoaId || body.ref_tipo_pessoa_id_FK || body.ref_tipo_pessoa_id) {
        refTipoPessoaId = Number(body.tipoPessoaId ?? body.ref_tipo_pessoa_id_FK ?? body.ref_tipo_pessoa_id);
      }
      // Log para debug
      console.log('[CLIENTES-V2] Processando campos:', {
        empresaFaturamento: body.empresaFaturamento,
        empresaFaturamentoId,
        tipoPessoa: body.tipoPessoa,
        refTipoPessoaId,
        vendedorAtribuido: body.vendedorAtribuido,
        vendedoresAtribuidos: body.vendedoresAtribuidos,
        vendedoresAtribuidosArray,
        condicoesPagamentoAssociadas: body.condicoesPagamentoAssociadas,
        condicoesPagamentoIds
      });
      const cpfCnpj = body.cpfCnpj ?? body.cpf_cnpj ?? null;
      const descontoPadrao = body.descontoPadrao ?? body.desconto ?? null;
      const condicaoPadrao = body.condicaoPadrao ?? body.condicao_padrao ?? null;
      const { data: rpcData, error: rpcError } = await supabase.rpc('update_cliente_v2', {
        p_cliente_id: idNum,
        p_nome: String(nome).trim(),
        p_nome_fantasia: body.nomeFantasia ?? body.nome_fantasia ?? null,
        p_cpf_cnpj: cpfCnpj,
        p_ref_tipo_pessoa_id_fk: refTipoPessoaId,
        p_inscricao_estadual: body.inscricaoEstadual ?? body.inscricao_estadual ?? null,
        p_codigo: body.codigo ?? null,
        p_grupo_id: grupoId,
        p_lista_de_preco: body.listaPrecos ?? body.lista_de_preco != null ? Number(body.listaPrecos ?? body.lista_de_preco) : null,
        p_desconto_financeiro: body.descontoFinanceiro ?? body.desconto_financeiro ?? null,
        p_pedido_minimo: body.pedidoMinimo ?? body.pedido_minimo ?? null,
        p_vendedoresatribuidos: vendedoresAtribuidosArray,
        p_empresa_faturamento_id: empresaFaturamentoId,
        p_condicoes_pagamento_ids: condicoesPagamentoIds,
        p_observacao_interna: body.observacoesInternas ?? body.observacao_interna ?? null,
        p_segmento_id: body.segmentoId ?? body.segmento_id != null ? Number(body.segmentoId ?? body.segmento_id) : null,
        p_ref_situacao_id: refSituacaoId,
        p_status_aprovacao: statusAprovacao,
        p_atualizado_por: user.id,
        p_set_requisitos_logisticos: requisitosLogisticos.hasValue,
        p_requisitos_logisticos: requisitosLogisticos.value,
        p_telefone: body.telefoneFixoPrincipal ?? body.telefone ?? body.contato?.telefoneFixoPrincipal ?? null,
        p_telefone_adicional: body.telefoneCelularPrincipal ?? body.telefone_adicional ?? null,
        p_email: body.emailPrincipal ?? body.email ?? body.contato?.emailPrincipal ?? null,
        p_email_nf: body.emailNFe ?? body.emailNf ?? body.email_nf ?? body.contato?.emailNFe ?? body.contato?.emailNf ?? null,
        p_website: body.site ?? body.website ?? null,
        p_observacao_contato: body.observacaoContato ?? body.observacao_contato ?? null,
        p_cep: body.cep ?? body.endereco?.cep ?? null,
        p_rua: body.logradouro ?? body.endereco?.logradouro ?? body.rua ?? null,
        p_numero: body.numero ?? body.endereco?.numero ?? null,
        p_complemento: body.complemento ?? body.endereco?.complemento ?? null,
        p_bairro: body.bairro ?? body.endereco?.bairro ?? null,
        p_cidade: body.municipio ?? body.endereco?.municipio ?? body.cidade ?? null,
        p_uf: body.uf ?? body.endereco?.uf ?? null,
        p_desconto: descontoPadrao != null ? Number(descontoPadrao) : null,
        p_condicao_padrao: condicaoPadrao != null ? Number(condicaoPadrao) : null
      });
      if (rpcError) throw new Error(rpcError.message);
      const row = Array.isArray(rpcData) && rpcData[0] ? rpcData[0] : rpcData;
      const updated = mapClienteListItem({
        ...row,
        cliente_id: idNum
      });
      const duration = Date.now() - startTime;
      return createHttpSuccessResponse(updated, 200, {
        userId: user.id,
        duration: `${duration}ms`
      });
    }
    if (req.method === 'DELETE') {
      const id = clienteId ?? url.searchParams.get('id');
      if (!id) throw new Error('ID e obrigatorio para exclusao');
      const idNum = parseInt(String(id), 10);
      if (isNaN(idNum) || idNum <= 0) throw new Error('ID invalido');
      const { error: rpcError } = await supabase.rpc('delete_cliente_v2', {
        p_cliente_id: idNum,
        p_deleted_by: user.id
      });
      if (rpcError) throw new Error(rpcError.message);
      const duration = Date.now() - startTime;
      return createHttpSuccessResponse({
        success: true,
        message: 'Cliente excluido com sucesso'
      }, 200, {
        userId: user.id,
        duration: `${duration}ms`
      });
    }
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed',
      timestamp: new Date().toISOString()
    }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return formatErrorResponse(error);
  }
});
