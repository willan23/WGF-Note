import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import {
  getOfflineState,
  subscribeToOfflineState,
  syncPendingChanges,
  clearFailedItems,
  retryFailedItems,
  getSyncQueue,
  OfflineState,
} from '@/lib/offline-sync-queue';

interface OfflineIndicatorProps {
  visible?: boolean;
}

export function OfflineIndicator({ visible = true }: OfflineIndicatorProps) {
  const colors = useColors();
  const [offlineState, setOfflineState] = useState<OfflineState>(getOfflineState());
  const [showDetails, setShowDetails] = useState(false);
  const [syncQueue, setSyncQueue] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToOfflineState((state) => {
      setOfflineState(state);
      setSyncQueue(getSyncQueue());
    });

    return unsubscribe;
  }, []);

  const styles = StyleSheet.create({
    indicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      backgroundColor: offlineState.isOnline ? colors.success : colors.warning,
    },
    indicatorText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.background,
    },
    badge: {
      backgroundColor: colors.error,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 3,
      minWidth: 20,
      alignItems: 'center',
    },
    badgeText: {
      fontSize: 9,
      fontWeight: '700',
      color: colors.background,
    },
    modal: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      maxHeight: '80%',
      paddingBottom: 20,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
    },
    closeButton: {
      padding: 8,
    },
    closeText: {
      fontSize: 18,
      color: colors.muted,
    },
    section: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
      paddingVertical: 6,
    },
    statusLabel: {
      fontSize: 12,
      color: colors.foreground,
    },
    statusValue: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
    },
    button: {
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonSecondary: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.background,
    },
    buttonTextSecondary: {
      color: colors.foreground,
    },
    queueItem: {
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 4,
      marginBottom: 6,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    queueItemName: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.foreground,
      marginBottom: 2,
    },
    queueItemStatus: {
      fontSize: 10,
      color: colors.muted,
    },
    emptyText: {
      fontSize: 12,
      color: colors.muted,
      fontStyle: 'italic',
      textAlign: 'center',
      paddingVertical: 12,
    },
    syncingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
  });

  if (!visible) {
    return null;
  }

  const handleSync = async () => {
    await syncPendingChanges();
  };

  const handleClearFailed = async () => {
    await clearFailedItems();
  };

  const handleRetryFailed = async () => {
    await retryFailedItems();
  };

  return (
    <>
      <Pressable
        style={styles.indicator}
        onPress={() => setShowDetails(true)}
      >
        <Text style={styles.indicatorText}>
          {offlineState.isOnline ? '✓ Online' : '✗ Offline'}
        </Text>

        {offlineState.pendingChanges > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{offlineState.pendingChanges}</Text>
          </View>
        )}

        {offlineState.isSyncing && (
          <ActivityIndicator color={colors.background} size="small" />
        )}
      </Pressable>

      <Modal
        visible={showDetails}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetails(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📡 Sincronização Offline</Text>
              <Pressable
                style={styles.closeButton}
                onPress={() => setShowDetails(false)}
              >
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Status */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Status</Text>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Conectividade:</Text>
                  <Text
                    style={[
                      styles.statusValue,
                      {
                        color: offlineState.isOnline ? colors.success : colors.warning,
                      },
                    ]}
                  >
                    {offlineState.isOnline ? '🟢 Online' : '🔴 Offline'}
                  </Text>
                </View>

                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Mudanças pendentes:</Text>
                  <Text style={styles.statusValue}>{offlineState.pendingChanges}</Text>
                </View>

                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Falhas:</Text>
                  <Text
                    style={[
                      styles.statusValue,
                      {
                        color:
                          offlineState.failedChanges > 0 ? colors.error : colors.success,
                      },
                    ]}
                  >
                    {offlineState.failedChanges}
                  </Text>
                </View>

                {offlineState.lastSyncTime && (
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Última sincronização:</Text>
                    <Text style={styles.statusValue}>
                      {new Date(offlineState.lastSyncTime).toLocaleTimeString('pt-PT')}
                    </Text>
                  </View>
                )}
              </View>

              {/* Ações */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ações</Text>

                <Pressable
                  style={styles.button}
                  onPress={handleSync}
                  disabled={offlineState.isSyncing || !offlineState.isOnline}
                >
                  {offlineState.isSyncing ? (
                    <View style={styles.syncingContainer}>
                      <ActivityIndicator color={colors.background} size="small" />
                      <Text style={styles.buttonText}>A sincronizar...</Text>
                    </View>
                  ) : (
                    <Text style={styles.buttonText}>🔄 Sincronizar Agora</Text>
                  )}
                </Pressable>

                {offlineState.failedChanges > 0 && (
                  <>
                    <Pressable
                      style={[styles.button, styles.buttonSecondary]}
                      onPress={handleRetryFailed}
                    >
                      <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                        🔁 Tentar Novamente
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[styles.button, styles.buttonSecondary]}
                      onPress={handleClearFailed}
                    >
                      <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                        🗑️ Limpar Falhas
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>

              {/* Fila de sincronização */}
              {syncQueue.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Fila de Sincronização</Text>

                  {syncQueue.map((item) => (
                    <View key={item.id} style={styles.queueItem}>
                      <Text style={styles.queueItemName}>
                        {item.action === 'save' ? '💾' : '📝'} {item.fileName}
                      </Text>
                      <Text style={styles.queueItemStatus}>
                        {item.status === 'pending'
                          ? '⏳ Pendente'
                          : item.status === 'syncing'
                            ? '🔄 Sincronizando'
                            : '❌ Falha'}{' '}
                        ({item.retryCount}/{item.maxRetries})
                      </Text>
                      {item.error && (
                        <Text
                          style={[styles.queueItemStatus, { color: colors.error }]}
                        >
                          {item.error}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {syncQueue.length === 0 && offlineState.pendingChanges === 0 && (
                <View style={styles.section}>
                  <Text style={styles.emptyText}>
                    ✓ Tudo sincronizado! Nenhuma mudança pendente.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
