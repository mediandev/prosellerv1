import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
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
    else if (error.message.includes('validation') || error.message.includes('invalid')) statusCode = 400
  }
  console.error('[ERROR]', { message: errorMessage, statusCode, stack: error instanceof Error ? error.stack : undefined })
  return new Response(
    JSON.stringify({ success: false, error: errorMessage, timestamp: new Date().toISOString() }),
    { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

serve(async (req) => {
  const startTime = Date.now()
  console.log('[GET-VENDEDOR-COMPLETO-V2] Request received:', { method: req.method, url: req.url, timestamp: new Date().toISOString() })

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('[GET-VENDEDOR-COMPLETO-V2] OPTIONS request, returning CORS headers')
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    console.log('[GET-VENDEDOR-COMPLETO-V2] Step 1: Starting authentication...')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)

    if (authError || !user) {
      console.error('[GET-VENDEDOR-COMPLETO-V2] Authentication failed:', { error: authError })
      return createAuthErrorResponse(authError || 'Unauthorized')
    }

    console.log('[GET-VENDEDOR-COMPLETO-V2] Authentication successful:', { userId: user.id, tipo: user.tipo })

    console.log('[GET-VENDEDOR-COMPLETO-V2] Step 2: Extracting user_id from URL...')
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const userId = pathParts[pathParts.length - 1]
    console.log('[GET-VENDEDOR-COMPLETO-V2] Extracted userId:', userId)

    if (!userId || userId === 'get-vendedor-completo-v2') {
      console.error('[GET-VENDEDOR-COMPLETO-V2] ERROR: user_id is missing or invalid')
      return formatErrorResponse(new Error('user_id é obrigatório na URL'))
    }

    console.log('[GET-VENDEDOR-COMPLETO-V2] Step 3: Calling RPC function get_dados_vendedor_completo_v2...')
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    })

    const { data: rpcData, error: rpcError } = await supabase.rpc('get_dados_vendedor_completo_v2', {
      p_user_id: userId,
      p_requesting_user_id: user.id,
    })

    if (rpcError) {
      console.error('[GET-VENDEDOR-COMPLETO-V2] RPC Error:', { message: rpcError.message, details: rpcError.details, code: rpcError.code })
      throw new Error(`Database operation failed: ${rpcError.message}`)
    }

    console.log('[GET-VENDEDOR-COMPLETO-V2] RPC call successful')

    if (!rpcData) {
      console.error('[GET-VENDEDOR-COMPLETO-V2] ERROR: RPC returned null data')
      throw new Error('Vendedor não encontrado')
    }

    const duration = Date.now() - startTime
    console.log(`[GET-VENDEDOR-COMPLETO-V2] SUCCESS: Vendedor data retrieved for ${userId} (${duration}ms)`)

    return createHttpSuccessResponse(
      rpcData,
      200,
      { userId: user.id, duration: `${duration}ms` }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[GET-VENDEDOR-COMPLETO-V2] EXCEPTION:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`
    })
    return formatErrorResponse(error)
  }
})
