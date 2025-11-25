# 專案功能檢查清單

## 基本功能要求（Must Have）

### ✅ Line Bot 對話/功能設計


#### ✅ 對話脈絡：在回覆時維持上下文
- **實作方式**：
  - 使用 `Conversation` 模型的 `metadata.step` 追蹤對話流程
  - 使用 `category` 追蹤問題分類
  - 在 `processUserMessage` 中傳入 `conversationHistory`（最近 10 則訊息）
  - Gemini 會根據對話上下文生成連貫的回答

#### ✅ LLM prompt template 設計
- **檔案**：`lib/gemini/prompts.ts`
- **功能**：
  - `SYSTEM_PROMPT`：定義 AI 角色和行為準則
  - `KNOWLEDGE_BASE`：內建知識庫
  - `buildPrompt()`：根據分類和上下文動態構建 prompt
  - 支援分類特定的 prompt 調整

#### ✅ 回應設計：根據預設腳本 and/or LLM 回覆，包裝成適當的回應
- **實作方式**：
  - 固定腳本：`conversation-nodes.ts` 中的節點函數
  - LLM 回覆：透過 `generateResponse()` 生成，並用 `createTextWithMenuOption()` 包裝
  - 混合模式：意圖分類決定走固定腳本或 LLM

---

### ✅ Line Bot server

#### ✅ 從 Line Messaging API 接收使用者的訊息
- **檔案**：`app/api/line/webhook/route.ts`
- **支援類型**：
  - 文字訊息（`message.text`）
  - Postback 事件（按鈕點擊）
  - Follow 事件（加好友）

#### ✅ 實現上述功能設計與程式邏輯
- **檔案**：`lib/bottender/handlers.ts`
- **功能**：
  - `handleLineMessage()`：處理文字訊息
  - `handlePostback()`：處理按鈕點擊
  - 完整的對話流程管理

#### ✅ 透過預先設計腳本 and/or 向 LLM 詢問，產生合適的回應
- **實作方式**：
  - 意圖分類：`classifyUserIntent()` 使用 Gemini 判斷意圖
  - 固定腳本：明確功能（無法上網、註冊等）走固定節點
  - LLM 生成：資訊查詢、新問題等由 Gemini 生成回答
  - RAG：結合知識庫生成回答

#### ✅ API for Line Messaging webhook
- **端點**：`/api/line/webhook`
- **功能**：
  - 驗證 LINE 簽章
  - 處理重複事件（webhookEventId 去重）
  - 支援 Reply API 和 Push API（fallback）
  - 完整的錯誤處理和 profiling logs

#### ✅ 對話管理與統計
- **統計 API**：`/api/stats`
  - 總對話數、活躍對話數、總使用者數、總訊息數
  - 類別統計
  - 趨勢圖表（過去 12 小時）
- **對話 API**：`/api/conversations`
  - 列表查詢（支援篩選、分頁、搜尋）
  - 詳情查詢：`/api/conversations/[id]`

---

### ✅ Line Bot 設定
- **Rich Menu**：已實作 API (`/api/line/rich-menu/setup`)
- **Webhook URL**：已設定並驗證
- **文件**：`README.md` 包含完整的設定說明

---

### ✅ 資料庫整合
- **模型**：
  - `User`：使用者資訊（LINE User ID、顯示名稱、頭像）
  - `Conversation`：對話記錄（狀態、分類、metadata）
  - `Message`：訊息記錄（角色、內容、時間戳、webhookEventId）
- **持久化**：所有對話和訊息都儲存到 MongoDB
- **中繼資料**：
  - `Conversation.metadata`：儲存對話狀態（step）、收集的資訊（IP、MAC、房間等）
  - `Message.metadata`：儲存 postback data、webhookEventId 等

---

### ✅ 基礎管理後台
- **頁面**：`app/admin/page.tsx`
- **功能**：
  - ✅ 檢視對話紀錄（列表、詳情）
  - ✅ 基本篩選：
    - 日期範圍（startDate, endDate）
    - 類別（category）
    - 狀態（status）
    - 搜尋（使用者名稱、對話內容）
  - ✅ 分頁功能
  - ✅ 統計儀表板（4 個統計卡片 + 趨勢圖）
  - ✅ 即時更新（每 5 秒輪詢）

