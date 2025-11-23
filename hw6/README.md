# 台大女八舍宿網 Line Chatbot

整合 Line Messaging API 與 Gemini API 的智慧問答機器人系統，專門協助學生解決女八舍網路相關問題。

## 部署連結

### LINE Bot
- **LINE Bot URL**: https://lin.ee/uitjKQX
- **QR Code**: 請掃描 LINE Bot URL 頁面中的 QR Code

### 管理後台
- **Production URL**: https://hw6-linebot.vercel.app/admin
- **登入頁面**: https://hw6-linebot.vercel.app/admin/login

### 管理後台登入資訊
- **帳號**: `f8@ntu.edu.tw`
- **密碼**: `f8networkadmin`

**注意**：目前沒有註冊服務，只有預設的管理員帳號。


## 技術架構

- **框架**: Next.js 16 (App Router) + TypeScript
- **Line API**: 直接整合 Line Messaging API（Reply API + Push Message API 備用）
- **LLM**: Google Gemini API (gemini-1.5-flash，備用：gemini-pro, gemini-1.0-pro)
- **資料庫**: MongoDB Atlas + Mongoose
- **身份驗證**: NextAuth.js v5
- **資料獲取**: SWR (Polling 每 5 秒)
- **樣式**: Tailwind CSS
- **部署**: Vercel


## 環境變數設定

### 本地開發環境設定

1. **複製環境變數範例檔**
   ```bash
   手動建立 .env 檔案
   touch .env
   ```

2. **填入必要的環境變數**

   在 `.env` 檔案中填入以下變數：

   ```env
   # LINE Messaging API
   LINE_CHANNEL_ACCESS_TOKEN=
   LINE_CHANNEL_SECRET=

   # Google Gemini API
   GEMINI_API_KEY=

   # MongoDB Atlas
   MONGODB_URI=

   # NextAuth.js
   NEXTAUTH_SECRET=
   NEXTAUTH_URL=

   # 管理後台登入資訊
   ADMIN_EMAIL=
   ADMIN_PASSWORD=
   ```

### 環境變數說明

