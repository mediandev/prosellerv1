import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart, 
  Target, 
  BarChart3, 
  Settings,
  Package,
  Menu,
  UserCircle,
  Wallet,
  DollarSign,
  LogOut
} from "lucide-react";
import { format } from "date-fns@4.1.0";
import { ptBR } from "date-fns@4.1.0/locale";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LoginPage } from "./components/LoginPage";
import { ForgotPasswordPage } from "./components/ForgotPasswordPage";
import { ProSellerLogo } from "./components/ProSellerLogo";
import { DashboardMetrics, DashboardFilters } from "./components/DashboardMetrics";
import { SalesChart } from "./components/SalesChart";
import { RecentSalesTable } from "./components/RecentSalesTable";
import { CanceledSalesTable } from "./components/CanceledSalesTable";
import { TopSellersCard } from "./components/TopSellersCard";
import { CustomerWalletCard } from "./components/CustomerWalletCard";
import { SegmentSalesCard } from "./components/SegmentSalesCard";
import { ABCCurveCard } from "./components/ABCCurveCard";
import { TeamManagement } from "./components/TeamManagement";
import { SalesPage } from "./components/SalesPage";
import { CustomersListPage } from "./components/CustomersListPage";
import { CustomerFormPage } from "./components/CustomerFormPage";
import { ProductsListPage } from "./components/ProductsListPage";
import { ProductFormPage } from "./components/ProductFormPage";
import { PriceListFormPage } from "./components/PriceListFormPage";
import { SaleFormPage } from "./components/SaleFormPage";
import { CommissionsManagement } from "./components/CommissionsManagement";
import { SellerCommissionsPage } from "./components/SellerCommissionsPage";
import { ContaCorrenteOverview } from "./components/ContaCorrenteOverview";
import { SettingsPage } from "./components/SettingsPage";
import { UserProfilePage } from "./components/UserProfilePage";
import { NotificationsMenu } from "./components/NotificationsMenu";
import { PendingCustomersApproval } from "./components/PendingCustomersApproval";
import { ReportsPage } from "./components/ReportsPage";
import { SalesReportPage } from "./components/SalesReportPage";
import { CustomerABCReportPage } from "./components/CustomerABCReportPage";
import { ProductABCReportPage } from "./components/ProductABCReportPage";
import { ClientsRiskReportPage } from "./components/ClientsRiskReportPage";
import { RelatorioMixCliente } from "./components/RelatorioMixCliente";
import { RelatorioROICliente } from "./components/RelatorioROICliente";
import { AnaliseCurvaABCPage } from "./components/AnaliseCurvaABCPage";
import { SolicitadoFaturadoReportPage } from "./components/SolicitadoFaturadoReportPage";
import { TinyERPPedidosPage } from "./components/TinyERPPedidosPage";
import { TinyERPModeIndicator } from "./components/TinyERPModeIndicator";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { DataInitializer } from "./components/DataInitializerSimple";
import { DemoModeBadge } from "./components/DemoModeBadge";
import { MetasManagement } from "./components/MetasManagement";
import { Button } from "./components/ui/button";
import { Sheet, SheetContent, SheetTitle, VisuallyHidden } from "./components/ui/sheet";
import { Toaster } from "./components/ui/sonner";
// Dashboard agora usa dados reais do Supabase via dashboardDataService [updated: 2025-11-16]
import { Transaction } from "./services/dashboardDataService";
import { ListaPreco } from "./types/listaPreco";
import { Produto } from "./types/produto";
import { toast } from "sonner@2.0.3";
import { api } from "./services/api";
import { tinyERPSyncService } from "./services/tinyERPSync";

type Page = "dashboard" | "vendas" | "equipe" | "clientes" | "comissoes" | "contacorrente" | "produtos" | "metas" | "relatorios" | "configuracoes" | "perfil" | "clientes-pendentes" | "tiny-erp";
type CustomerView = 'list' | 'create' | 'edit' | 'view';
type PriceListView = 'settings' | 'create' | 'edit' | 'view';
type SaleView = 'list' | 'create' | 'edit' | 'view';
type ProductView = 'list' | 'create' | 'edit' | 'view';
type ReportView = 'index' | 'vendas' | 'clientes-abc' | 'produtos-abc' | 'clientes-risco' | 'mix-cliente' | 'roi-clientes' | 'analise-abc-dez2025';

