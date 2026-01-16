import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { authenticateUser, logoutUser, getCurrentUser } from '@/lib/cloud-sync';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
}

export function AuthModal({ visible, onClose, onAuthSuccess }: AuthModalProps) {
  const colors = useColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  const styles = StyleSheet.create({
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
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: colors.muted,
      textAlign: 'center',
      marginBottom: 16,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.foreground,
      marginBottom: 12,
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
    buttonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: '600',
    },
    toggleButton: {
      paddingVertical: 8,
      alignItems: 'center',
    },
    toggleText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '500',
    },
    errorText: {
      color: colors.error,
      fontSize: 12,
      marginBottom: 8,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
  });

  const handleAuthenticate = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    setIsLoading(true);
    try {
      const user = await authenticateUser(email, password);
      if (user) {
        Alert.alert('Sucesso', `Bem-vindo, ${user.name}!`);
        setEmail('');
        setPassword('');
        onAuthSuccess?.();
        onClose();
      } else {
        Alert.alert('Erro', 'Falha na autenticação. Tente novamente.');
      }
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro durante a autenticação');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Tem a certeza que deseja fazer logout?', [
      {
        text: 'Cancelar',
        onPress: () => {},
        style: 'cancel',
      },
      {
        text: 'Logout',
        onPress: async () => {
          await logoutUser();
          setEmail('');
          setPassword('');
          onClose();
        },
        style: 'destructive',
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.modal}>
          <Text style={styles.title}>
            {isLogin ? 'Login' : 'Registar'}
          </Text>
          <Text style={styles.subtitle}>
            {isLogin
              ? 'Aceda à sua conta para sincronizar ficheiros'
              : 'Crie uma conta para sincronizar ficheiros na cloud'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            editable={!isLoading}
          />

          <TextInput
            style={styles.input}
            placeholder="Palavra-passe"
            placeholderTextColor={colors.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
          />

          <Pressable
            style={styles.button}
            onPress={handleAuthenticate}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.background} size="small" />
                <Text style={styles.buttonText}>
                  {isLogin ? 'A fazer login...' : 'A registar...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>
                {isLogin ? 'Login' : 'Registar'}
              </Text>
            )}
          </Pressable>

          <Pressable
            style={styles.toggleButton}
            onPress={() => setIsLogin(!isLogin)}
            disabled={isLoading}
          >
            <Text style={styles.toggleText}>
              {isLogin
                ? 'Não tem conta? Registar'
                : 'Já tem conta? Login'}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.button, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
            onPress={onClose}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, { color: colors.foreground }]}>
              Cancelar
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
