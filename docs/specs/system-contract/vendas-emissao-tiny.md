# Contrato — Vendas & Emissão ao Tiny (ERP)

> Regras e invariantes verificadas no código. Não editar sem cotejar impacto.

---

## Invariantes

### Pedido enviado deve ter ID Tiny

**Enunciado:** Quando um pedido é enviado ao Tiny via edge `tiny-enviar-pedido-venda-v1`, o campo `id_tiny` é persistido APENAS após receber um ID válido do Tiny. O status é alterado para 'Em aberto' apenas quando a resposta HTTP da edge function é recebida com sucesso no frontend. Porém, o webhook do Tiny pode alterar o status posteriormente sem validar se a confirmação HTTP inicial foi recebida, criando desincronização possível entre confirmação do usuário e estado real do banco.

- **Tipo:** invariant
- **Evidência:**
  - `src/components/SalesPage.tsx:1102-1107` — GUARD anti falso-sucesso: sem ID Tiny retornado, lança erro e não muda status
  - `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts:706-708` — Valida se `registro.id` existe; se não, lança erro 'Tiny nao retornou id do pedido'
  - `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts:714-728` — Persiste `id_tiny` e `numero_pedido` apenas após confirmação do Tiny
- **Regressão se:** O sistema aceita sucesso sem ID Tiny retornado, ou tenta reenviar um pedido já com `erpPedidoId` preenchido.

---

### Vendedor deve ter idtiny cadastrado

**Enunciado:** Toda venda DEVE estar associada a um vendedor (`vendedor_uuid`). O vendedor DEVE ter registro em `dados_vendedor` com `idtiny` preenchido. Sem `idtiny`, envio ao Tiny é bloqueado com erro 'Vendedor sem idtiny'.

- **Tipo:** invariant
- **Evidência:**
  - `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts:233-266` — Valida `vendedor_uuid`; busca `dados_vendedor`; verifica `idtiny`
  - `src/components/SalesPage.tsx:306-308` — UI mostra erro: 'Vendedor não configurado. Verifique o cadastro do vendedor.'
- **Regressão se:** Sistema permite venda sem vendedor ou com vendedor sem `idtiny`; falha ao validar `vendedor_uuid`.

---

## Regras de negócio

### Natureza de operação obrigatória e mapeada

**Enunciado:** A `natureza_operacao_id` DO PEDIDO é validada e obrigatória apenas via edge function `tiny-enviar-pedido-venda-v1` (mapeamento 1:1 via `tiny_empresa_natureza_operacao` para uma natureza Tiny `tiny_valor` válida para a empresa). Contudo, outras rotas de emissão (`emitirpedido`, `emitir-pedido-sem-vendedor`, `TinyEmitirAPI`) NÃO validam o mapeamento em `tiny_empresa_natureza_operacao`, permitindo envio ao Tiny sem garantir que a natureza Tiny será corretamente informada. O Tiny acabaria usando sua operação padrão, não a natureza pretendida.

- **Tipo:** business-rule
- **Evidência:**
  - `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts:300-320` — Resolve `natureza_operacao_id` do pedido; lança erro se vazio
  - `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts:323-340` — Busca mapeamento em `tiny_empresa_natureza_operacao`; erro se não encontrado
  - `src/components/SalesPage.tsx:300-302` — UI mostra erro resumido: 'Natureza de operação não mapeada para esta empresa'
- **Contraexemplo:** `supabase/functions/emitirpedido/index.ts:93-176` — busca `pedido.natureza_operacao`, consulta `natureza_operacao.tem_comissao` para comissão, monta payload Tiny (linhas 142-176) sem `id_natureza_operacao`, ignorando `tiny_empresa_natureza_operacao`. Permite envio sem mapeamento validado.
- **Regressão se:** Permite envio sem natureza ou com natureza não-mapeada na empresa; muda formato ou localização do mapeamento sem atualizar edge function.

---

### Deleção de pedido é soft delete (deleted_at)

**Enunciado:** Soft-delete com `deleted_at` está implementado (RPC `delete_pedido_venda_v2`). Leitura via RPC (`list_pedido_venda_v2`, `get_pedido_venda_v2`) filtra com `deleted_at IS NULL`. PORÉM a aplicação é inconsistente: (1) `tiny-enviar` valida `deleted_at` em código, não SQL; (2) `tiny-verificar` não valida `deleted_at` — pedidos deletados podem ser verificados no Tiny; (3) `comissoes-v2` não filtra `deleted_at` — pedidos deletados com status Faturado podem gerar comissão. A regra é parcialmente imposta.

- **Tipo:** business-rule
- **Evidência:**
  - `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts:224-226` — Valida `if (!pedido || pedido.deleted_at)` para rejeitar pedidos deletados
  - `src/services/api.ts:4183-4192` — Edge function `pedido-venda-v2` DELETE usa soft delete
