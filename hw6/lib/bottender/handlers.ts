import { CONVERSATION_CATEGORIES } from "@/config/conversation";
import type { ConversationCategory } from "@/config/conversation";
import {
  getOrCreateUser,
  getOrCreateActiveConversation,
  saveMessage,
  getConversationMessages,
  updateConversation,
} from "@/lib/services/conversation";
import {
  processUserMessage,
  parsePostbackData,
} from "@/lib/services/message";
import { 
  createWelcomeMessage, 
  createTextMessage,
  createTextWithMenuOption 
} from "@/lib/utils/line-templates";
import type { LineMessage } from "@/lib/utils/line-templates";

export interface MessageContext {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  message: string;
  messageId?: string;
  postbackData?: string;
}

export async function handleLineMessage(
  context: MessageContext
): Promise<LineMessage[]> {
  try {
    // 取得或建立使用者
    const user = await getOrCreateUser(
      context.userId,
      context.displayName,
      context.pictureUrl
    );

    // 取得或建立對話
    const conversation = await getOrCreateActiveConversation(user._id);

    // 處理 postback 事件
    if (context.postbackData) {
      return await handlePostback(context.postbackData, conversation._id);
    }

    // 處理歡迎訊息（特殊標記）
    if (context.message === "__WELCOME__") {
      const welcomeMsg = createWelcomeMessage();
      await saveMessage(conversation._id, "assistant", "歡迎使用台大宿舍網管助手！");
      return [welcomeMsg];
    }

    // 儲存使用者訊息
    await saveMessage(
      conversation._id,
      "user",
      context.message,
      context.messageId
    );

    // 判斷對話類別
    let category: ConversationCategory | undefined;
    if (conversation.category) {
      category = conversation.category as ConversationCategory;
    }

    // 取得對話歷史
    const history = await getConversationMessages(conversation._id.toString());
    const conversationHistory = history.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // 處理訊息並產生回應
    const response = await processUserMessage(
      context.message,
      category,
      conversationHistory
    );

    // 儲存助手回應
    await saveMessage(conversation._id, "assistant", getMessageText(response));

    return [response];
  } catch (error) {
    console.error("Error handling message:", error);
    return [
      createTextMessage(
        "抱歉，處理您的訊息時發生錯誤。請稍後再試，或輸入「選單」返回主選單。"
      ),
    ];
  }
}

async function handlePostback(
  data: string,
  conversationId: any
): Promise<LineMessage[]> {
  const { type, value } = parsePostbackData(data);

  if (type === "menu") {
    // 回主選單時，清除對話類別，讓使用者可以重新選擇
    await updateConversation(conversationId.toString(), { 
      category: undefined,
      status: "active"
    });
    const welcomeMsg = createWelcomeMessage();
    await saveMessage(conversationId, "assistant", "主選單");
    return [welcomeMsg];
  }

  // 處理核心功能按鈕
  if (type === "action") {
    let response: LineMessage;
    let category: ConversationCategory | undefined;

    switch (value) {
      case "connection_troubleshoot":
        // 🚫 無法上網 - 連線故障排除
        category = CONVERSATION_CATEGORIES.NETWORK_ISSUE;
        response = createTextWithMenuOption(`🚫 無法上網 - 連線故障排除

關於無法上網的問題，我需要了解以下資訊：

• 是多人同時遇到問題，還是只有您一個人？
• 是完全無法連線，還是會斷斷續續？
• 您有使用路由器嗎？
• 其他裝置（手機、平板）是否也無法上網？

請提供更多詳細資訊，以便我協助您解決問題。`);
        break;

      case "registration_guide":
        // 📝 如何註冊 - 宿網註冊教學
        category = CONVERSATION_CATEGORIES.REGISTRATION;
        response = createTextWithMenuOption(`📝 如何註冊 - 宿網註冊教學

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
        break;

      case "speed_check":
        // 🐢 網速很慢 - 網速與流量查詢
        category = CONVERSATION_CATEGORIES.NETWORK_ISSUE;
        response = createTextWithMenuOption(`🐢 網速很慢 - 網速與流量查詢

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
        break;

      case "contact":
        // 📞 聯絡網管
        response = createTextWithMenuOption(`📞 聯絡網管

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
        break;

      default:
        response = createWelcomeMessage();
    }

    // 更新對話類別（如果有）
    if (category) {
      await updateConversation(conversationId.toString(), { category });
    }

    await saveMessage(conversationId, "assistant", getMessageText(response));
    return [response];
  }

  // 保留舊的 category 處理（向後兼容）
  if (type === "category") {
    let category: ConversationCategory;
    switch (value) {
      case "network":
        category = CONVERSATION_CATEGORIES.NETWORK_ISSUE;
        break;
      case "security":
        category = CONVERSATION_CATEGORIES.SECURITY_INCIDENT;
        break;
      case "registration":
        category = CONVERSATION_CATEGORIES.REGISTRATION;
        break;
      default:
        category = CONVERSATION_CATEGORIES.OTHER;
    }

    await updateConversation(conversationId.toString(), { category });
    const response = await processUserMessage("", category);
    await saveMessage(conversationId, "assistant", getMessageText(response));
    return [response];
  }

  return [createWelcomeMessage()];
}

function getMessageText(message: LineMessage): string {
  if (message.type === "text") {
    return message.text;
  }
  if (message.type === "template") {
    return message.altText;
  }
  return "";
}

