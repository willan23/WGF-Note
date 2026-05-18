import type { FileInfo } from './file-system-manager';

export interface ProjectTreeRow extends FileInfo {
  depth: number;
}

export function normalizeWorkspaceUri(uri: string): string {
  return uri.replace(/\/+$/, '');
}

export function getWorkspaceUriKey(uri: string): string {
  return normalizeWorkspaceUri(uri);
}

export function replaceWorkspacePathPrefix(
  path: string,
  oldPath: string,
  newPath: string,
): string {
  const normalizedPath = normalizeWorkspaceUri(path);
  const normalizedOldPath = normalizeWorkspaceUri(oldPath);
  const normalizedNewPath = normalizeWorkspaceUri(newPath);

  if (normalizedPath === normalizedOldPath) {
    return normalizedNewPath;
  }

  return `${normalizedNewPath}${normalizedPath.slice(normalizedOldPath.length)}`;
}

export function isWorkspacePathAffected(
  candidatePath: string,
  changedPath: string,
  includeDescendants: boolean,
): boolean {
  const normalizedCandidatePath = normalizeWorkspaceUri(candidatePath);
  const normalizedChangedPath = normalizeWorkspaceUri(changedPath);

  return includeDescendants
    ? normalizedCandidatePath === normalizedChangedPath ||
        normalizedCandidatePath.startsWith(`${normalizedChangedPath}/`)
    : normalizedCandidatePath === normalizedChangedPath;
}

export function isPathInsideWorkspace(rootUri: string, path: string | null | undefined): boolean {
  if (!path) return false;

  const normalizedRoot = normalizeWorkspaceUri(rootUri);
  const normalizedPath = normalizeWorkspaceUri(path);

  return normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot}/`);
}

export function getWorkspaceAncestorDirectoryUris(
  rootUri: string,
  path: string | null | undefined,
): string[] {
  if (!path || !isPathInsideWorkspace(rootUri, path)) {
    return [];
  }

  const normalizedRoot = normalizeWorkspaceUri(rootUri);
  const normalizedPath = normalizeWorkspaceUri(path);
  const relativeSegments = normalizedPath.slice(normalizedRoot.length).split('/').filter(Boolean);

  if (relativeSegments.length <= 1) {
    return [normalizedRoot];
  }

  const directorySegments = relativeSegments.slice(0, -1);
  const ancestors = [normalizedRoot];
  let current = normalizedRoot;

  directorySegments.forEach((segment) => {
    current = `${current}/${segment}`;
    ancestors.push(current);
  });

  return ancestors;
}

export function flattenProjectTree(
  rootUri: string,
  childrenByDirectory: Record<string, FileInfo[]>,
  expandedDirectoryUris: Set<string>,
): ProjectTreeRow[] {
  const rows: ProjectTreeRow[] = [];

  const visitDirectory = (directoryUri: string, depth: number) => {
    const children = childrenByDirectory[getWorkspaceUriKey(directoryUri)] ?? [];

    children.forEach((child) => {
      rows.push({ ...child, depth });

      if (
        child.isDirectory &&
        expandedDirectoryUris.has(getWorkspaceUriKey(child.uri))
      ) {
        visitDirectory(child.uri, depth + 1);
      }
    });
  };

  visitDirectory(rootUri, 0);
  return rows;
}
