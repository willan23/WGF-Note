# GitHub Integration Guide

## Visão Geral

O WGF Note agora inclui integração completa com o GitHub, permitindo:

- **Autenticação OAuth 2.0** segura
- **Gerenciamento de repositórios** (listar, buscar, criar)
- **Operações com arquivos** (ler, criar, atualizar, deletar)
- **Gerenciamento de commits** (listar, visualizar)
- **Issues e Pull Requests** (criar, listar, gerenciar)
- **Extração avançada de dados** (estatísticas, linguagens, contribuidores, timeline)

## Configuração

### 1. Registrar Aplicação no GitHub

1. Acesse https://github.com/settings/developers
2. Clique em "New OAuth App" ou "Register a new application"
3. Preencha os dados:
   - **Application name**: WGF Note
   - **Homepage URL**: URL do seu app
   - **Authorization callback URL**: 
     - Web: `http://localhost:3000/api/github/callback`
     - Mobile: `manus{timestamp}:///github/callback`

4. Anote o **Client ID** e gere um **Client Secret**

### 2. Configurar Variáveis de Ambiente

Adicione ao seu `.env`:

```bash
EXPO_PUBLIC_GITHUB_CLIENT_ID=seu_client_id
EXPO_PUBLIC_GITHUB_CLIENT_SECRET=seu_client_secret
```

## Uso Básico

### Autenticação

```typescript
import { useGitHub } from '@/hooks/use-github';

function MyComponent() {
  const { 
    isAuthenticated, 
    user, 
    login, 
    logout,
    isLoading,
    error 
  } = useGitHub();

  const handleLogin = async () => {
    try {
      await login(process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID!);
      console.log('Logado como:', user?.login);
    } catch (err) {
      console.error('Erro no login:', err);
    }
  };

  if (!isAuthenticated) {
    return <Button title="Login with GitHub" onPress={handleLogin} />;
  }

  return (
    <View>
      <Text>Bem-vindo, {user?.name || user?.login}!</Text>
      <Button title="Logout" onPress={logout} />
    </View>
  );
}
```

### Listar Repositórios

```typescript
const { fetchRepositories } = useGitHub();

const repos = await fetchRepositories({
  visibility: 'all',
  sort: 'updated',
  per_page: 100,
});

console.log(`Total: ${repos.length} repositórios`);
```

### Buscar Repositórios

```typescript
const { searchRepositories } = useGitHub();

const results = await searchRepositories('react typescript', {
  sort: 'stars',
  order: 'desc',
  per_page: 10,
});

console.log(`Encontrados: ${results.total_count} repositórios`);
results.items.forEach(repo => {
  console.log(`${repo.full_name} - ⭐ ${repo.stargazers_count}`);
});
```

## Operações com Arquivos

### Ler Arquivo

```typescript
const { downloadFile } = useGitHub();

const { content, metadata } = await downloadFile(
  'facebook',
  'react',
  'README.md'
);

console.log('Conteúdo:', content);
console.log('Tamanho:', metadata.size, 'bytes');
```

### Criar/Atualizar Arquivo

```typescript
const { createOrUpdateFile } = useGitHub();

const result = await createOrUpdateFile(
  'seu-usuario',
  'seu-repo',
  'docs/nova-documentacao.md',
  '# Nova Documentação\n\nConteúdo aqui...',
  'Adiciona nova documentação',
  'main', // branch
  undefined // sha (necessário para atualizar)
);

console.log('Arquivo criado/atualizado:', result.content.html_url);
```

### Deletar Arquivo

```typescript
const { getFileContents, deleteFile } = useGitHub();

// Primeiro, obtenha o SHA do arquivo
const file = await getFileContents('seu-usuario', 'seu-repo', 'arquivo.txt');

if (!Array.isArray(file)) {
  await deleteFile(
    'seu-usuario',
    'seu-repo',
    'arquivo.txt',
    'Remove arquivo obsoleto',
    file.sha,
    'main'
  );
}
```

## Commits

### Listar Commits

```typescript
const { listCommits } = useGitHub();

const commits = await listCommits('facebook', 'react', {
  per_page: 10,
  since: '2024-01-01T00:00:00Z',
});

commits.forEach(commit => {
  console.log(`${commit.sha.substring(0, 7)} - ${commit.commit.message}`);
  console.log(`  Por: ${commit.commit.author.name}`);
  console.log(`  Em: ${commit.commit.author.date}`);
});
```

### Visualizar Commit Específico

```typescript
const { getCommit } = useGitHub();

const commit = await getCommit('facebook', 'react', 'main');
console.log('Mensagem:', commit.commit.message);
console.log('Arquivos alterados:', commit.files?.length);
```

## Issues

### Listar Issues

```typescript
const { listIssues } = useGitHub();

const issues = await listIssues('facebook', 'react', {
  state: 'open',
  labels: 'bug',
  sort: 'created',
  per_page: 20,
});

issues.forEach(issue => {
  console.log(`#${issue.number} - ${issue.title}`);
  console.log(`  Status: ${issue.state}`);
  console.log(`  Labels: ${issue.labels.map(l => l.name).join(', ')}`);
});
```

### Criar Issue

```typescript
const { createIssue } = useGitHub();

