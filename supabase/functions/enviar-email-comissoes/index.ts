import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsHeaders, 'Access-Control-Max-Age': '86400' } })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY não configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validar autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: 'Token inválido ou expirado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Ler body
    const body = await req.json()
    const { to, vendedorNome, periodo, totalVendas, totalComissoes, valorLiquido, saldo } = body

    if (!to || !vendedorNome || !periodo) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: to, vendedorNome, periodo' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const fmt = (v: number) =>
      (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Relatório de Comissões</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">${periodo}</p>
          </div>
          <div style="padding: 30px; background: white;">
            <p>Olá <strong>${vendedorNome}</strong>,</p>
            <p>Segue seu relatório de comissões referente a <strong>${periodo}</strong>:</p>
            <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0;">
              <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Total de Comissões</div>
              <div style="font-size: 32px; font-weight: bold; color: #667eea;">
                ${fmt(totalComissoes ?? 0)}
              </div>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Total de Vendas</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${fmt(totalVendas ?? 0)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Total de Comissões</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${fmt(totalComissoes ?? 0)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Valor Líquido</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${fmt(valorLiquido ?? 0)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Saldo</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold;">${fmt(saldo ?? 0)}</td>
              </tr>
            </table>
            <p>Acesse o sistema para mais detalhes.</p>
          </div>
          <div style="padding: 20px; background: #f8f9fa; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              Este é um e-mail automático. Não responda.
            </p>
          </div>
        </body>
      </html>
    `

    // Enviar via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ProSeller <proseller@flowcode.cc>',
        to: [to],
        subject: `Relatório de Comissões - ${periodo}`,
        html,
      }),
    })

    if (!resendResponse.ok) {
      const resendError = await resendResponse.json()
      console.error('[ENVIAR-EMAIL-COMISSOES] Erro Resend:', resendError)
      return new Response(
        JSON.stringify({ error: `Erro ao enviar email: ${resendError.message || resendResponse.statusText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = await resendResponse.json()
    console.log('[ENVIAR-EMAIL-COMISSOES] Email enviado:', result.id, 'para:', to)

    return new Response(
      JSON.stringify({ success: true, emailId: result.id, to }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[ENVIAR-EMAIL-COMISSOES] Erro:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
