/**
 * Serviço de sincronização cloud com autenticação de utilizador
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { PersistedFile } from './file-persistence';

export interface CloudUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  lastLogin: string;
}

export interface CloudFile extends PersistedFile {
  cloudId?: string;
  syncedAt?: string;
  isConflicted?: boolean;
  conflictVersion?: PersistedFile;
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime?: string;
  pendingChanges: number;
  conflicts: number;
  error?: string;
}

export interface SyncConflict {
  fileId: string;
  localVersion: CloudFile;
  remoteVersion: CloudFile;
  timestamp: string;
}

const CLOUD_SYNC_KEY = 'cloud_sync_data';
const USER_KEY = 'cloud_user';
const SYNC_STATUS_KEY = 'cloud_sync_status';
const CONFLICTS_KEY = 'cloud_conflicts';

/**
 * Autentica utilizador com email/password
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<CloudUser | null> {
  try {
    // Simulação de autenticação (em produção, chamar backend)
    const user: CloudUser = {
      id: `user_${Date.now()}`,
      email,
      name: email.split('@')[0],
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return null;
  }
}

/**
 * Obtém utilizador autenticado
 */
export async function getCurrentUser(): Promise<CloudUser | null> {
  try {
    const userData = await AsyncStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch {
    return null;
  }
}

/**
 * Faz logout do utilizador
 */
export async function logoutUser(): Promise<void> {
  try {
    await AsyncStorage.removeItem(USER_KEY);
    await AsyncStorage.removeItem(CLOUD_SYNC_KEY);
    await AsyncStorage.removeItem(SYNC_STATUS_KEY);
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
  }
}

/**
 * Sincroniza ficheiro com cloud
 */
export async function syncFileToCloud(file: PersistedFile): Promise<CloudFile | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Utilizador não autenticado');
    }

    // Simulação de sincronização (em produção, chamar backend)
    const cloudFile: CloudFile = {
      ...file,
      cloudId: `cloud_${file.id}_${Date.now()}`,
      syncedAt: new Date().toISOString(),
    };

    // Guardar ficheiro sincronizado
    const syncedFiles = await getSyncedFiles();
    syncedFiles[file.id] = cloudFile;
    await AsyncStorage.setItem(CLOUD_SYNC_KEY, JSON.stringify(syncedFiles));

    // Atualizar status de sincronização
    await updateSyncStatus();

    return cloudFile;
  } catch (error) {
    console.error('Erro ao sincronizar ficheiro:', error);
    return null;
  }
}

/**
 * Obtém ficheiros sincronizados
 */
export async function getSyncedFiles(): Promise<Record<string, CloudFile>> {
  try {
    const data = await AsyncStorage.getItem(CLOUD_SYNC_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

/**
 * Sincroniza todos os ficheiros
 */
export async function syncAllFiles(files: PersistedFile[]): Promise<CloudFile[]> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Utilizador não autenticado');
    }

    const syncedFiles: CloudFile[] = [];

    for (const file of files) {
      const cloudFile = await syncFileToCloud(file);
      if (cloudFile) {
        syncedFiles.push(cloudFile);
      }
    }

    return syncedFiles;
  } catch (error) {
    console.error('Erro ao sincronizar ficheiros:', error);
    return [];
  }
}

/**
 * Obtém status de sincronização
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  try {
    const data = await AsyncStorage.getItem(SYNC_STATUS_KEY);
    if (data) {
      return JSON.parse(data);
    }

    return {
      isSyncing: false,
      pendingChanges: 0,
      conflicts: 0,
    };
  } catch {
    return {
      isSyncing: false,
      pendingChanges: 0,
      conflicts: 0,
    };
  }
}

/**
 * Atualiza status de sincronização
 */
export async function updateSyncStatus(): Promise<void> {
  try {
    const syncedFiles = await getSyncedFiles();
    const conflicts = await getConflicts();

    const status: SyncStatus = {
      isSyncing: false,
      lastSyncTime: new Date().toISOString(),
      pendingChanges: Object.keys(syncedFiles).length,
      conflicts: conflicts.length,
    };

    await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(status));
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
  }
}

/**
 * Detecta conflitos de sincronização
 */
export async function detectConflicts(
  localFile: PersistedFile,
  remoteFile: CloudFile
): Promise<SyncConflict | null> {
  try {
    // Comparar timestamps e conteúdo
    if (
      localFile.lastModified !== remoteFile.lastModified &&
      localFile.content !== remoteFile.content
    ) {
      return {
        fileId: localFile.id,
        localVersion: { ...localFile },
        remoteVersion: remoteFile,
        timestamp: new Date().toISOString(),
      };
    }

    return null;
  } catch (error) {
    console.error('Erro ao detectar conflitos:', error);
    return null;
  }
}

/**
 * Obtém conflitos pendentes
 */
export async function getConflicts(): Promise<SyncConflict[]> {
  try {
    const data = await AsyncStorage.getItem(CONFLICTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Resolve conflito (preferir versão local ou remota)
 */
export async function resolveConflict(
  conflict: SyncConflict,
  preferLocal: boolean
): Promise<void> {
  try {
    const conflicts = await getConflicts();
    const filtered = conflicts.filter(c => c.fileId !== conflict.fileId);

    await AsyncStorage.setItem(CONFLICTS_KEY, JSON.stringify(filtered));

    // Se preferir remota, atualizar ficheiro local
    if (!preferLocal) {
      // Atualizar ficheiro local com versão remota
      const syncedFiles = await getSyncedFiles();
      syncedFiles[conflict.fileId] = conflict.remoteVersion;
      await AsyncStorage.setItem(CLOUD_SYNC_KEY, JSON.stringify(syncedFiles));
    }

    await updateSyncStatus();
  } catch (error) {
    console.error('Erro ao resolver conflito:', error);
  }
}

/**
 * Obtém histórico de sincronização
 */
export async function getSyncHistory(): Promise<Array<{
  fileId: string;
  action: 'uploaded' | 'downloaded' | 'conflict';
  timestamp: string;
}>> {
  try {
    const syncedFiles = await getSyncedFiles();
    const history = Object.values(syncedFiles).map(file => ({
      fileId: file.id,
      action: 'uploaded' as const,
      timestamp: file.syncedAt || new Date(file.lastModified).toISOString(),
    }));

    return history.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch {
    return [];
  }
}

/**
 * Limpa dados de sincronização
 */
export async function clearSyncData(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CLOUD_SYNC_KEY);
    await AsyncStorage.removeItem(SYNC_STATUS_KEY);
    await AsyncStorage.removeItem(CONFLICTS_KEY);
  } catch (error) {
    console.error('Erro ao limpar dados de sincronização:', error);
  }
}

/**
 * Exporta ficheiros para cloud (backup)
 */
export async function exportToCloud(files: PersistedFile[]): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Utilizador não autenticado');
    }

    // Simulação de backup (em produção, chamar backend)
    const backup = {
      userId: user.id,
      timestamp: new Date().toISOString(),
      files: files,
      version: '1.0',
    };

    console.log('Backup criado:', backup);
    return true;
  } catch (error) {
    console.error('Erro ao exportar para cloud:', error);
    return false;
  }
}

/**
 * Importa ficheiros da cloud (restore)
 */
export async function importFromCloud(): Promise<PersistedFile[] | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Utilizador não autenticado');
    }

    // Simulação de restore (em produção, chamar backend)
    const syncedFiles = await getSyncedFiles();
    return Object.values(syncedFiles);
  } catch (error) {
    console.error('Erro ao importar da cloud:', error);
    return null;
  }
}
