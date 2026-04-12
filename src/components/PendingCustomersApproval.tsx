import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { AlertCircle, CheckCircle, XCircle, Eye, Search, User, Calendar, Loader2 } from 'lucide-react';
import { Cliente } from '../types/customer';
import { CustomerFormPage } from './CustomerFormPage';
import { api } from '../services/api';
import { toast } from 'sonner@2.0.3';

interface PendingCustomersApprovalProps {
  onVoltar?: () => void;
}

export function PendingCustomersApproval({ onVoltar }: PendingCustomersApprovalProps) {
  const { usuario, temPermissao } = useAuth();
  
  const [filtro, setFiltro] = useState('');
  const [visualizandoCliente, setVisualizandoCliente] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [clientesPendentes, setClientesPendentes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  const podeAprovarCliente = temPermissao('clientes.aprovar');

  // Load pending clients from API
  const loadClientesPendentes = async () => {
    try {
      setLoading(true);
      const data = await api.clientes.getPendentes();
      setClientesPendentes(data);
    } catch (error) {
      console.error('Failed to load pending clients:', error);
      toast.error('Erro ao carregar clientes pendentes');
    } finally {
      setLoading(false);
    }
  };

  // Load on mount and when returning to list
  useEffect(() => {
    if (!visualizandoCliente) {
      loadClientesPendentes();
    }
  }, [visualizandoCliente]);

  // Filtrar clientes pendentes
  const clientesFiltrados = useMemo(() => {
    if (!filtro) return clientesPendentes;
    
    const filtroLower = filtro.toLowerCase();
    return clientesPendentes.filter(c => 
      c.razaoSocial?.toLowerCase().includes(filtroLower) ||
      c.cpfCnpj?.includes(filtro) ||
      c.nomeFantasia?.toLowerCase().includes(filtroLower)
    );
  }, [filtro, clientesPendentes]);

  const formatCpfCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length === 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleVisualizar = (cliente: Cliente) => {
    setClienteSelecionado(cliente);
    setVisualizandoCliente(true);
  };

  const handleAprovar = () => {
    setVisualizandoCliente(false);
    setClienteSelecionado(null);
  };

  const handleRejeitar = () => {
    setVisualizandoCliente(false);
    setClienteSelecionado(null);
  };

  const handleVoltarLista = () => {
    setVisualizandoCliente(false);
    setClienteSelecionado(null);
  };

  // Se está visualizando um cliente, mostrar o formulário de aprovação
  if (visualizandoCliente && clienteSelecionado) {
    return (
      <CustomerFormPage
        clienteId={clienteSelecionado.id}
        modo="aprovar"
        onVoltar={handleVoltarLista}
        onAprovar={handleAprovar}
        onRejeitar={handleRejeitar}
      />
    );
  }

  if (!podeAprovarCliente) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Você não tem permissão para aprovar cadastros de clientes.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl">Clientes Pendentes de Aprovação</h1>
        <p className="text-muted-foreground mt-1">
          Analise e aprove ou rejeite cadastros de clientes realizados pelos vendedores
        </p>
      </div>

      {/* Card Principal */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Cadastros Pendentes</CardTitle>
              <CardDescription className="mt-2">
                {clientesFiltrados.length} {clientesFiltrados.length === 1 ? 'cadastro aguardando' : 'cadastros aguardando'} aprovação
              </CardDescription>
            </div>
            {clientesPendentes.length > 0 && (
              <Badge variant="destructive" className="text-base px-3 py-1">
                {clientesPendentes.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtro */}
          {clientesPendentes.length > 0 && (
            <div className="mb-6">
              <Label htmlFor="filtro">Pesquisar</Label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="filtro"
                  placeholder="Razão social, CNPJ/CPF, nome fantasia ou vendedor..."
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          )}

          {/* Tabela */}
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">
                Carregando clientes pendentes...
              </p>
            </div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <p className="text-muted-foreground">
                {clientesPendentes.length === 0 
                  ? 'Nenhum cadastro pendente de aprovação' 
                  : 'Nenhum resultado encontrado com os filtros aplicados'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead>Cadastrado por</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesFiltrados.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{cliente.razaoSocial}</div>
                          {cliente.nomeFantasia && (
                            <div className="text-sm text-muted-foreground">{cliente.nomeFantasia}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatCpfCnpj(cliente.cpfCnpj)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {cliente.criadoPor}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {formatDate(cliente.dataCadastro)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVisualizar(cliente)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Analisar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
