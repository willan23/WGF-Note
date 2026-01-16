import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { useEditor } from '@/lib/editor-context';
import { executePythonCode, validatePythonCode, formatExecutionOutput } from '@/lib/python-executor';

export function CodeExecutionPanel() {
  const colors = useColors();
  const { state } = useEditor();
  const [isExecuting, setIsExecuting] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const handleExecuteCode = async () => {
    if (!state.currentFile) {
      setError('Nenhum ficheiro aberto');
      return;
    }

    const code = state.currentFile.content;

    // Validar código
    const validation = validatePythonCode(code);
    if (!validation.valid) {
      setError(`Validação falhou:\n${validation.errors.join('\n')}`);
      return;
    }

    setIsExecuting(true);
    setError('');
    setOutput('Executando...');

    try {
      const result = await executePythonCode(code);
      const formattedOutput = formatExecutionOutput(result);
      setOutput(formattedOutput);

      if (result.exitCode !== 0) {
        setError(result.stderr);
      }
    } catch (err) {
      setError(`Erro: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.foreground,
      textTransform: 'uppercase',
      flex: 1,
    },
    executeButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.primary,
      borderRadius: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    executeButtonText: {
      fontSize: 12,
      color: colors.background,
      fontWeight: '600',
    },
    content: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    output: {
      fontSize: 11,
      fontFamily: 'Menlo',
      color: colors.foreground,
      lineHeight: 16,
    },
    errorText: {
      fontSize: 11,
      fontFamily: 'Menlo',
      color: colors.error,
      lineHeight: 16,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 12,
      color: colors.muted,
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Saída</Text>
        <Pressable
          style={styles.executeButton}
          onPress={handleExecuteCode}
          disabled={isExecuting}
        >
          {isExecuting ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <Text style={styles.executeButtonText}>▶ Executar</Text>
          )}
        </Pressable>
      </View>

      <ScrollView style={styles.content}>
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : output ? (
          <Text style={styles.output}>{output}</Text>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              Clique em "Executar" para ver a saída do código
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
