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

interface CreateUserBody {
  email: string
  nome: string
  tipo: 'backoffice' | 'vendedor'
  ref_user_role_id?: number
  user_login?: string
  auth_user_id?: string
}

// Helper: Valida JWT e retorna usuário autenticado
async function validateJWT(
  req: Request,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<{ user: AuthenticatedUser | null; error: string | null }> {
  try {
    console.log('[AUTH] Starting JWT validation...')
    
    const authHeader = req.headers.get('Authorization')
    console.log('[AUTH] Authorization header present:', !!authHeader)
    
    if (!authHeader) {
      console.log('[AUTH] ERROR: Missing authorization header')
      return { user: null, error: 'Missing authorization header' }
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('[AUTH] Token extracted, length:', token.length)
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    })

    console.log('[AUTH] Calling supabase.auth.getUser...')
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError) {
      console.error('[AUTH] ERROR: Auth error from Supabase:', {
        message: authError.message,
        status: authError.status,
        name: authError.name
      })
      return { user: null, error: 'Invalid or expired token' }
    }
    
    if (!authUser) {
      console.error('[AUTH] ERROR: No authUser returned from Supabase')
      return { user: null, error: 'Invalid or expired token' }
    }

    console.log('[AUTH] Auth user found:', {
      id: authUser.id,
      email: authUser.email
    })

    console.log('[AUTH] Querying user table with user_id:', authUser.id)
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('user_id, email, tipo, ativo')
      .eq('user_id', authUser.id)
      .eq('ativo', true)
      .is('deleted_at', null)
      .single()

    if (userError) {
      console.error('[AUTH] ERROR: Database query error:', {
        message: userError.message,
        details: userError.details,
        hint: userError.hint,
        code: userError.code
      })
      
      console.log('[AUTH] Trying to find user without active filter...')
      const { data: inactiveUser } = await supabase
        .from('user')
        .select('user_id, email, tipo, ativo')
        .eq('user_id', authUser.id)
        .is('deleted_at', null)
        .single()
      
      if (inactiveUser) {
        console.log('[AUTH] User found but inactive:', {
          user_id: inactiveUser.user_id,
          email: inactiveUser.email,
          tipo: inactiveUser.tipo,
          ativo: inactiveUser.ativo
        })
        return { user: null, error: 'User not found or inactive' }
      } else {
        console.error('[AUTH] User not found in database table')
        return { user: null, error: 'User not found or inactive' }
      }
    }

    if (!userData) {
      console.error('[AUTH] ERROR: No userData returned from query')
      return { user: null, error: 'User not found or inactive' }
    }

    console.log('[AUTH] User data found:', {
      user_id: userData.user_id,
      email: userData.email,
      tipo: userData.tipo,
      ativo: userData.ativo
    })

    const authenticatedUser: AuthenticatedUser = {
      id: userData.user_id,
      email: userData.email || authUser.email || '',
      tipo: userData.tipo as 'backoffice' | 'vendedor',
      ativo: userData.ativo,
    }

    console.log('[AUTH] JWT validation successful:', {
      id: authenticatedUser.id,
      email: authenticatedUser.email,
      tipo: authenticatedUser.tipo
    })

    return { user: authenticatedUser, error: null }
  } catch (error) {
    console.error('[AUTH] EXCEPTION: Error validating JWT:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return { user: null, error: 'Authentication error' }
  }
}

