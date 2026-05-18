import type { EditorState, EditorViewState, PythonFile } from './types';
import { getLineAndColumnFromOffset } from './editor-state';

export const EDITOR_SESSION_STORAGE_KEY = 'editor-session-v1';
export const EDITOR_SESSION_VERSION = 1;

export interface EditorSessionSnapshot {
  version: typeof EDITOR_SESSION_VERSION;
  activeFileId: string | null;
  files: PythonFile[];
  viewStateByFileId: Record<string, EditorViewState>;
}

export interface RestoredEditorSession {
  files: PythonFile[];
  activeFileId: string | null;
  viewStateByFileId: Record<string, EditorViewState>;
}

export interface SessionFileSystem {
  fileExists: (path: string) => Promise<boolean>;
  openFile: (path: string) => Promise<string>;
}

function getCurrentViewState(state: EditorState): EditorViewState {
  return {
    cursorLine: state.cursorLine,
    cursorColumn: state.cursorColumn,
    selectionStart: state.selectionStart,
    selectionEnd: state.selectionEnd,
  };
}

function withDerivedStats(
  file: PythonFile,
  content: string,
  savedContent: string,
  overrides: Partial<PythonFile> = {},
): PythonFile {
  return {
    ...file,
    ...overrides,
    content,
    savedContent,
    lineCount: content.split('\n').length,
    charCount: content.length,
    isModified: content !== savedContent,
  };
}

function clampViewState(viewState: EditorViewState | undefined, content: string): EditorViewState {
  const safeStart = Math.max(0, Math.min(viewState?.selectionStart ?? 0, content.length));
  const safeEnd = Math.max(safeStart, Math.min(viewState?.selectionEnd ?? safeStart, content.length));
  const cursor = getLineAndColumnFromOffset(content, safeStart);

  return {
    cursorLine: cursor.line,
    cursorColumn: cursor.column,
    selectionStart: safeStart,
    selectionEnd: safeEnd,
  };
}

function recoverMissingPersistedFile(file: PythonFile): PythonFile {
  return withDerivedStats(file, file.content, '', {
    id: `draft:recovered:${file.id}`,
    path: null,
    uri: null,
    isDraft: true,
  });
}

function isRecoverableMissingFile(file: PythonFile): boolean {
  return file.isModified || file.content !== file.savedContent;
}

function isPythonFile(value: unknown): value is PythonFile {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<PythonFile>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.content === 'string' &&
    typeof candidate.savedContent === 'string' &&
    typeof candidate.language === 'string' &&
    typeof candidate.isDraft === 'boolean'
  );
}

function isEditorViewState(value: unknown): value is EditorViewState {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<EditorViewState>;
  return (
    typeof candidate.cursorLine === 'number' &&
    typeof candidate.cursorColumn === 'number' &&
    typeof candidate.selectionStart === 'number' &&
    typeof candidate.selectionEnd === 'number'
  );
}

export function isEditorSessionSnapshot(value: unknown): value is EditorSessionSnapshot {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<EditorSessionSnapshot>;
  return (
    candidate.version === EDITOR_SESSION_VERSION &&
    (typeof candidate.activeFileId === 'string' || candidate.activeFileId === null) &&
    Array.isArray(candidate.files) &&
    candidate.files.every(isPythonFile) &&
    Boolean(candidate.viewStateByFileId) &&
    typeof candidate.viewStateByFileId === 'object' &&
    Object.values(candidate.viewStateByFileId as Record<string, unknown>).every(
      isEditorViewState,
    )
  );
}

export function createEditorSessionSnapshot(state: EditorState): EditorSessionSnapshot {
  const viewStateByFileId = state.currentFile
    ? {
        ...state.viewStateByFileId,
        [state.currentFile.id]: getCurrentViewState(state),
      }
    : state.viewStateByFileId;

  return {
    version: EDITOR_SESSION_VERSION,
    activeFileId: state.currentFile?.id ?? null,
    files: state.openFiles,
    viewStateByFileId,
  };
}

export async function restoreEditorSession(
  snapshot: EditorSessionSnapshot,
  fileSystem: SessionFileSystem,
): Promise<RestoredEditorSession> {
  const files: PythonFile[] = [];
  const idMap = new Map<string, string>();
  const originalIdByRestoredId = new Map<string, string>();

  for (const file of snapshot.files) {
    let restoredFile: PythonFile | null = null;

    if (file.isDraft || !file.path) {
      restoredFile = withDerivedStats(file, file.content, file.savedContent, {
        path: null,
        uri: null,
        isDraft: true,
      });
    } else if (await fileSystem.fileExists(file.path)) {
      const diskContent = await fileSystem.openFile(file.path);
      const restoredContent = file.isModified ? file.content : diskContent;

      restoredFile = withDerivedStats(file, restoredContent, diskContent, {
        path: file.path,
        uri: file.uri ?? file.path,
        isDraft: false,
      });
    } else if (isRecoverableMissingFile(file)) {
      restoredFile = recoverMissingPersistedFile(file);
    }

    if (!restoredFile) continue;

    files.push(restoredFile);
    idMap.set(file.id, restoredFile.id);
    originalIdByRestoredId.set(restoredFile.id, file.id);
  }

  const viewStateByFileId = files.reduce<Record<string, EditorViewState>>((accumulator, file) => {
    const originalId = originalIdByRestoredId.get(file.id) ?? file.id;

    accumulator[file.id] = clampViewState(snapshot.viewStateByFileId[originalId], file.content);
    return accumulator;
  }, {});

  const mappedActiveFileId = snapshot.activeFileId
    ? idMap.get(snapshot.activeFileId) ?? null
    : null;
  const activeFileId =
    mappedActiveFileId && files.some((file) => file.id === mappedActiveFileId)
      ? mappedActiveFileId
      : files[0]?.id ?? null;

  return {
    files,
    activeFileId,
    viewStateByFileId,
  };
}
