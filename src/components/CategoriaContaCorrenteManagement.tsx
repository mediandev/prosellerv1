import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { CategoriaContaCorrente } from "../types/contaCorrente";
import { api } from "../services/api";
import { toast } from "sonner@2.0.3";
import { Plus, Trash2, Edit, Tag, CheckCircle2, XCircle } from "lucide-react";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";

const cores = [
  { nome: "Azul", valor: "#3b82f6" },
  { nome: "Verde", valor: "#10b981" },
  { nome: "Amarelo", valor: "#f59e0b" },
  { nome: "Vermelho", valor: "#ef4444" },
  { nome: "Roxo", valor: "#8b5cf6" },
  { nome: "Rosa", valor: "#ec4899" },
  { nome: "Laranja", valor: "#f97316" },
  { nome: "Ciano", valor: "#06b6d4" },
  { nome: "Índigo", valor: "#6366f1" },
  { nome: "Cinza", valor: "#6b7280" },
];

export function CategoriaContaCorrenteManagement() {
  const [categorias, setCategorias] = useState<CategoriaContaCorrente[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [categoriaEditando, setCategoriaEditando] = useState<string | null>(null);
  const [formulario, setFormulario] = useState({
    nome: "",
    descricao: "",
    cor: cores[0].valor,
    ativo: true,
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    id: string | null;
    name: string | null;
  }>({
    open: false,
    id: null,
    name: null,
  });

  useEffect(() => {
    carregarCategorias();
  }, []);

  const carregarCategorias = async () => {
    try {
      setLoading(true);
      const data = await api.get('categorias-conta-corrente');
      setCategorias(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('[CATEGORIAS] Erro ao carregar categorias:', error);
      toast.error('Erro ao carregar categorias');
      setCategorias([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirDialogo = () => {
    setModoEdicao(false);
    setCategoriaEditando(null);
    setFormulario({
      nome: "",
      descricao: "",
      cor: cores[0].valor,
      ativo: true,
    });
    setDialogAberto(true);
  };

  const handleEditarCategoria = (categoria: CategoriaContaCorrente) => {
    setModoEdicao(true);
    setCategoriaEditando(categoria.id);
    setFormulario({
      nome: categoria.nome,
      descricao: categoria.descricao || "",
      cor: categoria.cor || cores[0].valor,
      ativo: categoria.ativo,
    });
    setDialogAberto(true);
  };

  const handleSalvarCategoria = async () => {
    if (!formulario.nome.trim()) {
      toast.error("O nome da categoria é obrigatório");
      return;
    }

    try {
      if (modoEdicao && categoriaEditando) {
        const dadosAtualizados = {
          nome: formulario.nome.trim(),
          descricao: formulario.descricao.trim(),
          cor: formulario.cor,
          ativo: formulario.ativo,
        };
        const response = await api.update('categorias-conta-corrente', categoriaEditando, dadosAtualizados) as CategoriaContaCorrente;
        setCategorias(categorias.map((c) => c.id === categoriaEditando ? { ...c, ...response } : c));
        toast.success("Categoria atualizada com sucesso!");
      } else {
        const payload = {
          nome: formulario.nome.trim(),
          descricao: formulario.descricao.trim(),
          cor: formulario.cor,
          ativo: formulario.ativo,
        };
        const response = await api.create('categorias-conta-corrente', payload) as CategoriaContaCorrente;
        setCategorias([...categorias, response]);
        toast.success("Categoria criada com sucesso!");
      }
      setDialogAberto(false);
      setFormulario({ nome: "", descricao: "", cor: cores[0].valor, ativo: true });
    } catch (error: any) {
      const msg = error?.message || error?.error || 'Erro desconhecido';
      const texto = msg.includes('já existe') ? 'Uma categoria com este nome já existe.' : msg;
      toast.error(`Erro ao salvar categoria: ${texto}`);
    }
  };

  const handleExcluirCategoria = (id: string) => {
    const categoria = categorias.find((c) => c.id === id);
    if (categoria) {
      setDeleteConfirm({
        open: true,
        id,
        name: categoria.nome,
      });
    }
  };

  const confirmDelete = async () => {
    if (deleteConfirm.id) {
      try {
        await api.delete('categorias-conta-corrente', deleteConfirm.id);
        setCategorias(categorias.filter((c) => c.id !== deleteConfirm.id));
        toast.success(`Categoria "${deleteConfirm.name}" removida com sucesso`);
      } catch (error: any) {
        const msg = error?.message || error?.error || 'Erro desconhecido';
        toast.error(`Erro ao excluir categoria: ${msg}`);
      } finally {
        setDeleteConfirm({ open: false, id: null, name: null });
      }
    }
  };

  const handleToggleAtivo = async (id: string) => {
    const categoria = categorias.find((c) => c.id === id);
    if (!categoria) return;
    try {
      const response = await api.update('categorias-conta-corrente', id, {
        nome: categoria.nome,
        descricao: categoria.descricao,
        cor: categoria.cor,
        ativo: !categoria.ativo,
      }) as CategoriaContaCorrente;
      setCategorias(categorias.map((c) => c.id === id ? { ...c, ...response } : c));
      toast.success(`Categoria ${categoria.ativo ? "desativada" : "ativada"} com sucesso`);
    } catch (error: any) {
      const msg = error?.message || error?.error || 'Erro desconhecido';
      toast.error(`Erro ao alterar status: ${msg}`);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="text-center text-muted-foreground">
            Carregando categorias...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Categorias de Conta Corrente
              </CardTitle>
              <CardDescription className="mt-2">
                Gerencie as categorias utilizadas nos compromissos e pagamentos
              </CardDescription>
            </div>
            <Button onClick={handleAbrirDialogo}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Cor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categorias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhuma categoria cadastrada
                    </TableCell>
                  </TableRow>
                ) : (
                  categorias.map((categoria) => (
                    <TableRow key={categoria.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 w-4 rounded-full border"
                            style={{ backgroundColor: categoria.cor }}
                          />
                          <span className="font-medium">{categoria.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {categoria.descricao || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" style={{ borderColor: categoria.cor, color: categoria.cor }}>
                          {cores.find(c => c.valor === categoria.cor)?.nome || "Personalizada"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {categoria.ativo ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Ativa
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Inativa
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditarCategoria(categoria)}
                            title="Editar categoria"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleAtivo(categoria.id)}
                            title={categoria.ativo ? "Desativar" : "Ativar"}
                          >
                            {categoria.ativo ? (
                              <XCircle className="h-4 w-4 text-orange-500" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleExcluirCategoria(categoria.id)}
                            title="Excluir categoria"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Criar/Editar Categoria */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {modoEdicao ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
            <DialogDescription>
              {modoEdicao
                ? "Atualize as informações da categoria"
                : "Cadastre uma nova categoria para organizar os lançamentos"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">
                Nome da Categoria <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nome"
                value={formulario.nome}
                onChange={(e) =>
                  setFormulario({ ...formulario, nome: e.target.value })
                }
                placeholder="Ex: Marketing, Infraestrutura, Eventos"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formulario.descricao}
                onChange={(e) =>
                  setFormulario({ ...formulario, descricao: e.target.value })
                }
                placeholder="Descreva o propósito desta categoria (opcional)"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Cor de Identificação</Label>
              <div className="grid grid-cols-5 gap-2">
                {cores.map((cor) => (
                  <button
                    key={cor.valor}
                    type="button"
                    onClick={() => setFormulario({ ...formulario, cor: cor.valor })}
                    className={`h-10 rounded-md border-2 transition-all ${
                      formulario.cor === cor.valor
                        ? "border-foreground scale-110"
                        : "border-border hover:scale-105"
                    }`}
                    style={{ backgroundColor: cor.valor }}
                    title={cor.nome}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label>Status da Categoria</Label>
                <p className="text-sm text-muted-foreground">
                  Categorias inativas não aparecerão nas listagens
                </p>
              </div>
              <Switch
                checked={formulario.ativo}
                onCheckedChange={(checked) =>
                  setFormulario({ ...formulario, ativo: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarCategoria}>
              {modoEdicao ? "Salvar Alterações" : "Criar Categoria"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <DeleteConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) =>
          setDeleteConfirm({ ...deleteConfirm, open })
        }
        onConfirm={confirmDelete}
        title="Excluir Categoria"
        description={`Tem certeza que deseja excluir a categoria "${deleteConfirm.name}"? Lançamentos vinculados a esta categoria não serão afetados.`}
      />
    </>
  );
}