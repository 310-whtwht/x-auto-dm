const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const isDev = process.env.NODE_ENV === "development";
const FollowerScraper = require("../src/lib/scraper");
const DMSender = require("../src/lib/dmSender");
const Settings = require("../src/lib/settings");

// GPUアクセラレーションを無効化
app.disableHardwareAcceleration();

// 開発者ツールの警告を無視
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = true;

async function createWindow() {
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

  // 即時にウィンドウを表示（ready-to-show 依存を除去）
  mainWindow.show();

  if (isDev) {
    // 開発環境ではNext.jsの開発サーバーに接続
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    // 本番環境ではNext.js standalone サーバーを起動して接続
    const PORT = process.env.PORT || "3210";
    const appRoot = path.join(__dirname, "..");
    const serverDir = path.join(appRoot, ".next", "standalone");
    const serverPath = path.join(serverDir, "server.js");

    try {
      process.env.NODE_ENV = "production";
      process.env.PORT = PORT;
      // Next のスタンドアロンサーバは `.next/standalone` をCWDとして想定
      process.chdir(serverDir);
      // server.js を読み込むとHTTPサーバーが起動する（standalone 出力）
      // 同一プロセスで起動するため追加プロセスは不要
      // eslint-disable-next-line import/no-dynamic-require, global-require
      console.log("[Main] Starting Next standalone server:", serverPath);
      require(serverPath);
      console.log(
        "[Main] Next server required. Waiting for readiness on",
        PORT
      );
      // サーバーの起動を待ってから読み込み
      await new Promise((resolve, reject) => {
        const start = Date.now();
        const timeoutMs = 20000;
        const intervalMs = 250;
        const url = `http://127.0.0.1:${PORT}/`;
        const attempt = () => {
          const req = http.get(url, (res) => {
            if (res.statusCode >= 200 && res.statusCode < 400) {
              res.resume();
              resolve();
            } else if (Date.now() - start > timeoutMs) {
              res.resume();
              reject(new Error(`Server not ready. Status: ${res.statusCode}`));
            } else {
              res.resume();
              setTimeout(attempt, intervalMs);
            }
          });
          req.on("error", () => {
            if (Date.now() - start > timeoutMs) {
              reject(new Error("Server did not start in time"));
            } else {
              setTimeout(attempt, intervalMs);
            }
          });
        };
        attempt();
      });
      mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
      console.log("[Main] Loaded renderer URL:", `http://127.0.0.1:${PORT}`);
    } catch (e) {
      console.error("[Main] Failed to start Next standalone server:", e);
      mainWindow.webContents.openDevTools();
      // フォールバック: 静的エクスポートが同梱されている場合のみ読み込む
      try {
        const fallbackPath = path.join(appRoot, "out", "index.html");
        if (fs.existsSync(fallbackPath)) {
          console.warn("[Main] Falling back to out/index.html:", fallbackPath);
          mainWindow.loadFile(fallbackPath);
        } else {
          console.error(
            "[Main] Fallback out/index.html not found at:",
            fallbackPath
          );
        }
      } catch (e2) {
        console.error("[Main] Failed to load fallback out/index.html:", e2);
      }
    }
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
      } else {
        // 本番で読み込み失敗時はDevToolsを表示して原因調査
        mainWindow.webContents.openDevTools();
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

// IPCハンドラーを追加
let settings = new Settings();

// 設定関連のIPCハンドラー
ipcMain.handle("get-settings", async () => {
  return settings.getAll();
});

ipcMain.handle("set-settings", async (event, newSettings) => {
  return settings.update(newSettings);
});

// フォロワー取得のIPCハンドラー
ipcMain.handle(
  "scrape-followers",
  async (event, targetUsername, customUrl = null) => {
    const scraper = new FollowerScraper({
      debugPort: settings.get("debugPort"),
    });

    try {
      await scraper.launch();
      const followers = await scraper.scrapeFollowers(
        targetUsername,
        customUrl
      );
      const csvPath = await scraper.saveToCSV(followers);
      await scraper.close();

      return {
        success: true,
        followers,
        csvPath,
        count: followers.length,
      };
    } catch (error) {
      await scraper.close();
      return {
        success: false,
        error: error.message,
      };
    }
  }
);

// DM送信のIPCハンドラー
ipcMain.handle(
  "send-dm",
  async (event, { user, message, settings: dmSettings }) => {
    // Pythonコードと同じ：各DM送信で新しいインスタンスを作成
    const sender = new DMSender({
      debugPort: settings.get("debugPort"),
    });

    try {
      const result = await sender.sendDM(user, message, dmSettings);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: "error",
      };
    }
    // 注意：sender.close()は不要（sendDM内のfinallyブロックで自動的に処理される）
  }
);
