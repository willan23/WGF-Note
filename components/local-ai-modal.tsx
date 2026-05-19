import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { listFiles, openFile } from '@/lib/file-system-manager';
import { useEditor } from '@/lib/editor-context';
import { isDesktopRuntime } from '@/lib/desktop-bridge';
import {
  addWorkspaceMemoryNote,
  clearLocalAIWorkspaceMemory,
  createEmptyLocalAIWorkspaceMemory,
  createLocalAIWorkspaceMemorySnapshot,
  inspectWorkspaceMemoryNotes,
  loadLocalAIWorkspaceMemory,
  removeStaleWorkspaceMemoryNotes,
  removeWorkspaceMemoryNote,
  saveLocalAIWorkspaceMemory,
  summarizeWorkspaceMemoryInspections,
  updateWorkspaceMemoryNote,
  type LocalAIWorkspaceMemoryNoteInspection,
  type LocalAIWorkspaceMemoryNote,
  type LocalAIWorkspaceMemory,
} from '@/lib/local-ai-memory';
import { getLineAndColumnFromOffset } from '@/lib/editor-state';
import type { CodeLanguage } from '@/lib/types-extended';
import { getWorkspaceRelativePath } from '@/lib/workspace-search';
import type {
  LocalAIChatMessage,
  LocalAIChatReference,
  LocalAIEditProposal,
  LocalAIEditTargetScope,
  LocalAIExplanation,
  LocalAIOpenFileSummary,
  LocalAIProjectSummary,
  LocalAIRetrievedSnippet,
} from '@/lib/local-ai';
import {
  clipLocalAIContextValue,
  extractLocalAICodeReplacement,
  retrieveRelevantWorkspaceSnippetsForLocalAI,
  listLocalAIModels,
  requestLocalAIChat,
  requestLocalAIEditProposal,
  requestLocalAIExplanation,
  summarizeWorkspaceForLocalAI,
} from '@/lib/local-ai';
import type { LocalAIProvider } from '@/lib/types';

interface LocalAIModalProps {
  visible: boolean;
  enabled: boolean;
  provider: LocalAIProvider;
  baseUrl: string;
  model: string;
  apiKey: string;
  fileName: string;
  filePath: string | null;
  language: CodeLanguage;
  content: string;
  selectedText: string;
  selectionStart: number;
  selectionEnd: number;
  openFiles: LocalAIOpenFileSummary[];
  onClose: () => void;
  onApplyProposal: (
    proposal: LocalAIEditProposal,
    source: { start: number; end: number; text: string },
  ) => void;
  onOpenReference: (path: string, line?: number, column?: number) => void | Promise<void>;
}

interface ChatMessageRowProps {
  message: LocalAIChatMessage;
  onOpenReference: (reference: LocalAIChatReference) => void;
  onCreateProposal: (instruction: string) => void;
  onUseAssistantCode: (content: string) => void;
  styles: ReturnType<typeof createStyles>;
}

interface MemoryEvidenceRowProps {
  evidences: LocalAIChatReference[];
  onOpenReference: (reference: LocalAIChatReference) => void;
  styles: ReturnType<typeof createStyles>;
}

interface MemoryStatusPillProps {
  inspection?: LocalAIWorkspaceMemoryNoteInspection;
  styles: ReturnType<typeof createStyles>;
}

const emptyProjectSummary: LocalAIProjectSummary = {
  files: [],
  omittedFileCount: 0,
};
const emptyRetrievedSnippets: LocalAIRetrievedSnippet[] = [];

