// Helper compartilhado entre as Edge Functions da F-LOG-CRM (R-LOG-1+).
// Pure function — testável via Deno sem subir servidor HTTP.
//
// Convenção: a flag aceita estritamente a string "true" como ON. Qualquer
// outro valor (incluindo ausência) deixa o módulo Logística em modo OFF
// (503). Mesma convenção do FEATURE_SIMPLES_NACIONAL_LOOKUP (ADR-001).

export function isLogCrmFeatureEnabled(value: string | undefined | null): boolean {
  return value === 'true';
}

/**
 * Açúcar para uso direto dentro de Edge Functions Deno.
 * Lê a env var `FEATURE_LOG_CRM` do runtime.
 */
export function isLogCrmEnabledFromEnv(): boolean {
  return isLogCrmFeatureEnabled(Deno.env.get('FEATURE_LOG_CRM'));
}
