import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useColors } from '@/hooks/use-colors';
import {
  extractCodeFromHTML,
  generateWebViewHTML,
  validateHTML,
} from '@/lib/webview-renderer';

interface WebViewPreviewProps {
  code: string;
  language: 'html' | 'css' | 'python';
  onError?: (error: string) => void;
  onConsoleLog?: (message: string) => void;
}

function buildPreviewDocument(code: string, language: WebViewPreviewProps['language']) {
  if (language === 'html') {
    const { htmlCode, cssCode, jsCode } = extractCodeFromHTML(code);
    return generateWebViewHTML(htmlCode, cssCode, jsCode, {
      enableJavaScript: true,
      enableConsole: true,
    });
  }

  return generateWebViewHTML('', language === 'css' ? code : '', '', {
    enableJavaScript: true,
    enableConsole: true,
  });
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
  const [warning, setWarning] = useState<string | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [showConsole, setShowConsole] = useState(false);
  const [previewDocument, setPreviewDocument] = useState(() =>
    buildPreviewDocument(code, language),
  );

  useEffect(() => {
    if (language === 'python') {
      setError(null);
      setWarning(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeoutId = setTimeout(() => {
      try {
        if (language === 'html') {
          const validation = validateHTML(code);
          if (!validation.valid) {
            const message = validation.errors.join(', ');
            setError(message);
            setWarning(null);
            onError?.(message);
            setIsLoading(false);
            return;
          }

          setWarning(validation.warnings.join(', ') || null);
        } else {
          setWarning(null);
        }

        setError(null);
        setPreviewDocument(buildPreviewDocument(code, language));
      } catch (previewError) {
        const message =
          previewError instanceof Error ? previewError.message : 'Erro desconhecido';
        setError(message);
        setWarning(null);
        onError?.(message);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [code, language, onError]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (message.type === 'console-log' || message.type === 'console-error') {
          setConsoleLogs((logs) => [...logs.slice(-49), message.data]);
          onConsoleLog?.(message.data);
        }
      } catch {
        // Mensagens externas ao preview não precisam de tratamento.
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onConsoleLog]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
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
        warningContainer: {
          backgroundColor: `${colors.warning}20`,
          borderBottomWidth: 1,
          borderBottomColor: colors.warning,
          paddingHorizontal: 12,
          paddingVertical: 8,
        },
        warningText: {
          color: colors.warning,
          fontSize: 12,
          fontWeight: '500',
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
      }),
    [
      colors.background,
      colors.border,
      colors.error,
      colors.foreground,
      colors.muted,
      colors.primary,
      colors.surface,
      colors.warning,
    ],
  );

  const handleClearConsole = () => setConsoleLogs([]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {language === 'html' ? '🌐 Pré-visualização HTML' : '🎨 Pré-visualização CSS'}
        </Text>
        {language !== 'python' ? (
          <Pressable style={styles.consoleButton} onPress={() => setShowConsole((value) => !value)}>
            <Text style={styles.consoleButtonText}>
              {showConsole ? 'Ocultar' : 'Console'} ({consoleLogs.length})
            </Text>
          </Pressable>
        ) : null}
      </View>

      {warning ? (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>⚠️ {warning}</Text>
        </View>
      ) : null}

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
              A pré-visualização de Python não faz parte desta versão local-first.
            </Text>
          </View>
        ) : Platform.OS === 'web' ? (
          <iframe
            title="preview"
            srcDoc={previewDocument}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              backgroundColor: colors.background,
            }}
          />
        ) : (
          <WebView
            key={`${language}-${previewDocument.length}`}
            source={{ html: previewDocument }}
            style={styles.content}
            onMessage={(event) => {
              try {
                const message = JSON.parse(event.nativeEvent.data);
                if (message.type === 'console-log' || message.type === 'console-error') {
                  setConsoleLogs((logs) => [...logs.slice(-49), message.data]);
                  onConsoleLog?.(message.data);
                }
              } catch {
                // Mensagens não JSON são ignoradas.
              }
            }}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.primary} size="large" />
              </View>
            )}
          />
        )}
      </View>

      {showConsole && (consoleLogs.length > 0 || language !== 'python') ? (
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
            {consoleLogs.length > 0 ? (
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
            ) : null}
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {consoleLogs.length > 0 ? (
              consoleLogs.map((log, index) => (
                <Text key={`${log}-${index}`} style={styles.consoleLog}>
                  {log}
                </Text>
              ))
            ) : (
              <Text style={styles.consoleEmpty}>Nenhuma mensagem de console</Text>
            )}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}
