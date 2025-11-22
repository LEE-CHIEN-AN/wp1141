# 台大宿舍網管 Line Chatbot 系統設計說明

## 系統架構概覽

### 1. 整體流程

```
使用者發送訊息
    ↓
Line Webhook (app/api/line/webhook/route.ts)
    ↓
驗證簽章 → 獲取使用者資訊
    ↓
handleLineMessage (lib/bottender/handlers.ts)
    ↓
判斷訊息類型：
  - Postback 事件（按鈕點擊）
  - 文字訊息
  - Follow 事件（加好友）
    ↓
處理訊息 → 產生回應
    ↓
儲存對話記錄到 MongoDB
    ↓
回傳回應給使用者
```

## 用戶輸入方式

### 方式一：點選按鈕（Postback）

當使用者點選主選單的按鈕時，會觸發 **Postback 事件**：

**主選單按鈕：**
- 🚫 無法上網 → `data: "action:connection_troubleshoot"`
- 📝 如何註冊 → `data: "action:registration_guide"`
- 🐢 網速很慢 → `data: "action:speed_check"`
- 📞 聯絡網管 → `data: "action:contact"`

**處理流程：**
1. 接收 Postback 事件
2. 解析 `data` 欄位（格式：`action:功能名稱`）
3. 根據功能名稱產生對應的回應
4. 更新對話類別（如果有）
5. 儲存回應到資料庫

### 方式二：輸入文字訊息

使用者可以直接輸入文字，系統會進行以下處理：

#### 1. 特殊指令（回主選單）
**關鍵字：** 選單、menu、功能、主選單、返回、回主選單、重新開始

**回應：** 顯示主選單

#### 2. 核心功能關鍵字匹配

**🚫 無法上網**
- 關鍵字：無法上網、連不上、連線故障、不能上網
- 回應：詢問問題詳情

**📝 如何註冊**
- 關鍵字：如何註冊、註冊、宿網註冊、註冊教學
- 回應：完整的註冊步驟教學

**🐢 網速很慢**
- 關鍵字：網速、很慢、流量、速度慢
- 回應：網速問題分析與建議

**📞 聯絡網管**
- 關鍵字：聯絡、聯繫、網管、聯繫方式
- 回應：聯絡資訊與注意事項

#### 3. 對話上下文處理

如果使用者已經選擇了某個功能（有對話類別），系統會：
1. 使用 Gemini API 理解使用者的自由文字回應
2. 結合對話歷史（最近 10 條訊息）
3. 產生智能回應
4. 如果 Gemini 失敗，使用關鍵字匹配作為降級方案

#### 4. 一般文字處理

如果無法匹配關鍵字，系統會：
1. 嘗試使用 Gemini API 理解
2. 如果失敗，顯示錯誤訊息並提供回主選單選項

### 方式三：加好友時（Follow Event）

當使用者加好友時：
1. 自動觸發 Follow 事件
2. 發送歡迎訊息（主選單）
3. 儲存使用者資訊到資料庫

## Line 回應訊息設計

### 1. Button Template（主選單）

**使用時機：**
- 歡迎訊息
- 回主選單時

**結構：**
```typescript
{
  type: "template",
  altText: "主選單 - 台大宿舍網管助手",
  template: {
    type: "buttons",
    text: "歡迎訊息文字...",
    actions: [
      {
        type: "postback",
        label: "🚫 無法上網",
        data: "action:connection_troubleshoot",
        displayText: "無法上網"
      },
      // ... 其他按鈕
    ]
  }
}
```

**優點：**
- 使用者不需要輸入，直接點選
- 清楚呈現所有可用功能
- 降低使用門檻

### 2. Text Message + Quick Reply

**使用時機：**
- 功能回應
- 需要進一步互動時

**結構：**
```typescript
{
  type: "text",
  text: "回應內容...",
  quickReply: {
    items: [
      {
        type: "action",
        action: {
          type: "postback",
          label: "📋 回主選單",
          data: "menu",
          displayText: "回主選單"
        }
      }
    ]
  }
}
```

