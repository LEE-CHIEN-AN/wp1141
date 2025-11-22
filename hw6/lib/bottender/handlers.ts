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
import * as ConversationNodes from "@/lib/services/conversation-nodes";

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

    // 處理 Follow 事件 (使用者加好友)
    if (context.message === "__FOLLOW__") {
      const welcomeMsg = createWelcomeMessage();
      await saveMessage(conversation._id, "assistant", "歡迎使用台大女八舍宿網小精靈！");
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
        // 🚫 無法上網 - 連線故障排除（節點 2）
        category = CONVERSATION_CATEGORIES.NETWORK_ISSUE;
        response = ConversationNodes.createConnectionTroubleshootNode();
        break;

      case "registration_guide":
        // 📝 如何註冊 - 宿網註冊教學（節點 10）
        category = CONVERSATION_CATEGORIES.REGISTRATION;
        response = ConversationNodes.createRegistrationTypeSelectionNode();
        break;

      case "speed_check":
        // 🐢 網速很慢 - 網速與流量查詢（節點 20）
        category = CONVERSATION_CATEGORIES.NETWORK_ISSUE;
        response = ConversationNodes.createSpeedCheckNode();
        break;

      case "contact":
        // 📞 聯絡網管（節點 30）
        response = ConversationNodes.createContactNode();
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

  // 處理網路問題相關節點
  if (type === "network") {
    let response: LineMessage;
    let category: ConversationCategory | undefined = CONVERSATION_CATEGORIES.NETWORK_ISSUE;

    switch (value) {
      case "multiple":
        response = ConversationNodes.createMultipleUsersPacketCaptureNode();
        break;
      case "single":
        response = ConversationNodes.createSingleUserPingInfoViewNode();
        break;
      case "no_connection":
        response = ConversationNodes.createNoConnectionChecklistNode();
        break;
      case "hardware_detail":
        response = ConversationNodes.createHardwareCheckDetailNode();
        break;
      case "ip_setting_detail":
        response = ConversationNodes.createIpSettingDetailNode();
        break;
      case "pinginfo_screenshot":
        response = ConversationNodes.createPingInfoScreenshotGuideNode();
        break;
      case "check_blocked":
        response = ConversationNodes.createNoConnectionChecklistNode();
        break;
      default:
        response = ConversationNodes.createConnectionTroubleshootNode();
    }

    await updateConversation(conversationId.toString(), { category });
    await saveMessage(conversationId, "assistant", getMessageText(response));
    return [response];
  }

  // 處理註冊相關節點
  if (type === "registration") {
    let response: LineMessage;
    let category: ConversationCategory | undefined = CONVERSATION_CATEGORIES.REGISTRATION;

    switch (value) {
      case "first_time":
        response = ConversationNodes.createFirstTimeRegistrationPrepNode();
        break;
      case "first_time_steps":
        response = ConversationNodes.createRegistrationStepsDetailNode();
        break;
      case "post_registration":
        response = ConversationNodes.createPostRegistrationSetupNode();
        break;
      case "router":
        response = ConversationNodes.createRouterSetupNode();
        break;
      case "router_mac":
        response = ConversationNodes.createMacAddressSetupNode();
        break;
      case "router_faq":
        response = ConversationNodes.createRouterFAQNode();
        break;
      case "router_wan":
        response = ConversationNodes.createRouterWANSetupNode();
        break;
      case "router_mac_issue":
        response = ConversationNodes.createMacAddressSetupNode();
        break;
      case "router_no_internet":
        response = ConversationNodes.createRouterFAQNode();
        break;
      case "change_mac":
        response = ConversationNodes.createChangeMacAddressNode();
        break;
      case "change_computer":
        response = ConversationNodes.createChangeComputerNode();
        break;
      case "mac_duplicate":
        response = ConversationNodes.createMacDuplicateNode();
        break;
      case "troubleshoot":
        response = ConversationNodes.createRegistrationTroubleshootNode();
        break;
      case "cant_access":
        response = ConversationNodes.createCantAccessRegistrationNode();
        break;
      case "data_issue":
        response = ConversationNodes.createRegistrationDataIssueNode();
        break;
      case "no_internet_after":
        response = ConversationNodes.createNoInternetAfterRegistrationNode();
        break;
      default:
        response = ConversationNodes.createRegistrationTypeSelectionNode();
    }

    await updateConversation(conversationId.toString(), { category });
    await saveMessage(conversationId, "assistant", getMessageText(response));
    return [response];
  }

  // 處理網速相關節點
  if (type === "speed") {
    let response: LineMessage;
    let category: ConversationCategory | undefined = CONVERSATION_CATEGORIES.NETWORK_ISSUE;

    switch (value) {
      case "quota":
        response = ConversationNodes.createQuotaCheckNode();
        break;
      case "test":
        response = ConversationNodes.createSpeedTestNode();
        break;
      case "analysis":
        response = ConversationNodes.createSpeedAnalysisNode();
        break;
      case "advanced":
        response = ConversationNodes.createAdvancedTroubleshootNode();
        break;
      default:
        response = ConversationNodes.createSpeedCheckNode();
    }

    await updateConversation(conversationId.toString(), { category });
    await saveMessage(conversationId, "assistant", getMessageText(response));
    return [response];
  }

  // 處理聯絡網管相關節點
  if (type === "contact") {
    let response: LineMessage;

    switch (value) {
      case "info":
        response = ConversationNodes.createContactInfoNode();
        break;
      case "info_list":
        response = ConversationNodes.createContactInfoListNode();
        break;
      default:
        response = ConversationNodes.createContactNode();
    }

    await saveMessage(conversationId, "assistant", getMessageText(response));
    return [response];
  }

  // 處理資安事件
  if (type === "security") {
    let response: LineMessage;
    let category: ConversationCategory | undefined = CONVERSATION_CATEGORIES.SECURITY_INCIDENT;

    switch (value) {
      case "incident":
        response = ConversationNodes.createSecurityIncidentNode();
        break;
      default:
        response = ConversationNodes.createSecurityIncidentNode();
    }

    await updateConversation(conversationId.toString(), { category });
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
    if ("altText" in message) {
      return message.altText;
    }
    // Carousel template
    if ("columns" in message.template) {
      return message.altText || "選單選項";
    }
    // Button template
    if ("text" in message.template) {
      return message.template.text || message.altText;
    }
  }
  return "";
}

