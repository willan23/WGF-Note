import type { FileInfo } from './file-system-manager';
import { getLineAndColumnFromOffset } from './editor-state';
import {
  findMatches,
  replaceAllMatches,
  type SearchMatch,
  type SearchOptions,
} from './search-utils';
import { normalizeWorkspaceUri } from './workspace-tree';
import { isSupportedFileExtension } from './types-extended';

export interface WorkspaceSearchResult {
  path: string;
  name: string;
  relativePath: string;
  start: number;
  end: number;
  line: number;
  column: number;
  preview: string;
}

export interface WorkspaceFileEntry {
  path: string;
  name: string;
  relativePath: string;
}

export interface WorkspaceSearchDependencies {
  listFiles: (directoryUri: string) => Promise<FileInfo[]>;
  readFile: (filePath: string) => Promise<string>;
}

export interface WorkspaceSearchOptions extends SearchOptions {
  maxResults?: number;
}

export interface WorkspaceReplacementPlanItem {
  path: string;
  name: string;
  relativePath: string;
  matchCount: number;
  nextContent: string;
  originalContent: string;
  replacement: string;
  changes: WorkspaceReplacementChange[];
}

export interface WorkspaceReplacementChange {
  id: string;
  line: number;
  before: string;
  after: string;
  matchCount: number;
  matches: SearchMatch[];
}

export interface WorkspaceReplacementSummary {
  fileCount: number;
  changeCount: number;
  replacementCount: number;
}

const defaultMaxResults = 250;
const previewMaxLength = 120;

export function isSearchableWorkspaceFile(file: Pick<FileInfo, 'name' | 'isDirectory'>): boolean {
  if (file.isDirectory) return false;

  const extension = file.name.split('.').pop()?.toLocaleLowerCase() ?? '';
  return isSupportedFileExtension(extension);
}

export function getWorkspaceRelativePath(rootUri: string, path: string): string {
  const normalizedRoot = normalizeWorkspaceUri(rootUri);
  const normalizedPath = normalizeWorkspaceUri(path);

  if (normalizedPath === normalizedRoot) return '';
  if (!normalizedPath.startsWith(`${normalizedRoot}/`)) return normalizedPath;

  return normalizedPath.slice(normalizedRoot.length + 1);
}

function createPreview(content: string, start: number): string {
  const lineStart = content.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  const lineEndCandidate = content.indexOf('\n', start);
  const lineEnd = lineEndCandidate === -1 ? content.length : lineEndCandidate;
  const rawLine = content.slice(lineStart, lineEnd).trim();

  if (rawLine.length <= previewMaxLength) {
    return rawLine;
  }

  const matchOffsetInLine = Math.max(0, start - lineStart);
  const windowStart = Math.max(0, matchOffsetInLine - Math.floor(previewMaxLength / 3));
  const windowEnd = Math.min(rawLine.length, windowStart + previewMaxLength);
  const prefix = windowStart > 0 ? '…' : '';
  const suffix = windowEnd < rawLine.length ? '…' : '';

  return `${prefix}${rawLine.slice(windowStart, windowEnd)}${suffix}`;
}

export function getWorkspaceReplacementChangeId(path: string, line: number): string {
  return `${path}::line:${line}`;
}

export async function listWorkspaceFiles(
  rootUri: string,
  dependencies: Pick<WorkspaceSearchDependencies, 'listFiles'>,
): Promise<WorkspaceFileEntry[]> {
  const files: WorkspaceFileEntry[] = [];

  const visitDirectory = async (directoryUri: string): Promise<void> => {
    const children = await dependencies.listFiles(directoryUri);

    for (const child of children) {
      if (child.isDirectory) {
        await visitDirectory(child.uri);
        continue;
      }

      if (!isSearchableWorkspaceFile(child)) {
        continue;
      }

      files.push({
        path: child.uri,
        name: child.name,
        relativePath: getWorkspaceRelativePath(rootUri, child.uri),
      });
    }
  };

  await visitDirectory(rootUri);
  return files;
}

function createReplacementChanges(
  path: string,
  content: string,
  matches: ReturnType<typeof findMatches>,
  replacement: string,
): WorkspaceReplacementChange[] {
  const matchesByLine = new Map<number, SearchMatch[]>();

  for (const match of matches) {
    const { line } = getLineAndColumnFromOffset(content, match.start);
    const lineMatches = matchesByLine.get(line) ?? [];
    lineMatches.push(match);
    matchesByLine.set(line, lineMatches);
  }

  return Array.from(matchesByLine.entries()).map(([line, lineMatches]) => {
    const lineResult = replaceAllMatches(content, lineMatches, replacement);
    const firstMatch = lineMatches[0];

    return {
      id: getWorkspaceReplacementChangeId(path, line),
      line,
      before: createPreview(content, firstMatch.start),
      after: createPreview(lineResult.content, firstMatch.start),
      matchCount: lineMatches.length,
      matches: lineMatches,
    };
  });
}

