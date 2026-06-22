// supabase.ts — singleton minimalista do supabase-js para uso em Storage uploads e queries diretas.
// O resto do app continua chamando Edge Functions via `services/api.ts`.
// F-LOG-CRM R-LOG-2: precisamos do client para upload em `logistica-comprovantes`.
// Nota: o app usa auth customizado (jwt em localStorage['auth_token']), não Supabase Auth nativo.
// Por isso, injetamos o token manualmente para que RLS funcione corretamente.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://xxoiqfraeolsqsmsheue.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4b2lxZnJhZW9sc3FzbXNoZXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1ODQ5MDIsImV4cCI6MjA0MjE2MDkwMn0.m8A1mUf3GyAl_17FjltxkgBr-xRQYZw9YEDUVUBdttA";

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {},
      fetch: (url, options = {}) => {
        const accessToken = typeof localStorage !== 'undefined'
          ? localStorage.getItem('auth_token')
          : null;
        if (accessToken) {
          const headers = new Headers((options as RequestInit).headers);
          headers.set('Authorization', `Bearer ${accessToken}`);
          return fetch(url, { ...options, headers });
        }
        return fetch(url, options);
      },
    },
  });
  return _client;
}

export const supabase = getSupabaseClient();
