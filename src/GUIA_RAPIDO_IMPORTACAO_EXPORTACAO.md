# Guia Rápido - Importação e Exportação de Dados

## 🎯 Acesso Rápido

**Localização:** `Configurações → Importações`

**7 Abas Disponíveis:**
1. 🛒 **Vendas** - Importar vendas
2. 👤 **Clientes** - Importar clientes  
3. 📦 **Produtos** - Importar produtos
4. 👥 **Vendedores** - Importar vendedores
5. 📜 **Histórico** - Ver importações + Desfazer
6. 📤 **Exportar Dados** - Exportar para Excel

---

## 📥 Como Importar (Com Preview)

### Fluxo Básico
```
1. Selecione a aba (Vendas/Clientes/Produtos/Vendedores)
2. Baixar Planilha Modelo
3. Preencher planilha
4. Selecionar Arquivo para Preview
5. Revisar dados e erros
6. Confirmar Importação
```

### Preview - O que você vê
- ✅ Total de registros
- ✅ Quantos são válidos (verde)
- ✅ Quantos têm erro (vermelho)
- ✅ Tabela com primeiras 10 linhas
- ✅ Lista completa de erros

### Decisões no Preview
- **Cancelar** → Corrigir arquivo e tentar de novo
- **Confirmar** → Importa só os registros válidos

---

## 📤 Como Exportar

### Backup Completo
```
1. Aba "Exportar Dados"
2. Botão "Exportar Backup Completo"
3. Arquivo salvo: backup_completo_YYYYMMDD_HHMMSS.xlsx
4. Contém 4 abas: Vendas, Clientes, Produtos, Vendedores
```

### Exportação Individual
```
1. Aba "Exportar Dados"
2. Escolher card (Vendas/Clientes/Produtos/Vendedores)
3. Clicar em "Exportar"
4. Arquivo salvo com nome automático
```

### Uso dos Arquivos Exportados
- 💾 Backup de segurança
- 📊 Análise no Excel/Google Sheets
- 🔄 Migração para outro sistema
- 📝 Auditoria de dados

---

## ⏪ Como Desfazer Importação

### Quando Usar
- ❌ Importou dados incorretos
- 🔄 Importação duplicada por engano
- 🧪 Teste que precisa limpar
- 🔍 Descobriu erro logo após importar

### Passo a Passo
```
1. Aba "Histórico"
2. Localizar a importação
3. Clicar em "Desfazer" (botão laranja)
4. LER O ALERTA (ação irreversível!)
5. Confirmar
6. Aguardar: "X registros removidos"
```

### ⚠️ IMPORTANTE
- **NÃO PODE DESFAZER DUAS VEZES**
- **AÇÃO PERMANENTE**
- **EXPORTAR BACKUP ANTES SE NECESSÁRIO**

---

## 📊 Histórico de Importações

### Informações Disponíveis
- 📅 Data e hora
- 📁 Nome do arquivo
- 👤 Quem importou
- 📈 Total / Sucessos / Erros
- 🎯 Status (Sucesso / Parcial / Erro)

### Ações Disponíveis
- 👁️ **Detalhes** - Ver informações completas
- ⏪ **Desfazer** - Reverter importação (se disponível)

### Filtros
- Todos
- Vendas
- Clientes
- Produtos
- Vendedores

---

## 💡 Casos de Uso Comuns

### 1. Primeira Carga de Dados
```
1. Baixar planilha modelo
2. Preencher com dados históricos
3. Preview para validar
4. Importar
5. Verificar histórico
```

### 2. Backup Semanal
```
Segunda-feira 09:00:
1. Exportar Backup Completo
2. Salvar no Google Drive/OneDrive
3. Manter últimas 4 semanas
```

### 3. Correção de Erro
```
1. Notou erro após importar
2. Histórico → Desfazer
3. Corrigir planilha
4. Importar novamente
```

### 4. Análise de Dados
```
1. Exportar Vendas
2. Abrir no Excel
3. Criar tabela dinâmica
4. Gerar relatórios
```

---

