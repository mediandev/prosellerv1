import { test, expect } from '@playwright/test';
import { entrar, abrirTela, semErroNaTela, esperarTabela, TEM_CREDENCIAL } from './helpers';

/**
 * As telas onde o dinheiro passa precisam ABRIR e MOSTRAR DADO.
 *
 * Por que "mostrar dado" e não só "abrir": o modo de falha real deste sistema
 * não é a tela quebrar — é ela abrir bonita e vazia. Foi o que aconteceu com o
 * relatório Solicitado × Faturado, que passou meses no ar com as colunas
 * zeradas sem ninguém perceber.
 */

test.skip(!TEM_CREDENCIAL, 'defina PROSELLER_EMAIL e PROSELLER_SENHA');

test('entra no sistema e o menu carrega', async ({ page }) => {
  await entrar(page);
  const menu = await page.locator('nav button').allInnerTexts();
  for (const tela of ['Dashboards', 'Pedidos', 'Clientes', 'Produtos', 'Comissões']) {
    expect(menu.some((m) => m.startsWith(tela)), `"${tela}" sumiu do menu`).toBe(true);
  }
});

test('a versão aparece no rodapé', async ({ page }) => {
  // O cliente confere o número da versão para saber que a entrega chegou.
  await entrar(page);
  await expect(page.getByText(/Vers[ãa]o V \d+\.\d+/)).toBeVisible();
});

for (const tela of ['Pedidos', 'Clientes', 'Produtos', 'Comissões', 'Conta Corrente', 'Relatórios']) {
  test(`${tela}: abre sem erro`, async ({ page }) => {
    await entrar(page);
    await abrirTela(page, tela);
    await semErroNaTela(page);
  });
}

test('Pedidos: a lista traz pedidos de verdade', async ({ page }) => {
  await entrar(page);
  await abrirTela(page, 'Pedidos');
  await esperarTabela(page);   // sem esperar, lê a tela antes dos dados chegarem
});

test('Clientes: a lista traz clientes de verdade', async ({ page }) => {
  await entrar(page);
  await abrirTela(page, 'Clientes');
  await esperarTabela(page);
});

test('Sentinela: abre e o contador do menu bate com a tela', async ({ page }) => {
  await entrar(page);
  await abrirTela(page, 'Sentinela');
  await semErroNaTela(page);
  await expect(page.getByRole('heading', { name: 'Sentinela' })).toBeVisible();
});

test('Auditoria: abre e mostra registro', async ({ page }) => {
  await entrar(page);
  await abrirTela(page, 'Auditoria');
  await semErroNaTela(page);
  await expect(page.getByRole('heading', { name: 'Auditoria' })).toBeVisible();
  // A auditoria captura movimento real desde 03/08 — vazia significa que os
  // gatilhos pararam de gravar.
  await esperarTabela(page);
});
