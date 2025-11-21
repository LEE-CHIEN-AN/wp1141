import { ConversationCategory } from "@/config/conversation";

const SYSTEM_PROMPT = `你是台大宿舍網管助手，專門協助學生解決宿舍網路相關問題。
你的回答應該：
1. 友善、專業、有耐心
2. 提供具體的解決步驟
3. 必要時引導學生提供更多資訊
4. 使用繁體中文回答

請根據使用者的問題，提供適當的協助。`;

const KNOWLEDGE_BASE = `
## 常見問題與解決方案

### 網路連線問題
- 多人反映網路連不到、太慢：需要錄封包分析
- 個人反映瞬斷、網速慢：使用 PingInfoView 工具檢測
- 確認是否為硬體問題（網路線、路由器接觸不良）

### 資安事件
- 請同學掃毒（電腦、手機、平板）
- 使用完整掃描（可能需要數小時）
- 掃描完成後截圖回傳
- 短期多次觸發需至計中四樓檢查

### 註冊問題
- 確認網段是否正確
- 確認 MAC 地址是否為路由器 MAC
- 註冊網站：https://140.112.2.197
- 路由器設定：WAN 設置改成浮動 IP

### 回信範本
已確認您的網段於女八舍。請先向宿舍輔導員報到，等住宿組資料更新後即可註冊。
`;

export function buildPrompt(
  userMessage: string,
  category?: ConversationCategory,
  context?: string
): string {
  let prompt = SYSTEM_PROMPT;

  if (category) {
    prompt += `\n\n當前問題分類：${category}`;
  }

  prompt += `\n\n${KNOWLEDGE_BASE}`;

  if (context) {
    prompt += `\n\n對話上下文：\n${context}`;
  }

  prompt += `\n\n使用者問題：${userMessage}\n\n請提供適當的回答：`;

  return prompt;
}

export const DEFAULT_RESPONSES = {
  WELCOME: `您好！我是台大宿舍網管助手，可以協助您解決以下問題：

1. 網路連線問題
2. 資安事件處理
3. 註冊問題
4. 其他問題

請告訴我您遇到什麼問題，或點選下方選單選擇問題類型。`,

  NETWORK_ISSUE: `關於網路連線問題，我需要了解：
- 是多人同時遇到問題，還是只有您一個人？
- 問題是無法連線、網速慢，還是會瞬斷？
- 您有使用路由器嗎？

請提供更多詳細資訊，以便我協助您解決。`,

  SECURITY_INCIDENT: `關於資安事件，請執行以下步驟：

1. 移除惡意軟體
2. 安裝並更新防毒軟體（Windows Defender、Avast、McAfee 等）
3. 執行完整掃描（針對電腦、手機、平板）
4. 掃描完成後截圖回傳

完整掃描可能需要數小時，請耐心等待。`,

  REGISTRATION: `關於註冊問題，請確認：

1. 您的網段是否正確（女八舍）
2. 是否已向宿舍輔導員報到
3. MAC 地址是否為路由器的 MAC（非電腦 MAC）
4. 路由器 WAN 設置是否為浮動 IP

註冊網站：https://140.112.2.197
（需在校內網路環境下才能進入）

如需進一步協助，請提供您的姓名、學號、房位等資訊。`,

  FALLBACK: `抱歉，我無法理解您的問題。請選擇以下選項：
1. 網路連線問題
2. 資安事件處理
3. 註冊問題
4. 其他問題

或直接描述您遇到的問題，我會盡力協助您。`,
} as const;


