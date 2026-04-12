import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface AuthenticatedUser {
  id: string
  email: string
  tipo: 'backoffice' | 'vendedor'
  ativo: boolean
}

async function validateJWT(
  req: Request,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<{ user: AuthenticatedUser | null; error: string | null }> {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return { user: null, error: 'Missing authorization header' }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authUser) return { user: null, error: 'Invalid or expired token' }

    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('user_id, email, tipo, ativo')
      .eq('user_id', authUser.id)
      .eq('ativo', true)
      .is('deleted_at', null)
      .single()

    if (userError || !userData) return { user: null, error: 'User not found or inactive' }

    return {
      user: {
        id: userData.user_id,
        email: userData.email || authUser.email || '',
        tipo: userData.tipo as 'backoffice' | 'vendedor',
        ativo: userData.ativo,
      },
      error: null,
    }
  } catch (_error) {
    return { user: null, error: 'Authentication error' }
  }
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)

    if (authError || !user) {
      return errorResponse(authError || 'Unauthorized', 401)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    })

    if (req.method === 'GET') {
      const url = new URL(req.url)
      const empresaIdRaw = url.searchParams.get('empresa_id')
      const empresaId = empresaIdRaw ? Number(empresaIdRaw) : NaN

      if (!empresaIdRaw || Number.isNaN(empresaId)) {
        return errorResponse('Parâmetro empresa_id é obrigatório.')
      }

      const { data, error } = await supabase
        .from('tiny_empresa_natureza_operacao')
        .select(`
          id,
          empresa_id,
          natureza_operacao_id,
          tiny_valor,
          ativo,
          natureza_operacao:natureza_operacao_id (
            id,
            nome
          )
        `)
        .eq('empresa_id', empresaId)
        .is('deleted_at', null)
        .order('natureza_operacao_id', { ascending: true })

      if (error) {
        return errorResponse(`Erro ao listar mapeamentos: ${error.message}`, 500)
      }

      const formatted = (data || []).map((row: any) => ({
        id: String(row.id),
        empresaId: String(row.empresa_id),
        naturezaOperacaoId: String(row.natureza_operacao_id),
        naturezaOperacaoNome: row.natureza_operacao?.nome || '',
        tinyValor: row.tiny_valor || '',
        ativo: row.ativo ?? true,
      }))

      return jsonResponse(formatted)
    }

    if (req.method === 'POST') {
      if (user.tipo !== 'backoffice') {
        return errorResponse('Apenas usuários backoffice podem alterar mapeamentos.', 403)
      }

      const body = await req.json().catch(() => ({}))
      const empresaId = Number(body.empresaId)
      const naturezaOperacaoId = Number(body.naturezaOperacaoId)
      const tinyValor = String(body.tinyValor || '').trim()
      const ativo = body.ativo !== false

      if (Number.isNaN(empresaId) || Number.isNaN(naturezaOperacaoId)) {
        return errorResponse('empresaId e naturezaOperacaoId são obrigatórios.')
      }

      if (!tinyValor) {
        const { error: softDeleteError } = await supabase
          .from('tiny_empresa_natureza_operacao')
          .update({
            deleted_at: new Date().toISOString(),
            ativo: false,
            updated_at: new Date().toISOString(),
          })
          .eq('empresa_id', empresaId)
          .eq('natureza_operacao_id', naturezaOperacaoId)
          .is('deleted_at', null)

        if (softDeleteError) {
          return errorResponse(`Erro ao remover mapeamento: ${softDeleteError.message}`, 500)
        }

        return jsonResponse({ success: true })
      }

      const { data, error } = await supabase
        .from('tiny_empresa_natureza_operacao')
        .upsert(
          {
            empresa_id: empresaId,
            natureza_operacao_id: naturezaOperacaoId,
            tiny_valor: tinyValor,
            ativo,
            deleted_at: null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'empresa_id,natureza_operacao_id',
          }
        )
        .select('id, empresa_id, natureza_operacao_id, tiny_valor, ativo')
        .single()

      if (error) {
        return errorResponse(`Erro ao salvar mapeamento: ${error.message}`, 500)
      }

      return jsonResponse({
        id: String(data.id),
        empresaId: String(data.empresa_id),
        naturezaOperacaoId: String(data.natureza_operacao_id),
        tinyValor: data.tiny_valor || '',
        ativo: data.ativo ?? true,
      })
    }

    return errorResponse('Method not allowed', 405)
  } catch (error: any) {
    return errorResponse(error?.message || 'Internal server error', 500)
  }
})
