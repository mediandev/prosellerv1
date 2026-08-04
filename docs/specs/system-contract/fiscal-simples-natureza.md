# Contrato — Fiscal: Simples Nacional & Natureza de Operação

> Regras e invariantes verificadas no código. Não editar sem cotejar impacto.

Este contrato consolida as regras verificadas do domínio fiscal (Simples Nacional + Natureza de Operação). Quando uma regra foi verificada como `partial`, o enunciado abaixo reflete o `corrected_statement` — a versão fiel ao que o código realmente faz.

---

## Business rules

### Consulta ReceitaWS obrigatória apenas para PJ novo ou revalidação em envio

**Enunciado (corrigido — verdict: partial):** A regra é implementada parcialmente: (1) criar cliente com CNPJ via `create-cliente-v2` consulta ReceitaWS se a flag `FEATURE_SIMPLES_NACIONAL_LOOKUP` estiver ativada (best-effort, não bloqueia 201, apenas para PJ); (2) enviar pedido ao Tiny via `tiny-enviar-pedido-venda-v1` revalida Simples Nacional sempre que flag ligada e cliente é PJ, sem cache, independentemente do tempo desde a última consulta. **Porém**, a rota ativa de criação de cliente (`clientes-v2` POST, usada pelo frontend) **não** implementa revalidação de Simples Nacional. As funções legadas `emitirpedido`, `emitir-pedido-sem-vendedor` e `TinyEmitirAPI` também não implementam a revalidação, mas estão marcadas como código morto na auditoria de 2026-06-01.

**Tipo:** business-rule

**Evidência:**
- `docs/decisions/adr/ADR-004-revalidacao-simples-por-pedido.md:24-25` — decisão explícita de revalidar a cada envio sem cache (empresa pode ser excluída do Simples a qualquer momento; risco tributário real).
- `supabase/functions/create-cliente-v2/index.ts:329-362` — feature flag consultada na criação (best-effort, apenas PJ).
- `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts:402-484` — revalidação incondicional antes de envio ao Tiny quando flag ligada e cliente é PJ.
- `supabase/functions/clientes-v2/index.ts:432` — contraexemplo: POST ativo do frontend chama RPC `create_cliente_v2` sem revalidação de Simples.

**Regressão se:** Sistema deixasse de revalidar ReceitaWS no envio de pedido (p.ex. usando cache de 30 dias) — aceitaria emitir NF com regime tributário incorreto até 30 dias após cliente sair do Simples (risco real conforme decisão do cliente em 2026-04-22).

---

### Seleção de tiny_valor segue hierarquia determinística por optante_simples_nacional

**Enunciado (verdict: confirmed):** Função `resolveNaturezaTiny` aplica a regra: (1) empresa sem dual-mapping → `tiny_valor`, fallback `no_dual_company`; (2) mapeamento sem dual (`tinyValorSimples===null`) → `tiny_valor`, fallback `no_dual`; (3) `optante===null` → `tiny_valor`, fallback `null_optante`; (4) `optante===true` → `tiny_valor_simples` (ou `tiny_valor` se vazio), fallback `none`; (5) `optante===false` → `tiny_valor`, fallback `none`. A função é pura, determinística e testável; o resultado é aplicado sem modificação ao payload Tiny e auditado no evento `natureza.resolvida`.

**Tipo:** business-rule

**Evidência:**
- `supabase/functions/_shared/natureza-resolver.ts:52-83` — função pura com 5 casos e razões de fallback.
- `docs/specs/SPEC.md:207-244` — CA-007 detalha os 5 cenários (A-E), incluindo short-circuit DP-006.
- `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts:646-661` — função chamada e resultado logado com evento `natureza.resolvida`.

**Regressão se:** A lógica de seleção for alterada (ex.: usar `tiny_valor_simples` quando `optante=false`, ou não respeitar `companyHasDualMapping`) — pedidos seriam enviados com natureza incorreta para Simples ou não-Simples conforme o desvio.

---

### D3: Envio ao Tiny é BLOQUEADO se lookup ReceitaWS falha para empresa com dual-mapping

**Enunciado (verdict: confirmed):** Quando a empresa possui pelo menos um mapeamento com `tiny_valor_simples` preenchido (tem dual-mapping) e ReceitaWS falha (timeout, rate-limit, missing_field, network_error), o envio ao Tiny é interrompido com erro `REGIME_LOOKUP_FAILED`. A falha é registrada na tabela `regime_lookup_falha` (best-effort) para auditoria. Não há caminho de código que permita envio ao Tiny nessa condição (com flag ligada, cliente PJ, CNPJ válido).

