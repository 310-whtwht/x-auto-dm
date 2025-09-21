const fs = require("fs");
const path = require("path");
const os = require("os");

class Settings {
  constructor() {
    this.settingsPath = path.join(os.homedir(), ".x-auto-dm", "settings.json");
    this.settings = this.loadSettings();
  }

  loadSettings() {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, "utf8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("設定ファイルの読み込みエラー:", error);
    }

    // デフォルト設定
    return {
      chromePath: this.detectChromePath(),
      debugPort: 9222,
      headless: false,
    };
  }

  saveSettings() {
    try {
      // ディレクトリが存在しない場合は作成
      const dir = path.dirname(this.settingsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(
        this.settingsPath,
        JSON.stringify(this.settings, null, 2),
        "utf8"
      );
      return true;
    } catch (error) {
      console.error("設定ファイルの保存エラー:", error);
      return false;
    }
  }

  detectChromePath() {
    const platform = process.platform;
    const possiblePaths = [];

    if (platform === "darwin") {
      // macOS
      possiblePaths.push(
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
      );
    } else if (platform === "win32") {
      // Windows
      possiblePaths.push(
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
      );
    } else {
      // Linux
      possiblePaths.push(
        "/usr/bin/google-chrome",
        "/usr/bin/chromium-browser",
        "/usr/bin/microsoft-edge"
      );
    }

    // 存在するパスを探す
    for (const chromePath of possiblePaths) {
      if (fs.existsSync(chromePath)) {
        return chromePath;
      }
    }

    return null; // 見つからない場合はnull
  }

  get(key) {
    return this.settings[key];
  }

  set(key, value) {
    this.settings[key] = value;
    return this.saveSettings();
  }

  getAll() {
    return { ...this.settings };
  }

  update(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    return this.saveSettings();
  }
}

module.exports = Settings;
