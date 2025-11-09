# X-Clone - Twitter/X 社群網站複製版

一個使用 Next.js、Prisma、PostgreSQL 和 Pusher 、 Cloudinary 構建的現代化社群媒體平台，模仿於 Twitter/X。

## 🚀 Deployed Link

**Live Demo:** [https://xclone-wheat.vercel.app](https://xclone-wheat.vercel.app)

## 🧪 測試帳號

為了方便評分的同學測試，我們提供了一個預先設置的 Google 測試帳號：

### Google 測試帳號資訊

- **帳號：** `hw5xclone@gmail.com`
- **密碼：** `hw5xclone123456`
- **UserID：** `hw5xclone`

### 登入方式

1. 訪問 [https://xclone-wheat.vercel.app](https://xclone-wheat.vercel.app)
2. 在登入頁面輸入 `hw5xclone` 作為 UserID
3. 點擊登入按鈕
4. 系統會自動跳轉到 Google OAuth 登入頁面
5. 輸入上述 Google 帳號和密碼完成登入

### 測試資料

此帳號已預先設置完整的測試資料，包括：
- ✅ 多篇貼文（包含圖片、文字、hashtag、@mention）
- ✅ 按讚記錄
- ✅ 轉發記錄
- ✅ 留言和回覆
- ✅ 書籤
- ✅ 追蹤關係（following/followers）
- ✅ 通知（各種類型的通知）
- ✅ 個人資料（頭像、橫幅、簡介）

**注意：** 此帳號僅供測試使用，請勿修改密碼或刪除資料。

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
- **資料庫：** PostgreSQL (Vercel storage - primsa postgreSQL)
- **ORM：** Prisma
- **認證：** NextAuth.js (OAuth: Google, GitHub, Facebook)
- **即時通訊：** Pusher (支援 Mock 模式)
- **媒體儲存：** Cloudinary
- **部署：** Vercel


### 進階功能實現

#### 主選單導航

實現了完整的主選單導航系統：
- **桌面端：** 左側固定側邊欄，包含所有主要功能入口
- **移動端：** 底部導航欄，適配觸控操作
- **響應式切換：** 根據螢幕尺寸自動切換顯示方式
- **活動狀態指示：** 當前頁面高亮顯示
- **未讀通知計數：** 在導航中顯示未讀通知數量

#### Explore 探索頁面

完整的探索功能實現：
- **分類標籤：** For You、Trending、News、Sports、Entertainment
- **搜尋功能：** 支援 Top、Latest、People、Media 四種搜尋類型
- **趨勢話題：** 顯示當前熱門話題和 Hashtag
- **今日新聞：** 整合新聞內容展示
- **Hashtag 排名：** 顯示熱門 Hashtag 列表

#### Notification 通知中心

完整的通知系統：
- **通知分類：** All、Verified、Mentions 三種篩選
- **通知類型：** 支援按讚、轉發、留言、回覆等所有類型
- **未讀計數：** 在側邊欄和移動端導航中實時顯示
- **標記已讀：** 支援單個和批量標記已讀
- **即時更新：** 使用 Pusher 實現即時通知推送

#### Hashtag 完整支援

參考 X (Twitter) 的 Hashtag 功能：
- **自動識別：** 自動識別貼文中的 `#hashtag`
- **可點擊連結：** 點擊 Hashtag 進入該標籤的貼文列表
- **趨勢排名：** 顯示熱門 Hashtag 排名
- **貼文篩選：** 按 Hashtag 篩選相關貼文
- **排序功能：** 從最新到最舊排序

#### Bookmark 書籤功能

參考 X (Twitter) 的書籤功能：
- **私有書籤：** 書籤僅對自己可見
- **書籤列表：** 專屬的書籤頁面
- **快速存取：** 在側邊欄和移動端導航中快速存取
- **書籤管理：** 支援添加和移除書籤

#### 手機版顯示

完整的響應式設計：
- **移動端優化：** 所有頁面都針對移動端進行優化
- **觸控友好：** 按鈕和互動元素適配觸控操作
- **底部導航：** 移動端使用底部導航欄，方便單手操作
- **側邊欄隱藏：** 移動端自動隱藏側邊欄，節省螢幕空間
- **適配不同螢幕：** 支援各種手機和平板尺寸

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

## 🗄️ 資料庫設計

### 核心模型

#### User（用戶）
- **主鍵：** `id` (String, cuid)
- **欄位：**
  - `name` (String?) - 用戶名稱
  - `email` (String?, unique) - 電子郵件
  - `emailVerified` (DateTime?) - 郵件驗證時間
  - `image` (String?) - 頭像 URL
  - `userId` (String?, unique) - 公開用戶 ID（如 @username）
  - `verified` (Boolean, default: false) - 是否為已驗證用戶
  - `createdAt` (DateTime) - 創建時間
  - `updatedAt` (DateTime) - 更新時間
- **關聯：**
  - `accounts` - OAuth 帳號
  - `sessions` - 登入 session
  - `profile` - 個人資料（一對一）
  - `posts` - 發表的貼文
  - `comments` - 發表的留言
  - `likes` - 按讚的貼文
  - `reposts` - 轉發的貼文
  - `commentLikes` - 按讚的留言
  - `commentReposts` - 轉發的留言
  - `bookmarks` - 書籤
  - `drafts` - 草稿
  - `following` - 追蹤的用戶
  - `followers` - 粉絲
  - `notifications` - 收到的通知
  - `actorNotifications` - 作為操作者的通知

#### Profile（個人資料）
- **主鍵：** `id` (String, cuid)
- **外鍵：** `userId` (String, unique) → User.id
- **欄位：**
  - `displayName` (String?) - 顯示名稱
  - `bio` (String?, VarChar(280)) - 個人簡介（最多 280 字元）
  - `avatarUrl` (String?) - 頭像 URL（Cloudinary）
  - `bannerUrl` (String?) - 橫幅圖片 URL（Cloudinary）

#### Post（貼文）
- **主鍵：** `id` (String, cuid)
- **外鍵：** `authorId` (String) → User.id
- **欄位：**
  - `content` (String, VarChar(2000)) - 貼文內容（最多 2000 字元）
  - `createdAt` (DateTime) - 創建時間
  - `updatedAt` (DateTime) - 更新時間
  - `deletedAt` (DateTime?) - 軟刪除時間
- **索引：** `createdAt`（用於排序和分頁）
- **關聯：**
  - `author` - 作者
  - `media` - 多媒體（圖片/影片）
  - `likes` - 按讚記錄
  - `reposts` - 轉發記錄
  - `comments` - 留言
  - `bookmarks` - 書籤記錄
  - `notifications` - 相關通知

#### PostMedia（貼文多媒體）
- **主鍵：** `id` (String, cuid)
- **外鍵：** `postId` (String) → Post.id
- **欄位：**
  - `url` (String) - 媒體 URL（Cloudinary）
  - `publicId` (String) - Cloudinary public ID
  - `type` (PostMediaType, default: IMAGE) - 媒體類型（IMAGE/VIDEO）
  - `width` (Int?) - 寬度
  - `height` (Int?) - 高度
  - `duration` (Float?) - 影片時長（秒）
  - `createdAt` (DateTime) - 創建時間
- **索引：** `postId`（用於查詢貼文的所有媒體）

#### Comment（留言）
- **主鍵：** `id` (String, cuid)
- **外鍵：**
  - `postId` (String) → Post.id
  - `authorId` (String) → User.id
  - `parentId` (String?) → Comment.id（用於回覆）
- **欄位：**
  - `content` (String, VarChar(2000)) - 留言內容（最多 2000 字元）
  - `createdAt` (DateTime) - 創建時間
  - `updatedAt` (DateTime) - 更新時間
- **索引：** `[postId, createdAt]`（用於查詢貼文的所有留言並排序）
- **關聯：**
  - `post` - 所屬貼文
  - `author` - 作者
  - `parent` - 父留言（如果是回覆）
  - `replies` - 子留言（回覆）
  - `likes` - 按讚記錄
  - `reposts` - 轉發記錄
  - `notifications` - 相關通知

### 互動模型

#### Like（按讚）
- **複合主鍵：** `[userId, postId]`
- **外鍵：**
  - `userId` (String) → User.id
  - `postId` (String) → Post.id
- **欄位：**
  - `createdAt` (DateTime) - 按讚時間

#### Repost（轉發）
- **主鍵：** `id` (String, cuid)
- **外鍵：**
  - `userId` (String) → User.id
  - `postId` (String) → Post.id
- **唯一約束：** `[userId, postId]`（防止重複轉發）
- **欄位：**
  - `createdAt` (DateTime) - 轉發時間

#### CommentLike（留言按讚）
- **複合主鍵：** `[userId, commentId]`
- **外鍵：**
  - `userId` (String) → User.id
  - `commentId` (String) → Comment.id
- **欄位：**
  - `createdAt` (DateTime) - 按讚時間

#### CommentRepost（留言轉發）
- **主鍵：** `id` (String, cuid)
- **外鍵：**
  - `userId` (String) → User.id
  - `commentId` (String) → Comment.id
- **唯一約束：** `[userId, commentId]`（防止重複轉發）
- **欄位：**
  - `createdAt` (DateTime) - 轉發時間

#### Bookmark（書籤）
- **複合主鍵：** `[userId, postId]`
- **外鍵：**
  - `userId` (String) → User.id
  - `postId` (String) → Post.id
- **索引：** `[userId, createdAt]`（用於查詢用戶的書籤並排序）
- **欄位：**
  - `createdAt` (DateTime) - 加入書籤時間

#### Follow（追蹤）
- **主鍵：** `id` (String, cuid)
- **外鍵：**
  - `followerId` (String) → User.id（追蹤者）
  - `followingId` (String) → User.id（被追蹤者）
- **唯一約束：** `[followerId, followingId]`（防止重複追蹤）
- **欄位：**
  - `createdAt` (DateTime) - 追蹤時間

### 其他模型

#### Account（OAuth 帳號）
- **主鍵：** `id` (String, cuid)
- **外鍵：** `userId` (String) → User.id
- **欄位：**
  - `type` (String) - 帳號類型
  - `provider` (String) - OAuth 提供商（google/github/facebook）
  - `providerAccountId` (String) - 提供商帳號 ID
  - `refresh_token` (String?) - 刷新 token
  - `access_token` (String?) - 訪問 token
  - `expires_at` (Int?) - 過期時間
  - `token_type` (String?) - Token 類型
  - `scope` (String?) - 授權範圍
  - `id_token` (String?) - ID token
  - `session_state` (String?) - Session 狀態
- **唯一約束：** `[provider, providerAccountId]`（同一提供商只能有一個帳號）

#### Session（登入 Session）
- **主鍵：** `id` (String, cuid)
- **外鍵：** `userId` (String) → User.id
- **欄位：**
  - `sessionToken` (String, unique) - Session token
  - `expires` (DateTime) - 過期時間

#### VerificationToken（驗證 Token）
- **欄位：**
  - `identifier` (String) - 識別符
  - `token` (String, unique) - 驗證 token
  - `expires` (DateTime) - 過期時間
- **唯一約束：** `[identifier, token]`

#### Draft（草稿）
- **主鍵：** `id` (String, cuid)
- **外鍵：** `authorId` (String) → User.id
- **欄位：**
  - `content` (String, VarChar(2000)) - 草稿內容（最多 2000 字元）
  - `createdAt` (DateTime) - 創建時間
  - `updatedAt` (DateTime) - 更新時間

#### Notification（通知）
- **主鍵：** `id` (String, cuid)
- **外鍵：**
  - `userId` (String) → User.id（接收通知的用戶）
  - `actorId` (String) → User.id（執行操作的用戶）
  - `postId` (String?) → Post.id（相關貼文）
  - `commentId` (String?) → Comment.id（相關留言）
- **欄位：**
  - `type` (NotificationType) - 通知類型
  - `read` (Boolean, default: false) - 是否已讀
  - `createdAt` (DateTime) - 創建時間
- **索引：**
  - `[userId, read, createdAt]`（用於查詢用戶的未讀通知並排序）
  - `[userId, createdAt]`（用於查詢用戶的所有通知並排序）

### 枚舉類型

#### PostMediaType
- `IMAGE` - 圖片
- `VIDEO` - 影片

#### NotificationType
- `POST_LIKE` - 貼文被按讚
- `POST_REPOST` - 貼文被轉發
- `POST_COMMENT` - 貼文被留言
- `COMMENT_LIKE` - 留言被按讚
- `COMMENT_REPOST` - 留言被轉發
- `COMMENT_REPLY` - 留言被回覆

### 資料庫設計特點

1. **軟刪除：** Post 使用 `deletedAt` 實現軟刪除，保留資料但隱藏內容
2. **級聯刪除：** 所有關聯都設置了 `onDelete: Cascade`，確保資料一致性
3. **索引優化：** 針對常用查詢場景建立了索引（如 `createdAt`、`[postId, createdAt]`）
4. **唯一約束：** 防止重複操作（如重複按讚、重複轉發、重複追蹤）
5. **複合主鍵：** Like、Bookmark 等使用複合主鍵，簡化查詢邏輯
6. **字元限制：** Post 和 Comment 內容限制為 2000 字元，Profile.bio 限制為 280 字元

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


## 📚 相關文檔

- [Cloudinary 設置指南](docs/cloudinary-setup.md)
- [Prisma Schema](prisma/schema.prisma)
