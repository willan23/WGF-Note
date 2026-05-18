import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppSettings, PythonFile } from './types';
import type { CodeLanguage } from './types-extended';
import * as UndoRedoManager from './undo-redo-manager';
import * as ClipboardManager from './clipboard-manager';
import * as FileSystemManager from './file-system-manager';
import * as BookmarksManager from './bookmarks-manager';
import * as RecentFilesManager from './recent-files-manager';
import * as AutoIndent from './auto-indent';
import { isDesktopRuntime } from './desktop-bridge';
import {
  createDraftFile,
  createPersistedFile,
  editorReducer,
  getLineAndColumnFromOffset,
  getOffsetFromLineAndColumn,
  initialEditorState,
  replaceSelection,
} from './editor-state';
import {
  createEditorSessionSnapshot,
  EDITOR_SESSION_STORAGE_KEY,
  isEditorSessionSnapshot,
  restoreEditorSession,
} from './editor-session';
import { useThemeContext } from './theme-provider';
import type { WorkspaceReplacementPlanItem } from './workspace-search';

interface EditorContextType {
  state: typeof initialEditorState;
  settings: AppSettings;
  undoRedoState: UndoRedoManager.UndoRedoState;
  currentLanguage: CodeLanguage;
  setCurrentLanguage: (language: CodeLanguage) => void;
  openFile: (file: PythonFile) => void;
  closeFile: (fileId: string) => void;
  updateFileContent: (fileId: string, content: string) => void;
  createNewFile: (name: string, language?: CodeLanguage) => PythonFile;
  saveCurrentFile: () => Promise<void>;
  openFileFromSystem: (filePath: string) => Promise<void>;
  openFileFromSystemAtRange: (filePath: string, start: number, end: number) => Promise<void>;
  applyWorkspaceReplacementPlan: (
    plan: WorkspaceReplacementPlanItem[],
  ) => Promise<{ updatedOpenFiles: number; updatedClosedFiles: number }>;
  renameWorkspacePath: (oldPath: string, newPath: string, isDirectory: boolean) => Promise<void>;
  removeWorkspacePath: (path: string, isDirectory: boolean) => Promise<void>;
  setCursorPosition: (line: number, column: number) => void;
  setSelection: (start: number, end: number) => void;
  selectRange: (start: number, end: number) => void;
  replaceCurrentSelection: (replacement: string) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  copy: () => Promise<void>;
  cut: () => Promise<void>;
  paste: () => Promise<void>;
  toggleBookmark: (line: number) => Promise<void>;
  nextBookmark: () => Promise<void>;
  previousBookmark: () => Promise<void>;
  autoIndentCurrentLine: () => void;
  indentSelection: () => void;
  dedentSelection: () => void;
  getRecentFiles: () => Promise<RecentFilesManager.RecentFile[]>;
  workspaceRootUri: string;
  setWorkspaceRootUri: (uri: string) => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

const defaultSettings: AppSettings = {
  theme: 'dark',
  fontSize: 14,
  fontFamily: 'Menlo',
  indentSize: 4,
  useSpaces: true,
  wordWrap: true,
  autoSave: true,
  autoSaveInterval: 30000,
  showLineNumbers: true,
  showWhitespace: false,
  localAiEnabled: isDesktopRuntime(),
  localAiBaseUrl: isDesktopRuntime() ? 'http://127.0.0.1:11434' : '',
  localAiModel: '',
};

function getHistoryForFile(
  histories: Record<string, UndoRedoManager.UndoRedoState>,
  file: PythonFile | null,
): UndoRedoManager.UndoRedoState {
  if (!file) {
    return UndoRedoManager.createUndoRedoState();
  }

  return histories[file.id] ?? UndoRedoManager.createUndoRedoState(file.content);
}

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(editorReducer, initialEditorState);
  const [settings, setSettingsState] = useState<AppSettings>(defaultSettings);
  const [settingsHydrated, setSettingsHydrated] = useState(false);
  const [sessionHydrated, setSessionHydrated] = useState(false);
  const [historyByFileId, setHistoryByFileId] = useState<
    Record<string, UndoRedoManager.UndoRedoState>
  >({});
  const [workspaceRootUri, setWorkspaceRootUriState] = useState(() =>
    FileSystemManager.getProjectsDirectoryUri(),
  );
  const { setColorScheme } = useThemeContext();

