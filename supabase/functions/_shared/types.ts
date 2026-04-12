/**
 * Tipos TypeScript Compartilhados para Edge Functions
 * 
 * Este módulo define interfaces e tipos compartilhados entre
 * todas as Edge Functions do sistema.
 */

/**
 * Resposta padrão de sucesso da API
 */
export interface ApiSuccessResponse<T = any> {
  success: true
  data: T
  meta?: {
    timestamp: string
    userId?: string
    [key: string]: any
  }
}

/**
 * Resposta padrão de erro da API
 */
export interface ApiErrorResponse {
  success: false
  error: string
  timestamp: string
  details?: any
}

/**
 * Tipo de resposta da API (sucesso ou erro)
 */
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * Parâmetros de paginação
 */
export interface PaginationParams {
  page?: number
  limit?: number
}

/**
 * Resposta paginada
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

/**
 * Filtros comuns para listagem
 */
export interface CommonFilters {
  search?: string
  status?: string
  ativo?: boolean
  deleted?: boolean
  created_from?: string
  created_to?: string
}

/**
 * Usuário autenticado
 */
export interface AuthenticatedUser {
  id: string
  email: string
  tipo: 'backoffice' | 'vendedor'
  ativo: boolean
}

/**
 * Request body genérico
 */
export interface RequestBody {
  [key: string]: any
}

/**
 * Headers da requisição
 */
export interface RequestHeaders {
  'Authorization'?: string
  'Content-Type'?: string
  [key: string]: string | undefined
}

/**
 * Opções de criação de entidade
 */
export interface CreateOptions {
  skipValidation?: boolean
  skipAudit?: boolean
}

/**
 * Opções de atualização de entidade
 */
export interface UpdateOptions {
  skipValidation?: boolean
  skipAudit?: boolean
  partial?: boolean
}

/**
 * Opções de listagem
 */
export interface ListOptions extends PaginationParams, CommonFilters {
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  include_deleted?: boolean
}

/**
 * Resultado de operação
 */
export interface OperationResult<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * Dados de auditoria
 */
export interface AuditData {
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
  created_by?: string
  updated_by?: string
  deleted_by?: string | null
}

/**
 * Entidade com auditoria
 */
export interface AuditedEntity extends AuditData {
  id: string
  [key: string]: any
}

/**
 * Erro de validação
 */
export interface ValidationError {
  field: string
  message: string
  value?: any
}

/**
 * Resposta de validação
 */
export interface ValidationResponse {
  valid: boolean
  errors: ValidationError[]
}

/**
 * Configuração de CORS
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

/**
 * Helper para criar resposta de sucesso
 */
export function createSuccessResponse<T>(
  data: T,
  meta?: Record<string, any>
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  }
}

/**
 * Helper para criar resposta de erro
 */
export function createErrorResponse(
  error: string,
  details?: any
): ApiErrorResponse {
  return {
    success: false,
    error,
    timestamp: new Date().toISOString(),
    details,
  }
}

/**
 * Helper para criar resposta HTTP de sucesso
 */
export function createHttpSuccessResponse<T>(
  data: T,
  status: number = 200,
  meta?: Record<string, any>
): Response {
  return new Response(
    JSON.stringify(createSuccessResponse(data, meta)),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  )
}

/**
 * Helper para criar resposta HTTP de erro
 */
export function createHttpErrorResponse(
  error: string,
  status: number = 400,
  details?: any
): Response {
  return new Response(
    JSON.stringify(createErrorResponse(error, details)),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  )
}
