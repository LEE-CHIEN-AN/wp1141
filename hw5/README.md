# X-Clone - Twitter/X 社群網站複製版

一個使用 Next.js、Prisma、PostgreSQL 和 Pusher 構建的現代化社群媒體平台，模仿於 Twitter/X。

## 🚀 Deployed Link

**Live Demo:** [https://your-app-name.vercel.app](https://your-app-name.vercel.app)


## ✨ 功能清單

### 🔐 基本功能

#### 註冊與登入
- ✅ OAuth 登入（Google、GitHub、Facebook）
- ✅ 註冊時輸入 userID（3-20 字元，必須以字母開頭，可包含英數、底線）
- ✅ Session 管理（JWT）
- ✅ 使用 userID 登入（輸入 userID 後自動導向對應的 OAuth provider 登入頁面）
- ✅ 同一個人使用不同的 OAuth providers 可以註冊成不同的 userIDs

#### 主選單
- ✅ Home - 首頁（All/Following 切換）
- ✅ Explore - 探索頁面（分類：For You、Trending、News、Sports、Entertainment）
- ✅ Notifications - 通知中心（All、Verified、Mentions）
- ✅ Bookmarks - 書籤列表
- ✅ Profile - 個人資料頁面
- ✅ Post - 發表貼文（Modal）

#### 個人首頁
- ✅ 編輯個人資料（姓名、簡介、頭像、橫幅）
- ✅ 顯示貼文數量、追蹤數、粉絲數
- ✅ 查看自己的貼文和轉發
- ✅ 查看其他用戶的個人資料（唯讀）
- ✅ Follow/Following 按鈕

#### 發表文章
- ✅ Modal 彈窗發文
- ✅ 280 字元限制
- ✅ 連結自動辨識（每條連結佔用 23 字元）
- ✅ Hashtag 和 @mention 不計入字元數
- ✅ 多媒體支援（圖片上傳，最多 4 張）
- ✅ 草稿功能（Save/Discard）
- ✅ Inline 發文（首頁直接發文）

#### 閱讀文章
- ✅ 文章列表（All/Following）
- ✅ 最新到最舊排序
- ✅ 無限滾動（Infinite Scroll）- 自動載入更多貼文
- ✅ @mention 連結到個人資料
- ✅ 按愛心（Toggle）
- ✅ 轉發（Repost）
- ✅ 留言（Comment）
- ✅ 書籤（Bookmark）
- ✅ 刪除貼文（自己的貼文）
- ✅ 文章/留言遞迴顯示（點擊進入詳情頁）
- ✅ 左箭頭 + Post 按鈕回到上一層

#### 即時互動
- ✅ Pusher 即時更新（按讚、留言、轉發）
- ✅ 樂觀更新（Optimistic Update）- UI 立即響應

### 🎯 進階功能

#### Explore 探索頁面
- ✅ 搜尋功能（Top、Latest、People、Media）
- ✅ 分類標籤（For You、Trending、News、Sports、Entertainment）
- ✅ 今日新聞（Today's News）
- ✅ 趨勢話題（Trending in Taiwan）
- ✅ Hashtag 排名顯示

#### Notification 通知中心
- ✅ 通知分類（All、Verified、Mentions）
- ✅ 未讀通知計數（側邊欄和移動端底部導航）
- ✅ 標記所有為已讀
- ✅ 即時通知更新
- ✅ 通知類型：按讚、轉發、留言、回覆

#### New Post Notice
- ✅ 當追蹤的用戶發文時，在首頁上方顯示通知橫幅
- ✅ 顯示前三個發文用戶的頭像
- ✅ 點擊橫幅回到頂部並刷新內容
- ✅ 支援 All 和 Following 兩種 feed 類型

#### Hashtag 完整支援
- ✅ 點擊 #hashtag 進入該標籤的貼文列表
- ✅ 從最新到最舊排序
- ✅ 趨勢標籤排名

#### Bookmarks 書籤功能
- ✅ 將貼文加入書籤（私有）
- ✅ 書籤列表頁面
- ✅ 側邊欄和移動端導航連結

#### 多媒體支援
- ✅ 圖片上傳（使用 Cloudinary）
- ✅ 圖片預覽
- ✅ 響應式圖片顯示

#### 手機版顯示
- ✅ 響應式設計
- ✅ 移動端底部導航
- ✅ 桌面端側邊欄（移動端隱藏）

## 🏗️ 架構圖

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   React UI   │  │  Next.js App │  │   Pusher     │      │
│  │  Components  │  │    Router    │  │   Client     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Server (Vercel)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  API Routes  │  │  Server      │  │   Pusher     │      │
│  │  /api/*      │  │  Components  │  │   Server     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  NextAuth.js  │  │   Prisma     │  │  Cloudinary  │      │
│  │  (OAuth)      │  │   ORM        │  │  (Media)     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
┌──────────────┐                      ┌──────────────┐
│  PostgreSQL  │                      │   Pusher     │
│  Database    │                      │   Service    │
│              │                      │  (Realtime)  │
└──────────────┘                      └──────────────┘
```

### 技術棧

- **前端框架：** Next.js 14 (App Router)
- **UI 框架：** React 18
- **樣式：** Tailwind CSS
- **資料庫：** PostgreSQL
- **ORM：** Prisma
- **認證：** NextAuth.js (OAuth: Google, GitHub, Facebook)
- **即時通訊：** Pusher (支援 Mock 模式)
- **媒體儲存：** Cloudinary
- **部署：** Vercel

### 資料庫架構

```
User
├── Account (OAuth)
├── Session
├── Profile
├── Post
│   ├── PostMedia
│   ├── Like
│   ├── Repost
│   ├── Comment
│   │   ├── CommentLike
│   │   ├── CommentRepost
│   │   └── Comment (replies)
│   └── Bookmark
├── Follow (following/followers)
├── Draft
└── Notification
```

## 🚀 本地開發

### 環境需求

- Node.js 18+
- PostgreSQL 資料庫
- Cloudinary 帳號（用於媒體上傳）
- Pusher 帳號（可選，支援 Mock 模式）

### 安裝步驟

1. **克隆專案**
```bash
git clone <repository-url>
cd x-clone
```

2. **安裝依賴**
```bash
yarn install
# 或
npm install
```

3. **設置環境變數**

創建 `.env` 文件：

```env
# Database
POSTGRES_PRISMA_URL="postgresql://user:password@localhost:5432/x-clone"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_ID="your-github-id"
GITHUB_SECRET="your-github-secret"
FACEBOOK_CLIENT_ID="your-facebook-client-id"
FACEBOOK_CLIENT_SECRET="your-facebook-secret"

# Pusher (可選，支援 Mock 模式)
PUSHER_APP_ID="your-pusher-app-id"
PUSHER_KEY="your-pusher-key"
PUSHER_SECRET="your-pusher-secret"
PUSHER_CLUSTER="your-pusher-cluster"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

```

4. **初始化資料庫**
```bash
npx prisma migrate dev
npx prisma generate
```

5. **啟動開發服務器**
```bash
yarn dev
# 或
npm run dev
```

6. **訪問應用**
打開瀏覽器訪問 [http://localhost:3000](http://localhost:3000)



## 📝 開發腳本

```bash
# 開發模式
yarn dev

# 建置
yarn build

# 生產模式
yarn start

# 資料庫遷移
npx prisma migrate dev

# Prisma Studio（資料庫管理工具）
npx prisma studio

# 生成假資料
yarn seed:explore      # 生成 Explore 頁面假資料
yarn seed:notifications # 生成通知假資料
yarn seed:new-post-notice # 生成 New Post Notice 測試資料
yarn db:seed:hw5xclone  # 為 @hw5xclone 帳號生成完整測試資料
yarn simulate:new-posts   # 模擬新貼文（觸發 Pusher 事件）
```

## 🔧 主要功能實現細節

### 樂觀更新（Optimistic Update）

所有互動功能（按讚、轉發、書籤、Follow、留言）都實現了樂觀更新，確保 UI 立即響應，無需等待 API 回應。

### 無限滾動（Infinite Scroll）

首頁貼文列表實現了無限滾動功能：
- 使用 Intersection Observer API 檢測滾動到底部
- 自動載入下一批貼文（每批 20 條）
- 使用 Cursor-based Pagination 實現高效分頁
- 顯示載入狀態和「沒有更多貼文」提示
- 支援 All 和 Following 兩種 feed 類型

### 即時更新（Realtime Updates）

使用 Pusher 實現即時更新：
- 按讚/取消按讚
- 新增留言
- 轉發
- 新貼文通知

支援 Mock Pusher 模式，無需真實 Pusher 服務即可開發和測試。

### 響應式設計

- 桌面端：左側邊欄 + 主內容區域
- 移動端：底部導航欄，側邊欄隱藏
- 所有頁面都適配不同螢幕尺寸

## 📚 相關文檔

- [Cloudinary 設置指南](docs/cloudinary-setup.md)
- [Prisma Schema](prisma/schema.prisma)

## 📄 License

MIT

## 👥 作者

[Your Name]

---

**注意：** 這是一個學習專案，用於展示現代 Web 開發技術。請勿用於生產環境或商業用途。
