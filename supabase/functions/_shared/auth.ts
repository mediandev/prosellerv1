/**
 * Helpers de Autenticação para Edge Functions
 * 
 * Este módulo fornece funções utilitárias para validação de JWT,
 * extração de usuário, verificação de permissões e tipos de usuário.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export interface AuthenticatedUser {
  id: string
  email: string
  tipo: 'backoffice' | 'vendedor'
  ativo: boolean
}

/**
 * Valida o token JWT e retorna o usuário autenticado
 */
export async function validateJWT(
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
      const { data: inactiveUser } = await supabase
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

/**
 * Extrai o usuário do token sem validação completa (para uso interno)
 */
export function getUserFromToken(req: Request): { userId: string | null; token: string | null } {
  const authHeader = req.headers.get('Authorization')
  
  if (!authHeader) {
    return { userId: null, token: null }
  }

  const token = authHeader.replace('Bearer ', '')
  
  // Em produção, você pode decodificar o JWT aqui para extrair o userId
  // Por enquanto, retornamos o token para validação posterior
  return { userId: null, token }
}

/**
 * Verifica se o usuário é do tipo especificado
 */
export function checkUserType(user: AuthenticatedUser, requiredType: 'backoffice' | 'vendedor' | 'both'): boolean {
  if (requiredType === 'both') {
    return user.tipo === 'backoffice' || user.tipo === 'vendedor'
  }
  return user.tipo === requiredType
}

/**
 * Verifica se o usuário tem permissão para acessar um recurso
 */
export async function checkPermissions(
  user: AuthenticatedUser,
  resourceId: string | null,
  resourceOwnerId: string | null,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<{ allowed: boolean; error: string | null }> {
  // Backoffice tem acesso total
  if (user.tipo === 'backoffice') {
    return { allowed: true, error: null }
  }

  // Vendedor só pode acessar seus próprios recursos
  if (user.tipo === 'vendedor') {
    if (!resourceOwnerId || resourceOwnerId !== user.id) {
      return { allowed: false, error: 'Insufficient permissions' }
    }
    return { allowed: true, error: null }
  }

  return { allowed: false, error: 'Unknown user type' }
}

/**
 * Cria resposta de erro de autenticação
 */
export function createAuthErrorResponse(message: string, statusCode: number = 401): Response {
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

/**
 * Cria resposta de erro de permissão
 */
export function createPermissionErrorResponse(message: string = 'Insufficient permissions'): Response {
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
