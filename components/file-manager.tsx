import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  StyleSheet,
  FlatList,
  TextInput,
  Alert,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import {
  getAllFiles,
  deleteFile,
  getRecentFiles,
  PersistedFile,
} from '@/lib/file-persistence';

interface FileManagerProps {
  visible: boolean;
  onSelectFile: (file: PersistedFile) => void;
  onCreateNew: (name: string) => void;
  onClose: () => void;
}

type TabType = 'all' | 'recent';

export function FileManager({
  visible,
  onSelectFile,
  onCreateNew,
  onClose,
}: FileManagerProps) {
  const colors = useColors();
  const [files, setFiles] = useState<PersistedFile[]>([]);
  const [recentFiles, setRecentFiles] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileInput, setShowNewFileInput] = useState(false);

  useEffect(() => {
    if (visible) {
      loadFiles();
    }
  }, [visible]);

  const loadFiles = async () => {
    const allFiles = await getAllFiles();
    const recent = await getRecentFiles();
    setFiles(allFiles);
    setRecentFiles(recent);
  };

  const handleDeleteFile = useCallback(
    (fileId: string, fileName: string) => {
      Alert.alert(
        'Eliminar Ficheiro',
        `Tem a certeza que deseja eliminar "${fileName}"?`,
        [
          {
            text: 'Cancelar',
            onPress: () => {},
            style: 'cancel',
          },
          {
            text: 'Eliminar',
            onPress: async () => {
              await deleteFile(fileId);
              await loadFiles();
            },
            style: 'destructive',
          },
        ]
      );
    },
    []
  );

  const handleCreateNew = useCallback(() => {
    if (newFileName.trim()) {
      onCreateNew(newFileName);
      setNewFileName('');
      setShowNewFileInput(false);
      onClose();
    }
  }, [newFileName, onCreateNew, onClose]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modal: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 16,
      maxHeight: '90%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.foreground,
    },
    closeButton: {
      padding: 8,
    },
    closeText: {
      fontSize: 20,
      color: colors.muted,
    },
    tabs: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    tab: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    tabText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.foreground,
    },
    tabTextActive: {
      color: colors.background,
    },
    newFileSection: {
      marginBottom: 16,
      gap: 8,
    },
    newFileInput: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.foreground,
      fontSize: 14,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 8,
    },
    button: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      alignItems: 'center',
    },
    buttonPrimary: {
      backgroundColor: colors.primary,
    },
    buttonSecondary: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.background,
    },
    buttonTextSecondary: {
      color: colors.foreground,
    },
    fileItem: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      borderRadius: 6,
      marginBottom: 8,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    fileInfo: {
      flex: 1,
    },
    fileName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 2,
    },
    fileDetails: {
      fontSize: 11,
      color: colors.muted,
    },
    fileActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      padding: 6,
    },
    actionText: {
      fontSize: 16,
    },
    emptyState: {
      padding: 20,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: colors.muted,
      textAlign: 'center',
    },
  });

  const displayFiles =
    activeTab === 'all'
      ? files
      : files.filter(f =>
          recentFiles.some(rf => rf.id === f.id)
        );

  const renderFileItem = ({ item }: { item: PersistedFile }) => {
    const date = new Date(item.lastModified).toLocaleDateString('pt-PT');

    return (
      <Pressable
        style={styles.fileItem}
        onPress={() => {
          onSelectFile(item);
          onClose();
        }}
      >
        <View style={styles.fileInfo}>
          <Text style={styles.fileName}>{item.name}</Text>
          <Text style={styles.fileDetails}>
            {item.language.toUpperCase()} • {date}
          </Text>
        </View>
        <View style={styles.fileActions}>
          <Pressable
            style={styles.actionButton}
            onPress={() => handleDeleteFile(item.id, item.name)}
          >
            <Text style={styles.actionText}>🗑️</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Gestor de Ficheiros</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          {showNewFileInput ? (
            <View style={styles.newFileSection}>
              <TextInput
                style={styles.newFileInput}
                placeholder="Nome do ficheiro (ex: script.py)"
                placeholderTextColor={colors.muted}
                value={newFileName}
                onChangeText={setNewFileName}
                autoFocus
              />
              <View style={styles.buttonRow}>
                <Pressable
                  style={[styles.button, styles.buttonPrimary]}
                  onPress={handleCreateNew}
                >
                  <Text style={styles.buttonText}>Criar</Text>
                </Pressable>
                <Pressable
                  style={[styles.button, styles.buttonSecondary]}
                  onPress={() => {
                    setShowNewFileInput(false);
                    setNewFileName('');
                  }}
                >
                  <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                    Cancelar
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={[styles.button, styles.buttonPrimary, { marginBottom: 16 }]}
              onPress={() => setShowNewFileInput(true)}
            >
              <Text style={styles.buttonText}>+ Novo Ficheiro</Text>
            </Pressable>
          )}

          <View style={styles.tabs}>
            <Pressable
              style={[styles.tab, activeTab === 'all' && styles.tabActive]}
              onPress={() => setActiveTab('all')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'all' && styles.tabTextActive,
                ]}
              >
                Todos ({files.length})
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'recent' && styles.tabActive]}
              onPress={() => setActiveTab('recent')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'recent' && styles.tabTextActive,
                ]}
              >
                Recentes ({recentFiles.length})
              </Text>
            </Pressable>
          </View>

          {displayFiles.length > 0 ? (
            <FlatList
              data={displayFiles}
              renderItem={renderFileItem}
              keyExtractor={item => item.id}
              scrollEnabled={true}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {activeTab === 'all'
                  ? 'Nenhum ficheiro criado ainda'
                  : 'Nenhum ficheiro recente'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
