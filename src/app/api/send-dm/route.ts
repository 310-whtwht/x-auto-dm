import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { User } from "@/types";

export async function POST(request: Request) {
  try {
    const { user, message, settings } = await request.json();

    console.log("リクエスト受信:", { user, message, settings });

    if (!user || !message || !settings) {
      return NextResponse.json(
        {
          success: false,
          error: "必要なパラメータが不足しています",
          status: "error",
        },
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

    const result = await handlePythonExecution(user, message, settings);

    return NextResponse.json(result);
  } catch (error) {
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

const handlePythonExecution = async (
  user: User,
  message: string,
  settings: any
) => {
  return new Promise((resolve, reject) => {
    const process = spawn("python", [
      "scripts/send_dm.py",
      JSON.stringify(user),
      message,
      settings.interval.min.toString(),
      settings.interval.max.toString(),
      settings.dailyLimit.toString(),
    ]);

    let outputData = "";
    let errorData = "";

    process.stdout.on("data", (data) => {
      outputData += data.toString();
      console.log("Python stdout:", data.toString());
    });

    process.stderr.on("data", (data) => {
      errorData += data.toString();
      console.log("Python stderr:", data.toString());
    });

    process.on("close", (code) => {
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
          error: `Failed to parse Python output: ${outputData}\nError: ${errorData}`,
          status: "error",
        });
      }
    });
  });
};
