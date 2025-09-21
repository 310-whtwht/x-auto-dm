const { contextBridge, ipcRenderer } = require("electron");

// レンダラープロセスで使用する機能を公開
contextBridge.exposeInMainWorld("electron", {
  // IPC通信
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
    return () => ipcRenderer.removeListener(channel, func);
  },

  // プラットフォーム情報
  platform: process.platform,

  // 設定関連
  getSettings: () => ipcRenderer.invoke("get-settings"),
  setSettings: (settings) => ipcRenderer.invoke("set-settings", settings),

  // フォロワー取得
  scrapeFollowers: (targetUsername, customUrl = null) =>
    ipcRenderer.invoke("scrape-followers", targetUsername, customUrl),

  // DM送信
  sendDM: (user, message, settings) =>
    ipcRenderer.invoke("send-dm", { user, message, settings }),
});
