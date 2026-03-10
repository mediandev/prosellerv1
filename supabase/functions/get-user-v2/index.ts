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

class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

async function validateJWT(
  req: Request,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<{ user: AuthenticatedUser | null; error: string | null }> {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return { user: null, error: 'Missing authorization header' }
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !authUser) {
      return { user: null, error: 'Invalid or expired token' }
    }

    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('user_id, email, tipo, ativo')
      .eq('user_id', authUser.id)
      .eq('ativo', true)
      .maybeSingle()

    if (userError || !userData) {
      return { user: null, error: 'User not found or inactive' }
    }

    // Best effort update for last access; do not block request.
    await supabase
      .from('user')
      .update({ ultimo_acesso: new Date().toISOString() })
      .eq('user_id', userData.user_id)

    return {
      user: {
        id: userData.user_id,
        email: userData.email || authUser.email || '',
        tipo: userData.tipo as 'backoffice' | 'vendedor',
        ativo: userData.ativo,
      },
      error: null,
    }
  } catch (error) {
    console.error('[GET-USER-V2][AUTH] Unexpected error:', error)
    return { user: null, error: 'Authentication error' }
  }
}

function createAuthErrorResponse(message: string, statusCode: number = 401): Response {
  return new Response(
    JSON.stringify({ error: message, timestamp: new Date().toISOString() }),
    { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function createHttpSuccessResponse<T>(
  data: T,
  status: number = 200,
  meta?: Record<string, unknown>
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
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function formatErrorResponse(error: unknown): Response {
  let statusCode = 500
  let errorMessage = 'Internal server error'

  if (error instanceof Error) {
    errorMessage = error.message

    if (error.message.toLowerCase().includes('unauthorized') || error.message.toLowerCase().includes('authentication')) {
      statusCode = 401
    } else if (error.message.toLowerCase().includes('permission') || error.message.toLowerCase().includes('forbidden')) {
      statusCode = 403
    } else if (error.message.toLowerCase().includes('not found')) {
      statusCode = 404
    } else if (error.message.toLowerCase().includes('validation') || error.message.toLowerCase().includes('invalid')) {
      statusCode = 400
    }
  }

  return new Response(
    JSON.stringify({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    }),
    { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

serve(async (req) => {
  const startTime = Date.now()

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)
    if (authError || !user) {
      return createAuthErrorResponse(authError || 'Unauthorized')
    }

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const requestedUserId = pathParts[pathParts.length - 1]

    if (!requestedUserId || requestedUserId === 'get-user-v2') {
      throw new ValidationError('user_id is required in URL')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    })

    const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_by_id_v2', {
      p_user_id: requestedUserId,
      p_requesting_user_id: user.id,
    })

    if (rpcError) {
      throw new Error(`Database operation failed: ${rpcError.message}`)
    }

    if (!rpcData || rpcData.length === 0) {
      throw new Error('User not found')
    }

    const { data: permsRow, error: permsError } = await supabase
      .from('user')
      .select('permissoes')
      .eq('user_id', requestedUserId)
      .maybeSingle()

    if (permsError) {
      throw new Error(`Database operation failed: ${permsError.message}`)
    }

    rpcData[0].permissoes = Array.isArray(permsRow?.permissoes) ? permsRow.permissoes : []

    const duration = Date.now() - startTime
    return createHttpSuccessResponse(
      { user: rpcData[0] },
      200,
      {
        userId: user.id,
        duration: `${duration}ms`,
      }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[GET-USER-V2] Error:', {
      message: error instanceof Error ? error.message : String(error),
      duration: `${duration}ms`,
    })
    return formatErrorResponse(error)
  }
})
