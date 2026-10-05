const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('canvas', {
  info: () => ipcRenderer.invoke('workspace:info'),
  chooseFolder: () => ipcRenderer.invoke('workspace:choose'),
  list: () => ipcRenderer.invoke('document:list'),
  load: id => ipcRenderer.invoke('document:load', id),
  remove: (id, revision) => ipcRenderer.invoke('document:remove', id, revision),
  save: (doc, revision) => ipcRenderer.invoke('document:save', doc, revision),
  importMarkdown: () => ipcRenderer.invoke('document:import'),
  export: (format, title, content, pageSize) => ipcRenderer.invoke('document:export', format, title, content, pageSize),
  previewPdf: (content, pageSize) => ipcRenderer.invoke('document:preview-pdf', content, pageSize),
  updateInfo: () => ipcRenderer.invoke('app:update-info'),
  checkForUpdate: () => ipcRenderer.invoke('app:update-check'),
  downloadUpdate: () => ipcRenderer.invoke('app:update-download'),
  openUpdate: () => ipcRenderer.invoke('app:update-open'),
  openUpdateRelease: () => ipcRenderer.invoke('app:update-open-release'),
  onUpdateProgress: callback => { const listener = (_event, value) => callback(value); ipcRenderer.on('app:update-progress', listener); return () => ipcRenderer.removeListener('app:update-progress', listener); },
  onClose: callback => { const listener = () => callback(); ipcRenderer.on('app:closing', listener); return () => ipcRenderer.removeListener('app:closing', listener); },
  finishClose: () => ipcRenderer.send('app:close-ready')
});
