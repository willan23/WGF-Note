import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  LocalAIChatMessage,
  LocalAIChatReference,
  LocalAIEditTargetScope,
} from './local-ai';

export const LOCAL_AI_MEMORY_VERSION = 1;
export const LOCAL_AI_MEMORY_STORAGE_PREFIX = 'local-ai-memory-v1:';

const maxRecentMessages = 12;
const maxWorkspaceNotes = 12;
const maxWorkspaceNoteLength = 220;
const maxWorkspaceNoteEvidences = 6;

export interface LocalAIWorkspaceMemoryNote {
  text: string;
  evidences: LocalAIChatReference[];
}

export type LocalAIWorkspaceMemoryNoteInput =
  | string
  | LocalAIWorkspaceMemoryNote;

export interface LocalAIWorkspaceMemory {
  version: typeof LOCAL_AI_MEMORY_VERSION;
  workspaceUri: string;
  updatedAt: number;
  workspaceNotes: LocalAIWorkspaceMemoryNote[];
  recentMessages: LocalAIChatMessage[];
}

export type LocalAIWorkspaceMemoryEvidenceStatus =
  | 'valid'
  | 'missing-file'
  | 'missing-line'
  | 'unreadable';

export type LocalAIWorkspaceMemoryNoteStatus =
  | 'manual'
  | 'grounded'
  | 'partial'
  | 'stale';

export interface LocalAIWorkspaceMemoryEvidenceInspection {
  evidence: LocalAIChatReference;
  status: LocalAIWorkspaceMemoryEvidenceStatus;
}

export interface LocalAIWorkspaceMemoryNoteInspection {
  status: LocalAIWorkspaceMemoryNoteStatus;
  validEvidenceCount: number;
  invalidEvidenceCount: number;
  evidences: LocalAIWorkspaceMemoryEvidenceInspection[];
}

export interface LocalAIWorkspaceMemoryInspectionDependencies {
  resolvePath: (relativePath: string) => string | null;
  readFile: (path: string) => Promise<string>;
}

export interface LocalAIWorkspaceMemoryInspectionSummary {
  manual: number;
  grounded: number;
  partial: number;
  stale: number;
}

export interface LocalAIResolvedProblemMemoryInput {
  title?: string;
  summary?: string;
  fileName?: string;
  targetScope?: LocalAIEditTargetScope;
  evidences?: LocalAIChatReference[];
}

const targetScopeMemoryLabels: Record<LocalAIEditTargetScope, string> = {
  selection: 'seleção',
  cursor: 'cursor',
  file: 'ficheiro inteiro',
};

function normalizeMemoryText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function getStorageKey(workspaceUri: string): string {
  return `${LOCAL_AI_MEMORY_STORAGE_PREFIX}${encodeURIComponent(workspaceUri)}`;
}

function isLocalAIChatMessage(value: unknown): value is LocalAIChatMessage {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<LocalAIChatMessage>;
  return (
    (candidate.role === 'user' || candidate.role === 'assistant') &&
    typeof candidate.content === 'string'
  );
}

function normalizeMemoryEvidence(value: unknown): LocalAIChatReference | null {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<LocalAIChatReference>;
  if (typeof candidate.relativePath !== 'string' || !candidate.relativePath.trim()) {
    return null;
  }

  const evidence: LocalAIChatReference = {
    relativePath: candidate.relativePath.trim(),
  };

  if (typeof candidate.line === 'number' && Number.isFinite(candidate.line)) {
    evidence.line = Math.max(1, Math.floor(candidate.line));
  }

  if (typeof candidate.column === 'number' && Number.isFinite(candidate.column)) {
    evidence.column = Math.max(1, Math.floor(candidate.column));
  }

  if (typeof candidate.label === 'string' && candidate.label.trim()) {
    evidence.label = candidate.label.trim();
  }

  return evidence;
}

