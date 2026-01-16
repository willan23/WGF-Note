import { View, Text, Pressable, StyleSheet, ScrollView, Switch } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useEditor } from '@/lib/editor-context';
import { useState } from 'react';

export default function SettingsScreen() {
  const colors = useColors();
  const { settings, updateSettings } = useEditor();
  const [localSettings, setLocalSettings] = useState(settings);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.foreground,
    },
    section: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
      marginBottom: 12,
      textTransform: 'uppercase',
    },
    settingItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    settingLabel: {
      fontSize: 14,
      color: colors.foreground,
      flex: 1,
    },
    settingValue: {
      fontSize: 13,
      color: colors.muted,
      marginLeft: 8,
    },
    button: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.primary,
      borderRadius: 4,
      marginLeft: 8,
    },
    buttonText: {
      fontSize: 12,
      color: colors.background,
      fontWeight: '600',
    },
  });

  const handleThemeToggle = () => {
    const newTheme = localSettings.theme === 'light' ? 'dark' : 'light';
    setLocalSettings({ ...localSettings, theme: newTheme });
    updateSettings({ theme: newTheme });
  };

  const handleFontSizeChange = (delta: number) => {
    const newSize = Math.max(10, Math.min(24, localSettings.fontSize + delta));
    setLocalSettings({ ...localSettings, fontSize: newSize });
    updateSettings({ fontSize: newSize });
  };

  const handleIndentChange = (delta: number) => {
    const newIndent = Math.max(2, Math.min(8, localSettings.indentSize + delta));
    setLocalSettings({ ...localSettings, indentSize: newIndent });
    updateSettings({ indentSize: newIndent });
  };

  const handleToggleSetting = (key: keyof typeof localSettings) => {
    const newValue = !localSettings[key];
    setLocalSettings({ ...localSettings, [key]: newValue });
    updateSettings({ [key]: newValue });
  };

  return (
    <ScreenContainer className="flex-1 p-0">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Definições</Text>
        </View>
        <ScrollView>
          {/* Tema */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Aparência</Text>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Tema</Text>
              <Pressable
                style={styles.button}
                onPress={handleThemeToggle}
              >
                <Text style={styles.buttonText}>
                  {localSettings.theme === 'light' ? '☀️ Claro' : '🌙 Escuro'}
                </Text>
              </Pressable>
            </View>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Tamanho da Fonte</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Pressable
                  style={styles.button}
                  onPress={() => handleFontSizeChange(-1)}
                >
                  <Text style={styles.buttonText}>−</Text>
                </Pressable>
                <Text style={[styles.settingValue, { marginLeft: 12, marginRight: 12 }]}>
                  {localSettings.fontSize}px
                </Text>
                <Pressable
                  style={styles.button}
                  onPress={() => handleFontSizeChange(1)}
                >
                  <Text style={styles.buttonText}>+</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Edição */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Edição</Text>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Tamanho de Indentação</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Pressable
                  style={styles.button}
                  onPress={() => handleIndentChange(-1)}
                >
                  <Text style={styles.buttonText}>−</Text>
                </Pressable>
                <Text style={[styles.settingValue, { marginLeft: 12, marginRight: 12 }]}>
                  {localSettings.indentSize}
                </Text>
                <Pressable
                  style={styles.button}
                  onPress={() => handleIndentChange(1)}
                >
                  <Text style={styles.buttonText}>+</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Usar Espaços</Text>
              <Switch
                value={localSettings.useSpaces}
                onValueChange={() => handleToggleSetting('useSpaces')}
              />
            </View>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Word Wrap</Text>
              <Switch
                value={localSettings.wordWrap}
                onValueChange={() => handleToggleSetting('wordWrap')}
              />
            </View>
          </View>

          {/* Exibição */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Exibição</Text>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Mostrar Números de Linha</Text>
              <Switch
                value={localSettings.showLineNumbers}
                onValueChange={() => handleToggleSetting('showLineNumbers')}
              />
            </View>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Mostrar Espaços em Branco</Text>
              <Switch
                value={localSettings.showWhitespace}
                onValueChange={() => handleToggleSetting('showWhitespace')}
              />
            </View>
          </View>

          {/* Guardar Automático */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Guardar Automático</Text>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Ativar Auto-Save</Text>
              <Switch
                value={localSettings.autoSave}
                onValueChange={() => handleToggleSetting('autoSave')}
              />
            </View>
            {localSettings.autoSave && (
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Intervalo (ms)</Text>
                <Text style={styles.settingValue}>
                  {localSettings.autoSaveInterval}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}
