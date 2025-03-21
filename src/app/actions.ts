"use server";

import { User } from "@/types";
import puppeteer from "puppeteer";
import { extractNickname, replaceMessageVariables } from "@/lib/utils";
import fs from "fs/promises";
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import util from 'util';

// 待機用のユーティリティ関数
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface ExtractResponse {
  users: User[];
  logs: string[];
}

const execPromise = util.promisify(exec);

export async function launchChromeWithDebugger() {
  try {
    // Macの場合のChromeパス
    const chromePath = '/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome';
    const command = `${chromePath} --remote-debugging-port=9222`;
    
    const { stdout, stderr } = await execPromise(command);
    console.log('Chrome launched successfully');
    console.log('stdout:', stdout);
    
    if (stderr) {
      console.error('stderr:', stderr);
    }
    
    return true;
  } catch (error) {
    console.error('Error launching Chrome:', error);
    return false;
  }
}

export async function extractUsers(url: string): Promise<User[]> {
  const logs: string[] = [];
  let browser;
  let page;
  
  const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    logs.push(logMessage);
  };

  try {
    addLog(`サーバーサイド: extractUsers開始 { url: '${url}' }`);

    browser = await puppeteer.launch({
      headless: false,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
        "--window-size=1280,800"
      ],
      defaultViewport: { width: 1280, height: 800 }
    });
    addLog("ブラウザ起動成功");

    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    addLog("新規ページ作成成功");

    // ログインページに移動
    await page.goto("https://twitter.com/login", {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 60000
    });
    addLog("ログインページに移動");
    await wait(2000);

    // ユーザー名入力フィールドの待機
    addLog("ユーザー名入力フィールドを待機中...");
    await page.waitForSelector('input[name="text"]', { visible: true, timeout: 30000 });
    
    const usernameInput = await page.$('input[name="text"]');
    if (!usernameInput) {
      throw new Error("ユーザー名入力フィールドが見つかりません");
    }

    await usernameInput.type(process.env.TWITTER_USERNAME || "", { delay: 100 });
    addLog("ユーザー名入力完了");

    // 次へボタンを探して操作
    addLog("次へボタンを検索中...");
    await wait(1000);

    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      buttons[2].click();
    });
    addLog("次へボタンをクリック");

    // パスワード入力画面への遷移を待機
    await wait(3000);
    addLog("パスワード入力中...");

    // パスワード入力フィールドの待機
    await page.waitForSelector('input[name="password"]', { visible: true, timeout: 30000 });

    // フォーカスされている状態でパスワードを直接入力
    await page.keyboard.type(process.env.TWITTER_PASSWORD || "", { delay: 100 });
    addLog("パスワード入力完了");

    // ログインボタンをクリック
    await wait(1000);
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      console.log('ボタンの数:', buttons.length);
      
      // ボタンの情報をログ出力
      Array.from(buttons).forEach((button, index) => {
        console.log(`ボタン[${index}]:`, button.textContent);
      });
      
      if (buttons.length > 0) {
        // 最後のボタンをクリック（通常はログインボタン）
        buttons[buttons.length - 1].click();
      } else {
        throw new Error('ログインボタンが見つかりません');
      }
    });
    addLog("ログインボタンをクリック");

    // ログイン成功の確認
    addLog("ログイン成功の確認中...");
    try {
      await page.waitForSelector('main[role="main"]', { timeout: 30000 });
      addLog("メインコンテンツの読み込みを確認");
    } catch (error) {
      addLog("ログイン成功の確認に失敗");
      const html = await page.content();
      addLog(`現在のページHTML: ${html.substring(0, 500)}...`);
      throw new Error("ログインに失敗した可能性があります");
    }

    // フォロワーページに移動
    addLog(`フォロワーページに移動: ${url}`);
    await page.goto(url, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 60000
    });
    await wait(5000);

    // フォロワーリストの待機
    await page.waitForSelector('div[data-testid="cellInnerDiv"]', { timeout: 30000 });

    // フォロワー一覧画面でのスクレイピング処理を修正
    const followers: User[] = [];
    let lastHeight = 0;
    const scrollPauseTime = 2000; // 2秒

    while (true) {
      // ユーザー情報の取得
      const newUsers = await page.evaluate(() => {
        const users: any[] = [];
        const buttons = document.querySelectorAll('button');
        
        buttons.forEach(button => {
          const spans = button.querySelectorAll('span');
          const spanTexts = Array.from(spans)
            .map(span => span.textContent)
            .filter(text => text && text.trim().length > 0);

          if (spanTexts.length > 0) {
            let username = '';
            let userId = '';
            let profile = '';
            let profileStart = false;

            // Pythonコードと同様の解析ロジック
            spanTexts.forEach((text, index) => {
              if (!text) return;

              if (index === 0) {
                username = text;
              } else if (text.startsWith('@')) {
                userId = text.slice(1);
              } else if (['フォローされています', 'フォロー中'].includes(text)) {
                profileStart = true;
              } else if (profileStart) {
                profile += text + ' ';
              }
            });

            if (username && userId) {
              users.push({
                name: username,
                userId: userId,
                nickname: username.split(/[(@（｜]/, 1)[0],
                profile: profile.trim(),
                status: 'pending',
                isSend: false
              });
            }
          }
        });
        return users;
      });
      
      // 重複を除いて追加
      for (const user of newUsers) {
        if (!followers.some(f => f.userId === user.userId)) {
          followers.push(user);
        }
      }
      
      // スクロール処理の前に要素の読み込みを待機
      await wait(2000);
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await wait(2000);

      // 新しいコンテンツの読み込みを待機
      await page.waitForFunction(
        `document.body.scrollHeight > ${lastHeight}`,
        { timeout: 10000 }
      ).catch(() => {
        // タイムアウトした場合は終了とみなす
        return false;
      });
      
      // 新しい高さを取得
      const newHeight = await page.evaluate(() => document.body.scrollHeight);
      
      // スクロールの終了判定
      if (newHeight === lastHeight) {
        addLog(`スクロール終了: 最終高さ ${newHeight}px`);
        break;
      }
      
      lastHeight = newHeight;
      addLog(`スクロール継続: 現在の高さ ${newHeight}px`);
    }

    addLog(`取得したフォロワー数: ${followers.length}`);

    // 現在の日時を取得してファイル名を生成
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    const fileName = `${dateStr}_${timeStr}_drip-users.csv`;

    // デスクトップのパスを取得
    const desktopPath = path.join(os.homedir(), 'Desktop');
    const filePath = path.join(desktopPath, fileName);

    // CSVコンテンツの生成
    const csvContent = [
      ['username', 'id', 'nickname', 'profile'].join(','),
      ...followers.map(user => [
        user.name,
        user.userId,
        user.nickname,
        user.profile
      ].map(field => `"${field?.replace(/"/g, '""') || ''}"`).join(','))
    ].join('\n');

    // CSVファイルをデスクトップに保存
    await fs.writeFile(filePath, csvContent, 'utf-8');
    addLog(`CSVファイルを保存しました: ${fileName}`);

    addLog(`スクレイピング結果: ${followers.length}件のユーザーを取得`);
    await browser.close();
    addLog("ブラウザ終了");

    return followers;

  } catch (error) {
    addLog(`エラーが発生しました: ${error}`);
    if (error instanceof Error) {
      addLog(`エラーの詳細: ${error.stack}`);
    }
    // 現在のページのHTMLをログ出力（デバッグ用）
    if (page) {
      const html = await page.content();
      addLog(`現在のページHTML: ${html.substring(0, 500)}...`);
    }
    return [];
  } finally {
    if (browser) {
      await browser.close();
      addLog("ブラウザを終了");
    }
  }
}
