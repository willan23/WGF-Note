import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';

export type CommandPaletteItem = {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onSelect: () => void;
};

type CommandPaletteProps = {
  visible: boolean;
  commands: CommandPaletteItem[];
  onClose: () => void;
};

export function CommandPalette({
  visible,
  commands,
  onClose,
}: CommandPaletteProps) {
  const colors = useColors();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) {
      setQuery('');
    }
  }, [visible]);

  const filteredCommands = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return commands;

    return commands.filter((command) =>
      `${command.label} ${command.description ?? ''}`
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    );
  }, [commands, query]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.48)',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: 72,
        },
        palette: {
          width: '88%',
          maxWidth: 720,
          maxHeight: '72%',
          borderRadius: 12,
          overflow: 'hidden',
          backgroundColor: colors.background,
          borderWidth: 1,
          borderColor: colors.border,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          paddingHorizontal: 14,
          paddingVertical: 12,
        },
        input: {
          flex: 1,
          color: colors.foreground,
          fontSize: 15,
          paddingVertical: 0,
        },
        list: {
          paddingVertical: 6,
        },
        row: {
          minHeight: 48,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 14,
          borderBottomWidth: 1,
          borderBottomColor: `${colors.border}66`,
        },
        rowPressed: {
          backgroundColor: `${colors.primary}14`,
        },
        rowMain: {
          flex: 1,
          gap: 2,
        },
        label: {
          color: colors.foreground,
          fontSize: 13,
          fontWeight: '700',
        },
        description: {
          color: colors.muted,
          fontSize: 11,
        },
        shortcut: {
          color: colors.muted,
          fontSize: 11,
          fontWeight: '700',
          paddingHorizontal: 8,
          paddingVertical: 5,
          borderRadius: 6,
          backgroundColor: colors.surface,
        },
        empty: {
          paddingHorizontal: 16,
          paddingVertical: 24,
          color: colors.muted,
          textAlign: 'center',
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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.palette} onPress={() => undefined}>
          <View style={styles.header}>
            <Ionicons name="flash-outline" size={18} color={colors.primary} />
            <TextInput
              accessibilityLabel="Pesquisar comandos"
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Escreva um comando…"
              placeholderTextColor={colors.muted}
              value={query}
              onChangeText={setQuery}
              style={styles.input}
            />
          </View>

          {filteredCommands.length > 0 ? (
            <FlatList
              data={filteredCommands}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  onPress={() => {
                    item.onSelect();
                    onClose();
                  }}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                >
                  <Ionicons name={item.icon} size={18} color={colors.primary} />
                  <View style={styles.rowMain}>
                    <Text style={styles.label}>{item.label}</Text>
                    {item.description ? (
                      <Text style={styles.description}>{item.description}</Text>
                    ) : null}
                  </View>
                  {item.shortcut ? <Text style={styles.shortcut}>{item.shortcut}</Text> : null}
                </Pressable>
              )}
            />
          ) : (
            <Text style={styles.empty}>Nenhum comando encontrado.</Text>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
