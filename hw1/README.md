# 李倢安的冒險年表 | Joan's Timeline

一個純前端個人網站，展示李倢安（Joan Lee）的人生旅程、興趣愛好與專業經歷。網站採用現代化的設計風格，結合時間軸展示與互動式內容。

## 🌟 專案特色

- **個人化時間軸**：以視覺化方式呈現人生重要時刻
- **多媒體內容**：整合照片、影片、音樂播放器與社群媒體嵌入
- **響應式設計**：完美適配桌面與行動裝置
- **TypeScript 開發**：使用現代前端技術棧
- **模組化架構**：清晰的程式碼組織與維護性

## 🎯 網站功能

### 首頁 (index.html)
- 個人簡介與特色標籤
- 興趣展示區塊：
  - 🎵 KPOP 追星
  - 🎸 聽團（草東、康士坦的變化球等）
  - 🛹 滑板初學者
  - 📸 攝影作品
  - 🎬 Vlog 剪輯
  - 🎨 展覽參觀

### 關於我 (about.html)
- 個人履歷與聯絡資訊
- 工作經歷與專案經驗
- 技能清單與教育背景
- 側邊欄個人資訊卡片

### 時間軸 (timeline.html)
- 互動式時間軸展示
- 分類篩選功能（全部/專案/工作/學業/日常）
- 詳細事件描述與外部連結
- 響應式時間軸設計

### 聯絡頁面 (contact.html)
- 聯絡資訊展示
- 社群媒體連結

## 🛠️ 技術架構

### 前端技術
- **HTML5**：語義化標記
- **CSS3**：現代化樣式與動畫效果
- **TypeScript**：型別安全的 JavaScript
- **ES2020**：現代 JavaScript 特性

### 專案結構
```
my-timeline/
├── index.html          # 首頁
├── about.html          # 關於我頁面
├── timeline.html       # 時間軸頁面
├── contact.html        # 聯絡頁面
├── package.json        # 專案配置
├── tsconfig.json       # TypeScript 配置
├── scripts/            # TypeScript 原始碼
│   ├── main.ts         # 主要邏輯
│   ├── nav.ts          # 導航功能
│   ├── timeline.ts     # 時間軸功能
│   └── contact.ts      # 聯絡表單
├── dist/               # 編譯後的 JavaScript
├── styles/             # CSS 樣式檔案
│   ├── base.css        # 基礎樣式
│   ├── home.css        # 首頁樣式
│   ├── about.css       # 關於我樣式
│   ├── timeline.css    # 時間軸樣式
│   └── contact.css     # 聯絡頁面樣式
└── assets/             # 靜態資源
    ├── img/            # 圖片檔案
    ├── video/          # 影片檔案
    └── jf-openhuninn-2.1.ttf  # 字體檔案
```

### 設計系統
- **主色調**：深綠色 (#24392e)、金黃色 (#ffd166)
- **字體**：jf-openhuninn-2.1（辰宇落雁體）
- **設計風格**：現代簡約、卡片式佈局
- **動畫效果**：hover 效果、淡入動畫、變換效果

## 🚀 快速開始

### 環境需求
- Node.js 16+ 
- npm 或 yarn

### 安裝與執行

1. **安裝依賴**
   ```bash
   npm install
   # 或
   yarn install
   ```

2. **編譯 TypeScript**
   ```bash
   npm run build
   # 或
   yarn build
   ```

3. **開發模式（監聽檔案變化）**
   ```bash
   npm run dev
   # 或
   yarn dev
   ```

4. **啟動本地伺服器**
   ```bash
   npm run serve
   # 或
   yarn serve
   ```

5. **開啟瀏覽器**
   訪問 `http://localhost:3000`
   或 直接用瀏覽器打開 index.html

## 📱 響應式設計

網站採用響應式設計，完美適配各種裝置：

- **桌面版**：完整功能展示，多欄位佈局
- **平板版**：調整間距與字體大小
- **手機版**：單欄佈局，優化觸控操作

## 🎨 設計亮點

### 視覺設計
- 使用自訂字體營造個人風格
- 漸層背景與陰影效果
- 卡片式設計提升內容層次
- 一致的色彩系統與間距

### 互動體驗
- 平滑的 hover 動畫效果
- 時間軸的左右交錯佈局
- 分類篩選的即時切換
- 多媒體內容的無縫整合

### 內容展示
- 個人興趣的多樣化呈現
- 專案經驗的詳細描述
- 時間軸的視覺化敘事
- 社群媒體的整合嵌入

## 🔧 開發說明

### TypeScript 模組
- `main.ts`：主要初始化邏輯
- `nav.ts`：導航高亮功能
- `timeline.ts`：時間軸渲染與篩選
- `contact.ts`：contact me 版面設計

### CSS 架構
- `base.css`：全域樣式與重置
- 各頁面專用 CSS 檔案
- 響應式斷點設計
- CSS Grid 與 Flexbox 佈局

### 資源管理
- 圖片優化與適當格式選擇
- 影片檔案壓縮
- 字體檔案優化載入

## 📄 授權

MIT License - 詳見 [LICENSE](LICENSE) 檔案

## 👤 作者

**李倢安 (Joan Lee)**
- Email: b12705041@ntu.edu.tw
- GitHub: [@LEE-CHIEN-AN](https://github.com/LEE-CHIEN-AN)
- LinkedIn: [倢安 李](https://www.linkedin.com/in/倢安-李-494965356)

---
