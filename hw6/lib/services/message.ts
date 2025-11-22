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

  // 處理核心功能關鍵字匹配
  const lowerMessage = userMessage.toLowerCase();
  
  // 🚫 無法上網 - 連線故障排除
  if (lowerMessage.includes("無法上網") || lowerMessage.includes("連不上") || 
      lowerMessage.includes("連線故障") || lowerMessage.includes("不能上網") ||
      lowerMessage.includes("網路故障")) {
    const { createConnectionTroubleshootNode } = await import("./conversation-nodes");
    return createConnectionTroubleshootNode();
  }

  // 📝 如何註冊 - 宿網註冊教學
  if (lowerMessage.includes("如何註冊") || lowerMessage.includes("註冊") || 
      lowerMessage.includes("宿網註冊") || lowerMessage.includes("註冊教學") ||
      lowerMessage.includes("註冊流程")) {
    // 導入節點處理函數
    const { createRegistrationTypeSelectionNode } = await import("./conversation-nodes");
    return createRegistrationTypeSelectionNode();
  }

  // 🐢 網速很慢 - 網速與流量查詢
  if (lowerMessage.includes("網速") || lowerMessage.includes("很慢") || 
      lowerMessage.includes("流量") || lowerMessage.includes("速度慢") ||
      lowerMessage.includes("限速") || lowerMessage.includes("超額")) {
    // 導入節點處理函數
    const { createSpeedCheckNode } = await import("./conversation-nodes");
    return createSpeedCheckNode();
  }

  // 📞 聯絡網管
  if (lowerMessage.includes("聯絡") || lowerMessage.includes("聯繫") || 
      lowerMessage.includes("網管") || lowerMessage.includes("聯繫方式") ||
      lowerMessage.includes("報修")) {
    // 導入節點處理函數
    const { createContactNode } = await import("./conversation-nodes");
    return createContactNode();
  }

  // 如果有分類，優先處理關鍵字匹配，然後才使用 Gemini
  if (category) {
    // 先處理關鍵字匹配（更精確、更快）
    if (userMessage && userMessage.trim().length > 0) {
      const lowerMessage = userMessage.toLowerCase();
      
      if (category === CONVERSATION_CATEGORIES.NETWORK_ISSUE) {
        // 注意：個人問題和多人問題的關鍵字匹配已經移到 handlers.ts 中處理
        // 這裡只處理第二個問題的回答（完全無法連線、斷斷續續等）
        // 個人問題關鍵字匹配已移除，改由 handlers.ts 統一處理對話狀態
        
        // 多人問題關鍵字
        if (lowerMessage.includes("多人") || lowerMessage === "多人" ||
            lowerMessage === "多人問題" || lowerMessage.includes("好幾") ||
            lowerMessage.includes("室友") || lowerMessage.includes("大家一起")) {
          // 導入節點處理函數
          const { createMultipleUsersPacketCaptureNode } = await import("./conversation-nodes");
          return createMultipleUsersPacketCaptureNode();
        }
        
        // 完全無法連線關鍵字（在第二個問題時）
        if (lowerMessage.includes("完全無法") || lowerMessage === "完全無法連線" ||
            lowerMessage.includes("完全連不上") || lowerMessage.includes("完全不能")) {
          // 導入節點處理函數
          const { createNoConnectionChecklistNode } = await import("./conversation-nodes");
          return createNoConnectionChecklistNode();
        }
        
        // 斷斷續續/網速慢關鍵字（在第二個問題時）
        if (lowerMessage.includes("斷斷續續") || lowerMessage.includes("會斷") ||
            lowerMessage.includes("網速慢") || lowerMessage.includes("很慢") ||
            lowerMessage.includes("瞬斷")) {
          // 導入節點處理函數
          const { createSingleUserPingInfoViewNode } = await import("./conversation-nodes");
          return createSingleUserPingInfoViewNode();
        }
      }
      
      if (category === CONVERSATION_CATEGORIES.REGISTRATION) {
        // 註冊相關關鍵字匹配
        if (lowerMessage.includes("第一次") || lowerMessage.includes("初次") ||
            lowerMessage === "第一次註冊") {
          const { createFirstTimeRegistrationPrepNode } = await import("./conversation-nodes");
          return createFirstTimeRegistrationPrepNode();
        }
        
        if (lowerMessage.includes("路由器") || lowerMessage.includes("wifi") ||
            lowerMessage === "使用路由器") {
          const { createRouterSetupNode } = await import("./conversation-nodes");
          return createRouterSetupNode();
        }
        
        if (lowerMessage.includes("修改") && lowerMessage.includes("mac")) {
          const { createChangeMacAddressNode } = await import("./conversation-nodes");
          return createChangeMacAddressNode();
        }
      }
    }

    // 如果關鍵字匹配失敗，嘗試使用 Gemini
    const context = conversationHistory
      ? conversationHistory
          .slice(-10)
          .map((msg) => `${msg.role}: ${msg.content}`)
          .join("\n")
      : undefined;

    const prompt = buildPrompt(userMessage, category, context);
    const geminiResponse = await generateResponse({ prompt });

    if (geminiResponse.text && !geminiResponse.error) {
      return createTextWithMenuOption(geminiResponse.text);
    }

    // 處理 LLM 配額錯誤
    if (geminiResponse.error === "API_QUOTA_EXCEEDED") {
      return createTextWithMenuOption(
        "抱歉，AI 服務目前暫時無法使用（配額已用完）。\n\n請使用下方選單選擇功能，或稍後再試。"
      );
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

  // 處理 LLM 配額錯誤
  if (geminiResponse.error === "API_QUOTA_EXCEEDED") {
    return createTextWithMenuOption(
      "抱歉，AI 服務目前暫時無法使用（配額已用完）。\n\n請使用下方選單選擇功能，或稍後再試。"
    );
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
      return createQuickReply(DEFAULT_RESPONSES.CONNECTION_TROUBLESHOOT, [
        { label: "多人問題", data: "network:multiple" },
        { label: "個人問題", data: "network:single" },
        { label: "📋 回主選單", data: "menu" },
      ]);

    case CONVERSATION_CATEGORIES.SECURITY_INCIDENT:
      return createTextWithMenuOption(DEFAULT_RESPONSES.SECURITY_INCIDENT);

    case CONVERSATION_CATEGORIES.REGISTRATION:
      return createQuickReply(DEFAULT_RESPONSES.REGISTRATION_GUIDE, [
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
  // 使用 split(":") 但只分割第一個冒號，保留後面的部分作為 value
  const firstColonIndex = data.indexOf(":");
  if (firstColonIndex === -1) {
    // 沒有冒號，整個字串都是 type
    return { type: data };
  }
  const type = data.substring(0, firstColonIndex);
  const value = data.substring(firstColonIndex + 1); // 保留所有後續內容
  return { type, value };
}


