# Fiscal: Simples & Natureza

> **Aviso de status (verificação adversarial):** A grande maioria das regras propostas para este
> domínio **não está implementada no código atual** do repositório. Elas aparecem em commits do
> histórico Git (V1.67/V1.68, ~2026-06-25) e no *system-contract*, mas as funções, tabelas e lógica
> descritas **não existem** no working tree atual. Este documento registra apenas o que é
> verificável no código, e move o restante para "Dúvidas em aberto".
>
> Em resumo, hoje: **não há consulta à ReceitaWS para regime Simples Nacional**, **não há
> revalidação no envio de pedido**, **não há seleção entre `tiny_valor` e `tiny_valor_simples`**,
> e **não há bloqueio D3 / `REGIME_LOOKUP_FAILED`**.

## Regras de negócio

1. **Tipo de pessoa é derivado, nunca consultado externamente.** O `tipoPessoa` em
   `mapClienteCompleto` (`clientes-v2/index.ts`) vem de (1) `tipo_pessoa_nome` retornado pela RPC
   `get_cliente_completo_v2`, ou como fallback (2) do comprimento do documento: 11 dígitos → Pessoa
   Física, 14 dígitos → Pessoa Jurídica. Nenhuma chamada externa (ReceitaWS) é feita para confirmar
   PF/PJ.
   *Por quê:* A distinção PF/PJ já está determinada pelo próprio documento e pela classificação
   cadastrada; consultar API externa só para isso adicionaria latência e dependência sem ganho.
   *Regressão:* Passar a chamar ReceitaWS (ou outra API) para decidir PF/PJ, ou inverter a regra de
   comprimento (11↔14), causando classificação incorreta de todos os clientes sem `tipo_pessoa_nome`.

2. **ReceitaWS é usada apenas na criação de cliente, como fallback para dados cadastrais — nunca
   para regime tributário.** Em `integrations.ts` (`consultarCNPJReceitaWS`, endpoint real
   `https://receitaws.com.br/`) a chamada serve para resolver endereço / Inscrição Estadual de um
   CNPJ, acionada **como fallback após a BrasilAPI**. Ela **não** consulta Simples Nacional e não
   participa da emissão de pedido.
   *Por quê:* A integração existe para completar o cadastro quando a fonte primária (BrasilAPI)
   falha; regime tributário não faz parte desse escopo hoje.
   *Regressão:* Reaproveitar essa chamada para tentar inferir regime Simples, ou torná-la primária
   (antes da BrasilAPI), quebrando a ordem de fallback e o contrato de custo/latência da criação de
   cliente.

3. **A seleção de natureza de operação no envio ao Tiny usa exclusivamente `tiny_valor`.** Em
   `tiny-enviar-pedido-venda-v1`, a natureza é resolvida a partir dos dados já persistidos no pedido
   (`natureza_id` / nome de `natureza_operacao`), buscando **sempre** o mapeamento em
   `tiny_empresa_natureza_operacao` e lendo o campo `tiny_valor`. A coluna `tiny_valor_simples`
   existe no schema mas **nunca é lida**. Não há detecção de dual-mapping, nem short-circuit, nem
   ramo condicional por optante.
   *Por quê:* Hoje o envio confia inteiramente no que já foi decidido/persistido no pedido; a
   escolha de natureza é única e determinística por mapeamento cadastrado.
   *Regressão:* Introduzir leitura de `tiny_valor_simples` ou ramos por optante **sem** também
   implementar a consulta/validação de regime — isso enviaria natureza divergente sem a fonte de
   verdade que a justifica.

4. **CNPJ deve ser mascarado em logs — hoje isso é apenas parcial e precisa ser corrigido.**
   `tinyERPSync.ts` e `tiny-enviar-pedido-venda-v1` não logam CNPJ diretamente; porém
   `integrations.ts` e `CNPJTestTool.tsx` fazem `console.log` de `cpf_cnpj` em texto claro. A regra
   de negócio desejada é mascarar (preservar apenas os primeiros e últimos dígitos), mas o código
   atual **viola isso** nesses dois pontos.
   *Por quê:* CNPJ é identificador sensível de empresa; logs são consultados por múltiplos usuários
   e podem vazar. Mascarar reduz risco sem perder rastreabilidade.
   *Regressão:* Adicionar novos pontos de log com `cpf_cnpj` em texto claro, ou remover o
   mascaramento onde ele vier a ser aplicado. (Débito atual: corrigir `integrations.ts` e
   `CNPJTestTool.tsx`.)

> **Regras propostas e REFUTADAS pela verificação (não viram regra de negócio ativa):**
> - *Consulta obrigatória ao Simples no envio, com bloqueio se falhar (RN-001):* **FALSA** — não há
>   revalidação ReceitaWS no envio; `tiny-enviar-pedido-venda-v1` não consulta regime nem bloqueia.
> - *Cache de `optante_simples_nacional` com timestamp, revalidado antes do ERP (RN-003):*
>   **IMPRECISA** — a coluna existe no `schema_baseline.sql` mas nunca é populada, consultada ou
>   revalidada por nenhuma Edge Function/migration.
> - *Hierarquia `tiny_valor_simples` vs `tiny_valor` por optante (RN-004):* **FALSA** — não existe
>   essa seleção; `tiny_valor_simples` nunca é lido.
> - *Não persistir resposta bruta da ReceitaWS de regime (RN-005):* **VAZIA** — ReceitaWS de regime
>   nunca é chamada, então não há resposta bruta a persistir.
> - *Dual-mapping detectado por `tiny_valor_simples` preenchido (RN-006):* **FALSA** — não há
>   detecção de dual-mapping em lugar nenhum.
> - *Timeout de 5s na ReceitaWS (RN-007):* **NÃO IMPLEMENTADO** — `consultarCNPJReceitaWS` não
>   define timeout (fetch padrão ~30s), e não há chamada de regime.
> - *Short-circuit sem dual-mapping pula ReceitaWS (RN-009):* **FALSA** — toda requisição busca
>   sempre o mapeamento Tiny, sem short-circuit.
> - *Retry único em HTTP 429 após 3s (RN-010):* **NÃO IMPLEMENTADO** — não há lógica de retry de
>   regime.
> - *Bloqueio D3 + `REGIME_LOOKUP_FAILED` no envio (RN-011):* **FALSA** — nunca há consulta de
>   regime na emissão, logo o erro nunca é retornado; frontend (`SalesPage.tsx`) não o trata.

