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
import { useMemo, useState } from 'react';
import { useColors } from '@/hooks/use-colors';
import { useEditor } from '@/lib/editor-context';
import {
  checkHermesHealth,
  isHermesLocalAIProvider,
  isOpenAICompatibleLocalAIProvider,
  listLocalAIModels,
} from '@/lib/local-ai';
import { isDesktopRuntime } from '@/lib/desktop-bridge';
import type { LocalAIProvider } from '@/lib/types';

type ProviderStatus = {
  tone: 'success' | 'warning' | 'error';
  title: string;
  message: string;
};

function getDefaultLocalAIBaseUrl(provider: LocalAIProvider): string {
  if (provider === 'ollama') return 'http://127.0.0.1:11434';
  if (provider === 'hermes') return 'http://127.0.0.1:8642';
  return 'http://127.0.0.1:1234';
}

function getDefaultLocalAIModel(provider: LocalAIProvider): string {
  if (provider === 'hermes') return 'omega-supreme';
  return '';
}

function getProviderLabel(provider: LocalAIProvider): string {
  if (provider === 'ollama') return 'Ollama';
  if (provider === 'hermes') return 'Hermes nativo';
  return 'API compatível';
}

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
    providerRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 10,
    },
    providerButton: {
      flex: 1,
      minWidth: 118,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      alignItems: 'center',
    },
    providerButtonActive: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}16`,
    },
    providerButtonText: {
      color: colors.foreground,
      fontSize: 13,
      fontWeight: '700',
    },
    statusCard: {
      marginTop: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      padding: 12,
      gap: 4,
    },
    statusCardSuccess: {
      borderColor: `${colors.success}66`,
      backgroundColor: `${colors.success}12`,
    },
    statusCardWarning: {
      borderColor: `${colors.warning}66`,
      backgroundColor: `${colors.warning}12`,
    },
    statusCardError: {
      borderColor: `${colors.error}66`,
      backgroundColor: `${colors.error}12`,
    },
    statusTitle: {
      color: colors.foreground,
      fontSize: 13,
      fontWeight: '800',
    },
    statusText: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 17,
    },
    guideCard: {
      marginTop: 12,
      borderWidth: 1,
      borderColor: `${colors.primary}44`,
      borderRadius: 12,
      backgroundColor: `${colors.primary}0f`,
      padding: 12,
      gap: 6,
    },
    guideTitle: {
      color: colors.foreground,
      fontSize: 13,
      fontWeight: '800',
    },
    guideText: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18,
    },
    guideCode: {
      color: colors.foreground,
      fontSize: 12,
      fontFamily: 'Menlo',
      lineHeight: 18,
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
      colors.error,
      colors.foreground,
      colors.muted,
      colors.primary,
      colors.success,
      colors.surface,
      colors.warning,
    ],
  );

  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);

  const handleUpdate = (updates: Partial<typeof settings>) => {
    updateSettings(updates);
  };

  const handleProviderChange = (provider: LocalAIProvider) => {
    if (provider === settings.localAiProvider) return;

    handleUpdate({
      localAiProvider: provider,
      localAiBaseUrl: getDefaultLocalAIBaseUrl(provider),
      localAiModel: getDefaultLocalAIModel(provider),
      localAiApiKey: '',
    });
    setProviderStatus(null);
  };

  const handleTestLocalAI = async () => {
    try {
      let hermesHealthMessage: string | null = null;
      if (isHermesLocalAIProvider(settings.localAiProvider)) {
        try {
          const health = await checkHermesHealth(
            settings.localAiBaseUrl,
            settings.localAiApiKey,
          );
          hermesHealthMessage = `Health: ${health.status}`;
        } catch (error) {
          hermesHealthMessage =
            error instanceof Error
              ? `Health indisponível: ${error.message}`
              : 'Health indisponível.';
        }
      }

      const models = await listLocalAIModels({
        provider: settings.localAiProvider,
        baseUrl: settings.localAiBaseUrl,
        apiKey: settings.localAiApiKey,
      });
      Alert.alert(
        'Ligação concluída',
        models.length > 0
          ? [
              `Modelos disponíveis: ${models.map((model) => model.name).join(', ')}`,
              hermesHealthMessage,
            ]
              .filter(Boolean)
              .join('\n')
          : 'O servidor respondeu, mas ainda não há modelos anunciados.',
      );
      setProviderStatus({
        tone: models.length > 0 ? 'success' : 'warning',
        title: models.length > 0 ? 'Ligação saudável' : 'Servidor sem modelos',
        message:
          models.length > 0
            ? [
                `Modelos encontrados: ${models.map((model) => model.name).join(', ')}`,
                hermesHealthMessage,
              ]
                .filter(Boolean)
                .join(' · ')
            : settings.localAiProvider === 'hermes'
              ? 'A API respondeu, mas /v1/models não devolveu modelos. Confirme API_SERVER_MODEL_NAME ou a configuração do gateway.'
              : isOpenAICompatibleLocalAIProvider(settings.localAiProvider)
                ? 'A API respondeu, mas /v1/models não devolveu modelos. Confirme o servidor compatível.'
                : 'O Ollama respondeu, mas ainda não há modelos instalados.',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Não foi possível contactar a IA local.';
      Alert.alert(
        'Ligação falhou',
        message,
      );
      setProviderStatus({
        tone: 'error',
        title: 'Ligação falhou',
        message:
          settings.localAiProvider === 'hermes'
            ? `${message} Para Hermes/Omega, confirme WSL2, API_SERVER_ENABLED=true e porta 8642.`
            : isOpenAICompatibleLocalAIProvider(settings.localAiProvider)
              ? `${message} Confirme se a API compatível está aberta e expõe /v1/models.`
              : `${message} Confirme se o Ollama está aberto e acessível.`,
      });
    }
  };

  const handleAutoConfigureLocalAI = async () => {
    const baseUrl =
      settings.localAiBaseUrl.trim() ||
      getDefaultLocalAIBaseUrl(settings.localAiProvider);

    try {
      const models = await listLocalAIModels({
        provider: settings.localAiProvider,
        baseUrl,
        apiKey: settings.localAiApiKey,
      });
      if (models.length === 0) {
        Alert.alert(
          'Servidor encontrado',
          settings.localAiProvider === 'hermes'
            ? 'A API respondeu, mas não anunciou modelos. Confirme se o Hermes/Omega API Server está ativo.'
            : isOpenAICompatibleLocalAIProvider(settings.localAiProvider)
              ? 'A API respondeu, mas não anunciou modelos. Confirme o modelo configurado no servidor compatível.'
              : 'O servidor respondeu, mas ainda não há modelos instalados. Instale um modelo coder no Ollama e volte a tentar.',
        );
        setProviderStatus({
          tone: 'warning',
          title: 'Servidor encontrado',
          message:
            settings.localAiProvider === 'hermes'
              ? 'O Hermes/Omega respondeu, mas não anunciou modelos. O chat pode funcionar se o modelo estiver correto.'
              : isOpenAICompatibleLocalAIProvider(settings.localAiProvider)
                ? 'A API compatível respondeu, mas precisa anunciar ou aceitar o modelo configurado.'
                : 'O Ollama respondeu, mas precisa de um modelo instalado.',
        });
        handleUpdate({
          localAiEnabled: true,
          localAiProvider: settings.localAiProvider,
          localAiBaseUrl: baseUrl,
        });
        return;
      }

      const localModels = models.filter(
        (item) => !`${item.name} ${item.model}`.toLocaleLowerCase().includes(':cloud'),
      );
      const candidateModels = localModels.length > 0 ? localModels : models;
      const preferredModel =
        candidateModels.find((item) =>
          isOpenAICompatibleLocalAIProvider(settings.localAiProvider)
            ? /omega|hermes|agent/i.test(`${item.name} ${item.model}`)
            : /coder|code|qwen/i.test(`${item.name} ${item.model}`),
        ) ??
        candidateModels[0];

      handleUpdate({
        localAiEnabled: true,
        localAiProvider: settings.localAiProvider,
        localAiBaseUrl: baseUrl,
        localAiModel: preferredModel.name,
      });
      Alert.alert(
        'IA local pronta',
        `Configurado ${preferredModel.name}. Já podes conversar e pedir código no editor.`,
      );
      setProviderStatus({
        tone: 'success',
        title: 'IA pronta',
        message: `Configurado ${preferredModel.name} em ${baseUrl}.`,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? `${error.message} No PC, confirme se o provedor está aberto em ${baseUrl}.`
          : 'Não foi possível configurar a IA local automaticamente.';
      Alert.alert(
        'Não encontrei a IA local',
        message,
      );
      setProviderStatus({
        tone: 'error',
        title: 'Configuração falhou',
        message,
      });
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
          <Text style={styles.sectionTitle}>IA local / agente</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Ativar IA local</Text>
              <Text style={styles.settingDescription}>
                Usa Ollama, Hermes/Omega nativo ou outra API compatível, sem API paga.
              </Text>
            </View>
            <Switch
              value={settings.localAiEnabled}
              onValueChange={(val) => handleUpdate({ localAiEnabled: val })}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.settingLabel}>Provedor</Text>
            <Text style={styles.settingDescription}>
              Hermes nativo transforma respostas do agente em ações dentro do IDE.
            </Text>
            <View style={styles.providerRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: settings.localAiProvider === 'ollama' }}
                style={[
                  styles.providerButton,
                  settings.localAiProvider === 'ollama' && styles.providerButtonActive,
                ]}
                onPress={() => handleProviderChange('ollama')}
              >
                <Text style={styles.providerButtonText}>Ollama</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: settings.localAiProvider === 'hermes' }}
                style={[
                  styles.providerButton,
                  settings.localAiProvider === 'hermes' && styles.providerButtonActive,
                ]}
                onPress={() => handleProviderChange('hermes')}
              >
                <Text style={styles.providerButtonText}>Hermes nativo</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{
                  selected: settings.localAiProvider === 'openai-compatible',
                }}
                style={[
                  styles.providerButton,
                  settings.localAiProvider === 'openai-compatible' &&
                    styles.providerButtonActive,
                ]}
                onPress={() => handleProviderChange('openai-compatible')}
              >
                <Text style={styles.providerButtonText}>Compatível</Text>
              </Pressable>
            </View>
            {isHermesLocalAIProvider(settings.localAiProvider) ? (
              <View style={styles.guideCard}>
                <Text style={styles.guideTitle}>Como ligar Hermes/Omega</Text>
                <Text style={styles.guideText}>
                  No Windows, execute o Hermes em WSL2 e ative o API Server antes de
                  testar a ligação no WGF Note. Com API_SERVER_KEY, o WGF Note também
                  envia uma sessão estável para continuidade nativa.
                </Text>
                <Text style={styles.guideCode}>API_SERVER_ENABLED=true</Text>
                <Text style={styles.guideCode}>API_SERVER_PORT=8642</Text>
                <Text style={styles.guideCode}>API_SERVER_KEY=opcional_para_sessao</Text>
                <Text style={styles.guideCode}>omega gateway start</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.settingLabel}>
              {isOpenAICompatibleLocalAIProvider(settings.localAiProvider)
                ? `Endereço ${getProviderLabel(settings.localAiProvider)}`
                : 'Endereço do Ollama'}
            </Text>
            <Text style={styles.settingDescription}>
              {settings.localAiProvider === 'hermes'
                ? 'Para Hermes/Omega, o padrão local é http://127.0.0.1:8642.'
                : settings.localAiProvider === 'openai-compatible'
                  ? 'Use o endereço raiz; o WGF Note adiciona /v1 automaticamente.'
                : 'No desktop, o valor padrão normalmente é http://127.0.0.1:11434.'}
            </Text>
            <TextInput
              accessibilityLabel="Endereço da IA local"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="http://192.168.1.10:11434"
              placeholderTextColor={colors.muted}
              value={settings.localAiBaseUrl}
              onChangeText={(value) => handleUpdate({ localAiBaseUrl: value })}
              style={styles.textInput}
            />
          </View>

          {isOpenAICompatibleLocalAIProvider(settings.localAiProvider) ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.settingLabel}>Chave API opcional</Text>
              <Text style={styles.settingDescription}>
                No Hermes, também permite sessão nativa via X-Omega-Session-Id quando API_SERVER_KEY estiver ativo.
              </Text>
              <TextInput
                accessibilityLabel="Chave API da IA local"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                placeholder="opcional"
                placeholderTextColor={colors.muted}
                value={settings.localAiApiKey}
                onChangeText={(value) => handleUpdate({ localAiApiKey: value })}
                style={styles.textInput}
              />
            </View>
          ) : null}

          <View style={styles.fieldGroup}>
            <Text style={styles.settingLabel}>Modelo</Text>
            <Text style={styles.settingDescription}>
              {settings.localAiProvider === 'hermes'
                ? 'No Hermes/Omega, normalmente é omega-supreme.'
                : settings.localAiProvider === 'openai-compatible'
                  ? 'Escreva o ID exato anunciado pela API compatível.'
                : 'Escreva o nome exato do modelo instalado no Ollama.'}
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
            {providerStatus ? (
              <View
                style={[
                  styles.statusCard,
                  providerStatus.tone === 'success'
                    ? styles.statusCardSuccess
                    : providerStatus.tone === 'warning'
                      ? styles.statusCardWarning
                      : styles.statusCardError,
                ]}
              >
                <Text style={styles.statusTitle}>{providerStatus.title}</Text>
                <Text style={styles.statusText}>{providerStatus.message}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>WGF Note v1.0.7</Text>
        </View>
      </ScrollView>
    </View>
  );
}
