const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const fsPromises = require('node:fs/promises');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { fileURLToPath, pathToFileURL } = require('node:url');

let mainWindow = null;
const windows = new Set();
let apiProcess = null;
let apiBaseUrl = process.env.NOTE_PY_API_BASE_URL || 'http://127.0.0.1:3000';
let frontendServer = null;
let frontendBaseUrl = '';
let projectsDirectoryUri = '';
let hermesStartPromise = null;

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

function normalizeOpenAICompatibleBaseUrl(baseUrl) {
  const normalizedBaseUrl = String(baseUrl || '').trim().replace(/\/+$/, '');
  return normalizedBaseUrl.endsWith('/v1')
    ? normalizedBaseUrl
    : `${normalizedBaseUrl}/v1`;
}

function normalizeHermesBaseUrl(baseUrl) {
  const normalizedBaseUrl = String(baseUrl || '').trim().replace(/\/+$/, '');
  return normalizedBaseUrl.endsWith('/v1')
    ? normalizedBaseUrl.slice(0, -3)
    : normalizedBaseUrl;
}

function createAIAuthHeaders(apiKey) {
  const trimmedApiKey = String(apiKey || '').trim();
  return trimmedApiKey ? { Authorization: `Bearer ${trimmedApiKey}` } : {};
}

function quoteForBash(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function windowsPathToWslPath(windowsPath) {
  const resolvedPath = path.resolve(windowsPath);
  const match = /^([a-zA-Z]):[\\/](.*)$/.exec(resolvedPath);
  if (!match) return resolvedPath.replace(/\\/g, '/');

  return `/mnt/${match[1].toLowerCase()}/${match[2].replace(/\\/g, '/')}`;
}

function getHermesRootCandidates() {
  return [
    process.env.WGF_NOTE_HERMES_ROOT,
    process.env.HERMES_AGENT_ROOT,
    'W:\\hermes-agent-main',
    path.resolve(app.getAppPath(), '..', '..', 'hermes-agent-main'),
    path.resolve(app.getPath('documents'), 'hermes-agent-main'),
  ].filter(Boolean);
}

async function findHermesRoot() {
  for (const candidate of getHermesRootCandidates()) {
    try {
      await fsPromises.access(path.join(candidate, 'omega'));
      await fsPromises.access(path.join(candidate, '.venv-wsl', 'bin', 'python'));
      return candidate;
    } catch {
      // Try the next known local install location.
    }
  }

  throw new Error(
    'Não encontrei o Hermes em W:\\hermes-agent-main. Defina WGF_NOTE_HERMES_ROOT com o caminho do hermes-agent-main.',
  );
}

function getPortFromBaseUrl(baseUrl) {
  try {
    const parsed = new URL(normalizeHermesBaseUrl(baseUrl || 'http://127.0.0.1:8642'));
    const parsedPort = Number(parsed.port || '8642');
    return Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort < 65536
      ? parsedPort
      : 8642;
  } catch {
    return 8642;
  }
}

function createTimeoutSignal(timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 2500) {
  const timeout = createTimeoutSignal(timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: timeout.signal,
    });
    return response;
  } finally {
    timeout.clear();
  }
}

async function readHermesHealth(baseUrl, apiKey) {
  const normalizedBaseUrl = normalizeHermesBaseUrl(baseUrl || 'http://127.0.0.1:8642');
  const headers = createAIAuthHeaders(apiKey);

  const detailedResponse = await fetchJsonWithTimeout(
    `${normalizedBaseUrl}/health/detailed`,
    { headers },
  );

  if (detailedResponse.ok) {
    return detailedResponse.json();
  }

  const response = await fetchJsonWithTimeout(`${normalizedBaseUrl}/health`, { headers });
  if (!response.ok) {
    throw new Error('Não foi possível contactar o health check do Hermes/Omega.');
  }

  return response.json();
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const { timeoutMs = 15000, ...spawnOptions } = options;
    const child = spawn(command, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...spawnOptions,
    });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`${command} não respondeu a tempo.`));
    }, timeoutMs);

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(stderr.trim() || stdout.trim() || `${command} terminou com código ${code}.`));
    });
  });
}

async function waitForHermesApi(baseUrl, apiKey, attempts = 30) {
  let lastError = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await readHermesHealth(baseUrl, apiKey);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw lastError ?? new Error('Hermes/Omega não ficou pronto a tempo.');
}

