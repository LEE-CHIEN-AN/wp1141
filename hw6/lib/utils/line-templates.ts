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

export function createWelcomeMessage(): LineButtonTemplate {
  return {
    type: "template",
    altText: "功能選單",
    template: {
      type: "buttons",
      text: "您好！我是台大宿舍網管助手，請選擇您需要的服務：",
      actions: [
        {
          type: "postback",
          label: "網路連線問題",
          data: "category:network",
          displayText: "網路連線問題",
        },
        {
          type: "postback",
          label: "資安事件",
          data: "category:security",
          displayText: "資安事件",
        },
        {
          type: "postback",
          label: "註冊問題",
          data: "category:registration",
          displayText: "註冊問題",
        },
        {
          type: "postback",
          label: "其他問題",
          data: "category:other",
          displayText: "其他問題",
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

