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
  listFiles,
  deleteFileOrDirectory,
  FileInfo,
} from '@/lib/file-system-manager';
import { getRecentFiles, RecentFile } from '@/lib/recent-files-manager';

interface FileManagerProps {
  visible: boolean;
  onSelectFile: (file: FileInfo | RecentFile) => void;
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
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileInput, setShowNewFileInput] = useState(false);

  useEffect(() => {
    if (visible) {
      loadFiles();
    }
  }, [visible]);

  const loadFiles = async () => {
    try {
      const allFiles = await listFiles();
      const recent = await getRecentFiles();
      setFiles(allFiles);
      setRecentFiles(recent);
    } catch (error) {
      console.error('Erro ao carregar ficheiros:', error);
    }
  };

  const handleDeleteFile = useCallback(
    (path: string, fileName: string) => {
      Alert.alert(
        'Eliminar Ficheiro',
        `Tem a certeza que deseja eliminar "${fileName}"?`,
        [
          {
            text: 'Cancelar',
            onPress: () => { },
            style: 'cancel',
          },
          {
            text: 'Eliminar',
            onPress: async () => {
              try {
                await deleteFileOrDirectory(path);
                await loadFiles();
              } catch (error) {
                console.error('Erro ao eliminar:', error);
              }
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

  const renderFileItem = ({ item }: { item: FileInfo | RecentFile }) => {
    const isRecent = 'lastOpened' in item;
    const path = isRecent ? (item as RecentFile).path : (item as FileInfo).uri;
    const name = item.name;
    const modificationTime = isRecent ? (item as RecentFile).lastOpened : (item as FileInfo).modificationTime;
    const date = modificationTime ? new Date(modificationTime).toLocaleDateString('pt-PT') : 'N/A';
    const language = isRecent ? (item as RecentFile).language : '';

    return (
      <Pressable
        style={styles.fileItem}
        onPress={() => {
          onSelectFile(item);
          onClose();
        }}
      >
        <View style={styles.fileInfo}>
          <Text style={styles.fileName}>{name}</Text>
          <Text style={styles.fileDetails}>
            {language ? `${language.toUpperCase()} • ` : ''}{date}
          </Text>
        </View>
        {!isRecent && (
          <View style={styles.fileActions}>
            <Pressable
              style={styles.actionButton}
              onPress={() => handleDeleteFile(path, name)}
            >
              <Text style={styles.actionText}>🗑️</Text>
            </Pressable>
          </View>
        )}
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

          {activeTab === 'all' ? (
            files.length > 0 ? (
              <FlatList
                data={files}
                renderItem={renderFileItem}
                keyExtractor={item => item.uri}
                scrollEnabled={true}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Nenhum ficheiro criado ainda</Text>
              </View>
            )
          ) : (
            recentFiles.length > 0 ? (
              <FlatList
                data={recentFiles}
                renderItem={renderFileItem}
                keyExtractor={item => item.id}
                scrollEnabled={true}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Nenhum ficheiro recente</Text>
              </View>
            )
          )}
        </View>
      </View>
    </Modal>
  );
}
