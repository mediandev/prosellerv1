// AuditoriaPage — registro de ações com impacto (migration 154).
//
// Decisão do cliente (2026-08-03): (a) registrar ações que importam, não toda
// alteração de campo · (b) visível só com permissão específica · (c) sem expurgo.
//
// Somente leitura, por definição: registro de auditoria que pode ser editado
// pela própria tela não vale como auditoria.

import { useEffect, useState } from 'react';
import { RefreshCw, ScrollText } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  listarAuditoria,
  listarEntidades,
  descreverDetalhe,
  rotuloAcao,
  tomAcao,
  type RegistroAuditoria,
} from '../services/auditoriaService';

/** Maiúscula só na primeira letra. A classe `capitalize` do CSS maiusculiza
 *  TODA palavra ("Alterou As Permissões De Cicero"), que foi o que apareceu em
 *  produção na V 1.86. */
const primeiraMaiuscula = (t: string): string =>
  t ? t.charAt(0).toUpperCase() + t.slice(1) : t;

const formatarDataHora = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
};

export function AuditoriaPage() {
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([]);
  const [entidades, setEntidades] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [entidade, setEntidade] = useState('');
  const [usuario, setUsuario] = useState('');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');

  const carregar = async () => {
    setCarregando(true);
    setErro(null);
    try {
      setRegistros(await listarAuditoria({ entidade, usuario, de, ate }));
    } catch (e) {
      // Erro limpa a lista de propósito: mostrar resultado antigo como se fosse
      // o novo já enganou o usuário antes (filtro de NFe, V1.73).
      setErro(e instanceof Error ? e.message : 'Falha ao carregar o registro.');
      setRegistros([]);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    void carregar();
    void listarEntidades().then(setEntidades);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Auditoria</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registro das ações com impacto: quem fez, quando, e o que mudou.
            Mantido sem prazo de expurgo.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void carregar()} disabled={carregando}>
          <RefreshCw className={`h-4 w-4 mr-2 ${carregando ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 grid gap-3 md:grid-cols-5">
          <div className="md:col-span-1">
            <label className="text-xs text-muted-foreground">Tipo de registro</label>
            <select
              className="w-full h-9 rounded-md border bg-transparent px-3 text-sm"
              value={entidade}
              onChange={(e) => setEntidade(e.target.value)}
            >
              <option value="">Todos</option>
              {entidades.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="text-xs text-muted-foreground">Quem fez</label>
            <Input value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="Nome..." />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">De</label>
            <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Até</label>
            <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={() => void carregar()} disabled={carregando}>
              Filtrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {erro && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6 text-sm text-destructive">{erro}</CardContent>
        </Card>
      )}

      {!erro && !carregando && registros.length === 0 && (
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <ScrollText className="h-6 w-6 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="font-medium">Nenhuma ação registrada</p>
              <p className="text-sm text-muted-foreground">
                Nada corresponde aos filtros, ou ainda não houve ação registrável no período.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {registros.length > 0 && (
        <Card>
          <CardContent className="pt-6 space-y-2">
            <p className="text-sm text-muted-foreground">
              {registros.length} registro{registros.length !== 1 ? 's' : ''}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4 whitespace-nowrap">Quando</th>
                    <th className="py-2 pr-4">Quem</th>
                    <th className="py-2 pr-4">Ação</th>
                    <th className="py-2 pr-4">O quê</th>
                    <th className="py-2">Mudança</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 align-top">
                      <td className="py-2 pr-4 whitespace-nowrap">{formatarDataHora(r.ocorrido_em)}</td>
                      <td className="py-2 pr-4 whitespace-nowrap">{r.usuario_nome}</td>
                      <td className="py-2 pr-4">
                        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${tomAcao(r.acao)}`}>
                          {rotuloAcao(r.acao)}
                        </span>
                      </td>
                      {/* A descrição já vem pronta do banco e cita o nome
                          ("alterou as permissões de Cicero Rocha Costa").
                          Mostrar entidade + identificador cru exibia coisas como
                          "Usuário #65b5ce3c-b94f-4ac5-..." — verdadeiro e inútil. */}
                      <td className="py-2 pr-4">
                        <span>{primeiraMaiuscula(r.descricao)}</span>
                        <span className="block text-xs text-muted-foreground">
                          {r.entidade}
                          {r.entidade_id && r.entidade_id.length <= 12 ? ` #${r.entidade_id}` : ''}
                        </span>
                      </td>
                      <td className="py-2 text-muted-foreground">{descreverDetalhe(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default AuditoriaPage;
