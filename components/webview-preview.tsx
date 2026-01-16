import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import {
  generateWebViewHTML,
  createWebViewDataURL,
  extractCodeFromHTML,
  validateHTML,
} from '@/lib/webview-renderer';

interface WebViewPreviewProps {
  code: string;
  language: 'html' | 'css' | 'python';
  onError?: (error: string) => void;
  onConsoleLog?: (message: string) => void;
}

export function WebViewPreview({
  code,
  language,
  onError,
  onConsoleLog,
}: WebViewPreviewProps) {
  const colors = useColors();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [showConsole, setShowConsole] = useState(false);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.foreground,
    },
    consoleButton: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    consoleButtonText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.background,
    },
    content: {
      flex: 1,
      backgroundColor: colors.background,
    },
    previewPlaceholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    placeholderText: {
      fontSize: 14,
      color: colors.muted,
      textAlign: 'center',
      marginBottom: 8,
    },
    errorContainer: {
      backgroundColor: colors.error,
      padding: 12,
      margin: 8,
      borderRadius: 6,
    },
    errorText: {
      color: colors.background,
      fontSize: 12,
      fontWeight: '500',
    },
    consoleContainer: {
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      maxHeight: '40%',
      padding: 8,
    },
    consoleTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 8,
    },
    consoleLog: {
      fontSize: 11,
      color: colors.foreground,
      fontFamily: 'Courier New',
      marginBottom: 4,
      paddingVertical: 2,
      paddingHorizontal: 4,
      backgroundColor: colors.background,
      borderRadius: 2,
    },
    consoleEmpty: {
      fontSize: 11,
      color: colors.muted,
      fontStyle: 'italic',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  useEffect(() => {
    if (language === 'html' || language === 'css') {
      setIsLoading(true);
      setError(null);
      setConsoleLogs([]);

      try {
        // Validar HTML se for HTML
        if (language === 'html') {
          const validation = validateHTML(code);
          if (!validation.valid) {
            setError(`Erros de HTML: ${validation.errors.join(', ')}`);
            onError?.(validation.errors.join(', '));
          }
        }

        // Extrair código se for HTML puro
        if (language === 'html' && code.includes('<style') || code.includes('<script')) {
          const { htmlCode, cssCode, jsCode } = extractCodeFromHTML(code);
          // Usar código extraído
        }

        // Gerar HTML para renderização
        const htmlCode = language === 'html' ? code : '';
        const cssCode = language === 'css' ? code : '';

        const webviewHTML = generateWebViewHTML(htmlCode, cssCode, '', {
          enableJavaScript: true,
          enableConsole: true,
        });

        // Criar data URL
        const dataURL = createWebViewDataURL(htmlCode, cssCode, '', {
          enableJavaScript: true,
          enableConsole: true,
        });

        // Simular carregamento
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        onError?.(errorMessage);
        setIsLoading(false);
      }
    } else if (language === 'python') {
      // Para Python, mostrar mensagem informativa
      setError(null);
      setIsLoading(false);
    }
  }, [code, language]);

  const handleClearConsole = () => {
    setConsoleLogs([]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {language === 'html' ? '🌐 Pré-visualização HTML' : '🎨 Pré-visualização CSS'}
        </Text>
        {(language === 'html' || language === 'css') && (
          <Pressable
            style={styles.consoleButton}
            onPress={() => setShowConsole(!showConsole)}
          >
            <Text style={styles.consoleButtonText}>
              {showConsole ? 'Ocultar' : 'Console'} ({consoleLogs.length})
            </Text>
          </Pressable>
        )}
      </View>

      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[styles.placeholderText, { marginTop: 12 }]}>
              A carregar pré-visualização...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.previewPlaceholder}>
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠️ Erro na pré-visualização</Text>
              <Text style={[styles.errorText, { marginTop: 4 }]}>{error}</Text>
            </View>
          </View>
        ) : language === 'python' ? (
          <View style={styles.previewPlaceholder}>
            <Text style={styles.placeholderText}>🐍 Python</Text>
            <Text style={styles.placeholderText}>
              A pré-visualização de Python não é suportada no editor móvel.
            </Text>
            <Text style={styles.placeholderText}>
              Use o painel de execução para testar o código.
            </Text>
          </View>
        ) : (
          <View style={styles.previewPlaceholder}>
            <Text style={styles.placeholderText}>
              {language === 'html'
                ? 'Pré-visualização de HTML/CSS'
                : 'Pré-visualização de CSS'}
            </Text>
            <Text style={styles.placeholderText}>
              WebView nativa será renderizada aqui
            </Text>
            <Text style={[styles.placeholderText, { fontSize: 11, color: colors.muted }]}>
              (Integração com react-native-webview)
            </Text>
          </View>
        )}
      </View>

      {showConsole && (consoleLogs.length > 0 || language !== 'python') && (
        <View style={styles.consoleContainer}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <Text style={styles.consoleTitle}>📋 Console</Text>
            {consoleLogs.length > 0 && (
              <Pressable
                onPress={handleClearConsole}
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  backgroundColor: colors.surface,
                  borderRadius: 2,
                }}
              >
                <Text style={{ fontSize: 10, color: colors.primary }}>Limpar</Text>
              </Pressable>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {consoleLogs.length > 0 ? (
              consoleLogs.map((log, idx) => (
                <Text key={idx} style={styles.consoleLog}>
                  {log}
                </Text>
              ))
            ) : (
              <Text style={styles.consoleEmpty}>Nenhuma mensagem de console</Text>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