## Dúvidas em aberto

As dúvidas abaixo não têm resposta conclusiva no código atual e envolvem a divergência entre
histórico Git / contrato e o working tree. As demais dúvidas do backlog (DV-001 a DV-011) já foram
respondidas pela verificação e estão registradas como [RESPONDIDA].

1. **Dessincronização histórico ↔ working tree.** Os commits `7bc21f1` (V1.68) e `c0bef7c` (V1.67),
   de ~2026-06-25, descrevem revalidação de Simples, bloqueio D3, tabela `regime_lookup_falha` e
   detecção de dual-mapping — mas **nada disso existe no código atual**. As features estão em branch
   experimental? Foram revertidas? O history está dessincronizado do working tree?
   *Como resolver:* código (comparar branches / `git log --all` das funções `tiny-enviar-*`,
   `integrations.ts` e migrations 138+) e **cliente** (confirmar se a feature foi descartada ou está
   planejada).

2. **Coluna órfã `optante_simples_nacional`.** Existe em `schema_baseline.sql:88-89` (snapshot de
   produção) mas **sem migration criadora** entre 001-143, e não é populada nem lida por nenhum
   código. Como ela entrou em produção? O `schema_baseline` está desatualizado, ou migrations foram
   removidas?
   *Como resolver:* código (auditar migrations vs. schema baseline) e **cliente** (confirmar estado
   real do banco de produção).

3. **`tiny_valor_simples` nunca usado.** A coluna existe em `tiny_empresa_natureza_operacao`
   (`schema_baseline.sql:682`) mas o seletor de natureza no envio a ignora por completo. É código
   não-finalizado, preparação para feature futura, ou resíduo?
   *Como resolver:* cliente (confirmar intenção de produto para dual-mapping fiscal).

4. **Distinção entre `NULL` "nunca consultado" vs. "consulta inconclusiva" (DV-012).** Caso a
   feature de regime seja ativada, `optante_simples_nacional = NULL` pode significar três coisas
   (nunca consultado / cliente PF / consulta falhou). Não há coluna/flag de motivo para
   desambiguar. Deve haver? Como o negócio quer diferenciar esses casos?
   *Como resolver:* código (verificar se há coluna de timestamp/flag prevista) e **cliente**
   (definir se a desambiguação importa para a regra de natureza).

5. **Onde a revalidação de regime deveria ocorrer, se implementada.** O contrato diz "antes do
   envio ao ERP" (best-effort na criação, bloqueante no envio), mas nenhuma função faz isso hoje.
   Em qual fase o negócio realmente quer a validação?
   *Como resolver:* cliente (decisão de produto sobre o momento da validação).

### Dúvidas do backlog já respondidas pela verificação

- **DV-001 [RESPONDIDA]:** `optante_simples_nacional` **existe** na tabela `cliente`
  (`schema_baseline.sql:88`), porém é campo órfão — sem migration criadora e nunca
  populado/consultado.
- **DV-002 [RESPONDIDA]:** `consultarSimplesNacional` / `receitaws-client.ts` **não existem**. Há
  `consultarCNPJReceitaWS` em `integrations.ts`, mas para CNPJ/IE, não para Simples.
- **DV-003 [RESPONDIDA]:** `tipoPessoa` vem de `tipo_pessoa_nome` (RPC) ou fallback pelo
  comprimento do documento (11→PF, 14→PJ). Nunca por ReceitaWS.
- **DV-004 [RESPONDIDA]:** **Não há** COUNT/head para detectar dual-mapping no envio;
  `tiny-enviar-pedido-venda-v1` busca sempre o mapeamento, sem short-circuit.
- **DV-005 [RESPONDIDA]:** Sem consulta de regime no envio, não há timeout nem bloqueio D3 por
  timeout de regime.
- **DV-006 [RESPONDIDA]:** `create-cliente-v2` (migration 114) **não** chama ReceitaWS para regime
  nem tem parâmetro `p_optante_simples_nacional`.
- **DV-007 [RESPONDIDA]:** Tabela `regime_lookup_falha` **não existe** (migration 138 do commit
  `c0bef7c` não está no repo). Falhas de regime não são auditadas.
- **DV-008 [RESPONDIDA]:** Frontend **não exibe** `optante_simples_nacional`; `mapClienteCompleto`
  não retorna o campo. (Estados "Não consultado"/"Indisponível" citados em `7bc21f1` não estão no
  arquivo atual.) — vale confirmação visual por Playwright se/quando a feature existir.
- **DV-009 [RESPONDIDA]:** `REGIME_LOOKUP_FAILED` nunca é retornado (regime nunca consultado na
  emissão); `SalesPage.tsx` não trata esse erro nem oferece botão de retry.
- **DV-011 [RESPONDIDA]:** A integração ReceitaWS é **real** (`https://receitaws.com.br/` em
  `integrations.ts:214`), não mockada — mas usada só para lookup de CNPJ, não de regime Simples.
