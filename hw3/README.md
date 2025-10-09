# 🔮 神之創造販賣機 - Soul Vending Machine
這台販賣機在宇宙的角落，販售神在創造你時遺落的素材。

還記得那張梗圖嗎？「神在創造你時，不小心多加了一匙 ××」。
我們把這個靈魂工廠搬進瀏覽器——把「一匙衝動、兩匙咖啡因、三滴社交尷尬」做成真的商品，讓你用投幣的儀式感去調配自我。
你可以把各種荒謬屬性投幣加入購物車，組合成你的靈魂配方，最後生成一份創造報告書

# 🚀 快速開始

### 環境需求
- Node.js 16+ 
- Yarn 或 npm

### 安裝步驟

1. **下載專案**
```bash
git clone [專案網址]
cd vending_machine
```

2. **安裝依賴套件**
```bash
yarn install
# 或使用 npm
npm install
```

3. **啟動開發伺服器**
```bash
yarn dev
# 或使用 npm
npm run dev
```

4. **開啟瀏覽器**
訪問 `http://localhost:5173` 開始體驗

## ✨ 功能特色

### 🛒 **商品瀏覽系統**
- **38種神奇商品**: 從 Common 到 Mythic 的各種稀有度商品
- **智能篩選**: 依分類（能力、性格、習慣、詛咒等）和稀有度篩選
- **商品詳情**: 完整的商品描述、優缺點、價格資訊
- **視覺效果**: 霓虹立體卡片設計，hover 動畫效果
- **雲端圖片**: 使用 Google Drive 圖片連結，支援備用本地圖片載入

### 🧪 **我的調配系統**
- **購物車功能**: 最多選擇 5 個商品進行靈魂調配
- **浮動按鈕**: 右下角浮動購物車按鈕，不干擾瀏覽體驗
- **商品管理**: 可刪除已選商品，重新調整調配
- **上限警告**: 達到上限時顯示神語警告並自動展開購物車

### 📜 **神之創造報告書**
- **開場動畫**: 2秒儀式感動畫，能量陣啟動效果
- **靈魂稱號**: 根據選中商品隨機生成靈魂稱號
- **神的評語**: 隨機神語評語，特殊組合觸發彩蛋
- **成分展示**: 圖片並排展示選中商品
- **截圖分享**: 一鍵截圖並分享您的靈魂報告

### 🎵 **沉浸式體驗**
- **宇宙背景**: 深空漸層、星雲效果、行星軌道、宇宙射線
- **雲端音效**: 使用 Google Drive 音訊檔案，太空環境音效
- **動畫效果**: Framer Motion 流暢動畫
- **響應式設計**: 完美適配各種裝置

## 🛠️ 技術棧

- **React 18** - 現代化前端框架
- **TypeScript** - 型別安全的 JavaScript
- **Vite** - 極速建構工具
- **Material-UI** - 現代化 UI 組件庫
- **Framer Motion** - 流暢動畫庫
- **PapaParse** - CSV 資料解析
- **html2canvas** - 截圖功能
- **自定義 Hooks** - 狀態管理和邏輯分離



### 建構與部署

```bash
# 建構生產版本
yarn build

# 預覽生產版本
yarn preview
```

## 📁 專案結構

