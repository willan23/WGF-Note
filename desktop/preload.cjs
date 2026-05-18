const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld(
  '__NOTE_PY_API_BASE_URL__',
  process.env.NOTE_PY_API_BASE_URL || 'http://127.0.0.1:3000',
);

contextBridge.exposeInMainWorld('__NOTE_PY_DESKTOP__', {
  isDesktop: true,
  projectsDirectoryUri: process.env.NOTE_PY_PROJECTS_DIR_URI || '',
  pickFiles: () => ipcRenderer.invoke('desktop:pick-files'),
  pickDirectory: () => ipcRenderer.invoke('desktop:pick-directory'),
  readFile: (uri) => ipcRenderer.invoke('desktop:read-file', uri),
  writeFile: (uri, content) => ipcRenderer.invoke('desktop:write-file', { uri, content }),
  listDirectory: (uri) => ipcRenderer.invoke('desktop:list-directory', uri),
  createDirectory: (parentUri, name) =>
    ipcRenderer.invoke('desktop:create-directory', { parentUri, name }),
  deletePath: (uri, isDirectory) =>
    ipcRenderer.invoke('desktop:delete-path', { uri, isDirectory }),
  renamePath: (uri, newName, isDirectory) =>
    ipcRenderer.invoke('desktop:rename-path', { uri, newName, isDirectory }),
  copyFile: (sourceUri, destName) =>
    ipcRenderer.invoke('desktop:copy-file', { sourceUri, destName }),
  movePath: (sourceUri, destinationUri) =>
    ipcRenderer.invoke('desktop:move-path', { sourceUri, destinationUri }),
  exists: (uri) => ipcRenderer.invoke('desktop:exists', uri),
  statPath: (uri) => ipcRenderer.invoke('desktop:stat-path', uri),
  listOllamaModels: (baseUrl) => ipcRenderer.invoke('desktop:ollama-list-models', baseUrl),
  ollamaChat: (baseUrl, body) => ipcRenderer.invoke('desktop:ollama-chat', { baseUrl, body }),
});