| 變數名稱 | 說明 | 取得方式 |
|---------|------|---------|
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Channel Access Token | [LINE Developers Console](https://developers.line.biz/console/) |
| `LINE_CHANNEL_SECRET` | LINE Channel Secret | [LINE Developers Console](https://developers.line.biz/console/) |
| `GEMINI_API_KEY` | Google Gemini API Key | [Google AI Studio](https://makersuite.google.com/app/apikey) |
| `MONGODB_URI` | MongoDB Atlas 連線字串 | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) |
| `NEXTAUTH_SECRET` | NextAuth 密鑰 | 使用 `openssl rand -base64 32` 生成 |
| `NEXTAUTH_URL` | NextAuth 基礎 URL | 本地開發：`http://localhost:3000`，生產環境：您的 Vercel URL |
| `ADMIN_EMAIL` | 管理後台登入帳號 | 自訂 |
| `ADMIN_PASSWORD` | 管理後台登入密碼 | 自訂 |


### 安裝步驟

1. **安裝依賴**
   ```bash
   yarn install
   ```

2. **設定環境變數**
   - 建立`.env`
   - 填入必要的環境變數（參考上方「環境變數設定」）

3. **啟動開發伺服器**
   ```bash
   yarn dev
   ```
   - 開發伺服器會在 `http://localhost:3000` 啟動

4. **設定 ngrok Tunnel（用於 LINE Webhook）**

   由於 LINE Webhook 需要公開的 HTTPS URL，本地開發時需要使用 ngrok 建立 tunnel：

   **安裝 ngrok：**
   ```bash
   # 方式一：使用 npm 全域安裝
   npm install -g ngrok
   
   # 方式二：下載並解壓縮
   # 訪問 https://ngrok.com/download 下載對應平台的版本
   ```

   **啟動 ngrok：**
   ```bash
   ngrok http 3000
   ```

   ngrok 會顯示類似以下的資訊：
   ```
   Forwarding  https://xxxx-xxxx-xxxx.ngrok-free.app -> http://localhost:3000
   ```

   **複製 HTTPS URL**（例如：`https://xxxx-xxxx-xxxx.ngrok-free.app`）

5. **設定 LINE Webhook URL**

   在 [LINE Developers Console](https://developers.line.biz/console/) 中：

   1. 選擇您的 Channel
   2. 進入 **Messaging API** 設定頁面
   3. 找到 **Webhook URL** 設定
   4. 輸入您的 ngrok URL + `/api/line/webhook`：
      ```
      https://xxxx-xxxx-xxxx.ngrok-free.app/api/line/webhook
      ```
   5. 點選 **Update** 儲存
   6. 啟用 **Webhook**（切換開關為 ON）
   7. 點選 **Verify** 驗證 Webhook 是否正常運作

   **注意事項：**
   - 每次重新啟動 ngrok，URL 會改變（除非使用付費版設定固定網域）
   - 需要重新在 LINE Developers Console 更新 Webhook URL
   - 建議使用 ngrok 的固定網域功能（需要註冊帳號）

6. **測試 LINE Bot**

   - 在 LINE 中搜尋您的 Bot 並加為好友
   - 發送測試訊息，確認 Bot 能正常回應
   - 檢查終端機的日誌，確認 Webhook 請求正常接收

7. **開啟應用程式**
   - 開啟瀏覽器訪問 `http://localhost:3000`
   - 管理後台：`http://localhost:3000/admin`

### 本地開發注意事項

1. **ngrok URL 變更**
   - 每次重新啟動 ngrok，URL 會改變
   - 需要重新在 LINE Developers Console 更新 Webhook URL
   - 建議使用 ngrok 的固定網域功能（需要註冊 ngrok 帳號）

2. **環境變數**
   - 確保 `.env` 檔案中的 `NEXTAUTH_URL` 設定為 `http://localhost:3000`
   - 確保所有必要的環境變數都已設定

3. **Webhook 驗證**
   - 在 LINE Developers Console 中點選 **Verify** 驗證 Webhook
   - 如果驗證失敗，檢查：
     - ngrok 是否正常運行
     - Webhook URL 是否正確（包含 `/api/line/webhook`）
     - 開發伺服器是否在 `http://localhost:3000` 運行
     - 環境變數 `LINE_CHANNEL_SECRET` 是否正確

4. **測試流程**
   - 先啟動開發伺服器：`yarn dev`
   - 再啟動 ngrok：`ngrok http 3000`
   - 更新 LINE Webhook URL
   - 驗證 Webhook
   - 在 LINE 中測試 Bot

## 專案結構

```
hw6/
├── app/
│   ├── api/
│   │   ├── line/
│   │   │   └── webhook/route.ts          # LINE Webhook 端點
│   │   ├── conversations/                # 對話紀錄 API
│   │   ├── stats/                        # 統計資料 API
│   │   └── auth/[...nextauth]/          # NextAuth 認證
│   ├── admin/                            # 管理後台
│   │   ├── page.tsx                      # 對話列表頁面
│   │   ├── conversations/[id]/page.tsx   # 對話詳情頁面
│   │   └── login/                        # 登入頁面
│   └── layout.tsx                        # 根布局
├── lib/
│   ├── bottender/
│   │   ├── index.ts                      # Bottender 初始化
│   │   └── handlers.ts                   # 訊息處理邏輯
│   ├── gemini/
│   │   ├── client.ts                     # Gemini API 客戶端
│   │   └── prompts.ts                   # Prompt 模板
│   ├── db/
│   │   ├── connection.ts                 # MongoDB 連線
│   │   └── models/
│   │       ├── User.ts                   # 使用者模型
│   │       ├── Conversation.ts           # 對話模型
│   │       └── Message.ts                # 訊息模型
│   ├── services/
│   │   ├── conversation.ts               # 對話服務層
│   │   ├── message.ts                    # 訊息處理服務
│   │   └── conversation-nodes.ts         # 對話節點定義
│   ├── utils/
│   │   └── line-templates.ts              # LINE 訊息模板工具
│   └── auth/
│       └── config.ts                     # NextAuth 設定
├── config/
│   └── conversation.ts                   # 對話配置
├── .env.example                          # 環境變數範例
├── chatbot-design.md                     # Chatbot 設計文件
├── README.md                             # 本文件
└── package.json                          # 專案依賴
```

## 主要功能

### LINE Bot 功能

- **智慧問答**：使用 Gemini API 理解使用者問題並提供回答
- **對話流程**：31+ 個對話節點，涵蓋網路問題、註冊教學、網速查詢等
- **狀態管理**：維持對話脈絡，提供連貫的對話體驗
- **溫柔引導**：對於無關訊息，禮貌地說明能力範圍並提供功能入口
- **Rich Menu**：提供常駐選單，方便使用者快速選擇功能


### 主要功能特點
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
   - 對話狀態管理（多步驟對話流程）
   - 自由文字回應處理
   - 關鍵字匹配降級
   - 智慧分類（greeting/related/unrelated）
   - 溫柔引導（無關訊息處理）

4. **資料持久化**
   - 所有對話記錄儲存
   - 使用者資訊管理
   - 對話狀態追蹤（metadata.step）
   - 對話分類追蹤（category）

5. **管理後台**
   - 對話列表查看
   - 對話詳情查看
   - 統計資料顯示
   - 即時更新（SWR Polling，每 5 秒）
   - 篩選功能（日期、類別、狀態、關鍵字）
   - 分頁功能


6. **錯誤處理**
   - API 錯誤降級（模型降級、Push Message 備用）
   - 友善的錯誤訊息
   - 明確的配額錯誤提示
   - 回主選單機制

## 技術細節

### 訊息處理流程

1. LINE Webhook 接收使用者訊息
2. 驗證簽章
3. 判斷訊息類型（Postback / 文字 / Follow）
4. 處理訊息（關鍵字匹配 / 對話狀態 / Gemini AI）
5. 產生回應
6. 儲存對話記錄到 MongoDB
7. 回傳回應給使用者

### 對話狀態管理

使用 `Conversation` 模型的 `metadata.step` 欄位追蹤對話狀態：
- `network:step1`：詢問問題影響範圍
- `network:conn_type`：詢問連接方式
- `network:router:troubleshoot`：路由器故障排除
- 等等...

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
1. 嘗試使用主要模型（gemini-1.5-flash）
2. 如果失敗（404 Not Found），嘗試備用模型（gemini-pro, gemini-1.0-pro）
3. 如果配額限制（429），顯示明確的錯誤訊息並引導使用選單
4. 如果所有模型都失敗，降級到關鍵字匹配
5. 如果還是無法處理，顯示錯誤訊息 + 回主選單

### 2. LINE API 錯誤

**處理方式：**
1. 嘗試使用 Reply API 回覆
2. 如果 Reply Token 無效（常見於重送事件），使用 Push Message API 作為備用
3. 記錄錯誤日誌

### 3. 無法理解使用者輸入

**處理方式：**
1. 使用 Gemini 分類器判斷訊息類型
2. 如果是無關訊息，溫柔引導並說明能力範圍
3. 如果是打招呼，友善回應並引導到主選單
4. 如果無法分類，顯示友善的錯誤訊息
5. 提供回主選單選項
6. 列出可用的服務項目

## 相關文件

- **Chatbot 設計文件**: [chatbot-design.md](./chatbot-design.md)
- **對話腳本設計**: [CONVERSATION_SCRIPT_DESIGN.md](./CONVERSATION_SCRIPT_DESIGN.md)
- **系統設計說明**: [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)

## 注意事項

- **請勿將 `.env` 檔案提交到 Git**：已加入 `.gitignore`
- **請勿將敏感資訊（API Key、密碼等）放入程式碼**：使用環境變數
- **部署時請確認所有環境變數都已設定**：特別是 Vercel 環境變數
- **LINE Webhook URL 必須設定正確**：否則 Bot 無法接收訊息

## 授權

本專案為課程作業專案。


