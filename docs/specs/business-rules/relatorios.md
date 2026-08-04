# Relatórios

Domínio dos relatórios analíticos: Curva ABC (clientes e produtos), Mix de Produtos por Cliente, ROI de Clientes e Solicitado x Faturado. As regras abaixo governam quais dados entram nos cálculos, como são classificados/agregados e como são exportados.

## Regras de negócio

1. **Classificação ABC pelo acumulado ANTERIOR.** A classificação de curva ABC (A/B/C), tanto para clientes quanto para produtos, é determinada pelo percentual acumulado ANTES de incluir o cliente/produto atual, não depois. Curva A: `acumulado_anterior < 80%`; Curva B: `80% <= acumulado_anterior < 95%`; Curva C: `acumulado_anterior >= 95%`. (Confirmado em `CustomerABCReportPage` linhas 283–294 e `ProductABCReportPage` linhas 192–205 — comentários "CORREÇÃO" e "Agora sim, acumular" deixam a ordem explícita.)
   - *Por quê:* Garante classificação consistente e previsível; evita que clientes/produtos próximos dos limiares (80% e 95%) oscilem de curva conforme a ordem de ordenação. Usado para priorização de estoque e estratégia de vendas.
   - *Regressão:* Trocar para o percentual acumulado POSTERIOR faria todos os itens de fronteira mudarem de curva; usuários que dependem de segmentos ABC estáveis veriam mudanças inesperadas a cada execução do relatório.

2. **Registros excluídos logicamente (soft delete) ficam fora de tudo.** Clientes, produtos e vendas com `deleted_at IS NOT NULL` são excluídos de todos os relatórios. Registros excluídos nunca aparecem nem entram nos cálculos de ABC, Mix, ROI ou Solicitado/Faturado. "Excluído" no domínio significa exatamente `deleted_at NOT NULL` (não existe flag `excluido` separada). (Confirmado: RPC `list_pedido_venda_v2` linha 75 `WHERE pv.deleted_at IS NULL`; RPC `list_clientes_v2` linha 53 `WHERE c.deleted_at IS NULL`.)
   - *Por quê:* Mantém a integridade dos dados e evita que registros históricos excluídos inflem métricas. A trilha de auditoria é preservada no banco, mas o usuário vê apenas dados ativos e relevantes.
   - *Regressão:* Remover o filtro `deleted_at` faria clientes excluídos reaparecerem nos rankings ABC e nos relatórios de ROI, inflando totais e contaminando métricas com contas obsoletas.

3. **Vendedor só enxerga as próprias vendas/clientes.** Vendedores (`tipo='vendedor'`) só veem vendas onde `vendedor_uuid = seu ID` ou onde estão atribuídos em `cliente.vendedoresatribuidos`. Usuários de backoffice veem todos os dados. O filtro é aplicado no nível do RPC. (Confirmado: `list_pedido_venda_v2` linhas 137–139 e 177–181 `(v_is_backoffice OR pv.vendedor_uuid = p_requesting_user_id)`; `list_clientes_v2` linhas 101–108 exigem `criado_por = requisitante` OU `requisitante = ANY(vendedoresatribuidos)` E `status_aprovacao = 'aprovado'`.)
   - *Por quê:* Evita vazamento de vendas entre equipes. Cada vendedor vê apenas sua carteira e contas atribuídas, protegendo cálculos de comissão e desempenho.
   - *Regressão:* Remover o filtro de vendedor exporia todas as vendas da empresa a qualquer usuário autenticado, quebrando o isolamento entre equipes e permitindo disputas de comissão ou vazamento de dados.

4. **Paginação automática carrega o dataset completo.** Os relatórios percorrem automaticamente todas as páginas retornadas pela API (máx. 100 itens/página) até atingir `totalPages`, concatenando todos os resultados em memória. A UI não impõe limite padrão — o usuário recebe o dataset completo do período filtrado. (Confirmado: `api.ts` linhas 1754–1764, loop `while (page <= totalPages)`.)
   - *Por quê:* Garante que ABC, Mix e ROI considerem toda a população de clientes/produtos/vendas, não apenas os primeiros 100 registros, o que distorceria a análise para bases grandes (960+ clientes).
   - *Regressão:* Remover a paginação e devolver só a primeira página faria os relatórios exibirem dados incompletos; curvas ABC e métricas de ROI seriam calculadas sobre uma fração das vendas reais.