function mergeMemoryEvidences(
  evidences: LocalAIChatReference[],
): LocalAIChatReference[] {
  const evidencesByKey = new Map<string, LocalAIChatReference>();

  for (const evidence of evidences) {
    const normalized = normalizeMemoryEvidence(evidence);
    if (!normalized) continue;

    const key = [
      normalized.relativePath,
      normalized.line ?? '',
      normalized.column ?? '',
      normalized.label ?? '',
    ].join(':');
    evidencesByKey.delete(key);
    evidencesByKey.set(key, normalized);
  }

  return Array.from(evidencesByKey.values()).slice(-maxWorkspaceNoteEvidences);
}

function normalizeWorkspaceMemoryNote(
  value: unknown,
): LocalAIWorkspaceMemoryNote | null {
  if (typeof value === 'string') {
    const text = normalizeMemoryText(value);
    if (!text) return null;

    return {
      text: text.slice(0, maxWorkspaceNoteLength),
      evidences: [],
    };
  }

  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<LocalAIWorkspaceMemoryNote>;
  if (typeof candidate.text !== 'string') return null;

  const text = normalizeMemoryText(candidate.text);
  if (!text) return null;

  return {
    text: text.slice(0, maxWorkspaceNoteLength),
    evidences: Array.isArray(candidate.evidences)
      ? mergeMemoryEvidences(candidate.evidences)
      : [],
  };
}

function normalizeStoredLocalAIWorkspaceMemory(
  value: unknown,
): LocalAIWorkspaceMemory | null {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<LocalAIWorkspaceMemory>;
  if (
    candidate.version !== LOCAL_AI_MEMORY_VERSION ||
    typeof candidate.workspaceUri !== 'string' ||
    typeof candidate.updatedAt !== 'number' ||
    !Array.isArray(candidate.workspaceNotes) ||
    !Array.isArray(candidate.recentMessages) ||
    !candidate.recentMessages.every(isLocalAIChatMessage)
  ) {
    return null;
  }

  const workspaceNotes = candidate.workspaceNotes.flatMap((note) => {
    const normalized = normalizeWorkspaceMemoryNote(note);
    return normalized ? [normalized] : [];
  });

  if (workspaceNotes.length !== candidate.workspaceNotes.length) {
    return null;
  }

  return {
    version: LOCAL_AI_MEMORY_VERSION,
    workspaceUri: candidate.workspaceUri,
    updatedAt: candidate.updatedAt,
    workspaceNotes: mergeWorkspaceMemoryNotes([], workspaceNotes),
    recentMessages: candidate.recentMessages,
  };
}

export function createEmptyLocalAIWorkspaceMemory(
  workspaceUri: string,
): LocalAIWorkspaceMemory {
  return {
    version: LOCAL_AI_MEMORY_VERSION,
    workspaceUri,
    updatedAt: 0,
    workspaceNotes: [],
    recentMessages: [],
  };
}

export function isLocalAIWorkspaceMemory(
  value: unknown,
): value is LocalAIWorkspaceMemory {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<LocalAIWorkspaceMemory>;
  return (
    candidate.version === LOCAL_AI_MEMORY_VERSION &&
    typeof candidate.workspaceUri === 'string' &&
    typeof candidate.updatedAt === 'number' &&
    Array.isArray(candidate.workspaceNotes) &&
    candidate.workspaceNotes.every((note) => {
      const normalized = normalizeWorkspaceMemoryNote(note);
      return normalized !== null && typeof note !== 'string';
    }) &&
    Array.isArray(candidate.recentMessages) &&
    candidate.recentMessages.every(isLocalAIChatMessage)
  );
}

