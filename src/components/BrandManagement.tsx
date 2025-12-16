import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { Marca } from "../types/produto";
import { Plus, Edit, Trash2, Search, Tag, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { api } from "../services/api";

export function BrandManagement() {
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMarca, setEditingMarca] = useState<Marca | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    ativo: true,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [marcaToDelete, setMarcaToDelete] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof Marca | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Carregar marcas
  useEffect(() => {
    carregarMarcas();
  }, []);

  const carregarMarcas = async () => {
    try {
      console.log('[MARCAS] Carregando marcas da API...');
      const marcasAPI = await api.get('marcas');
      setMarcas(Array.isArray(marcasAPI) ? marcasAPI : []);
      console.log('[MARCAS] Marcas carregadas:', marcasAPI?.length || 0);
    } catch (error) {
      console.error('[MARCAS] Erro ao carregar marcas:', error);
      setMarcas([]);
      toast.error('Erro ao carregar marcas da API.');
    } finally {
      setLoading(false);
    }
  };

  // Função para ordenar
  const handleSort = (field: keyof Marca) => {
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

  let filteredMarcas = marcas.filter((marca) =>
    marca.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Aplicar ordenação
  if (sortField) {
    filteredMarcas = [...filteredMarcas].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      // Tratamento especial para booleanos
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

  const handleOpenDialog = (marca?: Marca) => {
    if (marca) {
      setEditingMarca(marca);
      setFormData({
        nome: marca.nome,
        ativo: marca.ativo,
      });
    } else {
      setEditingMarca(null);
      setFormData({
        nome: "",
        ativo: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error("Por favor, preencha o nome da marca");
      return;
    }

    try {
      if (editingMarca) {
        const marcaAtualizada = { 
          ...editingMarca, 
          ...formData, 
          updatedAt: new Date() 
        };
        await api.update('marcas', editingMarca.id, marcaAtualizada);
        toast.success("Marca atualizada com sucesso!");
      } else {
        const newMarca: Marca = {
          id: crypto.randomUUID(),
          ...formData,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await api.create('marcas', newMarca);
        toast.success("Marca cadastrada com sucesso!");
      }

      setDialogOpen(false);
      await carregarMarcas();
    } catch (error: any) {
      console.error('[MARCAS] Erro ao salvar marca:', error);
      toast.error(`Erro ao salvar marca: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const handleDelete = async () => {
    if (marcaToDelete) {
      try {
        await api.delete('marcas', marcaToDelete);
        toast.success("Marca excluída com sucesso!");
        setDeleteDialogOpen(false);
        setMarcaToDelete(null);
        await carregarMarcas();
      } catch (error: any) {
        console.error('[MARCAS] Erro ao excluir marca:', error);
        toast.error(`Erro ao excluir marca: ${error.message || 'Erro desconhecido'}`);
      }
    }
  };

  const openDeleteDialog = (id: string) => {
    setMarcaToDelete(id);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Gerenciamento de Marcas
              </CardTitle>
              <CardDescription>
                Cadastre e gerencie as marcas de produtos
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Marca
                </Button>
              </DialogTrigger>
              <DialogContent aria-describedby={undefined}>
                <DialogHeader>
                  <DialogTitle>
                    {editingMarca ? "Editar Marca" : "Nova Marca"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingMarca
                      ? "Atualize as informações da marca"
                      : "Cadastre uma nova marca de produto"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome da Marca *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) =>
                        setFormData({ ...formData, nome: e.target.value })
                      }
                      placeholder="Ex: Dell, Samsung, LG..."
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
                      Marca ativa
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
                placeholder="Buscar marca..."
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
                  {filteredMarcas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        Nenhuma marca encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMarcas.map((marca) => (
                      <TableRow key={marca.id}>
                        <TableCell>{marca.nome}</TableCell>
                        <TableCell>
                          <Badge variant={marca.ativo ? "default" : "secondary"}>
                            {marca.ativo ? "Ativa" : "Inativa"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(marca)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(marca.id)}
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
        title="Excluir Marca"
        description="Tem certeza que deseja excluir esta marca? Esta ação não pode ser desfeita."
      />
    </div>
  );
}