---

### ✅ 錯誤處理
- **LLM 錯誤處理**：
  - 配額限制（429）：返回友善錯誤訊息
  - 模型不存在（404）：嘗試備用模型（gemini-1.5-flash → gemini-pro → gemini-1.0-pro）
  - 其他錯誤：降級到預設腳本或關鍵字匹配
- **LINE API 錯誤處理**：
  - Invalid reply token：自動 fallback 到 Push Message API
  - 其他錯誤：記錄日誌並返回友善錯誤訊息
- **資料庫錯誤處理**：try-catch 包裝，返回適當的錯誤回應

---

### ✅ LLM 配額與速率限制處理
- **實作位置**：`lib/gemini/client.ts`
- **處理方式**：
  - 偵測 429/quota 錯誤 → 返回 `API_QUOTA_EXCEEDED`
  - 在 `processUserMessage` 中處理，返回友善訊息
  - 降級到預設腳本或關鍵字匹配

---

### ✅ 即時更新
- **實作方式**：使用 SWR 的 `refreshInterval`（每 5 秒）
- **檔案**：`lib/hooks/usePolling.ts`
- **功能**：
  - 對話列表自動更新
  - 統計資料自動更新
  - 對話詳情自動更新

---

## 可選延伸（Nice to Have）

### ✅ 使用 Bottender 套件串接 LINE API 與對話資料庫
- **實作**：已整合 Bottender
- **檔案**：`lib/bottender/index.ts`
- **用途**：用於事件處理和類型定義（實際回覆使用直接 LINE API）

### ✅ 進階篩選：可依使用者、日期區間、平台、訊息內容搜尋
- **實作**：`app/api/conversations/route.ts`
- **支援**：
  - ✅ 日期區間（startDate, endDate）
  - ✅ 類別（category）
  - ✅ 狀態（status）
  - ✅ 使用者名稱搜尋（displayName, lineUserId）
  - ✅ 訊息內容搜尋（content）
  - ✅ 分頁（page, limit）

### ✅ Session 管理：追蹤對話流程與狀態機
- **實作**：使用 `Conversation.metadata.step` 追蹤對話流程
- **狀態機**：
  - `network:step1`：詢問影響範圍
  - `network:conn_type`：詢問連接方式
  - `network:router:troubleshoot`：路由器排查
  - `network:step2`：詢問連線狀況
  - `network:multi:router_check`：多人問題路由器檢查
  - `network:multi:check_traffic`：多人問題流量檢查
- **Context Switching**：支援流程中跳轉，回答新問題後可返回原流程

### ⚠️ 回應客製化：後台可調整 AI 人設與回覆規則
- **狀態**：部分實作
- **實作**：
  - Prompt 模板可調整（`lib/gemini/prompts.ts`）
  - 但沒有後台 UI 來動態調整
- **建議**：未來可新增後台設定頁面

### ✅ 效能/健康監控：回應時間、失敗率與健康檢查端點
- **狀態**：已完成
- **實作**：
  - ✅ Profiling logs：webhook 中有詳細的效能日誌（T0-T10, H0-H9）
  - ✅ 健康檢查端點：`/api/health`
    - 檢查資料庫連線狀態和回應時間
    - 檢查 LINE API 和 Gemini API 設定
    - 提供系統指標（對話數、使用者數、訊息數等）
    - 返回健康狀態（healthy/degraded/unhealthy）
    - 計算總回應時間

### ❌ 多平台支援
- **狀態**：未實作
- **目前**：僅支援 LINE

### ⚠️ 速率限制：對外 API 實作節流/限流以防濫用
- **狀態**：部分實作
- **實作**：
  - LINE webhook 有重複事件檢測（webhookEventId）
  - 但沒有針對使用者的速率限制
- **建議**：未來可新增 rate limiting middleware

