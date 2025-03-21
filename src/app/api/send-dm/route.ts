import { NextResponse } from "next/server";
import { sendDM, connectToBrowser } from "@/lib/scraper";
import { User } from "@/types";

export async function POST(request: Request) {
  try {
    const { user, message } = await request.json();

    // 既存のブラウザセッションに接続
    await connectToBrowser();

    const success = await sendDM(user, message);

    return NextResponse.json({
      success,
      message: success ? "DMを送信しました" : "DM送信に失敗しました",
    });
  } catch (error) {
    console.error("DM送信エラー:", error);
    return NextResponse.json(
      { error: "DM送信中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
