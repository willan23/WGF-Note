import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { listFiles } from '@/lib/file-system-manager';
import {
  listWorkspaceFiles,
  type WorkspaceFileEntry,
} from '@/lib/workspace-search';

type QuickOpenModalProps = {
  visible: boolean;
  onClose: () => void;
};

type ScoredFile = WorkspaceFileEntry & {
  score: number;
};

function scoreFile(file: WorkspaceFileEntry, query: string): number {
  if (!query) return 0;

  const normalizedQuery = query.toLocaleLowerCase();
  const normalizedName = file.name.toLocaleLowerCase();
  const normalizedPath = file.relativePath.toLocaleLowerCase();

  if (normalizedName === normalizedQuery) return 0;
  if (normalizedName.startsWith(normalizedQuery)) return 1;
  if (normalizedPath.startsWith(normalizedQuery)) return 2;
  if (normalizedName.includes(normalizedQuery)) return 3;
  if (normalizedPath.includes(normalizedQuery)) return 4;
  return Number.POSITIVE_INFINITY;
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.48)',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: 72,
    },
    modal: {
      width: '88%',
      maxWidth: 720,
      maxHeight: '72%',
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    input: {
      flex: 1,
      color: colors.foreground,
      fontSize: 15,
      paddingVertical: 0,
    },
    list: {
      paddingVertical: 6,
    },
    row: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      borderBottomWidth: 1,
      borderBottomColor: `${colors.border}66`,
    },
    rowSelected: {
      backgroundColor: `${colors.primary}16`,
    },
    rowPressed: {
      backgroundColor: `${colors.primary}10`,
    },
    rowMain: {
      flex: 1,
      gap: 2,
    },
    fileName: {
      color: colors.foreground,
      fontSize: 13,
      fontWeight: '700',
    },
    filePath: {
      color: colors.muted,
      fontSize: 11,
    },
    hint: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '700',
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 6,
      backgroundColor: colors.surface,
    },
    empty: {
      minHeight: 120,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
      gap: 10,
    },
    emptyText: {
      color: colors.muted,
      textAlign: 'center',
      fontSize: 13,
      lineHeight: 18,
    },
  });
}

export function QuickOpenModal({ visible, onClose }: QuickOpenModalProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    openFileFromSystemAtRange,
    workspaceRootUri,
  } = useEditor();
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState<WorkspaceFileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setSelectedIndex(0);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void listWorkspaceFiles(workspaceRootUri, { listFiles })
      .then((nextFiles) => {
        if (!cancelled) {
          setFiles(nextFiles);
        }
      })
      .catch((error) => {
        console.error('Erro ao carregar quick open:', error);
        if (!cancelled) {
          setFiles([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [visible, workspaceRootUri]);

  const filteredFiles = useMemo<ScoredFile[]>(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return files
      .map((file) => ({ ...file, score: scoreFile(file, normalizedQuery) }))
      .filter((file) => Number.isFinite(file.score))
      .sort((left, right) => {
        if (left.score !== right.score) return left.score - right.score;
        return left.relativePath.localeCompare(right.relativePath);
      })
      .slice(0, 80);
  }, [files, query]);

  useEffect(() => {
    setSelectedIndex((current) =>
      filteredFiles.length === 0 ? 0 : Math.min(current, filteredFiles.length - 1),
    );
  }, [filteredFiles.length]);

  const handleOpen = useCallback(
    async (file: WorkspaceFileEntry | undefined) => {
      if (!file) return;

      try {
        await openFileFromSystemAtRange(file.path, 0, 0);
        onClose();
      } catch (error) {
        console.error('Erro ao abrir ficheiro pelo quick open:', error);
      }
    },
    [onClose, openFileFromSystemAtRange],
  );

  const handleKeyPress = useCallback(
    (event: { nativeEvent: { key: string } }) => {
      const key = event.nativeEvent.key;

      if (key === 'ArrowDown') {
        setSelectedIndex((current) =>
          filteredFiles.length === 0 ? 0 : Math.min(current + 1, filteredFiles.length - 1),
        );
        return;
      }

      if (key === 'ArrowUp') {
        setSelectedIndex((current) => Math.max(current - 1, 0));
        return;
      }

      if (key === 'Enter') {
        void handleOpen(filteredFiles[selectedIndex]);
        return;
      }

      if (key === 'Escape') {
        onClose();
      }
    },
    [filteredFiles, handleOpen, onClose, selectedIndex],
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={() => undefined}>
          <View style={styles.header}>
            <Ionicons name="document-text-outline" size={18} color={colors.primary} />
            <TextInput
              accessibilityLabel="Ir para ficheiro"
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Ir para ficheiro…"
              placeholderTextColor={colors.muted}
              value={query}
              onChangeText={setQuery}
              onKeyPress={handleKeyPress}
              style={styles.input}
            />
          </View>

          {isLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.emptyText}>A mapear o workspace…</Text>
            </View>
          ) : filteredFiles.length > 0 ? (
            <FlatList
              data={filteredFiles}
              keyExtractor={(item) => item.path}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item, index }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir ${item.relativePath}`}
                  onPress={() => void handleOpen(item)}
                  style={({ pressed }) => [
                    styles.row,
                    index === selectedIndex && styles.rowSelected,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                  <View style={styles.rowMain}>
                    <Text style={styles.fileName}>{item.name}</Text>
                    <Text style={styles.filePath}>{item.relativePath}</Text>
                  </View>
                  {index === selectedIndex ? <Text style={styles.hint}>Enter</Text> : null}
                </Pressable>
              )}
            />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={32} color={colors.border} />
              <Text style={styles.emptyText}>
                {files.length === 0
                  ? 'Nenhum ficheiro editável encontrado neste workspace.'
                  : 'Nenhum ficheiro corresponde à pesquisa.'}
              </Text>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
