/**
 * Sistema de histórico de ficheiros recentes
 * Mantém lista dos últimos ficheiros abertos
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RecentFile {
    id: string;
    name: string;
    path: string;
    lastOpened: number;
    language?: string;
    size?: number;
}

const RECENT_FILES_STORAGE_KEY = '@editor_recent_files';
const MAX_RECENT_FILES = 20;

/**
 * Carrega ficheiros recentes
 */
export async function loadRecentFiles(): Promise<RecentFile[]> {
    try {
        const data = await AsyncStorage.getItem(RECENT_FILES_STORAGE_KEY);
        if (!data) return [];
        return JSON.parse(data);
    } catch (error) {
        console.error('Erro ao carregar ficheiros recentes:', error);
        return [];
    }
}

/**
 * Salva ficheiros recentes
 */
async function saveRecentFiles(files: RecentFile[]): Promise<void> {
    try {
        await AsyncStorage.setItem(RECENT_FILES_STORAGE_KEY, JSON.stringify(files));
    } catch (error) {
        console.error('Erro ao salvar ficheiros recentes:', error);
        throw error;
    }
}

/**
 * Adiciona ficheiro aos recentes
 */
export async function addRecentFile(
    id: string,
    name: string,
    path: string,
    language?: string,
    size?: number
): Promise<void> {
    const recentFiles = await loadRecentFiles();

    // Remover se já existir
    const filtered = recentFiles.filter(f => f.id !== id && f.path !== path);

    // Adicionar no início
    const newFile: RecentFile = {
        id,
        name,
        path,
        lastOpened: Date.now(),
        language,
        size,
    };

    filtered.unshift(newFile);

    // Limitar tamanho
    const limited = filtered.slice(0, MAX_RECENT_FILES);

    await saveRecentFiles(limited);
}

/**
 * Remove ficheiro dos recentes
 */
export async function removeRecentFile(id: string): Promise<void> {
    const recentFiles = await loadRecentFiles();
    const filtered = recentFiles.filter(f => f.id !== id);
    await saveRecentFiles(filtered);
}

export async function removeRecentFilesByPath(path: string, includeDescendants: boolean = false): Promise<void> {
    const recentFiles = await loadRecentFiles();
    const normalizedPath = path.replace(/\/+$/, '');
    const filtered = recentFiles.filter((file) => {
        const normalizedFilePath = file.path.replace(/\/+$/, '');
        return includeDescendants
            ? normalizedFilePath !== normalizedPath && !normalizedFilePath.startsWith(`${normalizedPath}/`)
            : normalizedFilePath !== normalizedPath;
    });
    await saveRecentFiles(filtered);
}

/**
 * Limpa todos os ficheiros recentes
 */
export async function clearRecentFiles(): Promise<void> {
    await saveRecentFiles([]);
}

/**
 * Obtém ficheiros recentes ordenados por data
 */
export async function getRecentFiles(limit?: number): Promise<RecentFile[]> {
    const files = await loadRecentFiles();
    const sorted = [...files].sort((a, b) => b.lastOpened - a.lastOpened);
    return limit ? sorted.slice(0, limit) : sorted;
}

/**
 * Verifica se ficheiro está nos recentes
 */
export async function isRecentFile(id: string): Promise<boolean> {
    const recentFiles = await loadRecentFiles();
    return recentFiles.some(f => f.id === id);
}

/**
 * Obtém ficheiro recente por ID
 */
export async function getRecentFileById(id: string): Promise<RecentFile | null> {
    const recentFiles = await loadRecentFiles();
    return recentFiles.find(f => f.id === id) || null;
}

/**
 * Atualiza informações de ficheiro recente
 */
export async function updateRecentFile(
    id: string,
    updates: Partial<Omit<RecentFile, 'id'>>
): Promise<void> {
    const recentFiles = await loadRecentFiles();
    const file = recentFiles.find(f => f.id === id);

    if (file) {
        Object.assign(file, updates);
        file.lastOpened = Date.now();
        await saveRecentFiles(recentFiles);
    }
}

export async function renameRecentPaths(
    oldPath: string,
    newPath: string,
    includeDescendants: boolean = false,
): Promise<void> {
    const recentFiles = await loadRecentFiles();
    const normalizedOldPath = oldPath.replace(/\/+$/, '');
    const normalizedNewPath = newPath.replace(/\/+$/, '');
    let changed = false;

    const nextFiles = recentFiles.map((file) => {
        const normalizedFilePath = file.path.replace(/\/+$/, '');
        const affected = includeDescendants
            ? normalizedFilePath === normalizedOldPath || normalizedFilePath.startsWith(`${normalizedOldPath}/`)
            : normalizedFilePath === normalizedOldPath;

        if (!affected) return file;

        changed = true;
        const path = normalizedFilePath === normalizedOldPath
            ? normalizedNewPath
            : `${normalizedNewPath}${normalizedFilePath.slice(normalizedOldPath.length)}`;
        const name = path.substring(path.lastIndexOf('/') + 1);

        return {
            ...file,
            name,
            path,
            lastOpened: Date.now(),
        };
    });

    if (changed) {
        await saveRecentFiles(nextFiles);
    }
}

/**
 * Obtém estatísticas dos ficheiros recentes
 */
export async function getRecentFilesStats(): Promise<{
    total: number;
    byLanguage: Record<string, number>;
    totalSize: number;
    mostRecent?: RecentFile;
}> {
    const files = await loadRecentFiles();

    const byLanguage: Record<string, number> = {};
    let totalSize = 0;

    files.forEach(file => {
        if (file.language) {
            byLanguage[file.language] = (byLanguage[file.language] || 0) + 1;
        }
        totalSize += file.size || 0;
    });

    const sorted = [...files].sort((a, b) => b.lastOpened - a.lastOpened);

    return {
        total: files.length,
        byLanguage,
        totalSize,
        mostRecent: sorted[0],
    };
}
