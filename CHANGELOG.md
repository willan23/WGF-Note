# Changelog

Todas as alterações relevantes deste projeto serão documentadas aqui.

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
