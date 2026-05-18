import { describe, expect, it } from 'vitest';
import {
  flattenProjectTree,
  getWorkspaceAncestorDirectoryUris,
  isWorkspacePathAffected,
  isPathInsideWorkspace,
  replaceWorkspacePathPrefix,
} from './workspace-tree';
import type { FileInfo } from './file-system-manager';

const folder = (uri: string, name: string): FileInfo => ({
  uri,
  name,
  size: 0,
  modificationTime: 0,
  isDirectory: true,
});

const file = (uri: string, name: string): FileInfo => ({
  uri,
  name,
  size: 1,
  modificationTime: 0,
  isDirectory: false,
});

describe('workspace-tree', () => {
  it('reconhece caminhos dentro do workspace', () => {
    expect(isPathInsideWorkspace('file:///projects', 'file:///projects/app/main.py')).toBe(true);
    expect(isPathInsideWorkspace('file:///projects', 'file:///outros/app.py')).toBe(false);
  });

  it('calcula os ancestrais de um ficheiro', () => {
    expect(
      getWorkspaceAncestorDirectoryUris('file:///projects', 'file:///projects/app/src/main.py'),
    ).toEqual(['file:///projects', 'file:///projects/app', 'file:///projects/app/src']);
  });

  it('achata apenas as pastas expandidas', () => {
    const rows = flattenProjectTree(
      'file:///projects',
      {
        'file:///projects': [folder('file:///projects/app', 'app'), file('file:///projects/readme.md', 'readme.md')],
        'file:///projects/app': [file('file:///projects/app/main.py', 'main.py')],
      },
      new Set(['file:///projects/app']),
    );

    expect(rows.map((row) => `${row.depth}:${row.name}`)).toEqual([
      '0:app',
      '1:main.py',
      '0:readme.md',
    ]);
  });

  it('reescreve caminhos e reconhece descendentes afetados', () => {
    expect(
      replaceWorkspacePathPrefix(
        'file:///projects/app/src/main.py',
        'file:///projects/app',
        'file:///projects/mobile',
      ),
    ).toBe('file:///projects/mobile/src/main.py');
    expect(
      isWorkspacePathAffected(
        'file:///projects/app/src/main.py',
        'file:///projects/app',
        true,
      ),
    ).toBe(true);
  });
});
