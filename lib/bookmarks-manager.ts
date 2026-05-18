/**
 * Sistema de Bookmarks/Marcadores para o editor
 * Permite marcar linhas importantes no código
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Bookmark {
    id: string;
    fileId: string;
    fileName: string;
    line: number;
    label?: string;
    timestamp: number;
    snippet?: string; // Trecho do código na linha
}

const BOOKMARKS_STORAGE_KEY = '@editor_bookmarks';

/**
 * Carrega todos os bookmarks
 */
export async function loadBookmarks(): Promise<Bookmark[]> {
    try {
        const data = await AsyncStorage.getItem(BOOKMARKS_STORAGE_KEY);
        if (!data) return [];
        return JSON.parse(data);
    } catch (error) {
        console.error('Erro ao carregar bookmarks:', error);
        return [];
    }
}

/**
 * Salva bookmarks
 */
async function saveBookmarks(bookmarks: Bookmark[]): Promise<void> {
    try {
        await AsyncStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
    } catch (error) {
        console.error('Erro ao salvar bookmarks:', error);
        throw error;
    }
}

/**
 * Adiciona bookmark
 */
export async function addBookmark(
    fileId: string,
    fileName: string,
    line: number,
    label?: string,
    snippet?: string
): Promise<Bookmark> {
    const bookmarks = await loadBookmarks();

    const bookmark: Bookmark = {
        id: `${fileId}_${line}_${Date.now()}`,
        fileId,
        fileName,
        line,
        label,
        timestamp: Date.now(),
        snippet,
    };

    bookmarks.push(bookmark);
    await saveBookmarks(bookmarks);

    return bookmark;
}

/**
 * Remove bookmark
 */
export async function removeBookmark(bookmarkId: string): Promise<void> {
    const bookmarks = await loadBookmarks();
    const filtered = bookmarks.filter(b => b.id !== bookmarkId);
    await saveBookmarks(filtered);
}

/**
 * Remove todos os bookmarks de um ficheiro
 */
export async function removeFileBookmarks(fileId: string): Promise<void> {
    const bookmarks = await loadBookmarks();
    const filtered = bookmarks.filter(b => b.fileId !== fileId);
    await saveBookmarks(filtered);
}

/**
 * Obtém bookmarks de um ficheiro
 */
export async function getFileBookmarks(fileId: string): Promise<Bookmark[]> {
    const bookmarks = await loadBookmarks();
    return bookmarks
        .filter(b => b.fileId === fileId)
        .sort((a, b) => a.line - b.line);
}

/**
 * Verifica se uma linha tem bookmark
 */
export async function hasBookmarkAtLine(
    fileId: string,
    line: number
): Promise<boolean> {
    const bookmarks = await getFileBookmarks(fileId);
    return bookmarks.some(b => b.line === line);
}

/**
 * Toggle bookmark em uma linha
 */
export async function toggleBookmark(
    fileId: string,
    fileName: string,
    line: number,
    snippet?: string
): Promise<boolean> {
    const bookmarks = await loadBookmarks();
    const existing = bookmarks.find(b => b.fileId === fileId && b.line === line);

    if (existing) {
        await removeBookmark(existing.id);
        return false; // Removido
    } else {
        await addBookmark(fileId, fileName, line, undefined, snippet);
        return true; // Adicionado
    }
}

/**
 * Atualiza label de um bookmark
 */
export async function updateBookmarkLabel(
    bookmarkId: string,
    label: string
): Promise<void> {
    const bookmarks = await loadBookmarks();
    const bookmark = bookmarks.find(b => b.id === bookmarkId);

    if (bookmark) {
        bookmark.label = label;
        await saveBookmarks(bookmarks);
    }
}

/**
 * Limpa todos os bookmarks
 */
export async function clearAllBookmarks(): Promise<void> {
    await saveBookmarks([]);
}

/**
 * Obtém próximo bookmark
 */
export async function getNextBookmark(
    fileId: string,
    currentLine: number
): Promise<Bookmark | null> {
    const bookmarks = await getFileBookmarks(fileId);
    const next = bookmarks.find(b => b.line > currentLine);
    return next || bookmarks[0] || null;
}

/**
 * Obtém bookmark anterior
 */
export async function getPreviousBookmark(
    fileId: string,
    currentLine: number
): Promise<Bookmark | null> {
    const bookmarks = await getFileBookmarks(fileId);
    const descending = [...bookmarks].reverse();
    const previous = descending.find(b => b.line < currentLine);
    return previous || descending[0] || null;
}

/**
 * Exporta bookmarks para JSON
 */
export async function exportBookmarks(): Promise<string> {
    const bookmarks = await loadBookmarks();
    return JSON.stringify(bookmarks, null, 2);
}

/**
 * Importa bookmarks de JSON
 */
export async function importBookmarks(jsonData: string): Promise<void> {
    try {
        const bookmarks = JSON.parse(jsonData) as Bookmark[];
        await saveBookmarks(bookmarks);
    } catch (error) {
        console.error('Erro ao importar bookmarks:', error);
        throw error;
    }
}
