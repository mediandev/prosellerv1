# Teste do Sistema de Condições de Pagamento

## Como Testar

### 1. Acessar as Configurações

1. Abra a aplicação
2. Clique em **"Configurações"** no menu lateral
3. Navegue até a aba **"Condições de Pagamento"**

### 2. Visualizar Condições Pré-Cadastradas

Você verá 10 condições de pagamento já cadastradas para demonstração:

#### À Vista com Desconto
- **À Vista - PIX com 5% desconto**
  - Forma: PIX
  - Prazo: 0 dias (à vista)
  - Desconto: 5%
  - Valor mínimo: R$ 0,00
  
- **À Vista - Dinheiro com 3% desconto**
  - Forma: Dinheiro
  - Prazo: 0 dias
  - Desconto: 3%
  - Valor mínimo: R$ 0,00

#### Prazo Simples
- **30 dias - Transferência**
  - Forma: Transferência Bancária
  - Prazo: 30 dias
  - Desconto: 0%
  - Valor mínimo: R$ 500,00

- **45 dias - PIX**
  - Forma: PIX
  - Prazo: 45 dias
  - Desconto: 0%
  - Valor mínimo: R$ 1.500,00

#### Parcelado
- **2x (30/60 dias) - Cheque**
  - Forma: Cheque
  - Prazo: 2 parcelas (30 e 60 dias)
  - Desconto: 0%
  - Valor mínimo: R$ 1.000,00

- **3x (30/60/90 dias) - Depósito**
  - Forma: Depósito Bancário
  - Prazo: 3 parcelas
  - Desconto: 0%
  - Valor mínimo: R$ 2.000,00

- **4x (30/60/90/120 dias) - Transferência**
  - Forma: Transferência Bancária
  - Prazo: 4 parcelas
  - Desconto: 0%
  - Valor mínimo: R$ 5.000,00

### 3. Criar Nova Condição

Clique no botão **"Nova Condição"** e preencha:

**Exemplo 1: Condição de Desconto Promocional**
```
Nome: Promoção Black Friday - 10% OFF
Forma de Pagamento: PIX
Prazo de Pagamento: 0
Desconto Extra: 10
Valor de Pedido Mínimo: 1000
```

**Exemplo 2: Prazo Estendido para Grandes Pedidos**
```
Nome: 5x sem juros - Grandes Pedidos
Forma de Pagamento: Transferência Bancária
Prazo de Pagamento: 30/60/90/120/150
Desconto Extra: 0
Valor de Pedido Mínimo: 20000
```

**Exemplo 3: Desconto Progressivo**
```
Nome: Super Desconto - Compra Acima de 5k
Forma de Pagamento: PIX
Prazo de Pagamento: 0
Desconto Extra: 7.5
Valor de Pedido Mínimo: 5000
```

### 4. Validações Testadas

#### ✅ Teste 1: Nome Vazio
1. Deixe o campo "Nome" vazio
2. Clique em "Salvar"
3. **Resultado esperado:** Toast de erro "Preencha o nome da condição de pagamento"

#### ✅ Teste 2: Forma de Pagamento Não Selecionada
1. Preencha apenas o nome
2. Não selecione forma de pagamento
3. Clique em "Salvar"
4. **Resultado esperado:** Toast de erro "Selecione uma forma de pagamento"

#### ✅ Teste 3: Prazo Inválido
Tente os seguintes valores inválidos:

**Formato inválido:**
```
Prazo: abc123
Resultado: "Formato inválido. Use números separados por barra"
```

**Ordem decrescente:**
```
Prazo: 60/30
Resultado: "Os prazos devem estar em ordem crescente"
```

**Barras duplas:**
```
Prazo: 30//60
Resultado: "Formato inválido"
```

#### ✅ Teste 4: Desconto Fora do Limite
```
Desconto Extra: 150
Resultado: "O desconto extra deve estar entre 0 e 100%"
```

```
Desconto Extra: -5
Resultado: "O desconto extra deve estar entre 0 e 100%"
```

#### ✅ Teste 5: Valor Mínimo Negativo
```
Valor de Pedido Mínimo: -100
Resultado: "O valor de pedido mínimo não pode ser negativo"
```

### 5. Funcionalidades Testáveis

#### Toggle Status Ativo/Inativo
1. Localize uma condição ativa na lista
2. Clique no badge "Ativo"
3. **Resultado:** Badge muda para "Inativo" e a linha fica com opacidade reduzida
4. Clique novamente
5. **Resultado:** Volta para "Ativo"

#### Deletar Condição
1. Clique no ícone de lixeira (🗑️) de uma condição
2. **Resultado:** Condição é removida da lista
3. **Resultado:** Toast de sucesso mostrando o nome da condição removida

#### Visualizar Informações
Observe os ícones e informações na tabela:

- **Ícone de Cartão de Crédito:** Indica a forma de pagamento
- **Ícone de Calendário:** Mostra o prazo formatado
- **Ícone de Porcentagem (verde):** Mostra desconto extra (se > 0%)
- **Ícone de Cifrão:** Mostra valor mínimo formatado em moeda

### 6. Casos de Uso Reais

#### Caso 1: Cliente VIP - Grandes Volumes
**Objetivo:** Criar condições especiais para clientes premium

