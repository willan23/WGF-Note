import React from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { getAvailableLanguages, type CodeLanguage } from '@/lib/types-extended';

interface LanguageSelectorProps {
  visible: boolean;
  currentLanguage: CodeLanguage;
  onSelectLanguage: (language: CodeLanguage) => void;
  onClose: () => void;
}

export function LanguageSelector({
  visible,
  currentLanguage,
  onSelectLanguage,
  onClose,
}: LanguageSelectorProps) {
  const colors = useColors();
  const languages = getAvailableLanguages();

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
      maxHeight: '70%',
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
    languageItem: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderRadius: 8,
      marginBottom: 8,
      borderWidth: 2,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    languageItemActive: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}15`,
    },
    languageIcon: {
      fontSize: 24,
      width: 32,
    },
    languageInfo: {
      flex: 1,
    },
    languageName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 2,
    },
    languageDescription: {
      fontSize: 12,
      color: colors.muted,
    },
    checkmark: {
      fontSize: 18,
      color: colors.primary,
    },
  });

  const renderLanguageItem = (language: any) => {
    const isActive = language.id === currentLanguage;

    return (
      <Pressable
        key={language.id}
        style={[styles.languageItem, isActive && styles.languageItemActive]}
        onPress={() => {
          onSelectLanguage(language.id);
          onClose();
        }}
      >
        <Text style={styles.languageIcon}>{language.icon}</Text>
        <View style={styles.languageInfo}>
          <Text style={styles.languageName}>{language.displayName}</Text>
          <Text style={styles.languageDescription}>{language.description}</Text>
        </View>
        {isActive && <Text style={styles.checkmark}>✓</Text>}
      </Pressable>
    );
  };

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
            <Text style={styles.title}>Selecionar Linguagem</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {languages.map(language => renderLanguageItem(language))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