export function mergeWorkspaceMemoryNotes(
  existingNotes: LocalAIWorkspaceMemoryNoteInput[],
  candidateNotes: LocalAIWorkspaceMemoryNoteInput[],
): LocalAIWorkspaceMemoryNote[] {
  const notesByKey = new Map<string, LocalAIWorkspaceMemoryNote>();

  for (const note of [...existingNotes, ...candidateNotes]) {
    const normalized = normalizeWorkspaceMemoryNote(note);
    if (!normalized) continue;

    const key = normalized.text.toLocaleLowerCase();
    const existing = notesByKey.get(key);
    const nextNote: LocalAIWorkspaceMemoryNote = {
      text: normalized.text,
      evidences: mergeMemoryEvidences([
        ...(existing?.evidences ?? []),
        ...normalized.evidences,
      ]),
    };

    notesByKey.delete(key);
    notesByKey.set(key, nextNote);
  }

  return Array.from(notesByKey.values()).slice(-maxWorkspaceNotes);
}

export function createLocalAIWorkspaceMemorySnapshot(
  workspaceUri: string,
  previousMemory: LocalAIWorkspaceMemory | null,
  recentMessages: LocalAIChatMessage[],
  candidateNotes: LocalAIWorkspaceMemoryNoteInput[],
  updatedAt = Date.now(),
): LocalAIWorkspaceMemory {
  return {
    version: LOCAL_AI_MEMORY_VERSION,
    workspaceUri,
    updatedAt,
    workspaceNotes: mergeWorkspaceMemoryNotes(
      previousMemory?.workspaceNotes ?? [],
      candidateNotes,
    ),
    recentMessages: recentMessages.slice(-maxRecentMessages),
  };
}

export function addWorkspaceMemoryNote(
  memory: LocalAIWorkspaceMemory,
  note: LocalAIWorkspaceMemoryNoteInput,
  updatedAt = Date.now(),
): LocalAIWorkspaceMemory {
  return {
    ...memory,
    updatedAt,
    workspaceNotes: mergeWorkspaceMemoryNotes(memory.workspaceNotes, [note]),
  };
}

export function createResolvedProblemMemoryNote(
  input: LocalAIResolvedProblemMemoryInput,
): LocalAIWorkspaceMemoryNote | null {
  const problemSummary = normalizeMemoryText(input.summary ?? input.title ?? '');
  if (!problemSummary) return null;

  const fileSegment = input.fileName?.trim() ? ` em ${input.fileName.trim()}` : '';
  const scopeSegment = input.targetScope
    ? `; alvo: ${targetScopeMemoryLabels[input.targetScope]}`
    : '';
  const trimmedSummary = problemSummary.replace(/[.!?]+$/, '');
  const note = normalizeWorkspaceMemoryNote({
    text: `Resolvido${fileSegment}: ${trimmedSummary}${scopeSegment}.`,
    evidences: input.evidences ?? [],
  });

  return note;
}

export function updateWorkspaceMemoryNote(
  memory: LocalAIWorkspaceMemory,
  index: number,
  note: string,
  updatedAt = Date.now(),
): LocalAIWorkspaceMemory {
  const previousNote = memory.workspaceNotes[index];
  const nextNotes = memory.workspaceNotes.filter((_, noteIndex) => noteIndex !== index);

  return {
    ...memory,
    updatedAt,
    workspaceNotes: mergeWorkspaceMemoryNotes(nextNotes, [
      {
        text: note,
        evidences: previousNote?.evidences ?? [],
      },
    ]),
  };
}

export function removeWorkspaceMemoryNote(
  memory: LocalAIWorkspaceMemory,
  index: number,
  updatedAt = Date.now(),
): LocalAIWorkspaceMemory {
  return {
    ...memory,
    updatedAt,
    workspaceNotes: memory.workspaceNotes.filter((_, noteIndex) => noteIndex !== index),
  };
}

