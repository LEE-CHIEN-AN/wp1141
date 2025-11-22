# 台大宿舍網管 Line Chatbot

整合 Line Messaging API 與 Gemini API 的智慧問答機器人系統。

## URL
LINE Bot URL : https://lin.ee/uitjKQX
管理後台 Production URL : https://hw6-linebot.vercel.app/admin

後台管理員登入帳密
帳號=f8@ntu.edu.tw
密碼=f8networkadmin

## 技術棧

- Next.js 16+ (App Router) + TypeScript
- Line Messaging API (直接整合)
- Google Gemini API
- MongoDB Atlas + Mongoose
- NextAuth.js (管理後台身份驗證)
- SWR (資料獲取與 Polling)
- Tailwind CSS

## 環境變數設定

複製 `env.example` 為 `.env` 並填入以下變數：

**方式一：** 複製 `env.example` 檔案並重新命名為 `.env`
**方式二：** 手動建立 `.env` 檔案並參考以下變數：

- `LINE_CHANNEL_ACCESS_TOKEN`: Line Channel Access Token
- `LINE_CHANNEL_SECRET`: Line Channel Secret
- `GEMINI_API_KEY`: Google Gemini API Key
- `MONGODB_URI`: MongoDB Atlas 連線字串
- `NEXTAUTH_SECRET`: NextAuth 密鑰（可用 `openssl rand -base64 32` 生成）
- `ADMIN_EMAIL`: 管理後台登入帳號
- `ADMIN_PASSWORD`: 管理後台登入密碼

## 安裝與執行

```bash
# 安裝依賴
yarn install

# 開發模式
yarn dev

# 建置
yarn build

# 生產模式
yarn start
```

## 部署

專案已配置 Vercel 部署，將程式碼推送到 GitHub 後，Vercel 會自動部署。

**詳細部署資訊與測試說明：** 請參考 [DEPLOYMENT_INFO.md](./DEPLOYMENT_INFO.md)

### 快速連結

- **LINE Bot Webhook URL：** `https://[your-vercel-project].vercel.app/api/line/webhook`
- **管理後台 URL：** `https://[your-vercel-project].vercel.app/admin`
- **登入頁面：** `https://[your-vercel-project].vercel.app/admin/login`

### 測試帳號

管理後台使用環境變數設定的單一管理員帳號：
- **Email：** 由 `ADMIN_EMAIL` 環境變數設定
- **Password：** 由 `ADMIN_PASSWORD` 環境變數設定

**注意：** 目前沒有註冊服務，只有預設的管理員帳號。

## 專案結構

- `app/api/line/webhook/`: Line webhook 端點
- `app/admin/`: 管理後台
- `lib/bottender/`: 訊息處理邏輯（直接使用 Line Messaging API）
- `lib/gemini/`: Gemini API 客戶端
- `lib/db/`: MongoDB 模型與連線
- `lib/services/`: 業務邏輯層
- `config/`: 配置檔案


