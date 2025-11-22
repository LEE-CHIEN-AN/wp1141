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
import * as ConversationNodes from "@/lib/services/conversation-nodes";

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

  // 如果有對話分類，優先使用分類的上下文來理解回應
  // 不要直接匹配關鍵字，避免誤判
  if (category) {
    const lowerMessage = userMessage.toLowerCase();
    
    // 處理網路連線問題的子分類
    if (category === CONVERSATION_CATEGORIES.NETWORK_ISSUE) {
      // 檢查是否為回答「多人問題」或「個人問題」
      // 精確匹配「多人」相關關鍵字
      if (lowerMessage.includes("多人") || lowerMessage.includes("好幾個人") || 
          lowerMessage.includes("室友") || lowerMessage.includes("大家一起") ||
          lowerMessage.includes("好幾") || lowerMessage.includes("很多人")) {
        return ConversationNodes.createMultipleUsersPacketCaptureNode();
      }
      
      // 精確匹配「一個人」相關關鍵字（避免誤判為「第一次註冊」）
      if (lowerMessage === "一個人" || lowerMessage === "個人" ||
          lowerMessage.includes("只有我一個人") || lowerMessage.includes("只有我") || 
          lowerMessage.includes("一個人") || lowerMessage.includes("我自己") ||
          (lowerMessage.includes("個人") && !lowerMessage.includes("註冊"))) {
        return ConversationNodes.createSingleUserPingInfoViewNode();
      }
      
      if (lowerMessage.includes("完全無法") || lowerMessage.includes("完全連不上") ||
          lowerMessage.includes("完全不能上網") || lowerMessage.includes("完全無法連線")) {
        return ConversationNodes.createNoConnectionChecklistNode();
      }
      
      // 如果有對話歷史，使用 Gemini 來理解回應
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

      // 降級到預設回應（帶有 Quick Reply）
      return getDefaultResponseForCategory(category);
    }
    
    // 處理註冊問題
    if (category === CONVERSATION_CATEGORIES.REGISTRATION) {
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

      return getDefaultResponseForCategory(category);
    }
    
    // 處理其他分類
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

    return getDefaultResponseForCategory(category);
  }

  // 沒有分類時，才進行關鍵字匹配
  const lowerMessage = userMessage.toLowerCase();
  
  // 🚫 無法上網 - 連線故障排除
  if (lowerMessage.includes("無法上網") || lowerMessage.includes("連不上") || 
      lowerMessage.includes("連線故障") || lowerMessage.includes("不能上網") ||
      lowerMessage.includes("網路故障")) {
    return ConversationNodes.createConnectionTroubleshootNode();
  }

  // 📝 如何註冊 - 宿網註冊教學（避免誤判「一個人」為「第一次註冊」）
  if ((lowerMessage.includes("如何註冊") || lowerMessage.includes("宿網註冊") || 
       lowerMessage.includes("註冊教學") || lowerMessage.includes("註冊流程")) &&
      !lowerMessage.includes("一個人") && !lowerMessage.includes("個人問題")) {
    return ConversationNodes.createRegistrationTypeSelectionNode();
  }
  
  // 如果只是「註冊」且不是「一個人」相關，才進入註冊流程
  if (lowerMessage.includes("註冊") && 
      !lowerMessage.includes("一個人") && 
      !lowerMessage.includes("個人問題") &&
      !lowerMessage.includes("個人")) {
    return ConversationNodes.createRegistrationTypeSelectionNode();
  }

  // 🐢 網速很慢 - 網速與流量查詢
  if (lowerMessage.includes("網速") || lowerMessage.includes("很慢") || 
      lowerMessage.includes("流量") || lowerMessage.includes("速度慢") ||
      lowerMessage.includes("限速") || lowerMessage.includes("超額")) {
    return ConversationNodes.createSpeedCheckNode();
  }

  // 📞 聯絡網管
  if (lowerMessage.includes("聯絡") || lowerMessage.includes("聯繫") || 
      lowerMessage.includes("網管") || lowerMessage.includes("聯繫方式") ||
      lowerMessage.includes("報修")) {
    return ConversationNodes.createContactNode();
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
  const [type, value] = data.split(":");
  return { type, value };
}


