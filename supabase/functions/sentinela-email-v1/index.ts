// sentinela-email-v1 — faz o alarme da sentinela CHEGAR em alguém.
//
// Por que existe: a sentinela verifica 8 regras críticas todo dia às 6h e grava
// as violações em `sentinela_alerta`. Até aqui esse resultado só existia dentro
// do banco, esperando alguém abrir uma tela. Detector de fumaça sem bateria.
//
// Todo problema caro deste sistema seguiu o mesmo roteiro: quebrava em silêncio
// e o cliente descobria dias depois, no prejuízo. Este e-mail fecha esse ciclo.
//
// Regras de comportamento:
//   * Não manda e-mail quando está tudo certo. Alarme que apita todo dia vira
//     ruído e a pessoa cria o hábito de ignorar — que é o defeito que a
//     sentinela existe para evitar.
//   * Nunca deixa o cron falhar: erro de envio é registrado e devolve 200.
//     O importante é a verificação ter rodado; o e-mail é o mensageiro.
//
// Disparo: cron `sentinela-email-diaria`, 15 min depois da verificação.
// Manual: POST com header `x-sentinela-secret` igual ao secret configurado.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DESTINO_PADRAO = 'lucas.carmo@flowcode.cc'
const REMETENTE = 'ProSeller <proseller@flowcode.cc>'

/** Texto humano de cada regra. Quem lê o e-mail não conhece o banco. */
const REGRAS: Record<string, { titulo: string; oQueFazer: string }> = {
  wipe_campo_cliente: {
    titulo: 'Campo de cliente apagado',
    oQueFazer: 'Um campo que tinha valor ficou vazio. Confira o cliente na tela; o valor anterior está no histórico e pode ser devolvido.',
  },
  comissao_pedido_excluido: {
    titulo: 'Comissão de pedido excluído',
    oQueFazer: 'Existe comissão com valor num pedido que foi excluído. Deveria ter sido estornada — confira antes de fechar o período.',
  },
  pedido_aberto_sem_tiny: {
    titulo: 'Pedido sem confirmação do ERP',
    oQueFazer: 'Pedido marcado como enviado, mas sem número do Tiny. Pode não ter chegado ao ERP — confira e reenvie se preciso.',
  },
  frete_entregue_preso: {
    titulo: 'Frete entregue preso em trânsito',
    oQueFazer: 'A transportadora registrou a entrega mas o frete não fechou. Abra o frete e use "Atualizar rastreio".',
  },
  cep_invalido: {
    titulo: 'CEP fora do padrão',
    oQueFazer: 'CEP gravado com formato quebrado. Corrija no cadastro do cliente — CEP errado atrapalha a emissão.',
  },
  cliente_novo_sem_condicao: {
    titulo: 'Cliente novo sem condição de pagamento',
    oQueFazer: 'Cliente cadastrado sem condição. Ele não conseguirá fechar pedido — defina a condição no cadastro.',
  },
  condicao_nome_divergente: {
    titulo: 'Condição parcelada com nome divergente',
    oQueFazer: 'O nome da condição não reflete as parcelas configuradas. Confira em Configurações > Condições de Pagamento.',
  },
  regime_lookup_falhou: {
    titulo: 'Consulta do Simples Nacional falhou',
    oQueFazer: 'A Receita não respondeu e a emissão foi bloqueada. Normalmente é temporário: tente enviar o pedido de novo.',
  },
}

const rotulo = (regra: string) => REGRAS[regra]?.titulo ?? regra
const oQueFazer = (regra: string) => REGRAS[regra]?.oQueFazer ?? ''

const escapar = (t: unknown) =>
  String(t ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string))

/** Frase legível a partir do detalhe do alerta. */
function resumir(regra: string, d: Record<string, unknown> | null): string {
  if (!d) return ''
  const v = (k: string) => (d[k] === undefined || d[k] === null ? '' : String(d[k]))
  switch (regra) {
    case 'wipe_campo_cliente':
      return `Cliente ${v('cliente_id')} · campo "${v('label') || v('campo')}" · valor perdido: "${v('valor_anterior')}"`
    case 'comissao_pedido_excluido':
      return `Pedido ${v('pedido_id')} · R$ ${v('valor')}`
    case 'pedido_aberto_sem_tiny':
      return `Pedido ${v('numero')} · status "${v('status')}"`
    case 'frete_entregue_preso':
      return `NFe ${v('nfe')} · status "${v('status')}"`
    case 'cep_invalido':
      return `CEP gravado: "${v('cep')}"`
    case 'cliente_novo_sem_condicao':
      return `${v('nome')}`
    case 'condicao_nome_divergente':
      return `"${v('nome')}" · parcelas: ${v('intervalo')}`
    case 'regime_lookup_falhou':
      return `${v('razao_social')} · motivo: ${v('motivo')}`
    default:
      return ''
  }
}

