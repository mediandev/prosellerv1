# Ingest — Call Valentim 2026-05-21 (FlowCode & Median, 15:15–15:41 BRT)

Fonte: transcrição Tactiq da call. Duração 26 min.

## Decisões de produto (aplicar em R-LOG-2)

| # | Tema | Decisão direta do Valentim | Aplicação técnica |
|---|---|---|---|
| 1 | **Histórico Bubble** | "Não, não precisa pode botar de hoje para frente." | Não criar pipeline de migração de dados. Bubble vai zerar fretes em trânsito em ~15 dias e ser desligado. |
| 2 | **Aba "Regiões destino"** | "Isso aqui você pode até pular cara, não precisa botar isso não." | **Esconder aba** do `LogisticaPage`. Em ondas futuras, derivar região do CEP via IBGE. Tabela `regiao_destino` no banco fica (não dói) mas UI esconde. |
| 3 | **Aba "Origens"** | "É e origem também também não. A empresa vai estar vinculado já qualquer empresa porque ele vai estar vinculado a um pedido e o pedido já tem qualquer empresa de faturamento também." | **Esconder aba** do `LogisticaPage`. Frete vai derivar `empresa_id` direto de `pedido_venda.empresa_id` quando R-LOG-3 entrar. Em criação manual (R-LOG-1) usa empresa_id direto. Tabela `origem_frete` fica sem uso. |
| 4 | **Cadastro Transportadores** | "Cadastro transportadores realmente precisa." | Manter. |
| 5 | **Grupo de transportador** | "Esse grupo aqui é uma boa sacada de ter o grupo, porque tem vários cnpjs da ativa. É tudo ativa são filiais cada estado tem a filial." | Manter. Quando R-LOG-4 vier, indicadores são por grupo (não por CNPJ específico). |
| 6 | **Torre de Controle** | "Mostrar a torre de controle que aí ele vem com vários indicadores. Mas isso também é um negócio que a gente pode fazer com melhoria. Não precisa ser agora." | 5 cards de status agora. Indicadores financeiros adiados (R-LOG-5 backlog). |
| 7 | **Onde aparece status do frete** | "Não sei se no pedido em si. Se a gente põe alguma coisa tipo… Botar uma janelinha aqui de entrega os dados sabe quando for entregue." + "Botar uma linha pode pode mas acho que ela também pode aparecer aqui [no pedido]." | **Dois lugares:** Torre de Controle (Logística > Dashboard) **E** seção "Entrega" dentro do detalhe do pedido (`SalesPage`) com timeline compacta + preview do comprovante. |
| 8 | **Foto/comprovante de entrega** | "Eu tô vendo se você permite a pessoa bater a foto na hora ou se é melhor a pessoa tirar a foto e subir a foto." + "A melhor forma seria a pessoa bater a foto da hora e já ficar." | Começar via `<input type="file" capture="environment">` (HTML5 câmera no navegador). Upload pra Supabase Storage. Mobile no futuro. |
| 9 | **Gráficos / indicadores** | "Gráficos tá sem hoje eu não tenho isso no log CRM então urgente a trazer o que tem para poder desligar ele [o Bubble]." | Skip por agora. R-LOG-5 quando voltar. |
| 10 | **PRAZO** | "Eu vou tentar… até amanhã de tarde no máximo eu vou conseguir Fechar isso." Valentim aceitou. | **R-LOG-2 + ajustes em pedido + SSW (mock se necessário) até 2026-05-22 fim do dia.** |
| 11 | **Permissões de usuário (bug)** | "Eu criei já com algumas permissões a menos. E aí depois eu vi que ele veio com tudo. Não consegui tirar suas permissões aqui." | Bug novo. **Prioridade pré-1ºJun.** Backend não persiste permissões editadas. Investigar `update-user-v2` ou tabela `ref_user_role`. Eduardo prometeu pôr no log também via agente. |
| 12 | **Logs do sistema** | "Logo sim, mas é porque eles são uma questão simples que dá para eu fazer colocando um agente aqui para fazer esse paralelo." | Em paralelo, não bloqueia LogCRM. Pode ficar pra outra sessão. |
| 13 | **Vendedor em 2 times** | "Eu consigo contornar fiz aqui um empresa venda direta, SP, então a gente contornou isso aí, então é algo que dá para deixar para mês que vem." | Pode esperar. |

## Outras notas da call

- **F-001 (Simples Nacional)** rodando, alguns clientes ainda com tabela de preço sendo ajustada no Tiny — não é problema da feature, é processo do cliente. Junho deve ter dados bons.
- **INC-012 (Andreia/recriação usuário com mesmo email)** funcionou. Eduardo confirmou que vínculo com clientes é preservado. Andreia diz que email "esqueci minha senha" não chega — vai usar o painel pra reset manual.
- **Cliente Cântico vai 100% em 1º de junho.** Maio foi mês de transição/ajustes.
- Bubble usa "make" / Sigma pra prototipagem; Valentim ia mostrar protótipo de Logística mas a ferramenta pausou durante a call. Vai enviar acesso depois.

## Conclusão acionável

R-LOG-2 da próxima sessão **deve incluir:**
1. Torre de Controle (5 cards de status).
2. Busca de fretes com filtros (cliente, transportador).
3. Detalhe do frete com timeline (mock até SSW real chegar).
4. **Esconder abas "Regiões destino" e "Origens"** do `LogisticaPage`.
5. **Adicionar seção "Entrega"** no detalhe do pedido (`SalesPage` visualização) com timeline curta + preview do comprovante.
6. **Upload de comprovante via câmera HTML5** (mobile-ready).
7. Bump V 1.38.

Em paralelo (não bloqueia):
8. Investigar bug de permissões de usuário (`update-user-v2` não persiste).

Não fazer:
- Migração histórica Bubble (decisão explícita do Valentim).
- Indicadores financeiros (R-LOG-5 backlog).
- Gráficos (R-LOG-5).
- Vendedor em 2 times (contornado).

Próxima call: provavelmente após 1ºJun pra ajustar com dados reais em uso.