const menuItems: Array<{ id: Page; icon: any; label: string; backofficeOnly?: boolean }> = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboards" },
  { id: "vendas", icon: ShoppingCart, label: "Pedidos" },
  { id: "clientes", icon: UserCircle, label: "Clientes" },
  { id: "produtos", icon: Package, label: "Produtos" },
  { id: "equipe", icon: Users, label: "Equipe", backofficeOnly: true },
  { id: "metas", icon: Target, label: "Metas", backofficeOnly: true },
  { id: "comissoes", icon: Wallet, label: "Comissões" },
  { id: "contacorrente", icon: DollarSign, label: "Conta Corrente", backofficeOnly: true },
  { id: "relatorios", icon: BarChart3, label: "Relatórios" },
  { id: "configuracoes", icon: Settings, label: "Configurações", backofficeOnly: true },
];

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
}

function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  const { usuario } = useAuth();
  const ehBackoffice = usuario?.tipo === 'backoffice';
  
  return (
    <div className="flex flex-col h-full bg-card border-r">
      <div className="px-6 py-4 border-b flex-shrink-0 h-[72px] flex items-center justify-center">
        <ProSellerLogo />
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems
          .filter(item => !item.backofficeOnly || ehBackoffice)
          .map((item) => (
            <Button
              key={item.id}
              variant={currentPage === item.id ? "default" : "ghost"}
              className="w-full justify-start gap-3"
              onClick={() => onPageChange(item.id)}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          ))}
      </nav>
      
      <div className="p-4 border-t flex-shrink-0 bg-card">
        <SidebarUserInfo onOpenProfile={() => onPageChange("perfil")} />
      </div>
    </div>
  );
}

function SidebarUserInfo({ onOpenProfile }: { onOpenProfile: () => void }) {
  const { usuario, logout } = useAuth();
  const systemVersion = "V 1.10.0";
  
  if (!usuario) return null;
  
  const iniciais = usuario.nome
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const handleLogout = () => {
    if (window.confirm('Deseja realmente sair do sistema?')) {
      logout();
    }
  };

  return (
    <div className="space-y-3">
      <Button
        variant="ghost"
        className="w-full p-0 h-auto hover:bg-muted/50"
        onClick={onOpenProfile}
      >
        <div className="flex items-center gap-3 p-3 rounded-lg w-full">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium">{iniciais}</span>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium truncate">{usuario.nome}</p>
            <p className="text-xs text-muted-foreground truncate">{usuario.email}</p>
          </div>
        </div>
      </Button>

      <div className="gap-3 p-3 rounded-lg w-full">
        <p className="flex items-center justify-center text-[11px] text-muted-foreground ">Versão {systemVersion}</p>
      </div>
      
      <Button
        variant="outline"
        className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4" />
        Sair
      </Button>
    </div>
  );
}

const pageConfig: Record<Page, { title: string; description: string }> = {
  dashboard: {
    title: "Dashboards",
    description: "Bem-vindo de volta! Aqui está um resumo do seu desempenho."
  },
  vendas: {
    title: "Pedidos",
    description: "Visualize e gerencie todos os pedidos realizados."
  },
  equipe: {
    title: "Gestão de Equipe",
    description: "Acompanhe o desempenho e gerencie sua equipe de vendas."
  },
  clientes: {
    title: "Gestão de Clientes",
    description: "Gerencie sua base de clientes com indicadores estratégicos."
  },
  "clientes-pendentes": {
    title: "Clientes Pendentes de Aprovação",
    description: "Analise e aprove cadastros de clientes realizados pelos vendedores."
  },
  metas: {
    title: "Metas e Acompanhamento",
    description: "Monitore o progresso das metas individuais e da equipe."
  },
  comissoes: {
    title: "Gestão de Comissões",
    description: "Acompanhe e gerencie as comissões da equipe de vendas."
  },
  contacorrente: {
    title: "Conta Corrente",
    description: "Visão geral de compromissos e pagamentos de todos os clientes."
  },
  produtos: {
    title: "Produtos",
    description: "Gerencie o catálogo de produtos e serviços."
  },
  relatorios: {
    title: "Relatórios",
    description: "Análises detalhadas e relatórios de performance."
  },
  "tiny-erp": {
    title: "Pedidos no Tiny ERP",
    description: "Visualize e gerencie os pedidos enviados ao Tiny ERP."
  },
  configuracoes: {
    title: "Configurações",
    description: "Ajustes e preferências do sistema."
  },
  perfil: {
    title: "Meu Perfil",
    description: "Gerencie suas informações pessoais e preferências."
  }
};

