# 🚀 Deploy Rápido para Google Play Console

## ✅ Pré-requisito Atendido
Você já tem conta Google Play Console! Vamos direto ao deploy.

---

## 📱 **Passo a Passo Completo**

### **PASSO 1: Preparar o Projeto** (5 minutos)

```bash
# 1. Navegar para o projeto
cd "w:\Projetos\python-notepad-plus-plus-mobile (1)"

# 2. Instalar EAS CLI (se ainda não tem)
npm install -g eas-cli

# 3. Login no Expo
npx expo login
# Digite suas credenciais Expo

# 4. Verificar login
npx expo whoami
```

---

### **PASSO 2: Configurar EAS** (2 minutos)

```bash
# Configurar EAS no projeto
eas build:configure

# Quando perguntar:
# - "Would you like to automatically create an EAS project?" → YES
# - Plataforma → Android
```

Isso criará/atualizará o arquivo `eas.json` (já criado anteriormente).

---

### **PASSO 3: Build AAB para Google Play** (20-30 minutos)

```bash
# Build para produção (AAB - Android App Bundle)
npm run build:android:prod

# OU usando EAS diretamente:
eas build --platform android --profile production

# O EAS vai perguntar algumas coisas:
# 1. "Generate a new Android Keystore?" → YES (primeira vez)
# 2. Aguardar o build (20-30 minutos)
```

**O que acontece:**
- ✅ EAS cria o keystore automaticamente
- ✅ Build é feito na nuvem
- ✅ Você recebe um link para download do AAB

---

### **PASSO 4: Download do AAB** (1 minuto)

Quando o build terminar, você verá:

```
✔ Build finished
https://expo.dev/accounts/[seu-username]/projects/[projeto]/builds/[build-id]
```

1. Abrir o link
2. Clicar em **"Download"**
3. Salvar o arquivo `.aab`

---

### **PASSO 5: Criar App no Google Play Console** (10 minutos)

