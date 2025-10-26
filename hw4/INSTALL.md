# 台灣選物店地圖清單 - 安裝指南

## 快速開始

### 1. 安裝依賴套件
```bash
npm install
```

### 2. 設定 Google Maps API Key
1. 複製環境變數範例檔案：
```bash
cp env.example .env
```

2. 編輯 `.env` 檔案，設定您的 Google Maps API Key：
```
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 3. 啟動開發伺服器
```bash
npm run dev
```

### 4. 開啟瀏覽器
訪問 `http://localhost:5173`

## Google Maps API 設定步驟

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案或選擇現有專案
3. 啟用 **Maps JavaScript API**
4. 前往「憑證」頁面，建立新的 API Key
5. 複製 API Key 並貼到 `.env` 檔案中

## 功能說明

### 地圖操作
- **拖曳**：移動地圖視角
- **縮放**：使用滑鼠滾輪或右下角按鈕
- **點擊空白處**：新增新店家
- **點擊標記**：查看店家詳情

### 店家管理
- **查看詳情**：點擊標記或懸停查看浮動卡片
- **收藏店家**：在詳情頁面點擊收藏按鈕
- **新增造訪紀錄**：記錄造訪日期、評分、心得

### 響應式設計
- 支援桌面、平板、手機等各種裝置
- 自動調整介面布局

## 疑難排解

### 地圖無法載入
- 檢查 Google Maps API Key 是否正確設定
- 確認 API Key 已啟用 Maps JavaScript API
- 檢查瀏覽器控制台是否有錯誤訊息

### 樣式顯示異常
- 確認已安裝所有依賴套件
- 重新啟動開發伺服器

## 技術支援

如有問題，請檢查：
1. Node.js 版本是否為 16 或以上
2. 所有依賴套件是否正確安裝
3. Google Maps API Key 是否有效
