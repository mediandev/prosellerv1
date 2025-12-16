import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Bell, Check, CheckCheck, Trash2, AlertCircle, UserPlus, UserCheck, X } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { ScrollArea } from './ui/scroll-area';
import { Notificacao, StatusNotificacao } from '../types/notificacao';
import { toast } from 'sonner@2.0.3';
import { api } from '../services/api';
import { getNotificacoesWithCache, clearNotificacoesCache } from '../services/notificacoesCache';

interface NotificationsMenuProps {
  onNavigate: (page: string) => void;
}

export function NotificationsMenu({ onNavigate }: NotificationsMenuProps) {
  const { usuario } = useAuth();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(false);

  // Load notifications from API with cache
  const loadNotificacoes = async () => {
    if (!usuario) {
      setNotificacoes([]);
      return;
    }
    
    try {
      const data = await getNotificacoesWithCache();
      setNotificacoes(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('[NOTIFICATIONS] Erro ao carregar notificações:', error);
      // Don't show error toast, just log it
      setNotificacoes([]);
    }
  };

  // Initial load
  useEffect(() => {
    loadNotificacoes();
  }, [usuario]);

  // Poll for new notifications every 10 seconds (increased from 5s to reduce load)
  useEffect(() => {
    const interval = setInterval(loadNotificacoes, 10000);
    return () => clearInterval(interval);
  }, [usuario]);

  // Filtrar notificações do usuário atual (já vem filtrado da API)
  const notificacoesUsuario = useMemo(() => {
    return notificacoes.filter(n => n.status !== 'arquivada');
  }, [notificacoes]);

  // Contar não lidas
  const naoLidas = useMemo(() => {
    return notificacoesUsuario.filter(n => n.status === 'nao_lida').length;
  }, [notificacoesUsuario]);

  const formatarData = (data: string) => {
    const agora = new Date();
    const dataNotificacao = new Date(data);
    const diffMs = agora.getTime() - dataNotificacao.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHoras < 24) return `${diffHoras}h atrás`;
    if (diffDias < 7) return `${diffDias}d atrás`;
    
    return dataNotificacao.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getIconeNotificacao = (tipo: string) => {
    switch (tipo) {
      case 'cliente_pendente_aprovacao':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'cliente_aprovado':
        return <UserCheck className="h-4 w-4 text-green-500" />;
      case 'cliente_rejeitado':
        return <X className="h-4 w-4 text-red-500" />;
      case 'pedido_novo':
        return <UserPlus className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const marcarComoLida = async (id: string) => {
    try {
      const dataLeitura = new Date().toISOString();
      await api.update('notificacoes', id, {
        status: 'lida' as StatusNotificacao,
        dataLeitura,
      });
      
      // Atualizar estado local
      setNotificacoes(prev =>
        prev.map(n =>
          n.id === id
            ? { ...n, status: 'lida' as StatusNotificacao, dataLeitura }
            : n
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast.error('Erro ao marcar notificação como lida');
    }
  };

  const marcarTodasComoLidas = async () => {
    try {
      await api.notificacoes.marcarTodasLidas();
      
      // Atualizar estado local
      const dataLeitura = new Date().toISOString();
      setNotificacoes(prev =>
        prev.map(n =>
          n.status === 'nao_lida'
            ? { ...n, status: 'lida' as StatusNotificacao, dataLeitura }
            : n
        )
      );
      
      toast.success('Todas as notificações foram marcadas como lidas');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Erro ao marcar notificações como lidas');
    }
  };

  const arquivarNotificacao = async (id: string) => {
    try {
      await api.update('notificacoes', id, {
        status: 'arquivada' as StatusNotificacao,
      });
      
      // Atualizar estado local
      setNotificacoes(prev =>
        prev.map(n =>
          n.id === id ? { ...n, status: 'arquivada' as StatusNotificacao } : n
        )
      );
      
      toast.success('Notificação arquivada');
    } catch (error) {
      console.error('Failed to archive notification:', error);
      toast.error('Erro ao arquivar notificação');
    }
  };

  const handleClickNotificacao = (notificacao: Notificacao) => {
    if (notificacao.status === 'nao_lida') {
      marcarComoLida(notificacao.id);
    }
    
    // Navegar baseado no tipo de notificação
    if (notificacao.tipo === 'cliente_pendente_aprovacao') {
      onNavigate('clientes-pendentes');
    } else if (notificacao.dadosAdicionais?.clienteId) {
      onNavigate('clientes');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {naoLidas > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {naoLidas > 9 ? '9+' : naoLidas}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <DropdownMenuLabel className="p-0 m-0">Notificações</DropdownMenuLabel>
          {naoLidas > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={marcarTodasComoLidas}
              className="h-8 text-xs"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {notificacoesUsuario.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Bell className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhuma notificação
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notificacoesUsuario.map((notificacao) => (
                <div
                  key={notificacao.id}
                  className={`p-4 hover:bg-accent/50 transition-colors cursor-pointer ${
                    notificacao.status === 'nao_lida' ? 'bg-accent/20' : ''
                  }`}
                  onClick={() => handleClickNotificacao(notificacao)}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getIconeNotificacao(notificacao.tipo)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className={`text-sm ${notificacao.status === 'nao_lida' ? 'font-semibold' : 'font-medium'}`}>
                          {notificacao.titulo}
                        </p>
                        {notificacao.status === 'nao_lida' && (
                          <div className="flex-shrink-0">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {notificacao.mensagem}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatarData(notificacao.dataCriacao)}
                        </span>
                        <div className="flex items-center gap-1">
                          {notificacao.status === 'nao_lida' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                marcarComoLida(notificacao.id);
                              }}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Lida
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              arquivarNotificacao(notificacao.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notificacoesUsuario.length > 0 && (
          <>
            <DropdownMenuSeparator className="m-0" />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full justify-center text-sm"
                disabled
              >
                Ver todas as notificações
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}