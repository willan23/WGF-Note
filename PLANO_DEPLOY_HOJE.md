# 🚀 Plano de Deploy para Hoje - 16 de Janeiro de 2026

## ✅ Status Atual (18:51)

### **Concluído:**
- [x] Ícones criados (todos os tamanhos)
- [x] `eas.json` configurado
- [x] `app.config.ts` configurado
- [x] Política de Privacidade criada
- [x] Email atualizado (willgraca12@gmail.com)
- [x] Projeto criado no Expo (note-py)
- [x] Documentação completa

### **Em Progresso:**
- [ ] **Login no Expo** ⏳ (aguardando senha)
- [ ] Corrigir erros de TypeScript (opcional para build)

### **Pendente:**
- [ ] Build do AAB (20-30 minutos)
- [ ] Criar screenshots do app
- [ ] Hospedar Política de Privacidade
- [ ] Upload no Google Play Console
- [ ] Preencher detalhes da loja
- [ ] Enviar para revisão

---

## 📋 Próximos Passos (Ordem)

### **1. Completar Login no Expo** (2 minutos)
```bash
# Terminal está aguardando
# Digite a senha e pressione Enter
```

### **2. Verificar Login** (30 segundos)
```bash
npx expo whoami
# Deve mostrar: williamfernandes
```

### **3. Iniciar Build do AAB** (30 minutos)
```bash
# Opção 1: Usando script npm
npm run build:android:prod

# Opção 2: Usando EAS diretamente
eas build --platform android --profile production
```

**O que vai acontecer:**
- EAS vai perguntar se quer gerar novo keystore → **YES**
- Build será feito na nuvem (20-30 minutos)
- Você receberá um link para download do AAB

### **4. Criar Screenshots** (10 minutos)
Enquanto o build está rodando, vamos criar screenshots:

```bash
# Opção 1: Executar no emulador
npm run android

# Opção 2: Executar no navegador
npm run dev
```

**Screenshots necessários:**
- Tela do editor (código Python)
- Tela do gestor de ficheiros
- Tela de símbolos
- Tela de preview HTML/CSS
- Tela de configurações
- Mínimo: 2 screenshots
- Recomendado: 5-8 screenshots

### **5. Hospedar Política de Privacidade** (5 minutos)

**Opção 1: GitHub Pages (Grátis)**
```bash
# Criar repositório no GitHub
# Fazer upload do PRIVACY_POLICY.md
# Ativar GitHub Pages
# URL: https://[username].github.io/[repo]/PRIVACY_POLICY.md
```

**Opção 2: Vercel (Grátis)**
```bash
# Instalar Vercel CLI
npm install -g vercel

# Criar pasta para hosting
mkdir privacy-policy
cp PRIVACY_POLICY.md privacy-policy/index.md

# Deploy
cd privacy-policy
vercel --prod
```

**Opção 3: Pastebin/Gist (Mais rápido)**
- Ir para https://gist.github.com
- Criar novo Gist com PRIVACY_POLICY.md
- Copiar URL

### **6. Download do AAB** (2 minutos)
Quando o build terminar:
1. Abrir link fornecido pelo EAS
2. Clicar em "Download"
3. Salvar arquivo `.aab`

### **7. Criar App no Google Play Console** (10 minutos)

1. **Acessar:** https://play.google.com/console
2. **Criar novo app:**
   - Nome: Note Py++
   - Idioma: Português (Brasil)
   - App ou jogo: App
   - Gratuito ou pago: Gratuito

3. **Preencher detalhes:**
   - Descrição curta: "Editor de código Python, HTML e CSS para dispositivos móveis"
   - Descrição completa: (usar texto do DEPLOY_GOOGLE_PLAY.md)
   - Categoria: Ferramentas
   - Email: willgraca12@gmail.com

### **8. Upload do AAB** (5 minutos)

