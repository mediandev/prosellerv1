# ✅ Integração ERP Unificada - Documentação (v2.0)

## 🎯 Problema Resolvido

**Antes:** Havia duplicidade nas configurações de integrações:
- ❌ "Integração ERP" - Para configurar tokens de API
- ❌ "Sincronização Tiny ERP" - Para configurar sincronização automática
- ❌ Usuário precisava configurar em dois lugares diferentes
- ❌ Informações duplicadas (token, empresa, status)
- ❌ Interface com cards grandes ocupando muito espaço
- ❌ Não permitia múltiplos ERPs por empresa facilmente

**Depois (v2.0):** Interface compacta e flexível:
- ✅ **Uma única interface** "Integrações ERP"
- ✅ **Dropdowns pesquisáveis** para ERP e empresa
- ✅ **Múltiplos ERPs por empresa** (Tiny + SAP, por exemplo)
- ✅ **Lista organizada por empresa** com expansões
- ✅ Configurações básicas + avançadas em um só lugar
- ✅ Interface compacta e eficiente
- ✅ Zero duplicações

## 🏗️ Arquitetura (v2.0)

### Estrutura do Componente

```
ERPIntegrationUnified
├─ Header
│  ├─ Título e Descrição
│  └─ Botão "Nova Integração"
│
├─ Tabela de Integrações (Agrupadas por Empresa)
│  └─ Para cada Empresa:
│     ├─ Header da Empresa (nome, CNPJ, status)
│     └─ Lista de Integrações ERP:
│        ├─ Linha Compacta (ERP, badges, toggle)
│        └─ Expansão (Collapsible):
│           ├─ Config. Avançadas (se Tiny ERP)
│           ├─ Botões Salvar/Testar
│           └─ Webhook (se aplicável)
│
├─ Histórico/Estatísticas (Tabs - apenas se houver Tiny)
│  ├─ Aba Histórico
│  └─ Aba Estatísticas
│
└─ Dialogs
   ├─ Dialog: Nova Integração
   │  ├─ Combobox: Selecionar Empresa
   │  └─ Combobox: Selecionar ERP
   │
   └─ Dialog: Editar Integração
      ├─ Input: Token API
      └─ Input: URL API (opcional)
```

## 🎨 Interface do Usuário (v2.0)

### 1. Cabeçalho com Ação

```
┌─────────────────────────────────────────────────────────┐
│ Integrações ERP                    [➕ Nova Integração] │
│ Configure integrações com sistemas de gestão...         │
└─────────────────────────────────────────────────────────┘
```

### 2. Tabela de Integrações Agrupadas por Empresa

```
┌─────────────────────────────────────────────────────────┐
│ 🔌 Integrações Configuradas                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 🏢 Empresa Principal  [12.345.678/0001-90]              │
│ ─────────────────────────────────────────────────────   │
│   ▶ Tiny ERP  [Ativo] [Testado ✓]         [ON] [✏️] [🗑️]│
│     Token: eyJ0eXAiOiJKV1...                            │
│                                                          │
│   ▶ SAP Business One                       [OFF] [✏️] [🗑️]│
│     Token: não configurado                              │
│                                                          │
│ 🏢 Filial SP  [98.765.432/0001-10]                      │
│ ─────────────────────────────────────────────────────   │
│   ▼ TOTVS Protheus  [Ativo]                [ON] [✏️] [🗑️]│
│     Token: abc123def456...                              │
│     │                                                   │
│     │ ⚙️ Configurações de Sincronização                │
│     │ (Não disponível para TOTVS)                      │
│     │                                                   │
│     │ [Salvar]  [Testar Conexão]                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 3. Dialog: Nova Integração (Compacto)

```
┌─────────────────────────────────────────────────────────┐
│ Adicionar Nova Integração ERP                        [X]│
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Empresa                                                 │
│ ┌──────────────────────────────────────────────────┐   │
│ │ Selecione a empresa...                      [🔽] │   │
│ └──────────────────────────────────────────────────┘   │
│                                                          │
│ Sistema ERP                                             │
│ ┌──────────────────────────────────────────────────┐   │
│ │ Selecione o ERP...                          [🔽] │   │
│ └──────────────────────────────────────────────────┘   │
│                                                          │
│                               [Cancelar]  [➕ Adicionar]│
└─────────────────────────────────────────────────────────┘
```

### 4. Dialog: Editar Integração

```
┌─────────────────────────────────────────────────────────┐
│ Configurar Tiny ERP - Empresa Principal              [X]│
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Token de API *                                          │
│ ┌──────────────────────────────────────────────────┐   │
│ │ •••••••••••••••••••••••••••••                    │   │
│ └──────────────────────────────────────────────────┘   │
│ Token obtido no painel do Tiny ERP                      │
│                                                          │
│ URL da API (Opcional)                                   │
│ ┌──────────────────────────────────────────────────┐   │
│ │ https://api.tiny.com.br                          │   │
│ └──────────────────────────────────────────────────┘   │
│ Deixe em branco para usar a URL padrão                  │
│                                                          │
│                                    [Cancelar]  [💾 Salvar]│
└─────────────────────────────────────────────────────────┘
```

### 3. Configurações Básicas

```
┌─────────────────────────────────────────────────────────┐
│ Configurações de Tiny ERP - Empresa Principal          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  🔑 Token de API do Tiny ERP                            │
│  ┌──────────────────────────────────────────┐           │
│  │ ••••••••••••••••••••••••••••••••••••     │           │
│  └──────────────────────────────────────────┘           │
│                                                          │
│  URL da API (Opcional)                                  │
│  ┌──────────────────────────────────────────┐           │
│  │ https://api.tiny.com.br                  │           │
│  └──────────────────────────────────────────┘           │
│                                                          │
│  ────────────────────────────────────────────           │
│                                                          │
│  Ativar Integração                              [ON]    ���
│  Habilita ou desabilita a integração com Tiny ERP       │
│                                                          │
│  ────────────────────────────────────────────           │
│                                                          │
│  [Salvar Configurações]  [Testar Conexão]              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 4. Configurações Avançadas (Collapsible - Tiny ERP)