export async function inspectWorkspaceMemoryNotes(
  notes: LocalAIWorkspaceMemoryNote[],
  dependencies: LocalAIWorkspaceMemoryInspectionDependencies,
): Promise<LocalAIWorkspaceMemoryNoteInspection[]> {
  const fileReads = new Map<string, Promise<string | null>>();

  const readContent = (path: string): Promise<string | null> => {
    const cached = fileReads.get(path);
    if (cached) return cached;

    const nextRead = dependencies.readFile(path).catch(() => null);
    fileReads.set(path, nextRead);
    return nextRead;
  };

  return Promise.all(
    notes.map(async (note) => {
      if (note.evidences.length === 0) {
        return {
          status: 'manual',
          validEvidenceCount: 0,
          invalidEvidenceCount: 0,
          evidences: [],
        } satisfies LocalAIWorkspaceMemoryNoteInspection;
      }

      const evidences = await Promise.all(
        note.evidences.map(async (evidence) => {
          const resolvedPath = dependencies.resolvePath(evidence.relativePath);
          if (!resolvedPath) {
            return {
              evidence,
              status: 'missing-file',
            } satisfies LocalAIWorkspaceMemoryEvidenceInspection;
          }

          if (!evidence.line) {
            return {
              evidence,
              status: 'valid',
            } satisfies LocalAIWorkspaceMemoryEvidenceInspection;
          }

          const content = await readContent(resolvedPath);
          if (content === null) {
            return {
              evidence,
              status: 'unreadable',
            } satisfies LocalAIWorkspaceMemoryEvidenceInspection;
          }

          const lineCount = content.split(/\r?\n/).length;
          return {
            evidence,
            status: evidence.line <= lineCount ? 'valid' : 'missing-line',
          } satisfies LocalAIWorkspaceMemoryEvidenceInspection;
        }),
      );

      const validEvidenceCount = evidences.filter(
        (evidence) => evidence.status === 'valid',
      ).length;
      const invalidEvidenceCount = evidences.length - validEvidenceCount;
      const status: LocalAIWorkspaceMemoryNoteStatus =
        validEvidenceCount === evidences.length
          ? 'grounded'
          : validEvidenceCount > 0
            ? 'partial'
            : 'stale';

      return {
        status,
        validEvidenceCount,
        invalidEvidenceCount,
        evidences,
      } satisfies LocalAIWorkspaceMemoryNoteInspection;
    }),
  );
}

export function summarizeWorkspaceMemoryInspections(
  inspections: LocalAIWorkspaceMemoryNoteInspection[],
): LocalAIWorkspaceMemoryInspectionSummary {
  return inspections.reduce<LocalAIWorkspaceMemoryInspectionSummary>(
    (summary, inspection) => ({
      ...summary,
      [inspection.status]: summary[inspection.status] + 1,
    }),
    {
      manual: 0,
      grounded: 0,
      partial: 0,
      stale: 0,
    },
  );
}

export function removeStaleWorkspaceMemoryNotes(
  memory: LocalAIWorkspaceMemory,
  inspections: LocalAIWorkspaceMemoryNoteInspection[],
  updatedAt = Date.now(),
): LocalAIWorkspaceMemory {
  return {
    ...memory,
    updatedAt,
    workspaceNotes: memory.workspaceNotes.filter(
      (_, index) => inspections[index]?.status !== 'stale',
    ),
  };
}

export async function loadLocalAIWorkspaceMemory(
  workspaceUri: string,
): Promise<LocalAIWorkspaceMemory> {
  try {
    const stored = await AsyncStorage.getItem(getStorageKey(workspaceUri));
    if (!stored) return createEmptyLocalAIWorkspaceMemory(workspaceUri);

    const parsed: unknown = JSON.parse(stored);
    const normalized = normalizeStoredLocalAIWorkspaceMemory(parsed);
    if (!normalized || normalized.workspaceUri !== workspaceUri) {
      return createEmptyLocalAIWorkspaceMemory(workspaceUri);
    }

    return normalized;
  } catch {
    return createEmptyLocalAIWorkspaceMemory(workspaceUri);
  }
}

export async function saveLocalAIWorkspaceMemory(
  memory: LocalAIWorkspaceMemory,
): Promise<void> {
  await AsyncStorage.setItem(getStorageKey(memory.workspaceUri), JSON.stringify(memory));
}

export async function clearLocalAIWorkspaceMemory(workspaceUri: string): Promise<void> {
  await AsyncStorage.removeItem(getStorageKey(workspaceUri));
}
