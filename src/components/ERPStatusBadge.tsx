import { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface ERPStatusBadgeProps {
  empresaId: string;
  showDetails?: boolean;
}

export function ERPStatusBadge({ empresaId, showDetails = true }: ERPStatusBadgeProps) {
  const [status, setStatus] = useState<'loading' | 'active' | 'inactive' | 'error'>('loading');
  const [details, setDetails] = useState<{ tipo?: string; hasToken?: boolean }>({});

  useEffect(() => {
    carregarStatus();
  }, [empresaId]);

  const carregarStatus = async () => {
    try {
      const config = await api.getERPConfig(empresaId);
      
      if (!config || !config.ativo) {
        setStatus('inactive');
        setDetails({ tipo: config?.tipo || 'tiny', hasToken: false });
        return;
      }

      if (!config.credenciais?.token) {
        setStatus('error');
        setDetails({ tipo: config.tipo, hasToken: false });
        return;
      }

      setStatus('active');
      setDetails({ tipo: config.tipo, hasToken: true });
    } catch (error) {
      console.error('Erro ao carregar status ERP:', error);
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Carregando...
      </Badge>
    );
  }

  if (status === 'inactive') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Badge variant="secondary" className="gap-1">
                <XCircle className="h-3 w-3" />
                {showDetails ? 'ERP Inativo' : 'Inativo'}
              </Badge>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Integração com ERP não configurada ou desativada</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (status === 'error') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                {showDetails ? 'ERP Erro' : 'Erro'}
              </Badge>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Erro na configuração do ERP. Token não encontrado.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-3 w-3" />
              {showDetails ? `${details.tipo?.toUpperCase()} Ativo` : 'Ativo'}
            </Badge>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Integração ativa e funcionando</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
