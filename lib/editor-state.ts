import { detectLanguageFromExtension, type CodeLanguage } from './types-extended';
import type { AppSettings, EditorState, EditorViewState, PythonFile } from './types';

export type EditorAction =
  | { type: 'OPEN_FILE'; payload: PythonFile }
  | { type: 'CLOSE_FILE'; payload: string }
  | {
      type: 'REORDER_OPEN_FILES';
      payload: { fileId: string; targetFileId: string };
    }
  | {
      type: 'RENAME_PATH';
      payload: { oldPath: string; newPath: string; isDirectory: boolean };
    }
  | {
      type: 'REMOVE_PATH';
      payload: { path: string; isDirectory: boolean };
    }
  | {
      type: 'RESTORE_SESSION';
      payload: {
        files: PythonFile[];
        currentFileId: string | null;
        viewStateByFileId: Record<string, EditorViewState>;
      };
    }
  | { type: 'UPDATE_CONTENT'; payload: { fileId: string; content: string } }
  | {
      type: 'MARK_SAVED';
      payload: { fileId: string; uri: string; lastModified: number };
    }
  | { type: 'SET_LANGUAGE'; payload: { fileId: string; language: CodeLanguage } }
  | { type: 'SET_CURSOR'; payload: { line: number; column: number } }
  | { type: 'SET_SELECTION'; payload: { start: number; end: number } }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'LOAD_SETTINGS'; payload: AppSettings };

export const initialEditorState: EditorState = {
  currentFile: null,
  openFiles: [],
  cursorLine: 0,
  cursorColumn: 0,
  selectionStart: 0,
  selectionEnd: 0,
  viewStateByFileId: {},
};

const initialViewState: EditorViewState = {
  cursorLine: 0,
  cursorColumn: 0,
  selectionStart: 0,
  selectionEnd: 0,
};

let draftCounter = 0;

function withDerivedFileStats(file: PythonFile, content: string): PythonFile {
  return {
    ...file,
    content,
    lineCount: content.split('\n').length,
    charCount: content.length,
    lastModified: Date.now(),
    isModified: content !== file.savedContent,
  };
}

export function createDraftFile(
  name: string,
  language: CodeLanguage = detectLanguageFromExtension(name),
): PythonFile {
  draftCounter += 1;

  return {
    id: `draft:${Date.now()}:${draftCounter}`,
    name,
    path: null,
    uri: null,
    language,
    content: '',
    savedContent: '',
    lastModified: Date.now(),
    isModified: false,
    isDraft: true,
    encoding: 'utf-8',
    lineCount: 1,
    charCount: 0,
  };
}

export function createPersistedFile(uri: string, content: string): PythonFile {
  const encodedName = uri.substring(uri.lastIndexOf('/') + 1);
  const name = decodeURIComponent(encodedName);
  return {
    id: `file:${uri}`,
    name,
    path: uri,
    uri,
    language: detectLanguageFromExtension(name),
    content,
    savedContent: content,
    lastModified: Date.now(),
    isModified: false,
    isDraft: false,
    encoding: 'utf-8',
    lineCount: content.split('\n').length,
    charCount: content.length,
  };
}

export function replaceSelection(
  content: string,
  selectionStart: number,
  selectionEnd: number,
  replacement: string,
): { content: string; caret: number } {
  const nextContent =
    content.substring(0, selectionStart) +
    replacement +
    content.substring(selectionEnd);

  return {
    content: nextContent,
    caret: selectionStart + replacement.length,
  };
}

export function getLineAndColumnFromOffset(
  content: string,
  offset: number,
): { line: number; column: number } {
  const clampedOffset = Math.max(0, Math.min(offset, content.length));
  const beforeCursor = content.slice(0, clampedOffset);
  const lines = beforeCursor.split('\n');

  return {
    line: Math.max(0, lines.length - 1),
    column: lines.at(-1)?.length ?? 0,
  };
}

export function getOffsetFromLineAndColumn(
  content: string,
  line: number,
  column: number,
): number {
  const lines = content.split('\n');
  const clampedLine = Math.max(0, Math.min(line, lines.length - 1));
  const prefixLength = lines.slice(0, clampedLine).reduce((total, current) => total + current.length + 1, 0);
  const clampedColumn = Math.max(0, Math.min(column, lines[clampedLine]?.length ?? 0));

  return prefixLength + clampedColumn;
}