const issue = await createIssue(
  'seu-usuario',
  'seu-repo',
  'Bug: Erro ao salvar arquivo',
  'Descrição detalhada do bug...\n\nPassos para reproduzir:\n1. ...\n2. ...',
  ['bug', 'priority-high'],
  ['colaborador1']
);

console.log('Issue criada:', issue.html_url);
```

## Pull Requests

### Listar Pull Requests

```typescript
const { listPullRequests } = useGitHub();

const prs = await listPullRequests('facebook', 'react', {
  state: 'open',
  sort: 'updated',
  per_page: 10,
});

prs.forEach(pr => {
  console.log(`#${pr.number} - ${pr.title}`);
  console.log(`  Branch: ${pr.head.ref} → ${pr.base.ref}`);
  console.log(`  Commits: ${pr.commits}, Adições: ${pr.additions}, Remoções: ${pr.deletions}`);
});
```

### Criar Pull Request

```typescript
const { createPullRequest } = useGitHub();

const pr = await createPullRequest(
  'seu-usuario',
  'seu-repo',
  'Feature: Nova funcionalidade X',
  'feature-branch',
  'main',
  'Descrição da PR...\n\nMudanças:\n- ...\n- ...'
);

console.log('PR criada:', pr.html_url);
```

## Extração Avançada de Dados

### Estatísticas do Repositório

```typescript
const { extractRepositoryStats } = useGitHub();

const stats = await extractRepositoryStats('facebook', 'react');

console.log('Repositório:', stats.repository.full_name);
console.log('Estrelas:', stats.repository.stargazers_count);
console.log('Forks:', stats.repository.forks_count);
console.log('Linguagens:', stats.languages);
console.log('Contribuidores:', stats.contributors.length);
console.log('Issues abertas:', stats.openIssues.length);
console.log('PRs abertas:', stats.openPullRequests.length);
```

### Timeline de Atividade

```typescript
const { getActivityTimeline } = useGitHub();

const timeline = await getActivityTimeline('facebook', 'react', 30);

console.log('Atividade nos últimos 30 dias:');
console.log('Commits:', timeline.commits.reduce((sum, d) => sum + d.count, 0));
console.log('Issues:', timeline.issues.reduce((sum, d) => sum + d.count, 0));
console.log('PRs:', timeline.prs.reduce((sum, d) => sum + d.count, 0));
```

### Buscar Código

```typescript
const { searchCode } = useGitHub();

const results = await searchCode('useEffect dependency array', {
  per_page: 10,
});

results.items.forEach(item => {
  console.log(`${item.repository.full_name}/${item.path}`);
  console.log(`  Score: ${item.score}`);
});
```

## Hooks Especializados

### useRepository

```typescript
import { useRepository } from '@/hooks/use-github';

function RepoInfo({ owner, name }) {
  const { data: repo, isLoading, error } = useRepository(owner, name);

  if (isLoading) return <Text>Carregando...</Text>;
  if (error) return <Text>Erro: {error}</Text>;
  if (!repo) return null;

  return (
    <View>
      <Text>{repo.description}</Text>
      <Text>⭐ {repo.stargazers_count}</Text>
      <Text>🍴 {repo.forks_count}</Text>
    </View>
  );
}
```

### useRepositoryFiles

```typescript
import { useRepositoryFiles } from '@/hooks/use-github';

function FileExplorer({ owner, repo, path }) {
  const { data, isLoading, error } = useRepositoryFiles(owner, repo, path);

  if (isLoading) return <Text>Carregando...</Text>;
  if (error) return <Text>Erro: {error}</Text>;

  if (Array.isArray(data)) {
    return (
      <FlatList
        data={data}
        renderItem={({ item }) => (
          <Text>{item.type === 'dir' ? '📁' : '📄'} {item.name}</Text>
        )}
      />
    );
  }

  return <Text>Arquivo: {data?.name}</Text>;
}
```

### useCommits

```typescript
import { useCommits } from '@/hooks/use-github';