- **Contraexemplo:** `supabase/functions/tiny-verificar-pedido-v1/index.ts:62` — query não filtra `deleted_at`; um pedido com `deleted_at` preenchido pode ser recuperado e verificado no Tiny, violando a regra "não aparecem em listas e não podem ser reenviados".
- **Regressão se:** Implementa hard delete ou permite reenviamento de pedidos com `deleted_at` preenchido; queries não filtram `deleted_at`.

---

### Empresa deve ter chave API Tiny

**Enunciado:** A validação de empresa (`ativo=true`, `deleted_at=null`) e `chave_api` (token Tiny) é obrigatória APENAS no fluxo Tiny ERP v1 moderno. Funções Edge legadas (`emitirpedido`, `TinyEmitirAPI`) ainda existem e permitem envio ao Tiny sem validação de estado da empresa ou preenchimento da `chave_api`.

- **Tipo:** business-rule
- **Evidência:**
  - `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts:273-292` — Busca empresa por ID; valida `ativo=true`, `deleted_at=null`; verifica `chave_api` não vazia
  - `src/components/SalesPage.tsx:294-296` — UI mostra erro: 'Empresa sem chave API do Tiny configurada'
- **Contraexemplo:** `supabase/functions/emitirpedido/index.ts:82-91` — função aceita `API_Code` direto do client e envia ao Tiny sem validar empresa em BD; `supabase/functions/TinyEmitirAPI/index.ts:19-30` — função requer apenas token e pedido, sem validação de empresa ou `chave_api` no BD.
- **Regressão se:** Usa empresa inativa ou com `chave_api` vazia; não valida status da empresa antes de enviar.

---

### Cliente deve ter CPF/CNPJ válido

**Enunciado:** Cliente DEVE ter `cpf_cnpj` com exatamente 11 (CPF) ou 14 (CNPJ) dígitos após remoção de caracteres não-numéricos. Sem validação ou com tamanho inválido, envio ao Tiny é bloqueado.

- **Tipo:** business-rule
- **Evidência:**
  - `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts:365-368` — Normaliza CPF/CNPJ, valida comprimento (11 ou 14)
  - `src/components/SalesPage.tsx:297-299` — UI mostra erro: 'CPF/CNPJ do cliente inválido'
- **Regressão se:** Permite cliente com CPF/CNPJ vazio, inválido ou com tamanho errado; pula validação de dígitos.

---

### Pedido deve ter itens

**Enunciado:** Pedido DEVE ter pelo menos 1 item (`pedido_venda_produtos`). No fluxo primário ativo (frontend SalesPage → `tiny-enviar-pedido-venda-v1`), a validação `itens.length > 0` é imposta em ambas as camadas. Existem funções alternativas (`emitir-pedido-sem-vendedor`, `emitirpedido`) que também validam, mas `TinyEmitirAPI` é um proxy genérico sem validação de negócio, não é chamado do frontend e não implementa essa regra.

- **Tipo:** business-rule
- **Evidência:**
  - `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts:496-498` — Valida `itensDb.length > 0`; erro se vazio
  - `src/components/SalesPage.tsx:1083-1086` — Frontend: verifica itens antes de chamar `enviarAoERP`
- **Contraexemplo:** `supabase/functions/TinyEmitirAPI/index.ts:19-29` — função aceita `{ token, pedido }` e passa direto ao Tiny sem validar se `itens.length > 0`; não há verificação de itens na função.
- **Regressão se:** Permite envio de pedido vazio; remove validação de itens; não sincroniza validação entre frontend e edge.

---

### Número de pedido no Tiny é distinto do número local

**Enunciado:** `numero` (formato `PV-YYYY-XXXX`) é gerado no client/frontend durante criação. `numero_pedido` vem do Tiny ERP após envio bem-sucedido. Ambos são persistidos: `numero` identifica no sistema local, `numero_pedido` (Tiny) identifica no ERP. Duplicar pedido cria novo `numero` mas no estado Rascunho, sem `numero_pedido` (pois não foi enviado).

> Nota: verificação desta regra ficou parcial (verdict `partial`; verificação de detalhes falhou). Tratar como não totalmente confirmada — cotejar com o código antes de depender dela.

- **Tipo:** business-rule
- **Evidência:**
  - `src/components/SalesPage.tsx:1160-1173` — `handleDuplicarPedido` copia pedido original mas descarta `id`, `numero_original`, `integracaoERP`, `createdAt`, `updatedAt`
  - `src/components/SalesPage.tsx:1908` — novo `numero` gerado: `PV-2025-${String(Date.now()).substring(7, 11)}`
  - `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts:717-718` — Persiste `numero_pedido` retornado pelo Tiny no banco
- **Regressão se:** Trata `numero` local como identificador único no Tiny; reutiliza `numero` em duplicação; não persiste `numero_pedido` do Tiny.
