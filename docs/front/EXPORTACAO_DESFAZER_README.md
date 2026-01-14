# Sistema de Exportação e Desfazer Importação

## 🎯 Visão Geral

Foram implementadas duas funcionalidades avançadas no sistema de importação/exportação de dados:

### 1. ✅ Exportação de Dados para Excel
Exporte todos os dados cadastrados no sistema para planilhas Excel, permitindo backup, análise e migração de dados.

### 2. ✅ Desfazer Importação (Rollback)
Reverta importações realizadas, removendo todos os registros importados de forma segura.

---

## 📤 Exportação de Dados

### Onde Encontrar
**Configurações → Importações → Aba "Exportar Dados"**

### Tipos de Exportação

#### 1️⃣ Backup Completo do Sistema
Exporta **todos os dados** em um único arquivo Excel com múltiplas abas:
- ✅ Aba "Vendas" - Todas as vendas
- ✅ Aba "Clientes" - Todos os clientes
- ✅ Aba "Produtos" - Todos os produtos
- ✅ Aba "Vendedores" - Todos os vendedores

**Arquivo gerado:** `backup_completo_YYYYMMDD_HHMMSS.xlsx`

#### 2️⃣ Exportações Individuais

**Exportar Vendas**
- Arquivo: `vendas_export_YYYYMMDD_HHMMSS.xlsx`
- Inclui: Número pedido, data, cliente, vendedor, produtos, valores
- Formato compatível com importação

**Exportar Clientes**
- Arquivo: `clientes_export_YYYYMMDD_HHMMSS.xlsx`
- Inclui: Todos os campos cadastrais, endereço, contatos, condições comerciais
- Formato compatível com importação

**Exportar Produtos**
- Arquivo: `produtos_export_YYYYMMDD_HHMMSS.xlsx`
- Inclui: SKU, descrição, preços, estoque, características técnicas
- Formato compatível com importação

**Exportar Vendedores**
- Arquivo: `vendedores_export_YYYYMMDD_HHMMSS.xlsx`
- Inclui: Dados pessoais, contatos, metas, comissões, endereço
- Formato compatível com importação

### Casos de Uso

#### 🔐 Backup de Segurança
```
1. Configurações → Importações → Exportar Dados
2. Clicar em "Exportar Backup Completo"
3. Arquivo salvo automaticamente
4. Armazenar em local seguro (nuvem, HD externo)
5. Repetir periodicamente (recomendado: semanal)
```

#### 📊 Análise de Dados
```
1. Exportar dados específicos (ex: Vendas)
2. Abrir no Excel/Google Sheets
3. Criar tabelas dinâmicas
4. Gerar gráficos e relatórios
5. Compartilhar com equipe
```

#### 🔄 Migração de Sistema
```
1. Exportar todos os dados
2. Ajustar formato se necessário
3. Importar em outro sistema
4. Validar integridade dos dados
```

#### 📝 Auditoria
```
1. Exportar dados periodicamente
2. Comparar com exportações anteriores
3. Identificar alterações
4. Manter histórico de versões
```

### Características Técnicas

**Formato de Arquivo**
- Formato: Excel (.xlsx)
- Compatível com: Excel, Google Sheets, LibreOffice
- Encoding: UTF-8
- Larguras de coluna otimizadas

**Nomenclatura de Arquivos**
```
Padrão: {tipo}_export_{timestamp}.xlsx

Exemplos:
- vendas_export_20241101_143022.xlsx
- clientes_export_20241101_143045.xlsx
- backup_completo_20241101_143100.xlsx
```

**Dados Exportados**
- ✅ Todos os campos cadastrados
- ✅ Formatação brasileira (datas, moeda)
- ✅ Máscaras aplicadas (CPF/CNPJ, telefone, CEP)
- ✅ Estrutura compatível com importação
- ✅ Valores calculados incluídos

---

## ⏪ Desfazer Importação (Rollback)

### Onde Encontrar
**Configurações → Importações → Aba "Histórico"**

Cada importação exibe um botão **"Desfazer"** quando disponível.

### Como Funciona

#### Quando o Botão "Desfazer" Aparece
- ✅ Importação foi bem-sucedida (total ou parcial)
- ✅ Registros ainda podem ser identificados
- ✅ Sistema permite reversão
- ✅ Não houve modificações manuais posteriores

#### Quando NÃO Aparece
- ❌ Importação teve 100% de erro (nada foi importado)
- ❌ Importação já foi desfeita anteriormente
- ❌ Sistema marcou como não reversível
- ❌ Muito tempo desde a importação

### Processo de Desfazer

**Passo a Passo:**

