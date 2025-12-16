# 📝 Guia de Edição de Comissões

## 🎯 Visão Geral

Este guia explica como implementar a **edição de lançamentos de comissões** com **transferência entre períodos** e **controle de saldo transportado**.

---

## 🔑 Conceitos-Chave

### 1. Lançamentos Editáveis
Todos os lançamentos (comissões, lançamentos manuais e pagamentos) agora possuem:
- Campo `periodo` editável
- Campos de auditoria de edição (`editadoPor`, `editadoEm`)
- Capacidade de transferência entre períodos

### 2. Saldo Transportado
Quando um período fecha com saldo devedor > 0:
- O saldo é transportado para o `saldoAnterior` do próximo período
- O valor líquido do próximo período já inclui esse saldo
- Permite controle contínuo de débitos/créditos

### 3. Recálculo Automático
Ao editar um lançamento:
- O período de origem é recalculado
- O período de destino é recalculado
- Os totalizadores são atualizados automaticamente

---

## 💻 Implementação Frontend

### 1. Tipos TypeScript Atualizados

```typescript
// /types/comissao.ts

// ✅ Todos os lançamentos agora têm período e auditoria
export interface ComissaoVenda {
  id: string;
  vendaId: string;
  vendedorId: string;
  periodo: string; // "2025-10" - EDITÁVEL
  // ... outros campos
  criadoEm: string;
  editadoPor?: string;
  editadoEm?: string;
}

export interface LancamentoManual {
  id: string;
  vendedorId: string;
  periodo: string; // "2025-10" - EDITÁVEL
  // ... outros campos
  criadoPor: string;
  criadoEm: string;
  editadoPor?: string;
  editadoEm?: string;
}

export interface PagamentoPeriodo {
  id: string;
  vendedorId: string;
  periodo: string; // "2025-10" - EDITÁVEL
  // ... outros campos
  realizadoPor: string;
  realizadoEm: string;
  editadoPor?: string;
  editadoEm?: string;
}

// ✅ Relatório otimizado - sem arrays embutidos
export interface RelatorioPeriodoComissoes {
  id: string;
  vendedorId: string;
  periodo: string;
  status: StatusPeriodo;
  saldoAnterior: number; // NOVO
  valorLiquido: number;
  totalPago: number;
  saldoDevedor: number;
  // ... sem arrays de lançamentos
}

// ✅ Interface para visualização completa (calculada)
export interface RelatorioComissoesCompleto {
  relatorio: RelatorioPeriodoComissoes;
  vendedorNome: string;
  vendas: ComissaoVenda[];
  lancamentosCredito: LancamentoManual[];
  lancamentosDebito: LancamentoManual[];
  pagamentos: PagamentoPeriodo[];
  totalVendas: number;
  quantidadeVendas: number;
  totalComissoes: number;
  totalCreditos: number;
  totalDebitos: number;
}
```

### 2. Buscar Relatório Completo

```typescript
// Buscar relatório com todos os lançamentos
async function buscarRelatorioCompleto(
  relatorioId: string
): Promise<RelatorioComissoesCompleto> {
  // 1. Buscar relatório
  const relatorio = await db.relatorios_comissoes.findById(relatorioId);
  
  // 2. Buscar vendedor
  const vendedor = await db.vendedores.findById(relatorio.vendedorId);
  
  // 3. Buscar lançamentos do período
  const vendas = await db.comissoes_vendas.find({
    vendedorId: relatorio.vendedorId,
    periodo: relatorio.periodo
  });
  
  const lancamentos = await db.lancamentos_manuais.find({
    vendedorId: relatorio.vendedorId,
    periodo: relatorio.periodo
  });
  
  const pagamentos = await db.pagamentos_comissoes.find({
    vendedorId: relatorio.vendedorId,
    periodo: relatorio.periodo
  });
  
  // 4. Separar lançamentos por tipo
  const lancamentosCredito = lancamentos.filter(l => l.tipo === 'credito');
  const lancamentosDebito = lancamentos.filter(l => l.tipo === 'debito');
  
  // 5. Calcular totalizadores
  const totalVendas = vendas.reduce((sum, v) => sum + v.valorTotalVenda, 0);
  const quantidadeVendas = vendas.length;
  const totalComissoes = vendas.reduce((sum, v) => sum + v.valorComissao, 0);
  const totalCreditos = lancamentosCredito.reduce((sum, l) => sum + l.valor, 0);
  const totalDebitos = lancamentosDebito.reduce((sum, l) => sum + l.valor, 0);
  
  return {
    relatorio,
    vendedorNome: vendedor.nome,
    vendedorEmail: vendedor.email,
    vendedorIniciais: vendedor.iniciais,
    vendas,
    lancamentosCredito,
    lancamentosDebito,
    pagamentos,
    totalVendas,
    quantidadeVendas,
    totalComissoes,
    totalCreditos,
    totalDebitos
  };
}
```

