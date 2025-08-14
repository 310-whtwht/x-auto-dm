# X Auto DM

X（旧 Twitter）のフォロワーに対して自動で DM を送信するツールです。

## 環境構築

### クイックスタート（推奨）

```bash
# リポジトリをクローン
git clone [リポジトリURL]
cd x-send-dm

# ワンコマンドで環境構築
npm run setup

# アプリケーション起動
npm run dev
```

ブラウザで http://localhost:3000 にアクセスしてください。

### 手動セットアップ

#### 必要なもの

- macOS (Intel/Apple Silicon対応)
- Google Chrome
- インターネット接続

#### 詳細なセットアップ手順

1. **Homebrewのインストール**
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **pyenvのインストール**
   ```bash
   brew install pyenv
   echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.zshrc
   echo 'command -v pyenv >/dev/null || export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.zshrc
   echo 'eval "$(pyenv init -)"' >> ~/.zshrc
   ```

3. **Python 3.11のインストール**
   ```bash
   pyenv install 3.11.9
   pyenv local 3.11.9
   ```

4. **Node.jsのインストール**
   ```bash
   brew install node
   ```

5. **依存関係のインストール**
   ```bash
   # Python依存関係
   pip install -r requirements.txt
   
   # Node.js依存関係
   npm install
   
   # ChromeDriver同期
   npm run sync-chromedriver
   ```

6. **アプリケーション起動**
   ```bash
   npm run dev
   ```

## 使用方法

1. Chrome ブラウザをデバッグモードで起動

```bash
# Macの場合
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
```

2. フォロワー情報の抽出

```bash
python scripts/scrape_followers.py [ターゲットユーザー名]
```

3. アプリケーションで CSV ファイルをインポートし、DM 送信を開始

## 注意事項

- Chrome のデバッグモードで起動する際は、既存の Chrome プロセスをすべて終了させてください
- フォロワー情報の抽出時は、X にログインした状態で実行してください
- DM 送信は 1 日の制限があるため、適切な間隔を設定してください

## 設定項目

### 基本設定

- フォロワー URL: 抽出対象とする Twitter のフォロワーページの URL
- メッセージテンプレート: 送信する DM のテンプレート（複数設定可能）
- 送信間隔: DM を送信する間隔（秒）
- 1 日の送信上限: 24 時間あたりの最大送信数
- DM 送信前にフォロー: 送信前に自動フォローを行うかどうか

## トラブルシューティング

### Chrome 起動時のエラー

- Chrome が既に起動している場合は、すべての Chrome ウィンドウを完全に終了してから再試行してください
- デバッグポート(9222)が既に使用されている場合は、PC を再起動してください

### DM 送信エラー

- X(Twitter)にログインしていることを確認してください
- 送信間隔が短すぎる場合は、設定画面で間隔を長くしてください
- 1 日の送信上限に達している場合は、24 時間待つ必要があります

## 注意事項

- このツールは自己責任で使用してください
- Twitter の利用規約に違反する使用方法は避けてください
- 大量の DM 送信はアカウントの制限対象となる可能性があります

## ライセンス

MIT License

## 開発者向け情報

### 使用技術

- Next.js 14
- TypeScript
- Material-UI
- Python (Selenium)

### プロジェクト構造

```
x-send-dm/
├── src/
│ ├── app/ # Next.jsページコンポーネント
│ ├── components/ # 共通コンポーネント
│ ├── contexts/ # Reactコンテキスト
│ ├── hooks/ # カスタムフック
│ ├── lib/ # ユーティリティ関数
│ └── types/ # 型定義
├── scripts/ # Pythonスクリプト
├── public/ # 静的ファイル
└── package.json # 依存関係の定義
```

### ビルド方法

```bash
# 開発ビルド
npm run dev

# プロダクションビルド
npm run build
npm start
```

```

このREADMEには以下の内容が含まれています：

1. プロジェクトの概要
2. 必要要件
3. セットアップ手順
4. 使用方法
5. 設定項目の説明
6. トラブルシューティング
7. 注意事項
8. ライセンス情報
9. 開発者向け情報
```
