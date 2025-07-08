const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  getVersion: () => ipcRenderer.invoke('get-version'),
  openFile: () => ipcRenderer.invoke('open-file'),
  saveFile: (content) => ipcRenderer.invoke('save-file', content),
  showMessage: (message) => ipcRenderer.send('show-message', message),
  onMessage: (callback) => ipcRenderer.on('message', callback),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

if (typeof window !== 'undefined') {
  window.electronAPI = window.electronAPI || {
    minimizeWindow: () => console.log('Minimize window'),
    maximizeWindow: () => console.log('Maximize window'),
    closeWindow: () => console.log('Close window'),
    getVersion: () => Promise.resolve('1.0.0'),
    openFile: () => Promise.resolve(''),
    saveFile: (content) => Promise.resolve(true),
    showMessage: (message) => console.log('Message:', message),
    onMessage: (callback) => {},
    removeAllListeners: (channel) => {}
  };
} 