import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { useEditor } from '@/lib/editor-context';
import { validatePythonCode, formatExecutionOutput } from '@/lib/python-executor';
import { trpc } from '@/lib/trpc';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/use-auth';
import { AuthModal } from '@/components/auth-modal';

export function CodeExecutionPanel() {
  const colors = useColors();
  const { state } = useEditor();
  const [isExecuting, setIsExecuting] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { isAuthenticated, refresh } = useAuth();
  const executeMutation = trpc.python.execute.useMutation();

  const handleExecuteCode = async () => {
    if (!state.currentFile) {
      setError('Nenhum ficheiro aberto');
      return;
    }
    if (!isAuthenticated) {
      setShowAuthModal(true);
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
    setOutput('A preparar execução...\n');

    try {
      const result = await executeMutation.mutateAsync({ code });
      const formattedOutput = formatExecutionOutput(result);
      setOutput(formattedOutput);

      if (result.exitCode !== 0) {
        setError(result.stderr || 'Erro desconhecido durante a execução');
      }
    } catch (err) {
      setError(`Erro do Sistema: ${err instanceof Error ? err.message : 'Erro fatal'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const clearOutput = () => {
    setOutput('');
    setError('');
  };

  const styles = StyleSheet.create({
    container: {
      height: 250,
      backgroundColor: '#000', // Terminal always dark
      borderTopWidth: 1,
      borderTopColor: '#333',
    },
    header: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: '#1a1a1a',
      borderBottomWidth: 1,
      borderBottomColor: '#333',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontSize: 12,
      fontWeight: '700',
      color: '#aaa',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    actionButton: {
      padding: 4,
    },
    executeButton: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      backgroundColor: colors.primary,
      borderRadius: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    executeButtonText: {
      fontSize: 12,
      color: '#fff',
      fontWeight: '700',
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    output: {
      fontSize: 13,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      color: '#fff',
      lineHeight: 18,
    },
    errorText: {
      fontSize: 13,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      color: '#ff5555',
      lineHeight: 18,
      marginTop: 8,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      opacity: 0.5,
    },
    emptyText: {
      fontSize: 12,
      color: '#666',
      textAlign: 'center',
      marginTop: 8,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="terminal-outline" size={16} color={colors.primary} />
          <Text style={styles.title}>Consola Python</Text>
        </View>
        <View style={styles.actions}>
          <Pressable style={styles.actionButton} onPress={clearOutput}>
            <Ionicons name="trash-outline" size={18} color="#666" />
          </Pressable>
          <Pressable
            style={styles.executeButton}
            onPress={handleExecuteCode}
            disabled={isExecuting}
          >
            {isExecuting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="play" size={14} color="#fff" />
                <Text style={styles.executeButtonText}>EXECUTAR</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator>
        {output || error ? (
          <>
            {output ? <Text style={styles.output}>{output}</Text> : null}
            {error ? (
              <View style={{ borderTopWidth: 1, borderTopColor: '#333', marginTop: 10, paddingTop: 10 }}>
                <Text style={[styles.output, { color: '#ff5555', fontWeight: '700' }]}>STDERR:</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            <View style={{ height: 40 }} />
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="code-working-outline" size={48} color="#222" />
            <Text style={styles.emptyText}>
              Aguardando comando...
            </Text>
          </View>
        )}
      </ScrollView>
      <AuthModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthenticated={refresh}
      />
    </View>
  );
}
