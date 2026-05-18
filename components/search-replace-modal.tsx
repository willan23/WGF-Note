import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import {
  findMatches,
  getActiveMatchIndex,
  getAdjacentMatch,
  replaceAllMatches,
  replaceMatch,
} from '@/lib/search-utils';

interface SearchReplaceModalProps {
  visible: boolean;
  content: string;
  selectionStart: number;
  selectionEnd: number;
  onClose: () => void;
  onSelectRange: (start: number, end: number) => void;
  onApplyContent: (content: string, selectionStart: number, selectionEnd: number) => void;
}

export function SearchReplaceModal({
  visible,
  content,
  selectionStart,
  selectionEnd,
  onClose,
  onSelectRange,
  onApplyContent,
}: SearchReplaceModalProps) {
  const colors = useColors();
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);

  const matches = useMemo(
    () => findMatches(content, searchQuery, { caseSensitive, wholeWord }),
    [caseSensitive, content, searchQuery, wholeWord],
  );
  const activeMatchIndex = useMemo(
    () => getActiveMatchIndex(matches, selectionStart, selectionEnd),
    [matches, selectionEnd, selectionStart],
  );

  const navigate = useCallback(
    (direction: 'next' | 'previous') => {
      const match = getAdjacentMatch(matches, selectionStart, selectionEnd, direction);
      if (match) {
        onSelectRange(match.start, match.end);
      }
    },
    [matches, onSelectRange, selectionEnd, selectionStart],
  );

  const handleReplace = useCallback(() => {
    const activeMatch =
      activeMatchIndex >= 0
        ? matches[activeMatchIndex]
        : getAdjacentMatch(matches, selectionStart, selectionEnd, 'next');
    if (!activeMatch) return;

    const result = replaceMatch(content, activeMatch, replaceQuery);
    onApplyContent(result.content, result.selectionStart, result.selectionEnd);
  }, [
    activeMatchIndex,
    content,
    matches,
    onApplyContent,
    replaceQuery,
    selectionEnd,
    selectionStart,
  ]);

  const handleReplaceAll = useCallback(() => {
    const result = replaceAllMatches(content, matches, replaceQuery);
    onApplyContent(result.content, result.selectionStart, result.selectionEnd);
  }, [content, matches, onApplyContent, replaceQuery]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
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
        optionsRow: {
          flexDirection: 'row',
          gap: 8,
          marginBottom: 12,
        },
        optionButton: {
          paddingHorizontal: 10,
          paddingVertical: 7,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        },
        optionButtonActive: {
          borderColor: colors.primary,
          backgroundColor: `${colors.primary}16`,
        },
        optionText: {
          color: colors.muted,
          fontSize: 12,
          fontWeight: '600',
        },
        optionTextActive: {
          color: colors.foreground,
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
        buttonDisabled: {
          opacity: 0.45,
        },
        buttonText: {
          fontSize: 13,
          fontWeight: '600',
          color: colors.background,
        },
        secondaryButtonText: {
          color: colors.foreground,
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

  const matchLabel =
    matches.length === 0
      ? 'Nenhuma correspondência'
      : activeMatchIndex >= 0
        ? `${activeMatchIndex + 1}/${matches.length} correspondências`
        : `${matches.length} correspondência${matches.length !== 1 ? 's' : ''}`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Pesquisar e Substituir</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar pesquisa"
              style={styles.closeButton}
              onPress={onClose}
            >
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Pesquisar</Text>
            <TextInput
              accessibilityLabel="Texto a pesquisar"
              style={styles.input}
              placeholder="Digite o texto a pesquisar..."
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.optionsRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: caseSensitive }}
                onPress={() => setCaseSensitive((value) => !value)}
                style={[
                  styles.optionButton,
                  caseSensitive && styles.optionButtonActive,
                ]}
              >
                <Text
                  style={[styles.optionText, caseSensitive && styles.optionTextActive]}
                >
                  Aa exata
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: wholeWord }}
                onPress={() => setWholeWord((value) => !value)}
                style={[styles.optionButton, wholeWord && styles.optionButtonActive]}
              >
                <Text style={[styles.optionText, wholeWord && styles.optionTextActive]}>
                  Palavra inteira
                </Text>
              </Pressable>
            </View>

            <Text style={styles.matchInfo}>{matchLabel}</Text>
          </View>

          <View style={styles.buttonRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Correspondência anterior"
              style={[
                styles.button,
                styles.secondaryButton,
                matches.length === 0 && styles.buttonDisabled,
              ]}
              disabled={matches.length === 0}
              onPress={() => navigate('previous')}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>Anterior</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Próxima correspondência"
              style={[
                styles.button,
                styles.secondaryButton,
                matches.length === 0 && styles.buttonDisabled,
              ]}
              disabled={matches.length === 0}
              onPress={() => navigate('next')}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>Seguinte</Text>
            </Pressable>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Substituir por</Text>
            <TextInput
              accessibilityLabel="Texto de substituição"
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
              accessibilityRole="button"
              style={[
                styles.button,
                styles.secondaryButton,
                matches.length === 0 && styles.buttonDisabled,
              ]}
              disabled={matches.length === 0}
              onPress={handleReplace}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>Substituir</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={[
                styles.button,
                styles.primaryButton,
                matches.length === 0 && styles.buttonDisabled,
              ]}
              disabled={matches.length === 0}
              onPress={handleReplaceAll}
            >
              <Text style={styles.buttonText}>Substituir Tudo</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
