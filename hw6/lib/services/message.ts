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
 * 意圖類型定義
 */
export type UserIntent =
  | "menu"                    // 回主選單
  | "connection_troubleshoot" // 無法上網
  | "registration"            // 註冊問題
  | "speed_check"             // 網速問題
  | "contact"                 // 聯絡網管
  | "continue_flow"            // 繼續當前流程
  | "new_question"             // 新問題（需要 Context Switching）
  | "information_query"        // 詢問資訊（需要 RAG）
  | "greeting"                 // 打招呼
  | "unrelated";               // 無關問題

/**
 * 使用 Gemini 進行意圖分類
 * 這是主要的意圖識別邏輯，取代原本的關鍵字匹配
 */
async function classifyUserIntent(
  userMessage: string,
  currentCategory?: ConversationCategory,
  conversationStep?: string
): Promise<UserIntent> {
  const intentPrompt = `你是一個意圖分類器，專門判斷使用者訊息的意圖類型。

當前對話狀態：
${currentCategory ? `- 問題分類：${currentCategory}` : "- 尚未分類"}
${conversationStep ? `- 對話步驟：${conversationStep}` : "- 對話步驟：無"}

請將使用者訊息分類為以下意圖之一：
1. "menu" - 要求回主選單（如：選單、返回、重新開始）
2. "connection_troubleshoot" - 無法上網或連線問題（如：連不上、網路故障、無法上網）
3. "registration" - 註冊相關問題（如：如何註冊、註冊流程、MAC 地址）
4. "speed_check" - 網速或流量問題（如：網速慢、流量查詢、限速）
5. "contact" - 聯絡網管（如：聯絡網管、報修、聯繫方式）
6. "continue_flow" - 繼續當前流程的回答（如：回答系統的問題、提供流程所需資訊）
7. "new_question" - 在流程中提出新問題（如：突然問「宿網要錢嗎？」）
8. "information_query" - 詢問資訊（如：MAC 在哪看、流量限制多少）
9. "greeting" - 打招呼或感謝（如：你好、謝謝、再見）
10. "unrelated" - 完全無關的問題（如：天氣、作業、課程）

**重要判斷規則**：
- 如果使用者在流程中（有 conversationStep），但訊息明顯是「新問題」而非「回答當前問題」，應分類為 "new_question"
- 如果訊息是回答當前流程的問題，應分類為 "continue_flow"
- 如果訊息是詢問具體資訊（如「流量限制多少」），應分類為 "information_query"

使用者訊息：「${userMessage}」

請只回答意圖類型（menu、connection_troubleshoot、registration、speed_check、contact、continue_flow、new_question、information_query、greeting 或 unrelated），不要有其他文字。`;

  try {
    const response = await generateResponse({ prompt: intentPrompt });
    if (response.text && !response.error) {
      const intent = response.text.trim().toLowerCase();
      // 檢查是否包含任何意圖關鍵字
      if (intent.includes("menu") || intent.includes("主選單")) return "menu";
      if (intent.includes("connection") || intent.includes("troubleshoot") || intent.includes("無法上網")) return "connection_troubleshoot";
      if (intent.includes("registration") || intent.includes("註冊")) return "registration";
      if (intent.includes("speed") || intent.includes("網速")) return "speed_check";
      if (intent.includes("contact") || intent.includes("聯絡") || intent.includes("網管")) return "contact";
      if (intent.includes("continue") || intent.includes("繼續")) return "continue_flow";
      if (intent.includes("new_question") || intent.includes("新問題")) return "new_question";
      if (intent.includes("information") || intent.includes("詢問") || intent.includes("資訊")) return "information_query";
      if (intent.includes("greeting") || intent.includes("打招呼")) return "greeting";
      if (intent.includes("unrelated") || intent.includes("無關")) return "unrelated";
      
      // 預設：如果無法明確分類，但與網路相關，視為 continue_flow 或 information_query
      return "information_query";
    }
  } catch (error) {
    console.error("Error classifying intent:", error);
  }

  // 降級方案：簡單關鍵字匹配
  const lowerMessage = userMessage.toLowerCase();
  const menuKeywords = ["選單", "menu", "功能", "主選單", "返回", "回主選單", "重新開始"];
  if (menuKeywords.some(keyword => lowerMessage.includes(keyword))) return "menu";
  
  const networkKeywords = ["網路", "網速", "註冊", "路由器", "連線", "上網", "mac", "ip", "網段", "網域", "宿網", "宿舍"];
  if (networkKeywords.some(keyword => lowerMessage.includes(keyword))) {
    // 根據關鍵字推測意圖
    if (lowerMessage.includes("無法上網") || lowerMessage.includes("連不上")) return "connection_troubleshoot";
    if (lowerMessage.includes("註冊")) return "registration";
    if (lowerMessage.includes("網速") || lowerMessage.includes("流量")) return "speed_check";
    if (lowerMessage.includes("聯絡") || lowerMessage.includes("網管")) return "contact";
    return "information_query";
  }
  
  const greetingKeywords = ["你好", "您好", "hi", "hello", "謝謝", "感謝", "再見", "bye"];
  if (greetingKeywords.some(keyword => lowerMessage.includes(keyword))) return "greeting";
  
  return "unrelated";
}

