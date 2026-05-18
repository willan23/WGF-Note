import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useColors } from '@/hooks/use-colors';
import { getLoginUrl, isExternalOAuthConfigured } from '@/constants/oauth';
import * as Api from '@/lib/_core/api';
import * as Auth from '@/lib/_core/auth';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onAuthenticated?: () => Promise<void> | void;
}

export function AuthModal({ visible, onClose, onAuthenticated }: AuthModalProps) {
  const colors = useColors();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const usesExternalOAuth = isExternalOAuthConfigured();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        },
        modal: {
          backgroundColor: colors.background,
          borderRadius: 12,
          padding: 24,
          width: '100%',
          maxWidth: 400,
          gap: 16,
        },
        title: {
          fontSize: 24,
          fontWeight: '700',
          color: colors.foreground,
          textAlign: 'center',
        },
        subtitle: {
          fontSize: 14,
          color: colors.muted,
          textAlign: 'center',
          lineHeight: 20,
        },
        button: {
          backgroundColor: colors.primary,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
        },
        secondaryButton: {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        },
        buttonText: {
          color: colors.background,
          fontSize: 16,
          fontWeight: '600',
        },
        secondaryText: {
          color: colors.foreground,
        },
        input: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 11,
          color: colors.foreground,
          backgroundColor: colors.surface,
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

  const handleAuthenticate = async () => {
    setIsLoading(true);

    try {
      const url = getLoginUrl();
      if (Platform.OS === 'web') {
        window.location.assign(url);
        return;
      }

      await WebBrowser.openAuthSessionAsync(url);
      onClose();
    } catch (error) {
      Alert.alert(
        'Autenticação',
        error instanceof Error ? error.message : 'Não foi possível abrir o login.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocalAuthenticate = async () => {
    setIsLoading(true);

    try {
      const result = await Api.devLogin({ email, name });
      const userInfo: Auth.User = {
        ...result.user,
        lastSignedIn: new Date(result.user.lastSignedIn),
      };

      await Auth.setSessionToken(result.sessionToken);
      await Auth.setUserInfo(userInfo);
      await onAuthenticated?.();
      onClose();
    } catch (error) {
      Alert.alert(
        'Autenticação local',
        error instanceof Error ? error.message : 'Não foi possível iniciar sessão localmente.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.modal}>
          <Text style={styles.title}>Entrar</Text>
          <Text style={styles.subtitle}>
            {usesExternalOAuth
              ? 'Inicie sessão para sincronizar ficheiros, colaborar e usar execução Python.'
              : 'Modo local ativo: entre com um email para sincronizar e colaborar sem serviço externo.'}
          </Text>

          {usesExternalOAuth ? (
            <Pressable style={styles.button} onPress={handleAuthenticate} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color={colors.background} size="small" /> : null}
              <Text style={styles.buttonText}>
                {isLoading ? 'A abrir login…' : 'Continuar para login'}
              </Text>
            </Pressable>
          ) : (
            <>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="nome"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="email local"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />
              <Pressable
                style={styles.button}
                onPress={handleLocalAuthenticate}
                disabled={isLoading}
              >
                {isLoading ? <ActivityIndicator color={colors.background} size="small" /> : null}
                <Text style={styles.buttonText}>
                  {isLoading ? 'A entrar…' : 'Entrar localmente'}
                </Text>
              </Pressable>
            </>
          )}

          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={onClose}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, styles.secondaryText]}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