**Tipo:** business-rule

**Evidência:**
- `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts:452-481` — se `lookup.status!='ok'`, insere em `regime_lookup_falha`, loga `regime_lookup.bloqueio` e lança `REGIME_LOOKUP_FAILED`.
- `docs/specs/SPEC.md:112-130` — Fluxo F-2 descreve o bloqueio (RF-003).
- `src/components/SalesPage.tsx:1124-1132` — frontend detecta `REGIME_LOOKUP_FAILED` e oferece botão "Tentar novamente".

**Regressão se:** O bloqueio D3 fosse removido (e o fallback usasse `optante=null` quando lookup falha para empresa com dual) — pedidos seriam emitidos com natureza potencialmente incorreta quando ReceitaWS está indisponível, violando o risco central mitigado pela feature.

---

### Persistência de optante_simples_nacional após consulta bem-sucedida

**Enunciado (corrigido — verdict: partial):** Quando ReceitaWS retorna `status='ok'` com optante booleano, o sistema persiste `cliente.optante_simples_nacional` e `cliente.optante_simples_nacional_consultado_em`. Em `create-cliente-v2` a persistência é sempre best-effort após lookup bem-sucedido, sem bloqueio (CA-004). Em `tiny-enviar-pedido-venda`, a persistência ocorre após sucesso de ReceitaWS **apenas quando a empresa tem dual-mapping habilitado** (DP-006); se a empresa não tem dual-mapping, o lookup é integralmente pulado, a persistência não ocorre e o valor persistido (ou null) é usado para resolver a natureza.

**Tipo:** business-rule

**Evidência:**
- `supabase/functions/create-cliente-v2/index.ts:329-362` — após lookup ok, atualiza `optante_simples_nacional` + `consultado_em` (não bloqueante).
- `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts:433-451` — se `lookup.status='ok'`, persiste optante e consultado_em antes de `resolveNaturezaTiny`.
- `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts:408-432` — contraexemplo: com `companyHasDualMapping=false`, o bloco de lookup (433-482) nunca executa; optante não é atualizado antes de `resolveNaturezaTiny`.
- `src/types/customer.ts:160-163` — tipo com `optanteSimplesNacional?: boolean | null` e `optanteSimplesNacionalConsultadoEm?: string | null`.

**Regressão se:** A persistência for contornada e o resultado do lookup não for salvo — lookups subsequentes se repetiriam a cada envio, sem fallback para quando ReceitaWS falha, removendo resiliência a falhas temporais.

---

### Resposta bruta da ReceitaWS NUNCA é persistida; só optante boolean + timestamp

**Enunciado (verdict: confirmed):** As Edge Functions extraem apenas `simples.optante` da resposta ReceitaWS e persistem esse boolean em `cliente.optante_simples_nacional` mais o timestamp. A resposta completa (contendo PII de sócios, endereço completo, quadro societário) é descartada e nunca armazenada no banco. A tabela `regime_lookup_falha` loga apenas metadados de falha. Apenas `create-cliente-v2` e `tiny-enviar-pedido-venda-v1` importam `consultarSimplesNacional`, ambas seguindo o padrão.

**Tipo:** business-rule

**Evidência:**
- `supabase/functions/_shared/receitaws-client.ts:232-254` — body parseado; apenas `simples.optante` extraído; sem persistência do body completo.
- `supabase/functions/create-cliente-v2/index.ts:340-347` — apenas optante e consultadoEm escritos na tabela cliente.
- `docs/specs/SPEC.md:60,84` — Anti-SPEC §6 e RNF-003 proíbem persistir resposta bruta (PII de sócios).

**Regressão se:** A resposta completa da ReceitaWS fosse persistida — o banco conteria PII não solicitada (dados de sócios, endereços completos), violando minimização de dados e criando risco de compliance/responsabilidade sem valor de negócio.

---

## Invariants

### Mapeamento Natureza Operação possui dual-ID: tiny_valor + tiny_valor_simples

**Enunciado (corrigido — verdict: partial):** A tabela `tiny_empresa_natureza_operacao` possui exatamente duas colunas relacionadas à natureza: `tiny_valor` (obrigatório, pré-F-001) e `tiny_valor_simples` (nullable, pós-F-001). Quando `tiny_valor_simples` é preenchido, determina que a empresa emite com naturezas distintas para optantes do Simples Nacional. A lógica de seleção está corretamente implementada em `resolveNaturezaTiny`. **Entretanto**, a invariante CB-003 (rejeitar `tinyValor` vazio com `tinyValorSimples` preenchido) deveria ser enforçada com erro 400 no endpoint `POST /tiny-empresa-natureza-operacao-v2`, mas o código atual apenas faz soft-delete sem essa validação, permitindo contorno da regra via API.

