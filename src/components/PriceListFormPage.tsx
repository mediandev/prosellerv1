import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, DollarSign, Percent, TrendingUp, Trash2, Save } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { toast } from 'sonner@2.0.3';
import { ListaPreco, TipoComissao, FaixaDesconto, ProdutoPreco } from '../types/listaPreco';
import { Produto } from '../types/produto';
import { api } from '../services/api';

interface PriceListFormPageProps {
  lista?: ListaPreco;
  modo: 'criar' | 'editar' | 'visualizar';
  onVoltar: () => void;
  onSalvar: (lista: ListaPreco) => void;
}

export function PriceListFormPage({ lista, modo, onVoltar, onSalvar }: PriceListFormPageProps) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loadingProdutos, setLoadingProdutos] = useState(true);
  const isReadOnly = modo === 'visualizar';

  // Form state
  const [nome, setNome] = useState('');
  const [tipoComissao, setTipoComissao] = useState<TipoComissao>('fixa');
  const [percentualFixo, setPercentualFixo] = useState('10');
  const [faixasDesconto, setFaixasDesconto] = useState<FaixaDesconto[]>([
    {
      id: '1',
      descontoMin: 0,
      descontoMax: 10,
      percentualComissao: 10,
    },
  ]);
  const [produtosPreco, setProdutosPreco] = useState<ProdutoPreco[]>([]);

  // Carregar produtos do Supabase
  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    try {
      console.log('[LISTA-PRECO] Carregando produtos da API...');
      const produtosAPI = await api.get('produtos');
      setProdutos(produtosAPI);
      console.log('[LISTA-PRECO] Produtos carregados:', produtosAPI.length);
    } catch (error) {
      console.error('[LISTA-PRECO] Erro ao carregar produtos:', error);
      setProdutos([]);
      toast.error('Erro ao carregar produtos da API.');
    } finally {
      setLoadingProdutos(false);
    }
  };

  useEffect(() => {
    if (lista) {
      setNome(lista.nome);
      setTipoComissao(lista.tipoComissao);
      setPercentualFixo(lista.percentualFixo?.toString() || '10');
      setFaixasDesconto(
        lista.faixasDesconto || [
          {
            id: '1',
            descontoMin: 0,
            descontoMax: 10,
            percentualComissao: 10,
          },
        ]
      );
      setProdutosPreco(lista.produtos);
    }
  }, [lista]);

  const handleSave = () => {
    if (!nome.trim()) {
      toast.error('Preencha o nome da lista de preço');
      return;
    }

    if (produtosPreco.length === 0) {
      toast.error('Adicione pelo menos um produto à lista');
      return;
    }

    if (tipoComissao === 'fixa') {
      const percentual = parseFloat(percentualFixo);
      if (isNaN(percentual) || percentual < 0 || percentual > 100) {
        toast.error('Percentual fixo deve ser entre 0 e 100');
        return;
      }
    } else {
      // Validar faixas de desconto
      for (const faixa of faixasDesconto) {
        if (faixa.descontoMin < 0 || faixa.descontoMin > 100) {
          toast.error('Desconto mínimo deve ser entre 0 e 100');
          return;
        }
        if (faixa.descontoMax !== null && (faixa.descontoMax < 0 || faixa.descontoMax > 100)) {
          toast.error('Desconto máximo deve ser entre 0 e 100');
          return;
        }
        if (faixa.descontoMax !== null && faixa.descontoMax <= faixa.descontoMin) {
          toast.error('Desconto máximo deve ser maior que o mínimo');
          return;
        }
        if (faixa.percentualComissao < 0 || faixa.percentualComissao > 100) {
          toast.error('Percentual de comissão deve ser entre 0 e 100');
          return;
        }
      }
    }

    const listaData: ListaPreco = {
      id: lista?.id || Date.now().toString(),
      nome: nome.trim(),
      produtos: produtosPreco,
      tipoComissao,
      percentualFixo: tipoComissao === 'fixa' ? parseFloat(percentualFixo) : undefined,
      faixasDesconto: tipoComissao === 'conforme_desconto' ? faixasDesconto : undefined,
      ativo: true,
      createdAt: lista?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    onSalvar(listaData);
  };

  const handleAddProduto = (produtoId: string, preco: string) => {
    const precoNum = parseFloat(preco);
    if (isNaN(precoNum) || precoNum <= 0) {
      toast.error('Preço inválido');
      return;
    }

    const exists = produtosPreco.find((p) => p.produtoId === produtoId);
    if (exists) {
      setProdutosPreco(
        produtosPreco.map((p) =>
          p.produtoId === produtoId ? { ...p, preco: precoNum } : p
        )
      );
    } else {
      setProdutosPreco([...produtosPreco, { produtoId, preco: precoNum }]);
    }
  };

  const handleRemoveProduto = (produtoId: string) => {
    setProdutosPreco(produtosPreco.filter((p) => p.produtoId !== produtoId));
  };

  const handleAddFaixa = () => {
    const newId = (faixasDesconto.length + 1).toString();
    setFaixasDesconto([
      ...faixasDesconto,
      {
        id: newId,
        descontoMin: 0,
        descontoMax: null,
        percentualComissao: 5,
      },
    ]);
  };

  const handleRemoveFaixa = (id: string) => {
    if (faixasDesconto.length > 1) {
      setFaixasDesconto(faixasDesconto.filter((f) => f.id !== id));
    } else {
      toast.error('Deve haver pelo menos uma faixa de desconto');
    }
  };

  const handleUpdateFaixa = (id: string, field: keyof FaixaDesconto, value: any) => {
    setFaixasDesconto(
      faixasDesconto.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  const getProdutoNome = (produtoId: string) => {
    const produto = produtos.find((p) => p.id === produtoId);
    return produto ? `${produto.codigoSku} - ${produto.descricao}` : 'Produto não encontrado';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getTituloPage = () => {
    if (modo === 'criar') return 'Nova Lista de Preço';
    if (modo === 'editar') return 'Editar Lista de Preço';
    return 'Visualizar Lista de Preço';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onVoltar}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl">{getTituloPage()}</h2>
          <p className="text-muted-foreground text-sm">
            {isReadOnly
              ? 'Visualize os detalhes da lista de preço'
              : 'Configure os produtos, preços e regras de comissionamento'}
          </p>
        </div>
        {!isReadOnly && (
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            {modo === 'criar' ? 'Criar' : 'Salvar'} Lista de Preço
          </Button>
        )}
      </div>

      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
          <CardDescription>
            Defina o nome e identificação da lista de preço
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Nome da Lista */}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Lista de Preço *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Tabela Padrão - Varejo"
              disabled={isReadOnly}
            />
          </div>
        </CardContent>
      </Card>

      {/* Produtos e Preços */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Produtos e Preços
          </CardTitle>
          <CardDescription>
            Adicione os produtos e seus respectivos valores nesta lista
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProdutoPrecoForm
            produtos={produtos}
            produtosPreco={produtosPreco}
            onAdd={handleAddProduto}
            onRemove={handleRemoveProduto}
            getProdutoNome={getProdutoNome}
            formatCurrency={formatCurrency}
            disabled={isReadOnly}
          />
        </CardContent>
      </Card>

      {/* Regras de Comissionamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Regras de Comissionamento
          </CardTitle>
          <CardDescription>
            Defina como a comissão será calculada para esta lista
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={tipoComissao}
            onValueChange={(v) => setTipoComissao(v as TipoComissao)}
            disabled={isReadOnly}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fixa" id="fixa" disabled={isReadOnly} />
              <Label htmlFor="fixa">Alíquota Fixa</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="conforme_desconto"
                id="conforme_desconto"
                disabled={isReadOnly}
              />
              <Label htmlFor="conforme_desconto">Conforme Desconto</Label>
            </div>
          </RadioGroup>

          {tipoComissao === 'fixa' && (
            <div className="space-y-2">
              <Label htmlFor="percentual-fixo">Percentual de Comissão (%)</Label>
              <Input
                id="percentual-fixo"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={percentualFixo}
                onChange={(e) => setPercentualFixo(e.target.value)}
                placeholder="10"
                disabled={isReadOnly}
              />
              <p className="text-xs text-muted-foreground">
                Este percentual será aplicado em todas as vendas com esta lista de preço
              </p>
            </div>
          )}

          {tipoComissao === 'conforme_desconto' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Faixas de Desconto</Label>
                {!isReadOnly && (
                  <Button type="button" variant="outline" size="sm" onClick={handleAddFaixa}>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Faixa
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                {faixasDesconto.map((faixa, index) => (
                  <Card key={faixa.id}>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Faixa {index + 1}</span>
                          {faixasDesconto.length > 1 && !isReadOnly && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFaixa(faixa.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label>Desconto Mín. (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={faixa.descontoMin}
                              onChange={(e) =>
                                handleUpdateFaixa(
                                  faixa.id,
                                  'descontoMin',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              disabled={isReadOnly}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Desconto Máx. (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={faixa.descontoMax ?? ''}
                              onChange={(e) =>
                                handleUpdateFaixa(
                                  faixa.id,
                                  'descontoMax',
                                  e.target.value === '' ? null : parseFloat(e.target.value)
                                )
                              }
                              placeholder="Sem limite"
                              disabled={isReadOnly}
                            />
                            <p className="text-xs text-muted-foreground">
                              Deixe vazio para "acima de"
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label>Comissão (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={faixa.percentualComissao}
                              onChange={(e) =>
                                handleUpdateFaixa(
                                  faixa.id,
                                  'percentualComissao',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              disabled={isReadOnly}
                            />
                          </div>
                        </div>

                        <div className="bg-muted p-2 rounded text-xs">
                          <strong>Exemplo:</strong> Desconto de {faixa.descontoMin}% a{' '}
                          {faixa.descontoMax !== null ? `${faixa.descontoMax}%` : 'acima'} →
                          Comissão de {faixa.percentualComissao}%
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm">
                <p>
                  <strong>Como funciona:</strong> O percentual de comissão será calculado com
                  base no desconto aplicado em cada item da venda. Exemplo: se o desconto
                  aplicado for 8%, será usada a faixa que engloba esse percentual.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ações do rodapé */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onVoltar}>
          {isReadOnly ? 'Voltar' : 'Cancelar'}
        </Button>
        {!isReadOnly && (
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            {modo === 'criar' ? 'Criar' : 'Salvar'} Lista de Preço
          </Button>
        )}
      </div>
    </div>
  );
}

// Componente auxiliar para gerenciar produtos e preços
function ProdutoPrecoForm({
  produtos,
  produtosPreco,
  onAdd,
  onRemove,
  getProdutoNome,
  formatCurrency,
  disabled,
}: {
  produtos: Produto[];
  produtosPreco: ProdutoPreco[];
  onAdd: (produtoId: string, preco: string) => void;
  onRemove: (produtoId: string) => void;
  getProdutoNome: (produtoId: string) => string;
  formatCurrency: (value: number) => string;
  disabled?: boolean;
}) {
  const [selectedProduto, setSelectedProduto] = useState('');
  const [preco, setPreco] = useState('');

  const handleAdd = () => {
    if (!selectedProduto || !preco) {
      toast.error('Selecione um produto e informe o preço');
      return;
    }

    onAdd(selectedProduto, preco);
    setSelectedProduto('');
    setPreco('');
  };

  const produtosDisponiveis = produtos.filter(
    (p) => !produtosPreco.find((pp) => pp.produtoId === p.id) || p.id === selectedProduto
  );

  return (
    <div className="space-y-4">
      {!disabled && (
        <div className="flex gap-3">
          <div className="flex-1">
            <Label htmlFor="produto">Produto</Label>
            <Select value={selectedProduto} onValueChange={setSelectedProduto}>
              <SelectTrigger id="produto">
                <SelectValue placeholder="Selecione um produto" />
              </SelectTrigger>
              <SelectContent>
                {produtosDisponiveis.map((produto) => (
                  <SelectItem key={produto.id} value={produto.id}>
                    {produto.codigoSku} - {produto.descricao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-40">
            <Label htmlFor="preco">Preço (R$)</Label>
            <Input
              id="preco"
              type="number"
              min="0"
              step="0.01"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              placeholder="0,00"
            />
          </div>

          <div className="flex items-end">
            <Button type="button" onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </div>
      )}

      {produtosPreco.length > 0 && (
        <div className="border rounded-lg">
          <div className="bg-muted px-4 py-2 flex items-center gap-4">
            <div className="flex-1">Produto</div>
            <div className="w-32 text-right">Preço</div>
            <div className="w-20"></div>
          </div>
          <div className="divide-y">
            {produtosPreco.map((pp) => (
              <div key={pp.produtoId} className="px-4 py-3 flex items-center gap-4">
                <div className="flex-1 text-sm">{getProdutoNome(pp.produtoId)}</div>
                <div className="w-32 text-right">{formatCurrency(pp.preco)}</div>
                <div className="w-20 flex justify-end">
                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemove(pp.produtoId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {produtosPreco.length === 0 && (
        <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground">
          Nenhum produto adicionado. {!disabled && 'Selecione produtos acima para adicionar à lista.'}
        </div>
      )}
    </div>
  );
}