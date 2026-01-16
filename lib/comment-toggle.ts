/**
 * Sistema de comentários rápidos para código
 * Suporta toggle de comentários para múltiplas linguagens
 */

export interface CommentStyle {
    line: string;
    blockStart?: string;
    blockEnd?: string;
}

const COMMENT_STYLES: Record<string, CommentStyle> = {
    python: {
        line: '#',
        blockStart: '"""',
        blockEnd: '"""',
    },
    javascript: {
        line: '//',
        blockStart: '/*',
        blockEnd: '*/',
    },
    typescript: {
        line: '//',
        blockStart: '/*',
        blockEnd: '*/',
    },
    html: {
        line: '<!--',
        blockStart: '<!--',
        blockEnd: '-->',
    },
    css: {
        line: '/*',
        blockStart: '/*',
        blockEnd: '*/',
    },
    text: {
        line: '#',
    },
};

/**
 * Obtém estilo de comentário para uma linguagem
 */
function getCommentStyle(language: string): CommentStyle {
    return COMMENT_STYLES[language] || COMMENT_STYLES.text;
}

/**
 * Verifica se uma linha está comentada
 */
export function isLineCommented(line: string, language: string): boolean {
    const style = getCommentStyle(language);
    const trimmed = line.trim();

    if (style.line) {
        return trimmed.startsWith(style.line);
    }

    return false;
}

/**
 * Comenta uma linha
 */
export function commentLine(line: string, language: string): string {
    const style = getCommentStyle(language);

    if (!style.line) return line;

    // Preservar indentação
    const leadingWhitespace = line.match(/^\s*/)?.[0] || '';
    const content = line.substring(leadingWhitespace.length);

    return `${leadingWhitespace}${style.line} ${content}`;
}

/**
 * Descomenta uma linha
 */
export function uncommentLine(line: string, language: string): string {
    const style = getCommentStyle(language);

    if (!style.line) return line;

    // Preservar indentação
    const leadingWhitespace = line.match(/^\s*/)?.[0] || '';
    const content = line.substring(leadingWhitespace.length);

    // Remover comentário
    const commentPattern = new RegExp(`^${escapeRegex(style.line)}\\s?`);
    const uncommented = content.replace(commentPattern, '');

    return `${leadingWhitespace}${uncommented}`;
}

/**
 * Toggle comentário em uma linha
 */
export function toggleLineComment(line: string, language: string): string {
    if (isLineCommented(line, language)) {
        return uncommentLine(line, language);
    } else {
        return commentLine(line, language);
    }
}

/**
 * Toggle comentário em múltiplas linhas
 */
export function toggleMultiLineComment(
    lines: string[],
    language: string
): string[] {
    if (lines.length === 0) return lines;

    // Verificar se todas as linhas não vazias estão comentadas
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    const allCommented = nonEmptyLines.every(line => isLineCommented(line, language));

    if (allCommented) {
        // Descomentar todas
        return lines.map(line =>
            line.trim().length > 0 ? uncommentLine(line, language) : line
        );
    } else {
        // Comentar todas
        return lines.map(line =>
            line.trim().length > 0 ? commentLine(line, language) : line
        );
    }
}

/**
 * Toggle comentário de bloco
 */
export function toggleBlockComment(
    content: string,
    language: string
): string {
    const style = getCommentStyle(language);

    if (!style.blockStart || !style.blockEnd) {
        // Fallback para comentários de linha
        const lines = content.split('\n');
        return toggleMultiLineComment(lines, language).join('\n');
    }

    const trimmed = content.trim();

    // Verificar se já está comentado
    if (trimmed.startsWith(style.blockStart) && trimmed.endsWith(style.blockEnd)) {
        // Remover comentário de bloco
        const uncommented = trimmed.substring(
            style.blockStart.length,
            trimmed.length - style.blockEnd.length
        );
        return uncommented.trim();
    } else {
        // Adicionar comentário de bloco
        return `${style.blockStart}\n${content}\n${style.blockEnd}`;
    }
}

/**
 * Comenta seleção de código
 */
export function commentSelection(
    content: string,
    selectionStart: number,
    selectionEnd: number,
    language: string
): {
    newContent: string;
    newSelectionStart: number;
    newSelectionEnd: number;
} {
    const beforeSelection = content.substring(0, selectionStart);
    const selection = content.substring(selectionStart, selectionEnd);
    const afterSelection = content.substring(selectionEnd);

    // Se seleção contém múltiplas linhas, usar comentário de linha
    const lines = selection.split('\n');

    if (lines.length > 1) {
        const commented = toggleMultiLineComment(lines, language);
        const newSelection = commented.join('\n');

        return {
            newContent: beforeSelection + newSelection + afterSelection,
            newSelectionStart: selectionStart,
            newSelectionEnd: selectionStart + newSelection.length,
        };
    } else {
        // Linha única
        const commented = toggleLineComment(selection, language);

        return {
            newContent: beforeSelection + commented + afterSelection,
            newSelectionStart: selectionStart,
            newSelectionEnd: selectionStart + commented.length,
        };
    }
}

/**
 * Toggle comentário na linha atual do cursor
 */
export function toggleCommentAtCursor(
    content: string,
    cursorPosition: number,
    language: string
): {
    newContent: string;
    newCursorPosition: number;
} {
    const lines = content.split('\n');
    let currentPos = 0;
    let currentLineIndex = 0;

    // Encontrar linha do cursor
    for (let i = 0; i < lines.length; i++) {
        const lineLength = lines[i].length + 1; // +1 para \n
        if (currentPos + lineLength > cursorPosition) {
            currentLineIndex = i;
            break;
        }
        currentPos += lineLength;
    }

    // Toggle comentário na linha
    const originalLine = lines[currentLineIndex];
    const commentedLine = toggleLineComment(originalLine, language);
    lines[currentLineIndex] = commentedLine;

    // Calcular nova posição do cursor
    const diff = commentedLine.length - originalLine.length;
    const newCursorPosition = cursorPosition + diff;

    return {
        newContent: lines.join('\n'),
        newCursorPosition,
    };
}

/**
 * Escape regex special characters
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Obtém informações sobre comentários para uma linguagem
 */
export function getCommentInfo(language: string): {
    hasLineComment: boolean;
    hasBlockComment: boolean;
    lineCommentSymbol?: string;
    blockCommentStart?: string;
    blockCommentEnd?: string;
} {
    const style = getCommentStyle(language);

    return {
        hasLineComment: !!style.line,
        hasBlockComment: !!(style.blockStart && style.blockEnd),
        lineCommentSymbol: style.line,
        blockCommentStart: style.blockStart,
        blockCommentEnd: style.blockEnd,
    };
}
