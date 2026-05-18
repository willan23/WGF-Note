import React, { useMemo } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { WorkspaceExplorer } from '@/components/workspace-explorer';

interface ProjectTreeProps {
  visible: boolean;
  onClose: () => void;
}

export function ProjectTree({ visible, onClose }: ProjectTreeProps) {
  const colors = useColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
        },
        modal: {
          minHeight: '45%',
          maxHeight: '82%',
          backgroundColor: colors.background,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          overflow: 'hidden',
        },
      }),
    [colors.background],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <WorkspaceExplorer compact onFileOpened={onClose} onRequestClose={onClose} />
        </View>
      </View>
    </Modal>
  );
}
