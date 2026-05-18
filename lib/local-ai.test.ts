import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildLocalAIChatContextBlock,
  clipLocalAIContextValue,
  extractLocalAIRetrievalTerms,
  getOpenAICompatibleChatUrl,
  getOpenAICompatibleModelsUrl,
  getOllamaChatUrl,
  getOllamaTagsUrl,
  listLocalAIModels,
  listOpenAICompatibleModels,
  listOllamaModels,
  retrieveRelevantWorkspaceSnippetsForLocalAI,
  requestLocalAIChat,
  requestLocalAIEditProposal,
  requestLocalAIExplanation,
  summarizeWorkspaceForLocalAI,
} from './local-ai';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('local-ai', () => {
  it('normaliza URLs do Ollama', () => {
    expect(getOllamaChatUrl('http://localhost:11434/')).toBe(
      'http://localhost:11434/api/chat',
    );
    expect(getOllamaTagsUrl('http://localhost:11434/api')).toBe(
      'http://localhost:11434/api/tags',
    );
  });

  it('normaliza URLs OpenAI-compatible/Hermes', () => {
    expect(getOpenAICompatibleChatUrl('http://localhost:8642')).toBe(
      'http://localhost:8642/v1/chat/completions',
    );
    expect(getOpenAICompatibleModelsUrl('http://localhost:8642/v1/')).toBe(
      'http://localhost:8642/v1/models',
    );
  });

  it('trunca contexto grande preservando começo e fim', () => {
    const value = `${'a'.repeat(80)}${'b'.repeat(80)}`;
    const clipped = clipLocalAIContextValue(value, 100);

    expect(clipped.length).toBeLessThanOrEqual(100);
    expect(clipped.startsWith('a')).toBe(true);
    expect(clipped.endsWith('b')).toBe(true);
    expect(clipped).toContain('conteúdo truncado localmente');
  });

  it('lista modelos disponíveis', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ models: [{ name: 'qwen', model: 'qwen' }] }),
      })),
    );

    await expect(listOllamaModels('http://localhost:11434')).resolves.toEqual([
      { name: 'qwen', model: 'qwen' },
    ]);
  });

  it('lista modelos OpenAI-compatible', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          data: [{ id: 'omega-supreme' }, { id: 'hermes-local' }],
        }),
      })),
    );

    await expect(
      listOpenAICompatibleModels('http://localhost:8642/v1'),
    ).resolves.toEqual([
      { name: 'omega-supreme', model: 'omega-supreme' },
      { name: 'hermes-local', model: 'hermes-local' },
    ]);
  });

  it('lista modelos pelo provedor configurado', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          data: [{ id: 'omega-supreme' }],
        }),
      })),
    );

    await expect(
      listLocalAIModels({
        provider: 'openai-compatible',
        baseUrl: 'http://localhost:8642',
      }),
    ).resolves.toEqual([{ name: 'omega-supreme', model: 'omega-supreme' }]);
  });

  it('exige endereço antes de listar modelos', async () => {
    await expect(listOllamaModels('')).rejects.toThrow('Defina o endereço do Ollama.');
  });

  it('pede explicações estruturadas', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          message: {
            content: JSON.stringify({
              summary: 'Imprime uma mensagem.',
              keyPoints: ['Usa print'],
            }),
          },
        }),
      })),
    );

    await expect(
      requestLocalAIExplanation(
        { baseUrl: 'http://localhost:11434', model: 'qwen' },
        {
          language: 'python',
          fileName: 'main.py',
          fullContent: 'print("olá")',
          selectedText: 'print("olá")',
        },
      ),
    ).resolves.toEqual({
      summary: 'Imprime uma mensagem.',
      keyPoints: ['Usa print'],
    });
  });

  it('pede explicações via API OpenAI-compatible e extrai JSON em markdown', async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        ({
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content:
                    '```json\n{"summary":"Explica via Hermes.","keyPoints":["Usa chat completions"]}\n```',
                },
              },
            ],
          }),
        }) as Response,
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      requestLocalAIExplanation(
        {
          provider: 'openai-compatible',
          baseUrl: 'http://localhost:8642',
          model: 'omega-supreme',
        },
        {
          language: 'python',
          fileName: 'main.py',
          fullContent: 'print("olá")',
          selectedText: '',
        },
      ),
    ).resolves.toEqual({
      summary: 'Explica via Hermes.',
      keyPoints: ['Usa chat completions'],
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'http://localhost:8642/v1/chat/completions',
    );
    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('exige instrução para propostas de edição', async () => {
    await expect(
      requestLocalAIEditProposal(
        { baseUrl: 'http://localhost:11434', model: 'qwen' },
        {
          language: 'python',
          fileName: 'main.py',
          fullContent: '',
          selectedText: '',
          instruction: '',
        },
      ),
    ).rejects.toThrow('Escreva uma instrução');
  });

  it('permite gerar código no cursor sem seleção', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          message: {
            content: JSON.stringify({
              title: 'Criar função',
              summary: 'Adiciona uma função nova.',
              replacement: 'def ola():\n    return "olá"',
            }),
          },
        }),
      })),
    );

    await expect(
      requestLocalAIEditProposal(
        { baseUrl: 'http://localhost:11434', model: 'qwen' },
        {
          language: 'python',
          fileName: 'main.py',
          fullContent: '',
          selectedText: '',
          instruction: 'cria uma função ola',
        },
      ),
    ).resolves.toEqual({
      title: 'Criar função',
      summary: 'Adiciona uma função nova.',
      replacement: 'def ola():\n    return "olá"',
    });
  });

  it('devolve propostas estruturadas de edição', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          message: {
            content: JSON.stringify({
              title: 'Melhorar nome',
              summary: 'Usa um nome mais claro.',
              replacement: 'user_name = "Ana"',
            }),
          },
        }),
      })),
    );

    await expect(
      requestLocalAIEditProposal(
        { baseUrl: 'http://localhost:11434', model: 'qwen' },
        {
          language: 'python',
          fileName: 'main.py',
          fullContent: 'x = "Ana"',
          selectedText: 'x = "Ana"',
          instruction: 'torna o nome mais claro',
        },
      ),
    ).resolves.toEqual({
      title: 'Melhorar nome',
      summary: 'Usa um nome mais claro.',
      replacement: 'user_name = "Ana"',
    });
  });

  it('resume apenas ficheiros suportados do workspace e respeita o limite', async () => {
    const directories = new Map([
      [
        'file:///projects',
        [
          {
            uri: 'file:///projects/src',
            name: 'src',
            size: 0,
            modificationTime: 0,
            isDirectory: true,
          },
          {
            uri: 'file:///projects/README.md',
            name: 'README.md',
            size: 10,
            modificationTime: 0,
            isDirectory: false,
          },
        ],
      ],
      [
        'file:///projects/src',
        [
          {
            uri: 'file:///projects/src/main.py',
            name: 'main.py',
            size: 20,
            modificationTime: 0,
            isDirectory: false,
          },
          {
            uri: 'file:///projects/src/styles.css',
            name: 'styles.css',
            size: 30,
            modificationTime: 0,
            isDirectory: false,
          },
        ],
      ],
    ]);

    await expect(
      summarizeWorkspaceForLocalAI(
        'file:///projects',
        {
          listFiles: async (uri) => directories.get(uri) ?? [],
        },
        { maxFiles: 1 },
      ),
    ).resolves.toEqual({
      files: [
        {
          path: 'file:///projects/src/main.py',
          relativePath: 'src/main.py',
          language: 'python',
          size: 20,
        },
      ],
      omittedFileCount: 2,
    });
  });

  it('monta contexto de chat com ficheiro, abertos e mapa do projeto', () => {
    expect(
      buildLocalAIChatContextBlock({
        language: 'python',
        fileName: 'main.py',
        fullContent: 'print("olá")',
        selectedText: 'print("olá")',
        openFiles: [
          {
            name: 'main.py',
            path: 'file:///projects/main.py',
            language: 'python',
            isModified: true,
          },
        ],
        projectSummary: {
          files: [
            {
              path: 'file:///projects/main.py',
              relativePath: 'main.py',
              language: 'python',
              size: 12,
            },
          ],
          omittedFileCount: 2,
        },
        retrievedSnippets: [
          {
            path: 'file:///projects/helpers.py',
            relativePath: 'helpers.py',
            language: 'python',
            lineStart: 2,
            lineEnd: 4,
            excerpt: 'def helper():\n    return True',
            score: 8,
          },
        ],
        workspaceMemoryNotes: [
          {
            text: 'EditorContext é a fonte canónica.',
            evidences: [{ relativePath: 'main.py', line: 1 }],
          },
        ],
      }),
    ).toContain('Memória local durável do workspace:');
  });

  it('envia mensagens de chat com contexto atual', async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        ({
          ok: true,
          json: async () => ({
            message: {
              content: JSON.stringify({
                answer: 'Posso ajudar com isso.',
                references: [
                  {
                    relativePath: 'main.py',
                    line: 3,
                    column: 1,
                    label: 'Função principal',
                  },
                  {
                    relativePath: 'services/user.py',
                    line: 2,
                    label: 'Carrega utilizador',
                  },
                  {
                    relativePath: 'fantasma.py',
                    line: 1,
                  },
                ],
                editInstruction: 'extrair a lógica repetida',
                memoryNotes: [
                  {
                    text: 'EditorContext centraliza o ciclo de vida dos ficheiros.',
                    evidences: [
                      {
                        relativePath: 'main.py',
                        line: 1,
                        label: 'Entrada principal',
                      },
                      {
                        relativePath: 'fantasma.py',
                        line: 1,
                      },
                    ],
                  },
                ],
              }),
            },
          }),
        }) as Response,
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      requestLocalAIChat(
        { baseUrl: 'http://localhost:11434', model: 'qwen' },
        {
          language: 'python',
          fileName: 'main.py',
          fullContent: 'print("olá")',
          selectedText: '',
          openFiles: [],
          projectSummary: {
            files: [
              {
                path: 'file:///projects/main.py',
                relativePath: 'main.py',
                language: 'python',
                size: 12,
              },
            ],
            omittedFileCount: 0,
          },
          retrievedSnippets: [
            {
              path: 'file:///projects/services/user.py',
              relativePath: 'services/user.py',
              language: 'python',
              lineStart: 1,
              lineEnd: 3,
              excerpt: 'def load_user():\n    return user',
              score: 12,
            },
          ],
          workspaceMemoryNotes: [
            {
              text: 'O app é local-first.',
              evidences: [{ relativePath: 'main.py', line: 1 }],
            },
          ],
        },
        [{ role: 'user', content: 'O que faz este ficheiro?' }],
      ),
    ).resolves.toEqual({
      answer: 'Posso ajudar com isso.',
      references: [
        {
          relativePath: 'main.py',
          line: 3,
          column: 1,
          label: 'Função principal',
        },
        {
          relativePath: 'services/user.py',
          line: 2,
          label: 'Carrega utilizador',
        },
      ],
      editInstruction: 'extrair a lógica repetida',
      memoryNotes: [
        {
          text: 'EditorContext centraliza o ciclo de vida dos ficheiros.',
          evidences: [
            {
              relativePath: 'main.py',
              line: 1,
              label: 'Entrada principal',
            },
          ],
        },
      ],
    });

    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    expect(body.messages.at(-1)).toEqual({
      role: 'user',
      content: 'O que faz este ficheiro?',
    });
    expect(body.messages[1].content).toContain('Trechos recuperados para a pergunta atual:');
    expect(body.messages[1].content).toContain('Memória local durável do workspace:');
  });

  it('aceita sugestões de memória legadas em texto simples', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          message: {
            content: JSON.stringify({
              answer: 'ok',
              references: [],
              editInstruction: '',
              memoryNotes: ['Usa aliases @/*.'],
            }),
          },
        }),
      })),
    );

    await expect(
      requestLocalAIChat(
        { baseUrl: 'http://localhost:11434', model: 'qwen' },
        {
          language: 'python',
          fileName: 'main.py',
          fullContent: '',
          selectedText: '',
          openFiles: [],
          projectSummary: {
            files: [
              {
                path: 'file:///projects/main.py',
                relativePath: 'main.py',
                language: 'python',
                size: 0,
              },
            ],
            omittedFileCount: 0,
          },
          retrievedSnippets: [],
          workspaceMemoryNotes: [],
        },
        [{ role: 'user', content: 'guarda isto' }],
      ),
    ).resolves.toMatchObject({
      memoryNotes: [{ text: 'Usa aliases @/*.', evidences: [] }],
    });
  });

  it('aceita resposta textual crua em chat OpenAI-compatible', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'Consigo ajudar com o projeto sem JSON perfeito.',
              },
            },
          ],
        }),
      })),
    );

    await expect(
      requestLocalAIChat(
        {
          provider: 'openai-compatible',
          baseUrl: 'http://localhost:8642',
          model: 'omega-supreme',
        },
        {
          language: 'python',
          fileName: 'main.py',
          fullContent: '',
          selectedText: '',
          openFiles: [],
          projectSummary: { files: [], omittedFileCount: 0 },
          retrievedSnippets: [],
          workspaceMemoryNotes: [],
        },
        [{ role: 'user', content: 'olá' }],
      ),
    ).resolves.toEqual({
      answer: 'Consigo ajudar com o projeto sem JSON perfeito.',
      references: [],
      editInstruction: '',
      memoryNotes: [],
    });
  });

  it('extrai termos úteis para recuperação local', () => {
    expect(extractLocalAIRetrievalTerms('Como funciona a autenticação do utilizador?')).toEqual([
      'funciona',
      'autenticacao',
      'auth',
      'login',
      'utilizador',
      'user',
    ]);
  });

  it('recupera trechos relevantes e ignora o ficheiro excluído', async () => {
    const directories = new Map([
      [
        'file:///projects',
        [
          {
            uri: 'file:///projects/main.py',
            name: 'main.py',
            size: 20,
            modificationTime: 0,
            isDirectory: false,
          },
          {
            uri: 'file:///projects/auth.py',
            name: 'auth.py',
            size: 30,
            modificationTime: 0,
            isDirectory: false,
          },
          {
            uri: 'file:///projects/styles.css',
            name: 'styles.css',
            size: 10,
            modificationTime: 0,
            isDirectory: false,
          },
        ],
      ],
    ]);
    const contents = new Map([
      ['file:///projects/main.py', 'def login():\n    return auth_user()'],
      ['file:///projects/auth.py', 'def auth_user():\n    return verify_token()'],
      ['file:///projects/styles.css', '.button { color: red; }'],
    ]);

    await expect(
      retrieveRelevantWorkspaceSnippetsForLocalAI(
        'file:///projects',
        'onde está a autenticação do utilizador?',
        {
          listFiles: async (uri) => directories.get(uri) ?? [],
          readFile: async (path) => contents.get(path) ?? '',
        },
        {
          excludePaths: ['file:///projects/main.py'],
          maxSnippets: 2,
        },
      ),
    ).resolves.toEqual([
      {
        path: 'file:///projects/auth.py',
        relativePath: 'auth.py',
        language: 'python',
        lineStart: 1,
        lineEnd: 2,
        excerpt: 'def auth_user():\n    return verify_token()',
        score: 11,
      },
    ]);
  });
});
