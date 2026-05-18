import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '..');
const desktopAppDir = path.join(repoRoot, 'desktop-app');
const desktopSourceDir = path.join(repoRoot, 'desktop');
const distDir = path.join(repoRoot, 'dist');
const serverDistDir = path.join(repoRoot, 'server-dist');
const rootPackagePath = path.join(repoRoot, 'package.json');

const rootPackage = JSON.parse(await readFile(rootPackagePath, 'utf8'));

await rm(desktopAppDir, { recursive: true, force: true });
await mkdir(desktopAppDir, { recursive: true });

await Promise.all([
  cp(path.join(desktopSourceDir, 'main.cjs'), path.join(desktopAppDir, 'main.cjs')),
  cp(path.join(desktopSourceDir, 'preload.cjs'), path.join(desktopAppDir, 'preload.cjs')),
  cp(distDir, path.join(desktopAppDir, 'dist'), { recursive: true }),
  cp(serverDistDir, path.join(desktopAppDir, 'server-dist'), { recursive: true }),
]);

await writeFile(
  path.join(desktopAppDir, 'package.json'),
  JSON.stringify(
    {
      name: rootPackage.name,
      version: rootPackage.version,
      description: 'Editor local-first de código para Android e desktop.',
      author: 'WGF Note',
      main: 'main.cjs',
      private: true,
    },
    null,
    2,
  ),
);
