import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AuthenticatedUser {
  id: string
  email: string
  tipo: 'backoffice' | 'vendedor'
  ativo: boolean
}

// Helper: Valida JWT
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
    else if (error.message.includes('validation') || error.message.includes('invalid') || error.message.includes('obrigatório')) statusCode = 400
  }
  console.error('[ERROR]', { message: errorMessage, statusCode })
  return new Response(
    JSON.stringify({ success: false, error: errorMessage, timestamp: new Date().toISOString() }),
    { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function sanitizeInput(input: string): string {
  return typeof input === 'string' ? input.trim().replace(/[<>]/g, '').replace(/javascript:/gi, '').replace(/on\w+=/gi, '') : ''
}

function validateMinLength(value: string, minLength: number): boolean {
  return value && value.trim().length >= minLength
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

serve(async (req) => {
  const startTime = Date.now()
  console.log('[UPDATE-CLIENTE-V2] Request received:', { method: req.method, url: req.url, timestamp: new Date().toISOString() })

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[UPDATE-CLIENTE-V2] Step 1: Starting authentication...')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)

    if (authError || !user) {
      console.error('[UPDATE-CLIENTE-V2] Authentication failed:', { error: authError })
      return createAuthErrorResponse(authError || 'Unauthorized')
    }

    console.log('[UPDATE-CLIENTE-V2] Authentication successful:', { userId: user.id, tipo: user.tipo })

    console.log('[UPDATE-CLIENTE-V2] Step 2: Extracting cliente_id from URL...')
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const clienteId = pathParts[pathParts.length - 1]
    console.log('[UPDATE-CLIENTE-V2] Extracted clienteId:', clienteId)

    if (!clienteId || clienteId === 'update-cliente-v2') {
      console.error('[UPDATE-CLIENTE-V2] ERROR: cliente_id is missing or invalid')
      throw new ValidationError('cliente_id é obrigatório na URL')
    }

    const clienteIdNum = parseInt(clienteId)
    if (isNaN(clienteIdNum)) {
      console.error('[UPDATE-CLIENTE-V2] ERROR: cliente_id is not a valid number')
      throw new ValidationError('cliente_id deve ser um número válido')
    }

    console.log('[UPDATE-CLIENTE-V2] Step 3: Validating input...')
    const body = await req.json()
    console.log('[UPDATE-CLIENTE-V2] Request body received:', { fields: Object.keys(body) })

    if (body.nome !== undefined && !validateMinLength(body.nome, 2)) {
      console.error('[UPDATE-CLIENTE-V2] Validation error: Nome too short')
      throw new ValidationError('Nome deve ter pelo menos 2 caracteres')
    }

    console.log('[UPDATE-CLIENTE-V2] Step 4: Sanitizing data...')
    const sanitizedData: any = {}
    if (body.nome !== undefined) sanitizedData.nome = sanitizeInput(body.nome).trim()
    if (body.nome_fantasia !== undefined) sanitizedData.nome_fantasia = sanitizeInput(body.nome_fantasia).trim()
    if (body.cpf_cnpj !== undefined) sanitizedData.cpf_cnpj = body.cpf_cnpj.replace(/\D/g, '')
    if (body.inscricao_estadual !== undefined) sanitizedData.inscricao_estadual = sanitizeInput(body.inscricao_estadual).trim()
    if (body.codigo !== undefined) sanitizedData.codigo = sanitizeInput(body.codigo).trim()
    if (body.grupo_rede !== undefined) sanitizedData.grupo_rede = sanitizeInput(body.grupo_rede).trim()
    if (body.lista_de_preco !== undefined) sanitizedData.lista_de_preco = body.lista_de_preco
    if (body.desconto_financeiro !== undefined) sanitizedData.desconto_financeiro = body.desconto_financeiro
    if (body.pedido_minimo !== undefined) sanitizedData.pedido_minimo = body.pedido_minimo
    if (body.vendedoresatribuidos !== undefined) sanitizedData.vendedoresatribuidos = body.vendedoresatribuidos
    if (body.observacao_interna !== undefined) sanitizedData.observacao_interna = sanitizeInput(body.observacao_interna).trim()

    console.log('[UPDATE-CLIENTE-V2] Step 5: Calling RPC function...', { p_cliente_id: clienteIdNum, p_atualizado_por: user.id })
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    })

    const { data: rpcData, error: rpcError } = await supabase.rpc('update_cliente_v2', {
      p_cliente_id: clienteIdNum,
      p_nome: sanitizedData.nome,
      p_nome_fantasia: sanitizedData.nome_fantasia,
      p_cpf_cnpj: sanitizedData.cpf_cnpj,
      p_inscricao_estadual: sanitizedData.inscricao_estadual,
      p_codigo: sanitizedData.codigo,
      p_grupo_rede: sanitizedData.grupo_rede,
      p_lista_de_preco: sanitizedData.lista_de_preco,
      p_desconto_financeiro: sanitizedData.desconto_financeiro,
      p_pedido_minimo: sanitizedData.pedido_minimo,
      p_vendedoresatribuidos: sanitizedData.vendedoresatribuidos,
      p_observacao_interna: sanitizedData.observacao_interna,
      p_atualizado_por: user.id,
    })

    if (rpcError) {
      console.error('[UPDATE-CLIENTE-V2] RPC Error:', { message: rpcError.message, details: rpcError.details, code: rpcError.code })
      throw new Error(`Database operation failed: ${rpcError.message}`)
    }

    console.log('[UPDATE-CLIENTE-V2] RPC call successful:', { dataLength: rpcData?.length || 0 })

    const duration = Date.now() - startTime
    console.log(`[UPDATE-CLIENTE-V2] SUCCESS: Cliente updated: ${clienteId} by ${user.id} (${duration}ms)`)

    return createHttpSuccessResponse(
      { cliente: rpcData[0], message: 'Cliente atualizado com sucesso' },
      200,
      { userId: user.id, duration: `${duration}ms` }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[UPDATE-CLIENTE-V2] EXCEPTION:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`
    })
    return formatErrorResponse(error)
  }
})
