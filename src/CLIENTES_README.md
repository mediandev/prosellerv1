# Sistema de Gestão de Clientes - Documentação

## 📋 Visão Geral

Sistema completo de gestão de clientes com CRUD completo (Create, Read, Update, Delete), sistema de permissões e controle de acesso baseado em tipos de usuário.

## 👥 Tipos de Usuário

### Backoffice
- Acesso completo a todos os clientes
- Visualiza todas as vendas
- Acessa relatórios consolidados
- Gerencia configurações e usuários

### Vendedor
- Visualiza apenas clientes atribuídos
- Visualiza apenas vendas dos seus clientes
- Relatórios filtrados por seus clientes
- Permissões limitadas de configuração

## 🔐 Sistema de Autenticação

### Usuários Mockados Disponíveis

**Admin (Backoffice):**
- Email: `admin@empresa.com`
- Senha: `admin123`
- Acesso: Todos os clientes e vendas

**João Silva (Vendedor):**
- Email: `joao@empresa.com`
- Senha: `joao123`
- Clientes: cliente-1, cliente-2, cliente-5

**Maria Santos (Vendedor):**
- Email: `maria@empresa.com`
- Senha: `maria123`
- Clientes: cliente-3, cliente-4, cliente-6

> **Nota:** Por padrão, o sistema está configurado para logar automaticamente como Admin para facilitar o desenvolvimento.

## 📄 Estrutura de Cadastro de Clientes

### Aba 1: Dados Cadastrais

#### Seção Identificação
- **Tipo Pessoa**: Pessoa Física ou Pessoa Jurídica
- **CPF/CNPJ**: Com máscara automática e validação
- **Razão Social**: Nome completo (PF) ou Razão Social (PJ)
- **Nome Fantasia**: Apenas para PJ
- **Inscrição Estadual**: Apenas para PJ
- **Situação**: Ativo, Inativo ou Excluído
- **Segmento de Mercado**: Dropdown pesquisável
- **Grupo/Rede**: Com opção de inclusão rápida

#### Seção Endereço
- **CEP**: Com busca automática via ViaCEP
- **Logradouro, Número, Complemento, Bairro**
- **UF**: Dropdown com estados brasileiros
- **Município**: Campo editável
- **Endereço de Entrega**: Checkbox para endereço diferente

### Aba 2: Contato

#### Informações Principais
- **Site**: URL do cliente
- **E-mail Principal**
- **Telefone Fixo**: Com máscara (11) 3000-0000
- **Telefone Celular**: Com máscara (11) 90000-0000

#### Pessoas de Contato
Tabela gerenciável com:
- Nome, Departamento, Cargo
- E-mail, Telefone Celular, Telefone Fixo, Ramal
- Ações: Adicionar, Editar, Excluir

### Aba 3: Condição Comercial

- **Empresa de Faturamento**: Empresa para faturar vendas
- **Vendedores Atribuídos**: Lista de vendedores com acesso
- **Lista de Preços**: Tabela de preços associada
- **Desconto Padrão**: Percentual (%)
- **Desconto Financeiro**: Percentual (%)
- **Pedido Mínimo**: Valor mínimo em R$
- **Condições de Pagamento**: Seleção múltipla com:
  - Forma de pagamento (PIX, Boleto, Cartão)
  - Prazo (ex: 30, 30/60, 30/60/90 dias)
  - Desconto extra
  - Valor de pedido mínimo

## 🔍 Funcionalidades da Listagem

### Filtros Disponíveis
- **Busca Textual**: Nome, CNPJ/CPF, E-mail
- **Situação**: Ativo, Inativo, Excluído
- **Segmento**: Todos os segmentos cadastrados

### Informações Exibidas
- Cliente (com ícone PF/PJ)
- Tipo de Pessoa
- CPF/CNPJ
- Segmento de Mercado
- Contatos (e-mail e telefone)
- Situação (badge colorido)

### Ações Disponíveis
- **Visualizar**: Ver detalhes (somente leitura)
- **Editar**: Modificar cadastro
- **Excluir**: Remover cliente (com confirmação)

## 📊 Dados Mockados

### Clientes
6 clientes pré-cadastrados com dados completos:
- 5 Pessoas Jurídicas
- 1 Pessoa Física
- Diferentes segmentos: Alimentar, Farmácia, Atacado, etc.

### Configurações
- **Grupos/Redes**: 3 grupos cadastrados
- **Segmentos**: 5 segmentos disponíveis
- **Listas de Preços**: 4 listas configuradas
- **Empresas de Faturamento**: 3 empresas
- **Condições de Pagamento**: 5 condições

