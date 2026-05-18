const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld(
  '__NOTE_PY_API_BASE_URL__',
  process.env.NOTE_PY_API_BASE_URL || 'http://127.0.0.1:3000',
);
