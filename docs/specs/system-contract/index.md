# System Contract — Índice

> Guarda anti-regressão do sistema. Cada arquivo deste diretório documenta as **invariantes**, **regras de negócio** e **decisões de arquitetura** verificadas no código de um domínio. O propósito é ser um contrato executável de leitura: **toda feature nova deve ser cotejada com estas invariantes antes de mergear.** Se uma mudança colide com um item aqui registrado, ou a invariante está errada (e o SPEC precisa ser corrigido primeiro), ou a feature está introduzindo uma regressão. Não editar um domínio sem cotejar o impacto cruzado. Ver também `regression-checklist.md` (revisão prática por área) e `known-incidents.md` (mapa incidente → invariante violada).

---

## Domínios

| Domínio | Arquivo | Escopo |
|---|---|---|
| Arquitetura & Stack | [arquitetura-stack.md](./arquitetura-stack.md) | Estrutura do app, roteamento manual, camadas de dados, versionamento visível |
| Catálogo de Edges | [edges-catalog.md](./edges-catalog.md) | Edge Functions `-v2`, `verify_jwt`, contratos de payload |
| Clientes | [clientes.md](./clientes.md) | `update_cliente_v2`, UPSERT/COALESCE, `get_cliente_completo_v2`, mappers de detalhe |
| Vendas & Emissão Tiny | [vendas-emissao-tiny.md](./vendas-emissao-tiny.md) | Envio ao ERP, `tiny.pedido_id`, sucesso real vs falso sucesso |
| Fiscal / Simples / Natureza | [fiscal-simples-natureza.md](./fiscal-simples-natureza.md) | Optante Simples, `tipoPessoa`, bloqueio de emissão sem regime confirmado |
| Condições de Pagamento | [condicoes-pagamento.md](./condicoes-pagamento.md) | `intervalo_parcela` como source-of-truth, nome com todas as parcelas |
| Comissões | [comissoes.md](./comissoes.md) | Cálculo, rateio, regras de vendedor |
| Logística SSW | [logistica-ssw.md](./logistica-ssw.md) | Resolver de status, eventos sticky, cron `ssw-sweep-hourly` |
| Permissões & RLS | [permissoes-rls.md](./permissoes-rls.md) | Permissionamento backoffice, `allow_all` pendente, `update-user-v2` |
| Produtos & Listas de Preço | [produtos-listas-preco.md](./produtos-listas-preco.md) | Catálogo, listas, imagens |
| Relatórios | [relatorios.md](./relatorios.md) | Dashboards, positivação, agregações |
| Conta Corrente | [conta-corrente.md](./conta-corrente.md) | Lançamentos, saldo, visualização |
| Convenções de Dados | [convencoes-dados.md](./convencoes-dados.md) | Normalização, `*_nome` via join, formatos BR |

---

## Resumo por domínio

Contagem de itens verificados por domínio. `refutadas` = hipóteses testadas contra o código e **descartadas** (não representam o comportamento real); ficam documentadas para evitar re-investigação.

| Domínio | Itens | Refutadas |
|---|---:|---:|
| arquitetura-stack | 9 | 4 |
| edges-catalog | 9 | 8 |
| clientes | 13 | 5 |
| vendas-emissao-tiny | 8 | 4 |
| fiscal-simples-natureza | 11 | 1 |
| condicoes-pagamento | 8 | 3 |
| comissoes | 22 | 2 |
| logistica-ssw | 14 | 2 |
| permissoes-rls | 12 | 8 |
| produtos-listas-preco | 13 | 1 |
| relatorios | 7 | 6 |
| conta-corrente | 17 | 3 |
| convencoes-dados | 8 | 1 |
| **Total** | **151** | **44** |
