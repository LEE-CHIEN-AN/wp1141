import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { handleLineMessage } from "@/lib/bottender/handlers";
import { createTextMessage } from "@/lib/utils/line-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function replyToLine(
  replyToken: string,
  messages: Array<{ type: string; text?: string; [key: string]: any }>
) {
  const formattedMessages = messages.map((msg) => {
    if (msg.type === "text") {
      return { type: "text", text: msg.text };
    }
    if (msg.type === "template") {
      return msg;
    }
    // 處理 quickReply
    if (msg.quickReply) {
      return {
        type: "text",
        text: msg.text,
        quickReply: msg.quickReply,
      };
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

function verifySignature(body: string, signature: string): boolean {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret) {
    return false;
  }

  const hash = crypto
    .createHmac("sha256", channelSecret)
    .update(body)
    .digest("base64");

  return hash === signature;
}

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
    if (!verifySignature(body, signature)) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const events = JSON.parse(body).events;

    for (const event of events) {
      const userId = event.source.userId;
      if (!userId) continue;

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

      if (event.type === "message" && event.message.type === "text") {
        const messages = await handleLineMessage({
          userId,
          displayName,
          pictureUrl,
          message: event.message.text,
          messageId: event.message.id,
        });

        if (event.replyToken) {
          await replyToLine(event.replyToken, messages as any);
        }
      } else if (event.type === "postback") {
        const messages = await handleLineMessage({
          userId,
          displayName,
          pictureUrl,
          message: "",
          postbackData: event.postback.data,
        });

        if (event.replyToken) {
          await replyToLine(event.replyToken, messages as any);
        }
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

