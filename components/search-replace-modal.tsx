import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';

interface SearchReplaceModalProps {
  visible: boolean;
  onClose: () => void;
  onSearch: (query: string) => number | Promise<number> | void;
  onReplace: (query: string, replacement: string) => void;
  onReplaceAll: (query: string, replacement: string) => void;
}

export function SearchReplaceModal({
  visible,
  onClose,
  onSearch,
  onReplace,
  onReplaceAll,
}: SearchReplaceModalProps) {
  const colors = useColors();
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [matchCount, setMatchCount] = useState(0);

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    try {
      const result = onSearch(text as string) as number | Promise<number> | void;
      if (typeof result === 'number') {
        setMatchCount(result);
      } else if (result && typeof (result as Promise<number>).then === 'function') {
        const awaited = await (result as Promise<number>);
        if (typeof awaited === 'number') setMatchCount(awaited);
      } else {
        setMatchCount(0);
      }
    } catch (err) {
      setMatchCount(0);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modal: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 16,
      maxHeight: '80%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.foreground,
    },
    closeButton: {
      padding: 8,
    },
    closeText: {
      fontSize: 20,
      color: colors.muted,
    },
    inputContainer: {
      marginBottom: 12,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.muted,
      marginBottom: 6,
      textTransform: 'uppercase',
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.foreground,
      marginBottom: 8,
    },
    matchInfo: {
      fontSize: 12,
      color: colors.muted,
      marginBottom: 12,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    button: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    primaryButton: {
      backgroundColor: colors.primary,
    },
    secondaryButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.background,
    },
    secondaryButtonText: {
      color: colors.foreground,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Pesquisar e Substituir</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Pesquisar</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite o texto a pesquisar..."
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={handleSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {matchCount > 0 && (
              <Text style={styles.matchInfo}>
                {matchCount} correspondência{matchCount !== 1 ? 's' : ''} encontrada{matchCount !== 1 ? 's' : ''}
              </Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Substituir por</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite o texto de substituição..."
              placeholderTextColor={colors.muted}
              value={replaceQuery}
              onChangeText={setReplaceQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.button, styles.secondaryButton]}
              onPress={() => onReplace(searchQuery, replaceQuery)}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                Substituir
              </Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.primaryButton]}
              onPress={() => onReplaceAll(searchQuery, replaceQuery)}
            >
              <Text style={styles.buttonText}>Substituir Tudo</Text>
            </Pressable>
          </View>

          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={onClose}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              Fechar
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
