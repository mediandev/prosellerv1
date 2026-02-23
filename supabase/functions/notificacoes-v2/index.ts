import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

type UserType = 'backoffice' | 'vendedor'

interface AuthenticatedUser {
  id: string
  email: string
  tipo: UserType
  ativo: boolean
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ success: false, error: message, timestamp: new Date().toISOString() }, status)
}

function successResponse(data: unknown, status = 200): Response {
  return jsonResponse({ success: true, data, timestamp: new Date().toISOString() }, status)
}

async function validateJWT(
  req: Request,
  supabaseUrl: string,
  serviceKey: string
): Promise<{ user: AuthenticatedUser | null; error: string | null }> {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return { user: null, error: 'Missing authorization header' }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, serviceKey, {
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
        tipo: userData.tipo as UserType,
        ativo: userData.ativo,
      },
      error: null,
    }
  } catch {
    return { user: null, error: 'Authentication error' }
  }
}

function mapNotificacao(row: any) {
  return {
    id: row.id,
    tipo: row.tipo,
    titulo: row.titulo,
    mensagem: row.mensagem,
    link: row.link || undefined,
    status: row.status,
    usuarioId: row.usuario_id,
    dataCriacao: row.data_criacao,
    dataLeitura: row.data_leitura || undefined,
    dadosAdicionais: row.dados_adicionais || {},
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return errorResponse('Supabase environment variables are missing', 500)
  }

  const { user, error } = await validateJWT(req, supabaseUrl, serviceKey)
  if (error || !user) return errorResponse(error || 'Unauthorized', 401)

  const supabase = createClient(supabaseUrl, serviceKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
  })

  const url = new URL(req.url)
  const pathParts = url.pathname.split('/').filter(Boolean)
  const functionIndex = pathParts.indexOf('notificacoes-v2')
  const notificacaoId = functionIndex >= 0 && functionIndex < pathParts.length - 1 ? pathParts[functionIndex + 1] : null

  try {
    if (req.method === 'GET') {
      const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10), 1), 200)
      const status = url.searchParams.get('status')
      const incluirArquivadas = url.searchParams.get('incluirArquivadas') === 'true'

      const { data, error: listError } = await supabase.rpc('list_notificacoes_v2', {
        p_usuario_id: user.id,
        p_status: status,
        p_limit: limit,
        p_offset: 0,
        p_incluir_arquivadas: incluirArquivadas,
      })

      if (listError) throw new Error(listError.message)
      return successResponse((data || []).map(mapNotificacao))
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      const action = body?.action || 'create'

      if (action === 'mark_all_read') {
        const { error: updateError } = await supabase
          .from('notificacao')
          .update({ status: 'lida', data_leitura: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('usuario_id', user.id)
          .eq('status', 'nao_lida')

        if (updateError) throw new Error(updateError.message)
        return successResponse({ success: true })
      }

      const basePayload = {
        tipo: body.tipo,
        titulo: body.titulo,
        mensagem: body.mensagem,
        link: body.link || null,
        dados_adicionais: body.dadosAdicionais || {},
        criado_por: user.id,
      }

      if (!basePayload.tipo || !basePayload.titulo || !basePayload.mensagem) {
        return errorResponse('tipo, titulo e mensagem sao obrigatorios', 400)
      }

      if (action === 'create_backoffice') {
        const { data: backofficeUsers, error: usersError } = await supabase
          .from('user')
          .select('user_id')
          .eq('tipo', 'backoffice')
          .eq('ativo', true)
          .is('deleted_at', null)

        if (usersError) throw new Error(usersError.message)

        const rows = (backofficeUsers || []).map((u: any) => ({
          ...basePayload,
          usuario_id: u.user_id,
          status: 'nao_lida',
          data_criacao: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))

        if (rows.length === 0) return successResponse([])

        const { data, error: insertError } = await supabase
          .from('notificacao')
          .insert(rows)
          .select('*')

        if (insertError) throw new Error(insertError.message)
        return successResponse((data || []).map(mapNotificacao), 201)
      }

      if (!body.usuarioId) {
        return errorResponse('usuarioId e obrigatorio para criar notificacao', 400)
      }

      const { data, error: insertError } = await supabase
        .from('notificacao')
        .insert({
          ...basePayload,
          usuario_id: body.usuarioId,
          status: 'nao_lida',
          data_criacao: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single()

      if (insertError) throw new Error(insertError.message)
      return successResponse(mapNotificacao(data), 201)
    }

    if (req.method === 'PUT') {
      if (!notificacaoId) return errorResponse('Notification id is required', 400)
      const body = await req.json().catch(() => ({}))
      const action = body?.action || 'mark_read'

      const patch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      if (action === 'archive') {
        patch.status = 'arquivada'
        patch.arquivada_em = new Date().toISOString()
      } else {
        patch.status = 'lida'
        patch.data_leitura = new Date().toISOString()
      }

      const { data, error: updateError } = await supabase
        .from('notificacao')
        .update(patch)
        .eq('id', notificacaoId)
        .eq('usuario_id', user.id)
        .select('*')
        .single()

      if (updateError) throw new Error(updateError.message)
      return successResponse(mapNotificacao(data))
    }

    return errorResponse('Method not allowed', 405)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return errorResponse(message, 500)
  }
})
