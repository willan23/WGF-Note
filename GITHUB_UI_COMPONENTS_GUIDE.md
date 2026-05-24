# Integração GitHub - WGF Note

## Visão Geral

Sistema completo de integração com o GitHub para o WGF Note, permitindo autenticação OAuth 2.0, exploração de repositórios, visualização de arquivos, commits e estatísticas detalhadas.

## Componentes Implementados

### 📁 Componentes de UI

#### 1. GitHubLoginButton
**Local:** `components/github/github-login-button.tsx`

Botão estilizado para autenticação OAuth com GitHub.

**Props:**
- `clientId?: string` - ID do aplicativo GitHub (opcional, usa variável de ambiente)
- `onSuccess?: () => void` - Callback após login bem-sucedido
- `onError?: (error: Error) => void` - Callback em caso de erro
- `variant?: 'primary' | 'secondary' | 'outline'` - Estilo do botão
- `size?: 'small' | 'medium' | 'large'` - Tamanho do botão
- `disabled?: boolean` - Estado desabilitado
- `text?: string` - Texto personalizado

**Exemplo de uso:**
```tsx
<GitHubLoginButton 
  size="large" 
  onSuccess={() => console.log('Login realizado!')}
/>
```

---

#### 2. RepositoryCard
**Local:** `components/github/repository-card.tsx`

Card informativo exibindo detalhes de um repositório.

**Props:**
- `repository: GitHubRepository` - Objeto do repositório
- `onPress?: (repo: GitHubRepository) => void` - Callback ao clicar
- `showOwner?: boolean` - Exibir nome do proprietário
- `compact?: boolean` - Modo compacto

**Informações exibidas:**
- Nome e descrição
- Visibilidade (público/privado)
- Linguagem principal
- Stars, forks e issues
- Data de atualização

**Exemplo de uso:**
```tsx
<RepositoryCard 
  repository={repo} 
  showOwner 
  onPress={(r) => navigation.navigate('RepoDetail', { repo: r })}
/>
```

---

#### 3. RepositoryStatsCard
**Local:** `components/github/repository-stats-card.tsx`

Card detalhado com estatísticas completas do repositório.

**Props:**
- `stats: RepositoryStats` - Estatísticas do repositório
- `compact?: boolean` - Modo compacto
- `onTopicPress?: (topic: string) => void` - Callback ao clicar em topic

**Recursos:**
- Grid de estatísticas (stars, forks, issues, watchers)
- Distribuição de linguagens com barras de progresso
- Topics clicáveis
- Informações de licença e datas
- Badges de recursos (Wiki, Pages, etc.)

**Exemplo de uso:**
```tsx
<RepositoryStatsCard 
  stats={{
    name: 'react',
    fullName: 'facebook/react',
    stars: 200000,
    forks: 40000,
    language: 'JavaScript',
    languages: { JavaScript: 80, TypeScript: 20 },
    // ... outras props
  }}
/>
```

---

#### 4. GitHubFileBrowser
**Local:** `components/github/file-browser.tsx`

Navegador de arquivos de repositório com navegação hierárquica.

**Props:**
- `owner: string` - Proprietário do repositório
- `repo: string` - Nome do repositório
- `branch?: string` - Branch (padrão: 'main')
- `initialPath?: string` - Caminho inicial
- `onFileSelect?: (file, content) => void` - Callback ao selecionar arquivo

**Recursos:**
- Navegação por diretórios
- Ícones por tipo de arquivo
- Pull-to-refresh
- Breadcrumb de caminho
- Download de arquivos

**Exemplo de uso:**
```tsx
<GitHubFileBrowser
  owner="facebook"
  repo="react"
  branch="main"
  onFileSelect={(file, content) => {
    console.log(file.path, content);
  }}
/>
```

---

#### 5. GitHubCommitList
**Local:** `components/github/commit-list.tsx`

Lista de commits com busca e filtragem por autor.

**Props:**
- `owner: string` - Proprietário do repositório
- `repo: string` - Nome do repositório
- `branch?: string` - Branch (padrão: 'main')
- `onCommitSelect?: (commit) => void` - Callback ao selecionar commit
- `maxCommits?: number` - Máximo de commits (padrão: 100)

