// scripts/sync-chromedriver.js
const fs = require("fs");
const path = require("path");

const oldDriverPath = path.resolve(
  __dirname,
  "../node_modules/.bin/chromedriver"
);
if (fs.existsSync(oldDriverPath)) {
  console.log(`🗑 Removing old chromedriver at ${oldDriverPath}`);
  fs.unlinkSync(oldDriverPath);
}

const { execSync } = require("child_process");

function getChromeVersion() {
  const platform = process.platform;

  try {
    if (platform === "win32") {
      // Windows
      const versionOutput = execSync(
        `reg query "HKEY_CURRENT_USER\\Software\\Google\\Chrome\\BLBeacon" /v version`
      ).toString();
      return versionOutput.match(/\d+/)[0];
    } else if (platform === "darwin") {
      // macOS
      const versionOutput = execSync(
        `/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --version`
      ).toString();
      return versionOutput.match(/\d+/)[0];
    } else {
      // Linux
      const versionOutput = execSync(`google-chrome --version`).toString();
      return versionOutput.match(/\d+/)[0];
    }
  } catch {
    console.error("❌ Chromeのバージョンが取得できませんでした");
    console.error("Chromeがインストールされていることを確認してください");
    process.exit(1);
  }
}

const chromeMajor = getChromeVersion();
console.log(`🖥  Chrome version detected: ${chromeMajor}`);

// chromedriverをインストール
try {
  console.log(`⬇ Installing chromedriver@${chromeMajor}...`);
  execSync(`npm install chromedriver@${chromeMajor} --save-dev`, {
    stdio: "inherit",
  });
  console.log("✅ chromedriver installed successfully.");
} catch (error) {
  console.error("❌ Failed to install chromedriver:", error.message);
  process.exit(1);
}
