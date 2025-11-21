# 部署指南

## 環境變數設定

在 Vercel 專案設定中，新增以下環境變數：

### Line Messaging API
- `LINE_CHANNEL_ACCESS_TOKEN`: Line Channel Access Token
- `LINE_CHANNEL_SECRET`: Line Channel Secret

### Google Gemini API
- `GEMINI_API_KEY`: Google Gemini API Key

### MongoDB Atlas
- `MONGODB_URI`: MongoDB Atlas 連線字串
  - 格式：`mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority`

### NextAuth
- `NEXTAUTH_URL`: 部署後的網址（例如：`https://your-app.vercel.app`）
- `NEXTAUTH_SECRET`: 使用 `openssl rand -base64 32` 生成

### 管理後台
- `ADMIN_EMAIL`: 管理後台登入帳號
- `ADMIN_PASSWORD`: 管理後台登入密碼

## Line Webhook 設定

1. 在 Line Developers Console 中，設定 Webhook URL：
   - `https://your-app.vercel.app/api/line/webhook`
2. 啟用 Webhook
3. 驗證 Webhook 是否正常運作

## 部署步驟

1. 將程式碼推送到 GitHub
2. 在 Vercel 中匯入專案
3. 設定環境變數
4. 部署
5. 更新 Line Webhook URL

## 測試

1. 測試 Line Bot：發送訊息到 Line Bot，確認能正常回應
2. 測試管理後台：訪問 `https://your-app.vercel.app/admin`，使用設定的帳號密碼登入
3. 檢查對話紀錄：確認對話能正確儲存到資料庫


