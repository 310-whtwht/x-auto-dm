# X Auto DM

X（旧 Twitter）のフォロワーに対して自動で DM を送信するツールです。

## 環境構築

### 必要なもの

- Python 3.8 以上
- Chrome ブラウザ
- Node.js 16 以上

### セットアップ手順

1. リポジトリをクローン

```bash
git clone [リポジトリURL]
cd x-send-dm
```

2. Python 環境のセットアップ

```bash
# 仮想環境の作成
python -m venv venv

# 仮想環境の有効化
# Windowsの場合
venv\Scripts\activate
# Mac/Linuxの場合
source venv/bin/activate

# 依存関係のインストール
pip install -r requirements.txt
```

3. Node.js 環境のセットアップ

```bash
# 依存関係のインストール
npm install
```

4. アプリケーションの起動

```bash
# 開発サーバーの起動
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
