/**
 * Sistema de gerenciamento de ficheiros com FileSystem API (SDK 54+)
 * Totalmente defensivo para evitar erros "this.validatePath" no Web/SSR.
 */

import { Paths, File, Directory } from 'expo-file-system';
import { Platform } from 'react-native';

export interface FileInfo {
    uri: string;
    name: string;
    size: number;
    modificationTime: number | null;
    isDirectory: boolean;
}

export interface SaveOptions {
    encoding?: 'utf8' | 'base64';
}

/**
 * Utilitário para criar instâncias de File/Directory de forma segura.
 * No Web, algumas operações nativas podem falhar durante a construção.
 */
function createSafeFile(path: string): File | null {
    try {
        return new File(path);
    } catch (e) {
        console.warn('Falha ao instanciar File (provavelmente Web):', e);
        return null;
    }
}

function createSafeDirectory(path: string, name?: string): Directory | null {
    try {
        const pathStr: string = typeof path === 'string' ? path : (path as any).uri;
        if (name) {
            return new Directory(pathStr as any, name);
        }
        return new Directory(pathStr as any);
    } catch (e) {
        console.warn('Falha ao instanciar Directory (provavelmente Web):', e);
        return null;
    }
}

function getDocumentsPath(): string {
    try {
        const doc = Paths.document;
        return typeof doc === 'string' ? doc : (doc as any).uri || 'file:///documents';
    } catch (e) {
        return 'file:///documents';
    }
}

/**
 * Inicializa o sistema de ficheiros
 */
export async function initFileSystem(): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
        const docDir = getDocumentsPath();
        const projectsDir = createSafeDirectory(docDir, 'projects');
        if (projectsDir && !projectsDir.exists) {
            await projectsDir.create({ intermediates: true, idempotent: true });
        }
    } catch (error) {
        console.error('Erro ao inicializar sistema de ficheiros:', error);
    }
}

/**
 * Salva ficheiro
 */
export async function saveFile(
    fileName: string,
    content: string,
    options: SaveOptions = {}
): Promise<string> {
    try {
        if (Platform.OS === 'web') {
            // No Web, apenas simulamos o sucesso para não travar o editor
            return `web-simulated://${fileName}`;
        }

        const projectsDir = createSafeDirectory(getDocumentsPath(), 'projects');
        if (!projectsDir) throw new Error('Sistema de ficheiros não disponível');

        const file = new File(projectsDir, fileName);
        const encoding = options.encoding || 'utf8';

        await file.write(content, { encoding });
        return file.uri;
    } catch (error) {
        console.error('Erro ao salvar ficheiro:', error);
        throw error;
    }
}

/**
 * Abre/lê ficheiro
 */
export async function openFile(filePath: string): Promise<string> {
    try {
        if (Platform.OS === 'web') {
            return ''; // Ou retornar conteúdo de um Mock/Store
        }

        const file = createSafeFile(filePath);
        if (!file) throw new Error('Ficheiro inválido');
        return await file.text();
    } catch (error) {
        console.error('Erro ao abrir ficheiro:', error);
        throw error;
    }
}

/**
 * Lista ficheiros em um diretório
 */
export async function listFiles(directoryPath?: string): Promise<FileInfo[]> {
    try {
        if (Platform.OS === 'web') return [];

        const path = directoryPath || createSafeDirectory(getDocumentsPath(), 'projects')?.uri;
        if (!path) return [];

        const dir = createSafeDirectory(path);
        if (!dir || !dir.exists) return [];

        const contents = await dir.list();
        const fileInfos: FileInfo[] = [];

        for (const item of contents) {
            if (item instanceof File) {
                fileInfos.push({
                    uri: item.uri,
                    name: item.name,
                    size: item.size || 0,
                    modificationTime: item.modificationTime || 0,
                    isDirectory: false,
                });
            } else if (item instanceof Directory) {
                try {
                    const info = await item.info();
                    fileInfos.push({
                        uri: item.uri,
                        name: item.name,
                        size: 0,
                        modificationTime: info.modificationTime || 0,
                        isDirectory: true,
                    });
                } catch (e) {
                    fileInfos.push({
                        uri: item.uri,
                        name: item.name,
                        size: 0,
                        modificationTime: 0,
                        isDirectory: true,
                    });
                }
            }
        }

        return fileInfos.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });
    } catch (error) {
        console.error('Erro ao listar ficheiros:', error);
        return [];
    }
}

/**
 * Cria novo ficheiro
 */