```
┌─────────────────────────────────────────────────────────┐
│  ▼ Configurações Avançadas de Sincronização (Tiny ERP) │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Sincronizar Automaticamente                    [ON]    │
│  Atualiza os status automaticamente em intervalos...    │
│                                                          │
│  🕐 Intervalo de Sincronização (minutos)                │
│     [15] minutos                                        │
│                                                          │
│  ────────────────────────────────────────────           │
│                                                          │
│  Notificar Alterações                           [ON]    │
│  Exibe notificações quando o status é atualizado        │
│                                                          │
│  ────────────────────────────────────────────           │
│                                                          │
│  Sincronizar Dados Adicionais                   [ON]    │
│  Inclui nota fiscal, rastreio e transportadora          │
│                                                          │
│  ���───────────────────────────────────────────           │
│                                                          │
│  🌐 URL do Webhook                                      │
│  ┌──────────────────────────────────────────┬─────┐    │
│  │ https://app.com/api/webhooks/tiny/emp... │[📋] │    │
│  └──────────────────────────────────────────┴─────┘    │
│                                                          │
│  ℹ️  Como configurar no Tiny ERP:                       │
│     1. Acesse Configurações → Integrações → Webhooks   │
│     2. Crie novo webhook com a URL acima               │
│     3. Selecione evento: "Mudança de situação..."      │
│     4. Formato: JSON                                    │
│                                                          │
│  ────────────────────────────────────────────           │
│                                                          │
│  [Testar Sincronização]                                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 🔄 Fluxo de Uso (v2.0)

### Cenário 1: Adicionar Primeira Integração

```
1. Usuário acessa: Configurações → Integrações → Integrações ERP
                              ↓
2. Clica em "Nova Integração"
                              ↓
3. Dialog abre com 2 dropdowns pesquisáveis
                              ↓
4. Seleciona "Empresa Principal" no primeiro dropdown
                              ↓
5. Seleciona "Tiny ERP" no segundo dropdown
                              ↓
6. Clica "Adicionar"
                              ↓
7. Integração é criada e auto-expandida
                              ↓
8. Clica no ícone de edição [✏️]
                              ↓
9. Preenche Token de API no dialog
                              ↓
10. Salva
                              ↓
11. Ativa o switch [ON]
                              ↓
12. Clica em "Testar Conexão"
                              ↓
13. Expande a linha (clica na seta ▶)
                              ↓
14. Configura sincronização automática
                              ↓
15. Copia URL do webhook
                              ↓
16. Clica "Salvar"
                              ↓
17. ✅ Integração completa!
```

### Cenário 2: Empresa com Múltiplos ERPs

```
1. Empresa Principal já tem Tiny ERP configurado
                              ↓
2. Usuário quer adicionar SAP também
                              ↓
