# Sistema de Código de Cliente

## Visão Geral

Sistema que permite gerenciar códigos únicos para clientes com dois modos de operação: **automático** e **manual**.

## Funcionalidades Implementadas

### 1. Campo Código do Cliente
- Novo campo `codigo` adicionado ao tipo `Cliente`
- Campo exibido no formulário de cadastro de clientes
- Campo exibido na lista de clientes
- Validação de unicidade do código

### 2. Configuração em Configurações > Cadastros > Clientes

#### Modo Automático
- Códigos gerados automaticamente em ordem crescente
- Formato: 6 dígitos com zeros à esquerda (ex: 000001, 000002, 000003)
- Ao ativar, o sistema busca o maior código existente e continua a partir dele
- Campo desabilitado no formulário (gerado automaticamente ao salvar)
- Badge "Automático" exibido ao lado do campo

**Como funciona:**
1. Ao salvar um novo cliente, o código é gerado automaticamente
2. O próximo código disponível é exibido nas configurações
3. Sistema mantém controle sequencial dos códigos

#### Modo Manual
- Usuário deve informar o código manualmente
- Validação de duplicidade antes de salvar
- Campo habilitado no formulário
- Mensagem de obrigatório exibida

**Validações:**
- Código não pode estar vazio
- Código não pode estar duplicado
- Mensagem de erro específica em caso de duplicidade

### 3. Atribuição de Códigos a Clientes Existentes

Quando o modo automático é ativado:
- Sistema verifica clientes sem código
- Botão disponível para atribuir códigos automaticamente
- Códigos atribuídos em ordem crescente a partir do maior código existente

## Estrutura de Arquivos

### Novos Arquivos
- `/services/customerCodeService.ts` - Serviço centralizado de códigos
- `/CODIGO_CLIENTE_README.md` - Esta documentação

### Arquivos Modificados
- `/types/customer.ts` - Adicionado campo `codigo?: string`
- `/components/CustomerFormDadosCadastrais.tsx` - Campo de código no formulário
- `/components/CustomerFormPage.tsx` - Validação e geração de código
- `/components/SettingsPage.tsx` - Nova aba de configuração de clientes
- `/data/mockCustomers.ts` - Códigos de exemplo nos clientes mock

## Como Usar

### Para Configurar o Modo de Geração

1. Acesse **Configurações > Cadastros > Clientes**
2. Ative/desative o switch "Código Automático"
3. Se ativar automático:
   - Verifique o próximo código que será gerado
   - Se houver clientes sem código, clique em "Atribuir Códigos Automaticamente"

### Para Cadastrar Cliente

#### Modo Automático
1. Campo de código fica desabilitado (cinza)
2. Badge "Automático" é exibido
3. Ao salvar, código é gerado automaticamente
4. Não é necessário informar o código

#### Modo Manual
1. Campo de código fica habilitado
2. Digite o código desejado
3. Sistema valida unicidade ao salvar
4. Código é obrigatório

## Serviço customerCodeService

### Métodos Principais

```typescript
// Obter configuração atual
obterConfiguracao(): CustomerCodeConfig

// Alterar modo (automático ou manual)
alterarModo(modo: 'automatico' | 'manual', clientesExistentes: Cliente[]): CustomerCodeConfig

// Gerar próximo código automático
gerarProximoCodigo(): string | null

// Atribuir códigos a clientes sem código
atribuirCodigosAutomaticos(clientes: Cliente[]): Cliente[]

// Validar código manual
validarCodigoManual(codigo: string, clienteId: string, clientesExistentes: Cliente[]): { valido: boolean; erro?: string }

// Verificar se modo é automático
ehModoAutomatico(): boolean
```

## Regras de Negócio

1. **Unicidade**: Códigos devem ser únicos no sistema
2. **Imutabilidade**: Códigos não devem ser alterados após cadastro
3. **Obrigatório em Modo Manual**: No modo manual, código é obrigatório
4. **Sequencial em Modo Automático**: Códigos são gerados em ordem crescente
5. **Persistência**: Configuração é salva no localStorage

## Informações Técnicas

### Armazenamento
- Configuração: `localStorage` com chave `customer_code_config`
- Formato: `{ modo: 'automatico' | 'manual', proximoCodigo?: number }`

### Validações
- Verificação de duplicidade antes de salvar
- Validação de formato (não vazio)
- Validação de existência no modo manual

## Melhorias Futuras

- [ ] Permitir configurar formato do código (ex: prefixo personalizado)
- [ ] Permitir edição de código após cadastro (com auditoria)
- [ ] Exportar/importar códigos
- [ ] Relatório de códigos utilizados/disponíveis
- [ ] Configurar número de dígitos do código
