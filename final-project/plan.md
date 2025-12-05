# Final Project – Midterm Plan

## Deploy Link
https://ntu-cooooooool.vercel.app

## 專案介紹與動機 (Introduction & Motivation)
炎炎夏日走在台北街頭，Google Maps 總是指引我們走「最短」但卻很「曬」的路。**NTU COOL** 是一個啟發自 [CoolWalks for active mobility in urban street networks](https://www.nature.com/articles/s41598-025-97200-2) 論文的網頁應用程式。

我們結合了 **Mapbox 3D 城市建模** 與 **太陽軌跡演算法**，不只是計算距離，更計算路徑上的「陰影覆蓋率」。我們的目標是為行人規劃出一條既舒適又不至於繞太遠的「最佳陰影路線」，目前已實作台北市範圍內（主要測試區為台大周邊）的即時陰影路徑計算。



> **P.S. 關於運算速度與體驗**
> 地圖載入以及路徑、陰影計算涉及大量運算，請耐心等候結果（團隊已在本地端針對演算法進行優化，惟受限於免費雲端託管環境的速度遠不及本地開發，導致處理時間較長。此次實作也讓我們深刻體會到，此類高密集運算服務確實需要 AWS 等企業級基礎設施的支援。)

> **P.S. 關於連線狀態**
> 由於 12/05傍晚 Cloudflare 目前發生連線異常，導致部署在 Render 上的後端服務暫時無法存取。待 Cloudflare 連線恢復穩定後，網頁即可自動恢復正常運作。

## 1. 本次 Prototype 已完成

- ✅ 基本頁面架構
  - React + TypeScript + Vite 前端架構
  - Tailwind CSS + shadcn/ui 組件系統
  - Mapbox GL JS 地圖整合

- ✅ 兩個示意頁面
  - 地圖視圖頁面（MapView）
  - 路線規劃頁面（RoutePlanner）

- ✅ 基本功能
  - 地點搜尋（Google Places API）
  - 地圖顯示與互動
  - 3D 建築物顯示
  - 路線規劃 UI

- ✅ 核心功能實作
  - 陰影感知路線計算（Shadow-Aware Routing）
  - 即時陰影計算與顯示
  - 最短路線對比功能
  - 建築物資料載入與視覺化
  - 地圖圖層控制（建築物、陰影、路線開關）
  - 路線統計資訊與陰影覆蓋率計算

- ✅ 後端 API 架構
  - FastAPI 後端服務
  - 陰影計算演算法
  - OSMnx 街道網路整合
  - CORS 配置與錯誤處理

- ✅ 資料庫與效能優化
  - Supabase PostGIS 資料庫整合（GiST 空間索引）
  - 資料庫連線池化（Connection pooling）
  - 快取機制（Route cache、Street graph cache、Cache index）
  - 前端 debouncing 優化（shadow fetch、autocomplete、viewport changes）

- ✅ 部署配置
  - Vercel 前端部署
  - Render 後端部署
  - 環境變數配置
  - 部署問題修復（CORS、Mapbox token、timeout）

## 2. 最終版本預計完成項目

### 完整的使用者流程
- [ ] 使用者 GPS 定位功能（瀏覽器 Geolocation API）
- [ ] 即時位置追蹤與導航模式
- [ ] 路線歷史記錄
- [ ] 路線分享功能

### 資料庫串接
- [x] Supabase 資料庫基本整合（PostGIS 查詢功能）
- [x] PostGIS 空間查詢優化（GiST index 已建立）
- [x] 資料庫連線池化（Connection pooling）- 使用 @lru_cache 實作
- [x] 快取機制優化（Route cache、Street graph cache、Cache index）
- [ ] 路線歷史儲存

### 三大主要功能