```
vending_machine/
├── public/                    # 靜態資源
│   ├── audio/                # 音效檔案 (已排除，使用 Google Drive)
│   ├── picture/              # 商品圖片 (已排除，使用 Google Drive)
│   ├── weird_vending_machine.csv    # 商品資料 (包含 img_url)
│   ├── soul_titles.csv              # 靈魂稱號資料
│   └── divine_quotes.csv            # 神語評語資料
├── src/
│   ├── types/                # TypeScript 類型定義
│   │   └── index.ts
│   ├── constants/            # 常數管理
│   │   └── index.ts
│   ├── utils/                # 工具函數
│   │   ├── index.ts
│   │   └── spaceAmbient.ts   # 音效工具
│   ├── hooks/                # 自定義 Hooks
│   │   ├── useProducts.ts    # 商品資料管理
│   │   ├── useShoppingCart.ts # 購物車狀態管理
│   │   └── useAudio.ts       # 音效控制
│   ├── components/           # React 組件
│   │   ├── Header.tsx       # 標題組件
│   │   ├── FilterBar.tsx    # 篩選列組件
│   │   ├── VendingMachineGrid.tsx  # 商品網格
│   │   ├── ProductCard.tsx   # 商品卡片
│   │   ├── MixDrawer.tsx     # 購物車抽屜
│   │   ├── SoulReport.tsx    # 靈魂報告書
│   │   ├── GodWarningDialog.tsx # 神語警告對話框
│   │   ├── SpaceBackground.tsx # 宇宙背景
│   │   └── SpaceBackground.css
│   ├── theme.ts              # Material-UI 主題
│   ├── App.tsx               # 主應用程式
│   ├── main.tsx              # 應用程式入口
│   └── index.css             # 全域樣式
├── package.json              # 專案配置
├── tsconfig.json             # TypeScript 配置
├── vite.config.ts            # Vite 配置
└── README.md                 # 專案說明
```

## 🏗️ 架構設計

### 📋 **類型定義 (types/index.ts)**
- **Product**: 商品資料結構
- **SoulTitle**: 靈魂稱號資料結構  
- **DivineQuote**: 神語評語資料結構
- **組件 Props**: 所有組件的屬性類型
- **狀態類型**: GodWarningState 等狀態類型

### 🔧 **常數管理 (constants/index.ts)**
- **GOD_WARNING_MESSAGES**: 神語警告訊息
- **RARITY_COLORS**: 稀有度顏色對應
- **RARITY_ICONS**: 稀有度圖示對應
- **MAX_SELECTED_PRODUCTS**: 最大選擇商品數
- **CSV_PATHS**: CSV 檔案路徑
- **動畫常數**: 動畫持續時間

### 🛠️ **工具函數 (utils/index.ts)**
- **getRarityColor**: 獲取稀有度顏色
- **getRarityIcon**: 獲取稀有度圖示
- **getRandomMessage**: 隨機選擇訊息
- **checkSpecialCombo**: 檢查特殊組合
- **calculateTotalPrice**: 計算總價格
- **convertGoogleDriveUrl**: 轉換 Google Drive 圖片連結
- **convertGoogleDriveAudioUrl**: 轉換 Google Drive 音訊連結
- **getImagePath**: 獲取本地圖片路徑 (備用)
- **debounce**: 防抖函數

### 🎣 **自定義 Hooks**
- **useProducts**: 管理商品資料載入和狀態
- **useShoppingCart**: 管理購物車邏輯和神語警告
- **useAudio**: 管理音效控制和靜音狀態

### 🧩 **組件分離**
- **GodWarningDialog**: 獨立的神語警告對話框組件
- **簡化 App.tsx**: 移除重複邏輯，使用自定義 Hooks
- **類型安全**: 所有組件使用統一的類型定義

## 📊 資料格式

### 商品資料 (weird_vending_machine.csv)
```csv
id,name,category,description,rarity,price,pros,cons,img_url
1,加倍行動力濃縮液,能力,喝下後可連續清醒72小時...,Rare,3天的睡眠,效率激增,理智下滑...,https://drive.google.com/file/d/1FXFJivallJdYFqE048RmZcXlJRkcqtGB/view?usp=drive_link
```

### 靈魂稱號資料 (soul_titles.csv)
```csv
trigger_item_id,name,category,rarity,title
1,加倍行動力濃縮液,能力,Rare,宇宙祕名·承載體：時間暫停泡泡糖
```

### 神語評語資料 (divine_quotes.csv)
```csv
trigger_item_id,name,category,rarity,quote
1,加倍行動力濃縮液,能力,Rare,你的靈魂充滿了無限的可能性...
```

## ☁️ Google Drive 整合

### 🖼️ **圖片管理**
- **雲端圖片**: 所有商品圖片使用 Google Drive 連結
- **智能載入**: 優先載入 Google Drive 圖片，失敗時自動回退到本地圖片
- **URL 轉換**: 自動將 Google Drive 分享連結轉換為直接圖片連結
- **備用機制**: 確保圖片始終能正常顯示

