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
      lowerMessage.includes("連線故障") || lowerMessage.includes("不能上網")) {
    return createTextWithMenuOption(`🚫 無法上網 - 連線故障排除

關於無法上網的問題，我需要了解以下資訊：

• 是多人同時遇到問題，還是只有您一個人？
• 是完全無法連線，還是會斷斷續續？
• 您有使用路由器嗎？
• 其他裝置（手機、平板）是否也無法上網？

請提供更多詳細資訊，以便我協助您解決問題。`);
  }

  // 📝 如何註冊 - 宿網註冊教學
  if (lowerMessage.includes("如何註冊") || lowerMessage.includes("註冊") || 
      lowerMessage.includes("宿網註冊") || lowerMessage.includes("註冊教學")) {
    return createTextWithMenuOption(`📝 如何註冊 - 宿網註冊教學

宿舍網路註冊步驟：

1️⃣ 確認網段
   • 確認您的網段是否正確（例如：女八舍）
   • 是否已向宿舍輔導員報到

2️⃣ 準備資訊
   • 路由器的 MAC 地址（非電腦 MAC）
   • 計中帳號

3️⃣ 註冊步驟
   • 將網路線連接至路由器或電腦
   • 進入註冊網站：https://140.112.2.197
   （需在校內網路環境下才能進入）
   • 使用計中帳號登入並註冊

4️⃣ 路由器設定
   • 將路由器的 WAN 設置改成浮動 IP
   • 等待 5-10 分鐘後測試連線

如需進一步協助，請提供您的姓名、學號、房位等資訊。`);
  }

  // 🐢 網速很慢 - 網速與流量查詢
  if (lowerMessage.includes("網速") || lowerMessage.includes("很慢") || 
      lowerMessage.includes("流量") || lowerMessage.includes("速度慢")) {
    return createTextWithMenuOption(`🐢 網速很慢 - 網速與流量查詢

關於網速慢的問題，可能的原因包括：

1️⃣ 多人共用問題
   • 多人同時使用同一條線路
   • 建議：檢查是否有室友在下載大檔案

2️⃣ 路由器問題
   • 路由器負載過高或故障
   • 建議：重新啟動路由器

3️⃣ 網路設備異常
   • 可能需要錄製封包分析
   • 建議：聯繫網管協助排查

4️⃣ 流量限制
   • 檢查是否超過流量上限
   • 建議：查看流量使用情況

請告訴我：
• 是持續很慢，還是特定時段？
• 是多人共用還是個人使用？
• 是否有使用 VPN 或其他軟體？`);
  }

  // 📞 聯絡網管
  if (lowerMessage.includes("聯絡") || lowerMessage.includes("聯繫") || 
      lowerMessage.includes("網管") || lowerMessage.includes("聯繫方式")) {
    return createTextWithMenuOption(`📞 聯絡網管

如需進一步協助，您可以：

📧 電子郵件
   • dormnet@ntu.edu.tw
   • 請詳細描述問題並附上相關資訊

📍 計中服務
   • 地址：計中四樓
   • 開放時間：請參考計中網站

💡 提供資訊
   聯絡時請準備：
   • 姓名、學號、房位
   • 問題描述
   • 已嘗試的解決方法
   • 相關截圖或錯誤訊息

我會盡力協助您解決問題！`);
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


