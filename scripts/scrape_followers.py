import os
import sys
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
import time
import csv

def main():
    try:
        target_username = sys.argv[1] if len(sys.argv) > 1 else None
        print(f"Starting scraping for: {target_username}")

        # Chromeオプションの設定
        chrome_options = Options()
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')  # GPUエラーを防ぐ
        chrome_options.add_argument('--ignore-gpu-blocklist')  # GPU関連の警告を無視
        
        # 既存のブラウザセッションに接続
        chrome_options.add_experimental_option("debuggerAddress", "127.0.0.1:9222")
        
        driver = webdriver.Chrome(options=chrome_options)
        print("Connected to existing browser session")

        try:
            # フォロワーページに直接移動
            followers_url = f"https://twitter.com/{target_username}/followers"
            driver.get(followers_url)
            print(f"Navigated to followers page: {followers_url}")
            time.sleep(5)

            # フォロワー情報の取得
            followers_data = []
            last_height = driver.execute_script("return document.body.scrollHeight")

            while True:
                # ボタン要素を取得
                buttons = driver.find_elements(By.TAG_NAME, "button")
                for button in buttons:
                    spans = button.find_elements(By.TAG_NAME, "span")
                    span_texts = [span.text for span in spans if span.text]

                    if span_texts:
                        username = ""
                        user_id = ""
                        nickname = ""
                        profile = ""
                        profile_start = False

                        for i, text in enumerate(span_texts):
                            if i == 0:
                                username = text
                                if '@' in username:
                                    nickname = username.split('@')[0].strip()
                                elif '｜' in username:
                                    nickname = username.split('｜')[0].strip()
                                else:
                                    nickname = username
                            elif text.startswith("@"):
                                user_id = text[1:]
                            elif text in ["フォローされています", "フォロー中"]:
                                profile_start = True
                            elif profile_start:
                                profile += text + " "

                        if username and user_id:
                            # プロフィールからフォローバック関連の文言を除去
                            cleaned_profile = profile.strip()
                            if cleaned_profile.startswith("フォローバック フォローバック "):
                                cleaned_profile = cleaned_profile.replace("フォローバック フォローバック ", "", 1)
                            
                            follower_info = {
                                "username": username,
                                "id": user_id,
                                "nickname": nickname,
                                "profile": cleaned_profile
                            }
                            if follower_info not in followers_data:
                                followers_data.append(follower_info)
                                print(f"Found follower: {user_id}")

                # スクロール
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(2)

                new_height = driver.execute_script("return document.body.scrollHeight")
                if new_height == last_height:
                    break
                last_height = new_height

            # CSVファイルの保存
            now = datetime.now()
            date_str = now.strftime("%Y-%m-%d")
            time_str = now.strftime("%H-%M-%S")
            filename = f"{date_str}_{time_str}_drip-users.csv"
            desktop_path = os.path.join(os.path.expanduser("~"), "Desktop", filename)

            with open(desktop_path, "w", newline="", encoding="utf-8") as csvfile:
                fieldnames = ["userId", "name", "nickname", "profile"]
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                for follower in followers_data:
                    writer.writerow({
                        "userId": follower["id"],
                        "name": follower["username"],
                        "nickname": follower["nickname"],
                        "profile": follower["profile"]
                    })

            print(f"CSV saved to: {desktop_path}")
            print(f"Total followers found: {len(followers_data)}")
            
        finally:
            # 既存のブラウザセッションを使用しているため、ブラウザは閉じない
            print("Scraping completed")

        return True

    except Exception as e:
        print(f"Error occurred: {str(e)}")
        return False

if __name__ == "__main__":
    main() 