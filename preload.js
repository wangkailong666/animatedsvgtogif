// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  showSaveDialog: (defaultName) =>
    ipcRenderer.invoke('show-save-dialog', defaultName),

  convert: (payload) =>
    ipcRenderer.invoke('convert-svg-to-anim', payload),

  onProgress: (cb) =>
    ipcRenderer.on('progress', (_event, data) => cb(data))
});
