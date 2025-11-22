import { NextRequest, NextResponse } from "next/server";
import bot from "@/lib/bottender";
import * as crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * LINE Webhook 端點
 * 使用 Bottender 框架處理 LINE 事件
 * 
 * 注意：由於 Next.js App Router 的限制，我們使用 Bottender 的 bot.onEvent 處理器
 * 但 webhook 路由本身需要手動處理，因為 Bottender 主要設計用於 Express 等傳統框架
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-line-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    // 驗證簽章
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    if (!channelSecret) {
      return NextResponse.json(
        { error: "Channel secret not configured" },
        { status: 500 }
      );
    }

    const hash = crypto
      .createHmac("sha256", channelSecret)
      .update(body)
      .digest("base64");

    if (hash !== signature) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // 解析事件
    const events = JSON.parse(body).events;

    // 處理每個事件 - 使用 Bottender 的 bot.onEvent 處理器
    for (const event of events) {
      // 建立 Bottender session
      const session = {
        id: event.source.userId || "",
        isFirstSession: false,
      };

      // 使用 Bottender connector 建立 context
      // 注意：這裡使用 Bottender 的內部 API，因為 Next.js App Router 的限制
      const context = (bot.connector as any).createContext({
        event,
        session,
      });

      // 觸發 Bottender 事件處理器
      await bot.onEvent(context);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok" });
}