### 3. Componente de Edição de Lançamento

```typescript
// /components/EditarLancamentoDialog.tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Select } from './ui/select';
import { Input } from './ui/input';
import { ComissaoVenda, LancamentoManual, PagamentoPeriodo } from '../types/comissao';

interface EditarLancamentoDialogProps {
  lancamento: ComissaoVenda | LancamentoManual | PagamentoPeriodo;
  tipoLancamento: 'venda' | 'lancamentoManual' | 'pagamento';
  periodosDisponiveis: string[]; // ["2025-09", "2025-10", "2025-11"]
  open: boolean;
  onClose: () => void;
  onSave: (lancamentoEditado: any) => Promise<void>;
}

export function EditarLancamentoDialog({
  lancamento,
  tipoLancamento,
  periodosDisponiveis,
  open,
  onClose,
  onSave
}: EditarLancamentoDialogProps) {
  const [periodoSelecionado, setPeriodoSelecionado] = useState(lancamento.periodo);
  const [observacoes, setObservacoes] = useState(
    'observacoes' in lancamento ? lancamento.observacoes || '' : ''
  );
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const lancamentoEditado = {
        ...lancamento,
        periodo: periodoSelecionado,
        observacoes,
        editadoPor: 'usuario@empresa.com', // Pegar do contexto de auth
        editadoEm: new Date().toISOString()
      };
      
      await onSave(lancamentoEditado);
      onClose();
    } catch (error) {
      console.error('Erro ao editar lançamento:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Lançamento</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Informações do lançamento */}
          <div>
            <label className="text-sm">Tipo</label>
            <p className="text-sm text-muted-foreground">
              {tipoLancamento === 'venda' && 'Comissão de Venda'}
              {tipoLancamento === 'lancamentoManual' && 'Lançamento Manual'}
              {tipoLancamento === 'pagamento' && 'Pagamento'}
            </p>
          </div>
          
          {'valorComissao' in lancamento && (
            <div>
              <label className="text-sm">Valor</label>
              <p className="text-sm text-muted-foreground">
                R$ {lancamento.valorComissao.toFixed(2)}
              </p>
            </div>
          )}
          
          {'valor' in lancamento && (
            <div>
              <label className="text-sm">Valor</label>
              <p className="text-sm text-muted-foreground">
                R$ {lancamento.valor.toFixed(2)}
              </p>
            </div>
          )}
          
          {/* Período (editável) */}
          <div>
            <label className="text-sm">Período</label>
            <Select
              value={periodoSelecionado}
              onValueChange={setPeriodoSelecionado}
            >
              {periodosDisponiveis.map(p => (
                <option key={p} value={p}>
                  {formatarPeriodo(p)}
                </option>
              ))}
            </Select>
            {periodoSelecionado !== lancamento.periodo && (
              <p className="text-sm text-amber-600 mt-1">
                ⚠️ O lançamento será transferido de {formatarPeriodo(lancamento.periodo)} 
                para {formatarPeriodo(periodoSelecionado)}
              </p>
            )}
          </div>
          
          {/* Observações */}
          {'observacoes' in lancamento && (
            <div>
              <label className="text-sm">Observações</label>
              <Input
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Adicione observações..."
              />
            </div>
          )}
          
          {/* Auditoria */}
          {lancamento.editadoPor && (
            <div className="bg-muted p-2 rounded text-xs">
              <p>Última edição: {lancamento.editadoPor}</p>
              <p>Em: {new Date(lancamento.editadoEm!).toLocaleString()}</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatarPeriodo(periodo: string): string {
  const [ano, mes] = periodo.split('-');
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
                 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${meses[parseInt(mes) - 1]}/${ano}`;
}
```

### 4. Exibir Saldo Anterior no Relatório

```typescript
// /components/RelatorioComissoesCard.tsx
interface RelatorioComissoesCardProps {
  relatorio: RelatorioComissoesCompleto;
}

