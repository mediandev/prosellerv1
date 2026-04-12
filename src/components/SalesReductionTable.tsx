import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { 
  Mail, 
  Phone, 
  Calendar, 
  TrendingDown,
  Search,
  Download,
  AlertTriangle
} from "lucide-react";
import { SalesReduction } from "../types/clientRisk";
import { toast } from "sonner@2.0.3";

interface SalesReductionTableProps {
  clients: SalesReduction[];
  onExport: () => void;
}

export function SalesReductionTable({ clients, onExport }: SalesReductionTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSeveridade, setFilterSeveridade] = useState<string>("all");
  const [sortField, setSortField] = useState<'reducaoPercentual' | 'reducaoValor' | 'nome'>('reducaoPercentual');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filtrar clientes
  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.vendedor.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeveridade = 
      filterSeveridade === 'all' || 
      client.severidade === filterSeveridade;

    return matchesSearch && matchesSeveridade;
  });

  // Ordenar clientes
  const sortedClients = [...filteredClients].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'reducaoPercentual':
        comparison = a.reducaoPercentual - b.reducaoPercentual;
        break;
      case 'reducaoValor':
        comparison = a.reducaoValor - b.reducaoValor;
        break;
      case 'nome':
        comparison = a.nome.localeCompare(b.nome);
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const getSeveridadeBadge = (severidade: string) => {
    const config = {
      normal: { label: '0-5%', variant: 'default' as const, color: 'text-green-600' },
      atencao: { label: '5-20%', variant: 'secondary' as const, color: 'text-yellow-600' },
      alerta: { label: '20-50%', variant: 'outline' as const, color: 'text-orange-600' },
      critico: { label: '>50%', variant: 'destructive' as const, color: 'text-red-600' },
    };

    return config[severidade as keyof typeof config] || config.normal;
  };

  const handleAction = (action: string, client: SalesReduction) => {
    switch (action) {
      case 'email':
        toast.success(`Email preparado para ${client.nome}`);
        break;
      case 'call':
        toast.success(`Ligação agendada para ${client.nome}`);
        break;
      case 'followup':
        toast.success(`Follow-up marcado para ${client.nome}`);
        break;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, código ou vendedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filterSeveridade} onValueChange={setFilterSeveridade}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Severidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Severidades</SelectItem>
            <SelectItem value="critico">Crítico (&gt;50%)</SelectItem>
            <SelectItem value="alerta">Alerta (20-50%)</SelectItem>
            <SelectItem value="atencao">Atenção (5-20%)</SelectItem>
            <SelectItem value="normal">Normal (0-5%)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortField} onValueChange={(value: any) => setSortField(value)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="reducaoPercentual">% Redução</SelectItem>
            <SelectItem value="reducaoValor">Valor Redução</SelectItem>
            <SelectItem value="nome">Nome (A-Z)</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={onExport}>
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 border rounded-lg border-red-200 bg-red-50/50">
          <p className="text-xs text-muted-foreground">Crítico</p>
          <p className="text-2xl font-bold text-red-600">
            {sortedClients.filter(c => c.severidade === 'critico').length}
          </p>
        </div>
        <div className="p-4 border rounded-lg border-orange-200 bg-orange-50/50">
          <p className="text-xs text-muted-foreground">Alerta</p>
          <p className="text-2xl font-bold text-orange-600">
            {sortedClients.filter(c => c.severidade === 'alerta').length}
          </p>
        </div>
        <div className="p-4 border rounded-lg border-yellow-200 bg-yellow-50/50">
          <p className="text-xs text-muted-foreground">Atenção</p>
          <p className="text-2xl font-bold text-yellow-600">
            {sortedClients.filter(c => c.severidade === 'atencao').length}
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-xs text-muted-foreground">Valor em Risco</p>
          <p className="text-2xl font-bold">
            R$ {(sortedClients.reduce((sum, c) => sum + c.reducaoValor, 0) / 1000).toFixed(0)}k
          </p>
        </div>
      </div>

      {/* Tabela */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead className="text-right">Período Anterior</TableHead>
              <TableHead className="text-right">Período Atual</TableHead>
              <TableHead className="text-right">Redução (R$)</TableHead>
              <TableHead className="text-center">Redução (%)</TableHead>
              <TableHead className="text-center">Vendas</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhum cliente com redução de compras encontrado
                </TableCell>
              </TableRow>
            ) : (
              sortedClients.map((client) => {
                const severidadeConfig = getSeveridadeBadge(client.severidade);
                
                return (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{client.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {client.codigo} • {client.cidade}/{client.estado}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{client.vendedor}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        <p className="font-medium">
                          R$ {client.valorPeriodoAnterior.toLocaleString('pt-BR', { 
                            minimumFractionDigits: 2 
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {client.qtdVendasAnterior} {client.qtdVendasAnterior === 1 ? 'venda' : 'vendas'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        <p className="font-medium">
                          R$ {client.valorPeriodoAtual.toLocaleString('pt-BR', { 
                            minimumFractionDigits: 2 
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {client.qtdVendasAtual} {client.qtdVendasAtual === 1 ? 'venda' : 'vendas'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TrendingDown className="h-4 w-4 text-red-500" />
                        <span className="font-medium text-red-600">
                          R$ {client.reducaoValor.toLocaleString('pt-BR', { 
                            minimumFractionDigits: 2 
                          })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={severidadeConfig.variant} className={severidadeConfig.color}>
                        {client.severidade === 'critico' && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {client.reducaoPercentual.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm text-muted-foreground">
                        {client.qtdVendasAnterior} → {client.qtdVendasAtual}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        {client.email && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAction('email', client)}
                            title="Enviar email"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        )}
                        {client.telefone && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAction('call', client)}
                            title="Ligar"
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAction('followup', client)}
                          title="Agendar follow-up"
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
