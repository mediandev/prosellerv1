# Known Incidents — Mapa incidente → invariante violada

> Cada incidente registrado abaixo aponta para a invariante que ele violou (no [system-contract](./index.md)) e mostra como o [regression-checklist](./regression-checklist.md) o teria pego. Serve para não repetir a mesma classe de erro. Ao investigar um bug novo, confira antes se ele é reincidência de algum destes — reincidência (≥2 ocorrências) escala para Deep Work com refator, não fast-fix.

---

## INC — UPSERT com EXCLUDED apagava observação de contato

- **O que aconteceu:** `update_cliente_v2` usava `EXCLUDED.<col>` no fallback do `COALESCE` durante o UPSERT. Ao salvar um cliente enviando payload parcial, o `EXCLUDED` (o valor novo/vazio) sobrescrevia a observação de contato existente. Resultado: observação de contato apagada em ~89 clientes ao salvar.
- **Invariante violada:** [clientes.md](./clientes.md) — o fallback do `COALESCE` em UPSERT deve referenciar o **valor existente** (`cliente_contato.<col>`), **nunca** `EXCLUDED.<col>`.
- **Correção:** migration 140.
- **Como o checklist pegaria:** seção *Clientes / persistência*, primeira pergunta ("o COALESCE referencia o valor existente, não EXCLUDED?") — resposta seria "não", bloqueando o merge.

## INC — Falso sucesso na emissão ao ERP

- **O que aconteceu:** a `SalesPage` (front) declarava "enviado com sucesso" e mudava o status para "Em aberto" mesmo quando o Tiny **não** retornava `tiny.pedido_id`. Pedidos apareciam como emitidos sem existir no ERP.
- **Invariante violada:** [vendas-emissao-tiny.md](./vendas-emissao-tiny.md) — só marcar sucesso / mudar status quando o Tiny retorna um ID real (`tiny.pedido_id`).
- **Correção:** V1.71.
- **Como o checklist pegaria:** seção *Vendas & emissão Tiny*, pergunta "sucesso só com `tiny.pedido_id` real?" — reprovaria a lógica que muda status sem checar o ID.

## INC — Entrega rebaixada por evento administrativo posterior (SSW)

- **O que aconteceu:** o resolver de status SSW usava apenas o **último** evento. Um evento administrativo tardio (ex.: "ANEXADO COMPROVANTE 70") chegava depois da entrega e rebaixava o status de Entregue para outro estado.
- **Invariante violada:** [logistica-ssw.md](./logistica-ssw.md) — estados terminais (Entregue / Devolvido / Recusado) são **sticky**; evento administrativo posterior não rebaixa.
- **Correção:** `frete-logistica-helpers`.
- **Como o checklist pegaria:** seção *Logística SSW*, perguntas "entrega continua sticky?" e "resolver considera o histórico completo, não só o último evento?" — ambas reprovariam o resolver por último-evento.

## INC — Nome de condição parcelada mostrava só a última parcela

- **O que aconteceu:** o nome da condição parcelada era gerado com apenas a última parcela ("20 dias") em vez de todas ("10/15/20"). Usuários não viam as parcelas intermediárias.
- **Invariante violada:** [condicoes-pagamento.md](./condicoes-pagamento.md) — o nome usa **todas** as parcelas; o faturamento usa `intervalo_parcela` (não o nome).
- **Correção:** V1.70.
- **Como o checklist pegaria:** seção *Condições de pagamento*, pergunta "o nome usa todas as parcelas, não só a última?" — reprovaria o `gerarDescricao` antigo.

## INC — Grupo/Rede não exibido no detalhe do cliente

- **O que aconteceu:** `get_cliente_completo_v2` não retornava `grupo_rede_nome`, então o campo Grupo/Rede deixava de aparecer no detalhe do cliente (aparecia na lista, sumia no detalhe).
- **Invariante violada:** [clientes.md](./clientes.md) / [convencoes-dados.md](./convencoes-dados.md) — o mapper de detalhe deve trazer os campos `*_nome` via join, igual à lista.
- **Correção:** migration 141.
- **Como o checklist pegaria:** seção *Clientes / persistência*, pergunta "o mapper de detalhe retorna os `*_nome` via join, igual à lista?" — reprovaria o mapper incompleto.

## INC/PITFALL — Número PV-2025-XXXX não é rastreável

- **O que aconteceu:** o número `PV-2025-XXXX` é gerado no **navegador** (`Date.now`) e é **sobrescrito** pelo número do Tiny no envio. Depois de emitido, o pedido não é localizável por esse número original.
- **Invariante violada:** [vendas-emissao-tiny.md](./vendas-emissao-tiny.md) — pitfall de rastreabilidade: a chave de busca pós-emissão é o número do Tiny, não o `PV-` local.
- **Correção:** não é bug de código a corrigir; é um pitfall documentado. Não construir features de rastreio em cima do `PV-` local.
- **Como o checklist pegaria:** seção *Vendas & emissão Tiny*, pergunta "a rastreabilidade não depende do número `PV-` gerado no navegador?" — sinalizaria qualquer feature que use o `PV-` como chave de busca posterior.

## INC — Optante Simples sumia no detalhe (acento + omissão)

- **O que aconteceu:** o flag Optante Simples desaparecia no detalhe por dois motivos: (a) acento/variação em `tipoPessoa` ("Pessoa Jurídica") não era normalizado; (b) o campo era omitido no mapper de detalhe.
- **Invariante violada:** [fiscal-simples-natureza.md](./fiscal-simples-natureza.md) — normalizar `tipoPessoa` e não omitir campos no mapper de detalhe.
- **Correção:** V1.66.
- **Como o checklist pegaria:** seção *Fiscal / Simples / Natureza*, pergunta "`tipoPessoa` normalizado e Optante Simples não omitido no mapper?" — reprovaria as duas causas.

## INC — Emissão com regime Simples não confirmado

- **O que aconteceu:** com a ReceitaWS instável, o regime Simples não era confirmado, mas a emissão prosseguia — com risco de natureza fiscal incorreta.
- **Invariante violada:** [fiscal-simples-natureza.md](./fiscal-simples-natureza.md) — regime Simples não confirmado deve **BLOQUEAR** a emissão (D3), nunca emitir com natureza incorreta.
- **Correção:** V1.67.
- **Como o checklist pegaria:** seção *Fiscal / Simples / Natureza*, pergunta "emissão com regime não confirmado é bloqueada (D3)?" — reprovaria qualquer caminho que emita sem confirmação.
