import { View, Text, StyleSheet } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { CodeExecutionPanel } from '@/components/code-execution-panel';

export default function TerminalScreen() {
  const colors = useColors();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
      gap: 4,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.foreground,
    },
    text: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.muted,
    },
    panelWrap: {
      flex: 1,
      justifyContent: 'flex-end',
    },
  });

  return (
    <ScreenContainer className="flex-1 p-0">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Terminal Python</Text>
          <Text style={styles.text}>
            A execução acontece no backend autenticado e devolve stdout, stderr e timeout reais.
          </Text>
        </View>
        <View style={styles.panelWrap}>
          <CodeExecutionPanel />
        </View>
      </View>
    </ScreenContainer>
  );
}
