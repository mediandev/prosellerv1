# Dados de clientes a recuperar — validação

**Data:** 02/08/2026 · **Origem:** histórico de alterações do próprio sistema

Estes campos tinham valor, foram apagados e **continuam vazios hoje**. Os valores abaixo
são exatamente o que estava gravado antes. Precisamos da sua confirmação para devolvê-los.


## Grupo / Rede (5 clientes)

O cliente estava vinculado a um grupo e ficou sem vínculo.

| Cliente | CNPJ | Valor a restaurar | Apagado em | Por |
|---|---|---|---|---|
| Distribuidora Erotic Ltda - Me | 23.409.956/0001-47 | **EROTIC** | 2026-05-13 | Sistema |
| PONTUAL DISTRIBUIDORA DE PERFUMARIA LTDA | 12.057.585/0001-65 | **PONTUAL** | 2026-05-13 | Sistema |
| SILEO COSMETICOS LTDA | 53873929000191 | **GLOSS** | 2026-05-29 | Lucas |
| ULTRA PLUS COMERCIAL LTDA | 05.498.855/0001-08 | **ULTRAPLUS** | 2026-05-13 | Sistema |
| YUNAH COSMETICOS LTDA | 59013386000119 | **ABAETÉ** | 2026-05-29 | Lucas |

## Nome fantasia (5 clientes)

O nome fantasia foi apagado e o cadastro ficou só com a razão social.

| Cliente | CNPJ | Valor a restaurar | Apagado em | Por |
|---|---|---|---|---|
| BELA SHOP LTDA | 40.170.552/0001-62 | **Primavera do Leste** | 2026-05-13 | Sistema |
| DROGARIA SAO PAULO SA - BA | 61.412.110/0620-02 | **DROGARIA SAO PAULO BA** | 2026-05-13 | Sistema |
| EPOCA COM DIST PROD ALIM IND LTDA | 08.450.457/0001-00 | **EPOCA COMERCIO** | 2026-05-13 | Sistema |
| RAIADROGASIL S/A - CE | 61.585.865/2128-41 | **RAIA DROGASIL CE- cd 2847** | 2026-05-13 | Sistema |
| RAIADROGASIL S/A - PE | 61.585.865/1340-00 | **RAIA DROGASIL PE- cd 2023** | 2026-05-13 | Sistema |

## Vendedor atribuído (6 clientes)

O cliente ficou sem vendedor responsável.

| Cliente | CNPJ | Valor a restaurar | Apagado em | Por |
|---|---|---|---|---|
| BAZAR E PERFUMARIA TABOAO EIRELI | 27.831.689/0001-52 | **Sergio Glezer** | 2026-05-26 | Median ADM |
| CENTRO DE COSMETICOS TERUYA LTDA | 33.261.398/0001-79 | **Sergio Glezer** | 2026-05-26 | Median ADM |
| NEW CENTER COSMETIC LTDA | 55.591.133/0001-71 | **Sergio Glezer** | 2026-05-26 | Median ADM |
| PERFUMARIA 8 DE DEZEMBRO EIRELI - EPP | 28.036.749/0001-08 | **Sergio Glezer** | 2026-05-26 | Median ADM |
| PERFUMARIA ACACIA LTDA | 25.104.583/0001-21 | **Sergio Glezer** | 2026-05-26 | Median ADM |
| PERFUMARIA M BOI MIRIM EIRELI | 31.287.624/0001-65 | **Sergio Glezer** | 2026-05-26 | Median ADM |

---

## Duas observações antes de aprovar

**1. Os casos de vendedor têm autor diferente.** Grupo e nome fantasia foram
apagados pelo **"Sistema"** — é a assinatura do defeito já corrigido. Já os
vendedores foram removidos pela **Median ADM**, ou seja, por uma pessoa. Pode ter
sido uma reatribuição intencional de carteira. **Confirmar antes de devolver.**

**2. Seis casos foram descartados do levantamento** por não serem perda real:
cinco clientes já estavam sem vendedor antes (lista vazia) e um tinha o nome
fantasia preenchido com `--`. Restaurar isso seria devolver vazio.

## Como será feito, se aprovado

Um por um, com o valor exato da tabela acima, e conferência na tela depois.
Nada é sobrescrito: só preenchemos campo que está vazio hoje.
