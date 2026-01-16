import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  KEYBOARD_SHORTCUTS,
  ShortcutAction,
  matchesShortcut,
  getShortcutByAction,
} from '@/lib/keyboard-shortcuts';

interface ShortcutHandlers {
  onSave?: () => void;
  onFormat?: () => void;
  onOpen?: () => void;
  onNew?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSearch?: () => void;
  onReplace?: () => void;
  onComment?: () => void;
  onExecute?: () => void;
  onPreview?: () => void;
  onSettings?: () => void;
  onClose?: () => void;
}

/**
 * Hook para gerenciar atalhos de teclado
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const pressedKeysRef = useRef<Set<string>>(new Set());

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Apenas em web
      if (Platform.OS !== 'web') {
        return;
      }

      const key = event.key.toLowerCase();
      const isModifier =
        key === 'control' ||
        key === 'shift' ||
        key === 'alt' ||
        key === 'meta';

      // Adicionar tecla ao conjunto
      if (event.ctrlKey) pressedKeysRef.current.add('ctrl');
      if (event.shiftKey) pressedKeysRef.current.add('shift');
      if (event.altKey) pressedKeysRef.current.add('alt');
      if (event.metaKey) pressedKeysRef.current.add('meta');

      if (!isModifier) {
        pressedKeysRef.current.add(key);
      }

      // Verificar atalhos
      for (const shortcut of KEYBOARD_SHORTCUTS) {
        if (matchesShortcut(pressedKeysRef.current, shortcut)) {
          event.preventDefault();

      // Executar handler correspondente
      const actionName = `on${shortcut.action.charAt(0).toUpperCase() + shortcut.action.slice(1)}`;
      const handler = (handlers as Record<string, any>)[actionName] as (() => void) | undefined;

          if (handler) {
            handler();
          }

          pressedKeysRef.current.clear();
          break;
        }
      }
    },
    [handlers]
  );

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    // Apenas em web
    if (Platform.OS !== 'web') {
      return;
    }

    const key = event.key.toLowerCase();

    // Remover tecla do conjunto
    if (key === 'control' || key === 'meta') {
      pressedKeysRef.current.delete('ctrl');
      pressedKeysRef.current.delete('meta');
    } else if (key === 'shift') {
      pressedKeysRef.current.delete('shift');
    } else if (key === 'alt') {
      pressedKeysRef.current.delete('alt');
    } else {
      pressedKeysRef.current.delete(key);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      };
    }
  }, [handleKeyDown, handleKeyUp]);

  /**
   * Obtém o atalho para uma ação
   */
  const getShortcut = useCallback((action: ShortcutAction) => {
    return getShortcutByAction(action);
  }, []);

  /**
   * Verifica se um atalho está ativo
   */
  const isShortcutPressed = useCallback((action: ShortcutAction): boolean => {
    const shortcut = getShortcutByAction(action);
    if (!shortcut) return false;
    return matchesShortcut(pressedKeysRef.current, shortcut);
  }, []);

  return {
    getShortcut,
    isShortcutPressed,
    pressedKeys: pressedKeysRef.current,
  };
}
