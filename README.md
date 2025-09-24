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

- macOS (Intel/Apple Silicon 対応)
- Google Chrome
- インターネット接続

#### 詳細なセットアップ手順

1. **Homebrew のインストール**

   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Node.js のインストール**

   ```bash
   brew install node
   ```

3. **依存関係のインストール**

   ```bash
   # Node.js依存関係
   npm install

   # ChromeDriver同期
   npm run sync-chromedriver
   ```

4. **アプリケーション起動**
   ```bash
   npm run dev
   ```

## 使用方法

1. Chrome ブラウザをデバッグモードで起動

```bash
# Macの場合
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
```

2. アプリケーションでフォロワー情報を取得し、DM 送信を開始

## 注意事項

- DM 送信は 1 日の制限があるため、適切な間隔を設定してください

## 設定項目

### 基本設定

- フォロワー URL: 抽出対象とする Twitter のフォロワーページの URL
- メッセージテンプレート: 送信する DM のテンプレート（複数設定可能）
- 送信間隔: DM を送信する間隔（秒）
- 1 日の送信上限: 24 時間あたりの最大送信数
- DM 送信前にフォロー: 送信前に自動フォローを行うかどうか

## トラブルシューティング

### DM 送信エラー

- X(Twitter)にログインしていることを確認してください
- 送信間隔が短すぎる場合は、設定画面で間隔を長くしてください
- 1 日の送信上限に達している場合は、24 時間待つ必要があります

### ChromeDriver バージョンエラー

Chrome がアップデートされた後に以下のエラーが発生した場合：

```
chromedriver version (139.0.6943.98) ... might not be compatible with ... chrome version (140.0.xxxx.xx)
```

**解決方法：**

1. **自動同期（推奨）**

   ```bash
   npm run sync-chromedriver
   ```

2. **手動でのバージョン確認**

   ```bash
   # Chromeのバージョンを確認
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --version

   # ChromeDriverのバージョンを確認
   ./node_modules/.bin/chromedriver --version
   ```

3. **手動で ChromeDriver を更新**

   ```bash
   npm install chromedriver@latest
   ```

4. **完全再インストール（上記で解決しない場合）**
   ```bash
   npm uninstall chromedriver
   npm install chromedriver
   ```

**予防策：**

- Chrome の自動アップデートを有効にしている場合は、定期的に `npm run sync-chromedriver` を実行
- 週に 1 回程度の定期チェックを推奨

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
- Electron

### プロジェクト構造

```
x-auto-dm/
├── src/
│ ├── app/ # Next.jsページコンポーネント
│ ├── components/ # 共通コンポーネント
│ ├── hooks/ # カスタムフック
│ ├── lib/ # ユーティリティ関数
│ └── types/ # 型定義
├── electron/ # Electronメインプロセス
├── dist/ # ビルド成果物
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
