import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import {
  createDirectory,
  createFile,
  deleteFileOrDirectory,
  fileExists,
  getParentDirectoryUri,
  isDesktopRuntime,
  listFiles,
  pickFilesFromSystem,
  pickProjectDirectoryFromSystem,
  renameFileOrDirectory,
  type FileInfo,
} from '@/lib/file-system-manager';
import {
  getRecentFiles,
  removeRecentFile,
  type RecentFile,
} from '@/lib/recent-files-manager';
import { useEditor } from '@/lib/editor-context';

interface FileManagerProps {
  visible: boolean;
  onSelectFile: (file: FileInfo | RecentFile) => void;
  onClose: () => void;
}

type TabType = 'all' | 'recent';
type CreateMode = 'file' | 'folder' | null;

export function FileManager({
  visible,
  onSelectFile,
  onClose,
}: FileManagerProps) {
  const colors = useColors();
  const {
    renameWorkspacePath,
    removeWorkspacePath,
    workspaceRootUri: rootDirectoryUri,
    setWorkspaceRootUri,
  } = useEditor();
  const [currentDirectoryUri, setCurrentDirectoryUri] = useState(rootDirectoryUri);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [createMode, setCreateMode] = useState<CreateMode>(null);
  const [newEntryName, setNewEntryName] = useState('');
  const [renamingItem, setRenamingItem] = useState<FileInfo | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const loadFiles = useCallback(async () => {
    try {
      const [allFiles, recent] = await Promise.all([
        listFiles(currentDirectoryUri),
        getRecentFiles(),
      ]);
      setFiles(allFiles);
      setRecentFiles(recent);
    } catch (error) {
      console.error('Erro ao carregar ficheiros:', error);
    }
  }, [currentDirectoryUri]);

  useEffect(() => {
    if (visible) {
      loadFiles();
    }
  }, [loadFiles, visible]);

  useEffect(() => {
    setCurrentDirectoryUri(rootDirectoryUri);
  }, [rootDirectoryUri]);

  const handleDeleteFile = useCallback(
    (file: FileInfo) => {
      Alert.alert(
        file.isDirectory ? 'Eliminar Pasta' : 'Eliminar Ficheiro',
        `Tem a certeza que deseja eliminar "${file.name}"?`,
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Eliminar',
            onPress: async () => {
              try {
                await deleteFileOrDirectory(file.uri, file.isDirectory);
                await removeWorkspacePath(file.uri, file.isDirectory);
                await loadFiles();
              } catch (error) {
                console.error('Erro ao eliminar:', error);
              }
            },
            style: 'destructive',
          },
        ],
      );
    },
    [loadFiles, removeWorkspacePath],
  );

  const handleCreateEntry = useCallback(async () => {
    const trimmedName = newEntryName.trim();
    if (!trimmedName || !createMode) return;

    try {
      if (createMode === 'file') {
        const uri = await createFile(trimmedName, '', currentDirectoryUri);
        onSelectFile({
          uri,
          name: trimmedName,
          size: 0,
          modificationTime: Date.now(),
          isDirectory: false,
        });
        onClose();
      } else {
        await createDirectory(trimmedName, currentDirectoryUri);
        await loadFiles();
      }

      setCreateMode(null);
      setNewEntryName('');
    } catch (error) {
      console.error('Erro ao criar entrada:', error);
    }
  }, [
    createMode,
    currentDirectoryUri,
    loadFiles,
    newEntryName,
    onClose,
    onSelectFile,
  ]);

  const handleRename = useCallback(async () => {
    if (!renamingItem || !renameValue.trim()) return;

    try {
      const renamedUri = await renameFileOrDirectory(
        renamingItem.uri,
        renameValue.trim(),
        renamingItem.isDirectory,
      );
      await renameWorkspacePath(renamingItem.uri, renamedUri, renamingItem.isDirectory);
      setRenamingItem(null);
      setRenameValue('');
      await loadFiles();
    } catch (error) {
      console.error('Erro ao renomear:', error);
    }
  }, [loadFiles, renameValue, renameWorkspacePath, renamingItem]);

  const handleSelectRecentFile = useCallback(
    async (file: RecentFile) => {
      if (!(await fileExists(file.path))) {
        await removeRecentFile(file.id);
        await loadFiles();
        Alert.alert('Ficheiro indisponível', 'Este ficheiro já não existe no dispositivo.');
        return;
      }

      onSelectFile(file);
      onClose();
    },
    [loadFiles, onClose, onSelectFile],
  );

  const handleSelectFile = useCallback(
    (file: FileInfo) => {
      if (file.isDirectory) {
        setCurrentDirectoryUri(file.uri);
        return;
      }

      onSelectFile(file);
      onClose();
    },
    [onClose, onSelectFile],
  );

  const handleGoUp = useCallback(() => {
    const parent = getParentDirectoryUri(currentDirectoryUri);
    if (parent && currentDirectoryUri !== rootDirectoryUri) {
      setCurrentDirectoryUri(parent);
    }
  }, [currentDirectoryUri, rootDirectoryUri]);

  const handleImportFiles = useCallback(async () => {
    const importedFiles = await pickFilesFromSystem();
    const firstFile = importedFiles.find((file) => !file.isDirectory);
    if (!firstFile) return;

    onSelectFile(firstFile);
    onClose();
  }, [onClose, onSelectFile]);

  const handleOpenWorkspace = useCallback(async () => {
    const uri = await pickProjectDirectoryFromSystem();
    if (!uri) return;

    setWorkspaceRootUri(uri);
    setCurrentDirectoryUri(uri);
  }, [setWorkspaceRootUri]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
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
          marginBottom: 12,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        title: {
          fontSize: 18,
          fontWeight: '600',
          color: colors.foreground,
        },
        pathText: {
          fontSize: 11,
          color: colors.muted,
          marginTop: 4,
        },
        closeButton: {
          padding: 8,
        },
        closeText: {
          fontSize: 20,
          color: colors.muted,
        },
        navRow: {
          flexDirection: 'row',
          gap: 8,
          marginBottom: 12,
        },
        tabs: {
          flexDirection: 'row',
          gap: 8,
          marginBottom: 12,
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
        inputSection: {
          marginBottom: 16,
          gap: 8,
        },
        input: {
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
      }),
    [
      colors.background,
      colors.border,
      colors.foreground,
      colors.muted,
      colors.primary,
      colors.surface,
    ],
  );

  const renderFileItem = ({ item }: { item: FileInfo }) => {
    const date = item.modificationTime
      ? new Date(item.modificationTime).toLocaleDateString('pt-PT')
      : 'N/A';

    return (
      <Pressable style={styles.fileItem} onPress={() => handleSelectFile(item)}>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName}>{item.isDirectory ? `📁 ${item.name}` : item.name}</Text>
          <Text style={styles.fileDetails}>
            {item.isDirectory ? 'Pasta' : `${(item.size / 1024).toFixed(1)} KB`} • {date}
          </Text>
        </View>
        <View style={styles.fileActions}>
          <Pressable
            style={styles.actionButton}
            onPress={() => {
              setRenamingItem(item);
              setRenameValue(item.name);
            }}
          >
            <Text style={styles.actionText}>✏️</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={() => handleDeleteFile(item)}>
            <Text style={styles.actionText}>🗑️</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  const renderRecentItem = ({ item }: { item: RecentFile }) => (
    <Pressable style={styles.fileItem} onPress={() => handleSelectRecentFile(item)}>
      <View style={styles.fileInfo}>
        <Text style={styles.fileName}>{item.name}</Text>
        <Text style={styles.fileDetails}>
          {(item.language ?? 'ficheiro').toUpperCase()} •{' '}
          {new Date(item.lastOpened).toLocaleDateString('pt-PT')}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Gestor de Ficheiros</Text>
              <Text style={styles.pathText}>{currentDirectoryUri}</Text>
            </View>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.navRow}>
            <Pressable
              style={[styles.button, styles.buttonSecondary]}
              onPress={handleGoUp}
              disabled={currentDirectoryUri === rootDirectoryUri}
            >
              <Text style={[styles.buttonText, styles.buttonTextSecondary]}>↑ Subir</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.buttonPrimary]}
              onPress={() => setCreateMode('file')}
            >
              <Text style={styles.buttonText}>+ Ficheiro</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => setCreateMode('folder')}
            >
              <Text style={[styles.buttonText, styles.buttonTextSecondary]}>+ Pasta</Text>
            </Pressable>
          </View>

          {isDesktopRuntime() ? (
            <View style={styles.navRow}>
              <Pressable
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleImportFiles}
              >
                <Text style={styles.buttonText}>Abrir ficheiro do PC</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.buttonSecondary]}
                onPress={handleOpenWorkspace}
              >
                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                  Abrir pasta de projeto
                </Text>
              </Pressable>
            </View>
          ) : null}

          {createMode ? (
            <View style={styles.inputSection}>
              <TextInput
                style={styles.input}
                placeholder={
                  createMode === 'file'
                    ? 'Nome do ficheiro (ex: script.py)'
                    : 'Nome da pasta'
                }
                placeholderTextColor={colors.muted}
                value={newEntryName}
                onChangeText={setNewEntryName}
                autoFocus
              />
              <View style={styles.buttonRow}>
                <Pressable
                  style={[styles.button, styles.buttonPrimary]}
                  onPress={handleCreateEntry}
                >
                  <Text style={styles.buttonText}>Criar</Text>
                </Pressable>
                <Pressable
                  style={[styles.button, styles.buttonSecondary]}
                  onPress={() => {
                    setCreateMode(null);
                    setNewEntryName('');
                  }}
                >
                  <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Cancelar</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {renamingItem ? (
            <View style={styles.inputSection}>
              <TextInput
                style={styles.input}
                placeholder="Novo nome"
                placeholderTextColor={colors.muted}
                value={renameValue}
                onChangeText={setRenameValue}
                autoFocus
              />
              <View style={styles.buttonRow}>
                <Pressable
                  style={[styles.button, styles.buttonPrimary]}
                  onPress={handleRename}
                >
                  <Text style={styles.buttonText}>Renomear</Text>
                </Pressable>
                <Pressable
                  style={[styles.button, styles.buttonSecondary]}
                  onPress={() => {
                    setRenamingItem(null);
                    setRenameValue('');
                  }}
                >
                  <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Cancelar</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={styles.tabs}>
            <Pressable
              style={[styles.tab, activeTab === 'all' && styles.tabActive]}
              onPress={() => setActiveTab('all')}
            >
              <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
                Todos ({files.length})
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'recent' && styles.tabActive]}
              onPress={() => setActiveTab('recent')}
            >
              <Text style={[styles.tabText, activeTab === 'recent' && styles.tabTextActive]}>
                Recentes ({recentFiles.length})
              </Text>
            </Pressable>
          </View>

          {activeTab === 'all' ? (
            files.length > 0 ? (
              <FlatList
                data={files}
                renderItem={renderFileItem}
                keyExtractor={(item) => item.uri}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Nenhum ficheiro neste diretório</Text>
              </View>
            )
          ) : recentFiles.length > 0 ? (
            <FlatList
              data={recentFiles}
              renderItem={renderRecentItem}
              keyExtractor={(item) => item.path}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Nenhum ficheiro recente</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
