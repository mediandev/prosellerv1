import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

import { TipoProduto } from "../types/produto";
import { Plus, Edit, Trash2, Search, Package, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { api } from "../services/api";

export function ProductTypeManagement() {
  const [tipos, setTipos] = useState<TipoProduto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoProduto | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    ativo: true,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tipoToDelete, setTipoToDelete] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof TipoProduto | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Carregar tipos de produto
  useEffect(() => {
    carregarTipos();
  }, []);

  const carregarTipos = async () => {
    try {
      console.log('[TIPOS-PRODUTO] Carregando tipos da API...');
      const tiposAPI = await api.get('tiposProduto');
      setTipos(Array.isArray(tiposAPI) ? tiposAPI : []);
      console.log('[TIPOS-PRODUTO] Tipos carregados:', tiposAPI?.length || 0);
    } catch (error) {
      console.error('[TIPOS-PRODUTO] Erro ao carregar tipos:', error);
      setTipos([]);
      toast.error('Erro ao carregar tipos de produto da API.');
    } finally {
      setLoading(false);
    }
  };

  // Função para ordenar
  const handleSort = (field: keyof TipoProduto) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortField(null);
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  let filteredTipos = tipos.filter((tipo) =>
    tipo.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Aplicar ordenação
  if (sortField) {
    filteredTipos = [...filteredTipos].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      if (sortField === 'ativo') {
        return sortDirection === 'asc' ? (aValue ? 1 : -1) : (aValue ? -1 : 1);
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue, 'pt-BR');
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const handleOpenDialog = (tipo?: TipoProduto) => {
    if (tipo) {
      setEditingTipo(tipo);
      setFormData({
        nome: tipo.nome,
        descricao: tipo.descricao || "",
        ativo: tipo.ativo,
      });
    } else {
      setEditingTipo(null);
      setFormData({
        nome: "",
        descricao: "",
        ativo: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error("Por favor, preencha o nome do tipo de produto");
      return;
    }

    try {
      if (editingTipo) {
        const tipoAtualizado = { 
          ...editingTipo, 
          ...formData, 
          updatedAt: new Date() 
        };
        await api.update('tiposProduto', editingTipo.id, tipoAtualizado);
        toast.success("Tipo de produto atualizado com sucesso!");
      } else {
        const newTipo: TipoProduto = {
          id: crypto.randomUUID(),
          ...formData,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await api.create('tiposProduto', newTipo);
        toast.success("Tipo de produto cadastrado com sucesso!");
      }

      setDialogOpen(false);
      await carregarTipos();
    } catch (error: any) {
      console.error('[TIPOS-PRODUTO] Erro ao salvar tipo:', error);
      toast.error(`Erro ao salvar tipo: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const handleDelete = async () => {
    if (tipoToDelete) {
      try {
        await api.delete('tiposProduto', tipoToDelete);
        toast.success("Tipo de produto excluído com sucesso!");
        setDeleteDialogOpen(false);
        setTipoToDelete(null);
        await carregarTipos();
      } catch (error: any) {
        console.error('[TIPOS-PRODUTO] Erro ao excluir tipo:', error);
        toast.error(`Erro ao excluir tipo: ${error.message || 'Erro desconhecido'}`);
      }
    }
  };

  const openDeleteDialog = (id: string) => {
    setTipoToDelete(id);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Tipos de Produto
              </CardTitle>
              <CardDescription>
                Cadastre e gerencie os tipos de produtos
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Tipo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingTipo ? "Editar Tipo de Produto" : "Novo Tipo de Produto"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingTipo
                      ? "Atualize as informações do tipo de produto"
                      : "Cadastre um novo tipo de produto"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome do Tipo *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) =>
                        setFormData({ ...formData, nome: e.target.value })
                      }
                      placeholder="Ex: Revenda, Promocional..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) =>
                        setFormData({ ...formData, descricao: e.target.value })
                      }
                      placeholder="Descreva o tipo de produto..."
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center gap-4 pt-2">
                    <input
                      type="checkbox"
                      id="ativo"
                      checked={formData.ativo}
                      onChange={(e) =>
                        setFormData({ ...formData, ativo: e.target.checked })
                      }
                      className="h-4 w-4"
                    />
                    <Label htmlFor="ativo" className="cursor-pointer">
                      Tipo ativo
                    </Label>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave}>Salvar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tipo de produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button
                        onClick={() => handleSort('nome')}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        Nome
                        {sortField === 'nome' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-50" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('ativo')}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        Status
                        {sortField === 'ativo' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-50" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTipos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhum tipo de produto encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTipos.map((tipo) => (
                      <TableRow key={tipo.id}>
                        <TableCell>{tipo.nome}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {tipo.descricao || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={tipo.ativo ? "default" : "secondary"}>
                            {tipo.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(tipo)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(tipo.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Excluir Tipo de Produto"
        description="Tem certeza que deseja excluir este tipo de produto? Esta ação não pode ser desfeita."
      />
    </div>
  );
}
