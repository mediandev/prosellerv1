# Runbook — Smoke pós-deploy em produção

> Verificação manual rápida (≤ 5 min) para confirmar que o sistema não está visivelmente quebrado após um deploy. **Não substitui** a validação humana do cliente (Valentim) para features sensíveis.

## Quando aplicar

- Imediatamente após qualquer deploy em produção (Netlify, Edge Function, ou flip de feature flag).
- Antes de avisar o cliente "está em produção".

## Credenciais

- URL: **`proseller.app.br`** (fallback `prosaller.netlify.app`).
- Login: **`lucas.carmo@flowcode.cc`** (admin com privilégios — uso restrito a smoke).
- Senha: gerenciada fora do repo (memória do Eduardo / `prod-admin-access.md` na memória do auto-memory).

## Roteiro padrão

### 1. Login (30s)

- Abrir URL em janela anônima (evita cache).
- Login com a credencial.
- Conferir que entrou no dashboard sem erro/tela branca.

### 2. Sidebar e versão (10s)

- Conferir que o ícone ✨ exibe a versão **nova** (`systemVersion` bumpada).
- Hover no tooltip → seção "Novidades em V x.y" aparece no topo.
- Se aplicável (V 1.23+): clicar no link "Ver tudo" → abre `ChangelogPage`.

### 3. Abrir 1 cliente (1 min)

- Menu Clientes → primeiro cliente da lista.
- Conferir que a ficha carrega sem erro (incluindo campo Optante Simples Nacional quando aplicável — INC-003).
- Editar e salvar campo trivial (ex.: telefone) → conferir toast verde.

### 4. Abrir 1 pedido (1 min)

- Menu Vendas → primeiro pedido enviado da lista.
- Conferir que itens, totalizadores e vendedor aparecem.
- (Não enviar) — apenas abrir.

### 5. Smoke específico da PR (variável)

Dependendo do que mudou na PR, adicionar passo:

- **Mudança em `clientes-v2` ou `create-cliente-v2`:** criar 1 cliente de teste com CNPJ válido conhecido, conferir gravação + (se F-001 ligada) log `receitaws.lookup` no painel Supabase.
- **Mudança em `tiny-enviar-pedido-venda-v1`:** **NÃO** enviar pedido real; pedir ao Valentim ou usar pedido de teste isolado.
- **Mudança em comissão (`comissoes-v2`, e-mail):** abrir relatório, conferir PDF gerado.
- **Mudança em import (`ImportCustomersData`):** uploadar planilha-teste pequena (1 linha) e verificar erro/aviso esperado.

### 6. Console do browser (20s)

- F12 → Console.
- Procurar por erros vermelhos não-esperados.
- Erros conhecidos do React DevTools / extensões podem ser ignorados.

### 7. Painel Supabase → Logs (1 min)

- Edge Functions → função tocada pela PR → Logs.
- Conferir requisições recentes com status 200/201.
- Se há `console.log` estruturado (ex.: `receitaws.lookup`), conferir formato.

## Falha durante o smoke

Se algo quebrar:

1. **Não avisar o cliente ainda.**
2. Capturar screenshot + log do browser + log Supabase.
3. Decidir entre **rollback rápido** (Netlify "Publish deploy" anterior, ou redeploy de versão anterior da Edge Function — ver `deploy-edge-function.md`) ou **fix em ondas** (hotfix em branch + novo deploy).
4. Registrar 1 linha em `docs/wiki/log.md` tipo `[BUGFIX]` ou `[BLOCKED]`.

## Smoke aprovado

- 1 linha em `docs/wiki/log.md` tipo `[RELEASE]` ou `[VALIDATION]`.
- Aviso ao cliente (Valentim) por WhatsApp/e-mail conforme combinado, mencionando a versão (V 1.x) e link/bullet do changelog.

## Lições registradas

- **INC-002 / INC-014** — smoke pós-deploy é obrigatório especialmente quando o fluxo afetado é o caminho crítico cliente→pedido→Tiny.
- **F-001** — validação E2E do Valentim continua sendo o gate final, mesmo após smoke passar.

## Referências

- Memória `prod-admin-access.md` (credencial) · CLAUDE.md "Toda PR que dispara deploy bumpa systemVersion".
