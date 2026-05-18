import {
  Alert,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Switch,
  TextInput,
} from 'react-native';
import { useMemo } from 'react';
import { useColors } from '@/hooks/use-colors';
import { useEditor } from '@/lib/editor-context';
import { listOllamaModels } from '@/lib/local-ai';
import { isDesktopRuntime } from '@/lib/desktop-bridge';

export default function SettingsScreen() {
  const colors = useColors();
  const { settings, updateSettings } = useEditor();

  const styles = useMemo(
    () =>
      StyleSheet.create({
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
    textInput: {
      marginTop: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.foreground,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
    },
    inlineActionButton: {
      marginTop: 12,
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: colors.primary,
    },
    inlineActionText: {
      color: colors.background,
      fontSize: 13,
      fontWeight: '700',
    },
    fieldGroup: {
      paddingVertical: 8,
    },
    footer: {
      padding: 40,
      alignItems: 'center',
    },
    footerText: {
      color: colors.muted,
      fontSize: 12,
    },
  }),
    [
      colors.background,
      colors.border,
      colors.foreground,
      colors.muted,
      colors.primary,
      colors.surface,
    ],
  );

  const handleUpdate = (updates: Partial<typeof settings>) => {
    updateSettings(updates);
  };

  const handleTestLocalAI = async () => {
    try {
      const models = await listOllamaModels(settings.localAiBaseUrl);
      Alert.alert(
        'Ligação concluída',
        models.length > 0
          ? `Modelos disponíveis: ${models.map((model) => model.name).join(', ')}`
          : 'O Ollama respondeu, mas ainda não há modelos instalados.',
      );
    } catch (error) {
      Alert.alert(
        'Ligação falhou',
        error instanceof Error ? error.message : 'Não foi possível contactar a IA local.',
      );
    }
  };

  const handleAutoConfigureLocalAI = async () => {
    const baseUrl = settings.localAiBaseUrl.trim() || 'http://127.0.0.1:11434';

    try {
      const models = await listOllamaModels(baseUrl);
      if (models.length === 0) {
        Alert.alert(
          'Ollama encontrado',
          'O servidor respondeu, mas ainda não há modelos instalados. Instale um modelo coder no Ollama e volte a tentar.',
        );
        handleUpdate({ localAiEnabled: true, localAiBaseUrl: baseUrl });
        return;
      }

      const localModels = models.filter(
        (item) => !`${item.name} ${item.model}`.toLocaleLowerCase().includes(':cloud'),
      );
      const candidateModels = localModels.length > 0 ? localModels : models;
      const preferredModel =
        candidateModels.find((item) => /coder|code|qwen/i.test(`${item.name} ${item.model}`)) ??
        candidateModels[0];

      handleUpdate({
        localAiEnabled: true,
        localAiBaseUrl: baseUrl,
        localAiModel: preferredModel.name,
      });
      Alert.alert(
        'IA local pronta',
        `Configurado ${preferredModel.name}. Já podes conversar e pedir código no editor.`,
      );
    } catch (error) {
      Alert.alert(
        'Não encontrei o Ollama',
        error instanceof Error
          ? `${error.message} No PC, confirme se o Ollama está aberto em ${baseUrl}.`
          : 'Não foi possível configurar a IA local automaticamente.',
      );
    }
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
              onPress={() => handleUpdate({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
            >
              <Text style={styles.pickerButtonText}>
                {settings.theme === 'dark' ? '🌙 Escuro' : '☀️ Claro'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Tamanho da Fonte</Text>
              <Text style={styles.settingDescription}>Ajuste a escala do texto no editor</Text>
            </View>
            <View style={styles.controls}>
              <Pressable style={styles.controlButton} onPress={() => handleUpdate({ fontSize: Math.max(10, settings.fontSize - 1) })}>
                <Text style={styles.controlButtonText}>−</Text>
              </Pressable>
              <Text style={styles.controlValue}>{settings.fontSize}px</Text>
              <Pressable style={styles.controlButton} onPress={() => handleUpdate({ fontSize: Math.min(30, settings.fontSize + 1) })}>
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
              <Pressable style={styles.controlButton} onPress={() => handleUpdate({ indentSize: Math.max(2, settings.indentSize - 2) })}>
                <Text style={styles.controlButtonText}>−</Text>
              </Pressable>
              <Text style={styles.controlValue}>{settings.indentSize}</Text>
              <Pressable style={styles.controlButton} onPress={() => handleUpdate({ indentSize: Math.min(8, settings.indentSize + 2) })}>
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
              value={settings.showLineNumbers}
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
              value={settings.wordWrap}
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
              value={settings.autoSave}
              onValueChange={(val) => handleUpdate({ autoSave: val })}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          {settings.autoSave && (
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Intervalo (ms)</Text>
                <Text style={styles.settingDescription}>Tempo entre gravações</Text>
              </View>
              <Text style={styles.controlValue}>{settings.autoSaveInterval}ms</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>IA local</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Ativar IA local</Text>
              <Text style={styles.settingDescription}>
                Usa um servidor Ollama teu, sem API paga.
              </Text>
            </View>
            <Switch
              value={settings.localAiEnabled}
              onValueChange={(val) => handleUpdate({ localAiEnabled: val })}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.settingLabel}>Endereço do Ollama</Text>
            <Text style={styles.settingDescription}>
              No telemóvel real, use o IP do computador na rede local.
            </Text>
            <TextInput
              accessibilityLabel="Endereço do Ollama"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="http://192.168.1.10:11434"
              placeholderTextColor={colors.muted}
              value={settings.localAiBaseUrl}
              onChangeText={(value) => handleUpdate({ localAiBaseUrl: value })}
              style={styles.textInput}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.settingLabel}>Modelo</Text>
            <Text style={styles.settingDescription}>
              Escreva o nome exato do modelo instalado no Ollama.
            </Text>
            <TextInput
              accessibilityLabel="Modelo da IA local"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="ex: qwen2.5-coder:7b"
              placeholderTextColor={colors.muted}
              value={settings.localAiModel}
              onChangeText={(value) => handleUpdate({ localAiModel: value })}
              style={styles.textInput}
            />
            <Pressable style={styles.inlineActionButton} onPress={handleTestLocalAI}>
              <Text style={styles.inlineActionText}>Testar ligação</Text>
            </Pressable>
            {isDesktopRuntime() ? (
              <Pressable style={styles.inlineActionButton} onPress={handleAutoConfigureLocalAI}>
                <Text style={styles.inlineActionText}>Configurar automaticamente no PC</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>WGF Note v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}
