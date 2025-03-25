import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { User } from "@/types/user";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user, message } = body;

    console.log("リクエスト受信:", { user, message });

    if (!user || !message) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "ユーザーとメッセージは必須です",
        }),
        { status: 400 }
      );
    }

    // usePythonフラグに関係なく、常にPythonスクリプトを実行する
    return await handlePythonExecution(user, message);
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

async function handlePythonExecution(user: User, message: string) {
  return new Promise((resolve) => {
    const pythonProcess = spawn("python3", [
      "scripts/send_dm.py",
      JSON.stringify(user),
      message,
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