// Helper: Cria resposta de erro de autenticação
function createAuthErrorResponse(message: string, statusCode: number = 401): Response {
  return new Response(
    JSON.stringify({ 
      error: message,
      timestamp: new Date().toISOString()
    }),
    { 
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

// Helper: Cria resposta de erro de permissão
function createPermissionErrorResponse(message: string = 'Insufficient permissions'): Response {
  return new Response(
    JSON.stringify({ 
      error: message,
      timestamp: new Date().toISOString()
    }),
    { 
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

// Helper: Cria resposta de sucesso HTTP
function createHttpSuccessResponse<T>(
  data: T,
  status: number = 200,
  meta?: Record<string, any>
): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

// Helper: Formata resposta de erro
function formatErrorResponse(error: Error | unknown): Response {
  let statusCode = 500
  let errorMessage = 'Internal server error'

  if (error instanceof Error) {
    errorMessage = error.message
    
    if (error.message.includes('Unauthorized') || error.message.includes('authentication')) {
      statusCode = 401
    } else if (error.message.includes('permission') || error.message.includes('forbidden')) {
      statusCode = 403
    } else if (error.message.includes('not found')) {
      statusCode = 404
    } else if (error.message.includes('validation') || error.message.includes('invalid') || error.message.includes('obrigatório')) {
      statusCode = 400
    }
  }

  console.error('[ERROR]', {
    message: errorMessage,
    statusCode,
    stack: error instanceof Error ? error.stack : undefined,
  })

  return new Response(
    JSON.stringify({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    }),
    {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

// Helper: Valida email
function validateEmail(email: string): boolean {
  if (!email) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Helper: Sanitiza input
function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return ''
  return input.trim().replace(/[<>]/g, '').replace(/javascript:/gi, '').replace(/on\w+=/gi, '')
}

// Helper: Valida não vazio
function validateNotEmpty(value: string | null | undefined): boolean {
  return value !== null && value !== undefined && value.trim().length > 0
}

// Helper: Valida comprimento mínimo
function validateMinLength(value: string, minLength: number): boolean {
  return value && value.trim().length >= minLength
}

// Helper: Cria erro de validação
class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

serve(async (req) => {
  const startTime = Date.now()
  console.log('[CREATE-USER-V2] Request received:', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  })

  if (req.method === 'OPTIONS') {
    console.log('[CREATE-USER-V2] OPTIONS request, returning CORS headers')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. AUTENTICAÇÃO
    console.log('[CREATE-USER-V2] Step 1: Starting authentication...')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    console.log('[CREATE-USER-V2] Supabase URL:', supabaseUrl ? 'SET' : 'NOT SET')

    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)

    if (authError) {
      console.error('[CREATE-USER-V2] Authentication failed:', {
        error: authError,
        hasUser: !!user
      })
      return createAuthErrorResponse(authError || 'Unauthorized')
    }

    if (!user) {
      console.error('[CREATE-USER-V2] No user returned from validateJWT')
      return createAuthErrorResponse('Unauthorized')
    }

    console.log('[CREATE-USER-V2] Authentication successful:', {
      userId: user.id,
      email: user.email,
      tipo: user.tipo
    })

    // 2. VERIFICAR PERMISSÕES
    console.log('[CREATE-USER-V2] Step 2: Checking permissions...')
    if (user.tipo !== 'backoffice') {
      console.error('[CREATE-USER-V2] Permission denied:', {
        userTipo: user.tipo,
        required: 'backoffice'
      })
      return createPermissionErrorResponse('Apenas usuários backoffice podem criar usuários')
    }

    console.log('[CREATE-USER-V2] Permission check passed')

    // 3. VALIDAÇÃO DE INPUT
    console.log('[CREATE-USER-V2] Step 3: Validating input...')
    const body: CreateUserBody = await req.json()
    console.log('[CREATE-USER-V2] Request body received:', {
      email: body.email,
      nome: body.nome ? `${body.nome.substring(0, 20)}...` : null,
      tipo: body.tipo,
      hasAuthUserId: !!body.auth_user_id
    })

    if (!validateNotEmpty(body.email)) {
      console.error('[CREATE-USER-V2] Validation error: Email is required')
      throw new ValidationError('Email é obrigatório')
    }

    if (!validateNotEmpty(body.nome)) {
      console.error('[CREATE-USER-V2] Validation error: Nome is required')
      throw new ValidationError('Nome é obrigatório')
    }

    if (!validateMinLength(body.nome, 2)) {
      console.error('[CREATE-USER-V2] Validation error: Nome too short')
      throw new ValidationError('Nome deve ter pelo menos 2 caracteres')
    }

    if (!body.tipo || !['backoffice', 'vendedor'].includes(body.tipo)) {
      console.error('[CREATE-USER-V2] Validation error: Invalid tipo')
      throw new ValidationError('Tipo deve ser "backoffice" ou "vendedor"')
    }

    if (!validateEmail(body.email)) {
      console.error('[CREATE-USER-V2] Validation error: Invalid email format')
      throw new ValidationError('Formato de email inválido')
    }

    console.log('[CREATE-USER-V2] Input validation passed')

    // 4. SANITIZAÇÃO
    console.log('[CREATE-USER-V2] Step 4: Sanitizing data...')
    const sanitizedData = {
      email: sanitizeInput(body.email).toLowerCase().trim(),
      nome: sanitizeInput(body.nome).trim(),
      tipo: body.tipo,
      ref_user_role_id: body.ref_user_role_id || null,
      user_login: body.user_login ? sanitizeInput(body.user_login).trim() : null,
      auth_user_id: body.auth_user_id || null,
    }

    console.log('[CREATE-USER-V2] Data sanitized')

    // 5. CHAMADA RPC
    console.log('[CREATE-USER-V2] Step 5: Calling RPC function...', {
      p_email: sanitizedData.email,
      p_nome: sanitizedData.nome.substring(0, 20) + '...',
      p_tipo: sanitizedData.tipo,
      p_created_by: user.id,
      has_auth_user_id: !!sanitizedData.auth_user_id
    })

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: req.headers.get('Authorization') || '' },
      },
    })

    const { data: rpcData, error: rpcError } = await supabase.rpc('create_user_v2', {
      p_email: sanitizedData.email,
      p_nome: sanitizedData.nome,
      p_tipo: sanitizedData.tipo,
      p_ref_user_role_id: sanitizedData.ref_user_role_id,
      p_user_login: sanitizedData.user_login,
      p_created_by: user.id,
      p_auth_user_id: sanitizedData.auth_user_id,
    })

    if (rpcError) {
      console.error('[CREATE-USER-V2] RPC Error:', {
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
        code: rpcError.code
      })
      throw new Error(`Database operation failed: ${rpcError.message}`)
    }

    console.log('[CREATE-USER-V2] RPC call successful:', {
      dataLength: rpcData?.length || 0,
      createdUserId: rpcData?.[0]?.user_id
    })

    if (!rpcData || rpcData.length === 0) {
      console.error('[CREATE-USER-V2] ERROR: RPC returned empty data')
      throw new Error('Failed to create user')
    }

    // 6. RESPOSTA
    const duration = Date.now() - startTime
    console.log(`[CREATE-USER-V2] SUCCESS: User created: ${rpcData[0].user_id} by ${user.id} (${duration}ms)`)

    return createHttpSuccessResponse(
      {
        user: rpcData[0],
        message: 'Usuário criado com sucesso',
      },
      201,
      {
        userId: user.id,
        duration: `${duration}ms`,
      }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[CREATE-USER-V2] EXCEPTION:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`
    })
    return formatErrorResponse(error)
  }
})
