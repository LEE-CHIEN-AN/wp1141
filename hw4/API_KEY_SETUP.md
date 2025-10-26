# Google Maps API Key 設定指南

## 問題診斷

從錯誤訊息可以看出：
1. `InvalidKeyMapError` - API Key 無效
2. `Google Maps JavaScript API has been loaded multiple times` - API 被重複載入

## 解決步驟

### 1. 建立 .env 檔案

在專案根目錄建立 `.env` 檔案：

```bash
# 複製範例檔案
cp env.example .env
```

### 2. 設定有效的 API Key

編輯 `.env` 檔案，將 API Key 替換為有效的：

```
VITE_GOOGLE_MAPS_API_KEY=你的有效API_KEY
```

### 3. Google Cloud Console 設定

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案或選擇現有專案
3. 啟用以下 API：
   - **Maps JavaScript API**
   - **Places API** (可選，用於地點搜尋)
4. 建立 API Key：
   - 前往「憑證」頁面
   - 點擊「建立憑證」→「API 金鑰」
   - 複製生成的 API Key

### 4. API Key 限制設定

為了安全起見，建議設定 API Key 限制：

1. **應用程式限制**：
   - 選擇「HTTP 參照網址 (網站)」
   - 新增 `http://localhost:5173/*`
   - 新增 `http://127.0.0.1:5173/*`

2. **API 限制**：
   - 選擇「限制金鑰」
   - 選擇「Maps JavaScript API」

### 5. 重新啟動開發伺服器

```bash
# 停止目前的伺服器 (Ctrl+C)
# 重新啟動
npm run dev
```

## 常見問題

### API Key 無效
- 檢查 API Key 是否正確複製
- 確認已啟用 Maps JavaScript API
- 檢查 API Key 限制設定

### 重複載入警告
- 已修復：新增重複載入檢查
- 如果仍有問題，清除瀏覽器快取

### 網路錯誤
- 檢查網路連線
- 確認沒有被防火牆或廣告攔截器阻擋

## 測試 API Key

您可以使用以下 URL 測試 API Key 是否有效：

```
https://maps.googleapis.com/maps/api/js?key=你的API_KEY&libraries=places
```

如果 API Key 有效，應該會載入 JavaScript 檔案而不會出現錯誤。

## 備用方案

如果 Google Maps API 仍有問題，可以考慮：

1. 使用 OpenStreetMap + Leaflet
2. 使用 Mapbox
3. 使用其他地圖服務

## 聯絡支援

如果問題持續存在，請提供：
1. 完整的錯誤訊息
2. API Key 設定截圖
3. Google Cloud Console 的 API 啟用狀態