async function startHermesGatewayFromWsl(payload = {}) {
  const baseUrl = normalizeHermesBaseUrl(payload.baseUrl || 'http://127.0.0.1:8642');
  const apiKey = payload.apiKey || '';
  const port = getPortFromBaseUrl(baseUrl);

  try {
    const health = await readHermesHealth(baseUrl, apiKey);
    return {
      status: 'running',
      message: 'Hermes/Omega já está ativo.',
      baseUrl,
      health,
    };
  } catch {
    // Not running yet; continue with a local WSL start attempt.
  }

  if (process.platform !== 'win32') {
    throw new Error('Arranque automático do Hermes está disponível nesta versão apenas no Windows com WSL2.');
  }

  const hermesRoot = await findHermesRoot();
  const wslHermesRoot = windowsPathToWslPath(hermesRoot);
  const wslDistro = process.env.WGF_NOTE_WSL_DISTRO || 'Ubuntu';
  const modelName = payload.model || 'omega-supreme';
  const command = [
    `cd ${quoteForBash(wslHermesRoot)}`,
    'mkdir -p ~/.hermes/logs',
    [
      'API_SERVER_ENABLED=true',
      `API_SERVER_PORT=${port}`,
      'API_SERVER_HOST=127.0.0.1',
      `API_SERVER_MODEL_NAME=${quoteForBash(modelName)}`,
      'nohup .venv-wsl/bin/python ./omega gateway run --replace -v',
      '> ~/.hermes/logs/wgf-api-server.log 2>&1 < /dev/null &',
      'sleep 3',
    ].join(' '),
  ].join(' && ');

  await runProcess('wsl.exe', ['-d', wslDistro, '--', 'bash', '-lc', command], {
    timeoutMs: 15000,
  });

  const health = await waitForHermesApi(baseUrl, apiKey);
  return {
    status: 'started',
    message: 'Hermes/Omega iniciado em WSL2 e API pronta.',
    baseUrl,
    hermesRoot,
    wslDistro,
    health,
  };
}

function createAISessionHeaders(sessionId, apiKey) {
  const trimmedSessionId = String(sessionId || '').trim();
  const trimmedApiKey = String(apiKey || '').trim();

  return trimmedSessionId && trimmedApiKey
    ? { 'X-Omega-Session-Id': trimmedSessionId }
    : {};
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
  const getRequestWindow = (event) =>
    BrowserWindow.fromWebContents(event.sender) ??
    BrowserWindow.getFocusedWindow() ??
    mainWindow;

  ipcMain.handle('desktop:pick-files', async (event) => {
    const result = await dialog.showOpenDialog(getRequestWindow(event), {
      title: 'Abrir ficheiros',
      properties: ['openFile', 'multiSelections'],
    });

    if (result.canceled) {
      return [];
    }

    return Promise.all(result.filePaths.map((filePath) => getPathInfo(filePath)));
  });

  ipcMain.handle('desktop:pick-directory', async (event) => {
    const result = await dialog.showOpenDialog(getRequestWindow(event), {
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

  ipcMain.handle('desktop:new-window', async () => {
    createWindow();
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

  ipcMain.handle('desktop:openai-compatible-list-models', async (_event, payload) => {
    const normalizedBaseUrl = normalizeOpenAICompatibleBaseUrl(payload.baseUrl);
    const response = await fetch(`${normalizedBaseUrl}/models`, {
      headers: createAIAuthHeaders(payload.apiKey),
    });
    if (!response.ok) {
      throw new Error('Não foi possível contactar a API compatível.');
    }
    return response.json();
  });

  ipcMain.handle('desktop:openai-compatible-chat', async (_event, payload) => {
    const normalizedBaseUrl = normalizeOpenAICompatibleBaseUrl(payload.baseUrl);
    const response = await fetch(`${normalizedBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...createAIAuthHeaders(payload.apiKey),
        ...createAISessionHeaders(payload.sessionId, payload.apiKey),
      },
      body: JSON.stringify(payload.body),
    });

    if (!response.ok) {
      throw new Error('A API compatível não conseguiu responder.');
    }

    return response.json();
  });

  ipcMain.handle('desktop:hermes-health', async (_event, payload) => {
    return readHermesHealth(payload.baseUrl, payload.apiKey);
  });

  ipcMain.handle('desktop:hermes-start', async (_event, payload) => {
    if (hermesStartPromise) {
      return hermesStartPromise;
    }

    hermesStartPromise = startHermesGatewayFromWsl(payload).finally(() => {
      hermesStartPromise = null;
    });

    return hermesStartPromise;
  });
}

function createWindow() {
  const window = new BrowserWindow({
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

  windows.add(window);
  if (!mainWindow) {
    mainWindow = window;
  }

  window.on('closed', () => {
    windows.delete(window);
    if (mainWindow === window) {
      mainWindow = [...windows][0] ?? null;
    }
  });

  window.loadURL(frontendBaseUrl);
  return window;
}

app.whenReady().then(async () => {
  await ensureProjectsDirectory();
  registerDesktopIpcHandlers();
  await startDesktopFrontend();
  await startLocalApi();
  createWindow();

  app.on('activate', () => {
    if (windows.size === 0) {
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