3. Clica "Nova Integração"
                              ↓
4. Seleciona "Empresa Principal"
                              ↓
5. Seleciona "SAP Business One"
                              ↓
6. Clica "Adicionar"
                              ↓
7. Nova linha aparece sob "Empresa Principal"
   🏢 Empresa Principal
   ├─ ▶ Tiny ERP [Ativo] [Testado ✓]
   └─ ▶ SAP Business One
                              ↓
8. Configura o SAP da mesma forma
                              ↓
9. ✅ Empresa integrada com 2 ERPs!
```

### Cenário 3: Gerenciar Integração Existente

```
1. Usuário vê a lista de integrações
                              ↓
2. Encontra a integração desejada
                              ↓
3. Opções disponíveis:
   • [ON/OFF] = Ativar/Desativar rapidamente
   • [✏️] = Editar token/URL
   • [🗑️] = Remover integração
   • [▶/▼] = Expandir para ver config. avançadas
                              ↓
4. ✅ Gerenciamento rápido e visual!
```

## 📊 Comparação: Antes vs Depois (v2.0)

| Aspecto | ❌ v1.0 (Cards Grandes) | ✅ v2.0 (Compacto) |
|---------|------------------------|-------------------|
| **Número de Abas** | 1 aba | 1 aba |
| **Seleção de ERP** | Cards grandes | Dropdown pesquisável |
| **Seleção de Empresa** | Cards grandes | Dropdown pesquisável |
| **Múltiplos ERPs/Empresa** | Difícil | Fácil ✅ |
| **Espaço em Tela** | Muito espaço usado | Compacto ✅ |
| **Visão Geral** | Limitada | Clara (lista) ✅ |
| **Adição de Integração** | Muitos cliques | Dialog rápido ✅ |
| **Edição Rápida** | Expandir tudo | Dialog ou inline ✅ |
| **Ativar/Desativar** | Precisava expandir | Switch direto ✅ |
| **Agrupamento** | Por ERP | Por Empresa ✅ |
| **Escalabilidade** | Ruim (muitos cards) | Excelente ✅ |

## 🎯 Diferenciais da Solução (v2.0)

### 1. Organização por Empresa (Novo!)

Interface **centrada na empresa**, não no ERP:
- ✅ Cada empresa pode ter múltiplos ERPs
- ✅ Fácil visualizar todas as integrações de uma empresa
- ✅ Lógica de negócio clara: "Empresa X integra com Y e Z"

### 2. Dropdowns Pesquisáveis (Novo!)

Seleção eficiente com **Combobox**:
- ✅ Pesquisa em tempo real
- ✅ Interface compacta
- ✅ Suporta centenas de empresas/ERPs sem problemas
- ✅ UX moderna e profissional

### 3. Ações Rápidas (Novo!)

Menos cliques para ações comuns:
- ✅ **Switch inline** para ativar/desativar
- ✅ **Ícone de edição** para configurar token
- ✅ **Ícone de remoção** para deletar
- ✅ **Seta de expansão** para config. avançadas

### 4. Contexto Inteligente

As **configurações avançadas** só aparecem para ERPs que as suportam:
- ✅ **Tiny ERP:** Mostra sincronização (polling, webhook, etc)
- ✅ **TOTVS, SAP, Omie, Bling:** Apenas o básico (token, ativo)

### 5. Collapsible UX

Configurações avançadas **ocultas por padrão**:
- Menos sobrecarga visual
- Interface limpa e escanável
- Expande sob demanda

### 6. Visual Feedback

Status visuais **imediatos**:
- ✅ **Badges:** "Testado ✓", "Ativo"
- ✅ **Ícones:** Sucesso (verde), Erro (vermelho)
- ✅ **Switch:** Estado ON/OFF visual

### 7. Copy-Paste Facilitado

Webhook URL com **botão de copiar**:
- 📋 Um clique copia URL completa
- ✓ Feedback visual de copiado
- 🎯 Toast de confirmação

### 8. Dialogs Contextuais (Novo!)

Formulários em **dialogs** ao invés de inline:
- ✅ Foco na tarefa atual
- ✅ Não polui a interface principal
- ✅ Validação antes de adicionar/salvar

## 🔧 Implementação Técnica

### Componente Principal

```typescript
// /components/ERPIntegrationUnified.tsx

