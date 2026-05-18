import {
  createDirectory,
  getProjectsDirectoryUri,
  listFiles,
  openFile,
  saveFile,
  type FileInfo,
} from './file-system-manager';
import { getWorkspaceRelativePath, isSearchableWorkspaceFile } from './workspace-search';
import {
  detectLanguageFromExtension,
  type CodeLanguage,
} from './types-extended';

export interface WorkspaceCloudSnapshotFile {
  relativePath: string;
  name: string;
  language: CodeLanguage;
  content: string;
  lastModified: number;
}

export interface RemoteCloudFileLike {
  relativePath: string;
  name: string;
  content: string;
}

async function walkWorkspaceFiles(
  rootUri: string,
  directoryUri: string,
  accumulator: WorkspaceCloudSnapshotFile[],
): Promise<void> {
  const entries = await listFiles(directoryUri);

  for (const entry of entries) {
    if (entry.isDirectory) {
      await walkWorkspaceFiles(rootUri, entry.uri, accumulator);
      continue;
    }

    if (!isSearchableWorkspaceFile(entry)) continue;

    accumulator.push({
      relativePath: getWorkspaceRelativePath(rootUri, entry.uri),
      name: entry.name,
      language: detectLanguageFromExtension(entry.name),
      content: await openFile(entry.uri),
      lastModified: entry.modificationTime ?? 0,
    });
  }
}

export async function collectWorkspaceCloudSnapshot(
  rootUri = getProjectsDirectoryUri(),
): Promise<WorkspaceCloudSnapshotFile[]> {
  const files: WorkspaceCloudSnapshotFile[] = [];
  await walkWorkspaceFiles(rootUri, rootUri, files);
  return files;
}

function joinWorkspaceUri(rootUri: string, relativePath: string): string {
  return `${rootUri.replace(/\/+$/, '')}/${relativePath.replace(/^\/+/, '')}`;
}

async function ensureWorkspaceDirectory(rootUri: string, relativePath: string): Promise<string> {
  const segments = relativePath.split('/').filter(Boolean);
  let currentUri = rootUri;

  for (const segment of segments) {
    currentUri = await createDirectory(segment, currentUri);
  }

  return currentUri;
}

export async function writeRemoteCloudFiles(
  files: RemoteCloudFileLike[],
  rootUri = getProjectsDirectoryUri(),
): Promise<number> {
  let written = 0;

  for (const file of files) {
    const segments = file.relativePath.split('/').filter(Boolean);
    const name = segments.pop() ?? file.name;
    const parentRelativePath = segments.join('/');
    const parentUri = parentRelativePath
      ? await ensureWorkspaceDirectory(rootUri, parentRelativePath)
      : rootUri;

    await saveFile(name, file.content, {
      directoryUri: parentUri,
      fileUri: joinWorkspaceUri(rootUri, file.relativePath),
    });
    written += 1;
  }

  return written;
}