function CommitHistory({ owner, repo }) {
  const { data: commits, isLoading, error } = useCommits(owner, repo, {
    per_page: 20,
  });

  if (isLoading) return <ActivityIndicator />;
  if (error) return <Text>Erro: {error}</Text>;

  return (
    <FlatList
      data={commits}
      keyExtractor={item => item.sha}
      renderItem={({ item }) => (
        <View>
          <Text>{item.commit.message}</Text>
          <Text>{item.commit.author.name}</Text>
          <Text>{new Date(item.commit.author.date).toLocaleDateString()}</Text>
        </View>
      )}
    />
  );
}
```

## Segurança

### Melhores Práticas

1. **Nunca exponha o Client Secret no frontend**
   - Use um backend proxy para troca de tokens
   - Armazene segredos apenas no servidor

2. **Use PKCE para apps móveis**
   - Adiciona camada extra de segurança ao OAuth

3. **Limite os scopes**
   - Solicite apenas as permissões necessárias
   - Ex: `repo` para repositórios privados, `public_repo` apenas para públicos

4. **Valide o estado**
   - Sempre verifique o parâmetro `state` no callback
   - Previne ataques CSRF

5. **Renove tokens periodicamente**
   - Implemente refresh token automático
   - Monitore expiração

### Armazenamento Seguro

O módulo usa `expo-secure-store` para armazenar tokens:

- iOS: Keychain
- Android: Keystore
- Web: Session storage (limitado)

## Tratamento de Erros

```typescript
try {
  await login(clientId);
} catch (error) {
  if (error.message.includes('cancelled')) {
    // Usuário cancelou o login
    return;
  }
  
  if (error.message.includes('rate limit')) {
    // Rate limiting do GitHub
    console.warn('Muitas requisições, aguarde...');
    return;
  }
  
  if (error.message.includes('401')) {
    // Token inválido/expirado
    await logout();
    return;
  }
  
  console.error('Erro GitHub:', error);
}
```

## Rate Limiting

O GitHub impõe limites de requisição:

- **Não autenticado**: 60 req/hora por IP
- **Autenticado**: 5000 req/hora por usuário
- **Search API**: 30 req/minuto

Monitore os headers de resposta:

```typescript
const response = await fetch(/* ... */);
const remaining = response.headers.get('X-RateLimit-Remaining');
const reset = response.headers.get('X-RateLimit-Reset');

console.log(`Requisições restantes: ${remaining}`);
console.log(`Reset em: ${new Date(parseInt(reset!) * 1000).toLocaleString()}`);
```

## Componentes de UI Sugeridos

Crie componentes reutilizáveis:

- `GitHubLoginButton` - Botão de login padronizado
- `RepositoryCard` - Card para exibir info do repo
- `FileTree` - Árvore de arquivos do repo
- `CommitList` - Lista de commits com avatar
- `IssueBoard` - Board estilo Kanban para issues
- `PRDiffViewer` - Visualizador de diff de PRs

## Exemplo Completo

```typescript
import React, { useState } from 'react';
import { View, Text, Button, FlatList, ActivityIndicator } from 'react-native';
import { useGitHub } from '@/hooks/use-github';

export function GitHubIntegrationScreen() {
  const github = useGitHub();
  const [repos, setRepos] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);

  const handleLogin = async () => {
    try {
      await github.login(process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID!);
    } catch (err) {
      alert('Erro no login: ' + err.message);
    }
  };

  const handleLoadRepos = async () => {
    setLoadingRepos(true);
    try {
      const data = await github.fetchRepositories({ per_page: 50 });
      setRepos(data);
    } catch (err) {
      alert('Erro ao carregar repos: ' + err.message);
    } finally {
      setLoadingRepos(false);
    }
  };

  if (github.isLoading) {
    return <ActivityIndicator size="large" />;
  }

  if (!github.isAuthenticated) {
    return (
      <View style={{ padding: 20 }}>
        <Text>Faça login para acessar seus repositórios</Text>
        <Button title="Login with GitHub" onPress={handleLogin} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
          Olá, {github.user?.name || github.user?.login}!
        </Text>
        <Button title="Logout" onPress={github.logout} />
      </View>

      <Button 
        title="Carregar Repositórios" 
        onPress={handleLoadRepos}
        disabled={loadingRepos}
      />

      {loadingRepos && <ActivityIndicator style={{ marginTop: 20 }} />}

      <FlatList
        data={repos}
        keyExtractor={item => item.id.toString()}
        style={{ marginTop: 20 }}
        renderItem={({ item }) => (
          <View style={{ 
            padding: 15, 
            borderBottomWidth: 1, 
            borderBottomColor: '#eee' 
          }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16 }}>
              {item.name}
            </Text>
            <Text style={{ color: '#666' }}>{item.description || 'Sem descrição'}</Text>
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <Text>⭐ {item.stargazers_count}</Text>
              <Text style={{ marginLeft: 16 }}>🍴 {item.forks_count}</Text>
              <Text style={{ marginLeft: 16 }}>👁 {item.watchers_count}</Text>
            </View>
            {item.language && (
              <Text style={{ marginTop: 8, color: '#0366d6' }}>{item.language}</Text>
            )}
          </View>
        )}
      />
    </View>
  );
}
```

## Recursos Adicionais

- [Documentação da API GitHub](https://docs.github.com/en/rest)
- [OAuth 2.0 Guide](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [GraphQL API](https://docs.github.com/en/graphql) (para queries complexas)
- [Webhooks](https://docs.github.com/en/developers/webhooks-and-events) (para atualizações em tempo real)

## Suporte

Para issues ou dúvidas, abra uma issue no repositório do projeto ou consulte a documentação oficial do GitHub.
