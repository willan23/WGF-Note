import type { FileInfo } from './file-system-manager';

export interface DesktopBridge {
  isDesktop: true;
  projectsDirectoryUri: string;
  pickFiles: () => Promise<FileInfo[]>;
  pickDirectory: () => Promise<string | null>;
  readFile: (uri: string) => Promise<string>;
  writeFile: (uri: string, content: string) => Promise<string>;
  listDirectory: (uri: string) => Promise<FileInfo[]>;
  createDirectory: (parentUri: string, name: string) => Promise<string>;
  deletePath: (uri: string, isDirectory: boolean) => Promise<void>;
  renamePath: (uri: string, newName: string, isDirectory: boolean) => Promise<string>;
  copyFile: (sourceUri: string, destName: string) => Promise<string>;
  movePath: (sourceUri: string, destinationUri: string) => Promise<void>;
  exists: (uri: string) => Promise<boolean>;
  statPath: (uri: string) => Promise<FileInfo | null>;
  openNewWindow: () => Promise<void>;
  listOllamaModels: (baseUrl: string) => Promise<{ models?: Array<{ name: string; model: string }> }>;
  ollamaChat: (baseUrl: string, body: unknown) => Promise<unknown>;
  listOpenAICompatibleModels: (baseUrl: string, apiKey?: string) => Promise<unknown>;
  openAICompatibleChat: (
    baseUrl: string,
    apiKey: string | undefined,
    body: unknown,
    sessionId?: string,
  ) => Promise<unknown>;
  hermesHealth: (baseUrl: string, apiKey?: string) => Promise<unknown>;
  startHermesGateway: (baseUrl: string, apiKey?: string, model?: string) => Promise<unknown>;
}

declare global {
  interface Window {
    __NOTE_PY_DESKTOP__?: DesktopBridge;
    __NOTE_PY_API_BASE_URL__?: string;
  }
}

export function getDesktopBridge(): DesktopBridge | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.__NOTE_PY_DESKTOP__ ?? null;
}

export function isDesktopRuntime(): boolean {
  return Boolean(getDesktopBridge()?.isDesktop);
}
