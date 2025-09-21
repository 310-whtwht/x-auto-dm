import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { User } from "@/types";

export async function POST(request: Request) {
  try {
    const { user, message, settings, currentSendCount } = await request.json();
    const signal = request.signal; // AbortSignalを取得

    console.log("リクエスト受信:", {
      user,
      message,
      settings,
      currentSendCount,
    });

    if (!user || !message || !settings || currentSendCount === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "必要なパラメータが不足しています",
          status: "error",
        },
        { status: 400 }
      );
    }

    // 送信上限チェック
    if (currentSendCount >= settings.dailyLimit) {
      return NextResponse.json(
        {
          success: false,
          error: `1日の送信上限(${settings.dailyLimit}件)に達しています`,
          status: "error",
        },
        { status: 400 }
      );
    }

    // settingsオブジェクトにcurrentSendCountを追加
    const settingsWithCount = {
      ...settings,
      currentSendCount,
    };

    const result = await handleJavaScriptExecution(
      user,
      message,
      settingsWithCount,
      signal
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { success: false, error: "処理が中断されました", status: "error" },
        { status: 499 } // Client Closed Request
      );
    }
    console.error("APIエラー:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "不明なエラーが発生しました",
        status: "error",
      },
      { status: 500 }
    );
  }
}

const handleJavaScriptExecution = async (
  user: User,
  message: string,
  settings: any,
  signal?: AbortSignal
) => {
  return new Promise((resolve, reject) => {
    // JavaScript実行時のパラメータをログ出力
    console.log("JavaScript実行パラメータ:", {
      user: JSON.stringify(user),
      message,
      min: settings.interval.min,
      max: settings.interval.max,
      limit: settings.dailyLimit,
      followBeforeDM: settings.followBeforeDM,
      currentSendCount: settings.currentSendCount,
    });

    // JavaScriptスクリプトを実行
    const scriptPath = path.join(process.cwd(), "src", "lib", "dmSender.js");
    const childProcess = spawn("node", [
      scriptPath,
      JSON.stringify(user),
      message,
      settings.interval.min.toString(),
      settings.interval.max.toString(),
      settings.dailyLimit.toString(),
      settings.followBeforeDM.toString(),
      settings.currentSendCount.toString(),
    ]);

    let outputData = "";
    let errorData = "";

    childProcess.stdout.on("data", (data) => {
      outputData += data.toString();
      console.log("JavaScript stdout:", data.toString());
    });

    childProcess.stderr.on("data", (data) => {
      errorData += data.toString();
      console.log("JavaScript stderr:", data.toString());
    });

    childProcess.on("close", (code) => {
      console.log("Process output:", outputData);
      console.log("Process error:", errorData);
      console.log("Exit code:", code);

      try {
        const lastLine =
          outputData
            .trim()
            .split("\n")
            .pop() || "";
        const result = JSON.parse(lastLine);

        resolve({
          success: result.success,
          error: result.error || errorData,
          status: result.status,
        });
      } catch (e) {
        console.error("JSON parse error:", e);
        resolve({
          success: false,
          error: `Failed to parse JavaScript output: ${outputData}\nError: ${errorData}`,
          status: "error",
        });
      }
    });

    if (signal) {
      signal.addEventListener("abort", () => {
        childProcess.kill();
        reject(new Error("Operation cancelled"));
      });
    }
  });
};
