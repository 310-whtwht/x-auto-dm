#!/bin/bash

# X Auto DM 環境構築スクリプト
# macOS用のワンストップ環境構築（Intel/ARM対応）

set -e  # エラー時に停止

echo "🚀 X Auto DM 環境構築を開始します..."

# アーキテクチャとシェルの検出
ARCH=$(uname -m)
CURRENT_SHELL=$(basename "$SHELL")

log_info() {
    echo -e "\033[34m[INFO]\033[0m $1"
}

log_success() {
    echo -e "\033[32m[SUCCESS]\033[0m $1"
}

log_warning() {
    echo -e "\033[33m[WARNING]\033[0m $1"
}

log_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

# アーキテクチャ情報を表示
if [ "$ARCH" = "x86_64" ]; then
    log_info "Intel Mac (x86_64) を検出しました"
elif [ "$ARCH" = "arm64" ]; then
    log_info "Apple Silicon Mac (ARM64) を検出しました"
else
    log_warning "未知のアーキテクチャ: $ARCH"
fi

# シェル設定ファイルのパスを決定
if [ "$CURRENT_SHELL" = "zsh" ]; then
    SHELL_RC="$HOME/.zshrc"
    SHELL_PROFILE="$HOME/.zprofile"
elif [ "$CURRENT_SHELL" = "bash" ]; then
    SHELL_RC="$HOME/.bashrc"
    SHELL_PROFILE="$HOME/.bash_profile"
else
    SHELL_RC="$HOME/.zshrc"
    SHELL_PROFILE="$HOME/.zprofile"
fi

# 1. Homebrewのインストール確認・インストール
log_info "Homebrewの確認中..."
if ! command -v brew &> /dev/null; then
    log_info "Homebrewをインストール中..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # アーキテクチャに応じたPATH設定
    if [ "$ARCH" = "x86_64" ]; then
        # Intel Mac用
        log_info "Intel Mac用のHomebrewパスを設定中..."
        echo 'eval "$(/usr/local/bin/brew shellenv)"' >> "$SHELL_PROFILE"
        eval "$(/usr/local/bin/brew shellenv)"
    else
        # Apple Silicon Mac用
        log_info "Apple Silicon Mac用のHomebrewパスを設定中..."
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> "$SHELL_PROFILE"
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
    log_success "Homebrewのインストールが完了しました"
else
    log_success "Homebrewは既にインストールされています"
fi

# 2. pyenvのインストール確認・インストール
log_info "pyenvの確認中..."
if ! command -v pyenv &> /dev/null; then
    log_info "pyenvをインストール中..."
    brew install pyenv
    
    # pyenvの初期化設定
    echo 'export PYENV_ROOT="$HOME/.pyenv"' >> "$SHELL_RC"
    echo 'command -v pyenv >/dev/null || export PATH="$PYENV_ROOT/bin:$PATH"' >> "$SHELL_RC"
    echo 'eval "$(pyenv init -)"' >> "$SHELL_RC"
    
    # 現在のシェルセッション用
    export PYENV_ROOT="$HOME/.pyenv"
    export PATH="$PYENV_ROOT/bin:$PATH"
    eval "$(pyenv init -)"
    
    log_success "pyenvのインストールが完了しました"
else
    log_success "pyenvは既にインストールされています"
fi

# 3. Python 3.11のインストール・設定
log_info "Python 3.11の確認中..."
if ! pyenv versions | grep -q "3.11"; then
    log_info "Python 3.11をインストール中..."
    pyenv install 3.11.2
    log_success "Python 3.11のインストールが完了しました"
else
    log_success "Python 3.11は既にインストールされています"
fi

# プロジェクトディレクトリでPython 3.11を使用
log_info "プロジェクト用のPython環境を設定中..."
pyenv local 3.11.2

# 4. Node.jsのインストール確認・インストール
log_info "Node.jsの確認中..."
if ! command -v node &> /dev/null; then
    log_info "Node.jsをインストール中..."
    brew install node
    log_success "Node.jsのインストールが完了しました"
else
    log_success "Node.jsは既にインストールされています"
fi

# 5. Google Chromeのインストール確認
log_info "Google Chromeの確認中..."
if ! ls /Applications/Google\ Chrome.app &> /dev/null; then
    log_warning "Google Chromeがインストールされていません"
    log_info "以下のURLからGoogle Chromeをインストールしてください:"
    log_info "https://www.google.com/chrome/"
    read -p "Google Chromeをインストールしましたか？ (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_error "Google Chromeのインストールが必要です"
        exit 1
    fi
else
    log_success "Google Chromeは既にインストールされています"
fi

# 6. Python依存関係のインストール
log_info "Python依存関係をインストール中..."
pip install -r requirements.txt

# 7. Node.js依存関係のインストール
log_info "Node.js依存関係をインストール中..."
npm install

# 8. ChromeDriverの同期
log_info "ChromeDriverを同期中..."
npm run sync-chromedriver

# 9. 環境変数の設定
log_info "環境変数を設定中..."
if [ ! -f .env.local ]; then
    cat > .env.local << EOF
# X Auto DM 環境変数
# Chrome設定
CHROME_HEADLESS=false
EOF
    log_success ".env.localファイルを作成しました"
else
    log_success ".env.localファイルは既に存在します"
fi

# 10. 権限の設定
log_info "スクリプトに実行権限を付与中..."
chmod +x scripts/*.py

# 11. 完了メッセージ
echo ""
log_success " 環境構築が完了しました！"
echo ""
echo "📋 システム情報:"
echo "   - アーキテクチャ: $ARCH"
echo "   - シェル: $CURRENT_SHELL"
echo "   - 設定ファイル: $SHELL_RC"
echo ""
echo "📋 次の手順を実行してください："
echo "1. 新しいターミナルを開くか、以下のコマンドでシェルを再読み込み："
echo "   source $SHELL_RC"
echo "2. 'npm run dev' でアプリケーションを起動"
echo "3. ブラウザで http://localhost:3000 にアクセス"
echo "4. アプリ内でXログイン情報を設定"
echo ""
echo " トラブルシューティング："
echo "- ChromeDriverのバージョンが合わない場合: npm run sync-chromedriver"
echo "- Python環境の問題: pyenv local 3.11.9"
echo "- 依存関係の問題: npm install && pip install -r requirements.txt"
echo "- ARM MacでHomebrewが見つからない場合: /opt/homebrew/bin/brew を確認"
echo ""
log_success "環境構築スクリプトが正常に完了しました！"