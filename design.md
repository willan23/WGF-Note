# Design da Interface - Note Py++

## Visão Geral

Uma aplicação móvel de edição de código Python inspirada no Notepad++, otimizada para **orientação portrait (9:16)** e **uso com uma mão**. A aplicação oferece um ambiente profissional de edição com syntax highlighting, gestão de ficheiros e ferramentas específicas para Python.

---

## Lista de Ecrãs

1. **Home / Editor Principal** — Ecrã principal com editor de código
2. **Gestor de Ficheiros** — Navegação e gestão de ficheiros/projetos
3. **Definições** — Configurações de tema, fonte e comportamento
4. **Explorador de Símbolos** — Navegação rápida de funções/classes
5. **Terminal de Saída** — Visualização de resultados e erros
6. **Detalhes do Ficheiro** — Informações e propriedades do ficheiro

---

## Funcionalidade Primária e Conteúdo

### 1. Home / Editor Principal

**Conteúdo:**
- Barra de ferramentas superior (novo, abrir, guardar, desfazer/refazer)
- Área principal do editor com syntax highlighting para Python
- Indicador de linha/coluna e estado do ficheiro
- Barra de estado inferior com informações do documento

**Funcionalidades:**
- Edição de código com suporte a múltiplas linhas
- Syntax highlighting em tempo real
- Numeração de linhas
- Indentação automática
- Suporte a tabulações e espaços
- Detecção de erros de sintaxe Python

### 2. Gestor de Ficheiros

**Conteúdo:**
- Lista hierárquica de ficheiros/pastas
- Ícones para ficheiros Python e pastas
- Indicadores de ficheiros modificados
- Barra de pesquisa para localizar ficheiros

**Funcionalidades:**
- Criar novo ficheiro/pasta
- Abrir ficheiro
- Renomear ficheiro
- Eliminar ficheiro
- Copiar/colar ficheiro
- Visualizar estrutura de projeto

### 3. Definições

**Conteúdo:**
- Selector de tema (claro/escuro)
- Selector de tamanho de fonte
- Selector de tipo de fonte (monoespacial)
- Opções de indentação
- Opções de word wrap
- Opções de auto-save

**Funcionalidades:**
- Aplicar tema em tempo real
- Guardar preferências
- Restaurar definições padrão

### 4. Explorador de Símbolos

**Conteúdo:**
- Lista de funções, classes e variáveis globais
- Ícones para diferenciar tipos (função, classe, variável)
- Número de linha para cada símbolo

**Funcionalidades:**
- Navegação rápida para símbolo
- Pesquisa de símbolos
- Filtro por tipo

### 5. Terminal de Saída

**Conteúdo:**
- Área de log com mensagens de execução
- Erros e warnings destacados
- Entrada de parâmetros (se necessário)

**Funcionalidades:**
- Visualizar output de execução
- Limpar log
- Copiar mensagens

### 6. Detalhes do Ficheiro

**Conteúdo:**
- Nome do ficheiro
- Caminho completo
- Tamanho
- Data de criação/modificação
- Encoding
- Número de linhas/caracteres

**Funcionalidades:**
- Copiar informações
- Converter encoding

---

## Fluxos de Utilizador Principais

### Fluxo 1: Criar e Editar um Ficheiro Python

1. Utilizador abre a aplicação → **Home / Editor Principal**
2. Toca em **"Novo Ficheiro"** → Cria ficheiro vazio
3. Começa a digitar código Python
4. Syntax highlighting é aplicado automaticamente
5. Toca em **"Guardar"** → Selecciona localização e nome
6. Ficheiro é guardado com sucesso

### Fluxo 2: Abrir Ficheiro Existente

1. Utilizador toca em **"Abrir"** → **Gestor de Ficheiros**
2. Navega pela estrutura de pastas
3. Selecciona ficheiro Python
4. Ficheiro é carregado no **Editor Principal**
5. Pode editar e guardar alterações

### Fluxo 3: Navegar Rapidamente no Código

1. Utilizador está no **Editor Principal**
2. Toca em **"Símbolos"** → **Explorador de Símbolos**
3. Visualiza lista de funções/classes
4. Selecciona um símbolo
5. Editor salta para a linha do símbolo

### Fluxo 4: Visualizar Informações do Ficheiro

1. Utilizador toca em **"Info"** → **Detalhes do Ficheiro**
2. Visualiza metadados do ficheiro actual
3. Pode copiar informações
4. Regressa ao editor

### Fluxo 5: Configurar Preferências

1. Utilizador toca em **"Definições"** → **Definições**
2. Altera tema, fonte, indentação
3. Alterações são aplicadas em tempo real
4. Preferências são guardadas automaticamente

---

## Escolhas de Cor

**Paleta de Cores Profissional para Desenvolvimento:**

| Elemento | Cor Claro | Cor Escuro | Uso |
|----------|-----------|-----------|-----|
| **Fundo Principal** | `#FFFFFF` | `#1E1E1E` | Fundo do editor |
| **Fundo Secundário** | `#F5F5F5` | `#252526` | Barras e painéis |
| **Texto Principal** | `#333333` | `#E0E0E0` | Código e texto |
| **Texto Secundário** | `#666666` | `#A0A0A0` | Comentários e metadados |
| **Números de Linha** | `#999999` | `#858585` | Coluna de linhas |
| **Accent / Botões** | `#0078D4` | `#0E639C` | Botões e highlights |
| **Erro** | `#F44747` | `#F48771` | Erros de sintaxe |
| **Warning** | `#FF9800` | `#DEB887` | Avisos |
| **Sucesso** | `#4CAF50` | `#6BBF59` | Operações bem-sucedidas |
| **String** | `#CE9178` | `#CE9178` | Strings Python |
| **Keyword** | `#569CD6` | `#569CD6` | Palavras-chave |
| **Função** | `#DCDCAA` | `#DCDCAA` | Nomes de funções |
| **Comentário** | `#6A9955` | `#6A9955` | Comentários |

---

## Considerações de Design

### Orientação Portrait (9:16)

- Editor ocupa a área central com máximo espaço
- Barra de ferramentas compacta no topo
- Barra de abas/tabs para múltiplos ficheiros (horizontal, scrollável)
- Barra de estado na base
- Navegação por tabs na base (Gestor, Símbolos, Terminal, Definições)

### Uso com Uma Mão

- Botões de ação primária no topo e base (fáceis de alcançar)
- Gestos de swipe para navegar entre abas
- Teclado virtual não deve cobrir a área de edição (scroll automático)
- Feedback háptico para confirmação de ações

### Profissionalismo

- Design minimalista e limpo
- Tipografia clara e legível
- Ícones consistentes e reconhecíveis
- Feedback visual imediato para todas as ações
- Suporte a tema claro e escuro

---

## Componentes Principais

1. **Editor de Código** — Componente principal com syntax highlighting
2. **Barra de Ferramentas** — Ações rápidas (novo, abrir, guardar, etc.)
3. **Gestor de Ficheiros** — Navegação de ficheiros/pastas
4. **Explorador de Símbolos** — Índice de funções/classes
5. **Terminal de Saída** — Visualização de resultados
6. **Barra de Abas** — Navegação entre ficheiros abertos
7. **Barra de Estado** — Informações do documento

---

## Tecnologias Recomendadas

- **Editor**: Expo com `react-native-code-editor` ou similar
- **Syntax Highlighting**: Prism.js ou Highlight.js adaptado para React Native
- **Gestão de Ficheiros**: Expo FileSystem API
- **Persistência**: AsyncStorage para configurações
- **UI Framework**: NativeWind (Tailwind CSS para React Native)

