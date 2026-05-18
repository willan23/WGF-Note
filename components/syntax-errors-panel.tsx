import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { SyntaxError } from '@/lib/types';

interface SyntaxErrorsPanelProps {
  errors: SyntaxError[];
  onErrorPress?: (error: SyntaxError) => void;
  embedded?: boolean;
}

export function SyntaxErrorsPanel({
  errors,
  onErrorPress,
  embedded = false,
}: SyntaxErrorsPanelProps) {
  const colors = useColors();

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderTopWidth: embedded ? 0 : 1,
      borderTopColor: colors.border,
      maxHeight: embedded ? undefined : 200,
      flex: embedded ? 1 : undefined,
    },
    header: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.foreground,
      textTransform: 'uppercase',
    },
    errorCount: {
      fontSize: 11,
      backgroundColor: colors.error,
      color: colors.background,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 3,
      overflow: 'hidden' as const,
    },
    errorItem: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    errorIcon: {
      fontSize: 14,
      marginRight: 8,
      marginTop: 2,
      width: 16,
    },
    errorContent: {
      flex: 1,
    },
    errorLocation: {
      fontSize: 11,
      color: colors.muted,
      marginBottom: 2,
    },
    errorMessage: {
      fontSize: 12,
      color: colors.foreground,
    },
    emptyState: {
      paddingHorizontal: 12,
      paddingVertical: 16,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 12,
      color: colors.success,
    },
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return colors.error;
      case 'warning':
        return colors.warning;
      case 'info':
        return colors.primary;
      default:
        return colors.foreground;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return '•';
    }
  };

  const renderErrorItem = ({ item }: { item: SyntaxError }) => (
    <Pressable
      style={styles.errorItem}
      onPress={() => onErrorPress?.(item)}
    >
      <Text
        style={[
          styles.errorIcon,
          { color: getSeverityColor(item.severity) },
        ]}
      >
        {getSeverityIcon(item.severity)}
      </Text>
      <View style={styles.errorContent}>
        <Text style={styles.errorLocation}>
          Linha {item.line}, Coluna {item.column}
        </Text>
        <Text style={styles.errorMessage}>{item.message}</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {embedded ? null : (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Problemas</Text>
          {errors.length > 0 && (
            <Text style={styles.errorCount}>{errors.length}</Text>
          )}
        </View>
      )}
      {errors.length > 0 ? (
        <FlatList
          data={errors}
          renderItem={renderErrorItem}
          keyExtractor={(item, index) => `${item.line}-${index}`}
          scrollEnabled
          nestedScrollEnabled
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>✓ Nenhum problema encontrado</Text>
        </View>
      )}
    </View>
  );
}
