import { LineBot } from "bottender";
import { handleLineMessage } from "./handlers";

// 建立 Line Bot 實例
const bot = new LineBot({
  channelSecret: process.env.LINE_CHANNEL_SECRET || "",
  accessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
});

// 設定事件處理器
bot.onEvent(async (context) => {
  try {
    // 取得使用者資訊
    const profile = await context.getUserProfile();
    
    // 建立訊息上下文
    const messageContext = {
      userId: context.event.source.userId || "",
      displayName: profile?.displayName || "使用者",
      pictureUrl: profile?.pictureUrl,
      message: "",
      postbackData: undefined as string | undefined,
    };

    // 處理不同類型的事件
    if (context.event.type === "message" && context.event.message.type === "text") {
      messageContext.message = context.event.message.text;
      messageContext.postbackData = undefined;
    } else if (context.event.type === "postback") {
      messageContext.message = "";
      messageContext.postbackData = context.event.postback.data;
      console.log("Postback event received:", context.event.postback.data);
    } else if (context.event.type === "follow") {
      messageContext.message = "__FOLLOW__";
      messageContext.postbackData = undefined;
    } else {
      // 其他事件類型，記錄但不處理
      console.log("Unhandled event type:", context.event.type);
      return;
    }

    // 處理訊息並取得回應
    const responses = await handleLineMessage(messageContext);

    // 發送回應
    for (const response of responses) {
      if (response.type === "text" && !("quickReply" in response)) {
        await context.sendText(response.text);
      } else if (response.type === "template") {
        // 處理 Template 訊息
        if (response.template.type === "buttons") {
          await context.sendButtonTemplate(
            response.altText,
            {
              text: response.template.text,
              actions: response.template.actions.map((action) => {
                if (action.type === "postback") {
                  return {
                    type: "postback",
                    label: action.label,
                    data: action.data || "",
                    displayText: action.displayText || action.label,
                  };
                } else if (action.type === "uri") {
                  return {
                    type: "uri",
                    label: action.label,
                    uri: action.uri || "",
                  };
                } else {
                  return {
                    type: "message",
                    label: action.label,
                    text: action.text || action.label,
                  };
                }
              }),
            }
          );
        } else if (response.template.type === "carousel") {
          await context.sendCarouselTemplate(
            response.altText,
            response.template.columns.map((column) => ({
              title: column.title,
              text: column.text,
              actions: column.actions.map((action) => {
                if (action.type === "postback") {
                  return {
                    type: "postback",
                    label: action.label,
                    data: action.data || "",
                    displayText: action.displayText || action.label,
                  };
                } else if (action.type === "uri") {
                  return {
                    type: "uri",
                    label: action.label,
                    uri: action.uri || "",
                  };
                } else {
                  return {
                    type: "message",
                    label: action.label,
                    text: action.text || action.label,
                  };
                }
              }),
            }))
          );
        }
      } else if (response.type === "text" && "quickReply" in response) {
        // 處理 Quick Reply
        const quickReplyResponse = response as { type: "text"; text: string; quickReply: { items: Array<{ type: "action"; action: { type: "postback" | "message"; label: string; data?: string; text?: string; displayText?: string } }> } };
        await context.sendText(quickReplyResponse.text, {
          quickReply: {
            items: quickReplyResponse.quickReply.items.map((item) => {
              if (item.action.type === "postback") {
                return {
                  type: "action",
                  action: {
                    type: "postback",
                    label: item.action.label,
                    data: item.action.data || "",
                    displayText: item.action.displayText || item.action.label,
                  },
                };
              } else {
                return {
                  type: "action",
                  action: {
                    type: "message",
                    label: item.action.label,
                    text: item.action.text || item.action.label,
                  },
                };
              }
            }),
          },
        });
      }
    }
  } catch (error) {
    console.error("Error handling event:", error);
    await context.sendText("抱歉，處理您的訊息時發生錯誤。請稍後再試，或點選「📋 回主選單」返回主選單。");
  }
});

export default bot;
