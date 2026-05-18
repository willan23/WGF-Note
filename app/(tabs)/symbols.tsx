import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useEditor } from '@/lib/editor-context';
import { extractPythonSymbols } from '@/lib/python-analyzer';
import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { router } from 'expo-router';
import { getOffsetFromLineAndColumn } from '@/lib/editor-state';

export default function SymbolsScreen() {
  const colors = useColors();
  const { state, selectRange, currentLanguage } = useEditor();

  const symbols = useMemo(() => {
    if (!state.currentFile || currentLanguage !== 'python') return [];
    return extractPythonSymbols(state.currentFile.content);
  }, [currentLanguage, state.currentFile]);

  const styles = StyleSheet.create({
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
    },
    headerText: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.foreground,
    },
    symbolItem: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      alignItems: 'center',
    },
    symbolIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    symbolName: {
      fontSize: 15,
      color: colors.foreground,
      flex: 1,
      fontWeight: '600',
    },
    symbolLine: {
      fontSize: 12,
      color: colors.primary,
      backgroundColor: `${colors.primary}15`,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
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
  });

  const getSymbolIconInfo = (type: string) => {
    switch (type) {
      case 'function':
        return { name: 'code-outline' as const, color: colors.success };
      case 'class':
        return { name: 'cube-outline' as const, color: colors.primary };
      case 'variable':
        return { name: 'at-outline' as const, color: colors.warning };
      case 'import':
        return { name: 'download-outline' as const, color: colors.error };
      default:
        return { name: 'ellipse-outline' as const, color: colors.muted };
    }
  };

  const handleSymbolPress = (line: number) => {
    const offset = getOffsetFromLineAndColumn(
      state.currentFile?.content ?? '',
      Math.max(0, line - 1),
      0,
    );
    selectRange(offset, offset);
    router.push('/(tabs)');
  };

  const renderSymbolItem = ({ item, index }: { item: any, index: number }) => {
    const iconInfo = getSymbolIconInfo(item.type);
    return (
      <Pressable
        style={({ pressed }) => [
          styles.symbolItem,
          pressed && { backgroundColor: colors.surface },
        ]}
        onPress={() => handleSymbolPress(item.line)}
      >
        <View style={styles.symbolIconContainer}>
          <Ionicons name={iconInfo.name} size={18} color={iconInfo.color} />
        </View>
        <Text style={styles.symbolName}>{item.name}</Text>
        <Text style={styles.symbolLine}>L{item.line}</Text>
      </Pressable>
    );
  };

  return (
    <ScreenContainer className="flex-1 p-0">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Símbolos</Text>
        </View>
        {symbols.length > 0 ? (
          <FlatList
            data={symbols}
            renderItem={renderSymbolItem}
            keyExtractor={(item, index) => `${item.name}-${item.line}-${index}`}
            scrollEnabled
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color={colors.border} />
            <Text style={styles.emptyText}>
              {currentLanguage === 'python'
                ? 'Nenhum símbolo encontrado no ficheiro atual'
                : 'A lista de símbolos ainda está disponível apenas para Python'}
            </Text>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}
