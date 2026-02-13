## Concluídos

- [x] **Produtos -> Novo Produto / Editar Produto**
  - Correção de scroll duplo lateral, mantendo apenas 1 scroll como nas demais telas.
  - Arquivo alterado: `src/components/ProductFormPage.tsx`
  - Ajuste aplicado: `className="space-y-6 min-h-0"` -> `className="relative space-y-6 min-h-0"`
  - Validação: testado via Playwright nas telas de novo e edição de produto.

- [x] **Configurações -> Importar dados -> Exportação**
  - Editar função para não ter limite de dados.

- [x] **Tela de Editar Cliente -> Aba Indicações**
  - Corrigir erro ao clicar na aba indicações (erro da imagem enviada no chat).

- [x] **Dashboard (header à direita)**
  - Corrigir período exibido (usar tela de pedidos como referência de comportamento correto).

- [x] **Comissões -> Lista de vendedores -> Ver detalhes**
  - Na tabela de vendas por período, exibir:
    - ID da venda
    - OC Cliente
    - Nome do cliente

## Observações do Cliente - Revisão 2

### Layout e rolagem

- [x] Quebra visual no menu lateral esquerdo em determinado ponto da rolagem.
- [x] Barra de rolagem dupla em páginas do sistema.
- [x] Validar comportamento esperado de rolagem única no conteúdo da página, com menu lateral fixo sem rolagem.

### Clientes

- [x] Diferença na formatação de CNPJ entre clientes (marcado como resolvido no documento do cliente).
- [ ] Validar se todos os CNPJs estão corretos no banco e se há divergência entre registros.
- [ ] Confirmar se a formatação do CNPJ é aplicada apenas no front-end ou também influenciada por dados de origem.
- [ ] Bug de cliente duplicado (Farma Conde / BABABA), incluindo divergência de CNPJ e dados distribuídos entre cadastros.
- [ ] Página de detalhes do cliente: aba Condição Comercial com carregamento mais lento que as demais.
- [ ] Página de detalhes do cliente: clientes sem vendedor indicado na aba Condição Comercial.
- [x] Página de detalhes do cliente: aba Indicadores trava o sistema (opção temporária sugerida: ocultar a aba até estabilizar).

### Pedidos, dashboard e vínculo de vendas

- [x] Indicação de vendas para vendedores sem pedido correspondente.
- [x] Vendas do Donato e Median refletem em Dashboard/Comissões/Equipe, mas pedidos do Donato não aparecem em Pedidos.
- [x] Pedido do Donato aparece em Vendas Recentes do Dashboard, porém ao clicar gera erro e exige recarregar.

### Período exibido no cabeçalho

- [x] Dashboards com divergência no período.
- [x] Pedidos com período correto (OK).
- [x] Clientes/Produtos/Equipe/Metas/Conta Corrente não utilizam esse indicador (OK).
- [x] Comissões com divergência no período.

### Comissões

- [ ] Criar mecanismo de proteção para evitar comissão indevida quando operação for classificada incorretamente (venda vs bonificação), incluindo avaliação de sincronismo automático com Tiny.
- [x] Colunas em branco no relatório de comissões, inclusive percentual de comissão.
- [x] Valores "fantasmas" em 02/2026: lista de vendedores mostra valores, mas relatório do período abre zerado.

### Natureza de Operação x ERP (multiempresa / multi-integrações)

- [ ] Ajustar modelo atual, pois IDs de natureza variam por empresa no Tiny.
- [ ] Remover campo Tiny ID da tela de Natureza de Operação e manter apenas campos funcionais.
- [ ] Inserir aviso na configuração: mapeamento com ERP deve ocorrer em `Configurações > Integrações`.
- [ ] Em cada integração ERP, permitir mapear cada natureza do ProSeller para o ID correspondente no ERP daquela empresa.
- [ ] Renomear opção de menu `Tiny ERP` para `ERP` ou `Integração ERP`.

### Configurações > Empresas

- [ ] Empresas sem dados completos (CNPJ, inscrição estadual, endereço, etc.) apesar de já existirem no banco.
- [ ] Status da integração Tiny aparece desativado, apesar do fluxo ativo de dados.

### Configurações > Condições de Pagamento

- [ ] Condições parceladas (ex.: 10/20/30) aparecendo como "à vista" na coluna Prazo.
- [ ] Primeira condição da lista com nomenclatura fora do padrão (ordem incorreta dos termos).
- [ ] Não há opção de edição de condições já criadas (somente exclusão).

### Equipe

- [ ] Card do vendedor na página Equipe não reflete corretamente atingimento de meta (ex.: Donato com meta 10k em 02/2026 e vendas de 5.5k exibindo 0%).

### Configurações > Listas de Preços

- [ ] Ao abrir lista de preços, itens aparecem inicialmente como "Produto não encontrado".
- [ ] Após um tempo, nomes carregam, porém alguns itens permanecem sem correspondência.

### Exportação de Dados > Clientes

- [x] Exportação retorna apenas 10 clientes, enquanto o total cadastrado é ~850.
- [ ] Ajuste necessário para suportar atualização completa da base de clientes no início da operação.
