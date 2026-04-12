/**
 * Schemas de Validação para Edge Functions
 * 
 * Este módulo fornece funções de validação para dados de entrada,
 * incluindo CPF, CNPJ, email, valores monetários, etc.
 */

/**
 * Valida CPF (formato brasileiro)
 */
export function validateCPF(cpf: string): boolean {
  if (!cpf) return false
  
  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '')
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) return false
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false
  
  // Validação dos dígitos verificadores
  let sum = 0
  let remainder
  
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i)
  }
  
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false
  
  sum = 0
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i)
  }
  
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false
  
  return true
}

/**
 * Valida CNPJ (formato brasileiro)
 */
export function validateCNPJ(cnpj: string): boolean {
  if (!cnpj) return false
  
  // Remove caracteres não numéricos
  const cleanCNPJ = cnpj.replace(/\D/g, '')
  
  // Verifica se tem 14 dígitos
  if (cleanCNPJ.length !== 14) return false
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false
  
  // Validação dos dígitos verificadores
  let length = cleanCNPJ.length - 2
  let numbers = cleanCNPJ.substring(0, length)
  const digits = cleanCNPJ.substring(length)
  let sum = 0
  let pos = length - 7
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(0))) return false
  
  length = length + 1
  numbers = cleanCNPJ.substring(0, length)
  sum = 0
  pos = length - 7
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(1))) return false
  
  return true
}

/**
 * Valida email
 */
export function validateEmail(email: string): boolean {
  if (!email) return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Valida valor monetário (positivo)
 */
export function validateMonetaryValue(value: number | string): boolean {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(numValue)) return false
  return numValue >= 0
}

/**
 * Valida valor monetário positivo (maior que zero)
 */
export function validatePositiveMonetaryValue(value: number | string): boolean {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(numValue)) return false
  return numValue > 0
}

/**
 * Sanitiza string removendo caracteres perigosos
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return ''
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove tags HTML básicas
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
}

/**
 * Valida se string não está vazia
 */
export function validateNotEmpty(value: string | null | undefined): boolean {
  return value !== null && value !== undefined && value.trim().length > 0
}

/**
 * Valida se string tem tamanho mínimo
 */
export function validateMinLength(value: string, minLength: number): boolean {
  return value && value.trim().length >= minLength
}

/**
 * Valida se string tem tamanho máximo
 */
export function validateMaxLength(value: string, maxLength: number): boolean {
  return !value || value.trim().length <= maxLength
}

/**
 * Valida se número está em range
 */
export function validateRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max
}

/**
 * Valida UUID
 */
export function validateUUID(uuid: string): boolean {
  if (!uuid) return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Valida data (formato ISO ou Date)
 */
export function validateDate(date: string | Date): boolean {
  if (!date) return false
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return !isNaN(dateObj.getTime())
}

/**
 * Valida array não vazio
 */
export function validateNonEmptyArray<T>(array: T[] | null | undefined): boolean {
  return Array.isArray(array) && array.length > 0
}

/**
 * Interface para resultado de validação
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Valida múltiplos campos e retorna erros
 */
export function validateFields(fields: Record<string, { value: any; validators: Array<(value: any) => boolean>; errorMessage: string }>): ValidationResult {
  const errors: string[] = []
  
  for (const [fieldName, { value, validators, errorMessage }] of Object.entries(fields)) {
    for (const validator of validators) {
      if (!validator(value)) {
        errors.push(`${fieldName}: ${errorMessage}`)
        break
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}
