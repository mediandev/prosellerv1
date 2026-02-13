import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";

import { Produto, Marca, TipoProduto, UnidadeMedida, SituacaoProduto } from "../types/produto";
import { maskNCM, maskCEST, maskEAN13 } from "../lib/masks";
import { ArrowLeft, Save, Upload, X, Check, ChevronsUpDown, Plus, Tag, Package, Ruler } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { api } from "../services/api";

/** Lock em nível de módulo para evitar criação duplicada (ex.: dois eventos submit no mesmo tick). */
let productFormSubmitLock = false;

interface ProductFormPageProps {
  productId?: string;
  onBack: () => void;
  onSave?: (produto: Produto) => void;
}

export function ProductFormPage({ productId, onBack, onSave }: ProductFormPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const marcaTriggerRef = useRef<HTMLButtonElement>(null);
  const unidadeTriggerRef = useRef<HTMLButtonElement>(null);
  const isSubmittingRef = useRef(false);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [tipos, setTipos] = useState<TipoProduto[]>([]);
  const [unidades, setUnidades] = useState<UnidadeMedida[]>([]);
  
  const [marcaOpen, setMarcaOpen] = useState(false);
  const [unidadeOpen, setUnidadeOpen] = useState(false);
  const [marcaPopoverWidth, setMarcaPopoverWidth] = useState<number | undefined>(undefined);
  const [unidadePopoverWidth, setUnidadePopoverWidth] = useState<number | undefined>(undefined);
  
  // Dialogs de adição rápida
  const [quickAddMarcaOpen, setQuickAddMarcaOpen] = useState(false);
  const [quickAddTipoOpen, setQuickAddTipoOpen] = useState(false);
  const [quickAddUnidadeOpen, setQuickAddUnidadeOpen] = useState(false);
  
  // Forms de adição rápida
  const [newMarcaNome, setNewMarcaNome] = useState("");
  const [newTipoNome, setNewTipoNome] = useState("");
  const [newTipoDescricao, setNewTipoDescricao] = useState("");
  const [newUnidadeSigla, setNewUnidadeSigla] = useState("");
  const [newUnidadeDescricao, setNewUnidadeDescricao] = useState("");

  const [formData, setFormData] = useState<Partial<Produto>>({
    foto: undefined,
    descricao: "",
    codigoSku: "",
    codigoEan: "",
    marcaId: "",
    nomeMarca: "",
    tipoProdutoId: "",
    nomeTipoProduto: "",
    ncm: "",
    cest: "",
    unidadeId: "",
    siglaUnidade: "",
    pesoLiquido: 0,
    pesoBruto: 0,
    situacao: 'Ativo',
    ativo: true,
  });

  const [fotoPreview, setFotoPreview] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  // Carregar dados auxiliares (marcas, tipos, unidades)
  useEffect(() => {
    const carregarDadosAuxiliares = async () => {
      try {
        console.log('[PRODUTO-FORM] Carregando dados auxiliares...');
        const [marcasAPI, tiposAPI, unidadesAPI] = await Promise.all([
          api.get('marcas'),
          api.get('tiposProduto'),
          api.get('unidadesMedida')
        ]);
        
        setMarcas(marcasAPI);
        setTipos(tiposAPI);
        setUnidades(unidadesAPI);
        console.log('[PRODUTO-FORM] Dados auxiliares carregados');
      } catch (error) {
        console.error('[PRODUTO-FORM] Erro ao carregar dados auxiliares:', error);
        setMarcas([]);
        setTipos([]);
        setUnidades([]);
        toast.error('Erro ao carregar dados auxiliares da API.');
      }
    };

    carregarDadosAuxiliares();
  }, []);

  useEffect(() => {
    const carregarProduto = async () => {
      if (productId) {
        try {
          console.log('[PRODUTO-FORM] Carregando produto:', productId);
          const produto = await api.getById('produtos', productId);
          if (produto) {
            setFormData(produto);
            setFotoPreview(produto.foto);
          }
        } catch (error) {
          console.error('[PRODUTO-FORM] Erro ao carregar produto:', error);
          toast.error('Erro ao carregar produto da API.');
        }
      }
    };
    
    carregarProduto();
  }, [productId]);

  // Largura do popover definida ao abrir (igual ao botão trigger) para evitar um frame com tamanho errado

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setFotoPreview(result);
        setFormData({ ...formData, foto: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFoto = () => {
    setFotoPreview(undefined);
    setFormData({ ...formData, foto: undefined });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleMarcaSelect = (marcaId: string) => {
    const marca = marcas.find((m) => m.id === marcaId);
    if (marca) {
      setFormData({
        ...formData,
        marcaId: marca.id,
        nomeMarca: marca.nome,
      });
      setMarcaOpen(false);
    }
  };

  const handleTipoSelect = (tipoId: string) => {
    const tipo = tipos.find((t) => t.id === tipoId);
    if (tipo) {
      setFormData({
        ...formData,
        tipoProdutoId: tipo.id,
        nomeTipoProduto: tipo.nome,
      });
    }
  };

  const handleUnidadeSelect = (unidadeId: string) => {
    const unidade = unidades.find((u) => u.id === unidadeId);
    if (unidade) {
      setFormData({
        ...formData,
        unidadeId: unidade.id,
        siglaUnidade: unidade.sigla,
      });
      setUnidadeOpen(false);
    }
  };

  // Adição rápida de marca
  const handleQuickAddMarca = async () => {
    if (!newMarcaNome.trim()) {
      toast.error("Digite o nome da marca");
      return;
    }

    try {
      const newMarca: Marca = {
        id: crypto.randomUUID(),
        nome: newMarcaNome,
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Salvar no backend
      await api.create('marcas', newMarca);
      
      // Atualizar estado local
      setMarcas([...marcas, newMarca]);
      setFormData({
        ...formData,
        marcaId: newMarca.id,
        nomeMarca: newMarca.nome,
      });
      setNewMarcaNome("");
      setQuickAddMarcaOpen(false);
      toast.success("Marca adicionada com sucesso!");
    } catch (error: any) {
      console.error('[PRODUTO-FORM] Erro ao criar marca:', error);
      toast.error(`Erro ao criar marca: ${error.message || 'Erro desconhecido'}`);
    }
  };

  // Adição rápida de tipo
  const handleQuickAddTipo = async () => {
    if (!newTipoNome.trim()) {
      toast.error("Digite o nome do tipo de produto");
      return;
    }

    try {
      const newTipo: TipoProduto = {
        id: crypto.randomUUID(),
        nome: newTipoNome,
        descricao: newTipoDescricao,
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Salvar no backend
      await api.create('tiposProduto', newTipo);
      
      // Atualizar estado local
      setTipos([...tipos, newTipo]);
      setFormData({
        ...formData,
        tipoProdutoId: newTipo.id,
        nomeTipoProduto: newTipo.nome,
      });
      setNewTipoNome("");
      setNewTipoDescricao("");
      setQuickAddTipoOpen(false);
      toast.success("Tipo de produto adicionado com sucesso!");
    } catch (error: any) {
      console.error('[PRODUTO-FORM] Erro ao criar tipo de produto:', error);
      toast.error(`Erro ao criar tipo de produto: ${error.message || 'Erro desconhecido'}`);
    }
  };

  // Adição rápida de unidade
  const handleQuickAddUnidade = async () => {
    if (!newUnidadeSigla.trim() || !newUnidadeDescricao.trim()) {
      toast.error("Preencha a sigla e descrição da unidade");
      return;
    }

    try {
      const newUnidade: UnidadeMedida = {
        id: crypto.randomUUID(),
        sigla: newUnidadeSigla.toUpperCase(),
        descricao: newUnidadeDescricao,
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Salvar no backend
      await api.create('unidadesMedida', newUnidade);
      
      // Atualizar estado local
      setUnidades([...unidades, newUnidade]);
      setFormData({
        ...formData,
        unidadeId: newUnidade.id,
        siglaUnidade: newUnidade.sigla,
      });
      setNewUnidadeSigla("");
      setNewUnidadeDescricao("");
      setQuickAddUnidadeOpen(false);
      toast.success("Unidade adicionada com sucesso!");
    } catch (error: any) {
      console.error('[PRODUTO-FORM] Erro ao criar unidade de medida:', error);
      toast.error(`Erro ao criar unidade de medida: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const salvarProduto = async (produto: Produto) => {
    console.log('[PRODUTO-FORM] Salvando produto:', produto);
    try {
      if (productId) {
        await api.update('produtos', productId, produto);
        toast.success("Produto atualizado com sucesso!");
      } else {
        await api.create('produtos', produto);
        toast.success("Produto cadastrado com sucesso!");
      }
      console.log('[PRODUTO-FORM] Produto salvo com sucesso');
      onSave?.(produto);
      onBack();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('[PRODUTO-FORM] Erro ao salvar produto:', error);
      toast.error(`Erro ao salvar produto: ${message}`);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (productFormSubmitLock) return;
    productFormSubmitLock = true;

    if (isSubmittingRef.current || loading) {
      productFormSubmitLock = false;
      return;
    }
    if (!formData.descricao?.trim()) {
      toast.error("A descrição do produto é obrigatória");
      productFormSubmitLock = false;
      return;
    }
    if (!formData.codigoSku?.trim()) {
      toast.error("O código SKU é obrigatório");
      productFormSubmitLock = false;
      return;
    }
    if (!formData.marcaId) {
      toast.error("Selecione uma marca");
      productFormSubmitLock = false;
      return;
    }
    if (!formData.tipoProdutoId) {
      toast.error("Selecione um tipo de produto");
      productFormSubmitLock = false;
      return;
    }
    if (!formData.unidadeId) {
      toast.error("Selecione uma unidade de medida");
      productFormSubmitLock = false;
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);

    const produto: Produto = {
      id: productId || crypto.randomUUID(),
      foto: formData.foto,
      descricao: formData.descricao!,
      codigoSku: formData.codigoSku!,
      codigoEan: formData.codigoEan,
      marcaId: formData.marcaId!,
      nomeMarca: formData.nomeMarca!,
      tipoProdutoId: formData.tipoProdutoId!,
      nomeTipoProduto: formData.nomeTipoProduto!,
      ncm: formData.ncm,
      cest: formData.cest,
      unidadeId: formData.unidadeId!,
      siglaUnidade: formData.siglaUnidade!,
      pesoLiquido: formData.pesoLiquido || 0,
      pesoBruto: formData.pesoBruto || 0,
      situacao: formData.situacao || 'Ativo',
      ativo: formData.situacao === 'Ativo',
      disponivel: true,
      createdAt: productId ? (formData.createdAt || new Date()) : new Date(),
      updatedAt: new Date(),
    };

    try {
      await salvarProduto(produto);
    } finally {
      productFormSubmitLock = false;
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="relative space-y-6 min-h-0">
      <div className="flex items-center gap-4 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl">{productId ? "Editar Produto" : "Novo Produto"}</h1>
          <p className="text-muted-foreground">
            {productId ? "Atualize as informações do produto" : "Cadastre um novo produto"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Informações do Produto</CardTitle>
            <CardDescription>Preencha os dados do produto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Foto do Produto */}
            <div className="space-y-2">
              <Label>Foto do Produto</Label>
              <div className="flex items-start gap-4">
                {fotoPreview ? (
                  <div className="relative">
                    <img
                      src={fotoPreview}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={removeFoto}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
                    <Upload className="h-8 w-8" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFotoChange}
                    className="hidden"
                    id="foto-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {fotoPreview ? "Alterar Foto" : "Adicionar Foto"}
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    Formatos aceitos: JPG, PNG. Tamanho máximo: 5MB
                  </p>
                </div>
              </div>
            </div>

            {/* Descrição e SKU */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição do Produto *</Label>
                <Input
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) =>
                    setFormData({ ...formData, descricao: e.target.value })
                  }
                  placeholder="Nome do produto"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">Código SKU *</Label>
                <Input
                  id="sku"
                  value={formData.codigoSku}
                  onChange={(e) =>
                    setFormData({ ...formData, codigoSku: e.target.value })
                  }
                  placeholder="Ex: PROD-001"
                />
              </div>
            </div>

            {/* EAN */}
            <div className="space-y-2">
              <Label htmlFor="ean">EAN-13</Label>
              <Input
                id="ean"
                value={formData.codigoEan}
                onChange={(e) =>
                  setFormData({ ...formData, codigoEan: maskEAN13(e.target.value) })
                }
                placeholder="0000000000000"
                maxLength={13}
              />
              <p className="text-sm text-muted-foreground">
                Código de barras com 13 dígitos
              </p>
            </div>

            {/* Marca */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Marca *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuickAddMarcaOpen(true)}
                  className="h-auto p-1 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar
                </Button>
              </div>
              <Popover
                open={marcaOpen}
                onOpenChange={(open) => {
                  setMarcaOpen(open);
                  if (open && marcaTriggerRef.current) setMarcaPopoverWidth(marcaTriggerRef.current.offsetWidth);
                  if (!open) setMarcaPopoverWidth(undefined);
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    ref={marcaTriggerRef}
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {formData.marcaId
                      ? marcas.find((m) => m.id === formData.marcaId)?.nome
                      : "Selecione uma marca..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="flex flex-col overflow-hidden p-0 max-h-[206px]"
                  style={marcaPopoverWidth != null ? { width: marcaPopoverWidth, minWidth: marcaPopoverWidth } : undefined}
                >
                  <Command className="flex flex-1 min-h-0 flex-col">
                    <CommandInput placeholder="Buscar marca..." />
                    <CommandList className="flex-1 min-h-0 overflow-auto">
                      <CommandEmpty>Nenhuma marca encontrada.</CommandEmpty>
                      <CommandGroup>
                        {marcas
                          .filter((m) => m.ativo)
                          .map((marca) => (
                            <CommandItem
                              key={marca.id}
                              value={marca.nome}
                              onSelect={() => handleMarcaSelect(marca.id)}
                            >
                              <Check
                                className={
                                  formData.marcaId === marca.id
                                    ? "mr-2 h-4 w-4 opacity-100"
                                    : "mr-2 h-4 w-4 opacity-0"
                                }
                              />
                              {marca.nome}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Tipo de Produto */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="tipo">Tipo de Produto *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuickAddTipoOpen(true)}
                  className="h-auto p-1 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar
                </Button>
              </div>
              <Select value={formData.tipoProdutoId} onValueChange={handleTipoSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {tipos
                    .filter((t) => t.ativo)
                    .map((tipo) => (
                      <SelectItem key={tipo.id} value={tipo.id}>
                        {tipo.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* NCM e CEST */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ncm">NCM</Label>
                <Input
                  id="ncm"
                  value={formData.ncm}
                  onChange={(e) =>
                    setFormData({ ...formData, ncm: maskNCM(e.target.value) })
                  }
                  placeholder="0000.00.00"
                  maxLength={10}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cest">CEST</Label>
                <Input
                  id="cest"
                  value={formData.cest}
                  onChange={(e) =>
                    setFormData({ ...formData, cest: maskCEST(e.target.value) })
                  }
                  placeholder="00.000.00"
                  maxLength={9}
                />
              </div>
            </div>

            {/* Unidade */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Unidade de Medida *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuickAddUnidadeOpen(true)}
                  className="h-auto p-1 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar
                </Button>
              </div>
              <Popover
                open={unidadeOpen}
                onOpenChange={(open) => {
                  setUnidadeOpen(open);
                  if (open && unidadeTriggerRef.current) setUnidadePopoverWidth(unidadeTriggerRef.current.offsetWidth);
                  if (!open) setUnidadePopoverWidth(undefined);
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    ref={unidadeTriggerRef}
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {formData.unidadeId
                      ? `${unidades.find((u) => u.id === formData.unidadeId)?.sigla} - ${
                          unidades.find((u) => u.id === formData.unidadeId)?.descricao
                        }`
                      : "Selecione uma unidade..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="flex flex-col overflow-hidden p-0 max-h-[206px]"
                  style={unidadePopoverWidth != null ? { width: unidadePopoverWidth, minWidth: unidadePopoverWidth } : undefined}
                >
                  <Command className="flex flex-1 min-h-0 flex-col">
                    <CommandInput placeholder="Buscar unidade..." />
                    <CommandList className="flex-1 min-h-0 overflow-auto">
                      <CommandEmpty>Nenhuma unidade encontrada.</CommandEmpty>
                      <CommandGroup>
                        {unidades
                          .filter((u) => u.ativo)
                          .map((unidade) => (
                            <CommandItem
                              key={unidade.id}
                              value={`${unidade.sigla} ${unidade.descricao}`}
                              onSelect={() => handleUnidadeSelect(unidade.id)}
                            >
                              <Check
                                className={
                                  formData.unidadeId === unidade.id
                                    ? "mr-2 h-4 w-4 opacity-100"
                                    : "mr-2 h-4 w-4 opacity-0"
                                }
                              />
                              {unidade.sigla} - {unidade.descricao}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Pesos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pesoLiquido">Peso Líquido Unitário (kg)</Label>
                <Input
                  id="pesoLiquido"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={formData.pesoLiquido}
                  onChange={(e) =>
                    setFormData({ ...formData, pesoLiquido: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.0000"
                />
                <p className="text-sm text-muted-foreground">
                  Aceita até 4 casas decimais (ex: 0.0550 = 55g)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pesoBruto">Peso Bruto Unitário (kg)</Label>
                <Input
                  id="pesoBruto"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={formData.pesoBruto}
                  onChange={(e) =>
                    setFormData({ ...formData, pesoBruto: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.0000"
                />
                <p className="text-sm text-muted-foreground">
                  Aceita até 4 casas decimais (ex: 0.0837 = 83.7g)
                </p>
              </div>
            </div>

            {/* Situação */}
            <div className="space-y-2">
              <Label htmlFor="situacao">Situação *</Label>
              <Select
                value={formData.situacao}
                onValueChange={(value) =>
                  setFormData({ ...formData, situacao: value as SituacaoProduto })
                }
              >
                <SelectTrigger id="situacao">
                  <SelectValue placeholder="Selecione a situação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                  <SelectItem value="Excluído">Excluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Botões de ação */}
        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={onBack} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Salvando...' : (productId ? "Atualizar" : "Cadastrar")}
          </Button>
        </div>
      </form>

      {/* Dialog - Adição Rápida de Marca */}
      <Dialog open={quickAddMarcaOpen} onOpenChange={setQuickAddMarcaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Adicionar Nova Marca
            </DialogTitle>
            <DialogDescription>
              Cadastre rapidamente uma nova marca
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newMarca">Nome da Marca</Label>
              <Input
                id="newMarca"
                value={newMarcaNome}
                onChange={(e) => setNewMarcaNome(e.target.value)}
                placeholder="Digite o nome da marca"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleQuickAddMarca();
                  }
                }}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setQuickAddMarcaOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleQuickAddMarca}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog - Adição Rápida de Tipo */}
      <Dialog open={quickAddTipoOpen} onOpenChange={setQuickAddTipoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Adicionar Novo Tipo de Produto
            </DialogTitle>
            <DialogDescription>
              Cadastre rapidamente um novo tipo de produto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newTipoNome">Nome do Tipo</Label>
              <Input
                id="newTipoNome"
                value={newTipoNome}
                onChange={(e) => setNewTipoNome(e.target.value)}
                placeholder="Ex: Revenda, Promocional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newTipoDescricao">Descrição (opcional)</Label>
              <Input
                id="newTipoDescricao"
                value={newTipoDescricao}
                onChange={(e) => setNewTipoDescricao(e.target.value)}
                placeholder="Descreva o tipo..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setQuickAddTipoOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleQuickAddTipo}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog - Adição Rápida de Unidade */}
      <Dialog open={quickAddUnidadeOpen} onOpenChange={setQuickAddUnidadeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5" />
              Adicionar Nova Unidade de Medida
            </DialogTitle>
            <DialogDescription>
              Cadastre rapidamente uma nova unidade de medida
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newUnidadeSigla">Sigla</Label>
              <Input
                id="newUnidadeSigla"
                value={newUnidadeSigla}
                onChange={(e) => setNewUnidadeSigla(e.target.value.toUpperCase())}
                placeholder="Ex: UN, KG, L"
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newUnidadeDescricao">Descrição</Label>
              <Input
                id="newUnidadeDescricao"
                value={newUnidadeDescricao}
                onChange={(e) => setNewUnidadeDescricao(e.target.value)}
                placeholder="Ex: Unidade, Quilograma, Litro"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setQuickAddUnidadeOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleQuickAddUnidade}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
