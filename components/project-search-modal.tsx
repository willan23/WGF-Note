import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useEditor } from '@/lib/editor-context';
import { listFiles, openFile } from '@/lib/file-system-manager';
import {
  planWorkspaceReplacement,
  searchWorkspace,
  selectWorkspaceReplacementChanges,
  summarizeWorkspaceReplacementPlan,
  type WorkspaceReplacementPlanItem,
  type WorkspaceSearchResult,
} from '@/lib/workspace-search';

interface ProjectSearchModalProps {
  visible: boolean;
  onClose: () => void;
  initialQuery?: string;
  initialReplacement?: string;
  initialCaseSensitive?: boolean;
  initialWholeWord?: boolean;
}

interface SearchResultRowProps {
  result: WorkspaceSearchResult;
  onOpen: (result: WorkspaceSearchResult) => void;
  styles: ReturnType<typeof createStyles>;
  colors: ReturnType<typeof useColors>;
}

interface ReplacementPreviewRowProps {
  item: WorkspaceReplacementPlanItem;
  selectionState: 'all' | 'some' | 'none';
  selectedChangeIdSet: Set<string>;
  onToggleFile: (path: string) => void;
  onToggleChange: (changeId: string) => void;
  onOpenChange: (item: WorkspaceReplacementPlanItem, changeId: string) => void;
  styles: ReturnType<typeof createStyles>;
  colors: ReturnType<typeof useColors>;
}

