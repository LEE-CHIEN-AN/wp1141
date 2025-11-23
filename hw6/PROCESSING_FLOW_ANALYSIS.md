# 訊息處理流程分析

## 目前的處理流程

### 當使用者輸入「我的網段在女六舍」時：

1. **接收訊息** (`app/api/line/webhook/route.ts`)
   - LINE webhook 接收訊息事件
   - 建立 `messageContext`

2. **處理訊息** (`lib/bottender/handlers.ts` - `handleLineMessage`)
   - 取得或建立使用者
   - 取得或建立對話
   - 檢查對話狀態（`metadata.step`）
   - 如果沒有對話狀態，取得對話歷史
   - 呼叫 `processUserMessage`

3. **處理使用者訊息** (`lib/services/message.ts` - `processUserMessage`)
   - **步驟 1：檢查特殊指令**（選單等）
   - **步驟 2：檢查核心功能關鍵字匹配**（無分類時）
     - 「無法上網」→ 連線故障排除
     - 「如何註冊」→ 註冊教學
     - 「網域不在女八舍」→ 網域問題（但「網段在女六舍」不匹配）
     - 「網速很慢」→ 網速檢查
     - 「聯絡網管」→ 聯絡資訊
   - **步驟 3：如果有分類，檢查分類相關關鍵字**
     - 網路問題：多人、個人、完全無法、斷斷續續
     - 註冊問題：第一次、路由器、修改 MAC、網域不在女八舍
   - **步驟 4：如果關鍵字匹配失敗，嘗試使用 Gemini API**
     - 建立 prompt（包含對話歷史）
     - 呼叫 `generateResponse`
   - **步驟 5：如果 Gemini 成功，返回回應**
   - **步驟 6：如果 Gemini 失敗，降級到預設腳本**

4. **Gemini API 呼叫** (`lib/gemini/client.ts` - `generateResponse`)
   - 使用 `gemini-1.5-flash` 模型
   - 如果成功，返回文字
   - 如果失敗，返回錯誤

## 問題分析

### 問題 1：Gemini API 404 錯誤

**錯誤訊息：**
```
models/gemini-1.5-flash is not found for API version v1beta
```

**可能原因：**
- 模型名稱錯誤
- API 版本不匹配
- 需要使用不同的模型名稱（如 `gemini-1.5-flash-latest` 或 `gemini-pro`）

### 問題 2：錯誤處理不完整

**目前的錯誤處理：**
- 只檢查 `429` 和 `quota` 關鍵字
- 其他錯誤（如 404）只返回 `error.message`
- 沒有針對 404 錯誤的特殊處理

**應該改進：**
- 檢查錯誤狀態碼（404, 500 等）
- 針對不同錯誤類型提供不同的處理
- 當 Gemini 失敗時，應該要降級到預設腳本，而不是返回錯誤訊息

### 問題 3：降級邏輯問題

**目前的降級邏輯：**
```typescript
if (geminiResponse.text && !geminiResponse.error) {
  return createTextWithMenuOption(geminiResponse.text);
}

// 處理 LLM 配額錯誤
if (geminiResponse.error === "API_QUOTA_EXCEEDED") {
  return createTextWithMenuOption("抱歉，AI 服務目前暫時無法使用...");
}

// 如果都無法處理，降級到預設腳本
return getDefaultResponseForCategory(category);
```

**問題：**
- 當 Gemini 返回錯誤（但不是配額錯誤）時，會降級到預設腳本
- 但預設腳本可能不是最適合的回應
- 對於「網段在女六舍」這種問題，應該要能理解並回應

## 改進建議

### 1. 修正 Gemini API 模型名稱

檢查並修正模型名稱，可能需要：
- 使用 `gemini-1.5-flash-latest` 或 `gemini-1.5-pro`
- 或檢查 API 版本設定

### 2. 改進錯誤處理

- 檢查錯誤狀態碼
- 針對 404 錯誤，嘗試使用備用模型
- 針對其他錯誤，提供更友善的錯誤訊息

### 3. 改進關鍵字匹配

- 新增「網段在」相關的關鍵字匹配
- 當使用者提到其他宿舍時，也能正確處理

### 4. 改進降級邏輯

- 當 Gemini 失敗時，嘗試使用更智能的關鍵字匹配
- 提供更友善的錯誤訊息，引導使用者使用選單

