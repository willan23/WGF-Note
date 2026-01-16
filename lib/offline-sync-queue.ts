/**
 * Offline Sync Queue Service
 * Gerencia fila de sincronização para operações offline
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
// import NetInfo from '@react-native-community/netinfo';

export interface SyncQueueItem {
  id: string;
  action: 'save' | 'delete' | 'update' | 'create';
  fileId: string;
  fileName: string;
  content: string;
  language: 'python' | 'html' | 'css';
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
}

export interface OfflineState {
  isOnline: boolean;
  lastSyncTime: number | null;
  pendingChanges: number;
  failedChanges: number;
  isSyncing: boolean;
}

const QUEUE_STORAGE_KEY = 'sync-queue';
const OFFLINE_STATE_KEY = 'offline-state';
const MAX_RETRIES = 3;
const SYNC_INTERVAL = 30000; // 30 segundos

let syncQueue: SyncQueueItem[] = [];
let offlineState: OfflineState = {
  isOnline: true,
  lastSyncTime: null,
  pendingChanges: 0,
  failedChanges: 0,
  isSyncing: false,
};

let syncIntervalId: ReturnType<typeof setInterval> | null = null;
let netInfoUnsubscribe: (() => void) | null = null; // NetInfo unsubscribe
let syncCallbacks: Array<(state: OfflineState) => void> = [];

/**
 * Inicializa o serviço de sincronização offline
 */
export async function initializeOfflineSync(): Promise<void> {
  try {
    // Carregar fila do armazenamento
    const storedQueue = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    if (storedQueue) {
      syncQueue = JSON.parse(storedQueue);
    }

    // Carregar estado offline
    const storedState = await AsyncStorage.getItem(OFFLINE_STATE_KEY);
    if (storedState) {
      offlineState = JSON.parse(storedState);
    }

  // Monitorar conectividade (NetInfo seria importado em produção)
  // netInfoUnsubscribe = NetInfo.addEventListener(handleConnectivityChange);
  // const state = await NetInfo.fetch();
  // offlineState.isOnline = state.isConnected ?? true;
  
  // Para desenvolvimento, assumir que está online
  offlineState.isOnline = true;

    // Iniciar sincronização automática
    startAutoSync();
  } catch (error) {
    console.error('Erro ao inicializar sincronização offline:', error);
  }
}

/**
 * Limpa recursos do serviço
 */
export function cleanupOfflineSync(): void {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }

  if (netInfoUnsubscribe) {
    netInfoUnsubscribe();
    netInfoUnsubscribe = null;
  }

  syncCallbacks = [];
}

/**
 * Adiciona item à fila de sincronização
 */
export async function addToSyncQueue(
  action: SyncQueueItem['action'],
  fileId: string,
  fileName: string,
  content: string,
  language: SyncQueueItem['language']
): Promise<SyncQueueItem> {
  const item: SyncQueueItem = {
    id: `${fileId}-${Date.now()}`,
    action,
    fileId,
    fileName,
    content,
    language,
    timestamp: Date.now(),
    retryCount: 0,
    maxRetries: MAX_RETRIES,
    status: 'pending',
  };

  syncQueue.push(item);
  offlineState.pendingChanges = syncQueue.filter(i => i.status === 'pending').length;

  await saveSyncQueue();
  notifyStateChange();

  // Tentar sincronizar se online
  if (offlineState.isOnline) {
    await syncPendingChanges();
  }

  return item;
}

/**
 * Remove item da fila
 */
export async function removeFromSyncQueue(itemId: string): Promise<void> {
  syncQueue = syncQueue.filter(i => i.id !== itemId);
  offlineState.pendingChanges = syncQueue.filter(i => i.status === 'pending').length;

  await saveSyncQueue();
  notifyStateChange();
}

/**
 * Obtém fila de sincronização
 */
export function getSyncQueue(): SyncQueueItem[] {
  return [...syncQueue];
}

/**
 * Obtém estado offline
 */
export function getOfflineState(): OfflineState {
  return { ...offlineState };
}

/**
 * Sincroniza mudanças pendentes
 */