export async function searchWorkspace(
  rootUri: string,
  query: string,
  options: WorkspaceSearchOptions,
  dependencies: WorkspaceSearchDependencies,
): Promise<WorkspaceSearchResult[]> {
  if (!query.trim()) return [];

  const maxResults = options.maxResults ?? defaultMaxResults;
  const results: WorkspaceSearchResult[] = [];

  const visitDirectory = async (directoryUri: string): Promise<void> => {
    if (results.length >= maxResults) return;

    const children = await dependencies.listFiles(directoryUri);

    for (const child of children) {
      if (results.length >= maxResults) return;

      if (child.isDirectory) {
        await visitDirectory(child.uri);
        continue;
      }

      if (!isSearchableWorkspaceFile(child)) {
        continue;
      }

      let content = '';
      try {
        content = await dependencies.readFile(child.uri);
      } catch {
        continue;
      }

      const matches = findMatches(content, query, options);
      for (const match of matches) {
        if (results.length >= maxResults) return;

        const { line, column } = getLineAndColumnFromOffset(content, match.start);
        results.push({
          path: child.uri,
          name: child.name,
          relativePath: getWorkspaceRelativePath(rootUri, child.uri),
          start: match.start,
          end: match.end,
          line,
          column,
          preview: createPreview(content, match.start),
        });
      }
    }
  };

  await visitDirectory(rootUri);
  return results;
}

export async function planWorkspaceReplacement(
  rootUri: string,
  query: string,
  replacement: string,
  options: SearchOptions,
  dependencies: WorkspaceSearchDependencies,
): Promise<WorkspaceReplacementPlanItem[]> {
  if (!query.trim()) return [];

  const plan: WorkspaceReplacementPlanItem[] = [];

  const visitDirectory = async (directoryUri: string): Promise<void> => {
    const children = await dependencies.listFiles(directoryUri);

    for (const child of children) {
      if (child.isDirectory) {
        await visitDirectory(child.uri);
        continue;
      }

      if (!isSearchableWorkspaceFile(child)) {
        continue;
      }

      let content = '';
      try {
        content = await dependencies.readFile(child.uri);
      } catch {
        continue;
      }

      const matches = findMatches(content, query, options);
      if (matches.length === 0) {
        continue;
      }

      const result = replaceAllMatches(content, matches, replacement);
      if (result.content === content) {
        continue;
      }

      plan.push({
        path: child.uri,
        name: child.name,
        relativePath: getWorkspaceRelativePath(rootUri, child.uri),
        matchCount: matches.length,
        nextContent: result.content,
        originalContent: content,
        replacement,
        changes: createReplacementChanges(
          child.uri,
          content,
          matches,
          replacement,
        ),
      });
    }
  };

  await visitDirectory(rootUri);
  return plan;
}

export function summarizeWorkspaceReplacementPlan(
  plan: WorkspaceReplacementPlanItem[],
): WorkspaceReplacementSummary {
  return plan.reduce(
    (summary, item) => ({
      fileCount: summary.fileCount + 1,
      changeCount: summary.changeCount + item.changes.length,
      replacementCount: summary.replacementCount + item.matchCount,
    }),
    { fileCount: 0, changeCount: 0, replacementCount: 0 },
  );
}

export function selectWorkspaceReplacementChanges(
  plan: WorkspaceReplacementPlanItem[],
  selectedChangeIds: Iterable<string>,
): WorkspaceReplacementPlanItem[] {
  const selectedChangeIdSet = new Set(selectedChangeIds);

  return plan.flatMap((item) => {
    const selectedChanges = item.changes.filter((change) =>
      selectedChangeIdSet.has(change.id),
    );
    if (selectedChanges.length === 0) return [];

    const selectedMatches = selectedChanges
      .flatMap((change) => change.matches)
      .sort((a, b) => a.start - b.start);
    const result = replaceAllMatches(item.originalContent, selectedMatches, item.replacement);

    return [
      {
        ...item,
        matchCount: selectedMatches.length,
        nextContent: result.content,
        changes: selectedChanges,
      },
    ];
  });
}
