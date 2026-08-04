# Regression Checklist — Revisão de feature antes do merge

> Checklist prático derivado das invariantes mais críticas do [system-contract](./index.md). Rode-o contra QUALQUER feature nova (ou fix) antes de mergear. Cada pergunta aponta para o domínio de onde a invariante vem. Se uma resposta for "não sei", pare e verifique — não presuma. Ver [known-incidents.md](./known-incidents.md) para o que já quebrou.

Como usar: pule as seções que a feature não toca. Para as que toca, TODAS as caixas precisam estar marcadas (ou justificadas em PR) antes do merge.

---

## Clientes / persistência ([clientes.md](./clientes.md))

- [ ] A feature toca `update_cliente_v2` ou qualquer UPSERT `ON CONFLICT`? Se sim: o fallback do `COALESCE` referencia o **valor existente** (`cliente_contato.<col>`), **nunca** `EXCLUDED.<col>`? (INC de ~89 clientes com observação apagada — migration 140.)
- [ ] Salvar parcialmente (só alguns campos) **preserva** os campos não enviados em vez de sobrescrever com NULL/vazio?
- [ ] A feature mexe em algum mapper de detalhe (`get_cliente_completo_v2` e similares)? Se sim: o mapper retorna os campos `*_nome` (ex.: `grupo_rede_nome`) via join, igual à lista? (migration 141.)
- [ ] Nenhum campo existente foi **omitido** no mapper de detalhe ao adicionar campo novo?

## Vendas & emissão Tiny ([vendas-emissao-tiny.md](./vendas-emissao-tiny.md))

- [ ] A feature muda o fluxo de emissão? Se sim: sucesso só é declarado e status só muda para "Em aberto" quando o Tiny retorna um `tiny.pedido_id` **real**? (Falso sucesso — V1.71.)
- [ ] Em caso de falha/timeout do Tiny, o status permanece pendente e o erro é propagado ao usuário (sem "falso sucesso")?
- [ ] A rastreabilidade não depende do número `PV-2025-XXXX` gerado no navegador (`Date.now`)? Ele é sobrescrito pelo número do Tiny no envio — não usar como chave de busca posterior.

## Condições de pagamento ([condicoes-pagamento.md](./condicoes-pagamento.md))

- [ ] O nome/descrição de condição parcelada usa **todas** as parcelas (ex.: "10/15/20"), não só a última? (V1.70.)
- [ ] O faturamento/emissão gera parcelas a partir de `intervalo_parcela` (source-of-truth), **não** a partir do nome nem de `Prazo_pagamento` scalar?
- [ ] `Quantidade_parcelas == intervalo_parcela.length` continua verdadeiro após CREATE e UPDATE?

## Fiscal / Simples / Natureza ([fiscal-simples-natureza.md](./fiscal-simples-natureza.md))

- [ ] Se a feature toca detalhe de cliente PJ: `tipoPessoa` é normalizado (acentos, "Pessoa Jurídica") e o flag Optante Simples **não é omitido** no mapper? (V1.66.)
- [ ] Emissão com regime Simples **não confirmado** (ex.: ReceitaWS instável) é **bloqueada** (D3), em vez de emitir com natureza incorreta? (V1.67.)

## Logística SSW ([logistica-ssw.md](./logistica-ssw.md))

- [ ] A feature muda o resolver de status de frete? Se sim: os estados terminais (Entregue / Devolvido / Recusado) continuam **sticky** e não são rebaixados por evento administrativo posterior (ex.: "ANEXADO COMPROVANTE 70")? (fix `frete-logistica-helpers`.)
- [ ] O resolver considera o histórico completo de eventos, **não** apenas o último?
- [ ] Alterações não quebram o cron `ssw-sweep-hourly` / edge `ssw-sweep-v1`?

## Permissões & RLS ([permissoes-rls.md](./permissoes-rls.md))

- [ ] A feature adiciona nova ação de backoffice? Se sim: ela é coberta por uma permissão e respeita o permissionamento existente?
- [ ] A feature toca `update-user-v2` / `list-users-v2`? Se sim: `permissoes` não voltam a vir null e o redeploy em prod está previsto?
- [ ] A feature **não** introduz uma nova política `allow_all` que neutralize o RLS (débito já existente — não expandir)?

## Edges & backend ([edges-catalog.md](./edges-catalog.md))

- [ ] Novo edge segue o padrão `-v2` e tem `verify_jwt` configurado corretamente (público vs autenticado conforme o contrato do domínio)?
- [ ] O payload de API consumido pelo frontend em prod **não** mudou sem feature flag?
- [ ] Deploy de edge/RPC parte do `main` (fonte de verdade) e o commit foi feito **antes** do deploy manual?

## Migrations ([arquitetura-stack.md](./arquitetura-stack.md), [convencoes-dados.md](./convencoes-dados.md))

- [ ] Precisa de migration? Escreveu o brief em `docs/plans/cursor-brief.md` com rollback e aguardou confirmação humana?
- [ ] A migration usa a **próxima sequência livre** e **não** preenche gaps existentes?
- [ ] A migration **não** altera arquivos `supabase/migrations/*.sql` já aplicados?

## Convenções de dados ([convencoes-dados.md](./convencoes-dados.md))

- [ ] Feature usa **somente Supabase real** (`src/services/*`), não `src/data/mock*`?
- [ ] Campos derivados/`*_nome` vêm de join, consistentes entre lista e detalhe?
- [ ] Formatos BR (data, moeda, tipoPessoa) normalizados de forma consistente?

## Versionamento visível ([arquitetura-stack.md](./arquitetura-stack.md))

- [ ] A PR dispara deploy em produção mexendo em `src/`? Se sim: `systemVersion` foi bumpado no `SidebarUserInfo` e o changelog atualizado no tooltip ✨?

---

### Regra de ouro

Se a mudança colide com uma invariante registrada e você acredita que a invariante está errada: **corrija o SPEC/contrato primeiro**, com evidência no código, e só então implemente. Wiki e contrato são espelho — não force uma feature a "caber".
