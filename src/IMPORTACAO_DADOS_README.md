# Sistema de Importação de Dados em Massa

## Visão Geral

O sistema possui funcionalidades completas de importação de dados em massa via planilhas Excel (.xlsx, .xls) para popular rapidamente o sistema com dados históricos ou fazer cadastros em lote.

**Novidades:**
- ✅ **Preview de Dados** - Visualize os dados antes de importar
- ✅ **Validação em Tempo Real** - Veja erros antes de confirmar
- ✅ **Histórico Completo** - Rastreie todas as importações realizadas
- ✅ **Importação Seletiva** - Importe apenas registros válidos

## Localização

**Configurações > Importações**

A tela de importações está organizada em 7 abas:
1. **Vendas** - Importar vendas/pedidos anteriores
2. **Clientes** - Importar cadastros de clientes
3. **Produtos** - Importar produtos
4. **Vendedores** - Importar vendedores/equipe
5. **Histórico** - Visualizar todas as importações realizadas
6. **Exportar Dados** ⭐ NOVO - Exportar dados para Excel

**Funcionalidades Principais:**
- 📥 Importação com preview e validação
- 📊 Histórico completo com possibilidade de desfazer
- 📤 Exportação individual ou backup completo

## Funcionalidades

### 1. Importação de Vendas

**Objetivo:** Importar vendas anteriores à utilização do sistema para compor dados históricos e estatísticas.

**Campos da Planilha:**
- **Obrigatórios:**
  - Número Pedido
  - Data Pedido (DD/MM/AAAA)
  - CNPJ Cliente
  - Nome Cliente
  - Vendedor (Email)
  - SKU Produto 1, Quantidade 1, Valor Unitário 1

- **Opcionais:**
  - Empresa Faturamento
  - Natureza Operação
  - Lista de Preço
  - Condição Pagamento
  - Status
  - SKU Produto 2/3 (até 3 produtos por linha)
  - Desconto Extra (%)
  - Ordem Compra Cliente
  - Observações Internas

**Status Disponíveis:**
- Rascunho
- Em Análise
- Aprovado
- Faturado
- Cancelado
- Em Separação
- Enviado

**Observações:**
- Você pode adicionar até 3 produtos por venda na planilha
- Para vendas com mais produtos, crie múltiplas linhas com o mesmo número de pedido
- O sistema validará se o vendedor e cliente existem

---

### 2. Importação de Clientes

**Objetivo:** Cadastrar clientes em massa via planilha.

**Campos da Planilha:**
- **Obrigatórios:**
  - Tipo Pessoa (Pessoa Física ou Pessoa Jurídica)
  - CPF/CNPJ
  - Razão Social
  - CEP
  - Logradouro
  - Número
  - Bairro
  - UF
  - Município

- **Opcionais:**
  - Nome Fantasia
  - Inscrição Estadual
  - Situação (Ativo, Inativo, Excluído)
  - Segmento Mercado
  - Grupo/Rede
  - Complemento
  - Site
  - Email Principal
  - Email NF-e
  - Telefone Fixo
  - Telefone Celular
  - Empresa Faturamento
  - Vendedor (Email)
  - Lista de Preços
  - Desconto Padrão (%)
  - Desconto Financeiro (%)
  - Pedido Mínimo (R$)
  - Status Aprovação (aprovado, pendente, rejeitado)
  - Observações Internas

**Validações:**
- Tipo Pessoa deve ser "Pessoa Física" ou "Pessoa Jurídica"
- Situação deve ser "Ativo", "Inativo" ou "Excluído"
- Status Aprovação deve ser "aprovado", "pendente" ou "rejeitado"
- CPF/CNPJ são validados

---

### 3. Importação de Produtos

**Objetivo:** Cadastrar produtos em massa.

**Campos da Planilha:**
- **Obrigatórios:**
  - Descrição
  - Código SKU
  - Marca
  - Tipo Produto
  - Unidade (Sigla)
  - Peso Líquido (kg)
  - Peso Bruto (kg)

- **Opcionais:**
  - Código EAN (8 ou 13 dígitos)
  - NCM (8 dígitos)
  - CEST (7 dígitos)
  - Situação (Ativo, Inativo, Excluído)
  - Disponível para Venda (Sim/Não)

**Validações:**
- Peso Bruto deve ser maior ou igual ao Peso Líquido
- Pesos não podem ser negativos
- EAN deve ter 8 ou 13 dígitos
- NCM deve ter 8 dígitos
- CEST deve ter 7 dígitos
- Situação: "Ativo", "Inativo" ou "Excluído"
- Disponível para Venda: "Sim" ou "Não"

**Observações:**
- Se a Marca ou Tipo de Produto não existirem, serão criados automaticamente

---

### 4. Importação de Vendedores

