const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");
const os = require("os");

class FollowerScraper {
  constructor(options = {}) {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.debugPort = options.debugPort || 9222;
  }

  async launch() {
    try {
      console.log("ブラウザを起動中...");

      const launchOptions = {
        headless: false,
        args: [
          "--no-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--ignore-gpu-blocklist",
          "--disable-web-security",
          "--disable-features=IsolateOrigins,site-per-process",
          "--allow-running-insecure-content",
          "--disable-blink-features=AutomationControlled",
        ],
      };

      // 既存のChromeセッションに接続を試行
      try {
        console.log("既存のChromeセッションに接続を試行中...");
        this.browser = await chromium.connectOverCDP(
          `http://127.0.0.1:${this.debugPort}`
        );
        console.log("既存のChromeセッションに接続しました");
      } catch (error) {
        console.log(
          "既存のChromeセッションへの接続に失敗、新しいブラウザを起動します"
        );
        this.browser = await chromium.launch(launchOptions);
      }

      this.context =
        this.browser.contexts()[0] || (await this.browser.newContext());
      this.page = this.context.pages()[0] || (await this.context.newPage());

      return true;
    } catch (error) {
      console.error("ブラウザ起動エラー:", error);
      throw error;
    }
  }

  async scrapeFollowers(targetUsername, customUrl = null) {
    try {
      console.log(`ユーザー情報取得開始: ${targetUsername}`);

      // カスタムURLが指定されている場合はそれを使用、そうでなければフォロワーページ
      const targetUrl =
        customUrl || `https://x.com/${targetUsername}/followers`;
      console.log(`ページに移動中: ${targetUrl}`);

      try {
        await this.page.goto(targetUrl, {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });
        console.log(`ページに移動完了: ${targetUrl}`);

        // 現在のURLを確認
        const currentUrl = await this.page.url();
        console.log(`現在のURL: ${currentUrl}`);

        // ページのタイトルを確認
        const title = await this.page.title();
        console.log(`ページタイトル: ${title}`);

        // フォロワーリストが読み込まれるまで待機
        console.log("フォロワーリストの読み込みを待機中...");
        await this.page.waitForTimeout(10000);

        // スクロール可能かチェック
        const initialHeight = await this.page.evaluate(
          () => document.body.scrollHeight
        );
        console.log(`初期ページ高さ: ${initialHeight}`);
      } catch (error) {
        console.error(`ページ移動エラー: ${error.message}`);
        throw error;
      }

      const followersData = [];
      let lastHeight = await this.page.evaluate(
        () => document.body.scrollHeight
      );

      let scrollCount = 0;
      while (true) {
        scrollCount++;
        console.log(`=== スクロール回数: ${scrollCount} ===`);

        // フォロワー情報を取得（Python版と同じロジック）
        const followers = await this.page.evaluate(() => {
          const buttons = document.querySelectorAll("button");
          const followers = [];

          buttons.forEach((button) => {
            const spans = button.querySelectorAll("span");
            const spanTexts = Array.from(spans)
              .map((span) => span.textContent)
              .filter((text) => text);

            if (spanTexts.length > 0) {
              let username = "";
              let userId = "";
              let nickname = "";
              let profile = "";
              let profileStart = false;

              // Python版と同じロジックでspanTextsを処理
              spanTexts.forEach((text, index) => {
                if (index === 0) {
                  username = text;
                  if (username.includes("@")) {
                    nickname = username.split("@")[0].trim();
                  } else if (username.includes("｜")) {
                    nickname = username.split("｜")[0].trim();
                  } else {
                    nickname = username;
                  }
                } else if (text.startsWith("@")) {
                  userId = text.substring(1);
                } else if (
                  text === "フォローされています" ||
                  text === "フォロー中"
                ) {
                  profileStart = true;
                } else if (profileStart) {
                  profile += text + " ";
                }
              });

              if (username && userId) {
                // プロフィールからフォローバック関連の文言を除去
                let cleanedProfile = profile.trim();
                if (
                  cleanedProfile.startsWith("フォローバック フォローバック ")
                ) {
                  cleanedProfile = cleanedProfile.replace(
                    "フォローバック フォローバック ",
                    ""
                  );
                }

                followers.push({
                  username,
                  id: userId,
                  nickname,
                  profile: cleanedProfile,
                });
              }
            }
          });

          return followers;
        });

        // 新しいフォロワーを追加
        console.log(`この回で発見されたフォロワー数: ${followers.length}`);
        followers.forEach((follower) => {
          if (!followersData.find((f) => f.id === follower.id)) {
            followersData.push(follower);
            console.log(
              `フォロワー発見: ${follower.id} (${follower.username})`
            );
          }
        });

        console.log(`現在の総フォロワー数: ${followersData.length}`);

        // スクロール（Python版と同じ処理）
        await this.page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });

        await this.page.waitForTimeout(2000);

        // スクロール後の高さをチェック（Python版と同じ処理）
        const newHeight = await this.page.evaluate(
          () => document.body.scrollHeight
        );
        console.log(
          `スクロール前の高さ: ${lastHeight}, スクロール後の高さ: ${newHeight}`
        );

        if (newHeight === lastHeight) {
          console.log("スクロールが完了しました（高さが変化しませんでした）");
          break;
        }
        lastHeight = newHeight;
      }

      return followersData;
    } catch (error) {
      console.error("フォロワー取得エラー:", error);
      throw error;
    }
  }

  async saveToCSV(followersData) {
    try {
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const timeStr = now
        .toTimeString()
        .split(" ")[0]
        .replace(/:/g, "-");
      const filename = `${dateStr}_${timeStr}_drip-users.csv`;
      const desktopPath = path.join(os.homedir(), "Desktop", filename);

      const csvContent = [
        "userId,name,nickname,profile",
        ...followersData.map(
          (follower) =>
            `"${follower.id}","${follower.username}","${follower.nickname}","${
              follower.profile
            }"`
        ),
      ].join("\n");

      fs.writeFileSync(desktopPath, csvContent, "utf8");
      console.log(`CSV保存完了: ${desktopPath}`);
      console.log(`総フォロワー数: ${followersData.length}`);

      return desktopPath;
    } catch (error) {
      console.error("CSV保存エラー:", error);
      throw error;
    }
  }

  async close() {
    try {
      if (this.page) {
        await this.page.close();
      }
      if (this.context) {
        await this.context.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
    } catch (error) {
      console.error("ブラウザ終了エラー:", error);
    }
  }
}

module.exports = FollowerScraper;
