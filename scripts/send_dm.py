import sys
import json
from typing import Optional
from dataclasses import dataclass
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.keys import Keys
import time

@dataclass
class User:
    userId: str
    name: str
    nickname: str
    profile: str
    status: str
    isSend: bool

def format_message(message: str, user: User) -> str:
    """メッセージ内のプレースホルダーを置換する"""
    return message.replace("$${nick_name}", user.nickname)

def send_dm(user: User, message: str) -> bool:
    print("=== DM送信処理開始 ===")

    try:
        # メッセージのフォーマット
        formatted_message = format_message(message, user)
        print(f"送信メッセージ: {formatted_message}")
        
        # メッセージを行ごとに分割
        lines = formatted_message.split('\n')
        
        # 既存のChromeセッションに接続
        options = Options()
        options.debugger_address = "127.0.0.1:9222"
        
        print("既存のブラウザセッションに接続します...")
        driver = webdriver.Chrome(options=options)
        wait = WebDriverWait(driver, 10)
        
        # プロフィールページへ遷移
        profile_url = f"https://twitter.com/{user.userId}"
        print(f"プロフィールページへ遷移: {profile_url}")
        driver.execute_script(f"window.location.href = '{profile_url}'")
        time.sleep(3)
        
        # 現在のURLを確認
        current_url = driver.current_url
        print(f"遷移後のURL: {current_url}")
        
        if not any(domain in current_url for domain in ["twitter.com", "x.com"]):
            raise Exception(f"プロフィールページへの遷移に失敗しました。現在のURL: {current_url}")
        
        # メッセージボタンを探して遷移
        print("メッセージボタンを探しています...")
        try:
            # JavaScriptでメッセージボタンを見つけてクリック
            click_success = driver.execute_script("""
                const messageButton = document.querySelector('[aria-label="メッセージ"]');
                if (messageButton) {
                    messageButton.click();
                    return true;
                }
                return false;
            """)
            
            if click_success:
                print("メッセージボタンをクリックしました")
                time.sleep(3)
                
                # 遷移後のURLを確認
                current_url = driver.current_url
                print(f"メッセージ画面のURL: {current_url}")
                
                if "messages" not in current_url:
                    raise Exception("メッセージ画面への遷移に失敗しました")
                
                print("=== メッセージ画面への遷移成功 ===")
                
                # メッセージ入力欄の表示を待機
                print("メッセージ入力欄の表示を待機中...")
                input_element = wait.until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="dmComposerTextInput"]'))
                )
                
                time.sleep(2)
                
                # メッセージを1行ずつ入力
                print("メッセージを入力します...")
                for i, line in enumerate(lines):
                    input_element.send_keys(line)
                    if i < len(lines) - 1:  # 最後の行以外で改行を入力
                        input_element.send_keys(Keys.SHIFT, Keys.ENTER)
                        time.sleep(0.1)
                
                # 変更を確実に検知させるため、最後にスペースを入力
                input_element.send_keys(" ")
                time.sleep(1)
                
                print("メッセージの入力に成功しました")
                
                # 送信ボタンの表示を待機
                print("送信ボタンの表示を待機中...")
                time.sleep(1)
                
                # 送信ボタンをクリック
                send_success = driver.execute_script("""
                    const sendButton = document.querySelector('[aria-label="送信"]');
                    if (sendButton) {
                        sendButton.click();
                        return true;
                    }
                    return false;
                """)
                
                if send_success:
                    print("メッセージを送信しました")
                    time.sleep(2)
                    return True
                else:
                    raise Exception("送信ボタンが見つかりませんでした")
            else:
                raise Exception("メッセージボタンが見つかりませんでした")
            
        except Exception as e:
            print(f"処理中にエラーが発生: {str(e)}")
            return False

    except Exception as error:
        print(f"エラーが発生しました: {error}")
        print(f"最終URL: {driver.current_url if 'driver' in locals() else 'unknown'}")
        return False

    finally:
        if 'driver' in locals():
            driver.quit()

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Error: Invalid number of arguments")
        print("Usage: python send_dm.py <user_json> <message>")
        sys.exit(1)

    try:
        user_data = json.loads(sys.argv[1])
        message = sys.argv[2]
        
        user = User(
            userId=user_data["userId"],
            name=user_data["name"],
            nickname=user_data["nickname"],
            profile=user_data["profile"],
            status=user_data["status"],
            isSend=user_data["isSend"]
        )
        
        success = send_dm(user, message)
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)