## ⚡ Atalhos e Dicas

### Importação
- ✅ Use sempre o preview
- ✅ Valide dados antes de confirmar
- ✅ Importe em lotes pequenos (facilita correção)
- ✅ Mantenha planilhas organizadas

### Exportação
- ✅ Faça backups regulares
- ✅ Use nomes descritivos
- ✅ Armazene em local seguro
- ✅ Teste restauração periodicamente

### Histórico
- ✅ Consulte antes de reimportar
- ✅ Use para auditoria
- ✅ Desfaça logo se errar
- ✅ Exporte antes de desfazer (segurança)

---

## 🔴 Avisos Críticos

### NÃO FAÇA:
- ❌ Desfazer sem ter certeza
- ❌ Importar sem usar preview
- ❌ Deixar arquivos exportados desprotegidos
- ❌ Deletar backups muito cedo

### SEMPRE FAÇA:
- ✅ Backup antes de grandes mudanças
- ✅ Revisar preview completamente
- ✅ Ler alertas de confirmação
- ✅ Validar dados após importar

---

## 📞 Problemas Comuns

### Preview mostra muitos erros
**Solução:**
1. Revisar lista de erros
2. Corrigir planilha
3. Cancelar e tentar novamente

### Botão Desfazer não aparece
**Motivos:**
- Importação já foi desfeita
- Sem registros importados (100% erro)
- Sistema marcou como não reversível

### Exportação não baixa
**Solução:**
1. Verificar bloqueador de pop-ups
2. Permitir downloads do site
3. Tentar novamente

### Arquivo importado com encoding errado
**Solução:**
1. Salvar planilha como Excel (.xlsx)
2. Não usar CSV
3. Garantir UTF-8

---

## 📈 Estatísticas e Limites

### Capacidade
- ✅ Sem limite teórico de registros
- ✅ Recomendado: Lotes de até 1000 registros
- ✅ Preview mostra primeiras 10 linhas

### Performance
- ⚡ Preview: ~1 segundo
- ⚡ Importação: ~2 segundos
- ⚡ Exportação: ~1 segundo
- ⚡ Desfazer: ~1.5 segundos

### Arquivos
- 📄 Formato: Excel (.xlsx, .xls)
- 📄 Tamanho: Até 10MB recomendado
- 📄 Encoding: UTF-8

---

## 🎓 Recursos Adicionais

### Documentação Completa
- 📖 `/IMPORTACAO_DADOS_README.md` - Guia completo de importação
- 📖 `/IMPORTACAO_PREVIEW_HISTORICO.md` - Preview e histórico detalhados
- 📖 `/EXPORTACAO_DESFAZER_README.md` - Exportação e rollback

### Planilhas Modelo
- Disponíveis em cada aba de importação
- Incluem exemplos preenchidos
- Estrutura pronta para usar

---

## ✅ Checklist Rápido

### Antes de Importar
- [ ] Baixou planilha modelo
- [ ] Preencheu todos campos obrigatórios
- [ ] Dados estão no formato correto
- [ ] Salvou como .xlsx

### Durante Importação
- [ ] Usou preview
- [ ] Revisou erros
- [ ] Conferiu estatísticas
- [ ] Confirmou apenas se OK

### Após Importação
- [ ] Verificou histórico
- [ ] Confirmou registros criados
- [ ] Exportou backup (se importante)
- [ ] Documentou importação

### Backup Regular
- [ ] Exporta semanalmente
- [ ] Armazena em múltiplos locais
- [ ] Testa restauração mensalmente
- [ ] Mantém histórico de versões

---

## 🚀 Resumo Ultra-Rápido

**Importar:**
```
Modelo → Preencher → Preview → Confirmar
```

**Exportar:**
```
Exportar Dados → Escolher Tipo → Baixar
```

**Desfazer:**
```
Histórico → Desfazer → Confirmar (⚠️ Irreversível)
```

**Backup:**
```
Backup Completo → Salvar em Local Seguro
```

---

**Última atualização:** 01/11/2024
**Versão:** 1.2.0