### ✅ Webhook 健康檢查：提供可監控的狀態檢查
- **狀態**：已完成
- **實作**：
  - ✅ `/api/line/webhook` GET 方法提供詳細的健康狀態
    - Webhook 設定狀態（端點、方法、驗證方式）
    - 統計資訊（最近 1 小時訊息數、總訊息數、webhook 事件數）
    - 去重效率統計（重複事件檢測效果）
    - 服務狀態（資料庫、LINE API、Gemini API）
    - 功能狀態（去重檢測、Reply API、Profiling）
    - 環境變數設定檢查

### ❌ 批次作業：後台多選與批次刪除對話
- **狀態**：未實作
- **建議**：未來可新增批次操作功能

### ✅ 使用者分析：顯示總對話數、活躍使用者數、趨勢等統計數據
- **實作**：`app/admin/page.tsx`
- **功能**：
  - ✅ 總對話數
  - ✅ 活躍對話數
  - ✅ 總使用者數
  - ✅ 總訊息數
  - ✅ 類別統計
  - ✅ 趨勢圖表（過去 12 小時，使用 recharts）

---

## 額外實作的功能（超出基本要求）

### ✅ 知識庫整合（RAG）
- **檔案**：`lib/knowledge-base/index.ts`
- **功能**：
  - 整合 11 個知識來源（HackMD、PDF、網頁、Notion）
  - 自動搜尋相關知識來源
  - 將知識庫內容注入 Gemini prompt
  - 在回答中提供參考來源連結

### ✅ 意圖分類系統
- **檔案**：`lib/services/message.ts`
- **功能**：
  - 使用 Gemini 進行 10 種意圖分類
  - 支援 Context Switching
  - 支援 RAG 查詢

### ✅ Rich Menu API
- **檔案**：`app/api/line/rich-menu/setup/route.ts`
- **功能**：
  - 建立 Rich Menu
  - 上傳圖片
  - 設定為預設 Rich Menu
  - 查詢和刪除 Rich Menu

### ✅ 重複事件檢測
- **實作**：使用 `webhookEventId` 檢測重複的 webhook 事件
- **效果**：防止 LINE redelivery 造成的重複回覆

### ✅ 後台 UI/UX 優化
- **設計風格**：溫暖的宿舍小精靈風格（DaisyUI）
- **功能**：
  - 側邊欄導航
  - 統計卡片（含趨勢圖）
  - 聊天式對話詳情頁
  - 空狀態提示
  - 響應式設計

### ✅ 健康檢查系統
- **檔案**：`app/api/health/route.ts`
- **功能**：
  - 系統健康狀態檢查（healthy/degraded/unhealthy）
  - 服務狀態檢查（資料庫、LINE API、Gemini API）
  - 系統指標（對話數、使用者數、訊息數、最近訊息數）
  - 回應時間監控
  - HTTP 狀態碼對應（200/503）

### ✅ Webhook 健康檢查
- **檔案**：`app/api/line/webhook/route.ts` (GET 方法)
- **功能**：
  - Webhook 設定狀態檢查
  - 統計資訊（最近 1 小時、總數、去重效率）
  - 服務狀態檢查
  - 功能狀態檢查（去重檢測、Reply API、Profiling）
  - 環境變數設定驗證

---

## 總結

### 基本功能要求完成度：✅ 100%
所有基本功能要求都已完整實作。

### 可選延伸功能完成度：✅ 75%
- ✅ 已完成：Bottender 整合、進階篩選、Session 管理、使用者分析、效能監控、Webhook 健康檢查
- ⚠️ 部分完成：回應客製化（可調整但無 UI）、速率限制（有去重但無限流）
- ❌ 未實作：多平台支援、批次作業

### 額外功能
- 知識庫整合（RAG）
- 意圖分類系統
- Rich Menu API
- 重複事件檢測
- 後台 UI/UX 優化

---

## 建議改進項目

1. ✅ ~~**健康檢查端點**~~：已完成 `/api/health` 提供詳細的健康狀態
2. ✅ ~~**Webhook 健康檢查**~~：已完成詳細的 webhook 狀態檢查
3. **速率限制**：實作 middleware 限制每個使用者的請求頻率
4. **批次操作**：後台支援多選和批次刪除
5. **回應客製化 UI**：後台可動態調整 prompt 和回覆規則
6. **多平台支援**：擴展到其他平台（Messenger、Discord 等）

