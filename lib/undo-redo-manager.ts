/**
 * Sistema de Undo/Redo para o editor
 * Gerencia histórico de alterações com limite de 100 ações
 */

export interface EditorAction {
    type: 'insert' | 'delete' | 'replace';
    content: string;
    previousContent: string;
    timestamp: number;
    cursorPosition?: number;
}

export interface UndoRedoState {
    undoStack: EditorAction[];
    redoStack: EditorAction[];
    currentContent: string;
}

const MAX_HISTORY_SIZE = 100;

/**
 * Cria um novo estado de undo/redo
 */
export function createUndoRedoState(initialContent: string = ''): UndoRedoState {
    return {
        undoStack: [],
        redoStack: [],
        currentContent: initialContent,
    };
}

/**
 * Adiciona uma ação ao histórico
 */
export function pushAction(
    state: UndoRedoState,
    action: Omit<EditorAction, 'timestamp'>
): UndoRedoState {
    const newAction: EditorAction = {
        ...action,
        timestamp: Date.now(),
    };

    const newUndoStack = [...state.undoStack, newAction];

    // Limitar tamanho do histórico
    if (newUndoStack.length > MAX_HISTORY_SIZE) {
        newUndoStack.shift();
    }

    return {
        ...state,
        undoStack: newUndoStack,
        redoStack: [], // Limpar redo stack quando nova ação é adicionada
        currentContent: action.content,
    };
}

/**
 * Desfaz a última ação
 */
export function undo(state: UndoRedoState): {
    state: UndoRedoState;
    content: string | null;
} {
    if (state.undoStack.length === 0) {
        return { state, content: null };
    }

    const lastAction = state.undoStack[state.undoStack.length - 1];
    const newUndoStack = state.undoStack.slice(0, -1);
    const newRedoStack = [...state.redoStack, lastAction];

    const newState: UndoRedoState = {
        undoStack: newUndoStack,
        redoStack: newRedoStack,
        currentContent: lastAction.previousContent,
    };

    return {
        state: newState,
        content: lastAction.previousContent,
    };
}

/**
 * Refaz a última ação desfeita
 */
export function redo(state: UndoRedoState): {
    state: UndoRedoState;
    content: string | null;
} {
    if (state.redoStack.length === 0) {
        return { state, content: null };
    }

    const lastRedoAction = state.redoStack[state.redoStack.length - 1];
    const newRedoStack = state.redoStack.slice(0, -1);
    const newUndoStack = [...state.undoStack, lastRedoAction];

    const newState: UndoRedoState = {
        undoStack: newUndoStack,
        redoStack: newRedoStack,
        currentContent: lastRedoAction.content,
    };

    return {
        state: newState,
        content: lastRedoAction.content,
    };
}

/**
 * Verifica se pode desfazer
 */
export function canUndo(state: UndoRedoState): boolean {
    return state.undoStack.length > 0;
}

/**
 * Verifica se pode refazer
 */
export function canRedo(state: UndoRedoState): boolean {
    return state.redoStack.length > 0;
}

/**
 * Limpa todo o histórico
 */
export function clearHistory(state: UndoRedoState): UndoRedoState {
    return {
        ...state,
        undoStack: [],
        redoStack: [],
    };
}

/**
 * Obtém informações sobre o histórico
 */
export function getHistoryInfo(state: UndoRedoState): {
    undoCount: number;
    redoCount: number;
    canUndo: boolean;
    canRedo: boolean;
} {
    return {
        undoCount: state.undoStack.length,
        redoCount: state.redoStack.length,
        canUndo: canUndo(state),
        canRedo: canRedo(state),
    };
}
