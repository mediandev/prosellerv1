import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async (req) => {
  const startTime = Date.now()
  console.log('[REF-SITUACAO-V2] Request received:', { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('ref_situacao')
        .select('ref_situacao_id, nome, descricao')
        .order('ref_situacao_id', { ascending: true })

      if (error) throw new Error(error.message)

      const situacoes = (data || []).map((s) => ({
        id: String(s.ref_situacao_id),
        nome: s.nome,
        descricao: s.descricao || undefined,
      }))

      const duration = Date.now() - startTime
      return new Response(
        JSON.stringify({
          success: true,
          data: situacoes,
          meta: {
            timestamp: new Date().toISOString(),
            duration: `${duration}ms`,
            total: situacoes.length,
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed', timestamp: new Date().toISOString() }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[REF-SITUACAO-V2] Error:', error)
    const duration = Date.now() - startTime
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
