import { afterEach, describe, expect, it, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addWorkspaceMemoryNote,
  clearLocalAIWorkspaceMemory,
  createLocalAIWorkspaceMemorySnapshot,
  createEmptyLocalAIWorkspaceMemory,
  createResolvedProblemMemoryNote,
  inspectWorkspaceMemoryNotes,
  loadLocalAIWorkspaceMemory,
  mergeWorkspaceMemoryNotes,
  removeStaleWorkspaceMemoryNotes,
  removeWorkspaceMemoryNote,
  saveLocalAIWorkspaceMemory,
  summarizeWorkspaceMemoryInspections,
  updateWorkspaceMemoryNote,
} from './local-ai-memory';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('local-ai-memory', () => {
  it('deduplica e limita notas duráveis', () => {
    const notes = mergeWorkspaceMemoryNotes(
      [' Usa EditorContext como fonte canónica. '],
      [
        {
          text: 'Usa EditorContext como fonte canónica.',
          evidences: [{ relativePath: 'lib/editor-context.tsx', line: 12 }],
        },
        {
          text: 'Persistência é local-first.',
          evidences: [{ relativePath: 'README.md', line: 7 }],
        },
      ],
    );

    expect(notes).toEqual([
      {
        text: 'Usa EditorContext como fonte canónica.',
        evidences: [{ relativePath: 'lib/editor-context.tsx', line: 12 }],
      },
      {
        text: 'Persistência é local-first.',
        evidences: [{ relativePath: 'README.md', line: 7 }],
      },
    ]);
  });

  it('guarda apenas o histórico recente', () => {
    const recentMessages = Array.from({ length: 14 }, (_, index) => ({
      role: index % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `mensagem ${index}`,
    }));

    const snapshot = createLocalAIWorkspaceMemorySnapshot(
      'file:///projects',
      null,
      recentMessages,
      ['Editor local-first'],
      123,
    );

    expect(snapshot.updatedAt).toBe(123);
    expect(snapshot.recentMessages).toHaveLength(12);
    expect(snapshot.recentMessages[0]?.content).toBe('mensagem 2');
  });

  it('recupera memória válida do armazenamento', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(
      JSON.stringify({
        version: 1,
        workspaceUri: 'file:///projects',
        updatedAt: 123,
        workspaceNotes: ['Editor local-first'],
        recentMessages: [{ role: 'user', content: 'olá' }],
      }),
    );

    await expect(loadLocalAIWorkspaceMemory('file:///projects')).resolves.toEqual({
      version: 1,
      workspaceUri: 'file:///projects',
      updatedAt: 123,
      workspaceNotes: [{ text: 'Editor local-first', evidences: [] }],
      recentMessages: [{ role: 'user', content: 'olá' }],
    });
  });

  it('volta a uma memória vazia quando o armazenamento é inválido', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue('{"oops":true}');

    await expect(loadLocalAIWorkspaceMemory('file:///projects')).resolves.toEqual(
      createEmptyLocalAIWorkspaceMemory('file:///projects'),
    );
  });

  it('guarda e limpa a memória do workspace', async () => {
    const memory = createLocalAIWorkspaceMemorySnapshot(
      'file:///projects',
      null,
      [{ role: 'user', content: 'olá' }],
      ['Editor local-first'],
      123,
    );

    await saveLocalAIWorkspaceMemory(memory);
    await clearLocalAIWorkspaceMemory('file:///projects');

    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(1);
  });

  it('permite adicionar, editar e remover notas manualmente', () => {
    const empty = createEmptyLocalAIWorkspaceMemory('file:///projects');
    const added = addWorkspaceMemoryNote(empty, ' Usa Expo Router. ', 1);
    const updated = updateWorkspaceMemoryNote(added, 0, 'Usa Expo Router e Metro.', 2);
    const removed = removeWorkspaceMemoryNote(updated, 0, 3);

    expect(added.workspaceNotes).toEqual([{ text: 'Usa Expo Router.', evidences: [] }]);
    expect(updated.workspaceNotes).toEqual([
      { text: 'Usa Expo Router e Metro.', evidences: [] },
    ]);
    expect(removed.workspaceNotes).toEqual([]);
  });

  it('cria nota de aprendizagem quando um problema é resolvido', () => {
    expect(
      createResolvedProblemMemoryNote({
        fileName: 'main.py',
        summary: 'Extrair validação repetida para helper.',
        targetScope: 'selection',
        evidences: [{ relativePath: 'main.py', line: 4, label: 'Correção aplicada' }],
      }),
    ).toEqual({
      text: 'Resolvido em main.py: Extrair validação repetida para helper; alvo: seleção.',
      evidences: [{ relativePath: 'main.py', line: 4, label: 'Correção aplicada' }],
    });
  });

  it('preserva evidências ao editar uma nota existente', () => {
    const memory = createLocalAIWorkspaceMemorySnapshot(
      'file:///projects',
      null,
      [],
      [
        {
          text: 'Usa EditorContext.',
          evidences: [{ relativePath: 'lib/editor-context.tsx', line: 42 }],
        },
      ],
      1,
    );

    const updated = updateWorkspaceMemoryNote(
      memory,
      0,
      'Usa EditorContext como fonte canónica.',
      2,
    );

    expect(updated.workspaceNotes).toEqual([
      {
        text: 'Usa EditorContext como fonte canónica.',
        evidences: [{ relativePath: 'lib/editor-context.tsx', line: 42 }],
      },
    ]);
  });

  it('classifica memória manual, confirmada, parcial e desatualizada', async () => {
    const notes = [
      { text: 'Manual', evidences: [] },
      {
        text: 'Confirmada',
        evidences: [{ relativePath: 'main.py', line: 2 }],
      },
      {
        text: 'Parcial',
        evidences: [
          { relativePath: 'main.py', line: 1 },
          { relativePath: 'missing.py', line: 1 },
        ],
      },
      {
        text: 'Desatualizada',
        evidences: [{ relativePath: 'main.py', line: 9 }],
      },
    ];

    const inspections = await inspectWorkspaceMemoryNotes(notes, {
      resolvePath: (relativePath) =>
        relativePath === 'main.py' ? 'file:///projects/main.py' : null,
      readFile: async () => 'linha 1\nlinha 2',
    });

    expect(inspections.map((inspection) => inspection.status)).toEqual([
      'manual',
      'grounded',
      'partial',
      'stale',
    ]);
    expect(summarizeWorkspaceMemoryInspections(inspections)).toEqual({
      manual: 1,
      grounded: 1,
      partial: 1,
      stale: 1,
    });
  });

  it('remove apenas notas desatualizadas', async () => {
    const memory = createLocalAIWorkspaceMemorySnapshot(
      'file:///projects',
      null,
      [],
      [
        {
          text: 'Confirmada',
          evidences: [{ relativePath: 'main.py', line: 1 }],
        },
        {
          text: 'Desatualizada',
          evidences: [{ relativePath: 'missing.py', line: 1 }],
        },
      ],
      1,
    );
    const inspections = await inspectWorkspaceMemoryNotes(memory.workspaceNotes, {
      resolvePath: (relativePath) =>
        relativePath === 'main.py' ? 'file:///projects/main.py' : null,
      readFile: async () => 'linha 1',
    });

    expect(removeStaleWorkspaceMemoryNotes(memory, inspections, 2)).toEqual({
      ...memory,
      updatedAt: 2,
      workspaceNotes: [
        {
          text: 'Confirmada',
          evidences: [{ relativePath: 'main.py', line: 1 }],
        },
      ],
    });
  });
});
