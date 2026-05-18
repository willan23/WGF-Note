import React, { useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  SectionList,
  SectionListRenderItem,
  Platform,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { useEditor } from '@/lib/editor-context';
import { getTemplatesByCategory, CodeTemplate } from '@/lib/code-templates';
import { Ionicons } from '@expo/vector-icons';

interface CodeTemplatesProps {
  visible: boolean;
  onSelectTemplate: (template: CodeTemplate) => void;
  onClose: () => void;
}

export function CodeTemplates({
  visible,
  onSelectTemplate,
  onClose,
}: CodeTemplatesProps) {
  const colors = useColors();
  const { currentLanguage } = useEditor();

  const sections = useMemo(() => {
    const grouped = getTemplatesByCategory(currentLanguage);
    return Object.entries(grouped).map(([category, templates]) => ({
      title: category,
      data: templates,
    }));
  }, [currentLanguage]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'flex-end',
    },
    modal: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingVertical: 20,
      maxHeight: '85%',
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
      fontSize: 22,
      fontWeight: '700',
      color: colors.foreground,
    },
    closeButton: {
      padding: 4,
      borderRadius: 12,
      backgroundColor: colors.surface,
    },
    sectionHeader: {
      backgroundColor: colors.background,
      paddingVertical: 12,
      marginTop: 8,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    templateItem: {
      padding: 16,
      backgroundColor: colors.surface,
      borderRadius: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    templateHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: `${colors.primary}15`,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    templateName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.foreground,
      flex: 1,
    },
    templateDescription: {
      fontSize: 13,
      color: colors.muted,
      marginBottom: 12,
      lineHeight: 18,
    },
    templatePreview: {
      backgroundColor: colors.background,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    templateCode: {
      fontSize: 11,
      color: colors.foreground,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      lineHeight: 16,
    },
    insertButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    insertButtonText: {
      color: colors.background,
      fontSize: 13,
      fontWeight: '700',
    },
  });

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'básicos': return 'code-slash';
      case 'controlo': return 'git-branch';
      case 'estruturas': return 'cube';
      case 'ajuda': return 'help-circle';
      default: return 'document-text';
    }
  };

  const renderTemplate: SectionListRenderItem<CodeTemplate> = ({ item }) => {
    const preview = item.code.substring(0, 80) + (item.code.length > 80 ? '...' : '');

    return (
      <View style={styles.templateItem}>
        <View style={styles.templateHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="bookmark-outline" size={16} color={colors.primary} />
          </View>
          <Text style={styles.templateName}>{item.name}</Text>
        </View>
        <Text style={styles.templateDescription}>{item.description}</Text>
        <View style={styles.templatePreview}>
          <Text style={styles.templateCode} numberOfLines={3}>
            {preview}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.insertButton,
            pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
          ]}
          onPress={() => {
            onSelectTemplate(item);
            onClose();
          }}
        >
          <Ionicons name="add-circle-outline" size={18} color={colors.background} />
          <Text style={styles.insertButtonText}>Inserir no Código</Text>
        </Pressable>
      </View>
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
            <Text style={styles.title}>Templates</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.muted} />
            </Pressable>
          </View>

          <SectionList
            sections={sections}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            renderItem={renderTemplate}
            renderSectionHeader={({ section: { title } }) => (
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name={getCategoryIcon(title) as any} size={14} color={colors.primary} />
                  <Text style={styles.sectionTitle}>{title}</Text>
                </View>
              </View>
            )}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        </View>
      </View>
    </Modal>
  );
}
