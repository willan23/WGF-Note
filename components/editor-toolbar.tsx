import React, { useMemo } from 'react';
import { View, Pressable, Text, ScrollView, StyleSheet, Platform } from 'react-native';
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
  onLocalAI?: () => void;
  onSettings?: () => void;
  onTemplates?: () => void;
  onSuggestions?: () => void;
  onLanguageSelect?: () => void;
  onFormat?: () => void;
  onPreview?: () => void;
  onFileManager?: () => void;
  onProjectTree?: () => void;
}

export function EditorToolbar({
  onNew,
  onOpen,
  onSave,
  onUndo,
  onRedo,
  onSearch,
  onProjectSearch,
  onLocalAI,
  onSettings,
  onTemplates,
  onSuggestions,
  onLanguageSelect,
  onFormat,
  onPreview,
  onFileManager,
  onProjectTree,
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
          height: 70,
        },
        contentContainer: {
          flexDirection: 'row',
          paddingHorizontal: 12,
          paddingVertical: 10,
          alignItems: 'center',
          gap: 10,
        },
        button: {
          flexDirection: 'column',
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 8,
          backgroundColor: colors.background,
          minWidth: 60,
          justifyContent: 'center',
          alignItems: 'center',
          ...Platform.select({
            web: {
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            },
            default: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: 2,
            },
          }),
        },
        buttonActive: {
          backgroundColor: colors.primary,
        },
        buttonDisabled: {
          opacity: 0.3,
        },
        buttonText: {
          fontSize: 10,
          fontWeight: '500',
          color: colors.foreground,
          marginTop: 4,
        },
        buttonTextActive: {
          color: colors.background,
        },
        icon: {
          marginBottom: -2,
        },
      }),
    [
      colors.background,
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
        pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] },
      ]}
    >
      <Provider
        name={icon}
        size={20}
        color={active ? colors.background : (disabled ? colors.muted : colors.primary)}
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
        <ToolButton label="Pesquisar" icon="search-outline" onPress={onSearch} />
        <ToolButton label="No projeto" icon="search-circle-outline" onPress={onProjectSearch} />
        <ToolButton label="IA local" icon="sparkles-outline" onPress={onLocalAI} />
        <ToolButton label="Templates" icon="copy-outline" onPress={onTemplates} />
        <ToolButton label="Sugestões" icon="bulb-outline" onPress={onSuggestions} />
        <ToolButton label="Limpar" icon="brush-outline" onPress={onFormat} />
        {currentLanguageFeatures.supportsPreview ? (
          <ToolButton label="Preview" icon="eye-outline" onPress={onPreview} />
        ) : null}
        <ToolButton label="Projeto" icon="git-branch-outline" onPress={onProjectTree} />
        <ToolButton label="Ficheiros" icon="list-outline" onPress={onFileManager} />
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