export async function processUserMessage(
  userMessage: string,
  category?: ConversationCategory,
  conversationHistory?: Array<{ role: string; content: string }>,
  conversationStep?: string
): Promise<LineMessage> {
  // 第一層：處理特殊指令（回主選單）- 快速路徑，不呼叫 Gemini
  const menuKeywords = ["選單", "menu", "功能", "主選單", "返回", "回主選單", "重新開始"];
  if (menuKeywords.some((keyword) => userMessage.includes(keyword))) {
    return createWelcomeMessage();
  }

  // 第二層：使用 Gemini 進行意圖分類（主要判斷邏輯）
  const intent = await classifyUserIntent(userMessage, category, conversationStep);
  
  // 根據意圖分類結果決定處理方式
  switch (intent) {
    case "menu":
      return createWelcomeMessage();
    
    case "connection_troubleshoot":
      // 無法上網 - 走固定腳本流程
      const { createConnectionTroubleshootNode } = await import("./conversation-nodes");
      return createConnectionTroubleshootNode();
    
    case "registration":
      // 註冊問題 - 走固定腳本流程
      const { createRegistrationTypeSelectionNode } = await import("./conversation-nodes");
      return createRegistrationTypeSelectionNode();
    
    case "speed_check":
      // 網速問題 - 走固定腳本流程
      const { createSpeedCheckNode } = await import("./conversation-nodes");
      return createSpeedCheckNode();
    
    case "contact":
      // 聯絡網管 - 走固定腳本流程
      const { createContactNode } = await import("./conversation-nodes");
      return createContactNode();
    
    case "continue_flow":
      // 繼續當前流程 - 交給 handlers.ts 處理（這裡不處理，讓它 fallback 到 Gemini）
      // 這個意圖主要用於 handlers.ts 中的流程判斷
      break;
    
    case "new_question":
      // 新問題（Context Switching）- 讓 Gemini 回答，並提示可以返回原流程
      const contextForNew = conversationHistory
        ? conversationHistory.slice(-5).map((msg) => `${msg.role}: ${msg.content}`).join("\n")
        : undefined;
      const promptForNew = `使用者正在進行「${category || "某個"}」問題的排查流程，但突然問了一個新問題：「${userMessage}」

請先回答這個新問題，然後在回答最後提醒使用者：「如果您想繼續剛才的排查流程，請告訴我。」`;
      
      const newQuestionResponse = await generateResponse({ prompt: promptForNew });
      if (newQuestionResponse.text && !newQuestionResponse.error) {
        return createTextWithMenuOption(
          `${newQuestionResponse.text}\n\n💡 如果您想繼續剛才的排查流程，請告訴我。`
        );
      }
      break;
    
    case "information_query":
      // 詢問資訊（RAG）- 讓 Gemini 結合知識庫回答
      // TODO: 未來整合知識庫後，這裡會使用 RAG
      const contextForInfo = conversationHistory
        ? conversationHistory.slice(-10).map((msg) => `${msg.role}: ${msg.content}`).join("\n")
        : undefined;
      const promptForInfo = buildPrompt(userMessage, category, contextForInfo);
      const infoResponse = await generateResponse({ prompt: promptForInfo });
      if (infoResponse.text && !infoResponse.error) {
        return createTextWithMenuOption(infoResponse.text);
      }
      break;
    
    case "greeting":
      // 打招呼 - 讓 Gemini 生成友善回應
      const greetingPrompt = `使用者說：「${userMessage}」

請用友善、親切的語氣回應，並引導使用者選擇需要的服務。`;
      const greetingResponse = await generateResponse({ prompt: greetingPrompt });
      if (greetingResponse.text && !greetingResponse.error) {
        return createTextWithMenuOption(greetingResponse.text);
      }
      // Fallback
      return createTextWithMenuOption(
        "您好！我是台大女八舍宿網小精靈 👋\n\n很高興為您服務！我可以協助您解決宿舍網路相關問題。\n\n請選擇您需要的服務，或點選「回主選單」查看所有功能。"
      );
    
    case "unrelated":
      // 無關問題 - 讓 Gemini 生成溫柔引導
      const unrelatedPrompt = `使用者問了一個與「台大宿舍網路管理」無關的問題：「${userMessage}」

請用友善、溫柔的語氣告訴使用者，你是專門協助處理宿舍網路問題的小精靈，並引導他選擇相關服務。`;
      const unrelatedResponse = await generateResponse({ prompt: unrelatedPrompt });
      if (unrelatedResponse.text && !unrelatedResponse.error) {
        return createTextWithMenuOption(unrelatedResponse.text);
      }
      // Fallback
      return createTextWithMenuOption(
        "不好意思，我是專門協助處理「台大宿舍網路問題」的小精靈，對於您提到的問題可能無法提供幫助。😅\n\n不過，如果您遇到以下問題，我很樂意協助：\n\n• 🚫 無法上網或連線故障\n• 📝 宿網註冊相關問題\n• 🐢 網速很慢或流量查詢\n• 📞 需要聯絡網管\n\n請點選「回主選單」選擇您需要的服務，或直接告訴我您的網路問題！"
      );
  }

  // Fallback：如果意圖分類失敗或無法處理，使用 Gemini 生成回答
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
    console.log("Gemini model not found, falling back to default response");
    // 降級到預設腳本
    if (category) {
      return getDefaultResponseForCategory(category);
    }
  }

  // 處理其他 Gemini 錯誤（但仍有部分回應）
  if (geminiResponse.error && geminiResponse.text) {
    return createTextWithMenuOption(geminiResponse.text);
  }

  // 最終降級：如果都無法處理
  if (category) {
    return getDefaultResponseForCategory(category);
  }

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


