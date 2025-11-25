import { NextRequest, NextResponse } from "next/server";
import bot from "@/lib/bottender";
import { handleLineMessage } from "@/lib/bottender/handlers";
import * as crypto from "crypto";
import connectDB from "@/lib/db/connection";
import Message from "@/lib/db/models/Message";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 發送回應到 LINE（使用 Reply API）
 * 支援所有 LINE 訊息類型：text, template (buttons, carousel), quickReply
 */
async function sendReplyToLine(
  replyToken: string,
  messages: Array<{ type: string; [key: string]: any }>
) {
  const formattedMessages = messages.map((msg) => {
    // 處理文字訊息
    if (msg.type === "text") {
      const textMsg: any = {
        type: "text",
        text: msg.text,
      };
      
      // 如果有 quickReply，加入 quickReply
      if ("quickReply" in msg && msg.quickReply) {
        textMsg.quickReply = {
          items: msg.quickReply.items.map((item: any) => {
            const quickReplyItem: any = {
              type: "action",
              action: {},
            };
            
            if (item.action.type === "postback") {
              quickReplyItem.action = {
                type: "postback",
                label: item.action.label,
                data: item.action.data || "",
                displayText: item.action.displayText || item.action.label,
              };
            } else if (item.action.type === "message") {
              quickReplyItem.action = {
                type: "message",
                label: item.action.label,
                text: item.action.text || item.action.label,
              };
            } else if (item.action.type === "uri") {
              quickReplyItem.action = {
                type: "uri",
                label: item.action.label,
                uri: item.action.uri || "",
              };
            }
            
            return quickReplyItem;
          }),
        };
      }
      
      return textMsg;
    }
    
    // 處理 Flex Message
    if (msg.type === "flex") {
      return {
        type: "flex",
        altText: msg.altText,
        contents: msg.contents,
      };
    }
    
    // 處理 Template 訊息（Button Template 或 Carousel Template）
    if (msg.type === "template") {
      const templateMsg: any = {
        type: "template",
        altText: msg.altText,
        template: {
          type: msg.template.type,
        },
      };
      
      // Button Template
      if (msg.template.type === "buttons") {
        templateMsg.template.text = msg.template.text;
        templateMsg.template.actions = msg.template.actions.map((action: any) => {
          const formattedAction: any = {
            type: action.type,
            label: action.label,
          };
          
          if (action.type === "postback") {
            formattedAction.data = action.data || "";
            formattedAction.displayText = action.displayText || action.label;
          } else if (action.type === "message") {
            formattedAction.text = action.text || action.label;
          } else if (action.type === "uri") {
            formattedAction.uri = action.uri || "";
          }
          
          return formattedAction;
        });
      }
      
      // Carousel Template
      if (msg.template.type === "carousel") {
        templateMsg.template.columns = msg.template.columns.map((column: any) => {
          const formattedColumn: any = {
            text: column.text,
            actions: column.actions.map((action: any) => {
              const formattedAction: any = {
                type: action.type,
                label: action.label,
              };
              
              if (action.type === "postback") {
                formattedAction.data = action.data || "";
                formattedAction.displayText = action.displayText || action.label;
              } else if (action.type === "message") {
                formattedAction.text = action.text || action.label;
              } else if (action.type === "uri") {
                formattedAction.uri = action.uri || "";
              }
              
              return formattedAction;
            }),
          };
          
          if (column.title) {
            formattedColumn.title = column.title;
          }
          
          return formattedColumn;
        });
      }
      
      return templateMsg;
    }
    
    // 其他類型的訊息直接返回
    return msg;
  });

  console.log("Sending messages to LINE API:", JSON.stringify(formattedMessages, null, 2));

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
    console.error("LINE API error:", error);
    
    // 如果是 Invalid reply token 錯誤，可能是重新投遞的事件
    // 這種情況下 reply token 已失效，無法使用 Reply API
    if (error.includes("Invalid reply token")) {
      throw new Error("INVALID_REPLY_TOKEN");
    }
    
    throw new Error(`Line API error: ${error}`);
  }
  
  console.log("Messages sent successfully via LINE API");
}

/**
 * 使用 Push Message API 發送訊息（當 reply token 失效時使用）
 */