```
1. Configurações → Importações → Histórico
2. Localizar a importação desejada
3. Clicar no botão "Desfazer" (laranja)
4. Revisar informações no diálogo:
   - Tipo de importação
   - Arquivo original
   - Data/hora
   - Quantidade de registros a remover
5. LER ALERTA: "Esta ação não pode ser desfeita!"
6. Confirmar clicando em "Sim, Desfazer Importação"
7. Aguardar processamento
8. Verificar mensagem de sucesso
```

**Exemplo de Diálogo:**

```
╔════════════════════════════════════════╗
║  ⚠️  Desfazer Importação              ║
╠════════════════════════════════════════╣
║                                        ║
║  ⚠️  Atenção: Esta ação não pode ser  ║
║      desfeita!                         ║
║                                        ║
║  Todos os registros importados serão   ║
║  removidos permanentemente do sistema. ║
║                                        ║
║  Importação: Clientes                  ║
║  Arquivo: clientes_lote1.xlsx          ║
║  Data: 28/10/2024 às 10:30            ║
║  Registros a remover: 48               ║
║                                        ║
║  Tem certeza que deseja desfazer esta  ║
║  importação?                           ║
║                                        ║
║  [Cancelar]  [Sim, Desfazer]          ║
╚════════════════════════════════════════╝
```

### O que Acontece ao Desfazer

**Registros Removidos:**
- ✅ Todos os registros importados naquela operação
- ✅ Apenas os que foram criados pela importação
- ✅ Não afeta registros criados manualmente
- ✅ Não afeta outras importações

**Sistema Atualizado:**
- 🔄 Contadores de registros atualizados
- 🔄 Relacionamentos limpos (se houver)
- 🔄 Histórico mantido (registro de desfazer)
- 🔄 Botão "Desfazer" removido dessa importação

**Notificação:**
```
✅ Importação desfeita com sucesso!
   48 registros removidos
```

### Casos de Uso

#### ❌ Importação com Dados Incorretos
```
Problema: Importou clientes com preços errados
Solução:
1. Desfazer importação
2. Corrigir planilha
3. Importar novamente
```

#### 🔄 Importação Duplicada
```
Problema: Importou a mesma planilha duas vezes
Solução:
1. Desfazer a segunda importação
2. Verificar dados
3. Continuar normalmente
```

#### 🧪 Teste de Importação
```
Cenário: Testando processo de importação
Ação:
1. Importar arquivo de teste
2. Verificar resultado
3. Desfazer para limpar
4. Pronto para importação real
```

#### 🔍 Descoberta de Erro Após Importação
```
Problema: Notou erro após importar
Solução:
1. Desfazer importação imediatamente
2. Evitar edições manuais
3. Corrigir problema
4. Importar novamente corrigido
```

### Limitações e Regras

**⚠️ Atenção:**

1. **Não é Possível Desfazer Duas Vezes**
   - Uma vez desfeita, não pode desfazer novamente
   - Registro permanece no histórico para auditoria

2. **Modificações Manuais**
   - Se editou manualmente um registro importado, pode haver inconsistência
   - Sistema remove apenas os originais da importação

3. **Ordem de Desfazer**
   - Não é obrigatório desfazer na ordem reversa
   - Cada importação é independente
   - Mas cuidado com relacionamentos!

4. **Relacionamentos**
   - Desfazer clientes pode afetar vendas vinculadas
   - Desfazer produtos pode afetar vendas com esses produtos
   - Revisar impacto antes de desfazer

5. **Tempo**
   - Recomendado desfazer logo após identificar erro
   - Quanto mais tempo, maior risco de dependências

### Segurança

**Confirmação Obrigatória:**
- ✅ Diálogo de alerta vermelho
- ✅ Texto destacado sobre irreversibilidade
- ✅ Detalhes completos da operação
- ✅ Contagem de registros afetados
- ✅ Botão de confirmação em vermelho

**Auditoria:**
- 📝 Ação registrada no histórico
- 📝 Usuário que desfez é registrado
- 📝 Data/hora da ação
- 📝 Quantidade de registros removidos

---

## 🎨 Interface

### Aba "Exportar Dados"

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  📊 Backup Completo do Sistema                  │
│                                                 │
│  [Vendas] [Clientes] [Produtos] [Vendedores]   │
│                                                 │
│  [📥 Exportar Backup Completo]                 │
│                                                 │
│  ✅ Exportação concluída!                       │
│     • 245 vendas exportadas                     │
│     • 128 clientes exportados                   │
│     • 89 produtos exportados                    │
│     • 15 vendedores exportados                  │
└─────────────────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────┐
│ 🛒 Vendas        │  │ 👤 Clientes      │
│ [Exportar]       │  │ [Exportar]       │
└──────────────────┘  └──────────────────┘

