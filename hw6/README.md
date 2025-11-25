# 台大女八舍宿網 Line Chatbot

整合 Line Messaging API 與 Gemini API 的智慧問答機器人系統，專門協助學生解決女八舍網路相關問題。

## 部署連結

### LINE Bot
- **LINE Bot URL**: https://lin.ee/uitjKQX
- **QR Code**: 請掃描 LINE Bot URL 頁面中的 QR Code，或直接點擊連結加入好友

### 管理後台
- **Production URL**: https://hw6-linebot.vercel.app/admin
- **登入頁面**: https://hw6-linebot.vercel.app/admin/login

### 管理後台登入資訊
- **帳號**: `f8@ntu.edu.tw`
- **密碼**: `f8networkadmin`

**注意**：目前沒有註冊服務，只有預設的管理員帳號。

## 系統架構

### 架構圖

```mermaid
graph TB
    subgraph "使用者端"
        A[LINE App]
    end
    
    subgraph "Vercel Serverless"
        B[Webhook API<br/>/api/line/webhook]
        C[Admin API<br/>/api/conversations]
        D[Stats API<br/>/api/stats]
        E[Health API<br/>/api/health]
    end
    
    subgraph "應用層"
        F[Handlers<br/>lib/bottender/handlers.ts]
        G[Message Service<br/>lib/services/message.ts]
        H[Conversation Nodes<br/>lib/services/conversation-nodes.ts]
    end
    
    subgraph "AI 服務"
        I[Gemini API<br/>Intent Classification]
        J[Gemini API<br/>RAG + Response Generation]
        K[Knowledge Base<br/>lib/knowledge-base/index.ts]
    end
    
    subgraph "資料層"
        L[(MongoDB Atlas)]
        M[User Model]
        N[Conversation Model]
        O[Message Model]
    end
    
    subgraph "管理後台"
        P[Admin Dashboard<br/>app/admin/page.tsx]
        Q[NextAuth.js<br/>Authentication]
    end
    
    A -->|Webhook| B
    B --> F
    F --> G
    G --> H
    G --> I
    G --> J
    J --> K
    F --> L
    G --> L
    H --> L
    L --> M
    L --> N
    L --> O
    
    P -->|SWR Polling| C
    P -->|SWR Polling| D
    P --> Q
    C --> L
    D --> L
    
    style A fill:#00C300
    style B fill:#FF6B6B
    style I fill:#4285F4
    style J fill:#4285F4
    style L fill:#47A248
    style P fill:#FFA500
```

### 資料流程

1. **使用者發送訊息** → LINE App 發送到 LINE Platform
2. **LINE Platform** → 發送 Webhook 到 Vercel Serverless Function
3. **Webhook Handler** → 驗證簽章、去重檢測、處理事件
4. **Message Service** → 意圖分類、狀態管理、產生回應
5. **Gemini API** → 意圖分類、RAG 查詢、生成回答
6. **MongoDB** → 儲存對話記錄、使用者資訊
7. **LINE Messaging API** → 回傳回應給使用者

### 技術棧

- **前端框架**: Next.js 16 (App Router) + TypeScript
- **後端框架**: Next.js API Routes (Serverless Functions)
- **Line API**: 直接整合 Line Messaging API（Reply API + Push Message API 備用）
- **LLM**: Google Gemini API (gemini-1.5-flash，備用：gemini-pro, gemini-1.0-pro)
- **資料庫**: MongoDB Atlas + Mongoose ODM
- **身份驗證**: NextAuth.js v5
- **資料獲取**: SWR (Polling 每 5 秒)
- **樣式**: Tailwind CSS + DaisyUI
- **Chatbot 框架**: Bottender（用於事件處理和類型定義）
- **部署**: Vercel
- **套件管理**: Yarn

## Line Bot 對話/功能設計

詳細的對話/功能設計請參考：[chatbot-design.md](./chatbot-design.md)

### 主題
- **主題**：台大女八舍宿舍網路管理助手
- **定位**：協助學生解決宿舍網路相關問題

### 功能列表
- 🚫 無法上網 - 連線故障排除
- 📝 如何註冊 - 宿網註冊教學
- 🐢 網速很慢 - 網速與流量查詢
- 📞 聯絡網管

