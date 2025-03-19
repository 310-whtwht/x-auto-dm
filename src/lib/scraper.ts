import puppeteer, { Browser, Page } from "puppeteer";
import { User } from "@/types";

interface ExtractConfig {
  url: string;
  searchMode: "exact" | "partial";
  keywords: string[];
}

let browser: Browser | null = null;
let isLoggedIn = false;

async function initBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
    });
  }
  return browser;
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
                ["フォローされています", "フォロー中", "フォロー", "フォローバック"].includes(
                  text || ""
                )
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

export async function sendDM(user: User, message: string): Promise<boolean> {
  if (!browser) return false;

  const page = await browser.newPage();
  try {
    await page.goto(`https://twitter.com/${user.userId}`);
    await page.waitForFunction(
      "new Promise(resolve => setTimeout(resolve, 2000))"
    );

    // DMボタンを探す
    const dmButton = await page.$('button[data-testid="sendDMFromProfile"]');
    if (!dmButton) {
      // フォローボタンを探してクリック
      const followButton = await page.$('button[data-testid="follow"]');
      if (followButton) {
        await followButton.click();
        await page.waitForFunction(
          "new Promise(resolve => setTimeout(resolve, 2000))"
        );
      }
      return false;
    }

    await dmButton.click();
    await page.waitForFunction(
      "new Promise(resolve => setTimeout(resolve, 2000))"
    );

    // メッセージ入力と送信
    await page.type('div[data-testid="dmComposerTextInput"]', message);
    await page.click('div[data-testid="dmComposerSendButton"]');
    await page.waitForFunction(
      "new Promise(resolve => setTimeout(resolve, 1000))"
    );

    return true;
  } catch (error) {
    console.error("Error sending DM:", error);
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