┌──────────────────┐  ┌──────────────────┐
│ 📦 Produtos      │  │ 👥 Vendedores    │
│ [Exportar]       │  │ [Exportar]       │
└──────────────────┘  └──────────────────┘
```

### Histórico com Botão Desfazer

**Tabela:**
```
Data/Hora          Tipo      Arquivo              Total  Sucesso  Erros  Status    Ações
28/10/24 10:30    Clientes  clientes_lote1.xlsx    50      48       2    Parcial  [Detalhes] [⏪ Desfazer]
29/10/24 14:15    Produtos  produtos.xlsx         120     120       0    Sucesso  [Detalhes] [⏪ Desfazer]
30/10/24 09:00    Vendas    vendas_2023.xlsx      300     295       5    Parcial  [Detalhes] [⏪ Desfazer]
31/10/24 16:45    Vendedores vendedores.xlsx       15      15       0    Sucesso  [Detalhes]
                                                                                   (Desfeita)
```

---

## 💡 Melhores Práticas

### Para Exportação

1. **Backup Regular**
   ```
   ✅ Exportar backup completo semanalmente
   ✅ Armazenar em múltiplos locais
   ✅ Manter histórico de versões
   ✅ Testar restauração periodicamente
   ```

2. **Nomenclatura**
   ```
   ✅ Usar nomes descritivos adicionais se necessário
   ✅ Manter padrão de organização
   ✅ Documentar propósito de cada exportação
   ```

3. **Segurança**
   ```
   ✅ Proteger arquivos com senha (se contém dados sensíveis)
   ✅ Não compartilhar arquivos por email não criptografado
   ✅ Usar armazenamento seguro (OneDrive, Google Drive, etc)
   ✅ Definir permissões adequadas
   ```

### Para Desfazer Importação

1. **Antes de Desfazer**
   ```
   ✅ Verificar impacto nos relacionamentos
   ✅ Exportar dados atuais como backup
   ✅ Notificar equipe (se necessário)
   ✅ Ter certeza absoluta da necessidade
   ```

2. **Após Desfazer**
   ```
   ✅ Verificar que registros foram removidos
   ✅ Corrigir problema original
   ✅ Documentar motivo do rollback
   ✅ Planejar nova importação (se necessário)
   ```

3. **Evitar Necessidade de Desfazer**
   ```
   ✅ Usar preview antes de importar
   ✅ Validar dados na planilha
   ✅ Fazer importação de teste primeiro
   ✅ Revisar cuidadosamente antes de confirmar
   ```

---

## 🔧 Aspectos Técnicos

### Arquivos Criados

```
/services/
  ├── exportService.ts       # Serviço de exportação
  └── importService.ts       # Serviço de rollback

/components/
  └── DataExportSettings.tsx # Interface de exportação
```

### Funções do Export Service

```typescript
exportService.exportVendas()      // Exporta vendas
exportService.exportClientes()    // Exporta clientes
exportService.exportProdutos()    // Exporta produtos
exportService.exportVendedores()  // Exporta vendedores
exportService.exportTodosDados()  // Backup completo
```

### Funções do Import Service

```typescript
importService.registerImport(id, tipo, recordIds)  // Registra importação
importService.canUndo(importId)                    // Verifica se pode desfazer
importService.undoImport(importId)                 // Desfaz importação
importService.getImportInfo(importId)              // Obtém informações
importService.markAsNonReversible(importId)        // Marca como irreversível
```

### Estrutura de Dados

**ImportedRecords:**
```typescript
{
  importId: string;
  recordIds: string[];          // IDs dos registros importados
  tipo: TipoImportacao;
  canUndo: boolean;             // Pode desfazer?
}
```

**ExportResult:**
```typescript
{
  success: boolean;
  fileName?: string;
  recordCount?: number;
  recordCounts?: {              // Para backup completo
    vendas: number;
    clientes: number;
    produtos: number;
    vendedores: number;
  };
}
```

---

## 📊 Fluxos Completos

### Fluxo de Exportação

```
┌─────────────────────────────────────────┐
│ Usuário seleciona tipo de exportação   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Sistema coleta dados do tipo selecionado│
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Formata dados para Excel (XLSX)         │
│ - Aplica máscaras brasileiras           │
│ - Ajusta larguras de coluna             │
│ - Formata cabeçalhos                    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Gera nome de arquivo com timestamp     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Salva arquivo automaticamente           │
│ (pasta de Downloads do navegador)       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Exibe notificação de sucesso            │
│ - Nome do arquivo                       │
│ - Quantidade de registros               │
└─────────────────────────────────────────┘
```

### Fluxo de Desfazer Importação

```
┌─────────────────────────────────────────┐
│ Usuário clica em "Desfazer" no histórico│
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Sistema verifica se pode desfazer      │
│ - canUndo === true?                    │
│ - Registros ainda existem?             │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Exibe diálogo de confirmação           │
│ - ⚠️ Alerta de irreversibilidade      │
│ - Detalhes da importação               │
│ - Quantidade a remover                 │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Usuário confirma?                       │
└──┬─────────────────────────────────┬────┘
   │ NÃO                            SIM
   │                                 │
   ▼                                 ▼