5. **Filtro "Concluídas" restringe a status de conclusão.** Quando `filters.statusVendas = 'concluidas'`, só entram vendas com status em `['Faturado', 'Pronto para envio', 'Enviado', 'Entregue', 'Não Entregue']` (utilitário `isStatusConcluido`). O padrão é `'todas'`, salvo seleção explícita de "Concluídas". (Confirmado: `statusVendaUtils.ts` linhas 36–49; `CustomerABCReportPage` linha 233 usa o filtro; padrão `'todas'` na linha 100.)
   - *Por quê:* Permite excluir vendas em andamento ('Rascunho', 'Em Análise', 'Aprovado') dos relatórios financeiros; garante que ROI e Mix reflitam apenas receita já faturada ou a faturar.
   - *Regressão:* Se o filtro 'concluidas' for ignorado, os relatórios misturariam rascunhos com notas faturadas, superestimando a receita e as métricas de ROI.

6. **Status Mix com três estados.** O status de ativação de produto (`status_mix`) para cada par (cliente, produto) tem três estados: `'ativo'`, `'inativo'` (explicitamente marcado) e `'sem_cadastro'` (estado virtual: não existe registro na tabela `status_mix`). A CHECK constraint do banco armazena apenas `'ativo'` e `'inativo'`; `'sem_cadastro'` é derivado no frontend quando não há registro. (Confirmado: `RelatorioMixCliente.tsx` linhas 267–273 — se existe registro usa ativo/inativo, senão retorna `'sem_cadastro'`.)
   - *Por quê:* Rastreia o sortimento de produtos por cliente; distingue produtos explicitamente desativados dos que nunca foram adicionados ao mix daquele cliente. Sustenta os fluxos de gestão de mix.
   - *Regressão:* Remover a tabela `status_mix` eliminaria o rastreamento de ativação; todos os produtos seriam tratados de forma uniforme, quebrando estratégias de sortimento por cliente.

7. **ROI usa período fixo de 365 dias no SERVIDOR.** O relatório de ROI (`RelatorioROICliente`) sempre consulta os últimos 365 dias passando `periodo: '365'` como parâmetro ao endpoint `relatorios/roi-clientes`. O cálculo é feito no backend e retorna dados pré-calculados (interface `ClienteROI`: `roi`, `margemLucro`, `ltv`, etc.). **NÃO há filtro client-side de 365 dias** — o período é enviado ao servidor. (Correção da verificação: a regra original afirmava filtro client-side, o que é falso — `RelatorioROICliente.tsx` linhas 103–109 passam `periodo` ao servidor.)
   - *Por quê:* Fornece uma linha-base de ROI consistente (1 ano de histórico), com o cálculo pesado sobre grande volume feito no backend.
   - *Regressão:* Se o período fixo de 365 dias for removido ou tornado configurável sem imposição server-side, os cálculos de ROI ficariam inconsistentes e não comparáveis entre janelas de tempo.

8. **Exportação CSV com BOM UTF-8 (com exceção conhecida).** As exportações CSV incluem o Byte Order Mark UTF-8 (`﻿`) no início e `charset=utf-8` no MIME type. **Exceção:** `SellerCommissionsPage` exporta SEM BOM, criando uma inconsistência. (Confirmado: BOM em `CustomerABCReportPage.tsx` linha 395 e `ProductABCReportPage.tsx` linha 268; `SellerCommissionsPage.tsx` linha 221 NÃO tem BOM.)
   - *Por quê:* Garante que caracteres acentuados (São Paulo, Ação, etc.) sejam lidos corretamente no Excel e LibreOffice, sem corrupção ou diálogos de codificação.
   - *Regressão:* Remover o BOM causaria corrupção de acentos no Excel em muitas máquinas Windows ('São Paulo' vira lixo); afeta a legibilidade de nomes de clientes e descrições de produtos.

9. **Vendas trazem itens de produto ao expandir o pedido.** No GET por ID, o RPC `get_pedido_venda_v2` sempre expande o pedido com o array de produtos (`itens`), independentemente de parâmetros (linhas 324–345). Componentes que precisam do detalhe de itens (`ProductABCReportPage`, `SolicitadoFaturadoReportPage`, `RelatorioMixCliente`) acessam `venda.itens` já presente na resposta. (O parâmetro `include_itens` existe no contrato de LIST da API, mas estes componentes confiam nos itens já retornados, não o acionam explicitamente.)
   - *Por quê:* Permite contratos flexíveis: o GET por ID sempre expande por conveniência, enquanto o LIST pode reduzir payload omitindo itens quando não são necessários.
   - *Regressão:* Alterar o GET por ID para não expandir itens quebraria `ProductABCReportPage`, `SolicitadoFaturadoReportPage` e `RelatorioMixCliente`, que dependem de `venda.itens`.

