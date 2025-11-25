export const GEMINI_MODEL = "gemini-2.5-flash";

export const GEMINI_CONFIG = {
  temperature: 0.7,
  topP: 0.8,
  topK: 40,
  maxOutputTokens: 1024,
};

export const CONVERSATION_CATEGORIES = {
  NETWORK_ISSUE: "網路連線問題",
  SECURITY_INCIDENT: "資安事件",
  REGISTRATION: "註冊問題",
  OTHER: "其他問題",
} as const;

export type ConversationCategory =
  (typeof CONVERSATION_CATEGORIES)[keyof typeof CONVERSATION_CATEGORIES];