**Condições sugeridas:**
1. À vista com 8% de desconto (mínimo R$ 10.000)
2. 60 dias sem desconto (mínimo R$ 15.000)
3. 4x sem juros (mínimo R$ 20.000)

#### Caso 2: Promoção de Final de Ano
**Objetivo:** Incentivar vendas à vista

**Condições sugeridas:**
1. PIX com 12% desconto (sem mínimo)
2. Dinheiro com 10% desconto (sem mínimo)
3. Cartão de débito com 8% desconto (sem mínimo)

#### Caso 3: Parceria com Fornecedor
**Objetivo:** Oferecer prazos longos para parceiros

**Condições sugeridas:**
1. 6x (30/60/90/120/150/180) - mínimo R$ 30.000
2. 90 dias - mínimo R$ 25.000
3. 120 dias - mínimo R$ 40.000

### 7. Verificar Integração com Formas de Pagamento

1. Vá para a aba **"Formas de Pagamento"**
2. Localize uma forma ativa (ex: PIX)
3. Verifique se o switch **"Condições de Pagamento"** está habilitado
4. Volte para **"Condições de Pagamento"**
5. Ao criar nova condição, o PIX deve aparecer no dropdown

**Teste de Desabilitação:**
1. Volte para **"Formas de Pagamento"**
2. Desabilite o switch "Condições de Pagamento" de uma forma (ex: Cheque)
3. Volte para **"Condições de Pagamento"**
4. Tente criar nova condição
5. **Resultado:** Cheque não aparece mais no dropdown

### 8. Campos Informativos

Verifique os cards informativos na parte inferior da página:

#### Card "Como funcionam as Condições de Pagamento"
- Explicação sobre associação com cliente
- Disponibilidade na venda
- Validação de valor mínimo
- Desconto extra automático

#### Alertas
- **Azul (ℹ️):** Informações sobre formato de prazo
- **Amarelo (⚠️):** Aviso sobre dependência de formas de pagamento
- **Verde (💡):** Exemplo prático de uso

### 9. Estatísticas

Observe o rodapé da tabela:

```
Total: 10 condições cadastradas (9 ativas)
```

Essa informação deve atualizar dinamicamente ao:
- Adicionar nova condição
- Deletar condição
- Ativar/desativar condição

### 10. Responsividade

Teste a interface em diferentes tamanhos de tela:

**Desktop (> 1024px):**
- Tabela com todas as colunas visíveis
- Dialog de criação em largura máxima de 2xl

**Tablet (768px - 1024px):**
- Tabela com scroll horizontal se necessário
- Layout responsivo do dialog

**Mobile (< 768px):**
- Tabs empilhadas
- Tabela otimizada para mobile

---

## Checklist de Testes

### Funcionalidades Básicas
- [ ] Visualizar condições pré-cadastradas
- [ ] Criar nova condição com dados válidos
- [ ] Editar status (ativo/inativo)
- [ ] Deletar condição
- [ ] Visualizar estatísticas

### Validações
- [ ] Nome vazio
- [ ] Forma de pagamento não selecionada
- [ ] Prazo de pagamento vazio
- [ ] Prazo com formato inválido
- [ ] Prazo em ordem decrescente
- [ ] Desconto < 0
- [ ] Desconto > 100
- [ ] Valor mínimo negativo

### Integração
- [ ] Filtro de formas de pagamento (apenas com switch habilitado)
- [ ] Atualização dinâmica ao modificar formas de pagamento
- [ ] Toast de sucesso ao criar
- [ ] Toast de sucesso ao deletar
- [ ] Toast de erro nas validações

### Interface
- [ ] Ícones corretos em cada coluna
- [ ] Formatação de moeda
- [ ] Formatação de prazo
- [ ] Destaque visual para desconto
- [ ] Opacidade para inativos
- [ ] Cards informativos
- [ ] Responsividade

---

## Problemas Conhecidos e Soluções

### Problema 1: Formas de Pagamento Não Aparecem
**Causa:** Nenhuma forma tem o switch "Condições de Pagamento" habilitado  
**Solução:** Vá para aba "Formas de Pagamento" e habilite pelo menos uma

### Problema 2: Condição Criada Não Aparece
**Causa:** Estado não atualizado  
**Solução:** Verifique se o `setCondicoesPagamento` está sendo chamado corretamente

### Problema 3: Toast Não Aparece
**Causa:** Componente Toaster não está no App.tsx  
**Solução:** Verificar se `<Toaster />` está presente

---

## Métricas de Sucesso

Após os testes, o sistema deve:

✅ Permitir criação de condições sem erros  
✅ Validar todos os campos corretamente  
✅ Mostrar feedback visual apropriado  
✅ Manter consistência de dados  
✅ Integrar com formas de pagamento  
✅ Fornecer boa experiência de usuário  

---

## Próximos Passos Após Testes

1. ✅ **Sistema de Condições:** Implementado e testado
2. 🔜 **Integração com Clientes:** Adicionar campo de seleção no cadastro
3. 🔜 **Integração com Vendas:** Implementar lógica de filtro e validação
4. 🔜 **Cálculo de Parcelas:** Criar função helper
5. 🔜 **Relatórios:** Analytics de condições mais usadas

---

**Data dos Testes:** ___/___/_____  
**Testado por:** _________________  
**Status:** [ ] Aprovado [ ] Reprovado  
**Observações:** _________________
