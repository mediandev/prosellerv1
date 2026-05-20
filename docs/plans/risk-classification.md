# Risk Classification — ProSeller V1

> Classificação A/B/C/D do Harness v3.2 §7, com **exemplos reais deste projeto**.
> Em dúvida, escolha a classe mais alta.

---

## Classe A — Trivial

Sem contrato, sem RLS sensível, sem produção real, sem cliente impactado se quebrar por minutos.

**Exemplos no projeto:**
- Typo em label do Sidebar.
- Ajuste de cor / margem em um botão.
- Copy de toast (mensagem de sucesso/erro).
- Tooltip nova no ícone ✨ do Sidebar.
- Correção de texto no `ChangelogPage`.
- Renomear variável local em arquivo isolado sem afetar API pública.

**Feed Forward:** item simples no `TODO.md`.
**CI alvo:** N1 (`build` verde).
**Modo:** Standard ou Fast Fix.

---

## Classe B — Normal

Endpoint não-crítico, CRUD em tabela sem RLS sensível, página nova frontend.

**Exemplos no projeto:**
- Adicionar campo opcional em `produtos-v2` payload de resposta.
- Nova página de relatório que **só lê** dados (sem mutações).
- Refactor de componente isolado (sem efeito em fluxo crítico).
- Ajuste em validação de formulário front que **não** envia ao backend.
- Bullet novo em ChangelogPage com link interno.
- Ajuste em mapeador `clientes-v2` que **não toca payload Tiny** nem campo derivado de F-001.

**Feed Forward:** DoR + Feature Contract inline no TODO.
**CI alvo:** N1 + matriz de validação.
**Modo:** Standard ou Fast Fix.

---

## Classe C — Crítica

Auth, pagamento, permissões, dados sensíveis, RLS, qualquer mudança em `*-v2` de domínio comercial.

**Exemplos no projeto:**
- Mudança em `clientes-v2`, `pedido-venda-v2`, `comissoes-v2` (qualquer rota).
- Ajuste de RLS em qualquer tabela.
- Novo campo em payload Tiny **sem migration** (puramente código).
- Mudança em `create-user-v2`, `update-user-v2`, `delete-user-v2`.
- Ajuste em `_shared/auth.ts`.
- Mudança em qualquer cálculo de comissão (mesmo que "óbvio").
- Adicionar lookup novo em `_shared/receitaws-client.ts` (ou outro client externo).
- Refactor que mexa em `_shared/natureza-resolver.ts`.

**Feed Forward:** DoR + Feature Contract detalhado (em arquivo separado se > 40 linhas) + Anti-SPEC revisada.
**CI alvo:** N2 (build + test + edge-tests + contract tests).
**Modo:** Deep Work. Revisão humana sugerida.

---

## Classe D — Produção

Migration, RLS, deploy, env, mudança em natureza de operação Tiny, qualquer toque em `tiny-enviar-pedido-venda-v1` que altere payload, flip de feature flag em produção.

**Exemplos no projeto:**
- **Qualquer migration nova** (DDL em produção).
- Deploy de Edge Function em produção.
- Env var nova (secret Supabase).
- Mudança em `tiny-empresa-natureza-operacao-v2` ou na natureza de operação Tiny.
- **Qualquer toque em `tiny-enviar-pedido-venda-v1`** que altere o payload (sanitização, novo campo, mudança de lookup).
- Flip de feature flag (`FEATURE_SIMPLES_NACIONAL_LOOKUP` ou nova) em produção.
- Mudança no roteamento RLS que afete vendedor x backoffice x admin.
- Promoção de Edge Function de staging para prod.

**Feed Forward:** DoR + Feature Contract + `docs/plans/cursor-brief.md` com **Rollback** obrigatório + (feature flag se contrato público).
**CI alvo:** N3 (e2e + smoke + migration validation — N3 ainda é manual hoje).
**Modo:** Production. **Staging obrigatório.**

---

## Desempates (Harness v3.2 §7)

1. **Toca produção / banco real / envs → D.**
2. **Envolve auth / dinheiro / permissões / dados sensíveis → C.**
3. **Cria/altera contrato público → mínimo B.**
4. **Código isolado sem contrato → A.**
5. **Em dúvida, escolha a classe mais alta.**

---

## Anti-patterns deste projeto

- "Tipo é só um endpoint de leitura, é B" — para áreas sensíveis (clientes/vendas/pedidos/ERP/usuários), o piso é **C**. Lição do INC-003 (GET de `clientes-v2` quebrou exibição de Simples).
- "Migration nova é sempre C porque não toca env" — não. **Migration é D.** Sem exceção.
- "Mudança em payload Tiny é só B porque o contrato é externo" — não. **Mudança em `tiny-enviar-pedido-venda-v1` é D** quando altera payload (lições INC-011, INC-014).
- "Fix de tooltip é A mas vou aproveitar e mexer em `clientes-v2`" — não. Reclassifique para C antes.
