import { View, Text, FlatList, Pressable, StyleSheet, ScrollView } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';

interface LogEntry {
  id: string;
  message: string;
  type: 'log' | 'error' | 'warning' | 'success';
  timestamp: string;
}

const MOCK_LOGS: LogEntry[] = [
  { id: '1', message: 'Python Notepad++ iniciado', type: 'log', timestamp: '10:15:23' },
  { id: '2', message: 'Ficheiro carregado: main.py', type: 'success', timestamp: '10:15:24' },
  { id: '3', message: 'Aviso: Variável não utilizada na linha 5', type: 'warning', timestamp: '10:15:25' },
  { id: '4', message: 'Erro de sintaxe na linha 12: expected ":"', type: 'error', timestamp: '10:15:26' },
];

export default function TerminalScreen() {
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
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.foreground,
    },
    clearButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.primary,
      borderRadius: 4,
    },
    clearButtonText: {
      fontSize: 12,
      color: colors.background,
      fontWeight: '600',
    },
    logItem: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    logContent: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    logIcon: {
      fontSize: 12,
      marginRight: 8,
      width: 16,
      marginTop: 2,
    },
    logText: {
      flex: 1,
      fontSize: 12,
      fontFamily: 'Menlo',
    },
    logTime: {
      fontSize: 10,
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

  const getLogColor = (type: string) => {
    switch (type) {
      case 'error':
        return colors.error;
      case 'warning':
        return colors.warning;
      case 'success':
        return colors.success;
      default:
        return colors.foreground;
    }
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'success':
        return '✓';
      default:
        return '•';
    }
  };

  const renderLogItem = ({ item }: { item: LogEntry }) => (
    <View style={styles.logItem}>
      <View style={styles.logContent}>
        <Text style={[styles.logIcon, { color: getLogColor(item.type) }]}>
          {getLogIcon(item.type)}
        </Text>
        <Text
          style={[
            styles.logText,
            { color: getLogColor(item.type) },
          ]}
        >
          {item.message}
        </Text>
        <Text style={styles.logTime}>{item.timestamp}</Text>
      </View>
    </View>
  );

  return (
    <ScreenContainer className="flex-1 p-0">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Terminal</Text>
          <Pressable style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Limpar</Text>
          </Pressable>
        </View>
        {MOCK_LOGS.length > 0 ? (
          <FlatList
            data={MOCK_LOGS}
            renderItem={renderLogItem}
            keyExtractor={(item) => item.id}
            scrollEnabled
            inverted
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              Nenhuma mensagem no terminal
            </Text>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}