**Recursos:**
- Busca por mensagem, autor ou SHA
- Filtro por autor com chips
- Verificação de assinatura (badge)
- Formatação relativa de datas
- Pull-to-refresh

**Exemplo de uso:**
```tsx
<GitHubCommitList
  owner="facebook"
  repo="react"
  onCommitSelect={(commit) => {
    console.log(commit.sha, commit.commit.message);
  }}
/>
```

---

### 🖥️ Telas

#### GitHubScreen
**Local:** `app/(tabs)/github/index.tsx`

Tela principal de integração com navegação por abas.

**Abas:**
1. **Repositórios** - Lista de repositórios do usuário
2. **Arquivos** - Navegador de arquivos do repositório selecionado
3. **Commits** - Histórico de commits
4. **Stats** - Estatísticas detalhadas

**Funcionalidades:**
- Autenticação OAuth integrada
- Busca de repositórios no GitHub
- Seleção de repositórios
- Navegação entre abas contextual
- Modal de busca
- Estados de loading e erro

---

## Configuração

### 1. Registrar Aplicação no GitHub

1. Acesse https://github.com/settings/developers
2. Clique em "New OAuth App"
3. Preencha os dados:
   - **Application name:** WGF Note
   - **Homepage URL:** https://github.com/seu-usuario/wgf-note
   - **Authorization callback URL:** `wgf-note://oauth/callback`

4. Copie o **Client ID** e gere um **Client Secret**

### 2. Configurar Variáveis de Ambiente

Crie ou edite o arquivo `.env` na raiz do projeto:

```bash
EXPO_PUBLIC_GITHUB_CLIENT_ID=seu_client_id_aqui
EXPO_PUBLIC_GITHUB_CLIENT_SECRET=seu_client_secret_aqui
```

### 3. Instalar Dependências

As dependências necessárias já estão instaladas:
- ✅ `expo-web-browser` ~15.0.10
- ✅ `expo-secure-store` ~15.0.8
- ✅ `expo-linking` (já existente)
- ✅ `@expo/vector-icons` ^15.0.3

Se necessário, instale:
```bash
npx expo install expo-web-browser expo-secure-store
```

---

## Hooks Disponíveis

### useGitHub()

Hook principal para operações com GitHub.

**Retorna:**
```typescript
{
  // Estado de autenticação
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  user: GitHubUser | null;

  // Ações
  login: (clientId: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;

  // Operações de repositório
  fetchRepositories: (options?) => Promise<GitHubRepository[]>;
  searchRepositories: (query, options?) => Promise<any>;
  fetchRepository: (owner, repo) => Promise<GitHubRepository>;

  // Operações de arquivo
  getFileContents: (owner, repo, path, ref?) => Promise<any>;
  downloadFile: (owner, repo, path, ref?) => Promise<{content, metadata}>;
  createOrUpdateFile: (owner, repo, path, content, message, branch, sha?) => Promise<any>;
  deleteFile: (owner, repo, path, message, sha, branch) => Promise<any>;

  // Operações de commit
  listCommits: (owner, repo, options?) => Promise<GitHubCommit[]>;
  getCommit: (owner, repo, ref) => Promise<any>;

  // Operações de issue
  listIssues: (owner, repo, options?) => Promise<GitHubIssue[]>;
  createIssue: (owner, repo, title, body?, labels?, assignees?) => Promise<GitHubIssue>;

  // Operações de PR
  listPullRequests: (owner, repo, options?) => Promise<GitHubPullRequest[]>;
  createPullRequest: (owner, repo, title, head, base, body?) => Promise<GitHubPullRequest>;

  // Extração avançada
  extractRepositoryStats: (owner, repo) => Promise<any>;
  getLanguages: (owner, repo) => Promise<Record<string, number>>;
  getContributors: (owner, repo, options?) => Promise<any[]>;
  getActivityTimeline: (owner, repo, days?) => Promise<any>;
  searchCode: (query, options?) => Promise<any>;
}
```

