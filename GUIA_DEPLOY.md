# 🚀 Guia Completo de Deploy - Note Py++

## 📋 Índice
1. [Pré-requisitos](#pré-requisitos)
2. [Configuração Inicial](#configuração-inicial)
3. [Deploy para Web](#deploy-para-web)
4. [Deploy para Android](#deploy-para-android)
5. [Deploy para iOS](#deploy-para-ios)
6. [Testes Finais](#testes-finais)
7. [Troubleshooting](#troubleshooting)

---

## 🔧 Pré-requisitos

### **Software Necessário**

#### **Para Todos os Deploys**
- ✅ Node.js 18+ ([Download](https://nodejs.org/))
- ✅ npm ou pnpm
- ✅ Expo CLI (`npm install -g expo-cli`)
- ✅ EAS CLI (`npm install -g eas-cli`)
- ✅ Conta Expo ([Criar conta](https://expo.dev/signup))

#### **Para Android**
- ✅ Android Studio ([Download](https://developer.android.com/studio))
- ✅ Java JDK 17+
- ✅ Android SDK (instalado via Android Studio)
- ✅ Conta Google Play Console ([Criar](https://play.google.com/console))

#### **Para iOS** (apenas macOS)
- ✅ Xcode 14+ (Mac App Store)
- ✅ CocoaPods (`sudo gem install cocoapods`)
- ✅ Apple Developer Account ($99/ano) ([Inscrever](https://developer.apple.com/programs/))

#### **Para Web**
- ✅ Servidor web ou serviço de hosting (Vercel, Netlify, Firebase Hosting)

---

## ⚙️ Configuração Inicial

### **1. Verificar Dependências**

```bash
# Navegar para o diretório do projeto
cd "w:\Projetos\python-notepad-plus-plus-mobile (1)"

# Instalar dependências (se ainda não instalou)
npm install

# Verificar se tudo está funcionando
npm run check
```

### **2. Configurar Expo Account**

```bash
# Login no Expo
npx expo login

# Verificar login
npx expo whoami
```

### **3. Configurar EAS (Expo Application Services)**

```bash
# Login no EAS
eas login

# Inicializar EAS no projeto
eas build:configure
```

Isso criará um arquivo `eas.json` na raiz do projeto.

### **4. Atualizar app.config.ts**

Verifique se as informações estão corretas:

```typescript
// app.config.ts
export default {
  name: "Note Py++",
  slug: "python-notepad-plus-plus-mobile",
  version: "1.0.0", // Atualizar versão conforme necessário
  // ... resto da configuração
}
```

---

## 🌐 Deploy para Web

### **Opção 1: Build Local + Hosting Manual**

#### **Passo 1: Build de Produção**

```bash
# Build para web
npx expo export:web

# Ou com otimizações
npx expo export:web --clear
```

Isso criará uma pasta `dist/` com os arquivos estáticos.

#### **Passo 2: Deploy para Vercel**

```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Seguir as instruções no terminal
```

#### **Passo 3: Deploy para Netlify**

```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist

# Seguir as instruções
```

#### **Passo 4: Deploy para Firebase Hosting**

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Inicializar
firebase init hosting

# Configurar:
# - Public directory: dist
# - Single-page app: Yes
# - Automatic builds: No

# Deploy
firebase deploy --only hosting
```

### **Opção 2: Deploy Automático com Expo**

```bash
# Build e deploy automático
npx expo export:web
# Depois hospedar em qualquer serviço
```

---

## 📱 Deploy para Android

### **Opção 1: Build APK (Para Testes)**

#### **Passo 1: Configurar eas.json**

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

#### **Passo 2: Build APK**

```bash
# Build APK para testes
eas build --platform android --profile preview

# Aguardar o build (pode levar 10-20 minutos)
# O link do APK será fornecido ao final
```

#### **Passo 3: Download e Teste**

```bash
# O APK estará disponível em:
# https://expo.dev/accounts/[seu-username]/projects/[projeto]/builds

# Baixar e instalar no dispositivo Android
```

### **Opção 2: Build AAB (Para Google Play Store)**

#### **Passo 1: Criar Keystore**

```bash
# EAS criará automaticamente, ou você pode criar manualmente:
keytool -genkeypair -v -storetype PKCS12 -keystore my-upload-key.keystore \
  -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

#### **Passo 2: Build AAB**

```bash
# Build para produção
eas build --platform android --profile production

# Aguardar o build
```

#### **Passo 3: Configurar Google Play Console**

1. Acesse [Google Play Console](https://play.google.com/console)
2. Criar novo aplicativo
3. Preencher informações:
   - Nome: Note Py++
   - Categoria: Ferramentas
   - Classificação de conteúdo
   - Política de privacidade

#### **Passo 4: Upload do AAB**

1. Ir para **Produção** > **Criar nova versão**
2. Upload do arquivo `.aab`
3. Preencher notas de versão
4. Adicionar screenshots (mínimo 2)
5. Adicionar ícone (512x512px)
6. Adicionar banner (1024x500px)
7. Enviar para revisão

**Tempo de Revisão**: 1-7 dias

---

## 🍎 Deploy para iOS

### **Pré-requisitos**

- ✅ macOS com Xcode instalado
- ✅ Apple Developer Account ativo
- ✅ Certificados e Provisioning Profiles configurados

### **Passo 1: Configurar Apple Developer**

1. Acesse [Apple Developer](https://developer.apple.com/account)
2. Criar App ID:
   - Identifier: `space.manus.python.notepad.plus.plus.mobile.t20260115101649`
   - Name: Note Py++

### **Passo 2: Build para iOS**

```bash
# Build para iOS
eas build --platform ios --profile production

# Aguardar o build (pode levar 20-30 minutos)
```

### **Passo 3: Configurar App Store Connect**

1. Acesse [App Store Connect](https://appstoreconnect.apple.com)
2. Criar novo app
3. Preencher informações:
   - Nome: Note Py++
   - Categoria: Developer Tools
   - Classificação etária
   - Política de privacidade

### **Passo 4: Upload para App Store**

```bash
# O build será automaticamente enviado para App Store Connect
# Ou usar Transporter app para upload manual
```

### **Passo 5: Submeter para Revisão**

1. Adicionar screenshots (obrigatório para todos os tamanhos)
2. Adicionar descrição
3. Adicionar palavras-chave
4. Configurar preço (Grátis ou Pago)
5. Enviar para revisão

**Tempo de Revisão**: 1-3 dias

---

## 🧪 Testes Finais

### **Antes do Deploy**

#### **1. Testes de Funcionalidade**

```bash
# Executar testes unitários
npm test

# Verificar TypeScript
npm run check

# Lint
npm run lint
```

#### **2. Testes Manuais**

- [ ] Criar novo ficheiro
- [ ] Salvar ficheiro
- [ ] Abrir ficheiro
- [ ] Undo/Redo
- [ ] Copy/Paste/Cut
- [ ] Templates
- [ ] Auto-indent
- [ ] Bookmarks
- [ ] Preview HTML/CSS
- [ ] Split view
- [ ] Comentários rápidos
- [ ] Histórico de ficheiros

#### **3. Testes de Performance**

```bash
# Build de produção local
npm run build

# Testar performance
# Verificar tamanho do bundle
# Testar em dispositivos reais
```

### **Dispositivos de Teste Recomendados**

#### **Android**
- Samsung Galaxy S21+ (Android 12+)
- Google Pixel 6 (Android 13+)
- Xiaomi Redmi Note 11 (Android 11+)

#### **iOS**
- iPhone 12 Pro (iOS 15+)
- iPhone 14 (iOS 16+)
- iPad Air (iPadOS 15+)

---

## 📊 Checklist de Deploy

### **Pré-Deploy**

- [ ] Todos os testes passando
- [ ] Versão atualizada em `app.config.ts`
- [ ] Changelog atualizado
- [ ] Screenshots preparados
- [ ] Ícones e assets otimizados
- [ ] Política de privacidade criada
- [ ] Termos de uso criados

### **Durante Deploy**

- [ ] Build bem-sucedido
- [ ] APK/AAB testado em dispositivo real
- [ ] IPA testado via TestFlight
- [ ] Sem erros de lint
- [ ] Sem warnings críticos

### **Pós-Deploy**

- [ ] App disponível nas lojas
- [ ] Testes de download e instalação
- [ ] Monitorar crashes (Sentry, Firebase Crashlytics)
- [ ] Coletar feedback de usuários
- [ ] Preparar próxima versão

---

## 🛠️ Troubleshooting

### **Problemas Comuns**

#### **1. Build Falha no EAS**

```bash
# Limpar cache
eas build:cancel

# Tentar novamente
eas build --platform android --clear-cache
```

#### **2. Erro de Dependências**

```bash
# Limpar node_modules
rm -rf node_modules
npm install

# Ou com cache limpo
npm ci
```

#### **3. Erro de Certificados (iOS)**

```bash
# Revogar e criar novos certificados
eas credentials

# Seguir o wizard
```

#### **4. App Muito Grande**

```bash
# Analisar bundle
npx expo export:web --clear

# Otimizar imagens
# Remover dependências não utilizadas
# Usar code splitting
```

#### **5. Crash ao Iniciar**

- Verificar logs: `adb logcat` (Android) ou Xcode Console (iOS)
- Verificar permissões no `app.config.ts`
- Testar em modo debug primeiro

---

## 📈 Monitoramento Pós-Deploy

### **Ferramentas Recomendadas**

#### **1. Analytics**
```bash
# Instalar Firebase Analytics
npm install @react-native-firebase/analytics

# Ou Expo Analytics
npm install expo-analytics
```

#### **2. Crash Reporting**
```bash
# Instalar Sentry
npm install @sentry/react-native

# Configurar em app.config.ts
```

#### **3. Performance Monitoring**
```bash
# Firebase Performance
npm install @react-native-firebase/perf
```

---

## 🎯 Comandos Rápidos

### **Build Completo (Todas as Plataformas)**

```bash
# Web
npx expo export:web

# Android (APK para teste)
eas build --platform android --profile preview

# Android (AAB para produção)
eas build --platform android --profile production

# iOS
eas build --platform ios --profile production

# Todas as plataformas
eas build --platform all --profile production
```

### **Update OTA (Over-The-Air)**

```bash
# Publicar update sem rebuild
eas update --branch production --message "Bug fixes"

# Usuários receberão o update automaticamente
```

---

## 📝 Notas Importantes

### **Custos Estimados**

- **Expo EAS Build**: Grátis (com limites) ou $29-$99/mês
- **Google Play Console**: $25 (taxa única)
- **Apple Developer**: $99/ano
- **Hosting Web**: $0-$20/mês (Vercel/Netlify grátis para hobby)

### **Tempo Estimado**

- **Setup inicial**: 2-4 horas
- **Build Android**: 15-30 minutos
- **Build iOS**: 20-40 minutos
- **Revisão Google Play**: 1-7 dias
- **Revisão App Store**: 1-3 dias
- **Deploy Web**: 5-15 minutos

### **Atualizações Futuras**

```bash
# Incrementar versão
# Editar app.config.ts: version: "1.0.1"

# Build nova versão
eas build --platform all --profile production

# Ou update OTA (sem rebuild)
eas update --branch production
```

---

## 🎓 Recursos Adicionais

- [Expo Documentation](https://docs.expo.dev/)
- [EAS Build Guide](https://docs.expo.dev/build/introduction/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [App Store Connect Help](https://developer.apple.com/app-store-connect/)
- [React Native Performance](https://reactnative.dev/docs/performance)

---

## ✅ Próximos Passos

1. **Agora**: Testar localmente com `npm run dev`
2. **Hoje**: Build APK para testes
3. **Esta Semana**: Preparar assets e screenshots
4. **Próxima Semana**: Deploy para lojas
5. **Mês 1**: Coletar feedback e iterar

---

**Boa sorte com o deploy! 🚀**

*Última atualização: 15 de Janeiro de 2026*