### 對話腳本
- **文字訊息**：基本文字回覆
- **Button Template**：主選單、功能選擇
- **Carousel Template**：症狀診斷、註冊類型選擇
- **Quick Reply**：快速回覆選項
- **Flex Message**：長篇內容、格式化文字（粗體、分隔線等）
- **URI Action**：連結到外部網站（如查詢違規主機名單）
- **Postback Action**：觸發特定流程
- **In-app Browser**：應用程式內瀏覽器（教學文件）

## 環境變數設定

### 本地開發環境設定

1. **複製環境變數範例檔**
   ```bash
   # 手動建立 .env 檔案
   touch .env
   ```

2. **填入必要的環境變數**

   在 `.env` 檔案中填入以下變數：

   ```env
   # LINE Messaging API
   LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
   LINE_CHANNEL_SECRET=your_line_channel_secret

   # Google Gemini API
   GEMINI_API_KEY=your_gemini_api_key

   # MongoDB Atlas
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

   # NextAuth.js
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXTAUTH_URL=http://localhost:3000

   # 管理後台登入資訊（可選，用於 NextAuth Credentials）
   ADMIN_EMAIL=f8@ntu.edu.tw
   ADMIN_PASSWORD=f8networkadmin
   ```

### 環境變數說明

| 變數名稱 | 說明 | 取得方式 |
|---------|------|---------|
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Channel Access Token | [LINE Developers Console](https://developers.line.biz/console/) → 選擇 Channel → Messaging API → Channel Access Token |
| `LINE_CHANNEL_SECRET` | LINE Channel Secret | [LINE Developers Console](https://developers.line.biz/console/) → 選擇 Channel → Basic settings → Channel secret |
| `GEMINI_API_KEY` | Google Gemini API Key | [Google AI Studio](https://makersuite.google.com/app/apikey) → 建立新的 API Key |
| `MONGODB_URI` | MongoDB Atlas 連線字串 | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) → 建立 Cluster → Connect → Connect your application |
| `NEXTAUTH_SECRET` | NextAuth 密鑰 | 使用 `openssl rand -base64 32` 生成 |
| `NEXTAUTH_URL` | NextAuth 基礎 URL | 本地開發：`http://localhost:3000`，生產環境：您的 Vercel URL |
| `ADMIN_EMAIL` | 管理後台登入帳號 | 自訂 |
| `ADMIN_PASSWORD` | 管理後台登入密碼 | 自訂 |


## 本地開發

### 前置需求

- Node.js 18+
- Yarn 1.22+
- MongoDB Atlas 帳號（或本地 MongoDB）
- LINE Developers 帳號
- Google Gemini API Key
- ngrok（用於建立 Webhook Tunnel）

### 安裝步驟

1. **安裝依賴**
   ```bash
   yarn install
   ```

2. **設定環境變數**
   - 建立 `.env` 檔案
   - 填入必要的環境變數（參考上方「環境變數設定」）
   - 本地開發時，`NEXTAUTH_URL` 應設定為 `http://localhost:3000`

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

6. **設定 LINE Rich Menu（可選）**

   執行 Rich Menu 設定 API：
   ```bash
   curl -X POST https://xxxx-xxxx-xxxx.ngrok-free.app/api/line/rich-menu/setup
   ```
   或直接訪問：`https://xxxx-xxxx-xxxx.ngrok-free.app/api/line/rich-menu/setup`

7. **測試 LINE Bot**

   - 在 LINE 中搜尋您的 Bot 並加為好友
   - 發送測試訊息，確認 Bot 能正常回應
   - 檢查終端機的日誌，確認 Webhook 請求正常接收

8. **開啟應用程式**
   - 開啟瀏覽器訪問 `http://localhost:3000`
   - 管理後台：`http://localhost:3000/admin`
   - 登入頁面：`http://localhost:3000/admin/login`

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




## 主要功能

### LINE Bot 功能

- **智慧問答**：使用 Gemini API 理解使用者問題並提供回答
- **對話流程**：31+ 個對話節點，涵蓋網路問題、註冊教學、網速查詢等
- **狀態管理**：維持對話脈絡，提供連貫的對話體驗
- **溫柔引導**：對於無關訊息，禮貌地說明能力範圍並提供功能入口
- **Rich Menu**：提供常駐選單，方便使用者快速選擇功能
- **意圖分類**：使用 Gemini 進行 10 種意圖分類
- **RAG 整合**：結合知識庫提供詳細、準確的回答
- **Context Switching**：支援流程中跳轉，回答新問題後可返回原流程

### 管理後台功能

- **對話列表查看**：顯示所有對話，支援篩選、搜尋、分頁
- **對話詳情查看**：聊天式介面，顯示完整對話記錄
- **趨勢圖表**：過去 12 小時的訊息趨勢（使用 recharts）
- **即時更新**：SWR Polling，每 5 秒自動更新
- **篩選功能**：日期範圍、類別、狀態、關鍵字搜尋
- **分頁功能**：支援大量資料的分頁顯示

# 可選延伸（Nice to Have）

### 使用 Bottender 套件串接 LINE API 與對話資料庫
- **實作**：已整合 Bottender
- **檔案**：`lib/bottender/index.ts`
- **用途**：用於事件處理和類型定義（實際回覆使用直接 LINE API）

### 進階篩選：可依使用者、日期區間、平台、訊息內容搜尋
- **實作**：`app/api/conversations/route.ts`
- **支援**：
  - 日期區間（startDate, endDate）
  - 類別（category）
  - 狀態（status）
  - 使用者名稱搜尋（displayName, lineUserId）
  - 訊息內容搜尋（content）
  - 分頁（page, limit）

### Session 管理：追蹤對話流程與狀態機
- **實作**：使用 `Conversation.metadata.step` 追蹤對話流程
- **狀態機**：
  - `network:step1`：詢問影響範圍
  - `network:conn_type`：詢問連接方式
  - `network:router:troubleshoot`：路由器排查
  - `network:step2`：詢問連線狀況
  - `network:multi:router_check`：多人問題路由器檢查
  - `network:multi:check_traffic`：多人問題流量檢查
- **Context Switching**：支援流程中跳轉，回答新問題後可返回原流程


### 效能/健康監控：回應時間、失敗率與健康檢查端點
- **實作**：
  - Profiling logs：webhook 中有詳細的效能日誌（T0-T10, H0-H9）
  - 健康檢查端點：`/api/health`
    - 檢查資料庫連線狀態和回應時間
    - 檢查 LINE API 和 Gemini API 設定
    - 提供系統指標（對話數、使用者數、訊息數等）
    - 返回健康狀態（healthy/degraded/unhealthy）
    - 計算總回應時間

### Webhook 健康檢查：提供可監控的狀態檢查
- **實作**：
  - `/api/line/webhook` GET 方法提供詳細的健康狀態
    - Webhook 設定狀態（端點、方法、驗證方式）
    - 統計資訊（最近 1 小時訊息數、總訊息數、webhook 事件數）
    - 去重效率統計（重複事件檢測效果）
    - 服務狀態（資料庫、LINE API、Gemini API）
    - 功能狀態（去重檢測、Reply API、Profiling）
    - 環境變數設定檢查



## 技術細節

### 訊息處理流程

1. LINE Webhook 接收使用者訊息
2. 驗證簽章（HMAC-SHA256）
3. 去重檢測（webhookEventId）
4. 判斷訊息類型（Postback / 文字 / Follow）
5. 處理訊息（關鍵字匹配 / 對話狀態 / Gemini AI）
6. 產生回應（固定腳本 / LLM 生成）
7. 儲存對話記錄到 MongoDB
8. 回傳回應給使用者（Reply API，失敗時使用 Push API）

### 對話狀態管理

使用 `Conversation` 模型的 `metadata.step` 欄位追蹤對話狀態：
- `network:step1`：詢問問題影響範圍
- `network:conn_type`：詢問連接方式
- `network:router:troubleshoot`：路由器故障排除
- 等等...

### MongoDB 
**User（使用者）**
- `lineUserId`: Line 使用者 ID（唯一）
- `displayName`: 顯示名稱
- `pictureUrl`: 頭像 URL

**Conversation（對話）**
- `userId`: 使用者 ID（參考 User）
- `status`: 狀態（active/completed/archived）
- `category`: 對話類別（network_issue/registration/speed_check/contact）
- `metadata`: 額外資訊（step、收集的資訊等）

**Message（訊息）**
- `conversationId`: 對話 ID（參考 Conversation）
- `role`: 角色（user/assistant）
- `content`: 訊息內容
- `lineMessageId`: Line 訊息 ID
- `webhookEventId`: Webhook 事件 ID（用於去重）

## 錯誤處理與降級機制

### 1. Gemini API 失敗

**處理方式：**
1. 嘗試使用主要模型（gemini-2.5-flash）
2. 如果失敗（404 Not Found），嘗試備用模型（gemini-2.5-pro,gemini-2.5-flash-lite）
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

## 健康檢查與監控

### 健康檢查端點

- **`GET /api/health`**：系統健康狀態檢查
  - 檢查資料庫連線狀態和回應時間
  - 檢查 LINE API 和 Gemini API 設定
  - 提供系統指標（對話數、使用者數、訊息數等）
  - 返回健康狀態（healthy/degraded/unhealthy）

- **`GET /api/line/webhook`**：Webhook 健康檢查
  - Webhook 設定狀態（端點、方法、驗證方式）
  - 統計資訊（最近 1 小時訊息數、總訊息數、webhook 事件數）
  - 去重效率統計（重複事件檢測效果）
  - 服務狀態（資料庫、LINE API、Gemini API）
  - 功能狀態（去重檢測、Reply API、Profiling）

### Profiling Logs
Webhook 中有詳細的效能日誌：
- **T0-T10**：Webhook 處理各階段時間戳記
- **H0-H9**：Handler 處理各階段時間戳記


## 專案結構

```
hw6/
├── app/
│   ├── api/
│   │   ├── line/
│   │   │   ├── webhook/route.ts          # LINE Webhook 端點
│   │   │   └── rich-menu/setup/route.ts  # Rich Menu 設定 API
│   │   ├── conversations/                 # 對話紀錄 API
│   │   │   ├── route.ts                   # 列表查詢
│   │   │   └── [id]/route.ts              # 詳情查詢
│   │   ├── stats/route.ts                 # 統計資料 API
│   │   ├── health/route.ts                # 健康檢查 API
│   │   └── auth/[...nextauth]/route.ts   # NextAuth 認證
│   ├── admin/                             # 管理後台
│   │   ├── page.tsx                      # 對話列表頁面
│   │   ├── conversations/[id]/page.tsx   # 對話詳情頁面
│   │   └── login/page.tsx                 # 登入頁面
│   └── layout.tsx                         # 根布局
├── lib/
│   ├── bottender/
│   │   ├── index.ts                       # Bottender 初始化
│   │   └── handlers.ts                    # 訊息處理邏輯
│   ├── gemini/
│   │   ├── client.ts                      # Gemini API 客戶端
│   │   └── prompts.ts                     # Prompt 模板
│   ├── db/
│   │   ├── connection.ts                  # MongoDB 連線
│   │   └── models/
│   │       ├── User.ts                    # 使用者模型
│   │       ├── Conversation.ts           # 對話模型
│   │       └── Message.ts                 # 訊息模型
│   ├── services/
│   │   ├── conversation.ts                # 對話服務層
│   │   ├── message.ts                     # 訊息處理服務
│   │   └── conversation-nodes.ts          # 對話節點定義
│   ├── knowledge-base/
│   │   └── index.ts                        # 知識庫索引與搜尋
│   ├── utils/
│   │   └── line-templates.ts               # LINE 訊息模板工具
│   ├── constants/
│   │   └── postback-map.ts                # Postback 資料對應表
│   └── auth/
│       └── config.ts                       # NextAuth 設定
├── config/
│   └── conversation.ts                     # 對話配置
├── chatbot-design.md                       # Chatbot 設計文件
├── CONVERSATION_SCRIPT_DESIGN.md            # 對話腳本設計
├── SYSTEM_DESIGN.md                         # 系統設計說明
├── GRADING_CHECKLIST.md                     # 功能檢查清單
├── README.md                                # 本文件
└── package.json                             # 專案依賴
```

## 相關文件
- **Chatbot 設計文件**: [chatbot-design.md](./chatbot-design.md)


## 注意事項

- **請勿將 `.env` 檔案提交到 Git**：已加入 `.gitignore`
- **請勿將敏感資訊（API Key、密碼等）放入程式碼**：使用環境變數
- **部署時請確認所有環境變數都已設定**：特別是 Vercel 環境變數
- **LINE Webhook URL 必須設定正確**：否則 Bot 無法接收訊息
- **ngrok URL 會變更**：每次重新啟動 ngrok，需要更新 LINE Webhook URL

## 授權

本專案為課程作業專案。
