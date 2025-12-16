import { Cliente, PessoaContato } from '../types/customer';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface CustomerFormContatoProps {
  formData: Partial<Cliente>;
  updateFormData: (updates: Partial<Cliente>) => void;
  readOnly: boolean;
}

// Função para formatar telefone fixo
const formatTelefoneFixo = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

// Função para formatar telefone celular
const formatTelefoneCelular = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

export function CustomerFormContato({
  formData,
  updateFormData,
  readOnly,
}: CustomerFormContatoProps) {
  const [dialogAberto, setDialogAberto] = useState(false);
  const [contatoEditando, setContatoEditando] = useState<PessoaContato | null>(null);
  const [novoContato, setNovoContato] = useState<Partial<PessoaContato>>({
    nome: '',
    departamento: '',
    cargo: '',
    email: '',
    telefoneCelular: '',
    telefoneFixo: '',
    ramal: '',
  });

  const handleAdicionarContato = () => {
    if (!novoContato.nome || !novoContato.email) {
      return;
    }

    const contato: PessoaContato = {
      id: `contato-${Date.now()}`,
      nome: novoContato.nome!,
      departamento: novoContato.departamento || '',
      cargo: novoContato.cargo || '',
      email: novoContato.email!,
      telefoneCelular: novoContato.telefoneCelular || '',
      telefoneFixo: novoContato.telefoneFixo,
      ramal: novoContato.ramal,
    };

    const pessoasContato = [...(formData.pessoasContato || [])];
    
    if (contatoEditando) {
      const index = pessoasContato.findIndex((c) => c.id === contatoEditando.id);
      if (index >= 0) {
        pessoasContato[index] = { ...contato, id: contatoEditando.id };
      }
    } else {
      pessoasContato.push(contato);
    }

    updateFormData({ pessoasContato });
    setDialogAberto(false);
    setContatoEditando(null);
    setNovoContato({
      nome: '',
      departamento: '',
      cargo: '',
      email: '',
      telefoneCelular: '',
      telefoneFixo: '',
      ramal: '',
    });
  };

  const handleEditarContato = (contato: PessoaContato) => {
    setContatoEditando(contato);
    setNovoContato(contato);
    setDialogAberto(true);
  };

  const handleRemoverContato = (contatoId: string) => {
    const pessoasContato = formData.pessoasContato?.filter((c) => c.id !== contatoId) || [];
    updateFormData({ pessoasContato });
  };

  const handleAbrirDialog = () => {
    setContatoEditando(null);
    setNovoContato({
      nome: '',
      departamento: '',
      cargo: '',
      email: '',
      telefoneCelular: '',
      telefoneFixo: '',
      ramal: '',
    });
    setDialogAberto(true);
  };

  return (
    <div className="space-y-6">
      {/* Seção Informações Principais */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Informações Principais</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="site">Site</Label>
            <Input
              id="site"
              type="url"
              value={formData.site || ''}
              onChange={(e) => updateFormData({ site: e.target.value })}
              placeholder="www.exemplo.com.br"
              disabled={readOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emailPrincipal">E-mail Principal</Label>
            <Input
              id="emailPrincipal"
              type="email"
              value={formData.emailPrincipal || ''}
              onChange={(e) => updateFormData({ emailPrincipal: e.target.value })}
              placeholder="contato@exemplo.com.br"
              disabled={readOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefoneFixoPrincipal">Telefone Fixo Principal</Label>
            <Input
              id="telefoneFixoPrincipal"
              value={formData.telefoneFixoPrincipal || ''}
              onChange={(e) =>
                updateFormData({ telefoneFixoPrincipal: formatTelefoneFixo(e.target.value) })
              }
              placeholder="(11) 3000-0000"
              maxLength={14}
              disabled={readOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefoneCelularPrincipal">Telefone Celular Principal</Label>
            <Input
              id="telefoneCelularPrincipal"
              value={formData.telefoneCelularPrincipal || ''}
              onChange={(e) =>
                updateFormData({ telefoneCelularPrincipal: formatTelefoneCelular(e.target.value) })
              }
              placeholder="(11) 90000-0000"
              maxLength={15}
              disabled={readOnly}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Seção Pessoas de Contato */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Pessoas de Contato</h3>
          {!readOnly && (
            <Button onClick={handleAbrirDialog} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Contato
            </Button>
          )}
        </div>

        {formData.pessoasContato && formData.pessoasContato.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  {!readOnly && <TableHead className="w-[100px]">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {formData.pessoasContato.map((contato) => (
                  <TableRow key={contato.id}>
                    <TableCell className="font-medium">{contato.nome}</TableCell>
                    <TableCell>{contato.departamento}</TableCell>
                    <TableCell>{contato.cargo}</TableCell>
                    <TableCell>{contato.email}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {contato.telefoneCelular && (
                          <div className="text-sm">{contato.telefoneCelular}</div>
                        )}
                        {contato.telefoneFixo && (
                          <div className="text-sm text-muted-foreground">
                            {contato.telefoneFixo}
                            {contato.ramal && ` (${contato.ramal})`}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    {!readOnly && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditarContato(contato)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoverContato(contato.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground border rounded-md">
            Nenhuma pessoa de contato cadastrada
          </div>
        )}
      </div>

      {/* Dialog para adicionar/editar contato */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {contatoEditando ? 'Editar' : 'Adicionar'} Pessoa de Contato
            </DialogTitle>
            <DialogDescription>
              Preencha os dados da pessoa de contato
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nomeContato">Nome *</Label>
                <Input
                  id="nomeContato"
                  value={novoContato.nome || ''}
                  onChange={(e) => setNovoContato({ ...novoContato, nome: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="departamentoContato">Departamento</Label>
                <Input
                  id="departamentoContato"
                  value={novoContato.departamento || ''}
                  onChange={(e) =>
                    setNovoContato({ ...novoContato, departamento: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cargoContato">Cargo</Label>
                <Input
                  id="cargoContato"
                  value={novoContato.cargo || ''}
                  onChange={(e) => setNovoContato({ ...novoContato, cargo: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailContato">E-mail *</Label>
                <Input
                  id="emailContato"
                  type="email"
                  value={novoContato.email || ''}
                  onChange={(e) => setNovoContato({ ...novoContato, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telefoneCelularContato">Telefone Celular</Label>
                <Input
                  id="telefoneCelularContato"
                  value={novoContato.telefoneCelular || ''}
                  onChange={(e) =>
                    setNovoContato({
                      ...novoContato,
                      telefoneCelular: formatTelefoneCelular(e.target.value),
                    })
                  }
                  placeholder="(11) 90000-0000"
                  maxLength={15}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefoneFixoContato">Telefone Fixo</Label>
                <Input
                  id="telefoneFixoContato"
                  value={novoContato.telefoneFixo || ''}
                  onChange={(e) =>
                    setNovoContato({
                      ...novoContato,
                      telefoneFixo: formatTelefoneFixo(e.target.value),
                    })
                  }
                  placeholder="(11) 3000-0000"
                  maxLength={14}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ramalContato">Ramal</Label>
                <Input
                  id="ramalContato"
                  value={novoContato.ramal || ''}
                  onChange={(e) =>
                    setNovoContato({ ...novoContato, ramal: e.target.value.replace(/\D/g, '') })
                  }
                  placeholder="123"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAdicionarContato}
              disabled={!novoContato.nome || !novoContato.email}
            >
              {contatoEditando ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}