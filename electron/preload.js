const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const os = require('os');

// レンダラープロセスで使用する機能を公開
contextBridge.exposeInMainWorld('electron', {
  // ファイルシステム関連
  getDesktopPath: () => path.join(os.homedir(), 'Desktop'),
  
  // IPC通信
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
    return () => ipcRenderer.removeListener(channel, func);
  },

  // プラットフォーム情報
  platform: process.platform
});