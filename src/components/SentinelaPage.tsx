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
  resumirAlerta,
  agruparPorRegra,
  type SentinelaAlerta,
} from '../services/sentinelaService';

const formatarDataHora = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

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
  const grupos = agruparPorRegra(alertas);

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

      {grupos.map(({ regra, itens }) => (
        <Card key={regra}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              {rotuloRegra(regra)}
              <Badge variant="secondary">{itens.length}</Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">{explicacaoRegra(regra)}</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {itens.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <span>{resumirAlerta(a)}</span>
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