┌─────────┐              ┌──────────────────┐
│ Cancela │              │ Remove registros │
└─────────┘              └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ Atualiza histórico│
                         │ Marca como desfeita│
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ Notifica sucesso │
                         │ X registros       │
                         │ removidos         │
                         └──────────────────┘
```

---

## 📝 Exemplos Práticos

### Exemplo 1: Backup Semanal

**Segunda-feira, 09:00**
```bash
1. Abrir sistema
2. Configurações → Importações → Exportar Dados
3. Clicar em "Exportar Backup Completo"
4. Aguardar download (backup_completo_20241104_090000.xlsx)
5. Upload para Google Drive/OneDrive
6. Manter últimas 4 semanas
7. Deletar backups mais antigos
```

### Exemplo 2: Análise de Vendas

**Necessidade: Analisar vendas do mês**
```bash
1. Exportar Vendas
2. Abrir no Excel
3. Criar tabela dinâmica:
   - Linhas: Vendedor
   - Valores: Soma de Valor Total
4. Criar gráfico de barras
5. Compartilhar com diretoria
```

### Exemplo 3: Correção de Erro

**Problema: Importou clientes com UF errada**
```bash
1. Descobriu erro logo após importação
2. Histórico → Localizar importação
3. Clicar em "Desfazer"
4. Confirmar remoção (48 registros)
5. Aguardar: "48 registros removidos"
6. Corrigir planilha original (UF correto)
7. Importar novamente
8. Preview: Tudo OK agora
9. Confirmar importação
10. Sucesso: 48 clientes com UF correto
```

### Exemplo 4: Migração para Novo Sistema

**Cenário: Mudar de software**
```bash
1. Exportar Backup Completo
2. Revisar estrutura do novo sistema
3. Ajustar colunas se necessário
4. Importar no novo sistema
5. Validar:
   - Contagem de registros
   - Dados críticos
   - Relacionamentos
6. Manter backup do sistema antigo
```

---

## ⚠️ Avisos Importantes

### 🔴 CRÍTICO

1. **Desfazer é Permanente**
   - Não há "Refazer"
   - Uma vez removido, registro some
   - Tenha certeza absoluta antes de confirmar

2. **Backup Antes de Grandes Mudanças**
   - Sempre exporte antes de desfazer
   - Mantenha cópia de segurança
   - Possibilita recuperação manual se necessário

3. **Dados Sensíveis**
   - Arquivos exportados contêm todos os dados
   - Proteja adequadamente
   - Não deixe em computadores compartilhados

### ⚠️ ATENÇÃO

1. **Relacionamentos**
   - Desfazer clientes pode quebrar vendas
   - Desfazer produtos pode quebrar pedidos
   - Avaliar impacto antes de desfazer

2. **Modificações Manuais**
   - Se editou registros importados, pode haver inconsistência
   - Desfazer remove apenas registros originais
   - Edições manuais permanecem (se aplicável)

3. **Tempo de Processamento**
   - Grandes volumes podem demorar
   - Não feche o navegador durante processo
   - Aguarde confirmação de sucesso

---

## 🎓 Conclusão

As funcionalidades de **Exportação** e **Desfazer Importação** completam o ciclo de gerenciamento de dados:

✅ **Importação** - Popular sistema com dados
✅ **Preview** - Validar antes de importar
✅ **Histórico** - Rastrear importações
✅ **Exportação** - Backup e análise
✅ **Desfazer** - Corrigir erros

**Benefícios:**
- 🔒 Maior segurança dos dados
- 🔄 Flexibilidade no gerenciamento
- 📊 Análises externas possíveis
- ⏪ Reversão de erros
- 💾 Backups regulares facilitados

**Próximos Passos Sugeridos:**
- Integração com Supabase para persistência real
- Agendamento automático de backups
- Versionamento de dados
- Comparação entre versões exportadas
- Logs detalhados de todas as operações

---

**Documentação atualizada em:** 01/11/2024
**Versão do sistema:** 1.2.0
