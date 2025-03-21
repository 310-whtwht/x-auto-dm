import puppeteer, { Browser, Page } from "puppeteer";
import { User } from "@/types";

interface ExtractConfig {
  url: string;
  searchMode: "exact" | "partial";
  keywords: string[];
}

let browser: Browser | null = null;
let isLoggedIn = false;

export async function initBrowser(): Promise<Browser> {
  if (browser) {
    console.log("ブラウザは既に起動しています");
    return browser;
  }

  console.log("ブラウザを初期化中...");
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
      ],
    });
    console.log("ブラウザの初期化が完了しました");
    return browser;
  } catch (error) {
    console.error("ブラウザの初期化に失敗しました:", error);
    throw error;
  }
}

async function login(page: Page, userId: string, password: string) {
  if (isLoggedIn) return;

  await page.goto("https://twitter.com/login");
  await page.waitForSelector('input[name="text"]');

  // ユーザーID入力
  await page.type('input[name="text"]', userId);
  await page.keyboard.press("Enter");
  await page.waitForFunction(
    "new Promise(resolve => setTimeout(resolve, 2000))"
  );

  // パスワード入力
  await page.type('input[name="password"]', password);
  await page.keyboard.press("Enter");
  await page.waitForFunction(
    "new Promise(resolve => setTimeout(resolve, 5000))"
  );

  isLoggedIn = true;
}

export async function extractUsers({
  url,
  searchMode,
  keywords,
}: ExtractConfig): Promise<User[]> {
  const browser = await initBrowser();
  const page = await browser.newPage();
  const users: User[] = [];

  try {
    // TODO: ログイン情報はSettingsから取得
    await login(page, "your_user_id", "your_password");

    await page.goto(url);
    await page.waitForFunction(
      "new Promise(resolve => setTimeout(resolve, 5000))"
    );

    let lastHeight = await page.evaluate("document.body.scrollHeight");

    while (true) {
      const newUsers = await page.evaluate(() => {
        const buttons = document.querySelectorAll("button");
        const userData: User[] = [];

        buttons.forEach((button) => {
          const spans = button.querySelectorAll("span");
          const texts = Array.from(spans)
            .map((span) => span.textContent)
            .filter(Boolean);

          if (texts.length > 0) {
            let name = texts[0];
            let userId = "";
            let profile = "";
            let profileStart = false;

            texts.forEach((text, i) => {
              if (text && text.startsWith("@")) {
                userId = text.substring(1);
              } else if (
                [
                  "フォローされています",
                  "フォロー中",
                  "フォロー",
                  "フォローバック",
                ].includes(text || "")
              ) {
                profileStart = true;
              } else if (profileStart) {
                profile += text + " ";
              } else if (text && text.trim() === "") {
                // 空のテキストは無視
                return;
              }
            });

            // ニックネーム抽出（| @ ｜で区切られた場合）
            const nickName = name ? name.split(/[\|@｜]/)[0].trim() : "";

            if (userId && name) {
              userData.push({
                userId,
                name,
                nickname: nickName,
                profile: profile.trim(),
                status: "pending",
                isSend: true,
              });
            }
          }
        });

        return userData;
      });

      // キーワードフィルタリング
      const filteredUsers = filterUsersByKeywords(
        newUsers,
        searchMode,
        keywords
      );
      users.push(...filteredUsers);

      // スクロール
      await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
      await page.waitForFunction(
        "new Promise(resolve => setTimeout(resolve, 2000))"
      );

      const newHeight = await page.evaluate("document.body.scrollHeight");
      if (newHeight === lastHeight) {
        break;
      }
      lastHeight = newHeight;
    }
  } catch (error) {
    console.error("Error during extraction:", error);
    throw error;
  }

  return users;
}

function filterUsersByKeywords(
  users: User[],
  searchMode: "exact" | "partial",
  keywords: string[]
): User[] {
  if (!keywords.length) return users;

  return users.filter((user) => {
    const profile = user.profile.toLowerCase();

    if (searchMode === "exact") {
      return keywords.every((keyword) =>
        profile.includes(keyword.toLowerCase())
      );
    } else {
      return keywords.some((keyword) =>
        profile.includes(keyword.toLowerCase())
      );
    }
  });
}

// 既存のChromeセッションに接続する関数
export async function connectToBrowser(): Promise<void> {
  if (browser) {
    console.log("既にブラウザに接続済みです");
    return;
  }

  console.log("既存のブラウザセッションに接続を試みます...");
  try {
    // Chrome DevTools Protocolに接続
    browser = await puppeteer.connect({
      browserURL: "http://localhost:9222",
      defaultViewport: null,
    });
    console.log("既存のブラウザセッションへの接続が完了しました");
  } catch (error) {
    console.error("ブラウザへの接続に失敗しました:", error);
    throw error;
  }
}

export async function sendDM(user: User, message: string): Promise<boolean> {
  console.log("=== sendDM開始 ===");

  if (!browser) {
    console.log("ブラウザ接続を開始します");
    try {
      await connectToBrowser();
      if (!browser) {
        throw new Error("ブラウザの接続に失敗しました");
      }
    } catch (error) {
      console.error("ブラウザへの接続に失敗しました:", error);
      return false;
    }
  }

  const page = await browser.newPage();
  try {
    // プロフィールページのHTMLからユーザーIDを取得
    console.log(`${user.userId}のプロフィールページに遷移中...`);
    await page.goto(`https://twitter.com/${user.userId}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // __INITIAL_STATE__からユーザーIDを取得
    const userId = await page.evaluate(() => {
      const state = (window as any).__INITIAL_STATE__;
      if (state?.entities?.users?.entities) {
        const userEntities = state.entities.users.entities;
        const userKey = Object.keys(userEntities)[0];
        return userKey;
      }
      return null;
    });

    if (!userId) {
      console.error("ユーザーIDの取得に失敗しました");
      return false;
    }

    // メッセージページに直接遷移
    console.log(`メッセージページに遷移: ${userId}`);
    await page.goto(`https://twitter.com/messages/${userId}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // メッセージ入力と送信
    console.log("メッセージを入力中...");
    await page.waitForSelector('[data-testid="dmComposerTextInput"]');
    await page.type('[data-testid="dmComposerTextInput"]', message);

    console.log("送信ボタンをクリック...");
    await page.click('[data-testid="dmComposerSendButton"]');

    console.log("送信完了");
    return true;
  } catch (error) {
    console.error("DM送信中にエラーが発生しました:", error);
    if (error && typeof error === "object" && "name" in error) {
      if (error.name === "TimeoutError") {
        console.error(
          "タイムアウトが発生しました。ネットワーク状態を確認してください。"
        );
      }
    }
    return false;
  } finally {
    await page.close();
  }
}

export async function cleanup() {
  if (browser) {
    await browser.close();
    browser = null;
    isLoggedIn = false;
  }
}
