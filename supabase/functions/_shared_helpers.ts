// Arquivo temporário com helpers compartilhados para deploy
// Este arquivo será incluído em cada Edge Function durante o deploy

export const sharedAuth = `import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

export async function validateJWT(
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
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authUser) {
      return { user: null, error: 'Invalid or expired token' }
    }
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('user_id, email, tipo, ativo')
      .eq('user_id', authUser.id)
      .eq('ativo', true)
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
    console.error('[AUTH] Error:', error)
    return { user: null, error: 'Authentication error' }
  }
}

export function createAuthErrorResponse(message: string, statusCode: number = 401): Response {
  return new Response(
    JSON.stringify({ error: message, timestamp: new Date().toISOString() }),
    { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

export function createPermissionErrorResponse(message: string = 'Insufficient permissions'): Response {
  return new Response(
    JSON.stringify({ error: message, timestamp: new Date().toISOString() }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}`

export const sharedValidation = `export function validateEmail(email: string): boolean {
  if (!email) return false
  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)
}

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return ''
  return input.trim().replace(/[<>]/g, '').replace(/javascript:/gi, '').replace(/on\\w+=/gi, '')
}

export function validateNotEmpty(value: string | null | undefined): boolean {
  return value !== null && value !== undefined && value.trim().length > 0
}

export function validateMinLength(value: string, minLength: number): boolean {
  return value && value.trim().length >= minLength
}`

export const sharedTypes = `export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

export function createHttpSuccessResponse<T>(
  data: T,
  status: number = 200,
  meta?: Record<string, any>
): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      meta: { timestamp: new Date().toISOString(), ...meta },
    }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}`

export const sharedErrors = `import { corsHeaders } from './types.ts'

export enum ErrorType {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  DATABASE = 'DATABASE',
  INTERNAL = 'INTERNAL',
}

export class AppError extends Error {
  constructor(
    public type: ErrorType,
    public message: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function formatErrorResponse(error: Error | AppError | unknown, includeDetails: boolean = false): Response {
  let statusCode = 500
  let errorMessage = 'Internal server error'
  let errorType = ErrorType.INTERNAL

  if (error instanceof AppError) {
    statusCode = error.statusCode
    errorMessage = error.message
    errorType = error.type
  } else if (error instanceof Error) {
    errorMessage = error.message
    if (error.message.includes('Unauthorized') || error.message.includes('authentication')) {
      errorType = ErrorType.AUTHENTICATION
      statusCode = 401
    } else if (error.message.includes('permission') || error.message.includes('forbidden')) {
      errorType = ErrorType.AUTHORIZATION
      statusCode = 403
    } else if (error.message.includes('not found')) {
      errorType = ErrorType.NOT_FOUND
      statusCode = 404
    } else if (error.message.includes('validation') || error.message.includes('invalid')) {
      errorType = ErrorType.VALIDATION
      statusCode = 400
    }
  }

  console.error('[ERROR]', { type: errorType, message: errorMessage, statusCode })

  return new Response(
    JSON.stringify({
      success: false,
      error: errorMessage,
      type: errorType,
      timestamp: new Date().toISOString(),
    }),
    { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

export function createValidationError(message: string, details?: any): AppError {
  return new AppError(ErrorType.VALIDATION, message, 400, details)
}`
