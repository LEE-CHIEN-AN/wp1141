# 部署資訊與測試說明

## 📱 LINE Bot 資訊

### 1. LINE Bot URL / Webhook URL

**Webhook URL（Vercel 部署後）：**
```
https://[your-vercel-project].vercel.app/api/line/webhook
```

**取得方式：**
1. 登入 [Vercel Dashboard](https://vercel.com/dashboard)
2. 選擇專案
3. 在專案設定中找到部署 URL
4. Webhook URL 格式：`https://[project-name].vercel.app/api/line/webhook`

### 2. LINE Bot QR Code

**取得方式：**

#### 方法一：從 LINE Official Account Manager
1. 登入 [LINE Official Account Manager](https://manager.line.biz/)
2. 選擇您的官方帳號
3. 進入「設定」→「基本設定」
4. 找到「QR Code」區塊
5. 下載或顯示 QR Code

#### 方法二：從 LINE Developers Console
1. 登入 [LINE Developers Console](https://developers.line.biz/console/)
2. 選擇您的 Provider 和 Channel
3. 進入「Messaging API」頁籤
4. 在「QR Code」區塊中下載或顯示 QR Code

#### 方法三：使用 LINE URL Scheme
```
https://line.me/R/ti/p/@[your-channel-id]
```

**注意：** 需要先從 LINE Official Account Manager 取得 Channel ID。

### 3. 設定 Webhook URL

1. 登入 [LINE Developers Console](https://developers.line.biz/console/)
2. 選擇您的 Provider 和 Channel
3. 進入「Messaging API」頁籤
4. 在「Webhook URL」欄位輸入：`https://[your-vercel-project].vercel.app/api/line/webhook`
5. 點擊「Verify」驗證 Webhook URL
6. 啟用「Use webhook」

---

## 🖥️ 管理後台資訊

### 1. 管理後台 URL

**Production URL：**
```
https://[your-vercel-project].vercel.app/admin
```

**登入頁面：**
```
https://[your-vercel-project].vercel.app/admin/login
```

### 2. 登入方式

**目前實作：** 單一管理員帳號（使用環境變數設定）

**登入資訊：**
- **帳號（Email）：** 由環境變數 `ADMIN_EMAIL` 設定
- **密碼：** 由環境變數 `ADMIN_PASSWORD` 設定

**設定方式：**
1. 在 Vercel 專案設定中，進入「Environment Variables」
2. 新增以下環境變數：
   - `ADMIN_EMAIL`: 管理員 Email（例如：`admin@example.com`）
   - `ADMIN_PASSWORD`: 管理員密碼（例如：`your-secure-password`）

**注意：** 
- 目前**沒有註冊服務**，只有預設的管理員帳號
- 如需多個管理員，需要修改 `lib/auth/config.ts` 實作多使用者認證

### 3. 測試帳號建議

**建議設定：**
- **Email：** `admin@ntu-dorm-bot.test`
- **密碼：** `admin123456`（僅供測試，生產環境請使用強密碼）

**設定步驟：**
1. 在 Vercel 專案設定中新增環境變數：
   ```
   ADMIN_EMAIL=admin@ntu-dorm-bot.test
   ADMIN_PASSWORD=admin123456
   ```
2. 重新部署專案
3. 訪問 `https://[your-vercel-project].vercel.app/admin/login`
4. 使用上述帳號密碼登入

---

## 🔧 Vercel 環境變數設定

### 必要環境變數

在 Vercel 專案設定中，需要設定以下環境變數：

```bash
# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key

# MongoDB Atlas
MONGODB_URI=your_mongodb_connection_string

# NextAuth
NEXTAUTH_SECRET=your_nextauth_secret  # 可用 openssl rand -base64 32 生成

# 管理後台
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_secure_password
```

### 設定步驟

1. 登入 [Vercel Dashboard](https://vercel.com/dashboard)
2. 選擇專案
3. 進入「Settings」→「Environment Variables」
4. 逐一新增上述環境變數
5. 重新部署專案（或等待自動部署）

---

## 📋 檢查清單

### LINE Bot 部署檢查

- [ ] Vercel 專案已建立並部署成功
- [ ] Webhook URL 已設定到 LINE Developers Console
- [ ] Webhook URL 驗證成功（顯示 ✓）
- [ ] 「Use webhook」已啟用
- [ ] LINE Bot QR Code 已取得
- [ ] 測試加入好友功能正常
- [ ] 測試發送訊息功能正常

### 管理後台部署檢查

- [ ] 所有環境變數已設定
- [ ] `ADMIN_EMAIL` 和 `ADMIN_PASSWORD` 已設定
- [ ] 管理後台 URL 可正常訪問
- [ ] 登入功能正常
- [ ] 對話列表可正常顯示
- [ ] 對話詳情可正常顯示
- [ ] 統計資料可正常顯示
- [ ] 即時更新功能正常（每 5 秒輪詢）

---

## 🚀 快速測試步驟

### 測試 LINE Bot

1. 使用 LINE App 掃描 QR Code 加入好友
2. 發送「選單」或點擊 Rich Menu 選項
3. 測試各個功能：
   - 🚫 無法上網
   - 📝 如何註冊
   - 🐢 網速很慢
   - 📞 聯絡網管
4. 確認對話流程正常運作

### 測試管理後台

1. 訪問 `https://[your-vercel-project].vercel.app/admin/login`
2. 使用設定的 `ADMIN_EMAIL` 和 `ADMIN_PASSWORD` 登入
3. 確認可以看到：
   - 統計資料（總對話數、活躍對話、總使用者、總訊息數）
   - 最近對話列表
4. 點擊「查看詳情」確認對話內容正常顯示
5. 確認即時更新功能（等待新訊息，觀察是否自動更新）

---

## 📝 繳交時需要提供的資訊

### 1. LINE Bot 資訊

- **Webhook URL：** `https://[your-vercel-project].vercel.app/api/line/webhook`
- **QR Code：** 提供圖片或下載連結
- **或 LINE URL：** `https://line.me/R/ti/p/@[your-channel-id]`

### 2. 管理後台資訊

- **Production URL：** `https://[your-vercel-project].vercel.app/admin`
- **登入資訊：**
  - **Email：** `[ADMIN_EMAIL]`
  - **Password：** `[ADMIN_PASSWORD]`
- **注意：** 如果使用測試帳號，請明確標註「測試帳號」

---

## ⚠️ 注意事項

1. **安全性：**
   - 生產環境請使用強密碼
   - 不要將環境變數提交到公開的 Git repository
   - 定期更換 `ADMIN_PASSWORD`

2. **多管理員支援：**
   - 目前只支援單一管理員帳號
   - 如需多管理員，需要實作資料庫儲存多使用者認證資訊

3. **Webhook 驗證：**
   - 確保 Webhook URL 設定正確
   - 確保 Vercel 專案已正確部署
   - 如果 Webhook 驗證失敗，檢查環境變數是否正確設定

