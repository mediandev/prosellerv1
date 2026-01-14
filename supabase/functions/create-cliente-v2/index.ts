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

interface CreateClienteBody {
  nome: string
  nome_fantasia?: string
  cpf_cnpj?: string
  ref_tipo_pessoa_id_FK?: number
  inscricao_estadual?: string
  codigo?: string
  grupo_rede?: string
  lista_de_preco?: number
  desconto_financeiro?: number
  pedido_minimo?: number
  vendedoresatribuidos?: string[]
  observacao_interna?: string
  telefone?: string
  email?: string
  cep?: string
  rua?: string
  numero?: string
  bairro?: string
  cidade?: string
  uf?: string
}

// Helper: Valida JWT
async function validateJWT(
  req: Request,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<{ user: AuthenticatedUser | null; error: string | null }> {
  try {
    console.log('[AUTH] Starting JWT validation...')
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('[AUTH] ERROR: Missing authorization header')
      return { user: null, error: 'Missing authorization header' }
    }
    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authUser) {
      console.error('[AUTH] ERROR:', { authError: authError?.message })
      return { user: null, error: 'Invalid or expired token' }
    }
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('user_id, email, tipo, ativo')
      .eq('user_id', authUser.id)
      .eq('ativo', true)
      .is('deleted_at', null)
      .single()
    if (userError || !userData) {
      console.error('[AUTH] ERROR: User not found or inactive')
      return { user: null, error: 'User not found or inactive' }
    }
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
    console.error('[AUTH] EXCEPTION:', error)
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

function validateCPF(cpf: string): boolean {
  if (!cpf) return false
  const cleanCPF = cpf.replace(/\D/g, '')
  if (cleanCPF.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false
  let sum = 0
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false
  sum = 0
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  return remainder === parseInt(cleanCPF.substring(10, 11))
}

function validateCNPJ(cnpj: string): boolean {
  if (!cnpj) return false
  const cleanCNPJ = cnpj.replace(/\D/g, '')
  if (cleanCNPJ.length !== 14) return false
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false
  let length = cleanCNPJ.length - 2
  let numbers = cleanCNPJ.substring(0, length)
  const digits = cleanCNPJ.substring(length)
  let sum = 0
  let pos = length - 7
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(0))) return false
  length = length + 1
  numbers = cleanCNPJ.substring(0, length)
  sum = 0
  pos = length - 7
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  return result === parseInt(digits.charAt(1))
}

function sanitizeInput(input: string): string {
  return typeof input === 'string' ? input.trim().replace(/[<>]/g, '').replace(/javascript:/gi, '').replace(/on\w+=/gi, '') : ''
}