export async function createFile(
    fileName: string,
    content: string = ''
): Promise<string> {
    return saveFile(fileName, content);
}

/**
 * Cria nova pasta
 */
export async function createDirectory(directoryName: string): Promise<string> {
    try {
        if (Platform.OS === 'web') return `web-simulated-dir://${directoryName}`;

        const projectsDir = createSafeDirectory(getDocumentsPath(), 'projects');
        if (!projectsDir) throw new Error('Sistema de ficheiros não disponível');

        const dir = new Directory(projectsDir, directoryName);
        await dir.create({ intermediates: true, idempotent: true });
        return dir.uri;
    } catch (error) {
        console.error('Erro ao criar pasta:', error);
        throw error;
    }
}

/**
 * Elimina ficheiro ou pasta
 */
export async function deleteFileOrDirectory(path: string): Promise<void> {
    try {
        if (Platform.OS === 'web') return;

        if (path.endsWith('/')) {
            const dir = createSafeDirectory(path);
            await dir?.delete();
        } else {
            const file = createSafeFile(path);
            await file?.delete();
        }
    } catch (error) {
        console.error('Erro ao eliminar:', error);
        throw error;
    }
}

/**
 * Renomeia ficheiro ou pasta
 */
export async function renameFileOrDirectory(
    oldPath: string,
    newName: string
): Promise<string> {
    try {
        if (Platform.OS === 'web') return `web-simulated-renamed://${newName}`;

        if (oldPath.endsWith('/')) {
            const dir = createSafeDirectory(oldPath);
            await dir?.rename(newName);
            return dir?.uri || '';
        } else {
            const file = createSafeFile(oldPath);
            await file?.rename(newName);
            return file?.uri || '';
        }
    } catch (error) {
        console.error('Erro ao renomear:', error);
        throw error;
    }
}

/**
 * Copia ficheiro
 */
export async function copyFile(sourcePath: string, destName: string): Promise<string> {
    try {
        if (Platform.OS === 'web') return `web-simulated-copy://${destName}`;

        const file = createSafeFile(sourcePath);
        if (!file) throw new Error('Ficheiro de origem inválido');

        const parentPath = sourcePath.substring(0, sourcePath.lastIndexOf('/') + 1);
        const parentDir = createSafeDirectory(parentPath);
        if (!parentDir) throw new Error('Diretório pai inválido');

        const destFile = new File(parentDir, destName);
        await file.copy(destFile);
        return destFile.uri;
    } catch (error) {
        console.error('Erro ao copiar ficheiro:', error);
        throw error;
    }
}

/**
 * Move ficheiro
 */
export async function moveFile(sourcePath: string, destPath: string): Promise<void> {
    try {
        if (Platform.OS === 'web') return;

        const file = createSafeFile(sourcePath);
        if (!file) throw new Error('Ficheiro de origem inválido');

        const dest = destPath.endsWith('/') ? createSafeDirectory(destPath) : createSafeFile(destPath);
        if (dest) await file.move(dest as any);
    } catch (error) {
        console.error('Erro ao mover ficheiro:', error);
        throw error;
    }
}

/**
 * Verifica se ficheiro existe
 */
export async function fileExists(filePath: string): Promise<boolean> {
    try {
        if (Platform.OS === 'web') return false;
        const file = createSafeFile(filePath);
        return file?.exists || false;
    } catch (error) {
        return false;
    }
}

/**
 * Obtém informações do ficheiro
 */
export async function getFileInfo(filePath: string): Promise<FileInfo | null> {
    try {
        if (Platform.OS === 'web') return null;

        const file = createSafeFile(filePath);
        if (file && file.exists) {
            return {
                uri: filePath,
                name: file.name,
                size: file.size || 0,
                modificationTime: file.modificationTime || 0,
                isDirectory: false,
            };
        }

        const dir = createSafeDirectory(filePath);
        if (dir && dir.exists) {
            const info = await dir.info();
            return {
                uri: filePath,
                name: dir.name,
                size: dir.size || 0,
                modificationTime: info.modificationTime || 0,
                isDirectory: true,
            };
        }
        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Formata tamanho de ficheiro
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Exporta ficheiro (compartilhar)
 */
export async function exportFile(filePath: string): Promise<void> {
    try {
        if (Platform.OS === 'web') {
            const content = await openFile(filePath);
            const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
        } else {
            const Sharing = require('expo-sharing');
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(filePath);
            }
        }
    } catch (error) {
        console.error('Erro ao exportar ficheiro:', error);
    }
}