#### **5.1. Acessar Console**
1. Ir para [Google Play Console](https://play.google.com/console)
2. Clicar em **"Criar app"**

#### **5.2. Informações Básicas**
```
Nome do app: Note Py++
Idioma padrão: Português (Brasil)
App ou jogo: App
Gratuito ou pago: Gratuito
```

#### **5.3. Declarações**
- ✅ Aceitar termos de política de desenvolvedores
- ✅ Declarar conformidade com leis dos EUA

#### **5.4. Criar App**
Clicar em **"Criar app"**

---

### **PASSO 6: Configurar Detalhes do App** (15 minutos)

#### **6.1. Ficha da Loja → Detalhes principais**

**Descrição curta** (80 caracteres):
```
Editor de código Python, HTML e CSS para dispositivos móveis
```

**Descrição completa** (4000 caracteres):
```
Note Py++ - Editor de Código Profissional para Android

Edite código Python, HTML5 e CSS diretamente no seu dispositivo móvel com um editor completo e poderoso!

🎯 RECURSOS PRINCIPAIS:

✅ Editor de Código Avançado
• Syntax highlighting para Python, HTML5 e CSS
• Numeração de linhas
• Auto-indentação inteligente
• Detecção automática de erros
• Comentários rápidos (Ctrl+/)

✅ Gerenciamento de Ficheiros
• Criar, abrir, salvar ficheiros
• Navegação de pastas
• Histórico de 20 ficheiros recentes
• Bookmarks para linhas importantes
• Copiar, mover, renomear ficheiros

✅ Funcionalidades Profissionais
• Undo/Redo com 100 níveis
• Copy/Cut/Paste com histórico
• Pesquisa e substituição
• Templates de código prontos
• Sugestões inteligentes
• Preview em tempo real (HTML/CSS)
• Split view (editor + preview)

✅ Multi-Linguagem
• Python completo
• HTML5 com validação
• CSS com validação
• Detecção automática de linguagem

✅ Interface Otimizada
• Design profissional
• Tema claro e escuro
• Otimizado para portrait
• Uso com uma mão
• Navegação por tabs

✅ Ferramentas Avançadas
• Terminal de saída
• Explorador de símbolos
• Análise de código
• Formatação automática
• Execução de código

IDEAL PARA:
• Desenvolvedores Python
• Web developers
• Estudantes de programação
• Programadores mobile
• Quem precisa editar código em movimento

GRÁTIS e SEM ANÚNCIOS!

Baixe agora e comece a programar no seu Android!
```

**Ícone do app**: 512x512px (criar se ainda não tem)

**Screenshots**: Mínimo 2, recomendado 8
- Telefone: 16:9 ou 9:16
- Resolução mínima: 320px
- Resolução máxima: 3840px

#### **6.2. Categoria**
```
Categoria: Ferramentas
Tags: editor, código, programação, python, desenvolvimento
```

#### **6.3. Detalhes de Contato**
```
Email: willgraca12@gmail.com
Website: (opcional)
Telefone: (opcional)
```

#### **6.4. Política de Privacidade**
URL obrigatória. Criar uma página simples:

```markdown
# Política de Privacidade - Note Py++

Última atualização: 15 de Janeiro de 2026

## Coleta de Dados
Este aplicativo NÃO coleta dados pessoais dos usuários.

## Armazenamento Local
Todos os ficheiros são armazenados localmente no dispositivo.

## Permissões
- Armazenamento: Para salvar e abrir ficheiros

## Contato
Para dúvidas: willgraca12@gmail.com
```

Hospedar em: GitHub Pages, Vercel, ou qualquer hosting grátis.

---

### **PASSO 7: Upload do AAB** (5 minutos)

#### **7.1. Ir para Produção**
1. Menu lateral → **Produção**
2. Clicar em **"Criar nova versão"**

#### **7.2. Upload**
1. Arrastar o arquivo `.aab` para a área de upload
2. Aguardar processamento (1-2 minutos)

#### **7.3. Notas de Versão**
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

---

### **PASSO 8: Classificação de Conteúdo** (5 minutos)

1. Menu → **Classificação de conteúdo**
2. Clicar em **"Iniciar questionário"**
3. Selecionar categoria: **Ferramentas**
4. Responder perguntas (todas "Não" para editor de código)
5. Salvar

---

### **PASSO 9: Público-Alvo e Conteúdo** (5 minutos)

#### **9.1. Público-Alvo**
```
Faixa etária: 13+
Motivo: Ferramenta educacional/profissional
```

#### **9.2. Apps para Crianças**
```
Não, este app não é direcionado para crianças
```

---

### **PASSO 10: Configurar Países** (2 minutos)

1. Menu → **Países/regiões**
2. Selecionar países:
   - ✅ Brasil
   - ✅ Portugal
   - ✅ Todos os países (recomendado)
3. Salvar

---

### **PASSO 11: Revisão e Publicação** (2 minutos)

#### **11.1. Verificar Checklist**
O Google Play Console mostrará uma checklist. Certifique-se de que tudo está ✅:

- ✅ Detalhes do app preenchidos
- ✅ Screenshots adicionados
- ✅ Ícone do app adicionado
- ✅ Classificação de conteúdo completa
- ✅ Público-alvo definido
- ✅ Política de privacidade adicionada
- ✅ AAB enviado

#### **11.2. Enviar para Revisão**
1. Voltar para **Produção**
2. Clicar em **"Enviar para revisão"**
3. Confirmar

---

## ⏱️ **Tempo de Revisão**

- **Primeira revisão**: 1-7 dias (geralmente 2-3 dias)
- **Atualizações futuras**: 1-2 dias

Você receberá email quando:
- ✅ App for aprovado
- ❌ Houver problemas (raro se seguiu os passos)

---

## 📊 **Comandos Úteis**

```bash
# Ver status do build
eas build:list

# Cancelar build
eas build:cancel

# Build novo AAB
npm run build:android:prod

# Update OTA (sem rebuild)
npm run update:ota
```

---

## 🎯 **Checklist Rápido**

### **Antes do Build**
- [ ] `npm run check` (sem erros)
- [ ] `npm run lint` (sem erros)
- [ ] `npm test` (testes passando)
- [ ] Versão atualizada em `app.config.ts`

### **Assets Necessários**
- [ ] Ícone 512x512px
- [ ] Mínimo 2 screenshots
- [ ] Banner 1024x500px (opcional)
- [ ] Política de privacidade hospedada

### **Google Play Console**
- [ ] App criado
- [ ] Detalhes preenchidos
- [ ] Screenshots adicionados
- [ ] Classificação completa
- [ ] AAB enviado
- [ ] Submetido para revisão

---

## 🚀 **Começar AGORA**

```bash
# 1. Login no Expo
npx expo login

# 2. Configurar EAS
eas build:configure

# 3. Build AAB
npm run build:android:prod

# 4. Aguardar 20-30 minutos
# 5. Download do AAB
# 6. Upload no Google Play Console
```

---

## 💡 **Dicas Importantes**

### **Screenshots**
Se não tem screenshots ainda, pode:
1. Executar o app no emulador Android
2. Tirar screenshots das telas principais
3. Ou usar ferramentas como [Previewed](https://previewed.app/)

### **Ícone**
Se não tem ícone 512x512px:
1. Usar o ícone atual do projeto
2. Redimensionar para 512x512px
3. Ou criar um novo com [Canva](https://canva.com)

### **Primeira Publicação**
- Pode levar até 7 dias
- Seja paciente
- Verifique email regularmente

### **Atualizações Futuras**
```bash
# 1. Atualizar versão em app.config.ts
version: "1.0.1"

# 2. Build novo AAB
npm run build:android:prod

# 3. Upload no Google Play Console
# 4. Revisão mais rápida (1-2 dias)
```

---

## ❓ **Problemas Comuns**

### **Build Falha**
```bash
# Limpar cache e tentar novamente
eas build --platform android --clear-cache --profile production
```

### **AAB Rejeitado**
- Verificar se a versão é maior que a anterior
- Verificar se o keystore é o mesmo
- Verificar logs de erro no console

### **App Rejeitado na Revisão**
- Ler email do Google com motivo
- Corrigir problema
- Reenviar

---

## 🎉 **Pronto!**

Siga esses passos e seu app estará no Google Play em poucos dias!

**Boa sorte! 🚀**

---

**Próximo passo**: Execute `npm run build:android:prod` agora!
