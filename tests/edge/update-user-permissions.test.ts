// Rodar com: `deno test --no-check --allow-read tests/edge/update-user-permissions.test.ts`
// Vitest config exclui tests/edge/** — este arquivo é Deno puro.
//
// Regression test INC-018: backoffice permissions were rejected by the
// seller-only whitelist in update-user-v2. Validates that both whitelists
// contain the expected IDs and that backoffice-only IDs are NOT in the
// seller set.

import { assertEquals, assertFalse } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  SUPPORTED_SELLER_PERMISSION_IDS,
  SUPPORTED_BACKOFFICE_PERMISSION_IDS,
} from "../../supabase/functions/_shared/permission-ids.ts";

const BACKOFFICE_ONLY_IDS = [
  'clientes.todos',
  'clientes.aprovar',
  'vendas.todas',
  'relatorios.todos',
  'config.minhas_empresas',
  'config.geral',
  'usuarios.visualizar',
  'usuarios.criar',
  'usuarios.editar',
  'usuarios.excluir',
  'usuarios.permissoes',
  'configuracoes.editar',
  'configuracoes.excluir',
];

Deno.test("backoffice whitelist accepts clientes.todos", () => {
  assertEquals(SUPPORTED_BACKOFFICE_PERMISSION_IDS.has('clientes.todos'), true);
});

Deno.test("seller whitelist rejects clientes.todos", () => {
  assertFalse(SUPPORTED_SELLER_PERMISSION_IDS.has('clientes.todos'));
});

Deno.test("backoffice whitelist is superset of seller whitelist", () => {
  for (const id of SUPPORTED_SELLER_PERMISSION_IDS) {
    assertEquals(
      SUPPORTED_BACKOFFICE_PERMISSION_IDS.has(id),
      true,
      `seller permission '${id}' missing from backoffice whitelist`,
    );
  }
});

Deno.test("all backoffice-only IDs are in backoffice whitelist", () => {
  for (const id of BACKOFFICE_ONLY_IDS) {
    assertEquals(
      SUPPORTED_BACKOFFICE_PERMISSION_IDS.has(id),
      true,
      `backoffice-only permission '${id}' missing from whitelist`,
    );
  }
});

Deno.test("backoffice-only IDs are NOT in seller whitelist", () => {
  for (const id of BACKOFFICE_ONLY_IDS) {
    assertFalse(
      SUPPORTED_SELLER_PERMISSION_IDS.has(id),
      `'${id}' should not be in seller whitelist`,
    );
  }
});

Deno.test("backoffice whitelist matches migration 089 defaults", () => {
  const migration089BackofficeIds = [
    'clientes.visualizar','clientes.criar','clientes.editar','clientes.excluir','clientes.todos','clientes.aprovar',
    'vendas.visualizar','vendas.criar','vendas.editar','vendas.excluir','vendas.todas',
    'relatorios.visualizar','relatorios.todos',
    'config.minhas_empresas','config.geral',
    'usuarios.visualizar','usuarios.criar','usuarios.editar','usuarios.excluir','usuarios.permissoes',
    'contacorrente.visualizar','contacorrente.criar','contacorrente.editar','contacorrente.excluir',
    'produtos.visualizar','produtos.criar','produtos.editar','produtos.excluir',
    'comissoes.visualizar','comissoes.lancamentos.editar','comissoes.lancamentos.excluir',
    'configuracoes.editar','configuracoes.excluir',
  ];

  for (const id of migration089BackofficeIds) {
    assertEquals(
      SUPPORTED_BACKOFFICE_PERMISSION_IDS.has(id),
      true,
      `migration 089 permission '${id}' missing from backoffice whitelist`,
    );
  }
});
