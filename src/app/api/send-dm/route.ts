import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { User } from "@/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user, message, settings } = body;

    console.log("リクエスト受信:", { user, message, settings });

    if (!user || !message || !settings) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "ユーザー、メッセージ、設定は必須です",
        }),
        { status: 400 }
      );
    }

    const { interval, dailyLimit } = settings;
    const args = [
      JSON.stringify(user),
      message,
      interval.min.toString(),
      interval.max.toString(),
      dailyLimit.toString(),
    ];

    console.log("Python実行パラメータ:", {
      user: JSON.stringify(user),
      message,
      min: settings.interval.min,
      max: settings.interval.max,
      limit: settings.dailyLimit,
    });

    return await handlePythonExecution(user, message, settings);
  } catch (error) {
    console.error("APIエラー:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "DM送信中にエラーが発生しました",
      }),
      { status: 500 }
    );
  }
}

async function handlePythonExecution(
  user: User,
  message: string,
  settings: { interval: { min: number; max: number }; dailyLimit: number }
) {
  return new Promise((resolve) => {
    const pythonProcess = spawn("python3", [
      "scripts/send_dm.py",
      JSON.stringify(user),
      message,
      settings.interval.min.toString(),
      settings.interval.max.toString(),
      settings.dailyLimit.toString(),
    ]);

    let output = "";
    let errorOutput = "";

    pythonProcess.stdout.on("data", (data) => {
      output += data.toString();
      console.log("Python出力:", data.toString());
    });

    pythonProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
      console.error("Pythonエラー:", data.toString());
    });

    pythonProcess.on("close", (code) => {
      if (code === 0) {
        resolve(
          new Response(
            JSON.stringify({
              success: true,
              output,
            }),
            { status: 200 }
          )
        );
      } else {
        resolve(
          new Response(
            JSON.stringify({
              success: false,
              error: errorOutput || "Python実行エラー",
              code,
            }),
            { status: 500 }
          )
        );
      }
    });
  });
}