async function sendPushMessage(
  userId: string,
  messages: Array<{ type: string; [key: string]: any }>
) {
  // 使用與 sendReplyToLine 相同的格式化邏輯
  const formattedMessages = messages.map((msg) => {
    if (msg.type === "text") {
      const textMsg: any = {
        type: "text",
        text: msg.text,
      };
      
      if ("quickReply" in msg && msg.quickReply) {
        textMsg.quickReply = {
          items: msg.quickReply.items.map((item: any) => {
            const quickReplyItem: any = {
              type: "action",
              action: {},
            };
            
            if (item.action.type === "postback") {
              quickReplyItem.action = {
                type: "postback",
                label: item.action.label,
                data: item.action.data || "",
                displayText: item.action.displayText || item.action.label,
              };
            } else if (item.action.type === "message") {
              quickReplyItem.action = {
                type: "message",
                label: item.action.label,
                text: item.action.text || item.action.label,
              };
            } else if (item.action.type === "uri") {
              quickReplyItem.action = {
                type: "uri",
                label: item.action.label,
                uri: item.action.uri || "",
              };
            }
            
            return quickReplyItem;
          }),
        };
      }
      
      return textMsg;
    }
    
    if (msg.type === "flex") {
      return {
        type: "flex",
        altText: msg.altText,
        contents: msg.contents,
      };
    }
    
    if (msg.type === "template") {
      const templateMsg: any = {
        type: "template",
        altText: msg.altText,
        template: {
          type: msg.template.type,
        },
      };
      
      if (msg.template.type === "buttons") {
        templateMsg.template.text = msg.template.text;
        templateMsg.template.actions = msg.template.actions.map((action: any) => {
          const formattedAction: any = {
            type: action.type,
            label: action.label,
          };
          
          if (action.type === "postback") {
            formattedAction.data = action.data || "";
            formattedAction.displayText = action.displayText || action.label;
          } else if (action.type === "message") {
            formattedAction.text = action.text || action.label;
          } else if (action.type === "uri") {
            formattedAction.uri = action.uri || "";
          }
          
          return formattedAction;
        });
      }
      
      if (msg.template.type === "carousel") {
        templateMsg.template.columns = msg.template.columns.map((column: any) => {
          const formattedColumn: any = {
            text: column.text,
            actions: column.actions.map((action: any) => {
              const formattedAction: any = {
                type: action.type,
                label: action.label,
              };
              
              if (action.type === "postback") {
                formattedAction.data = action.data || "";
                formattedAction.displayText = action.displayText || action.label;
              } else if (action.type === "message") {
                formattedAction.text = action.text || action.label;
              } else if (action.type === "uri") {
                formattedAction.uri = action.uri || "";
              }
              
              return formattedAction;
            }),
          };
          
          if (column.title) {
            formattedColumn.title = column.title;
          }
          
          return formattedColumn;
        });
      }
      
      return templateMsg;
    }
    
    return msg;
  });

  console.log("Sending push message to LINE API for user:", userId);

  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      to: userId,
      messages: formattedMessages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("LINE Push API error:", error);
    throw new Error(`Line Push API error: ${error}`);
  }
  
  console.log("Push message sent successfully via LINE API");
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
    const requestId = crypto.randomUUID();
    const requestStart = Date.now();
    console.log(
      `[perf][req:${requestId}] T0 Received LINE webhook request (events=${events.length})`
    );

    // 處理每個事件
    for (const event of events) {
      try {
        const userId = event.source.userId;
        if (!userId) {
          console.log("No userId in event, skipping");
          continue;
        }
        const eventId = event.webhookEventId || event.id || crypto.randomUUID();
        const perfLabel = `[perf][req:${requestId}][event:${eventId}]`;
        const eventStart = Date.now();
        console.log(
          `${perfLabel} T0 Event start type=${event.type} redelivery=${event.deliveryContext?.isRedelivery ?? false}`
        );

        // 連線 MongoDB，並記錄耗時
        const connectStart = Date.now();
        console.log(`${perfLabel} T1 Connecting MongoDB...`);
        await connectDB();
        console.log(
          `${perfLabel} T2 MongoDB ready in ${Date.now() - connectStart}ms`
        );

        // 檢查是否為重複訊息（文字訊息、postback 都需要避免重送）
        if (
          (event.type === "message" && event.message.type === "text") ||
          event.type === "postback"
        ) {
          const dedupStart = Date.now();
          console.log(`${perfLabel} T3 Dedup check start`);
          const existingMessage = await Message.findOne({
            webhookEventId: eventId,
            role: "user",
          });
          console.log(
            `${perfLabel} T4 Dedup check result=${existingMessage ? "HIT" : "MISS"} in ${Date.now() - dedupStart}ms`
          );
          if (existingMessage) {
            console.log(
              `${perfLabel} T4-1 Duplicate webhook event detected, skipping`
            );
            continue;
          }
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
          messageContext.postbackDisplayText =
            event.postback?.displayText ||
            event.postback?.params?.newRichMenuAliasId ||
            event.postback?.data;
          console.log(
            "Postback event received:",
            event.postback.data,
            "displayText:",
            messageContext.postbackDisplayText
          );
        } else if (event.type === "follow") {
          messageContext.message = "__FOLLOW__";
        } else {
          console.log("Unhandled event type:", event.type);
          continue;
        }

        // 處理訊息並取得回應
        const handlerStart = Date.now();
        console.log(`${perfLabel} T5 handleLineMessage start`);
        const responses = await handleLineMessage(messageContext, eventId);
        console.log(
          `${perfLabel} T6 handleLineMessage done in ${
            Date.now() - handlerStart
          }ms (responses=${responses.length})`
        );

        // 如果有 replyToken，使用 LINE API 發送回應
        if (event.replyToken && responses.length > 0) {
          try {
            const replyStart = Date.now();
            console.log(`${perfLabel} T7 Reply API send start`);
            await sendReplyToLine(event.replyToken, responses);
            console.log(
              `${perfLabel} T8 Reply API send success in ${Date.now() - replyStart}ms`
            );
          } catch (error: any) {
            // 如果是 reply token 失效（通常是重新投遞的事件），改用 Push Message API
            if (error.message === "INVALID_REPLY_TOKEN" || error.message?.includes("Invalid reply token")) {
              console.log(`${perfLabel} T8 Reply token invalid, using Push API`);
              await sendPushMessage(userId, responses);
              console.log(`${perfLabel} T9 Push message sent successfully`);
            } else {
              // 其他錯誤，重新拋出
              throw error;
            }
          }
        } else {
          console.log("No replyToken or no responses");
        }

        console.log(
          `${perfLabel} T10 Event completed in ${Date.now() - eventStart}ms`
        );
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