**Exemplo de uso:**
```tsx
import { useGitHub } from '@/hooks/use-github';

function MyComponent() {
  const { isAuthenticated, login, fetchRepositories, user } = useGitHub();

  const handleLogin = async () => {
    try {
      await login(process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID!);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const loadRepos = async () => {
    const repos = await fetchRepositories({ per_page: 50 });
    console.log(repos.length, 'repositórios carregados');
  };

  return (
    <View>
      {!isAuthenticated ? (
        <Button title="Login com GitHub" onPress={handleLogin} />
      ) : (
        <Text>Olá, {user?.login}!</Text>
      )}
    </View>
  );
}
```

---

## Fluxo de Autenticação

1. Usuário clica em "Entrar com GitHub"
2. Abre navegador para página de autorização do GitHub
3. Usuário autoriza o aplicativo
4. GitHub redireciona de volta com código de autorização
5. App troca código por token de acesso
6. Token é armazenado no SecureStore
7. Dados do usuário são carregados

**URLs de Callback Configuradas:**
- Desenvolvimento: `wgf-note://oauth/callback`
- Produção: Configure no GitHub Settings

---

## Segurança

### Medidas Implementadas

✅ **OAuth 2.0 com State Validation**
- Previne ataques CSRF
- Valida estado no callback

✅ **Armazenamento Seguro**
- Tokens guardados no Keychain (iOS) / Keystore (Android)
- Nunca expostos em logs

✅ **Escopo Mínimo Necessário**
- `repo` - Acesso a repositórios
- `user` - Perfil do usuário
- `read:org` - Ler organizações
- `workflow` - Workflows do GitHub Actions

### Recomendações para Produção

1. **Backend Proxy**
   - Implemente servidor para troca de tokens
   - Nunca exponha Client Secret no frontend
   - Use HTTPS obrigatoriamente

2. **Token Refresh**
   - Implemente refresh automático de tokens
   - Monitore expiração

3. **Rate Limiting**
   - GitHub API tem limite de 5000 req/hora (autenticado)
   - Implemente cache local
   - Trate erros 429 gracefully

---

## Próximos Passos Sugeridos

### Backend Proxy (Produção)

Crie um endpoint seguro para troca de tokens:

```typescript
// Exemplo: API Route Next.js
export default async function handler(req, res) {
  const { code } = req.body;
  
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  
  const data = await response.json();
  res.status(200).json(data);
}
```

### Webhooks para Atualizações em Tempo Real

Configure webhooks no GitHub para receber atualizações:

1. Vá em Settings > Webhooks do seu app
2. Adicione webhook:
   - Payload URL: `https://seu-servidor.com/github-webhook`
   - Content type: `application/json`
   - Events: Push, Pull Request, Issues

3. No app, implemente listener:
```typescript
// WebSocket ou Server-Sent Events para push updates
```

### Melhorias de UI/UX

- [ ] Skeleton loaders durante carregamento
- [ ] Animações de transição entre telas
- [ ] Offline support com cache de dados
- [ ] Share sheet para compartilhar repositórios
- [ ] Deep linking para repositórios específicos

---

## Troubleshooting

### Erro: "Redirect URI mismatch"
**Solução:** Verifique se a callback URL no GitHub Settings corresponde exatamente à configurada no app.

### Erro: "Bad credentials"
**Solução:** Token expirado ou inválido. Faça logout e login novamente.

### Erro: "Rate limit exceeded"
**Solução:** Aguarde alguns minutos ou implemente cache mais agressivo.

### Login não funciona em produção
**Solução:** 
1. Verifique se o scheme está configurado em `app.json`
2. Confirme que as URLs de callback estão corretas
3. Teste em dispositivo real (simulador pode ter problemas com deep linking)

---

## Referências

- [GitHub OAuth Docs](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [GitHub REST API](https://docs.github.com/en/rest)
- [Expo AuthSession](https://docs.expo.dev/guides/authentication/)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)

---

**Status:** ✅ Completo e pronto para uso

**Última atualização:** Maio 2024