**Objetivo:** Cadastrar vendedores/equipe em massa.

**Campos da Planilha:**
- **Obrigatórios:**
  - Nome
  - CPF
  - Email
  - Telefone
  - Data Admissão (DD/MM/AAAA)

- **Opcionais:**
  - Iniciais
  - Status (ativo, inativo, excluido)
  - CNPJ
  - Razão Social
  - Nome Fantasia
  - Inscrição Estadual
  - CEP
  - Logradouro
  - Número
  - Complemento
  - Bairro
  - UF
  - Município
  - Banco
  - Agência
  - Dígito Agência
  - Tipo Conta (corrente, poupanca, salario, pagamento)
  - Número Conta
  - Dígito Conta
  - Nome Titular
  - CPF/CNPJ Titular
  - Tipo Chave PIX (cpf_cnpj, email, telefone, aleatoria)
  - Chave PIX
  - Regra Comissão (aliquota_fixa, lista_preco)
  - Alíquota Fixa (%) - obrigatório se Regra Comissão for "aliquota_fixa"
  - Criar Usuário (Sim/Não) - se Sim, será enviado convite por email
  - Observações Internas

**Validações:**
- Email deve ser válido
- Status: "ativo", "inativo" ou "excluido"
- Tipo Conta: "corrente", "poupanca", "salario" ou "pagamento"
- Tipo Chave PIX: "cpf_cnpj", "email", "telefone" ou "aleatoria"
- Regra Comissão: "aliquota_fixa" ou "lista_preco"
- Se Regra Comissão = "aliquota_fixa", Alíquota Fixa (0-100%) é obrigatória

---

## Como Usar

### Passo a Passo (Novo Fluxo com Preview)

1. **Acesse Configurações > Importações**
2. **Selecione a aba** do tipo de dado que deseja importar
3. **Baixe a planilha modelo** clicando em "Baixar Planilha Modelo"
4. **Preencha a planilha** com seus dados seguindo o exemplo fornecido
5. **Salve o arquivo** no formato Excel (.xlsx)
6. **Selecione o arquivo** clicando em "Selecionar Arquivo para Preview"
7. **Visualize o Preview:**
   - Veja estatísticas: Total, Válidos, Com Erro
   - Revise as primeiras 10 linhas dos dados
   - Verifique erros encontrados (se houver)
   - Cada linha mostra status de validação (OK ou Erro)
8. **Decida:**
   - Se todos os dados estão corretos: clique em "Confirmar Importação"
   - Se há erros: clique em "Cancelar", corrija o arquivo e tente novamente
   - Ou importe apenas os registros válidos
9. **Aguarde o processamento** - o sistema importará os dados
10. **Verifique o resultado:**
    - ✅ Mensagem de sucesso com quantidade de registros importados
    - 📊 Acesse a aba "Histórico" para ver detalhes completos

### Dicas Importantes

- **Sempre use a planilha modelo** - ela já tem o formato correto
- **Não altere os nomes das colunas** - o sistema usa esses nomes para processar
- **Atenção aos formatos:**
  - Datas: DD/MM/AAAA
  - Percentuais: número sem símbolo (ex: 5 para 5%)
  - Valores: usar ponto como separador decimal (ex: 100.50)
- **Campos obrigatórios** devem estar sempre preenchidos
- **Validações** são feitas antes da importação - corrija os erros e tente novamente
- **Erros comuns:**
  - Formato de data incorreto
  - CPF/CNPJ inválido
  - Campos obrigatórios vazios
  - Valores fora do intervalo permitido

### Tratamento de Erros

O sistema valida **TODOS** os dados antes de importar qualquer registro. Se houver erros:

1. **Nenhum dado é importado** até que todos os erros sejam corrigidos
2. **Lista de erros** mostra:
   - Número da linha com problema
   - Descrição do erro
   - Primeiros 10 erros (se houver mais, um contador é exibido)
3. **Corrija os erros** na planilha e importe novamente

---

## Histórico de Importações

### Visão Geral

A aba **Histórico** registra todas as importações realizadas no sistema, permitindo rastreabilidade completa.

### Informações Registradas

Para cada importação, o sistema armazena:
- **Data/Hora** - Quando a importação foi realizada
- **Tipo** - Vendas, Clientes, Produtos ou Vendedores
- **Arquivo** - Nome do arquivo importado
- **Usuário** - Quem realizou a importação
- **Total de Linhas** - Quantidade total de registros no arquivo
- **Sucessos** - Quantidade de registros importados com sucesso
- **Erros** - Quantidade de registros com erro
- **Status** - Sucesso, Sucesso Parcial ou Erro
- **Detalhes dos Erros** - Lista completa de erros encontrados (linha e mensagem)

### Filtros Disponíveis