export function ERPIntegrationUnified() {
  // Estados
  const [erpSelecionado, setErpSelecionado] = useState<ERPType>('tiny');
  const [empresaSelecionada, setEmpresaSelecionada] = useState<Company | null>(null);
  const [configAvancadaAberta, setConfigAvancadaAberta] = useState(false);

  // Lógica condicional
  const mostrarConfigAvancada = erpSelecionado === 'tiny';

  return (
    <>
      <SeletorERP />
      <SeletorEmpresa />
      <ConfiguracoesBasicas />
      
      {/* Só para Tiny ERP */}
      {mostrarConfigAvancada && (
        <Collapsible>
          <ConfiguracoesSincronizacao />
          <WebhookURL />
          <HistoricoEstatisticas />
        </Collapsible>
      )}
    </>
  );
}
```

### Integração com Serviços

```typescript
// Salvar configurações básicas (todos ERPs)
const handleSalvarConfiguracao = () => {
  // Salva token, URL, status ativo
  saveERPConfig(empresaId, erpTipo, config);

  // Se for Tiny + tiver config avançada, salva também
  if (erpTipo === 'tiny' && configSincronizacao) {
    tinyERPSyncService.configurarEmpresa(
      empresaId,
      empresaNome,
      configSincronizacao
    );
  }
};
```

## 📁 Arquivos Modificados

### Criados
1. ✅ `/components/ERPIntegrationUnified.tsx` - Componente unificado

### Modificados
1. ✅ `/components/SettingsPage.tsx` - Usa novo componente

### Removidos da Interface (mantidos no código)
1. 🗑️ `/components/ERPConfigSettings.tsx` - Não mais usado
2. 🗑️ `/components/ERPConfigMulticompany.tsx` - Não mais usado
3. 🗑️ `/components/TinyERPSyncSettings.tsx` - Não mais usado
4. 🗑️ `/components/TinyERPSyncSettingsMulticompany.tsx` - Não mais usado

*Nota: Arquivos mantidos por compatibilidade, podem ser removidos depois.*

## 🚀 Benefícios (v2.0)

### Para o Usuário
- ✅ **Menos cliques:** Ações inline (switch, edit, delete)
- ✅ **Menos confusão:** Organização por empresa é intuitiva
- ✅ **Mais flexível:** Pode integrar 1 empresa com N ERPs
- ✅ **Mais rápido:** Dropdowns pesquisáveis encontram rapidamente
- ✅ **Melhor visão geral:** Vê todas integrações de relance
- ✅ **Interface compacta:** Cabe mais informação na tela

### Para o Sistema
- ✅ **Sem duplicação:** Zero código repetido
- ✅ **Manutenção fácil:** Um componente unificado
- ✅ **Escalável:** Suporta centenas de empresas/ERPs
- ✅ **Consistente:** Mesmo padrão sempre
- ✅ **Multi-tenant:** Pronto para SaaS

### Para o Desenvolvedor
- ✅ **Código limpo:** Estrutura clara com dialogs
- ✅ **Fácil debug:** Estado centralizado
- ✅ **Extensível:** Adicionar ERP = 1 linha no array
- ✅ **Testável:** Lógica isolada em handlers
- ✅ **Moderno:** Usa Combobox (shadcn/ui)

## 🎓 Como Adicionar Novo ERP

### Passo 1: Adicionar à Lista

```typescript
const ERP_OPTIONS: { value: ERPType; label: string; description: string }[] = [
  { value: 'tiny', label: 'Tiny ERP', description: '...' },
  { value: 'totvs', label: 'TOTVS', description: '...' },
  // NOVO:
  { value: 'sankhya', label: 'Sankhya', description: 'Sistema de gestão' },
];
```

### Passo 2: Adicionar Tipo

```typescript
type ERPType = 'tiny' | 'totvs' | 'sap' | 'omie' | 'bling' | 'sankhya';
```

### Passo 3: (Opcional) Configurações Específicas

```typescript
{erpSelecionado === 'sankhya' && (
  <Collapsible>
    <ConfiguracoesSankhya />
  </Collapsible>
)}
```

### Pronto! 🎉

O novo ERP já aparece na interface com:
- ✅ Seletor visual
- ✅ Configurações básicas (token, teste, ativo)
- ✅ Suporte multiempresas
- ✅ Mesma UX dos outros ERPs

## 💡 Exemplos de Uso

### Exemplo 1: Startup com 1 Empresa e Tiny ERP

```
Integrações Configuradas:
├─ 🏢 TechStartup Ltda [12.345.678/0001-90]
   └─ ▶ Tiny ERP [Ativo] [Testado ✓] [ON]
