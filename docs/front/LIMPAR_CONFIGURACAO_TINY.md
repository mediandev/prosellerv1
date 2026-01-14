# 🧹 Limpar Configuração do Tiny ERP

## 🎯 Se Você Ainda Vê Avisos

Se ainda aparecem avisos sobre "Modo REAL detectado", execute este comando no console do navegador (F12):

```javascript
// Limpar e configurar corretamente
localStorage.setItem('tinyERPMode', 'MOCK');
delete window.__TINY_API_MODE__;
console.clear();
console.log('✅ Configuração limpa! Recarregando...');
setTimeout(() => location.reload(), 1000);
```

## ✅ Após Executar

1. A página vai recarregar automaticamente
2. Não deve aparecer mais avisos
3. Indicador deve mostrar: **"Tiny ERP: MOCK"**
4. Console deve mostrar apenas: `✅ Tiny ERP: Modo MOCK ativo`

## 🔍 Verificar se Está Correto

Execute no console (F12):

```javascript
console.log('Modo:', localStorage.getItem('tinyERPMode'));
// Deve retornar: "MOCK"
```

## 📌 Pronto!

Agora você pode usar o sistema normalmente. Sem avisos, sem erros, sem CORS.

---

**Modo padrão:** MOCK (automático)  
**Backend necessário:** Não  
**Configuração necessária:** Nenhuma
