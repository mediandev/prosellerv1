// Rodar com: `deno test --no-check --allow-env --allow-read tests/edge/cnpj-matriz.test.ts`
//
// Invariante: o Simples Nacional de uma FILIAL é consultado pelo CNPJ da MATRIZ.
//
// O defeito que isto protege (2026-08-06): a ReceitaWS não devolve
// `simples.optante` para filial — responde com o campo nulo, o sistema lê como
// "não sei" e BLOQUEIA a emissão. O pedido 904 (MR COSMETICOS, filial 0002) foi
// recusado 7 vezes seguidas por isso.
//
// Medido na própria API, no dia:
//   63161667000277 (filial) -> optante: null
//   63161667000196 (matriz) -> optante: false
//
// Não é limitação da Receita: o site oficial de Consulta Optantes responde para
// filial. É limitação da API intermediária.
//
// Confirmado pelo cliente: "não é possível ter regime diferente entre matriz e
// filial" — então a matriz responde pela filial.
//
// 338 clientes da base são filiais. Sem isto, cada um trava no primeiro
// faturamento.

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  cnpjDaMatriz,
  ehFilial,
} from "../../supabase/functions/_shared/receitaws-client.ts";

Deno.test("filial é reconhecida pela ordem diferente de 0001", () => {
  assertEquals(ehFilial("63161667000277"), true);   // o caso do pedido 904
  assertEquals(ehFilial("48076228003026"), true);
  assertEquals(ehFilial("16723404000143"), false);  // matriz
  assertEquals(ehFilial(""), false);
  assertEquals(ehFilial("123"), false);             // CNPJ inválido não é filial
});

Deno.test("CNPJ da matriz: o caso real que travou a emissão", () => {
  // Os dois dígitos verificadores mudam junto com a ordem — não basta trocar
  // 0002 por 0001. Este par foi conferido na própria ReceitaWS.
  assertEquals(cnpjDaMatriz("63161667000277"), "63161667000196");
});

Deno.test("CNPJ da matriz: aceita entrada com máscara", () => {
  assertEquals(cnpjDaMatriz("63.161.667/0002-77"), "63161667000196");
});

Deno.test("matriz continua matriz — não pode ser alterada", () => {
  assertEquals(cnpjDaMatriz("16723404000143"), "16723404000143");
  assertEquals(cnpjDaMatriz("48617921000124"), "48617921000124");
});

Deno.test("os verificadores são REcalculados, não copiados", () => {
  // Se alguém 'simplificar' trocando só a ordem e mantendo os dígitos originais,
  // sai um CNPJ inválido e a consulta falha em silêncio. Este caso fixa isso:
  // a resposta NÃO pode terminar com os verificadores da filial ("77").
  const matriz = cnpjDaMatriz("63161667000277");
  assertEquals(matriz.slice(-2) === "77", false);
  assertEquals(matriz.slice(8, 12), "0001");
});

Deno.test("CNPJ inválido é devolvido como está, sem inventar matriz", () => {
  assertEquals(cnpjDaMatriz("123"), "123");
  assertEquals(cnpjDaMatriz(""), "");
});
