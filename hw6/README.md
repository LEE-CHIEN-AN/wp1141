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

## 技術棧

- Next.js 16+ (App Router) + TypeScript
- Line Messaging API (直接整合)
- Google Gemini API
- MongoDB Atlas + Mongoose
- NextAuth.js (管理後台身份驗證)
- SWR (資料獲取與 Polling)
- Tailwind CSS

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

### Vercel 部署環境設定

在 Vercel 專案設定中，將上述環境變數加入 **Environment Variables**：

1. 進入 Vercel 專案設定
2. 選擇 **Settings** → **Environment Variables**
3. 逐一新增上述環境變數
4. 確保所有環境（Production、Preview、Development）都已設定

**重要**：請勿將 `.env` 檔案提交到 Git 版本控制中。

## 本地開發

### 前置需求

- Node.js 18+ 
- Yarn 1.22+
- MongoDB Atlas 帳號（或本地 MongoDB）
- LINE Developers 帳號
- Google Gemini API Key

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

4. **開啟應用程式**
   - 開啟瀏覽器訪問 `http://localhost:3000`

### 開發指令

```bash
# 開發模式（熱重載）
yarn dev

# 建置生產版本
yarn build

# 啟動生產模式（需要先建置）
yarn start

# 型別檢查
yarn type-check

# Lint 檢查
yarn lint
```

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

### 管理後台功能

- **對話紀錄檢視**：查看所有對話紀錄
- **對話詳情**：查看單一對話的完整內容
- **統計資料**：顯示總對話數、活躍對話、總使用者、總訊息數
- **篩選功能**：依日期、分類、狀態、關鍵字篩選對話
- **即時更新**：使用 SWR Polling 每 5 秒自動更新資料

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

### 降級機制

1. 關鍵字匹配（最快、最精確）
2. 對話狀態處理（維持脈絡）
3. Gemini AI 理解（處理複雜問題）
4. 預設腳本回應（最後降級方案）

## 相關文件

- **Chatbot 設計文件**: [chatbot-design.md](./chatbot-design.md)
- **對話腳本設計**: [CONVERSATION_SCRIPT_DESIGN.md](./CONVERSATION_SCRIPT_DESIGN.md)
- **功能檢查清單**: [FEATURE_CHECKLIST.md](./FEATURE_CHECKLIST.md)
- **系統設計說明**: [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)

## 注意事項

- **請勿將 `.env` 檔案提交到 Git**：已加入 `.gitignore`
- **請勿將敏感資訊（API Key、密碼等）放入程式碼**：使用環境變數
- **部署時請確認所有環境變數都已設定**：特別是 Vercel 環境變數
- **LINE Webhook URL 必須設定正確**：否則 Bot 無法接收訊息

## 授權

本專案為課程作業專案。


