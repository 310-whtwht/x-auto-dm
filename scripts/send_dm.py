import sys
import json
import random
from typing import Optional, Tuple
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

@dataclass
class SendSettings:
    min_interval: int
    max_interval: int
    daily_limit: int
    follow_before_dm: bool
    current_send_count: int

def get_random_interval(settings: SendSettings) -> int:
    """最小値と最大値の間でランダムな待機時間（秒）を生成"""
    return random.randint(settings.min_interval, settings.max_interval)

def format_message(message: str, user: User) -> str:
    """メッセージ内のプレースホルダーを置換する"""
    return message.replace("$${nick_name}", user.nickname)

def send_dm(user: User, message: str, settings: SendSettings) -> Tuple[bool, str, str]:
    print("=== DM送信処理開始 ===")
    
    # 送信上限チェック
    if settings.current_send_count >= settings.daily_limit:
        error_msg = f"1日の送信上限({settings.daily_limit}件)に達しています"
        print(error_msg)
        return False, error_msg, "error"
    
    print(f"送信状況: {settings.current_send_count + 1}/{settings.daily_limit}件目")

    try:
        # メッセージのフォーマット
        formatted_message = format_message(message, user)
        print(f"送信メッセージ: {formatted_message}")

        # ランダムな待機時間を生成
        wait_time = get_random_interval(settings)
        print(f"送信前の待機時間: {wait_time}秒")

        # 既存のChromeセッションに接続
        options = Options()
        options.debugger_address = "127.0.0.1:9222"
        
        print("既存のブラウザセッションに接続します...")
        driver = webdriver.Chrome(options=options)
        wait = WebDriverWait(driver, 10)

        # 待機処理を実行
        print(f"待機開始...")
        time.sleep(wait_time)
        print(f"待機完了、処理を開始します")
        
        # プロフィールページへ遷移
        profile_url = f"https://twitter.com/{user.userId}"
        print(f"プロフィールページへ遷移: {profile_url}")
        driver.execute_script(f"window.location.href = '{profile_url}'")
        
        # プロフィールページの要素が表示されるまで待機
        print("プロフィールページのレンダリングを待機中...")
        wait = WebDriverWait(driver, 20)  # タイムアウトを20秒に設定
        
        try:
            # プロフィールのメインカラムが表示されるまで待機
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="primaryColumn"]')))
            
            # ユーザー名が表示されるまで待機
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="UserName"]')))
            
            # フォローボタンが表示されるまで待機（複数のパターンに対応）
            wait.until(lambda driver: driver.execute_script(f"""
                return Boolean(
                    document.querySelector(`[aria-label="フォロー @{user.userId}"]`) ||
                    document.querySelector(`[aria-label="フォローバック @{user.userId}"]`) ||
                    document.querySelector(`[aria-label="フォロー中 @{user.userId}"]`)
                )
            """))
            
            print("プロフィールページのレンダリングが完了しました")
            
        except Exception as e:
            print(f"プロフィールページのレンダリング待機中にエラー: {str(e)}")
            return False, "プロフィールページの読み込みに失敗しました", "error"
        
        # 安定性のため短い待機を追加
        time.sleep(1)
        
        # ------------------------ フォロー処理 ------------------------ #
        # フォローする
        print("フォローボタンを確認中...")
        if settings.follow_before_dm:
            follow_result = driver.execute_script(f"""
                const followButton = document.querySelector(`[aria-label="フォロー @{user.userId}"]`);
                if (followButton) {{
                    followButton.click();
                    return "followed";
                }}
                const followBackButton = document.querySelector(`[aria-label="フォローバック @{user.userId}"]`);
                if (followBackButton) {{
                    followBackButton.click();
                    return "followed";
                }}
                const followingButton = document.querySelector(`[aria-label="フォロー中 @{user.userId}"]`);
                if (followingButton) {{
                    return "already_following";
                }}
                return "not_found";
            """)

            print(f"フォローボタンの状態: {follow_result}")

            if follow_result == "not_found":
                return False, "フォローボタンが見つかりませんでした", "error"
            
            if follow_result in ["followed", "already_following"]:
                current_status = "followed"
                print(f"フォロー状態: {current_status}")
            else:
                return False, "フォローに失敗しました", "error"

        if current_status == "followed":
            print("フォローに成功しました")
        else:
            print("フォローに失敗しました")
        time.sleep(2)

        # ------------------------ メッセージ送信処理 ------------------------ #
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
            
            if not click_success:
                print("メッセージボタンが見つかりませんでした")
                # フォロー済みの場合はfollowedステータスを返す
                if current_status == "followed":
                    return False, "メッセージボタンが見つかりませんでした", "followed"
                else:
                    return False, "メッセージボタンが見つかりませんでした", "error"

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
            lines = formatted_message.split('\n')
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
                print(f"送信成功 ({settings.current_send_count + 1}/{settings.daily_limit})")
                return True, "", "success"
            else:
                raise Exception("送信ボタンが見つかりませんでした")

        except Exception as e:
            print(f"メッセージ送信処理でエラーが発生: {str(e)}")
            # 例外発生時もフォロー状態を確認
            if current_status == "followed":
                return False, str(e), "followed"
            return False, str(e), "error"

    except Exception as error:
        error_message = str(error)
        print(f"エラーが発生しました: {error_message}")
        return False, error_message, "error"

    finally:
        if 'driver' in locals():
            driver.quit()

if __name__ == "__main__":
    if len(sys.argv) != 8:  # 引数の数を8に変更（current_send_countを追加）
        print(json.dumps({
            "success": False,
            "error": "Invalid number of arguments",
            "status": "error"
        }))
        sys.exit(1)

    try:
        user_data = json.loads(sys.argv[1])
        message = sys.argv[2]
        min_interval = int(sys.argv[3])
        max_interval = int(sys.argv[4])
        daily_limit = int(sys.argv[5])
        follow_before_dm = sys.argv[6].lower() == 'true'
        current_send_count = int(sys.argv[7])  # 追加: 現在の送信数
        
        user = User(
            userId=user_data["userId"],
            name=user_data["name"],
            nickname=user_data["nickname"],
            profile=user_data["profile"],
            status=user_data["status"],
            isSend=user_data["isSend"]
        )

        settings = SendSettings(
            min_interval=min_interval,
            max_interval=max_interval,
            daily_limit=daily_limit,
            follow_before_dm=follow_before_dm,
            current_send_count=current_send_count  # 追加
        )
        
        success, error, status = send_dm(user, message, settings)
        print(json.dumps({
            "success": success,
            "error": error,
            "status": status
        }))
        sys.exit(0 if success else 1)
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e),
            "status": "error"
        }))
        sys.exit(1)