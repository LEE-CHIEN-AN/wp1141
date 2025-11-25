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

/**
 * 使用 Gemini 分類使用者訊息
 * 判斷是：打招呼/感謝、與宿舍網路相關、或完全無關
 */
async function classifyUserMessage(userMessage: string): Promise<"greeting" | "related" | "unrelated"> {
  const classificationPrompt = `你是一個訊息分類器，專門判斷使用者訊息是否與「台大宿舍網路管理」相關。

請將使用者訊息分類為以下三類之一：
1. "greeting" - 打招呼、感謝、問候語（如：你好、謝謝、再見、早安等）
2. "related" - 與宿舍網路相關的問題（如：無法上網、註冊問題、網速慢、路由器設定等）
3. "unrelated" - 完全無關的問題（如：天氣、作業、課程、其他生活問題等）

使用者訊息：「${userMessage}」

請只回答分類結果（greeting、related 或 unrelated），不要有其他文字。`;

  try {
    const response = await generateResponse({ prompt: classificationPrompt });
    if (response.text && !response.error) {
      const classification = response.text.trim().toLowerCase();
      if (classification.includes("greeting")) {
        return "greeting";
      } else if (classification.includes("unrelated")) {
        return "unrelated";
      } else {
        // 預設為相關（包括 "related" 或其他情況）
        return "related";
      }
    }
  } catch (error) {
    console.error("Error classifying message:", error);
  }

  // 如果分類失敗，使用簡單的關鍵字匹配作為降級方案
  const lowerMessage = userMessage.toLowerCase();
  const greetingKeywords = ["你好", "您好", "hi", "hello", "謝謝", "感謝", "再見", "bye", "早安", "晚安", "午安"];
  const relatedKeywords = ["網路", "網速", "註冊", "路由器", "連線", "上網", "mac", "ip", "網段", "網域", "宿網", "宿舍"];
  
  if (greetingKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return "greeting";
  }
  
  if (relatedKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return "related";
  }
  
  return "unrelated";
}

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
  const lowerMessageForMain = userMessage.toLowerCase();
  
  // 🚫 無法上網 - 連線故障排除
  if (lowerMessageForMain.includes("無法上網") || lowerMessageForMain.includes("連不上") || 
      lowerMessageForMain.includes("連線故障") || lowerMessageForMain.includes("不能上網") ||
      lowerMessageForMain.includes("網路故障")) {
    const { createConnectionTroubleshootNode } = await import("./conversation-nodes");
    return createConnectionTroubleshootNode();
  }

  // 📝 如何註冊 - 宿網註冊教學
  if (lowerMessageForMain.includes("如何註冊") || lowerMessageForMain.includes("註冊") || 
      lowerMessageForMain.includes("宿網註冊") || lowerMessageForMain.includes("註冊教學") ||
      lowerMessageForMain.includes("註冊流程")) {
    // 導入節點處理函數
    const { createRegistrationTypeSelectionNode } = await import("./conversation-nodes");
    return createRegistrationTypeSelectionNode();
  }

  // 網域/網段相關問題（無分類時也能匹配）
  // 包括：網域不在、網段不在、網段在、網域在等各種變體
  if (lowerMessageForMain.includes("網域不在") || lowerMessageForMain.includes("網段不在") ||
      lowerMessageForMain.includes("不在女八舍") || lowerMessageForMain.includes("網域錯誤") ||
      (lowerMessageForMain.includes("網域") && lowerMessageForMain.includes("女八舍")) ||
      (lowerMessageForMain.includes("網段") && lowerMessageForMain.includes("女八舍")) ||
      // 新增：網段在其他宿舍的情況
      (lowerMessageForMain.includes("網段") && (lowerMessageForMain.includes("女六") || lowerMessageForMain.includes("女七") || 
       lowerMessageForMain.includes("男一") || lowerMessageForMain.includes("男二") || lowerMessageForMain.includes("宿舍"))) ||
      (lowerMessageForMain.includes("網域") && (lowerMessageForMain.includes("女六") || lowerMessageForMain.includes("女七") || 
       lowerMessageForMain.includes("男一") || lowerMessageForMain.includes("男二") || lowerMessageForMain.includes("宿舍")))) {
    const { createWrongDormSegmentNode } = await import("./conversation-nodes");
    return createWrongDormSegmentNode();
  }

  // 🐢 網速很慢 - 網速與流量查詢
  if (lowerMessageForMain.includes("網速") || lowerMessageForMain.includes("很慢") || 
      lowerMessageForMain.includes("流量") || lowerMessageForMain.includes("速度慢") ||
      lowerMessageForMain.includes("限速") || lowerMessageForMain.includes("超額")) {
    // 導入節點處理函數
    const { createSpeedCheckNode } = await import("./conversation-nodes");
    return createSpeedCheckNode();
  }

  // 📞 聯絡網管
  if (lowerMessageForMain.includes("聯絡") || lowerMessageForMain.includes("聯繫") || 
      lowerMessageForMain.includes("網管") || lowerMessageForMain.includes("聯繫方式") ||
      lowerMessageForMain.includes("報修")) {
    // 導入節點處理函數
    const { createContactNode } = await import("./conversation-nodes");
    return createContactNode();
  }

  // 如果有分類，先使用關鍵字匹配（不呼叫 Gemini，避免延遲）
  if (category) {
    // 使用簡單的關鍵字匹配判斷是否為打招呼或無關訊息（不呼叫 Gemini）
    const lowerMessageForCategory = userMessage.toLowerCase();
    const greetingKeywords = ["你好", "您好", "hi", "hello", "謝謝", "感謝", "再見", "bye", "早安", "晚安", "午安"];
    const unrelatedKeywords = ["天氣", "作業", "課程", "考試", "成績", "餐廳", "電影", "遊戲", "購物"];
    
    // 如果判斷為打招呼，友善回應並引導
    if (greetingKeywords.some(keyword => lowerMessageForCategory.includes(keyword))) {
      return createTextWithMenuOption(
        "您好！很高興為您服務！👋\n\n我可以協助您解決宿舍網路相關問題。\n\n請選擇您需要的服務，或點選「回主選單」查看所有功能。"
      );
    }
    
    // 如果判斷為無關訊息，溫柔引導
    if (unrelatedKeywords.some(keyword => lowerMessageForCategory.includes(keyword)) && 
        !lowerMessageForCategory.includes("網路") && !lowerMessageForCategory.includes("網速") && 
        !lowerMessageForCategory.includes("註冊") && !lowerMessageForCategory.includes("路由器")) {
      return createTextWithMenuOption(
        "不好意思，我是專門協助處理「台大宿舍網路問題」的小精靈，對於您提到的問題可能無法提供幫助。😅\n\n不過，如果您遇到以下問題，我很樂意協助：\n\n• 🚫 無法上網或連線故障\n• 📝 宿網註冊相關問題\n• 🐢 網速很慢或流量查詢\n• 📞 需要聯絡網管\n\n請點選「回主選單」選擇您需要的服務，或直接告訴我您的網路問題！"
      );
    }
    
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

        // 網域不在女八舍問題
        if (lowerMessage.includes("網域不在") || lowerMessage.includes("網段不在") ||
            lowerMessage.includes("不在女八舍") || lowerMessage.includes("網域錯誤") ||
            (lowerMessage.includes("網域") && lowerMessage.includes("女八舍")) ||
            (lowerMessage.includes("網段") && lowerMessage.includes("女八舍"))) {
          const { createWrongDormSegmentNode } = await import("./conversation-nodes");
          return createWrongDormSegmentNode();
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

    // 處理模型不存在錯誤
    if (geminiResponse.error === "MODEL_NOT_FOUND") {
      console.log("Gemini model not found, falling back to keyword matching or default response");
      // 嘗試更寬鬆的關鍵字匹配
      const lowerMessage = userMessage.toLowerCase();
      
      // 檢查是否提到網段/網域相關問題
      if (lowerMessage.includes("網段") || lowerMessage.includes("網域") || 
          lowerMessage.includes("宿舍") || lowerMessage.includes("女六") || 
          lowerMessage.includes("女八")) {
        // 如果是網段相關問題，引導到註冊問題
        const { createWrongDormSegmentNode } = await import("./conversation-nodes");
        return createWrongDormSegmentNode();
      }
      
      // 降級到預設腳本
      return getDefaultResponseForCategory(category);
    }

    // 處理其他 Gemini 錯誤（但仍有部分回應）
    if (geminiResponse.error && geminiResponse.text) {
      // 如果有部分回應，使用它
      return createTextWithMenuOption(geminiResponse.text);
    }

    // 如果都無法處理，降級到預設腳本
    return getDefaultResponseForCategory(category);
  }

  // 沒有分類時，先使用關鍵字匹配（不呼叫 Gemini，避免延遲）
  const lowerMessage = userMessage.toLowerCase();
  const greetingKeywords = ["你好", "您好", "hi", "hello", "謝謝", "感謝", "再見", "bye", "早安", "晚安", "午安"];
  const unrelatedKeywords = ["天氣", "作業", "課程", "考試", "成績", "餐廳", "電影", "遊戲", "購物"];
  const relatedKeywords = ["網路", "網速", "註冊", "路由器", "連線", "上網", "mac", "ip", "網段", "網域", "宿網", "宿舍"];
  
  // 處理打招呼/感謝（使用關鍵字匹配）
  if (greetingKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return createTextWithMenuOption(
      "您好！我是台大女八舍宿網小精靈 👋\n\n很高興為您服務！我可以協助您解決宿舍網路相關問題。\n\n請選擇您需要的服務，或點選「回主選單」查看所有功能。"
    );
  }
  
  // 處理完全無關的問題（使用關鍵字匹配）
  if (unrelatedKeywords.some(keyword => lowerMessage.includes(keyword)) && 
      !relatedKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return createTextWithMenuOption(
      "不好意思，我是專門協助處理「台大宿舍網路問題」的小精靈，對於您提到的問題可能無法提供幫助。😅\n\n不過，如果您遇到以下問題，我很樂意協助：\n\n• 🚫 無法上網或連線故障\n• 📝 宿網註冊相關問題\n• 🐢 網速很慢或流量查詢\n• 📞 需要聯絡網管\n\n請點選「回主選單」選擇您需要的服務，或直接告訴我您的網路問題！"
    );
  }
  
  // 只有在關鍵字匹配都失敗時，才使用 Gemini 處理（未知文字）
  // 這是最後的手段，用於處理無法用關鍵字匹配的問題
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

  // 處理模型不存在錯誤
  if (geminiResponse.error === "MODEL_NOT_FOUND") {
    console.log("Gemini model not found, trying keyword matching...");
    // 嘗試更寬鬆的關鍵字匹配
    const lowerMessage = userMessage.toLowerCase();
    
    // 檢查是否提到網段/網域相關問題
    if (lowerMessage.includes("網段") || lowerMessage.includes("網域") || 
        lowerMessage.includes("宿舍") || lowerMessage.includes("女六") || 
        lowerMessage.includes("女八")) {
      // 如果是網段相關問題，引導到註冊問題
      const { createWrongDormSegmentNode } = await import("./conversation-nodes");
      return createWrongDormSegmentNode();
    }
  }

  // 處理其他 Gemini 錯誤（但仍有部分回應）
  if (geminiResponse.error && geminiResponse.text) {
    // 如果有部分回應，使用它
    return createTextMessage(geminiResponse.text);
  }

  // 降級到歡迎訊息（帶有回主選單選項）
  return createTextWithMenuOption(
    "抱歉，我無法完全理解您的問題。\n\n請選擇以下選項，或點選「回主選單」重新開始：\n\n• 🚫 無法上網\n• 📝 如何註冊\n• 🐢 網速很慢\n• 📞 聯絡網管"
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


