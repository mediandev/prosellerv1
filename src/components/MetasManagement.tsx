import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Target, TrendingUp, Calendar, Copy, Trash2, Edit, Plus, Download, Upload, AlertCircle } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { api } from "../services/api";
import {
  VendedorMeta,
  buscarTodasMetas,
  salvarMeta,
  atualizarMeta,
  deletarMeta,
  copiarMetas,
  buscarMetaTotal,
} from "../services/metasService";
import { Alert, AlertDescription } from "./ui/alert";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: 'backoffice' | 'vendedor';
  ativo: boolean;
}

export function MetasManagement() {
  const [metas, setMetas] = useState<VendedorMeta[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  
  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  
  // Edit form state
  const [editingMeta, setEditingMeta] = useState<Partial<VendedorMeta> | null>(null);
  const [editVendedorId, setEditVendedorId] = useState("");
  const [editMetaMensal, setEditMetaMensal] = useState("");
  
  // Copy form state
  const [copyFromYear, setCopyFromYear] = useState(new Date().getFullYear());
  const [copyFromMonth, setCopyFromMonth] = useState(new Date().getMonth() + 1);
  const [copyToYear, setCopyToYear] = useState(new Date().getFullYear());
  const [copyToMonth, setCopyToMonth] = useState(new Date().getMonth() + 1);
  
  // Bulk edit state
  const [bulkMetaValue, setBulkMetaValue] = useState("");
  
  const [metaTotal, setMetaTotal] = useState(0);

  const meses = [
    { value: 1, label: "Janeiro" },
    { value: 2, label: "Fevereiro" },
    { value: 3, label: "Março" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Maio" },
    { value: 6, label: "Junho" },
    { value: 7, label: "Julho" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" },
    { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" },
    { value: 12, label: "Dezembro" },
  ];

  const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  useEffect(() => {
    carregarDados();
  }, [selectedYear, selectedMonth]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      // Carregar vendedores
      const usuariosData = await api.get('usuarios');
      const vendedores = usuariosData.filter((u: Usuario) => u.tipo === 'vendedor' && u.ativo);
      setUsuarios(vendedores);

      // Carregar metas
      const metasData = await buscarTodasMetas();
      
      console.log('[METAS] Dados brutos recebidos:', metasData);
      console.log('[METAS] Primeira meta (se existir):', metasData[0]);
      console.log('[METAS] Tipo da primeira meta:', typeof metasData[0]);
      console.log('[METAS] Propriedades da primeira meta:', metasData[0] ? Object.keys(metasData[0]) : 'nenhuma');
      
      // Filtrar valores null e verificar se tem as propriedades necessárias
      const metasValidas = metasData.filter((m): m is VendedorMeta => {
        const isValid = m != null && 
          typeof m === 'object' && 
          'ano' in m && 
          'mes' in m &&
          typeof m.ano === 'number' &&
          typeof m.mes === 'number';
        
        if (!isValid) {
          console.log('[METAS] Meta inválida detectada:', m);
        }
        
        return isValid;
      });
      
      // Filtrar por período selecionado
      const metasPeriodo = metasValidas.filter(
        m => m.ano === selectedYear && m.mes === selectedMonth
      );
      setMetas(metasPeriodo);

      // Calcular meta total
      const total = await buscarMetaTotal(selectedYear, selectedMonth);
      console.log('[METAS] buscarMetaTotal retornou:', { total, tipo: typeof total });
      setMetaTotal(total);

      console.log('[METAS] Dados carregados:', {
        vendedores: vendedores.length,
        metasTotal: metasData.length,
        metasValidas: metasValidas.length,
        metasPeriodo: metasPeriodo.length,
        total,
      });
    } catch (error) {
      console.error('[METAS] Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados das metas');
    } finally {
      setLoading(false);
    }
  };

  const handleNovaMeta = () => {
    setEditingMeta(null);
    setEditVendedorId("");
    setEditMetaMensal("");
    setEditDialogOpen(true);
  };

  const handleEditarMeta = (meta: VendedorMeta) => {
    setEditingMeta(meta);
    setEditVendedorId(meta.vendedorId);
    setEditMetaMensal(meta.metaMensal.toString());
    setEditDialogOpen(true);
  };

  const handleSalvarMeta = async () => {
    if (!editVendedorId || !editMetaMensal) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const metaMensal = parseFloat(editMetaMensal);
    if (isNaN(metaMensal) || metaMensal < 0) {
      toast.error('Valor da meta inválido');
      return;
    }

    console.log('[METAS FRONTEND] Salvando meta:', {
      editingMeta: !!editingMeta,
      vendedorId: editVendedorId,
      ano: selectedYear,
      mes: selectedMonth,
      metaMensal,
    });

    try {
      if (editingMeta) {
        // Atualizar meta existente
        console.log('[METAS FRONTEND] Chamando atualizarMeta');
        const resultado = await atualizarMeta(editVendedorId, selectedYear, selectedMonth, metaMensal);
        console.log('[METAS FRONTEND] Resultado atualizarMeta:', resultado);
        toast.success('Meta atualizada com sucesso!');
      } else {
        // Criar nova meta
        console.log('[METAS FRONTEND] Chamando salvarMeta');
        const resultado = await salvarMeta(editVendedorId, selectedYear, selectedMonth, metaMensal, 0);
        console.log('[METAS FRONTEND] Resultado salvarMeta:', resultado);
        toast.success('Meta criada com sucesso!');
      }

      setEditDialogOpen(false);
      
      console.log('[METAS FRONTEND] Recarregando dados...');
      await carregarDados();
    } catch (error) {
      console.error('[METAS FRONTEND] Erro ao salvar meta:', error);
      toast.error('Erro ao salvar meta');
    }
  };

  const handleDeletarMeta = async (meta: VendedorMeta) => {
    if (!confirm(`Deseja realmente excluir a meta de ${meta.vendedorNome}?`)) {
      return;
    }

    try {
      await deletarMeta(meta.vendedorId, meta.ano, meta.mes);
      toast.success('Meta excluída com sucesso!');
      await carregarDados();
    } catch (error) {
      console.error('[METAS] Erro ao deletar meta:', error);
      toast.error('Erro ao excluir meta');
    }
  };

  const handleCopiarMetas = async () => {
    if (copyFromYear === copyToYear && copyFromMonth === copyToMonth) {
      toast.error('Os períodos de origem e destino não podem ser iguais');
      return;
    }

    try {
      const result = await copiarMetas(copyFromYear, copyFromMonth, copyToYear, copyToMonth);
      
      if (result.success && result.copiedCount) {
        toast.success(`${result.copiedCount} meta(s) copiada(s) com sucesso!`);
        setCopyDialogOpen(false);
        
        // Se copiou para o período atual, recarregar
        if (copyToYear === selectedYear && copyToMonth === selectedMonth) {
          await carregarDados();
        }
      } else {
        toast.error('Nenhuma meta encontrada no período de origem');
      }
    } catch (error) {
      console.error('[METAS] Erro ao copiar metas:', error);
      toast.error('Erro ao copiar metas');
    }
  };

  const handleDefinirMetasEmLote = async () => {
    const metaMensal = parseFloat(bulkMetaValue);
    if (isNaN(metaMensal) || metaMensal < 0) {
      toast.error('Valor da meta inválido');
      return;
    }

    try {
      let count = 0;
      for (const vendedor of usuarios) {
        await salvarMeta(vendedor.id, selectedYear, selectedMonth, metaMensal, 0);
        count++;
      }

      toast.success(`${count} meta(s) definida(s) com sucesso!`);
      setBulkEditDialogOpen(false);
      await carregarDados();
    } catch (error) {
      console.error('[METAS] Erro ao definir metas em lote:', error);
      toast.error('Erro ao definir metas em lote');
    }
  };

  const getMetaVendedor = (vendedorId: string): VendedorMeta | undefined => {
    return metas.find(m => m.vendedorId === vendedorId);
  };

  const calcularPercentualAtingido = (vendidoMes: number, metaMensal: number): number => {
    if (metaMensal === 0) return 0;
    return (vendidoMes / metaMensal) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const vendedoresSemMeta = usuarios.filter(u => !getMetaVendedor(u.id));

  return (
    <div className="space-y-6">
      {/* Header com período selecionado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {meses.map((mes) => (
                <SelectItem key={mes.value} value={mes.value.toString()}>
                  {mes.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {anos.map((ano) => (
                <SelectItem key={ano} value={ano.toString()}>
                  {ano}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meta Total</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metaTotal)}
            </div>
            <p className="text-xs text-muted-foreground">
              {metas.length} vendedor(es) com meta definida
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendedores Ativos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usuarios.length}</div>
            <p className="text-xs text-muted-foreground">
              {vendedoresSemMeta.length} sem meta definida
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Período</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {meses.find(m => m.value === selectedMonth)?.label}
            </div>
            <p className="text-xs text-muted-foreground">{selectedYear}</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerta se houver vendedores sem meta */}
      {vendedoresSemMeta.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {vendedoresSemMeta.length} vendedor(es) ainda não possui(em) meta definida para este período.
            <Button
              variant="link"
              className="ml-2 p-0 h-auto"
              onClick={handleNovaMeta}
            >
              Definir metas
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Ações */}
      <div className="flex items-center gap-2">
        <Button onClick={handleNovaMeta}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Meta
        </Button>
        <Button variant="outline" onClick={() => setBulkEditDialogOpen(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Definir em Lote
        </Button>
        <Button variant="outline" onClick={() => setCopyDialogOpen(true)}>
          <Copy className="h-4 w-4 mr-2" />
          Copiar Período
        </Button>
      </div>

      {/* Tabela de metas */}
      <Card>
        <CardHeader>
          <CardTitle>Metas por Vendedor</CardTitle>
          <CardDescription>
            Visualize e gerencie as metas individuais de cada vendedor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Meta Mensal</TableHead>
                <TableHead className="text-right">Vendido</TableHead>
                <TableHead className="text-right">Atingimento</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((vendedor) => {
                const meta = getMetaVendedor(vendedor.id);
                const percentual = meta ? calcularPercentualAtingido(meta.vendidoMes, meta.metaMensal) : 0;

                return (
                  <TableRow key={vendedor.id}>
                    <TableCell className="font-medium">{vendedor.nome}</TableCell>
                    <TableCell className="text-right">
                      {meta
                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(meta.metaMensal)
                        : <span className="text-muted-foreground">-</span>
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      {meta && meta.vendidoMes > 0
                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(meta.vendidoMes)
                        : <span className="text-muted-foreground">-</span>
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      {meta ? `${percentual.toFixed(1)}%` : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {meta ? (
                        <Badge variant={percentual >= 100 ? "default" : percentual >= 80 ? "secondary" : "destructive"}>
                          {percentual >= 100 ? "Atingida" : percentual >= 80 ? "Próximo" : "Abaixo"}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Sem meta</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {meta ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditarMeta(meta)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletarMeta(meta)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingMeta(null);
                              setEditVendedorId(vendedor.id);
                              setEditMetaMensal("");
                              setEditDialogOpen(true);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Definir
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de Edição/Criação */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMeta ? 'Editar Meta' : 'Nova Meta'}</DialogTitle>
            <DialogDescription>
              Defina a meta mensal para o vendedor selecionado
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Vendedor</Label>
              <Select
                value={editVendedorId}
                onValueChange={setEditVendedorId}
                disabled={!!editingMeta}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {usuarios.map((vendedor) => (
                    <SelectItem key={vendedor.id} value={vendedor.id}>
                      {vendedor.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Meta Mensal (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editMetaMensal}
                onChange={(e) => setEditMetaMensal(e.target.value)}
                placeholder="0,00"
              />
            </div>

            <div className="text-sm text-muted-foreground">
              Período: {meses.find(m => m.value === selectedMonth)?.label} de {selectedYear}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarMeta}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Cópia */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copiar Metas</DialogTitle>
            <DialogDescription>
              Copie as metas de um período para outro
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Período de Origem</Label>
              <div className="flex gap-2">
                <Select value={copyFromMonth.toString()} onValueChange={(v) => setCopyFromMonth(parseInt(v))}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {meses.map((mes) => (
                      <SelectItem key={mes.value} value={mes.value.toString()}>
                        {mes.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={copyFromYear.toString()} onValueChange={(v) => setCopyFromYear(parseInt(v))}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {anos.map((ano) => (
                      <SelectItem key={ano} value={ano.toString()}>
                        {ano}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Período de Destino</Label>
              <div className="flex gap-2">
                <Select value={copyToMonth.toString()} onValueChange={(v) => setCopyToMonth(parseInt(v))}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {meses.map((mes) => (
                      <SelectItem key={mes.value} value={mes.value.toString()}>
                        {mes.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={copyToYear.toString()} onValueChange={(v) => setCopyToYear(parseInt(v))}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {anos.map((ano) => (
                      <SelectItem key={ano} value={ano.toString()}>
                        {ano}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCopiarMetas}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar Metas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição em Lote */}
      <Dialog open={bulkEditDialogOpen} onOpenChange={setBulkEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir Metas em Lote</DialogTitle>
            <DialogDescription>
              Defina a mesma meta para todos os vendedores ativos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Meta Mensal (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={bulkMetaValue}
                onChange={(e) => setBulkMetaValue(e.target.value)}
                placeholder="0,00"
              />
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Esta ação irá definir a meta de R$ {bulkMetaValue || '0,00'} para {usuarios.length} vendedor(es).
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleDefinirMetasEmLote}>
              Aplicar a Todos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}