import React, { useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  FlatList,
  Platform,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { useEditor } from '@/lib/editor-context';
import { getContextSuggestions, Suggestion } from '@/lib/context-suggestions';
import { Ionicons } from '@expo/vector-icons';

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
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'flex-end',
    },
    modal: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingVertical: 20,
      maxHeight: '70%',
      ...Platform.select({
        web: {
          boxShadow: '0 -4px 10px rgba(0,0,0,0.2)',
        },
        default: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.2,
          shadowRadius: 10,
          elevation: 10,
        }
      })
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.foreground,
    },
    subtitle: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 4,
      letterSpacing: 0.5,
    },
    closeButton: {
      padding: 4,
      borderRadius: 20,
      backgroundColor: colors.surface,
    },
    suggestionItem: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: `${colors.primary}15`,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    suggestionContent: {
      flex: 1,
    },
    suggestionText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 2,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    suggestionDescription: {
      fontSize: 12,
      color: colors.muted,
    },
    suggestionType: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.primary,
      backgroundColor: `${colors.primary}15`,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 5,
      textTransform: 'uppercase',
      overflow: 'hidden',
    },
    emptyState: {
      padding: 40,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: colors.muted,
      textAlign: 'center',
      marginTop: 10,
    },
  });

  const getIconForType = (type: string) => {
    switch (type) {
      case 'keyword': return 'key-outline';
      case 'function': return 'code-slash-outline';
      case 'variable': return 'at-outline';
      case 'class': return 'cube-outline';
      default: return 'bulb-outline';
    }
  };

  const renderSuggestion = ({ item }: { item: Suggestion }) => (
    <Pressable
      style={({ pressed }) => [
        styles.suggestionItem,
        pressed && { backgroundColor: `${colors.primary}05`, borderColor: colors.primary },
      ]}
      onPress={() => {
        onSelectSuggestion(item);
        onClose();
      }}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={getIconForType(item.type)} size={18} color={colors.primary} />
      </View>
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
              <Text style={styles.title}>Sugestões</Text>
              <Text style={styles.subtitle}>
                {currentLanguage.toUpperCase()} • LINHA {line}
              </Text>
            </View>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.muted} />
            </Pressable>
          </View>

          {suggestions.length > 0 ? (
            <FlatList
              data={suggestions}
              renderItem={renderSuggestion}
              keyExtractor={(item, index) => `${item.text}-${index}`}
              scrollEnabled={true}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="sparkles-outline" size={48} color={colors.border} />
              <Text style={styles.emptyText}>
                Nenhuma sugestão para este contexto
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

