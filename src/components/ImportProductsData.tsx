import React, { useState } from 'react';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, Eye, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { api } from '../services/api';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ImportResult {
  success: number;
  errors: Array<{ row: number; message: string }>;
}

interface PreviewData {
  data: any[];
  fileName: string;
  validationErrors: Array<{ row: number; message: string }>;
  produtosExistentes: Map<string, any>; // Map<sku|ean, produto>
  produtosParaAtualizar: Set<number>; // Set<rowNumber>
}

export function ImportProductsData() {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const generateTemplate = () => {
    const template = [
      {
        'Descrição': 'Produto Exemplo ABC',
        'Código SKU': 'PROD-001',
        'Código EAN': '7891234567890',
        'Marca': 'Marca Exemplo',
        'Tipo Produto': 'Tipo A',
        'NCM': '12345678',
        'CEST': '1234567',
        'Unidade (Sigla)': 'UN',
        'Peso Líquido (kg)': 1.5,
        'Peso Bruto (kg)': 2.0,
        'Situação': 'Ativo',
        'Disponível para Venda': 'Sim',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos');

    const colWidths = [
      { wch: 35 }, // Descrição
      { wch: 15 }, // SKU
      { wch: 18 }, // EAN
      { wch: 20 }, // Marca
      { wch: 20 }, // Tipo
      { wch: 12 }, // NCM
      { wch: 12 }, // CEST
      { wch: 15 }, // Unidade
      { wch: 18 }, // Peso Líquido
      { wch: 18 }, // Peso Bruto
      { wch: 15 }, // Situação
      { wch: 22 }, // Disponível
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, 'modelo_importacao_produtos.xlsx');
  };

  const validateRow = (row: any, rowNumber: number): string | null => {
    if (!row['Descrição']) return 'Descrição é obrigatória';
    if (!row['Código SKU']) return 'Código SKU é obrigatório';
    if (!row['Marca']) return 'Marca é obrigatória';
    if (!row['Tipo Produto']) return 'Tipo de Produto é obrigatório';
    if (!row['Unidade (Sigla)']) return 'Unidade é obrigatória';
    
    if (row['Peso Líquido (kg)'] === undefined || row['Peso Líquido (kg)'] === null || row['Peso Líquido (kg)'] === '') {
      return 'Peso Líquido é obrigatório';
    }
    
    if (row['Peso Bruto (kg)'] === undefined || row['Peso Bruto (kg)'] === null || row['Peso Bruto (kg)'] === '') {
      return 'Peso Bruto é obrigatório';
    }

    // Validar peso
    const pesoLiquido = Number(row['Peso Líquido (kg)']);
    const pesoBruto = Number(row['Peso Bruto (kg)']);
    
    if (pesoLiquido < 0 || pesoBruto < 0) {
      return 'Pesos não podem ser negativos';
    }

    if (pesoBruto < pesoLiquido) {
      return 'Peso Bruto deve ser maior ou igual ao Peso Líquido';
    }

    // Validar situação
    const situacoesValidas = ['Ativo', 'Inativo', 'Excluído'];
    if (row['Situação'] && !situacoesValidas.includes(row['Situação'])) {
      return 'Situação deve ser: Ativo, Inativo ou Excluído';
    }

    // Validar disponível
    const disponibilidadeValida = ['Sim', 'Não', 'sim', 'não', 'S', 'N', 's', 'n'];
    if (row['Disponível para Venda'] && !disponibilidadeValida.includes(row['Disponível para Venda'])) {
      return 'Disponível para Venda deve ser: Sim ou Não';
    }

    // Validar EAN (se informado)
    if (row['Código EAN']) {
      const ean = String(row['Código EAN']).replace(/\D/g, '');
      if (ean.length !== 13 && ean.length !== 8) {
        return 'Código EAN deve ter 8 ou 13 dígitos';
      }
    }

    // Validar NCM (se informado)
    if (row['NCM']) {
      const ncm = String(row['NCM']).replace(/\D/g, '');
      if (ncm.length !== 8) {
        return 'NCM deve ter 8 dígitos';
      }
    }

    // Validar CEST (se informado)
    if (row['CEST']) {
      const cest = String(row['CEST']).replace(/\D/g, '');
      if (cest.length !== 7) {
        return 'CEST deve ter 7 dígitos';
      }
    }

    return null;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const errors: Array<{ row: number; message: string }> = [];

      jsonData.forEach((row: any, index: number) => {
        const rowNumber = index + 2;
        const error = validateRow(row, rowNumber);
        if (error) {
          errors.push({ row: rowNumber, message: error });
        }
      });

      // Buscar produtos existentes para verificar duplicatas
      console.log('[IMPORT-PRODUTOS] Buscando produtos existentes para verificar duplicatas...');
      let produtosExistentes = new Map<string, any>();
      let produtosParaAtualizar = new Set<number>();

      try {
        const produtosAPI = await api.get('produtos');
        const produtos = Array.isArray(produtosAPI) ? produtosAPI : [];

        // Criar mapa de produtos por SKU e EAN
        produtos.forEach((produto: any) => {
          const sku = produto.codigoSku || produto.codigo_sku;
          const ean = produto.codigoEan || produto.gtin || produto.codigo_ean;
          
          if (sku && sku.trim()) {
            produtosExistentes.set(`SKU:${sku.trim().toUpperCase()}`, produto);
          }
          if (ean && ean.trim()) {
            produtosExistentes.set(`EAN:${ean.trim()}`, produto);
          }
        });

        console.log(`[IMPORT-PRODUTOS] ${produtosExistentes.size} produtos únicos encontrados no banco`);

        // Verificar quais produtos da planilha já existem
        jsonData.forEach((row: any, index: number) => {
          const rowNumber = index + 2;
          
          // Pular se tiver erro de validação
          if (errors.some(e => e.row === rowNumber)) {
            return;
          }

          const sku = row['Código SKU'] ? String(row['Código SKU']).trim().toUpperCase() : '';
          const ean = row['Código EAN'] ? String(row['Código EAN']).replace(/\D/g, '').trim() : '';

          // Verificar por SKU
          if (sku && produtosExistentes.has(`SKU:${sku}`)) {
            produtosParaAtualizar.add(rowNumber);
            console.log(`[IMPORT-PRODUTOS] Produto na linha ${rowNumber} será ATUALIZADO (SKU: ${sku})`);
            return;
          }

          // Verificar por EAN (se informado)
          if (ean && produtosExistentes.has(`EAN:${ean}`)) {
            produtosParaAtualizar.add(rowNumber);
            console.log(`[IMPORT-PRODUTOS] Produto na linha ${rowNumber} será ATUALIZADO (EAN: ${ean})`);
            return;
          }
        });

        console.log(`[IMPORT-PRODUTOS] ${produtosParaAtualizar.size} produtos serão atualizados, ${jsonData.length - produtosParaAtualizar.size - errors.length} serão criados`);
      } catch (error) {
        console.error('[IMPORT-PRODUTOS] Erro ao buscar produtos existentes:', error);
        // Continuar mesmo se houver erro ao buscar produtos existentes
      }

      setPreview({
        data: jsonData,
        fileName: file.name,
        validationErrors: errors,
        produtosExistentes,
        produtosParaAtualizar,
      });
      setShowPreview(true);
      setResult(null);

    } catch (error) {
      setResult({ 
        success: 0, 
        errors: [{ row: 0, message: 'Erro ao ler arquivo: ' + (error as Error).message }] 
      });
    } finally {
      event.target.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!preview) return;

    setImporting(true);

    try {
      // Buscar dados de referência
      const [marcasAPI, tiposAPI, unidadesAPI] = await Promise.all([
        api.get('marcas'),
        api.get('tiposProduto'),
        api.get('unidadesMedida'),
      ]);

      const marcas = Array.isArray(marcasAPI) ? marcasAPI : [];
      const tipos = Array.isArray(tiposAPI) ? tiposAPI : [];
      const unidades = Array.isArray(unidadesAPI) ? unidadesAPI : [];

      // Função helper para buscar ou criar marca
      const getOrCreateMarca = async (nomeMarca: string): Promise<string> => {
        const marcaExistente = marcas.find((m: any) => 
          (m.nome || m.descricao)?.toLowerCase().trim() === nomeMarca.toLowerCase().trim()
        );
        
        if (marcaExistente) {
          return String(marcaExistente.id);
        }

        // Criar nova marca
        try {
          const response = await api.create('marcas', {
            nome: nomeMarca.trim(),
            ativo: true,
          });
          const novaMarca = response?.data || response;
          if (novaMarca) {
            marcas.push(novaMarca);
            return String(novaMarca.id);
          }
          throw new Error('Resposta inválida ao criar marca');
        } catch (error: any) {
          throw new Error(`Erro ao criar marca "${nomeMarca}": ${error.message}`);
        }
      };

      // Função helper para buscar ou criar tipo de produto
      const getOrCreateTipo = async (nomeTipo: string): Promise<string> => {
        const tipoExistente = tipos.find((t: any) => 
          t.nome?.toLowerCase().trim() === nomeTipo.toLowerCase().trim()
        );
        
        if (tipoExistente) {
          return String(tipoExistente.id);
        }

        // Criar novo tipo
        try {
          const response = await api.create('tiposProduto', {
            nome: nomeTipo.trim(),
            ativo: true,
          });
          const novoTipo = response?.data || response;
          if (novoTipo) {
            tipos.push(novoTipo);
            return String(novoTipo.id);
          }
          throw new Error('Resposta inválida ao criar tipo de produto');
        } catch (error: any) {
          throw new Error(`Erro ao criar tipo de produto "${nomeTipo}": ${error.message}`);
        }
      };

      // Função helper para buscar ou criar unidade
      const getOrCreateUnidade = async (siglaUnidade: string): Promise<string> => {
        const unidadeExistente = unidades.find((u: any) => 
          u.sigla?.toUpperCase().trim() === siglaUnidade.toUpperCase().trim()
        );
        
        if (unidadeExistente) {
          return String(unidadeExistente.id);
        }

        // Criar nova unidade
        try {
          const response = await api.create('unidadesMedida', {
            sigla: siglaUnidade.toUpperCase().trim(),
            descricao: siglaUnidade.toUpperCase().trim(),
            ativo: true,
          });
          const novaUnidade = response?.data || response;
          if (novaUnidade) {
            unidades.push(novaUnidade);
            return String(novaUnidade.id);
          }
          throw new Error('Resposta inválida ao criar unidade');
        } catch (error: any) {
          throw new Error(`Erro ao criar unidade "${siglaUnidade}": ${error.message}`);
        }
      };

      // Filtrar apenas produtos válidos (sem erros de validação)
      const produtosValidos = preview.data.filter((row: any, index: number) => {
        const rowNumber = index + 2;
        return !preview.validationErrors.some(e => e.row === rowNumber);
      });

      if (produtosValidos.length === 0) {
        toast.error('Nenhum produto válido para importar');
        setImporting(false);
        return;
      }

      // Importar produtos
      const errors: Array<{ row: number; message: string }> = [...preview.validationErrors];
      let successCount = 0;
      let createdCount = 0;
      let updatedCount = 0;

      for (let index = 0; index < preview.data.length; index++) {
        const row = preview.data[index];
        const rowNumber = index + 2;

        // Pular produtos com erro de validação
        if (preview.validationErrors.some(e => e.row === rowNumber)) {
          continue;
        }

        try {
          // Verificar se produto já existe (será atualizado)
          const sku = String(row['Código SKU']).trim().toUpperCase();
          const ean = row['Código EAN'] ? String(row['Código EAN']).replace(/\D/g, '').trim() : '';
          
          let produtoExistente: any = null;
          if (preview.produtosExistentes) {
            if (sku && preview.produtosExistentes.has(`SKU:${sku}`)) {
              produtoExistente = preview.produtosExistentes.get(`SKU:${sku}`);
            } else if (ean && preview.produtosExistentes.has(`EAN:${ean}`)) {
              produtoExistente = preview.produtosExistentes.get(`EAN:${ean}`);
            }
          }

          // Buscar ou criar marca
          const marcaId = await getOrCreateMarca(row['Marca']);

          // Buscar ou criar tipo de produto
          const tipoId = await getOrCreateTipo(row['Tipo Produto']);

          // Buscar ou criar unidade
          const unidadeId = await getOrCreateUnidade(row['Unidade (Sigla)']);

          // Mapear dados da planilha para o formato da API
          const produtoData = {
            descricao: String(row['Descrição']).trim(),
            codigoSku: String(row['Código SKU']).trim(),
            codigoEan: row['Código EAN'] ? String(row['Código EAN']).replace(/\D/g, '') : undefined,
            marcaId: marcaId,
            tipoProdutoId: tipoId,
            unidadeId: unidadeId,
            ncm: row['NCM'] ? String(row['NCM']).replace(/\D/g, '') : undefined,
            cest: row['CEST'] ? String(row['CEST']).replace(/\D/g, '') : undefined,
            pesoLiquido: Number(row['Peso Líquido (kg)']) || 0,
            pesoBruto: Number(row['Peso Bruto (kg)']) || 0,
            situacao: row['Situação'] || 'Ativo',
            disponivel: row['Disponível para Venda'] && 
              ['Sim', 'sim', 'S', 's'].includes(String(row['Disponível para Venda'])),
          };

          // Atualizar ou criar produto
          if (produtoExistente) {
            const produtoId = produtoExistente.id || produtoExistente.produto_id;
            await api.update('produtos', produtoId, produtoData);
            console.log(`[IMPORT-PRODUTOS] Produto atualizado (linha ${rowNumber}): ${produtoId}`);
            updatedCount++;
          } else {
            await api.create('produtos', produtoData);
            console.log(`[IMPORT-PRODUTOS] Produto criado (linha ${rowNumber})`);
            createdCount++;
          }
          successCount++;

        } catch (error: any) {
          errors.push({
            row: rowNumber,
            message: `Erro ao importar: ${error.message || 'Erro desconhecido'}`,
          });
          console.error(`[IMPORT-PRODUTOS] Erro na linha ${rowNumber}:`, error);
        }
      }

      // Mostrar resultado
      if (successCount > 0) {
        const messages = [];
        if (createdCount > 0) {
          messages.push(`${createdCount} ${createdCount === 1 ? 'produto criado' : 'produtos criados'}`);
        }
        if (updatedCount > 0) {
          messages.push(`${updatedCount} ${updatedCount === 1 ? 'produto atualizado' : 'produtos atualizados'}`);
        }
        toast.success(`${messages.join(' e ')} com sucesso!`);
      }

      if (errors.length > preview.validationErrors.length) {
        toast.warning(`${errors.length - preview.validationErrors.length} ${errors.length - preview.validationErrors.length === 1 ? 'erro' : 'erros'} durante a importação`);
      }

      await api.importLogs.create({
        tipo: 'produtos',
        nomeArquivo: preview.fileName,
        totalLinhas: preview.data.length,
        sucessos: successCount,
        erros: errors.length,
        status: errors.length === 0 ? 'sucesso' : (successCount > 0 ? 'sucesso_parcial' : 'erro'),
        detalhesErros: errors,
      });

      setResult({ 
        success: successCount, 
        errors: errors 
      });
      setShowPreview(false);
      setPreview(null);

    } catch (error: any) {
      console.error('[IMPORT-PRODUTOS] Erro geral:', error);
      toast.error(`Erro ao importar produtos: ${error.message || 'Erro desconhecido'}`);
      if (preview) {
        await api.importLogs.create({
          tipo: 'produtos',
          nomeArquivo: preview.fileName,
          totalLinhas: preview.data.length,
          sucessos: 0,
          erros: 1,
          status: 'erro',
          detalhesErros: [{ row: 0, message: 'Erro ao importar: ' + (error.message || 'Erro desconhecido') }],
        });
      }
      setResult({ 
        success: 0, 
        errors: [{ row: 0, message: 'Erro ao importar: ' + (error.message || 'Erro desconhecido') }] 
      });
    } finally {
      setImporting(false);
    }
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setPreview(null);
  };

  if (showPreview && preview) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview da Importação - Produtos
          </CardTitle>
          <CardDescription>
            Arquivo: <span className="font-mono">{preview.fileName}</span> • {preview.data.length} {preview.data.length === 1 ? 'produto' : 'produtos'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Alertas de Validação */}
          {preview.validationErrors.length > 0 && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <p className="font-medium mb-2">
                  {preview.validationErrors.length} {preview.validationErrors.length === 1 ? 'erro encontrado' : 'erros encontrados'}
                </p>
                <p className="text-sm">
                  Os produtos com erro não serão importados. Corrija o arquivo e tente novamente, ou prossiga com a importação dos produtos válidos.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Estatísticas */}
          <div className="grid grid-cols-4 gap-4">
            <div className="border rounded-lg p-4 text-center">
              <p className="text-2xl font-bold">{preview.data.length}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
            <div className="border rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{preview.data.length - preview.validationErrors.length - (preview.produtosParaAtualizar?.size || 0)}</p>
              <p className="text-sm text-muted-foreground">Novos</p>
            </div>
            <div className="border rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{preview.produtosParaAtualizar?.size || 0}</p>
              <p className="text-sm text-muted-foreground">Atualizar</p>
            </div>
            <div className="border rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{preview.validationErrors.length}</p>
              <p className="text-sm text-muted-foreground">Com Erro</p>
            </div>
          </div>

          {/* Preview dos Dados */}
          <div>
            <h4 className="font-medium mb-2">Preview dos Dados (primeiras 10 linhas)</h4>
            <ScrollArea className="h-[400px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Linha</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Peso Líq.</TableHead>
                    <TableHead>Peso Bruto</TableHead>
                    <TableHead className="w-24">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.data.slice(0, 10).map((row: any, idx: number) => {
                    const rowNumber = idx + 2;
                    const hasError = preview.validationErrors.some(e => e.row === rowNumber);
                    const willUpdate = preview.produtosParaAtualizar?.has(rowNumber) || false;
                    const error = preview.validationErrors.find(e => e.row === rowNumber);
                    
                    // Determinar classe CSS baseada no status
                    let rowClassName = '';
                    if (hasError) {
                      rowClassName = 'bg-red-50';
                    } else if (willUpdate) {
                      rowClassName = 'bg-blue-50';
                    }
                    
                    return (
                      <TableRow key={idx} className={rowClassName}>
                        <TableCell className="font-mono text-sm">{rowNumber}</TableCell>
                        <TableCell className="font-mono text-sm">{row['Código SKU']}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={row['Descrição']}>
                          {row['Descrição']}
                        </TableCell>
                        <TableCell>{row['Marca']}</TableCell>
                        <TableCell>{row['Tipo Produto']}</TableCell>
                        <TableCell>{row['Unidade (Sigla)']}</TableCell>
                        <TableCell>{row['Peso Líquido (kg)']}</TableCell>
                        <TableCell>{row['Peso Bruto (kg)']}</TableCell>
                        <TableCell>
                          {hasError ? (
                            <Badge variant="destructive" className="text-xs">
                              Erro
                            </Badge>
                          ) : willUpdate ? (
                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 border-blue-300">
                              Atualizar
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                              Criar
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
            {preview.data.length > 10 && (
              <p className="text-sm text-muted-foreground mt-2 text-center">
                ... e mais {preview.data.length - 10} {preview.data.length - 10 === 1 ? 'produto' : 'produtos'}
              </p>
            )}
          </div>

          {/* Erros Detalhados */}
          {preview.validationErrors.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Erros Encontrados</h4>
              <ScrollArea className="h-[200px] border rounded-lg p-4">
                <div className="space-y-2">
                  {preview.validationErrors.map((error, idx) => (
                    <div key={idx} className="flex gap-2 text-sm">
                      <span className="font-mono text-red-600 font-medium">Linha {error.row}:</span>
                      <span>{error.message}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleCancelPreview}
              disabled={importing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={importing || preview.data.length === preview.validationErrors.length}
              className="flex items-center gap-2"
            >
              {importing ? (
                'Importando...'
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  Confirmar Importação
                  {preview.validationErrors.length === 0 && ` (${preview.data.length})`}
                  {preview.validationErrors.length > 0 && ` (${preview.data.length - preview.validationErrors.length} de ${preview.data.length})`}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Importar Produtos
        </CardTitle>
        <CardDescription>
          Importe informações de produtos em massa via planilha Excel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={generateTemplate}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Baixar Planilha Modelo
          </Button>

          <div className="relative">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={importing}
            />
            <Button
              disabled={importing}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Selecionar Arquivo para Preview
            </Button>
          </div>
        </div>

        {result && (
          <div className="space-y-3">
            {result.success > 0 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {result.success} {result.success === 1 ? 'produto importado' : 'produtos importados'} com sucesso!
                </AlertDescription>
              </Alert>
            )}

            {result.errors.length > 0 && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <div className="space-y-1">
                    <p className="font-medium mb-2">
                      {result.errors.length} {result.errors.length === 1 ? 'erro encontrado' : 'erros encontrados'}:
                    </p>
                    <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
                      {result.errors.slice(0, 10).map((error, idx) => (
                        <div key={idx}>
                          <strong>Linha {error.row}:</strong> {error.message}
                        </div>
                      ))}
                      {result.errors.length > 10 && (
                        <div className="text-xs opacity-75 mt-2">
                          ... e mais {result.errors.length - 10} erros
                        </div>
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
          <p className="font-medium mb-2">Instruções:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Baixe a planilha modelo</li>
            <li>Preencha os dados dos produtos conforme o exemplo</li>
            <li>Selecione o arquivo para visualizar um preview dos dados</li>
            <li>Revise os dados e confirme a importação</li>
            <li>Situação: "Ativo", "Inativo" ou "Excluído"</li>
            <li>Disponível para Venda: "Sim" ou "Não"</li>
            <li>Código EAN: 8 ou 13 dígitos (opcional)</li>
            <li>NCM: 8 dígitos (opcional)</li>
            <li>CEST: 7 dígitos (opcional)</li>
            <li>Campos obrigatórios: Descrição, Código SKU, Marca, Tipo Produto, Unidade, Peso Líquido e Peso Bruto</li>
            <li>Se a Marca ou Tipo de Produto não existirem, serão criados automaticamente</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
