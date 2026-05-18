const { app, BrowserWindow } = require('electron');
const { spawn } = require('node:child_process');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let mainWindow = null;
let apiProcess = null;
let apiBaseUrl = process.env.NOTE_PY_API_BASE_URL || 'http://127.0.0.1:3000';

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
  const desktopFrontendUrl = pathToFileURL(getProjectPath('dist', 'index.html')).toString();
  apiProcess = spawn(process.execPath, [serverEntry], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      PORT: String(apiPort),
      NOTE_PY_API_BASE_URL: apiBaseUrl,
      EXPO_WEB_PREVIEW_URL: desktopFrontendUrl,
    },
    stdio: 'pipe',
    windowsHide: true,
  });

  apiProcess.stdout?.on('data', (chunk) => process.stdout.write(chunk));
  apiProcess.stderr?.on('data', (chunk) => process.stderr.write(chunk));

  await waitForApi(apiBaseUrl);
}

function createWindow() {
  mainWindow = new BrowserWindow({
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

  mainWindow.loadFile(getProjectPath('dist', 'index.html'));
}

app.whenReady().then(async () => {
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
});