export async function syncPendingChanges(): Promise<{
  successful: number;
  failed: number;
}> {
  if (offlineState.isSyncing || !offlineState.isOnline) {
    return { successful: 0, failed: 0 };
  }

  offlineState.isSyncing = true;
  notifyStateChange();

  let successful = 0;
  let failed = 0;

  const pendingItems = syncQueue.filter(i => i.status === 'pending');

  for (const item of pendingItems) {
    try {
      item.status = 'syncing';
      notifyStateChange();

      // Simular sincronização com backend
      const success = await syncItemToBackend(item);

      if (success) {
        await removeFromSyncQueue(item.id);
        successful++;
      } else {
        item.retryCount++;

        if (item.retryCount >= item.maxRetries) {
          item.status = 'failed';
          item.error = 'Máximo de tentativas atingido';
          offlineState.failedChanges++;
        } else {
          item.status = 'pending';
        }

        failed++;
      }
    } catch (error) {
      item.retryCount++;

      if (item.retryCount >= item.maxRetries) {
        item.status = 'failed';
        item.error = error instanceof Error ? error.message : 'Erro desconhecido';
        offlineState.failedChanges++;
      } else {
        item.status = 'pending';
      }

      failed++;
    }

    await saveSyncQueue();
    notifyStateChange();
  }

  offlineState.isSyncing = false;
  offlineState.lastSyncTime = Date.now();
  offlineState.pendingChanges = syncQueue.filter(i => i.status === 'pending').length;

  await saveOfflineState();
  notifyStateChange();

  return { successful, failed };
}

/**
 * Limpa itens com falha
 */
export async function clearFailedItems(): Promise<void> {
  syncQueue = syncQueue.filter(i => i.status !== 'failed');
  offlineState.failedChanges = 0;

  await saveSyncQueue();
  notifyStateChange();
}

/**
 * Retenta sincronização de itens com falha
 */
export async function retryFailedItems(): Promise<{
  successful: number;
  failed: number;
}> {
  const failedItems = syncQueue.filter(i => i.status === 'failed');

  for (const item of failedItems) {
    item.status = 'pending';
    item.retryCount = 0;
    item.error = undefined;
  }

  await saveSyncQueue();
  notifyStateChange();

  return syncPendingChanges();
}

/**
 * Subscreve a mudanças de estado offline
 */
export function subscribeToOfflineState(callback: (state: OfflineState) => void): () => void {
  syncCallbacks.push(callback);

  return () => {
    syncCallbacks = syncCallbacks.filter(cb => cb !== callback);
  };
}

/**
 * Handlers privados
 */

async function handleConnectivityChange(state: any): Promise<void> {
  const wasOnline = offlineState.isOnline;
  offlineState.isOnline = state.isConnected ?? true;

  if (!wasOnline && offlineState.isOnline) {
    // Voltou online - sincronizar
    await syncPendingChanges();
  }

  notifyStateChange();
}

async function syncItemToBackend(item: SyncQueueItem): Promise<boolean> {
  try {
    // Simular chamada ao backend
    // Em produção, isto seria uma chamada HTTP real
    await new Promise(resolve => setTimeout(resolve, 500));

    // Simular sucesso aleatório para testes
    return Math.random() > 0.1; // 90% de sucesso
  } catch (error) {
    console.error('Erro ao sincronizar item:', error);
    return false;
  }
}

function startAutoSync(): void {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
  }

  syncIntervalId = setInterval(async () => {
    if (offlineState.isOnline && !offlineState.isSyncing) {
      await syncPendingChanges();
    }
  }, SYNC_INTERVAL);
}

async function saveSyncQueue(): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(syncQueue));
  } catch (error) {
    console.error('Erro ao guardar fila de sincronização:', error);
  }
}

async function saveOfflineState(): Promise<void> {
  try {
    await AsyncStorage.setItem(OFFLINE_STATE_KEY, JSON.stringify(offlineState));
  } catch (error) {
    console.error('Erro ao guardar estado offline:', error);
  }
}

function notifyStateChange(): void {
  syncCallbacks.forEach(callback => {
    try {
      callback(getOfflineState());
    } catch (error) {
      console.error('Erro ao notificar mudança de estado:', error);
    }
  });
}

/**
 * Exporta função para testes
 */
export function _resetForTesting(): void {
  syncQueue = [];
  offlineState = {
    isOnline: true,
    lastSyncTime: null,
    pendingChanges: 0,
    failedChanges: 0,
    isSyncing: false,
  };
  syncCallbacks = [];
}
