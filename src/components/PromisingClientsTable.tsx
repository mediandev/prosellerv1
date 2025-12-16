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
  TrendingUp,
  Search,
  Download,
  Star,
  Sparkles
} from "lucide-react";
import { PromisingClient } from "../types/clientRisk";
import { toast } from "sonner@2.0.3";

interface PromisingClientsTableProps {
  clients: PromisingClient[];
  onExport: () => void;
}

export function PromisingClientsTable({ clients, onExport }: PromisingClientsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<'aumentoPercentual' | 'aumentoValor' | 'nome'>('aumentoPercentual');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filtrar clientes
  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.vendedor.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  // Ordenar clientes
  const sortedClients = [...filteredClients].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'aumentoPercentual':
        comparison = a.aumentoPercentual - b.aumentoPercentual;
        break;
      case 'aumentoValor':
        comparison = a.aumentoValor - b.aumentoValor;
        break;
      case 'nome':
        comparison = a.nome.localeCompare(b.nome);
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const getAumentoBadge = (percentual: number) => {
    if (percentual >= 100) {
      return { variant: 'default' as const, icon: Sparkles, label: 'Excepcional' };
    } else if (percentual >= 50) {
      return { variant: 'default' as const, icon: Star, label: 'Excelente' };
    } else if (percentual >= 20) {
      return { variant: 'secondary' as const, icon: TrendingUp, label: 'Muito Bom' };
    } else {
      return { variant: 'outline' as const, icon: TrendingUp, label: 'Bom' };
    }
  };

  const handleAction = (action: string, client: PromisingClient) => {
    switch (action) {
      case 'email':
        toast.success(`Email de agradecimento preparado para ${client.nome}`);
        break;
      case 'call':
        toast.success(`Ligação de follow-up agendada para ${client.nome}`);
        break;
      case 'upsell':
        toast.success(`Oportunidade de upsell marcada para ${client.nome}`);
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

        <Select value={sortField} onValueChange={(value: any) => setSortField(value)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="aumentoPercentual">% Aumento</SelectItem>
            <SelectItem value="aumentoValor">Valor Aumento</SelectItem>
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
        <div className="p-4 border rounded-lg border-green-200 bg-green-50/50">
          <p className="text-xs text-muted-foreground">Total Clientes</p>
          <p className="text-2xl font-bold text-green-600">
            {sortedClients.length}
          </p>
        </div>
        <div className="p-4 border rounded-lg border-blue-200 bg-blue-50/50">
          <p className="text-xs text-muted-foreground">Crescimento &gt;50%</p>
          <p className="text-2xl font-bold text-blue-600">
            {sortedClients.filter(c => c.aumentoPercentual >= 50).length}
          </p>
        </div>
        <div className="p-4 border rounded-lg border-purple-200 bg-purple-50/50">
          <p className="text-xs text-muted-foreground">Crescimento &gt;100%</p>
          <p className="text-2xl font-bold text-purple-600">
            {sortedClients.filter(c => c.aumentoPercentual >= 100).length}
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-xs text-muted-foreground">Aumento Total</p>
          <p className="text-2xl font-bold text-green-600">
            R$ {(sortedClients.reduce((sum, c) => sum + c.aumentoValor, 0) / 1000).toFixed(0)}k
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
              <TableHead className="text-right">Aumento (R$)</TableHead>
              <TableHead className="text-center">Aumento (%)</TableHead>
              <TableHead className="text-center">Vendas</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhum cliente com aumento de compras encontrado
                </TableCell>
              </TableRow>
            ) : (
              sortedClients.map((client) => {
                const aumentoConfig = getAumentoBadge(client.aumentoPercentual);
                const Icon = aumentoConfig.icon;
                
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
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="font-medium text-green-600">
                          R$ {client.aumentoValor.toLocaleString('pt-BR', { 
                            minimumFractionDigits: 2 
                          })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={aumentoConfig.variant} className="text-green-600 border-green-300">
                        <Icon className="h-3 w-3 mr-1" />
                        +{client.aumentoPercentual.toFixed(1)}%
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
                            title="Agradecer"
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
                          onClick={() => handleAction('upsell', client)}
                          title="Oportunidade de Upsell"
                        >
                          <Star className="h-4 w-4" />
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
