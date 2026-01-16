import React, { createContext, useContext, useReducer, useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PythonFile, EditorState, AppSettings, UndoRedoStack } from './types';
import { CodeLanguage, detectLanguageFromExtension } from './types-extended';
import * as UndoRedoManager from './undo-redo-manager';
import * as ClipboardManager from './clipboard-manager';
import * as FileSystemManager from './file-system-manager';
import * as BookmarksManager from './bookmarks-manager';
import * as RecentFilesManager from './recent-files-manager';
import * as AutoIndent from './auto-indent';

interface EditorContextType {
  state: EditorState;
  settings: AppSettings;
  undoRedoState: UndoRedoManager.UndoRedoState;
  currentLanguage: CodeLanguage;
  setCurrentLanguage: (language: CodeLanguage) => void;
  // File operations
  openFile: (file: PythonFile) => void;
  closeFile: (fileId: string) => void;
  updateFileContent: (fileId: string, content: string) => void;
  createNewFile: (name: string, language?: CodeLanguage) => PythonFile;
  saveCurrentFile: () => Promise<void>;
  openFileFromSystem: (filePath: string) => Promise<void>;
  // Cursor and selection
  setCursorPosition: (line: number, column: number) => void;
  setSelection: (start: number, end: number) => void;
  // Settings
  updateSettings: (settings: Partial<AppSettings>) => void;
  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  // Clipboard
  copy: () => Promise<void>;
  cut: () => Promise<void>;
  paste: () => Promise<void>;
  // Bookmarks
  toggleBookmark: (line: number) => Promise<void>;
  nextBookmark: () => Promise<void>;
  previousBookmark: () => Promise<void>;
  // Auto-indent
  autoIndentCurrentLine: () => void;
  indentSelection: () => void;
  dedentSelection: () => void;
  // Recent files
  getRecentFiles: () => Promise<RecentFilesManager.RecentFile[]>;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

type EditorAction =
  | { type: 'OPEN_FILE'; payload: PythonFile }
  | { type: 'CLOSE_FILE'; payload: string }
  | { type: 'UPDATE_CONTENT'; payload: { fileId: string; content: string } }
  | { type: 'SET_CURSOR'; payload: { line: number; column: number } }
  | { type: 'SET_SELECTION'; payload: { start: number; end: number } }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'LOAD_SETTINGS'; payload: AppSettings };

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
};

const initialEditorState: EditorState = {
  currentFile: null,
  openFiles: [],
  cursorLine: 0,
  cursorColumn: 0,
  selectionStart: 0,
  selectionEnd: 0,
};

