/**
 * Sistema de Clipboard para o editor
 * Gerencia operações de copy, cut e paste com histórico
 */

import * as Clipboard from 'expo-clipboard';

export interface ClipboardHistoryItem {
    content: string;
    timestamp: number;
    language?: string;
}

const MAX_CLIPBOARD_HISTORY = 20;
let clipboardHistory: ClipboardHistoryItem[] = [];

/**
 * Copia texto para o clipboard
 */
export async function copyToClipboard(text: string, language?: string): Promise<void> {
    try {
        await Clipboard.setStringAsync(text);

        // Adicionar ao histórico
        const historyItem: ClipboardHistoryItem = {
            content: text,
            timestamp: Date.now(),
            language,
        };

        clipboardHistory.unshift(historyItem);

        // Limitar tamanho do histórico
        if (clipboardHistory.length > MAX_CLIPBOARD_HISTORY) {
            clipboardHistory = clipboardHistory.slice(0, MAX_CLIPBOARD_HISTORY);
        }
    } catch (error) {
        console.error('Erro ao copiar para clipboard:', error);
        throw error;
    }
}

/**
 * Cola texto do clipboard
 */
export async function pasteFromClipboard(): Promise<string> {
    try {
        const text = await Clipboard.getStringAsync();
        return text;
    } catch (error) {
        console.error('Erro ao colar do clipboard:', error);
        throw error;
    }
}

/**
 * Verifica se o clipboard tem conteúdo
 */
export async function hasClipboardContent(): Promise<boolean> {
    try {
        const text = await Clipboard.getStringAsync();
        return text.length > 0;
    } catch (error) {
        return false;
    }
}

/**
 * Obtém o histórico do clipboard
 */
export function getClipboardHistory(): ClipboardHistoryItem[] {
    return [...clipboardHistory];
}

/**
 * Limpa o histórico do clipboard
 */
export function clearClipboardHistory(): void {
    clipboardHistory = [];
}

/**
 * Cola item específico do histórico
 */
export async function pasteFromHistory(index: number): Promise<string> {
    if (index < 0 || index >= clipboardHistory.length) {
        throw new Error('Índice de histórico inválido');
    }

    const item = clipboardHistory[index];
    await Clipboard.setStringAsync(item.content);
    return item.content;
}

/**
 * Operação de cortar (cut)
 */
export async function cutToClipboard(
    text: string,
    language?: string
): Promise<void> {
    await copyToClipboard(text, language);
}

/**
 * Formata texto copiado com informações adicionais
 */
export function formatClipboardContent(
    content: string,
    metadata?: {
        fileName?: string;
        lineStart?: number;
        lineEnd?: number;
        language?: string;
    }
): string {
    if (!metadata) return content;

    const parts: string[] = [];

    if (metadata.fileName) {
        parts.push(`// Arquivo: ${metadata.fileName}`);
    }

    if (metadata.lineStart !== undefined) {
        const lineInfo = metadata.lineEnd !== undefined && metadata.lineEnd !== metadata.lineStart
            ? `Linhas ${metadata.lineStart}-${metadata.lineEnd}`
            : `Linha ${metadata.lineStart}`;
        parts.push(`// ${lineInfo}`);
    }

    if (metadata.language) {
        parts.push(`// Linguagem: ${metadata.language}`);
    }

    if (parts.length > 0) {
        return `${parts.join('\n')}\n\n${content}`;
    }

    return content;
}
