import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { useEditor } from '@/lib/editor-context';
import {
  createDirectory,
  createFile,
  deleteFileOrDirectory,
  getProjectsDirectoryUri,
  listFiles,
  renameFileOrDirectory,
  type FileInfo,
} from '@/lib/file-system-manager';
import {
  flattenProjectTree,
  getWorkspaceAncestorDirectoryUris,
  getWorkspaceUriKey,
  isWorkspacePathAffected,
  isPathInsideWorkspace,
  replaceWorkspacePathPrefix,
  type ProjectTreeRow,
} from '@/lib/workspace-tree';

interface ProjectTreeProps {
  visible: boolean;
  onClose: () => void;
}

interface TreeRowProps {
  item: ProjectTreeRow;
  activePath: string | null;
  expanded: boolean;
  loading: boolean;
  onOpenFile: (file: FileInfo) => void;
  onToggleDirectory: (directory: FileInfo) => void;
  onCreateInsideDirectory: (directory: FileInfo, kind: 'file' | 'folder') => void;
  onRename: (item: FileInfo) => void;
  onDelete: (item: FileInfo) => void;
  styles: ReturnType<typeof createStyles>;
  colors: ReturnType<typeof useColors>;
}

const TreeRow = memo(function TreeRow({
  item,
  activePath,
  expanded,
  loading,
  onOpenFile,
  onToggleDirectory,
  onCreateInsideDirectory,
  onRename,
  onDelete,
  styles,
  colors,
}: TreeRowProps) {
  const active = !item.isDirectory && activePath === item.uri;

  return (
    <View style={[styles.row, active && styles.rowActive]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.isDirectory ? `Pasta ${item.name}` : `Abrir ${item.name}`}
        accessibilityState={{ expanded: item.isDirectory ? expanded : undefined, selected: active }}
        onPress={() => {
          if (item.isDirectory) {
            onToggleDirectory(item);
            return;
          }

          onOpenFile(item);
        }}
        style={({ pressed }) => [
          styles.rowMain,
          { paddingLeft: 14 + item.depth * 18 },
          pressed && styles.rowPressed,
        ]}
      >
        <View style={styles.iconSlot}>
          {item.isDirectory ? (
            loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons
                name={expanded ? 'chevron-down' : 'chevron-forward'}
                size={16}
                color={colors.muted}
              />
            )
          ) : null}
        </View>

        <Ionicons
          name={item.isDirectory ? (expanded ? 'folder-open' : 'folder') : 'document-text'}
          size={18}
          color={item.isDirectory ? colors.warning : active ? colors.primary : colors.foreground}
        />

        <Text style={[styles.rowLabel, active && styles.rowLabelActive]} numberOfLines={1}>
          {item.name}
        </Text>
      </Pressable>

      <View style={styles.rowActions}>
        {item.isDirectory ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Criar ficheiro em ${item.name}`}
              style={styles.rowActionButton}
              onPress={() => onCreateInsideDirectory(item, 'file')}
            >
              <Ionicons name="document-outline" size={16} color={colors.primary} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Criar pasta em ${item.name}`}
              style={styles.rowActionButton}
              onPress={() => onCreateInsideDirectory(item, 'folder')}
            >
              <Ionicons name="folder-outline" size={16} color={colors.primary} />
            </Pressable>
          </>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Renomear ${item.name}`}
          style={styles.rowActionButton}
          onPress={() => onRename(item)}
        >
          <Ionicons name="create-outline" size={16} color={colors.muted} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Eliminar ${item.name}`}
          style={styles.rowActionButton}
          onPress={() => onDelete(item)}
        >
          <Ionicons name="trash-outline" size={16} color={colors.error} />
        </Pressable>
      </View>
    </View>
  );
});

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modal: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: '82%',
      minHeight: '45%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    eyebrow: {
      color: colors.muted,
      fontSize: 11,
      textTransform: 'uppercase',
      fontWeight: '700',
      marginBottom: 2,
    },
    title: {
      color: colors.foreground,
      fontSize: 18,
      fontWeight: '700',
    },
    subtitle: {
      color: colors.muted,
      fontSize: 11,
      marginTop: 3,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    iconButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    listContent: {
      paddingVertical: 8,
    },
    row: {
      minHeight: 42,
      flexDirection: 'row',
      alignItems: 'center',
    },
    rowMain: {
      minHeight: 42,
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingRight: 8,
    },
    rowActive: {
      backgroundColor: `${colors.primary}12`,
    },
    rowPressed: {
      backgroundColor: `${colors.primary}08`,
    },
    iconSlot: {
      width: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: {
      flex: 1,
      color: colors.foreground,
      fontSize: 14,
    },
    rowLabelActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    rowActions: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingRight: 8,
    },
    rowActionButton: {
      width: 28,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    form: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 8,
    },
    formTitle: {
      color: colors.foreground,
      fontSize: 13,
      fontWeight: '700',
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.foreground,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
    },
    formButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    formButton: {
      flex: 1,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
    },
    formButtonPrimary: {
      backgroundColor: colors.primary,
    },
    formButtonSecondary: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    formButtonText: {
      color: colors.background,
      fontSize: 13,
      fontWeight: '700',
    },
    formButtonTextSecondary: {
      color: colors.foreground,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 28,
    },
    emptyText: {
      color: colors.muted,
      fontSize: 14,
      textAlign: 'center',
      marginTop: 10,
    },
    loadingText: {
      color: colors.muted,
      fontSize: 13,
      marginTop: 10,
    },
  });
}

