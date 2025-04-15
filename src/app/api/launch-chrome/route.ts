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

export async function POST() {
  try {
    // ポートの競合をチェック
    const port = 9222;
    if (await isPortInUse(port)) {
      return NextResponse.json(
        {
          error: `ポート ${port} は既に使用中です。別のChromeインスタンスが実行中かもしれません。`,
        },
        { status: 500 }
      );
    }

    // Chromeのパスを検索
    const chromePath = await findChromePath();
    const command = `"${chromePath}" --remote-debugging-port=${port}`;

    // Chromeを起動
    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      console.error("Chrome起動エラー:", stderr);
      return NextResponse.json(
        { error: `Chromeの起動中にエラーが発生しました: ${stderr}` },
        { status: 500 }
      );
    }

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
