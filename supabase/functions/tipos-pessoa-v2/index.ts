import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
  } catch {
    return { user: null, error: 'Authentication error' }
  }
}

function createAuthErrorResponse(message: string, statusCode: number = 401): Response {
  return new Response(
    JSON.stringify({ error: message, timestamp: new Date().toISOString() }),
    { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function createHttpSuccessResponse<T>(data: T, status: number = 200, meta?: Record<string, unknown>): Response {
  return new Response(
    JSON.stringify({ success: true, data, meta: { timestamp: new Date().toISOString(), ...meta } }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function formatErrorResponse(error: unknown): Response {
  let statusCode = 500
  let errorMessage = 'Internal server error'
  if (error instanceof Error) {
    errorMessage = error.message
    if (error.message.includes('Unauthorized') || error.message.includes('authentication')) statusCode = 401
    else if (error.message.includes('permission') || error.message.includes('forbidden')) statusCode = 403
    else if (error.message.includes('not found') || error.message.includes('não encontrado')) statusCode = 404
    else if (error.message.includes('validation') || error.message.includes('invalid') || error.message.includes('obrigatório')) statusCode = 400
  }
  console.error('[TIPOS-PESSOA-V2] Error:', { message: errorMessage, statusCode })
  return new Response(
    JSON.stringify({ success: false, error: errorMessage, timestamp: new Date().toISOString() }),
    { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

serve(async (req) => {
  const startTime = Date.now()
  console.log('[TIPOS-PESSOA-V2] Request:', { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsHeaders, 'Access-Control-Max-Age': '86400' } })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)
    if (authError || !user) {
      return createAuthErrorResponse(authError ?? 'Unauthorized')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    })

    if (req.method === 'GET') {
      // Chamar função RPC para listar tipos de pessoa
      const { data: rpcData, error: rpcError } = await supabase.rpc('list_ref_tipo_pessoa_v2')
      
      if (rpcError) {
        console.error('[TIPOS-PESSOA-V2] RPC Error:', rpcError)
        throw new Error(rpcError.message)
      }

      // A função RPC retorna um JSON array diretamente
      const tiposPessoa = Array.isArray(rpcData) ? rpcData : []
      
      const duration = Date.now() - startTime
      console.log(`[TIPOS-PESSOA-V2] SUCCESS: Listed ${tiposPessoa.length} tipos de pessoa (${duration}ms)`)
      
      return createHttpSuccessResponse(
        tiposPessoa,
        200,
        { userId: user.id, duration: `${duration}ms` }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed', timestamp: new Date().toISOString() }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return formatErrorResponse(error)
  }
})