export function RelatorioComissoesCard({ relatorio }: RelatorioComissoesCardProps) {
  return (
    <div className="space-y-4">
      {/* Saldo Anterior (se houver) */}
      {relatorio.relatorio.saldoAnterior > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-700">Saldo Devedor do Período Anterior</p>
              <p className="text-xs text-amber-600">
                Transportado de {formatarPeriodoAnterior(relatorio.relatorio.periodo)}
              </p>
            </div>
            <p className="text-lg font-semibold text-amber-700">
              R$ {relatorio.relatorio.saldoAnterior.toFixed(2)}
            </p>
          </div>
        </div>
      )}
      
      {/* Comissões de Vendas */}
      <div>
        <h3 className="font-semibold mb-2">Comissões de Vendas</h3>
        <div className="space-y-2">
          {relatorio.vendas.map(venda => (
            <div key={venda.id} className="flex justify-between items-center border-b pb-2">
              <div>
                <p className="text-sm">{venda.clienteNome}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(venda.dataVenda).toLocaleDateString()} - OC: {venda.ocCliente}
                </p>
                {venda.editadoPor && (
                  <p className="text-xs text-amber-600">
                    ✏️ Editado por {venda.editadoPor}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="font-semibold">R$ {venda.valorComissao.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{venda.percentualComissao}%</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between font-semibold">
          <span>Total Comissões</span>
          <span>R$ {relatorio.totalComissoes.toFixed(2)}</span>
        </div>
      </div>
      
      {/* Lançamentos Manuais */}
      <div>
        <h3 className="font-semibold mb-2">Ajustes Manuais</h3>
        
        {/* Créditos */}
        {relatorio.lancamentosCredito.length > 0 && (
          <div className="mb-2">
            <p className="text-sm text-green-600">Créditos (+)</p>
            {relatorio.lancamentosCredito.map(lanc => (
              <div key={lanc.id} className="flex justify-between text-sm">
                <span>{lanc.descricao}</span>
                <span className="text-green-600">+ R$ {lanc.valor.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
        
        {/* Débitos */}
        {relatorio.lancamentosDebito.length > 0 && (
          <div>
            <p className="text-sm text-red-600">Débitos (-)</p>
            {relatorio.lancamentosDebito.map(lanc => (
              <div key={lanc.id} className="flex justify-between text-sm">
                <span>{lanc.descricao}</span>
                <span className="text-red-600">- R$ {lanc.valor.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Valor Líquido */}
      <div className="border-t pt-2">
        <div className="flex justify-between font-semibold text-lg">
          <span>Valor Líquido</span>
          <span>R$ {relatorio.relatorio.valorLiquido.toFixed(2)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {relatorio.relatorio.saldoAnterior > 0 && 
            `Inclui R$ ${relatorio.relatorio.saldoAnterior.toFixed(2)} de saldo anterior`
          }
        </p>
      </div>
      
      {/* Pagamentos */}
      <div>
        <h3 className="font-semibold mb-2">Pagamentos Realizados</h3>
        {relatorio.pagamentos.map(pag => (
          <div key={pag.id} className="flex justify-between text-sm border-b pb-1">
            <div>
              <p>{new Date(pag.data).toLocaleDateString()} - {pag.formaPagamento}</p>
              {pag.comprovante && (
                <p className="text-xs text-muted-foreground">Comp: {pag.comprovante}</p>
              )}
            </div>
            <span>R$ {pag.valor.toFixed(2)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between font-semibold">
          <span>Total Pago</span>
          <span>R$ {relatorio.relatorio.totalPago.toFixed(2)}</span>
        </div>
      </div>
      
      {/* Saldo Devedor */}
      <div className="border-t pt-2">
        <div className="flex justify-between font-semibold text-lg">
          <span>Saldo Devedor</span>
          <span className={relatorio.relatorio.saldoDevedor > 0 ? 'text-red-600' : 'text-green-600'}>
            R$ {relatorio.relatorio.saldoDevedor.toFixed(2)}
          </span>
        </div>
        {relatorio.relatorio.saldoDevedor > 0 && (
          <p className="text-xs text-amber-600">
            Este saldo será transportado para o próximo período
          </p>
        )}
      </div>
    </div>
  );
}

function formatarPeriodoAnterior(periodo: string): string {
  const [ano, mes] = periodo.split('-').map(Number);
  const dataAtual = new Date(ano, mes - 1, 1);
  const mesAnterior = new Date(dataAtual.setMonth(dataAtual.getMonth() - 1));
  
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
                 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  
  return `${meses[mesAnterior.getMonth()]}/${mesAnterior.getFullYear()}`;
}
```

---

## 🔐 Controle de Permissões

```typescript
// /hooks/usePermissions.ts
import { useAuth } from '../contexts/AuthContext';

export function usePermissions() {
  const { user } = useAuth();
  
  return {
    // Vendedor só visualiza suas próprias comissões
    canViewComissoes: (vendedorId: string) => {
      if (user.tipo === 'backoffice') return true;
      if (user.tipo === 'vendedor') return user.id === vendedorId;
      return false;
    },
    
    // Apenas backoffice pode editar lançamentos
    canEditLancamentos: user.tipo === 'backoffice',
    
    // Apenas backoffice pode transferir entre períodos
    canTransferBetweenPeriods: user.tipo === 'backoffice',
    
    // Apenas backoffice pode adicionar lançamentos manuais
    canAddLancamentosManuais: user.tipo === 'backoffice',
    
    // Apenas backoffice pode registrar pagamentos
    canRegisterPagamentos: user.tipo === 'backoffice'
  };
}

// Uso no componente
function CommissionsManagement() {
  const permissions = usePermissions();
  
  return (
    <div>
      {permissions.canEditLancamentos && (
        <Button onClick={handleEditLancamento}>
          Editar Lançamento
        </Button>
      )}
    </div>
  );
}
```

---

## 📊 Fluxo de Trabalho Completo

### 1. Período Aberto
```
Vendas acontecem → Comissões são calculadas → Lançadas em comissoes_vendas
                                            → Período status = "aberto"
```

### 2. Ajustes e Edições (Backoffice)
```
Backoffice pode:
  ├─ Adicionar lançamentos manuais (créditos/débitos)
  ├─ Transferir lançamentos entre períodos
  ├─ Editar observações
  └─ Corrigir erros
```

### 3. Fechamento de Período
```
Backoffice fecha período → Status muda para "fechado"
                         → Totalizadores são calculados
                         → Se saldo_devedor > 0:
                             └─ Transportar para saldo_anterior do próximo período
```

### 4. Pagamento
```
Backoffice registra pagamento → Lançado em pagamentos_comissoes
                              → total_pago é atualizado
                              → saldo_devedor = valor_liquido - total_pago
                              → Se saldo_devedor = 0:
                                  └─ Status muda para "pago"
```

---

## ⚠️ Validações Importantes

### Frontend
```typescript
// Validar edição de lançamento
function validarEdicaoLancamento(
  lancamento: ComissaoVenda | LancamentoManual | PagamentoPeriodo,
  novoPeriodo: string,
  userRole: string
): { valido: boolean; erro?: string } {
  // 1. Apenas backoffice pode editar
  if (userRole !== 'backoffice') {
    return { valido: false, erro: 'Apenas backoffice pode editar lançamentos' };
  }
  
  // 2. Não pode transferir para período futuro
  const [anoNovo, mesNovo] = novoPeriodo.split('-').map(Number);
  const dataAtual = new Date();
  const periodoNovo = new Date(anoNovo, mesNovo - 1);
  
  if (periodoNovo > dataAtual) {
    return { valido: false, erro: 'Não é possível transferir para período futuro' };
  }
  
  // 3. Período de destino deve existir
  // (implementar verificação no backend)
  
  return { valido: true };
}
```

### Backend
```typescript
// Validar antes de salvar
async function validarAntesDeEditar(
  lancamentoId: string,
  novoPeriodo: string,
  userId: string
): Promise<void> {
  // 1. Verificar permissão do usuário
  const user = await db.users.findById(userId);
  if (user.tipo !== 'backoffice') {
    throw new Error('Permissão negada');
  }
  
  // 2. Verificar se período de destino existe
  const periodoDestino = await db.relatorios_comissoes.findOne({
    vendedor_id: lancamento.vendedorId,
    periodo: novoPeriodo
  });
  
  if (!periodoDestino) {
    throw new Error('Período de destino não existe. Crie o período primeiro.');
  }
  
  // 3. Verificar se período de destino está aberto ou fechado
  if (periodoDestino.status === 'pago') {
    throw new Error('Não é possível transferir para período já pago');
  }
}
```

---

## 🎯 Resumo dos Principais Recursos

### ✅ Implementado
1. **Lançamentos editáveis** - Todos os lançamentos podem ser editados por backoffice
2. **Transferência entre períodos** - Mudança do campo `periodo` transfere o lançamento
3. **Saldo transportado** - Campo `saldoAnterior` recebe saldo devedor do período anterior
4. **Auditoria completa** - Campos `editadoPor` e `editadoEm` em todos os lançamentos
5. **Recálculo automático** - Triggers recalculam totalizadores ao editar
6. **Estrutura otimizada** - Relatórios leves, lançamentos independentes

### 🎨 UI/UX Recomendado
- ✅ Badge de "Editado" nos lançamentos alterados
- ✅ Destaque visual para saldo anterior transportado
- ✅ Alerta ao transferir lançamento entre períodos
- ✅ Histórico de edições visível
- ✅ Confirmação antes de editar
- ✅ Feedback visual durante recálculo

---

**Versão:** 1.0  
**Data:** 31/10/2025  
**Compatível com:** ESTRUTURA_COMISSOES_BD.md v2.0
