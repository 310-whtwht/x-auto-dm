import { NextResponse } from "next/server";
import path from "path";
import { spawn } from "child_process";

export async function POST(request: Request) {
  try {
    const { username, url } = await request.json();

    console.log("フォロワー取得リクエスト受信:", {
      username,
      url,
    });

    if (!username || !url) {
      return NextResponse.json(
        {
          success: false,
          error: "必要なパラメータが不足しています",
        },
        { status: 400 }
      );
    }

    const result = await handleJavaScriptExecution(username, url);

    return NextResponse.json(result);
  } catch (error) {
    console.error("APIエラー:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "不明なエラーが発生しました",
      },
      { status: 500 }
    );
  }
}

const handleJavaScriptExecution = async (username: string, url: string) => {
  return new Promise((resolve, reject) => {
    console.log("JavaScript実行パラメータ:", {
      username,
      url,
    });

    // JavaScriptスクリプトを実行
    const scriptPath = path.join(process.cwd(), "src", "lib", "scraper.js");
    const childProcess = spawn("node", [scriptPath, username, url]);

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
        // JavaScriptスクリプトからの出力を解析
        const lines = outputData.trim().split("\n");
        const lastLine = lines[lines.length - 1] || "";
        
        // JSON形式の出力を探す
        let result;
        try {
          result = JSON.parse(lastLine);
        } catch (e) {
          // 最後の行がJSONでない場合、出力全体から結果を構築
          const followers: any[] = [];
          const csvPath = outputData.match(/CSV保存完了: (.+)/)?.[1] || "";
          const count = outputData.match(/総フォロワー数: (\d+)/)?.[1] || "0";
          
          result = {
            success: code === 0,
            followers: followers,
            count: parseInt(count),
            csvPath: csvPath,
            error: errorData || (code !== 0 ? "スクリプト実行エラー" : "")
          };
        }

        resolve({
          success: result.success,
          error: result.error || errorData,
          followers: result.followers || [],
          count: result.count || 0,
          csvPath: result.csvPath || "",
        });
      } catch (e) {
        console.error("JSON parse error:", e);
        resolve({
          success: false,
          error: `Failed to parse JavaScript output: ${outputData}\nError: ${errorData}`,
          followers: [],
          count: 0,
          csvPath: "",
        });
      }
    });
  });
};