**Tipo:** invariant

**Evidência:**
- `docs/decisions/adr/ADR-003-modelagem-dual-id-natureza-operacao.md:23-31` — decisão de adicionar coluna única nullable `tiny_valor_simples` (migration 108).
- `src/types/tinyNaturezaOperacao.ts:1-9` — contrato de tipo: `tinyValor` (string, required) e `tinyValorSimples` (string | null).
- `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts:322-350` — query busca `tiny_valor` e `tiny_valor_simples` da tabela de mapeamento.
- `supabase/functions/tiny-empresa-natureza-operacao-v2/index.ts:160-178` — contraexemplo: `tinyValor` vazio faz soft-delete sem verificar `tinyValorSimples`; POST `{tinyValor:'', tinyValorSimples:'2002'}` aceito em vez de rejeitar com `NATUREZA_MAPEAMENTO_INCOMPLETO` (CONTRACTS.md §2).

**Regressão se:** `tiny_valor_simples` for removido ou o sistema deixar de consultar seu valor ao enviar pedido — empresas que precisam de naturezas distintas para Simples vs não-Simples emitiriam sempre a mesma natureza, gerando NF classificada erroneamente para um grupo de clientes.

---

### Cliente PF (CPF) nunca é consultado em ReceitaWS; optante permanece null

**Enunciado (verdict: confirmed):** O sistema identifica PF por CNPJ/CPF com 11 dígitos (PJ = 14 dígitos). Para PF, o campo `optante_simples_nacional` permanece null sem tentar consulta, e a `natureza_operacao` é sempre `tiny_valor` (ignora dual-mapping). Confirmado em criação (`isPJ = length === 14`) e em envio (`tipoPessoa === 'J' && cpfCnpj.length === 14`); `resolveNaturezaTiny` trata null como fallback para `tiny_valor`.

**Tipo:** invariant

**Evidência:**
- `supabase/functions/create-cliente-v2/index.ts:333-335` — `isPJ = cpfCnpjSanitized.length === 14`; lookup só prossegue se `isPJ`.
- `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts:408` — `tipoPessoa === 'J' && cpfCnpj.length === 14` exigidos para entrar no bloco de revalidação.
- `docs/specs/SPEC.md:30-31` — RF-001: "Só se aplica a CNPJ" (PJ); para CPF o campo fica permanentemente null.

**Regressão se:** Clientes PF fossem consultados em ReceitaWS — o sistema tentaria classificá-los por status Simples (que PF não possui — só PJ pode ser optante), resultando em dados inválidos e possíveis escolhas de natureza incorretas.

---

### Timeout da requisição ReceitaWS é estritamente 5 segundos (RNF-001)

**Enunciado (verdict: confirmed):** Todas as chamadas `consultarSimplesNacional` usam `AbortController` com timeout de 5 segundos. Se o fetch não completar em 5s, a requisição é abortada e retorna `status='failed'`, `reason='timeout'`. O timeout aplica-se por tentativa (não cumulativo entre retries) — cada `attemptLookup()` cria seu próprio controller e timer. Ambos os callers chamam sem especificar `timeoutMs`, usando o default de 5000ms.

**Tipo:** invariant

**Evidência:**
- `supabase/functions/_shared/receitaws-client.ts:8-9` — `DEFAULT_TIMEOUT_MS = 5_000`.
- `supabase/functions/_shared/receitaws-client.ts:124-126` — `AbortController` criado com timeout; `AbortError` capturado na linha 273.
- `docs/specs/SPEC.md:73-76` — RNF-001 especifica timeout de 5s (Fluxos F-1 e F-2).

**Regressão se:** O timeout aumentasse para 30s, a criação de cliente bloquearia mais tempo e prejudicaria a UX; se removido, chamadas lentas ou travadas cascatariam em timeouts da Edge Function (60s total no Supabase). 5s é o compromisso acordado.

---

### CNPJ sempre mascarado em logs (RNF-003)

**Enunciado (corrigido — verdict: partial):** A função `maskCnpj` mascara CNPJ para logs da ReceitaWS (preservando os 3 primeiros e 2 últimos dígitos; `'12345678901234'` → `'123*****91'`), e todos os eventos de log `receitaws.lookup` usam o campo `cnpjMasked`, nunca o CNPJ em texto claro. **Porém**, o mascaramento NÃO é enforçado em respostas HTTP da API: `/romaneio-logistica-v1`, `/empresas-v2`, `/get-cliente-v2` e `/transportador-logistica-v1` retornam CNPJ sem máscara em suas respostas JSON. O requisito RNF-003 aplica-se apenas a logs ("não aparece em logs"), não a respostas de API.

