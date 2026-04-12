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
    else if (error.message.includes('validation') || error.message.includes('invalid')) statusCode = 400
  }
  console.error('[ERROR]', { message: errorMessage, statusCode })
  return new Response(
    JSON.stringify({ success: false, error: errorMessage, timestamp: new Date().toISOString() }),
    { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

serve(async (req) => {
  const startTime = Date.now()
  console.log('[LIST-CLIENTES-V2] Request received:', { method: req.method, url: req.url, timestamp: new Date().toISOString() })

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[LIST-CLIENTES-V2] Step 1: Starting authentication...')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)

    if (authError || !user) {
      console.error('[LIST-CLIENTES-V2] Authentication failed:', { error: authError })
      return createAuthErrorResponse(authError || 'Unauthorized')
    }

    console.log('[LIST-CLIENTES-V2] Authentication successful:', { userId: user.id, tipo: user.tipo })

    console.log('[LIST-CLIENTES-V2] Step 2: Extracting query parameters...')
    const url = new URL(req.url)
    const statusFilter = url.searchParams.get('status_aprovacao') || null
    const search = url.searchParams.get('search') || null
    const vendedorFilter = url.searchParams.get('vendedor') || null
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 100)

    console.log('[LIST-CLIENTES-V2] Query parameters:', { statusFilter, search, vendedorFilter, page, limit })

    if (page < 1) {
      console.error('[LIST-CLIENTES-V2] Validation error: Invalid page')
      throw new Error('Page must be greater than 0')
    }
    if (limit < 1) {
      console.error('[LIST-CLIENTES-V2] Validation error: Invalid limit')
      throw new Error('Limit must be greater than 0')
    }

    console.log('[LIST-CLIENTES-V2] Step 3: Calling RPC function...', {
      p_requesting_user_id: user.id,
      p_status_aprovacao_filter: statusFilter,
      p_search: search,
      p_vendedor_filter: vendedorFilter,
      p_page: page,
      p_limit: limit
    })

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    })

    const { data: rpcData, error: rpcError } = await supabase.rpc('list_clientes_v2', {
      p_requesting_user_id: user.id,
      p_status_aprovacao_filter: statusFilter,
      p_search: search,
      p_vendedor_filter: vendedorFilter,
      p_page: page,
      p_limit: limit,
    })

    if (rpcError) {
      console.error('[LIST-CLIENTES-V2] RPC Error:', { message: rpcError.message, details: rpcError.details, code: rpcError.code })
      throw new Error(`Database operation failed: ${rpcError.message}`)
    }

    console.log('[LIST-CLIENTES-V2] RPC call successful:', {
      total: rpcData?.total || 0,
      clientesCount: rpcData?.clientes?.length || 0
    })

    const duration = Date.now() - startTime
    console.log(`[LIST-CLIENTES-V2] SUCCESS: Clientes listed by ${user.id} (${duration}ms)`)

    return createHttpSuccessResponse(
      {
        clientes: rpcData.clientes || [],
        pagination: {
          page: rpcData.page || page,
          limit: rpcData.limit || limit,
          total: rpcData.total || 0,
          total_pages: rpcData.total_pages || 0,
        },
      },
      200,
      { userId: user.id, duration: `${duration}ms` }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[LIST-CLIENTES-V2] EXCEPTION:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`
    })
    return formatErrorResponse(error)
  }
})
