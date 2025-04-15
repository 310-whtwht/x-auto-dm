const { app, BrowserWindow } = require("electron");
const path = require("path");
const isDev = process.env.NODE_ENV === "development";

// GPUアクセラレーションを無効化
app.disableHardwareAcceleration();

// 開発者ツールの警告を無視
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = true;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    // ウィンドウオプションを追加
    show: false,
    backgroundColor: "#ffffff",
  });

  // ウィンドウの読み込みが完了したら表示
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  if (isDev) {
    // 開発環境ではNext.jsの開発サーバーに接続
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    // 本番環境では相対パスを使用
    mainWindow.loadFile(path.join(__dirname, "../out/index.html"));
  }

  // エラーハンドリング
  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription) => {
      console.error("Page failed to load:", errorCode, errorDescription);
      if (isDev) {
        console.log("Retrying connection to dev server...");
        setTimeout(() => {
          mainWindow.loadURL("http://localhost:3000");
        }, 1000);
      }
    }
  );
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
