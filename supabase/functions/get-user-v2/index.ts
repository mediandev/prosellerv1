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

    // Verificar usuário autenticado
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
      email: authUser.email,
      email_confirmed_at: authUser.email_confirmed_at
    })

    // Buscar dados do usuário na tabela user
    console.log('[AUTH] Querying user table with user_id:', authUser.id)
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('user_id, email, tipo, ativo')
      .eq('user_id', authUser.id)
      .eq('ativo', true)
      .single()

    if (userError) {
      console.error('[AUTH] ERROR: Database query error:', {
        message: userError.message,
        details: userError.details,
        hint: userError.hint,
        code: userError.code
      })
      
      // Tentar buscar sem filtro de ativo para ver se o usuário existe mas está inativo
      console.log('[AUTH] Trying to find user without active filter...')
      const { data: inactiveUser, error: inactiveError } = await supabase
        .from('user')
        .select('user_id, email, tipo, ativo')
        .eq('user_id', authUser.id)
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
        console.error('[AUTH] User not found in database table:', {
          authUserId: authUser.id,
          inactiveError: inactiveError?.message
        })
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

    // Atualizar último acesso (não bloqueia se falhar)
    try {
      const { error: updateError } = await supabase
        .from('user')
        .update({
          ultimo_acesso: new Date().toISOString(),
        })
        .eq('user_id', userData.user_id)

      if (updateError) {
        console.error('[AUTH] WARNING: Error updating ultimo_acesso:', {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code
        })
        // Não retorna erro, apenas loga o warning
      } else {
        console.log('[AUTH] ultimo_acesso updated successfully')
      }
    } catch (updateException) {
      console.error('[AUTH] WARNING: Exception updating ultimo_acesso:', {
        message: updateException instanceof Error ? updateException.message : String(updateException)
      })
      // Não retorna erro, apenas loga o warning
    }

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

// Helper: Cria erro de validação
class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

serve(async (req) => {
  const startTime = Date.now()
  console.log('[GET-USER-V2] Request received:', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  })

  if (req.method === 'OPTIONS') {
    console.log('[GET-USER-V2] OPTIONS request, returning CORS headers')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. AUTENTICAÇÃO
    console.log('[GET-USER-V2] Step 1: Starting authentication...')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    console.log('[GET-USER-V2] Supabase URL:', supabaseUrl ? 'SET' : 'NOT SET')

    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)

    if (authError) {
      console.error('[GET-USER-V2] Authentication failed:', {
        error: authError,
        hasUser: !!user
      })
      return createAuthErrorResponse(authError || 'Unauthorized')
    }

    if (!user) {
      console.error('[GET-USER-V2] No user returned from validateJWT')
      return createAuthErrorResponse('Unauthorized')
    }

    console.log('[GET-USER-V2] Authentication successful:', {
      userId: user.id,
      email: user.email,
      tipo: user.tipo
    })

    // 2. EXTRAIR USER_ID DA URL
    console.log('[GET-USER-V2] Step 2: Extracting user_id from URL...')
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const userId = pathParts[pathParts.length - 1]
    console.log('[GET-USER-V2] URL pathname:', url.pathname)
    console.log('[GET-USER-V2] Path parts:', pathParts)
    console.log('[GET-USER-V2] Extracted userId:', userId)

    if (!userId || userId === 'get-user-v2') {
      console.error('[GET-USER-V2] ERROR: user_id is missing or invalid')
      throw new ValidationError('user_id é obrigatório na URL')
    }

    // 3. CHAMADA RPC
    console.log('[GET-USER-V2] Step 3: Calling RPC function...', {
      p_user_id: userId,
      p_requesting_user_id: user.id
    })
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: req.headers.get('Authorization') || '' },
      },
    })

    const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_by_id_v2', {
      p_user_id: userId,
      p_requesting_user_id: user.id,
    })

    if (rpcError) {
      console.error('[GET-USER-V2] RPC Error:', {
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
        code: rpcError.code
      })
      throw new Error(`Database operation failed: ${rpcError.message}`)
    }

    console.log('[GET-USER-V2] RPC call successful:', {
      dataLength: rpcData?.length || 0,
      firstUser: rpcData?.[0] ? {
        user_id: rpcData[0].user_id,
        email: rpcData[0].email,
        tipo: rpcData[0].tipo,
        ativo: rpcData[0].ativo
      } : null
    })

    if (!rpcData || rpcData.length === 0) {
      console.error('[GET-USER-V2] ERROR: RPC returned empty data')
      throw new Error('User not found')
    }

    // 4. RESPOSTA
    const duration = Date.now() - startTime
    console.log(`[GET-USER-V2] SUCCESS: User fetched: ${userId} by ${user.id} (${duration}ms)`)

    return createHttpSuccessResponse(
      {
        user: rpcData[0],
      },
      200,
      {
        userId: user.id,
        duration: `${duration}ms`,
      }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[GET-USER-V2] EXCEPTION:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`
    })
    return formatErrorResponse(error)
  }
})
