import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  getParentDirectoryUri,
  getProjectsDirectoryUri,
  listFiles,
  type FileInfo,
} from '@/lib/file-system-manager';
import { useEditor } from '@/lib/editor-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function FilesScreen() {
  const colors = useColors();
  const { openFileFromSystem } = useEditor();
  const rootDirectoryUri = useMemo(() => getProjectsDirectoryUri(), []);
  const [currentDirectoryUri, setCurrentDirectoryUri] = useState(rootDirectoryUri);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadFiles = useCallback(async () => {
    try {
      setFiles(await listFiles(currentDirectoryUri));
    } catch (error) {
      console.error('Erro ao carregar ficheiros:', error);
    }
  }, [currentDirectoryUri]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFiles();
    setRefreshing(false);
  }, [loadFiles]);

  const handleFilePress = async (file: FileInfo) => {
    if (file.isDirectory) {
      setCurrentDirectoryUri(file.uri);
      return;
    }

    try {
      await openFileFromSystem(file.uri);
      router.push('/(tabs)');
    } catch (error) {
      console.error('Erro ao abrir ficheiro:', error);
    }
  };

  const handleGoUp = useCallback(() => {
    const parent = getParentDirectoryUri(currentDirectoryUri);
    if (parent && currentDirectoryUri !== rootDirectoryUri) {
      setCurrentDirectoryUri(parent);
    }
  }, [currentDirectoryUri, rootDirectoryUri]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        header: {
          paddingHorizontal: 20,
          paddingVertical: 16,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap: 8,
        },
        headerTopRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        headerText: {
          fontSize: 20,
          fontWeight: '700',
          color: colors.foreground,
        },
        pathText: {
          fontSize: 11,
          color: colors.muted,
        },
        fileItem: {
          flexDirection: 'row',
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          alignItems: 'center',
        },
        fileIconContainer: {
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: colors.surface,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 14,
        },
        fileName: {
          fontSize: 15,
          color: colors.foreground,
          flex: 1,
          fontWeight: '500',
        },
        fileSize: {
          fontSize: 11,
          color: colors.muted,
          marginTop: 2,
        },
        emptyState: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 40,
        },
        emptyText: {
          fontSize: 16,
          color: colors.muted,
          textAlign: 'center',
          marginTop: 12,
        },
      }),
    [colors.background, colors.border, colors.foreground, colors.muted, colors.surface],
  );

  const renderFileItem = ({ item }: { item: FileInfo }) => (
    <Pressable
      style={({ pressed }) => [styles.fileItem, pressed && { backgroundColor: colors.surface }]}
      onPress={() => handleFilePress(item)}
    >
      <View style={styles.fileIconContainer}>
        <Ionicons
          name={item.isDirectory ? 'folder' : 'document-text'}
          size={22}
          color={item.isDirectory ? colors.warning : colors.primary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.fileName}>{item.name}</Text>
        <Text style={styles.fileSize}>
          {item.isDirectory
            ? 'Pasta'
            : `${(item.size / 1024).toFixed(1)} KB • ${
                item.modificationTime
                  ? new Date(item.modificationTime).toLocaleDateString()
                  : 'N/A'
              }`}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.border} />
    </Pressable>
  );

  return (
    <ScreenContainer className="flex-1 p-0">
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Pressable
              onPress={handleGoUp}
              disabled={currentDirectoryUri === rootDirectoryUri}
              style={{ opacity: currentDirectoryUri === rootDirectoryUri ? 0.35 : 1 }}
            >
              <Ionicons name="arrow-up" size={20} color={colors.primary} />
            </Pressable>
            <Text style={styles.headerText}>Ficheiros</Text>
            <Pressable onPress={onRefresh}>
              <Ionicons name="refresh" size={20} color={colors.primary} />
            </Pressable>
          </View>
          <Text style={styles.pathText}>{currentDirectoryUri}</Text>
        </View>
        {files.length > 0 ? (
          <FlatList
            data={files}
            renderItem={renderFileItem}
            keyExtractor={(item) => item.uri}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={64} color={colors.border} />
            <Text style={styles.emptyText}>
              Nenhum ficheiro encontrado neste diretório
            </Text>
            <Pressable
              onPress={onRefresh}
              style={{ marginTop: 20, padding: 10, backgroundColor: colors.primary, borderRadius: 8 }}
            >
              <Text style={{ color: colors.background, fontWeight: '600' }}>Atualizar</Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}
