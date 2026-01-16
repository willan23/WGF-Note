import React, { useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  FlatList,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { useEditor } from '@/lib/editor-context';
import { getContextSuggestions, Suggestion } from '@/lib/context-suggestions';

interface CodeSuggestionsProps {
  visible: boolean;
  code: string;
  line: number;
  column?: number;
  onSelectSuggestion: (suggestion: Suggestion) => void;
  onClose: () => void;
}

export function CodeSuggestions({
  visible,
  code,
  line,
  column = 0,
  onSelectSuggestion,
  onClose,
}: CodeSuggestionsProps) {
  const colors = useColors();
  const { currentLanguage } = useEditor();

  const suggestions = useMemo(() => {
    if (!visible) return [];
    return getContextSuggestions(currentLanguage, code, line, column);
  }, [currentLanguage, code, line, column, visible]);

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
      maxHeight: '60%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.foreground,
    },
    subtitle: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 4,
    },
    closeButton: {
      padding: 8,
    },
    closeText: {
      fontSize: 20,
      color: colors.muted,
    },
    suggestionItem: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      borderRadius: 6,
      marginBottom: 6,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    suggestionContent: {
      flex: 1,
    },
    suggestionText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 2,
      fontFamily: 'Menlo',
    },
    suggestionDescription: {
      fontSize: 11,
      color: colors.muted,
    },
    suggestionType: {
      fontSize: 10,
      backgroundColor: colors.primary,
      color: colors.background,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 3,
      overflow: 'hidden',
      marginLeft: 8,
    },
    emptyState: {
      padding: 20,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: colors.muted,
      textAlign: 'center',
    },
  });

  const renderSuggestion = ({ item }: { item: Suggestion }) => (
    <Pressable
      style={styles.suggestionItem}
      onPress={() => {
        onSelectSuggestion(item);
        onClose();
      }}
    >
      <View style={styles.suggestionContent}>
        <Text style={styles.suggestionText}>{item.text}</Text>
        <Text style={styles.suggestionDescription}>{item.description}</Text>
      </View>
      <Text style={styles.suggestionType}>{item.type}</Text>
    </Pressable>
  );

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
            <View>
              <Text style={styles.title}>Sugestões de Código</Text>
              <Text style={styles.subtitle}>
                {currentLanguage.toUpperCase()} • Linha {line}, Coluna {column}
              </Text>
            </View>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          {suggestions.length > 0 ? (
            <FlatList
              data={suggestions}
              renderItem={renderSuggestion}
              keyExtractor={(item, index) => `${item.text}-${index}`}
              scrollEnabled={true}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                Nenhuma sugestão disponível neste contexto
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