10. **Agrupamento opcional por dimensão de negócio.** Relatórios (CustomerABC, SolicitadoFaturado) suportam o parâmetro opcional `groupBy`: `'none'` (lista plana), `'grupo'` (grupo/rede de clientes), `'vendedor'` (vendedor) ou `'natureza'` (natureza de operação). Padrão é `'none'`. (Confirmado: `CustomerABCReportPage.tsx` linhas 20, 99, 301–337.)
    - *Por quê:* Permite agregar os dados por dimensão de negócio — ex.: ABC por vendedor para identificar destaques ou baixo desempenho por equipe.
    - *Regressão:* Remover `groupBy` impediria a agregação de curvas ABC pela estrutura organizacional, limitando a profundidade analítica.

11. **Visibilidade de cliente segue o status de aprovação.** Clientes visíveis nos relatórios refletem seu `status_aprovacao`: `'aprovado'` (visível a vendedor e backoffice), `'pendente'` (apenas o vendedor criador) e `'rejeitado'` (oculto das listas normais). Os relatórios herdam essa visibilidade via `list_clientes_v2`. **Observação:** para vendedores, o RPC filtra estritamente a `status_aprovacao = 'aprovado'` (linha 106) — ou seja, na prática o vendedor não vê clientes 'pendente'/'rejeitado' nos relatórios, nem os que ele criou (ver Dúvida em aberto). (Confirmado: `list_clientes_v2` linhas 54, 93, 101–108.)
    - *Por quê:* Impede que clientes não aprovados apareçam na análise de vendas; reforça o fluxo de triagem de clientes.
    - *Regressão:* Remover o filtro por `status_aprovacao` faria clientes rejeitados aparecerem nos relatórios, inflando métricas com contas inválidas.

12. **Cálculo de quantidade perdida (Solicitado x Faturado).** No relatório "Solicitado x Faturado", a quantidade e o percentual perdidos são calculados como: `perdaQuantidade = quantidadeSolicitado - quantidadeFaturado`; `perdaPercentual = (perdaQuantidade / quantidadeSolicitado) * 100` (quando `solicitado > 0`). (Campos declarados na interface de `SolicitadoFaturadoReportPage.tsx` linhas 44–45.)
    - *Por quê:* Identifica faltas de fornecimento (atendimento parcial, cancelamentos); ajuda a priorizar melhorias na cadeia de suprimentos.
    - *Regressão:* Alterar a fórmula de perda deturparia as taxas de atendimento; decisões gerenciais baseadas em métricas incorretas poderiam ser tomadas.

13. **Períodos-padrão diferentes por relatório.** `CustomerABCReportPage` usa período padrão `'current_month'` (mês corrente); `SolicitadoFaturadoReportPage` usa `'365'` (último ano). `RelatorioMixCliente` usa seleção customizada (padrão 30 dias) e `RelatorioROICliente` usa 365 dias fixos. (Confirmado: `CustomerABCReportPage.tsx` linha 104 `'current_month'`; `SolicitadoFaturadoReportPage.tsx` linha 142 `'365'`.)
    - *Por quê:* A curva ABC muda mensalmente e reflete atividade recente; Solicitado/Faturado acompanha perdas operacionais no longo prazo. Mix e ROI usam janelas próprias.
    - *Regressão:* Mudar os padrões de forma imprevisível faria o usuário ver intervalos de data inesperados; comparações entre relatórios ficariam inválidas.

14. **Período flexível no relatório de Mix.** O relatório de Mix (`RelatorioMixCliente`) permite seleção de período em dois modos: `'dias'` (últimos N dias, padrão 30) ou `'especifico'` (intervalo de datas customizado). Padrão 30 dias, sobrescrevível pelo usuário. (Confirmado: `RelatorioMixCliente.tsx` linhas 89, 171–177.)
    - *Por quê:* Permite análise flexível do mix de produtos ativos; vendedores podem revisar mix recente vs. histórico sob demanda.
    - *Regressão:* Fixar o período no código impediria comparar o mix entre janelas de tempo, limitando a análise de estratégia de produto.

15. **`numeroPedidos` no Mix conta ocorrências de item, não pedidos únicos.** Em `RelatorioMixCliente`, o campo `numeroPedidos` de cada produto é incrementado (`+= 1`) dentro do `venda.itens.forEach`. Assim, um produto que aparece em 3 itens distribuídos por 2 pedidos recebe `numeroPedidos = 3`, não 2. (Confirmado: `RelatorioMixCliente.tsx` linha 237 — semântica do nome é enganosa, mas o comportamento é esse no código.)
    - *Por quê:* Reflete a frequência de aparição do produto entre os itens do período (comportamento atual documentado, não necessariamente o desejado).
    - *Regressão:* Alterar para contar pedidos únicos mudaria os números exibidos historicamente; qualquer relatório salvo/comparado deixaria de bater. Antes de "corrigir", validar a intenção de negócio (ver Dúvida em aberto).

