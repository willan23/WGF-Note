import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { useEditor } from '@/lib/editor-context';

export function EditorStatusBar() {
  const colors = useColors();
  const { state, settings } = useEditor();

  const currentFile = state.currentFile;
  const lineCount = currentFile?.lineCount ?? 0;
  const charCount = currentFile?.charCount ?? 0;
  const modifiedIndicator = currentFile?.isModified ? '●' : '';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: 'row',
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingHorizontal: 12,
          paddingVertical: 6,
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        statusText: {
          fontSize: 11,
          color: colors.muted,
          fontFamily: settings.fontFamily,
        },
        fileName: {
          fontSize: 12,
          fontWeight: '600',
          color: colors.foreground,
          marginRight: 8,
        },
        modified: {
          color: colors.warning,
          marginRight: 4,
          fontSize: 10,
        },
        leftSection: {
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
        },
        rightSection: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        },
      }),
    [
      colors.border,
      colors.foreground,
      colors.muted,
      colors.surface,
      colors.warning,
      settings.fontFamily,
    ],
  );

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        {currentFile && (
          <>
            <Text style={styles.modified}>{modifiedIndicator}</Text>
            <Text style={styles.fileName}>{currentFile.name}</Text>
          </>
        )}
      </View>
      <View style={styles.rightSection}>
        <Text style={styles.statusText}>
          Linha: {state.cursorLine + 1}
        </Text>
        <Text style={styles.statusText}>
          Col: {state.cursorColumn + 1}
        </Text>
        <Text style={styles.statusText}>
          {lineCount} linhas
        </Text>
        <Text style={styles.statusText}>
          {charCount} caracteres
        </Text>
      </View>
    </View>
  );
}
