// SentinelaPage — vitrine dos alertas de invariante gravados pela sentinela (migrations 148/150).
//
// Por que existe: a sentinela roda todo dia às 6h e grava violações em `sentinela_alerta`.
// Até V1.75 esses alertas só existiam no banco — detecção sem notificação, que na prática
// é quase igual a não ter. Esta tela é o destinatário do alarme.
//
// Somente leitura: a resolução é automática no banco quando a violação deixa de existir.

import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  listarAlertasAbertos,
  invalidarCacheSentinela,
  rotuloRegra,
  explicacaoRegra,
  type SentinelaAlerta,
} from '../services/sentinelaService';

const formatarDataHora = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/** Resumo legível do alerta a partir do jsonb `detalhe`, sem exigir leitura de JSON. */
function resumirDetalhe(alerta: SentinelaAlerta): string {
  const d = alerta.detalhe ?? {};
  const v = (k: string) => (d[k] === undefined || d[k] === null ? '' : String(d[k]));

  switch (alerta.regra) {
    case 'wipe_campo_cliente':
      return `Cliente ${v('cliente_id')} · campo "${v('label') || v('campo')}" · valor perdido: "${v('valor_anterior')}"`
        + (v('usuario') ? ` · por ${v('usuario')}` : '');
    case 'comissao_pedido_excluido':
      return `Pedido ${v('pedido_id')} · comissão de R$ ${v('valor')}`;
    case 'pedido_aberto_sem_tiny':
      return `Pedido ${v('numero')} · status "${v('status')}" sem ID do Tiny`;
    case 'frete_entregue_preso':
      return `NFe ${v('nfe')} · status atual "${v('status')}"`;
    case 'cep_invalido':
      return `CEP gravado: "${v('cep')}"`;
    case 'cliente_novo_sem_condicao':
      return `${v('nome')} · criado em ${v('criado_em') ? formatarDataHora(v('criado_em')) : '—'}`;
    case 'condicao_nome_divergente':
      return `"${v('nome')}" · intervalo configurado: ${v('intervalo')}`;
    default:
      return alerta.chave;
  }
}

export function SentinelaPage() {
  const [alertas, setAlertas] = useState<SentinelaAlerta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = async () => {
    setCarregando(true);
    setErro(null);
    try {
      invalidarCacheSentinela();
      setAlertas(await listarAlertasAbertos());
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar alertas.');
      setAlertas([]);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    void carregar();
  }, []);

  // Agrupa por regra para a tela não virar uma lista plana sem hierarquia.
  const porRegra = alertas.reduce<Record<string, SentinelaAlerta[]>>((acc, a) => {
    (acc[a.regra] ||= []).push(a);
    return acc;
  }, {});
  const regras = Object.keys(porRegra).sort((a, b) => porRegra[b].length - porRegra[a].length);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Sentinela</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Verificação automática diária (6h) das regras críticas do sistema. Um alerta aqui
            significa que uma regra está sendo violada <strong>agora</strong>.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void carregar()} disabled={carregando}>
          <RefreshCw className={`h-4 w-4 mr-2 ${carregando ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {erro && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6 text-sm text-destructive">{erro}</CardContent>
        </Card>
      )}

      {!erro && !carregando && alertas.length === 0 && (
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-medium">Nenhuma violação em aberto</p>
              <p className="text-sm text-muted-foreground">
                Todas as regras verificadas estão em conformidade na última execução.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {regras.map((regra) => (
        <Card key={regra}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              {rotuloRegra(regra)}
              <Badge variant="secondary">{porRegra[regra].length}</Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">{explicacaoRegra(regra)}</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {porRegra[regra].map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <span>{resumirDetalhe(a)}</span>
                <span className="text-xs text-muted-foreground">
                  detectado em {formatarDataHora(a.criado_em)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default SentinelaPage;
