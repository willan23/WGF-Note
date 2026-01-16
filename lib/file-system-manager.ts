/**
 * Sistema de gerenciamento de ficheiros com FileSystem API
 * Suporta operações de save, open, create, delete, rename
 */

import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export interface FileInfo {
    uri: string;
    name: string;
    size: number;
    modificationTime: number | null;
    isDirectory: boolean;
}

export interface SaveOptions {
    encoding?: FileSystem.EncodingType;
    createIntermediateDirectories?: boolean;
}

const DOCUMENTS_DIR = FileSystem.documentDirectory || '';
const PROJECTS_DIR = `${DOCUMENTS_DIR}projects/`;

/**
 * Inicializa o sistema de ficheiros
 */
export async function initFileSystem(): Promise<void> {
    try {
        // Criar diretório de projetos se não existir
        const dirInfo = await FileSystem.getInfoAsync(PROJECTS_DIR);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(PROJECTS_DIR, { intermediates: true });
        }
    } catch (error) {
        console.error('Erro ao inicializar sistema de ficheiros:', error);
        throw error;
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
        const filePath = `${PROJECTS_DIR}${fileName}`;
        const encoding = options.encoding || FileSystem.EncodingType.UTF8;

        await FileSystem.writeAsStringAsync(filePath, content, { encoding });

        return filePath;
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
        const content = await FileSystem.readAsStringAsync(filePath, {
            encoding: FileSystem.EncodingType.UTF8,
        });
        return content;
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
        const dir = directoryPath || PROJECTS_DIR;
        const files = await FileSystem.readDirectoryAsync(dir);

        const fileInfos: FileInfo[] = [];

        for (const file of files) {
            const filePath = `${dir}${file}`;
            const info = await FileSystem.getInfoAsync(filePath);

            fileInfos.push({
                uri: filePath,
                name: file,
                size: info.size || 0,
                modificationTime: info.modificationTime || 0,
                isDirectory: info.isDirectory || false,
            });
        }

        return fileInfos.sort((a, b) => {
            // Diretórios primeiro
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            // Depois por nome
            return a.name.localeCompare(b.name);
        });
    } catch (error) {
        console.error('Erro ao listar ficheiros:', error);
        throw error;
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
        const dirPath = `${PROJECTS_DIR}${directoryName}/`;
        await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
        return dirPath;
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
        await FileSystem.deleteAsync(path, { idempotent: true });
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
        const directory = oldPath.substring(0, oldPath.lastIndexOf('/') + 1);
        const newPath = `${directory}${newName}`;

        await FileSystem.moveAsync({
            from: oldPath,
            to: newPath,
        });

        return newPath;
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
        const directory = sourcePath.substring(0, sourcePath.lastIndexOf('/') + 1);
        const destPath = `${directory}${destName}`;

        await FileSystem.copyAsync({
            from: sourcePath,
            to: destPath,
        });

        return destPath;
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
        await FileSystem.moveAsync({
            from: sourcePath,
            to: destPath,
        });
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
        const info = await FileSystem.getInfoAsync(filePath);
        return info.exists;
    } catch (error) {
        return false;
    }
}

/**
 * Obtém informações do ficheiro
 */
export async function getFileInfo(filePath: string): Promise<FileInfo | null> {
    try {
        const info = await FileSystem.getInfoAsync(filePath);

        if (!info.exists) return null;

        const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);

        return {
            uri: filePath,
            name: fileName,
            size: info.size || 0,
            modificationTime: info.modificationTime || 0,
            isDirectory: info.isDirectory || false,
        };
    } catch (error) {
        console.error('Erro ao obter informações do ficheiro:', error);
        return null;
    }
}

/**
 * Obtém tamanho total do diretório
 */
export async function getDirectorySize(directoryPath: string): Promise<number> {
    try {
        const files = await listFiles(directoryPath);
        let totalSize = 0;

        for (const file of files) {
            if (file.isDirectory) {
                totalSize += await getDirectorySize(file.uri);
            } else {
                totalSize += file.size;
            }
        }

        return totalSize;
    } catch (error) {
        console.error('Erro ao calcular tamanho do diretório:', error);
        return 0;
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
 * Obtém extensão do ficheiro
 */
export function getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    if (lastDot === -1) return '';
    return fileName.substring(lastDot + 1).toLowerCase();
}

/**
 * Detecta linguagem por extensão
 */
export function detectLanguageFromExtension(fileName: string): string {
    const ext = getFileExtension(fileName);

    const languageMap: Record<string, string> = {
        py: 'python',
        html: 'html',
        htm: 'html',
        css: 'css',
        js: 'javascript',
        ts: 'typescript',
        jsx: 'javascript',
        tsx: 'typescript',
        json: 'json',
        md: 'markdown',
        txt: 'text',
    };

    return languageMap[ext] || 'text';
}

/**
 * Exporta ficheiro (compartilhar)
 */
export async function exportFile(filePath: string): Promise<void> {
    try {
        if (Platform.OS === 'web') {
            // No web, fazer download
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
            // No mobile, usar sharing
            const Sharing = require('expo-sharing');
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(filePath);
            }
        }
    } catch (error) {
        console.error('Erro ao exportar ficheiro:', error);
        throw error;
    }
}