Deno.serve(async (req) => {
  const inicio = Date.now()
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const destino = Deno.env.get('SENTINELA_EMAIL_DESTINO') || DESTINO_PADRAO

    const { data: alertas, error } = await supabase
      .from('sentinela_alerta')
      .select('regra, detalhe, criado_em')
      .is('resolvido_em', null)
      .order('criado_em', { ascending: false })
      .limit(200)

    if (error) throw new Error(`Falha ao ler alertas: ${error.message}`)

    // Tudo certo = silêncio. Alarme que apita todo dia é alarme ignorado.
    if (!alertas || alertas.length === 0) {
      console.log('[SENTINELA-EMAIL] nenhuma violação — nenhum e-mail enviado')
      return new Response(
        JSON.stringify({ success: true, alertas: 0, enviado: false, motivo: 'sem violações' }),
        { headers: { 'Content-Type': 'application/json' } },
      )
    }

    // Agrupa por regra: 30 alertas do mesmo tipo são UM problema, não 30.
    const porRegra = new Map<string, typeof alertas>()
    for (const a of alertas) {
      const lista = porRegra.get(a.regra) ?? []
      lista.push(a)
      porRegra.set(a.regra, lista)
    }

    const blocos = [...porRegra.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([regra, itens]) => {
        const linhas = itens.slice(0, 10)
          .map((i) => `<li style="margin:3px 0;">${escapar(resumir(regra, i.detalhe as any))}</li>`)
          .join('')
        const resto = itens.length > 10
          ? `<li style="margin:3px 0;color:#666;">…e mais ${itens.length - 10}. A lista completa está na tela Sentinela.</li>`
          : ''
        return `
        <div style="margin:0 0 22px;padding:14px 16px;border-left:4px solid #b45309;background:#fffbeb;">
          <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:#92400e;">
            ${escapar(rotulo(regra))} <span style="font-weight:400;">(${itens.length})</span>
          </p>
          <p style="margin:0 0 8px;font-size:13px;color:#78350f;">${escapar(oQueFazer(regra))}</p>
          <ul style="margin:0;padding-left:18px;font-size:13px;color:#444;">${linhas}${resto}</ul>
        </div>`
      })
      .join('')

    const total = alertas.length
    const html = `
      <html><body style="font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1f2937;max-width:640px;margin:0 auto;padding:24px;">
        <h2 style="color:#1e40af;border-bottom:3px solid #1e40af;padding-bottom:8px;margin:0 0 4px;">
          ProSeller · Verificação diária
        </h2>
        <p style="font-size:14px;color:#374151;margin:12px 0 20px;">
          A verificação automática encontrou <strong>${total} ponto${total > 1 ? 's' : ''} de atenção</strong>
          ${porRegra.size > 1 ? `em ${porRegra.size} regras diferentes` : ''}.
          Cada item abaixo indica o que fazer.
        </p>
        ${blocos}
        <p style="font-size:13px;color:#374151;margin:24px 0 0;">
          A lista completa fica em <strong>Sentinela</strong>, no menu do sistema.
          Um alerta some sozinho quando o problema é resolvido.
        </p>
        <p style="font-size:11px;color:#9ca3af;margin-top:18px;border-top:1px solid #e5e7eb;padding-top:10px;">
          E-mail automático. Só é enviado quando há algo a tratar — se não chegar, está tudo em ordem.
        </p>
      </body></html>`

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: REMETENTE,
        to: [destino],
        subject: `ProSeller · ${total} ponto${total > 1 ? 's' : ''} de atenção`,
        html,
      }),
    })

    if (!resp.ok) {
      const err = await resp.text()
      console.error('[SENTINELA-EMAIL] Resend recusou:', err)
      // 200 de propósito: o cron não deve entrar em estado de falha por causa do
      // mensageiro. A verificação em si já rodou e os alertas estão gravados.
      return new Response(
        JSON.stringify({ success: false, alertas: total, enviado: false, erro: err.slice(0, 300) }),
        { headers: { 'Content-Type': 'application/json' } },
      )
    }

    console.log(`[SENTINELA-EMAIL] enviado para ${destino}: ${total} alerta(s) em ${Date.now() - inicio}ms`)
    return new Response(
      JSON.stringify({ success: true, alertas: total, enviado: true, destino }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    console.error('[SENTINELA-EMAIL] erro:', e)
    return new Response(
      JSON.stringify({ success: false, erro: String(e).slice(0, 300) }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  }
})
