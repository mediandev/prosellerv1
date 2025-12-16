import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { ImportHistory, TipoImportacao } from '../types/importHistory';
import { importService } from '../services/importService';
import { History, CheckCircle2, AlertCircle, XCircle, FileSpreadsheet, Eye, Undo2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner@2.0.3';

const tipoLabels: Record<TipoImportacao, string> = {
  vendas: 'Vendas',
  clientes: 'Clientes',
  produtos: 'Produtos',
  vendedores: 'Vendedores',
};

const statusConfig = {
  sucesso: {
    icon: CheckCircle2,
    variant: 'success' as const,
    label: 'Sucesso',
    color: 'text-green-600',
  },
  sucesso_parcial: {
    icon: AlertCircle,
    variant: 'warning' as const,
    label: 'Sucesso Parcial',
    color: 'text-amber-600',
  },
  erro: {
    icon: XCircle,
    variant: 'destructive' as const,
    label: 'Erro',
    color: 'text-red-600',
  },
};

export function ImportHistoryView() {
  const [selectedImport, setSelectedImport] = useState<ImportHistory | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filterTipo, setFilterTipo] = useState<TipoImportacao | 'todos'>('todos');
  const [undoDialogOpen, setUndoDialogOpen] = useState(false);
  const [importToUndo, setImportToUndo] = useState<ImportHistory | null>(null);
  const [undoing, setUndoing] = useState(false);
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([]);

  const handleViewDetails = (importItem: ImportHistory) => {
    setSelectedImport(importItem);
    setDetailsOpen(true);
  };

  const handleUndoClick = (importItem: ImportHistory) => {
    setImportToUndo(importItem);
    setUndoDialogOpen(true);
  };

  const handleConfirmUndo = async () => {
    if (!importToUndo) return;

    setUndoing(true);
    try {
      // Simula delay de processamento
      await new Promise(resolve => setTimeout(resolve, 1500));

      const result = importService.undoImport(importToUndo.id);

      if (result.success) {
        toast.success('Importação desfeita com sucesso!', {
          description: `${result.removedCount} ${result.removedCount === 1 ? 'registro removido' : 'registros removidos'}`,
        });
        setUndoDialogOpen(false);
        setImportToUndo(null);
      } else {
        toast.error('Erro ao desfazer importação', {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error('Erro ao desfazer importação', {
        description: (error as Error).message,
      });
    } finally {
      setUndoing(false);
    }
  };

  const filteredHistory = filterTipo === 'todos' 
    ? importHistory 
    : importHistory.filter(item => item.tipo === filterTipo);

  const sortedHistory = [...filteredHistory].sort(
    (a, b) => b.dataImportacao.getTime() - a.dataImportacao.getTime()
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Importações
          </CardTitle>
          <CardDescription>
            Visualize todas as importações realizadas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <Tabs value={filterTipo} onValueChange={(v) => setFilterTipo(v as TipoImportacao | 'todos')}>
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="vendas">Vendas</TabsTrigger>
              <TabsTrigger value="clientes">Clientes</TabsTrigger>
              <TabsTrigger value="produtos">Produtos</TabsTrigger>
              <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Tabela de histórico */}
          {sortedHistory.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma importação realizada ainda</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Sucesso</TableHead>
                    <TableHead className="text-center">Erros</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedHistory.map((item) => {
                    const StatusIcon = statusConfig[item.status].icon;
                    const canUndo = importService.canUndo(item.id);
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(item.dataImportacao, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{tipoLabels[item.tipo]}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{item.nomeArquivo}</TableCell>
                        <TableCell>{item.usuarioNome}</TableCell>
                        <TableCell className="text-center">{item.totalLinhas}</TableCell>
                        <TableCell className="text-center text-green-600">
                          {item.sucessos}
                        </TableCell>
                        <TableCell className="text-center text-red-600">
                          {item.erros}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusIcon className={`h-4 w-4 ${statusConfig[item.status].color}`} />
                            <span className="text-sm">{statusConfig[item.status].label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(item)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Detalhes
                            </Button>
                            {canUndo && item.sucessos > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUndoClick(item)}
                                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              >
                                <Undo2 className="h-4 w-4 mr-2" />
                                Desfazer
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalhes */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Detalhes da Importação</DialogTitle>
            <DialogDescription>
              Informações completas sobre a importação realizada
            </DialogDescription>
          </DialogHeader>

          {selectedImport && (
            <div className="space-y-6">
              {/* Informações Gerais */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="font-medium">{tipoLabels[selectedImport.tipo]}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data/Hora</p>
                  <p className="font-medium">
                    {format(selectedImport.dataImportacao, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Arquivo</p>
                  <p className="font-medium font-mono text-sm">{selectedImport.nomeArquivo}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Usuário</p>
                  <p className="font-medium">{selectedImport.usuarioNome}</p>
                </div>
              </div>

              {/* Estatísticas */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{selectedImport.totalLinhas}</p>
                      <p className="text-sm text-muted-foreground">Total de Linhas</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{selectedImport.sucessos}</p>
                      <p className="text-sm text-muted-foreground">Importados</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{selectedImport.erros}</p>
                      <p className="text-sm text-muted-foreground">Erros</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Status */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Status da Importação</p>
                <div className="flex items-center gap-2">
                  {React.createElement(statusConfig[selectedImport.status].icon, {
                    className: `h-5 w-5 ${statusConfig[selectedImport.status].color}`,
                  })}
                  <span className="font-medium">{statusConfig[selectedImport.status].label}</span>
                </div>
              </div>

              {/* Erros Detalhados */}
              {selectedImport.detalhesErros && selectedImport.detalhesErros.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Erros Encontrados</p>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-24">Linha</TableHead>
                          <TableHead>Descrição do Erro</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedImport.detalhesErros.map((erro, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono">{erro.row}</TableCell>
                            <TableCell>{erro.message}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Desfazer */}
      <AlertDialog open={undoDialogOpen} onOpenChange={setUndoDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Desfazer Importação
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4 mt-4">
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <p className="font-medium mb-2">Atenção: Esta ação não pode ser desfeita!</p>
                    <p className="text-sm">
                      Todos os registros importados serão removidos permanentemente do sistema.
                    </p>
                  </AlertDescription>
                </Alert>

                {importToUndo && (
                  <div className="space-y-2 text-sm">
                    <p><strong>Importação:</strong> {tipoLabels[importToUndo.tipo]}</p>
                    <p><strong>Arquivo:</strong> {importToUndo.nomeArquivo}</p>
                    <p><strong>Data:</strong> {format(importToUndo.dataImportacao, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                    <p className="text-red-600 font-medium">
                      <strong>Registros a remover:</strong> {importToUndo.sucessos}
                    </p>
                  </div>
                )}

                <p className="text-sm text-muted-foreground">
                  Tem certeza que deseja desfazer esta importação?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={undoing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmUndo}
              disabled={undoing}
              className="bg-red-600 hover:bg-red-700"
            >
              {undoing ? 'Desfazendo...' : 'Sim, Desfazer Importação'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}