function AppContent() {
  const { usuario, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'forgot-password'>('login');
  
  // Obter mês atual no formato YYYY-MM
  const getCurrentMonthPeriod = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };
  
  const [dashboardPeriod, setDashboardPeriod] = useState<string>("current_month");
  const [dashboardCustomDateRange, setDashboardCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ 
    from: undefined, 
    to: undefined 
  });
  const [dataInitialized, setDataInitialized] = useState(true); // Sempre inicializado
  
  // Estado para armazenar transações filtradas vindas do DashboardMetrics
  const [dashboardTransactions, setDashboardTransactions] = useState<Transaction[]>([]);

  // 🆕 NOVO: Estado para armazenar TODAS as transações (incluindo canceladas) para CanceledSalesTable
  const [dashboardAllTransactions, setDashboardAllTransactions] = useState<Transaction[]>([]);

  // 🆕 NOVO: Estado para armazenar TODAS as transações SEM filtro de período (para Curva ABC)
  const [dashboardRawTransactions, setDashboardRawTransactions] = useState<Transaction[]>([]);

  // Check if data needs initialization - DESABILITADO
  // useEffect(() => {
  //   const checkDataInit = async () => {
  //     const initialized = localStorage.getItem('data_initialized');
  //     if (!initialized && usuario) {
  //       setShowDataInit(true);
  //     } else {
  //       setDataInitialized(true);
  //     }
  //   };
  //   
  //   if (usuario) {
  //     checkDataInit();
  //   }
  // }, [usuario]);

  // Garantir que data_initialized está sempre marcado no localStorage
  useEffect(() => {
    if (usuario) {
      localStorage.setItem('data_initialized', 'true');
      setDataInitialized(true);
    }
  }, [usuario]);

  const handleDataInitComplete = () => {
    localStorage.setItem('data_initialized', 'true');
    setShowDataInit(false);
    setDataInitialized(true);
    toast.success('Sistema pronto para uso!');
  };

  // Sempre redirecionar para dashboard quando o usuário faz login
  useEffect(() => {
    if (usuario && dataInitialized) {
      setCurrentPage("dashboard");
    }
  }, [usuario, dataInitialized]);

  // 🔧 Inicializar modo Tiny ERP na primeira carga
  useEffect(() => {
    // Verificar se já tem modo configurado
    const modoSalvo = localStorage.getItem('tinyERPMode');
    const modoWindow = (window as any).__TINY_API_MODE__;
    
    console.log('🔍 Verificando modo Tiny ERP:', { modoSalvo, modoWindow });
    
    // Se não tem nenhum modo configurado, iniciar em REAL como padrão
    if (!modoSalvo && !modoWindow) {
      console.log('🔧 Tiny ERP: Inicializando em modo REAL (padrão)');
      localStorage.setItem('tinyERPMode', 'REAL');
      (window as any).__TINY_API_MODE__ = 'REAL';
    } else {
      // Usar o modo salvo
      const modoAtual = modoSalvo || modoWindow || 'REAL';
      console.log(`✅ Tiny ERP: Modo ${modoAtual} carregado`);
      
      // Sincronizar localStorage e window
      if (modoSalvo !== modoWindow) {
        localStorage.setItem('tinyERPMode', modoAtual);
        (window as any).__TINY_API_MODE__ = modoAtual;
      }
    }
  }, []);

  // Carregar listas de preço do Supabase
  useEffect(() => {
    const carregarListasPreco = async () => {
      try {
        console.log('[APP] Carregando listas de preço da API...');
        const listasAPI = await api.get('listas-preco');
        setListas(listasAPI);
        console.log('[APP] Listas de preço carregadas:', listasAPI.length);
      } catch (error) {
        console.error('[APP] Erro ao carregar listas de preço:', error);
        // Não falhar silenciosamente, mas também não bloquear a UI
        setListas([]);
      }
    };
    
    carregarListasPreco();
  }, []);

  // Iniciar polling de 24h para sincronização com Tiny ERP
  useEffect(() => {
    const iniciarSincronizacao = async () => {
      try {
        console.log('[APP] Iniciando sincronização automática com Tiny ERP (24h)...');
        
        // Carregar vendas para passar ao serviço de sincronização
        const vendas = await api.get('vendas');
        
        // Iniciar polling automático de 24h
        tinyERPSyncService.iniciarPolling();
        
        console.log(`[APP] ✅ Polling de sincronização iniciado (intervalo: 24 horas)`);
        console.log(`[APP] 📊 ${vendas.length} vendas carregadas para sincronização`);
      } catch (error) {
        console.error('[APP] ❌ Erro ao iniciar sincronização:', error);
      }
    };
    
    if (usuario) {
      iniciarSincronizacao();
    }
    
    // Cleanup: parar polling quando componente desmontar
    return () => {
      tinyERPSyncService.pararPolling();
    };
  }, [usuario]);

  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ 
    from: undefined, 
    to: undefined 
  });
  const [dashboardFilters, setDashboardFilters] = useState<DashboardFilters>({
    vendedores: [],
    naturezas: [],
    segmentos: [],
    statusClientes: [],
    ufs: [],
    statusVendas: "todas", // CORRIGIDO: Dashboard inicia com "todas" por padrão
    curvasABC: [], // 🆕 NOVO: Filtro de Curva ABC de Clientes
  });
  
  // Estados para período de vendas
  const [salesPeriod, setSalesPeriod] = useState<string>("current_month");
  const [salesCustomDateRange, setSalesCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ 
    from: undefined, 
    to: undefined 
  });

  // Estados para período de comissões
  const [commissionsPeriod, setCommissionsPeriod] = useState<string>(getCurrentMonthPeriod());
  const [commissionsCustomDateRange, setCommissionsCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ 
    from: undefined, 
    to: undefined 
  });

  // Estados para navegação de clientes
  const [customerView, setCustomerView] = useState<CustomerView>('list');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>();

  // Estados para navegação de vendas
  const [saleView, setSaleView] = useState<SaleView>('list');
  const [selectedSaleId, setSelectedSaleId] = useState<string | undefined>();

  // Estados para navegação de listas de preço
  const [priceListView, setPriceListView] = useState<PriceListView>('settings');
  const [selectedPriceListId, setSelectedPriceListId] = useState<string | undefined>();
  const [listas, setListas] = useState<ListaPreco[]>([]);

  // Estados para navegação de produtos
  const [productView, setProductView] = useState<ProductView>('list');
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtosListRefreshKey, setProdutosListRefreshKey] = useState(0);

  // Estados para navegação de relatórios
  const [reportView, setReportView] = useState<ReportView>('index');

  const handlePageChange = (page: Page) => {
    setCurrentPage(page);
    setMobileMenuOpen(false);
    
    // Reset customer view when navigating to customers page
    if (page === 'clientes') {
      setCustomerView('list');
      setSelectedCustomerId(undefined);
    }
    
    // Reset sale view when navigating to sales page
    if (page === 'vendas') {
      setSaleView('list');
      setSelectedSaleId(undefined);
    }
    
    // Reset price list view when navigating to settings page
    if (page === 'configuracoes') {
      setPriceListView('settings');
      setSelectedPriceListId(undefined);
    }
    
    // Reset product view when navigating to products page
    if (page === 'produtos') {
      setProductView('list');
      setSelectedProductId(undefined);
    }
    
    // Reset report view when navigating to reports page
    if (page === 'relatorios') {
      setReportView('index');
    }
  };

  const handleNovoCliente = () => {
    setCustomerView('create');
    setSelectedCustomerId(undefined);
  };

  const handleVisualizarCliente = (clienteId: string) => {
    setCustomerView('view');
    setSelectedCustomerId(clienteId);
  };

  const handleEditarCliente = (clienteId: string) => {
    setCustomerView('edit');
    setSelectedCustomerId(clienteId);
  };

  const handleVoltarListaClientes = () => {
    setCustomerView('list');
    setSelectedCustomerId(undefined);
  };

  // Handlers para navegação de vendas
  const handleNovaVenda = () => {
    setSaleView('create');
    setSelectedSaleId(undefined);
  };

  const handleVisualizarVenda = (vendaId: string) => {
    console.log('[APP] 📋 handleVisualizarVenda chamado:', {
      vendaId,
      currentPage,
      saleView
    });
    
    // Mudar para página de vendas se não estiver nela
    if (currentPage !== 'vendas') {
      console.log('[APP] 🔄 Mudando para página de vendas...');
      setCurrentPage('vendas');
    }
    
    setSaleView('view');
    setSelectedSaleId(vendaId);
    
    console.log('[APP] ✅ Navegação configurada:', {
      page: 'vendas',
      view: 'view',
      saleId: vendaId
    });
  };

  const handleEditarVenda = (vendaId: string) => {
    setSaleView('edit');
    setSelectedSaleId(vendaId);
  };

  const handleVoltarListaVendas = () => {
    setSaleView('list');
    setSelectedSaleId(undefined);
  };

  // Handlers para navegação de listas de preço
  const handleNovaListaPreco = () => {
    setPriceListView('create');
    setSelectedPriceListId(undefined);
  };

  const handleVisualizarListaPreco = (listaId: string) => {
    setPriceListView('view');
    setSelectedPriceListId(listaId);
  };

  const handleEditarListaPreco = (listaId: string) => {
    setPriceListView('edit');
    setSelectedPriceListId(listaId);
  };

  const handleVoltarSettings = () => {
    setPriceListView('settings');
    setSelectedPriceListId(undefined);
  };

  const handleSalvarListaPreco = async (lista: ListaPreco) => {
    try {
      const existingIndex = listas.findIndex((l) => l.id === lista.id);

      if (existingIndex >= 0) {
        // Editar lista existente
        console.log('[APP] Atualizando lista de preço:', lista.id);
        const atualizada = await api.update('listas-preco', lista.id, lista);
        const newListas = [...listas];
        newListas[existingIndex] = { ...atualizada, id: lista.id };
        setListas(newListas);
        toast.success('Lista de preço atualizada com sucesso!');
      } else {
        // Criar nova lista
        console.log('[APP] Criando nova lista de preço:', lista);
        const novaLista = await api.create('listas-preco', lista);
        setListas([...listas, novaLista]);
        toast.success('Lista de preço criada com sucesso!');
      }

      handleVoltarSettings();
    } catch (error) {
      console.error('[APP] Erro ao salvar lista de preço:', error);
      toast.error('Erro ao salvar lista de preço. Tente novamente.');
    }
  };

  // Handlers para navegação de produtos
  const handleNovoProduto = () => {
    setProductView('create');
    setSelectedProductId(undefined);
  };

  const handleVisualizarProduto = (produtoId: string) => {
    setProductView('view');
    setSelectedProductId(produtoId);
  };

  const handleEditarProduto = (produtoId: string) => {
    setProductView('edit');
    setSelectedProductId(produtoId);
  };

  const handleVoltarListaProdutos = () => {
    setProductView('list');
    setSelectedProductId(undefined);
  };

  const handleSalvarProduto = (produto: Produto) => {
    // A API já foi chamada pelo ProductFormPage (salvarProduto). Aqui só atualizamos
    // o estado local e forçamos o refresh da lista para exibir o novo/atualizado produto.
    if (produto?.id) {
      setProdutos((prev) => {
        const idx = prev.findIndex((p) => p.id === produto.id);
        if (idx >= 0) return prev.map((p, i) => (i === idx ? produto : p));
        return [...prev, produto];
      });
    }
    setProdutosListRefreshKey((k) => k + 1);
    handleVoltarListaProdutos();
  };

  // Handlers para navegação de relatórios
  const handleNavigateToReport = (reportType: "vendas" | "clientes-abc" | "produtos-abc" | "clientes-risco" | "mix-cliente" | "roi-clientes") => {
    setReportView(reportType);
  };

  const handleBackToReportsIndex = () => {
    setReportView('index');
  };
  
  // Get filtered transactions - agora usa as transações do DashboardMetrics
  const getFilteredTransactions = (): Transaction[] => {
    return dashboardTransactions;
  };

  // Calcular vendedorNome para passar ao CustomerWalletCard
  const getVendedorNomeForPositivation = () => {
    const ehVendedor = usuario?.tipo === 'vendedor';
    
    if (ehVendedor && usuario) {
      return usuario.nome;
    } else if (dashboardFilters.vendedores.length === 1) {
      return dashboardFilters.vendedores[0];
    }
    return undefined;
  };

  const getPeriodLabel = () => {
    // Dashboard
    if (currentPage === "dashboard") {
      switch (dashboardPeriod) {
        case "7":
          return "Últimos 7 dias";
        case "30":
          return "Últimos 30 dias";
        case "current_month":
          return `Mês Atual (${format(new Date(), "MMMM yyyy", { locale: ptBR }).replace(/^./, str => str.toUpperCase())})`;
        case "90":
          return "Últimos 90 dias";
        case "365":
          return "Último Ano";
        case "custom":
          if (dashboardCustomDateRange.from && dashboardCustomDateRange.to) {
            return `${format(dashboardCustomDateRange.from, "dd/MMM", { locale: ptBR })} - ${format(dashboardCustomDateRange.to, "dd/MMM/yyyy", { locale: ptBR })}`;
          }
          return "Período Personalizado";
        default:
          if (dashboardPeriod && dashboardPeriod.includes('-')) {
            const [year, month] = dashboardPeriod.split('-');
            const monthIndex = parseInt(month) - 1;
            const mesesNomes = [
              "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
              "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
            ];
            if (monthIndex >= 0 && monthIndex < 12) {
              return `${mesesNomes[monthIndex]} ${year}`;
            }
          }
          return `Mês Atual (${format(new Date(), "MMMM yyyy", { locale: ptBR }).replace(/^./, str => str.toUpperCase())})`;
      }
    }
    // Vendas
    if (currentPage === "vendas") {
      switch (salesPeriod) {
        case "7":
          return "Últimos 7 dias";
        case "30":
          return "Últimos 30 dias";
        case "current_month":
          return `Mês Atual (${format(new Date(), "MMMM yyyy", { locale: ptBR }).replace(/^./, str => str.toUpperCase())})`;
        case "90":
          return "Últimos 90 dias";
        case "365":
          return "Último Ano";
        case "custom":
          if (salesCustomDateRange.from && salesCustomDateRange.to) {
            return `${format(salesCustomDateRange.from, "dd/MMM", { locale: ptBR })} - ${format(salesCustomDateRange.to, "dd/MMM/yyyy", { locale: ptBR })}`;
          }
          return "Período Personalizado";
        default:
          return format(new Date(), "MMMM yyyy", { locale: ptBR }).replace(/^./, str => str.toUpperCase());
      }
    }

    // Comissões
    if (currentPage === "comissoes") {
      if (/^\d{4}-\d{2}$/.test(commissionsPeriod)) {
        const [year, month] = commissionsPeriod.split('-').map(Number);
        const monthIndex = month - 1;
        const mesesNomes = [
          "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
          "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
        ];
        if (monthIndex >= 0 && monthIndex < 12) {
          return `${mesesNomes[monthIndex]} ${year}`;
        }
      }
      switch (commissionsPeriod) {
        case "current_month":
          return `Mês Atual (${format(new Date(), "MMMM yyyy", { locale: ptBR }).replace(/^./, str => str.toUpperCase())})`;
        case "last_month":
          const lastMonth = new Date();
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          return `Mês Anterior (${format(lastMonth, "MMMM yyyy", { locale: ptBR }).replace(/^./, str => str.toUpperCase())})`;
        case "current_quarter":
          const currentMonth = new Date().getMonth();
          const quarterStart = Math.floor(currentMonth / 3) * 3;
          const quarterMonths = ["Jan-Mar", "Abr-Jun", "Jul-Set", "Out-Dez"][quarterStart / 3];
          return `Trimestre Atual (${quarterMonths} ${new Date().getFullYear()})`;
        case "current_year":
          return `Ano Atual (${new Date().getFullYear()})`;
        case "30":
          return "Últimos 30 dias";
        case "90":
          return "Últimos 90 dias";
        case "365":
          return "Último Ano";
        case "custom":
          if (commissionsCustomDateRange.from && commissionsCustomDateRange.to) {
            return `${format(commissionsCustomDateRange.from, "dd/MMM", { locale: ptBR })} - ${format(commissionsCustomDateRange.to, "dd/MMM/yyyy", { locale: ptBR })}`;
          }
          return "Período Personalizado";
        default:
          return `Mês Atual (${format(new Date(), "MMMM yyyy", { locale: ptBR }).replace(/^./, str => str.toUpperCase())})`;
      }
    }

    // Outras páginas onde período não faz sentido
    return "";
  };

  const renderContent = () => {
    switch (currentPage) {
      case "perfil":
        return <UserProfilePage />;
      case "dashboard":
        return (
          <div className="space-y-6">
            {/* Linha 1 - Cards do topo */}
            <DashboardMetrics 
              period={dashboardPeriod} 
              onPeriodChange={setDashboardPeriod}
              onCustomDateRangeChange={setDashboardCustomDateRange}
              filters={dashboardFilters}
              onFiltersChange={setDashboardFilters}
              onTransactionsChange={setDashboardTransactions}
              onAllTransactionsChange={setDashboardAllTransactions}
              onRawTransactionsChange={setDashboardRawTransactions}
            />
            
            {/* Linha 2 - Gráfico Performance de Vendas + Card Top Vendedores */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
              <SalesChart 
                period={dashboardPeriod} 
                filters={dashboardFilters} 
                transactions={dashboardTransactions}
              />
              {usuario?.tipo !== 'vendedor' && (
                <TopSellersCard 
                  period={dashboardPeriod} 
                  filters={dashboardFilters}
                  transactions={dashboardTransactions}
                />
              )}
            </div>
            
            {/* Linha 3 - Os 3 gráficos de rosca */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
              <CustomerWalletCard 
                transactions={getFilteredTransactions()} 
                currentFilters={dashboardFilters}
                onFilterChange={setDashboardFilters}
                vendedorNome={getVendedorNomeForPositivation()}
              />
              <SegmentSalesCard 
                transactions={getFilteredTransactions()} 
                currentFilters={dashboardFilters}
                onFilterChange={setDashboardFilters}
              />
              <ABCCurveCard 
                transactions={getFilteredTransactions()} 
                allTransactions={dashboardAllTransactions}
                rawTransactions={dashboardRawTransactions}
                currentFilters={dashboardFilters}
                onFilterChange={setDashboardFilters}
              />
            </div>
            
            {/* Linha 4 - Vendas recentes */}
            <div>
              <RecentSalesTable 
                period={dashboardPeriod} 
                filters={dashboardFilters}
                transactions={dashboardTransactions}
                onVisualizarVenda={handleVisualizarVenda}
              />
            </div>
            
            {/* Linha 5 - Vendas canceladas */}
            <div>
              <CanceledSalesTable 
                period={dashboardPeriod} 
                filters={dashboardFilters}
                transactions={dashboardAllTransactions}
                onVisualizarVenda={handleVisualizarVenda}
              />
            </div>
          </div>
        );
      case "vendas":
        if (saleView === 'list') {
          return (
            <SalesPage
              onNovaVenda={handleNovaVenda}
              onVisualizarVenda={handleVisualizarVenda}
              onEditarVenda={handleEditarVenda}
              onIntegracaoERP={() => handlePageChange('tiny-erp')}
              period={salesPeriod}
              onPeriodChange={setSalesPeriod}
              customDateRange={salesCustomDateRange}
              onCustomDateRangeChange={setSalesCustomDateRange}
            />
          );
        } else if (saleView === 'create') {
          return (
            <SaleFormPage
              modo="criar"
              onVoltar={handleVoltarListaVendas}
            />
          );
        } else if (saleView === 'edit') {
          return (
            <SaleFormPage
              vendaId={selectedSaleId}
              modo="editar"
              onVoltar={handleVoltarListaVendas}
            />
          );
        } else {
          return (
            <SaleFormPage
              vendaId={selectedSaleId}
              modo="visualizar"
              onVoltar={handleVoltarListaVendas}
            />
          );
        }
      case "equipe":
        return <TeamManagement />;
      case "clientes":
        if (customerView === 'list') {
          return (
            <CustomersListPage
              onNovoCliente={handleNovoCliente}
              onVisualizarCliente={handleVisualizarCliente}
              onEditarCliente={handleEditarCliente}
            />
          );
        } else if (customerView === 'create') {
          return (
            <CustomerFormPage
              modo="criar"
              onVoltar={handleVoltarListaClientes}
            />
          );
        } else if (customerView === 'edit') {
          return (
            <CustomerFormPage
              clienteId={selectedCustomerId}
              modo="editar"
              onVoltar={handleVoltarListaClientes}
            />
          );
        } else {
          return (
            <CustomerFormPage
              clienteId={selectedCustomerId}
              modo="visualizar"
              onVoltar={handleVoltarListaClientes}
            />
          );
        }
      case "clientes-pendentes":
        return <PendingCustomersApproval />;
      case "metas":
        return <MetasManagement />;
      case "comissoes":
        // Vendedores veem tela específica, backoffice vê gestão completa
        if (usuario?.tipo === 'vendedor') {
          return (
            <SellerCommissionsPage
              period={commissionsPeriod}
              onPeriodChange={setCommissionsPeriod}
              customDateRange={commissionsCustomDateRange}
              onCustomDateRangeChange={setCommissionsCustomDateRange}
            />
          );
        }
        return (
          <CommissionsManagement 
            period={commissionsPeriod}
            onPeriodChange={setCommissionsPeriod}
            customDateRange={commissionsCustomDateRange}
            onCustomDateRangeChange={setCommissionsCustomDateRange}
          />
        );
      case "contacorrente":
        return <ContaCorrenteOverview />;
      case "relatorios":
        if (reportView === 'index') {
          return <ReportsPage onNavigateToReport={handleNavigateToReport} />;
        } else if (reportView === 'vendas') {
          return <SalesReportPage onBack={handleBackToReportsIndex} />;
        } else if (reportView === 'clientes-abc') {
          return <CustomerABCReportPage onBack={handleBackToReportsIndex} />;
        } else if (reportView === 'produtos-abc') {
          return <ProductABCReportPage onBack={handleBackToReportsIndex} />;
        } else if (reportView === 'mix-cliente') {
          return <RelatorioMixCliente onNavigateBack={handleBackToReportsIndex} />;
        } else if (reportView === 'roi-clientes') {
          return <RelatorioROICliente onNavigateBack={handleBackToReportsIndex} />;
        } else if (reportView === 'analise-abc-dez2025') {
          return <AnaliseCurvaABCPage onBack={handleBackToReportsIndex} />;
        } else {
          return <ClientsRiskReportPage onNavigateBack={handleBackToReportsIndex} />;
        }
      case "produtos":
        if (productView === 'list') {
          return (
            <ProductsListPage
              onNovoProduto={handleNovoProduto}
              onVisualizarProduto={handleVisualizarProduto}
              onEditarProduto={handleEditarProduto}
              refreshKey={produtosListRefreshKey}
            />
          );
        } else if (productView === 'create') {
          return (
            <ProductFormPage
              mode="create"
              onBack={handleVoltarListaProdutos}
              onSave={handleSalvarProduto}
            />
          );
        } else if (productView === 'edit') {
          return (
            <ProductFormPage
              productId={selectedProductId}
              mode="edit"
              onBack={handleVoltarListaProdutos}
              onSave={handleSalvarProduto}
            />
          );
        } else {
          return (
            <ProductFormPage
              productId={selectedProductId}
              mode="view"
              onBack={handleVoltarListaProdutos}
              onSave={handleSalvarProduto}
            />
          );
        }
      case "configuracoes":
        if (priceListView === 'settings') {
          return (
            <SettingsPage 
              onNovaListaPreco={handleNovaListaPreco}
              onEditarListaPreco={handleEditarListaPreco}
              onVisualizarListaPreco={handleVisualizarListaPreco}
              listas={listas}
              onListasChange={setListas}
            />
          );
        } else if (priceListView === 'create') {
          return (
            <PriceListFormPage
              modo="criar"
              onVoltar={handleVoltarSettings}
              onSalvar={handleSalvarListaPreco}
            />
          );
        } else if (priceListView === 'edit') {
          const lista = listas.find((l) => l.id === selectedPriceListId);
          return (
            <PriceListFormPage
              lista={lista}
              modo="editar"
              onVoltar={handleVoltarSettings}
              onSalvar={handleSalvarListaPreco}
            />
          );
        } else {
          const lista = listas.find((l) => l.id === selectedPriceListId);
          return (
            <PriceListFormPage
              lista={lista}
              modo="visualizar"
              onVoltar={handleVoltarSettings}
              onSalvar={handleSalvarListaPreco}
            />
          );
        }
      case "tiny-erp":
        return <TinyERPPedidosPage />;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h3 className="text-xl font-medium mb-2">Em Desenvolvimento</h3>
              <p className="text-muted-foreground">
                Esta funcionalidade estará disponível em breve.
              </p>
            </div>
          </div>
        );
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não estiver autenticado, mostrar tela de login ou recuperação de senha
  if (!usuario) {
    if (authView === 'forgot-password') {
      return <ForgotPasswordPage onBackToLogin={() => setAuthView('login')} />;
    }
    return <LoginPage onForgotPassword={() => setAuthView('forgot-password')} />;
  }

  // Show data initializer if needed - DESABILITADO
  // if (showDataInit) {
  //   return <DataInitializer onComplete={handleDataInitComplete} />;
  // }

  return (
    <>
      <div className="h-screen flex overflow-hidden bg-background">
        {/* Sidebar Desktop */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <Sidebar currentPage={currentPage} onPageChange={handlePageChange} />
        </aside>

        {/* Mobile Menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-64 p-0" aria-describedby={undefined}>
            <VisuallyHidden>
              <SheetTitle>Menu de Navegação</SheetTitle>
            </VisuallyHidden>
            <Sidebar currentPage={currentPage} onPageChange={handlePageChange} />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="border-b bg-card px-6 flex items-center gap-4 h-[72px]">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{pageConfig[currentPage].title}</h2>
              <p className="text-sm text-muted-foreground">
                {pageConfig[currentPage].description}
              </p>
            </div>
            
            {/* Mostrar período apenas em páginas relevantes */}
            {(currentPage === "dashboard" || currentPage === "vendas" || currentPage === "comissoes") && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Período</p>
                <p className="text-sm font-medium">{getPeriodLabel()}</p>
              </div>
            )}
            
            {/* Badge de Modo Demo */}
            <DemoModeBadge />
            
            {/* Menu de Notificações */}
            <NotificationsMenu onNavigate={(page) => setCurrentPage(page as Page)} />
            
            {/* Botão de perfil no header mobile */}
            {currentPage !== "perfil" && (
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setCurrentPage("perfil")}
              >
                <UserCircle className="h-5 w-5" />
              </Button>
            )}
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto min-h-0">
            <div className="p-6 min-h-full">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
      <Toaster />
      
      {/* Indicador de Modo Tiny ERP - OCULTO: Sistema sempre em modo REAL */}
      {/* {usuario && usuario.tipo === 'backoffice' && (
        <ErrorBoundary>
          <TinyERPModeIndicator />
        </ErrorBoundary>
      )} */}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
