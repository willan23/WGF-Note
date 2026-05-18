/**
 * Sistema de atalhos de teclado para o editor
 */

import { Platform } from 'react-native';

export type ShortcutAction =
  | 'save'
  | 'format'
  | 'open'
  | 'new'
  | 'undo'
  | 'redo'
  | 'search'
  | 'replace'
  | 'comment'
  | 'execute'
  | 'preview'
  | 'projectSearch'
  | 'commandPalette'
  | 'terminal'
  | 'settings'
  | 'close';

export interface Shortcut {
  action: ShortcutAction;
  keys: string[];
  description: string;
  platform?: 'ios' | 'android' | 'web' | 'all';
}

/**
 * Mapa de atalhos de teclado
 */
export const KEYBOARD_SHORTCUTS: Shortcut[] = [
  {
    action: 'save',
    keys: ['ctrl', 's'],
    description: 'Guardar ficheiro',
    platform: 'all',
  },
  {
    action: 'format',
    keys: ['alt', 'shift', 'f'],
    description: 'Formatar código',
    platform: 'all',
  },
  {
    action: 'open',
    keys: ['ctrl', 'p'],
    description: 'Abrir ficheiro',
    platform: 'all',
  },
  {
    action: 'new',
    keys: ['ctrl', 'n'],
    description: 'Novo ficheiro',
    platform: 'all',
  },
  {
    action: 'undo',
    keys: ['ctrl', 'z'],
    description: 'Desfazer',
    platform: 'all',
  },
  {
    action: 'redo',
    keys: ['ctrl', 'shift', 'z'],
    description: 'Refazer',
    platform: 'all',
  },
  {
    action: 'search',
    keys: ['ctrl', 'f'],
    description: 'Pesquisar',
    platform: 'all',
  },
  {
    action: 'replace',
    keys: ['ctrl', 'h'],
    description: 'Pesquisar e substituir',
    platform: 'all',
  },
  {
    action: 'comment',
    keys: ['ctrl', '/'],
    description: 'Comentar/Descomentar',
    platform: 'all',
  },
  {
    action: 'execute',
    keys: ['ctrl', 'enter'],
    description: 'Executar código',
    platform: 'all',
  },
  {
    action: 'preview',
    keys: ['ctrl', 'alt', 'p'],
    description: 'Pré-visualização',
    platform: 'all',
  },
  {
    action: 'projectSearch',
    keys: ['ctrl', 'shift', 'f'],
    description: 'Pesquisar no projeto',
    platform: 'all',
  },
  {
    action: 'commandPalette',
    keys: ['ctrl', 'shift', 'p'],
    description: 'Abrir comandos',
    platform: 'all',
  },
  {
    action: 'terminal',
    keys: ['ctrl', 'j'],
    description: 'Alternar terminal',
    platform: 'all',
  },
  {
    action: 'settings',
    keys: ['ctrl', ','],
    description: 'Definições',
    platform: 'all',
  },
];

/**
 * Obtém atalhos para a plataforma atual
 */
export function getShortcutsForPlatform(): Shortcut[] {
  const platform = Platform.OS as 'ios' | 'android' | 'web';
  return KEYBOARD_SHORTCUTS.filter(
    s => s.platform === 'all' || s.platform === platform
  );
}

/**
 * Obtém atalho por ação
 */
export function getShortcutByAction(action: ShortcutAction): Shortcut | undefined {
  return KEYBOARD_SHORTCUTS.find(s => s.action === action);
}

/**
 * Formata atalho para exibição
 */
export function formatShortcutDisplay(keys: string[]): string {
  const platform = Platform.OS;
  const isMac = platform === 'ios'; // Simplificado

  return keys
    .map(key => {
      switch (key.toLowerCase()) {
        case 'ctrl':
          return isMac ? '⌘' : 'Ctrl';
        case 'shift':
          return isMac ? '⇧' : 'Shift';
        case 'alt':
          return isMac ? '⌥' : 'Alt';
        case 'enter':
          return 'Enter';
        default:
          return key.toUpperCase();
      }
    })
    .join(isMac ? '' : '+');
}

/**
 * Detecta se uma sequência de teclas corresponde a um atalho
 */
export function matchesShortcut(
  pressedKeys: Set<string>,
  shortcut: Shortcut
): boolean {
  const shortcutKeys = new Set(shortcut.keys.map(k => k.toLowerCase()));

  // Verificar se todas as teclas do atalho foram pressionadas
  if (shortcutKeys.size !== pressedKeys.size) {
    return false;
  }

  for (const key of shortcutKeys) {
    if (!pressedKeys.has(key.toLowerCase())) {
      return false;
    }
  }

  return true;
}

/**
 * Obtém descrição de todos os atalhos
 */
export function getShortcutHelp(): string {
  const shortcuts = getShortcutsForPlatform();
  return shortcuts
    .map(s => `${formatShortcutDisplay(s.keys)}: ${s.description}`)
    .join('\n');
}

/**
 * Valida se um atalho é válido
 */
export function isValidShortcut(keys: string[]): boolean {
  if (keys.length === 0 || keys.length > 4) {
    return false;
  }

  const validKeys = [
    'ctrl',
    'shift',
    'alt',
    'meta',
    'enter',
    'escape',
    'tab',
    'backspace',
    'delete',
    'home',
    'end',
    'pageup',
    'pagedown',
    'arrowup',
    'arrowdown',
    'arrowleft',
    'arrowright',
    '/',
    ',',
    ...Array.from('abcdefghijklmnopqrstuvwxyz0123456789'),
  ];

  return keys.every(k => validKeys.includes(k.toLowerCase()));
}

/**
 * Cria um atalho personalizado
 */
export function createCustomShortcut(
  action: ShortcutAction,
  keys: string[],
  description: string
): Shortcut | null {
  if (!isValidShortcut(keys)) {
    return null;
  }

  return {
    action,
    keys: keys.map(k => k.toLowerCase()),
    description,
    platform: 'all',
  };
}

/**
 * Converte atalho para string para armazenamento
 */
export function serializeShortcut(shortcut: Shortcut): string {
  return JSON.stringify({
    action: shortcut.action,
    keys: shortcut.keys,
  });
}

/**
 * Reconstrói atalho a partir de string
 */
export function deserializeShortcut(data: string): Shortcut | null {
  try {
    const parsed = JSON.parse(data);
    const existing = KEYBOARD_SHORTCUTS.find(s => s.action === parsed.action);

    if (!existing) {
      return null;
    }

    return {
      ...existing,
      keys: parsed.keys,
    };
  } catch {
    return null;
  }
}
