# 基礎功能檢查清單

## ✅ 已實作功能

### 1. Line Bot 對話/功能設計

- [x] **主題**：台大女八舍宿網小精靈
- [x] **功能列表**：主選單（4 個主要功能）+ Rich Menu
- [x] **對話腳本**：
  - [x] 文字訊息 (Text Message)
  - [x] Quick Reply
  - [x] Button Template
  - [x] Carousel Template
  - [x] Flex Message
  - [x] URI 按鈕（開啟外部連結）
  - [x] Postback 按鈕
  - [x] In-app Browser（透過 URI action）
- [x] **對話脈絡**：使用 `conversationHistory` 維持上下文（取最近 10 則訊息）
- [x] **LLM prompt template 設計**：`buildPrompt` 函數，包含系統提示、知識庫、上下文
- [x] **回應設計**：根據預設腳本或 LLM 回覆，包裝成適當的 LINE 訊息格式

### 2. Line Bot server

- [x] **接收訊息**：從 LINE Messaging API 接收文字訊息和 postback
- [x] **功能設計與程式邏輯**：完整的對話流程（31+ 節點）
- [x] **產生回應**：預設腳本優先，LLM 作為補充
- [x] **Webhook API**：`/api/line/webhook` 端點，包含簽章驗證
- [x] **對話管理與統計**：API routes (`/api/conversations`, `/api/stats`)

### 3. Line Bot 設定

- [x] **建立 Line 官方帳號**：已設定
- [x] **設定 Line Channel**：已設定
- [x] **開啟 webhook 端點**：已設定並部署
- [x] **Rich Menu**：已設定（4 個主要功能選項）

### 4. 資料庫整合

- [x] **完整對話持久化**：
  - [x] 時間戳（`createdAt`, `updatedAt`）
  - [x] 使用者資訊（`User` model：`lineUserId`, `displayName`, `pictureUrl`）
  - [x] 對話資訊（`Conversation` model：`status`, `category`, `metadata`）
  - [x] 訊息內容（`Message` model：`role`, `content`, `lineMessageId`, `metadata`）
- [x] **MongoDB Atlas 整合**：使用 Mongoose ODM

### 5. 基礎管理後台

- [x] **檢視對話紀錄**：`/admin` 頁面顯示對話列表
- [x] **對話詳情**：`/admin/conversations/[id]` 顯示完整對話
- [x] **統計資料**：顯示總對話數、活躍對話、總使用者、總訊息數
- [x] **身份驗證**：使用 NextAuth.js，需要登入才能存取
- [x] **基本顯示**：使用者名稱、類別、狀態、建立時間

### 6. 錯誤處理

- [x] **LLM/外部服務失效處理**：
  - [x] Gemini API 錯誤時降級到預設腳本
  - [x] LINE API 錯誤時使用 Push Message API 作為備用
  - [x] 基本的錯誤訊息回覆
- [x] **Webhook 錯誤處理**：try-catch 包裝，記錄錯誤日誌

### 7. LLM 配額與速率限制處理

- [x] **偵測 quota/429 錯誤**：在 `generateResponse` 中偵測
- [x] **Fallback 機制**：降級到預設腳本
- [⚠️] **清楚訊息**：目前降級時沒有明確告知使用者「配額已用完」

### 8. 即時更新

- [x] **後台即時更新**：使用 SWR polling（每 5 秒）
- [x] **統計資料即時更新**：`usePolling` hook
- [x] **對話列表即時更新**：`usePolling` hook
- [x] **對話詳情即時更新**：`usePolling` hook

---

## ⚠️ 待改進功能

### 1. LLM 配額錯誤訊息改進

**問題**：當 Gemini API 配額用完時，只是降級到預設腳本，沒有明確告知使用者。

**建議改進**：
- 當偵測到 `API_QUOTA_EXCEEDED` 時，返回明確的錯誤訊息
- 例如：「抱歉，AI 服務目前暫時無法使用（配額已用完）。請使用下方選單選擇功能，或稍後再試。」

**檔案位置**：`hw6/lib/services/message.ts`

### 2. 管理後台篩選功能

**問題**：目前只有基本列表，沒有篩選功能。

**建議改進**：
- [ ] 日期範圍篩選（開始日期、結束日期）
- [ ] 使用者篩選（搜尋使用者名稱或 LINE User ID）
- [ ] 關鍵字搜尋（搜尋對話內容）
- [ ] 類別篩選（下拉選單選擇問題類別）
- [ ] 狀態篩選（進行中/已完成/已封存）

**檔案位置**：`hw6/app/admin/page.tsx`

### 3. 對話脈絡改進

**目前實作**：使用最近 10 則訊息作為上下文

**建議改進**：
- [ ] 考慮對話長度限制（token 限制）
- [ ] 智能摘要長對話（如果對話太長，先摘要再傳給 LLM）
- [ ] 保留重要資訊（如 IP、MAC 地址等）在 metadata 中

**檔案位置**：`hw6/lib/services/message.ts`, `hw6/lib/gemini/prompts.ts`

### 4. 錯誤處理改進

**目前實作**：基本錯誤處理

**建議改進**：
- [ ] 更詳細的錯誤分類（網路錯誤、超時錯誤、API 錯誤等）
- [ ] 更友善的錯誤訊息（針對不同錯誤類型提供不同訊息）
- [ ] 錯誤重試機制（對於暫時性錯誤，自動重試）

**檔案位置**：`hw6/lib/gemini/client.ts`, `hw6/lib/services/message.ts`

### 5. 管理後台功能擴充

**建議改進**：
- [ ] 匯出對話紀錄（CSV/JSON）
- [ ] 批次操作（標記為已完成、封存等）
- [ ] 對話搜尋（全文搜尋）
- [ ] 統計圖表（問題類別分布、時間趨勢等）
- [ ] 使用者管理（查看所有使用者、使用者對話歷史）

**檔案位置**：`hw6/app/admin/page.tsx`

### 6. 對話腳本完整性

**目前實作**：31+ 個對話節點

**建議檢查**：
- [ ] 確認所有對話流程都有對應的節點
- [ ] 確認所有節點都有「回主選單」選項
- [ ] 確認所有外部連結都正確
- [ ] 確認所有 Flex Message 都符合 LINE 規範

---

## 📊 功能完成度統計

- **已實作**：8/8 大項（100%）
- **待改進**：6 個改進項目
- **整體完成度**：約 85-90%

---

## 🎯 優先改進項目

1. **高優先級**：
   - LLM 配額錯誤訊息改進（影響使用者體驗）
   - 管理後台篩選功能（基本需求）

2. **中優先級**：
   - 錯誤處理改進
   - 對話脈絡改進

3. **低優先級**：
   - 管理後台功能擴充
   - 對話腳本完整性檢查

