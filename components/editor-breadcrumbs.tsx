import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { useEditor } from '@/lib/editor-context';
import { getWorkspaceRelativePath } from '@/lib/workspace-search';
import { formatShortcutDisplay, getShortcutByAction } from '@/lib/keyboard-shortcuts';

type EditorBreadcrumbsProps = {
  onOpenSearch?: () => void;
  onOpenPalette?: () => void;
};

export function EditorBreadcrumbs({
  onOpenSearch,
  onOpenPalette,
}: EditorBreadcrumbsProps) {
  const colors = useColors();
  const { state, workspaceRootUri } = useEditor();
  const relativePath = state.currentFile?.path
    ? getWorkspaceRelativePath(workspaceRootUri, state.currentFile.path)
    : state.currentFile?.name ?? 'Sem ficheiro aberto';
  const parts = relativePath.split('/').filter(Boolean);
  const searchShortcut = getShortcutByAction('projectSearch');
  const paletteShortcut = getShortcutByAction('commandPalette');

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          minHeight: 34,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.background,
        },
        path: {
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          flex: 1,
        },
        segment: {
          color: colors.muted,
          fontSize: 11,
          fontWeight: '600',
        },
        segmentActive: {
          color: colors.foreground,
          fontWeight: '700',
        },
        separator: {
          marginHorizontal: 4,
        },
        actions: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        actionButton: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          paddingHorizontal: 8,
          paddingVertical: 5,
          borderRadius: 6,
          backgroundColor: colors.surface,
        },
        actionText: {
          color: colors.muted,
          fontSize: 10,
          fontWeight: '700',
        },
      }),
    [colors.background, colors.border, colors.foreground, colors.muted, colors.surface],
  );

  return (
    <View style={styles.container}>
      <View style={styles.path}>
        {parts.length > 0 ? (
          parts.map((part, index) => (
            <React.Fragment key={`${part}-${index}`}>
              <Text style={[styles.segment, index === parts.length - 1 && styles.segmentActive]}>
                {part}
              </Text>
              {index < parts.length - 1 ? (
                <Ionicons
                  name="chevron-forward"
                  size={12}
                  color={colors.muted}
                  style={styles.separator}
                />
              ) : null}
            </React.Fragment>
          ))
        ) : (
          <Text style={styles.segmentActive}>Sem ficheiro aberto</Text>
        )}
      </View>

      <View style={styles.actions}>
        {onOpenSearch ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pesquisar no projeto"
            style={styles.actionButton}
            onPress={onOpenSearch}
          >
            <Ionicons name="search-outline" size={13} color={colors.primary} />
            <Text style={styles.actionText}>
              {searchShortcut ? formatShortcutDisplay(searchShortcut.keys) : 'Pesquisar'}
            </Text>
          </Pressable>
        ) : null}
        {onOpenPalette ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir comandos"
            style={styles.actionButton}
            onPress={onOpenPalette}
          >
            <Ionicons name="flash-outline" size={13} color={colors.primary} />
            <Text style={styles.actionText}>
              {paletteShortcut ? formatShortcutDisplay(paletteShortcut.keys) : 'Comandos'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
