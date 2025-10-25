# Google Maps API 設定指南

## 問題診斷

您遇到的錯誤 `net::ERR_BLOCKED_BY_CLIENT` 和搜尋無結果的問題，通常是因為 Google Maps API 金鑰未正確設定。

## 解決步驟

### 1. 創建 Google Maps API 金鑰

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 創建新專案或選擇現有專案
3. 啟用以下 API：
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. 創建 API 金鑰
5. 設定 API 金鑰限制（建議限制 HTTP 引用來源）

### 2. 設定環境變數

在專案根目錄創建 `.env` 檔案：

```env
# API 基礎 URL
VITE_API_BASE=http://localhost:3001

# Google Maps API Key
VITE_GOOGLE_MAPS_API_KEY=你的_Google_Maps_API_金鑰
```

### 3. 重啟開發伺服器

```bash
npm run dev
```

## 測試功能

1. 開啟瀏覽器開發者工具 (F12)
2. 查看 Console 標籤
3. 點擊「＋ 新增店家」→「搜尋店家」
4. 輸入店名（例如：「台北市咖啡廳」）
5. 查看 Console 中的調試訊息

## 常見問題

### API 金鑰未設定
- 錯誤訊息：`Google Maps API Key is not configured`
- 解決方案：檢查 `.env` 檔案是否存在且包含正確的 API 金鑰

### API 限制
- 錯誤訊息：`This API project is not authorized to use this API`
- 解決方案：在 Google Cloud Console 中啟用必要的 API

### 配額超限
- 錯誤訊息：`OVER_QUERY_LIMIT`
- 解決方案：檢查 Google Cloud Console 中的配額使用情況

### CORS 錯誤
- 錯誤訊息：`net::ERR_BLOCKED_BY_CLIENT`
- 解決方案：檢查 API 金鑰的 HTTP 引用來源限制設定

## 調試資訊

系統會在 Console 中顯示以下調試資訊：
- Google Maps API 載入狀態
- Places API 初始化狀態
- 搜尋請求和回應
- 錯誤詳情

如果問題持續存在，請檢查 Console 中的詳細錯誤訊息。
