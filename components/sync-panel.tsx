import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import {
  getSyncStatus,
  getCurrentUser,
  getSyncHistory,
  getConflicts,
  SyncStatus,
  CloudUser,
} from '@/lib/cloud-sync';

interface SyncPanelProps {
  visible: boolean;
  onClose?: () => void;
  onLogin?: () => void;
  onSync?: () => void;
}

export function SyncPanel({
  visible,
  onClose,
  onLogin,
  onSync,
}: SyncPanelProps) {
  const colors = useColors();
  const [user, setUser] = useState<CloudUser | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (visible) {
      loadSyncData();
    }
  }, [visible]);

  const loadSyncData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (currentUser) {
        const status = await getSyncStatus();
        setSyncStatus(status);

        const syncHistory = await getSyncHistory();
        setHistory(syncHistory.slice(0, 5)); // Últimas 5 sincronizações
      }
    } catch (error) {
      console.error('Erro ao carregar dados de sincronização:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      maxHeight: '70%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    title: {
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
    content: {
      padding: 16,
    },
    section: {
      marginBottom: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    userCard: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    userName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 4,
    },
    userEmail: {
      fontSize: 12,
      color: colors.muted,
    },
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
      paddingVertical: 8,
    },
    statusLabel: {
      fontSize: 13,
      color: colors.foreground,
    },
    statusValue: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    button: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 6,
      alignItems: 'center',
      marginBottom: 8,
    },
    buttonSecondary: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.background,
    },
    buttonTextSecondary: {
      color: colors.foreground,
    },
    historyItem: {
      paddingVertical: 8,
      paddingHorizontal: 8,
      backgroundColor: colors.surface,
      borderRadius: 4,
      marginBottom: 6,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    historyText: {
      fontSize: 12,
      color: colors.foreground,
    },
    historyTime: {
      fontSize: 11,
      color: colors.muted,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 20,
    },
    emptyText: {
      fontSize: 13,
      color: colors.muted,
      textAlign: 'center',
    },
    conflictBadge: {
      backgroundColor: colors.error,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      marginTop: 8,
    },
    conflictText: {
      fontSize: 11,
      color: colors.background,
      fontWeight: '600',
    },
  });

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>☁️ Sincronização Cloud</Text>
        {onClose && (
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : user ? (
          <>
            {/* Utilizador */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Conta</Text>
              <View style={styles.userCard}>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
            </View>

            {/* Status de Sincronização */}
            {syncStatus && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Status</Text>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Última sincronização:</Text>
                  <Text style={styles.statusValue}>
                    {syncStatus.lastSyncTime
                      ? new Date(syncStatus.lastSyncTime).toLocaleDateString('pt-PT')
                      : 'Nunca'}
                  </Text>
                </View>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Ficheiros sincronizados:</Text>
                  <Text style={styles.statusValue}>{syncStatus.pendingChanges}</Text>
                </View>
                {syncStatus.conflicts > 0 && (
                  <View style={styles.conflictBadge}>
                    <Text style={styles.conflictText}>
                      ⚠️ {syncStatus.conflicts} conflito(s) detectado(s)
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Ações */}
            <View style={styles.section}>
              <Pressable style={styles.button} onPress={onSync}>
                <Text style={styles.buttonText}>🔄 Sincronizar Agora</Text>
              </Pressable>
            </View>

            {/* Histórico */}
            {history.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Histórico Recente</Text>
                {history.map((item, idx) => (
                  <View key={idx} style={styles.historyItem}>
                    <Text style={styles.historyText}>
                      {item.action === 'uploaded' ? '📤' : '📥'} {item.fileId}
                    </Text>
                    <Text style={styles.historyTime}>
                      {new Date(item.timestamp).toLocaleTimeString('pt-PT')}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            {/* Não autenticado */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Autenticação</Text>
              <Text style={styles.emptyText}>
                Faça login para sincronizar seus ficheiros na cloud
              </Text>
              <Pressable style={styles.button} onPress={onLogin}>
                <Text style={styles.buttonText}>🔐 Fazer Login</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
