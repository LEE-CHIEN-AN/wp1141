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
import { createWelcomeMessage, createTextMessage } from "@/lib/utils/line-templates";
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

    // 更新對話類別
    await updateConversation(conversationId.toString(), { category });

    // 根據類別產生回應
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