1. **Ir para Produção** → Criar nova versão
2. **Upload do AAB**
3. **Notas de versão:**
```
Versão 1.0.0 - Lançamento Inicial

• Editor de código completo para Python, HTML5 e CSS
• Syntax highlighting e detecção de erros
• Undo/Redo com 100 níveis
• Sistema de ficheiros completo
• Bookmarks e histórico
• Preview em tempo real para HTML/CSS
• Templates e sugestões inteligentes
• Interface profissional e otimizada
```

### **9. Adicionar Assets** (10 minutos)

**Ícone da aplicação:**
- Usar: `assets/images/icon-512.png`
- Tamanho: 512x512px

**Screenshots:**
- Upload dos screenshots criados
- Mínimo 2, recomendado 8

**Banner (opcional):**
- 1024x500px

### **10. Configurar Classificação** (5 minutos)

1. **Classificação de conteúdo:**
   - Categoria: Ferramentas
   - Responder questionário (todas "Não")

2. **Público-alvo:**
   - Faixa etária: 13+
   - Não direcionado para crianças

3. **Política de Privacidade:**
   - URL: (usar URL do passo 5)

### **11. Configurar Países** (2 minutos)

- Selecionar: Todos os países
- Ou específicos: Brasil, Portugal, etc.

### **12. Enviar para Revisão** (1 minuto)

1. Verificar checklist completo
2. Clicar em "Enviar para revisão"
3. Aguardar 1-7 dias

---

## ⏱️ Tempo Total Estimado

- **Preparação:** 1 hora
- **Build:** 30 minutos (automático)
- **Google Play Console:** 30 minutos
- **Total:** ~2 horas

---

## 🎯 Checklist Final

### **Antes de Enviar:**
- [ ] Login no Expo concluído
- [ ] Build AAB concluído
- [ ] Screenshots criados (mínimo 2)
- [ ] Política de Privacidade hospedada
- [ ] Ícone 512x512px pronto
- [ ] Email de contato configurado

### **Google Play Console:**
- [ ] App criado
- [ ] Descrição completa
- [ ] Screenshots adicionados
- [ ] Ícone adicionado
- [ ] Classificação completa
- [ ] Política de privacidade URL
- [ ] AAB enviado
- [ ] Notas de versão
- [ ] Países selecionados

### **Pós-Envio:**
- [ ] Confirmação de envio recebida
- [ ] Email de confirmação
- [ ] Aguardar revisão (1-7 dias)

---

## 💡 Dicas Importantes

### **Se o Build Falhar:**
```bash
# Limpar cache e tentar novamente
eas build --platform android --clear-cache --profile production
```

### **Se Houver Erros de TypeScript:**
- O EAS pode fazer build mesmo com warnings
- Corrigir erros críticos apenas
- Warnings podem ser ignorados

### **Screenshots Rápidos:**
1. Executar `npm run dev`
2. Abrir no navegador
3. Usar DevTools (F12) → Device Mode
4. Selecionar "Pixel 5" ou similar
5. Tirar screenshots (Ctrl+Shift+P → "Capture screenshot")

### **Política de Privacidade Rápida:**
- Usar GitHub Gist (mais rápido)
- Ou criar página simples no Vercel
- Não precisa ser fancy, só precisa existir

---

## 🚨 Problemas Comuns

### **"Keystore já existe"**
- Escolher "Use existing keystore"
- EAS gerencia automaticamente

### **"Build muito grande"**
- Normal para primeira build
- AAB é otimizado automaticamente

### **"Falta informação no Google Play"**
- Seguir checklist do console
- Todas as seções devem estar ✅

---

## 📞 Contatos Úteis

- **Email do desenvolvedor:** willgraca12@gmail.com
- **Expo Dashboard:** https://expo.dev/accounts/wgf-organization/projects/note-py
- **Google Play Console:** https://play.google.com/console

---

## ✅ Próxima Ação AGORA

**PASSO 1:** Ir ao terminal e digitar a senha do Expo

Assim que o login for concluído, vamos iniciar o build! 🚀

---

**Última atualização:** 16 de Janeiro de 2026, 18:51
