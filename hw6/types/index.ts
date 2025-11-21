export interface LineWebhookEvent {
  type: string;
  timestamp: number;
  source: {
    type: string;
    userId?: string;
  };
  message?: {
    type: string;
    id: string;
    text?: string;
  };
  replyToken?: string;
}

export interface ConversationState {
  status: "initial" | "collecting" | "processing" | "completed";
  category?: string;
  collectedData?: Record<string, unknown>;
}

export interface GeminiResponse {
  text: string;
  metadata?: Record<string, unknown>;
}


