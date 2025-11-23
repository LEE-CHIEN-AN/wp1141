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

    // 檢查對話狀態（metadata.step）
    const conversationStep = conversation.metadata?.step as string | undefined;
    const lowerMessage = context.message.toLowerCase();

    // 如果有對話狀態，優先處理逐步詢問流程
    if (category === CONVERSATION_CATEGORIES.NETWORK_ISSUE) {
      // 處理第一個問題的回答（多人還是個人？）
      if (!conversationStep || conversationStep === "network:step1") {
        if (lowerMessage.includes("一個人") || lowerMessage === "一個人" ||
            lowerMessage.includes("只有我") || lowerMessage.includes("只有我一個人") ||
            lowerMessage.includes("個人") || lowerMessage === "個人" ||
            lowerMessage.includes("我自己") || lowerMessage.includes("個人問題")) {
          // 個人問題 → 詢問連接方式
          const { createSingleUserConnectionTypeNode } = await import("@/lib/services/conversation-nodes");
          const response = createSingleUserConnectionTypeNode();
          await updateConversation(conversation._id.toString(), { 
            category,
            metadata: { step: "network:conn_type", answer1: "single" }
          });
          await saveMessage(conversation._id, "assistant", getMessageText(response));
          return [response];
        }
        
        if (lowerMessage.includes("多人") || lowerMessage === "多人" ||
            lowerMessage === "多人問題" || lowerMessage.includes("好幾") ||
            lowerMessage.includes("室友") || lowerMessage.includes("大家一起")) {
          // 多人問題 → 詢問路由器
          const { createMultipleUsersRouterCheckNode } = await import("@/lib/services/conversation-nodes");
          const response = createMultipleUsersRouterCheckNode();
          await updateConversation(conversation._id.toString(), { 
            category,
            metadata: { step: "network:multi:router_check" }
          });
          await saveMessage(conversation._id, "assistant", getMessageText(response));
          return [response];
        }
        
        // 如果關鍵字沒有匹配，且處於 step1 狀態，提示使用者使用按鈕
        // 避免進入 processUserMessage 導致重複問問題
        if (conversationStep === "network:step1") {
          const { createConnectionTroubleshootNode } = await import("@/lib/services/conversation-nodes");
          const response = createConnectionTroubleshootNode();
          // 保持 step1 狀態，不更新
          await saveMessage(conversation._id, "assistant", getMessageText(response));
          return [response];
        }
      }
      
      // 處理連接方式判定後的回答
      if (conversationStep === "network:conn_type") {
        if (lowerMessage.includes("路由器") || lowerMessage.includes("wifi") || 
            lowerMessage.includes("無線") || lowerMessage.includes("分享器")) {
          // 路由器 → 路由器排查流程
          const { createRouterTroubleshootNode } = await import("@/lib/services/conversation-nodes");
          const response = createRouterTroubleshootNode();
          await updateConversation(conversation._id.toString(), { 
            category,
            metadata: { step: "network:router:troubleshoot" }
          });
          await saveMessage(conversation._id, "assistant", getMessageText(response));
          return [response];
        } else if (lowerMessage.includes("直接") || lowerMessage.includes("插線") || 
                   lowerMessage.includes("有線") || lowerMessage.includes("網路線") ||
                   lowerMessage.includes("電腦") || lowerMessage.includes("直連")) {
          // 電腦直連 → 症狀診斷 Carousel
          const { createDirectConnectionSymptomNode } = await import("@/lib/services/conversation-nodes");
          const response = createDirectConnectionSymptomNode();
          await updateConversation(conversation._id.toString(), { 
            category,
            metadata: {}
          });
          await saveMessage(conversation._id, "assistant", getMessageText(response));
          return [response];
        }
        
        // 如果關鍵字沒有匹配，重新顯示連接方式選擇
        if (conversationStep === "network:conn_type") {
          const { createSingleUserConnectionTypeNode } = await import("@/lib/services/conversation-nodes");
          const response = createSingleUserConnectionTypeNode();
          await saveMessage(conversation._id, "assistant", getMessageText(response));
          return [response];
        }
      }
      
      // 處理多人問題路由器檢查的回答
      if (conversationStep === "network:multi:router_check") {
        if (lowerMessage.includes("恢復") || lowerMessage.includes("可以了") || 
            lowerMessage.includes("好了") || lowerMessage.includes("正常")) {
          // 路由器問題已解決
          const { createMultipleUsersRouterResolvedNode } = await import("@/lib/services/conversation-nodes");
          const response = createMultipleUsersRouterResolvedNode();
          await updateConversation(conversation._id.toString(), { 
            category,
            metadata: {}
          });
          await saveMessage(conversation._id, "assistant", getMessageText(response));
          return [response];
        } else if (lowerMessage.includes("不行") || lowerMessage.includes("還是不行") ||
                   lowerMessage.includes("無效") || lowerMessage.includes("報修")) {
          // 引導報修/錄封包
          const { createMultipleUsersReportNode } = await import("@/lib/services/conversation-nodes");
          const response = createMultipleUsersReportNode();
          await updateConversation(conversation._id.toString(), { 
            category,
            metadata: {}
          });
          await saveMessage(conversation._id, "assistant", getMessageText(response));
          return [response];
        }
        
        // 如果關鍵字沒有匹配，重新顯示路由器檢查問題
        if (conversationStep === "network:multi:router_check") {
          const { createMultipleUsersRouterCheckNode } = await import("@/lib/services/conversation-nodes");
          const response = createMultipleUsersRouterCheckNode();
          await saveMessage(conversation._id, "assistant", getMessageText(response));
          return [response];
        }
      }
      
      // 處理路由器排查的回答
      if (conversationStep === "network:router:troubleshoot") {
        if (lowerMessage.includes("可以了") || lowerMessage.includes("好了") || 
            lowerMessage.includes("恢復") || lowerMessage.includes("正常")) {
          // 路由器問題已解決
          const { createRouterFixedNode } = await import("@/lib/services/conversation-nodes");
          const response = createRouterFixedNode();
          await updateConversation(conversation._id.toString(), { 
            category,
            metadata: {}
          });
          await saveMessage(conversation._id, "assistant", getMessageText(response));
          return [response];
        }
        
        // 如果關鍵字沒有匹配，重新顯示路由器排查步驟
        if (conversationStep === "network:router:troubleshoot") {
          const { createRouterTroubleshootNode } = await import("@/lib/services/conversation-nodes");
          const response = createRouterTroubleshootNode();
          await saveMessage(conversation._id, "assistant", getMessageText(response));
          return [response];
        }
      }
      
      // 處理第二個問題的回答（完全無法連線還是會斷斷續續？）
      if (conversationStep && conversationStep.startsWith("network:step2")) {
        if (lowerMessage.includes("完全無法") || lowerMessage.includes("完全連不上") ||
            lowerMessage.includes("完全不能") || lowerMessage === "完全無法連線") {
          // 完全無法連線 → 顯示檢查清單
          const { createNoConnectionChecklistNode } = await import("@/lib/services/conversation-nodes");
          const response = createNoConnectionChecklistNode();
          await updateConversation(conversation._id.toString(), { 
            category,
            metadata: {}
          });
          await saveMessage(conversation._id, "assistant", getMessageText(response));
          return [response];
        } else if (lowerMessage.includes("斷斷續續") || lowerMessage.includes("會斷") ||
                   lowerMessage.includes("網速慢") || lowerMessage.includes("很慢") ||
                   lowerMessage.includes("瞬斷")) {
          // 會斷斷續續/網速慢 → 提供 PingInfoView 教學
          const { createSingleUserPingInfoViewNode } = await import("@/lib/services/conversation-nodes");
          const response = createSingleUserPingInfoViewNode();
          await updateConversation(conversation._id.toString(), { 
            category,
            metadata: {}
          });
          await saveMessage(conversation._id, "assistant", getMessageText(response));
          return [response];
        }
        
        // 如果關鍵字沒有匹配，且處於 step2 狀態，重新顯示第二個問題
        // 避免進入 processUserMessage 導致重複問問題
        if (conversationStep.startsWith("network:step2")) {
          const { createSingleUserQuestion2Node } = await import("@/lib/services/conversation-nodes");
          const response = createSingleUserQuestion2Node();
          // 保持 step2 狀態，不更新
          await saveMessage(conversation._id, "assistant", getMessageText(response));
          return [response];
        }
      }
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
        // 設置對話狀態為第一個問題階段
        await updateConversation(conversationId.toString(), { 
          category,
          metadata: { step: "network:step1" }
        });
        break;

      case "registration_guide":
        // 📝 如何註冊 - 宿網註冊教學（節點 10）
        category = CONVERSATION_CATEGORIES.REGISTRATION;
        response = ConversationNodes.createRegistrationTypeSelectionNode();
        // 清除對話狀態，避免影響後續處理
        await updateConversation(conversationId.toString(), { 
          category,
          metadata: {}
        });
        break;

      case "speed_check":
        // 🐢 網速很慢 - 網速與流量查詢（節點 20）
        category = CONVERSATION_CATEGORIES.NETWORK_ISSUE;
        response = ConversationNodes.createSpeedCheckNode();
        // 清除對話狀態，避免影響後續處理
        await updateConversation(conversationId.toString(), { 
          category,
          metadata: {}
        });
        break;

      case "contact":
        // 📞 聯絡網管（節點 30）
        response = ConversationNodes.createContactNode();
        // 清除對話狀態，避免影響後續處理
        await updateConversation(conversationId.toString(), { 
          category: undefined,
          metadata: {}
        });
        break;

      default:
        response = createWelcomeMessage();
    }

    // 更新對話類別（如果還沒有在 switch 中更新）
    // 注意：所有 action 都已經在 switch 中更新了狀態，這裡不需要再次更新

    await saveMessage(conversationId, "assistant", getMessageText(response));
    return [response];
  }

  // 處理網路問題相關節點
  if (type === "network") {
    let response: LineMessage;
    let category: ConversationCategory | undefined = CONVERSATION_CATEGORIES.NETWORK_ISSUE;

    // 處理逐步詢問流程
    if (value?.startsWith("step1:")) {
      // 第一個問題的回答
      const answer = value.split(":")[1]; // "multiple" 或 "single"
      
      if (answer === "multiple") {
        // 多人問題 → 詢問路由器
        response = ConversationNodes.createMultipleUsersRouterCheckNode();
        await updateConversation(conversationId.toString(), { 
          category,
          metadata: { step: "network:multi:router_check" }
        });
      } else if (answer === "single") {
        // 個人問題 → 詢問連接方式
        response = ConversationNodes.createSingleUserConnectionTypeNode();
        await updateConversation(conversationId.toString(), { 
          category,
          metadata: { step: "network:conn_type", answer1: "single" }
        });
      } else {
        response = ConversationNodes.createConnectionTroubleshootNode();
      }
    } else if (value?.startsWith("conn:")) {
      // 連接方式判定
      const connType = value.split(":")[1]; // "router" 或 "direct"
      
      if (connType === "router") {
        // 路由器 → 路由器排查流程
        response = ConversationNodes.createRouterTroubleshootNode();
        await updateConversation(conversationId.toString(), { 
          category,
          metadata: { step: "network:router:troubleshoot" }
        });
      } else if (connType === "direct") {
        // 電腦直連 → 症狀診斷 Carousel
        response = ConversationNodes.createDirectConnectionSymptomNode();
        await updateConversation(conversationId.toString(), { 
          category,
          metadata: {}
        });
      } else {
        response = ConversationNodes.createConnectionTroubleshootNode();
      }
    } else if (value?.startsWith("multi:")) {
      // 多人問題流程
      const action = value.split(":")[1]; // "report", "resolved", "check_router", "check_traffic"
      
      if (action === "check_router") {
        // 第一步：檢查路由器接線
        response = ConversationNodes.createMultipleUsersRouterCheckWiringNode();
        await updateConversation(conversationId.toString(), { 
          category,
          metadata: { step: "network:multi:check_router" }
        });
      } else if (action === "check_traffic") {
        // 第二步：檢查流量
        response = ConversationNodes.createMultipleUsersTrafficCheckNode();
        await updateConversation(conversationId.toString(), { 
          category,
          metadata: { step: "network:multi:check_traffic" }
        });
      } else if (action === "report") {
        // 第三步：引導報修/錄封包
        response = ConversationNodes.createMultipleUsersReportNode();
        await updateConversation(conversationId.toString(), { 
          category,
          metadata: {}
        });
      } else if (action === "resolved") {
        // 路由器問題已解決
        response = ConversationNodes.createMultipleUsersRouterResolvedNode();
        await updateConversation(conversationId.toString(), { 
          category,
          metadata: {}
        });
      } else {
        response = ConversationNodes.createMultipleUsersRouterCheckNode();
      }
    } else if (value?.startsWith("router:")) {
      // 路由器排查流程
      const action = value.split(":")[1]; // "fixed"
      
      if (action === "fixed") {
        // 路由器問題已解決
        response = ConversationNodes.createRouterFixedNode();
        await updateConversation(conversationId.toString(), { 
          category,
          metadata: {}
        });
      } else {
        response = ConversationNodes.createRouterTroubleshootNode();
      }
    } else if (value?.startsWith("symptom:")) {
      // 症狀診斷結果
      const symptom = value.split(":")[1]; // "hardware", "config", "blocked"
      
      if (symptom === "hardware") {
        // 硬體檢查流程
        response = ConversationNodes.createHardwareCheckNode();
      } else if (symptom === "config") {
        // 設定檢查流程
        response = ConversationNodes.createConfigCheckNode();
      } else if (symptom === "blocked") {
        // 違規查詢流程
        response = ConversationNodes.createBlockedStatusNode();
      } else {
        response = ConversationNodes.createDirectConnectionSymptomNode();
      }
      
      await updateConversation(conversationId.toString(), { 
        category,
        metadata: {}
      });
    } else if (value?.startsWith("step2:")) {
      // 第二個問題的回答
      const answer = value.split(":")[1]; // "no_connection" 或 "intermittent"
      
      if (answer === "no_connection") {
        // 完全無法連線 → 顯示檢查清單
        response = ConversationNodes.createNoConnectionChecklistNode();
        // 清除對話狀態
        await updateConversation(conversationId.toString(), { 
          category,
          metadata: { step: undefined }
        });
      } else if (answer === "intermittent") {
        // 會斷斷續續/網速慢 → 提供 PingInfoView 教學
        response = ConversationNodes.createSingleUserPingInfoViewNode();
        // 清除對話狀態
        await updateConversation(conversationId.toString(), { 
          category,
          metadata: { step: undefined }
        });
      } else {
        response = ConversationNodes.createSingleUserQuestion2Node();
      }
    } else {
      // 其他網路相關節點（向後兼容）
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
      case "show_email":
        // 顯示網管 Email 地址
        response = createTextWithMenuOption(
          "📧 女八舍網管 Email 地址：\n\nb12705041@ntu.edu.tw\n\n請複製此 Email 地址，並在您的郵件應用程式中寄信給網管。\n\n📋 信件內容請包含：\n• 學號\n• 姓名\n• MAC 地址\n• 目前的網段在哪間宿舍"
        );
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
    // 確保 message 有 altText 屬性
    const templateMessage = message as { altText: string; template: any };
    if (templateMessage.altText) {
      // Carousel template
      if ("columns" in templateMessage.template) {
        return templateMessage.altText || "選單選項";
      }
      // Button template
      if ("text" in templateMessage.template) {
        return templateMessage.template.text || templateMessage.altText;
      }
      return templateMessage.altText;
    }
  }
  if (message.type === "flex") {
    // Flex Message 使用 altText 作為文字內容
    const flexMessage = message as { altText: string; contents: any };
    return flexMessage.altText || "Flex 訊息";
  }
  // 如果無法取得文字，返回預設值（避免資料庫驗證失敗）
  return "訊息內容";
}

