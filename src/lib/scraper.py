from typing import Optional
import asyncio
from playwright.async_api import Browser, Page
from dataclasses import dataclass

@dataclass
class User:
    userId: str
    name: str
    nickname: str
    profile: str
    status: str
    isSend: bool

browser: Optional[Browser] = None
is_logged_in: bool = False

async def send_dm(user: User, message: str) -> bool:
    global browser
    print("=== sendDM開始 ===")

    if not browser:
        print("ブラウザ接続を開始します")
        try:
            # Chrome DevTools Protocolに接続
            browser = await playwright.chromium.connect_over_cdp(
                endpoint_url="http://localhost:9222",
            )
            if not browser:
                raise Exception("ブラウザの接続に失敗しました")
        except Exception as error:
            print("ブラウザへの接続に失敗しました:", error)
            return False

    page = await browser.new_page()
    try:
        print(f"{user.userId}のプロフィールページに遷移中...")
        await page.goto(f"https://twitter.com/{user.userId}", 
            wait_until="domcontentloaded",
            timeout=60000
        )

        # ページ読み込み待機
        await page.wait_for_timeout(10000)

        # aria-labelを使用してDMボタンを検索
        dm_button_exists = await page.evaluate("""() => {
            const dmButton = document.querySelector('[aria-label="メッセージ"]');
            if (dmButton) {
                dmButton.click();
                return true;
            }
            return false;
        }""")

        if not dm_button_exists:
            print("DMボタンが見つかりませんでした")
            return False

        print("DMボタンをクリックしました。DMページの読み込みを待機中...")
        await page.wait_for_timeout(30000)

        # メッセージ入力
        print("メッセージを入力中...")
        await page.wait_for_selector('[data-testid="dmComposerTextInput"]')

        await page.evaluate("""(messageText) => {
            const textElement = document.querySelector('[data-testid="dmComposerTextInput"]');
            if (textElement) {
                textElement.focus();
                document.execCommand('insertText', false, messageText);
            }
        }""", message)

        print("送信ボタンをクリック...")
        await page.click('[data-testid="dmComposerSendButton"]')

        print("送信完了")
        return True

    except Exception as error:
        print("DM送信中にエラーが発生しました:", error)
        if isinstance(error, TimeoutError):
            print("タイムアウトが発生しました。ネットワーク状態を確認してください。")
        return False

    finally:
        await page.close()

async def cleanup():
    global browser, is_logged_in
    if browser:
        await browser.close()
        browser = None
        is_logged_in = False 