import { NextRequest, NextResponse } from "next/server";
import bot from "@/lib/bottender";
import { handleLineMessage } from "@/lib/bottender/handlers";
import * as crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 發送回應到 LINE
 */
async function sendReplyToLine(
  replyToken: string,
  messages: Array<{ type: string; [key: string]: any }>
) {
  const formattedMessages = messages.map((msg) => {
    if (msg.type === "text") {
      if ("quickReply" in msg && msg.quickReply) {
        return {
          type: "text",
          text: msg.text,
          quickReply: msg.quickReply,
        };
      }
      return { type: "text", text: msg.text };
    }
    if (msg.type === "template") {
      return msg;
    }
    return msg;
  });

  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: formattedMessages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Line API error: ${error}`);
  }
}

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
    
    console.log("Received events:", events.length);
    events.forEach((event: any) => {
      console.log("Event type:", event.type, "Reply token:", event.replyToken);
    });

    // 處理每個事件
    for (const event of events) {
      try {
        const userId = event.source.userId;
        if (!userId) {
          console.log("No userId in event, skipping");
          continue;
        }

        // 獲取使用者資訊
        let displayName = "使用者";
        let pictureUrl: string | undefined;

        try {
          const profileResponse = await fetch(
            `https://api.line.me/v2/bot/profile/${userId}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
              },
            }
          );
          if (profileResponse.ok) {
            const profile = await profileResponse.json();
            displayName = profile.displayName || displayName;
            pictureUrl = profile.pictureUrl;
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }

        // 建立訊息上下文
        const messageContext: any = {
          userId,
          displayName,
          pictureUrl,
          message: "",
          postbackData: undefined as string | undefined,
        };

        // 處理不同類型的事件
        if (event.type === "message" && event.message.type === "text") {
          messageContext.message = event.message.text;
          messageContext.messageId = event.message.id;
        } else if (event.type === "postback") {
          messageContext.message = "";
          messageContext.postbackData = event.postback.data;
          console.log("Postback event received:", event.postback.data);
        } else if (event.type === "follow") {
          messageContext.message = "__FOLLOW__";
        } else {
          console.log("Unhandled event type:", event.type);
          continue;
        }

        // 處理訊息並取得回應
        const responses = await handleLineMessage(messageContext);
        console.log("Responses generated:", responses.length);

        // 如果有 replyToken，使用 LINE API 發送回應
        if (event.replyToken && responses.length > 0) {
          await sendReplyToLine(event.replyToken, responses);
          console.log("Reply sent successfully");
        } else {
          console.log("No replyToken or no responses");
        }
      } catch (error) {
        console.error("Error processing event:", error);
        console.error("Event details:", JSON.stringify(event, null, 2));
        continue;
      }
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
