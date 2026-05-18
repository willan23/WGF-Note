import { describe, expect, it } from 'vitest';
import { createDraftFile, createPersistedFile, editorReducer, initialEditorState } from './editor-state';
import {
  createEditorSessionSnapshot,
  isEditorSessionSnapshot,
  restoreEditorSession,
} from './editor-session';

describe('editor-session', () => {
  it('inclui a posição atual no snapshot da sessão', () => {
    const draft = createDraftFile('rascunho.py');
    let state = editorReducer(initialEditorState, { type: 'OPEN_FILE', payload: draft });
    state = editorReducer(state, { type: 'SET_SELECTION', payload: { start: 0, end: 0 } });
    state = editorReducer(state, { type: 'SET_CURSOR', payload: { line: 2, column: 4 } });

    const snapshot = createEditorSessionSnapshot(state);

    expect(snapshot.activeFileId).toBe(draft.id);
    expect(snapshot.viewStateByFileId[draft.id]).toMatchObject({
      cursorLine: 2,
      cursorColumn: 4,
    });
  });

  it('restaura um ficheiro persistido com alterações locais por cima do disco', async () => {
    const persisted = {
      ...createPersistedFile('file:///projects/app.py', 'print("disco")'),
      content: 'print("rascunho")',
      isModified: true,
    };

    const restored = await restoreEditorSession(
      {
        version: 1,
        activeFileId: persisted.id,
        files: [persisted],
        viewStateByFileId: {},
      },
      {
        fileExists: async () => true,
        openFile: async () => 'print("disco novo")',
      },
    );

    expect(restored.files[0]).toMatchObject({
      content: 'print("rascunho")',
      savedContent: 'print("disco novo")',
      isModified: true,
      isDraft: false,
    });
  });

  it('ignora ficheiro desaparecido sem alterações e recupera o que tinha trabalho local', async () => {
    const clean = createPersistedFile('file:///projects/limpo.py', 'print("limpo")');
    const dirty = {
      ...createPersistedFile('file:///projects/sujo.py', 'print("guardado")'),
      content: 'print("não guardado")',
      isModified: true,
    };

    const restored = await restoreEditorSession(
      {
        version: 1,
        activeFileId: dirty.id,
        files: [clean, dirty],
        viewStateByFileId: {},
      },
      {
        fileExists: async () => false,
        openFile: async () => '',
      },
    );

    expect(restored.files).toHaveLength(1);
    expect(restored.files[0]).toMatchObject({
      name: 'sujo.py',
      path: null,
      uri: null,
      isDraft: true,
      isModified: true,
    });
    expect(restored.activeFileId).toBe(restored.files[0]?.id);
  });

  it('rejeita snapshots incompatíveis', () => {
    expect(isEditorSessionSnapshot({ version: 2 })).toBe(false);
    expect(
      isEditorSessionSnapshot({
        version: 1,
        activeFileId: null,
        files: [],
        viewStateByFileId: {},
      }),
    ).toBe(true);
  });
});
