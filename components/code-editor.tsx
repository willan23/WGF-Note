import React, { useCallback, useDeferredValue, useMemo, useRef } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
} from 'react-native';
import { useEditor } from '@/lib/editor-context';
import { getLineAndColumnFromOffset } from '@/lib/editor-state';
import { useColors } from '@/hooks/use-colors';

interface CodeEditorProps {
  onContentChange?: (content: string) => void;
  readOnly?: boolean;
}

type HighlightPart = {
  text: string;
  color?: string;
};

type HighlightRule = {
  regex: RegExp;
  color: string;
};

function highlight(code: string, language: string, colors: ReturnType<typeof useColors>) {
  if (!code) return <Text>{''}</Text>;

  const cLikeRules: HighlightRule[] = [
    { regex: /\/\/.*/g, color: colors.muted },
    { regex: /\/\*[\s\S]*?\*\//g, color: colors.muted },
    { regex: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g, color: colors.success },
    {
      regex:
        /\b(const|let|var|function|class|interface|type|extends|implements|public|private|protected|static|new|return|if|else|switch|case|break|continue|for|while|do|try|catch|finally|throw|import|from|export|default|async|await|void|int|float|double|char|bool|boolean|string|using|namespace|package|null|true|false)\b/g,
      color: colors.primary,
    },
    { regex: /\b([a-zA-Z_][a-zA-Z0-9_]*)(?=\s*\()/g, color: colors.warning },
    { regex: /\b\d+(\.\d+)?\b/g, color: colors.warning },
  ];

  const rules: Record<string, HighlightRule[]> = {
    python: [
      { regex: /#.*/g, color: colors.muted },
      { regex: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, color: colors.success },
      {
        regex:
          /\b(def|class|if|else|elif|for|while|try|except|finally|import|from|return|as|with|yield|lambda|pass|break|continue|in|is|not|and|or|True|False|None)\b/g,
        color: colors.primary,
      },
      { regex: /\b([a-zA-Z_][a-zA-Z0-9_]*)(?=\s*\()/g, color: colors.warning },
      { regex: /\b(self|cls)\b/g, color: colors.error },
      { regex: /\b\d+(\.\d+)?\b/g, color: colors.warning },
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
    ],
    javascript: cLikeRules,
    typescript: cLikeRules,
    java: cLikeRules,
    c: cLikeRules,
    cpp: cLikeRules,
    csharp: cLikeRules,
    json: [
      { regex: /"(?:\\.|[^"\\])*"(?=\s*:)/g, color: colors.primary },
      { regex: /"(?:\\.|[^"\\])*"/g, color: colors.success },
      { regex: /\b(true|false|null)\b/g, color: colors.error },
      { regex: /-?\b\d+(\.\d+)?\b/g, color: colors.warning },
    ],
    markdown: [
      { regex: /^#{1,6}\s.+$/gm, color: colors.primary },
      { regex: /```[\s\S]*?```/g, color: colors.success },
      { regex: /`[^`]+`/g, color: colors.success },
      { regex: /\*\*[^*]+\*\*|__[^_]+__/g, color: colors.warning },
      { regex: /\[[^\]]+\]\([^)]+\)/g, color: colors.primary },
    ],
    sql: [
      { regex: /--.*/g, color: colors.muted },
      { regex: /\/\*[\s\S]*?\*\//g, color: colors.muted },
      { regex: /'(?:''|[^'])*'/g, color: colors.success },
      {
        regex:
          /\b(SELECT|FROM|WHERE|INSERT|INTO|UPDATE|DELETE|CREATE|ALTER|DROP|TABLE|VIEW|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP|BY|ORDER|HAVING|LIMIT|OFFSET|AS|AND|OR|NOT|NULL|VALUES|SET|PRIMARY|KEY|FOREIGN|REFERENCES)\b/gi,
        color: colors.primary,
      },
      { regex: /\b\d+(\.\d+)?\b/g, color: colors.warning },
    ],
    plaintext: [],
  };

  const selectedRules = rules[language] ?? rules.plaintext;
  let parts: HighlightPart[] = [{ text: code }];

  selectedRules.forEach((rule) => {
    const newParts: HighlightPart[] = [];

    parts.forEach((part) => {
      if (part.color) {
        newParts.push(part);
        return;
      }

      let lastIndex = 0;
      let match: RegExpExecArray | null;
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
      {parts.map((part, index) => (
        <Text key={`${part.text}-${index}`} style={{ color: part.color || colors.foreground }}>
          {part.text}
        </Text>
      ))}
    </>
  );
}

export function CodeEditor({ onContentChange, readOnly = false }: CodeEditorProps) {
  const {
    state,
    settings,
    updateFileContent,
    currentLanguage,
    setCursorPosition,
    setSelection,
  } = useEditor();
  const colors = useColors();
  const verticalScrollRef = useRef<ScrollView>(null);
  const lineNumbersRef = useRef<ScrollView>(null);
  const currentContent = state.currentFile?.content ?? '';
  const deferredContent = useDeferredValue(currentContent);

  const handleScroll = useCallback((event: { nativeEvent: { contentOffset: { y: number } } }) => {
    lineNumbersRef.current?.scrollTo({
      y: event.nativeEvent.contentOffset.y,
      animated: false,
    });
  }, []);

  const handleContentChange = useCallback(
    (text: string) => {
      if (!state.currentFile) return;

      updateFileContent(state.currentFile.id, text);
      onContentChange?.(text);
    },
    [onContentChange, state.currentFile, updateFileContent],
  );

  const handleSelectionChange = useCallback(
    (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      const { start, end } = event.nativeEvent.selection;
      const { line, column } = getLineAndColumnFromOffset(currentContent, start);
      setSelection(start, end);
      setCursorPosition(line, column);
    },
    [currentContent, setCursorPosition, setSelection],
  );

  const lineCount = state.currentFile?.lineCount ?? 1;
  const lineNumbers = useMemo(
    () => Array.from({ length: Math.max(lineCount, 30) }, (_, index) => String(index + 1)),
    [lineCount],
  );
  const longestLineLength = useMemo(
    () => deferredContent.split('\n').reduce((max, line) => Math.max(max, line.length), 0),
    [deferredContent],
  );
  const noWrapWidth = Math.max(320, longestLineLength * settings.fontSize * 0.62 + 32);
  const shouldHighlight = deferredContent.length <= 120_000;
  const highlightedContent = useMemo(
    () =>
      shouldHighlight ? highlight(deferredContent, currentLanguage, colors) : deferredContent,
    [colors, currentLanguage, deferredContent, shouldHighlight],
  );

  const editorStyles = useMemo(
    () =>
      StyleSheet.create({
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
          fontFamily: settings.fontFamily,
          textAlign: 'right',
          paddingRight: 10,
        },
        editorWrapper: {
          flex: 1,
          backgroundColor: colors.background,
        },
        verticalScrollContent: {
          flexGrow: 1,
        },
        horizontalScrollContent: {
          minWidth: noWrapWidth,
        },
        inputLayer: {
          paddingHorizontal: 16,
          paddingVertical: 16,
          minHeight: '100%',
          width: settings.wordWrap ? '100%' : noWrapWidth,
        },
        textInput: {
          fontSize: settings.fontSize,
          lineHeight: settings.fontSize * 1.6,
          color: 'transparent',
          fontFamily: settings.fontFamily,
          textAlignVertical: 'top',
          zIndex: 2,
          minHeight: 320,
          width: settings.wordWrap ? '100%' : noWrapWidth - 32,
          ...(Platform.OS === 'web'
            ? ({ whiteSpace: settings.wordWrap ? 'pre-wrap' : 'pre' } as const)
            : null),
        },
        highlightLayer: {
          position: 'absolute',
          top: 16,
          left: 16,
          right: 16,
          bottom: 16,
          zIndex: 1,
          width: settings.wordWrap ? undefined : noWrapWidth - 32,
        },
        codeText: {
          fontSize: settings.fontSize,
          lineHeight: settings.fontSize * 1.6,
          fontFamily: settings.fontFamily,
          color: colors.foreground,
          ...(Platform.OS === 'web'
            ? ({ whiteSpace: settings.wordWrap ? 'pre-wrap' : 'pre' } as const)
            : null),
        },
      }),
    [
      colors.background,
      colors.border,
      colors.foreground,
      colors.muted,
      colors.surface,
      noWrapWidth,
      settings.fontFamily,
      settings.fontSize,
      settings.wordWrap,
    ],
  );

  const editorBody = (
    <ScrollView
      ref={verticalScrollRef}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      contentContainerStyle={editorStyles.verticalScrollContent}
    >
      <View style={editorStyles.inputLayer}>
        <View style={[editorStyles.highlightLayer, { pointerEvents: 'none' }]}>
          <Text style={editorStyles.codeText}>{highlightedContent}</Text>
        </View>

        <TextInput
          accessibilityLabel="Editor de código"
          style={editorStyles.textInput}
          value={currentContent}
          onChangeText={handleContentChange}
          onSelectionChange={handleSelectionChange}
          selection={{
            start: state.selectionStart,
            end: state.selectionEnd,
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
  );

  return (
    <View style={editorStyles.container}>
      {settings.showLineNumbers ? (
        <ScrollView
          ref={lineNumbersRef}
          scrollEnabled={false}
          style={editorStyles.lineNumbersContainer}
          showsVerticalScrollIndicator={false}
        >
          {lineNumbers.map((number) => (
            <Text key={number} style={editorStyles.lineNumber}>
              {number}
            </Text>
          ))}
          <View style={{ height: 200 }} />
        </ScrollView>
      ) : null}

      <View style={editorStyles.editorWrapper}>
        {settings.wordWrap ? (
          editorBody
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            contentContainerStyle={editorStyles.horizontalScrollContent}
          >
            {editorBody}
          </ScrollView>
        )}
      </View>
    </View>
  );
}