## 🛠️ Tecnologias e Componentes

### Componentes Principais
- `CustomersListPage`: Listagem de clientes
- `CustomerFormPage`: Container das abas
- `CustomerFormDadosCadastrais`: Aba dados cadastrais
- `CustomerFormContato`: Aba contato
- `CustomerFormCondicaoComercial`: Aba condição comercial

### Context API
- `AuthContext`: Gerenciamento de autenticação e permissões

### Utilitários
- `/lib/masks.ts`: Máscaras e validações
  - CPF/CNPJ com validação
  - CEP, telefones
  - Validadores de e-mail

### UI Components (shadcn/ui)
- Form, Input, Select, Checkbox
- Table, Dialog, Alert Dialog
- Tabs, Badge, Button
- Toast (Sonner)

## 🔄 Fluxo de Navegação

```
Lista de Clientes
├── Novo Cliente → Formulário (Criar)
├── Visualizar → Formulário (Somente Leitura)
├── Editar → Formulário (Edição)
└── Excluir → Dialog Confirmação
```

## 📝 Validações Implementadas

### Campos Obrigatórios
- Razão Social/Nome Completo
- CPF/CNPJ
- Situação
- Segmento de Mercado
- Endereço completo (CEP, Logradouro, Número, Bairro, UF, Município)
- Empresa de Faturamento

### Validações Automáticas
- Formato de CPF (11 dígitos)
- Formato de CNPJ (14 dígitos)
- Formato de CEP (8 dígitos)
- Formato de e-mail
- Limitação de percentuais (0-99)

## 🌐 Integrações

### ViaCEP
- Busca automática de endereço por CEP
- Preenchimento automático dos campos:
  - Logradouro
  - Bairro
  - Município
  - UF

### Futuras Integrações (Preparadas)
- **SINTEGRA**: Busca de Inscrição Estadual
- **Receita Federal**: Consulta de dados CNPJ
- **ERP**: Sincronização via API
  - Configurável por empresa
  - Suporte para TOTVS, SAP, Omie

## 🔒 Permissões

### Lista de Permissões
- `clientes.visualizar`: Ver lista de clientes
- `clientes.criar`: Criar novos clientes
- `clientes.editar`: Editar clientes existentes
- `clientes.excluir`: Remover clientes
- `clientes.todos`: Ver todos os clientes (backoffice)

### Aplicação de Permissões
- Botões e ações condicionais baseadas em permissões
- Filtro automático por vendedor atribuído
- Mensagens contextuais para vendedores

## 📱 Responsividade

- Layout adaptável para desktop, tablet e mobile
- Tabelas com scroll horizontal em telas pequenas
- Formulários com grids responsivos
- Menu mobile com Sheet lateral

## 🚀 Próximas Implementações

### Funcionalidades Pendentes
1. **Endereço de Entrega Completo**: Finalizar campos do endereço de entrega
2. **Integração SINTEGRA**: Busca de IE por CNPJ
3. **Busca Avançada de CNPJ**: Integração com Receita Federal
4. **Histórico de Alterações**: Auditoria de mudanças
5. **Importação em Lote**: Upload de CSV/Excel
6. **Exportação**: Download da lista em diversos formatos

### Melhorias Planejadas
1. **Paginação**: Para grandes volumes de dados
2. **Ordenação**: Colunas clicáveis para ordenar
3. **Filtros Avançados**: Mais opções de filtro
4. **Favoritos**: Marcar clientes favoritos
5. **Tags**: Sistema de etiquetas personalizadas

## 📖 Como Usar

### Criar Novo Cliente
1. Clique em "Novo Cliente"
2. Preencha a aba "Dados Cadastrais"
3. Adicione informações de contato na aba "Contato"
4. Configure condições comerciais na aba correspondente
5. Clique em "Salvar Cliente"

### Editar Cliente
1. Na lista, clique no menu (⋮) do cliente
2. Selecione "Editar"
3. Modifique os dados necessários
4. Clique em "Salvar Cliente"

### Gerenciar Vendedores Atribuídos
1. Acesse a aba "Condição Comercial"
2. Clique em "Adicionar Vendedor"
3. Selecione o vendedor no dropdown
4. Clique em "Adicionar"

### Configurar Condições de Pagamento
1. Acesse a aba "Condição Comercial"
2. Clique em "Gerenciar Condições"
3. Marque as condições disponíveis para o cliente
4. Clique em "Salvar"

## 💡 Dicas

- Use a busca por CEP para agilizar o cadastro
- Configure vendedores atribuídos para controle de acesso
- Defina pedido mínimo para validar vendas
- Associe condições de pagamento adequadas ao perfil do cliente