function getCurrentViewState(state: EditorState): EditorViewState {
  return {
    cursorLine: state.cursorLine,
    cursorColumn: state.cursorColumn,
    selectionStart: state.selectionStart,
    selectionEnd: state.selectionEnd,
  };
}

function persistCurrentViewState(state: EditorState): Record<string, EditorViewState> {
  if (!state.currentFile) {
    return state.viewStateByFileId;
  }

  return {
    ...state.viewStateByFileId,
    [state.currentFile.id]: getCurrentViewState(state),
  };
}

function normalizePath(path: string): string {
  return path.replace(/\/+$/, '');
}

function isAffectedPath(path: string | null, changedPath: string, isDirectory: boolean): boolean {
  if (!path) return false;

  const normalizedPath = normalizePath(path);
  const normalizedChangedPath = normalizePath(changedPath);

  return isDirectory
    ? normalizedPath === normalizedChangedPath ||
        normalizedPath.startsWith(`${normalizedChangedPath}/`)
    : normalizedPath === normalizedChangedPath;
}

function replacePathPrefix(path: string, oldPath: string, newPath: string): string {
  const normalizedPath = normalizePath(path);
  const normalizedOldPath = normalizePath(oldPath);
  const normalizedNewPath = normalizePath(newPath);

  if (normalizedPath === normalizedOldPath) {
    return normalizedNewPath;
  }

  return `${normalizedNewPath}${normalizedPath.slice(normalizedOldPath.length)}`;
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'RESTORE_SESSION': {
      const currentFile =
        action.payload.files.find((file) => file.id === action.payload.currentFileId) ??
        action.payload.files[0] ??
        null;
      const currentViewState = currentFile
        ? action.payload.viewStateByFileId[currentFile.id] ?? initialViewState
        : initialViewState;

      return {
        ...state,
        currentFile,
        openFiles: action.payload.files,
        ...currentViewState,
        viewStateByFileId: action.payload.viewStateByFileId,
      };
    }
    case 'OPEN_FILE': {
      const existingFile = state.openFiles.find((file) => file.id === action.payload.id);
      const nextFile = existingFile ?? action.payload;
      const viewStateByFileId = persistCurrentViewState(state);
      const nextViewState = viewStateByFileId[nextFile.id] ?? initialViewState;
      return {
        ...state,
        currentFile: nextFile,
        openFiles: existingFile ? state.openFiles : [...state.openFiles, action.payload],
        ...nextViewState,
        viewStateByFileId,
      };
    }
    case 'CLOSE_FILE': {
      const closedIndex = state.openFiles.findIndex((file) => file.id === action.payload);
      const remaining = state.openFiles.filter((file) => file.id !== action.payload);
      const isClosingCurrent = state.currentFile?.id === action.payload;
      const nextFile = isClosingCurrent
        ? remaining[closedIndex] ?? remaining[closedIndex - 1] ?? null
        : state.currentFile;
      const viewStateByFileId = persistCurrentViewState(state);
      const nextViewState = nextFile ? viewStateByFileId[nextFile.id] ?? initialViewState : initialViewState;
      return {
        ...state,
        currentFile: nextFile,
        openFiles: remaining,
        ...nextViewState,
        viewStateByFileId,
      };
    }
    case 'REORDER_OPEN_FILES': {
      const sourceIndex = state.openFiles.findIndex(
        (file) => file.id === action.payload.fileId,
      );
      const targetIndex = state.openFiles.findIndex(
        (file) => file.id === action.payload.targetFileId,
      );

      if (
        sourceIndex === -1 ||
        targetIndex === -1 ||
        sourceIndex === targetIndex
      ) {
        return state;
      }

      const openFiles = [...state.openFiles];
      const [movedFile] = openFiles.splice(sourceIndex, 1);
      openFiles.splice(targetIndex, 0, movedFile);

      return {
        ...state,
        openFiles,
      };
    }
    case 'RENAME_PATH': {
      const update = (file: PythonFile) => {
        if (!isAffectedPath(file.path, action.payload.oldPath, action.payload.isDirectory)) {
          return file;
        }

        const nextPath = replacePathPrefix(
          file.path!,
          action.payload.oldPath,
          action.payload.newPath,
        );
        const nextName = decodeURIComponent(nextPath.substring(nextPath.lastIndexOf('/') + 1));

        return {
          ...file,
          name: nextName,
          path: nextPath,
          uri: nextPath,
          language: action.payload.isDirectory
            ? file.language
            : detectLanguageFromExtension(nextName),
        };
      };

      return {
        ...state,
        currentFile: state.currentFile ? update(state.currentFile) : null,
        openFiles: state.openFiles.map(update),
      };
    }
    case 'REMOVE_PATH': {
      const affectedFileIds = new Set(
        state.openFiles
          .filter((file) => isAffectedPath(file.path, action.payload.path, action.payload.isDirectory))
          .map((file) => file.id),
      );

      const openFiles = state.openFiles.flatMap((file) => {
        if (!affectedFileIds.has(file.id)) {
          return [file];
        }

        if (file.isModified) {
          return [
            {
              ...file,
              path: null,
              uri: null,
              isDraft: true,
            },
          ];
        }

        return [];
      });

      const currentFile =
        state.currentFile && affectedFileIds.has(state.currentFile.id)
          ? state.currentFile.isModified
            ? {
                ...state.currentFile,
                path: null,
                uri: null,
                isDraft: true,
              }
            : openFiles[0] ?? null
          : state.currentFile;
      const currentViewState = currentFile
        ? state.viewStateByFileId[currentFile.id] ?? initialViewState
        : initialViewState;

      return {
        ...state,
        currentFile,
        openFiles,
        ...currentViewState,
      };
    }
    case 'UPDATE_CONTENT': {
      const update = (file: PythonFile) =>
        file.id === action.payload.fileId
          ? withDerivedFileStats(file, action.payload.content)
          : file;
      return {
        ...state,
        currentFile:
          state.currentFile?.id === action.payload.fileId
            ? update(state.currentFile)
            : state.currentFile,
        openFiles: state.openFiles.map(update),
      };
    }
    case 'MARK_SAVED': {
      const update = (file: PythonFile) =>
        file.id === action.payload.fileId
          ? {
              ...file,
              path: action.payload.uri,
              uri: action.payload.uri,
              savedContent: file.content,
              lastModified: action.payload.lastModified,
              isModified: false,
              isDraft: false,
            }
          : file;
      return {
        ...state,
        currentFile:
          state.currentFile?.id === action.payload.fileId
            ? update(state.currentFile)
            : state.currentFile,
        openFiles: state.openFiles.map(update),
      };
    }
    case 'SET_LANGUAGE': {
      const update = (file: PythonFile) =>
        file.id === action.payload.fileId ? { ...file, language: action.payload.language } : file;
      return {
        ...state,
        currentFile:
          state.currentFile?.id === action.payload.fileId
            ? update(state.currentFile)
            : state.currentFile,
        openFiles: state.openFiles.map(update),
      };
    }
    case 'SET_CURSOR':
      if (!state.currentFile) {
        return {
          ...state,
          cursorLine: action.payload.line,
          cursorColumn: action.payload.column,
        };
      }

      return {
        ...state,
        cursorLine: action.payload.line,
        cursorColumn: action.payload.column,
        viewStateByFileId: {
          ...state.viewStateByFileId,
          [state.currentFile.id]: {
            ...(state.viewStateByFileId[state.currentFile.id] ?? initialViewState),
            cursorLine: action.payload.line,
            cursorColumn: action.payload.column,
          },
        },
      };
    case 'SET_SELECTION':
      if (!state.currentFile) {
        return {
          ...state,
          selectionStart: action.payload.start,
          selectionEnd: action.payload.end,
        };
      }

      return {
        ...state,
        selectionStart: action.payload.start,
        selectionEnd: action.payload.end,
        viewStateByFileId: {
          ...state.viewStateByFileId,
          [state.currentFile.id]: {
            ...(state.viewStateByFileId[state.currentFile.id] ?? initialViewState),
            selectionStart: action.payload.start,
            selectionEnd: action.payload.end,
          },
        },
      };
    default:
      return state;
  }
}
