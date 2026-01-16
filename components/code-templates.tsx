import React, { useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  StyleSheet,
  SectionList,
  SectionListRenderItem,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { useEditor } from '@/lib/editor-context';
import { getTemplatesByCategory, CodeTemplate } from '@/lib/code-templates';

interface CodeTemplatesProps {
  visible: boolean;
  onSelectTemplate: (template: CodeTemplate) => void;
  onClose: () => void;
}

interface TemplateSection {
  title: string;
  data: CodeTemplate[];
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
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
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
    sectionHeader: {
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginTop: 12,
      marginBottom: 8,
      borderRadius: 6,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    templateItem: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderRadius: 8,
      marginBottom: 8,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    templateName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 4,
    },
    templateDescription: {
      fontSize: 12,
      color: colors.muted,
      marginBottom: 8,
    },
    templatePreview: {
      backgroundColor: colors.background,
      padding: 8,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
    },
    templateCode: {
      fontSize: 11,
      color: colors.foreground,
      fontFamily: 'Menlo',
      lineHeight: 16,
    },
    insertButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 4,
      alignSelf: 'flex-start',
    },
    insertButtonText: {
      color: colors.background,
      fontSize: 12,
      fontWeight: '600',
    },
  });

  const renderTemplate: SectionListRenderItem<CodeTemplate> = ({ item }) => {
    const preview = item.code.substring(0, 60) + (item.code.length > 60 ? '...' : '');

    return (
      <Pressable
        style={styles.templateItem}
        onPress={() => {
          onSelectTemplate(item);
          onClose();
        }}
      >
        <Text style={styles.templateName}>{item.name}</Text>
        <Text style={styles.templateDescription}>{item.description}</Text>
        <View style={styles.templatePreview}>
          <Text style={styles.templateCode} numberOfLines={2}>
            {preview}
          </Text>
        </View>
        <Pressable
          style={styles.insertButton}
          onPress={() => {
            onSelectTemplate(item);
            onClose();
          }}
        >
          <Text style={styles.insertButtonText}>Inserir Template</Text>
        </Pressable>
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
            <Text style={styles.title}>Templates - {currentLanguage.toUpperCase()}</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={renderTemplate}
            renderSectionHeader={({ section: { title } }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{title}</Text>
              </View>
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </Modal>
  );
}
