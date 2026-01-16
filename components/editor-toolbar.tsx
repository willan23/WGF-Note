import React from 'react';
import { View, Pressable, Text, ScrollView, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { useEditor } from '@/lib/editor-context';
import { cn } from '@/lib/utils';

interface EditorToolbarProps {
  onNew?: () => void;
  onOpen?: () => void;
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSearch?: () => void;
  onSettings?: () => void;
  onExecute?: () => void;
  onTemplates?: () => void;
  onSuggestions?: () => void;
  onLanguageSelect?: () => void;
  onFormat?: () => void;
  onPreview?: () => void;
  onFileManager?: () => void;
}

export function EditorToolbar({
  onNew,
  onOpen,
  onSave,
  onUndo,
  onRedo,
  onSearch,
  onSettings,
  onExecute,
  onTemplates,
  onSuggestions,
  onLanguageSelect,
  onFormat,
  onPreview,
  onFileManager,
}: EditorToolbarProps) {
  const colors = useColors();
  const { canUndo, canRedo, currentLanguage } = useEditor();

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    contentContainer: {
      flexDirection: 'row',
      paddingHorizontal: 8,
      paddingVertical: 8,
      gap: 4,
    },
    button: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.foreground,
    },
    buttonTextActive: {
      color: colors.background,
    },
  });

  const ToolButton = ({
    label,
    onPress,
    disabled = false,
    active = false,
  }: {
    label: string;
    onPress?: () => void | undefined;
    disabled?: boolean;
    active?: boolean;
  }) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        active && styles.buttonActive,
        disabled && styles.buttonDisabled,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          active && styles.buttonTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      scrollEnabled
    >
      <ToolButton label="📄 Novo" onPress={onNew} />
      <ToolButton label="📂 Abrir" onPress={onOpen} />
      <ToolButton label="💾 Guardar" onPress={onSave} />
      <ToolButton
        label="↶ Desfazer"
        onPress={onUndo}
        disabled={!canUndo}
      />
      <ToolButton
        label="↷ Refazer"
        onPress={onRedo}
        disabled={!canRedo}
      />
      <ToolButton label="🔍 Pesquisar" onPress={onSearch} />
      <ToolButton label="▶ Executar" onPress={onExecute} />
      <ToolButton label="📋 Templates" onPress={onTemplates} />
      <ToolButton label="💡 Sugestões" onPress={onSuggestions} />
      <ToolButton label="🧹 Formatar" onPress={onFormat} />
      <ToolButton label="🔍 Pré-vis" onPress={onPreview} />
      <ToolButton label="📁 Ficheiros" onPress={onFileManager} />
      <ToolButton label={`🌐 ${currentLanguage.toUpperCase()}`} onPress={onLanguageSelect} />
      <ToolButton label="⚙️ Definições" onPress={onSettings} />
    </ScrollView>
  );
}
