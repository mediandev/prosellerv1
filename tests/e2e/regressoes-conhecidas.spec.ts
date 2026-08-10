import { test, expect } from '@playwright/test';
import { entrar, abrirTela, esperarTabela, TEM_CREDENCIAL } from './helpers';

/**
 * Cada caso aqui é um defeito que JÁ chegou em produção e foi corrigido.
 *
 * Todos passaram pelos testes automáticos da época e só apareceram quando
 * alguém abriu o navegador. É por isso que estes existem: são exatamente a
 * classe de coisa que compila, passa em tudo, e está errada.
 */

test.skip(!TEM_CREDENCIAL, 'defina PROSELLER_EMAIL e PROSELLER_SENHA');

test('V 1.91 · link direto abre a tela pedida, não o Dashboard', async ({ page }) => {
  // Quebrou duas vezes: o efeito de login sobrescrevia a tela vinda da URL.
  // É o que faz o botão "Resolver agora" dos e-mails funcionar.
  await entrar(page, 'sentinela');
  await expect(page.getByRole('heading', { name: 'Sentinela' })).toBeVisible();

  await page.goto('/#/produtos');
  await page.reload();
  await page.waitForTimeout(3000);
  const ativo = await page.locator('nav button.bg-primary, nav button[class*="bg-primary"]')
    .first().innerText().catch(() => '');
  expect(ativo, 'o link #/produtos não abriu a tela de Produtos').toContain('Produtos');
});

test('V 1.87 · texto da Auditoria não sai com toda palavra em maiúscula', async ({ page }) => {
  // A classe `capitalize` do CSS maiusculiza CADA palavra:
  // "Alterou As Permissões De Cicero Rocha Costa".
  await entrar(page, 'auditoria');
  await esperarTabela(page);
  const linhas = await page.locator('table tbody tr td:nth-child(4)').allInnerTexts();

  const comMaiusculaErrada = linhas.find((t) => / (As|De|Do|Da|O|A|Em) /.test(t));
  expect(comMaiusculaErrada, 'texto com toda palavra capitalizada voltou').toBeUndefined();
});

test('V 1.81 · selos da Auditoria têm cor', async ({ page }) => {
  // Cor definida com classe inexistente no CSS pré-compilado não pinta e não
  // dá erro: os selos de Criação e Exclusão saíram invisíveis em produção.
  await entrar(page, 'auditoria');
  await esperarTabela(page);
  const selo = page.locator('table tbody tr td:nth-child(3) span').first();
  await expect(selo).toBeVisible();
  const fundo = await selo.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(fundo, 'o selo de ação está sem cor de fundo')
    .not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
});

test('V 1.77 · valores em reais aparecem formatados', async ({ page }) => {
  // O resumo do relatório mostrava "R$ 10992.39" enquanto a tabela logo abaixo
  // já mostrava "R$ 7.351,35".
  await entrar(page, 'relatorios');
  await page.getByText('Análise Solicitado X Faturado').click();
  await page.waitForTimeout(4000);

  const corpo = await page.locator('body').innerText();
  const valores = corpo.match(/R\$\s?[\d.,]+/g) ?? [];
  expect(valores.length, 'o relatório não mostrou nenhum valor').toBeGreaterThan(0);

  // Formato brasileiro: vírgula nos centavos. "R$ 1234.56" é o defeito.
  const malFormatado = valores.find((v) => /R\$\s?\d+\.\d{2}$/.test(v));
  expect(malFormatado, `valor sem formatação brasileira: ${malFormatado}`).toBeUndefined();
});

test('V 1.74 · CEP é exibido com máscara', async ({ page }) => {
  // O CEP era gravado quebrado ("13.345400"). Deve aparecer NN.NNN-NNN.
  await entrar(page, 'clientes');
  await page.waitForTimeout(2500);

  const corpo = await page.locator('body').innerText();
  const ceps = corpo.match(/\d{2}\.?\d{3}-?\d{3}/g) ?? [];
  const quebrado = ceps.find((c) => /^\d{2}\.\d{6}$/.test(c));
  expect(quebrado, `CEP em formato quebrado voltou: ${quebrado}`).toBeUndefined();
});

test('V 1.78 · o Kanban oferece só colunas que o banco aceita', async ({ page }) => {
  // A coluna "Aguardando Agendamento" existia na tela e o banco recusava o
  // frete arrastado para ela. Oferecer o que não funciona é pior que não ter.
  await entrar(page, 'logistica');
  await page.getByRole('button', { name: 'Kanban' }).click();
  await page.waitForTimeout(3000);

  const corpo = await page.locator('body').innerText();
  expect(corpo, 'o Kanban não carregou').toContain('Em Separação');
  expect(corpo, 'o status legado "Em Trânsito - Reentrega" voltou ao Kanban')
    .not.toContain('Em Trânsito - Reentrega');
});
