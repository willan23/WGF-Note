# Changelog

Todas as alterações relevantes deste projeto serão documentadas aqui.

## [1.0.6] - 2026-05-19

### Adicionado

- Propostas da IA local agora distinguem alvo de aplicação: seleção, cursor ou ficheiro inteiro.
- Respostas OpenAI-compatible/Hermes em texto cru com bloco de código podem virar proposta aplicável sem exigir JSON perfeito.
- Botão **Usar código** no chat quando a IA devolve um bloco de código em Markdown.

### Corrigido

- Aplicação de propostas da IA valida o conteúdo alvo original, em vez de depender da seleção continuar exatamente no mesmo lugar.
- Preview de proposta limita textos muito grandes para evitar congelar o modal ao rever ficheiros longos.

## [1.0.5] - 2026-05-18

### Adicionado

- Diagnóstico visual nas definições de IA, com estados de sucesso, aviso e erro.
- Guia curto no UI para ligar Hermes/Omega via WSL2/API Server.
- Fallback de chat OpenAI-compatible: respostas textuais cruas agora aparecem no chat em vez de falharem quando o agente não devolve JSON perfeito.

### Corrigido

- Lint das definições com dependências completas de tema.

## [1.0.4] - 2026-05-18

### Adicionado

- Provedor **Hermes/Omega** para a IA local via API OpenAI-compatible.
- Definições de IA com seleção entre **Ollama** e **Hermes/Omega**, endpoint dedicado, modelo e chave API opcional.
- Ponte Electron para chamadas OpenAI-compatible sem depender de CORS no renderer.
- Parser mais tolerante para respostas estruturadas da IA, aceitando JSON puro ou blocos markdown `json`.

### Alterado

- O centro de IA passa a receber um objeto de configuração completo de provedor, preparando a evolução para agentes externos sem misturar repositórios.
- A documentação da união com `W:\hermes-agent-main` foi atualizada para tratar Hermes como sidecar de agente.

## [1.0.3] - 2026-05-18

### Adicionado

- Quick open real do workspace em `Ctrl+P`, com filtragem por nome/caminho e abertura direta no editor.
- Abas reordenáveis por drag-and-drop no desktop.
- Suporte a múltiplas janelas Electron via `Ctrl+Shift+N` e paleta de comandos.
- Substituição lateral no workspace com preparação de plano, aplicação direta e ponte para revisão avançada já preenchida.
- Nota arquitetural para unir WGF Note com Hermes/Omega como motor externo via API/ACP, sem misturar os repositórios.

### Corrigido

- A reordenação das abas passou a usar o payload real do drag, evitando falhas quando o drop acontece antes do estado React atualizar.
- A ação de nova janela fica visível apenas em runtime desktop.

## [1.0.2] - 2026-05-18

### Adicionado

- Paleta de comandos com ações essenciais, filtragem e atalhos visíveis.
- Pesquisa lateral no workspace com resultados agrupados, filtros de maiúsculas/minúsculas e palavra inteira.
- Breadcrumbs do ficheiro ativo com acesso rápido à pesquisa global e à paleta de comandos.

### Alterado

- O fluxo desktop passou a comportar-se mais como uma bancada IDE: pesquisa global embutida no sidebar, atalhos estilo VS Code e terminal acessível por teclado.
- O preview mudou para `Ctrl+Alt+P`, a formatação para `Alt+Shift+F` e o terminal para `Ctrl+J`, libertando `Ctrl+Shift+P` para comandos e `Ctrl+Shift+F` para pesquisa no projeto.

## [1.0.1] - 2026-05-18

### Corrigido

- Assets do desktop passaram a ser servidos fora do fallback HTML, eliminando os avisos de fontes de ícones no build empacotado.
- O foco do produto foi consolidado em desktop-only e o empacotamento Windows passou a sair limpo sob o nome **WGF Note**.
- QA desktop confirmado para ponte Electron, filesystem real, árvore de projeto, gestor de ficheiros e Ollama local.

## [1.0.0] - 2026-05-18

### Adicionado

- Editor local-first com ciclo completo de ficheiros, sessões restauráveis, separadores, árvore de projeto e pesquisa global no workspace.
- IA local open source via Ollama com chat contextual, memória local, evidências navegáveis e propostas de alteração revisáveis.
- Execução Python real autenticada com `stdout`, `stderr`, `exitCode`, timeout e truncamento controlado.
- Cloud sync manual com MySQL, partilha de ficheiros e colaboração por papéis `viewer`/`editor`.
- Login local de desenvolvimento sem provedor externo quando OAuth está desligado.
- Empacotamento desktop para Windows via Electron, incluindo instalador NSIS.
- Suporte de edição para Python, JavaScript, TypeScript, HTML, CSS, JSON, Markdown, SQL, Java, C, C++, C# e texto simples.

### Alterado

- `EditorContext` passou a concentrar ciclo de vida do ficheiro, histórico por ficheiro, seleção real, cursor e linguagem ativa.
- O produto foi recentrado numa experiência honesta: recursos simulados saíram da superfície principal e previews só aparecem quando são reais.
- A gestão de ficheiros desktop ganhou navegação por pastas, recentes por path, renomear/eliminar e tratamento de ficheiros desaparecidos.
- O preview HTML/CSS passou a separar avisos de erros bloqueantes e a atualizar com debounce.
- A pipeline passou a exigir `check`, `lint` e `test` antes de `build`.

### Corrigido

- Estado dirty após save, undo/redo isolado por ficheiro, inserção no cursor real e sincronização correta de linguagem ao reabrir ficheiros.
- Lint com aliases `@/*`, export web compatível com Metro, remoção de logs ruidosos e fallback local de cookies em HTTP.
- Fluxos cloud com proteção de revisão, impedindo sobrescrita silenciosa de alterações remotas.
- Empacotamento desktop com backend local embutido e ícone próprio.

### Ainda fora desta release

- Colaboração em tempo real caractere a caractere.
- Resolução visual avançada de conflitos.
- Execução real para linguagens além de Python.
- Hardening completo de infraestrutura para publicação pública.
