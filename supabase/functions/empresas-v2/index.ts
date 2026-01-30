import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

interface AuthenticatedUser {
  id: string
  email: string
  tipo: 'backoffice' | 'vendedor'
  ativo: boolean
}

async function validateJWT(
  req: Request,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<{ user: AuthenticatedUser | null; error: string | null }> {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return { user: null, error: 'Missing authorization header' }
    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authUser) return { user: null, error: 'Invalid or expired token' }
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('user_id, email, tipo, ativo')
      .eq('user_id', authUser.id)
      .eq('ativo', true)
      .is('deleted_at', null)
      .single()
    if (userError || !userData) return { user: null, error: 'User not found or inactive' }
    return {
      user: {
        id: userData.user_id,
        email: userData.email || authUser.email || '',
        tipo: userData.tipo as 'backoffice' | 'vendedor',
        ativo: userData.ativo,
      },
      error: null
    }
  } catch (error) {
    return { user: null, error: 'Authentication error' }
  }
}

function createAuthErrorResponse(message: string, statusCode: number = 401): Response {
  return new Response(
    JSON.stringify({ error: message, timestamp: new Date().toISOString() }),
    { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function createHttpSuccessResponse<T>(data: T, status: number = 200, meta?: Record<string, any>): Response {
  return new Response(
    JSON.stringify({ success: true, data, meta: { timestamp: new Date().toISOString(), ...meta } }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function formatErrorResponse(error: Error | unknown): Response {
  let statusCode = 500
  let errorMessage = 'Internal server error'
  if (error instanceof Error) {
    errorMessage = error.message
    if (error.message.includes('Unauthorized') || error.message.includes('authentication')) statusCode = 401
    else if (error.message.includes('permission') || error.message.includes('forbidden')) statusCode = 403
    else if (error.message.includes('not found')) statusCode = 404
    else if (error.message.includes('validation') || error.message.includes('invalid')) statusCode = 400
  }
  console.error('[ERROR]', { message: errorMessage, statusCode })
  return new Response(
    JSON.stringify({ success: false, error: errorMessage, timestamp: new Date().toISOString() }),
    { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function formatEmpresa(row: any) {
  const endereco = row.endereco && typeof row.endereco === 'object' ? row.endereco : {}
  const contasBancarias = Array.isArray(row.contas_bancarias) ? row.contas_bancarias : (row.contasBancarias || [])
  const integracoesERP = Array.isArray(row.integracoes_erp) ? row.integracoes_erp : (row.integracoesERP || [])
  const chaveApi = row.chave_api ?? row.chaveApi ?? ''
  return {
    id: String(row.id),
    cnpj: row.cnpj ?? '',
    razaoSocial: row.razao_social ?? row.razaoSocial ?? '',
    nomeFantasia: row.nome_fantasia ?? row.nomeFantasia ?? '',
    inscricaoEstadual: row.inscricao_estadual ?? row.inscricaoEstadual ?? '',
    chaveApi,
    endereco: {
      cep: endereco.cep ?? '',
      logradouro: endereco.logradouro ?? '',
      numero: endereco.numero ?? '',
      complemento: endereco.complemento ?? '',
      bairro: endereco.bairro ?? '',
      uf: endereco.uf ?? '',
      municipio: endereco.municipio ?? '',
    },
    contasBancarias,
    integracoesERP,
    ativo: row.ativo ?? true,
    dataCadastro: row.created_at ? new Date(row.created_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
  }
}

serve(async (req) => {
  console.log('[EMPRESAS-V2] Request received:', { method: req.method, url: req.url })

  // CORS preflight: retornar 204 com headers CORS (evita erro de CORS no browser)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)
    if (authError || !user) {
      return createAuthErrorResponse(authError || 'Unauthorized')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    })

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(p => p)
    const functionIndex = pathParts.indexOf('empresas-v2')
    const empresaIdParam = functionIndex >= 0 && functionIndex < pathParts.length - 1
      ? pathParts[functionIndex + 1]
      : url.searchParams.get('id')
    const empresaIdBigint = empresaIdParam ? parseInt(empresaIdParam, 10) : NaN

    if (req.method === 'GET') {
      if (empresaIdParam && !isNaN(empresaIdBigint)) {
        const { data: rows, error: rpcError } = await supabase
          .rpc('get_empresas_v2', { p_id: empresaIdBigint })
        if (rpcError) throw new Error(`Database operation failed: ${rpcError.message}`)
        if (!rows || rows.length === 0) throw new Error('Empresa não encontrada')
        const formatted = formatEmpresa(rows[0])
        return createHttpSuccessResponse(formatted, 200, { userId: user.id })
      }

      const search = url.searchParams.get('search') || null
      const apenasAtivos = url.searchParams.get('apenas_ativos') === 'true'
      const page = parseInt(url.searchParams.get('page') || '1')
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 100)

      const { data: rpcData, error: rpcError } = await supabase
        .rpc('list_empresas_v2', {
          p_requesting_user_id: user.id,
          p_search: search,
          p_apenas_ativos: apenasAtivos,
          p_page: page,
          p_limit: limit,
        })
      if (rpcError) throw new Error(`Database operation failed: ${rpcError.message}`)

      const empresas = rpcData?.empresas || []
      const formattedList = empresas.map((e: any) => {
        const chaveApi = e.chave_api ?? e.chaveApi ?? ''
        return {
          id: String(e.id),
          cnpj: e.cnpj ?? '',
          razaoSocial: e.razaoSocial ?? e.razao_social ?? '',
          nomeFantasia: e.nomeFantasia ?? e.nome_fantasia ?? '',
          inscricaoEstadual: e.inscricaoEstadual ?? e.inscricao_estadual ?? '',
          chaveApi,
          endereco: e.endereco && typeof e.endereco === 'object' ? e.endereco : { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', uf: '', municipio: '' },
        contasBancarias: Array.isArray(e.contasBancarias) ? e.contasBancarias : [],
        integracoesERP: Array.isArray(e.integracoesERP) ? e.integracoesERP : [],
        ativo: e.ativo ?? true,
        dataCadastro: e.createdAt ? new Date(e.createdAt).toISOString().slice(0, 10) : '',
        }
      })
      return createHttpSuccessResponse(formattedList, 200, { userId: user.id })
    }

    if (req.method === 'POST') {
      const body = await req.json()
      if (user.tipo !== 'backoffice') {
        throw new Error('Apenas usuários backoffice podem criar empresas')
      }
      if (!body.cnpj || !String(body.cnpj).trim()) {
        throw new Error('CNPJ é obrigatório')
      }
      if (!body.razaoSocial || String(body.razaoSocial).trim().length < 2) {
        throw new Error('Razão social deve ter pelo menos 2 caracteres')
      }

      const { data: rows, error: rpcError } = await supabase
        .rpc('create_empresas_v2', {
          p_cnpj: String(body.cnpj).trim(),
          p_razao_social: String(body.razaoSocial).trim(),
          p_nome_fantasia: body.nomeFantasia ? String(body.nomeFantasia).trim() : null,
          p_inscricao_estadual: body.inscricaoEstadual ? String(body.inscricaoEstadual).trim() : null,
          p_endereco: body.endereco && typeof body.endereco === 'object' ? body.endereco : {},
          p_contas_bancarias: Array.isArray(body.contasBancarias) ? body.contasBancarias : [],
          p_integracoes_erp: Array.isArray(body.integracoesERP) ? body.integracoesERP : [],
          p_created_by: user.id,
        })
      if (rpcError) throw new Error(`Database operation failed: ${rpcError.message}`)
      if (!rows || rows.length === 0) throw new Error('Erro ao criar empresa')

      const formatted = formatEmpresa(rows[0])
      return createHttpSuccessResponse(formatted, 201, { userId: user.id })
    }

    if (req.method === 'PUT') {
      const body = await req.json()
      const idParam = empresaIdParam || body.id
      if (idParam == null || idParam === '') throw new Error('ID é obrigatório para atualização')
      const idBigint = typeof idParam === 'number' ? idParam : parseInt(String(idParam), 10)
      if (isNaN(idBigint)) throw new Error('ID inválido')
      if (user.tipo !== 'backoffice') {
        throw new Error('Apenas usuários backoffice podem atualizar empresas')
      }

      const { data: rows, error: rpcError } = await supabase
        .rpc('update_empresas_v2', {
          p_id: idBigint,
          p_cnpj: body.cnpj !== undefined ? String(body.cnpj).trim() : null,
          p_razao_social: body.razaoSocial !== undefined ? String(body.razaoSocial).trim() : null,
          p_nome_fantasia: body.nomeFantasia !== undefined ? (body.nomeFantasia ? String(body.nomeFantasia).trim() : null) : null,
          p_inscricao_estadual: body.inscricaoEstadual !== undefined ? (body.inscricaoEstadual ? String(body.inscricaoEstadual).trim() : null) : null,
          p_endereco: body.endereco !== undefined ? (body.endereco && typeof body.endereco === 'object' ? body.endereco : null) : null,
          p_contas_bancarias: body.contasBancarias !== undefined ? (Array.isArray(body.contasBancarias) ? body.contasBancarias : null) : null,
          p_integracoes_erp: body.integracoesERP !== undefined ? (Array.isArray(body.integracoesERP) ? body.integracoesERP : null) : null,
          p_ativo: body.ativo !== undefined ? body.ativo : null,
          p_updated_by: user.id,
        })
      if (rpcError) throw new Error(`Database operation failed: ${rpcError.message}`)
      if (!rows || rows.length === 0) throw new Error('Empresa não encontrada')

      const formatted = formatEmpresa(rows[0])
      return createHttpSuccessResponse(formatted, 200, { userId: user.id })
    }

    if (req.method === 'DELETE') {
      const idParam = empresaIdParam || url.searchParams.get('id')
      if (idParam == null || idParam === '') throw new Error('ID é obrigatório para exclusão')
      const idBigint = parseInt(String(idParam), 10)
      if (isNaN(idBigint)) throw new Error('ID inválido')
      if (user.tipo !== 'backoffice') {
        throw new Error('Apenas usuários backoffice podem excluir empresas')
      }

      const { error: deleteError } = await supabase
        .rpc('delete_empresas_v2', { p_id: idBigint, p_deleted_by: user.id })
      if (deleteError) throw new Error(`Database operation failed: ${deleteError.message}`)

      return createHttpSuccessResponse(
        { success: true, message: 'Empresa excluída com sucesso' },
        200,
        { userId: user.id }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed', timestamp: new Date().toISOString() }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[EMPRESAS-V2] EXCEPTION:', error instanceof Error ? error.message : String(error))
    return formatErrorResponse(error)
  }
})
