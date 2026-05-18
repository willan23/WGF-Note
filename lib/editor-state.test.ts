import { describe, expect, it } from 'vitest';
import {
  createDraftFile,
  createPersistedFile,
  editorReducer,
  getLineAndColumnFromOffset,
  getOffsetFromLineAndColumn,
  initialEditorState,
  replaceSelection,
} from './editor-state';

describe('editor-state', () => {
  it('distingue rascunhos de ficheiros persistidos', () => {
    const draft = createDraftFile('novo.py');
    const persisted = createPersistedFile('file:///projects/site.html', '<!DOCTYPE html>');
    const typed = createPersistedFile('file:///projects/app.ts', 'const total = 1;');
    const unknown = createPersistedFile('file:///projects/sem-extensao', 'texto');

    expect(draft.isDraft).toBe(true);
    expect(draft.path).toBeNull();
    expect(persisted.isDraft).toBe(false);
    expect(persisted.language).toBe('html');
    expect(typed.language).toBe('typescript');
    expect(unknown.language).toBe('plaintext');
  });

  it('limpa o estado dirty depois de guardar', () => {
    const draft = createDraftFile('script.py');
    const opened = editorReducer(initialEditorState, { type: 'OPEN_FILE', payload: draft });
    const edited = editorReducer(opened, {
      type: 'UPDATE_CONTENT',
      payload: { fileId: draft.id, content: 'print("olá")' },
    });
    const saved = editorReducer(edited, {
      type: 'MARK_SAVED',
      payload: { fileId: draft.id, uri: 'file:///projects/script.py', lastModified: 1 },
    });

    expect(edited.currentFile?.isModified).toBe(true);
    expect(saved.currentFile?.isModified).toBe(false);
    expect(saved.currentFile?.isDraft).toBe(false);
    expect(saved.currentFile?.uri).toBe('file:///projects/script.py');
  });

  it('substitui texto exatamente na seleção atual', () => {
    const result = replaceSelection('hello world', 6, 11, 'dex');

    expect(result).toEqual({ content: 'hello dex', caret: 9 });
  });

  it('calcula linha e coluna a partir do cursor real', () => {
    expect(getLineAndColumnFromOffset('a\nbc\ndef', 4)).toEqual({
      line: 1,
      column: 2,
    });
  });

  it('calcula offset a partir de linha e coluna', () => {
    expect(getOffsetFromLineAndColumn('a\nbc\ndef', 2, 1)).toBe(6);
  });

  it('preserva posição por ficheiro e escolhe a aba vizinha ao fechar', () => {
    const first = createDraftFile('primeiro.py');
    const second = createDraftFile('segundo.py');
    const third = createDraftFile('terceiro.py');

    let state = editorReducer(initialEditorState, { type: 'OPEN_FILE', payload: first });
    state = editorReducer(state, { type: 'SET_CURSOR', payload: { line: 3, column: 2 } });
    state = editorReducer(state, { type: 'SET_SELECTION', payload: { start: 12, end: 12 } });
    state = editorReducer(state, { type: 'OPEN_FILE', payload: second });
    state = editorReducer(state, { type: 'OPEN_FILE', payload: third });
    state = editorReducer(state, { type: 'OPEN_FILE', payload: first });

    expect(state.cursorLine).toBe(3);
    expect(state.selectionStart).toBe(12);

    state = editorReducer(state, { type: 'OPEN_FILE', payload: second });
    state = editorReducer(state, { type: 'CLOSE_FILE', payload: second.id });

    expect(state.currentFile?.id).toBe(third.id);
  });

  it('restaura uma sessão inteira de uma só vez', () => {
    const first = createDraftFile('primeiro.py');
    const second = createDraftFile('segundo.py');
    const restored = editorReducer(initialEditorState, {
      type: 'RESTORE_SESSION',
      payload: {
        files: [first, second],
        currentFileId: second.id,
        viewStateByFileId: {
          [second.id]: {
            cursorLine: 4,
            cursorColumn: 1,
            selectionStart: 12,
            selectionEnd: 12,
          },
        },
      },
    });

    expect(restored.openFiles).toHaveLength(2);
    expect(restored.currentFile?.id).toBe(second.id);
    expect(restored.cursorLine).toBe(4);
  });

  it('mantém a aba e atualiza o caminho quando um ficheiro aberto é renomeado', () => {
    const persisted = createPersistedFile('file:///projects/app.py', 'print("olá")');
    const opened = editorReducer(initialEditorState, { type: 'OPEN_FILE', payload: persisted });
    const renamed = editorReducer(opened, {
      type: 'RENAME_PATH',
      payload: {
        oldPath: 'file:///projects/app.py',
        newPath: 'file:///projects/main.py',
        isDirectory: false,
      },
    });

    expect(renamed.currentFile).toMatchObject({
      id: persisted.id,
      name: 'main.py',
      path: 'file:///projects/main.py',
    });
  });

  it('fecha ficheiro limpo removido e converte ficheiro modificado em rascunho', () => {
    const clean = createPersistedFile('file:///projects/clean.py', 'clean');
    const dirty = {
      ...createPersistedFile('file:///projects/dirty.py', 'saved'),
      content: 'changed',
      isModified: true,
    };

    let state = editorReducer(initialEditorState, { type: 'OPEN_FILE', payload: clean });
    state = editorReducer(state, { type: 'OPEN_FILE', payload: dirty });
    state = editorReducer(state, {
      type: 'REMOVE_PATH',
      payload: { path: 'file:///projects/clean.py', isDirectory: false },
    });
    expect(state.openFiles.map((file) => file.name)).toEqual(['dirty.py']);

    state = editorReducer(state, {
      type: 'REMOVE_PATH',
      payload: { path: 'file:///projects/dirty.py', isDirectory: false },
    });
    expect(state.currentFile).toMatchObject({
      name: 'dirty.py',
      path: null,
      uri: null,
      isDraft: true,
    });
  });
});
