/**
 * Tratamento de Erros Padronizado para Edge Functions
 * 
 * Este módulo fornece funções para tratamento e formatação
 * de erros de forma consistente em todas as Edge Functions.
 */

import { corsHeaders } from './types.ts'

/**
 * Tipos de erro do sistema
 */
export enum ErrorType {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  DATABASE = 'DATABASE',
  INTERNAL = 'INTERNAL',
  BAD_REQUEST = 'BAD_REQUEST',
}

/**
 * Classe de erro customizada
 */
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

/**
 * Mapeia tipo de erro para código HTTP
 */
function getStatusCodeForErrorType(type: ErrorType): number {
  switch (type) {
    case ErrorType.AUTHENTICATION:
      return 401
    case ErrorType.AUTHORIZATION:
      return 403
    case ErrorType.VALIDATION:
      return 400
    case ErrorType.NOT_FOUND:
      return 404
    case ErrorType.CONFLICT:
      return 409
    case ErrorType.DATABASE:
      return 500
    case ErrorType.INTERNAL:
      return 500
    case ErrorType.BAD_REQUEST:
      return 400
    default:
      return 500
  }
}

/**
 * Formata erro para resposta HTTP
 */
export function formatErrorResponse(
  error: Error | AppError | unknown,
  includeDetails: boolean = false
): Response {
  let statusCode = 500
  let errorMessage = 'Internal server error'
  let errorType = ErrorType.INTERNAL
  let details: any = undefined

  if (error instanceof AppError) {
    statusCode = error.statusCode || getStatusCodeForErrorType(error.type)
    errorMessage = error.message
    errorType = error.type
    details = error.details
  } else if (error instanceof Error) {
    errorMessage = error.message
    
    // Tentar inferir tipo de erro pela mensagem
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

  const response: any = {
    success: false,
    error: errorMessage,
    type: errorType,
    timestamp: new Date().toISOString(),
  }

  if (includeDetails && details) {
    response.details = details
  }

  // Log erro no console (aparece nos logs do Supabase)
  console.error('[ERROR]', {
    type: errorType,
    message: errorMessage,
    statusCode,
    details: includeDetails ? details : undefined,
    stack: error instanceof Error ? error.stack : undefined,
  })

  return new Response(
    JSON.stringify(response),
    {
      status: statusCode,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  )
}

/**
 * Cria erro de autenticação
 */
export function createAuthenticationError(message: string = 'Authentication required'): AppError {
  return new AppError(ErrorType.AUTHENTICATION, message, 401)
}

/**
 * Cria erro de autorização
 */
export function createAuthorizationError(message: string = 'Insufficient permissions'): AppError {
  return new AppError(ErrorType.AUTHORIZATION, message, 403)
}

/**
 * Cria erro de validação
 */
export function createValidationError(message: string, details?: any): AppError {
  return new AppError(ErrorType.VALIDATION, message, 400, details)
}

/**
 * Cria erro de não encontrado
 */
export function createNotFoundError(resource: string, id?: string): AppError {
  const message = id 
    ? `${resource} with id ${id} not found`
    : `${resource} not found`
  return new AppError(ErrorType.NOT_FOUND, message, 404)
}

/**
 * Cria erro de conflito
 */
export function createConflictError(message: string, details?: any): AppError {
  return new AppError(ErrorType.CONFLICT, message, 409, details)
}

/**
 * Cria erro de banco de dados
 */
export function createDatabaseError(message: string, details?: any): AppError {
  return new AppError(ErrorType.DATABASE, message, 500, details)
}

/**
 * Cria erro de requisição inválida
 */
export function createBadRequestError(message: string, details?: any): AppError {
  return new AppError(ErrorType.BAD_REQUEST, message, 400, details)
}

/**
 * Wrapper para tratamento de erros em handlers
 */
export async function handleErrors(
  handler: () => Promise<Response>
): Promise<Response> {
  try {
    return await handler()
  } catch (error) {
    return formatErrorResponse(error, false)
  }
}

/**
 * Valida se erro é do tipo especificado
 */
export function isErrorType(error: unknown, type: ErrorType): boolean {
  return error instanceof AppError && error.type === type
}