```

**Passos:**
1. Clicou "Nova Integração"
2. Selecionou "TechStartup Ltda"
3. Selecionou "Tiny ERP"
4. Configurou token
5. Ativou e testou
6. ✅ Pronto!

---

### Exemplo 2: Empresa Multi-Unidades com ERPs Diferentes

```
Integrações Configuradas:
├─ 🏢 Matriz SP [11.111.111/0001-11]
│  ├─ ▶ Tiny ERP [Ativo] [Testado ✓] [ON]
│  └─ ▶ SAP Business One [Ativo] [ON]
│
├─ 🏢 Filial RJ [22.222.222/0001-22]
│  └─ ▶ TOTVS Protheus [Ativo] [Testado ✓] [ON]
│
└─ 🏢 Filial MG [33.333.333/0001-33]
   └─ ▶ Tiny ERP [Ativo] [ON]
```

**Cenário:**
- Matriz usa Tiny (vendas) + SAP (financeiro)
- Filial RJ usa TOTVS
- Filial MG usa Tiny

**Resultado:** Cada empresa com seu próprio ERP, tudo gerenciado em uma tela!

---

### Exemplo 3: Holding com 50+ Empresas

```
Integrações Configuradas:
├─ 🏢 Empresa 01 - ABC Comercio [11.111.111/0001-11]
│  └─ ▶ Tiny ERP [Ativo] [ON]
│
├─ 🏢 Empresa 02 - DEF Serviços [22.222.222/0001-22]
│  └─ ▶ Tiny ERP [Ativo] [ON]
│
├─ 🏢 Empresa 03 - GHI Industria [33.333.333/0001-33]
│  └─ ▶ SAP Business One [Ativo] [ON]
│
... (mais 47 empresas)
```

**Vantagem do Dropdown Pesquisável:**
- Digita "DEF" → Filtra instantaneamente
- Digita "22.222" → Encontra pelo CNPJ
- Não precisa scrollar 50 empresas!

---

## 📋 Checklist de Verificação

### Ao Adicionar Nova Integração:
- [ ] Selecionou a empresa correta
- [ ] Selecionou o ERP desejado
- [ ] Verificou se já não existe a mesma integração

### Ao Configurar Integração:
- [ ] Token de API preenchido e válido
- [ ] URL da API configurada (se aplicável)
- [ ] Teste de conexão realizado com sucesso
- [ ] Switch de ativação ligado [ON]
- [ ] Configurações salvas

### Para Tiny ERP Especificamente:
- [ ] Sincronização automática configurada
- [ ] Intervalo de polling definido
- [ ] Notificações habilitadas (se desejado)
- [ ] URL do webhook copiada
- [ ] Webhook configurado no painel Tiny ERP
- [ ] Teste de sincronização realizado

### Verificação Final:
- [ ] Badge "Testado ✓" aparece
- [ ] Badge "Ativo" aparece
- [ ] Integração funciona na prática
- [ ] Logs/histórico sendo gerado (se Tiny)

## 🎯 Resumo

**Evolução v1.0 → v2.0:**
- ❌ Cards grandes e espaçosos → ✅ Lista compacta e eficiente
- ❌ Organização por ERP → ✅ Organização por Empresa
- ❌ Seleção com cards → ✅ Dropdowns pesquisáveis
- ❌ Difícil ter múltiplos ERPs → ✅ Múltiplos ERPs fácil
- ❌ Ações escondidas → ✅ Ações inline visíveis
- ❌ Dialogs apenas para config → ✅ Dialogs para adicionar/editar

**Resultado v2.0:**
Uma interface **compacta, flexível e profissional** que:
- ✅ Permite múltiplos ERPs por empresa
- ✅ Ocupa menos espaço em tela
- ✅ Facilita visualização geral
- ✅ Acelera ações comuns
- ✅ Mantém zero duplicação

**Casos de Uso Suportados:**
1. ✅ Empresa com 1 ERP (caso simples)
2. ✅ Empresa com múltiplos ERPs (Tiny + SAP)
3. ✅ Múltiplas empresas, cada uma com ERP diferente
4. ✅ Mix: algumas empresas 1 ERP, outras múltiplos
5. ✅ Centenas de empresas (dropdown pesquisável)

---

**Status:** ✅ Implementado e Funcional  
**Versão:** 2.0.0  
**Data:** Novembro 2025  
**Breaking Changes:** Interface completamente redesenhada
