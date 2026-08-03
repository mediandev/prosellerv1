import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export interface ChangelogEntry {
  version: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'V 1.86',
    items: [
      'Auditoria: a coluna "O quê" passa a mostrar a frase pronta ("alterou as permissões de Cicero Rocha Costa") em vez do identificador interno do registro, que não dizia nada. O tipo e o número ficam abaixo, em letra menor. Espaçamento entre colunas ajustado.',
    ],
  },
  {
    version: 'V 1.85',
    items: [
      'Auditoria completa: entram preços por lista, listas de preço, produtos, naturezas de operação (inclusive o mapeamento com o Tiny), condições de pagamento, metas, empresas de faturamento e fretes.',
      'Auditoria > Chave de API do ERP: a troca da chave é registrada, mas a chave em si NUNCA é guardada no registro — aparece apenas "chave substituída".',
      'Auditoria: novos tipos de ação com cor própria — Restauração, Aprovação, Rejeição, Acesso cortado e Acesso devolvido.',
      'Observação: nas telas de preço, produto e configurações o sistema ainda não registra QUEM fez a alteração (aparece como "Sistema"), apenas o que mudou e quando. Em pedidos, clientes, usuários, comissões e fretes o nome aparece.',
    ],
  },
  {
    version: 'V 1.84',
    items: [
      'Auditoria: usuários e permissões entram no registro — criação, exclusão, corte e devolução de acesso, mudança entre backoffice e vendedor, e alteração de permissões.',
      'Auditoria > Permissões: o registro mostra exatamente o que a pessoa GANHOU e o que PERDEU (ex.: "ganhou comissoes.visualizar"), em vez de duas listas para comparar na mão.',
    ],
  },
  {
    version: 'V 1.83',
    items: [
      'Auditoria: clientes entram no registro — cadastro, exclusão, restauração, aprovação e rejeição de cadastro pendente, além de mudanças com impacto comercial (vendedor atribuído, grupo/rede, lista de preço, condição padrão, desconto, pedido mínimo, situação, CNPJ e código).',
      'Auditoria: liberar ou remover uma condição de pagamento de um cliente também passa a ser registrado.',
      'Correção rotineira de cadastro (telefone, e-mail, observação) NÃO entra na Auditoria de propósito — continua no histórico do cliente, que é onde ela sempre esteve.',
    ],
  },
  {
    version: 'V 1.82',
    items: [
      'Pedidos: o sistema passa a guardar quem alterou e quem excluiu cada pedido (antes só guardava quem criou). Essas ações agora aparecem na Auditoria, incluindo exclusão e restauração de pedido, com o valor e o status que o pedido tinha na hora.',
      'Pedidos > Detalhe: abaixo do número do pedido aparece "Criado por [nome] em [data] · última alteração por [nome] em [data]". Pedidos antigos, que não têm esse registro, simplesmente não exibem a linha.',
    ],
  },
  {
    version: 'V 1.81',
    items: [
      'Auditoria: os selos de "Criação" e "Exclusão" apareciam sem cor (só "Alteração" estava colorido). Corrigido — exclusão em vermelho, criação em verde.',
    ],
  },
  {
    version: 'V 1.80',
    items: [
      'Nova tela "Auditoria" (backoffice): registro de quem fez o quê, quando, e o que mudou de/para. Nesta primeira etapa cobre o grupo de maior risco — comissões (valor, efetivação, débito), lançamentos, pagamentos, fechamento de período e conta corrente do cliente. Filtros por tipo de registro, pessoa e período. Sem prazo de expurgo: o histórico é mantido para consulta de todo o período de uso.',
      'Auditoria: visível apenas para quem tiver a nova permissão "Visualizar Auditoria" (Configurações > Permissões). Não é herdada de outras permissões.',
    ],
  },
  {
    version: 'V 1.79',
    items: [
      'Sentinela: nova verificação para falhas na consulta do Simples Nacional. Quando a Receita não responde no envio do pedido, a emissão é bloqueada e o usuário recebe aviso — mas o registro dessa falha ficava numa tabela que ninguém abria. Agora aparece na tela da Sentinela, com cliente, CNPJ e motivo, e some sozinho quando a consulta seguinte funciona.',
    ],
  },
  {
    version: 'V 1.78',
    items: [
      'Logística: o status "Aguardando Agendamento" passa a funcionar de verdade. A coluna já existia no Kanban, mas o sistema recusava o frete ao ser arrastado para ela — a troca tinha sido feita só nas telas, nunca no banco de dados. Agora está completa: quando a transportadora informa reentrega, o frete cai automaticamente em "Aguardando Agendamento", e o status aparece nas listas da Busca, do Novo Frete e no card da Torre de Controle.',
    ],
  },
  {
    version: 'V 1.77',
    items: [
      'Relatórios > Solicitado x Faturado: o total ao lado da contagem de produtos aparecia sem formatação (ex.: "R$ 10992.39"). Agora segue o padrão do sistema ("R$ 10.992,39"), igual ao restante da tabela.',
    ],
  },
  {
    version: 'V 1.76',
    items: [
      'Nova tela "Sentinela" (backoffice): o sistema já verificava sozinho, todo dia, um conjunto de regras críticas — comissão de pedido excluído, pedido sem confirmação do ERP, frete entregue preso em trânsito, CEP fora do padrão, cliente novo sem condição de pagamento, entre outras. Até agora esse resultado só existia no banco de dados. Agora ele aparece no menu, com contador de alertas em aberto.',
      'Sentinela: a verificação de "campo de cliente apagado" deixou de olhar apenas o campo Observação e passou a cobrir todos os campos de cadastro, contato e endereço — a mesma classe do incidente que apagou dados de clientes. O alerta só é levantado quando o campo continua vazio na base, evitando alarme falso.',
    ],
  },
  {
    version: 'V 1.75',
    items: [
      'Relatórios > Solicitado x Faturado: relatório REATIVADO no menu. Os itens reais de cada nota fiscal agora são guardados no sistema (capturados automaticamente na emissão + carga histórica), permitindo comparar o que foi pedido com o que foi faturado e identificar cortes.',
    ],
  },
  {
    version: 'V 1.74',
    items: [
      'Clientes > Endereço: o CEP agora é guardado apenas com números (zeros à esquerda preservados) e exibido com máscara completa (ex.: 13.345-400). Corrige o defeito que salvava o CEP num formato quebrado (13.345400) — toda a base foi normalizada (936 endereços).',
    ],
  },
  {
    version: 'V 1.73',
    items: [
      'Logística > Busca: o filtro "Nº NFe" voltou a funcionar (busca exata pelo número). Antes o backend recusava a consulta e a tela mantinha a lista anterior, parecendo que o filtro não filtrava.',
      'Logística > Busca: quando a busca falha, a tela agora mostra o erro e limpa a lista — em vez de exibir o resultado antigo como se fosse o novo.',
    ],
  },
  {
    version: 'V 1.72',
    items: [
      'Relatórios > Mix do Cliente: a coluna "nº de pedidos" passa a contar pedidos únicos (antes contava cada linha do produto, inflando o número quando o item aparecia mais de uma vez no mesmo pedido).',
      'Relatórios > Solicitado x Faturado: novo filtro por produto (descrição ou SKU).',
      'Pedidos: se a condição de pagamento tiver valor mínimo, o pedido abaixo desse valor é bloqueado com aviso do quanto falta.',
      'Clientes: ao cadastrar um cliente novo, é obrigatório selecionar ao menos uma condição de pagamento.',
      'Conta Corrente: pagamento acima do valor pendente deixa de ser bloqueado — o sistema avisa o excedente e pede confirmação, permitindo registrar.',
      'Logística: a data de entrega passa a usar o evento de entrega real, não o último lançamento do transportador (que podia ser o anexo do comprovante, dias depois).',
    ],
  },
  {
    version: 'V 1.71',
    items: [
      'Pedidos > Envio ao ERP: corrigido "falso sucesso" — a mensagem "enviado com sucesso" e a mudança de status só ocorrem quando o Tiny confirma o pedido (retorna um ID). Sem confirmação, o sistema avisa que NÃO foi enviado e mantém o pedido para reenvio, em vez de enganar o usuário.',
    ],
  },
  {
    version: 'V 1.70',
    items: [
      'Configurações > Condições de Pagamento: nome automático de condição parcelada agora usa TODAS as parcelas (ex.: "10/15/20 dias") em vez de só a última ("20 dias"). Corrigido no cadastro (backend) e no preview "Nome Gerado".',
    ],
  },
  {
    version: 'V 1.69',
    items: [
      'Logística > Kanban: botão "Atualizar" agora sincroniza o rastreio SSW dos fretes visíveis (não-terminais) antes de recarregar, mostrando quantos foram atualizados.',
      'Logística > Detalhe do frete: novo botão "Atualizar rastreio" força a consulta SSW daquele frete na hora (ignora o cache de 30 min).',
      'Logística: varredura automática de rastreio SSW a cada 1h em segundo plano (ativação do agendamento pendente de confirmação em produção).',
    ],
  },
  {
    version: 'V 1.68',
    items: [
      'Clientes > Detalhe: o regime "Optante Simples Nacional" agora distingue "Não consultado" (cliente ainda não enviado ao ERP) de "Indisponível" (consulta feita, mas Receita não respondeu) — antes ambos apareciam como "—".',
    ],
  },
  {
    version: 'V 1.67',
    items: [
      'Pedidos > Envio ao ERP: se a consulta do regime tributário (Simples Nacional) falhar na Receita, o envio é bloqueado com aviso e opção "Tentar novamente" — evita emitir nota com natureza de operação incorreta. Falhas ficam registradas para auditoria.',
    ],
  },
  {
    version: 'V 1.66',
    items: [
      'Clientes > Detalhe: voltou a exibir o regime "Optante Simples Nacional" (Sim/Não) e o campo "Tipo Pessoa" — corrigido descasamento de acento em "Pessoa Jurídica" e inclusão do campo na consulta do cliente.',
    ],
  },
  {
    version: 'V 1.65',
    items: [
      'Produtos: as imagens voltaram a aparecer na listagem, agora carregadas sob demanda (lazy-load) conforme a rolagem — sem travar o carregamento da página.',
    ],
  },
  {
    version: 'V 1.64',
    items: [
      'Configurações > Condições de Pagamento: layout do modal de nova condição melhorado — dica de prazo movida para baixo do campo, "Nome Gerado" sempre visível.',
      'Relatórios > Curva ABC de Clientes: agrupamento por Grupo/Rede funciona corretamente; pluralização "1 cliente" vs "2+ clientes" corrigida.',
      'Clientes > Aba Conta Corrente: botões "Novo Compromisso" e "Registrar Pagamento" agora visíveis também no modo Visualizar.',
      'Conta Corrente: largura dos campos de data ajustada para evitar espaço sobrando após ícone de calendário.',
    ],
  },
  {
    version: 'V 1.63',
    items: [
      'Clientes > Aba Mix: produtos carregados via query direta Supabase (contorna edge function status-mix-v2 não deployada); auto-ativação por vendas históricas.',
      'Relatórios > Curva ABC de Clientes: filtro Grupo/Rede convertido para combobox pesquisável (151+ grupos).',
      'Relatórios > Curva ABC de Clientes: opção "Pendentes" adicionada ao filtro Status das Vendas.',
      'Relatórios > Curva ABC de Clientes: fallback "Cliente Desconhecido" substituído por "Cliente #ID" quando nome não disponível.',
    ],
  },
  {
    version: 'V 1.62',
    items: [
      'Relatórios > Curva ABC de Produtos: dados agora carregam corretamente — client Supabase injeta token JWT, respeitando RLS.',
      'Relatórios > Mix de Produtos por Cliente: itens agora carregam via query direta na tabela pedido_venda_produtos (autenticada).',
      'Relatórios > ROI por Cliente: corrigido loading infinito; métricas calculadas a partir das vendas reais do cliente.',
      'Relatório de Vendas: agrupamento por Grupo/Rede e campo CNPJ/UF passam a usar campos diretos da venda.',
    ],
  },
  {
    version: 'V 1.61',
    items: [
      'Conta Corrente > Arquivos: visualizar e baixar arquivos anexos agora funcionam corretamente (botões antes exibiam apenas mensagem de log).',
      'Conta Corrente > Arquivos: nome do arquivo é extraído corretamente da URL quando armazenado como texto simples no banco.',
    ],
  },
  {
    version: 'V 1.60',
    items: [
      'Clientes > Aba Mix: produtos agora carregam corretamente (filtro por ativo/disponível); status do mix por cliente persistido no banco via tabela status_mix.',
      'Clientes > Aba Mix: carregamento de produtos não é mais bloqueado por falha no status-mix, evitando tela em branco.',
      'Clientes > Aba Indicadores: LTV, performance mensal e trimestral agora calculados a partir das vendas reais do cliente.',
    ],
  },
  {
    version: 'V 1.59',
    items: [
      'Relatórios > Curva ABC de Clientes: corrigido — todos os clientes agora são carregados corretamente (paginação completa, antes carregava apenas 10 de 960).',
      'Relatórios > Mix de Produtos por Cliente: corrigido — todos os clientes agora são carregados com paginação completa.',
      'Relatórios > ROI por Cliente: corrigido — todos os clientes agora são carregados com paginação completa.',
      'Relatórios > Curva ABC de Clientes: filtro Grupo/Rede agora exibe nomes corretos (corrigido exibição de UUID no lugar do nome do grupo).',
      'Relatórios > Curva ABC de Clientes: filtro Natureza de Operação agora exibe apenas as naturezas presentes nos dados do período selecionado.',
    ],
  },
  {
    version: 'V 1.58',
    items: [
      'Relatórios > Solicitado vs Faturado: corrigido — produtos agora carregam corretamente (itens de cada pedido incluídos na listagem).',
      'Relatórios > Mix de Produtos por Cliente: corrigido — produtos do período agora são carregados corretamente.',
      'Configurações > Usuários: tipo de usuário (Backoffice / Vendedor) agora exibido como badge abaixo do nome na lista.',
    ],
  },
  {
    version: 'V 1.57',
    items: [
      'Relatórios > Curva ABC de Produtos: corrigido — os produtos agora aparecem corretamente com quantidades e valores reais. A API agora carrega os itens de cada pedido junto com a listagem, eliminando o erro que exibia "0 produtos".',
    ],
  },
  {
    version: 'V 1.56',
    items: [
      'Logística > Romaneio de Expedição: nova aba "Romaneio" no módulo de logística. Permite criar um manifesto de saída agrupando múltiplas NFs por transportadora e data, com geração automática de PDF (A4 paisagem) ao confirmar. O PDF inclui dados do remetente, transportador, tabela de NFs com volumes, peso e valor, linhas de assinatura e número sequencial por empresa.',
      'Logística > Frete: novo campo "Peso Bruto (kg)" editável no detalhe do frete (seção Valores). O peso é usado para calcular o total de peso no romaneio.',
      'Logística > Status: removido status "Em Trânsito - Reentrega" (não utilizado na operação). Adicionado status "Aguardando Agendamento" — aparece no Kanban, na lista de status do detalhe do frete e no badge de status.',
    ],
  },
  {
    version: 'V 1.55',
    items: [
      'Logística > Comprovante público: motoristas de transportadoras parceiras agora podem confirmar entregas ou registrar agendamentos sem precisar de login. Basta acessar /entrega, escanear o código de barras da NF-e ou digitar a chave de acesso (44 dígitos), conferir os dados e tirar uma foto do comprovante — o status do frete é atualizado automaticamente para "Entregue".',
      'Logística > Agendamento pelo motorista: ao invés de confirmar entrega, o motorista pode reportar agendamento informando data, hora e observações (ex.: "Ligar antes, portaria bloco B"). O status muda para "Agendado" e as informações ficam visíveis no detalhe do frete.',
      'Logística > Detalhe do frete: ao anexar um comprovante de entrega, o status é automaticamente alterado para "Entregue" — não é mais necessário trocar o status manualmente.',
      'Pedidos > Envio ao Tiny: campo "Forma de Pagamento" agora é enviado corretamente (ex.: Boleto, PIX) em vez de chegar sempre como "múltiplas" no Tiny.',
      'Pedidos > Detalhe: seção "Entrega" aparece para qualquer pedido assim que a logística estiver habilitada — não depende mais de NF emitida para ser exibida.',
    ],
  },
  {
    version: 'V 1.54',
    items: [
      'Logística > Kanban: nova aba com board de fretes organizado por status — arraste um card de uma coluna para outra para atualizar o status instantaneamente.',
      'Logística > Comprovante de entrega: no detalhe do frete, botão "Tirar foto / Anexar" abre a câmera do celular ou permite anexar arquivo (imagem/PDF). Comprovante fica salvo e disponível para consulta.',
    ],
  },
  {
    version: 'V 1.53',
    items: [
      'Logística > Novo Frete: busca de pedido por nome do cliente, número do pedido ou CNPJ — ao selecionar, empresa, cliente e valor são preenchidos automaticamente.',
      'Logística > Novo Frete: campo de chave de acesso da NF-e (44 dígitos) com validação em tempo real.',
      'Pedido > Detalhe: seção "Entrega" agora exibe a linha do tempo completa de ocorrências do transportador (SSW), não apenas o status resumido.',
      'Comissões: usuários deletados não aparecem mais na listagem da tela de Gestão de Comissões.',
    ],
  },
  {
    version: 'V 1.51',
    items: [
      'Dashboard: os cards (Vendas Totais, Ticket Médio, Produtos Vendidos, Positivação, Vendedores Ativos, Meta) não ficam mais presos em "Carregando..." e a "Carteira de Clientes" voltou a mostrar o total correto. A causa era o status do cliente gravado em maiúsculo ("ATIVO") não bater com a comparação interna ("Ativo"), zerando a carteira (ex.: "164 de 0 clientes") e travando todo o dashboard. Corrigida a comparação (sem diferenciar maiúsculas) e o dashboard agora carrega mesmo se a carteira vier vazia.',
    ],
  },
  {
    version: 'V 1.50',
    items: [
      'Comissões > Relatório do vendedor: as colunas "OC Cliente" e "Cliente" da tabela "Vendas do Período" voltaram a ser preenchidas. Desde 14/04/2026 as comissões geradas vinham sem esses rótulos (o nome do cliente e a OC apareciam em branco), embora os valores estivessem corretos. Corrigida a geração das comissões para gravar novamente esses campos, e preenchidos os relatórios de abril, maio e junho/2026. Nenhum valor de comissão foi alterado.',
    ],
  },
  {
    version: 'V 1.48',
    items: [
      'Equipe > Vendedores: a regra de comissão (Alíquota Fixa / Definido em Lista de Preço) agora é gravada de verdade ao salvar o vendedor. Antes a escolha não era persistida e a comissão saía zerada para vendedores recém-cadastrados.',
    ],
  },
  {
    version: 'V 1.47',
    items: [
      'Pedidos > Ao selecionar uma natureza de operação que não gera receita (ex.: Bonificação), o campo "Condição de Pagamento" agora fica oculto e deixa de ser obrigatório — não trava mais o pedido. Para naturezas que geram receita, o campo continua obrigatório normalmente.',
    ],
  },
  {
    version: 'V 1.46',
    items: [
      'Configurações > Naturezas de Operação: corrigido o problema em que criar, editar ou excluir uma natureza parecia "não salvar" — ao recarregar a página o valor antigo voltava. A alteração já era gravada, mas a lista exibia uma cópia em cache (até 12h). Agora a lista é atualizada na hora.',
      'Mesma correção aplicada em Configurações > Condições de Pagamento, que tinha o mesmo comportamento.',
    ],
  },
  {
    version: 'V 1.45',
    items: [
      'Pedidos > Corrigido: ao trocar ou re-selecionar o cliente em um pedido (inclusive ao duplicar), os campos do cliente — entre eles a Natureza de Operação — sumiam e impediam o envio. Agora os campos continuam visíveis para você selecionar a natureza e concluir o pedido.',
    ],
  },
  {
    version: 'V 1.44',
    items: [
      'Clientes > Código automático: ao cadastrar um cliente, o sistema agora gera o código sozinho (maior código atual + 1), pelo servidor. Não é mais preciso digitar o código manualmente — o campo fica em branco e é preenchido ao salvar.',
      'Geração à prova de duplicidade mesmo com vários usuários cadastrando ao mesmo tempo. Quem preferir ainda pode voltar ao modo manual em Configurações.',
    ],
  },
  {
    version: 'V 1.43',
    items: [
      'Clientes > "Situação" (Ativo / Inativo / Excluído) agora é exibida corretamente na ficha e na lista. Antes, ao mudar a situação de um cliente (ex.: para "Excluído"), a alteração era salva mas a tela voltava a mostrar "Ativo" — agora reflete o valor real.',
      'Como consequência, a lista e os indicadores passam a mostrar os clientes Inativos/Excluídos com a situação verdadeira (antes apareciam todos como "Ativo").',
    ],
  },
  {
    version: 'V 1.42',
    items: [
      'Dashboard > "Vendas Totais" corrigido: o painel passou a considerar TODOS os pedidos do período. Antes carregava apenas os 100 pedidos mais recentes, o que subcontava o total e fazia o valor oscilar ao longo do dia (ex.: cair de 506k para 457k sem cancelamento). Agora o número fica completo e estável.',
      'Dashboard > o valor de "Vendas Totais" passa a usar sempre o valor do pedido (estável). Para ver apenas pedidos já faturados/enviados, use o filtro "Status de Vendas > Vendas concluídas".',
    ],
  },
  {
    version: 'V 1.41',
    items: [
      'Logística > Frete automático: ao enviar um pedido de venda ao Tiny com sucesso, o sistema cria automaticamente um registro de frete vinculado ao pedido (com status "Em Separação"). Funcionalidade controlada por feature flag — peça acesso ao administrador para habilitar.',
    ],
  },
  {
    version: 'V 1.40',
    items: [
      'Usuários > Permissões de backoffice agora são salvas corretamente. Antes, ao editar permissões de outro backoffice (ex.: clientes.todos, usuarios.criar, config.geral), o sistema rejeitava a operação com erro — agora persiste normalmente.',
    ],
  },
  {
    version: 'V 1.39',
    items: [
      'Logística > Rastreio SSW automático: ao abrir o detalhe de um frete com chave NFe, o sistema consulta a API da SSW e atualiza a timeline de ocorrências em tempo real (cache de 30 min).',
      'Logística > Status atualizado automaticamente: o status do frete (Em Trânsito, Agendado, Entregue, Recusado, etc.) agora é resolvido a partir das ocorrências reais do transportador — sem necessidade de edição manual.',
      'Logística > Timeline enriquecida: eventos de entrega mostram o nome e documento do recebedor. Cores diferenciadas por tipo de evento (verde = entrega, âmbar = cliente, azul = informativo).',
    ],
  },
  {
    version: 'V 1.38',
    items: [
      'Logística > Torre de Controle: 5 cards de status (Em Trânsito, Reentrega, Agendados, Devoluções em Trânsito e Recusadas) com clique direto para o detalhe do frete.',
      'Logística > Busca de Fretes: lista paginada com filtros por cliente, transportador, status, período de emissão e número da nota.',
      'Logística > Detalhe do Frete: identificação, status, datas, valores, anexo de DACTE e comprovante (foto pela câmera ou arquivo) e área "Atualizações no Transportador" (timeline ainda vazia — integração SSW chega na próxima entrega).',
      'Pedidos > Visualizar Pedido: bloco "Entrega" no detalhe do pedido mostrando o status atual do frete vinculado à NF, com link para o detalhe completo na Logística.',
      'Logística > simplificação: abas "Regiões destino" e "Origens" foram removidas (estavam em branco por solicitação do Valentim em 21/05 — a origem vem da empresa de faturamento do pedido).',
    ],
  },
  {
    version: 'V 1.37',
    items: [
      'Cadastro de cliente: "Tipo Pessoa" volta a ser salvo corretamente (antes ficava em branco ao reabrir o cliente, mesmo selecionado). Aplique a correção reabrindo cada cliente que apresenta o campo vazio e salvando novamente.',
      'Cadastro de cliente: Desconto Padrão, Desconto Financeiro e Pedido Mínimo deixam de ser zerados automaticamente quando você não toca no campo durante a edição (antes o salvar substituía o valor existente por zero).',
    ],
  },
  {
    version: 'V 1.36',
    items: [
      'Iniciada migração do módulo Logística do LogCRM (transportadores, regiões, origens e cadastro manual de frete). Disponível apenas para usuários backoffice e oculto atrás de feature flag — peça acesso ao administrador para habilitar.',
    ],
  },
  {
    version: 'V 1.35',
    items: [
      'Configurações > Listas de Preço: o dropdown de produtos voltou a carregar a lista real (não mais a versão de exemplo). A consulta interna era estourada por tempo em bases com muitos itens.',
      'Configurações > Listas de Preço: ao editar uma lista existente, agora o preço de cada produto já vinculado pode ser alterado diretamente no próprio campo (antes só era possível remover o item e adicionar de novo).',
    ],
  },
  {
    version: 'V 1.34',
    items: [
      'Configurações > Listas de Preço: salvar/editar uma lista agora persiste os produtos vinculados e as faixas de comissionamento (antes a lista era criada vazia mesmo com itens preenchidos).',
    ],
  },
  {
    version: 'V 1.33',
    items: [
      'Relatório de Comissões em PDF: o aviso "Saldo Anterior não calculado" volta a aparecer legível (antes saía com caracteres embaralhados quando o período anterior estava em aberto).',
    ],
  },
  {
    version: 'V 1.32',
    items: [
      'Cadastro de cliente: inclusão rápida de Grupo / Rede pelo botão "+" ao lado do campo — antes de criar, o sistema mostra grupos parecidos para evitar duplicidade; você pode escolher um existente ou criar mesmo assim. Disponível também para vendedores.',
      'Clientes: vendedores passam a visualizar na própria lista os clientes que cadastraram e ainda estão aguardando aprovação do backoffice (antes esses clientes "sumiam" até serem aprovados).',
    ],
  },
  {
    version: 'V 1.31',
    items: [
      'Pedidos: envio ao Tiny não exige mais que o "Nome Fantasia" do vendedor bata com o cadastro do Tiny — passa a usar só o ID Tiny',
      'Pedidos: "OC: [Aguardando]" não é mais inserido nas Observações da NF quando o campo OC Cliente está em branco',
      'Clientes: busca ignora acentos, aceita CNPJ com ou sem máscara e procura também por Grupo/Rede',
    ],
  },
  {
    version: 'V 1.30',
    items: [
      'Botão "Imprimir" na visualização de pedidos, com layout próprio em A4 (cabeçalho da empresa, dados do cliente, itens, totais, pagamento e observações)',
    ],
  },
  {
    version: 'V 1.29',
    items: [
      'Pedidos: clientes importados via planilha agora enviam ao Tiny corretamente (CEP/CNPJ/telefone vinham com pontuação que o Tiny rejeitava)',
      'Configurações > Usuários: recriar um usuário com mesmo e-mail após excluir voltou a funcionar (erro de chave duplicada no banco corrigido)',
    ],
  },
  {
    version: 'V 1.28',
    items: [
      'Cliente: campo Desconto Padrão agora salva ao editar (estava sendo ignorado pelo backend)',
      'Cliente: campo Grupo / Rede agora persiste corretamente ao editar — texto e ID são gravados juntos',
    ],
  },
  {
    version: 'V 1.27',
    items: [
      'Cadastro de cliente: erro "invalid input syntax for type uuid" ao salvar um cliente novo com vendedor atribuído foi corrigido',
      'Configurações > Importação de Dados: importação de clientes via planilha agora persiste no banco (antes só simulava). Reconhece automaticamente colunas da planilha de migração (Código, Endereço, Cidade, Estado, Fone, NOME REDE, SITUAÇÃO PROSELLER, Vendedor, Empresa de Faturamento, Lista de Preço, DESC FIN, etc.)',
    ],
  },
  {
    version: 'V 1.26',
    items: [
      'Pedidos: ao reabrir um pedido salvo como rascunho em modo edição, a lista de produtos volta a aparecer no modal "Adicionar Item"',
    ],
  },
  {
    version: 'V 1.25',
    items: [
      'Configurações > Usuários: segundo bug da exclusão (erro de banco) corrigido — exclusão agora conclui com sucesso',
    ],
  },
  {
    version: 'V 1.24',
    items: [
      'Configurações > Usuários: exclusão de usuário volta a funcionar (preflight CORS corrigido)',
    ],
  },
  {
    version: 'V 1.23',
    items: [
      'Simples Nacional: pedidos passam a chegar no Tiny com a natureza correta conforme o regime do cliente',
    ],
  },
  {
    version: 'V 1.22',
    items: [
      'Relatório de comissões: Saldo Anterior antes do Valor Líquido',
      'Linha de totalizadores na tabela de Vendas do Período (PDF)',
      'Acentos e caracteres especiais corrigidos no PDF',
      'Aviso quando o período anterior está em aberto, com instruções para fechar o ciclo',
      'Nova ação "Fechar Período" no menu de cada relatório aberto',
    ],
  },
];

export function ChangelogPage() {
  return (
    <div className="space-y-4">
      {CHANGELOG.map((entry, idx) => (
        <Card key={entry.version}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {idx === 0 && <Sparkles className="h-4 w-4 text-primary" />}
              {entry.version}
              {idx === 0 && (
                <span className="text-xs font-normal text-muted-foreground">(versão atual)</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {entry.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
