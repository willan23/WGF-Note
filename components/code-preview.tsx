import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import type { CodeLanguage } from '@/lib/types-extended';

interface CodePreviewProps {
  code: string;
  language: CodeLanguage;
  visible: boolean;
  onClose?: () => void;
}

export function CodePreview({
  code,
  language,
  visible,
  onClose,
}: CodePreviewProps) {
  const colors = useColors();

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
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    title: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
    closeButton: {
      padding: 8,
    },
    closeText: {
      fontSize: 18,
      color: colors.muted,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    previewBox: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 200,
    },
    previewTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    htmlPreview: {
      backgroundColor: '#ffffff',
      borderRadius: 4,
      padding: 12,
      minHeight: 150,
    },
    htmlText: {
      fontSize: 13,
      color: '#333333',
      fontFamily: 'Menlo',
      lineHeight: 18,
    },
    cssPreview: {
      backgroundColor: '#f5f5f5',
      borderRadius: 4,
      padding: 12,
    },
    cssText: {
      fontSize: 11,
      color: '#333333',
      fontFamily: 'Menlo',
      lineHeight: 16,
    },
    pythonOutput: {
      backgroundColor: '#1e1e1e',
      borderRadius: 4,
      padding: 12,
    },
    pythonText: {
      fontSize: 12,
      color: '#00ff00',
      fontFamily: 'Menlo',
      lineHeight: 18,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    emptyText: {
      fontSize: 13,
      color: colors.muted,
      textAlign: 'center',
    },
    errorBox: {
      backgroundColor: '#ffebee',
      borderRadius: 4,
      padding: 12,
      borderLeftWidth: 4,
      borderLeftColor: colors.error,
    },
    errorText: {
      fontSize: 12,
      color: colors.error,
      fontFamily: 'Menlo',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  const renderHTMLPreview = (htmlCode: string) => {
    // Simular renderização de HTML (em produção, usar WebView)
    const preview = htmlCode.substring(0, 200);
    return (
      <View style={styles.previewBox}>
        <Text style={styles.previewTitle}>Pré-visualização HTML</Text>
        <View style={styles.htmlPreview}>
          <Text style={styles.htmlText} numberOfLines={5}>
            {preview}...
          </Text>
        </View>
        <Text style={styles.emptyText} numberOfLines={2}>
          💡 Para visualização completa, integre WebView nativo
        </Text>
      </View>
    );
  };

  const renderCSSPreview = (cssCode: string) => {
    const preview = cssCode.substring(0, 150);
    return (
      <View style={styles.previewBox}>
        <Text style={styles.previewTitle}>Pré-visualização CSS</Text>
        <View style={styles.cssPreview}>
          <Text style={styles.cssText} numberOfLines={6}>
            {preview}...
          </Text>
        </View>
        <Text style={styles.emptyText} numberOfLines={2}>
          💡 Estilos CSS aplicados em tempo real com WebView
        </Text>
      </View>
    );
  };

  const renderPythonPreview = (pythonCode: string) => {
    // Mostrar estrutura do código Python
    const lines = pythonCode.split('\n').slice(0, 10);
    return (
      <View style={styles.previewBox}>
        <Text style={styles.previewTitle}>Estrutura Python</Text>
        <View style={styles.pythonOutput}>
          {lines.map((line, idx) => (
            <Text key={idx} style={styles.pythonText}>
              {line || ''}
            </Text>
          ))}
          {pythonCode.split('\n').length > 10 && (
            <Text style={styles.pythonText}>...</Text>
          )}
        </View>
        <Text style={styles.emptyText} numberOfLines={2}>
          💡 Execução Python requer backend seguro
        </Text>
      </View>
    );
  };

  if (!visible) {
    return null;
  }

  const previewContent =
    !code.trim()
      ? null
      : language === 'html'
        ? renderHTMLPreview(code)
        : language === 'css'
          ? renderCSSPreview(code)
          : renderPythonPreview(code);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Pré-visualização • {language.toUpperCase()}
        </Text>
        {onClose && (
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {code.trim() ? (
          previewContent
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              Comece a escrever código para ver a pré-visualização
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
