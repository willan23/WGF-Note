import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { AuthModal } from '@/components/auth-modal';
import { useAuth } from '@/hooks/use-auth';
import { useColors } from '@/hooks/use-colors';
import { useEditor } from '@/lib/editor-context';
import { trpc } from '@/lib/trpc';
import {
  collectWorkspaceCloudSnapshot,
  writeRemoteCloudFiles,
} from '@/lib/workspace-cloud-sync';

export default function CloudScreen() {
  const colors = useColors();
  const { user, loading, isAuthenticated, logout, refresh } = useAuth();
  const { state, currentLanguage } = useEditor();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor'>('editor');
  const filesQuery = trpc.cloud.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const syncMutation = trpc.cloud.syncWorkspace.useMutation();
  const shareMutation = trpc.cloud.share.useMutation();
  const updateMutation = trpc.cloud.update.useMutation();
  const collaboratorsQuery = trpc.cloud.collaborators.useQuery(
    { fileId: selectedFileId ?? 0 },
    { enabled: Boolean(selectedFileId) && isAuthenticated },
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        header: {
          paddingHorizontal: 20,
          paddingVertical: 18,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.surface,
          gap: 4,
        },
        title: {
          color: colors.foreground,
          fontSize: 20,
          fontWeight: '700',
        },
        subtitle: {
          color: colors.muted,
          fontSize: 13,
          lineHeight: 19,
        },
        body: {
          padding: 16,
          gap: 14,
        },
        card: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          backgroundColor: colors.surface,
          padding: 14,
          gap: 10,
        },
        cardTitle: {
          color: colors.foreground,
          fontSize: 15,
          fontWeight: '700',
        },
        muted: {
          color: colors.muted,
          fontSize: 13,
          lineHeight: 19,
        },
        buttonRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
        },
        button: {
          borderRadius: 999,
          paddingHorizontal: 12,
          paddingVertical: 9,
          backgroundColor: colors.primary,
        },
        secondaryButton: {
          backgroundColor: colors.background,
          borderWidth: 1,
          borderColor: colors.border,
        },
        buttonText: {
          color: colors.background,
          fontSize: 13,
          fontWeight: '700',
        },
        secondaryButtonText: {
          color: colors.foreground,
        },
        fileRow: {
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.background,
          borderRadius: 10,
          padding: 10,
          gap: 4,
        },
        fileRowSelected: {
          borderColor: colors.primary,
        },
        fileTitle: {
          color: colors.foreground,
          fontSize: 14,
          fontWeight: '700',
        },
        fileMeta: {
          color: colors.muted,
          fontSize: 12,
        },
        input: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 10,
          backgroundColor: colors.background,
          color: colors.foreground,
          paddingHorizontal: 12,
          paddingVertical: 10,
        },
        segmented: {
          flexDirection: 'row',
          gap: 8,
        },
        segmentedButton: {
          flex: 1,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          paddingVertical: 9,
          alignItems: 'center',
        },
        segmentedButtonActive: {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        },
        segmentedText: {
          color: colors.foreground,
          fontWeight: '700',
          fontSize: 13,
        },
        segmentedTextActive: {
          color: colors.background,
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

  const handleSync = async () => {
    try {
      const localFiles = await collectWorkspaceCloudSnapshot();
      const result = await syncMutation.mutateAsync({ files: localFiles });
      const ownedFiles = result.files.filter((file) => file.ownerId === user?.id);
      await writeRemoteCloudFiles(ownedFiles);
      await filesQuery.refetch();
      Alert.alert(
        'Cloud',
        result.conflicts.length > 0
          ? `Sincronização concluída com ${result.conflicts.length} conflito(s) remoto(s) preservado(s).`
          : `Sincronização concluída: ${ownedFiles.length} ficheiro(s) disponível(eis) na cloud.`,
      );
    } catch (error) {
      Alert.alert(
        'Cloud',
        error instanceof Error ? error.message : 'Não foi possível sincronizar.',
      );
    }
  };

  const handleShare = async () => {
    if (!selectedFileId || !inviteEmail.trim()) return;

    const result = await shareMutation.mutateAsync({
      fileId: selectedFileId,
      email: inviteEmail.trim(),
      role: inviteRole,
    });

    if (result.kind !== 'shared') {
      Alert.alert('Colaboração', `Não foi possível partilhar: ${result.kind}.`);
      return;
    }

    setInviteEmail('');
    await collaboratorsQuery.refetch();
    Alert.alert('Colaboração', 'Colaborador adicionado.');
  };

  const handleDownloadSelected = async () => {
    if (!selectedFile) return;
    await writeRemoteCloudFiles([selectedFile]);
    Alert.alert('Cloud', 'Ficheiro transferido para o projeto local.');
  };

  const handleUploadCurrentEditorToSelected = async () => {
    if (!selectedFile || !state.currentFile) return;

    const result = await updateMutation.mutateAsync({
      fileId: selectedFile.id,
      content: state.currentFile.content,
      language: currentLanguage,
      expectedRevision: selectedFile.revision,
    });

    if (result.kind === 'updated') {
      await filesQuery.refetch();
      Alert.alert('Colaboração', 'Versão remota atualizada.');
      return;
    }

    Alert.alert('Colaboração', `Não foi possível atualizar: ${result.kind}.`);
  };

  const selectedFile = filesQuery.data?.find((file) => file.id === selectedFileId);
  const selectedFileIsOwned = selectedFile?.ownerId === user?.id;
  const canEditSelectedFile =
    Boolean(selectedFileIsOwned) || selectedFile?.collaboratorRole === 'editor';

  return (
    <ScreenContainer className="flex-1 p-0">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Cloud e colaboração</Text>
          <Text style={styles.subtitle}>
            Sincronize o workspace e partilhe ficheiros com controlo de revisão.
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : !isAuthenticated ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Sessão necessária</Text>
              <Text style={styles.muted}>Entre para ativar sync, colaboração e execução Python.</Text>
              <View style={styles.buttonRow}>
                <Pressable style={styles.button} onPress={() => setShowAuthModal(true)}>
                  <Text style={styles.buttonText}>Entrar</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Conta</Text>
                <Text style={styles.muted}>
                  {user?.name || 'Utilizador'} · {user?.email || user?.openId}
                </Text>
                <View style={styles.buttonRow}>
                  <Pressable
                    style={styles.button}
                    onPress={handleSync}
                    disabled={syncMutation.isPending}
                  >
                    <Text style={styles.buttonText}>
                      {syncMutation.isPending ? 'A sincronizar…' : 'Sincronizar agora'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.button, styles.secondaryButton]}
                    onPress={async () => {
                      await logout();
                      await refresh();
                    }}
                  >
                    <Text style={[styles.buttonText, styles.secondaryButtonText]}>Sair</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Ficheiros na cloud</Text>
                {filesQuery.isLoading ? (
                  <ActivityIndicator color={colors.primary} />
                ) : filesQuery.data && filesQuery.data.length > 0 ? (
                  filesQuery.data.map((file) => (
                    <Pressable
                      key={file.id}
                      onPress={() => setSelectedFileId(file.id)}
                      style={[
                        styles.fileRow,
                        selectedFileId === file.id && styles.fileRowSelected,
                      ]}
                    >
                      <Text style={styles.fileTitle}>{file.relativePath}</Text>
                      <Text style={styles.fileMeta}>
                        rev. {file.revision} · {file.ownerId === user?.id ? 'meu' : 'partilhado'}
                      </Text>
                    </Pressable>
                  ))
                ) : (
                  <Text style={styles.muted}>Ainda não há ficheiros sincronizados.</Text>
                )}
              </View>

              {selectedFile ? (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Colaboração</Text>
                  <Text style={styles.muted}>{selectedFile.relativePath}</Text>
                  <View style={styles.buttonRow}>
                    <Pressable
                      style={[styles.button, styles.secondaryButton]}
                      onPress={handleDownloadSelected}
                    >
                      <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                        Transferir para projeto
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.button}
                      onPress={handleUploadCurrentEditorToSelected}
                      disabled={
                        !state.currentFile || !canEditSelectedFile || updateMutation.isPending
                      }
                    >
                      <Text style={styles.buttonText}>
                        {updateMutation.isPending ? 'A enviar…' : 'Enviar editor atual'}
                      </Text>
                    </Pressable>
                  </View>
                  {!canEditSelectedFile ? (
                    <Text style={styles.muted}>
                      Este ficheiro foi partilhado consigo apenas para leitura.
                    </Text>
                  ) : (
                    <Text style={styles.muted}>
                      Pode atualizar a versão remota a partir do editor atual.
                    </Text>
                  )}
                  {selectedFileIsOwned ? (
                    <>
                      <TextInput
                        value={inviteEmail}
                        onChangeText={setInviteEmail}
                        placeholder="email do colaborador"
                        placeholderTextColor={colors.muted}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        style={styles.input}
                      />
                      <View style={styles.segmented}>
                        {(['viewer', 'editor'] as const).map((role) => (
                          <Pressable
                            key={role}
                            onPress={() => setInviteRole(role)}
                            style={[
                              styles.segmentedButton,
                              inviteRole === role && styles.segmentedButtonActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.segmentedText,
                                inviteRole === role && styles.segmentedTextActive,
                              ]}
                            >
                              {role === 'viewer' ? 'Leitor' : 'Editor'}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                      <Pressable style={styles.button} onPress={handleShare}>
                        <Text style={styles.buttonText}>Adicionar colaborador</Text>
                      </Pressable>
                      {collaboratorsQuery.data && collaboratorsQuery.data.length > 0 ? (
                        collaboratorsQuery.data.map((collaborator) => (
                          <Text key={collaborator.id} style={styles.muted}>
                            {collaborator.email || collaborator.name || collaborator.id} ·{' '}
                            {collaborator.role}
                          </Text>
                        ))
                      ) : (
                        <Text style={styles.muted}>Sem colaboradores adicionais.</Text>
                      )}
                    </>
                  ) : null}
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </View>

      <AuthModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthenticated={refresh}
      />
    </ScreenContainer>
  );
}
