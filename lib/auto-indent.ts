/**
 * Sistema de indentação automática
 * Suporta Python, HTML, CSS e outras linguagens
 */

export interface IndentConfig {
    useTabs: boolean;
    tabSize: number;
    autoIndent: boolean;
}

const DEFAULT_CONFIG: IndentConfig = {
    useTabs: false,
    tabSize: 4,
    autoIndent: true,
};

/**
 * Obtém string de indentação
 */
function getIndentString(level: number, config: IndentConfig): string {
    const char = config.useTabs ? '\t' : ' '.repeat(config.tabSize);
    return char.repeat(level);
}

/**
 * Calcula nível de indentação de uma linha
 */
export function getIndentLevel(line: string, config: IndentConfig = DEFAULT_CONFIG): number {
    let level = 0;
    const indentChar = config.useTabs ? '\t' : ' ';
    const indentSize = config.useTabs ? 1 : config.tabSize;

    for (let i = 0; i < line.length; i++) {
        if (line[i] === indentChar) {
            level++;
        } else if (line[i] !== ' ' && line[i] !== '\t') {
            break;
        }
    }

    return Math.floor(level / indentSize);
}

/**
 * Indenta linha automaticamente baseado na linha anterior
 */
export function autoIndentLine(
    currentLine: string,
    previousLine: string,
    language: string,
    config: IndentConfig = DEFAULT_CONFIG
): string {
    if (!config.autoIndent) return currentLine;

    const trimmedCurrent = currentLine.trim();
    const trimmedPrevious = previousLine.trim();

    // Calcular indentação base da linha anterior
    let indentLevel = getIndentLevel(previousLine, config);

    // Regras específicas por linguagem
    if (language === 'python') {
        indentLevel = autoIndentPython(trimmedPrevious, trimmedCurrent, indentLevel);
    } else if (language === 'html') {
        indentLevel = autoIndentHTML(trimmedPrevious, trimmedCurrent, indentLevel);
    } else if (language === 'css') {
        indentLevel = autoIndentCSS(trimmedPrevious, trimmedCurrent, indentLevel);
    } else if (language === 'javascript' || language === 'typescript') {
        indentLevel = autoIndentJavaScript(trimmedPrevious, trimmedCurrent, indentLevel);
    }

    return getIndentString(indentLevel, config) + trimmedCurrent;
}

/**
 * Indentação automática para Python
 */
function autoIndentPython(
    previousLine: string,
    currentLine: string,
    baseLevel: number
): number {
    let level = baseLevel;

    // Aumentar indentação após :
    if (previousLine.endsWith(':')) {
        level++;
    }

    // Diminuir indentação para palavras-chave de fechamento
    const decreaseKeywords = ['return', 'break', 'continue', 'pass', 'raise'];
    if (decreaseKeywords.some(kw => currentLine.startsWith(kw))) {
        // Não diminuir, manter nível
    }

    // Diminuir para elif, else, except, finally
    const dedentKeywords = ['elif', 'else', 'except', 'finally'];
    if (dedentKeywords.some(kw => currentLine.startsWith(kw))) {
        level = Math.max(0, level - 1);
    }

    return level;
}

/**
 * Indentação automática para HTML
 */
function autoIndentHTML(
    previousLine: string,
    currentLine: string,
    baseLevel: number
): number {
    let level = baseLevel;

    // Aumentar após tag de abertura (não auto-fechada)
    const openTagMatch = previousLine.match(/<(\w+)[^>]*>(?!.*<\/\1>)/);
    if (openTagMatch && !previousLine.includes('/>')) {
        const tagName = openTagMatch[1];
        // Tags que não aumentam indentação
        const inlineTags = ['br', 'hr', 'img', 'input', 'meta', 'link'];
        if (!inlineTags.includes(tagName.toLowerCase())) {
            level++;
        }
    }

    // Diminuir para tag de fechamento
    if (currentLine.startsWith('</')) {
        level = Math.max(0, level - 1);
    }

    return level;
}

