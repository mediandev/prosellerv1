import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface AuthenticatedUser {
  id: string
  email: string
  tipo: 'backoffice' | 'vendedor'
  ativo: boolean
}

// Helper: Valida JWT
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

function createHttpSuccessResponse<T>(data: T, status: number = 200, meta?: Record<string, any>): Response {
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
    else if (error.message.includes('not found')) statusCode = 404
    else if (error.message.includes('validation') || error.message.includes('invalid')) statusCode = 400
  }
  console.error('[ERROR]', { message: errorMessage, statusCode })
  return new Response(
    JSON.stringify({ success: false, error: errorMessage, timestamp: new Date().toISOString() }),
    { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

serve(async (req) => {
  const startTime = Date.now()
  console.log('[PRODUTOS-V2] Request received:', { method: req.method, url: req.url, timestamp: new Date().toISOString() })

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400',
      }
    })
  }

  try {
    console.log('[PRODUTOS-V2] Step 1: Starting authentication...')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)

    if (authError || !user) {
      console.error('[PRODUTOS-V2] Authentication failed:', { error: authError })
      return createAuthErrorResponse(authError || 'Unauthorized')
    }

    console.log('[PRODUTOS-V2] Authentication successful:', { userId: user.id, tipo: user.tipo })

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    })

    // Extrair action do body ou query params
    let action: string
    let body: any = {}

    if (req.method === 'GET') {
      const url = new URL(req.url)
      action = url.searchParams.get('action') || 'list'
    } else {
      try {
        body = await req.json()
      } catch {
        body = {}
      }
      action = body.action || 'list'
    }

    console.log('[PRODUTOS-V2] Action:', action)

    switch (action) {
      case 'list': {
        console.log('[PRODUTOS-V2] Listing produtos...')

        // Buscar produtos
        const { data: produtos, error: produtosError } = await supabase
          .from('produto')
          .select(`
            produto_id,
            foto,
            descricao,
            codigo_sku,
            gtin,
            marca,
            tipo_id,
            ncm,
            cest,
            unidade_id,
            peso_liquido,
            peso_bruto,
            situacao,
            ativo,
            disponivel,
            created_at,
            updated_at,
            nome_marca,
            nome_tipo_produto,
            sigla_unidade
          `)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })

        if (produtosError) {
          console.error('[PRODUTOS-V2] Query Error:', produtosError)
          throw new Error(`Database operation failed: ${produtosError.message}`)
        }

        // Buscar marcas relacionadas
        const marcaIds = [...new Set((produtos || [])
          .map((p: any) => p.marca)
          .filter((id: any) => id !== null && id !== undefined))]

        let marcas: any[] = []
        if (marcaIds.length > 0) {
          const { data, error } = await supabase
            .from('marcas')
            .select('id, nome')
            .in('id', marcaIds)

          if (error) {
            console.error('[PRODUTOS-V2] Error fetching marcas:', error)
          } else {
            marcas = data || []
          }
        }

        // Buscar tipos de produto relacionados
        const tipoIds = [...new Set((produtos || [])
          .map((p: any) => p.tipo_id)
          .filter((id: any) => id !== null && id !== undefined))]

        let tipos: any[] = []
        if (tipoIds.length > 0) {
          const { data, error } = await supabase
            .from('ref_tipo_produto')
            .select('id, nome')
            .in('id', tipoIds)

          if (error) {
            console.error('[PRODUTOS-V2] Error fetching tipos:', error)
          } else {
            tipos = data || []
          }
        }

        // Buscar unidades de medida relacionadas
        const unidadeIds = [...new Set((produtos || [])
          .map((p: any) => p.unidade_id)
          .filter((id: any) => id !== null && id !== undefined))]

        let unidades: any[] = []
        if (unidadeIds.length > 0) {
          const { data, error } = await supabase
            .from('ref_unidade_medida')
            .select('id, sigla')
            .in('id', unidadeIds)

          if (error) {
            console.error('[PRODUTOS-V2] Error fetching unidades:', error)
          } else {
            unidades = data || []
          }
        }

        // Criar mapas para lookup rápido (priorizar dados das tabelas auxiliares)
        const marcaMap = new Map(
          (marcas || []).map((m: any) => [
            Number(m.id),
            m.nome || ''
          ])
        )
        const tipoMap = new Map(
          (tipos || []).map((t: any) => [
            Number(t.id),
            t.nome || ''
          ])
        )
        const unidadeMap = new Map(
          (unidades || []).map((u: any) => [
            Number(u.id),
            u.sigla || ''
          ])
        )

        // Formatar os dados para o frontend
        // Priorizar dados das tabelas auxiliares sobre campos desnormalizados
        const formattedProdutos = (produtos || []).map((prod: any) => {
          const marcaId = prod.marca ? Number(prod.marca) : null
          const tipoId = prod.tipo_id ? Number(prod.tipo_id) : null
          const unidadeId = prod.unidade_id ? Number(prod.unidade_id) : null

          // Usar dados das tabelas auxiliares quando disponíveis, senão usar campos desnormalizados
          const nomeMarca = marcaId && marcaMap.has(marcaId) 
            ? marcaMap.get(marcaId) 
            : (prod.nome_marca || '')
          
          const nomeTipo = tipoId && tipoMap.has(tipoId)
            ? tipoMap.get(tipoId)
            : (prod.nome_tipo_produto || '')
          
          const siglaUnidade = unidadeId && unidadeMap.has(unidadeId)
            ? unidadeMap.get(unidadeId)
            : (prod.sigla_unidade || '')

          return {
            id: String(prod.produto_id),
            foto: prod.foto || undefined,
            descricao: prod.descricao || '',
            codigoSku: prod.codigo_sku || '',
            codigoEan: prod.gtin || undefined,
            marcaId: marcaId ? String(marcaId) : '',
            nomeMarca: nomeMarca,
            tipoProdutoId: tipoId ? String(tipoId) : '',
            nomeTipoProduto: nomeTipo,
            ncm: prod.ncm || undefined,
            cest: prod.cest || undefined,
            unidadeId: unidadeId ? String(unidadeId) : '',
            siglaUnidade: siglaUnidade,
            pesoLiquido: prod.peso_liquido || 0,
            pesoBruto: prod.peso_bruto || 0,
            situacao: prod.situacao || 'Ativo',
            ativo: prod.ativo !== false,
            disponivel: prod.disponivel !== false,
            createdAt: prod.created_at ? new Date(prod.created_at).toISOString() : new Date().toISOString(),
            updatedAt: prod.updated_at ? new Date(prod.updated_at).toISOString() : new Date().toISOString(),
          }
        })

        const duration = Date.now() - startTime
        console.log(`[PRODUTOS-V2] SUCCESS: Listed ${formattedProdutos.length} produtos (${duration}ms)`)

        return createHttpSuccessResponse(
          formattedProdutos,
          200,
          { userId: user.id, duration: `${duration}ms` }
        )
      }

      case 'get': {
        console.log('[PRODUTOS-V2] Getting produto...', body)

        if (!body.id) {
          throw new Error('ID é obrigatório')
        }

        const { data: produto, error: produtoError } = await supabase
          .from('produto')
          .select(`
            produto_id,
            foto,
            descricao,
            codigo_sku,
            gtin,
            marca,
            tipo_id,
            ncm,
            cest,
            unidade_id,
            peso_liquido,
            peso_bruto,
            situacao,
            ativo,
            disponivel,
            created_at,
            updated_at,
            nome_marca,
            nome_tipo_produto,
            sigla_unidade
          `)
          .eq('produto_id', parseInt(body.id))
          .is('deleted_at', null)
          .single()

        if (produtoError) {
          console.error('[PRODUTOS-V2] Query Error:', produtoError)
          throw new Error(`Database operation failed: ${produtoError.message}`)
        }

        if (!produto) {
          throw new Error('Produto não encontrado')
        }

        // Buscar dados das tabelas auxiliares (priorizar sobre campos desnormalizados)
        let nomeMarca = ''
        if (produto.marca) {
          const { data: marca } = await supabase
            .from('marcas')
            .select('nome')
            .eq('id', produto.marca)
            .single()
          nomeMarca = marca?.nome || produto.nome_marca || ''
        } else {
          nomeMarca = produto.nome_marca || ''
        }

        // Buscar nome do tipo (priorizar tabela auxiliar)
        let nomeTipo = ''
        if (produto.tipo_id) {
          const { data: tipo } = await supabase
            .from('ref_tipo_produto')
            .select('nome')
            .eq('id', produto.tipo_id)
            .single()
          nomeTipo = tipo?.nome || produto.nome_tipo_produto || ''
        } else {
          nomeTipo = produto.nome_tipo_produto || ''
        }

        // Buscar sigla da unidade (priorizar tabela auxiliar)
        let siglaUnidade = ''
        if (produto.unidade_id) {
          const { data: unidade } = await supabase
            .from('ref_unidade_medida')
            .select('sigla')
            .eq('id', produto.unidade_id)
            .single()
          siglaUnidade = unidade?.sigla || produto.sigla_unidade || ''
        } else {
          siglaUnidade = produto.sigla_unidade || ''
        }

        const formattedProduto = {
          id: String(produto.produto_id),
          foto: produto.foto || undefined,
          descricao: produto.descricao || '',
          codigoSku: produto.codigo_sku || '',
          codigoEan: produto.gtin || undefined,
          marcaId: produto.marca ? String(produto.marca) : '',
          nomeMarca: nomeMarca,
          tipoProdutoId: produto.tipo_id ? String(produto.tipo_id) : '',
          nomeTipoProduto: nomeTipo,
          ncm: produto.ncm || undefined,
          cest: produto.cest || undefined,
          unidadeId: produto.unidade_id ? String(produto.unidade_id) : '',
          siglaUnidade: siglaUnidade,
          pesoLiquido: produto.peso_liquido || 0,
          pesoBruto: produto.peso_bruto || 0,
          situacao: produto.situacao || 'Ativo',
          ativo: produto.ativo !== false,
          disponivel: produto.disponivel !== false,
          createdAt: produto.created_at ? new Date(produto.created_at).toISOString() : new Date().toISOString(),
          updatedAt: produto.updated_at ? new Date(produto.updated_at).toISOString() : new Date().toISOString(),
        }

        const duration = Date.now() - startTime
        console.log(`[PRODUTOS-V2] SUCCESS: Got produto ${formattedProduto.id} (${duration}ms)`)

        return createHttpSuccessResponse(
          formattedProduto,
          200,
          { userId: user.id, duration: `${duration}ms` }
        )
      }

      case 'create': {
        console.log('[PRODUTOS-V2] Creating produto...', body)

        // Validações
        if (!body.descricao || body.descricao.trim() === '') {
          throw new Error('Descrição é obrigatória')
        }

        if (!body.codigoSku || body.codigoSku.trim() === '') {
          throw new Error('Código SKU é obrigatório')
        }

        if (!body.marcaId) {
          throw new Error('Marca é obrigatória')
        }

        if (!body.tipoProdutoId) {
          throw new Error('Tipo de produto é obrigatório')
        }

        if (!body.unidadeId) {
          throw new Error('Unidade de medida é obrigatória')
        }

        // Buscar nome da marca
        const { data: marca } = await supabase
          .from('marcas')
          .select('nome')
          .eq('id', parseInt(body.marcaId))
          .single()

        if (!marca) {
          throw new Error('Marca não encontrada')
        }

        // Buscar nome do tipo
        const { data: tipo } = await supabase
          .from('ref_tipo_produto')
          .select('nome')
          .eq('id', parseInt(body.tipoProdutoId))
          .single()

        if (!tipo) {
          throw new Error('Tipo de produto não encontrado')
        }

        // Buscar sigla da unidade
        const { data: unidade } = await supabase
          .from('ref_unidade_medida')
          .select('sigla')
          .eq('id', parseInt(body.unidadeId))
          .single()

        const insertData: any = {
          descricao: body.descricao.trim(),
          codigo_sku: body.codigoSku.trim(),
          gtin: body.codigoEan || null,
          marca: parseInt(body.marcaId),
          tipo_id: parseInt(body.tipoProdutoId),
          ncm: body.ncm || null,
          cest: body.cest || null,
          unidade_id: parseInt(body.unidadeId),
          peso_liquido: body.pesoLiquido || 0,
          peso_bruto: body.pesoBruto || 0,
          situacao: body.situacao || 'Ativo',
          ativo: body.situacao === 'Ativo',
          disponivel: body.disponivel !== false,
          nome_marca: marca.nome,
          nome_tipo_produto: tipo.nome,
          sigla_unidade: unidade?.sigla || '',
        }

        if (body.foto) {
          insertData.foto = body.foto
        }

        const { data: novoProduto, error: insertError } = await supabase
          .from('produto')
          .insert(insertData)
          .select('produto_id, foto, descricao, codigo_sku, gtin, marca, tipo_id, ncm, cest, unidade_id, peso_liquido, peso_bruto, situacao, ativo, disponivel, created_at, updated_at, nome_marca, nome_tipo_produto, sigla_unidade')
          .single()

        if (insertError) {
          console.error('[PRODUTOS-V2] Insert Error:', insertError)
          throw new Error(`Database operation failed: ${insertError.message}`)
        }

        const formattedProduto = {
          id: String(novoProduto.produto_id),
          foto: novoProduto.foto || undefined,
          descricao: novoProduto.descricao || '',
          codigoSku: novoProduto.codigo_sku || '',
          codigoEan: novoProduto.gtin || undefined,
          marcaId: novoProduto.marca ? String(novoProduto.marca) : '',
          nomeMarca: novoProduto.nome_marca || marca.nome,
          tipoProdutoId: novoProduto.tipo_id ? String(novoProduto.tipo_id) : '',
          nomeTipoProduto: novoProduto.nome_tipo_produto || tipo.nome,
          ncm: novoProduto.ncm || undefined,
          cest: novoProduto.cest || undefined,
          unidadeId: novoProduto.unidade_id ? String(novoProduto.unidade_id) : '',
          siglaUnidade: novoProduto.sigla_unidade || unidade?.sigla || '',
          pesoLiquido: novoProduto.peso_liquido || 0,
          pesoBruto: novoProduto.peso_bruto || 0,
          situacao: novoProduto.situacao || 'Ativo',
          ativo: novoProduto.ativo !== false,
          disponivel: novoProduto.disponivel !== false,
          createdAt: novoProduto.created_at ? new Date(novoProduto.created_at).toISOString() : new Date().toISOString(),
          updatedAt: novoProduto.updated_at ? new Date(novoProduto.updated_at).toISOString() : new Date().toISOString(),
        }

        const duration = Date.now() - startTime
        console.log(`[PRODUTOS-V2] SUCCESS: Created produto ${formattedProduto.id} (${duration}ms)`)

        return createHttpSuccessResponse(
          formattedProduto,
          201,
          { userId: user.id, duration: `${duration}ms` }
        )
      }

      case 'update': {
        console.log('[PRODUTOS-V2] Updating produto...', body)

        if (!body.id) {
          throw new Error('ID é obrigatório para atualização')
        }

        const updateData: any = {}

        if (body.descricao !== undefined) {
          updateData.descricao = body.descricao.trim()
        }

        if (body.codigoSku !== undefined) {
          updateData.codigo_sku = body.codigoSku.trim()
        }

        if (body.codigoEan !== undefined) {
          updateData.gtin = body.codigoEan || null
        }

        if (body.marcaId !== undefined) {
          updateData.marca = parseInt(body.marcaId)
          // Buscar nome da marca
          const { data: marca } = await supabase
            .from('marcas')
            .select('nome')
            .eq('id', parseInt(body.marcaId))
            .single()
          if (marca) {
            updateData.nome_marca = marca.nome
          }
        }

        if (body.tipoProdutoId !== undefined) {
          updateData.tipo_id = parseInt(body.tipoProdutoId)
          // Buscar nome do tipo
          const { data: tipo } = await supabase
            .from('ref_tipo_produto')
            .select('nome')
            .eq('id', parseInt(body.tipoProdutoId))
            .single()
          if (tipo) {
            updateData.nome_tipo_produto = tipo.nome
          }
        }

        if (body.unidadeId !== undefined) {
          updateData.unidade_id = parseInt(body.unidadeId)
          // Buscar sigla da unidade
          const { data: unidade } = await supabase
            .from('ref_unidade_medida')
            .select('sigla')
            .eq('id', parseInt(body.unidadeId))
            .single()
          if (unidade) {
            updateData.sigla_unidade = unidade.sigla
          }
        }

        if (body.ncm !== undefined) {
          updateData.ncm = body.ncm || null
        }

        if (body.cest !== undefined) {
          updateData.cest = body.cest || null
        }

        if (body.pesoLiquido !== undefined) {
          updateData.peso_liquido = body.pesoLiquido || 0
        }

        if (body.pesoBruto !== undefined) {
          updateData.peso_bruto = body.pesoBruto || 0
        }

        if (body.situacao !== undefined) {
          updateData.situacao = body.situacao
          updateData.ativo = body.situacao === 'Ativo'
        }

        if (body.disponivel !== undefined) {
          updateData.disponivel = body.disponivel
        }

        if (body.foto !== undefined) {
          updateData.foto = body.foto || null
        }

        updateData.updated_at = new Date().toISOString()

        const { data: produtoAtualizado, error: updateError } = await supabase
          .from('produto')
          .update(updateData)
          .eq('produto_id', parseInt(body.id))
          .select('produto_id, foto, descricao, codigo_sku, gtin, marca, tipo_id, ncm, cest, unidade_id, peso_liquido, peso_bruto, situacao, ativo, disponivel, created_at, updated_at, nome_marca, nome_tipo_produto, sigla_unidade')
          .single()

        if (updateError) {
          console.error('[PRODUTOS-V2] Update Error:', updateError)
          throw new Error(`Database operation failed: ${updateError.message}`)
        }

        if (!produtoAtualizado) {
          throw new Error('Produto não encontrado')
        }

        const formattedProduto = {
          id: String(produtoAtualizado.produto_id),
          foto: produtoAtualizado.foto || undefined,
          descricao: produtoAtualizado.descricao || '',
          codigoSku: produtoAtualizado.codigo_sku || '',
          codigoEan: produtoAtualizado.gtin || undefined,
          marcaId: produtoAtualizado.marca ? String(produtoAtualizado.marca) : '',
          nomeMarca: produtoAtualizado.nome_marca || '',
          tipoProdutoId: produtoAtualizado.tipo_id ? String(produtoAtualizado.tipo_id) : '',
          nomeTipoProduto: produtoAtualizado.nome_tipo_produto || '',
          ncm: produtoAtualizado.ncm || undefined,
          cest: produtoAtualizado.cest || undefined,
          unidadeId: produtoAtualizado.unidade_id ? String(produtoAtualizado.unidade_id) : '',
          siglaUnidade: produtoAtualizado.sigla_unidade || '',
          pesoLiquido: produtoAtualizado.peso_liquido || 0,
          pesoBruto: produtoAtualizado.peso_bruto || 0,
          situacao: produtoAtualizado.situacao || 'Ativo',
          ativo: produtoAtualizado.ativo !== false,
          disponivel: produtoAtualizado.disponivel !== false,
          createdAt: produtoAtualizado.created_at ? new Date(produtoAtualizado.created_at).toISOString() : new Date().toISOString(),
          updatedAt: produtoAtualizado.updated_at ? new Date(produtoAtualizado.updated_at).toISOString() : new Date().toISOString(),
        }

        const duration = Date.now() - startTime
        console.log(`[PRODUTOS-V2] SUCCESS: Updated produto ${formattedProduto.id} (${duration}ms)`)

        return createHttpSuccessResponse(
          formattedProduto,
          200,
          { userId: user.id, duration: `${duration}ms` }
        )
      }

      case 'delete': {
        console.log('[PRODUTOS-V2] Deleting produto...', body)

        if (!body.id) {
          throw new Error('ID é obrigatório para exclusão')
        }

        // Soft delete
        const { error: deleteError } = await supabase
          .from('produto')
          .update({ deleted_at: new Date().toISOString(), situacao: 'Excluído', ativo: false })
          .eq('produto_id', parseInt(body.id))

        if (deleteError) {
          console.error('[PRODUTOS-V2] Delete Error:', deleteError)
          throw new Error(`Database operation failed: ${deleteError.message}`)
        }

        const duration = Date.now() - startTime
        console.log(`[PRODUTOS-V2] SUCCESS: Deleted produto ${body.id} (${duration}ms)`)

        return createHttpSuccessResponse(
          { success: true, message: 'Produto excluído com sucesso' },
          200,
          { userId: user.id, duration: `${duration}ms` }
        )
      }

      default:
        throw new Error(`Ação inválida: ${action}. Use: list, get, create, update ou delete`)
    }
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[PRODUTOS-V2] EXCEPTION:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`
    })
    return formatErrorResponse(error)
  }
})