- **Todos** - Exibe todas as importações
- **Vendas** - Apenas importações de vendas
- **Clientes** - Apenas importações de clientes
- **Produtos** - Apenas importações de produtos
- **Vendedores** - Apenas importações de vendedores

### Visualizar Detalhes

Clique em **"Detalhes"** em qualquer importação para ver:
1. **Informações Gerais**
   - Tipo, Data/Hora, Arquivo, Usuário

2. **Estatísticas**
   - Total de Linhas, Importados, Erros

3. **Status da Importação**
   - ✅ Sucesso - 100% importado
   - ⚠️ Sucesso Parcial - Alguns erros
   - ❌ Erro - Nenhum registro importado

4. **Erros Detalhados** (se houver)
   - Tabela com linha e descrição de cada erro

### Status da Importação

**Sucesso** 
- Todos os registros foram importados
- Nenhum erro encontrado
- Badge verde com ícone de check

**Sucesso Parcial**
- Alguns registros foram importados
- Alguns registros tiveram erro
- Badge amarelo com ícone de alerta

**Erro**
- Nenhum registro foi importado
- Todos os registros tiveram erro
- Badge vermelho com ícone de X

---

## Preview de Dados

### Como Funciona

Ao selecionar um arquivo para importação, o sistema:

1. **Lê o arquivo** sem importar nada
2. **Valida todos os registros** linha por linha
3. **Exibe estatísticas:**
   - Total de registros
   - Registros válidos (verde)
   - Registros com erro (vermelho)

4. **Mostra preview visual:**
   - Tabela com as primeiras 10 linhas
   - Cada linha com indicador de validação
   - Linhas com erro destacadas em vermelho

5. **Lista erros detalhados:**
   - Número da linha
   - Descrição do problema

### Vantagens do Preview

✅ **Evita Surpresas** - Veja os problemas antes de importar
✅ **Economia de Tempo** - Corrija tudo de uma vez
✅ **Maior Controle** - Decida se importa parcialmente ou corrige tudo
✅ **Transparência** - Visualize exatamente o que será importado
✅ **Validação Antecipada** - Todas as regras aplicadas antes da importação

### Ações no Preview

**Cancelar**
- Fecha o preview
- Nenhum dado é importado
- Permite corrigir o arquivo

**Confirmar Importação**
- Importa apenas os registros válidos
- Registros com erro são ignorados
- Exibe resultado final após importação

---

## Componentes Técnicos

### Arquivos do Sistema

```
/components/
  ├── DataImportSettings.tsx       # Componente principal com abas
  ├── ImportSalesData.tsx           # Importação de vendas (com preview)
  ├── ImportCustomersData.tsx       # Importação de clientes (com preview)
  ├── ImportProductsData.tsx        # Importação de produtos
  ├── ImportSellersData.tsx         # Importação de vendedores
  ├── ImportHistoryView.tsx         # Visualização de histórico (com desfazer)
  └── DataExportSettings.tsx        # Exportação de dados

/services/
  ├── importService.ts              # Serviço de rollback/desfazer
  └── exportService.ts              # Serviço de exportação

/types/
  └── importHistory.ts              # Tipos do histórico

/data/
  └── mockImportHistory.ts          # Dados mockados de histórico
```

### Biblioteca Utilizada

**xlsx** - Biblioteca para leitura e escrita de arquivos Excel
- Leitura de arquivos .xlsx e .xls
- Geração de planilhas modelo
- Conversão de dados para JSON

### Fluxo de Processamento (Com Preview)

**Fase 1: Carregamento e Preview**
1. **Usuário seleciona arquivo** → Input file type="file"
2. **Arquivo é lido** → `XLSX.read()`
3. **Conversão para JSON** → `XLSX.utils.sheet_to_json()`
4. **Validação de cada linha:**
   - Campos obrigatórios
   - Formato dos dados
   - Regras de negócio
5. **Acumulação de erros** → Array de erros com linha e mensagem
6. **Exibição do Preview:**
   - Estatísticas gerais
   - Tabela com primeiras 10 linhas
   - Lista de erros encontrados
   - Botões de ação

**Fase 2: Confirmação e Importação**
7. **Usuário decide:**
   - Cancelar → volta ao início
   - Confirmar → prossegue com importação
8. **Importação dos registros válidos** → Salvar no sistema
9. **Registro no histórico:**
   - Data/hora, usuário, arquivo
   - Estatísticas de sucesso/erro
   - Detalhes dos erros
10. **Feedback ao usuário** → Sucesso com resumo

---

## Integrações Futuras

### Com Banco de Dados Real (Supabase)

Quando integrado ao Supabase, o sistema deverá:

1. **Validar existência de referências:**
   - Verificar se vendedor existe (por email)
   - Verificar se cliente existe (por CNPJ)
   - Verificar se marca/tipo de produto existe

2. **Criar registros relacionados:**
   - Criar marcas/tipos de produto que não existem
   - Criar vendedores se necessário
   - Associar produtos a vendas

3. **Transações:**
   - Importação atômica (tudo ou nada)
   - Rollback em caso de erro em qualquer registro

4. **Auditoria:**
   - Registrar quem importou
   - Data/hora da importação
   - Quantidade de registros

5. **Notificações:**
   - Email para administrador sobre importações
   - Logs de importação

---

## Melhorias Futuras

### Funcionalidades Planejadas

1. **Importação Incremental:**
   - Permitir importar apenas novos registros
   - Atualizar registros existentes (merge)

2. **Validação Avançada:**
   - Verificar duplicatas antes de importar
   - Sugerir correções automáticas

3. **Preview:**
   - Mostrar preview dos dados antes de importar
   - Permitir edição inline antes da importação

4. **Histórico:**
   - Manter histórico de importações
   - Permitir desfazer importação

5. **Templates Personalizados:**
   - Permitir usuário criar templates customizados
   - Mapear colunas diferentes

6. **Importação Assíncrona:**
   - Para grandes volumes de dados
   - Progress bar com status

7. **Validação Customizada:**
   - Regras de validação configuráveis
   - Scripts de transformação de dados

8. **Exportação:**
   - Exportar dados atuais para Excel
   - Usar como backup ou análise

---

## Suporte e Troubleshooting

### Problemas Comuns

**1. "Erro ao ler arquivo"**
- Verificar se o arquivo é .xlsx ou .xls válido
- Tentar salvar novamente no Excel
- Verificar se não está corrompido

**2. "Campos obrigatórios vazios"**
- Verificar se todos os campos marcados como obrigatórios estão preenchidos
- Não deixar linhas em branco no meio dos dados

**3. "Formato de data inválido"**
- Usar sempre DD/MM/AAAA
- Exemplo: 01/01/2024

**4. "CPF/CNPJ inválido"**
- Verificar dígitos verificadores
- Pode usar com ou sem formatação

**5. "Vendedor não encontrado"**
- Importar vendedores primeiro
- Usar o email exato do vendedor

**6. "Produto já existe com esse SKU"**
- SKUs devem ser únicos
- Verificar se já está cadastrado

### Contato para Suporte

Para dúvidas ou problemas:
1. Verificar este documento primeiro
2. Consultar as instruções na tela de importação
3. Contatar administrador do sistema

---

## Changelog

### Versão 1.2.0 - 2024-11-01
- ✅ **Exportação de Dados para Excel**
  - Exportação individual (Vendas, Clientes, Produtos, Vendedores)
  - Backup completo do sistema (arquivo único com múltiplas abas)
  - Nomenclatura automática com timestamp
  - Formatação otimizada para Excel
  - Compatível com reimportação
  - Interface dedicada na aba "Exportar Dados"
- ✅ **Desfazer Importação (Rollback)**
  - Botão "Desfazer" no histórico de importações
  - Remoção completa dos registros importados
  - Diálogo de confirmação com alerta
  - Rastreamento de importações reversíveis
  - Notificações de sucesso/erro
  - Auditoria de ações de rollback
- ✅ **Melhorias na Interface**
  - Nova aba "Exportar Dados" (7 abas no total)
  - Cards visuais para cada tipo de exportação
  - Estatísticas detalhadas pós-exportação
  - Botões contextuais no histórico

### Versão 1.1.0 - 2024-11-01
- ✅ **Preview de Dados** antes da importação
  - Visualização das primeiras 10 linhas
  - Estatísticas: Total, Válidos, Com Erro
  - Indicadores visuais de validação por linha
  - Lista detalhada de erros encontrados
  - Opção de cancelar ou confirmar importação
- ✅ **Histórico de Importações**
  - Registro completo de todas as importações
  - Filtros por tipo de importação
  - Detalhes de cada importação (estatísticas e erros)
  - Status: Sucesso, Sucesso Parcial, Erro
  - Rastreabilidade (usuário, data/hora, arquivo)
- ✅ **Melhorias de UX**
  - Processo em duas etapas (preview → confirmação)
  - Importação seletiva (apenas registros válidos)
  - Feedback mais detalhado
  - Melhor visualização de erros

### Versão 1.0.0 - 2024-10-31
- ✅ Sistema de importação de vendas
- ✅ Sistema de importação de clientes
- ✅ Sistema de importação de produtos
- ✅ Sistema de importação de vendedores
- ✅ Geração de planilhas modelo
- ✅ Validação completa de dados
- ✅ Feedback visual de erros e sucessos
- ✅ Integração com tela de Configurações
