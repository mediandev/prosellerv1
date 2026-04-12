import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { exportService } from '../services/exportService';
import { api } from '../services/api';
import { Download, FileSpreadsheet, CheckCircle2, Database, Package, ShoppingCart, UserCircle, Users } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface ExportResult {
  success: boolean;
  fileName?: string;
  recordCount?: number;
  recordCounts?: {
    vendas: number;
    clientes: number;
    produtos: number;
    vendedores: number;
  };
}

export function DataExportSettings() {
  const [exporting, setExporting] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<ExportResult | null>(null);
  const fetchAllVendas = async (pageSize: number = 100) => {
    const all: any[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const response = await api.vendas.list({ page, limit: pageSize });
      const pageItems = Array.isArray(response?.vendas) ? response.vendas : [];
      all.push(...pageItems);

      const pagination = response?.pagination || {};
      totalPages = Number(pagination.total_pages || pagination.totalPages || 1);
      page += 1;
    } while (page <= totalPages);

    return all;
  };

  const fetchAllClientes = async (pageSize: number = 100) => {
    const all: any[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const response = await api.get('clientes', { params: { page, limit: pageSize } }) as any;
      const pageItems = Array.isArray(response?.clientes) ? response.clientes : [];
      all.push(...pageItems);

      const pagination = response?.pagination || {};
      totalPages = Number(pagination.total_pages || pagination.totalPages || 1);
      page += 1;
    } while (page <= totalPages);

    return all;
  };

  const handleExport = async (tipo: 'vendas' | 'clientes' | 'produtos' | 'vendedores' | 'todos') => {
    setExporting(tipo);
    setLastExport(null);

    try {
      let result: ExportResult;

      switch (tipo) {
        case 'vendas': {
          const list = await fetchAllVendas();
          result = exportService.exportVendas(list);
          break;
        }
        case 'clientes': {
          const list = await fetchAllClientes();
          result = exportService.exportClientes(list);
          break;
        }
        case 'produtos': {
          const produtos = await api.get('produtos');
          const list = Array.isArray(produtos) ? produtos : [];
          result = exportService.exportProdutos(list);
          break;
        }
        case 'vendedores': {
          const vendedores = await api.get('vendedores');
          const list = Array.isArray(vendedores) ? vendedores : [];
          result = exportService.exportVendedores(list);
          break;
        }
        case 'todos': {
          const [vendas, clientes, produtos, vendedores] = await Promise.all([
            fetchAllVendas(),
            fetchAllClientes(),
            api.get('produtos'),
            api.get('vendedores'),
          ]);
          result = exportService.exportTodosDados(
            Array.isArray(vendas) ? vendas : [],
            Array.isArray(clientes) ? clientes : [],
            Array.isArray(produtos) ? produtos : [],
            Array.isArray(vendedores) ? vendedores : []
          );
          break;
        }
        default:
          throw new Error('Tipo de exportação inválido');
      }

      setLastExport(result);

      if (result.success) {
        toast.success('Exportação concluída!', {
          description: `Arquivo ${result.fileName} salvo com sucesso`,
        });
      }
    } catch (error) {
      toast.error('Erro ao exportar', {
        description: (error as Error).message,
      });
    } finally {
      setExporting(null);
    }
  };

  const exportCards = [
    {
      id: 'vendas',
      title: 'Exportar Vendas',
      description: 'Exporta todas as vendas cadastradas no sistema',
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      id: 'clientes',
      title: 'Exportar Clientes',
      description: 'Exporta todos os clientes cadastrados no sistema',
      icon: UserCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      id: 'produtos',
      title: 'Exportar Produtos',
      description: 'Exporta todos os produtos cadastrados no sistema',
      icon: Package,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      id: 'vendedores',
      title: 'Exportar Vendedores',
      description: 'Exporta todos os vendedores cadastrados no sistema',
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg">Exportação de Dados</h2>
        <p className="text-sm text-muted-foreground">
          Exporte seus dados para planilhas Excel para backup, análise ou migração
        </p>
      </div>

      {/* Exportação Completa */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Backup Completo do Sistema
          </CardTitle>
          <CardDescription>
            Exporte todos os dados do sistema em um único arquivo Excel com múltiplas abas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <ShoppingCart className="h-6 w-6 mx-auto mb-1 text-blue-600" />
              <p className="text-sm text-muted-foreground">Vendas</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <UserCircle className="h-6 w-6 mx-auto mb-1 text-green-600" />
              <p className="text-sm text-muted-foreground">Clientes</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <Package className="h-6 w-6 mx-auto mb-1 text-purple-600" />
              <p className="text-sm text-muted-foreground">Produtos</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <Users className="h-6 w-6 mx-auto mb-1 text-orange-600" />
              <p className="text-sm text-muted-foreground">Vendedores</p>
            </div>
          </div>

          <Button
            onClick={() => handleExport('todos')}
            disabled={exporting !== null}
            className="w-full"
            size="lg"
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting === 'todos' ? 'Exportando...' : 'Exportar Backup Completo'}
          </Button>

          {lastExport?.recordCounts && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <p className="font-medium mb-2">Exportação concluída com sucesso!</p>
                <div className="text-sm space-y-1">
                  <p>• {lastExport.recordCounts.vendas} vendas exportadas</p>
                  <p>• {lastExport.recordCounts.clientes} clientes exportados</p>
                  <p>• {lastExport.recordCounts.produtos} produtos exportados</p>
                  <p>• {lastExport.recordCounts.vendedores} vendedores exportados</p>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Exportações Individuais */}
      <div>
        <h3 className="font-medium mb-4">Exportações Individuais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exportCards.map((card) => {
            const Icon = card.icon;
            const isExporting = exporting === card.id;
            const wasLastExport = lastExport?.fileName && !lastExport?.recordCounts && exporting === null;

            return (
              <Card key={card.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className={`p-2 rounded-lg ${card.bgColor}`}>
                      <Icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                    {card.title}
                  </CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleExport(card.id as any)}
                    disabled={exporting !== null}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isExporting ? 'Exportando...' : 'Exportar'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Resultado da última exportação individual */}
      {lastExport && lastExport.recordCount !== undefined && !lastExport.recordCounts && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <p className="font-medium">Exportação concluída!</p>
            <p className="text-sm mt-1">
              {lastExport.recordCount} {lastExport.recordCount === 1 ? 'registro exportado' : 'registros exportados'}
            </p>
            <p className="text-sm mt-1">
              Arquivo: <span className="font-mono">{lastExport.fileName}</span>
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Informações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="h-5 w-5" />
            Informações sobre Exportação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">1</Badge>
              <div>
                <p className="font-medium">Formato do arquivo</p>
                <p className="text-muted-foreground">
                  Todos os arquivos são exportados no formato Excel (.xlsx) compatível com Excel, Google Sheets e LibreOffice
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">2</Badge>
              <div>
                <p className="font-medium">Dados exportados</p>
                <p className="text-muted-foreground">
                  A exportação inclui todos os campos cadastrados, mantendo a estrutura compatível com a importação
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">3</Badge>
              <div>
                <p className="font-medium">Uso do arquivo exportado</p>
                <p className="text-muted-foreground">
                  O arquivo pode ser usado como backup, para análise de dados ou como base para nova importação
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">4</Badge>
              <div>
                <p className="font-medium">Nome do arquivo</p>
                <p className="text-muted-foreground">
                  Os arquivos são nomeados automaticamente com tipo e timestamp (ex: clientes_export_20241101_143022.xlsx)
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