function validateNotEmpty(value: string | null | undefined): boolean {
  return value !== null && value !== undefined && value.trim().length > 0
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
  console.log('[CREATE-CLIENTE-V2] Request received:', { method: req.method, url: req.url, timestamp: new Date().toISOString() })

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[CREATE-CLIENTE-V2] Step 1: Starting authentication...')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)

    if (authError || !user) {
      console.error('[CREATE-CLIENTE-V2] Authentication failed:', { error: authError })
      return createAuthErrorResponse(authError || 'Unauthorized')
    }

    console.log('[CREATE-CLIENTE-V2] Authentication successful:', { userId: user.id, tipo: user.tipo })

    console.log('[CREATE-CLIENTE-V2] Step 2: Validating input...')
    const body: CreateClienteBody = await req.json()
    console.log('[CREATE-CLIENTE-V2] Request body received:', { nome: body.nome?.substring(0, 20), hasCpfCnpj: !!body.cpf_cnpj })

    if (!validateNotEmpty(body.nome)) {
      console.error('[CREATE-CLIENTE-V2] Validation error: Nome is required')
      throw new ValidationError('Nome é obrigatório')
    }

    if (!validateMinLength(body.nome, 2)) {
      console.error('[CREATE-CLIENTE-V2] Validation error: Nome too short')
      throw new ValidationError('Nome deve ter pelo menos 2 caracteres')
    }

    if (body.cpf_cnpj) {
      const cleanDoc = body.cpf_cnpj.replace(/\D/g, '')
      if (cleanDoc.length === 11 && !validateCPF(body.cpf_cnpj)) {
        console.error('[CREATE-CLIENTE-V2] Validation error: Invalid CPF')
        throw new ValidationError('CPF inválido')
      } else if (cleanDoc.length === 14 && !validateCNPJ(body.cpf_cnpj)) {
        console.error('[CREATE-CLIENTE-V2] Validation error: Invalid CNPJ')
        throw new ValidationError('CNPJ inválido')
      }
    }

    console.log('[CREATE-CLIENTE-V2] Step 3: Sanitizing data...')
    const sanitizedData = {
      nome: sanitizeInput(body.nome).trim(),
      nome_fantasia: body.nome_fantasia ? sanitizeInput(body.nome_fantasia).trim() : null,
      cpf_cnpj: body.cpf_cnpj ? body.cpf_cnpj.replace(/\D/g, '') : null,
      ref_tipo_pessoa_id_FK: body.ref_tipo_pessoa_id_FK || null,
      inscricao_estadual: body.inscricao_estadual ? sanitizeInput(body.inscricao_estadual).trim() : null,
      codigo: body.codigo ? sanitizeInput(body.codigo).trim() : null,
      grupo_rede: body.grupo_rede ? sanitizeInput(body.grupo_rede).trim() : null,
      lista_de_preco: body.lista_de_preco || null,
      desconto_financeiro: body.desconto_financeiro || 0,
      pedido_minimo: body.pedido_minimo || 0,
      vendedoresatribuidos: body.vendedoresatribuidos || null,
      observacao_interna: body.observacao_interna ? sanitizeInput(body.observacao_interna).trim() : null,
      telefone: body.telefone ? sanitizeInput(body.telefone).trim() : null,
      email: body.email ? sanitizeInput(body.email).toLowerCase().trim() : null,
      cep: body.cep ? sanitizeInput(body.cep).replace(/\D/g, '') : null,
      rua: body.rua ? sanitizeInput(body.rua).trim() : null,
      numero: body.numero ? sanitizeInput(body.numero).trim() : null,
      bairro: body.bairro ? sanitizeInput(body.bairro).trim() : null,
      cidade: body.cidade ? sanitizeInput(body.cidade).trim() : null,
      uf: body.uf ? sanitizeInput(body.uf).toUpperCase().trim() : null,
    }

    console.log('[CREATE-CLIENTE-V2] Step 4: Calling RPC function...', { p_criado_por: user.id })
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    })

    const { data: rpcData, error: rpcError } = await supabase.rpc('create_cliente_v2', {
      p_nome: sanitizedData.nome,
      p_nome_fantasia: sanitizedData.nome_fantasia,
      p_cpf_cnpj: sanitizedData.cpf_cnpj,
      p_ref_tipo_pessoa_id_FK: sanitizedData.ref_tipo_pessoa_id_FK,
      p_inscricao_estadual: sanitizedData.inscricao_estadual,
      p_codigo: sanitizedData.codigo,
      p_grupo_rede: sanitizedData.grupo_rede,
      p_lista_de_preco: sanitizedData.lista_de_preco,
      p_desconto_financeiro: sanitizedData.desconto_financeiro,
      p_pedido_minimo: sanitizedData.pedido_minimo,
      p_vendedoresatribuidos: sanitizedData.vendedoresatribuidos,
      p_observacao_interna: sanitizedData.observacao_interna,
      p_telefone: sanitizedData.telefone,
      p_email: sanitizedData.email,
      p_cep: sanitizedData.cep,
      p_rua: sanitizedData.rua,
      p_numero: sanitizedData.numero,
      p_bairro: sanitizedData.bairro,
      p_cidade: sanitizedData.cidade,
      p_uf: sanitizedData.uf,
      p_criado_por: user.id,
    })

    if (rpcError) {
      console.error('[CREATE-CLIENTE-V2] RPC Error:', { message: rpcError.message, details: rpcError.details, code: rpcError.code })
      throw new Error(`Database operation failed: ${rpcError.message}`)
    }

    console.log('[CREATE-CLIENTE-V2] RPC call successful:', { clienteId: rpcData?.[0]?.cliente_id })

    const duration = Date.now() - startTime
    console.log(`[CREATE-CLIENTE-V2] SUCCESS: Cliente created: ${rpcData[0]?.cliente_id} by ${user.id} (${duration}ms)`)

    return createHttpSuccessResponse(
      { cliente: rpcData[0], message: 'Cliente criado com sucesso' },
      201,
      { userId: user.id, duration: `${duration}ms` }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[CREATE-CLIENTE-V2] EXCEPTION:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`
    })
    return formatErrorResponse(error)
  }
})
