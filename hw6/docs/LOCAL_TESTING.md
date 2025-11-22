# 本地測試指南

## 前置準備

### 1. 安裝依賴

```bash
yarn install
```

### 2. 設置環境變數

複製 `env.example` 並建立 `.env.local` 檔案：

```bash
cp env.example .env.local
```

在 `.env.local` 中填入以下環境變數：

```env
# MongoDB
MONGODB_URI=mongodb+srv://your-connection-string

# LINE Bot
LINE_CHANNEL_SECRET=your-channel-secret
LINE_CHANNEL_ACCESS_TOKEN=your-channel-access-token

# Gemini API
GEMINI_API_KEY=your-gemini-api-key

# NextAuth (管理後台)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
ADMIN_EMAIL=your-admin-email
ADMIN_PASSWORD=your-admin-password
```

### 3. 安裝 ngrok

ngrok 用於建立本地 tunnel，讓 LINE webhook 可以連接到本地開發伺服器。

#### Windows (使用 Chocolatey)
```powershell
choco install ngrok
```

#### 或下載安裝
1. 前往 https://ngrok.com/download
2. 下載並解壓縮
3. 將 ngrok.exe 加入 PATH，或直接使用完整路徑

#### 註冊 ngrok 帳號（免費）
1. 前往 https://dashboard.ngrok.com/signup
2. 註冊帳號並取得 authtoken
3. 執行：`ngrok config add-authtoken YOUR_AUTHTOKEN`

## 本地測試步驟

### 步驟 1：啟動本地開發伺服器

在專案根目錄執行：

```bash
yarn dev
```

開發伺服器會在 `http://localhost:3000` 啟動。

### 步驟 2：啟動 ngrok tunnel

開啟新的終端機視窗，執行：

```bash
ngrok http 3000
```

ngrok 會顯示類似以下的資訊：

```
Forwarding   https://xxxx-xxxx-xxxx.ngrok-free.app -> http://localhost:3000
```

**記下這個 HTTPS URL**（例如：`https://xxxx-xxxx-xxxx.ngrok-free.app`）

### 步驟 3：配置 LINE Webhook URL

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 選擇您的 Provider 和 Channel
3. 進入「Messaging API」頁籤
4. 找到「Webhook URL」設定
5. 輸入：`https://xxxx-xxxx-xxxx.ngrok-free.app/api/line/webhook`
6. 點擊「Update」
7. 點擊「Verify」按鈕測試連線（應該會顯示「Success」）

### 步驟 4：測試 Bot

1. 開啟 LINE App
2. 搜尋您的 Bot 或掃描 QR Code
3. 開始測試對話功能

## 測試重點

### 測試項目

1. **Rich Menu 點擊**
   - 點擊「無法上網」
   - 點擊「如何註冊」
   - 點擊「網速很慢」
   - 點擊「聯絡網管」

2. **對話流程**
   - 測試逐步詢問流程
   - 確認對話狀態正確更新
   - 確認不會出現「鬼打牆」問題

3. **訊息類型**
   - Text 訊息
   - Button Template
   - Carousel Template
   - Quick Reply

4. **錯誤處理**
   - 測試無效輸入
   - 確認錯誤訊息正確顯示

## 除錯技巧

### 查看本地日誌

本地開發伺服器的終端機會顯示所有日誌，包括：
- 接收到的 webhook 事件
- 處理的訊息內容
- 錯誤訊息

### 查看 ngrok 請求

ngrok 提供一個 Web 介面來查看所有請求：
1. 在瀏覽器開啟 `http://localhost:4040`
2. 可以看到所有進出的 HTTP 請求
3. 可以重播請求來測試

### 常見問題

**問題 1：ngrok 連線失敗**
- 確認 ngrok 已正確安裝並設定 authtoken
- 確認本地開發伺服器正在運行（`yarn dev`）

**問題 2：LINE Webhook 驗證失敗**
- 確認 webhook URL 是 HTTPS（ngrok 預設提供 HTTPS）
- 確認 URL 路徑正確：`/api/line/webhook`
- 檢查環境變數 `LINE_CHANNEL_SECRET` 是否正確

**問題 3：Bot 沒有回應**
- 檢查本地終端機的日誌
- 確認 MongoDB 連線正常
- 確認 Gemini API Key 正確設定

**問題 4：ngrok URL 變更**
- 免費版 ngrok 每次啟動 URL 都會變更
- 需要重新在 LINE Developers Console 更新 Webhook URL
- 或使用 ngrok 付費版取得固定 URL

## 注意事項

1. **ngrok 免費版限制**
   - URL 每次啟動都會變更
   - 有連線數限制
   - 適合開發測試使用

2. **環境變數**
   - 本地測試使用 `.env.local`（不會被 Git 追蹤）
   - 不要將 `.env.local` 提交到 Git

3. **資料庫**
   - 本地測試會使用相同的 MongoDB Atlas 資料庫
   - 測試資料會寫入資料庫，注意不要影響生產環境

4. **停止測試**
   - 測試完成後，記得在 LINE Developers Console 將 Webhook URL 改回 Vercel 的 URL
   - 停止 ngrok：按 `Ctrl+C`
   - 停止開發伺服器：按 `Ctrl+C`

