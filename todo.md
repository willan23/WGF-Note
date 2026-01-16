# Note Py++ - TODO

## Funcionalidades Principais

### Fase 1: Estrutura Base e Editor
- [x] Configurar estrutura de navegação com tabs (Editor, Ficheiros, Símbolos, Terminal, Definições)
- [x] Implementar ecrã principal do editor
- [x] Integrar componente de editor de código com syntax highlighting para Python
- [x] Implementar numeração de linhas
- [x] Implementar indicador de linha/coluna
- [x] Implementar barra de ferramentas com ações básicas

### Fase 2: Funcionalidades de Edição
- [x] Implementar novo ficheiro
- [x] Implementar abrir ficheiro ✨ COMPLETO
- [x] Implementar guardar ficheiro ✨ COMPLETO
- [x] Implementar guardar como ✨ COMPLETO
- [x] Implementar desfazer/refazer (sistema completo com 100 níveis) ✨ COMPLETO
- [x] Implementar copiar/colar/cortar ✨ COMPLETO
- [x] Implementar pesquisa e substituição (componente modal)
- [x] Implementar indentação automática ✨ COMPLETO
- [x] Implementar detecção de erros de sintaxe Python
- [x] Implementar sugestões de código inteligentes
- [x] Implementar templates de código Python

### Fase 3: Gestor de Ficheiros
- [x] Criar ecrã do gestor de ficheiros
- [x] Implementar navegação de pastas ✨ COMPLETO
- [x] Implementar criar pasta ✨ COMPLETO
- [x] Implementar criar ficheiro ✨ COMPLETO
- [x] Implementar renomear ficheiro/pasta ✨ COMPLETO
- [x] Implementar eliminar ficheiro/pasta ✨ COMPLETO
- [x] Implementar copiar/colar ficheiro ✨ COMPLETO
- [x] Implementar indicadores de ficheiros modificados (estrutura base)

### Fase 4: Explorador de Símbolos
- [x] Criar ecrã do explorador de símbolos
- [x] Implementar parsing de funções/classes Python (extractPythonSymbols)
- [x] Implementar navegação para símbolo ✨ COMPLETO
- [x] Implementar pesquisa de símbolos ✨ COMPLETO
- [x] Implementar filtro por tipo (função, classe, variável) ✨ COMPLETO

### Fase 5: Terminal de Saída
- [x] Criar ecrã do terminal
- [x] Implementar visualização de output (estrutura base)
- [x] Implementar visualização de erros (estrutura base)
- [x] Implementar limpeza de log ✨ COMPLETO
- [x] Implementar cópia de mensagens ✨ COMPLETO

### Fase 6: Definições e Temas
- [x] Criar ecrã de definições
- [x] Implementar selector de tema (claro/escuro)
- [x] Implementar selector de tamanho de fonte
- [x] Implementar selector de tipo de fonte
- [x] Implementar opções de indentação
- [x] Implementar opções de word wrap
- [x] Implementar auto-save
- [x] Implementar persistência de preferências

### Fase 7: Detalhes do Ficheiro
- [x] Criar ecrã de detalhes do ficheiro ✨ COMPLETO
- [x] Implementar visualização de metadados ✨ COMPLETO
- [x] Implementar cópia de informações ✨ COMPLETO
- [x] Implementar conversão de encoding ✨ COMPLETO

### Fase 8: Funcionalidades Avançadas
- [x] Implementar múltiplas abas para ficheiros abertos (estrutura base)
- [x] Implementar histórico de ficheiros recentes ✨ COMPLETO
- [x] Implementar bookmarks/marcadores ✨ COMPLETO
- [x] Implementar comentários rápidos (Ctrl+/) ✨ COMPLETO
- [x] Implementar formatação de código (formatPythonCode)
- [x] Implementar análise estática (detectSyntaxErrors)
- [x] Implementar execução de código (painel de saída)
- [x] Implementar validação de código Python

### Fase 9: Branding e Polimento
- [x] Gerar logo/ícone da aplicação
- [x] Configurar nome e branding
- [x] Implementar splash screen
- [ ] Testar em múltiplos dispositivos
- [ ] Otimizar performance