/**
 * Indentação automática para CSS
 */
function autoIndentCSS(
    previousLine: string,
    currentLine: string,
    baseLevel: number
): number {
    let level = baseLevel;

    // Aumentar após {
    if (previousLine.includes('{') && !previousLine.includes('}')) {
        level++;
    }

    // Diminuir para }
    if (currentLine.startsWith('}')) {
        level = Math.max(0, level - 1);
    }

    return level;
}

/**
 * Indentação automática para JavaScript/TypeScript
 */
function autoIndentJavaScript(
    previousLine: string,
    currentLine: string,
    baseLevel: number
): number {
    let level = baseLevel;

    // Aumentar após { ou (
    const openBraces = (previousLine.match(/[{(]/g) || []).length;
    const closeBraces = (previousLine.match(/[})]/g) || []).length;
    level += openBraces - closeBraces;

    // Diminuir para } ou )
    if (currentLine.startsWith('}') || currentLine.startsWith(')')) {
        level = Math.max(0, level - 1);
    }

    return Math.max(0, level);
}

/**
 * Indenta bloco de código completo
 */
export function indentBlock(
    code: string,
    language: string,
    config: IndentConfig = DEFAULT_CONFIG
): string {
    const lines = code.split('\n');
    const indented: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        if (i === 0) {
            indented.push(lines[i]);
        } else {
            const indentedLine = autoIndentLine(lines[i], lines[i - 1], language, config);
            indented.push(indentedLine);
        }
    }

    return indented.join('\n');
}

/**
 * Remove indentação de bloco
 */
export function dedentBlock(code: string, config: IndentConfig = DEFAULT_CONFIG): string {
    const lines = code.split('\n');

    // Encontrar indentação mínima
    let minIndent = Infinity;
    for (const line of lines) {
        if (line.trim().length > 0) {
            const level = getIndentLevel(line, config);
            minIndent = Math.min(minIndent, level);
        }
    }

    if (minIndent === Infinity || minIndent === 0) return code;

    // Remover indentação mínima de todas as linhas
    const dedented = lines.map(line => {
        if (line.trim().length === 0) return line;
        const level = getIndentLevel(line, config);
        const newLevel = Math.max(0, level - minIndent);
        return getIndentString(newLevel, config) + line.trim();
    });

    return dedented.join('\n');
}

/**
 * Aumenta indentação de bloco
 */
export function increaseIndent(
    code: string,
    levels: number = 1,
    config: IndentConfig = DEFAULT_CONFIG
): string {
    const lines = code.split('\n');
    const indentStr = getIndentString(levels, config);

    return lines.map(line => {
        if (line.trim().length === 0) return line;
        return indentStr + line;
    }).join('\n');
}

/**
 * Diminui indentação de bloco
 */
export function decreaseIndent(
    code: string,
    levels: number = 1,
    config: IndentConfig = DEFAULT_CONFIG
): string {
    const lines = code.split('\n');
    const removeChars = config.useTabs ? levels : levels * config.tabSize;

    return lines.map(line => {
        if (line.trim().length === 0) return line;

        let removed = 0;
        let i = 0;
        const indentChar = config.useTabs ? '\t' : ' ';

        while (i < line.length && removed < removeChars) {
            if (line[i] === indentChar) {
                removed++;
                i++;
            } else {
                break;
            }
        }

        return line.substring(i);
    }).join('\n');
}

/**
 * Converte tabs para espaços
 */
export function tabsToSpaces(code: string, tabSize: number = 4): string {
    return code.replace(/\t/g, ' '.repeat(tabSize));
}

/**
 * Converte espaços para tabs
 */
export function spacesToTabs(code: string, tabSize: number = 4): string {
    const regex = new RegExp(' '.repeat(tabSize), 'g');
    return code.replace(regex, '\t');
}
