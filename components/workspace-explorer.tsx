import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
  isDesktopRuntime,
  listFiles,
  pickProjectDirectoryFromSystem,
  renameFileOrDirectory,
  type FileInfo,
} from '@/lib/file-system-manager';
import {
  flattenProjectTree,
  getWorkspaceAncestorDirectoryUris,
  getWorkspaceUriKey,
  isPathInsideWorkspace,
  isWorkspacePathAffected,
  replaceWorkspacePathPrefix,
  type ProjectTreeRow,
} from '@/lib/workspace-tree';

type WorkspaceExplorerProps = {
  compact?: boolean;
  onFileOpened?: () => void;
  onRequestClose?: () => void;
};

type ExplorerRowProps = {
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
};

const ExplorerRow = memo(function ExplorerRow({
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
}: ExplorerRowProps) {
  const active = !item.isDirectory && activePath === item.uri;

  return (
    <View style={[styles.row, active && styles.rowActive]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.isDirectory ? `Pasta ${item.name}` : `Abrir ${item.name}`}
        accessibilityState={{
          expanded: item.isDirectory ? expanded : undefined,
          selected: active,
        }}
        onPress={() => {
          if (item.isDirectory) {
            onToggleDirectory(item);
            return;
          }

          onOpenFile(item);
        }}
        style={({ pressed }) => [
          styles.rowMain,
          { paddingLeft: 10 + item.depth * 16 },
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
                size={14}
                color={colors.muted}
              />
            )
          ) : null}
        </View>

        <Ionicons
          name={item.isDirectory ? (expanded ? 'folder-open' : 'folder') : 'document-text'}
          size={16}
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
              <Ionicons name="document-outline" size={14} color={colors.primary} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Criar pasta em ${item.name}`}
              style={styles.rowActionButton}
              onPress={() => onCreateInsideDirectory(item, 'folder')}
            >
              <Ionicons name="folder-outline" size={14} color={colors.primary} />
            </Pressable>
          </>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Renomear ${item.name}`}
          style={styles.rowActionButton}
          onPress={() => onRename(item)}
        >
          <Ionicons name="create-outline" size={14} color={colors.muted} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Eliminar ${item.name}`}
          style={styles.rowActionButton}
          onPress={() => onDelete(item)}
        >
          <Ionicons name="trash-outline" size={14} color={colors.error} />
        </Pressable>
      </View>
    </View>
  );
});

function createStyles(colors: ReturnType<typeof useColors>, compact: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRightWidth: compact ? 0 : 1,
      borderRightColor: colors.border,
    },
    header: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: compact ? 10 : 12,
      gap: 8,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    eyebrow: {
      color: colors.muted,
      fontSize: 10,
      textTransform: 'uppercase',
      fontWeight: '800',
      letterSpacing: 0.8,
    },
    title: {
      color: colors.foreground,
      fontSize: compact ? 15 : 16,
      fontWeight: '700',
      marginTop: 2,
    },
    subtitle: {
      color: colors.muted,
      fontSize: 10,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    sectionHeader: {
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      color: colors.muted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    openEditors: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: 4,
    },
    openEditorRow: {
      minHeight: 30,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingLeft: 12,
    },
    openEditorRowActive: {
      backgroundColor: `${colors.primary}18`,
    },
    openEditorButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    dirtyDot: {
      width: 10,
      color: colors.warning,
      fontSize: 10,
    },
    openEditorLabel: {
      flex: 1,
      color: colors.foreground,
      fontSize: 12,
    },
    openEditorLabelActive: {
      fontWeight: '700',
    },
    openEditorClose: {
      width: 28,
      minHeight: 30,
      alignItems: 'center',
      justifyContent: 'center',
    },
    openEditorsEmpty: {
      color: colors.muted,
      fontSize: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    iconButton: {
      width: 28,
      height: 28,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    listContent: {
      paddingVertical: 6,
    },
    treeList: {
      flex: 1,
    },
    row: {
      minHeight: 34,
      flexDirection: 'row',
      alignItems: 'center',
    },
    rowMain: {
      minHeight: 34,
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingRight: 4,
    },
    rowActive: {
      backgroundColor: `${colors.primary}18`,
    },
    rowPressed: {
      backgroundColor: `${colors.primary}10`,
    },
    iconSlot: {
      width: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: {
      flex: 1,
      color: colors.foreground,
      fontSize: 12,
    },
    rowLabelActive: {
      color: colors.foreground,
      fontWeight: '700',
    },
    rowActions: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingRight: 4,
    },
    rowActionButton: {
      width: 24,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    form: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 8,
    },
    formTitle: {
      color: colors.foreground,
      fontSize: 12,
      fontWeight: '700',
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      color: colors.foreground,
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 12,
    },
    formButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    formButton: {
      flex: 1,
      borderRadius: 6,
      paddingVertical: 8,
      alignItems: 'center',
    },
    formButtonPrimary: {
      backgroundColor: colors.primary,
    },
    formButtonSecondary: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    formButtonText: {
      color: colors.background,
      fontSize: 12,
      fontWeight: '700',
    },
    formButtonTextSecondary: {
      color: colors.foreground,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    emptyText: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'center',
      marginTop: 10,
    },
    loadingText: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 10,
    },
  });
}

export function WorkspaceExplorer({
  compact = false,
  onFileOpened,
  onRequestClose,
}: WorkspaceExplorerProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors, compact), [colors, compact]);
  const {
    state,
    openFile,
    closeFile,
    openFileFromSystem,
    renameWorkspacePath,
    removeWorkspacePath,
    workspaceRootUri: rootDirectoryUri,
    setWorkspaceRootUri,
  } = useEditor();
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
        setChildrenByDirectory((current) => ({ ...current, [key]: children }));
      } finally {
        setLoadingDirectoryUris((current) => current.filter((uri) => uri !== key));
      }
    },
    [childrenByDirectory],
  );

  useEffect(() => {
    void loadDirectory(rootDirectoryUri);
  }, [loadDirectory, rootDirectoryUri]);

  useEffect(() => {
    if (!isPathInsideWorkspace(rootDirectoryUri, activePath)) return;

    const ancestors = getWorkspaceAncestorDirectoryUris(rootDirectoryUri, activePath);
    const directoriesToExpand = ancestors.slice(1);

    setExpandedDirectoryUris((current) =>
      Array.from(new Set([...current, ...directoriesToExpand.map(getWorkspaceUriKey)])),
    );

    void Promise.all(ancestors.map((directoryUri) => loadDirectory(directoryUri)));
  }, [activePath, loadDirectory, rootDirectoryUri]);

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
        onFileOpened?.();
      } catch (error) {
        console.error('Erro ao abrir ficheiro pelo explorador:', error);
      }
    },
    [onFileOpened, openFileFromSystem],
  );

  const handleRefresh = useCallback(async () => {
    await loadDirectory(rootDirectoryUri, true);
    await Promise.all(
      expandedDirectoryUris.map((directoryUri) => loadDirectory(directoryUri, true)),
    );
  }, [expandedDirectoryUris, loadDirectory, rootDirectoryUri]);

  const handleOpenWorkspace = useCallback(async () => {
    const uri = await pickProjectDirectoryFromSystem();
    if (!uri) return;

    setWorkspaceRootUri(uri);
    setChildrenByDirectory({});
    setExpandedDirectoryUris([]);
    await loadDirectory(uri, true);
  }, [loadDirectory, setWorkspaceRootUri]);

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
      console.error('Erro ao criar pelo explorador:', error);
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
      console.error('Erro ao renomear pelo explorador:', error);
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
                    current.filter((uri) => !isWorkspacePathAffected(uri, item.uri, true)),
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
                console.error('Erro ao eliminar pelo explorador:', error);
              }
            },
          },
        ],
      );
    },
    [refreshDirectory, removeWorkspacePath],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Workspace</Text>
            <Text style={styles.title}>Explorador</Text>
          </View>

          <View style={styles.headerActions}>
            {isDesktopRuntime() ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Abrir pasta de projeto"
                style={styles.iconButton}
                onPress={handleOpenWorkspace}
              >
                <Ionicons name="folder-open-outline" size={16} color={colors.primary} />
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Criar ficheiro na raiz"
              style={styles.iconButton}
              onPress={() => beginCreate(rootDirectoryUri, 'file')}
            >
              <Ionicons name="document-outline" size={16} color={colors.primary} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Criar pasta na raiz"
              style={styles.iconButton}
              onPress={() => beginCreate(rootDirectoryUri, 'folder')}
            >
              <Ionicons name="folder-outline" size={16} color={colors.primary} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Atualizar árvore"
              style={styles.iconButton}
              onPress={handleRefresh}
            >
              <Ionicons name="refresh" size={16} color={colors.primary} />
            </Pressable>
            {onRequestClose ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fechar árvore"
                style={styles.iconButton}
                onPress={onRequestClose}
              >
                <Ionicons name="close" size={16} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <Text style={styles.subtitle} numberOfLines={1}>
          {rootDirectoryUri}
        </Text>
      </View>

      <Text style={styles.sectionHeader}>Ficheiros abertos</Text>
      <View style={styles.openEditors}>
        {state.openFiles.length > 0 ? (
          state.openFiles.map((file) => {
            const active = state.currentFile?.id === file.id;

            return (
              <View
                key={file.id}
                style={[styles.openEditorRow, active && styles.openEditorRowActive]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Selecionar editor ${file.name}`}
                  onPress={() => openFile(file)}
                  style={styles.openEditorButton}
                >
                  <Text style={styles.dirtyDot}>{file.isModified ? '●' : ''}</Text>
                  <Text
                    style={[styles.openEditorLabel, active && styles.openEditorLabelActive]}
                    numberOfLines={1}
                  >
                    {file.name}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Fechar ${file.name}`}
                  style={styles.openEditorClose}
                  onPress={() => closeFile(file.id)}
                >
                  <Ionicons name="close" size={14} color={colors.muted} />
                </Pressable>
              </View>
            );
          })
        ) : (
          <Text style={styles.openEditorsEmpty}>Nenhum editor aberto</Text>
        )}
      </View>

      <Text style={styles.sectionHeader}>Projeto</Text>

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
            placeholder={createTarget.kind === 'file' ? 'ex: main.py' : 'Nome da pasta'}
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <View style={styles.formButtons}>
            <Pressable style={[styles.formButton, styles.formButtonPrimary]} onPress={handleCreate}>
              <Text style={styles.formButtonText}>Criar</Text>
            </Pressable>
            <Pressable
              style={[styles.formButton, styles.formButtonSecondary]}
              onPress={() => {
                setCreateTarget(null);
                setNewEntryName('');
              }}
            >
              <Text style={[styles.formButtonText, styles.formButtonTextSecondary]}>Cancelar</Text>
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
            <Pressable style={[styles.formButton, styles.formButtonPrimary]} onPress={handleRename}>
              <Text style={styles.formButtonText}>Renomear</Text>
            </Pressable>
            <Pressable
              style={[styles.formButton, styles.formButtonSecondary]}
              onPress={() => {
                setRenameTarget(null);
                setRenameValue('');
              }}
            >
              <Text style={[styles.formButtonText, styles.formButtonTextSecondary]}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {rows.length > 0 ? (
        <FlatList
          data={rows}
          style={styles.treeList}
          renderItem={({ item }) => (
            <ExplorerRow
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
          <Ionicons name="folder-open-outline" size={42} color={colors.border} />
          <Text style={styles.emptyText}>
            O workspace ainda está vazio. Cria ficheiros para começarmos a desenhar o mapa.
          </Text>
        </View>
      )}
    </View>
  );
}
