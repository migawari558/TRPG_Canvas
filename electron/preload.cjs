const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('canvas', {
  info: () => ipcRenderer.invoke('workspace:info'),
  chooseFolder: () => ipcRenderer.invoke('workspace:choose'),
  list: () => ipcRenderer.invoke('document:list'),
  load: id => ipcRenderer.invoke('document:load', id),
  remove: (id, revision) => ipcRenderer.invoke('document:remove', id, revision),
  save: (doc, revision) => ipcRenderer.invoke('document:save', doc, revision),
  importMarkdown: () => ipcRenderer.invoke('document:import'),
  export: (format, title, content) => ipcRenderer.invoke('document:export', format, title, content),
  previewPdf: content => ipcRenderer.invoke('document:preview-pdf', content),
  onClose: callback => { const listener = () => callback(); ipcRenderer.on('app:closing', listener); return () => ipcRenderer.removeListener('app:closing', listener); },
  finishClose: () => ipcRenderer.send('app:close-ready')
});
