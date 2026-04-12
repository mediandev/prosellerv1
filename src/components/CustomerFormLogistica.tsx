import { Cliente, HorarioRecebimento, RequisitosLogisticos } from '../types/customer';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Combobox } from './ui/combobox';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Plus, Trash2, X } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import { maskTelefoneFixo, maskTelefoneCelular, unmaskNumber } from '../lib/masks';
import { api } from '../services/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';

interface CustomerFormLogisticaProps {
  formData: Partial<Cliente>;
  updateFormData: (updates: Partial<Cliente>) => void;
  readOnly: boolean;
}

const DIAS_SEMANA = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
];

export function CustomerFormLogistica({
  formData,
  updateFormData,
  readOnly,
}: CustomerFormLogisticaProps) {
  const [novoTipoVeiculo, setNovoTipoVeiculo] = useState('');
  const [dialogAberto, setDialogAberto] = useState(false);
  const [tiposVeiculos, setTiposVeiculos] = useState<Array<{ id: string; nome: string; descricao?: string }>>([]);

  // Inicializar requisitosLogisticos se não existir
  const requisitos: RequisitosLogisticos = formData.requisitosLogisticos || {
    entregaAgendada: false,
    horarioRecebimentoHabilitado: false,
    horariosRecebimento: [],
    tipoVeiculoEspecifico: false,
    umSkuPorCaixa: false,
    observacoesObrigatorias: [],
  };

  const updateRequisitos = (updates: Partial<RequisitosLogisticos>) => {
    updateFormData({
      requisitosLogisticos: {
        ...requisitos,
        ...updates,
      },
    });
  };

  // Opções para dropdown de tipos de veículos
  const tiposVeiculosOptions = useMemo(
    () => tiposVeiculos.map((tv) => ({ value: tv.nome, label: tv.nome })),
    [tiposVeiculos]
  );

  // Função para aplicar máscara de telefone automaticamente (fixo ou celular)
  const aplicarMascaraTelefone = (valor: string): string => {
    const numeroLimpo = unmaskNumber(valor);
    
    // Detecta automaticamente se é fixo (10 dígitos) ou celular (11 dígitos)
    if (numeroLimpo.length <= 10) {
      return maskTelefoneFixo(valor);
    } else {
      return maskTelefoneCelular(valor);
    }
  };

  // Adicionar novo tipo de veículo
  const handleAdicionarTipoVeiculo = async () => {
    if (!novoTipoVeiculo.trim()) {
      toast.error('Digite o nome do tipo de veículo');
      return;
    }

    try {
      // Salvar no backend
      const novoTipo = await api.create('tipos-veiculo', {
        nome: novoTipoVeiculo.trim(),
        descricao: 'Adicionado pelo usuário',
      });

      // Atualizar lista local
      setTiposVeiculos([...tiposVeiculos, novoTipo]);

      // Selecionar o novo tipo
      updateRequisitos({ tipoVeiculo: novoTipo.nome });
      
      toast.success('Tipo de veículo adicionado com sucesso');
      setNovoTipoVeiculo('');
      setDialogAberto(false);
    } catch (error: any) {
      console.error('[TIPOS VEÍCULO] Erro ao criar:', error);
      toast.error(error.message || 'Erro ao adicionar tipo de veículo');
    }
  };

  // Adicionar horário de recebimento
  const adicionarHorario = () => {
    const novoHorario: HorarioRecebimento = {
      id: `horario-${Date.now()}`,
      diasSemana: [],
      horarioInicial1: '',
      horarioFinal1: '',
      temIntervalo: false,
    };

    updateRequisitos({
      horariosRecebimento: [...requisitos.horariosRecebimento, novoHorario],
    });
  };

  // Remover horário de recebimento
  const removerHorario = (id: string) => {
    updateRequisitos({
      horariosRecebimento: requisitos.horariosRecebimento.filter((h) => h.id !== id),
    });
  };

  // Atualizar horário de recebimento
  const atualizarHorario = (id: string, updates: Partial<HorarioRecebimento>) => {
    updateRequisitos({
      horariosRecebimento: requisitos.horariosRecebimento.map((h) =>
        h.id === id ? { ...h, ...updates } : h
      ),
    });
  };

  // Toggle dia da semana no horário
  const toggleDiaSemana = (horarioId: string, dia: string) => {
    const horario = requisitos.horariosRecebimento.find((h) => h.id === horarioId);
    if (!horario) return;

    const novosDias = horario.diasSemana.includes(dia)
      ? horario.diasSemana.filter((d) => d !== dia)
      : [...horario.diasSemana, dia];

    atualizarHorario(horarioId, { diasSemana: novosDias });
  };

  // Adicionar email nas instruções
  const adicionarEmail = () => {
    const emails = requisitos.instrucoesAgendamento?.emails || [];
    updateRequisitos({
      instrucoesAgendamento: {
        ...requisitos.instrucoesAgendamento,
        emails: [...emails, ''],
        telefones: requisitos.instrucoesAgendamento?.telefones || [],
        whatsapps: requisitos.instrucoesAgendamento?.whatsapps || [],
      },
    });
  };

  // Remover email
  const removerEmail = (index: number) => {
    const emails = requisitos.instrucoesAgendamento?.emails || [];
    updateRequisitos({
      instrucoesAgendamento: {
        ...requisitos.instrucoesAgendamento!,
        emails: emails.filter((_, i) => i !== index),
      },
    });
  };

  // Atualizar email
  const atualizarEmail = (index: number, valor: string) => {
    const emails = requisitos.instrucoesAgendamento?.emails || [];
    const novosEmails = [...emails];
    novosEmails[index] = valor;
    updateRequisitos({
      instrucoesAgendamento: {
        ...requisitos.instrucoesAgendamento!,
        emails: novosEmails,
      },
    });
  };

  // Adicionar telefone
  const adicionarTelefone = () => {
    const telefones = requisitos.instrucoesAgendamento?.telefones || [];
    updateRequisitos({
      instrucoesAgendamento: {
        ...requisitos.instrucoesAgendamento,
        emails: requisitos.instrucoesAgendamento?.emails || [],
        telefones: [...telefones, ''],
        whatsapps: requisitos.instrucoesAgendamento?.whatsapps || [],
      },
    });
  };

  // Remover telefone
  const removerTelefone = (index: number) => {
    const telefones = requisitos.instrucoesAgendamento?.telefones || [];
    updateRequisitos({
      instrucoesAgendamento: {
        ...requisitos.instrucoesAgendamento!,
        telefones: telefones.filter((_, i) => i !== index),
      },
    });
  };

  // Atualizar telefone
  const atualizarTelefone = (index: number, valor: string) => {
    const telefones = requisitos.instrucoesAgendamento?.telefones || [];
    const novosTelefones = [...telefones];
    novosTelefones[index] = aplicarMascaraTelefone(valor);
    updateRequisitos({
      instrucoesAgendamento: {
        ...requisitos.instrucoesAgendamento!,
        telefones: novosTelefones,
      },
    });
  };

  // Adicionar WhatsApp
  const adicionarWhatsapp = () => {
    const whatsapps = requisitos.instrucoesAgendamento?.whatsapps || [];
    updateRequisitos({
      instrucoesAgendamento: {
        ...requisitos.instrucoesAgendamento,
        emails: requisitos.instrucoesAgendamento?.emails || [],
        telefones: requisitos.instrucoesAgendamento?.telefones || [],
        whatsapps: [...whatsapps, ''],
      },
    });
  };

  // Remover WhatsApp
  const removerWhatsapp = (index: number) => {
    const whatsapps = requisitos.instrucoesAgendamento?.whatsapps || [];
    updateRequisitos({
      instrucoesAgendamento: {
        ...requisitos.instrucoesAgendamento!,
        whatsapps: whatsapps.filter((_, i) => i !== index),
      },
    });
  };

  // Atualizar WhatsApp
  const atualizarWhatsapp = (index: number, valor: string) => {
    const whatsapps = requisitos.instrucoesAgendamento?.whatsapps || [];
    const novosWhatsapps = [...whatsapps];
    novosWhatsapps[index] = aplicarMascaraTelefone(valor);
    updateRequisitos({
      instrucoesAgendamento: {
        ...requisitos.instrucoesAgendamento!,
        whatsapps: novosWhatsapps,
      },
    });
  };

  // Adicionar observação obrigatória
  const adicionarObservacao = () => {
    updateRequisitos({
      observacoesObrigatorias: [...requisitos.observacoesObrigatorias, ''],
    });
  };

  // Remover observação
  const removerObservacao = (index: number) => {
    updateRequisitos({
      observacoesObrigatorias: requisitos.observacoesObrigatorias.filter(
        (_, i) => i !== index
      ),
    });
  };

  // Atualizar observação
  const atualizarObservacao = (index: number, valor: string) => {
    const novasObservacoes = [...requisitos.observacoesObrigatorias];
    novasObservacoes[index] = valor;
    updateRequisitos({
      observacoesObrigatorias: novasObservacoes,
    });
  };

  // Gerar pré-visualização das observações da nota fiscal
  const gerarPrevisualizacaoNF = () => {
    const partes: string[] = [];

    // OC do cliente (exemplo - seria preenchido na venda)
    partes.push('OC: [Número da OC]');

    // Verificar se há requisitos logísticos preenchidos
    const temRequisitos =
      requisitos.entregaAgendada ||
      requisitos.horarioRecebimentoHabilitado ||
      requisitos.tipoVeiculoEspecifico ||
      requisitos.umSkuPorCaixa ||
      requisitos.observacoesObrigatorias.length > 0;

    if (temRequisitos) {
      const instrucoesLogistica: string[] = [];

      // Horário de Recebimento
      if (
        requisitos.horarioRecebimentoHabilitado &&
        requisitos.horariosRecebimento.length > 0
      ) {
        requisitos.horariosRecebimento.forEach((horario) => {
          if (horario.diasSemana.length > 0 && horario.horarioInicial1 && horario.horarioFinal1) {
            const dias = horario.diasSemana.join(', ');
            let horarioTexto = `${dias}: ${horario.horarioInicial1} às ${horario.horarioFinal1}`;
            
            if (horario.temIntervalo && horario.horarioInicial2 && horario.horarioFinal2) {
              horarioTexto += ` e ${horario.horarioInicial2} às ${horario.horarioFinal2}`;
            }
            
            instrucoesLogistica.push(`Horário de Recebimento: ${horarioTexto}`);
          }
        });
      }

      // Entrega Agendada
      if (requisitos.entregaAgendada && requisitos.instrucoesAgendamento) {
        const inst = requisitos.instrucoesAgendamento;
        const contatos: string[] = [];

        if (inst.emails && inst.emails.filter((e) => e).length > 0) {
          contatos.push(`E-mail(s): ${inst.emails.filter((e) => e).join(', ')}`);
        }
        if (inst.telefones && inst.telefones.filter((t) => t).length > 0) {
          contatos.push(`Tel: ${inst.telefones.filter((t) => t).join(', ')}`);
        }
        if (inst.whatsapps && inst.whatsapps.filter((w) => w).length > 0) {
          contatos.push(`WhatsApp: ${inst.whatsapps.filter((w) => w).join(', ')}`);
        }

        if (contatos.length > 0) {
          instrucoesLogistica.push(`Entrega Agendada - ${contatos.join(' | ')}`);
        }
      }

      // Tipo de Veículo Específico
      if (requisitos.tipoVeiculoEspecifico && requisitos.tipoVeiculo) {
        instrucoesLogistica.push(`Tipo de Veículo: ${requisitos.tipoVeiculo}`);
      }

      // 1 SKU por Caixa
      if (requisitos.umSkuPorCaixa) {
        instrucoesLogistica.push('Atenção: 1 SKU/EAN por caixa.');
      }

      // Observações obrigatórias
      requisitos.observacoesObrigatorias
        .filter((obs) => obs.trim())
        .forEach((obs) => {
          instrucoesLogistica.push(obs);
        });

      if (instrucoesLogistica.length > 0) {
        partes.push('***INSTRUÇÕES LOGÍSTICA:***');
        partes.push(instrucoesLogistica.join(' // '));
      }
    }

    return partes.join('\n\n');
  };

  // Carregar tipos de veículos do backend
  useEffect(() => {
    const fetchTiposVeiculos = async () => {
      try {
        const tipos = await api.get('tipos-veiculo');
        console.log('[TIPOS VEÍCULO] Tipos carregados:', tipos);
        setTiposVeiculos(tipos || []);
      } catch (error) {
        console.error('[TIPOS VEÍCULO] Erro ao carregar:', error);
        // Não mostrar erro, apenas deixar vazio
      }
    };

    fetchTiposVeiculos();
  }, []);

  return (
    <div className="space-y-6">
      {/* Seção: Requisitos Logísticos */}
      <Card>
        <CardHeader>
          <CardTitle>Requisitos Logísticos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Entrega Agendada */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="entregaAgendada"
                checked={requisitos.entregaAgendada}
                onCheckedChange={(checked) =>
                  updateRequisitos({ entregaAgendada: checked as boolean })
                }
                disabled={readOnly}
              />
              <Label htmlFor="entregaAgendada" className="cursor-pointer">
                Entrega Agendada
              </Label>
            </div>

            {/* Instruções de Agendamento */}
            {requisitos.entregaAgendada && (
              <div className="ml-6 space-y-4 p-4 border rounded-lg bg-muted/20">
                <h4 className="font-medium">Instruções de Agendamento</h4>

                {/* E-mails */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>E-mails para Agendamento</Label>
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={adicionarEmail}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Adicionar E-mail
                      </Button>
                    )}
                  </div>
                  {requisitos.instrucoesAgendamento?.emails?.map((email, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="email@exemplo.com"
                        value={email}
                        onChange={(e) => atualizarEmail(index, e.target.value)}
                        disabled={readOnly}
                      />
                      {!readOnly && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removerEmail(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Telefones */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Telefones para Agendamento</Label>
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={adicionarTelefone}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Adicionar Telefone
                      </Button>
                    )}
                  </div>
                  {requisitos.instrucoesAgendamento?.telefones?.map((telefone, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        type="tel"
                        placeholder="(00) 0000-0000 ou (00) 00000-0000"
                        value={telefone}
                        onChange={(e) => atualizarTelefone(index, e.target.value)}
                        disabled={readOnly}
                      />
                      {!readOnly && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removerTelefone(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* WhatsApp */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>WhatsApp para Agendamento</Label>
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={adicionarWhatsapp}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Adicionar WhatsApp
                      </Button>
                    )}
                  </div>
                  {requisitos.instrucoesAgendamento?.whatsapps?.map((whatsapp, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        type="tel"
                        placeholder="(00) 00000-0000"
                        value={whatsapp}
                        onChange={(e) => atualizarWhatsapp(index, e.target.value)}
                        disabled={readOnly}
                      />
                      {!readOnly && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removerWhatsapp(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Horário de Recebimento */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="horarioRecebimento"
                checked={requisitos.horarioRecebimentoHabilitado}
                onCheckedChange={(checked) =>
                  updateRequisitos({ horarioRecebimentoHabilitado: checked as boolean })
                }
                disabled={readOnly}
              />
              <Label htmlFor="horarioRecebimento" className="cursor-pointer">
                Horário de Recebimento
              </Label>
            </div>

            {requisitos.horarioRecebimentoHabilitado && (
              <div className="ml-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Horários de Recebimento</Label>
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={adicionarHorario}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Adicionar Horário
                    </Button>
                  )}
                </div>

                {requisitos.horariosRecebimento.map((horario) => (
                  <div key={horario.id} className="p-4 border rounded-lg bg-muted/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Dias da Semana</Label>
                      {!readOnly && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removerHorario(horario.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remover
                        </Button>
                      )}
                    </div>

                    {/* Seleção de dias da semana */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {DIAS_SEMANA.map((dia) => (
                        <div key={dia} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${horario.id}-${dia}`}
                            checked={horario.diasSemana.includes(dia)}
                            onCheckedChange={() => toggleDiaSemana(horario.id, dia)}
                            disabled={readOnly}
                          />
                          <Label
                            htmlFor={`${horario.id}-${dia}`}
                            className="cursor-pointer text-sm"
                          >
                            {dia.substring(0, 3)}
                          </Label>
                        </div>
                      ))}
                    </div>

                    {/* Horário Principal */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Horário Inicial</Label>
                        <Input
                          type="time"
                          value={horario.horarioInicial1}
                          onChange={(e) =>
                            atualizarHorario(horario.id, { horarioInicial1: e.target.value })
                          }
                          disabled={readOnly}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Horário Final</Label>
                        <Input
                          type="time"
                          value={horario.horarioFinal1}
                          onChange={(e) =>
                            atualizarHorario(horario.id, { horarioFinal1: e.target.value })
                          }
                          disabled={readOnly}
                        />
                      </div>
                    </div>

                    {/* Checkbox para intervalo */}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${horario.id}-intervalo`}
                        checked={horario.temIntervalo}
                        onCheckedChange={(checked) =>
                          atualizarHorario(horario.id, { temIntervalo: checked as boolean })
                        }
                        disabled={readOnly}
                      />
                      <Label htmlFor={`${horario.id}-intervalo`} className="cursor-pointer">
                        Possui Intervalo (Ex: Almoço)
                      </Label>
                    </div>

                    {/* Horário após intervalo */}
                    {horario.temIntervalo && (
                      <div className="grid grid-cols-2 gap-4 ml-6">
                        <div className="space-y-2">
                          <Label>Horário Inicial (após intervalo)</Label>
                          <Input
                            type="time"
                            value={horario.horarioInicial2 || ''}
                            onChange={(e) =>
                              atualizarHorario(horario.id, { horarioInicial2: e.target.value })
                            }
                            disabled={readOnly}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Horário Final (após intervalo)</Label>
                          <Input
                            type="time"
                            value={horario.horarioFinal2 || ''}
                            onChange={(e) =>
                              atualizarHorario(horario.id, { horarioFinal2: e.target.value })
                            }
                            disabled={readOnly}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Tipo de Veículo Específico */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="tipoVeiculoEspecifico"
                checked={requisitos.tipoVeiculoEspecifico}
                onCheckedChange={(checked) =>
                  updateRequisitos({ tipoVeiculoEspecifico: checked as boolean })
                }
                disabled={readOnly}
              />
              <Label htmlFor="tipoVeiculoEspecifico" className="cursor-pointer">
                Tipo de Veículo Específico
              </Label>
            </div>

            {requisitos.tipoVeiculoEspecifico && (
              <div className="ml-6 space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Tipo de Veículo</Label>
                  {!readOnly && (
                    <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="sm">
                          <Plus className="h-3 w-3 mr-1" />
                          Adicionar Novo
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Adicionar Tipo de Veículo</DialogTitle>
                          <DialogDescription>
                            Adicione um novo tipo de veículo que não está na lista.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Nome do Tipo de Veículo</Label>
                            <Input
                              placeholder="Ex: Caminhão Refrigerado"
                              value={novoTipoVeiculo}
                              onChange={(e) => setNovoTipoVeiculo(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleAdicionarTipoVeiculo();
                                }
                              }}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setDialogAberto(false)}
                            >
                              Cancelar
                            </Button>
                            <Button type="button" onClick={handleAdicionarTipoVeiculo}>
                              Adicionar
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                <Combobox
                  options={tiposVeiculosOptions}
                  value={requisitos.tipoVeiculo || ''}
                  onValueChange={(value) => updateRequisitos({ tipoVeiculo: value })}
                  placeholder="Selecione o tipo de veículo"
                  searchPlaceholder="Pesquisar tipo..."
                  disabled={readOnly}
                />
              </div>
            )}
          </div>

          <Separator />

          {/* 1 SKU por Caixa */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="umSkuPorCaixa"
              checked={requisitos.umSkuPorCaixa}
              onCheckedChange={(checked) =>
                updateRequisitos({ umSkuPorCaixa: checked as boolean })
              }
              disabled={readOnly}
            />
            <Label htmlFor="umSkuPorCaixa" className="cursor-pointer">
              1 SKU por caixa
            </Label>
          </div>

          <Separator />

          {/* Observações Obrigatórias Para Nota Fiscal */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Observações Obrigatórias Para Nota Fiscal</Label>
              {!readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={adicionarObservacao}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar Observação
                </Button>
              )}
            </div>

            {requisitos.observacoesObrigatorias.map((observacao, index) => (
              <div key={index} className="flex gap-2">
                <Textarea
                  placeholder="Digite a observação..."
                  value={observacao}
                  onChange={(e) => atualizarObservacao(index, e.target.value)}
                  disabled={readOnly}
                  rows={2}
                />
                {!readOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removerObservacao(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Seção: Observações da Nota Fiscal (Pré-Visualização) */}
      <Card>
        <CardHeader>
          <CardTitle>Observações da Nota Fiscal (Pré-Visualização)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Estas informações serão incluídas na nota fiscal no campo "Dados Adicionais" ou
            "Informações Complementares"
          </p>
        </CardHeader>
        <CardContent>
          <Textarea
            value={gerarPrevisualizacaoNF()}
            readOnly
            className="min-h-[200px] font-mono text-sm bg-muted"
            placeholder="As observações aparecerão aqui conforme você preencher os requisitos logísticos acima..."
          />
        </CardContent>
      </Card>
    </div>
  );
}