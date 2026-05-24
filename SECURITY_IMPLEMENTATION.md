# Sistema de Segurança - WGF Note

## Visão Geral

Este documento descreve as camadas de segurança implementadas e as melhorias que podem ser adicionadas ao projeto WGF Note.

## Estado Atual da Segurança

### ✅ Implementado

1. **Autenticação JWT**
   - Tokens JWT com assinatura HS256
   - Armazenamento seguro em SecureStore (nativo) / localStorage (web)
   - Expiração configurável (padrão: 1 ano)
   - Renovação automática de sessão

2. **OAuth 2.0**
   - Integração com provedor OAuth externo
   - Fluxo de autorização code grant
   - Suporte para login social
   - Callback seguro com validação de state

3. **Autorização Baseada em Roles**
   - Middleware `protectedProcedure` para rotas autenticadas
   - Middleware `adminProcedure` para rotas administrativas
   - Verificação de permissões no contexto tRPC

4. **Armazenamento Seguro**
   - expo-secure-store para dados sensíveis (nativo)
   - Cookies HttpOnly e Secure para sessão (web)
   - Separação de dados por plataforma

5. **HTTPS/SSL**
   - Forçado em produção
   - Configuração de certificados

### 🆕 Novas Implementações

#### 1. Rate Limiting (`lib/security/rate-limiter.ts`)

Proteção contra abuso e ataques DDoS:

```typescript
import { authRateLimit, apiRateLimit } from '@/lib/security/rate-limiter';

// Uso em rotas de autenticação
app.post('/api/auth/login', authRateLimit, loginHandler);

// Uso em rotas gerais da API
app.use('/api/', apiRateLimit);
```

**Configurações disponíveis:**
- `general`: 100 req/15min
- `auth`: 10 req/15min (mais restritivo)
- `upload`: 10 req/1min
- `sensitive`: 5 req/5min
- `strict`: 5 req/1min (anti-brute force)

#### 2. Validação e Sanitização (`lib/security/data-validator.ts`)

Prevenção contra XSS, SQL Injection e ataques de injeção:

```typescript
import { sanitizeHtml, validateWithSchema, commonSchemas } from '@/lib/security/data-validator';

// Sanitizar input de usuário
const cleanInput = sanitizeHtml(userInput, { 
  allowHtml: false, 
  maxLength: 1000,
  trim: true 
});

// Validar com schema Zod
const result = validateWithSchema(commonSchemas.email, email);
```

**Funcionalidades:**
- Sanitização de HTML/XSS
- Validação de email, URL, UUID
- Schemas predefinidos (senha forte, username, etc.)
- Middleware de validação para Express

#### 3. Auditoria e Logging (`lib/security/audit-logger.ts`)

Registro de eventos críticos para compliance e análise forense:

```typescript
import { auditLogger, AuditEventType } from '@/lib/security/audit-logger';

// Log de eventos
auditLogger.logLoginSuccess(userId, email, ipAddress);
auditLogger.logSuspiciousActivity('Multiple failed logins', ipAddress, userId);
auditLogger.logDataAccess(userId, '/api/sensitive-data', ipAddress);

// Buscar logs
const logs = auditLogger.searchLogs({
  eventType: AuditEventType.LOGIN_FAILURE,
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
  severity: 'high'
});
```

**Tipos de eventos:**
- Autenticação (login, logout, MFA)
- Autorização (permissões, roles)
- Dados (acesso, modificação, exclusão)
- Sistema (erros, config changes)
- Arquivos (upload, download, delete)

#### 4. Headers de Segurança (`lib/security/security-headers.ts`)

Implementação de headers OWASP recomendados:

```typescript
import { securityHeaders, cspPresets } from '@/lib/security/security-headers';

// Middleware completo
app.use(securityHeaders());

// Ou com configurações customizadas
app.use(securityHeaders({
  csp: cspPresets.strict,
  hsts: { enabled: true, maxAge: 31536000, preload: true },
  frameOptions: { enabled: true, action: 'DENY' }
}));
```

**Headers implementados:**
- Content-Security-Policy (CSP)
- Strict-Transport-Security (HSTS)
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Referrer-Policy
- Permissions-Policy
- Cross-Origin-* policies
- Cache-Control para dados sensíveis

## Melhorias Recomendadas

### 🔒 Alta Prioridade

1. **Autenticação de Dois Fatores (2FA/MFA)**
   ```typescript
   // Implementar com TOTP (Google Authenticator)
   - Gerar secret key por usuário
   - Validar códigos time-based
   - Backup codes para recuperação
   ```

2. **Proteção CSRF**
   ```typescript
   // Tokens CSRF para formulários e APIs state-changing
   - csurf middleware para Express
   - Double-submit cookie pattern
   - SameSite cookie attribute
   ```

3. **Criptografia de Dados Sensíveis**
   ```typescript
   // Criptografar dados em repouso
   - AES-256-GCM para dados críticos
   - Chaves gerenciadas via HSM ou AWS KMS
   - Rotação periódica de chaves
   ```