**優點：**
- 提供詳細的文字說明
- 快速回覆選項方便操作
- 隨時可以回主選單

### 3. 純文字訊息

**使用時機：**
- Gemini API 回應
- 簡單的訊息

**結構：**
```typescript
{
  type: "text",
  text: "回應內容..."
}
```

## 對話流程設計

### 場景一：使用者點選「🚫 無法上網」

```
1. 使用者點選按鈕
   ↓
2. 系統接收 Postback: "action:connection_troubleshoot"
   ↓
3. 產生回應（詢問問題詳情）
   ↓
4. 更新對話類別為「網路連線問題」
   ↓
5. 使用者輸入「只有我一個人」
   ↓
6. 系統使用 Gemini 理解回應
   ↓
7. 或使用關鍵字匹配（「只有」、「一個人」→ 個人問題）
   ↓
8. 提供對應的解決方案
```

### 場景二：使用者輸入「如何註冊」

```
1. 使用者輸入文字：「如何註冊」
   ↓
2. 系統匹配關鍵字
   ↓
3. 直接提供完整的註冊教學
   ↓
4. 回應包含「📋 回主選單」選項
```

### 場景三：使用者輸入自由文字

```
1. 使用者輸入：「我的網路一直斷線」
   ↓
2. 系統檢查是否有對話類別
   ↓
3. 如果有類別：
   - 使用 Gemini + 對話歷史理解
   - 產生智能回應
   ↓
4. 如果沒有類別：
   - 嘗試使用 Gemini 理解
   - 或匹配關鍵字
   - 或顯示錯誤訊息 + 回主選單
```

## 資料儲存

### MongoDB 模型

**User（使用者）**
- `lineUserId`: Line 使用者 ID
- `displayName`: 顯示名稱
- `pictureUrl`: 頭像 URL

**Conversation（對話）**
- `userId`: 使用者 ID
- `status`: 狀態（active/completed/archived）
- `category`: 對話類別（網路連線問題/資安事件/註冊問題）
- `metadata`: 額外資訊

**Message（訊息）**
- `conversationId`: 對話 ID
- `role`: 角色（user/assistant）
- `content`: 訊息內容
- `lineMessageId`: Line 訊息 ID

## 錯誤處理與降級機制

### 1. Gemini API 失敗

**處理方式：**
1. 嘗試使用 Gemini API
2. 如果失敗（配額限制、API 錯誤等）
3. 降級到關鍵字匹配
4. 如果還是無法處理，顯示錯誤訊息 + 回主選單

### 2. 無法理解使用者輸入

**處理方式：**
1. 顯示友善的錯誤訊息
2. 提供回主選單選項
3. 列出可用的服務項目

## 主要功能特點

### ✅ 已實現

1. **主選單系統**
   - 歡迎訊息（加好友時自動發送）
   - 四個核心功能按鈕
   - 回主選單機制

2. **多種輸入方式**
   - 按鈕點選（Postback）
   - 文字輸入（關鍵字匹配）
   - 自由文字（Gemini 理解）

3. **智能對話**
   - 對話上下文理解
   - 自由文字回應處理
   - 關鍵字匹配降級

4. **資料持久化**
   - 所有對話記錄儲存
   - 使用者資訊管理
   - 對話狀態追蹤

5. **管理後台**
   - 對話列表查看
   - 對話詳情查看
   - 統計資料顯示
   - 即時更新（SWR Polling）

6. **錯誤處理**
   - API 錯誤降級
   - 友善的錯誤訊息
   - 回主選單機制

## 技術架構

- **框架**: Next.js 16 (App Router) + TypeScript
- **Line API**: 直接整合 Line Messaging API
- **LLM**: Google Gemini API (gemini-1.5-flash)
- **資料庫**: MongoDB Atlas + Mongoose
- **身份驗證**: NextAuth.js
- **資料獲取**: SWR (Polling 每 5 秒)
- **部署**: Vercel

