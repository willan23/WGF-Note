/**
 * Serviço de persistência de ficheiros usando AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CodeLanguage } from './types-extended';

export interface PersistedFile {
  id: string;
  name: string;
  content: string;
  language: CodeLanguage;
  lastModified: number;
  createdAt: number;
  encoding: string;
}

export interface FileHistory {
  fileId: string;
  timestamp: number;
  content: string;
  description?: string;
}

const FILES_STORAGE_KEY = 'editor-files';
const HISTORY_STORAGE_KEY = 'editor-file-history-';
const RECENT_FILES_KEY = 'editor-recent-files';

/**
 * Guarda um ficheiro no armazenamento
 */
export async function saveFile(file: PersistedFile): Promise<void> {
  try {
    const files = await getAllFiles();
    const index = files.findIndex(f => f.id === file.id);
    
    if (index >= 0) {
      files[index] = file;
    } else {
      files.push(file);
    }
    
    await AsyncStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(files));
    
    // Adicionar aos ficheiros recentes
    await addToRecentFiles(file.id, file.name);
  } catch (error) {
    console.error('Erro ao guardar ficheiro:', error);
    throw error;
  }
}

/**
 * Carrega um ficheiro pelo ID
 */
export async function loadFile(fileId: string): Promise<PersistedFile | null> {
  try {
    const files = await getAllFiles();
    return files.find(f => f.id === fileId) || null;
  } catch (error) {
    console.error('Erro ao carregar ficheiro:', error);
    return null;
  }
}

/**
 * Carrega todos os ficheiros
 */
export async function getAllFiles(): Promise<PersistedFile[]> {
  try {
    const data = await AsyncStorage.getItem(FILES_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Erro ao carregar ficheiros:', error);
    return [];
  }
}

/**
 * Elimina um ficheiro
 */
export async function deleteFile(fileId: string): Promise<void> {
  try {
    const files = await getAllFiles();
    const filtered = files.filter(f => f.id !== fileId);
    await AsyncStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(filtered));
    
    // Eliminar histórico do ficheiro
    await AsyncStorage.removeItem(HISTORY_STORAGE_KEY + fileId);
  } catch (error) {
    console.error('Erro ao eliminar ficheiro:', error);
    throw error;
  }
}

/**
 * Guarda uma versão do ficheiro no histórico
 */
export async function saveFileHistory(
  fileId: string,
  content: string,
  description?: string
): Promise<void> {
  try {
    const historyKey = HISTORY_STORAGE_KEY + fileId;
    const history = await getFileHistory(fileId);
    
    const newEntry: FileHistory = {
      fileId,
      timestamp: Date.now(),
      content,
      description,
    };
    
    // Manter apenas as últimas 50 versões
    history.push(newEntry);
    if (history.length > 50) {
      history.shift();
    }
    
    await AsyncStorage.setItem(historyKey, JSON.stringify(history));
  } catch (error) {
    console.error('Erro ao guardar histórico:', error);
    throw error;
  }
}

/**
 * Carrega o histórico de um ficheiro
 */
export async function getFileHistory(fileId: string): Promise<FileHistory[]> {
  try {
    const historyKey = HISTORY_STORAGE_KEY + fileId;
    const data = await AsyncStorage.getItem(historyKey);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Erro ao carregar histórico:', error);
    return [];
  }
}

/**
 * Restaura uma versão anterior do ficheiro
 */
export async function restoreFileVersion(
  fileId: string,
  timestamp: number
): Promise<PersistedFile | null> {
  try {
    const history = await getFileHistory(fileId);
    const entry = history.find(h => h.timestamp === timestamp);
    
    if (!entry) {
      return null;
    }
    
    const file = await loadFile(fileId);
    if (!file) {
      return null;
    }
    
    // Atualizar conteúdo com a versão anterior
    const restoredFile: PersistedFile = {
      ...file,
      content: entry.content,
      lastModified: Date.now(),
    };
    
    await saveFile(restoredFile);
    return restoredFile;
  } catch (error) {
    console.error('Erro ao restaurar versão:', error);
    return null;
  }
}

/**
 * Adiciona ficheiro aos recentes
 */
export async function addToRecentFiles(fileId: string, fileName: string): Promise<void> {
  try {
    const recent = await getRecentFiles();
    
    // Remover se já existe
    const filtered = recent.filter(f => f.id !== fileId);
    
    // Adicionar no início
    filtered.unshift({ id: fileId, name: fileName, timestamp: Date.now() });
    
    // Manter apenas os últimos 10
    if (filtered.length > 10) {
      filtered.pop();
    }
    
    await AsyncStorage.setItem(RECENT_FILES_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Erro ao adicionar aos recentes:', error);
  }
}

/**
 * Carrega ficheiros recentes
 */
export async function getRecentFiles(): Promise<Array<{ id: string; name: string; timestamp: number }>> {
  try {
    const data = await AsyncStorage.getItem(RECENT_FILES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Erro ao carregar recentes:', error);
    return [];
  }
}

/**
 * Exporta ficheiro como texto
 */
export async function exportFile(fileId: string): Promise<string | null> {
  try {
    const file = await loadFile(fileId);
    if (!file) {
      return null;
    }
    
    return file.content;
  } catch (error) {
    console.error('Erro ao exportar ficheiro:', error);
    return null;
  }
}

/**
 * Importa ficheiro de texto
 */
export async function importFile(
  name: string,
  content: string,
  language: CodeLanguage
): Promise<PersistedFile> {
  const file: PersistedFile = {
    id: `file-${Date.now()}`,
    name,
    content,
    language,
    createdAt: Date.now(),
    lastModified: Date.now(),
    encoding: 'utf-8',
  };
  
  await saveFile(file);
  return file;
}

/**
 * Limpa todo o armazenamento (cuidado!)
 */
export async function clearAllFiles(): Promise<void> {
  try {
    const files = await getAllFiles();
    
    // Eliminar histórico de cada ficheiro
    for (const file of files) {
      await AsyncStorage.removeItem(HISTORY_STORAGE_KEY + file.id);
    }
    
    // Eliminar ficheiros e recentes
    await AsyncStorage.removeItem(FILES_STORAGE_KEY);
    await AsyncStorage.removeItem(RECENT_FILES_KEY);
  } catch (error) {
    console.error('Erro ao limpar armazenamento:', error);
    throw error;
  }
}
