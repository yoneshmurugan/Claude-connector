// preload.js — Shell Preload Script
// Exposes IPC bridge for session configuration, script loading, and external URLs.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Configure anti-detection headers for a session partition
  configureSession: (partitionName) => ipcRenderer.invoke('configure-session', partitionName),

  // Get scraper/paster scripts to inject into webviews
  getScraperScript: () => ipcRenderer.invoke('get-scraper-script'),
  getPasterScript: () => ipcRenderer.invoke('get-paster-script'),

  // Open URL in system browser (Google OAuth redirect)
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Vault Management
  listVaultFiles: () => ipcRenderer.invoke('vault:list'),
  saveVaultFile: (filename, content) => ipcRenderer.invoke('vault:save', filename, content),
  readVaultFile: (filename) => ipcRenderer.invoke('vault:read', filename),
  deleteVaultFile: (filename) => ipcRenderer.invoke('vault:delete', filename),
  startVaultDrag: (filename) => ipcRenderer.send('vault:drag', filename),
  onVaultAutoSaved: (callback) => ipcRenderer.on('vault:auto-saved', (_event, filename) => callback(filename))
});