#### 功能一：智能陰影導航（Shadow-Aware Navigation）
- [x] 基礎陰影計算演算法
- [x] 路線優化（平衡距離與陰影覆蓋率）
- [x] 路線比較視覺化（陰影路線 vs 最短路線）
- [x] 多時段路線預覽（選擇不同時間查看路線變化）
- [ ] 雙向路線切換（使用者可選擇陰影最多或陽光最多的路線）
- [ ] 台北市行道樹整合（納入陰影計算，[資料來源](https://data.taipei/dataset/detail?id=7a49d00c-a5ff-4a6b-be9e-aaa6dc1ff7e8)）

#### 功能二：互動式地圖視覺化（Interactive Map Visualization）
- [x] 3D 建築物顯示
- [x] 陰影多邊形顯示
- [x] 路線繪製
- [x] 地圖圖層控制（建築物、陰影、路線開關）
- [x] 建築物高度資訊顯示
- [ ] 響應式設計（RWD）與行動裝置適配
- [ ] 自訂地圖樣式選項與地圖介面美化
- [ ] 樹木密度地圖視覺化

#### 功能三：進階路線分析與效能優化（Advanced Route Analytics & Performance）
- [x] 陰影覆蓋率計算
- [x] 路線統計資訊
- [ ] 後端計算效能優化（減少 timeout 問題，優化幾何運算與空間查詢）
- [ ] 背景任務處理架構（Celery + Redis，避免 504 timeout）
- [ ] 請求佇列機制實作
- [ ] 前端效能優化（bundle size、code splitting、lazy loading）

## 3. 預期開發進度

### Week 1: 完成功能 A & B
**目標：行動裝置支援與 GPS 定位功能**

- **功能 A：響應式設計（RWD）與行動裝置優化**
  - [ ] 行動裝置版面調整（手機、平板適配）
  - [ ] 觸控操作優化（手勢支援、縮放優化）
  - [ ] 行動裝置效能優化（減少資料載入、優化渲染）
  - [ ] 行動裝置專用 UI 元件（底部導航、全螢幕地圖模式）

- **功能 B：GPS 定位與導航功能**
  - [ ] 使用者 GPS 定位功能（瀏覽器 Geolocation API）
  - [ ] 即時位置追蹤與路線更新
  - [ ] 導航模式 UI（轉向提示、距離顯示）
  - [ ] 位置權限處理與錯誤提示
  - [ ] 背景定位支援（PWA）

**技術任務**：
- [ ] 響應式 CSS 調整（Tailwind breakpoints）
- [ ] Geolocation API 整合
- [ ] 行動裝置測試與優化
- [ ] PWA 設定（Service Worker、Manifest）

### Week 2: 完成功能 C / 串接 API
**目標：版面美化與進階功能實作**

- **功能 C：版面美化與 UI 優化**
  - [ ] 整體視覺設計優化（色彩、字體、間距）
  - [ ] 動畫與過渡效果（載入動畫、狀態轉換）
  - [ ] 圖示與視覺元素優化
  - [ ] 深色模式支援（Dark mode）

- **功能 D：台北市行道樹整合**
  - [ ] 整合台北市行道樹資料（CSV/JSON 轉換、座標轉換）
  - [ ] 行道樹陰影計算（納入樹木高度與樹冠範圍）
  - [ ] 建築物 + 行道樹綜合陰影計算
  - [ ] 樹木資料快取與索引優化（PostGIS 空間索引）

- **功能 E：雙向路線切換**
  - [ ] 實作「陽光最多路線」模式（反向陰影計算）
  - [ ] 季節性路線建議（冬天選擇陽光路線，夏天選擇陰影路線）
  - [ ] UI 切換控制（陰影優先 / 陽光優先 / 平衡模式）

**技術任務**：
- [ ] 資料處理腳本（行道樹資料轉換）
- [ ] 陰影計算演算法擴充（支援樹木）
- [ ] UI 元件優化與美化
- [ ] API 文件撰寫（Swagger/OpenAPI）

### Week 3: 介面調整與最終整合
**目標：效能優化與最終整合**

- **效能優化**
  - [ ] 後端計算效能優化（優化幾何運算與空間查詢，減少 timeout）
  - [ ] 背景任務處理架構（Celery + Redis，避免 504 timeout）
  - [ ] 請求佇列機制實作（限制並發計算）
  - [ ] 前端 bundle size 優化（code splitting、lazy loading）
  - [ ] 快取策略優化（更積極的快取機制）

- **介面調整**
  - [ ] UI/UX 全面優化
  - [ ] 載入動畫與過渡效果
  - [ ] 錯誤處理與使用者提示改善

- **最終整合**
  - [ ] 端到端測試（E2E testing）
  - [ ] 效能測試與基準測試
  - [ ] 安全性檢查（CORS、XSS、CSRF）
  - [ ] 文件撰寫（使用者手冊、API 文件）

- **部署與監控**
  - [ ] 生產環境配置檢查
  - [ ] 監控與日誌設定（Render logs、Vercel analytics）
  - [ ] 錯誤追蹤系統整合
  - [ ] 效能監控設定（計算時間、API 回應時間）