### 🎵 **音訊管理**
- **雲端音效**: 背景音樂使用 Google Drive 音訊檔案
- **直接播放**: 轉換為可直接播放的音訊連結格式
- **無縫體驗**: 音效載入失敗時自動回退到本地檔案

### 📦 **專案優化**
- **檔案大小**: 從 71MB 優化到 4.22MB (減少 94%)
- **Git 友善**: 排除大檔案，適合版本控制
- **部署效率**: 大幅提升部署和載入速度

### 🔧 **技術實作**
```typescript
// 圖片 URL 轉換
const convertGoogleDriveUrl = (url: string): string => {
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=view&id=${match[1]}`
  }
  return url
}

// 音訊 URL 轉換
const convertGoogleDriveAudioUrl = (url: string): string => {
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=download&id=${match[1]}`
  }
  return url
}
```

## 🎮 使用指南

### 基本操作
1. **瀏覽商品**: 使用篩選功能找到心儀的商品
2. **投幣購買**: 點擊「🪙 投幣購買」將商品加入購物車
3. **管理調配**: 在右下角購物車中管理已選商品
4. **創造靈魂**: 點擊「🧪 創造靈魂」生成您的靈魂報告書

### 進階功能
- **上限管理**: 最多選擇 5 個商品，達到上限會觸發神語警告
- **特殊組合**: 特定商品組合會觸發特殊效果和彩蛋評語
- **截圖分享**: 在靈魂報告書中可截圖並分享您的創造結果

## 🎨 設計理念

- **神之機械**: 融合科幻與奇幻元素的中二病風格
- **宇宙主題**: 深空背景、星雲效果、宇宙射線營造神秘氛圍
- **霓虹美學**: 發光邊框、漸層色彩、動態效果
- **沉浸體驗**: 環境音效、流暢動畫、儀式感設計

## 🔧 開發說明

### 🎯 **重構優勢**
- **模組化**: 功能分離，易於理解和修改
- **類型安全**: TypeScript 類型定義確保代碼品質
- **單一職責**: 每個文件都有明確的職責
- **可重用性**: 自定義 Hooks 和工具函數可在多處使用
- **代碼組織**: 清晰的檔案結構和命名規範

### 🚀 **技術特點**
- **狀態管理**: 使用自定義 Hooks 管理複雜狀態
- **錯誤處理**: 統一的錯誤處理機制
- **性能優化**: 使用 useCallback 避免不必要的重渲染
- **類型安全**: 完整的 TypeScript 類型覆蓋
- **DRY 原則**: 避免重複代碼，關注點分離

### 📈 **代碼品質**
- **現代化**: 使用最新的 React 18 和 Vite 技術
- **響應式**: 完美適配桌面、平板、手機各種裝置
- **組件化**: 模組化設計，易於維護和擴展
- **一致性**: 統一的命名和結構

## 📝 更新日誌

- **v1.0.0**: 基礎販賣機功能
- **v2.0.0**: 加入靈魂報告書系統
- **v3.0.0**: 實現宇宙背景和音效
- **v4.0.0**: 加入神語警告和購物車管理
- **v5.0.0**: 代碼重構 - 模組化架構、自定義 Hooks、類型安全
- **v6.0.0**: Google Drive 整合 - 雲端圖片和音訊，優化專案大小

## 📋 Git 設定

### 🚫 **排除檔案 (.gitignore)**
```gitignore
# 依賴套件
node_modules

# 大檔案 (使用 Google Drive)
public/picture
public/audio
*.mp3
*.wav
*.mp4
*.mov

# 建構檔案
dist
dist-ssr
*.local

# 編輯器設定
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# 日誌檔案
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*
```

### 📊 **專案大小優化**
- **優化前**: ~71MB (包含所有圖片和音訊)
- **優化後**: 4.22MB (僅包含程式碼和資料)
- **減少**: 94% 的檔案大小
- **Git 友善**: 適合版本控制和 CI/CD

## 🤝 貢獻指南

歡迎提交 Issue 和 Pull Request 來改善這個專案！

## 📄 授權

MIT License - 詳見 LICENSE 檔案

---

**這台販賣機在宇宙的角落，販售神在創造你時遺落的素材。** ✨