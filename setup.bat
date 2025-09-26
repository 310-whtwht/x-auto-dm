@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM X Auto DM 環境構築スクリプト (Windows用)
REM Windows用のワンストップ環境構築

echo 🚀 X Auto DM 環境構築を開始します...

REM システム情報の表示
echo.
echo 📋 システム情報:
echo    - OS: Windows
echo    - アーキテクチャ: %PROCESSOR_ARCHITECTURE%
echo.

REM 1. Node.jsのインストール確認・インストール
echo [INFO] Node.jsの確認中...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Node.jsをインストール中...
    echo [WARNING] Node.jsがインストールされていません
    echo [INFO] 以下のURLからNode.jsをインストールしてください:
    echo [INFO] https://nodejs.org/
    set /p "install_node=Node.jsをインストールしましたか？ (y/n): "
    if /i not "!install_node!"=="y" (
        echo [ERROR] Node.jsのインストールが必要です
        pause
        exit /b 1
    )
) else (
    echo [SUCCESS] Node.jsは既にインストールされています
    node --version
)

REM 2. Google Chromeのインストール確認
echo.
echo [INFO] Google Chromeの確認中...
reg query "HKEY_CURRENT_USER\Software\Google\Chrome\BLBeacon" /v version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Google Chromeがインストールされていません
    echo [INFO] 以下のURLからGoogle Chromeをインストールしてください:
    echo [INFO] https://www.google.com/chrome/
    set /p "install_chrome=Google Chromeをインストールしましたか？ (y/n): "
    if /i not "!install_chrome!"=="y" (
        echo [ERROR] Google Chromeのインストールが必要です
        pause
        exit /b 1
    )
) else (
    echo [SUCCESS] Google Chromeは既にインストールされています
    for /f "tokens=3" %%i in ('reg query "HKEY_CURRENT_USER\Software\Google\Chrome\BLBeacon" /v version ^| findstr "version"') do echo Chrome version: %%i
)

REM 3. Node.js依存関係のクリーンアップとインストール
echo.
echo [INFO] Node.js依存関係のクリーンアップ中...
if exist "node_modules" (
    echo [INFO] 既存のnode_modulesを削除中...
    rmdir /s /q "node_modules"
)

if exist "package-lock.json" (
    echo [INFO] 既存のpackage-lock.jsonを削除中...
    del "package-lock.json"
)

echo [INFO] Node.js依存関係をインストール中...
npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm installに失敗しました
    pause
    exit /b 1
)

REM 4. ChromeDriverの同期
echo.
echo [INFO] ChromeDriverを同期中...
npm run sync-chromedriver
if %errorlevel% neq 0 (
    echo [ERROR] ChromeDriverの同期に失敗しました
    pause
    exit /b 1
)

REM 5. 環境変数の設定
echo.
echo [INFO] 環境変数を設定中...
if not exist ".env.local" (
    echo # X Auto DM 環境変数 > .env.local
    echo # Chrome設定 >> .env.local
    echo CHROME_HEADLESS=false >> .env.local
    echo [SUCCESS] .env.localファイルを作成しました
) else (
    echo [SUCCESS] .env.localファイルは既に存在します
)

REM 6. 完了メッセージ
echo.
echo [SUCCESS] 環境構築が完了しました！
echo.
echo 📋 次の手順を実行してください：
echo 1. 'npm run dev' でアプリケーションを起動
echo 2. ブラウザで http://localhost:3000 にアクセス
echo 3. アプリ内でXログイン情報を設定
echo.
echo 📋 トラブルシューティング：
echo - ChromeDriverのバージョンが合わない場合: npm run sync-chromedriver
echo - 依存関係の問題: rmdir /s /q node_modules ^&^& del package-lock.json ^&^& npm install
echo - Windowsで権限エラーが出る場合: 管理者としてコマンドプロンプトを実行
echo.
echo [SUCCESS] 環境構築スクリプトが正常に完了しました！
echo.
pause
