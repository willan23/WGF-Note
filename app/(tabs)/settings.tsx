import { View, Text, Pressable, StyleSheet, ScrollView, Switch } from 'react-native';
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
      paddingHorizontal: 20,
      paddingVertical: 24,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.foreground,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.muted,
      marginTop: 4,
    },
    section: {
      paddingHorizontal: 20,
      paddingVertical: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.primary,
      marginBottom: 16,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
    },
    settingItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
    },
    settingInfo: {
      flex: 1,
    },
    settingLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
    },
    settingDescription: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 2,
    },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    controlButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    controlButtonText: {
      fontSize: 20,
      color: colors.foreground,
      lineHeight: 24,
    },
    controlValue: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.foreground,
      minWidth: 40,
      textAlign: 'center',
    },
    pickerButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pickerButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
  });

  const handleUpdate = (updates: Partial<typeof localSettings>) => {
    const newSettings = { ...localSettings, ...updates };
    setLocalSettings(newSettings);
    updateSettings(updates);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Definições</Text>
        <Text style={styles.headerSubtitle}>Personalize sua experiência de desenvolvimento</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* APARÊNCIA */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aparência</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Tema do Editor</Text>
              <Text style={styles.settingDescription}>Escolha entre modo claro ou escuro</Text>
            </View>
            <Pressable
              style={styles.pickerButton}
              onPress={() => handleUpdate({ theme: localSettings.theme === 'dark' ? 'light' : 'dark' })}
            >
              <Text style={styles.pickerButtonText}>
                {localSettings.theme === 'dark' ? '🌙 Escuro' : '☀️ Claro'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Tamanho da Fonte</Text>
              <Text style={styles.settingDescription}>Ajuste a escala do texto no editor</Text>
            </View>
            <View style={styles.controls}>
              <Pressable style={styles.controlButton} onPress={() => handleUpdate({ fontSize: Math.max(10, localSettings.fontSize - 1) })}>
                <Text style={styles.controlButtonText}>−</Text>
              </Pressable>
              <Text style={styles.controlValue}>{localSettings.fontSize}px</Text>
              <Pressable style={styles.controlButton} onPress={() => handleUpdate({ fontSize: Math.min(30, localSettings.fontSize + 1) })}>
                <Text style={styles.controlButtonText}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* EDITOR */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Edição</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Indentação</Text>
              <Text style={styles.settingDescription}>Número de espaços por tabulação</Text>
            </View>
            <View style={styles.controls}>
              <Pressable style={styles.controlButton} onPress={() => handleUpdate({ indentSize: Math.max(2, localSettings.indentSize - 2) })}>
                <Text style={styles.controlButtonText}>−</Text>
              </Pressable>
              <Text style={styles.controlValue}>{localSettings.indentSize}</Text>
              <Pressable style={styles.controlButton} onPress={() => handleUpdate({ indentSize: Math.min(8, localSettings.indentSize + 2) })}>
                <Text style={styles.controlButtonText}>+</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Números de Linha</Text>
              <Text style={styles.settingDescription}>Mostrar contagem lateral no editor</Text>
            </View>
            <Switch
              value={localSettings.showLineNumbers}
              onValueChange={(val) => handleUpdate({ showLineNumbers: val })}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Word Wrap</Text>
              <Text style={styles.settingDescription}>Quebra de linha automática</Text>
            </View>
            <Switch
              value={localSettings.wordWrap}
              onValueChange={(val) => handleUpdate({ wordWrap: val })}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </View>

        {/* PERSISTÊNCIA */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sistema</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Auto-Save</Text>
              <Text style={styles.settingDescription}>Guardar alterações automaticamente</Text>
            </View>
            <Switch
              value={localSettings.autoSave}
              onValueChange={(val) => handleUpdate({ autoSave: val })}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          {localSettings.autoSave && (
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Intervalo (ms)</Text>
                <Text style={styles.settingDescription}>Tempo entre gravações</Text>
              </View>
              <Text style={styles.controlValue}>{localSettings.autoSaveInterval}ms</Text>
            </View>
          )}
        </View>

        <View style={{ padding: 40, alignItems: 'center' }}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>Python Notepad++ v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}