export function ProjectTree({ visible, onClose }: ProjectTreeProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { state, openFileFromSystem, renameWorkspacePath, removeWorkspacePath } = useEditor();
  const rootDirectoryUri = useMemo(() => getProjectsDirectoryUri(), []);
  const [childrenByDirectory, setChildrenByDirectory] = useState<Record<string, FileInfo[]>>({});
  const [expandedDirectoryUris, setExpandedDirectoryUris] = useState<string[]>([]);
  const [loadingDirectoryUris, setLoadingDirectoryUris] = useState<string[]>([]);
  const [createTarget, setCreateTarget] = useState<{
    parentUri: string;
    kind: 'file' | 'folder';
  } | null>(null);
  const [newEntryName, setNewEntryName] = useState('');
  const [renameTarget, setRenameTarget] = useState<FileInfo | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const activePath = state.currentFile?.path ?? null;
  const expandedSet = useMemo(
    () => new Set(expandedDirectoryUris.map(getWorkspaceUriKey)),
    [expandedDirectoryUris],
  );
  const loadingSet = useMemo(
    () => new Set(loadingDirectoryUris.map(getWorkspaceUriKey)),
    [loadingDirectoryUris],
  );
  const rows = useMemo(
    () => flattenProjectTree(rootDirectoryUri, childrenByDirectory, expandedSet),
    [childrenByDirectory, expandedSet, rootDirectoryUri],
  );
  const rootLoading = loadingSet.has(getWorkspaceUriKey(rootDirectoryUri));

  const loadDirectory = useCallback(
    async (directoryUri: string, force = false) => {
      const key = getWorkspaceUriKey(directoryUri);
      if (!force && childrenByDirectory[key]) return;

      setLoadingDirectoryUris((current) =>
        current.includes(key) ? current : [...current, key],
      );

      try {
        const children = await listFiles(directoryUri);
        setChildrenByDirectory((current) => ({
          ...current,
          [key]: children,
        }));
      } finally {
        setLoadingDirectoryUris((current) => current.filter((uri) => uri !== key));
      }
    },
    [childrenByDirectory],
  );

  useEffect(() => {
    if (!visible) return;
    void loadDirectory(rootDirectoryUri);
  }, [loadDirectory, rootDirectoryUri, visible]);

  useEffect(() => {
    if (!visible || !isPathInsideWorkspace(rootDirectoryUri, activePath)) return;

    const ancestors = getWorkspaceAncestorDirectoryUris(rootDirectoryUri, activePath);
    const directoriesToExpand = ancestors.slice(1);

    setExpandedDirectoryUris((current) =>
      Array.from(new Set([...current, ...directoriesToExpand.map(getWorkspaceUriKey)])),
    );

    void Promise.all(ancestors.map((directoryUri) => loadDirectory(directoryUri)));
  }, [activePath, loadDirectory, rootDirectoryUri, visible]);

  const handleToggleDirectory = useCallback(
    (directory: FileInfo) => {
      const key = getWorkspaceUriKey(directory.uri);
      const isExpanded = expandedSet.has(key);

      setExpandedDirectoryUris((current) =>
        isExpanded ? current.filter((uri) => uri !== key) : [...current, key],
      );

      if (!isExpanded) {
        void loadDirectory(directory.uri);
      }
    },
    [expandedSet, loadDirectory],
  );

  const handleOpenFile = useCallback(
    async (file: FileInfo) => {
      try {
        await openFileFromSystem(file.uri);
        onClose();
      } catch (error) {
        console.error('Erro ao abrir ficheiro pela árvore:', error);
      }
    },
    [onClose, openFileFromSystem],
  );

  const handleRefresh = useCallback(async () => {
    await loadDirectory(rootDirectoryUri, true);
    await Promise.all(
      expandedDirectoryUris.map((directoryUri) => loadDirectory(directoryUri, true)),
    );
  }, [expandedDirectoryUris, loadDirectory, rootDirectoryUri]);

  const refreshDirectory = useCallback(
    async (directoryUri: string) => {
      await loadDirectory(directoryUri, true);
    },
    [loadDirectory],
  );

  const beginCreate = useCallback((parentUri: string, kind: 'file' | 'folder') => {
    setCreateTarget({ parentUri, kind });
    setNewEntryName('');
  }, []);

  const handleCreate = useCallback(async () => {
    const trimmedName = newEntryName.trim();
    if (!createTarget || !trimmedName) return;

    try {
      setExpandedDirectoryUris((current) =>
        current.includes(getWorkspaceUriKey(createTarget.parentUri))
          ? current
          : [...current, getWorkspaceUriKey(createTarget.parentUri)],
      );

      if (createTarget.kind === 'file') {
        const uri = await createFile(trimmedName, '', createTarget.parentUri);
        await refreshDirectory(createTarget.parentUri);
        await openFileFromSystem(uri);
      } else {
        const uri = await createDirectory(trimmedName, createTarget.parentUri);
        await refreshDirectory(createTarget.parentUri);
        await refreshDirectory(uri);
      }

      setCreateTarget(null);
      setNewEntryName('');
    } catch (error) {
      console.error('Erro ao criar pela árvore:', error);
    }
  }, [createTarget, newEntryName, openFileFromSystem, refreshDirectory]);

  const beginRename = useCallback((item: FileInfo) => {
    setRenameTarget(item);
    setRenameValue(item.name);
  }, []);

  const handleRename = useCallback(async () => {
    const trimmedName = renameValue.trim();
    if (!renameTarget || !trimmedName) return;

    if (trimmedName === renameTarget.name) {
      setRenameTarget(null);
      setRenameValue('');
      return;
    }

    try {
      const oldPath = renameTarget.uri;
      const newPath = await renameFileOrDirectory(
        renameTarget.uri,
        trimmedName,
        renameTarget.isDirectory,
      );
      await renameWorkspacePath(oldPath, newPath, renameTarget.isDirectory);

      const parentUri = oldPath.slice(0, oldPath.lastIndexOf('/') + 1);
      await refreshDirectory(parentUri);

      if (renameTarget.isDirectory) {
        const nextExpandedDirectoryUris = expandedDirectoryUris.map((uri) =>
          isWorkspacePathAffected(uri, oldPath, true)
            ? replaceWorkspacePathPrefix(uri, oldPath, newPath)
            : uri,
        );
        setExpandedDirectoryUris(nextExpandedDirectoryUris);
        await Promise.all(
          nextExpandedDirectoryUris.map((directoryUri) => refreshDirectory(directoryUri)),
        );
      }

      setRenameTarget(null);
      setRenameValue('');
    } catch (error) {
      console.error('Erro ao renomear pela árvore:', error);
    }
  }, [
    expandedDirectoryUris,
    refreshDirectory,
    renameTarget,
    renameValue,
    renameWorkspacePath,
  ]);

  const handleDelete = useCallback(
    (item: FileInfo) => {
      Alert.alert(
        item.isDirectory ? 'Eliminar pasta' : 'Eliminar ficheiro',
        `Tem a certeza que deseja eliminar "${item.name}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteFileOrDirectory(item.uri, item.isDirectory);
                await removeWorkspacePath(item.uri, item.isDirectory);

                const parentUri = item.uri.slice(0, item.uri.lastIndexOf('/') + 1);
                await refreshDirectory(parentUri);

                if (item.isDirectory) {
                  setExpandedDirectoryUris((current) =>
                    current.filter(
                      (uri) => !isWorkspacePathAffected(uri, item.uri, true),
                    ),
                  );
                  setChildrenByDirectory((current) =>
                    Object.fromEntries(
                      Object.entries(current).filter(
                        ([uri]) => !isWorkspacePathAffected(uri, item.uri, true),
                      ),
                    ),
                  );
                }
              } catch (error) {
                console.error('Erro ao eliminar pela árvore:', error);
              }
            },
          },
        ],
      );
    },
    [refreshDirectory, removeWorkspacePath],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>Workspace</Text>
              <Text style={styles.title}>Projetos locais</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {rootDirectoryUri}
              </Text>
            </View>

            <View style={styles.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Criar ficheiro na raiz"
                style={styles.iconButton}
                onPress={() => beginCreate(rootDirectoryUri, 'file')}
              >
                <Ionicons name="document-outline" size={18} color={colors.primary} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Criar pasta na raiz"
                style={styles.iconButton}
                onPress={() => beginCreate(rootDirectoryUri, 'folder')}
              >
                <Ionicons name="folder-outline" size={18} color={colors.primary} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Atualizar árvore"
                style={styles.iconButton}
                onPress={handleRefresh}
              >
                <Ionicons name="refresh" size={18} color={colors.primary} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fechar árvore"
                style={styles.iconButton}
                onPress={onClose}
              >
                <Ionicons name="close" size={20} color={colors.muted} />
              </Pressable>
            </View>
          </View>

          {createTarget ? (
            <View style={styles.form}>
              <Text style={styles.formTitle}>
                {createTarget.kind === 'file' ? 'Novo ficheiro' : 'Nova pasta'}
              </Text>
              <TextInput
                accessibilityLabel="Nome da nova entrada"
                autoFocus
                value={newEntryName}
                onChangeText={setNewEntryName}
                placeholder={
                  createTarget.kind === 'file'
                    ? 'ex: main.py'
                    : 'Nome da pasta'
                }
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
              <View style={styles.formButtons}>
                <Pressable
                  style={[styles.formButton, styles.formButtonPrimary]}
                  onPress={handleCreate}
                >
                  <Text style={styles.formButtonText}>Criar</Text>
                </Pressable>
                <Pressable
                  style={[styles.formButton, styles.formButtonSecondary]}
                  onPress={() => {
                    setCreateTarget(null);
                    setNewEntryName('');
                  }}
                >
                  <Text style={[styles.formButtonText, styles.formButtonTextSecondary]}>
                    Cancelar
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {renameTarget ? (
            <View style={styles.form}>
              <Text style={styles.formTitle}>Renomear {renameTarget.name}</Text>
              <TextInput
                accessibilityLabel="Novo nome"
                autoFocus
                value={renameValue}
                onChangeText={setRenameValue}
                placeholder="Novo nome"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
              <View style={styles.formButtons}>
                <Pressable
                  style={[styles.formButton, styles.formButtonPrimary]}
                  onPress={handleRename}
                >
                  <Text style={styles.formButtonText}>Renomear</Text>
                </Pressable>
                <Pressable
                  style={[styles.formButton, styles.formButtonSecondary]}
                  onPress={() => {
                    setRenameTarget(null);
                    setRenameValue('');
                  }}
                >
                  <Text style={[styles.formButtonText, styles.formButtonTextSecondary]}>
                    Cancelar
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {rows.length > 0 ? (
            <FlatList
              data={rows}
              renderItem={({ item }) => (
                <TreeRow
                  item={item}
                  activePath={activePath}
                  expanded={expandedSet.has(getWorkspaceUriKey(item.uri))}
                  loading={loadingSet.has(getWorkspaceUriKey(item.uri))}
                  onOpenFile={handleOpenFile}
                  onToggleDirectory={handleToggleDirectory}
                  onCreateInsideDirectory={(directory, kind) => beginCreate(directory.uri, kind)}
                  onRename={beginRename}
                  onDelete={handleDelete}
                  styles={styles}
                  colors={colors}
                />
              )}
              keyExtractor={(item) => item.uri}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          ) : rootLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>A carregar workspace…</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={48} color={colors.border} />
              <Text style={styles.emptyText}>
                O workspace ainda está vazio. Cria ficheiros no gestor para começarmos a desenhar o mapa.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
