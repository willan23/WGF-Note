import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';

interface Symbol {
  id: string;
  name: string;
  type: 'function' | 'class' | 'variable';
  line: number;
}

const MOCK_SYMBOLS: Symbol[] = [
  { id: '1', name: 'main', type: 'function', line: 1 },
  { id: '2', name: 'MyClass', type: 'class', line: 10 },
  { id: '3', name: 'helper_function', type: 'function', line: 25 },
  { id: '4', name: 'CONFIG', type: 'variable', line: 5 },
];

export default function SymbolsScreen() {
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
    symbolItem: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      alignItems: 'center',
    },
    symbolIcon: {
      fontSize: 16,
      marginRight: 12,
      width: 24,
    },
    symbolName: {
      fontSize: 14,
      color: colors.foreground,
      flex: 1,
      fontWeight: '500',
    },
    symbolLine: {
      fontSize: 12,
      color: colors.muted,
      marginLeft: 8,
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

  const getSymbolIcon = (type: string) => {
    switch (type) {
      case 'function':
        return 'ƒ';
      case 'class':
        return 'C';
      case 'variable':
        return 'v';
      default:
        return '•';
    }
  };

  const renderSymbolItem = ({ item }: { item: Symbol }) => (
    <Pressable
      style={({ pressed }) => [
        styles.symbolItem,
        pressed && { backgroundColor: colors.surface },
      ]}
    >
      <Text style={styles.symbolIcon}>{getSymbolIcon(item.type)}</Text>
      <Text style={styles.symbolName}>{item.name}</Text>
      <Text style={styles.symbolLine}>Linha {item.line}</Text>
    </Pressable>
  );

  return (
    <ScreenContainer className="flex-1 p-0">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Símbolos</Text>
        </View>
        {MOCK_SYMBOLS.length > 0 ? (
          <FlatList
            data={MOCK_SYMBOLS}
            renderItem={renderSymbolItem}
            keyExtractor={(item) => item.id}
            scrollEnabled
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              Nenhum símbolo encontrado
            </Text>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}
