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

interface UpdateUserBody {
  nome?: string
  email?: string
  tipo?: 'backoffice' | 'vendedor'
  ref_user_role_id?: number
  user_login?: string
  ativo?: boolean
}

// Helper: Valida JWT (mesmo código da get-user-v2)
async function validateJWT(
  req: Request,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<{ user: AuthenticatedUser | null; error: string | null }> {
  try {
    console.log('[AUTH] Starting JWT validation...')
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return { user: null, error: 'Missing authorization header' }
    }
    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authUser) {
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
  console.error('[ERROR]', { message: errorMessage, statusCode, stack: error instanceof Error ? error.stack : undefined })
  return new Response(
    JSON.stringify({ success: false, error: errorMessage, timestamp: new Date().toISOString() }),
    { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function validateEmail(email: string): boolean {
  return email ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) : false
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
  console.log('[UPDATE-USER-V2] Request received:', { method: req.method, url: req.url, timestamp: new Date().toISOString() })

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[UPDATE-USER-V2] Step 1: Starting authentication...')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)

    if (authError || !user) {
      console.error('[UPDATE-USER-V2] Authentication failed:', { error: authError })
      return createAuthErrorResponse(authError || 'Unauthorized')
    }

    console.log('[UPDATE-USER-V2] Authentication successful:', { userId: user.id, tipo: user.tipo })

    console.log('[UPDATE-USER-V2] Step 2: Extracting user_id from URL...')
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const userId = pathParts[pathParts.length - 1]
    console.log('[UPDATE-USER-V2] Extracted userId:', userId)

    if (!userId || userId === 'update-user-v2') {
      console.error('[UPDATE-USER-V2] ERROR: user_id is missing or invalid')
      throw new ValidationError('user_id é obrigatório na URL')
    }

    console.log('[UPDATE-USER-V2] Step 3: Validating input...')
    const body: UpdateUserBody = await req.json()
    console.log('[UPDATE-USER-V2] Request body received:', { fields: Object.keys(body) })

    if (body.email !== undefined && !validateEmail(body.email)) {
      throw new ValidationError('Formato de email inválido')
    }
    if (body.nome !== undefined && !validateMinLength(body.nome, 2)) {
      throw new ValidationError('Nome deve ter pelo menos 2 caracteres')
    }
    if (body.tipo !== undefined && !['backoffice', 'vendedor'].includes(body.tipo)) {
      throw new ValidationError('Tipo deve ser "backoffice" ou "vendedor"')
    }

    console.log('[UPDATE-USER-V2] Step 4: Sanitizing data...')
    const sanitizedData: any = {}
    if (body.nome !== undefined) sanitizedData.nome = sanitizeInput(body.nome).trim()
    if (body.email !== undefined) sanitizedData.email = sanitizeInput(body.email).toLowerCase().trim()
    if (body.tipo !== undefined) sanitizedData.tipo = body.tipo
    if (body.ref_user_role_id !== undefined) sanitizedData.ref_user_role_id = body.ref_user_role_id
    if (body.user_login !== undefined) sanitizedData.user_login = sanitizeInput(body.user_login).trim()
    if (body.ativo !== undefined) sanitizedData.ativo = body.ativo

    console.log('[UPDATE-USER-V2] Step 5: Calling RPC function...', { p_user_id: userId, p_updated_by: user.id })
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    })

    const { data: rpcData, error: rpcError } = await supabase.rpc('update_user_v2', {
      p_user_id: userId,
      p_nome: sanitizedData.nome,
      p_email: sanitizedData.email,
      p_tipo: sanitizedData.tipo,
      p_ref_user_role_id: sanitizedData.ref_user_role_id,
      p_user_login: sanitizedData.user_login,
      p_ativo: sanitizedData.ativo,
      p_updated_by: user.id,
    })

    if (rpcError) {
      console.error('[UPDATE-USER-V2] RPC Error:', { message: rpcError.message, details: rpcError.details, code: rpcError.code })
      throw new Error(`Database operation failed: ${rpcError.message}`)
    }

    console.log('[UPDATE-USER-V2] RPC call successful:', { dataLength: rpcData?.length || 0 })

    if (!rpcData || rpcData.length === 0) {
      console.error('[UPDATE-USER-V2] ERROR: RPC returned empty data')
      throw new Error('User not found')
    }

    const duration = Date.now() - startTime
    console.log(`[UPDATE-USER-V2] SUCCESS: User updated: ${userId} by ${user.id} (${duration}ms)`)

    return createHttpSuccessResponse(
      { user: rpcData[0], message: 'Usuário atualizado com sucesso' },
      200,
      { userId: user.id, duration: `${duration}ms` }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[UPDATE-USER-V2] EXCEPTION:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`
    })
    return formatErrorResponse(error)
  }
})
