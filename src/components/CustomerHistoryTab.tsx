import { useEffect, useState } from 'react';
import { HistoricoAlteracao } from '../types/history';
import { historyService } from '../services/historyService';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import {
  Clock,
  Edit,
  Plus,
  Trash2,
  RefreshCw,
  Upload,
  UserPlus,
  UserMinus,
  FileText,
  Activity,
} from 'lucide-react';
import { format } from 'date-fns@4.1.0';
import { ptBR } from 'date-fns@4.1.0/locale';

interface CustomerHistoryTabProps {
  clienteId: string;
}

export function CustomerHistoryTab({ clienteId }: CustomerHistoryTabProps) {
  const [historico, setHistorico] = useState<HistoricoAlteracao[]>([]);

  useEffect(() => {
    const hist = historyService.getHistoricoByEntidade('cliente', clienteId);
    setHistorico(hist);
  }, [clienteId]);

  const getTipoIcon = (tipo: string) => {
    const icons: Record<string, any> = {
      criacao: Plus,
      edicao: Edit,
      exclusao: Trash2,
      sincronizacao_erp: RefreshCw,
      importacao: Upload,
      adicao_vendedor: UserPlus,
      remocao_vendedor: UserMinus,
      edicao_contato: FileText,
      edicao_condicao_comercial: Activity,
      mudanca_status: Activity,
    };
    return icons[tipo] || Clock;
  };

  const getTipoBadge = (tipo: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      criacao: { variant: 'default', label: 'Criação' },
      edicao: { variant: 'secondary', label: 'Edição' },
      exclusao: { variant: 'destructive', label: 'Exclusão' },
      sincronizacao_erp: { variant: 'outline', label: 'Sincronização ERP' },
      importacao: { variant: 'outline', label: 'Importação' },
      adicao_vendedor: { variant: 'default', label: 'Vendedor Adicionado' },
      remocao_vendedor: { variant: 'secondary', label: 'Vendedor Removido' },
      edicao_contato: { variant: 'secondary', label: 'Contato' },
      edicao_condicao_comercial: { variant: 'secondary', label: 'Condição Comercial' },
      mudanca_status: { variant: 'secondary', label: 'Status' },
    };
    
    const config = variants[tipo] || { variant: 'outline' as const, label: tipo };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatarValor = (valor: any): string => {
    if (valor === null || valor === undefined) return '-';
    if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';
    if (typeof valor === 'number') {
      // Se parece com valor monetário (tem casas decimais)
      if (valor % 1 !== 0 && valor < 1000000) {
        return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      return valor.toLocaleString('pt-BR');
    }
    if (typeof valor === 'object') return JSON.stringify(valor);
    return String(valor);
  };

  if (historico.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum histórico disponível para este cliente</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Alterações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {historico.map((item, index) => {
                const Icon = getTipoIcon(item.tipo);
                const dataFormatada = format(new Date(item.dataHora), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                  locale: ptBR,
                });

                return (
                  <div key={item.id} className="relative">
                    {/* Linha conectora */}
                    {index < historico.length - 1 && (
                      <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-border" />
                    )}

                    <div className="flex gap-4">
                      {/* Ícone */}
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 pb-8">
                        <div className="bg-card border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {getTipoBadge(item.tipo)}
                                <span className="text-sm text-muted-foreground">{dataFormatada}</span>
                              </div>
                              <p className="font-medium">{item.descricao}</p>
                            </div>
                          </div>

                          {/* Usuário */}
                          <div className="text-sm text-muted-foreground mt-2">
                            Por: <span className="font-medium">{item.usuarioNome}</span>
                          </div>

                          {/* Campos alterados */}
                          {item.camposAlterados && item.camposAlterados.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <p className="text-sm font-medium">Alterações:</p>
                              <div className="space-y-2">
                                {item.camposAlterados.map((campo, idx) => (
                                  <div
                                    key={idx}
                                    className="bg-muted/50 rounded p-3 text-sm"
                                  >
                                    <div className="font-medium mb-1">{campo.label}</div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <div className="flex-1">
                                        <span className="text-xs">De:</span>
                                        <div className="font-mono bg-background px-2 py-1 rounded mt-1">
                                          {formatarValor(campo.valorAnterior)}
                                        </div>
                                      </div>
                                      <div className="text-muted-foreground">→</div>
                                      <div className="flex-1">
                                        <span className="text-xs">Para:</span>
                                        <div className="font-mono bg-background px-2 py-1 rounded mt-1 text-primary">
                                          {formatarValor(campo.valorNovo)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Metadados */}
                          {item.metadados?.observacoes && (
                            <div className="mt-3 p-3 bg-muted/50 rounded text-sm">
                              <p className="font-medium mb-1">Observações:</p>
                              <p className="text-muted-foreground">{item.metadados.observacoes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
