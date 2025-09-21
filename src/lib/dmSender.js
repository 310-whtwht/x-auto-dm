const { chromium } = require("playwright-core");

class DMSender {
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

  formatMessage(message, user) {
    return message.replace(/\$\$\{nick_name\}/g, user.nickname);
  }

  getRandomInterval(minInterval, maxInterval) {
    return (
      Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval
    );
  }

  async sendDM(user, message, settings) {
    console.log("=== DM送信処理開始 ===");

    // 送信上限チェック
    if (settings.currentSendCount >= settings.dailyLimit) {
      const errorMsg = `1日の送信上限(${settings.dailyLimit}件)に達しています`;
      console.log(errorMsg);
      return { success: false, error: errorMsg, status: "error" };
    }

    console.log(
      `送信状況: ${settings.currentSendCount + 1}/${settings.dailyLimit}件目`
    );

    // Pythonコードと同じ：各処理で新しいセッションを作成
    let browser = null;
    let page = null;

    try {
      // メッセージのフォーマット
      const formattedMessage = this.formatMessage(message, user);
      console.log(`送信メッセージ: ${formattedMessage}`);

      // ランダムな待機時間を生成
      const waitTime = this.getRandomInterval(
        settings.minInterval,
        settings.maxInterval
      );
      console.log(`送信前の待機時間: ${waitTime}秒`);

      // Pythonコードと同じ：既存のChromeセッションに接続
      console.log("既存のブラウザセッションに接続します...");
      try {
        browser = await require("playwright-core").chromium.connectOverCDP(
          `http://127.0.0.1:${this.debugPort}`
        );
        const context = browser.contexts()[0] || (await browser.newContext());
        page = context.pages()[0] || (await context.newPage());
      } catch (error) {
        console.log("既存セッションへの接続に失敗:", error.message);
        throw error;
      }

      // 待機処理を実行（Pythonコードと同じ）
      console.log("待機開始...");
      await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));
      console.log("待機完了、処理を開始します");

      // プロフィールページへ遷移（Pythonコードと同じ）
      const profileUrl = `https://twitter.com/${user.userId}`;
      console.log(`プロフィールページへ遷移: ${profileUrl}`);
      await page.evaluate((url) => {
        window.location.href = url;
      }, profileUrl);

      // プロフィールページのレンダリングを待機（Pythonコードと同じ）
      console.log("プロフィールページのレンダリングを待機中...");

      try {
        // ページが完全に読み込まれるまで待機（Pythonコードと同じ）
        await page.waitForFunction(() => document.readyState === "complete", {
          timeout: 20000,
        });
        console.log("ページの読み込みが完了しました");

        // プロフィールのメインカラムが表示されるまで待機
        try {
          await page.waitForSelector('[data-testid="primaryColumn"]', {
            timeout: 10000,
          });
          console.log("primaryColumnが見つかりました");
        } catch (error) {
          console.log("primaryColumnが見つかりませんでしたが、続行します");
        }

        try {
          await page.waitForSelector('[data-testid="UserName"]', {
            timeout: 10000,
          });
          console.log("UserNameが見つかりました");
        } catch (error) {
          console.log("UserNameが見つかりませんでしたが、続行します");
        }

        // フォローボタンが表示されるまで待機
        try {
          await page.waitForFunction(
            (userId) => {
              return Boolean(
                document.querySelector(`[aria-label="フォロー @${userId}"]`) ||
                  document.querySelector(
                    `[aria-label="フォローバック @${userId}"]`
                  ) ||
                  document.querySelector(`[aria-label="フォロー中 @${userId}"]`)
              );
            },
            user.userId,
            { timeout: 10000 }
          );
          console.log("フォローボタンが見つかりました");
        } catch (error) {
          console.log("フォローボタンが見つかりませんでしたが、続行します");
        }
      } catch (error) {
        console.log(
          `プロフィールページのレンダリング待機中にエラー: ${error.message}`
        );
        return {
          success: false,
          error: "プロフィールページの読み込みに失敗しました",
          status: "error",
        };
      }