const ChatMessageRow = memo(function ChatMessageRow({
  message,
  onOpenReference,
  onCreateProposal,
  onUseAssistantCode,
  styles,
}: ChatMessageRowProps) {
  const isUser = message.role === 'user';
  const hasCodeBlock = !isUser && /```[\s\S]*?```/.test(message.content);

  return (
    <View
      style={[
        styles.chatBubble,
        isUser ? styles.chatBubbleUser : styles.chatBubbleAssistant,
      ]}
    >
      <Text style={styles.chatBubbleLabel}>{isUser ? 'Tu' : 'IA'}</Text>
      <Text style={styles.chatBubbleText}>{message.content}</Text>
      {!isUser && message.references && message.references.length > 0 ? (
        <View style={styles.referenceRow}>
          {message.references.map((reference) => (
            <Pressable
              key={`${reference.relativePath}:${reference.line ?? 'file'}:${reference.column ?? 'col'}`}
              accessibilityRole="button"
              accessibilityLabel={`Abrir referência ${reference.relativePath}`}
              onPress={() => onOpenReference(reference)}
              style={styles.referenceChip}
            >
              <Text style={styles.referenceText}>
                {reference.label || reference.relativePath}
                {reference.line ? ` · linha ${reference.line}` : ''}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {!isUser && message.editInstruction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Gerar proposta a partir da conversa"
          onPress={() => onCreateProposal(message.editInstruction!)}
          style={styles.inlineChatAction}
        >
          <Text style={styles.inlineChatActionText}>Gerar proposta</Text>
        </Pressable>
      ) : null}
      {hasCodeBlock ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Usar código da resposta"
          onPress={() => onUseAssistantCode(message.content)}
          style={styles.inlineChatActionSecondary}
        >
          <Text style={styles.inlineChatActionSecondaryText}>Usar código</Text>
        </Pressable>
      ) : null}
    </View>
  );
});

const targetScopeLabels: Record<LocalAIEditTargetScope, string> = {
  selection: 'Seleção atual',
  cursor: 'Cursor atual',
  file: 'Ficheiro inteiro',
};

function getProposalTargetScope(
  proposal: LocalAIEditProposal,
  selectedText: string,
): LocalAIEditTargetScope {
  if (proposal.targetScope === 'file') return 'file';
  if (proposal.targetScope === 'selection') return 'selection';
  if (proposal.targetScope === 'cursor') return 'cursor';

  return selectedText.trim() ? 'selection' : 'cursor';
}

function createProposalSource(
  proposal: LocalAIEditProposal,
  source: {
    content: string;
    selectedText: string;
    selectionStart: number;
    selectionEnd: number;
  },
): { start: number; end: number; text: string; targetScope: LocalAIEditTargetScope } {
  const targetScope = getProposalTargetScope(proposal, source.selectedText);

  if (targetScope === 'file') {
    return {
      start: 0,
      end: source.content.length,
      text: source.content,
      targetScope,
    };
  }

  return {
    start: source.selectionStart,
    end: source.selectionEnd,
    text: source.selectedText,
    targetScope,
  };
}

const MemoryEvidenceRow = memo(function MemoryEvidenceRow({
  evidences,
  onOpenReference,
  styles,
}: MemoryEvidenceRowProps) {
  if (evidences.length === 0) return null;

  return (
    <View style={styles.memoryEvidenceBlock}>
      <Text style={styles.memoryEvidenceLabel}>Porque lembramos isto</Text>
      <View style={styles.referenceRow}>
        {evidences.map((evidence) => (
          <Pressable
            key={`${evidence.relativePath}:${evidence.line ?? 'file'}:${evidence.column ?? 'col'}`}
            accessibilityRole="button"
            accessibilityLabel={`Abrir evidência ${evidence.relativePath}`}
            onPress={() => onOpenReference(evidence)}
            style={styles.referenceChip}
          >
            <Text style={styles.referenceText}>
              {evidence.label || evidence.relativePath}
              {evidence.line ? ` · linha ${evidence.line}` : ''}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
});

const memoryStatusLabels = {
  manual: 'Manual',
  grounded: 'Confirmada',
  partial: 'Parcial',
  stale: 'Rever',
} as const;

function getMemoryInspectionIssueText(
  inspection?: LocalAIWorkspaceMemoryNoteInspection,
): string | null {
  if (!inspection || inspection.invalidEvidenceCount === 0) return null;

  const missingFiles = inspection.evidences.filter(
    (evidence) => evidence.status === 'missing-file',
  ).length;
  const missingLines = inspection.evidences.filter(
    (evidence) => evidence.status === 'missing-line',
  ).length;
  const unreadableFiles = inspection.evidences.filter(
    (evidence) => evidence.status === 'unreadable',
  ).length;
  const issues = [
    missingFiles > 0 ? `${missingFiles} ficheiro(s) em falta` : null,
    missingLines > 0 ? `${missingLines} linha(s) já não existem` : null,
    unreadableFiles > 0 ? `${unreadableFiles} ficheiro(s) ilegíveis` : null,
  ].filter((issue): issue is string => issue !== null);

  return issues.length > 0 ? issues.join(' · ') : null;
}

const MemoryStatusPill = memo(function MemoryStatusPill({
  inspection,
  styles,
}: MemoryStatusPillProps) {
  if (!inspection) return null;

  return (
    <View
      style={[
        styles.memoryStatusPill,
        inspection.status === 'grounded'
          ? styles.memoryStatusGrounded
          : inspection.status === 'partial'
            ? styles.memoryStatusPartial
            : inspection.status === 'stale'
              ? styles.memoryStatusStale
              : styles.memoryStatusManual,
      ]}
    >
      <Text style={styles.memoryStatusText}>{memoryStatusLabels[inspection.status]}</Text>
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
      minHeight: '52%',
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 16,
      gap: 12,
    },
    bodyContent: {
      gap: 12,
      paddingBottom: 4,
    },
    modeRow: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    modeButton: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
    },
    modeButtonActive: {
      backgroundColor: colors.primary,
    },
    modeButtonText: {
      color: colors.foreground,
      fontSize: 13,
      fontWeight: '700',
    },
    modeButtonTextActive: {
      color: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    eyebrow: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
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
    helper: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18,
    },
    disabledCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      padding: 14,
      gap: 6,
    },
    disabledTitle: {
      color: colors.foreground,
      fontSize: 14,
      fontWeight: '700',
    },
    input: {
      minHeight: 86,
      textAlignVertical: 'top',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.foreground,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
    },
    actions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      flex: 1,
      borderRadius: 10,
      paddingVertical: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryAction: {
      backgroundColor: colors.primary,
    },
    secondaryAction: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionDisabled: {
      opacity: 0.45,
    },
    actionText: {
      fontSize: 13,
      fontWeight: '700',
    },
    primaryActionText: {
      color: colors.background,
    },
    secondaryActionText: {
      color: colors.foreground,
    },
    responseCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      padding: 12,
      gap: 8,
    },
    responseTitle: {
      color: colors.foreground,
      fontSize: 14,
      fontWeight: '700',
    },
    responseText: {
      color: colors.foreground,
      fontSize: 13,
      lineHeight: 19,
    },
    proposalMeta: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '700',
    },
    bullet: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19,
    },
    diffLine: {
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    diffBefore: {
      backgroundColor: `${colors.error}14`,
    },
    diffAfter: {
      backgroundColor: `${colors.success}14`,
    },
    diffLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    diffText: {
      color: colors.foreground,
      fontSize: 13,
      lineHeight: 18,
    },
    applyRow: {
      flexDirection: 'row',
      gap: 8,
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    chatContextCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      padding: 12,
      gap: 4,
    },
    chatContextTitle: {
      color: colors.foreground,
      fontSize: 13,
      fontWeight: '700',
    },
    chatContextMeta: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18,
    },
    memoryAction: {
      alignSelf: 'flex-start',
      marginTop: 2,
    },
    memoryActionText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    memoryCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      padding: 12,
      gap: 10,
    },
    memoryHeader: {
      gap: 4,
    },
    memoryHeaderActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    memorySummaryRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    memorySummaryText: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18,
    },
    memorySuggestion: {
      borderWidth: 1,
      borderColor: `${colors.primary}55`,
      borderRadius: 10,
      backgroundColor: `${colors.primary}10`,
      padding: 10,
      gap: 8,
    },
    memorySuggestionTitle: {
      color: colors.foreground,
      fontSize: 13,
      fontWeight: '700',
    },
    memoryNote: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.background,
      padding: 10,
      gap: 8,
    },
    memoryNoteText: {
      color: colors.foreground,
      fontSize: 13,
      lineHeight: 19,
    },
    memoryNoteTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
    },
    memoryEvidenceBlock: {
      gap: 6,
    },
    memoryEvidenceLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    memoryStatusPill: {
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderWidth: 1,
      flexShrink: 0,
    },
    memoryStatusGrounded: {
      borderColor: `${colors.success}66`,
      backgroundColor: `${colors.success}16`,
    },
    memoryStatusPartial: {
      borderColor: `${colors.primary}66`,
      backgroundColor: `${colors.primary}16`,
    },
    memoryStatusStale: {
      borderColor: `${colors.error}66`,
      backgroundColor: `${colors.error}16`,
    },
    memoryStatusManual: {
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    memoryStatusText: {
      color: colors.foreground,
      fontSize: 11,
      fontWeight: '700',
    },
    memoryIssueText: {
      color: colors.error,
      fontSize: 12,
      lineHeight: 18,
    },
    memoryNoteActions: {
      flexDirection: 'row',
      gap: 8,
    },
    memorySmallButton: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    memorySmallButtonText: {
      color: colors.foreground,
      fontSize: 12,
      fontWeight: '700',
    },
    memoryDangerText: {
      color: colors.error,
    },
    memoryInput: {
      minHeight: 72,
      textAlignVertical: 'top',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.foreground,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
    },
    chatEmptyState: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      gap: 4,
    },
    chatEmptyTitle: {
      color: colors.foreground,
      fontSize: 14,
      fontWeight: '700',
    },
    chatBubble: {
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 4,
    },
    chatBubbleUser: {
      backgroundColor: `${colors.primary}16`,
      borderWidth: 1,
      borderColor: `${colors.primary}44`,
    },
    chatBubbleAssistant: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chatBubbleLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    chatBubbleText: {
      color: colors.foreground,
      fontSize: 13,
      lineHeight: 19,
    },
    referenceRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    referenceChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    referenceText: {
      color: colors.foreground,
      fontSize: 12,
      fontWeight: '600',
    },
    inlineChatAction: {
      marginTop: 4,
      alignSelf: 'flex-start',
      borderRadius: 999,
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    inlineChatActionText: {
      color: colors.background,
      fontSize: 12,
      fontWeight: '700',
    },
    inlineChatActionSecondary: {
      marginTop: 4,
      alignSelf: 'flex-start',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    inlineChatActionSecondaryText: {
      color: colors.foreground,
      fontSize: 12,
      fontWeight: '700',
    },
    chatInput: {
      minHeight: 78,
      textAlignVertical: 'top',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.foreground,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
    },
    chatActions: {
      flexDirection: 'row',
      gap: 8,
    },
  });
}

