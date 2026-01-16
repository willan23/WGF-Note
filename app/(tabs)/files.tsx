import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
}

const MOCK_FILES: FileItem[] = [
  { id: '1', name: 'main.py', type: 'file' },
  { id: '2', name: 'utils.py', type: 'file' },
  { id: '3', name: 'config.py', type: 'file' },
  { id: '4', name: 'tests', type: 'folder' },
  { id: '5', name: 'data', type: 'folder' },
];

export default function FilesScreen() {
  const colors = useColors();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.foreground,
    },
    fileItem: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      alignItems: 'center',
    },
    fileIcon: {
      fontSize: 20,
      marginRight: 12,
      width: 24,
    },
    fileName: {
      fontSize: 14,
      color: colors.foreground,
      flex: 1,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    emptyText: {
      fontSize: 14,
      color: colors.muted,
      textAlign: 'center',
    },
  });

  const renderFileItem = ({ item }: { item: FileItem }) => (
    <Pressable
      style={({ pressed }) => [
        styles.fileItem,
        pressed && { backgroundColor: colors.surface },
      ]}
    >
      <Text style={styles.fileIcon}>
        {item.type === 'file' ? '📄' : '📁'}
      </Text>
      <Text style={styles.fileName}>{item.name}</Text>
    </Pressable>
  );

  return (
    <ScreenContainer className="flex-1 p-0">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Ficheiros do Projeto</Text>
        </View>
        {MOCK_FILES.length > 0 ? (
          <FlatList
            data={MOCK_FILES}
            renderItem={renderFileItem}
            keyExtractor={(item) => item.id}
            scrollEnabled
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              Nenhum ficheiro encontrado
            </Text>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}
