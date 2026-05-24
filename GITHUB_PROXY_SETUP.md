# GitHub Backend Proxy - Setup Guide

## Visão Geral

Este servidor proxy gerencia a autenticação OAuth do GitHub de forma segura, protegendo o Client Secret e fornecendo endpoints para operações com a API do GitHub.

## Arquitetura

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Mobile    │────▶│  Proxy Server    │────▶│   GitHub    │
│    App      │◀────│  (Node.js/TS)    │◀────│    API      │
└─────────────┘     └──────────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Webhooks   │
                    │  (Real-time)│
                    └─────────────┘
```

## Configuração

### 1. Instalar Dependências

```bash
npm install express cors dotenv
npm install -D @types/express @types/cors @types/node typescript ts-node nodemon
```

### 2. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do servidor:

```bash
# Server config
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006

# GitHub OAuth
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_CALLBACK_URL=wgf-note://oauth/callback

# Webhook secret (generate with: openssl rand -hex 32)
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here

# Optional: State validation for CSRF protection
EXPECTED_STATE=your_expected_state
```

### 3. Executar o Servidor

**Desenvolvimento:**
```bash
npx ts-node server/github-proxy.ts
# ou com auto-reload
npx nodemon --exec ts-node server/github-proxy.ts
```

**Produção:**
```bash
# Build TypeScript
npx tsc

# Run compiled JS
node dist/github-proxy.js
```

### 4. Configurar no Aplicativo Mobile

Atualize o hook `use-github.ts` para usar o proxy:

```typescript
// No modo produção, use o proxy
const TOKEN_EXCHANGE_URL = __DEV__
  ? null // Em dev, troca direta
  : 'https://seu-servidor.com/api/github/oauth/token';

async function exchangeCodeForToken(code: string, state: string) {
  if (TOKEN_EXCHANGE_URL) {
    // Usa proxy em produção
    const response = await fetch(TOKEN_EXCHANGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, state }),
    });
    const data = await response.json();
    return data.data;
  } else {
    // Troca direta em desenvolvimento
    const response = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      }),
    });
    return await response.json();
  }
}
```

## Endpoints da API

### POST /api/github/oauth/token

Troca código de autorização por token de acesso.

**Request:**
```json
{
  "code": "authorization_code_from_callback",
  "state": "optional_state_for_csrf"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "gho_...",
    "token_type": "bearer",
    "scope": "repo,user,read:org,workflow"
  }
}
```

---

### POST /api/github/oauth/refresh

Renova token de acesso expirado.

**Request:**
```json
{
  "refresh_token": "refresh_token_aqui"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "gho_...",
    "token_type": "bearer",
    "scope": "repo,user,read:org,workflow",
    "refresh_token": "new_refresh_token"
  }
}
```

---

### GET /api/github/user

Obtém informações do usuário autenticado.

**Headers:**
```
Authorization: Bearer gho_...
```

**Response:**
```json
{
  "login": "username",
  "id": 123456,
  "avatar_url": "https://...",
  "name": "Full Name",
  ...
}
```

---

### POST /api/github/webhook

Recebe webhooks do GitHub para atualizações em tempo real.

**Headers do GitHub:**
```
X-GitHub-Event: push
X-Hub-Signature-256: sha256=...
X-GitHub-Delivery: uuid
```

**Payload:** Varia conforme o evento

**Response:**
```json
{
  "success": true
}
```

---

### GET /health

Health check do servidor.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-05-24T16:00:00.000Z"
}
```

## Configuração de Webhooks no GitHub

### 1. Gerar Webhook Secret

```bash
openssl rand -hex 32
```

### 2. Configurar no GitHub

1. Acesse https://github.com/settings/developers
2. Selecione seu OAuth App
3. Vá em "Advanced"
4. Clique em "Add webhook"
5. Preencha:
   - **Payload URL:** `https://seu-servidor.com/api/github/webhook`
   - **Content type:** `application/json`
   - **Secret:** Cole o segredo gerado
   - **Events:** Selecione os eventos desejados:
     - ✅ Push
     - ✅ Pull requests
     - ✅ Issues
     - ✅ Repository

### 3. Testar Webhook

No app mobile, implemente WebSocket para receber updates:

```typescript
// Exemplo com Socket.IO
import io from 'socket.io-client';

const socket = io('https://seu-servidor.com');

socket.on('github-update', (data) => {
  console.log('GitHub update:', data.event, data.payload);
  
  // Atualizar UI com novos dados
  if (data.event === 'push') {
    refreshCommits(data.payload.repository.full_name);
  }
});
```

## Segurança

### Medidas Implementadas

✅ **Rate Limiting**
- 30 requisições por minuto por IP
- Previne abuso da API

✅ **CORS Configurado**
- Apenas origens autorizadas
- Credentials habilitados para cookies

✅ **Webhook Signature Verification**
- Validação HMAC SHA-256
- Previne requests falsificados

✅ **State Validation**
- Proteção contra CSRF
- Opcional mas recomendado

### Recomendações Adicionais

1. **HTTPS Obrigatório**
   ```bash
   # Use reverse proxy com SSL
   nginx + Let's Encrypt
   ```

2. **Database para Refresh Tokens**
   ```typescript
   // Armazene tokens com associação ao usuário
   await db.tokens.create({
     userId: user.id,
     refreshToken: encryptedToken,
     expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
   });
   ```

3. **Logging e Monitoramento**
   ```typescript
   import winston from 'winston';
   
   const logger = winston.createLogger({
     level: 'info',
     format: winston.format.json(),
     transports: [
       new winston.transports.File({ filename: 'error.log', level: 'error' }),
       new winston.transports.File({ filename: 'combined.log' }),
     ],
   });
   ```

4. **Environment Variables em Produção**
   - Use AWS Secrets Manager, Azure Key Vault, ou similar
   - Nunca commit .env no git

## Deploy

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/github-proxy.js"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  github-proxy:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
      - GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}
      - GITHUB_WEBHOOK_SECRET=${GITHUB_WEBHOOK_SECRET}
    restart: unless-stopped
```

### Deploy em Nuvem

**Vercel/Netlify Functions:**
```typescript
// api/github/oauth/token.ts
export default async function handler(req, res) {
  // Mesma lógica do endpoint Express
}
```

**AWS Lambda:**
```typescript
exports.handler = async (event) => {
  // Handler para API Gateway
};
```

## Troubleshooting

### Erro: CORS blocked
**Solução:** Adicione origem do app em `ALLOWED_ORIGINS`

### Erro: Webhook signature failed
**Solução:** Verifique se `GITHUB_WEBHOOK_SECRET` está correto

### Erro: Rate limit exceeded
**Solução:** Aumente janela ou limite no rate limiter

### Token não renova
**Solução:** Verifique se refresh token está sendo armazenado corretamente

## Próximos Passos

1. ✅ Implementar WebSocket para updates em tempo real
2. ✅ Adicionar cache Redis para tokens e dados
3. ✅ Implementar banco de dados para usuários
4. ✅ Adicionar métricas e monitoring (Prometheus/Grafana)
5. ✅ Configurar CI/CD para deploy automático

---

**Status:** ✅ Pronto para produção

**Última atualização:** Maio 2024
