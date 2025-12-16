import { Cliente } from '../types/customer';
import { useAuth } from '../contexts/AuthContext';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Combobox } from './ui/combobox';
import { Checkbox } from './ui/checkbox';
import { Alert, AlertDescription } from './ui/alert';
import { api } from '../services/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Plus, AlertCircle } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';

interface CustomerFormCondicaoComercialProps {
  formData: Partial<Cliente>;
  updateFormData: (updates: Partial<Cliente>) => void;
  readOnly: boolean;
}

export function CustomerFormCondicaoComercial({
  formData,
  updateFormData,
  readOnly,
}: CustomerFormCondicaoComercialProps) {
  const { usuario } = useAuth();
  const [dialogCondicaoAberto, setDialogCondicaoAberto] = useState(false);
  const [condicoesDisponiveis, setCondicoesDisponiveis] = useState<string[]>([]);
  
  // Estados para dados carregados da API
  const [empresasFaturamento, setEmpresasFaturamento] = useState<any[]>([]);
  const [listasPrecos, setListasPrecos] = useState<any[]>([]);
  const [condicoesPagamento, setCondicoesPagamento] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar dados da API ao montar o componente
  useEffect(() => {
    const carregarDados = async () => {
      try {
        console.log('[CONDICAO-COMERCIAL] Carregando dados da API...');
        const [empresasAPI, listasAPI, condicoesAPI, vendedoresAPI] = await Promise.all([
          api.get('empresas').catch(() => []),
          api.get('listas-preco').catch(() => []),
          api.get('condicoes-pagamento').catch(() => []),
          api.get('vendedores').catch(() => []),
        ]);
        
        setEmpresasFaturamento(empresasAPI);
        setListasPrecos(listasAPI);
        setCondicoesPagamento(condicoesAPI);
        setVendedores(vendedoresAPI);
        
        console.log('[CONDICAO-COMERCIAL] Dados carregados:', {
          empresas: empresasAPI.length,
          listas: listasAPI.length,
          condicoes: condicoesAPI.length,
          vendedores: vendedoresAPI.length,
        });
        
        console.log('[CONDICAO-COMERCIAL] Condições de pagamento detalhadas:', condicoesAPI);
        console.log('[CONDICAO-COMERCIAL] Condições ativas:', condicoesAPI.filter((c: any) => c.ativo));
        
        // Normalizar valores antigos (nome) para IDs
        if (formData.empresaFaturamento && empresasAPI.length > 0) {
          const empresaAtual = empresasAPI.find((emp: any) => emp.id === formData.empresaFaturamento);
          // Se não encontrou pelo ID, tenta encontrar pelo nome
          if (!empresaAtual) {
            const empresaPorNome = empresasAPI.find((emp: any) => {
              const empNome = emp.nomeFantasia || emp.razaoSocial || emp.nome;
              return empNome === formData.empresaFaturamento;
            });
            if (empresaPorNome) {
              console.log('[CONDICAO-COMERCIAL] Normalizando empresa de nome para ID:', empresaPorNome.id);
              updateFormData({ empresaFaturamento: empresaPorNome.id });
            }
          }
        }
        
        if (formData.listaPrecos && listasAPI.length > 0) {
          const listaAtual = listasAPI.find((lista: any) => lista.id === formData.listaPrecos);
          // Se não encontrou pelo ID, tenta encontrar pelo nome
          if (!listaAtual) {
            const listaPorNome = listasAPI.find((lista: any) => lista.nome === formData.listaPrecos);
            if (listaPorNome) {
              console.log('[CONDICAO-COMERCIAL] Normalizando lista de nome para ID:', listaPorNome.id);
              updateFormData({ listaPrecos: listaPorNome.id });
            }
          }
        }
      } catch (error) {
        console.error('[CONDICAO-COMERCIAL] Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };
    
    carregarDados();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Opções para os comboboxes
  const empresasOptions = useMemo(
    () => empresasFaturamento
      .filter((emp) => {
        if (!emp.ativo) return false;
        // Suporta tanto Company (razaoSocial/nomeFantasia) quanto EmpresaFaturamento (nome)
        const hasName = emp.nomeFantasia || emp.razaoSocial || (emp as any).nome;
        return emp.id && hasName && emp.cnpj;
      })
      .map((emp) => {
        // Suporta tanto Company quanto EmpresaFaturamento
        const name = emp.nomeFantasia || emp.razaoSocial || (emp as any).nome;
        return {
          value: emp.id,
          label: `${name} - ${emp.cnpj}` 
        };
      }),
    [empresasFaturamento]
  );

  const listasOptions = useMemo(
    () => listasPrecos
      .filter((lista) => lista.ativo && lista.id && lista.nome)
      .map((lista) => ({ 
        value: lista.id,
        label: lista.nome 
      })),
    [listasPrecos]
  );

  const vendedoresOptions = useMemo(
    () => vendedores
      .filter((v) => v.id && v.nome)
      .map((v) => ({ value: v.id, label: v.nome })),
    [vendedores]
  );

  const handleVendedorChange = (vendedorId: string) => {
    const vendedor = vendedores.find((v) => v.id === vendedorId);
    if (vendedor) {
      updateFormData({ 
        vendedorAtribuido: {
          id: vendedor.id,
          nome: vendedor.nome,
          email: vendedor.email || '',
        }
      });
    } else {
      updateFormData({ vendedorAtribuido: undefined });
    }
  };

  const handleAbrirDialogCondicoes = () => {
    setCondicoesDisponiveis([...(formData.condicoesPagamentoAssociadas || [])]);
    setDialogCondicaoAberto(true);
  };

  const handleSalvarCondicoes = () => {
    updateFormData({ condicoesPagamentoAssociadas: condicoesDisponiveis });
    setDialogCondicaoAberto(false);
  };

  const toggleCondicao = (condicaoId: string) => {
    if (condicoesDisponiveis.includes(condicaoId)) {
      setCondicoesDisponiveis(condicoesDisponiveis.filter((id) => id !== condicaoId));
    } else {
      setCondicoesDisponiveis([...condicoesDisponiveis, condicaoId]);
    }
  };

  const formatCurrency = (value: string) => {
    const numero = value.replace(/\D/g, '');
    const valorNumerico = parseInt(numero) / 100;
    return valorNumerico.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handlePedidoMinimoChange = (value: string) => {
    const numero = value.replace(/\D/g, '');
    const valorNumerico = parseInt(numero) / 100;
    updateFormData({ pedidoMinimo: valorNumerico });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          Carregando dados...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Empresa de Faturamento */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Configurações Comerciais</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="empresaFaturamento">Empresa de Faturamento *</Label>
            <Combobox
              options={empresasOptions}
              value={formData.empresaFaturamento}
              onValueChange={(value) => updateFormData({ empresaFaturamento: value })}
              placeholder="Selecione a empresa"
              searchPlaceholder="Pesquisar empresa..."
              emptyText="Nenhuma empresa encontrada."
              disabled={readOnly || empresasFaturamento.length === 1}
            />
            {empresasFaturamento.length === 1 && (
              <p className="text-xs text-muted-foreground">
                Apenas uma empresa disponível
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="listaPrecos">Lista de Preços Associada</Label>
            <Combobox
              options={listasOptions}
              value={formData.listaPrecos}
              onValueChange={(value) => updateFormData({ listaPrecos: value })}
              placeholder="Selecione a lista de preços"
              searchPlaceholder="Pesquisar lista..."
              emptyText="Nenhuma lista encontrada."
              disabled={readOnly}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Vendedor Atribuído */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Vendedor Atribuído</h3>
        {usuario?.tipo === 'vendedor' && formData.vendedorAtribuido && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              O vendedor atribuído é automaticamente definido como você ({formData.vendedorAtribuido.nome}) e não pode ser alterado.
            </AlertDescription>
          </Alert>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="vendedor">Vendedor Responsável</Label>
            <Combobox
              options={vendedoresOptions}
              value={formData.vendedorAtribuido?.id || ''}
              onValueChange={handleVendedorChange}
              placeholder="Selecione um vendedor"
              searchPlaceholder="Pesquisar vendedor..."
              emptyText="Nenhum vendedor encontrado."
              disabled={readOnly || usuario?.tipo === 'vendedor'}
            />
            {formData.vendedorAtribuido && (
              <p className="text-xs text-muted-foreground">
                Email: {formData.vendedorAtribuido.email}
              </p>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Descontos */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Descontos e Valores</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="descontoPadrao">Desconto Padrão (%)</Label>
            <div className="relative">
              <Input
                id="descontoPadrao"
                type="number"
                min="0"
                max="99"
                value={formData.descontoPadrao || 0}
                onChange={(e) =>
                  updateFormData({ descontoPadrao: parseFloat(e.target.value) || 0 })
                }
                disabled={readOnly}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                %
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descontoFinanceiro">Desconto Financeiro (%)</Label>
            <div className="relative">
              <Input
                id="descontoFinanceiro"
                type="number"
                min="0"
                max="99"
                value={formData.descontoFinanceiro || 0}
                onChange={(e) =>
                  updateFormData({ descontoFinanceiro: parseFloat(e.target.value) || 0 })
                }
                disabled={readOnly}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                %
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pedidoMinimo">Pedido Mínimo (R$)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                R$
              </span>
              <Input
                id="pedidoMinimo"
                value={formatCurrency(((formData.pedidoMinimo || 0) * 100).toString())}
                onChange={(e) => handlePedidoMinimoChange(e.target.value)}
                disabled={readOnly}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Condições de Pagamento */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Condições de Pagamento Associadas</h3>
          {!readOnly && (
            <Button onClick={handleAbrirDialogCondicoes} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Gerenciar Condições
            </Button>
          )}
        </div>

        {formData.condicoesPagamentoAssociadas &&
        formData.condicoesPagamentoAssociadas.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Condição</TableHead>
                  <TableHead>Forma de Pagamento</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Desconto Extra</TableHead>
                  <TableHead>Pedido Mínimo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formData.condicoesPagamentoAssociadas.map((condicaoId) => {
                  const condicao = condicoesPagamento.find((c) => c.id === condicaoId);
                  if (!condicao) return null;

                  return (
                    <TableRow key={condicao.id}>
                      <TableCell className="font-medium">{condicao.nome}</TableCell>
                      <TableCell>{condicao.formaPagamento}</TableCell>
                      <TableCell>
                        {condicao.prazoPagamento === '0'
                          ? 'À vista'
                          : `${condicao.prazoPagamento} dias`}
                      </TableCell>
                      <TableCell>
                        {condicao.descontoExtra > 0 ? `${condicao.descontoExtra}%` : '-'}
                      </TableCell>
                      <TableCell>
                        R$ {condicao.valorPedidoMinimo.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2
                        })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground border rounded-md">
            Nenhuma condição de pagamento associada
          </div>
        )}
      </div>

      {/* Dialog para gerenciar condições de pagamento */}
      <Dialog open={dialogCondicaoAberto} onOpenChange={setDialogCondicaoAberto}>
        <DialogContent className="max-w-3xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Gerenciar Condições de Pagamento</DialogTitle>
            <DialogDescription>
              Selecione as condições de pagamento disponíveis para este cliente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
            {condicoesPagamento
              .filter((condicao) => condicao.ativo && condicao.id && condicao.nome)
              .map((condicao) => (
              <div
                key={condicao.id}
                className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent"
              >
                <Checkbox
                  id={`condicao-${condicao.id}`}
                  checked={condicoesDisponiveis.includes(condicao.id)}
                  onCheckedChange={() => toggleCondicao(condicao.id)}
                />
                <div className="flex-1">
                  <Label
                    htmlFor={`condicao-${condicao.id}`}
                    className="font-medium cursor-pointer"
                  >
                    {condicao.nome}
                  </Label>
                  <div className="text-sm text-muted-foreground mt-1">
                    {condicao.formaPagamento} •{' '}
                    {condicao.prazoPagamento === '0'
                      ? 'À vista'
                      : `${condicao.prazoPagamento} dias`}
                    {condicao.descontoExtra > 0 && ` • ${condicao.descontoExtra}% desconto`}
                    {condicao.valorPedidoMinimo > 0 &&
                      ` • Mínimo: R$ ${condicao.valorPedidoMinimo.toLocaleString('pt-BR')}`}
                  </div>
                </div>
              </div>
            ))}
            
            {condicoesPagamento.filter((c) => c.ativo && c.id && c.nome).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma condição de pagamento ativa cadastrada
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCondicaoAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarCondicoes}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}