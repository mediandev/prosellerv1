import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, origin, x-requested-with',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
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

        // Buscar perfil na tabela user
        const { data: userData, error: userError } = await supabase
            .from('user')
            .select('user_id, email, tipo, ativo')
            .eq('user_id', authUser.id)
            .eq('ativo', true)
            .single()

        if (userError || !userData) return { user: null, error: 'User not found or inactive' }

        return {
            user: {
                id: userData.user_id,
                email: userData.email || authUser.email || '',
                tipo: userData.tipo as 'backoffice' | 'vendedor',
                ativo: userData.ativo,
            },
            error: null
        }
    } catch (error) {
        return { user: null, error: 'Authentication error' }
    }
}

function createAuthErrorResponse(message: string, statusCode: number = 401): Response {
    return new Response(
        JSON.stringify({ error: message, timestamp: new Date().toISOString() }),
        { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
}

function createHttpSuccessResponse<T>(data: T, status: number = 200, meta?: Record<string, unknown>): Response {
    return new Response(
        JSON.stringify({ success: true, data, meta: { timestamp: new Date().toISOString(), ...meta } }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
}

function formatErrorResponse(error: Error | unknown): Response {
    let statusCode = 500
    let errorMessage = 'Internal server error'
    if (error instanceof Error) {
        errorMessage = error.message
        if (error.message.includes('Unauthorized') || error.message.includes('authentication')) statusCode = 401
        else if (error.message.includes('permission') || error.message.includes('forbidden')) statusCode = 403
        else if (error.message.includes('not found') || error.message.includes('não encontrado')) statusCode = 404
        else if (error.message.includes('validation') || error.message.includes('invalid') || error.message.includes('obrigatório')) statusCode = 400
    }
    console.error('[COMISSOES-V2] Error:', { message: errorMessage, statusCode })
    return new Response(
        JSON.stringify({ success: false, error: errorMessage, timestamp: new Date().toISOString() }),
        { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
}

serve(async (req) => {
    const startTime = Date.now()
    console.log('[COMISSOES-V2] Request received:', { method: req.method, url: req.url })

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: { ...corsHeaders, 'Access-Control-Max-Age': '86400' } })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)
        if (authError || !user) {
            return createAuthErrorResponse(authError || 'Unauthorized')
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
        })

        const url = new URL(req.url)
        const pathParts = url.pathname.split('/').filter(p => p)
        const functionIndex = pathParts.indexOf('comissoes-v2')

        // Identificar a ação com base no path: /comissoes-v2/lancamentos (etc)
        let action: string | null = null
        if (functionIndex >= 0 && pathParts.length > functionIndex + 1) {
            action = pathParts[functionIndex + 1]
        }

        /* =========================
           GET /relatorios
           ========================= */
        if (action === 'relatorios' && req.method === 'GET') {
            const periodo = url.searchParams.get('periodo')
            const vendedorId = url.searchParams.get('vendedorId') || url.searchParams.get('vendedor_id')

            if (!periodo) throw new Error('Parâmetro periodo (YYYY-MM) é obrigatório')

            // Se for vendedor, só pode ver seu próprio relatório
            if (user.tipo === 'vendedor') {
                if (vendedorId && vendedorId !== user.id) {
                    throw new Error('Você não tem permissão para ver relatórios de outros vendedores')
                }
            }

            const { data, error } = await supabase.rpc('get_relatorio_comissoes_v2', {
                p_periodo: periodo,
                p_vendedor_uuid: user.tipo === 'vendedor' ? user.id : (vendedorId || null)
            })

            if (error) throw error
            return createHttpSuccessResponse(data)
        }

        /* =========================
           GET /lancamentos
           ========================= */
        if (action === 'lancamentos' && req.method === 'GET') {
            const periodo = url.searchParams.get('periodo')
            const vendedorId = url.searchParams.get('vendedorId') || url.searchParams.get('vendedor_id')

            let query = supabase.from('lancamentos_comissao').select('*').order('created_at', { ascending: false })

            if (periodo) query = query.eq('periodo', periodo)
            if (vendedorId) query = query.eq('vendedor_uuid', vendedorId)

            // RLS policies já vão filtrar para o vendedor se ele estiver logado
            // Mas para segurança extra no filtro manual:
            if (user.tipo === 'vendedor') {
                query = query.eq('vendedor_uuid', user.id)
            }

            const { data, error } = await query
            if (error) throw error
            return createHttpSuccessResponse(data)
        }

        /* =========================
           POST /lancamentos
           ========================= */
        if (action === 'lancamentos' && req.method === 'POST') {
            if (user.tipo !== 'backoffice') {
                throw new Error('Apenas backoffice pode criar lançamentos')
            }

            const body = await req.json()
            const { vendedor_uuid, tipo, valor, descricao, periodo } = body

            if (!vendedor_uuid || !tipo || !valor || !descricao || !periodo) {
                throw new Error('Campos obrigatórios: vendedor_uuid, tipo, valor, descricao, periodo')
            }

            const { data, error } = await supabase.rpc('create_lancamento_comissao_v2', {
                p_vendedor_uuid: vendedor_uuid,
                p_tipo: tipo,
                p_valor: valor,
                p_descricao: descricao,
                p_periodo: periodo,
                p_criado_por: user.id
            })

            if (error) throw error
            return createHttpSuccessResponse(data, 201)
        }

        /* =========================
           PUT /lancamentos
           ========================= */
        if (action === 'lancamentos' && req.method === 'PUT') {
            if (user.tipo !== 'backoffice') throw new Error('Apenas backoffice pode editar lançamentos')

            const body = await req.json()
            const { id, tipo, valor, descricao, periodo } = body

            if (!id) throw new Error('ID é obrigatório')

            const { data, error } = await supabase
                .from('lancamentos_comissao')
                .update({ tipo, valor, descricao, periodo, data_lancamento: new Date() }) // Atualiza data ou mantem original? Mantem original seria melhor, mas aqui atualizo dados.
                .eq('id', id)
                .select()

            if (error) throw error
            return createHttpSuccessResponse(data)
        }

        /* =========================
           DELETE /lancamentos
           ========================= */
        if (action === 'lancamentos' && req.method === 'DELETE') {
            if (user.tipo !== 'backoffice') throw new Error('Apenas backoffice pode excluir lançamentos')

            const id = url.searchParams.get('id')
            if (!id) throw new Error('ID é obrigatório')

            const { error } = await supabase
                .from('lancamentos_comissao')
                .delete()
                .eq('id', id)

            if (error) throw error
            return createHttpSuccessResponse({ success: true })
        }

        /* =========================
           GET /pagamentos
           ========================= */
        if (action === 'pagamentos' && req.method === 'GET') {
            const periodo = url.searchParams.get('periodo')
            const vendedorId = url.searchParams.get('vendedorId') || url.searchParams.get('vendedor_id')

            let query = supabase.from('pagamentos_comissao').select('*').order('data_pagamento', { ascending: false })

            if (periodo) query = query.eq('periodo', periodo)
            if (vendedorId) query = query.eq('vendedor_uuid', vendedorId)

            if (user.tipo === 'vendedor') {
                query = query.eq('vendedor_uuid', user.id)
            }

            const { data, error } = await query
            if (error) throw error
            return createHttpSuccessResponse(data)
        }

        /* =========================
           POST /pagamentos
           ========================= */
        if (action === 'pagamentos' && req.method === 'POST') {
            if (user.tipo !== 'backoffice') {
                throw new Error('Apenas backoffice pode registrar pagamentos')
            }

            const body = await req.json()
            const { vendedor_uuid, valor, periodo, forma_pagamento, comprovante_url, observacoes } = body

            if (!vendedor_uuid || !valor || !periodo || !forma_pagamento) {
                throw new Error('Campos obrigatórios: vendedor_uuid, valor, periodo, forma_pagamento')
            }

            const { data, error } = await supabase.rpc('create_pagamento_comissao_v2', {
                p_vendedor_uuid: vendedor_uuid,
                p_valor: valor,
                p_periodo: periodo,
                p_forma_pagamento: forma_pagamento,
                p_comprovante_url: comprovante_url || null,
                p_observacoes: observacoes || null,
                p_realizado_por: user.id
            })

            if (error) throw error
            return createHttpSuccessResponse(data, 201)
        }

        /* =========================
           PUT /pagamentos
           ========================= */
        if (action === 'pagamentos' && req.method === 'PUT') {
            if (user.tipo !== 'backoffice') throw new Error('Apenas backoffice pode editar pagamentos')

            const body = await req.json()
            const { id, valor, periodo, forma_pagamento, comprovante_url, observacoes } = body

            if (!id) throw new Error('ID é obrigatório')

            const { data, error } = await supabase
                .from('pagamentos_comissao')
                .update({ valor, periodo, forma_pagamento, comprovante_url, observacoes })
                .eq('id', id)
                .select()

            if (error) throw error
            return createHttpSuccessResponse(data)
        }

        /* =========================
           DELETE /pagamentos
           ========================= */
        if (action === 'pagamentos' && req.method === 'DELETE') {
            if (user.tipo !== 'backoffice') throw new Error('Apenas backoffice pode excluir pagamentos')

            const id = url.searchParams.get('id')
            if (!id) throw new Error('ID é obrigatório')

            const { error } = await supabase
                .from('pagamentos_comissao')
                .delete()
                .eq('id', id)

            if (error) throw error
            return createHttpSuccessResponse({ success: true })
        }

        /* =========================
           POST /fechar-periodo
           ========================= */
        if (action === 'fechar-periodo' && req.method === 'POST') {
            if (user.tipo !== 'backoffice') {
                throw new Error('Apenas backoffice pode fechar períodos')
            }

            const body = await req.json()
            const { vendedor_uuid, periodo } = body

            if (!vendedor_uuid || !periodo) {
                throw new Error('Campos obrigatórios: vendedor_uuid, periodo')
            }

            const { data, error } = await supabase.rpc('fechar_periodo_comissao_v2', {
                p_vendedor_uuid: vendedor_uuid,
                p_periodo: periodo,
                p_fechado_por: user.id
            })

            if (error) throw error
            return createHttpSuccessResponse(data, 200)
        }

        /* =========================
           GET /vendas
           ========================= */
        if (action === 'vendas' && req.method === 'GET') {
            const periodo = url.searchParams.get('periodo')
            const vendedorId = url.searchParams.get('vendedorId') || url.searchParams.get('vendedor_id')

            // A tabela real é 'vendedor_comissão' (com acento na migração antiga ou sem?)
            // Na migração 084 usei public.vendedor_comissão.
            // O Supabase Client JS lida bem com UTF-8? Sim.
            let query = supabase.from('vendedor_comissão').select('*').order('vendedor_comissao_id', { ascending: false })

            if (periodo) {
                // Filtra pelo período literal OU (se período for nulo) pela data_inicio correspondente (YYYY-MM)
                query = query.or(`periodo.eq.${periodo},and(periodo.is.null,data_inicio.gte.${periodo}-01,data_inicio.lte.${periodo}-31)`)
            }
            if (vendedorId) query = query.eq('vendedor_uuid', vendedorId)

            if (user.tipo === 'vendedor') {
                query = query.eq('vendedor_uuid', user.id)
            }

            const { data, error } = await query
            if (error) throw error
            return createHttpSuccessResponse(data)
        }

        return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error) {
        return formatErrorResponse(error)
    }
})
