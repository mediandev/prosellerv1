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
  DollarSign, 
  Search,
  Download,
  AlertCircle
} from "lucide-react";
import { InactiveClient } from "../types/clientRisk";
import { toast } from "sonner@2.0.3";

interface InactiveClientsTableProps {
  clients: InactiveClient[];
  onExport: () => void;
}

export function InactiveClientsTable({ clients, onExport }: InactiveClientsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategoria, setFilterCategoria] = useState<string>("all");
  const [sortField, setSortField] = useState<'diasSemComprar' | 'ltvTotal' | 'nome'>('diasSemComprar');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filtrar clientes
  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.vendedor.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategoria = 
      filterCategoria === 'all' || 
      client.categoria === filterCategoria;

    return matchesSearch && matchesCategoria;
  });

  // Ordenar clientes
  const sortedClients = [...filteredClients].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'diasSemComprar':
        comparison = a.diasSemComprar - b.diasSemComprar;
        break;
      case 'ltvTotal':
        comparison = a.ltvTotal - b.ltvTotal;
        break;
      case 'nome':
        comparison = a.nome.localeCompare(b.nome);
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleAction = (action: string, client: InactiveClient) => {
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
        
        <Select value={filterCategoria} onValueChange={setFilterCategoria}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Categorias</SelectItem>
            <SelectItem value="nunca_comprou">Nunca Compraram</SelectItem>
            <SelectItem value="inativo">Inativos</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortField} onValueChange={(value: any) => setSortField(value)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="diasSemComprar">Dias sem Comprar</SelectItem>
            <SelectItem value="ltvTotal">Valor Total (LTV)</SelectItem>
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
        <div className="p-4 border rounded-lg">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{sortedClients.length}</p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-xs text-muted-foreground">Nunca Compraram</p>
          <p className="text-2xl font-bold text-red-600">
            {sortedClients.filter(c => c.categoria === 'nunca_comprou').length}
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-xs text-muted-foreground">Inativos</p>
          <p className="text-2xl font-bold text-orange-600">
            {sortedClients.filter(c => c.categoria === 'inativo').length}
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-xs text-muted-foreground">LTV Total Risco</p>
          <p className="text-2xl font-bold">
            R$ {(sortedClients.reduce((sum, c) => sum + c.ltvTotal, 0) / 1000).toFixed(0)}k
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
              <TableHead>Categoria</TableHead>
              <TableHead>Última Compra</TableHead>
              <TableHead className="text-right">Dias</TableHead>
              <TableHead className="text-right">Valor Última</TableHead>
              <TableHead className="text-right">LTV Total</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhum cliente inativo encontrado
                </TableCell>
              </TableRow>
            ) : (
              sortedClients.map((client) => (
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
                  <TableCell>
                    <Badge 
                      variant={client.categoria === 'nunca_comprou' ? 'destructive' : 'secondary'}
                    >
                      {client.categoria === 'nunca_comprou' ? (
                        <>
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Nunca Comprou
                        </>
                      ) : (
                        'Inativo'
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      {client.dataUltimaCompra ? (
                        <>
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {new Date(client.dataUltimaCompra).toLocaleDateString('pt-BR')}
                        </>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className={
                      client.diasSemComprar > 180 ? 'border-red-500 text-red-600' :
                      client.diasSemComprar > 90 ? 'border-orange-500 text-orange-600' :
                      'border-yellow-500 text-yellow-600'
                    }>
                      {client.diasSemComprar} dias
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {client.valorUltimaCompra > 0 ? (
                      <span className="text-sm">
                        R$ {client.valorUltimaCompra.toLocaleString('pt-BR', { 
                          minimumFractionDigits: 2 
                        })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-medium">
                      R$ {client.ltvTotal.toLocaleString('pt-BR', { 
                        minimumFractionDigits: 2 
                      })}
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
