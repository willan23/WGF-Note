const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const fsPromises = require('node:fs/promises');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { fileURLToPath, pathToFileURL } = require('node:url');

let mainWindow = null;
let apiProcess = null;
let apiBaseUrl = process.env.NOTE_PY_API_BASE_URL || 'http://127.0.0.1:3000';
let frontendServer = null;
let frontendBaseUrl = '';
let projectsDirectoryUri = '';

function getProjectPath(...segments) {
  return path.join(app.getAppPath(), ...segments);
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, '127.0.0.1', () => {
      server.close(() => resolve(true));
    });
    server.on('error', () => resolve(false));
  });
}

async function findAvailablePort(startPort = 3000) {
  for (let port = startPort; port < startPort + 20; port += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(`Nenhuma porta disponível a partir de ${startPort}.`);
}

function waitForApi(baseUrl, retries = 40) {
  return new Promise((resolve, reject) => {
    const tryOnce = (attempt) => {
      const request = http.get(`${baseUrl}/api/health`, (response) => {
        response.resume();
        if (response.statusCode === 200) {
          resolve();
          return;
        }

        if (attempt >= retries) {
          reject(new Error(`API respondeu com status ${response.statusCode}.`));
          return;
        }

        setTimeout(() => tryOnce(attempt + 1), 250);
      });

      request.on('error', () => {
        if (attempt >= retries) {
          reject(new Error('API local não ficou pronta a tempo.'));
          return;
        }

        setTimeout(() => tryOnce(attempt + 1), 250);
      });
    };

    tryOnce(0);
  });
}

async function startLocalApi() {
  const apiPort = await findAvailablePort(Number(process.env.PORT || '3000'));
  apiBaseUrl = `http://127.0.0.1:${apiPort}`;
  process.env.NOTE_PY_API_BASE_URL = apiBaseUrl;

  const serverEntry = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'server-dist', 'index.cjs')
    : getProjectPath('server-dist', 'index.cjs');
  apiProcess = spawn(process.execPath, [serverEntry], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      PORT: String(apiPort),
      NOTE_PY_API_BASE_URL: apiBaseUrl,
      EXPO_WEB_PREVIEW_URL: frontendBaseUrl,
    },
    stdio: 'pipe',
    windowsHide: true,
  });

  apiProcess.stdout?.on('data', (chunk) => process.stdout.write(chunk));
  apiProcess.stderr?.on('data', (chunk) => process.stderr.write(chunk));

  await waitForApi(apiBaseUrl);
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return (
    {
      '.css': 'text/css; charset=utf-8',
      '.html': 'text/html; charset=utf-8',
      '.ico': 'image/x-icon',
      '.js': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.map': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
    }[extension] || 'application/octet-stream'
  );
}

