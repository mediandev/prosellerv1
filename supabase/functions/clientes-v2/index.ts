import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Configuração de CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper: Validar JWT
async function validateJWT(
  req: Request,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<{ user: any; error: string | null }> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return { user: null, error: 'Missing authorization header' }
  }

  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return { user: null, error: error?.message || 'Invalid token' }
  }

  return { user, error: null }
}

// Helper: Criar resposta de erro de autenticação
function createAuthErrorResponse(error: string): Response {
  return new Response(
    JSON.stringify({ success: false, error, timestamp: new Date().toISOString() }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Helper: Criar resposta de sucesso HTTP
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

// Helper: Log detalhado
function logDetailed(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(data && { data }),
  }
  console.log(JSON.stringify(logEntry))
}

serve(async (req) => {
  const startTime = Date.now()
  logDetailed('INFO', '[CLIENTES-V2] Request received', {
    method: req.method,
    url: req.url,
  })

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400',
      }
    })
  }

  try {
    logDetailed('INFO', '[CLIENTES-V2] Step 1: Starting authentication...')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)

    if (authError || !user) {
      logDetailed('ERROR', '[CLIENTES-V2] Authentication failed', { error: authError })
      return createAuthErrorResponse(authError || 'Unauthorized')
    }

    logDetailed('INFO', '[CLIENTES-V2] Authentication successful', {
      userId: user.id,
      email: user.email,
    })

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    })

    // Extrair action do body ou query params
    let action: string
    let body: any = {}

    if (req.method === 'GET') {
      const url = new URL(req.url)
      action = url.searchParams.get('action') || 'list'
    } else {
      try {
        body = await req.json()
        logDetailed('INFO', '[CLIENTES-V2] Request body parsed', { action: body.action, bodyKeys: Object.keys(body) })
      } catch {
        body = {}
        logDetailed('WARN', '[CLIENTES-V2] Failed to parse request body, using empty object')
      }
      action = body.action || 'list'
    }

    logDetailed('INFO', '[CLIENTES-V2] Action determined', { action, method: req.method })

    switch (action) {
      case 'list': {
        logDetailed('INFO', '[CLIENTES-V2] Executing list action via RPC...')
        
        // Chamar função RPC que retorna clientes formatados
        const rpcStartTime = Date.now()
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('list_clientes_v2')

        const rpcDuration = Date.now() - rpcStartTime
        logDetailed('INFO', '[CLIENTES-V2] RPC call completed', {
          duration: `${rpcDuration}ms`,
          hasError: !!rpcError,
          dataType: rpcData ? typeof rpcData : 'null',
        })

        if (rpcError) {
          logDetailed('ERROR', '[CLIENTES-V2] RPC Error', {
            error: rpcError.message,
            code: rpcError.code,
            details: rpcError.details,
            hint: rpcError.hint,
          })
          throw new Error(`Database operation failed: ${rpcError.message}`)
        }

        // Parse JSON response from RPC
        const clientes = Array.isArray(rpcData) ? rpcData : (typeof rpcData === 'string' ? JSON.parse(rpcData) : [])

        // Formatar os dados para o frontend
        const formattedClientes = (clientes || []).map((cliente: any) => ({
          id: String(cliente.id || cliente.cliente_id),
          codigo: cliente.codigo || '',
          tipoPessoa: cliente.tipoPessoa || 'Pessoa Jurídica',
          cpfCnpj: cliente.cpfCnpj || '',
          razaoSocial: cliente.nome || cliente.razaoSocial || '',
          nomeFantasia: cliente.nomeFantasia || '',
          situacao: cliente.situacao || 'Ativo',
          segmentoMercado: cliente.segmentoMercado || '',
          grupoRede: cliente.grupoRede || '',
          statusAprovacao: cliente.statusAprovacao || 'pendente',
          emailPrincipal: cliente.emailPrincipal || '',
          telefoneFixoPrincipal: cliente.telefoneFixoPrincipal || '',
          telefoneCelularPrincipal: cliente.telefoneCelularPrincipal || '',
          emailNFe: cliente.emailNFe || '',
          site: cliente.site || '',
          cep: cliente.cep || '',
          logradouro: cliente.logradouro || '',
          numero: cliente.numero || '',
          complemento: cliente.complemento || '',
          bairro: cliente.bairro || '',
          uf: cliente.uf || '',
          municipio: cliente.municipio || '',
          inscricaoEstadual: cliente.inscricaoEstadual || '',
          inscricaoMunicipal: cliente.inscricaoMunicipal || '',
          observacoesInternas: cliente.observacoesInternas || '',
          dataCadastro: cliente.dataCadastro ? new Date(cliente.dataCadastro).toISOString() : new Date().toISOString(),
          dataAtualizacao: cliente.dataAtualizacao ? new Date(cliente.dataAtualizacao).toISOString() : new Date().toISOString(),
        }))

        const duration = Date.now() - startTime
        logDetailed('INFO', '[CLIENTES-V2] SUCCESS: Listed clientes', {
          count: formattedClientes.length,
          totalDuration: `${duration}ms`,
          rpcDuration: `${rpcDuration}ms`,
        })

        return createHttpSuccessResponse(
          formattedClientes,
          200,
          { userId: user.id, duration: `${duration}ms`, rpcDuration: `${rpcDuration}ms` }
        )
      }

      default:
        throw new Error(`Ação não suportada: ${action}`)
    }
  } catch (error) {
    const duration = Date.now() - startTime
    logDetailed('ERROR', '[CLIENTES-V2] Error processing request', {
      error: error instanceof Error ? error.message : String(error),
      duration: `${duration}ms`,
    })
    return formatErrorResponse(error)
  }
})
