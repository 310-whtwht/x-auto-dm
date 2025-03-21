import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST() {
  try {
    // MacOSの場合
    const command =
      "/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222";

    // Windowsの場合
    // const command = 'start chrome --remote-debugging-port=9222';

    await execAsync(command);

    return NextResponse.json({
      success: true,
      message: "デバッグモードでChromeを起動しました",
    });
  } catch (error) {
    console.error("Chrome起動エラー:", error);
    return NextResponse.json(
      { error: "Chromeの起動に失敗しました" },
      { status: 500 }
    );
  }
}