4. **Validação de Upload de Arquivos**
   ```typescript
   // Prevenir upload de malware
   - Verificar MIME type real (magic numbers)
   - Scan com ClamAV ou similar
   - Limitar tamanho e tipos permitidos
   - Armazenar fora do webroot
   ```

### 🛡️ Média Prioridade

5. **Gestão de Segredos**
   ```bash
   # Usar variáveis de ambiente seguras
   - .env não versionado
   - AWS Secrets Manager / Azure Key Vault
   - Nunca hardcode credentials
   ```

6. **Monitoramento de Segurança**
   ```typescript
   - Detecção de anomalias
   - Alertas para atividades suspeitas
   - Dashboard de segurança
   - Integração com SIEM
   ```

7. **Segurança de Dependências**
   ```bash
   # Auditar pacotes regularmente
   pnpm audit
   npm audit fix
   
   # Usar dependências fixas (sem ^ ou ~)
   # Revisar changelogs antes de atualizar
   ```

8. **Proteção de API**
   ```typescript
   - API keys para acesso programático
   - Rate limiting por API key
   - Validação de origin/cors estrita
   - Request signing para operações críticas
   ```

### 📋 Baixa Prioridade

9. **Privacidade e Compliance**
   ```
   - GDPR compliance
   - LGPD compliance
   - Política de retenção de dados
   - Consent management
   ```

10. **Hardening de Infraestrutura**
    ```
    - Web Application Firewall (WAF)
    - DDoS protection (Cloudflare, AWS Shield)
    - Network segmentation
    - Regular penetration testing
    ```

## Como Integrar

### No Servidor Express

```typescript
// server/_core/index.ts ou routers.ts
import { securityHeaders } from '@/lib/security/security-headers';
import { apiRateLimit, authRateLimit } from '@/lib/security/rate-limiter';
import { createAuditMiddleware } from '@/lib/security/audit-logger';

// Headers de segurança (primeiro middleware)
app.use(securityHeaders());

// Rate limiting geral
app.use('/api/', apiRateLimit);

// Auditoria
app.use(createAuditMiddleware({ 
  skipPaths: ['/health', '/metrics'],
  logBody: false 
}));

// Rotas de autenticação com rate limit extra
app.post('/api/auth/login', authRateLimit, loginHandler);
app.post('/api/auth/register', authRateLimit, registerHandler);
```

### Validação de Inputs

```typescript
// Em qualquer rota que receba dados do usuário
import { validateWithSchema, commonSchemas, sanitizeHtml } from '@/lib/security/data-validator';

app.post('/api/users', (req, res, next) => {
  const result = validateWithSchema(
    z.object({
      email: commonSchemas.email,
      name: commonSchemas.nonEmptyString.max(100),
      password: commonSchemas.password
    }),
    req.body,
    { trim: true, maxLength: 1000 }
  );
  
  if (!result.success) {
    return res.status(400).json({ errors: result.errors });
  }
  
  // Dados validados e sanitizados
  const { email, name, password } = result.data;
  // ... continuar processamento
});
```

### Auditoria de Eventos Críticos

```typescript
// Em operações sensíveis
import { auditLogger } from '@/lib/security/audit-logger';

// Login
try {
  const user = await authenticate(email, password);
  auditLogger.logLoginSuccess(user.id, user.email, req.ip);
} catch (error) {
  auditLogger.logLoginFailure(email, req.ip, undefined, error.message);
  throw error;
}

// Acesso a dados sensíveis
app.get('/api/sensitive-data', async (req, res) => {
  const data = await getSensitiveData(req.user.id);
  
  auditLogger.logDataAccess(
    req.user.id,
    '/api/sensitive-data',
    req.ip,
    { recordCount: data.length }
  );
  
  res.json(data);
});
```

## Checklist de Segurança

### Desenvolvimento
- [ ] Validar todos os inputs do usuário
- [ ] Sanitizar outputs para prevenir XSS
- [ ] Usar prepared statements para SQL
- [ ] Não expor stack traces em produção
- [ ] Logar tentativas de acesso falhas
- [ ] Implementar timeout de sessão
- [ ] Usar HTTPS em todas as comunicações

### Deploy
- [ ] Variáveis de ambiente configuradas
- [ ] Secrets não versionados
- [ ] Headers de segurança ativos
- [ ] Rate limiting habilitado
- [ ] Logs centralizados
- [ ] Monitoramento ativo
- [ ] Backup e recovery testados

### Manutenção
- [ ] Dependencies atualizadas
- [ ] Security patches aplicados
- [ ] Logs revisados periodicamente
- [ ] Penetration tests regulares
- [ ] Plano de resposta a incidentes
- [ ] Treinamento de segurança da equipe

## Referências

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)

## Contato

Para questões de segurança, reportar vulnerabilidades ou sugerir melhorias, contactar a equipe de desenvolvimento.
