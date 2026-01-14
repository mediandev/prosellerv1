import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner@2.0.3';
import { api } from '../services/api';
import { consultarCNPJCompleto, consultarCEP } from '../services/integrations';
import { 
  DadosBancariosCliente, 
  TipoContaCliente, 
  TipoChavePixCliente, 
  Cliente, 
  TipoPessoa, 
  SituacaoCliente 
} from '../types/customer';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import { Combobox } from './ui/combobox';
import { Loader2, Plus, Pencil, Trash2, MapPin, CreditCard, Search, Hash, Edit } from 'lucide-react';
import { municipiosPorUF, UFS } from '../data/municipios';
import { customerCodeService } from '../services/customerCodeService';

interface CustomerFormDadosCadastraisProps {
  formData: Partial<Cliente>;
  updateFormData: (updates: Partial<Cliente>) => void;
  readOnly: boolean;
}

// Função auxiliar para obter municípios por UF
const getMunicipiosPorUF = (uf: string): string[] => {
  return municipiosPorUF[uf as keyof typeof municipiosPorUF] || [];
};

// Função para formatar CPF
const formatCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

// Função para formatar CNPJ
const formatCNPJ = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

// Função para formatar CEP
const formatCEP = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
};

export function CustomerFormDadosCadastrais({
  formData,
  updateFormData,
  readOnly,
}: CustomerFormDadosCadastraisProps) {
  const [buscandoCEP, setBuscandoCEP] = useState(false);
  const [buscandoCEPEntrega, setBuscandoCEPEntrega] = useState(false);
  const [buscandoCNPJ, setBuscandoCNPJ] = useState(false);
  const [dialogBancarioOpen, setDialogBancarioOpen] = useState(false);
  const [contaBancariaEditando, setContaBancariaEditando] = useState<DadosBancariosCliente | null>(null);
  const [gruposRedes, setGruposRedes] = useState<Array<{ id: string; nome: string; descricao?: string }>>([]);
  const [loadingGrupos, setLoadingGrupos] = useState(false);
  const [mockBanks, setMockBanks] = useState<any[]>([]);
  const [segmentosMercado, setSegmentosMercado] = useState<string[]>([]);
  const [formBancario, setFormBancario] = useState<Partial<DadosBancariosCliente>>({
    banco: '',
    agencia: '',
    digitoAgencia: '',
    tipoConta: 'corrente',
    numeroConta: '',
    digitoConta: '',
    nomeTitular: '',
    cpfCnpjTitular: '',
    tipoChavePix: 'cpf_cnpj',
    chavePix: '',
    principal: false,
  });

  // Carregar grupos/redes do Supabase
  useEffect(() => {
    const carregarGruposRedes = async () => {
      try {
        setLoadingGrupos(true);
        const data = await api.get('grupos-redes');
        setGruposRedes(data);
        console.log('[GRUPOS-REDES] Carregados:', data.length);
      } catch (error: any) {
        console.error('[GRUPOS-REDES] Erro ao carregar:', error);
        // Não mostrar toast de erro para não poluir a UI
        setGruposRedes([]);
      } finally {
        setLoadingGrupos(false);
      }
    };

    carregarGruposRedes();
  }, []);

  // Carregar segmentos de mercado
  useEffect(() => {
    const carregarSegmentos = async () => {
      try {
        const data = await api.get('segmentos-cliente');
        setSegmentosMercado(data.map((s: any) => s.nome));
        console.log('[SEGMENTOS] Carregados:', data.length);
      } catch (error: any) {
        console.error('[SEGMENTOS] Erro ao carregar:', error);
        setSegmentosMercado([]);
      }
    };

    carregarSegmentos();
  }, []);

  // Carregar bancos
  useEffect(() => {
    const carregarBancos = async () => {
      try {
        const response = await fetch('https://brasilapi.com.br/api/banks/v1');
        const data = await response.json();
        setMockBanks(data || []);
      } catch (error) {
        console.error('[BANCOS] Erro ao carregar:', error);
        setMockBanks([]);
      }
    };

    carregarBancos();
  }, []);

  // Opções para os comboboxes
  const ufsOptions = useMemo(
    () => UFS.map((uf) => ({ value: uf.value, label: `${uf.value} - ${uf.label}` })),
    []
  );

  const gruposOptions = useMemo(() => {
    // Deduplicate by ID to avoid duplicate keys
    const uniqueGrupos = gruposRedes.reduce((acc, g) => {
      if (!acc.find(item => item.id === g.id)) {
        acc.push(g);
      }
      return acc;
    }, [] as typeof gruposRedes);
    
    return uniqueGrupos.map((g) => ({ value: g.id, label: g.nome }));
  }, [gruposRedes]);

  const segmentosOptions = useMemo(() => {
    // Deduplicate segments to avoid duplicate keys
    const uniqueSegmentos = Array.from(new Set(segmentosMercado));
    return uniqueSegmentos.map((s) => ({ value: s, label: s }));
  }, [segmentosMercado]);

  const municipiosOptions = useMemo(() => {
    if (!formData.uf) return [];
    const municipios = getMunicipiosPorUF(formData.uf);
    // Deduplicate municipalities to avoid duplicate keys
    const uniqueMunicipios = Array.from(new Set(municipios));
    return uniqueMunicipios.map((m) => ({ value: m, label: m }));
  }, [formData.uf]);

  const municipiosEntregaOptions = useMemo(() => {
    if (!formData.enderecoEntrega?.uf) return [];
    const municipios = getMunicipiosPorUF(formData.enderecoEntrega.uf);
    // Deduplicate municipalities to avoid duplicate keys
    const uniqueMunicipios = Array.from(new Set(municipios));
    return uniqueMunicipios.map((m) => ({ value: m, label: m }));
  }, [formData.enderecoEntrega?.uf]);

  // Opções para bancos com deduplicação
  const bancosOptions = useMemo(() => {
    // Deduplicate banks by code to avoid duplicate keys
    const uniqueBanks = mockBanks.reduce((acc, bank, index) => {
      const code = bank.code || bank.codigo || `bank-${index}`;
      // Only add if we haven't seen this code before
      if (!acc.find(b => (b.code || b.codigo || `bank-${b.index}`) === code)) {
        acc.push({ ...bank, index });
      }
      return acc;
    }, [] as any[]);

    return uniqueBanks.map((b) => ({
      value: `${b.code || b.codigo || `bank-${b.index}`}`,
      label: `${b.code || b.codigo || b.index} - ${b.fullName || b.nomeCompleto || b.name || b.nome || 'Sem nome'}`
    }));
  }, [mockBanks]);

  const handleBuscarCEP = async () => {
    const cep = formData.cep?.replace(/\D/g, '');
    if (!cep || cep.length !== 8) {
      toast.error('CEP inválido');
      return;
    }

    setBuscandoCEP(true);
    try {
      const data = await consultarCEP(cep);
      
      if (data) {
        // Primeiro preenche logradouro, bairro e UF
        updateFormData({
          logradouro: data.logradouro || '',
          bairro: data.bairro || '',
          uf: data.uf || '',
        });
        
        // Aguarda um pouco para a lista de municípios ser recalculada
        // e então preenche o município
        if (data.localidade) {
          setTimeout(() => {
            updateFormData({
              municipio: data.localidade || '',
            });
          }, 100);
        }
      }
    } finally {
      setBuscandoCEP(false);
    }
  };

  const handleBuscarCEPEntrega = async () => {
    const cep = formData.enderecoEntrega?.cep?.replace(/\D/g, '');
    if (!cep || cep.length !== 8) {
      toast.error('CEP inválido');
      return;
    }

    setBuscandoCEPEntrega(true);
    try {
      const data = await consultarCEP(cep);
      
      if (data) {
        // Atualizar TODOS os campos de uma vez para evitar race conditions
        const novoEnderecoEntrega = {
          ...formData.enderecoEntrega!,
          logradouro: data.logradouro || formData.enderecoEntrega?.logradouro || '',
          bairro: data.bairro || formData.enderecoEntrega?.bairro || '',
          uf: data.uf || formData.enderecoEntrega?.uf || '',
          municipio: data.localidade || formData.enderecoEntrega?.municipio || '',
        };
        
        updateFormData({
          enderecoEntrega: novoEnderecoEntrega,
        });
        
        toast.success('CEP consultado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao buscar CEP de entrega:', error);
      toast.error('Erro ao consultar CEP');
    } finally {
      setBuscandoCEPEntrega(false);
    }
  };

  const handleBuscarCNPJ = async () => {
    const cnpj = formData.cpfCnpj?.replace(/\D/g, '');
    if (!cnpj || cnpj.length !== 14) {
      toast.error('CNPJ inválido');
      return;
    }

    setBuscandoCNPJ(true);
    try {
      // Usar consulta completa que busca CNPJ + Inscrição Estadual
      const resultado = await consultarCNPJCompleto(cnpj);
      
      if (resultado?.cnpj) {
        const data = resultado.cnpj;
        
        // Formatar telefone se existir
        let telefoneFormatado = undefined;
        if (data.telefone) {
          const telefoneNumeros = data.telefone.replace(/\D/g, '');
          if (telefoneNumeros.length === 10) {
            telefoneFormatado = formatTelefoneFixo(telefoneNumeros);
          } else if (telefoneNumeros.length === 11) {
            telefoneFormatado = formatTelefoneCelular(telefoneNumeros);
          } else {
            telefoneFormatado = data.telefone;
          }
        }

        // Formatar CEP se existir
        const cepFormatado = data.cep ? formatCEP(data.cep.replace(/\D/g, '')) : '';

        // Preparar dados para atualização (SEM município por enquanto)
        const dadosAtualizacao: Partial<Cliente> = {
          razaoSocial: data.razao_social,
          nomeFantasia: data.nome_fantasia || undefined,
          cep: cepFormatado,
          logradouro: data.logradouro,
          numero: data.numero,
          complemento: data.complemento || undefined,
          bairro: data.bairro,
          uf: data.uf,
          telefoneFixoPrincipal: telefoneFormatado,
          emailPrincipal: data.email || undefined,
        };

        // Se conseguiu obter a Inscrição Estadual, adicionar aos dados
        if (resultado.sintegra?.ie) {
          dadosAtualizacao.inscricaoEstadual = resultado.sintegra.ie;
          console.log('✅ Inscrição Estadual preenchida automaticamente:', resultado.sintegra.ie);
        } else {
          console.log('⚠️ Inscrição Estadual não encontrada automaticamente');
        }

        // Atualizar formulário com todos os dados
        console.log('🔍 CNPJ - Dados recebidos:', { uf: data.uf, municipio: data.municipio, cep: cepFormatado });
        updateFormData(dadosAtualizacao);
        
        // WORKAROUND: Buscar CEP automaticamente para preencher município
        // Como a busca de CEP funciona perfeitamente, usamos ela para preencher o município
        if (cepFormatado && cepFormatado.replace(/\D/g, '').length === 8) {
          console.log('🔄 WORKAROUND: Buscando CEP automaticamente para preencher município:', cepFormatado);
          
          // Aguarda 200ms para garantir que o CEP foi atualizado no estado
          setTimeout(async () => {
            try {
              const cepData = await consultarCEP(cepFormatado.replace(/\D/g, ''));
              
              if (cepData?.localidade) {
                console.log('✅ WORKAROUND: Município obtido via CEP:', cepData.localidade);
                
                // Preenche UF e outros dados do CEP (caso estejam diferentes)
                updateFormData({
                  uf: cepData.uf || dadosAtualizacao.uf,
                  logradouro: cepData.logradouro || dadosAtualizacao.logradouro,
                  bairro: cepData.bairro || dadosAtualizacao.bairro,
                });
                
                // Aguarda mais 100ms para lista de municípios ser recalculada
                setTimeout(() => {
                  updateFormData({
                    municipio: cepData.localidade || '',
                  });
                  console.log('✅ WORKAROUND: Município preenchido com sucesso:', cepData.localidade);
                }, 100);
              }
            } catch (error) {
              console.error('⚠️ WORKAROUND: Erro ao buscar CEP:', error);
            }
          }, 200);
        } else {
          console.log('⚠️ CEP inválido ou não fornecido, não é possível usar workaround');
        }
      }
    } catch (error) {
      console.error('Erro ao buscar CNPJ:', error);
    } finally {
      setBuscandoCNPJ(false);
    }
  };

  // Função auxiliar para formatar telefone celular
  const formatTelefoneCelular = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  // Função auxiliar para formatar telefone fixo
  const formatTelefoneFixo = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const handleCpfCnpjChange = (value: string) => {
    const tipoPessoa = formData.tipoPessoa;
    const formatted = tipoPessoa === 'Pessoa Física' ? formatCPF(value) : formatCNPJ(value);
    updateFormData({ cpfCnpj: formatted });
  };

  // Handlers para dados bancários
  const handleAbrirDialogBancario = () => {
    setContaBancariaEditando(null);
    setFormBancario({
      banco: '',
      agencia: '',
      digitoAgencia: '',
      tipoConta: 'corrente',
      numeroConta: '',
      digitoConta: '',
      nomeTitular: formData.razaoSocial || '',
      cpfCnpjTitular: formData.cpfCnpj || '',
      tipoChavePix: 'cpf_cnpj',
      chavePix: '',
      principal: (formData.dadosBancarios?.length || 0) === 0,
    });
    setDialogBancarioOpen(true);
  };

  const handleEditarContaBancaria = (conta: DadosBancariosCliente) => {
    setContaBancariaEditando(conta);
    setFormBancario(conta);
    setDialogBancarioOpen(true);
  };

  const handleSalvarContaBancaria = () => {
    if (!formBancario.banco || !formBancario.agencia || !formBancario.numeroConta || !formBancario.nomeTitular) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const dadosBancarios = [...(formData.dadosBancarios || [])];

    if (contaBancariaEditando) {
      const index = dadosBancarios.findIndex(c => c.id === contaBancariaEditando.id);
      if (index >= 0) {
        dadosBancarios[index] = { ...formBancario as DadosBancariosCliente, id: contaBancariaEditando.id };
      }
    } else {
      const novaConta: DadosBancariosCliente = {
        ...formBancario as DadosBancariosCliente,
        id: `db-${Date.now()}`,
      };
      dadosBancarios.push(novaConta);
    }

    // Se marcou como principal, desmarcar as outras
    if (formBancario.principal) {
      dadosBancarios.forEach(c => {
        if (contaBancariaEditando && c.id === contaBancariaEditando.id) {
          c.principal = true;
        } else {
          c.principal = false;
        }
      });
    }

    updateFormData({ dadosBancarios });
    setDialogBancarioOpen(false);
    toast.success(contaBancariaEditando ? 'Conta bancária atualizada!' : 'Conta bancária adicionada!');
  };

  const handleExcluirContaBancaria = (id: string) => {
    const dadosBancarios = (formData.dadosBancarios || []).filter(c => c.id !== id);
    updateFormData({ dadosBancarios });
    toast.success('Conta bancária excluída!');
  };

  const getTipoContaLabel = (tipo: TipoContaCliente) => {
    const labels: Record<TipoContaCliente, string> = {
      corrente: 'Corrente',
      poupanca: 'Poupança',
      salario: 'Salário',
      pagamento: 'Pagamento',
    };
    return labels[tipo] || tipo;
  };

  const getTipoChavePixLabel = (tipo: TipoChavePixCliente) => {
    const labels: Record<TipoChavePixCliente, string> = {
      cpf_cnpj: 'CPF/CNPJ',
      email: 'E-mail',
      telefone: 'Telefone',
      aleatoria: 'Aleatória',
    };
    return labels[tipo] || tipo;
  };

  return (
    <div className="space-y-6">
      {/* Seção Identificação */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Identificação</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="tipoPessoa">Tipo Pessoa *</Label>
            <Select
              value={formData.tipoPessoa}
              onValueChange={(value: TipoPessoa) => {
                updateFormData({ tipoPessoa: value, cpfCnpj: '' });
              }}
              disabled={readOnly}
            >
              <SelectTrigger id="tipoPessoa">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pessoa Física">Pessoa Física</SelectItem>
                <SelectItem value="Pessoa Jurídica">Pessoa Jurídica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="codigo" className="flex items-center gap-1">
              <Hash className="h-3 w-3" />
              Código do Cliente
              {customerCodeService.ehModoAutomatico() && <Badge variant="outline" className="ml-2 text-xs">Automático</Badge>}
            </Label>
            <Input
              id="codigo"
              value={formData.codigo || ''}
              onChange={(e) => updateFormData({ codigo: e.target.value })}
              placeholder={customerCodeService.ehModoAutomatico() ? 'Será gerado automaticamente' : 'Digite o código'}
              disabled={readOnly || customerCodeService.ehModoAutomatico()}
              className={customerCodeService.ehModoAutomatico() ? 'bg-muted' : ''}
            />
            {!customerCodeService.ehModoAutomatico() && !readOnly && (
              <p className="text-xs text-muted-foreground">
                Código único do cliente (obrigatório no modo manual)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpfCnpj">
              {formData.tipoPessoa === 'Pessoa Física' ? 'CPF' : 'CNPJ'} *
            </Label>
            <div className="flex gap-2">
              <Input
                id="cpfCnpj"
                value={formData.cpfCnpj || ''}
                onChange={(e) => handleCpfCnpjChange(e.target.value)}
                placeholder={formData.tipoPessoa === 'Pessoa Física' ? '000.000.000-00' : '00.000.000/0000-00'}
                maxLength={formData.tipoPessoa === 'Pessoa Física' ? 14 : 18}
                disabled={readOnly}
              />
              {formData.tipoPessoa === 'Pessoa Jurídica' && !readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleBuscarCNPJ}
                  disabled={buscandoCNPJ}
                >
                  <Search className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="situacao">Situação *</Label>
            <Select
              value={formData.situacao}
              onValueChange={(value: SituacaoCliente) => updateFormData({ situacao: value })}
              disabled={readOnly}
            >
              <SelectTrigger id="situacao">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Inativo">Inativo</SelectItem>
                <SelectItem value="Excluído">Excluído</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="segmentoMercado">Segmento *</Label>
            <Combobox
              options={segmentosOptions}
              value={formData.segmentoMercado}
              onValueChange={(value) => updateFormData({ segmentoMercado: value })}
              placeholder="Selecione o segmento"
              searchPlaceholder="Pesquisar segmento..."
              emptyText="Nenhum segmento encontrado."
              disabled={readOnly}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="razaoSocial">
              {formData.tipoPessoa === 'Pessoa Física' ? 'Nome Completo' : 'Razão Social'} *
            </Label>
            <Input
              id="razaoSocial"
              value={formData.razaoSocial || ''}
              onChange={(e) => updateFormData({ razaoSocial: e.target.value })}
              disabled={readOnly}
            />
          </div>

          {formData.tipoPessoa === 'Pessoa Jurídica' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
                <Input
                  id="nomeFantasia"
                  value={formData.nomeFantasia || ''}
                  onChange={(e) => updateFormData({ nomeFantasia: e.target.value })}
                  disabled={readOnly}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inscricaoEstadual">Inscrição Estadual</Label>
                <Input
                  id="inscricaoEstadual"
                  value={formData.inscricaoEstadual || ''}
                  onChange={(e) => updateFormData({ inscricaoEstadual: e.target.value.replace(/\D/g, '') })}
                  disabled={readOnly}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="emailNFe">E-mail NFe</Label>
            <Input
              id="emailNFe"
              type="email"
              value={formData.emailNFe || ''}
              onChange={(e) => updateFormData({ emailNFe: e.target.value })}
              placeholder="nfe@exemplo.com.br"
              disabled={readOnly}
            />
            <p className="text-xs text-muted-foreground">
              E-mail específico para envio de notas fiscais eletrônicas
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="grupoRede">Grupo / Rede</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Combobox
                  options={gruposOptions}
                  value={formData.grupoRede}
                  onValueChange={(value) => updateFormData({ grupoRede: value })}
                  placeholder="Selecione o grupo"
                  searchPlaceholder="Pesquisar grupo..."
                  emptyText="Nenhum grupo encontrado."
                  disabled={readOnly}
                />
              </div>
              {!readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => toast.info('Funcionalidade de inclusão rápida em desenvolvimento')}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Seção Endereço */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Endereço</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="cep">CEP *</Label>
            <div className="flex gap-2">
              <Input
                id="cep"
                value={formData.cep || ''}
                onChange={(e) => updateFormData({ cep: formatCEP(e.target.value) })}
                placeholder="00000-000"
                maxLength={9}
                disabled={readOnly}
              />
              {!readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleBuscarCEP}
                  disabled={buscandoCEP}
                >
                  <Search className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2 md:col-span-2 lg:col-span-2">
            <Label htmlFor="logradouro">Logradouro *</Label>
            <Input
              id="logradouro"
              value={formData.logradouro || ''}
              onChange={(e) => updateFormData({ logradouro: e.target.value })}
              disabled={readOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="numero">Número *</Label>
            <Input
              id="numero"
              value={formData.numero || ''}
              onChange={(e) => updateFormData({ numero: e.target.value })}
              disabled={readOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="complemento">Complemento</Label>
            <Input
              id="complemento"
              value={formData.complemento || ''}
              onChange={(e) => updateFormData({ complemento: e.target.value })}
              disabled={readOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bairro">Bairro *</Label>
            <Input
              id="bairro"
              value={formData.bairro || ''}
              onChange={(e) => updateFormData({ bairro: e.target.value })}
              disabled={readOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="uf">UF *</Label>
            <Combobox
              options={ufsOptions}
              value={formData.uf}
              onValueChange={(value) => {
                updateFormData({ uf: value, municipio: '' });
              }}
              placeholder="Selecione o estado"
              searchPlaceholder="Pesquisar estado..."
              emptyText="Nenhum estado encontrado."
              disabled={readOnly}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="municipio">Município *</Label>
            <Combobox
              options={municipiosOptions}
              value={formData.municipio}
              onValueChange={(value) => updateFormData({ municipio: value })}
              placeholder={formData.uf ? "Selecione o município" : "Selecione o estado primeiro"}
              searchPlaceholder="Pesquisar município..."
              emptyText="Nenhum município encontrado."
              disabled={readOnly || !formData.uf}
            />
          </div>

          <div className="space-y-2 md:col-span-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enderecoEntregaDiferente"
                checked={formData.enderecoEntregaDiferente}
                onCheckedChange={(checked) => {
                  const updates: Partial<Cliente> = {
                    enderecoEntregaDiferente: checked as boolean,
                  };
                  // Inicializar endereço de entrega vazio se marcado
                  if (checked && !formData.enderecoEntrega) {
                    updates.enderecoEntrega = {
                      cep: '',
                      logradouro: '',
                      numero: '',
                      bairro: '',
                      uf: '',
                      municipio: '',
                    };
                  }
                  updateFormData(updates);
                }}
                disabled={readOnly}
              />
              <Label
                htmlFor="enderecoEntregaDiferente"
                className="font-normal cursor-pointer"
              >
                Endereço de Entrega diferente do endereço principal
              </Label>
            </div>
          </div>

          {formData.enderecoEntregaDiferente && (
            <>
              <div className="md:col-span-3">
                <Separator className="my-2" />
                <h4 className="text-sm font-medium mb-4">Endereço de Entrega</h4>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cepEntrega">CEP *</Label>
                <div className="flex gap-2">
                  <Input
                    id="cepEntrega"
                    value={formData.enderecoEntrega?.cep || ''}
                    onChange={(e) =>
                      updateFormData({
                        enderecoEntrega: {
                          ...formData.enderecoEntrega!,
                          cep: formatCEP(e.target.value),
                        },
                      })
                    }
                    placeholder="00000-000"
                    maxLength={9}
                    disabled={readOnly}
                  />
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleBuscarCEPEntrega}
                      disabled={buscandoCEPEntrega}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2 md:col-span-2 lg:col-span-2">
                <Label htmlFor="logradouroEntrega">Logradouro *</Label>
                <Input
                  id="logradouroEntrega"
                  value={formData.enderecoEntrega?.logradouro || ''}
                  onChange={(e) =>
                    updateFormData({
                      enderecoEntrega: {
                        ...formData.enderecoEntrega!,
                        logradouro: e.target.value,
                      },
                    })
                  }
                  disabled={readOnly}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numeroEntrega">Número *</Label>
                <Input
                  id="numeroEntrega"
                  value={formData.enderecoEntrega?.numero || ''}
                  onChange={(e) =>
                    updateFormData({
                      enderecoEntrega: {
                        ...formData.enderecoEntrega!,
                        numero: e.target.value,
                      },
                    })
                  }
                  disabled={readOnly}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="complementoEntrega">Complemento</Label>
                <Input
                  id="complementoEntrega"
                  value={formData.enderecoEntrega?.complemento || ''}
                  onChange={(e) =>
                    updateFormData({
                      enderecoEntrega: {
                        ...formData.enderecoEntrega!,
                        complemento: e.target.value,
                      },
                    })
                  }
                  disabled={readOnly}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bairroEntrega">Bairro *</Label>
                <Input
                  id="bairroEntrega"
                  value={formData.enderecoEntrega?.bairro || ''}
                  onChange={(e) =>
                    updateFormData({
                      enderecoEntrega: {
                        ...formData.enderecoEntrega!,
                        bairro: e.target.value,
                      },
                    })
                  }
                  disabled={readOnly}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ufEntrega">UF *</Label>
                <Combobox
                  options={ufsOptions}
                  value={formData.enderecoEntrega?.uf || ''}
                  onValueChange={(value) => {
                    updateFormData({
                      enderecoEntrega: {
                        ...formData.enderecoEntrega!,
                        uf: value,
                        municipio: '',
                      },
                    });
                  }}
                  placeholder="Selecione o estado"
                  searchPlaceholder="Pesquisar estado..."
                  emptyText="Nenhum estado encontrado."
                  disabled={readOnly}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="municipioEntrega">Município *</Label>
                <Combobox
                  options={municipiosEntregaOptions}
                  value={formData.enderecoEntrega?.municipio || ''}
                  onValueChange={(value) =>
                    updateFormData({
                      enderecoEntrega: {
                        ...formData.enderecoEntrega!,
                        municipio: value,
                      },
                    })
                  }
                  placeholder={formData.enderecoEntrega?.uf ? "Selecione o município" : "Selecione o estado primeiro"}
                  searchPlaceholder="Pesquisar município..."
                  emptyText="Nenhum município encontrado."
                  disabled={readOnly || !formData.enderecoEntrega?.uf}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <Separator />

      {/* Seção Dados Bancários */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Dados Bancários</h3>
          {!readOnly && (
            <Button onClick={handleAbrirDialogBancario} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Conta
            </Button>
          )}
        </div>

        {formData.dadosBancarios && formData.dadosBancarios.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Banco</TableHead>
                  <TableHead>Agência</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Titular</TableHead>
                  <TableHead>Chave PIX</TableHead>
                  <TableHead>Status</TableHead>
                  {!readOnly && <TableHead className="w-[100px]">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {formData.dadosBancarios.map((conta) => (
                  <TableRow key={conta.id}>
                    <TableCell className="font-medium">{conta.banco}</TableCell>
                    <TableCell>
                      {conta.agencia}{conta.digitoAgencia ? `-${conta.digitoAgencia}` : ''}
                    </TableCell>
                    <TableCell>
                      {conta.numeroConta}-{conta.digitoConta}
                    </TableCell>
                    <TableCell>{getTipoContaLabel(conta.tipoConta)}</TableCell>
                    <TableCell>{conta.nomeTitular}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">
                          {getTipoChavePixLabel(conta.tipoChavePix)}
                        </div>
                        <div className="text-sm">{conta.chavePix}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {conta.principal && (
                        <Badge variant="default">Principal</Badge>
                      )}
                    </TableCell>
                    {!readOnly && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditarContaBancaria(conta)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleExcluirContaBancaria(conta.id)}
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
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            <p>Nenhuma conta bancária cadastrada</p>
          </div>
        )}

        {/* Dialog de Dados Bancários */}
        <Dialog open={dialogBancarioOpen} onOpenChange={setDialogBancarioOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>
                {contaBancariaEditando ? 'Editar Conta Bancária' : 'Adicionar Conta Bancária'}
              </DialogTitle>
              <DialogDescription>
                Preencha as informações da conta bancária do cliente
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="banco">Banco *</Label>
                  <Combobox
                    options={bancosOptions}
                    value={formBancario.banco || ''}
                    onValueChange={(value) => {
                      // Find the bank by code to get the full label
                      const selectedBank = mockBanks.find((b, index) => `${b.code || b.codigo || index}` === value);
                      if (selectedBank) {
                        const bankLabel = `${selectedBank.code || selectedBank.codigo} - ${selectedBank.name || selectedBank.nome}`;
                        setFormBancario({ ...formBancario, banco: bankLabel });
                      } else {
                        setFormBancario({ ...formBancario, banco: value });
                      }
                    }}
                    placeholder="Selecione o banco"
                    searchPlaceholder="Pesquisar banco..."
                    emptyText="Nenhum banco encontrado."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agencia">Agência *</Label>
                  <Input
                    id="agencia"
                    value={formBancario.agencia || ''}
                    onChange={(e) => setFormBancario({ ...formBancario, agencia: e.target.value.replace(/\D/g, '') })}
                    placeholder="0000"
                    maxLength={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="digitoAgencia">Dígito Agência</Label>
                  <Input
                    id="digitoAgencia"
                    value={formBancario.digitoAgencia || ''}
                    onChange={(e) => setFormBancario({ ...formBancario, digitoAgencia: e.target.value.replace(/\D/g, '') })}
                    placeholder="0"
                    maxLength={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipoConta">Tipo de Conta *</Label>
                  <Select
                    value={formBancario.tipoConta}
                    onValueChange={(value: TipoContaCliente) => setFormBancario({ ...formBancario, tipoConta: value })}
                  >
                    <SelectTrigger id="tipoConta">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corrente">Corrente</SelectItem>
                      <SelectItem value="poupanca">Poupança</SelectItem>
                      <SelectItem value="salario">Salário</SelectItem>
                      <SelectItem value="pagamento">Pagamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numeroConta">Número da Conta *</Label>
                  <Input
                    id="numeroConta"
                    value={formBancario.numeroConta || ''}
                    onChange={(e) => setFormBancario({ ...formBancario, numeroConta: e.target.value.replace(/\D/g, '') })}
                    placeholder="00000"
                    maxLength={15}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="digitoConta">Dígito Conta *</Label>
                  <Input
                    id="digitoConta"
                    value={formBancario.digitoConta || ''}
                    onChange={(e) => setFormBancario({ ...formBancario, digitoConta: e.target.value.replace(/\D/g, '') })}
                    placeholder="0"
                    maxLength={2}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="nomeTitular">Nome do Titular *</Label>
                  <Input
                    id="nomeTitular"
                    value={formBancario.nomeTitular || ''}
                    onChange={(e) => setFormBancario({ ...formBancario, nomeTitular: e.target.value })}
                    placeholder="Nome completo ou Razão Social"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="cpfCnpjTitular">CPF/CNPJ do Titular *</Label>
                  <Input
                    id="cpfCnpjTitular"
                    value={formBancario.cpfCnpjTitular || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      const formatted = value.length <= 14 ? formatCPF(value) : formatCNPJ(value);
                      setFormBancario({ ...formBancario, cpfCnpjTitular: formatted });
                    }}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipoChavePix">Tipo de Chave PIX</Label>
                  <Select
                    value={formBancario.tipoChavePix}
                    onValueChange={(value: TipoChavePixCliente) => setFormBancario({ ...formBancario, tipoChavePix: value })}
                  >
                    <SelectTrigger id="tipoChavePix">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpf_cnpj">CPF/CNPJ</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="telefone">Telefone</SelectItem>
                      <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chavePix">Chave PIX</Label>
                  <Input
                    id="chavePix"
                    value={formBancario.chavePix || ''}
                    onChange={(e) => setFormBancario({ ...formBancario, chavePix: e.target.value })}
                    placeholder="Digite a chave PIX"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="principal"
                      checked={formBancario.principal}
                      onCheckedChange={(checked) => setFormBancario({ ...formBancario, principal: checked as boolean })}
                    />
                    <Label htmlFor="principal" className="cursor-pointer">
                      Definir como conta principal
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A conta principal será usada por padrão para transações com este cliente
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogBancarioOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSalvarContaBancaria}>
                {contaBancariaEditando ? 'Atualizar' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      {/* Seção Observações Internas */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Observações Internas</h3>
        <div className="space-y-2">
          <Label htmlFor="observacoesInternas">Observações</Label>
          <Textarea
            id="observacoesInternas"
            value={formData.observacoesInternas || ''}
            onChange={(e) => updateFormData({ observacoesInternas: e.target.value })}
            placeholder="Digite observações internas sobre o cliente..."
            rows={4}
            disabled={readOnly}
          />
          <p className="text-sm text-muted-foreground">
            ℹ️ As observações deste campo não são impressas na nota fiscal. Use este espaço para anotações internas.
          </p>
        </div>
      </div>
    </div>
  );
}