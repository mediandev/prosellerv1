import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Progress } from "./ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { 
  Search, 
  Plus, 
  Filter, 
  Download, 
  MoreVertical, 
  Eye,
  Mail,
  Phone,
  MapPin,
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  ShoppingCart,
  Star,
  AlertCircle,
  Crown,
  Award
} from "lucide-react";

interface Customer {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  empresa: string;
  segmento: string; // Agora dinâmico, vindo das configurações
  status: "ativo" | "inativo" | "excluido";
  cidade: string;
  estado: string;
  dataCadastro: string;
  ultimaCompra: string;
  totalCompras: number;
  ticketMedio: number;
  ltv: number; // Lifetime Value
  nps: number; // Net Promoter Score
  frequenciaCompra: number; // dias
  riscoCancelamento: "baixo" | "medio" | "alto";
  vendedorResponsavel: string;
  vendedorIniciais: string;
  historico: Array<{
    data: string;
    tipo: "compra" | "contato" | "reuniao";
    descricao: string;
    valor?: number;
  }>;
}

const customers: Customer[] = [
  {
    id: "CLI-001",
    nome: "João Pedro Silva",
    email: "joao.silva@empresa.com",
    telefone: "(11) 98765-4321",
    empresa: "Empresa ABC Ltda",
    segmento: "VIP",
    status: "ativo",
    cidade: "São Paulo",
    estado: "SP",
    dataCadastro: "15/01/2024",
    ultimaCompra: "10/10/2025",
    totalCompras: 145000,
    ticketMedio: 12500,
    ltv: 180000,
    nps: 9,
    frequenciaCompra: 15,
    riscoCancelamento: "baixo",
    vendedorResponsavel: "João Silva",
    vendedorIniciais: "JS",
    historico: [
      { data: "10/10/2025", tipo: "compra", descricao: "Renovação de licença anual", valor: 12500 },
      { data: "05/10/2025", tipo: "reuniao", descricao: "Apresentação de novos produtos" },
      { data: "15/09/2025", tipo: "contato", descricao: "Follow-up comercial" }
    ]
  },
  {
    id: "CLI-002",
    nome: "Maria Oliveira",
    email: "maria@techsolutions.com.br",
    telefone: "(11) 98765-4322",
    empresa: "Tech Solutions S.A.",
    segmento: "Premium",
    status: "ativo",
    cidade: "Rio de Janeiro",
    estado: "RJ",
    dataCadastro: "22/02/2024",
    ultimaCompra: "08/10/2025",
    totalCompras: 98000,
    ticketMedio: 8900,
    ltv: 125000,
    nps: 8,
    frequenciaCompra: 20,
    riscoCancelamento: "baixo",
    vendedorResponsavel: "Maria Santos",
    vendedorIniciais: "MS",
    historico: [
      { data: "08/10/2025", tipo: "compra", descricao: "Módulo adicional", valor: 8300 },
      { data: "20/09/2025", tipo: "contato", descricao: "Suporte técnico" }
    ]
  },
  {
    id: "CLI-003",
    nome: "Carlos Eduardo Lima",
    email: "carlos@industriaxyz.com",
    telefone: "(11) 98765-4323",
    empresa: "Indústria XYZ",
    segmento: "VIP",
    status: "ativo",
    cidade: "Belo Horizonte",
    estado: "MG",
    dataCadastro: "10/03/2024",
    ultimaCompra: "12/10/2025",
    totalCompras: 280000,
    ticketMedio: 25800,
    ltv: 350000,
    nps: 10,
    frequenciaCompra: 30,
    riscoCancelamento: "baixo",
    vendedorResponsavel: "Carlos Oliveira",
    vendedorIniciais: "CO",
    historico: [
      { data: "12/10/2025", tipo: "compra", descricao: "Sistema completo + consultoria", valor: 25800 },
      { data: "01/10/2025", tipo: "reuniao", descricao: "Planejamento estratégico Q4" }
    ]
  },
  {
    id: "CLI-004",
    nome: "Ana Paula Costa",
    email: "ana@comerciobeta.com",
    telefone: "(11) 98765-4324",
    empresa: "Comércio Beta",
    segmento: "Standard",
    status: "ativo",
    cidade: "Curitiba",
    estado: "PR",
    dataCadastro: "05/04/2024",
    ultimaCompra: "15/10/2025",
    totalCompras: 32000,
    ticketMedio: 5600,
    ltv: 45000,
    nps: 7,
    frequenciaCompra: 45,
    riscoCancelamento: "medio",
    vendedorResponsavel: "Ana Paula",
    vendedorIniciais: "AP",
    historico: [
      { data: "15/10/2025", tipo: "compra", descricao: "Módulo básico", valor: 5600 },
      { data: "10/09/2025", tipo: "contato", descricao: "Solicitação de orçamento" }
    ]
  },
  {
    id: "CLI-005",
    nome: "Roberto Mendes",
    email: "roberto@servicosdelta.com",
    telefone: "(11) 98765-4325",
    empresa: "Serviços Delta",
    segmento: "Premium",
    status: "ativo",
    cidade: "Porto Alegre",
    estado: "RS",
    dataCadastro: "18/05/2024",
    ultimaCompra: "05/09/2025",
    totalCompras: 67000,
    ticketMedio: 15200,
    ltv: 95000,
    nps: 6,
    frequenciaCompra: 60,
    riscoCancelamento: "alto",
    vendedorResponsavel: "Pedro Costa",
    vendedorIniciais: "PC",
    historico: [
      { data: "05/09/2025", tipo: "compra", descricao: "Atualização de sistema", valor: 15200 },
      { data: "15/08/2025", tipo: "contato", descricao: "Reclamação - tempo de resposta" }
    ]
  },
  {
    id: "CLI-006",
    nome: "Fernanda Rodrigues",
    email: "fernanda@grupoomega.com.br",
    telefone: "(11) 98765-4326",
    empresa: "Grupo Omega",
    segmento: "vip",
    status: "ativo",
    cidade: "Brasília",
    estado: "DF",
    dataCadastro: "12/06/2024",
    ultimaCompra: "16/10/2025",
    totalCompras: 195000,
    ticketMedio: 32400,
    ltv: 280000,
    nps: 9,
    frequenciaCompra: 25,
    riscoCancelamento: "baixo",
    vendedorResponsavel: "João Silva",
    vendedorIniciais: "JS",
    historico: [
      { data: "16/10/2025", tipo: "compra", descricao: "Enterprise Suite", valor: 32400 },
      { data: "10/10/2025", tipo: "reuniao", descricao: "Review trimestral" }
    ]
  },
  {
    id: "CLI-007",
    nome: "Paulo Santos",
    email: "paulo@startupgamma.io",
    telefone: "(11) 98765-4327",
    empresa: "StartUp Gamma",
    segmento: "standard",
    status: "ativo",
    cidade: "São Paulo",
    estado: "SP",
    dataCadastro: "20/07/2024",
    ultimaCompra: "12/10/2025",
    totalCompras: 18500,
    ticketMedio: 7800,
    ltv: 28000,
    nps: 8,
    frequenciaCompra: 35,
    riscoCancelamento: "baixo",
    vendedorResponsavel: "Maria Santos",
    vendedorIniciais: "MS",
    historico: [
      { data: "12/10/2025", tipo: "compra", descricao: "Starter Pack", valor: 7800 }
    ]
  },
  {
    id: "CLI-008",
    nome: "Juliana Alves",
    email: "juliana@consultoriaalpha.com",
    telefone: "(11) 98765-4328",
    empresa: "Consultoria Alpha",
    segmento: "premium",
    status: "potencial",
    cidade: "Florianópolis",
    estado: "SC",
    dataCadastro: "15/08/2024",
    ultimaCompra: "11/10/2025",
    totalCompras: 18900,
    ticketMedio: 18900,
    ltv: 75000,
    nps: 7,
    frequenciaCompra: 90,
    riscoCancelamento: "medio",
    vendedorResponsavel: "Carlos Oliveira",
    vendedorIniciais: "CO",
    historico: [
      { data: "11/10/2025", tipo: "compra", descricao: "Primeira compra - Produto Premium", valor: 18900 },
      { data: "05/10/2025", tipo: "reuniao", descricao: "Apresentação comercial" }
    ]
  },
  {
    id: "CLI-009",
    nome: "Ricardo Ferreira",
    email: "ricardo@techcorp.net",
    telefone: "(11) 98765-4329",
    empresa: "Tech Corp",
    segmento: "standard",
    status: "inativo",
    cidade: "Salvador",
    estado: "BA",
    dataCadastro: "10/09/2024",
    ultimaCompra: "15/08/2025",
    totalCompras: 8400,
    ticketMedio: 4200,
    ltv: 12000,
    nps: 5,
    frequenciaCompra: 120,
    riscoCancelamento: "alto",
    vendedorResponsavel: "Ana Paula",
    vendedorIniciais: "AP",
    historico: [
      { data: "15/08/2025", tipo: "compra", descricao: "Módulo adicional", valor: 4200 },
      { data: "05/08/2025", tipo: "contato", descricao: "Cliente insatisfeito - preço" }
    ]
  }
];

const segmentoConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline"; icon: any; color: string }> = {
  "VIP": { label: "VIP", variant: "default" as const, icon: Crown, color: "text-yellow-500" },
  "Premium": { label: "Premium", variant: "secondary" as const, icon: Award, color: "text-purple-500" },
  "Standard": { label: "Standard", variant: "outline" as const, icon: Star, color: "text-blue-500" },
  "Corporativo": { label: "Corporativo", variant: "default" as const, icon: Award, color: "text-blue-600" },
  "PME": { label: "PME", variant: "secondary" as const, icon: Star, color: "text-green-500" },
  "Startup": { label: "Startup", variant: "outline" as const, icon: Star, color: "text-orange-500" }
};

const statusConfig = {
  ativo: { label: "Ativo", variant: "default" as const },
  inativo: { label: "Inativo", variant: "destructive" as const },
  excluido: { label: "Excluído", variant: "secondary" as const }
};

const riscoConfig = {
  baixo: { label: "Baixo", color: "text-green-500" },
  medio: { label: "Médio", color: "text-yellow-500" },
  alto: { label: "Alto", color: "text-red-500" }
};

export function CustomerManagement() {
  const [customers_state, setCustomers] = useState(customers);
  const [searchTerm, setSearchTerm] = useState("");
  const [segmentoFilter, setSegmentoFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Filtrar clientes
  const filteredCustomers = customers_state.filter(customer => {
    const matchesSearch = 
      customer.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSegmento = segmentoFilter === "all" || customer.segmento === segmentoFilter;
    const matchesStatus = statusFilter === "all" || customer.status === statusFilter;
    
    return matchesSearch && matchesSegmento && matchesStatus;
  });

  // Calcular KPIs
  const stats = {
    total: customers_state.length,
    ativos: customers_state.filter(c => c.status === "ativo").length,
    inativos: customers_state.filter(c => c.status === "inativo").length,
    potenciais: customers_state.filter(c => c.status === "potencial").length,
    ltvTotal: customers_state.reduce((sum, c) => sum + c.ltv, 0),
    ltvMedio: customers_state.reduce((sum, c) => sum + c.ltv, 0) / customers_state.length,
    npsMedia: customers_state.reduce((sum, c) => sum + c.nps, 0) / customers_state.length,
    vip: customers_state.filter(c => c.segmento === "vip").length,
    premium: customers_state.filter(c => c.segmento === "premium").length,
    standard: customers_state.filter(c => c.segmento === "standard").length,
    riscoAlto: customers_state.filter(c => c.riscoCancelamento === "alto").length
  };

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* KPIs Principais */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span>{stats.ativos} ativos</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">LTV Médio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(stats.ltvMedio / 1000).toFixed(0)}k
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total: R$ {(stats.ltvTotal / 1000).toFixed(0)}k
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">NPS Médio</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.npsMedia.toFixed(1)}/10</div>
            <p className="text-xs text-muted-foreground mt-1">
              Satisfação geral
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Risco de Cancelamento</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.riscoAlto}</div>
            <p className="text-xs text-muted-foreground mt-1">
              clientes em risco alto
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Segmentação de Clientes */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Crown className="h-4 w-4 text-yellow-500" />
              Clientes VIP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.vip}</div>
            <Progress value={(stats.vip / stats.total) * 100} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((stats.vip / stats.total) * 100)}% da base
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="h-4 w-4 text-purple-500" />
              Clientes Premium
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.premium}</div>
            <Progress value={(stats.premium / stats.total) * 100} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((stats.premium / stats.total) * 100)}% da base
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="h-4 w-4 text-blue-500" />
              Clientes Standard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.standard}</div>
            <Progress value={(stats.standard / stats.total) * 100} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((stats.standard / stats.total) * 100)}% da base
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Clientes */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Base de Clientes</CardTitle>
              <CardDescription>
                Gerencie seus clientes e acompanhe indicadores estratégicos
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Novo Cliente
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email, empresa ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={segmentoFilter} onValueChange={setSegmentoFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Segmento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Segmentos</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
                <SelectItem value="potencial">Potenciais</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabela */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>LTV</TableHead>
                  <TableHead>Ticket Médio</TableHead>
                  <TableHead>NPS</TableHead>
                  <TableHead>Risco</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhum cliente encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => {
                    const SegmentoIcon = segmentoConfig[customer.segmento].icon;
                    return (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{customer.nome}</p>
                            <p className="text-sm text-muted-foreground">{customer.empresa}</p>
                            <p className="text-xs text-muted-foreground">{customer.id}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <SegmentoIcon className={`h-4 w-4 ${segmentoConfig[customer.segmento].color}`} />
                            <Badge variant={segmentoConfig[customer.segmento].variant}>
                              {segmentoConfig[customer.segmento].label}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig[customer.status].variant}>
                            {statusConfig[customer.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            R$ {(customer.ltv / 1000).toFixed(0)}k
                          </span>
                        </TableCell>
                        <TableCell>
                          R$ {(customer.ticketMedio / 1000).toFixed(1)}k
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{customer.nps}/10</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm font-medium ${riscoConfig[customer.riscoCancelamento].color}`}>
                            {riscoConfig[customer.riscoCancelamento].label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {customer.vendedorIniciais}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{customer.vendedorResponsavel}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleViewCustomer(customer)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Mail className="h-4 w-4 mr-2" />
                                Enviar Email
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Phone className="h-4 w-4 mr-2" />
                                Ligar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Info */}
          {filteredCustomers.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Mostrando {filteredCustomers.length} de {customers_state.length} clientes
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalhes */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          {selectedCustomer && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-2xl">{selectedCustomer.nome}</DialogTitle>
                    <DialogDescription className="flex items-center gap-2 mt-1">
                      {selectedCustomer.empresa} • {selectedCustomer.id}
                    </DialogDescription>
                  </div>
                  <Badge variant={segmentoConfig[selectedCustomer.segmento].variant}>
                    {segmentoConfig[selectedCustomer.segmento].label}
                  </Badge>
                </div>
              </DialogHeader>

              <Tabs defaultValue="geral" className="mt-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="geral">Informações Gerais</TabsTrigger>
                  <TabsTrigger value="metricas">Métricas</TabsTrigger>
                  <TabsTrigger value="historico">Histórico</TabsTrigger>
                </TabsList>

                <TabsContent value="geral" className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Contato</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{selectedCustomer.email}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{selectedCustomer.telefone}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {selectedCustomer.cidade}, {selectedCustomer.estado}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Informações Comerciais</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Status</span>
                          <Badge variant={statusConfig[selectedCustomer.status].variant}>
                            {statusConfig[selectedCustomer.status].label}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Vendedor</span>
                          <span className="text-sm font-medium">
                            {selectedCustomer.vendedorResponsavel}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Cliente desde</span>
                          <span className="text-sm font-medium">
                            {selectedCustomer.dataCadastro}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="metricas" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Lifetime Value (LTV)</p>
                          <p className="text-3xl font-bold">
                            R$ {selectedCustomer.ltv.toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Total de Compras</p>
                          <p className="text-3xl font-bold">
                            R$ {selectedCustomer.totalCompras.toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Ticket Médio</p>
                          <p className="text-3xl font-bold">
                            R$ {selectedCustomer.ticketMedio.toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">NPS Score</p>
                          <div className="flex items-center gap-2">
                            <p className="text-3xl font-bold">{selectedCustomer.nps}/10</p>
                            <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Frequência de Compra</p>
                          <p className="text-3xl font-bold">
                            {selectedCustomer.frequenciaCompra} dias
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Risco de Cancelamento</p>
                          <p className={`text-3xl font-bold ${riscoConfig[selectedCustomer.riscoCancelamento].color}`}>
                            {riscoConfig[selectedCustomer.riscoCancelamento].label}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="historico" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Histórico de Interações</CardTitle>
                      <CardDescription>
                        Última compra: {selectedCustomer.ultimaCompra}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {selectedCustomer.historico.map((item, index) => (
                          <div key={index} className="flex gap-4 pb-4 border-b last:border-0">
                            <div className="flex flex-col items-center">
                              <div className={`p-2 rounded-full ${
                                item.tipo === "compra" ? "bg-green-100" :
                                item.tipo === "reuniao" ? "bg-blue-100" : "bg-gray-100"
                              }`}>
                                {item.tipo === "compra" && <ShoppingCart className="h-4 w-4 text-green-600" />}
                                {item.tipo === "reuniao" && <Calendar className="h-4 w-4 text-blue-600" />}
                                {item.tipo === "contato" && <Phone className="h-4 w-4 text-gray-600" />}
                              </div>
                              {index < selectedCustomer.historico.length - 1 && (
                                <div className="w-px h-8 bg-border mt-2" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium">{item.descricao}</p>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {item.data}
                                  </p>
                                </div>
                                {item.valor && (
                                  <Badge variant="outline">
                                    R$ {item.valor.toLocaleString('pt-BR')}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}