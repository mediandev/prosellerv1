import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Input } from './ui/input';
import { Package, Search, CheckCircle2, XCircle, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { api } from '../services/api';
import { Produto } from '../types/produto';
import { StatusMix } from '../types/statusMix';

interface CustomerMixTabProps {
  clienteId: string;
  readonly?: boolean;
}

export function CustomerMixTab({ clienteId, readonly = false }: CustomerMixTabProps) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [statusMix, setStatusMix] = useState<StatusMix[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [editandoSku, setEditandoSku] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    carregarDados();
  }, [clienteId]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [produtosData, statusMixData] = await Promise.all([
        api.get('produtos'),
        api.getCustom(`status-mix/${clienteId}`),
      ]);

      setProdutos(produtosData.filter((p: Produto) => p.ativo !== false));
      setStatusMix(statusMixData);
    } catch (error) {
      console.error('[MIX] Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do mix');
    } finally {
      setLoading(false);
    }
  };

  const getStatusProduto = (produtoId: string): 'ativo' | 'inativo' => {
    const status = statusMix.find(sm => sm.produtoId === produtoId);
    return status?.status || 'inativo';
  };

  const getStatusMixItem = (produtoId: string): StatusMix | undefined => {
    return statusMix.find(sm => sm.produtoId === produtoId);
  };

  const handleToggleStatus = async (produtoId: string, novoStatus: 'ativo' | 'inativo') => {
    if (readonly) return;

    setSalvando(produtoId);
    try {
      const response = await api.updateCustom(
        `status-mix/${clienteId}/${produtoId}`,
        {
          status: novoStatus,
          ativadoManualmente: novoStatus === 'ativo', // Se ativar manualmente, marca como tal
        }
      );

      // Atualizar estado local
      const index = statusMix.findIndex(sm => sm.produtoId === produtoId);
      if (index >= 0) {
        const newStatusMix = [...statusMix];
        newStatusMix[index] = response;
        setStatusMix(newStatusMix);
      } else {
        setStatusMix([...statusMix, response]);
      }

      toast.success(
        novoStatus === 'ativo' 
          ? 'Produto adicionado ao mix' 
          : 'Produto removido do mix'
      );
    } catch (error) {
      console.error('[MIX] Erro ao alterar status:', error);
      toast.error('Erro ao alterar status do produto');
    } finally {
      setSalvando(null);
    }
  };

  const handleSalvarCodigoSkuCliente = async (produtoId: string, codigoSkuCliente: string) => {
    if (readonly) return;

    setSalvando(produtoId);
    try {
      const statusItem = getStatusMixItem(produtoId);
      const status = statusItem?.status || 'inativo';

      const response = await api.updateCustom(
        `status-mix/${clienteId}/${produtoId}`,
        {
          status,
          codigoSkuCliente: codigoSkuCliente.trim() || undefined,
        }
      );

      // Atualizar estado local
      const index = statusMix.findIndex(sm => sm.produtoId === produtoId);
      if (index >= 0) {
        const newStatusMix = [...statusMix];
        newStatusMix[index] = response;
        setStatusMix(newStatusMix);
      } else {
        setStatusMix([...statusMix, response]);
      }

      toast.success('Código SKU Cliente salvo com sucesso');
    } catch (error) {
      console.error('[MIX] Erro ao salvar código SKU cliente:', error);
      toast.error('Erro ao salvar código SKU cliente');
    } finally {
      setSalvando(null);
      // Limpar estado de edição
      setEditandoSku(prev => {
        const novo = { ...prev };
        delete novo[produtoId];
        return novo;
      });
    }
  };

  const iniciarEdicaoSku = (produtoId: string) => {
    const statusItem = getStatusMixItem(produtoId);
    setEditandoSku(prev => ({
      ...prev,
      [produtoId]: statusItem?.codigoSkuCliente || ''
    }));
  };

  const cancelarEdicaoSku = (produtoId: string) => {
    setEditandoSku(prev => {
      const novo = { ...prev };
      delete novo[produtoId];
      return novo;
    });
  };

  const produtosFiltrados = produtos
    .filter(produto => {
      // Filtro de busca
      const matchSearch = !searchTerm || 
        produto.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        produto.codigoSku?.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchSearch) return false;

      // Filtro de status (mostrar todos ou só ativos)
      if (!mostrarTodos) {
        return getStatusProduto(produto.id) === 'ativo';
      }

      return true;
    })
    .sort((a, b) => {
      // Ordenar: ativos primeiro, depois por nome
      const statusA = getStatusProduto(a.id);
      const statusB = getStatusProduto(b.id);
      
      if (statusA === statusB) {
        return a.descricao.localeCompare(b.descricao);
      }
      
      return statusA === 'ativo' ? -1 : 1;
    });

  const totalAtivos = produtos.filter(p => getStatusProduto(p.id) === 'ativo').length;
  const totalProdutos = produtos.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total de Produtos</CardDescription>
            <CardTitle className="text-3xl">{totalProdutos}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Produtos no Mix</CardDescription>
            <CardTitle className="text-3xl text-green-600">{totalAtivos}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Produtos Inativos</CardDescription>
            <CardTitle className="text-3xl text-muted-foreground">
              {totalProdutos - totalAtivos}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="mostrar-todos"
                checked={mostrarTodos}
                onCheckedChange={setMostrarTodos}
              />
              <label htmlFor="mostrar-todos" className="text-sm font-medium cursor-pointer">
                Mostrar todos os produtos
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {produtosFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm 
                  ? 'Nenhum produto encontrado com o termo pesquisado'
                  : mostrarTodos
                    ? 'Nenhum produto cadastrado'
                    : 'Nenhum produto ativo no mix deste cliente'}
              </p>
              {!mostrarTodos && totalProdutos > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setMostrarTodos(true)}
                  className="mt-4"
                >
                  Mostrar todos os produtos
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {produtosFiltrados.map((produto) => {
                const status = getStatusProduto(produto.id);
                const statusItem = getStatusMixItem(produto.id);
                const isAtivo = status === 'ativo';
                const estaEditando = editandoSku[produto.id] !== undefined;

                return (
                  <div
                    key={produto.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      isAtivo ? 'bg-green-50 border-green-200' : 'bg-muted/30'
                    }`}
                  >
                    {/* Linha principal com info do produto e controles */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          {isAtivo ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">{produto.descricao}</p>
                            {produto.codigoSku && (
                              <Badge variant="outline" className="text-xs">
                                SKU: {produto.codigoSku}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap mt-1">
                            {statusItem?.dataUltimoPedido && (
                              <p className="text-xs text-muted-foreground">
                                Último pedido:{' '}
                                {new Date(statusItem.dataUltimoPedido).toLocaleDateString('pt-BR')}
                              </p>
                            )}
                            {statusItem?.ativadoManualmente && (
                              <Badge variant="secondary" className="text-xs">
                                Ativado manualmente
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <Badge variant={isAtivo ? 'default' : 'secondary'}>
                          {isAtivo ? 'Ativo' : 'Inativo'}
                        </Badge>
                        {!readonly && (
                          <Switch
                            checked={isAtivo}
                            onCheckedChange={(checked) =>
                              handleToggleStatus(produto.id, checked ? 'ativo' : 'inativo')
                            }
                            disabled={salvando === produto.id}
                          />
                        )}
                        {salvando === produto.id && (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        )}
                      </div>
                    </div>

                    {/* Campo Código SKU Cliente */}
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-muted-foreground whitespace-nowrap">
                          Código SKU Cliente:
                        </label>
                        {estaEditando ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              value={editandoSku[produto.id]}
                              onChange={(e) =>
                                setEditandoSku(prev => ({
                                  ...prev,
                                  [produto.id]: e.target.value
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSalvarCodigoSkuCliente(produto.id, editandoSku[produto.id]);
                                } else if (e.key === 'Escape') {
                                  cancelarEdicaoSku(produto.id);
                                }
                              }}
                              placeholder="Digite o código SKU do cliente"
                              className="h-8 text-sm"
                              disabled={salvando === produto.id || readonly}
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSalvarCodigoSkuCliente(produto.id, editandoSku[produto.id])}
                              disabled={salvando === produto.id || readonly}
                              className="h-8 px-2"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => cancelarEdicaoSku(produto.id)}
                              disabled={salvando === produto.id || readonly}
                              className="h-8 px-2"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-1">
                            {statusItem?.codigoSkuCliente ? (
                              <Badge variant="secondary" className="text-xs">
                                {statusItem.codigoSkuCliente}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground italic">
                                Não informado
                              </span>
                            )}
                            {!readonly && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => iniciarEdicaoSku(produto.id)}
                                className="h-7 px-2 text-xs"
                              >
                                {statusItem?.codigoSkuCliente ? 'Editar' : 'Adicionar'}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}