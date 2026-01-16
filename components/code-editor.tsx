import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  TextInput,
  ScrollView,
  Text,
  StyleSheet,
  type TextInputProps,
} from 'react-native';
import { useEditor } from '@/lib/editor-context';
import { useColors } from '@/hooks/use-colors';

interface CodeEditorProps {
  onContentChange?: (content: string) => void;
  readOnly?: boolean;
}

// Palavras-chave Python para syntax highlighting (reservadas para uso futuro)
// const PYTHON_KEYWORDS = [
//   'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await',
//   'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except',
//   'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is',
//   'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try',
//   'while', 'with', 'yield',
// ];

// const PYTHON_BUILTINS = [
//   'abs', 'all', 'any', 'ascii', 'bin', 'bool', 'breakpoint', 'bytearray',
//   'bytes', 'callable', 'chr', 'classmethod', 'compile', 'complex',
//   'delattr', 'dict', 'dir', 'divmod', 'enumerate', 'eval', 'exec',
//   'filter', 'float', 'format', 'frozenset', 'getattr', 'globals',
//   'hasattr', 'hash', 'hex', 'id', 'input', 'int', 'isinstance',
//   'issubclass', 'iter', 'len', 'list', 'locals', 'map', 'max',
//   'memoryview', 'min', 'next', 'object', 'oct', 'open', 'ord', 'pow',
//   'print', 'property', 'range', 'repr', 'reversed', 'round', 'set',
//   'setattr', 'slice', 'sorted', 'staticmethod', 'str', 'sum', 'super',
//   'tuple', 'type', 'vars', 'zip',
// ];

export function CodeEditor({ onContentChange, readOnly = false }: CodeEditorProps) {
  const { state, settings, updateFileContent } = useEditor();
  const colors = useColors();
  const [lineNumbers, setLineNumbers] = useState<string[]>([]);

  const currentContent = state.currentFile?.content || '';

  // Gerar números de linha
  const updateLineNumbers = useCallback((text: string) => {
    const lines = text.split('\n');
    const numbers = Array.from({ length: lines.length }, (_, i) => String(i + 1));
    setLineNumbers(numbers);
  }, []);

  // Atualizar números de linha quando o conteúdo muda
  React.useEffect(() => {
    updateLineNumbers(currentContent);
  }, [currentContent, updateLineNumbers]);

  const handleContentChange = useCallback((text: string) => {
    if (state.currentFile) {
      updateFileContent(state.currentFile.id, text);
      onContentChange?.(text);
      updateLineNumbers(text);
    }
  }, [state.currentFile, updateFileContent, onContentChange, updateLineNumbers]);

  const editorStyles = StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'row' as const,
      backgroundColor: colors.background,
      borderRadius: 8,
      overflow: 'hidden' as const,
    },
    lineNumbersContainer: {
      backgroundColor: colors.surface,
      paddingHorizontal: 8,
      paddingVertical: 12,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      minWidth: 50,
      justifyContent: 'flex-start' as const,
    },
    lineNumber: {
      fontSize: settings.fontSize - 2,
      lineHeight: settings.fontSize * 1.5,
      color: colors.muted,
      fontFamily: settings.fontFamily,
      textAlign: 'right' as const,
    },
    editorContainer: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    textInput: {
      flex: 1,
      fontSize: settings.fontSize,
      lineHeight: settings.fontSize * 1.5,
      color: colors.foreground,
      fontFamily: settings.fontFamily,
      backgroundColor: 'transparent',
      textAlignVertical: 'top' as const,
    },
  });

  return (
    <View style={editorStyles.container}>
      {settings.showLineNumbers && (
        <ScrollView
          scrollEnabled={false}
          style={editorStyles.lineNumbersContainer}
          pointerEvents="none"
        >
          {lineNumbers.map((num, idx) => (
            <Text key={idx} style={editorStyles.lineNumber}>
              {num}
            </Text>
          ))}
        </ScrollView>
      )}
      <View style={editorStyles.editorContainer}>
        <TextInput
          style={editorStyles.textInput}
          value={currentContent}
          onChangeText={handleContentChange}
          placeholder="Comece a digitar código Python..."
          placeholderTextColor={colors.muted}
          editable={!readOnly}
          scrollEnabled={true}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          keyboardType="default"
          returnKeyType="default"
          multiline={true}
          textBreakStrategy="simple"
        />
      </View>
    </View>
  );
}
