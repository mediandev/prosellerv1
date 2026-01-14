import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { api } from "../services/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog";
import { Checkbox } from "./ui/checkbox";
import { Separator } from "./ui/separator";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { Usuario, PERMISSOES_DISPONIVEIS, Permissao } from "../types/user";
import { toast } from "sonner@2.0.3";
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit, 
  Shield, 
  CheckCircle2, 
  XCircle,
  Search,
  Mail,
  Calendar,
  Clock,
  Key,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { format } from "date-fns@4.1.0";
import { ptBR } from "date-fns@4.1.0/locale";
import { ScrollArea } from "./ui/scroll-area";

interface FormularioUsuario {
  nome: string;
  email: string;
  permissoes: string[];
  ativo: boolean;
}

const formularioInicial: FormularioUsuario = {
  nome: "",
  email: "",
  permissoes: [],
  ativo: true,
};

export function UserManagement() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [dialogPermissoesAberto, setDialogPermissoesAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<string | null>(null);
  const [usuarioPermissoes, setUsuarioPermissoes] = useState<Usuario | null>(null);
  const [formulario, setFormulario] = useState<FormularioUsuario>(formularioInicial);
  const [busca, setBusca] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    id: string | null;
    name: string | null;
  }>({
    open: false,
    id: null,
    name: null,
  });
  const [sortField, setSortField] = useState<keyof Usuario | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Carregar usuários
  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    try {
      console.log('[USERS] Carregando usuários via Edge Functions...');
      const usuariosAPI = await api.usuarios.list();
      // Garantir que todos os usuários tenham campos obrigatórios inicializados
      const usuariosNormalizados = usuariosAPI.map((u: Usuario) => ({
        ...u,
        permissoes: u.permissoes || [],
        dataCadastro: u.dataCadastro || new Date().toISOString()
      }));
      setUsuarios(usuariosNormalizados);
      console.log('[USERS] Usuários carregados:', usuariosNormalizados.length);
    } catch (error) {
      console.error('[USERS] Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários. Verifique sua conexão.');
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };

  // Função para ordenar
  const handleSort = (field: keyof Usuario) => {
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

  const usuariosFiltrados = usuarios.filter((usuario) =>
    usuario.nome.toLowerCase().includes(busca.toLowerCase()) ||
    usuario.email.toLowerCase().includes(busca.toLowerCase())
  );

  // Aplicar ordenação
  const usuariosOrdenados = [...usuariosFiltrados].sort((a, b) => {
    if (!sortField) return 0;

    let aValue = a[sortField];
    let bValue = b[sortField];

    if (aValue === undefined || aValue === null) return 1;
    if (bValue === undefined || bValue === null) return -1;

    // Tratamento especial para datas
    if (sortField === 'ultimoAcesso' || sortField === 'dataCriacao') {
      const dateA = new Date(aValue as string);
      const dateB = new Date(bValue as string);
      return sortDirection === 'asc' ? (dateA.getTime() - dateB.getTime()) : (dateB.getTime() - dateA.getTime());
    }

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

  const handleAbrirDialogo = () => {
    setModoEdicao(false);
    setUsuarioEditando(null);
    setFormulario(formularioInicial);
    setDialogAberto(true);
  };

  const handleEditarUsuario = (usuario: Usuario) => {
    setModoEdicao(true);
    setUsuarioEditando(usuario.id);
    setFormulario({
      nome: usuario.nome,
      email: usuario.email,
      permissoes: usuario.permissoes || [],
      ativo: usuario.ativo,
    });
    setDialogAberto(true);
  };

  const handleGerenciarPermissoes = (usuario: Usuario) => {
    setUsuarioPermissoes(usuario);
    setFormulario({
      nome: usuario.nome,
      email: usuario.email,
      permissoes: usuario.permissoes || [],
      ativo: usuario.ativo,
    });
    setDialogPermissoesAberto(true);
  };

  const handleSalvarUsuario = () => {
    if (!formulario.nome.trim()) {
      toast.error("O nome do usuário é obrigatório");
      return;
    }

    if (!formulario.email.trim()) {
      toast.error("O email é obrigatório");
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formulario.email)) {
      toast.error("Email inválido");
      return;
    }

    if (modoEdicao && usuarioEditando) {
      const usuarioAtualizado = usuarios.find(u => u.id === usuarioEditando);
      if (usuarioAtualizado) {
        api.usuarios.update(usuarioEditando, {
          nome: formulario.nome,
          email: formulario.email,
          tipo: usuarioAtualizado.tipo, // Manter tipo existente
          ativo: formulario.ativo,
        })
          .then((usuarioAtualizado) => {
            // Manter permissões (não são atualizadas via Edge Function ainda)
            const usuarioComPermissoes = {
              ...usuarioAtualizado,
              permissoes: formulario.permissoes,
            };
            setUsuarios(usuarios.map((u) => u.id === usuarioEditando ? usuarioComPermissoes : u));
            toast.success("Usuário atualizado com sucesso!");
            setDialogAberto(false);
            setFormulario(formularioInicial);
            carregarUsuarios(); // Recarregar para garantir sincronização
          })
          .catch((error: any) => {
            console.error('[USERS] Erro ao atualizar usuário:', error);
            toast.error(`Erro ao atualizar usuário: ${error.message || 'Erro desconhecido'}`);
          });
      }
    } else {
      // Criar novo usuário (requer senha - será implementado em componente separado)
      toast.error('Para criar usuários, use a função de signup com senha. Esta funcionalidade será implementada.');
      // TODO: Implementar criação de usuário com senha ou componente separado
    }
  };

  const handleSalvarPermissoes = () => {
    if (usuarioPermissoes) {
      // Nota: Permissões ainda não são gerenciadas via Edge Functions
      // Por enquanto, atualizar apenas localmente
      const dadosAtualizados = {
        ...usuarioPermissoes,
        permissoes: formulario.permissoes,
      };
      
      setUsuarios(
        usuarios.map((u) =>
          u.id === usuarioPermissoes.id
            ? dadosAtualizados
            : u
        )
      );
      toast.success("Permissões atualizadas com sucesso!");
      setDialogPermissoesAberto(false);
      setUsuarioPermissoes(null);
    }
  };

  const handleExcluirUsuario = (id: string) => {
    const usuario = usuarios.find((u) => u.id === id);
    if (usuario) {
      setDeleteConfirm({
        open: true,
        id,
        name: usuario.nome,
      });
    }
  };

  const confirmDelete = async () => {
    if (deleteConfirm.id) {
      try {
        await api.usuarios.delete(deleteConfirm.id);
        setUsuarios(usuarios.filter((u) => u.id !== deleteConfirm.id));
        toast.success(`Usuário "${deleteConfirm.name}" removido com sucesso`);
        setDeleteConfirm({ open: false, id: null, name: null });
        carregarUsuarios(); // Recarregar para garantir sincronização
      } catch (error: any) {
        console.error('[USERS] Erro ao excluir usuário:', error);
        toast.error(`Erro ao excluir usuário: ${error.message || 'Erro desconhecido'}`);
      }
    }
  };

  const handleToggleAtivo = (id: string) => {
    const usuario = usuarios.find((u) => u.id === id);
    if (usuario) {
      api.usuarios.update(id, {
        ativo: !usuario.ativo,
      })
        .then((usuarioAtualizado) => {
          setUsuarios(
            usuarios.map((u) =>
              u.id === id ? { ...usuarioAtualizado, permissoes: u.permissoes } : u
            )
          );
          toast.success(`Usuário ${usuario.ativo ? "desativado" : "ativado"} com sucesso`);
          carregarUsuarios(); // Recarregar para garantir sincronização
        })
        .catch((error: any) => {
          console.error('[USERS] Erro ao alterar status:', error);
          toast.error(`Erro ao alterar status: ${error.message || 'Erro desconhecido'}`);
        });
    }
  };

  const handleTogglePermissao = (permissaoId: string) => {
    setFormulario((prev) => ({
      ...prev,
      permissoes: prev.permissoes.includes(permissaoId)
        ? prev.permissoes.filter((p) => p !== permissaoId)
        : [...prev.permissoes, permissaoId],
    }));
  };

  const handleMarcarTodasCategoria = (categoria: string) => {
    const permissoesDaCategoria = PERMISSOES_DISPONIVEIS
      .filter((p) => p.categoria === categoria)
      .map((p) => p.id);

    const todasMarcadas = permissoesDaCategoria.every((id) =>
      formulario.permissoes.includes(id)
    );

    if (todasMarcadas) {
      // Desmarcar todas da categoria
      setFormulario((prev) => ({
        ...prev,
        permissoes: prev.permissoes.filter((p) => !permissoesDaCategoria.includes(p)),
      }));
    } else {
      // Marcar todas da categoria
      setFormulario((prev) => ({
        ...prev,
        permissoes: [...new Set([...prev.permissoes, ...permissoesDaCategoria])],
      }));
    }
  };

  const getPermissoesCount = (usuario: Usuario) => {
    return usuario.permissoes?.length || 0;
  };

  const getNomeCategoria = (categoria: string) => {
    const nomes: Record<string, string> = {
      clientes: "Clientes",
      vendas: "Vendas",
      relatorios: "Relatórios",
      configuracoes: "Configurações",
      usuarios: "Usuários",
      contacorrente: "Conta Corrente",
    };
    return nomes[categoria] || categoria;
  };

  const categorias = [
    "clientes",
    "vendas",
    "relatorios",
    "configuracoes",
    "usuarios",
    "contacorrente",
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gerenciamento de Usuários
              </CardTitle>
              <CardDescription className="mt-2">
                Gerencie usuários backoffice e suas permissões de acesso ao sistema
              </CardDescription>
            </div>
            <Button onClick={handleAbrirDialogo}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Busca */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tabela de Usuários */}
          <div className="rounded-md border">
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
                      onClick={() => handleSort('email')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Email
                      {sortField === 'email' ? (
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
                  <TableHead>Permissões</TableHead>
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
                  <TableHead>
                    <button
                      onClick={() => handleSort('dataCriacao')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Cadastro
                      {sortField === 'dataCriacao' ? (
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
                      onClick={() => handleSort('ultimoAcesso')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Último Acesso
                      {sortField === 'ultimoAcesso' ? (
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
                {usuariosOrdenados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {busca ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
                    </TableCell>
                  </TableRow>
                ) : (
                  usuariosOrdenados.map((usuario) => (
                    <TableRow key={usuario.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium">
                              {usuario.nome
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .substring(0, 2)}
                            </span>
                          </div>
                          <span>{usuario.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {usuario.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="gap-1">
                          <Key className="h-3 w-3" />
                          {getPermissoesCount(usuario)} permissões
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {usuario.ativo ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Inativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {(() => {
                            if (!usuario.dataCadastro) return "N/A";
                            try {
                              const date = new Date(usuario.dataCadastro);
                              if (isNaN(date.getTime())) return "Data inválida";
                              return format(date, "dd/MM/yyyy", { locale: ptBR });
                            } catch {
                              return "Data inválida";
                            }
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {usuario.ultimoAcesso ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {(() => {
                              try {
                                const date = new Date(usuario.ultimoAcesso);
                                if (isNaN(date.getTime())) return "Data inválida";
                                return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
                              } catch {
                                return "Data inválida";
                              }
                            })()}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Nunca</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleGerenciarPermissoes(usuario)}
                            title="Gerenciar permissões"
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditarUsuario(usuario)}
                            title="Editar usuário"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleAtivo(usuario.id)}
                            title={usuario.ativo ? "Desativar" : "Ativar"}
                          >
                            {usuario.ativo ? (
                              <XCircle className="h-4 w-4 text-orange-500" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleExcluirUsuario(usuario.id)}
                            title="Excluir usuário"
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

      {/* Dialog Criar/Editar Usuário */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {modoEdicao ? "Editar Usuário" : "Novo Usuário"}
            </DialogTitle>
            <DialogDescription>
              {modoEdicao
                ? "Atualize as informações do usuário"
                : "Cadastre um novo usuário backoffice no sistema"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">
                  Nome Completo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nome"
                  value={formulario.nome}
                  onChange={(e) =>
                    setFormulario({ ...formulario, nome: e.target.value })
                  }
                  placeholder="Ex: João Silva"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formulario.email}
                  onChange={(e) =>
                    setFormulario({ ...formulario, email: e.target.value })
                  }
                  placeholder="joao.silva@empresa.com"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label>Status do Usuário</Label>
                <p className="text-sm text-muted-foreground">
                  Usuários inativos não podem acessar o sistema
                </p>
              </div>
              <Switch
                checked={formulario.ativo}
                onCheckedChange={(checked) =>
                  setFormulario({ ...formulario, ativo: checked })
                }
              />
            </div>

            <Separator />

            <div>
              <Label className="text-base">Permissões de Acesso</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Selecione as permissões que este usuário terá no sistema
              </p>

              <ScrollArea className="h-[300px] rounded-md border p-4">
                <div className="space-y-6">
                  {categorias.map((categoria) => {
                    const permissoesCategoria = PERMISSOES_DISPONIVEIS.filter(
                      (p) => p.categoria === categoria
                    );
                    const todasMarcadas = permissoesCategoria.every((p) =>
                      formulario.permissoes.includes(p.id)
                    );

                    return (
                      <div key={categoria} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{getNomeCategoria(categoria)}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarcarTodasCategoria(categoria)}
                          >
                            {todasMarcadas ? "Desmarcar todas" : "Marcar todas"}
                          </Button>
                        </div>
                        <div className="space-y-2 pl-4">
                          {permissoesCategoria.map((permissao) => (
                            <div
                              key={permissao.id}
                              className="flex items-start space-x-3"
                            >
                              <Checkbox
                                id={permissao.id}
                                checked={formulario.permissoes.includes(permissao.id)}
                                onCheckedChange={() =>
                                  handleTogglePermissao(permissao.id)
                                }
                              />
                              <div className="space-y-1 leading-none">
                                <label
                                  htmlFor={permissao.id}
                                  className="text-sm font-medium cursor-pointer"
                                >
                                  {permissao.nome}
                                </label>
                                <p className="text-sm text-muted-foreground">
                                  {permissao.descricao}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarUsuario}>
              {modoEdicao ? "Salvar Alterações" : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Gerenciar Permissões */}
      <Dialog open={dialogPermissoesAberto} onOpenChange={setDialogPermissoesAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Gerenciar Permissões
            </DialogTitle>
            <DialogDescription>
              Configure as permissões de acesso para{" "}
              <strong>{usuarioPermissoes?.nome}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {usuarioPermissoes?.email}
              </span>
            </div>

            <ScrollArea className="h-[400px] rounded-md border p-4">
              <div className="space-y-6">
                {categorias.map((categoria) => {
                  const permissoesCategoria = PERMISSOES_DISPONIVEIS.filter(
                    (p) => p.categoria === categoria
                  );
                  const todasMarcadas = permissoesCategoria.every((p) =>
                    formulario.permissoes.includes(p.id)
                  );

                  return (
                    <div key={categoria} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{getNomeCategoria(categoria)}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarcarTodasCategoria(categoria)}
                        >
                          {todasMarcadas ? "Desmarcar todas" : "Marcar todas"}
                        </Button>
                      </div>
                      <div className="space-y-2 pl-4">
                        {permissoesCategoria.map((permissao) => (
                          <div
                            key={permissao.id}
                            className="flex items-start space-x-3"
                          >
                            <Checkbox
                              id={`perm-${permissao.id}`}
                              checked={formulario.permissoes.includes(permissao.id)}
                              onCheckedChange={() =>
                                handleTogglePermissao(permissao.id)
                              }
                            />
                            <div className="space-y-1 leading-none">
                              <label
                                htmlFor={`perm-${permissao.id}`}
                                className="text-sm font-medium cursor-pointer"
                              >
                                {permissao.nome}
                              </label>
                              <p className="text-sm text-muted-foreground">
                                {permissao.descricao}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogPermissoesAberto(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSalvarPermissoes}>Salvar Permissões</Button>
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
        title="Excluir Usuário"
        description={`Tem certeza que deseja excluir o usuário "${deleteConfirm.name}"? Esta ação não pode ser desfeita.`}
      />
    </>
  );
}