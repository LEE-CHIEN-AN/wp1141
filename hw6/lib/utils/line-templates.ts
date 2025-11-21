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
      type: "postback" | "message";
      label: string;
      data?: string;
      text?: string;
      displayText?: string;
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
        type: "postback" | "message";
        label: string;
        data?: string;
        text?: string;
        displayText?: string;
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
 * 使用 Button Template 呈現服務項目
 */
export function createWelcomeMessage(): LineButtonTemplate {
  return {
    type: "template",
    altText: "主選單 - 台大宿舍網管助手",
    template: {
      type: "buttons",
      text: "您好！我是台大宿舍網管助手 👋\n\n我可以協助您解決以下問題：\n\n• 網路連線相關問題\n• 資安事件處理\n• 宿舍網路註冊與登入\n• 其他網路相關疑問\n\n請選擇您需要的服務：",
      actions: [
        {
          type: "postback",
          label: "🌐 網路連線問題",
          data: "category:network",
          displayText: "網路連線問題",
        },
        {
          type: "postback",
          label: "🔒 資安事件",
          data: "category:security",
          displayText: "資安事件",
        },
        {
          type: "postback",
          label: "🔑 登入問題",
          data: "category:registration",
          displayText: "登入問題",
        },
        {
          type: "postback",
          label: "❓ 其他問題",
          data: "category:other",
          displayText: "其他問題",
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
  options: Array<{ label: string; data: string }>
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
        },
      })),
    },
  };
}

