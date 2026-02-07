# Documentação do Sistema de Comissões de Vendedores

Este documento descreve o funcionamento do cálculo e geração de comissões para vendedores no sistema, detalhando as tabelas envolvidas, triggers e a lógica de negócio implementada no banco de dados.

## Visão Geral

O sistema calcula comissões automaticamente sempre que um pedido de venda é atualizado. A lógica é baseada em triggers no banco de dados PostgreSQL (Supabase), garantindo que as regras de negócio sejam aplicadas de forma consistente, independentemente da origem da atualização (frontend, integração, etc.).

## Estrutura de Dados Envolvida

As principais tabelas envolvidas no processo são:

### 1. `pedido_venda`
Armazena os dados dos pedidos.
*   **Colunas Chave:** `pedido_venda_ID`, `vendedor_uuid`, `valor_total`, `natureza_operacao`, `cliente_id`, `data_venda`.
*   **Trigger:** `pedido_venda_au_generate_comissao` (Acionada após UPDATE).

### 2. `vendedor_comissão`
Armazena os registros de comissões geradas.
*   **Colunas:** `vendedor_comissao_id`, `vendedor_uuid`, `pedido_id`, `valor_comissao`, `valor_total`, `percentual_comissao` (implícito no cálculo), `efetivada`, `debito`.

### 3. `dados_vendedor`
Contém as configurações de comissão de cada vendedor.
*   **Colunas:** `user_id`, `Comissão` (Define o tipo de cálculo), `aliquotafixa`.
    *   `Comissão = 1`: Comissão por Tabela de Preço.
    *   `Comissão = 2`: Comissão Fixa (usa o campo `aliquotafixa`).

### 4. `listas_preco_comissionamento`
Tabela auxiliar para regras de comissão baseadas em listas de preço.
*   **Colunas:** `lista_preco_id`, `desconto_minimo`, `desconto_maximo`, `comissao`.

### 5. `cliente`
Usada para obter a lista de preço e desconto padrão associados ao cliente do pedido.
*   **Colunas:** `cliente_id`, `lista_de_preco`, `desconto`.

---

## Fluxo de Execução

1.  **Evento:** Um registro na tabela `pedido_venda` é atualizado (`UPDATE`).
2.  **Trigger:** O banco dispara a trigger `pedido_venda_au_generate_comissao`.
3.  **Chamada:** A trigger executa a função `tg_pedido_venda_generate_comissao()`.
4.  **Processamento:** Esta função, por sua vez, chama a procedure principal `generate_vendedor_comissao(pedido_id)`.

## Lógica de Cálculo (`generate_vendedor_comissao`)

A função `generate_vendedor_comissao` implementa as seguintes regras de negócio, em ordem:

### 1. Validações Iniciais
*   **Existência:** Verifica se o pedido existe.
*   **Vendedor:** Verifica se o pedido possui um `vendedor_uuid` associado.
*   **Bonificação:** Se a `natureza_operacao` do pedido for **'Bonificação'**, o processo é interrompido e **nenhuma comissão é gerada**.
*   **Duplicidade:** Verifica se já existe um registro na tabela `vendedor_comissão` para este `pedido_id`. Se existir, o processo é interrompido para evitar duplicidade.

### 2. Determinação do Tipo de Comissão
O sistema consulta a tabela `dados_vendedor` para determinar o método de cálculo (`v_tipo_comissao`):

#### Caso A: Comissão Fixa (`Comissão = 2`)
*   O percentual de comissão é obtido diretamente do campo `aliquotafixa` do cadastro do vendedor.

#### Caso B: Comissão por Tabela (`Comissão = 1`)
*   O sistema busca a `lista_de_preco` e o `desconto` configurados no cadastro do **Cliente** associado ao pedido.
*   Com essas informações, consulta a tabela `listas_preco_comissionamento` para encontrar o percentual de comissão.
*   **Regra de Faixa:** O percentual é selecionado onde o desconto do cliente se encaixa entre `desconto_minimo` e `desconto_maximo` da lista de preço.
*   Se nenhuma regra for encontrada, o percentual é assumido como 0%.

### 3. Cálculo do Valor
O valor da comissão é calculado da seguinte forma:
```sql
v_valor_comissao = (v_pedido.valor_total * v_percentual / 100)
```
*   O resultado é arredondado para 2 casas decimais.

### 4. Persistência
Um novo registro é inserido na tabela `vendedor_comissão` com:
*   `vendedor_uuid`: ID do vendedor.
*   `data_inicio` e `data_final`: Data da venda.
*   `valor_total`: Valor total do pedido.
*   `valor_comissao`: Valor calculado.
*   `efetivada`: `true`.
*   `debito`: `false`.
*   `pedido_id`: ID do pedido que originou a comissão.

---

## Observações Importantes

*   **Recálculo Automático:** A lógica foi atualizada para **recalcular** o valor da comissão sempre que o pedido sofrer alterações.
    *   Se o pedido já tiver uma comissão gerada, o sistema atualizará o `valor_total`, `valor_comissao` e `percentual_comissao` do registro existente na tabela `vendedor_comissão`.
    *   Este comportamento garante que alterações de valor ou correção de dados no pedido reflitam imediatamente na comissão do vendedor.
*   **Trigger de Insert:** Atualmente, a trigger está configurada apenas para `UPDATE`. Isso implica que comissões não são geradas no momento exato da criação do pedido (INSERT), mas sim na primeira atualização subsequente. Confirmar se este é o comportamento desejado.
*   **Natureza de Operação:** A verificação string `'Bonificação'` no código é *case-sensitive* e depende da escrita exata no banco.

## Definições Técnicas (SQL)

### Trigger
```sql
CREATE TRIGGER pedido_venda_au_generate_comissao
AFTER UPDATE ON public.pedido_venda
FOR EACH ROW
EXECUTE FUNCTION tg_pedido_venda_generate_comissao();
```

### Funções Relacionadas
*   `tg_pedido_venda_generate_comissao`: Wrapper que chama a função de lógica e loga o resultado.
*   `generate_vendedor_comissao(p_pedido_id bigint)`: Contém a regra de negócio detalhada acima.
