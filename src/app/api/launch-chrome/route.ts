import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";

const execAsync = promisify(exec);

// Chromeのパスを検索する関数
async function findChromePath(): Promise<string> {
  const possiblePaths = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  throw new Error("Chromeが見つかりませんでした");
}

// ポートが使用中かチェックする関数
async function isPortInUse(port: number): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`lsof -i :${port}`);
    return stdout.length > 0;
  } catch {
    return false;
  }
}

// Chromeプロセスを終了する関数
async function killChromeProcesses(): Promise<void> {
  try {
    // Chromeプロセスを終了
    await execAsync("pkill -f 'Google Chrome'");
    console.log("既存のChromeプロセスを終了しました");

    // 少し待機
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // まだ残っているプロセスがあれば強制終了
    try {
      await execAsync("pkill -9 -f 'Google Chrome'");
      console.log("残存Chromeプロセスを強制終了しました");
    } catch (error) {
      // 強制終了するプロセスがない場合は無視
    }
  } catch (error) {
    console.log("終了するChromeプロセスが見つかりませんでした");
  }
}

export async function POST() {
  try {
    const port = 9222;

    // 既存のChromeプロセスを終了
    console.log("既存のChromeプロセスを終了中...");
    await killChromeProcesses();

    // ChromeDriverプロセスも終了
    try {
      await execAsync("pkill -f chromedriver");
      console.log("ChromeDriverプロセスを終了しました");
    } catch (error) {
      console.log("終了するChromeDriverプロセスが見つかりませんでした");
    }

    // 少し待機してからポートをチェック
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // ポートの競合をチェック
    if (await isPortInUse(port)) {
      console.log("ポートがまだ使用中です。強制終了を試行...");
      try {
        await execAsync(`lsof -ti:${port} | xargs kill -9`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.log("ポートの強制終了に失敗しました");
      }
    }

    // Chromeのパスを検索
    const chromePath = await findChromePath();

    // プロジェクト固有のユーザーデータディレクトリを使用
    const userDataDir = "./chrome-profile-with-login";

    // headlessモードの設定（環境変数で制御、デフォルトはfalse）
    const headless = process.env.CHROME_HEADLESS === "true";
    const headlessArg = headless ? "--headless" : "";

    const command = `"${chromePath}" --remote-debugging-port=${port} --user-data-dir="${userDataDir}" ${headlessArg} --no-first-run --no-default-browser-check`;

    // Chromeをバックグラウンドで起動
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("Chrome起動エラー:", error);
      }
      if (stderr) {
        console.error("Chrome起動エラー:", stderr);
      }
    });

    // Chromeの起動を待機
    await new Promise((resolve) => setTimeout(resolve, 3000));

    return NextResponse.json({
      success: true,
      message: "デバッグモードでChromeを起動しました",
      path: chromePath,
    });
  } catch (error) {
    console.error("Chrome起動エラー:", error);
    const errorMessage =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
    return NextResponse.json(
      { error: `Chromeの起動に失敗しました: ${errorMessage}` },
      { status: 500 }
    );
  }
}
