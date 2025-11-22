import { CONVERSATION_CATEGORIES } from "@/config/conversation";

export interface LineTextMessage {
  type: "text";
  text: string;
}

export interface LineButtonTemplate {
  type: "template";
  altText: string;
  template: {
    type: "buttons";
    text: string;
    actions: Array<{
      type: "postback" | "message" | "uri";
      label: string;
      data?: string;
      text?: string;
      displayText?: string;
      uri?: string;
    }>;
  };
}

export interface LineCarouselTemplate {
  type: "template";
  altText: string;
  template: {
    type: "carousel";
    columns: Array<{
      title?: string;
      text: string;
      actions: Array<{
        type: "postback" | "message" | "uri";
        label: string;
        data?: string;
        text?: string;
        displayText?: string;
        uri?: string;
      }>;
    }>;
  };
}

export interface LineQuickReply {
  type: "text";
  text: string;
  quickReply?: {
    items: Array<{
      type: "action";
      action: {
        type: "postback" | "message";
        label: string;
        data?: string;
        text?: string;
        displayText?: string;
      };
    }>;
  };
}

export type LineMessage =
  | LineTextMessage
  | LineButtonTemplate
  | LineCarouselTemplate
  | LineQuickReply;

export function createTextMessage(text: string): LineTextMessage {
  return {
    type: "text",
    text,
  };
}

/**
 * 建立主選單（歡迎訊息）
 * 使用 Button Template 呈現核心功能
 */
export function createWelcomeMessage(): LineButtonTemplate {
  return {
    type: "template",
    altText: "主選單 - 台大女八舍宿網小精靈",
    template: {
      type: "buttons",
      text: "您好！我是台大女八舍宿網小精靈 👋\n\n我可以協助您解決宿舍網路相關問題，請選擇您需要的服務：",
      actions: [
        {
          type: "postback",
          label: "🚫 無法上網",
          data: "action:connection_troubleshoot",
          displayText: "無法上網",
        },
        {
          type: "postback",
          label: "📝 如何註冊",
          data: "action:registration_guide",
          displayText: "如何註冊",
        },
        {
          type: "postback",
          label: "🐢 網速很慢",
          data: "action:speed_check",
          displayText: "網速很慢",
        },
        {
          type: "postback",
          label: "📞 聯絡網管",
          data: "action:contact",
          displayText: "聯絡網管",
        },
      ],
    },
  };
}

/**
 * 建立主選單（使用 Carousel 呈現，更詳細的說明）
 */
export function createWelcomeCarousel(): LineCarouselTemplate {
  return {
    type: "template",
    altText: "主選單 - 台大宿舍網管助手",
    template: {
      type: "carousel",
      columns: [
        {
          title: "🌐 網路連線問題",
          text: "協助解決網路相關問題\n\n• 無法連線\n• 網速過慢\n• 網路瞬斷\n• 多人共用問題",
          actions: [
            {
              type: "postback",
              label: "選擇此服務",
              data: "category:network",
              displayText: "網路連線問題",
            },
          ],
        },
        {
          title: "🔒 資安事件",
          text: "協助處理資安相關問題\n\n• 帳號被封鎖\n• 掃毒處理\n• 惡意軟體移除\n• 安全檢查",
          actions: [
            {
              type: "postback",
              label: "選擇此服務",
              data: "category:security",
              displayText: "資安事件",
            },
          ],
        },
        {
          title: "🔑 登入問題",
          text: "協助解決註冊與登入問題\n\n• 無法註冊\n• MAC 地址設定\n• 路由器配置\n• 網段問題",
          actions: [
            {
              type: "postback",
              label: "選擇此服務",
              data: "category:registration",
              displayText: "登入問題",
            },
          ],
        },
      ],
    },
  };
}

/**
 * 建立帶有「回主選單」選項的文字訊息
 */
export function createTextWithMenuOption(
  text: string
): LineQuickReply {
  return {
    type: "text",
    text,
    quickReply: {
      items: [
        {
          type: "action",
          action: {
            type: "postback",
            label: "📋 回主選單",
            data: "menu",
            displayText: "回主選單",
          },
        },
      ],
    },
  };
}

export function createCategoryCarousel(): LineCarouselTemplate {
  return {
    type: "template",
    altText: "問題分類",
    template: {
      type: "carousel",
      columns: [
        {
          text: "網路連線問題\n\n包含：無法連線、網速慢、瞬斷等問題",
          actions: [
            {
              type: "postback",
              label: "選擇此類別",
              data: "category:network",
            },
          ],
        },
        {
          text: "資安事件\n\n包含：帳號被封鎖、掃毒、惡意軟體等",
          actions: [
            {
              type: "postback",
              label: "選擇此類別",
              data: "category:security",
            },
          ],
        },
        {
          text: "註冊問題\n\n包含：無法註冊、MAC 地址、路由器設定等",
          actions: [
            {
              type: "postback",
              label: "選擇此類別",
              data: "category:registration",
            },
          ],
        },
      ],
    },
  };
}

export function createQuickReply(
  text: string,
  options: Array<{ label: string; data: string; displayText?: string }>
): LineQuickReply {
  return {
    type: "text",
    text,
    quickReply: {
      items: options.map((option) => ({
        type: "action",
        action: {
          type: "postback",
          label: option.label,
          data: option.data,
          displayText: option.displayText || option.label,
        },
      })),
    },
  };
}

/**
 * 建立帶有 URI 按鈕的 Button Template
 */
export function createButtonWithUri(
  text: string,
  uriLabel: string,
  uri: string,
  altText?: string
): LineButtonTemplate {
  return {
    type: "template",
    altText: altText || text.substring(0, 40),
    template: {
      type: "buttons",
      text,
      actions: [
        {
          type: "uri",
          label: uriLabel,
          uri: uri,
        },
        {
          type: "postback",
          label: "📋 回主選單",
          data: "menu",
          displayText: "回主選單",
        },
      ],
    },
  };
}

/**
 * 建立帶有多個 URI 按鈕的 Button Template（最多 4 個按鈕）
 */
export function createButtonWithMultipleUris(
  text: string,
  uriOptions: Array<{ label: string; uri: string }>,
  altText?: string
): LineButtonTemplate {
  const actions = [
    ...uriOptions.slice(0, 3).map((option) => ({
      type: "uri" as const,
      label: option.label,
      uri: option.uri,
    })),
    {
      type: "postback" as const,
      label: "📋 回主選單",
      data: "menu",
      displayText: "回主選單",
    },
  ];

  return {
    type: "template",
    altText: altText || text.substring(0, 40),
    template: {
      type: "buttons",
      text,
      actions: actions.slice(0, 4), // Line 最多支援 4 個按鈕
    },
  };
}

