import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  TextInput,
  ScrollView,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { useEditor } from '@/lib/editor-context';
import { useColors } from '@/hooks/use-colors';

interface CodeEditorProps {
  onContentChange?: (content: string) => void;
  readOnly?: boolean;
}

/**
 * Filtro de Syntax Highlighting simples baseado em Regex
 */
function highlight(code: string, language: string, colors: any) {
  if (!code) return <Text>{''}</Text>;

  const rules: any = {
    python: [
      { regex: /#.*/g, color: colors.muted }, // Comentários
      { regex: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, color: colors.success }, // Strings
      { regex: /\b(def|class|if|else|elif|for|while|try|except|finally|import|from|return|as|with|yield|lambda|pass|break|continue|in|is|not|and|or|True|False|None)\b/g, color: colors.primary }, // Keywords
      { regex: /\b([a-zA-Z_][a-zA-Z0-9_]*)(?=\s*\()/g, color: colors.warning }, // Funções
      { regex: /\b(self|cls)\b/g, color: colors.error }, // Special
      { regex: /\b\d+(\.\d+)?\b/g, color: colors.warning }, // Números
    ],
    html: [
      { regex: /<!--[\s\S]*?-->/g, color: colors.muted },
      { regex: /<[^>]+>/g, color: colors.primary },
      { regex: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, color: colors.success },
    ],
    css: [
      { regex: /\/\*[\s\S]*?\*\//g, color: colors.muted },
      { regex: /[a-zA-Z-]+\s*:/g, color: colors.primary },
      { regex: /#[a-zA-Z0-9]+/g, color: colors.warning },
      { regex: /\.[a-zA-Z0-9_-]+/g, color: colors.warning },
      { regex: /:[a-zA-Z-]+/g, color: colors.error },
    ]
  };

  const selectedRules = rules[language as keyof typeof rules] || rules.python;

  // Dividir em partes e colorir
  let parts: { text: string; color?: string }[] = [{ text: code }];

  selectedRules.forEach((rule: any) => {
    let newParts: typeof parts = [];
    parts.forEach(part => {
      if (part.color) {
        newParts.push(part);
        return;
      }

      let lastIndex = 0;
      let match;
      const regex = new RegExp(rule.regex);

      while ((match = regex.exec(part.text)) !== null) {
        if (match.index > lastIndex) {
          newParts.push({ text: part.text.substring(lastIndex, match.index) });
        }
        newParts.push({ text: match[0], color: rule.color });
        lastIndex = regex.lastIndex;
      }

      if (lastIndex < part.text.length) {
        newParts.push({ text: part.text.substring(lastIndex) });
      }
    });
    parts = newParts;
  });

  return (
    <>
      {parts.map((part, i) => (
        <Text key={i} style={{ color: part.color || colors.foreground }}>
          {part.text}
        </Text>
      ))}
    </>
  );
}

export function CodeEditor({ onContentChange, readOnly = false }: CodeEditorProps) {
  const { state, settings, updateFileContent, currentLanguage, setCursorPosition } = useEditor();
  const colors = useColors();
  const scrollRef = useRef<ScrollView>(null);
  const lineNumbersRef = useRef<ScrollView>(null);

  const currentContent = state.currentFile?.content || '';

  // Sincronizar scroll dos números de linha
  const handleScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    lineNumbersRef.current?.scrollTo({ y, animated: false });
  };

  const handleContentChange = useCallback((text: string) => {
    if (state.currentFile) {
      updateFileContent(state.currentFile.id, text);
      onContentChange?.(text);
    }
  }, [state.currentFile, updateFileContent, onContentChange]);

  const lineCount = currentContent.split('\n').length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 30) }, (_, i) => String(i + 1));

  const editorStyles = StyleSheet.create({
    container: {
      flex: 1,
      width: '100%',
      flexDirection: 'row',
      backgroundColor: colors.background,
    },
    lineNumbersContainer: {
      backgroundColor: colors.surface,
      width: 50,
      paddingVertical: 16,
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    lineNumber: {
      fontSize: settings.fontSize - 2,
      lineHeight: settings.fontSize * 1.6,
      color: colors.muted,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      textAlign: 'right',
      paddingRight: 10,
    },
    editorWrapper: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
    },
    inputLayer: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      minHeight: '100%',
    },
    textInput: {
      fontSize: settings.fontSize,
      lineHeight: settings.fontSize * 1.6,
      color: 'transparent',
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      textAlignVertical: 'top',
      zIndex: 2,
    },
    highlightLayer: {
      position: 'absolute',
      top: 16,
      left: 16,
      right: 16,
      bottom: 16,
      zIndex: 1,
    },
    codeText: {
      fontSize: settings.fontSize,
      lineHeight: settings.fontSize * 1.6,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      color: colors.foreground,
    },
  });

  return (
    <View style={editorStyles.container}>
      {settings.showLineNumbers && (
        <ScrollView
          ref={lineNumbersRef}
          scrollEnabled={false}
          style={editorStyles.lineNumbersContainer}
          showsVerticalScrollIndicator={false}
        >
          {lineNumbers.map((num, idx) => (
            <Text key={idx} style={editorStyles.lineNumber}>
              {num}
            </Text>
          ))}
          <View style={{ height: 200 }} />
        </ScrollView>
      )}

      <View style={editorStyles.editorWrapper}>
        <ScrollView
          ref={scrollRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={editorStyles.scrollContent}
        >
          <View style={editorStyles.inputLayer}>
            {/* Camada de Highlighting */}
            <View style={[editorStyles.highlightLayer, { pointerEvents: 'none' }]}>
              <Text style={editorStyles.codeText}>
                {highlight(currentContent, currentLanguage, colors)}
              </Text>
            </View>

            {/* Input Real */}
            <TextInput
              style={editorStyles.textInput}
              value={currentContent}
              onChangeText={handleContentChange}
              onSelectionChange={(e) => {
                // Tentar detectar linha/coluna se necessário
              }}
              placeholder="Digite seu código aqui..."
              placeholderTextColor={`${colors.muted}80`}
              editable={!readOnly}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              spellCheck={false}
              cursorColor={colors.primary}
              selectionColor={`${colors.primary}30`}
            />
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

