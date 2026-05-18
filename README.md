# WGF Note

Editor local-first para Python, JavaScript, TypeScript, HTML, CSS, JSON, Markdown, SQL, Java, C, C++, C# e texto simples, agora focado exclusivamente em desktop.

**Versão atual:** `1.0.4` · consulte também o `CHANGELOG.md` e a `RELEASE_CHECKLIST.md`.

## Estado atual

- **Pronto no núcleo:** edição multi-linguagem, bancada desktop com paleta de comandos, quick open (`Ctrl+P`), abas reordenáveis, multi-janela, breadcrumbs e atalhos visíveis, gestão local de ficheiros, árvore de projeto com criação/renomeação/eliminação, pesquisa e substituição globais no workspace com pré-visualização, seleção por ficheiro/linha e inspeção direta no editor, IA local via Ollama com chat contextual, explicações e propostas de alteração revisáveis, execução Python real por backend autenticado, sync cloud manual do workspace, partilha de ficheiros com papéis de leitor/editor, restauração de sessão, syntax highlighting básico, templates, sugestões, preview HTML/CSS e preferências locais.
- **Ainda fora da experiência principal:** colaboração em tempo real caractere-a-caractere, resolução visual avançada de conflitos e publicação pronta de infraestrutura. A base funcional já existe, mas estas camadas ainda pedem hardening antes de serem tratadas como produto final.
- **Critério de qualidade da sprint atual:** `pnpm check`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm build:web` e `pnpm desktop:make` precisam passar antes de considerar o app estável.

## Comandos principais

```bash
pnpm dev
pnpm verify
pnpm build
pnpm build:web
pnpm desktop:dev
pnpm desktop:make
```

## IA local

O assistente de código funciona contra um provedor local configurado pelo utilizador. Hoje suporta:

- **Ollama:** padrão simples para modelos coder locais em `http://127.0.0.1:11434`.
- **Hermes/Omega ou outra API OpenAI-compatible:** ideal para usar `W:\hermes-agent-main` como motor externo de agente, normalmente em `http://127.0.0.1:8642`.

No editor, o botão **IA local** abre um centro com:

- **Chat:** usa o ficheiro atual, a seleção, os ficheiros abertos, um mapa leve do workspace, alguns trechos recuperados localmente por pergunta e memória local por workspace; pode devolver referências navegáveis e transformar uma sugestão numa proposta revisável. Ficheiros muito grandes são truncados de forma explícita antes de irem para o modelo local, para preservar resposta e desempenho.
- **Ações:** explica código ou propõe uma substituição revisável para a seleção atual.
- **Memória:** permite ver, criar, editar e apagar notas locais do workspace que devam sobreviver entre sessões; sugestões novas da IA só entram depois da tua aprovação e podem guardar evidências navegáveis para explicar porque cada facto ficou na memória. O app revalida essas evidências, distingue notas confirmadas/parciais/manuais/desatualizadas e exclui do contexto do chat o que ficou sem base válida.

### Integração com Hermes/Omega

O projeto `W:\hermes-agent-main` não deve ser colado diretamente dentro do WGF Note. A arquitetura mais segura é:

- **WGF Note:** bancada visual desktop, editor, ficheiros, abas, pesquisa, UX e empacotamento.
- **Hermes/Omega:** motor externo de agente, ferramentas, memória profunda, automações e execução por gateway/API.
- **Ponte recomendada:** iniciar o Hermes no WSL2 ou noutro ambiente suportado e conectar o WGF Note a ele por API OpenAI-compatible (`/v1/chat/completions`, `/v1/responses` ou `/v1/runs`) ou ACP, mantendo os dois projetos atualizáveis separadamente.

Isto já começou no app: em **Definições → IA local / agente**, escolha **Hermes/Omega**, use `http://127.0.0.1:8642` e modelo `omega-supreme`. No Windows nativo, o próprio Hermes recomenda WSL2; por isso a integração é sidecar/serviço, não importação direta de código Python.

## Direção do produto

O produto passa a privilegiar profundidade no desktop antes de largura: a fundação local-first já suporta backend real, mas o critério continua a ser tornar cada fluxo confiável no PC antes de abrir novas frentes.

## Linguagens suportadas

- **Com edição, deteção por extensão, realce, templates, sync e pesquisa no workspace:** Python, JavaScript, TypeScript, HTML, CSS, JSON, Markdown, SQL, Java, C, C++, C# e texto simples.
- **Com execução real:** Python.
- **Com preview real:** HTML e CSS.
- As restantes linguagens entram de forma honesta como superfícies de edição produtivas; não aparecem como executáveis ou com preview enquanto essas capacidades não existirem de ponta a ponta.

## Execução Python, cloud e colaboração

- O separador **Terminal** executa Python de verdade através do backend autenticado, com `stdout`, `stderr`, `exitCode`, timeout e truncamento de output.
- O separador **Cloud** permite iniciar sessão, sincronizar os ficheiros suportados do workspace, transferir versões remotas e partilhar ficheiros por email com papel de **leitor** ou **editor**.
- O backend guarda ficheiros cloud com revisão incremental e rejeita atualizações quando a revisão esperada já ficou para trás, em vez de sobrescrever silenciosamente trabalho de outra pessoa.

Para ativar estes fluxos fora do modo local, configure `DATABASE_URL` e as variáveis OAuth já previstas no projeto, aplique as migrações com `pnpm db:push` e garanta que existe um executável `python`/`py` disponível na máquina que corre o backend.

O backend de cloud usa **MySQL**. As migrações recusam correr sem `DATABASE_URL`, para evitar aplicar acidentalmente um schema incompatível num fallback local.

Para desenvolvimento sem custo, pode usar a base MySQL local incluída:

```bash
docker compose -f compose.local.yml up -d
```

Depois execute as migrações com:

```bash
DATABASE_URL=mysql://note_py:note_py_local@127.0.0.1:3307/note_py_plus_plus pnpm db:push
```

Se `OAUTH_SERVER_URL` e `EXPO_PUBLIC_OAUTH_PORTAL_URL` ficarem vazios em desenvolvimento, o app ativa um **login local**: basta informar nome e email no modal de entrada. Esse modo cria sessões reais contra o backend local e permite testar sync, partilha, papéis e execução Python sem depender de um provedor externo.

## Desktop

O projeto inclui empacotamento desktop via Electron:

```bash
pnpm desktop:dev
pnpm desktop:make
```

`desktop:make` gera um instalador Windows em `release/`. A app desktop abre a exportação web, inicia o backend local empacotado, expõe acesso real ao filesystem do PC e escolhe automaticamente uma porta livre a partir de `3000`.

Atalhos principais no desktop:

- `Ctrl+P`: ir para ficheiro no workspace.
- `Ctrl+Shift+P`: paleta de comandos.
- `Ctrl+Shift+F`: pesquisa lateral no projeto.
- `Ctrl+J`: terminal.
- `Ctrl+Shift+N`: nova janela.