16. **ProductABC agrega por produto entre todos os pedidos.** Em `ProductABCReportPage`, produtos que aparecem em múltiplos pedidos são agregados por `produtoId` num `Map`, somando quantidade e valor. Múltiplas ocorrências viram uma única linha de produto com totais agregados — nunca há detalhe por pedido. (Confirmado: `ProductABCReportPage.tsx` linhas 145–168.)
    - *Por quê:* A curva ABC de produtos precisa do total agregado por produto para ranquear corretamente por participação na receita.
    - *Regressão:* Deixar de agregar (mostrar linha por pedido) quebraria o ranking ABC de produtos, que pressupõe um item por produto.

## Dúvidas em aberto

As dúvidas abaixo continuam ambíguas após a verificação (as demais foram convertidas em regras ou respondidas). Marcadas `[RESPONDIDA]` as que a análise de código já esclareceu.

1. **Filtro de vendedor no ProductABC é só client-side?** `ProductABCReportPage` carrega `api.get('vendas')` sem `include_itens` e depois filtra por cliente/vendedor na UI (linha 123). Não há evidência de enforcement backend do `vendedorId` nesse caminho. Se um vendedor usar a página, o RPC ainda retorna apenas as vendas dele (filtro `vendedor_uuid`), mas o filtro de vendedor selecionável na UI não passa ao servidor. **[RESPONDIDA parcialmente]** — o isolamento por vendedor é garantido pelo RPC (Regra 3); o filtro de vendedor da UI é apenas refino client-side sobre o conjunto já autorizado. *Resolver via:* código/Playwright (confirmar que backoffice ao selecionar um vendedor obtém apenas as vendas dele — refino client-side, o que é aceitável).

2. **Vendedor deveria ver seus clientes 'pendente'/'rejeitado' nos relatórios?** `list_clientes_v2` filtra vendedores estritamente a `status_aprovacao = 'aprovado'` (linha 106), então clientes 'pendente' ou 'rejeitado' nunca aparecem para o vendedor nos relatórios — nem os que ele mesmo criou. É a regra pretendida ou uma restrição forte demais? *Resolver via:* cliente (decisão de negócio).

3. **Vendas 'Cancelado' devem aparecer na lista, mas fora das stats?** O RPC `list_pedido_venda_v2` exclui `status = 'Cancelado'` das estatísticas (linha 159 `AND pv.status != 'Cancelado'`), mas não exclui vendas canceladas da lista principal (linhas 136–155). Vendas canceladas aparecem na lista de pedidos, porém ficam de fora das stats. É intencional (auditoria) ou bug? *Resolver via:* cliente (decisão de negócio) + código.

4. **`numeroPedidos` do Mix: contar itens ou pedidos únicos?** Ver Regra 15 — hoje conta ocorrências de item, não pedidos únicos. O nome do campo sugere "número de pedidos". Confirmar a intenção de negócio antes de alterar. *Resolver via:* cliente (decisão de negócio) + Playwright (validar o valor exibido).

5. **Inconsistência de BOM na exportação de comissões é bug ou intencional?** `SellerCommissionsPage` exporta CSV sem BOM enquanto os demais relatórios incluem BOM (ver Regra 8). Não há padronização detectada. Corrigir (adicionar BOM) ou é aceitável? *Resolver via:* cliente (definir padrão de exportação).

6. **Quais naturezas de operação têm `gera_receita = true`?** O RPC `list_pedido_venda_v2` (linha 129) lê `no.gera_receita` da tabela `natureza_operacao`, com `COALESCE(..., FALSE)`. O mapeamento de quais naturezas geram receita (ex.: Venda = true, Devolução = false) não está documentado no código. *Resolver via:* código (consultar dados da tabela `natureza_operacao`) + cliente (validar o mapeamento de negócio).

7. **Filtro de produto no Solicitado x Faturado é omissão ou por design?** `SolicitadoFaturadoReportPage` permite filtrar por cliente, vendedor e natureza, mas não expõe filtro por produto (interface de `filters` sem `produtoId`), embora calcule métricas por produto. Falta a UI para isolar um único produto. *Resolver via:* cliente (decisão de escopo) + Playwright (confirmar ausência do filtro).
