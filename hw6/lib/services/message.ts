import { generateResponse } from "@/lib/gemini/client";
import { buildPrompt, DEFAULT_RESPONSES } from "@/lib/gemini/prompts";
import {
  createTextMessage,
  createWelcomeMessage,
  createQuickReply,
  createTextWithMenuOption,
  type LineMessage,
} from "@/lib/utils/line-templates";
import { CONVERSATION_CATEGORIES } from "@/config/conversation";
import type { ConversationCategory } from "@/config/conversation";

export async function processUserMessage(
  userMessage: string,
  category?: ConversationCategory,
  conversationHistory?: Array<{ role: string; content: string }>
): Promise<LineMessage> {
  // 處理特殊指令（回主選單）
  const menuKeywords = ["選單", "menu", "功能", "主選單", "返回", "回主選單", "重新開始"];
  if (menuKeywords.some((keyword) => userMessage.includes(keyword))) {
    return createWelcomeMessage();
  }

  // 如果有分類，優先使用 Gemini 來理解使用者的回應
  if (category) {
    const context = conversationHistory
      ? conversationHistory
          .slice(-10) // 增加上下文長度
          .map((msg) => `${msg.role}: ${msg.content}`)
          .join("\n")
      : undefined;

    const prompt = buildPrompt(userMessage, category, context);

    // 嘗試使用 Gemini API
    const geminiResponse = await generateResponse({ prompt });

    if (geminiResponse.text && !geminiResponse.error) {
      // 如果 Gemini 成功回應，加上回主選單選項
      return createTextWithMenuOption(geminiResponse.text);
    }

    // 如果 Gemini 失敗，但使用者有提供訊息，嘗試理解簡單的回應
    if (userMessage && userMessage.trim().length > 0) {
      // 簡單的關鍵字匹配作為降級方案
      const lowerMessage = userMessage.toLowerCase();
      
      if (category === CONVERSATION_CATEGORIES.NETWORK_ISSUE) {
        if (lowerMessage.includes("只有") || lowerMessage.includes("一個人") || lowerMessage.includes("個人")) {
          return createTextWithMenuOption(`了解，這是您個人的網路問題。

建議您：
1. 檢查網路線和路由器連接是否正常
2. 嘗試重新啟動路由器
3. 如果問題持續，可以使用 PingInfoView 工具檢測網路連線狀況

如需進一步協助，請提供：
- 問題發生的時間
- 是否使用路由器
- 其他裝置（手機、平板）是否也有相同問題`);
        }
        
        if (lowerMessage.includes("多人") || lowerMessage.includes("好幾") || lowerMessage.includes("室友")) {
          return createTextWithMenuOption(`了解，這是多人同時遇到的問題。

這種情況可能是：
1. 網路流量過大（多人共用同一條線路）
2. 路由器負載過高
3. 網路設備異常

建議：
- 可以嘗試錄製封包分析，找出問題根源
- 檢查是否有特定時段特別嚴重
- 聯繫網管協助進一步排查

如需協助，請提供更多詳細資訊。`);
        }
      }
    }

    // 如果都無法處理，降級到預設腳本
    return getDefaultResponseForCategory(category);
  }

  // 沒有分類時，使用 Gemini 或預設回應
  const prompt = buildPrompt(userMessage);
  const geminiResponse = await generateResponse({ prompt });

  if (geminiResponse.text && !geminiResponse.error) {
    return createTextMessage(geminiResponse.text);
  }

    // 降級到歡迎訊息（帶有回主選單選項）
    return createTextWithMenuOption(
      "抱歉，我無法理解您的問題。\n\n請選擇以下選項，或點選「回主選單」重新開始：\n\n1. 網路連線問題\n2. 資安事件處理\n3. 登入問題\n4. 其他問題"
    );
}

function getDefaultResponseForCategory(
  category: ConversationCategory
): LineMessage {
  switch (category) {
    case CONVERSATION_CATEGORIES.NETWORK_ISSUE:
      return createQuickReply(DEFAULT_RESPONSES.NETWORK_ISSUE, [
        { label: "多人問題", data: "network:multiple" },
        { label: "個人問題", data: "network:single" },
        { label: "📋 回主選單", data: "menu" },
      ]);

    case CONVERSATION_CATEGORIES.SECURITY_INCIDENT:
      return createTextWithMenuOption(DEFAULT_RESPONSES.SECURITY_INCIDENT);

    case CONVERSATION_CATEGORIES.REGISTRATION:
      return createQuickReply(DEFAULT_RESPONSES.REGISTRATION, [
        { label: "確認網段", data: "registration:check_segment" },
        { label: "MAC 地址問題", data: "registration:mac" },
        { label: "📋 回主選單", data: "menu" },
      ]);

    default:
      return createTextWithMenuOption(DEFAULT_RESPONSES.FALLBACK);
  }
}

export function parsePostbackData(data: string): {
  type: string;
  value?: string;
} {
  const [type, value] = data.split(":");
  return { type, value };
}