**Tipo:** invariant

**Evidência:**
- `supabase/functions/_shared/receitaws-client.ts:40-44` — `maskCnpj` preserva 3 primeiros + 2 últimos; retorna `'***'` se input < 5 chars.
- `supabase/functions/_shared/receitaws-client.ts:97,109,259` — `cnpjMasked` computado cedo e usado em todos os `emitLog`.
- `docs/specs/SPEC.md:81-84` — RNF-003 Segurança: CNPJ não aparece em logs em texto claro.
- `supabase/functions/romaneio-logistica-v1/index.ts:219,223` — contraexemplo: retorna `empresaCnpj` e `transportadorCnpj` em texto claro na resposta JSON.

**Regressão se:** O CNPJ bruto fosse logado — exposição de PII violaria regulações de proteção de dados (LGPD, compliance) e vazaria informação comercial sensível (quais empresas estão sendo consultadas quanto ao Simples).

---

## Arch decisions

### DP-006: Empresa sem nenhum dual-mapping pula consulta ReceitaWS (short-circuit)

**Enunciado (corrigido — verdict: partial):** Em RF-003 (envio de pedido ao Tiny), antes de chamar ReceitaWS, o sistema faz `COUNT` com `head:true` na tabela `tiny_empresa_natureza_operacao` filtrando `empresa_id`, `ativo=true`, `deleted_at IS NULL` e `NOT tiny_valor_simples IS NULL`. Se `count=0` (empresa inteira sem dual-mapping), pula o lookup ReceitaWS e usa `tiny_valor` direto com fallback `no_dual_company`. Se o COUNT falha (`dualCountError`), o fail-safe mantém `companyHasDualMapping=true` (comportamento pré-DP-006). **Escopo:** DP-006 é uma otimização específica de RF-003 (envio de pedido), não de RF-001/RF-002 (criação de cliente) — `create-cliente-v2` chama ReceitaWS sem COUNT probe por estar fora do escopo.

**Tipo:** arch-decision

**Evidência:**
- `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts:408-430` — COUNT EXACT com `head:true`; se `dualCountError` → `companyHasDualMapping=true` (fail-safe); senão baseado em `count > 0`.
- `docs/specs/SPEC.md:44-45` — RF-003 otimização (DP-006, 2026-04-24): pular ReceitaWS quando não há dual-mapping (resultado nunca muda a escolha de natureza; poupa latência e cota).
- `supabase/functions/_shared/natureza-resolver.ts:60-61` — trata `companyHasDualMapping=false` retornando fallback `no_dual_company`.

**Regressão se:** O short-circuit fosse contornado (sempre chamando ReceitaWS independentemente de `companyHasDualMapping`) — chamadas de API desnecessárias aumentariam latência e consumo de cota sem alterar nenhuma decisão, desperdiçando recursos e ampliando o risco de dependência externa.

---

### ReceitaWS 429 rate-limit dispara retry único automático após 3s (INC-004)

**Enunciado (corrigido — verdict: partial):** Quando `consultarSimplesNacional` recebe 429 ou detecta padrão rate-limit no response body (INC-005), dorme `RATE_LIMIT_RETRY_DELAY_MS` (3s) e tenta o lookup mais uma vez. Máximo de 1 retry por chamada; se o retry também falha, retorna `status='failed'` com `reason='rate_limited'`. **Nota de observabilidade:** HTTP 429 na tentativa 1 loga com `traceId` (linha 146) em vez de `traceIdAttempt`, criando inconsistência de rastreabilidade, enquanto INC-005 loga corretamente com `traceIdAttempt` (linha 196).

**Tipo:** arch-decision

**Evidência:**
- `supabase/functions/_shared/receitaws-client.ts:55-85` — chama `attemptLookup(params, 1)`; se rate_limited, dorme e tenta `attemptLookup(params, 2)`.
- `supabase/functions/_shared/receitaws-client.ts:143-159,179-209` — detecção HTTP 429 (linha 143) + padrão INC-005 (linha 179) para texto "too many requests" mesmo com HTTP 200.

**Regressão se:** A lógica de retry fosse removida e o primeiro rate-limit falhasse imediatamente — criação de cliente/envio de pedido cairiam em `regime_lookup_falha` com mais frequência em horários de pico, bloqueando pedidos desnecessariamente quando um simples retry teria sucesso.