async function startDesktopFrontend() {
  const distRoot = app.isPackaged
    ? path.join(process.resourcesPath, 'dist')
    : getProjectPath('dist');
  const frontendPort = await findAvailablePort(4173);
  frontendBaseUrl = `http://127.0.0.1:${frontendPort}`;

  frontendServer = http.createServer((request, response) => {
    const requestPath = decodeURIComponent(new URL(request.url || '/', frontendBaseUrl).pathname);
    const normalizedPath =
      requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
    const candidatePath = path.resolve(distRoot, normalizedPath);
    const safeCandidate =
      candidatePath === distRoot || candidatePath.startsWith(`${distRoot}${path.sep}`);
    const fallbackPath = path.join(distRoot, 'index.html');
    const filePath =
      safeCandidate && fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()
        ? candidatePath
        : fallbackPath;

    response.writeHead(200, {
      'Content-Type': getContentType(filePath),
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(filePath).pipe(response);
  });

  await new Promise((resolve, reject) => {
    frontendServer.listen(frontendPort, '127.0.0.1', resolve);
    frontendServer.on('error', reject);
  });
}

function toFsPath(uriOrPath) {
  if (typeof uriOrPath !== 'string' || !uriOrPath.trim()) {
    throw new Error('Caminho inválido.');
  }

  return uriOrPath.startsWith('file://') ? fileURLToPath(uriOrPath) : uriOrPath;
}

function toFileUri(filePath, isDirectory = false) {
  const normalizedPath = isDirectory && !filePath.endsWith(path.sep)
    ? `${filePath}${path.sep}`
    : filePath;
  return pathToFileURL(normalizedPath).href;
}

async function ensureProjectsDirectory() {
  const projectsDirectoryPath = path.join(app.getPath('documents'), 'WGF Note', 'projects');
  await fsPromises.mkdir(projectsDirectoryPath, { recursive: true });
  projectsDirectoryUri = toFileUri(projectsDirectoryPath, true);
  process.env.NOTE_PY_PROJECTS_DIR_URI = projectsDirectoryUri;
}

async function getPathInfo(uriOrPath) {
  const filePath = toFsPath(uriOrPath);
  const stat = await fsPromises.stat(filePath);
  return {
    uri: toFileUri(filePath, stat.isDirectory()),
    name: path.basename(filePath),
    size: stat.isDirectory() ? 0 : stat.size,
    modificationTime: stat.mtimeMs,
    isDirectory: stat.isDirectory(),
  };
}

function registerDesktopIpcHandlers() {
  ipcMain.handle('desktop:pick-files', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Abrir ficheiros',
      properties: ['openFile', 'multiSelections'],
    });

    if (result.canceled) {
      return [];
    }

    return Promise.all(result.filePaths.map((filePath) => getPathInfo(filePath)));
  });

  ipcMain.handle('desktop:pick-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Abrir pasta de projeto',
      properties: ['openDirectory', 'createDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return toFileUri(result.filePaths[0], true);
  });

  ipcMain.handle('desktop:read-file', async (_event, uri) =>
    fsPromises.readFile(toFsPath(uri), 'utf8'));

  ipcMain.handle('desktop:write-file', async (_event, payload) => {
    const filePath = toFsPath(payload.uri);
    await fsPromises.mkdir(path.dirname(filePath), { recursive: true });
    await fsPromises.writeFile(filePath, payload.content, 'utf8');
    return toFileUri(filePath);
  });

  ipcMain.handle('desktop:list-directory', async (_event, uri) => {
    const directoryPath = toFsPath(uri);
    const entries = await fsPromises.readdir(directoryPath, { withFileTypes: true });
    const infos = await Promise.all(
      entries.map((entry) => getPathInfo(path.join(directoryPath, entry.name))),
    );

    return infos.sort((left, right) => {
      if (left.isDirectory && !right.isDirectory) return -1;
      if (!left.isDirectory && right.isDirectory) return 1;
      return left.name.localeCompare(right.name);
    });
  });

  ipcMain.handle('desktop:create-directory', async (_event, payload) => {
    const parentPath = toFsPath(payload.parentUri);
    const directoryPath = path.join(parentPath, payload.name);
    await fsPromises.mkdir(directoryPath, { recursive: true });
    return toFileUri(directoryPath, true);
  });

  ipcMain.handle('desktop:delete-path', async (_event, payload) => {
    const filePath = toFsPath(payload.uri);
    if (payload.isDirectory) {
      await fsPromises.rm(filePath, { recursive: true, force: true });
      return;
    }

    await fsPromises.rm(filePath, { force: true });
  });

  ipcMain.handle('desktop:rename-path', async (_event, payload) => {
    const sourcePath = toFsPath(payload.uri);
    const targetPath = path.join(path.dirname(sourcePath), payload.newName);
    await fsPromises.rename(sourcePath, targetPath);
    return toFileUri(targetPath, payload.isDirectory);
  });

  ipcMain.handle('desktop:copy-file', async (_event, payload) => {
    const sourcePath = toFsPath(payload.sourceUri);
    const targetPath = path.join(path.dirname(sourcePath), payload.destName);
    await fsPromises.copyFile(sourcePath, targetPath);
    return toFileUri(targetPath);
  });

  ipcMain.handle('desktop:move-path', async (_event, payload) => {
    const sourcePath = toFsPath(payload.sourceUri);
    const destinationPath = toFsPath(payload.destinationUri);
    await fsPromises.rename(sourcePath, destinationPath);
  });

  ipcMain.handle('desktop:exists', async (_event, uri) => {
    try {
      await fsPromises.access(toFsPath(uri));
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('desktop:stat-path', async (_event, uri) => {
    try {
      return await getPathInfo(uri);
    } catch {
      return null;
    }
  });

  ipcMain.handle('desktop:ollama-list-models', async (_event, baseUrl) => {
    const normalizedBaseUrl = String(baseUrl || '').replace(/\/+$/, '');
    const response = await fetch(`${normalizedBaseUrl}/api/tags`);
    if (!response.ok) {
      throw new Error('Não foi possível contactar o Ollama.');
    }
    return response.json();
  });

  ipcMain.handle('desktop:ollama-chat', async (_event, payload) => {
    const normalizedBaseUrl = String(payload.baseUrl || '').replace(/\/+$/, '');
    const response = await fetch(`${normalizedBaseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload.body),
    });

    if (!response.ok) {
      throw new Error('A IA local não conseguiu responder.');
    }

    return response.json();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'WGF Note',
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#111111',
    webPreferences: {
      preload: getProjectPath('preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(frontendBaseUrl);
}

app.whenReady().then(async () => {
  await ensureProjectsDirectory();
  registerDesktopIpcHandlers();
  await startDesktopFrontend();
  await startLocalApi();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  apiProcess?.kill();
  frontendServer?.close();
});
