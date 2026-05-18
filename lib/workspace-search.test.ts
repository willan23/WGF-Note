import { describe, expect, it } from 'vitest';
import {
  getWorkspaceRelativePath,
  getWorkspaceReplacementChangeId,
  isSearchableWorkspaceFile,
  listWorkspaceFiles,
  planWorkspaceReplacement,
  searchWorkspace,
  selectWorkspaceReplacementChanges,
  summarizeWorkspaceReplacementPlan,
} from './workspace-search';
import type { FileInfo } from './file-system-manager';

const file = (uri: string, name: string): FileInfo => ({
  uri,
  name,
  size: 1,
  modificationTime: 0,
  isDirectory: false,
});

const folder = (uri: string, name: string): FileInfo => ({
  uri,
  name,
  size: 0,
  modificationTime: 0,
  isDirectory: true,
});

describe('workspace-search', () => {
  it('pesquisa recursivamente apenas ficheiros suportados', async () => {
    const tree: Record<string, FileInfo[]> = {
      'file:///projects': [
        folder('file:///projects/app', 'app'),
        file('file:///projects/logo.png', 'logo.png'),
      ],
      'file:///projects/app': [
        file('file:///projects/app/main.py', 'main.py'),
        file('file:///projects/app/site.html', 'site.html'),
      ],
    };
    const contents: Record<string, string> = {
      'file:///projects/app/main.py': 'print("hello")\nprint("world")',
      'file:///projects/app/site.html': '<h1>Hello</h1>',
      'file:///projects/logo.png': 'hello',
    };

    const results = await searchWorkspace(
      'file:///projects',
      'hello',
      { caseSensitive: false, wholeWord: false },
      {
        listFiles: async (directoryUri) => tree[directoryUri] ?? [],
        readFile: async (path) => contents[path],
      },
    );

    expect(results).toEqual([
      {
        path: 'file:///projects/app/main.py',
        name: 'main.py',
        relativePath: 'app/main.py',
        start: 7,
        end: 12,
        line: 0,
        column: 7,
        preview: 'print("hello")',
      },
      {
        path: 'file:///projects/app/site.html',
        name: 'site.html',
        relativePath: 'app/site.html',
        start: 4,
        end: 9,
        line: 0,
        column: 4,
        preview: '<h1>Hello</h1>',
      },
    ]);
  });

  it('respeita limites, caminhos relativos e extensões suportadas', async () => {
    expect(getWorkspaceRelativePath('file:///projects/', 'file:///projects/app/main.py')).toBe(
      'app/main.py',
    );
    expect(isSearchableWorkspaceFile(file('file:///projects/main.css', 'main.css'))).toBe(true);
    expect(isSearchableWorkspaceFile(file('file:///projects/readme.md', 'readme.md'))).toBe(true);
    expect(isSearchableWorkspaceFile(file('file:///projects/app.ts', 'app.ts'))).toBe(true);
    expect(isSearchableWorkspaceFile(file('file:///projects/logo.png', 'logo.png'))).toBe(false);

    const results = await searchWorkspace(
      'file:///projects',
      'x',
      { caseSensitive: true, wholeWord: false, maxResults: 1 },
      {
        listFiles: async () => [file('file:///projects/main.css', 'main.css')],
        readFile: async () => 'x x x',
      },
    );

    expect(results).toHaveLength(1);
  });

  it('lista ficheiros pesquisáveis para quick open', async () => {
    const tree: Record<string, FileInfo[]> = {
      'file:///projects': [
        folder('file:///projects/app', 'app'),
        file('file:///projects/logo.png', 'logo.png'),
      ],
      'file:///projects/app': [
        file('file:///projects/app/main.py', 'main.py'),
        file('file:///projects/app/readme.md', 'readme.md'),
      ],
    };

    await expect(
      listWorkspaceFiles('file:///projects', {
        listFiles: async (directoryUri) => tree[directoryUri] ?? [],
      }),
    ).resolves.toEqual([
      {
        path: 'file:///projects/app/main.py',
        name: 'main.py',
        relativePath: 'app/main.py',
      },
      {
        path: 'file:///projects/app/readme.md',
        name: 'readme.md',
        relativePath: 'app/readme.md',
      },
    ]);
  });

  it('planeia substituições por ficheiro sem tocar em no-ops', async () => {
    const tree: Record<string, FileInfo[]> = {
      'file:///projects': [
        file('file:///projects/main.py', 'main.py'),
        file('file:///projects/site.html', 'site.html'),
      ],
    };
    const contents: Record<string, string> = {
      'file:///projects/main.py': 'foo foo',
      'file:///projects/site.html': '<p>foo</p>',
    };

    const plan = await planWorkspaceReplacement(
      'file:///projects',
      'foo',
      'bar',
      { caseSensitive: false, wholeWord: false },
      {
        listFiles: async (directoryUri) => tree[directoryUri] ?? [],
        readFile: async (path) => contents[path],
      },
    );

    expect(plan).toEqual([
      {
        path: 'file:///projects/main.py',
        name: 'main.py',
        relativePath: 'main.py',
        matchCount: 2,
        nextContent: 'bar bar',
        originalContent: 'foo foo',
        replacement: 'bar',
        changes: [
          {
            id: 'file:///projects/main.py::line:0',
            line: 0,
            before: 'foo foo',
            after: 'bar bar',
            matchCount: 2,
            matches: [
              { start: 0, end: 3 },
              { start: 4, end: 7 },
            ],
          },
        ],
      },
      {
        path: 'file:///projects/site.html',
        name: 'site.html',
        relativePath: 'site.html',
        matchCount: 1,
        nextContent: '<p>bar</p>',
        originalContent: '<p>foo</p>',
        replacement: 'bar',
        changes: [
          {
            id: 'file:///projects/site.html::line:0',
            line: 0,
            before: '<p>foo</p>',
            after: '<p>bar</p>',
            matchCount: 1,
            matches: [{ start: 3, end: 6 }],
          },
        ],
      },
    ]);
    expect(summarizeWorkspaceReplacementPlan(plan)).toEqual({
      fileCount: 2,
      changeCount: 2,
      replacementCount: 3,
    });

    const noopPlan = await planWorkspaceReplacement(
      'file:///projects',
      'foo',
      'foo',
      { caseSensitive: false, wholeWord: false },
      {
        listFiles: async (directoryUri) => tree[directoryUri] ?? [],
        readFile: async (path) => contents[path],
      },
    );

    expect(noopPlan).toEqual([]);
  });

  it('seleciona apenas linhas escolhidas de um plano de substituição', async () => {
    const tree: Record<string, FileInfo[]> = {
      'file:///projects': [file('file:///projects/main.py', 'main.py')],
    };
    const contents: Record<string, string> = {
      'file:///projects/main.py': 'foo\nfoo foo',
    };
    const plan = await planWorkspaceReplacement(
      'file:///projects',
      'foo',
      'bar',
      { caseSensitive: false, wholeWord: false },
      {
        listFiles: async (directoryUri) => tree[directoryUri] ?? [],
        readFile: async (path) => contents[path],
      },
    );

    const selectedPlan = selectWorkspaceReplacementChanges(plan, [
      getWorkspaceReplacementChangeId('file:///projects/main.py', 1),
    ]);

    expect(selectedPlan).toEqual([
      {
        ...plan[0],
        matchCount: 2,
        nextContent: 'foo\nbar bar',
        changes: [plan[0].changes[1]],
      },
    ]);
    expect(summarizeWorkspaceReplacementPlan(selectedPlan)).toEqual({
      fileCount: 1,
      changeCount: 1,
      replacementCount: 2,
    });
  });

  it('gera ids estáveis para mudanças por linha', () => {
    expect(getWorkspaceReplacementChangeId('file:///projects/main.py', 2)).toBe(
      'file:///projects/main.py::line:2',
    );
  });

  it('não seleciona ficheiros sem linhas escolhidas', () => {
    const plan = [
      {
        path: 'file:///projects/main.py',
        name: 'main.py',
        relativePath: 'main.py',
        matchCount: 2,
        nextContent: 'bar bar',
        originalContent: 'foo foo',
        replacement: 'bar',
        changes: [
          {
            id: 'file:///projects/main.py::line:0',
            line: 0,
            before: 'foo foo',
            after: 'bar bar',
            matchCount: 2,
            matches: [
              { start: 0, end: 3 },
              { start: 4, end: 7 },
            ],
          },
        ],
      },
      {
        path: 'file:///projects/site.html',
        name: 'site.html',
        relativePath: 'site.html',
        matchCount: 1,
        nextContent: '<p>bar</p>',
        originalContent: '<p>foo</p>',
        replacement: 'bar',
        changes: [
          {
            id: 'file:///projects/site.html::line:0',
            line: 0,
            before: '<p>foo</p>',
            after: '<p>bar</p>',
            matchCount: 1,
            matches: [{ start: 3, end: 6 }],
          },
        ],
      },
    ];

    expect(
      selectWorkspaceReplacementChanges(plan, ['file:///projects/site.html::line:0']),
    ).toEqual([plan[1]]);
  });
});
