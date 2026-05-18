import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { CodeExecutionPanel } from '@/components/code-execution-panel';
import { SyntaxErrorsPanel } from '@/components/syntax-errors-panel';
import type { SyntaxError } from '@/lib/types';

export type WorkbenchBottomPanelTab = 'problems' | 'terminal';

type WorkbenchBottomPanelProps = {
  activeTab: WorkbenchBottomPanelTab;
  errors: SyntaxError[];
  onSelectTab: (tab: WorkbenchBottomPanelTab) => void;
  onClose: () => void;
  onErrorPress?: (error: SyntaxError) => void;
};

export function WorkbenchBottomPanel({
  activeTab,
  errors,
  onSelectTab,
  onClose,
  onErrorPress,
}: WorkbenchBottomPanelProps) {
  const colors = useColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          height: 260,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        header: {
          height: 36,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.surface,
        },
        tabs: {
          flexDirection: 'row',
          alignItems: 'center',
          height: '100%',
        },
        tab: {
          height: '100%',
          paddingHorizontal: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          borderRightWidth: 1,
          borderRightColor: colors.border,
        },
        tabActive: {
          backgroundColor: colors.background,
        },
        tabText: {
          color: colors.muted,
          fontSize: 11,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.7,
        },
        tabTextActive: {
          color: colors.foreground,
        },
        count: {
          minWidth: 18,
          paddingHorizontal: 5,
          paddingVertical: 2,
          borderRadius: 999,
          overflow: 'hidden',
          color: colors.background,
          backgroundColor: colors.error,
          fontSize: 10,
          fontWeight: '800',
          textAlign: 'center',
        },
        closeButton: {
          width: 36,
          height: 36,
          alignItems: 'center',
          justifyContent: 'center',
        },
        body: {
          flex: 1,
        },
      }),
    [
      colors.background,
      colors.border,
      colors.error,
      colors.foreground,
      colors.muted,
      colors.surface,
    ],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.tabs}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Problemas"
            accessibilityState={{ selected: activeTab === 'problems' }}
            style={[styles.tab, activeTab === 'problems' && styles.tabActive]}
            onPress={() => onSelectTab('problems')}
          >
            <Text style={[styles.tabText, activeTab === 'problems' && styles.tabTextActive]}>
              Problemas
            </Text>
            {errors.length > 0 ? <Text style={styles.count}>{errors.length}</Text> : null}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Terminal"
            accessibilityState={{ selected: activeTab === 'terminal' }}
            style={[styles.tab, activeTab === 'terminal' && styles.tabActive]}
            onPress={() => onSelectTab('terminal')}
          >
            <Text style={[styles.tabText, activeTab === 'terminal' && styles.tabTextActive]}>
              Terminal
            </Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar painel inferior"
          style={styles.closeButton}
          onPress={onClose}
        >
          <Ionicons name="close" size={16} color={colors.muted} />
        </Pressable>
      </View>

      <View style={styles.body}>
        {activeTab === 'problems' ? (
          <SyntaxErrorsPanel errors={errors} onErrorPress={onErrorPress} embedded />
        ) : (
          <CodeExecutionPanel embedded />
        )}
      </View>
    </View>
  );
}