      // デバッグ: 利用可能なボタンを確認（Pythonコードと同じ）
      const debugInfo = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button, [role="button"]');
        const buttonInfo = [];
        for (let i = 0; i < Math.min(buttons.length, 20); i++) {
          const btn = buttons[i];
          buttonInfo.push({
            text: btn.textContent?.trim() || "",
            ariaLabel: btn.getAttribute("aria-label") || "",
            dataTestId: btn.getAttribute("data-testid") || "",
            className: btn.className || "",
          });
        }
        return buttonInfo;
      });
      console.log(`利用可能なボタン情報: ${JSON.stringify(debugInfo)}`);

      console.log("プロフィールページのレンダリングが完了しました");

      // 安定性のため短い待機を追加（Pythonコードと同じ）
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // ------------------------ フォロー処理 ------------------------ #
      let currentStatus = "not_followed";

      if (settings.followBeforeDM) {
        console.log("フォローボタンを確認中...");

        const followResult = await page.evaluate((userId) => {
          const followButton = document.querySelector(
            `[aria-label="フォロー @${userId}"]`
          );
          if (followButton) {
            followButton.click();
            return "followed";
          }

          const followBackButton = document.querySelector(
            `[aria-label="フォローバック @${userId}"]`
          );
          if (followBackButton) {
            followBackButton.click();
            return "followed";
          }

          const followingButton = document.querySelector(
            `[aria-label="フォロー中 @${userId}"]`
          );
          if (followingButton) {
            return "already_following";
          }

          // より柔軟な検索
          const allButtons = document.querySelectorAll(
            'button, [role="button"]'
          );
          for (let btn of allButtons) {
            const ariaLabel = btn.getAttribute("aria-label") || "";
            console.log("Checking button:", ariaLabel);
            if (ariaLabel.includes("フォロー") && ariaLabel.includes(userId)) {
              console.log("Found follow button:", ariaLabel);
              if (ariaLabel.includes("フォロー中")) {
                return "already_following";
              } else {
                btn.click();
                return "followed";
              }
            }
          }
          return "not_found";
        }, user.userId);

        console.log(`フォローボタンの状態: ${followResult}`);

        if (followResult === "not_found") {
          return {
            success: false,
            error: "フォローボタンが見つかりませんでした",
            status: "error",
          };
        }

        if (
          followResult === "followed" ||
          followResult === "already_following"
        ) {
          currentStatus = "followed";
          console.log(`フォロー状態: ${currentStatus}`);
        } else {
          return {
            success: false,
            error: "フォローに失敗しました",
            status: "error",
          };
        }
      }

      // フォロー状態の確認（Pythonコードと同じ）
      if (currentStatus === "followed") {
        console.log("フォローに成功しました");
      } else {
        console.log("フォローに失敗しました");
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // ------------------------ メッセージ送信処理 ------------------------ #
      // メッセージボタンを探して遷移
      console.log("メッセージボタンを探しています...");

      try {
        // JavaScriptでメッセージボタンを見つけてクリック（Pythonコードと同じ）
        const clickSuccess = await page.evaluate(() => {
          const messageButton = document.querySelector(
            '[aria-label="メッセージ"]'
          );
          if (messageButton) {
            messageButton.click();
            return true;
          }
          return false;
        });

        if (!clickSuccess) {
          console.log("メッセージボタンが見つかりませんでした");
          // フォロー済みの場合はfollowedステータスを返す（Pythonコードと同じ）
          if (currentStatus === "followed") {
            return {
              success: false,
              error: "メッセージボタンが見つかりませんでした",
              status: "followed",
            };
          } else {
            return {
              success: false,
              error: "メッセージボタンが見つかりませんでした",
              status: "error",
            };
          }
        }

        console.log("メッセージボタンをクリックしました");
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // 遷移後のURLを確認
        const currentUrl = page.url();
        console.log(`メッセージ画面のURL: ${currentUrl}`);

        if (!currentUrl.includes("messages")) {
          throw new Error("メッセージ画面への遷移に失敗しました");
        }

        console.log("=== メッセージ画面への遷移成功 ===");

        // メッセージ入力欄の表示を待機
        console.log("メッセージ入力欄の表示を待機中...");
        await page.waitForSelector('[data-testid="dmComposerTextInput"]', {
          timeout: 10000,
        });

        await new Promise((resolve) => setTimeout(resolve, 2000));

        // メッセージを1行ずつ入力（Pythonコードと同じ方法）
        console.log("メッセージを入力します...");
        const lines = formattedMessage.split("\n");

        // Pythonコードと同じ：input_element.send_keys()相当の処理
        // Playwrightのlocatorを使用してより確実に要素を取得
        const inputElement = page.locator(
          '[data-testid="dmComposerTextInput"]'
        );

        // 要素が存在することを確認
        await inputElement.waitFor({ timeout: 10000 });

        // フォーカスを確実にする
        await inputElement.click();
        await new Promise((resolve) => setTimeout(resolve, 500));

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Playwrightのtypeメソッドを使用（Pythonコードのsend_keys相当）
          await inputElement.type(line);

          if (i < lines.length - 1) {
            // 最後の行以外で改行を入力（PythonコードのKeys.SHIFT + Keys.ENTER相当）
            await inputElement.press("Shift+Enter");
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }

        // 変更を確実に検知させるため、最後にスペースを入力
        await inputElement.type(" ");
        await new Promise((resolve) => setTimeout(resolve, 1000));

        console.log("メッセージの入力に成功しました");

        // 送信ボタンの表示を待機
        console.log("送信ボタンの表示を待機中...");
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // エンターキーで送信（より確実な方法）
        console.log("エンターキーで送信します...");
        await inputElement.press("Enter");

        // 送信が完了するまで少し待機
        await new Promise((resolve) => setTimeout(resolve, 2000));

        console.log("送信完了");
        console.log(
          `送信成功 (${settings.currentSendCount + 1}/${settings.dailyLimit})`
        );
        return { success: true, error: "", status: "success" };
      } catch (error) {
        console.log(`メッセージ送信処理でエラーが発生: ${error.message}`);
        // 例外発生時もフォロー状態を確認（Pythonコードと同じ）
        if (currentStatus === "followed") {
          return { success: false, error: error.message, status: "followed" };
        }
        return { success: false, error: error.message, status: "error" };
      }
    } catch (error) {
      const errorMessage = error.message;
      console.log(`エラーが発生しました: ${errorMessage}`);
      return { success: false, error: errorMessage, status: "error" };
    } finally {
      // Pythonコードと同じ：処理後にブラウザセッションを終了
      if (browser) {
        try {
          await browser.close();
        } catch (error) {
          console.error("ブラウザ終了エラー:", error);
        }
      }
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

module.exports = DMSender;
