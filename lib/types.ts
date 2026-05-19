/**
 * Tipos e interfaces compartilhadas da aplicação Python Notepad++
 */

import type { CodeLanguage } from './types-extended';

export type LocalAIProvider = 'ollama' | 'hermes' | 'openai-compatible';

export interface PythonFile {
  id: string;
  name: string;
  path: string | null;
  uri: string | null;
  language: CodeLanguage;
  content: string;
  savedContent: string;
  lastModified: number;
  isModified: boolean;
  isDraft: boolean;
  encoding: string;
  lineCount: number;
  charCount: number;
}

export interface EditorState {
  currentFile: PythonFile | null;
  openFiles: PythonFile[];
  cursorLine: number;
  cursorColumn: number;
  selectionStart: number;
  selectionEnd: number;
  viewStateByFileId: Record<string, EditorViewState>;
}

export interface EditorViewState {
  cursorLine: number;
  cursorColumn: number;
  selectionStart: number;
  selectionEnd: number;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  fontSize: number;
  fontFamily: string;
  indentSize: number;
  useSpaces: boolean;
  wordWrap: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
  showLineNumbers: boolean;
  showWhitespace: boolean;
  localAiEnabled: boolean;
  localAiProvider: LocalAIProvider;
  localAiBaseUrl: string;
  localAiModel: string;
  localAiApiKey: string;
}

export interface PythonSymbol {
  name: string;
  type: 'function' | 'class' | 'variable' | 'import';
  line: number;
  column: number;
  description?: string;
}

export interface SyntaxError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface FileSystemItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  isHidden: boolean;
  size?: number;
  lastModified?: number;
  children?: FileSystemItem[];
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
}

export interface EditorAction {
  type: 'insert' | 'delete' | 'replace';
  line: number;
  column: number;
  content: string;
  timestamp: number;
}

export interface UndoRedoStack {
  undo: EditorAction[];
  redo: EditorAction[];
}

export interface FileSearchResult {
  file: PythonFile;
  matches: Array<{
    line: number;
    column: number;
    text: string;
  }>;
}

export interface CodeCompletion {
  label: string;
  kind: 'function' | 'class' | 'variable' | 'keyword' | 'module';
  detail?: string;
  documentation?: string;
  insertText: string;
}

export interface BreakPoint {
  id: string;
  fileId: string;
  line: number;
  enabled: boolean;
}

export interface DebugSession {
  isActive: boolean;
  currentLine?: number;
  variables?: Record<string, string>;
  callStack?: string[];
}