  const currentLanguage = state.currentFile?.language ?? 'python';
  const undoRedoState = useMemo(
    () => getHistoryForFile(historyByFileId, state.currentFile),
    [historyByFileId, state.currentFile],
  );

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem('editor-settings');
        if (!stored) return;

        const parsed = JSON.parse(stored) as Partial<AppSettings>;
        const nextSettings = { ...defaultSettings, ...parsed };
        setSettingsState(nextSettings);
        setColorScheme(nextSettings.theme);
      } catch (error) {
        console.error('Erro ao carregar definições:', error);
      } finally {
        setSettingsHydrated(true);
      }
    };

    loadSettings();
  }, [setColorScheme]);

  useEffect(() => {
    if (!settingsHydrated) return;

    const saveSettings = async () => {
      try {
        await AsyncStorage.setItem('editor-settings', JSON.stringify(settings));
      } catch (error) {
        console.error('Erro ao guardar definições:', error);
      }
    };

    saveSettings();
  }, [settings, settingsHydrated]);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      try {
        const [, storedSession] = await Promise.all([
          FileSystemManager.initFileSystem(),
          AsyncStorage.getItem(EDITOR_SESSION_STORAGE_KEY),
        ]);

        if (!storedSession) return;

        const parsedSession: unknown = JSON.parse(storedSession);
        if (!isEditorSessionSnapshot(parsedSession)) return;

        const restoredSession = await restoreEditorSession(parsedSession, {
          fileExists: FileSystemManager.fileExists,
          openFile: FileSystemManager.openFile,
        });

        if (cancelled) return;

        dispatch({
          type: 'RESTORE_SESSION',
          payload: {
            files: restoredSession.files,
            currentFileId: restoredSession.activeFileId,
            viewStateByFileId: restoredSession.viewStateByFileId,
          },
        });
        setHistoryByFileId(
          Object.fromEntries(
            restoredSession.files.map((file) => [
              file.id,
              UndoRedoManager.createUndoRedoState(file.content),
            ]),
          ),
        );
      } catch (error) {
        console.error('Erro ao restaurar sessão:', error);
      } finally {
        if (!cancelled) {
          setSessionHydrated(true);
        }
      }
    };

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sessionHydrated) return;

    const timeoutId = setTimeout(() => {
      AsyncStorage.setItem(
        EDITOR_SESSION_STORAGE_KEY,
        JSON.stringify(createEditorSessionSnapshot(state)),
      ).catch((error) => {
        console.error('Erro ao guardar sessão:', error);
      });
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [sessionHydrated, state]);

  const registerOpenedFile = useCallback((file: PythonFile) => {
    setHistoryByFileId((histories) =>
      histories[file.id]
        ? histories
        : {
            ...histories,
            [file.id]: UndoRedoManager.createUndoRedoState(file.content),
          },
    );

    if (file.path) {
      RecentFilesManager.addRecentFile(
        file.id,
        file.name,
        file.path,
        file.language,
        file.charCount,
      ).catch(console.error);
    }
  }, []);

  const openFile = useCallback(
    (file: PythonFile) => {
      dispatch({ type: 'OPEN_FILE', payload: file });
      registerOpenedFile(file);
    },
    [registerOpenedFile],
  );

  const closeFile = useCallback((fileId: string) => {
    dispatch({ type: 'CLOSE_FILE', payload: fileId });
  }, []);

  const updateFileContent = useCallback(
    (fileId: string, content: string) => {
      const targetFile = state.openFiles.find((file) => file.id === fileId);
      if (!targetFile || targetFile.content === content) return;

      setHistoryByFileId((histories) => {
        const previousHistory =
          histories[fileId] ?? UndoRedoManager.createUndoRedoState(targetFile.content);

        return {
          ...histories,
          [fileId]: UndoRedoManager.pushAction(previousHistory, {
            type: 'replace',
            content,
            previousContent: targetFile.content,
          }),
        };
      });

      dispatch({ type: 'UPDATE_CONTENT', payload: { fileId, content } });
    },
    [state.openFiles],
  );

  const createNewFile = useCallback(
    (name: string, language?: CodeLanguage): PythonFile =>
      createDraftFile(name, language),
    [],
  );

  const saveCurrentFile = useCallback(async () => {
    if (!state.currentFile) return;

    try {
      const uri = await FileSystemManager.saveFile(
        state.currentFile.name,
        state.currentFile.content,
        {
          fileUri: state.currentFile.uri ?? undefined,
        },
      );

      dispatch({
        type: 'MARK_SAVED',
        payload: {
          fileId: state.currentFile.id,
          uri,
          lastModified: Date.now(),
        },
      });
    } catch (error) {
      console.error('Erro ao salvar ficheiro:', error);
      throw error;
    }
  }, [state.currentFile]);

  useEffect(() => {
    if (!settings.autoSave || !state.currentFile?.isModified) return;

    const timeoutId = setTimeout(() => {
      saveCurrentFile().catch(console.error);
    }, settings.autoSaveInterval);

    return () => clearTimeout(timeoutId);
  }, [
    saveCurrentFile,
    settings.autoSave,
    settings.autoSaveInterval,
    state.currentFile?.id,
    state.currentFile?.isModified,
    state.currentFile?.content,
  ]);

  const openFileFromSystem = useCallback(
    async (filePath: string) => {
      try {
        const existingFile = state.openFiles.find((file) => file.path === filePath);
        if (existingFile) {
          openFile(existingFile);
          return;
        }

        const content = await FileSystemManager.openFile(filePath);
        openFile(createPersistedFile(filePath, content));
      } catch (error) {
        console.error('Erro ao abrir ficheiro:', error);
        throw error;
      }
    },
    [openFile, state.openFiles],
  );

  const openFileFromSystemAtRange = useCallback(
    async (filePath: string, start: number, end: number) => {
      try {
        const existingFile = state.openFiles.find((file) => file.path === filePath);
        const file = existingFile ?? createPersistedFile(
          filePath,
          await FileSystemManager.openFile(filePath),
        );
        const { line, column } = getLineAndColumnFromOffset(file.content, start);

        dispatch({ type: 'OPEN_FILE', payload: file });
        registerOpenedFile(file);
        dispatch({ type: 'SET_SELECTION', payload: { start, end } });
        dispatch({ type: 'SET_CURSOR', payload: { line, column } });
      } catch (error) {
        console.error('Erro ao abrir ficheiro na correspondência:', error);
        throw error;
      }
    },
    [registerOpenedFile, state.openFiles],
  );

  const applyWorkspaceReplacementPlan = useCallback(
    async (plan: WorkspaceReplacementPlanItem[]) => {
      const openFilesByPath = new Map(
        state.openFiles.flatMap((file) => (file.path ? [[file.path, file] as const] : [])),
      );

      let updatedOpenFiles = 0;
      const closedFileWrites: Promise<string>[] = [];

      plan.forEach((item) => {
        const openFileEntry = openFilesByPath.get(item.path);
        if (openFileEntry) {
          updateFileContent(openFileEntry.id, item.nextContent);
          updatedOpenFiles += 1;
          return;
        }

        closedFileWrites.push(
          FileSystemManager.writeFileContent(item.path, item.nextContent),
        );
      });

      await Promise.all(closedFileWrites);

      return {
        updatedOpenFiles,
        updatedClosedFiles: closedFileWrites.length,
      };
    },
    [state.openFiles, updateFileContent],
  );

  const renameWorkspacePath = useCallback(
    async (oldPath: string, newPath: string, isDirectory: boolean) => {
      dispatch({
        type: 'RENAME_PATH',
        payload: { oldPath, newPath, isDirectory },
      });
      await RecentFilesManager.renameRecentPaths(oldPath, newPath, isDirectory);
    },
    [],
  );

  const removeWorkspacePath = useCallback(
    async (path: string, isDirectory: boolean) => {
      dispatch({
        type: 'REMOVE_PATH',
        payload: { path, isDirectory },
      });
      await RecentFilesManager.removeRecentFilesByPath(path, isDirectory);
    },
    [],
  );

  const setCursorPosition = useCallback((line: number, column: number) => {
    dispatch({ type: 'SET_CURSOR', payload: { line, column } });
  }, []);

  const setSelection = useCallback((start: number, end: number) => {
    dispatch({ type: 'SET_SELECTION', payload: { start, end } });
  }, []);

  const selectRange = useCallback(
    (start: number, end: number) => {
      dispatch({ type: 'SET_SELECTION', payload: { start, end } });

      const { line, column } = getLineAndColumnFromOffset(
        state.currentFile?.content ?? '',
        start,
      );
      dispatch({ type: 'SET_CURSOR', payload: { line, column } });
    },
    [state.currentFile?.content],
  );

  const replaceCurrentSelection = useCallback(
    (replacement: string) => {
      if (!state.currentFile) return;

      const { content, caret } = replaceSelection(
        state.currentFile.content,
        state.selectionStart,
        state.selectionEnd,
        replacement,
      );

      updateFileContent(state.currentFile.id, content);
      setSelection(caret, caret);
    },
    [
      setSelection,
      state.currentFile,
      state.selectionEnd,
      state.selectionStart,
      updateFileContent,
    ],
  );

  const updateSettings = useCallback(
    (newSettings: Partial<AppSettings>) => {
      setSettingsState((previousSettings) => ({ ...previousSettings, ...newSettings }));

      if (newSettings.theme) {
        setColorScheme(newSettings.theme);
      }
    },
    [setColorScheme],
  );

  const setCurrentLanguage = useCallback(
    (language: CodeLanguage) => {
      if (!state.currentFile) return;
      dispatch({ type: 'SET_LANGUAGE', payload: { fileId: state.currentFile.id, language } });
    },
    [state.currentFile],
  );

  const undo = useCallback(() => {
    if (!state.currentFile) return;

    const result = UndoRedoManager.undo(undoRedoState);
    if (result.content === null) return;

    setHistoryByFileId((histories) => ({
      ...histories,
      [state.currentFile!.id]: result.state,
    }));
    dispatch({
      type: 'UPDATE_CONTENT',
      payload: { fileId: state.currentFile.id, content: result.content },
    });
  }, [state.currentFile, undoRedoState]);

  const redo = useCallback(() => {
    if (!state.currentFile) return;

    const result = UndoRedoManager.redo(undoRedoState);
    if (result.content === null) return;

    setHistoryByFileId((histories) => ({
      ...histories,
      [state.currentFile!.id]: result.state,
    }));
    dispatch({
      type: 'UPDATE_CONTENT',
      payload: { fileId: state.currentFile.id, content: result.content },
    });
  }, [state.currentFile, undoRedoState]);

  const copy = useCallback(async () => {
    if (!state.currentFile) return;

    const selectedText = state.currentFile.content.substring(
      state.selectionStart,
      state.selectionEnd,
    );

    if (selectedText) {
      await ClipboardManager.copyToClipboard(selectedText, currentLanguage);
    }
  }, [currentLanguage, state.currentFile, state.selectionEnd, state.selectionStart]);

  const cut = useCallback(async () => {
    if (!state.currentFile) return;

    const selectedText = state.currentFile.content.substring(
      state.selectionStart,
      state.selectionEnd,
    );

    if (!selectedText) return;

    await ClipboardManager.cutToClipboard(selectedText, currentLanguage);
    replaceCurrentSelection('');
  }, [
    currentLanguage,
    replaceCurrentSelection,
    state.currentFile,
    state.selectionEnd,
    state.selectionStart,
  ]);

  const paste = useCallback(async () => {
    const clipboardText = await ClipboardManager.pasteFromClipboard();
    if (clipboardText) {
      replaceCurrentSelection(clipboardText);
    }
  }, [replaceCurrentSelection]);

  const toggleBookmark = useCallback(
    async (line: number) => {
      if (!state.currentFile) return;

      const snippet = state.currentFile.content.split('\n')[line] || '';
      await BookmarksManager.toggleBookmark(
        state.currentFile.id,
        state.currentFile.name,
        line,
        snippet,
      );
    },
    [state.currentFile],
  );

  const nextBookmark = useCallback(async () => {
    if (!state.currentFile) return;

    const bookmark = await BookmarksManager.getNextBookmark(
      state.currentFile.id,
      state.cursorLine,
    );

    if (bookmark) {
      const offset = getOffsetFromLineAndColumn(state.currentFile.content, bookmark.line, 0);
      selectRange(offset, offset);
    }
  }, [selectRange, state.currentFile, state.cursorLine]);

  const previousBookmark = useCallback(async () => {
    if (!state.currentFile) return;

    const bookmark = await BookmarksManager.getPreviousBookmark(
      state.currentFile.id,
      state.cursorLine,
    );

    if (bookmark) {
      const offset = getOffsetFromLineAndColumn(state.currentFile.content, bookmark.line, 0);
      selectRange(offset, offset);
    }
  }, [selectRange, state.currentFile, state.cursorLine]);

  const autoIndentCurrentLine = useCallback(() => {
    if (!state.currentFile) return;

    const lines = state.currentFile.content.split('\n');
    const currentLine = lines[state.cursorLine] || '';
    const previousLine = state.cursorLine > 0 ? lines[state.cursorLine - 1] : '';
    const indentConfig: AutoIndent.IndentConfig = {
      useTabs: !settings.useSpaces,
      tabSize: settings.indentSize,
      autoIndent: true,
    };

    lines[state.cursorLine] = AutoIndent.autoIndentLine(
      currentLine,
      previousLine,
      currentLanguage,
      indentConfig,
    );
    updateFileContent(state.currentFile.id, lines.join('\n'));
  }, [currentLanguage, settings.indentSize, settings.useSpaces, state, updateFileContent]);

  const indentSelection = useCallback(() => {
    if (!state.currentFile) return;

    const selectedText = state.currentFile.content.substring(
      state.selectionStart,
      state.selectionEnd,
    );
    const indentConfig: AutoIndent.IndentConfig = {
      useTabs: !settings.useSpaces,
      tabSize: settings.indentSize,
      autoIndent: true,
    };

    replaceCurrentSelection(AutoIndent.increaseIndent(selectedText, 1, indentConfig));
  }, [
    replaceCurrentSelection,
    settings.indentSize,
    settings.useSpaces,
    state.currentFile,
    state.selectionEnd,
    state.selectionStart,
  ]);

  const dedentSelection = useCallback(() => {
    if (!state.currentFile) return;

    const selectedText = state.currentFile.content.substring(
      state.selectionStart,
      state.selectionEnd,
    );
    const indentConfig: AutoIndent.IndentConfig = {
      useTabs: !settings.useSpaces,
      tabSize: settings.indentSize,
      autoIndent: true,
    };

    replaceCurrentSelection(AutoIndent.decreaseIndent(selectedText, 1, indentConfig));
  }, [
    replaceCurrentSelection,
    settings.indentSize,
    settings.useSpaces,
    state.currentFile,
    state.selectionEnd,
    state.selectionStart,
  ]);

  const getRecentFiles = useCallback(async () => RecentFilesManager.getRecentFiles(), []);

  const setWorkspaceRootUri = useCallback((uri: string) => {
    FileSystemManager.setProjectsDirectoryUri(uri);
    setWorkspaceRootUriState(uri);
  }, []);

  const value = useMemo<EditorContextType>(
    () => ({
      state,
      settings,
      undoRedoState,
      currentLanguage,
      setCurrentLanguage,
      openFile,
      closeFile,
      updateFileContent,
      createNewFile,
      saveCurrentFile,
      openFileFromSystem,
      openFileFromSystemAtRange,
      applyWorkspaceReplacementPlan,
      renameWorkspacePath,
      removeWorkspacePath,
      setCursorPosition,
      setSelection,
      selectRange,
      replaceCurrentSelection,
      updateSettings,
      undo,
      redo,
      canUndo: UndoRedoManager.canUndo(undoRedoState),
      canRedo: UndoRedoManager.canRedo(undoRedoState),
      copy,
      cut,
      paste,
      toggleBookmark,
      nextBookmark,
      previousBookmark,
      autoIndentCurrentLine,
      indentSelection,
      dedentSelection,
      getRecentFiles,
      workspaceRootUri,
      setWorkspaceRootUri,
    }),
    [
      autoIndentCurrentLine,
      closeFile,
      copy,
      createNewFile,
      currentLanguage,
      dedentSelection,
      getRecentFiles,
      indentSelection,
      nextBookmark,
      openFile,
      openFileFromSystem,
      openFileFromSystemAtRange,
      applyWorkspaceReplacementPlan,
      paste,
      previousBookmark,
      removeWorkspacePath,
      renameWorkspacePath,
      redo,
      replaceCurrentSelection,
      saveCurrentFile,
      selectRange,
      settings,
      setCurrentLanguage,
      setCursorPosition,
      setSelection,
      setWorkspaceRootUri,
      state,
      toggleBookmark,
      undo,
      undoRedoState,
      updateFileContent,
      updateSettings,
      cut,
      workspaceRootUri,
    ],
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor deve ser usado dentro de EditorProvider');
  }
  return context;
}