const initialUndoRedo: UndoRedoStack = {
  undo: [],
  redo: [],
};

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'OPEN_FILE': {
      const fileExists = state.openFiles.find(f => f.id === action.payload.id);
      return {
        ...state,
        currentFile: action.payload,
        openFiles: fileExists ? state.openFiles : [...state.openFiles, action.payload],
        cursorLine: 0,
        cursorColumn: 0,
      };
    }
    case 'CLOSE_FILE': {
      const remaining = state.openFiles.filter(f => f.id !== action.payload);
      return {
        ...state,
        currentFile: remaining.length > 0 ? remaining[0] : null,
        openFiles: remaining,
      };
    }
    case 'UPDATE_CONTENT': {
      return {
        ...state,
        currentFile: state.currentFile?.id === action.payload.fileId
          ? { ...state.currentFile, content: action.payload.content, isModified: true }
          : state.currentFile,
        openFiles: state.openFiles.map(f =>
          f.id === action.payload.fileId
            ? { ...f, content: action.payload.content, isModified: true }
            : f
        ),
      };
    }
    case 'SET_CURSOR':
      return {
        ...state,
        cursorLine: action.payload.line,
        cursorColumn: action.payload.column,
      };
    case 'SET_SELECTION':
      return {
        ...state,
        selectionStart: action.payload.start,
        selectionEnd: action.payload.end,
      };
    default:
      return state;
  }
}

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(editorReducer, initialEditorState);
  const [settings, setSettingsState] = useState<AppSettings>(defaultSettings);
  const [undoRedoState, setUndoRedoState] = useState<UndoRedoManager.UndoRedoState>(
    UndoRedoManager.createUndoRedoState()
  );
  const [currentLanguage, setCurrentLanguage] = useState<CodeLanguage>('python');

  // Inicializar sistema de ficheiros
  useEffect(() => {
    FileSystemManager.initFileSystem().catch(console.error);
  }, []);

  // Carregar definições do AsyncStorage ao iniciar
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem('editor-settings');
        if (stored) {
          setSettingsState(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Erro ao carregar definições:', error);
      }
    };
    loadSettings();
  }, []);

  // Guardar definições quando mudam
  useEffect(() => {
    const saveSettings = async () => {
      try {
        await AsyncStorage.setItem('editor-settings', JSON.stringify(settings));
      } catch (error) {
        console.error('Erro ao guardar definições:', error);
      }
    };
    saveSettings();
  }, [settings]);

  // File operations
  const openFile = useCallback((file: PythonFile) => {
    dispatch({ type: 'OPEN_FILE', payload: file });
    // Adicionar aos ficheiros recentes
    RecentFilesManager.addRecentFile(
      file.id,
      file.name,
      file.path,
      detectLanguageFromExtension(file.name)
    ).catch(console.error);
  }, []);

  const closeFile = useCallback((fileId: string) => {
    dispatch({ type: 'CLOSE_FILE', payload: fileId });
  }, []);

  const updateFileContent = useCallback((fileId: string, content: string) => {
    if (!state.currentFile) return;

    // Adicionar ao histórico de undo/redo
    const newState = UndoRedoManager.pushAction(undoRedoState, {
      type: 'replace',
      content,
      previousContent: state.currentFile.content,
    });
    setUndoRedoState(newState);

    dispatch({ type: 'UPDATE_CONTENT', payload: { fileId, content } });
  }, [state.currentFile, undoRedoState]);

  const createNewFile = useCallback((name: string, language?: CodeLanguage): PythonFile => {
    const id = `file-${Date.now()}`;
    const detectedLanguage = language || detectLanguageFromExtension(name);
    return {
      id,
      name,
      path: `/${name}`,
      content: '',
      lastModified: Date.now(),
      isModified: false,
      encoding: 'utf-8',
      lineCount: 1,
      charCount: 0,
    };
  }, []);

  const saveCurrentFile = useCallback(async () => {
    if (!state.currentFile) return;

    try {
      await FileSystemManager.saveFile(
        state.currentFile.name,
        state.currentFile.content
      );

      // Atualizar estado para não modificado
      dispatch({
        type: 'UPDATE_CONTENT',
        payload: {
          fileId: state.currentFile.id,
          content: state.currentFile.content,
        },
      });
    } catch (error) {
      console.error('Erro ao salvar ficheiro:', error);
      throw error;
    }
  }, [state.currentFile]);

  const openFileFromSystem = useCallback(async (filePath: string) => {
    try {
      const content = await FileSystemManager.openFile(filePath);
      const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
      const file: PythonFile = {
        id: `file-${Date.now()}`,
        name: fileName,
        path: filePath,
        content,
        lastModified: Date.now(),
        isModified: false,
        encoding: 'utf-8',
        lineCount: content.split('\n').length,
        charCount: content.length,
      };
      openFile(file);
    } catch (error) {
      console.error('Erro ao abrir ficheiro:', error);
      throw error;
    }
  }, [openFile]);

  // Cursor and selection
  const setCursorPosition = useCallback((line: number, column: number) => {
    dispatch({ type: 'SET_CURSOR', payload: { line, column } });
  }, []);

  const setSelection = useCallback((start: number, end: number) => {
    dispatch({ type: 'SET_SELECTION', payload: { start, end } });
  }, []);

  // Settings
  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettingsState(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Undo/Redo
  const undo = useCallback(() => {
    const result = UndoRedoManager.undo(undoRedoState);
    if (result.content !== null && state.currentFile) {
      setUndoRedoState(result.state);
      dispatch({
        type: 'UPDATE_CONTENT',
        payload: { fileId: state.currentFile.id, content: result.content },
      });
    }
  }, [undoRedoState, state.currentFile]);

  const redo = useCallback(() => {
    const result = UndoRedoManager.redo(undoRedoState);
    if (result.content !== null && state.currentFile) {
      setUndoRedoState(result.state);
      dispatch({
        type: 'UPDATE_CONTENT',
        payload: { fileId: state.currentFile.id, content: result.content },
      });
    }
  }, [undoRedoState, state.currentFile]);

  // Clipboard
  const copy = useCallback(async () => {
    if (!state.currentFile) return;

    const { selectionStart, selectionEnd } = state;
    const selectedText = state.currentFile.content.substring(selectionStart, selectionEnd);

    if (selectedText) {
      await ClipboardManager.copyToClipboard(selectedText, currentLanguage);
    }
  }, [state, currentLanguage]);

  const cut = useCallback(async () => {
    if (!state.currentFile) return;

    const { selectionStart, selectionEnd } = state;
    const selectedText = state.currentFile.content.substring(selectionStart, selectionEnd);

    if (selectedText) {
      await ClipboardManager.cutToClipboard(selectedText, currentLanguage);

      // Remover texto selecionado
      const newContent =
        state.currentFile.content.substring(0, selectionStart) +
        state.currentFile.content.substring(selectionEnd);

      updateFileContent(state.currentFile.id, newContent);
    }
  }, [state, currentLanguage, updateFileContent]);

  const paste = useCallback(async () => {
    if (!state.currentFile) return;

    const clipboardText = await ClipboardManager.pasteFromClipboard();

    if (clipboardText) {
      const { selectionStart, selectionEnd } = state;
      const newContent =
        state.currentFile.content.substring(0, selectionStart) +
        clipboardText +
        state.currentFile.content.substring(selectionEnd);

      updateFileContent(state.currentFile.id, newContent);
    }
  }, [state, updateFileContent]);

  // Bookmarks
  const toggleBookmark = useCallback(async (line: number) => {
    if (!state.currentFile) return;

    const lines = state.currentFile.content.split('\n');
    const snippet = lines[line] || '';

    await BookmarksManager.toggleBookmark(
      state.currentFile.id,
      state.currentFile.name,
      line,
      snippet
    );
  }, [state.currentFile]);

  const nextBookmark = useCallback(async () => {
    if (!state.currentFile) return;

    const bookmark = await BookmarksManager.getNextBookmark(
      state.currentFile.id,
      state.cursorLine
    );

    if (bookmark) {
      setCursorPosition(bookmark.line, 0);
    }
  }, [state.currentFile, state.cursorLine, setCursorPosition]);

  const previousBookmark = useCallback(async () => {
    if (!state.currentFile) return;

    const bookmark = await BookmarksManager.getPreviousBookmark(
      state.currentFile.id,
      state.cursorLine
    );

    if (bookmark) {
      setCursorPosition(bookmark.line, 0);
    }
  }, [state.currentFile, state.cursorLine, setCursorPosition]);

  // Auto-indent
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

    const indentedLine = AutoIndent.autoIndentLine(
      currentLine,
      previousLine,
      currentLanguage,
      indentConfig
    );

    lines[state.cursorLine] = indentedLine;
    updateFileContent(state.currentFile.id, lines.join('\n'));
  }, [state, settings, currentLanguage, updateFileContent]);

  const indentSelection = useCallback(() => {
    if (!state.currentFile) return;

    const { selectionStart, selectionEnd } = state;
    const selectedText = state.currentFile.content.substring(selectionStart, selectionEnd);

    const indentConfig: AutoIndent.IndentConfig = {
      useTabs: !settings.useSpaces,
      tabSize: settings.indentSize,
      autoIndent: true,
    };

    const indented = AutoIndent.increaseIndent(selectedText, 1, indentConfig);

    const newContent =
      state.currentFile.content.substring(0, selectionStart) +
      indented +
      state.currentFile.content.substring(selectionEnd);

    updateFileContent(state.currentFile.id, newContent);
  }, [state, settings, updateFileContent]);

  const dedentSelection = useCallback(() => {
    if (!state.currentFile) return;

    const { selectionStart, selectionEnd } = state;
    const selectedText = state.currentFile.content.substring(selectionStart, selectionEnd);

    const indentConfig: AutoIndent.IndentConfig = {
      useTabs: !settings.useSpaces,
      tabSize: settings.indentSize,
      autoIndent: true,
    };

    const dedented = AutoIndent.decreaseIndent(selectedText, 1, indentConfig);

    const newContent =
      state.currentFile.content.substring(0, selectionStart) +
      dedented +
      state.currentFile.content.substring(selectionEnd);

    updateFileContent(state.currentFile.id, newContent);
  }, [state, settings, updateFileContent]);

  // Recent files
  const getRecentFiles = useCallback(async () => {
    return await RecentFilesManager.getRecentFiles();
  }, []);

  const value: EditorContextType = {
    state,
    settings,
    undoRedoState,
    currentLanguage,
    setCurrentLanguage,
    // File operations
    openFile,
    closeFile,
    updateFileContent,
    createNewFile,
    saveCurrentFile,
    openFileFromSystem,
    // Cursor and selection
    setCursorPosition,
    setSelection,
    // Settings
    updateSettings,
    // Undo/Redo
    undo,
    redo,
    canUndo: UndoRedoManager.canUndo(undoRedoState),
    canRedo: UndoRedoManager.canRedo(undoRedoState),
    // Clipboard
    copy,
    cut,
    paste,
    // Bookmarks
    toggleBookmark,
    nextBookmark,
    previousBookmark,
    // Auto-indent
    autoIndentCurrentLine,
    indentSelection,
    dedentSelection,
    // Recent files
    getRecentFiles,
  };

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor deve ser usado dentro de EditorProvider');
  }
  return context;
}
