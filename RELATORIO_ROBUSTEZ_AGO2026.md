# ProSeller — o que mudou nesta etapa

**Período:** 31 de julho a 4 de agosto de 2026
**Versões publicadas:** V 1.74 a V 1.87

---

## Em uma frase

O sistema deixou de quebrar em silêncio.

Todos os problemas que custaram caro aqui — o pedido que sumiu, os campos de
cliente apagados, a comissão que não devia existir — tinham a mesma
característica: **o sistema falhava sem avisar ninguém**. Mostrava "enviado com
sucesso" sem ter enviado. Apagava um campo sem erro nenhum. Zerava um número sem
reclamar.

Quem descobria era o cliente, dias depois, no prejuízo.

Agora existe um conjunto de verificações automáticas que olham o sistema todo dia
e **avisam por e-mail** quando encontram algo errado — antes de virar reclamação.

---

## 1. O sistema agora se vigia sozinho

Todo dia às 6h da manhã, o sistema confere oito situações que já deram prejuízo:

| Verificação |
|---|
| Comissão lançada para pedido que foi excluído |
| Pedido marcado como enviado que não chegou ao ERP |
| Frete entregue pela transportadora que ficou preso em "em trânsito" |
| CEP gravado em formato quebrado |
| Cliente novo cadastrado sem condição de pagamento |
| Condição parcelada com nome que não bate com as parcelas |
| **Campo de cliente que tinha valor e ficou vazio** |
| Consulta do Simples Nacional que falhou e travou uma emissão |

Se encontrar qualquer coisa, **chega um e-mail** dizendo o que é e o que fazer.
Se estiver tudo certo, não chega nada — alarme que apita todo dia é alarme que
todo mundo aprende a ignorar.

A lista completa também fica numa tela nova, **Sentinela**, no menu.

> **Por que isso importa:** o defeito que apagou dados de 94 clientes ficou ativo
> de março a julho sem ninguém perceber. Uma verificação como essa teria avisado
> no primeiro dia.

---

## 2. Agora dá para saber quem fez o quê

Nova tela **Auditoria**, com acesso liberado só para quem for autorizado.

Registra, com data, autor e o valor antes e depois:

- **Pedidos** — criação, alteração, exclusão e restauração
- **Clientes** — cadastro, exclusão, aprovação, troca de vendedor, grupo,
  condição de pagamento, desconto
- **Usuários e permissões** — quem ganhou e quem perdeu cada permissão
- **Comissões** — valor, efetivação, lançamentos, pagamentos, fechamento de período
- **Conta corrente**, **preços**, **listas de preço**, **produtos**,
  **naturezas de operação**, **metas**, **fretes**

O registro **não pode ser editado nem apagado** — nem pela tela, nem por fora.
E não tem prazo de expurgo: fica disponível para consulta de todo o período de uso.

Correção rotineira de cadastro — telefone, e-mail, observação — **não** entra
aqui de propósito. Se entrasse, o que interessa ficaria enterrado no meio das
mudanças do dia a dia. Essas continuam guardadas no histórico do cliente.

> Exemplo real capturado no primeiro dia:
> *"03/08, 21:25 — Valeria Montoz criou o pedido PV-2025-1044"* ·
> *"21:25 — Sistema alterou o pedido 9481: número do Tiny de vazio para 783819017"*.
> Ação de pessoa sai com o nome; ação automática do ERP sai como "Sistema".

---

## 3. Correções entregues

| O que estava errado | Situação |
|---|---|
| Status "Aguardando Agendamento" era recusado pelo sistema ao arrastar o card | Corrigido |
| CEP era gravado num formato quebrado (`13.345400`) | Corrigido — 936 endereços normalizados |
| Comissão de pedido excluído não era estornada | Corrigido |
| Comissão usava comparação de texto, sensível a acento | Passou a usar a configuração da natureza |
| Pagamento acima do valor devido era bloqueado | Agora avisa e permite registrar |
| Relatório Solicitado × Faturado zerado | Reativado — 2.241 itens de nota carregados |
| Filtro por Nº de NFe não filtrava | Corrigido |
| Data de entrega usava o último lançamento, não a entrega real | Corrigido |
| Total de relatório aparecia sem formatação | Corrigido |

---

## 4. Uma rede de proteção para o futuro

Além de corrigir, montamos verificações que rodam sozinhas a cada mudança no
sistema — para que os mesmos defeitos não voltem sem ninguém perceber:

- **193 verificações automáticas** (89 de tela, 96 de funções, 8 do banco de dados)
- Cada uma das oito verificações do banco foi **testada contra a versão com o
  defeito** antes de ser aceita — verificação que nunca viu o erro não protege
  ninguém
- Um mecanismo que **compara o sistema publicado com o código-fonte** e acusa se
  alguém alterar algo direto no ar (137 funções sob controle)
- Um comando que **reconstrói o banco inteiro numa cópia descartável**, para
  testar mudanças arriscadas sem tocar em produção

---

## 5. Dados de clientes: 16 cadastros aguardando sua confirmação

A verificação nova encontrou **16 cadastros com informação apagada em maio que
continua faltando hoje** — resíduo do mesmo defeito que já foi corrigido.

- **5** sem Grupo/Rede
- **5** sem nome fantasia
- **6** sem vendedor atribuído

O documento com cliente por cliente e o valor exato a ser devolvido já foi
enviado. **Aguardamos sua confirmação para restaurar.**

Atenção especial aos 6 de vendedor: eles não foram apagados pelo defeito — foram
removidos por um usuário da Median em 26/05. Pode ter sido uma redistribuição
intencional de carteira, e por isso não mexemos sem perguntar.

---

## 6. Passagem de conhecimento

Como a manutenção do sistema passará para vocês, vamos entregar **por escrito**:

**a) Guia de segurança para uso com o Claude Code.** O sistema já tem um arquivo
de instruções que o Claude lê antes de qualquer alteração — foi ele que impediu
vários erros nesta etapa (fazer backup antes de mexer, ensaiar antes de aplicar,
parar e perguntar antes de tocar no banco de produção). Vamos reescrevê-lo
pensando em quem está começando, para que essas travas continuem valendo mesmo
sem conhecimento técnico prévio.

**b) Manual de operação.** Como publicar uma alteração, como reverter, o que
nunca fazer, onde ficam as chaves de acesso, o que significa cada alerta que
chegar por e-mail e o que fazer em cada caso.

**c) Guia do Supabase.** Onde ficam os dados, como consultar sem risco, o que
exige cuidado redobrado e como pedir ajuda quando algo não estiver claro.

Também faremos uma **sessão de acompanhamento** para percorrer o material junto e
tirar dúvidas na prática.

---

## Em números

| | |
|---|---|
| Versões publicadas | 14 |
| Alterações no banco de dados | 11 |
| Verificações automáticas criadas | 193 |
| Pontos de auditoria | 20 |
| Rotinas automáticas ativas | 3 (verificação diária, e-mail de alerta, rastreio de fretes) |
| Situações vigiadas todo dia | 8 |
| Alertas em aberto hoje | **0** |

---

*Median · ProSeller V1 · 04/08/2026*
