import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { mockUnidadesMedida } from "../data/mockUnidadesMedida";
import { UnidadeMedida } from "../types/produto";
import { Plus, Edit, Trash2, Search, Ruler, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { api } from "../services/api";

export function UnitManagement() {
  const [unidades, setUnidades] = useState<UnidadeMedida[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUnidade, setEditingUnidade] = useState<UnidadeMedida | null>(null);
  const [formData, setFormData] = useState({
    sigla: "",
    descricao: "",
    ativo: true,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [unidadeToDelete, setUnidadeToDelete] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof UnidadeMedida | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Carregar unidades de medida
  useEffect(() => {
    carregarUnidades();
  }, []);

  const carregarUnidades = async () => {
    try {
      console.log('[UNIDADES] Carregando unidades da API...');
      const unidadesAPI = await api.get('unidadesMedida');
      setUnidades(unidadesAPI);
      console.log('[UNIDADES] Unidades carregadas:', unidadesAPI.length);
    } catch (error) {
      console.error('[UNIDADES] Erro ao carregar unidades, usando mock:', error);
      setUnidades(mockUnidadesMedida);
    } finally {
      setLoading(false);
    }
  };

  // Função para ordenar
  const handleSort = (field: keyof UnidadeMedida) => {
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

  let filteredUnidades = unidades.filter((unidade) =>
    unidade.sigla.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unidade.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Aplicar ordenação
  if (sortField) {
    filteredUnidades = [...filteredUnidades].sort((a, b) => {
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

  const handleOpenDialog = (unidade?: UnidadeMedida) => {
    if (unidade) {
      setEditingUnidade(unidade);
      setFormData({
        sigla: unidade.sigla,
        descricao: unidade.descricao,
        ativo: unidade.ativo,
      });
    } else {
      setEditingUnidade(null);
      setFormData({
        sigla: "",
        descricao: "",
        ativo: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.sigla.trim() || !formData.descricao.trim()) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    try {
      if (editingUnidade) {
        const unidadeAtualizada = { 
          ...editingUnidade, 
          ...formData, 
          updatedAt: new Date() 
        };
        await api.update('unidadesMedida', editingUnidade.id, unidadeAtualizada);
        toast.success("Unidade de medida atualizada com sucesso!");
      } else {
        const newUnidade: UnidadeMedida = {
          id: crypto.randomUUID(),
          ...formData,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await api.create('unidadesMedida', newUnidade);
        toast.success("Unidade de medida cadastrada com sucesso!");
      }

      setDialogOpen(false);
      await carregarUnidades();
    } catch (error: any) {
      console.error('[UNIDADES] Erro ao salvar unidade:', error);
      toast.error(`Erro ao salvar unidade: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const handleDelete = async () => {
    if (unidadeToDelete) {
      try {
        await api.delete('unidadesMedida', unidadeToDelete);
        toast.success("Unidade de medida excluída com sucesso!");
        setDeleteDialogOpen(false);
        setUnidadeToDelete(null);
        await carregarUnidades();
      } catch (error: any) {
        console.error('[UNIDADES] Erro ao excluir unidade:', error);
        toast.error(`Erro ao excluir unidade: ${error.message || 'Erro desconhecido'}`);
      }
    }
  };

  const openDeleteDialog = (id: string) => {
    setUnidadeToDelete(id);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Ruler className="h-5 w-5" />
                Unidades de Medida
              </CardTitle>
              <CardDescription>
                Cadastre e gerencie as unidades de medida dos produtos
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Unidade
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingUnidade ? "Editar Unidade de Medida" : "Nova Unidade de Medida"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingUnidade
                      ? "Atualize as informações da unidade de medida"
                      : "Cadastre uma nova unidade de medida"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="sigla">Sigla *</Label>
                    <Input
                      id="sigla"
                      value={formData.sigla}
                      onChange={(e) =>
                        setFormData({ ...formData, sigla: e.target.value.toUpperCase() })
                      }
                      placeholder="Ex: UN, KG, L, M..."
                      maxLength={10}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição *</Label>
                    <Input
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) =>
                        setFormData({ ...formData, descricao: e.target.value })
                      }
                      placeholder="Ex: Unidade, Quilograma, Litro..."
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
                      Unidade ativa
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
                placeholder="Buscar unidade..."
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
                        onClick={() => handleSort('sigla')}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        Sigla
                        {sortField === 'sigla' ? (
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
                        onClick={() => handleSort('descricao')}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        Descrição
                        {sortField === 'descricao' ? (
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
                  {filteredUnidades.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhuma unidade de medida encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUnidades.map((unidade) => (
                      <TableRow key={unidade.id}>
                        <TableCell>
                          <Badge variant="outline">{unidade.sigla}</Badge>
                        </TableCell>
                        <TableCell>{unidade.descricao}</TableCell>
                        <TableCell>
                          <Badge variant={unidade.ativo ? "default" : "secondary"}>
                            {unidade.ativo ? "Ativa" : "Inativa"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(unidade)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(unidade.id)}
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
        title="Excluir Unidade de Medida"
        description="Tem certeza que deseja excluir esta unidade de medida? Esta ação não pode ser desfeita."
      />
    </div>
  );
}
