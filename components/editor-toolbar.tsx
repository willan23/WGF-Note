import React, { useMemo } from 'react';
import { View, Pressable, Text, ScrollView, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { useEditor } from '@/lib/editor-context';
import { Ionicons } from '@expo/vector-icons';
import { getLanguageConfig, getLanguageFeatures } from '@/lib/types-extended';

interface EditorToolbarProps {
  onNew?: () => void;
  onOpen?: () => void;
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSearch?: () => void;
  onProjectSearch?: () => void;
  onCommandPalette?: () => void;
  onLocalAI?: () => void;
  onSettings?: () => void;
  onTemplates?: () => void;
  onSuggestions?: () => void;
  onLanguageSelect?: () => void;
  onFormat?: () => void;
  onPreview?: () => void;
  onFileManager?: () => void;
  onProjectTree?: () => void;
  onProblems?: () => void;
  onTerminal?: () => void;
  problemsActive?: boolean;
  terminalActive?: boolean;
}

export function EditorToolbar({
  onNew,
  onOpen,
  onSave,
  onUndo,
  onRedo,
  onSearch,
  onProjectSearch,
  onCommandPalette,
  onLocalAI,
  onSettings,
  onTemplates,
  onSuggestions,
  onLanguageSelect,
  onFormat,
  onPreview,
  onFileManager,
  onProjectTree,
  onProblems,
  onTerminal,
  problemsActive = false,
  terminalActive = false,
}: EditorToolbarProps) {
  const colors = useColors();
  const { canUndo, canRedo, currentLanguage } = useEditor();
  const currentLanguageConfig = getLanguageConfig(currentLanguage);
  const currentLanguageFeatures = getLanguageFeatures(currentLanguage);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          minHeight: 46,
        },
        contentContainer: {
          flexDirection: 'row',
          paddingHorizontal: 10,
          paddingVertical: 6,
          alignItems: 'center',
          gap: 4,
        },
        button: {
          flexDirection: 'row',
          paddingHorizontal: 10,
          paddingVertical: 7,
          borderRadius: 6,
          minWidth: 0,
          justifyContent: 'center',
          alignItems: 'center',
        },
        buttonActive: {
          backgroundColor: `${colors.primary}1A`,
        },
        buttonDisabled: {
          opacity: 0.35,
        },
        buttonText: {
          fontSize: 11,
          fontWeight: '700',
          color: colors.foreground,
          marginLeft: 6,
        },
        buttonTextActive: {
          color: colors.foreground,
        },
        icon: {
          marginBottom: 0,
        },
        separator: {
          width: 1,
          height: 22,
          backgroundColor: colors.border,
          marginHorizontal: 4,
        },
      }),
    [
      colors.border,
      colors.foreground,
      colors.primary,
      colors.surface,
    ],
  );

  const ToolButton = ({
    label,
    icon,
    onPress,
    disabled = false,
    active = false,
    provider: Provider = Ionicons as any,
  }: {
    label: string;
    icon: any;
    onPress?: () => void | undefined;
    disabled?: boolean;
    active?: boolean;
    provider?: any;
  }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected: active }}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [
        styles.button,
        active && styles.buttonActive,
        disabled && styles.buttonDisabled,
        pressed && { opacity: 0.72 },
      ]}
    >
      <Provider
        name={icon}
        size={16}
        color={disabled ? colors.muted : active ? colors.primary : colors.foreground}
        style={styles.icon}
      />
      <Text
        style={[
          styles.buttonText,
          active && styles.buttonTextActive,
          disabled && { color: colors.muted }
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <ToolButton label="Novo" icon="add-outline" onPress={onNew} />
        <ToolButton label="Abrir" icon="folder-open-outline" onPress={onOpen} />
        <ToolButton label="Guardar" icon="save-outline" onPress={onSave} />
        <View style={styles.separator} />
        <ToolButton
          label="Desfazer"
          icon="arrow-undo-outline"
          onPress={onUndo}
          disabled={!canUndo}
        />
        <ToolButton
          label="Refazer"
          icon="arrow-redo-outline"
          onPress={onRedo}
          disabled={!canRedo}
        />
        <View style={styles.separator} />
        <ToolButton label="Pesquisar" icon="search-outline" onPress={onSearch} />
        <ToolButton label="No projeto" icon="search-circle-outline" onPress={onProjectSearch} />
        <ToolButton label="Comandos" icon="flash-outline" onPress={onCommandPalette} />
        <ToolButton label="IA local" icon="sparkles-outline" onPress={onLocalAI} />
        <View style={styles.separator} />
        <ToolButton label="Templates" icon="copy-outline" onPress={onTemplates} />
        <ToolButton label="Sugestões" icon="bulb-outline" onPress={onSuggestions} />
        <ToolButton label="Limpar" icon="brush-outline" onPress={onFormat} />
        {currentLanguageFeatures.supportsPreview ? (
          <ToolButton label="Preview" icon="eye-outline" onPress={onPreview} />
        ) : null}
        <ToolButton label="Explorador" icon="git-branch-outline" onPress={onProjectTree} />
        <ToolButton label="Gestor" icon="list-outline" onPress={onFileManager} />
        <ToolButton
          label="Problemas"
          icon="warning-outline"
          onPress={onProblems}
          active={problemsActive}
        />
        <ToolButton
          label="Terminal"
          icon="terminal-outline"
          onPress={onTerminal}
          active={terminalActive}
        />
        <View style={styles.separator} />
        <ToolButton
          label={currentLanguageConfig.displayName}
          icon="language-outline"
          onPress={onLanguageSelect}
          active
        />
        <ToolButton label="Definições" icon="settings-outline" onPress={onSettings} />
      </ScrollView>
    </View>
  );
}