export function LocalAIModal({
  visible,
  enabled,
  provider,
  baseUrl,
  model,
  apiKey,
  fileName,
  filePath,
  language,
  content,
  selectedText,
  selectionStart,
  selectionEnd,
  openFiles,
  onClose,
  onApplyProposal,
  onOpenReference,
}: LocalAIModalProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { workspaceRootUri: rootDirectoryUri, updateSettings } = useEditor();
  const [mode, setMode] = useState<'chat' | 'actions' | 'memory'>('chat');
  const [instruction, setInstruction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [explanation, setExplanation] = useState<LocalAIExplanation | null>(null);
  const [proposal, setProposal] = useState<LocalAIEditProposal | null>(null);
  const [proposalSource, setProposalSource] = useState<{
    start: number;
    end: number;
    text: string;
    targetScope: LocalAIEditTargetScope;
  } | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<LocalAIChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [projectSummary, setProjectSummary] =
    useState<LocalAIProjectSummary>(emptyProjectSummary);
  const [isProjectSummaryLoading, setIsProjectSummaryLoading] = useState(false);
  const [lastRetrievedSnippets, setLastRetrievedSnippets] =
    useState<LocalAIRetrievedSnippet[]>(emptyRetrievedSnippets);
  const [isRetrievingContext, setIsRetrievingContext] = useState(false);
  const [workspaceMemory, setWorkspaceMemory] = useState<LocalAIWorkspaceMemory>(() =>
    createEmptyLocalAIWorkspaceMemory(rootDirectoryUri),
  );
  const [isWorkspaceMemoryLoading, setIsWorkspaceMemoryLoading] = useState(false);
  const [memoryDraft, setMemoryDraft] = useState('');
  const [editingMemoryIndex, setEditingMemoryIndex] = useState<number | null>(null);
  const [pendingMemorySuggestions, setPendingMemorySuggestions] = useState<
    LocalAIWorkspaceMemoryNote[]
  >([]);
  const [memoryInspections, setMemoryInspections] = useState<
    LocalAIWorkspaceMemoryNoteInspection[]
  >([]);
  const [memoryInspectionRevision, setMemoryInspectionRevision] = useState(0);
  const [isInspectingMemory, setIsInspectingMemory] = useState(false);

  const resetTransientState = useCallback(() => {
    setInstruction('');
    setExplanation(null);
    setProposal(null);
    setProposalSource(null);
    setIsLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    resetTransientState();
    onClose();
  }, [onClose, resetTransientState]);

  const context = useMemo(
    () => ({
      language,
      fileName,
      filePath,
      fullContent: content,
      selectedText,
      instruction,
    }),
    [content, fileName, filePath, instruction, language, selectedText],
  );
  const aiConfig = useMemo(
    () => ({ provider, baseUrl, model, apiKey }),
    [apiKey, baseUrl, model, provider],
  );
  const canUseLocalAI = enabled && Boolean(baseUrl.trim()) && Boolean(model.trim());
  const usableWorkspaceMemoryNotes = useMemo(
    () =>
      workspaceMemory.workspaceNotes.filter(
        (_, index) => memoryInspections[index]?.status !== 'stale',
      ),
    [memoryInspections, workspaceMemory.workspaceNotes],
  );
  const chatContext = useMemo(
    () => ({
      language,
      fileName,
      filePath,
      fullContent: content,
      selectedText,
      openFiles,
      projectSummary,
      retrievedSnippets: lastRetrievedSnippets,
      workspaceMemoryNotes: usableWorkspaceMemoryNotes,
    }),
    [
      content,
      fileName,
      filePath,
      language,
      lastRetrievedSnippets,
      openFiles,
      projectSummary,
      selectedText,
      usableWorkspaceMemoryNotes,
    ],
  );

  useEffect(() => {
    if (!visible || !canUseLocalAI) return;

    let cancelled = false;
    setIsProjectSummaryLoading(true);

    summarizeWorkspaceForLocalAI(rootDirectoryUri, { listFiles })
      .then((summary) => {
        if (!cancelled) {
          setProjectSummary(summary);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProjectSummary(emptyProjectSummary);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsProjectSummaryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canUseLocalAI, rootDirectoryUri, visible]);

  useEffect(() => {
    if (!visible || !canUseLocalAI) return;

    let cancelled = false;
    setIsWorkspaceMemoryLoading(true);

    loadLocalAIWorkspaceMemory(rootDirectoryUri)
      .then((memory) => {
        if (cancelled) return;

        setWorkspaceMemory(memory);
        setChatMessages(memory.recentMessages);
        setPendingMemorySuggestions([]);
        setMemoryInspections([]);
      })
      .finally(() => {
        if (!cancelled) {
          setIsWorkspaceMemoryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canUseLocalAI, rootDirectoryUri, visible]);

  const handleExplain = useCallback(async () => {
    setIsLoading(true);
    setProposal(null);
    try {
      const nextExplanation = await requestLocalAIExplanation(
        aiConfig,
        context,
      );
      setExplanation(nextExplanation);
    } catch (error) {
      Alert.alert(
        'IA local',
        error instanceof Error ? error.message : 'Não foi possível obter explicação.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [aiConfig, context]);

  const handleAutoConfigureLocalAI = useCallback(async () => {
    const detectedBaseUrl =
      baseUrl.trim() ||
      (provider === 'openai-compatible'
        ? 'http://127.0.0.1:8642'
        : 'http://127.0.0.1:11434');

    try {
      const models = await listLocalAIModels({
        provider,
        baseUrl: detectedBaseUrl,
        apiKey,
      });
      if (models.length === 0) {
        updateSettings({
          localAiEnabled: true,
          localAiProvider: provider,
          localAiBaseUrl: detectedBaseUrl,
        });
        Alert.alert(
          'IA local',
          provider === 'openai-compatible'
            ? 'A API respondeu, mas não anunciou modelos. Confirme a configuração do Hermes/Omega.'
            : 'Encontrei o Ollama, mas ainda não há modelos instalados. Instale um modelo local e volte a tentar.',
        );
        return;
      }

      const localModels = models.filter(
        (item) => !`${item.name} ${item.model}`.toLocaleLowerCase().includes(':cloud'),
      );
      const candidateModels = localModels.length > 0 ? localModels : models;
      const preferredModel =
        candidateModels.find((item) => /coder|code|qwen/i.test(`${item.name} ${item.model}`)) ??
        candidateModels[0];

      updateSettings({
        localAiEnabled: true,
        localAiProvider: provider,
        localAiBaseUrl: detectedBaseUrl,
        localAiModel: preferredModel.name,
      });
      Alert.alert(
        'IA local pronta',
        `Configurado ${preferredModel.name}. Já podes conversar e pedir código.`,
      );
    } catch (error) {
      Alert.alert(
        'IA local',
        error instanceof Error ? error.message : 'Não foi possível configurar automaticamente.',
      );
    }
  }, [apiKey, baseUrl, provider, updateSettings]);

  const handlePropose = useCallback(async () => {
    setIsLoading(true);
    setExplanation(null);
    try {
      const nextProposal = await requestLocalAIEditProposal(
        aiConfig,
        context,
      );
      setProposal(nextProposal);
      setProposalSource(
        createProposalSource(nextProposal, {
          content,
          selectedText,
          selectionStart,
          selectionEnd,
        }),
      );
    } catch (error) {
      Alert.alert(
        'IA local',
        error instanceof Error ? error.message : 'Não foi possível gerar proposta.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [aiConfig, content, context, selectedText, selectionEnd, selectionStart]);

  const canPropose = canUseLocalAI && Boolean(instruction.trim());
  const canSendChat = canUseLocalAI && Boolean(chatInput.trim()) && !isChatLoading;

  const handleSendChat = useCallback(async () => {
    const trimmedInput = chatInput.trim();
    if (!trimmedInput) return;

    const nextMessages = [
      ...chatMessages,
      { role: 'user' as const, content: trimmedInput },
    ];

    setChatMessages(nextMessages);
    setChatInput('');
    setIsChatLoading(true);
    setIsRetrievingContext(true);

    try {
      const openFileContentByPath = new Map(
        openFiles.flatMap((file) =>
          file.path && file.content !== undefined ? [[file.path, file.content] as const] : [],
        ),
      );
      const retrievedSnippets = await retrieveRelevantWorkspaceSnippetsForLocalAI(
        rootDirectoryUri,
        trimmedInput,
        {
          listFiles,
          readFile: async (path) => openFileContentByPath.get(path) ?? openFile(path),
        },
        {
          excludePaths: filePath ? [filePath] : [],
        },
      );
      setLastRetrievedSnippets(retrievedSnippets);
      setIsRetrievingContext(false);

      const response = await requestLocalAIChat(
        aiConfig,
        {
          ...chatContext,
          retrievedSnippets,
        },
        nextMessages.slice(-12),
      );
      const assistantMessage: LocalAIChatMessage = {
        role: 'assistant',
        content: response.answer,
        references: response.references,
        editInstruction: response.editInstruction || undefined,
      };
      const nextChatMessages = [...nextMessages, assistantMessage];
      const nextMemory = createLocalAIWorkspaceMemorySnapshot(
        rootDirectoryUri,
        workspaceMemory,
        nextChatMessages,
        [],
      );

      setChatMessages(nextChatMessages);
      setWorkspaceMemory(nextMemory);
      setPendingMemorySuggestions(response.memoryNotes);
      void saveLocalAIWorkspaceMemory(nextMemory).catch((error) => {
        console.error('Erro ao guardar memória da IA local:', error);
      });
    } catch (error) {
      Alert.alert(
        'IA local',
        error instanceof Error ? error.message : 'Não foi possível obter resposta do chat.',
      );
    } finally {
      setIsRetrievingContext(false);
      setIsChatLoading(false);
    }
  }, [
    aiConfig,
    chatContext,
    chatInput,
    chatMessages,
    filePath,
    openFiles,
    rootDirectoryUri,
    workspaceMemory,
  ]);

  const handleClearChat = useCallback(() => {
    setChatMessages([]);
    setLastRetrievedSnippets(emptyRetrievedSnippets);
    const nextMemory = createLocalAIWorkspaceMemorySnapshot(
      rootDirectoryUri,
      workspaceMemory,
      [],
      [],
    );
    setWorkspaceMemory(nextMemory);
    setPendingMemorySuggestions([]);
    void saveLocalAIWorkspaceMemory(nextMemory).catch((error) => {
      console.error('Erro ao limpar histórico da IA local:', error);
    });
  }, [rootDirectoryUri, workspaceMemory]);

  const handleForgetWorkspaceMemory = useCallback(() => {
    Alert.alert(
      'IA local',
      'Esquecer a memória local deste workspace?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Esquecer',
          style: 'destructive',
          onPress: () => {
            const emptyMemory = createEmptyLocalAIWorkspaceMemory(rootDirectoryUri);
            setWorkspaceMemory(emptyMemory);
            setChatMessages([]);
            setLastRetrievedSnippets(emptyRetrievedSnippets);
            setPendingMemorySuggestions([]);
            setMemoryInspections([]);
            void clearLocalAIWorkspaceMemory(rootDirectoryUri).catch((error) => {
              console.error('Erro ao apagar memória da IA local:', error);
            });
          },
        },
      ],
    );
  }, [rootDirectoryUri]);

  const persistWorkspaceMemory = useCallback((nextMemory: LocalAIWorkspaceMemory) => {
    setWorkspaceMemory(nextMemory);
    void saveLocalAIWorkspaceMemory(nextMemory).catch((error) => {
      console.error('Erro ao guardar memória da IA local:', error);
    });
  }, []);

  const currentFileMemoryEvidence = useMemo(() => {
    if (!filePath) return [];

    const relativePath = getWorkspaceRelativePath(rootDirectoryUri, filePath);
    if (!projectSummary.files.some((file) => file.relativePath === relativePath)) {
      return [];
    }

    const { line } = getLineAndColumnFromOffset(content, selectionStart);
    return [
      {
        relativePath,
        line,
        label: 'Ficheiro atual',
      },
    ];
  }, [content, filePath, projectSummary.files, rootDirectoryUri, selectionStart]);

  const handleSubmitMemoryNote = useCallback(() => {
    const trimmedDraft = memoryDraft.trim();
    if (!trimmedDraft) return;

    const nextMemory =
      editingMemoryIndex === null
        ? addWorkspaceMemoryNote(workspaceMemory, {
            text: trimmedDraft,
            evidences: currentFileMemoryEvidence,
          })
        : updateWorkspaceMemoryNote(workspaceMemory, editingMemoryIndex, trimmedDraft);

    persistWorkspaceMemory(nextMemory);
    setMemoryDraft('');
    setEditingMemoryIndex(null);
  }, [
    currentFileMemoryEvidence,
    editingMemoryIndex,
    memoryDraft,
    persistWorkspaceMemory,
    workspaceMemory,
  ]);

  const handleEditMemoryNote = useCallback(
    (index: number) => {
      setEditingMemoryIndex(index);
      setMemoryDraft(workspaceMemory.workspaceNotes[index]?.text ?? '');
      setMode('memory');
    },
    [workspaceMemory.workspaceNotes],
  );

  const handleRemoveMemoryNote = useCallback(
    (index: number) => {
      persistWorkspaceMemory(removeWorkspaceMemoryNote(workspaceMemory, index));
      if (editingMemoryIndex === index) {
        setEditingMemoryIndex(null);
        setMemoryDraft('');
      }
    },
    [editingMemoryIndex, persistWorkspaceMemory, workspaceMemory],
  );

  const handleAcceptMemorySuggestion = useCallback(
    (suggestion: LocalAIWorkspaceMemoryNote) => {
      persistWorkspaceMemory(addWorkspaceMemoryNote(workspaceMemory, suggestion));
      setPendingMemorySuggestions((current) =>
        current.filter((candidate) => candidate !== suggestion),
      );
    },
    [persistWorkspaceMemory, workspaceMemory],
  );

  const handleRejectMemorySuggestion = useCallback(
    (suggestion: LocalAIWorkspaceMemoryNote) => {
      setPendingMemorySuggestions((current) =>
        current.filter((candidate) => candidate !== suggestion),
      );
    },
    [],
  );

  const handleReinspectWorkspaceMemory = useCallback(() => {
    setMemoryInspectionRevision((revision) => revision + 1);
  }, []);

  const memoryInspectionSummary = useMemo(
    () => summarizeWorkspaceMemoryInspections(memoryInspections),
    [memoryInspections],
  );

  const handleRemoveStaleWorkspaceMemory = useCallback(() => {
    if (memoryInspectionSummary.stale === 0) return;

    Alert.alert(
      'IA local',
      `Remover ${memoryInspectionSummary.stale} nota(s) sem evidência válida?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            persistWorkspaceMemory(
              removeStaleWorkspaceMemoryNotes(workspaceMemory, memoryInspections),
            );
            if (
              editingMemoryIndex !== null &&
              memoryInspections[editingMemoryIndex]?.status === 'stale'
            ) {
              setEditingMemoryIndex(null);
              setMemoryDraft('');
            }
          },
        },
      ],
    );
  }, [
    memoryInspectionSummary.stale,
    memoryInspections,
    editingMemoryIndex,
    persistWorkspaceMemory,
    workspaceMemory,
  ]);

  const projectFileByRelativePath = useMemo(
    () => new Map(projectSummary.files.map((file) => [file.relativePath, file])),
    [projectSummary.files],
  );

  useEffect(() => {
    if (
      !visible ||
      !canUseLocalAI ||
      isProjectSummaryLoading ||
      workspaceMemory.workspaceNotes.length === 0
    ) {
      if (workspaceMemory.workspaceNotes.length === 0) {
        setMemoryInspections([]);
      }
      setIsInspectingMemory(false);
      return;
    }

    let cancelled = false;
    setIsInspectingMemory(true);

    const openFileContentByPath = new Map(
      openFiles.flatMap((file) =>
        file.path && file.content !== undefined ? [[file.path, file.content] as const] : [],
      ),
    );

    inspectWorkspaceMemoryNotes(workspaceMemory.workspaceNotes, {
      resolvePath: (relativePath) =>
        projectFileByRelativePath.get(relativePath)?.path ?? null,
      readFile: async (path) => openFileContentByPath.get(path) ?? openFile(path),
    })
      .then((inspections) => {
        if (!cancelled) {
          setMemoryInspections(inspections);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMemoryInspections([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsInspectingMemory(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    canUseLocalAI,
    isProjectSummaryLoading,
    memoryInspectionRevision,
    openFiles,
    projectFileByRelativePath,
    visible,
    workspaceMemory.workspaceNotes,
  ]);

  const handleOpenReference = useCallback(
    async (reference: LocalAIChatReference) => {
      const file = projectFileByRelativePath.get(reference.relativePath);
      if (!file) return;

      await onOpenReference(file.path, reference.line, reference.column);
    },
    [onOpenReference, projectFileByRelativePath],
  );

  const handleCreateProposalFromChat = useCallback(
    async (editInstruction: string) => {
      setMode('actions');
      setInstruction(editInstruction);
      setExplanation(null);
      setIsLoading(true);

      try {
        const nextProposal = await requestLocalAIEditProposal(
          aiConfig,
          {
            language,
            fileName,
            filePath,
            fullContent: content,
            selectedText,
            instruction: editInstruction,
          },
        );
        setProposal(nextProposal);
        setProposalSource(
          createProposalSource(nextProposal, {
            content,
            selectedText,
            selectionStart,
            selectionEnd,
          }),
        );
      } catch (error) {
        Alert.alert(
          'IA local',
          error instanceof Error ? error.message : 'Não foi possível gerar proposta.',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      aiConfig,
      content,
      fileName,
      filePath,
      language,
      selectedText,
      selectionEnd,
      selectionStart,
    ],
  );

  const handleUseAssistantCode = useCallback(
    (assistantContent: string) => {
      const replacement = extractLocalAICodeReplacement(assistantContent);
      if (!replacement.trim()) {
        Alert.alert('IA local', 'Não encontrei código aplicável nesta resposta.');
        return;
      }

      const nextProposal: LocalAIEditProposal = {
        title: 'Código da conversa',
        summary:
          'Proposta criada a partir da resposta da IA. Revê o alvo antes de aplicar.',
        replacement,
        targetScope: selectedText.trim() ? 'selection' : 'cursor',
      };

      setMode('actions');
      setInstruction('Aplicar o código sugerido na conversa.');
      setExplanation(null);
      setProposal(nextProposal);
      setProposalSource(
        createProposalSource(nextProposal, {
          content,
          selectedText,
          selectionStart,
          selectionEnd,
        }),
      );
    },
    [content, selectedText, selectionEnd, selectionStart],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>IA local</Text>
              <Text style={styles.title}>Centro de código</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar IA local"
              style={styles.closeButton}
              onPress={handleClose}
            >
              <Ionicons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>

          <View style={styles.modeRow}>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === 'chat' }}
              onPress={() => setMode('chat')}
              style={[styles.modeButton, mode === 'chat' && styles.modeButtonActive]}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  mode === 'chat' && styles.modeButtonTextActive,
                ]}
              >
                Chat
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === 'actions' }}
              onPress={() => setMode('actions')}
              style={[styles.modeButton, mode === 'actions' && styles.modeButtonActive]}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  mode === 'actions' && styles.modeButtonTextActive,
                ]}
              >
                Ações
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === 'memory' }}
              onPress={() => setMode('memory')}
              style={[styles.modeButton, mode === 'memory' && styles.modeButtonActive]}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  mode === 'memory' && styles.modeButtonTextActive,
                ]}
              >
                Memória
              </Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.bodyContent}
          >
            {!canUseLocalAI ? (
              <View style={styles.disabledCard}>
                <Text style={styles.disabledTitle}>Configuração necessária</Text>
                <Text style={styles.helper}>
                  Ative a IA local nas definições e informe o endereço do provedor
                  {provider === 'openai-compatible' ? ' Hermes/Omega' : ' Ollama'} e o modelo instalado.
                </Text>
                {isDesktopRuntime() ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Configurar IA local automaticamente"
                    onPress={handleAutoConfigureLocalAI}
                    style={[styles.actionButton, styles.primaryAction]}
                  >
                    <Text style={[styles.actionText, styles.primaryActionText]}>
                      Configurar automaticamente no PC
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : mode === 'actions' ? (
              <>
                <Text style={styles.helper}>
                  A IA lê o ficheiro atual e a seleção. Com seleção, altera um trecho; sem seleção,
                  escreve código novo no cursor. Nada é aplicado sem a tua aprovação.
                </Text>

                <TextInput
                  accessibilityLabel="Instrução para a IA local"
                  multiline
                  autoCapitalize="sentences"
                  placeholder="ex: tornar esta função mais legível sem mudar o comportamento"
                  placeholderTextColor={colors.muted}
                  value={instruction}
                  onChangeText={setInstruction}
                  style={styles.input}
                />

                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Explicar código"
                    disabled={isLoading}
                    onPress={handleExplain}
                    style={[
                      styles.actionButton,
                      styles.secondaryAction,
                      isLoading && styles.actionDisabled,
                    ]}
                  >
                    <Text style={[styles.actionText, styles.secondaryActionText]}>Explicar</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Propor alteração"
                    disabled={!canPropose || isLoading}
                    onPress={handlePropose}
                    style={[
                      styles.actionButton,
                      styles.primaryAction,
                      (!canPropose || isLoading) && styles.actionDisabled,
                    ]}
                  >
                    <Text style={[styles.actionText, styles.primaryActionText]}>
                      Propor alteração
                    </Text>
                  </Pressable>
                </View>

                {isLoading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.helper}>A pensar localmente…</Text>
                  </View>
                ) : null}

                {explanation ? (
                  <View style={styles.responseCard}>
                    <Text style={styles.responseTitle}>Explicação</Text>
                    <Text style={styles.responseText}>{explanation.summary}</Text>
                    {explanation.keyPoints.map((point) => (
                      <Text key={point} style={styles.bullet}>
                        • {point}
                      </Text>
                    ))}
                  </View>
                ) : null}

                {proposal ? (
                  <View style={styles.responseCard}>
                    <Text style={styles.responseTitle}>{proposal.title}</Text>
                    <Text style={styles.responseText}>{proposal.summary}</Text>
                    {proposalSource ? (
                      <Text style={styles.proposalMeta}>
                        Alvo: {targetScopeLabels[proposalSource.targetScope]}
                      </Text>
                    ) : null}
                    <View style={[styles.diffLine, styles.diffBefore]}>
                      <Text style={styles.diffLabel}>Antes</Text>
                      <Text style={styles.diffText}>
                        {proposalSource?.text
                          ? clipLocalAIContextValue(proposalSource.text, 3000)
                          : 'Inserção no cursor'}
                      </Text>
                    </View>
                    <View style={[styles.diffLine, styles.diffAfter]}>
                      <Text style={styles.diffLabel}>Depois</Text>
                      <Text style={styles.diffText}>
                        {clipLocalAIContextValue(proposal.replacement, 3000)}
                      </Text>
                    </View>
                    <View style={styles.applyRow}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Descartar proposta"
                        style={[styles.actionButton, styles.secondaryAction]}
                        onPress={() => {
                          setProposal(null);
                          setProposalSource(null);
                        }}
                      >
                        <Text style={[styles.actionText, styles.secondaryActionText]}>
                          Descartar
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Aplicar proposta"
                        style={[styles.actionButton, styles.primaryAction]}
                        onPress={() => {
                          if (proposalSource) {
                            onApplyProposal(proposal, proposalSource);
                          }
                        }}
                      >
                        <Text style={[styles.actionText, styles.primaryActionText]}>
                          Aplicar
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </>
            ) : mode === 'memory' ? (
              <>
                <View style={styles.memoryCard}>
                  <View style={styles.memoryHeader}>
                    <Text style={styles.chatContextTitle}>Memória do workspace</Text>
                    <Text style={styles.helper}>
                      Factos curtos que ajudam a IA a retomar decisões importantes nas próximas sessões.
                    </Text>
                    <View style={styles.memorySummaryRow}>
                      <Text style={styles.memorySummaryText}>
                        {isInspectingMemory
                          ? 'A verificar evidências…'
                          : `${memoryInspectionSummary.grounded} confirmada(s) · ${memoryInspectionSummary.partial} parcial(is) · ${memoryInspectionSummary.stale} para rever · ${memoryInspectionSummary.manual} manual(is)`}
                      </Text>
                    </View>
                    <View style={styles.memoryHeaderActions}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Revalidar memória"
                        onPress={handleReinspectWorkspaceMemory}
                        style={styles.memorySmallButton}
                      >
                        <Text style={styles.memorySmallButtonText}>Revalidar</Text>
                      </Pressable>
                      {memoryInspectionSummary.stale > 0 ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Remover notas desatualizadas"
                          onPress={handleRemoveStaleWorkspaceMemory}
                          style={styles.memorySmallButton}
                        >
                          <Text
                            style={[
                              styles.memorySmallButtonText,
                              styles.memoryDangerText,
                            ]}
                          >
                            Remover desatualizadas
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>

                  {pendingMemorySuggestions.length > 0 ? (
                    <View style={styles.memorySuggestion}>
                      <Text style={styles.memorySuggestionTitle}>
                        Sugestões da última conversa
                      </Text>
                      {pendingMemorySuggestions.map((suggestion, index) => (
                        <View
                          key={`${suggestion.text}-${index}`}
                          style={styles.memoryNote}
                        >
                          <Text style={styles.memoryNoteText}>{suggestion.text}</Text>
                          <MemoryEvidenceRow
                            evidences={suggestion.evidences}
                            onOpenReference={handleOpenReference}
                            styles={styles}
                          />
                          <View style={styles.memoryNoteActions}>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel="Guardar sugestão na memória"
                              onPress={() => handleAcceptMemorySuggestion(suggestion)}
                              style={styles.memorySmallButton}
                            >
                              <Text style={styles.memorySmallButtonText}>Guardar</Text>
                            </Pressable>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel="Descartar sugestão de memória"
                              onPress={() => handleRejectMemorySuggestion(suggestion)}
                              style={styles.memorySmallButton}
                            >
                              <Text
                                style={[
                                  styles.memorySmallButtonText,
                                  styles.memoryDangerText,
                                ]}
                              >
                                Descartar
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {workspaceMemory.workspaceNotes.length === 0 ? (
                    <View style={styles.chatEmptyState}>
                      <Text style={styles.chatEmptyTitle}>Ainda sem notas</Text>
                      <Text style={styles.helper}>
                        Podes fixar manualmente uma convenção, arquitetura ou decisão que valha a pena lembrar.
                      </Text>
                    </View>
                  ) : (
                    workspaceMemory.workspaceNotes.map((note, index) => (
                      <View key={`${note.text}-${index}`} style={styles.memoryNote}>
                        <View style={styles.memoryNoteTopRow}>
                          <Text style={styles.memoryNoteText}>{note.text}</Text>
                          <MemoryStatusPill
                            inspection={memoryInspections[index]}
                            styles={styles}
                          />
                        </View>
                        <MemoryEvidenceRow
                          evidences={note.evidences}
                          onOpenReference={handleOpenReference}
                          styles={styles}
                        />
                        {getMemoryInspectionIssueText(memoryInspections[index]) ? (
                          <Text style={styles.memoryIssueText}>
                            {getMemoryInspectionIssueText(memoryInspections[index])}
                          </Text>
                        ) : null}
                        <View style={styles.memoryNoteActions}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Editar nota ${index + 1}`}
                            onPress={() => handleEditMemoryNote(index)}
                            style={styles.memorySmallButton}
                          >
                            <Text style={styles.memorySmallButtonText}>Editar</Text>
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Apagar nota ${index + 1}`}
                            onPress={() => handleRemoveMemoryNote(index)}
                            style={styles.memorySmallButton}
                          >
                            <Text
                              style={[
                                styles.memorySmallButtonText,
                                styles.memoryDangerText,
                              ]}
                            >
                              Apagar
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ))
                  )}
                </View>

                <TextInput
                  accessibilityLabel="Nota de memória"
                  multiline
                  autoCapitalize="sentences"
                  placeholder="ex: EditorContext é a fonte canónica para ciclo de vida dos ficheiros."
                  placeholderTextColor={colors.muted}
                  value={memoryDraft}
                  onChangeText={setMemoryDraft}
                  style={styles.memoryInput}
                />

                <View style={styles.chatActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cancelar edição da memória"
                    disabled={!memoryDraft.trim() && editingMemoryIndex === null}
                    onPress={() => {
                      setMemoryDraft('');
                      setEditingMemoryIndex(null);
                    }}
                    style={[
                      styles.actionButton,
                      styles.secondaryAction,
                      !memoryDraft.trim() && editingMemoryIndex === null
                        ? styles.actionDisabled
                        : null,
                    ]}
                  >
                    <Text style={[styles.actionText, styles.secondaryActionText]}>
                      Cancelar
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      editingMemoryIndex === null
                        ? 'Guardar nota de memória'
                        : 'Atualizar nota de memória'
                    }
                    disabled={!memoryDraft.trim()}
                    onPress={handleSubmitMemoryNote}
                    style={[
                      styles.actionButton,
                      styles.primaryAction,
                      !memoryDraft.trim() && styles.actionDisabled,
                    ]}
                  >
                    <Text style={[styles.actionText, styles.primaryActionText]}>
                      {editingMemoryIndex === null ? 'Guardar nota' : 'Atualizar nota'}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <View style={styles.chatContextCard}>
                  <Text style={styles.chatContextTitle}>Contexto ligado</Text>
                  <Text style={styles.chatContextMeta}>
                    {fileName} · {openFiles.length} ficheiro(s) aberto(s)
                  </Text>
                  <Text style={styles.chatContextMeta}>
                    {isProjectSummaryLoading
                      ? 'A mapear o projeto…'
                      : `${projectSummary.files.length} ficheiro(s) no mapa local${
                          projectSummary.omittedFileCount > 0
                            ? ` · +${projectSummary.omittedFileCount} ocultos`
                            : ''
                        }`}
                  </Text>
                  <Text style={styles.chatContextMeta}>
                    {isRetrievingContext
                      ? 'A recuperar trechos relevantes…'
                      : `${lastRetrievedSnippets.length} trecho(s) recuperado(s) na última pergunta`}
                  </Text>
                  <Text style={styles.chatContextMeta}>
                    {isWorkspaceMemoryLoading
                      ? 'A carregar memória local…'
                      : `${workspaceMemory.workspaceNotes.length} nota(s) durável(eis) em memória local`}
                  </Text>
                  <Text style={styles.chatContextMeta}>
                    {memoryInspectionSummary.stale > 0
                      ? `${usableWorkspaceMemoryNotes.length} nota(s) aproveitável(eis) no contexto · ${memoryInspectionSummary.stale} a pedir revisão`
                      : `${usableWorkspaceMemoryNotes.length} nota(s) aproveitável(eis) no contexto`}
                  </Text>
                  <Text style={styles.chatContextMeta}>
                    {pendingMemorySuggestions.length} sugestão(ões) de memória por aprovar
                  </Text>
                  {workspaceMemory.workspaceNotes.length > 0 ||
                  workspaceMemory.recentMessages.length > 0 ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Esquecer memória local do workspace"
                      onPress={handleForgetWorkspaceMemory}
                      style={styles.memoryAction}
                    >
                      <Text style={styles.memoryActionText}>Esquecer memória</Text>
                    </Pressable>
                  ) : null}
                </View>

                {chatMessages.length === 0 ? (
                  <View style={styles.chatEmptyState}>
                    <Text style={styles.chatEmptyTitle}>Começa pelo porquê</Text>
                    <Text style={styles.helper}>
                      Pergunta sobre o ficheiro atual, a estrutura do projeto ou uma próxima melhoria.
                    </Text>
                  </View>
                ) : (
                  chatMessages.map((message, index) => (
                      <ChatMessageRow
                        key={`${message.role}-${index}-${message.content}`}
                        message={message}
                        onOpenReference={handleOpenReference}
                        onCreateProposal={handleCreateProposalFromChat}
                        onUseAssistantCode={handleUseAssistantCode}
                      styles={styles}
                    />
                  ))
                )}

                {isChatLoading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.helper}>A responder localmente…</Text>
                  </View>
                ) : null}

                <TextInput
                  accessibilityLabel="Mensagem para o chat local"
                  multiline
                  autoCapitalize="sentences"
                  placeholder="ex: explica a arquitetura deste projeto e sugere o próximo passo"
                  placeholderTextColor={colors.muted}
                  value={chatInput}
                  onChangeText={setChatInput}
                  style={styles.chatInput}
                />

                <View style={styles.chatActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Limpar conversa"
                    disabled={chatMessages.length === 0 || isChatLoading}
                    onPress={handleClearChat}
                    style={[
                      styles.actionButton,
                      styles.secondaryAction,
                      (chatMessages.length === 0 || isChatLoading) &&
                        styles.actionDisabled,
                    ]}
                  >
                    <Text style={[styles.actionText, styles.secondaryActionText]}>
                      Limpar
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Enviar mensagem"
                    disabled={!canSendChat}
                    onPress={handleSendChat}
                    style={[
                      styles.actionButton,
                      styles.primaryAction,
                      !canSendChat && styles.actionDisabled,
                    ]}
                  >
                    <Text style={[styles.actionText, styles.primaryActionText]}>
                      Enviar
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
