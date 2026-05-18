import React, { memo, useCallback, useMemo, useState } from 'react';
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
  onDragStart: (fileId: string) => void;
  onDragEnter: (fileId: string) => void;
  onDrop: (fileId: string, draggedFileId?: string) => void;
  onDragEnd: () => void;
  dragging: boolean;
  dragOver: boolean;
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
  onDragStart,
  onDragEnter,
  onDrop,
  onDragEnd,
  dragging,
  dragOver,
  styles,
  colors,
}: EditorTabProps) {
  const content = (
    <>
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
    </>
  );

  const containerStyle = [
    styles.tab,
    active && styles.tabActive,
    dragging && styles.tabDragging,
    dragOver && styles.tabDragOver,
  ];

  if (Platform.OS === 'web') {
    return React.createElement(
      'div',
      {
        draggable: true,
        onDragStart: (event: React.DragEvent<HTMLDivElement>) => {
          event.dataTransfer.setData('text/plain', file.id);
          onDragStart(file.id);
        },
        onDragEnter: () => onDragEnter(file.id),
        onDragOver: (event: React.DragEvent<HTMLDivElement>) => event.preventDefault(),
        onDrop: (event: React.DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          onDrop(file.id, event.dataTransfer.getData('text/plain') || undefined);
        },
        onDragEnd,
        style: StyleSheet.flatten(containerStyle) as React.CSSProperties,
      },
      content,
    );
  }

  return <View style={containerStyle}>{content}</View>;
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
    tabDragging: {
      opacity: 0.58,
    },
    tabDragOver: {
      borderLeftWidth: 2,
      borderLeftColor: colors.primary,
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
  const { state, openFile, closeFile, reorderOpenFiles } = useEditor();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null);
  const [dragOverFileId, setDragOverFileId] = useState<string | null>(null);
  const handleSelect = useCallback((file: PythonFile) => openFile(file), [openFile]);
  const handleClose = useCallback((fileId: string) => closeFile(fileId), [closeFile]);
  const handleDrop = useCallback(
    (targetFileId: string, sourceFileId?: string) => {
      const effectiveDraggedFileId = sourceFileId ?? draggedFileId;

      if (effectiveDraggedFileId && effectiveDraggedFileId !== targetFileId) {
        reorderOpenFiles(effectiveDraggedFileId, targetFileId);
      }

      setDraggedFileId(null);
      setDragOverFileId(null);
    },
    [draggedFileId, reorderOpenFiles],
  );
  const handleDragEnd = useCallback(() => {
    setDraggedFileId(null);
    setDragOverFileId(null);
  }, []);

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
            onDragStart={setDraggedFileId}
            onDragEnter={setDragOverFileId}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            dragging={draggedFileId === file.id}
            dragOver={dragOverFileId === file.id && draggedFileId !== file.id}
            styles={styles}
            colors={colors}
          />
        ))}
      </ScrollView>
    </View>
  );
}