const SearchResultRow = memo(function SearchResultRow({
  result,
  onOpen,
  styles,
  colors,
}: SearchResultRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir resultado em ${result.relativePath}, linha ${result.line + 1}`}
      onPress={() => onOpen(result)}
      style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}
    >
      <View style={styles.resultIcon}>
        <Ionicons name="document-text-outline" size={18} color={colors.primary} />
      </View>
      <View style={styles.resultBody}>
        <View style={styles.resultHeader}>
          <Text style={styles.resultPath} numberOfLines={1}>
            {result.relativePath}
          </Text>
          <Text style={styles.resultMeta}>
            {result.line + 1}:{result.column + 1}
          </Text>
        </View>
        <Text style={styles.resultPreview} numberOfLines={2}>
          {result.preview || 'Linha vazia'}
        </Text>
      </View>
    </Pressable>
  );
});

const ReplacementPreviewRow = memo(function ReplacementPreviewRow({
  item,
  selectionState,
  selectedChangeIdSet,
  onToggleFile,
  onToggleChange,
  onOpenChange,
  styles,
  colors,
}: ReplacementPreviewRowProps) {
  const selectedMatchCount = item.changes.reduce(
    (count, change) =>
      count + (selectedChangeIdSet.has(change.id) ? change.matchCount : 0),
    0,
  );

  return (
    <View
      style={[
        styles.previewCard,
        selectionState === 'none' ? styles.previewCardUnselected : styles.previewCardSelected,
      ]}
    >
      <View style={styles.previewHeader}>
        <View style={styles.previewHeaderMain}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={`Incluir ${item.relativePath} na substituição`}
            accessibilityState={{ checked: selectionState === 'all' }}
            onPress={() => onToggleFile(item.path)}
            hitSlop={8}
            style={[
              styles.previewCheckbox,
              selectionState !== 'none' && styles.previewCheckboxSelected,
            ]}
          >
            {selectionState === 'all' ? (
              <Ionicons name="checkmark" size={14} color={colors.background} />
            ) : selectionState === 'some' ? (
              <Ionicons name="remove" size={14} color={colors.background} />
            ) : null}
          </Pressable>
          <Text style={styles.previewPath} numberOfLines={1}>
            {item.relativePath}
          </Text>
        </View>
        <Text style={styles.previewCount}>
          {selectedMatchCount}/{item.matchCount} troca{item.matchCount !== 1 ? 's' : ''}
        </Text>
      </View>

      {item.changes.map((change) => {
        const selected = selectedChangeIdSet.has(change.id);

        return (
        <View
          key={change.id}
          style={[styles.previewBlock, !selected && styles.previewBlockUnselected]}
        >
          <View style={styles.previewLineHeader}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel={`Incluir linha ${change.line + 1} de ${item.relativePath}`}
              accessibilityState={{ checked: selected }}
              onPress={() => onToggleChange(change.id)}
              hitSlop={8}
              style={[
                styles.previewCheckbox,
                selected && styles.previewCheckboxSelected,
              ]}
            >
              {selected ? (
                <Ionicons name="checkmark" size={14} color={colors.background} />
              ) : null}
            </Pressable>
            <Text style={styles.previewLineMeta}>
              linha {change.line + 1} · {change.matchCount} troca{change.matchCount !== 1 ? 's' : ''}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Abrir linha ${change.line + 1} de ${item.relativePath} no editor`}
              onPress={() => onOpenChange(item, change.id)}
              hitSlop={8}
              style={styles.previewInspectButton}
            >
              <Ionicons name="open-outline" size={14} color={colors.primary} />
              <Text style={styles.previewInspectText}>Ver no editor</Text>
            </Pressable>
          </View>
          <View style={[styles.diffLine, styles.diffLineBefore]}>
            <Text style={[styles.diffPrefix, styles.diffPrefixBefore]}>−</Text>
            <Text style={styles.diffText}>{change.before || 'Linha vazia'}</Text>
          </View>
          <View style={[styles.diffLine, styles.diffLineAfter]}>
            <Text style={[styles.diffPrefix, styles.diffPrefixAfter]}>+</Text>
            <Text style={styles.diffText}>{change.after || 'Linha vazia'}</Text>
          </View>
        </View>
        );
      })}
    </View>
  );
});

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modal: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: '82%',
      minHeight: '50%',
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 10,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    eyebrow: {
      color: colors.muted,
      fontSize: 11,
      textTransform: 'uppercase',
      fontWeight: '700',
      marginBottom: 2,
    },
    title: {
      color: colors.foreground,
      fontSize: 18,
      fontWeight: '700',
    },
    closeButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.foreground,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
    },
    replaceInput: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.foreground,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
    },
    optionsRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    optionGroup: {
      flexDirection: 'row',
      gap: 8,
    },
    optionButton: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    optionButtonActive: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}16`,
    },
    optionText: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '600',
    },
    optionTextActive: {
      color: colors.foreground,
    },
    resultCount: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '600',
    },
    replaceRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    replaceField: {
      flex: 1,
    },
    replaceButton: {
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 11,
      backgroundColor: colors.primary,
      minWidth: 108,
      alignItems: 'center',
    },
    replaceButtonDisabled: {
      opacity: 0.45,
    },
    replaceButtonText: {
      color: colors.background,
      fontSize: 13,
      fontWeight: '700',
    },
    helperText: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 17,
    },
    reviewBanner: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 4,
    },
    reviewTitle: {
      color: colors.foreground,
      fontSize: 13,
      fontWeight: '700',
    },
    reviewText: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 17,
    },
    reviewActions: {
      flexDirection: 'row',
      gap: 8,
    },
    reviewSelectionRow: {
      flexDirection: 'row',
      gap: 8,
    },
    reviewSelectionButton: {
      flex: 1,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingVertical: 8,
      alignItems: 'center',
    },
    reviewSelectionButtonText: {
      color: colors.foreground,
      fontSize: 12,
      fontWeight: '700',
    },
    reviewButton: {
      flex: 1,
      borderRadius: 10,
      paddingVertical: 11,
      alignItems: 'center',
    },
    reviewButtonSecondary: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    reviewButtonPrimary: {
      backgroundColor: colors.primary,
    },
    reviewButtonText: {
      fontSize: 13,
      fontWeight: '700',
    },
    reviewButtonTextSecondary: {
      color: colors.foreground,
    },
    reviewButtonTextPrimary: {
      color: colors.background,
    },
    listContent: {
      paddingVertical: 8,
    },
    resultRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    resultRowPressed: {
      backgroundColor: `${colors.primary}08`,
    },
    resultIcon: {
      width: 24,
      paddingTop: 2,
      alignItems: 'center',
    },
    resultBody: {
      flex: 1,
      gap: 4,
    },
    resultHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    resultPath: {
      flex: 1,
      color: colors.foreground,
      fontSize: 14,
      fontWeight: '600',
    },
    resultMeta: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    resultPreview: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 18,
    },
    previewListContent: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      gap: 10,
    },
    previewCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      padding: 12,
      gap: 10,
    },
    previewCardSelected: {
      borderColor: colors.primary,
    },
    previewCardUnselected: {
      opacity: 0.62,
    },
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    previewHeaderMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    previewCheckbox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    previewCheckboxSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    previewPath: {
      flex: 1,
      color: colors.foreground,
      fontSize: 14,
      fontWeight: '700',
    },
    previewCount: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    previewBlock: {
      gap: 5,
    },
    previewBlockUnselected: {
      opacity: 0.58,
    },
    previewLineHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    previewLineMeta: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    previewInspectButton: {
      marginLeft: 'auto',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    previewInspectText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '700',
    },
    diffLine: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 8,
    },
    diffLineBefore: {
      backgroundColor: `${colors.error}14`,
    },
    diffLineAfter: {
      backgroundColor: `${colors.success}14`,
    },
    diffPrefix: {
      width: 10,
      fontSize: 14,
      fontWeight: '700',
    },
    diffPrefixBefore: {
      color: colors.error,
    },
    diffPrefixAfter: {
      color: colors.success,
    },
    diffText: {
      flex: 1,
      color: colors.foreground,
      fontSize: 13,
      lineHeight: 18,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 28,
    },
    emptyText: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      marginTop: 10,
    },
    loadingText: {
      color: colors.muted,
      fontSize: 13,
      marginTop: 10,
    },
  });
}

export function ProjectSearchModal({
  visible,
  onClose,
  initialQuery,
  initialReplacement,
  initialCaseSensitive,
  initialWholeWord,
}: ProjectSearchModalProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    state,
    openFileFromSystemAtRange,
    applyWorkspaceReplacementPlan,
    workspaceRootUri: rootDirectoryUri,
  } = useEditor();
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [replacement, setReplacement] = useState('');
  const [results, setResults] = useState<WorkspaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [pendingPlan, setPendingPlan] = useState<WorkspaceReplacementPlanItem[] | null>(null);
  const [selectedChangeIds, setSelectedChangeIds] = useState<string[]>([]);

  useEffect(() => {
    if (!visible) return;

    if (initialQuery !== undefined) {
      setQuery(initialQuery);
    }
    if (initialReplacement !== undefined) {
      setReplacement(initialReplacement);
    }
    if (initialCaseSensitive !== undefined) {
      setCaseSensitive(initialCaseSensitive);
    }
    if (initialWholeWord !== undefined) {
      setWholeWord(initialWholeWord);
    }
  }, [
    initialCaseSensitive,
    initialQuery,
    initialReplacement,
    initialWholeWord,
    visible,
  ]);

  const openFileContentByPath = useMemo(
    () =>
      new Map(
        state.openFiles.flatMap((file) =>
          file.path ? [[file.path, file.content] as const] : [],
        ),
      ),
    [state.openFiles],
  );

  useEffect(() => {
    if (!visible) return;

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    const timeoutId = setTimeout(() => {
      void searchWorkspace(
        rootDirectoryUri,
        trimmedQuery,
        { caseSensitive, wholeWord },
        {
          listFiles,
          readFile: async (path) => openFileContentByPath.get(path) ?? openFile(path),
        },
      )
        .then((nextResults) => {
          if (!cancelled) {
            setResults(nextResults);
          }
        })
        .catch((error) => {
          console.error('Erro ao pesquisar no workspace:', error);
          if (!cancelled) {
            setResults([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsSearching(false);
          }
        });
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [
    caseSensitive,
    openFileContentByPath,
    query,
    refreshToken,
    rootDirectoryUri,
    visible,
    wholeWord,
  ]);

  useEffect(() => {
    setPendingPlan(null);
    setSelectedChangeIds([]);
  }, [caseSensitive, query, replacement, wholeWord]);

  const handleOpenResult = useCallback(
    async (result: WorkspaceSearchResult) => {
      try {
        await openFileFromSystemAtRange(result.path, result.start, result.end);
        onClose();
      } catch (error) {
        console.error('Erro ao abrir resultado da pesquisa global:', error);
      }
    },
    [onClose, openFileFromSystemAtRange],
  );

  const handleOpenChange = useCallback(
    async (item: WorkspaceReplacementPlanItem, changeId: string) => {
      const change = item.changes.find((entry) => entry.id === changeId);
      const firstMatch = change?.matches[0];
      if (!firstMatch) return;

      try {
        await openFileFromSystemAtRange(item.path, firstMatch.start, firstMatch.end);
        onClose();
      } catch (error) {
        console.error('Erro ao abrir mudança da pré-visualização:', error);
      }
    },
    [onClose, openFileFromSystemAtRange],
  );

  const readWorkspaceFile = useCallback(
    async (path: string) => openFileContentByPath.get(path) ?? openFile(path),
    [openFileContentByPath],
  );

  const executeReplacementPlan = useCallback(
    async (plan: WorkspaceReplacementPlanItem[]) => {
      setIsReplacing(true);
      try {
        const summary = summarizeWorkspaceReplacementPlan(plan);
        const execution = await applyWorkspaceReplacementPlan(plan);
        setRefreshToken((value) => value + 1);
        setPendingPlan(null);
        setSelectedChangeIds([]);

        Alert.alert(
          'Substituição concluída',
          `${summary.replacementCount} substituição${summary.replacementCount !== 1 ? 'ões' : ''} em ${summary.fileCount} ficheiro${summary.fileCount !== 1 ? 's' : ''}. ${
            execution.updatedOpenFiles > 0
              ? 'Os ficheiros abertos ficaram atualizados no editor.'
              : ''
          }`,
        );
      } catch (error) {
        console.error('Erro ao substituir no projeto:', error);
        Alert.alert('Erro', 'Não foi possível concluir a substituição no projeto.');
      } finally {
        setIsReplacing(false);
      }
    },
    [applyWorkspaceReplacementPlan],
  );

  const handleReplaceInProject = useCallback(async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || results.length === 0 || isReplacing) return;

    try {
      const plan = await planWorkspaceReplacement(
        rootDirectoryUri,
        trimmedQuery,
        replacement,
        { caseSensitive, wholeWord },
        {
          listFiles,
          readFile: readWorkspaceFile,
        },
      );
      const summary = summarizeWorkspaceReplacementPlan(plan);

      if (summary.fileCount === 0) {
        Alert.alert('Nada para substituir', 'A alteração não mudaria nenhum ficheiro.');
        return;
      }

      setPendingPlan(plan);
      setSelectedChangeIds(plan.flatMap((item) => item.changes.map((change) => change.id)));
    } catch (error) {
      console.error('Erro ao preparar substituição no projeto:', error);
      Alert.alert('Erro', 'Não foi possível preparar a substituição no projeto.');
    }
  }, [
    caseSensitive,
    isReplacing,
    query,
    readWorkspaceFile,
    replacement,
    results.length,
    rootDirectoryUri,
    wholeWord,
  ]);

  const selectedPlan = useMemo(
    () =>
      pendingPlan
        ? selectWorkspaceReplacementChanges(pendingPlan, selectedChangeIds)
        : [],
    [pendingPlan, selectedChangeIds],
  );
  const selectedChangeIdSet = useMemo(
    () => new Set(selectedChangeIds),
    [selectedChangeIds],
  );
  const replacementSummary = useMemo(
    () => (pendingPlan ? summarizeWorkspaceReplacementPlan(selectedPlan) : null),
    [pendingPlan, selectedPlan],
  );

  const allChangeIds = useMemo(
    () => pendingPlan?.flatMap((item) => item.changes.map((change) => change.id)) ?? [],
    [pendingPlan],
  );
  const allChangesSelected = allChangeIds.length > 0 && selectedChangeIds.length === allChangeIds.length;

  const getFileSelectionState = useCallback(
    (item: WorkspaceReplacementPlanItem): 'all' | 'some' | 'none' => {
      const selectedCount = item.changes.reduce(
        (count, change) => count + (selectedChangeIdSet.has(change.id) ? 1 : 0),
        0,
      );

      if (selectedCount === 0) return 'none';
      if (selectedCount === item.changes.length) return 'all';
      return 'some';
    },
    [selectedChangeIdSet],
  );

  const toggleSelectedChangeId = useCallback((changeId: string) => {
    setSelectedChangeIds((current) =>
      current.includes(changeId)
        ? current.filter((currentId) => currentId !== changeId)
        : [...current, changeId],
    );
  }, []);

  const toggleSelectedFileChanges = useCallback(
    (path: string) => {
      const item = pendingPlan?.find((entry) => entry.path === path);
      if (!item) return;

      setSelectedChangeIds((current) => {
        const currentSet = new Set(current);
        const allSelected = item.changes.every((change) => currentSet.has(change.id));

        item.changes.forEach((change) => {
          if (allSelected) {
            currentSet.delete(change.id);
          } else {
            currentSet.add(change.id);
          }
        });

        return Array.from(currentSet);
      });
    },
    [pendingPlan],
  );

  const selectAllChanges = useCallback(() => {
    if (!pendingPlan) return;
    setSelectedChangeIds(allChangeIds);
  }, [allChangeIds, pendingPlan]);

  const clearSelectedChanges = useCallback(() => {
    setSelectedChangeIds([]);
  }, []);

  const resultLabel =
    results.length === 0
      ? '0 resultados'
      : `${results.length} resultado${results.length !== 1 ? 's' : ''}`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.eyebrow}>Workspace</Text>
                <Text style={styles.title}>Pesquisar no projeto</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fechar pesquisa no projeto"
                style={styles.closeButton}
                onPress={onClose}
              >
                <Ionicons name="close" size={20} color={colors.muted} />
              </Pressable>
            </View>

            <TextInput
              accessibilityLabel="Texto a pesquisar no projeto"
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Pesquisar em ficheiros do workspace…"
              placeholderTextColor={colors.muted}
              value={query}
              onChangeText={setQuery}
              style={styles.input}
            />

            <View style={styles.replaceRow}>
              <TextInput
                accessibilityLabel="Texto de substituição no projeto"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Substituir por…"
                placeholderTextColor={colors.muted}
                value={replacement}
                onChangeText={setReplacement}
                style={[styles.replaceInput, styles.replaceField]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Substituir em todo o projeto"
                disabled={!query.trim() || results.length === 0 || isReplacing}
                onPress={handleReplaceInProject}
                style={[
                  styles.replaceButton,
                  (!query.trim() || results.length === 0 || isReplacing) &&
                    styles.replaceButtonDisabled,
                ]}
              >
                <Text style={styles.replaceButtonText}>
                  {isReplacing ? 'A aplicar…' : 'Substituir'}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.helperText}>
              Ficheiros abertos são alterados no buffer do editor; ficheiros fechados são gravados diretamente no disco.
            </Text>

            {pendingPlan && replacementSummary ? (
              <>
                <View style={styles.reviewBanner}>
                  <Text style={styles.reviewTitle}>Pré-visualização pronta</Text>
                  <Text style={styles.reviewText}>
                    {replacementSummary.replacementCount} substituição{replacementSummary.replacementCount !== 1 ? 'ões' : ''} em {replacementSummary.changeCount} linha{replacementSummary.changeCount !== 1 ? 's' : ''} de {replacementSummary.fileCount} ficheiro{replacementSummary.fileCount !== 1 ? 's' : ''}. Revê abaixo antes de aplicar.
                  </Text>
                </View>
                <View style={styles.reviewSelectionRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Selecionar todas as linhas"
                    style={styles.reviewSelectionButton}
                    onPress={selectAllChanges}
                  >
                    <Text style={styles.reviewSelectionButtonText}>
                      {allChangesSelected ? 'Tudo selecionado' : 'Selecionar tudo'}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Limpar seleção de linhas"
                    style={styles.reviewSelectionButton}
                    onPress={clearSelectedChanges}
                  >
                    <Text style={styles.reviewSelectionButtonText}>Limpar seleção</Text>
                  </Pressable>
                </View>
                <View style={styles.reviewActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Voltar aos resultados"
                    style={[styles.reviewButton, styles.reviewButtonSecondary]}
                    onPress={() => {
                      setPendingPlan(null);
                      setSelectedChangeIds([]);
                    }}
                  >
                    <Text style={[styles.reviewButtonText, styles.reviewButtonTextSecondary]}>
                      Voltar
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Aplicar alterações no projeto"
                    disabled={isReplacing || selectedPlan.length === 0}
                    style={[
                      styles.reviewButton,
                      styles.reviewButtonPrimary,
                      (isReplacing || selectedPlan.length === 0) &&
                        styles.replaceButtonDisabled,
                    ]}
                    onPress={() => {
                      void executeReplacementPlan(selectedPlan);
                    }}
                  >
                    <Text style={[styles.reviewButtonText, styles.reviewButtonTextPrimary]}>
                      {isReplacing ? 'A aplicar…' : 'Aplicar alterações'}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : null}

            <View style={styles.optionsRow}>
              <View style={styles.optionGroup}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: caseSensitive }}
                  onPress={() => setCaseSensitive((value) => !value)}
                  style={[
                    styles.optionButton,
                    caseSensitive && styles.optionButtonActive,
                  ]}
                >
                  <Text style={[styles.optionText, caseSensitive && styles.optionTextActive]}>
                    Aa exata
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: wholeWord }}
                  onPress={() => setWholeWord((value) => !value)}
                  style={[styles.optionButton, wholeWord && styles.optionButtonActive]}
                >
                  <Text style={[styles.optionText, wholeWord && styles.optionTextActive]}>
                    Palavra inteira
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.resultCount}>{resultLabel}</Text>
            </View>
          </View>

          {pendingPlan ? (
            <FlatList
              data={pendingPlan}
              renderItem={({ item }) => (
                <ReplacementPreviewRow
                  item={item}
                  selectionState={getFileSelectionState(item)}
                  selectedChangeIdSet={selectedChangeIdSet}
                  onToggleFile={toggleSelectedFileChanges}
                  onToggleChange={toggleSelectedChangeId}
                  onOpenChange={handleOpenChange}
                  styles={styles}
                  colors={colors}
                />
              )}
              keyExtractor={(item) => item.path}
              contentContainerStyle={styles.previewListContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          ) : isSearching ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>A pesquisar o workspace…</Text>
            </View>
          ) : results.length > 0 ? (
            <FlatList
              data={results}
              renderItem={({ item }) => (
                <SearchResultRow
                  result={item}
                  onOpen={handleOpenResult}
                  styles={styles}
                  colors={colors}
                />
              )}
              keyExtractor={(item) => `${item.path}:${item.start}`}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name={query.trim() ? 'search-outline' : 'folder-open-outline'}
                size={48}
                color={colors.border}
              />
              <Text style={styles.emptyText}>
                {query.trim()
                  ? 'Não encontrei correspondências nos ficheiros suportados do workspace.'
                  : 'Procura texto em Python, HTML e CSS e abre diretamente a linha certa.'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
