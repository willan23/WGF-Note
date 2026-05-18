import React, { memo, useCallback, useMemo } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/use-colors';
import { useEditor } from '@/lib/editor-context';
import type { PythonFile } from '@/lib/types';

interface EditorTabProps {
  file: PythonFile;
  active: boolean;
  onSelect: (file: PythonFile) => void;
  onClose: (fileId: string) => void;
  styles: ReturnType<typeof createStyles>;
  colors: ReturnType<typeof useColors>;
}

function triggerSelectionHaptic() {
  if (Platform.OS !== 'web') {
    void Haptics.selectionAsync();
  }
}

const EditorTab = memo(function EditorTab({
  file,
  active,
  onSelect,
  onClose,
  styles,
  colors,
}: EditorTabProps) {
  return (
    <View style={[styles.tab, active && styles.tabActive]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Abrir ${file.name}`}
        onPress={() => {
          triggerSelectionHaptic();
          onSelect(file);
        }}
        style={styles.tabMain}
        hitSlop={8}
      >
        <Text style={[styles.dirtyIndicator, !file.isModified && styles.dirtyIndicatorHidden]}>
          ●
        </Text>
        <Text
          style={[styles.tabLabel, active && styles.tabLabelActive]}
          numberOfLines={1}
        >
          {file.name}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Fechar ${file.name}`}
        onPress={() => {
          triggerSelectionHaptic();
          onClose(file.id);
        }}
        style={styles.closeButton}
        hitSlop={10}
      >
        <Text style={[styles.closeText, active && { color: colors.foreground }]}>×</Text>
      </Pressable>
    </View>
  );
});

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      minHeight: 36,
    },
    contentContainer: {
      alignItems: 'center',
      gap: 1,
      paddingHorizontal: 0,
      paddingVertical: 0,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRightWidth: 1,
      borderRightColor: colors.border,
      backgroundColor: colors.surface,
      maxWidth: 240,
      minHeight: 36,
    },
    tabActive: {
      backgroundColor: colors.background,
    },
    tabMain: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingLeft: 12,
      paddingVertical: 9,
      flexShrink: 1,
    },
    dirtyIndicator: {
      color: colors.warning,
      fontSize: 10,
    },
    dirtyIndicatorHidden: {
      opacity: 0,
    },
    tabLabel: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '500',
      maxWidth: 170,
    },
    tabLabelActive: {
      color: colors.foreground,
      fontWeight: '700',
    },
    closeButton: {
      paddingHorizontal: 10,
      paddingVertical: 9,
    },
    closeText: {
      color: colors.muted,
      fontSize: 16,
      lineHeight: 16,
    },
  });
}

export function EditorTabs() {
  const colors = useColors();
  const { state, openFile, closeFile } = useEditor();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const handleSelect = useCallback((file: PythonFile) => openFile(file), [openFile]);
  const handleClose = useCallback((fileId: string) => closeFile(fileId), [closeFile]);

  if (state.openFiles.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {state.openFiles.map((file) => (
          <EditorTab
            key={file.id}
            file={file}
            active={state.currentFile?.id === file.id}
            onSelect={handleSelect}
            onClose={handleClose}
            styles={styles}
            colors={colors}
          />
        ))}
      </ScrollView>
    </View>
  );
}
