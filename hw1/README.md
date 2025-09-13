# 李倢安的冒險年表

一個純前端的時間軸應用程式，使用 HTML、CSS 和 TypeScript 建構，展示個人重要里程碑。

## 功能特色

- 🎨 美觀的響應式設計
- 📱 支援手機、平板、桌面裝置
- ⏰ 直式時間軸展示
- 🎯 固定頁首與頁尾
- 🚀 流暢的動畫效果
- 📦 使用 Yarn 管理套件

## 技術棧

- **HTML5** - 語義化標記
- **CSS3** - 響應式設計與動畫
- **TypeScript** - 型別安全的 JavaScript
- **Yarn** - 套件管理

## 專案結構

```
my-timeline/
├── src/
│   └── main.ts          # 主要 TypeScript 程式碼
├── dist/                # 編譯後的 JavaScript 檔案
├── index.html           # 主頁面
├── styles.css           # 樣式表
├── package.json         # 專案配置
├── tsconfig.json        # TypeScript 配置
└── README.md           # 專案說明
```

## 安裝與執行

### 安裝依賴套件
```bash
yarn install
```

### 編譯 TypeScript
```bash
yarn build
```

### 啟動開發伺服器
```bash
yarn serve
```

應用程式將在 `http://localhost:3000` 開啟。

## 使用說明

1. 開啟 `index.html` 或使用開發伺服器
2. 頁面會自動載入預設的三個時間軸事件
3. 事件按年份排序顯示
4. 支援滾動瀏覽所有事件
5. 頁首與頁尾固定不動

## 自訂事件

要新增或修改時間軸事件，請編輯 `src/main.ts` 中的 `timelineEvents` 陣列：

```typescript
const timelineEvents: TimelineEvent[] = [
    {
        year: 2004,
        title: "誕生",
        description: "我來到這個世界，故事開始。"
    },
    // 新增更多事件...
];
```

## 瀏覽器支援

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 授權

MIT License - 詳見 LICENSE 檔案

## 作者

© 2025 Li Jie-An