### Fase 10: Testes e Validação
- [x] Testes unitários do analisador Python (16 testes - PASSOU)
- [ ] Testes unitários de componentes
- [ ] Testes de fluxos de utilizador
- [ ] Testes de performance
- [ ] Testes de compatibilidade (iOS/Android/Web)

## Bugs Reportados
(Nenhum registado inicialmente)

## Notas de Implementação

- **Syntax Highlighting**: Utilizar Prism.js ou similar para Python
- **Gestão de Ficheiros**: Usar Expo FileSystem API
- **Persistência**: AsyncStorage para configurações e histórico
- **UI**: NativeWind (Tailwind CSS) para styling
- **Editor**: Considerar react-native-code-editor ou criar componente customizado


## Novas Funcionalidades - Suporte Multi-Linguagem

### Fase 5: Suporte para HTML5 e CSS
- [x] Criar tipos e interfaces para HTML5 e CSS
- [x] Implementar analisador de HTML5 (extração de tags, atributos, validação)
- [x] Implementar analisador de CSS (seletores, propriedades, validação)
- [x] Criar componente seletor de linguagem
- [x] Implementar templates para HTML5 (estrutura básica, formulário, tabela) ✨ COMPLETO (Fase 5B)
- [x] Implementar templates para CSS (reset, flexbox, grid) ✨ COMPLETO (Fase 5B)
- [x] Implementar sugestões contextuais para HTML5 ✨ COMPLETO (Fase 5B)
- [x] Implementar sugestões contextuais para CSS ✨ COMPLETO (Fase 5B)
- [x] Criar validador de HTML5
- [x] Criar validador de CSS
- [x] Atualizar barra de ferramentas com seletor de linguagem
- [x] Implementar detecção de linguagem por extensão de ficheiro
- [x] Testes unitários para analisadores HTML5 e CSS (19 testes - PASSOU)


### Fase 5B: Templates Multi-Linguagem e Sugestões Contextuais
- [x] Implementar templates para HTML5 (estrutura básica, formulário, tabela)
- [x] Implementar templates para CSS (reset, flexbox, grid)
- [x] Criar sistema de sugestões contextuais para HTML
- [x] Criar sistema de sugestões contextuais para CSS
- [x] Integrar sugestões com análise de código em tempo real
- [x] Testes para templates e sugestões contextuais (16 testes - PASSOU)


### Fase 6: Preview em Tempo Real, Persistência de Ficheiros e Formatação
- [x] Implementar preview em tempo real com WebView para HTML/CSS
- [x] Criar componente de preview visual
- [x] Integrar preview com editor (split view) ✨ COMPLETO
- [x] Implementar sistema de persistência de ficheiros (AsyncStorage)
- [x] Criar gestor de ficheiros com histórico
- [x] Implementar formatação automática (Prettier, Black)
- [x] Adicionar atalhos de teclado para formatação
- [x] Testes para preview, persistência e formatação (15 testes - PASSOU)


### Fase 7: Atalhos de Teclado e Sincronização Cloud
- [x] Implementar sistema de atalhos de teclado
- [x] Atalho Ctrl+S para guardar ficheiro
- [x] Atalho Ctrl+Shift+F para formatar código
- [x] Atalho Ctrl+P para abrir ficheiro
- [x] Atalho Ctrl+/ para comentar/descomentar
- [x] Atalho Ctrl+Z para desfazer
- [x] Atalho Ctrl+Shift+Z para refazer
- [x] Atalho Ctrl+F para pesquisar
- [x] Implementar autenticação de utilizador
- [x] Integração com backend para sincronização
- [x] Sincronização de ficheiros com cloud
- [x] Histórico de sincronização
- [x] Resolução de conflitos
- [x] Componentes de autenticação e painel de sincronização

### Fase 8: WebView Nativa e Modo Offline
- [x] Implementar WebView nativa com react-native-webview (estrutura base)
- [x] Renderização HTML/CSS em tempo real no painel de pré-visualização
- [x] Suporte para JavaScript no WebView
- [x] Comunicação entre editor e WebView (postMessage)
- [x] Modo offline com detecção de conectividade
- [x] Fila de sincronização para operações offline
- [x] Sincronização automática quando conectado
- [x] Persistência de fila de sincronização (AsyncStorage)
- [x] Indicador visual de modo offline
- [x] Testes para WebView e modo offline (25 testes - PASSOU)
