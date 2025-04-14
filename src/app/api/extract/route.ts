import { exec } from "child_process";
import { NextResponse } from "next/server";
import path from "path";

export async function POST(request: Request): Promise<Response> {
  try {
    const { url } = await request.json();

    // URLからユーザー名を抽出
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    const targetUsername = pathParts[1];

    if (!targetUsername) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Pythonスクリプトのパスを取得
    const scriptPath = path.join(
      process.cwd(),
      "scripts",
      "scrape_followers.py"
    );
    console.log("Script path:", scriptPath);
    console.log("Target username:", targetUsername);

    return new Promise<Response>((resolve) => {
      // Pythonスクリプトを実行
      const pythonProcess = exec(
        `python3 "${scriptPath}" "${targetUsername}"`,
        {
          env: {
            ...process.env,
            TWITTER_USERNAME: process.env.TWITTER_USERNAME,
            TWITTER_PASSWORD: process.env.TWITTER_PASSWORD,
            PATH: process.env.PATH,
          },
        },
        (error, stdout, stderr) => {
          console.log("stdout:", stdout);
          console.log("stderr:", stderr);

          if (error) {
            console.error("Execution error:", error);
            resolve(
              NextResponse.json({ error: error.message }, { status: 500 })
            );
            return;
          }

          resolve(
            NextResponse.json({
              success: true,
              message: "テスト実行が完了しました",
              output: stdout,
            })
          );
        }
      );
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
