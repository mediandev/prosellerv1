/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  /**
   * Feature flag para o módulo Logística (F-LOG-CRM R-LOG-1+).
   * Aceita `"true"` para habilitar a UI; qualquer outro valor (incluindo
   * ausência) deixa a `LogisticaPage` em modo placeholder.
   * Edge Functions têm flag equivalente em Deno (`FEATURE_LOG_CRM`).
   */
  readonly VITE_FEATURE_LOG_CRM?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
