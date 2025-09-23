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
      webSecurity: false, // file://プロトコルでのリソース読み込みを許可
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
    // 本番環境では静的ファイルを配信
    // Electron-builderでは、アプリは Contents/Resources/app/ に配置される
    const appRoot = process.resourcesPath || path.join(__dirname, "..");
    const staticPath = path.join(appRoot, "app", "out", "index.html");

    // デバッグ情報を出力（開発時のみ）
    console.log("[Main] Loading static files from:", staticPath);

    try {
      if (fs.existsSync(staticPath)) {
        // file://プロトコルで絶対パスを使用して静的ファイルを読み込み
        const fileUrl = `file://${staticPath}`;
        console.log("[Main] Loading URL:", fileUrl);
        mainWindow.loadURL(fileUrl);
        console.log("[Main] Loaded static file successfully");
      } else {
        console.error("[Main] Static file not found at:", staticPath);
        console.error("[Main] Trying alternative paths...");

        // 代替パスを試す
        const altPaths = [
          path.join(appRoot, "app", "out", "index.html"),
          path.join(appRoot, "out", "index.html"),
          path.join(__dirname, "..", "app", "out", "index.html"),
          path.join(__dirname, "out", "index.html"),
          path.join(process.resourcesPath, "app", "out", "index.html"),
          path.join(process.resourcesPath, "out", "index.html"),
        ];

        for (const altPath of altPaths) {
          console.log("[Main] Trying path:", altPath);
          if (fs.existsSync(altPath)) {
            console.log("[Main] Found alternative path:", altPath);
            const fileUrl = `file://${altPath}`;
            mainWindow.loadURL(fileUrl);
            return;
          }
        }

        console.error(
          "[Main] No valid static file found - opening DevTools for debugging"
        );
        mainWindow.webContents.openDevTools();
      }
    } catch (e) {
      console.error("[Main] Failed to load static file:", e);
      mainWindow.webContents.openDevTools();
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

// Chrome起動のIPCハンドラー
ipcMain.handle("launch-chrome", async () => {
  try {
    const { exec } = require("child_process");
    const path = require("path");
    const fs = require("fs");

    const port = 9222;

    // 既存のChromeプロセスを終了
    console.log("既存のChromeプロセスを終了中...");
    try {
      await new Promise((resolve, reject) => {
        exec("pkill -f chrome", (error) => {
          if (error && !error.message.includes("No matching processes")) {
            console.log("Chromeプロセス終了:", error.message);
          }
          resolve();
        });
      });
    } catch (error) {
      console.log("Chromeプロセス終了エラー:", error.message);
    }

    // ChromeDriverプロセスも終了
    try {
      await new Promise((resolve, reject) => {
        exec("pkill -f chromedriver", (error) => {
          if (error && !error.message.includes("No matching processes")) {
            console.log("ChromeDriverプロセス終了:", error.message);
          }
          resolve();
        });
      });
    } catch (error) {
      console.log("ChromeDriverプロセス終了エラー:", error.message);
    }

    // 少し待機してからポートをチェック
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Chromeのパスを検索
    const findChromePath = async () => {
      const possiblePaths = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium-browser",
      ];

      for (const chromePath of possiblePaths) {
        if (fs.existsSync(chromePath)) {
          return chromePath;
        }
      }
      throw new Error("Chromeが見つかりません");
    };

    const chromePath = await findChromePath();

    // Chromeプロファイルの絶対パスを設定
    // 開発環境ではプロジェクトルート、本番環境ではアプリの実行ディレクトリを基準とする
    const appPath = isDev ? process.cwd() : path.dirname(process.execPath);
    const userDataDir = path.join(appPath, "chrome-profile-with-login");

    // プロファイルディレクトリが存在しない場合は作成
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });

      // 既存のプロファイルがある場合はコピー
      const oldProfilePath = path.join(
        process.cwd(),
        "chrome-profile-with-login"
      );
      if (fs.existsSync(oldProfilePath) && oldProfilePath !== userDataDir) {
        console.log("[Chrome] Copying existing profile from:", oldProfilePath);
        try {
          // プロファイルの内容をコピー
          const copyRecursive = (src, dest) => {
            const stats = fs.statSync(src);
            if (stats.isDirectory()) {
              if (!fs.existsSync(dest)) {
                fs.mkdirSync(dest, { recursive: true });
              }
              const files = fs.readdirSync(src);
              files.forEach((file) => {
                copyRecursive(path.join(src, file), path.join(dest, file));
              });
            } else {
              fs.copyFileSync(src, dest);
            }
          };
          copyRecursive(oldProfilePath, userDataDir);
          console.log("[Chrome] Profile copied successfully");
        } catch (error) {
          console.log("[Chrome] Failed to copy profile:", error.message);
        }
      }
    }

    // デバッグ情報を出力
    console.log("[Chrome] App path:", appPath);
    console.log("[Chrome] User data directory:", userDataDir);
    console.log("[Chrome] Directory exists:", fs.existsSync(userDataDir));

    const headless = process.env.CHROME_HEADLESS === "true";
    const headlessArg = headless ? "--headless" : "";

    const command = `"${chromePath}" --remote-debugging-port=${port} --user-data-dir="${userDataDir}" ${headlessArg} --no-first-run --no-default-browser-check`;

    console.log("[Chrome] Command:", command);

    // Chromeをバックグラウンドで起動
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("Chrome起動エラー:", error);
      }
      if (stderr) {
        console.error("Chrome起動エラー:", stderr);
      }
    });

    // Chromeの起動を待機
    await new Promise((resolve) => setTimeout(resolve, 3000));

    return {
      success: true,
      message: "デバッグモードでChromeを起動しました",
      path: chromePath,
    };
  } catch (error) {
    console.error("Chrome起動エラー:", error);
    return {
      success: false,
      error: `Chromeの起動に失敗しました: ${error.message}`,
    };
  }
});
