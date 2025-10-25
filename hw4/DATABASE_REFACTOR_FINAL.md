# 資料庫重構完成 - BLOB 媒體儲存 + 正規化結構

## 🎉 **重構完成！**

根據您的要求，我已經成功完成了資料庫與相關程式碼的重構：

### ✅ **完成項目**

#### 1. **通用媒體表 `Media`（BLOB 儲存）**
- ✅ 使用 `Bytes`（SQLite BLOB）存放照片本體
- ✅ 支援 SHA256 去重機制
- ✅ 包含檔案大小、MIME 類型、尺寸等元資料
- ✅ 支援上傳者追蹤

#### 2. **正規化關聯設計**
- ✅ **使用者頭像**：指向 `Media` 表
- ✅ **商店主圖**：`Store.mainPhoto` 指向 `Media`
- ✅ **商店相簿**：`StorePhoto` 表指向 `Media`
- ✅ **造訪紀錄照片**：`VisitPhoto` 表指向 `Media`

#### 3. **收藏關聯表 `Favorite`（N-M）**
- ✅ 取代原本的 JSON 陣列儲存
- ✅ 支援複雜查詢和統計
- ✅ 避免同步問題

#### 4. **標籤正規化**
- ✅ `Tag` 表：統一標籤管理
- ✅ `StoreTagLink` 表：商店-標籤關聯
- ✅ 避免重複標籤

#### 5. **造訪紀錄重構**
- ✅ `Visit` 表：日期/評分/心得
- ✅ `VisitPhoto` 表：多張照片支援
- ✅ 照片與造訪紀錄分離

#### 6. **商店照片分離**
- ✅ `Store.mainPhoto`：主圖
- ✅ `StorePhoto`：相簿多張照片
- ✅ 支援照片排序和說明

#### 7. **計算欄位設計**
- ✅ `avgRating`、`visitCount` 不落庫
- ✅ API 使用聚合查詢回傳
- ✅ 確保資料一致性

### 🗄️ **資料庫結構**

```sql
-- 媒體檔案表（BLOB 儲存）
Media {
  id: String (UUID)
  kind: String ("IMAGE")
  mime: String
  bytes: Bytes (BLOB)
  sizeBytes: Int
  width: Int?
  height: Int?
  sha256: String? (unique)
  createdById: String?
  createdAt: DateTime
}

-- 使用者表（頭像指向 Media）
User {
  id: String (UUID)
  username: String (unique)
  email: String (unique)
  nickname: String?
  status: String?
  passwordHash: String
  avatar: Media? (關聯)
  avatarId: String?
  createdAt: DateTime
  updatedAt: DateTime
}

-- 商店表（主圖指向 Media）
Store {
  id: String (UUID)
  name: String
  address: String?
  lat: Float
  lng: Float
  mainPhoto: Media? (關聯)
  mainPhotoId: String?
  googleMapUrl: String?
  instagramUrl: String?
  openingHours: String?
  isOpenNow: Boolean?
  googlePlaceId: String?
  createdAt: DateTime
  updatedAt: DateTime
}

-- 商店照片表
StorePhoto {
  id: String (UUID)
  storeId: String
  mediaId: String
  caption: String?
  order: Int
  createdAt: DateTime
}

-- 標籤表
Tag {
  id: Int (auto-increment)
  name: String (unique)
}

-- 商店標籤關聯表
StoreTagLink {
  storeId: String
  tagId: Int
  @@id([storeId, tagId])
}

-- 收藏關聯表
Favorite {
  userId: String
  storeId: String
  createdAt: DateTime
  @@id([userId, storeId])
}

-- 造訪紀錄表
Visit {
  id: String (UUID)
  userId: String
  storeId: String
  date: DateTime
  rating: Int
  note: String?
  createdAt: DateTime
  updatedAt: DateTime
}

-- 造訪照片表
VisitPhoto {
  id: String (UUID)
  visitId: String
  mediaId: String
  caption: String?
  order: Int
  createdAt: DateTime
}

-- 評論表
Review {
  id: String (UUID)
  userId: String
  storeId: String
  date: DateTime
  rating: Int
  content: String
  createdAt: DateTime
  updatedAt: DateTime
}
```

### 🚀 **後端 API**

#### 1. **媒體管理 API**
```typescript
POST /api/media/upload     // 上傳照片到 BLOB
GET  /api/media/:id        // 取得照片 BLOB
```

#### 2. **資料管理 API**
```typescript
GET  /api/stores           // 取得商店列表（含聚合統計）
POST /api/stores           // 新增商店
GET  /api/users            // 取得使用者列表
POST /api/users            // 註冊使用者
GET  /api/visits           // 取得造訪紀錄
POST /api/visits           // 新增造訪紀錄
GET  /api/favorites        // 取得收藏列表
POST /api/favorites        // 新增收藏
DELETE /api/favorites/:id  // 移除收藏
```

#### 3. **健康檢查 API**
```typescript
GET /api/health            // 服務健康檢查
GET /api                   // API 資訊
```

### 🔧 **技術特色**

#### 1. **BLOB 儲存優勢**
- **一致性管理**：所有照片統一儲存在 `Media` 表
- **去重機制**：SHA256 雜湊避免重複儲存
- **完整性**：照片與資料庫一起備份
- **安全性**：不依賴外部檔案系統

#### 2. **正規化結構優勢**
- **收藏關聯表**：避免同步問題，支援複雜查詢
- **標籤正規化**：統一標籤管理，避免重複
- **照片分離**：主圖與相簿分離，支援多張照片
- **造訪分離**：造訪紀錄與照片分離，支援多張照片

#### 3. **計算欄位優勢**
- **即時統計**：`avgRating`、`visitCount` 即時計算
- **資料一致性**：避免寫入/修改時不同步
- **靈活性**：可根據不同條件計算統計

### 📊 **種子資料**

已建立測試資料：
- ✅ **5 個標籤**：文創、咖啡、手作、選物、設計
- ✅ **1 個測試使用者**：test@example.com
- ✅ **3 個測試商店**：赤峰街選物店、台南文創咖啡、高雄手作工坊
- ✅ **1 個造訪紀錄**：測試使用者造訪赤峰街選物店

### 🎯 **驗收完成**

✅ **BLOB 媒體儲存**：照片本體存資料庫，統一管理
✅ **正規化結構**：收藏、標籤、照片都正規化
✅ **關聯設計**：N-M 關聯表避免同步問題
✅ **計算欄位**：評分和造訪次數即時計算
✅ **API 支援**：完整的 CRUD 和媒體上傳 API
✅ **類型安全**：TypeScript 類型定義完整
✅ **種子資料**：測試資料已建立
✅ **健康檢查**：後端服務正常運行

### 🚀 **啟動方式**

```bash
# 後端服務
cd backend
npm run dev

# 健康檢查
http://localhost:3001/api/health

# 前端服務
npm run dev

# 健康檢查頁面
http://localhost:5173/health
```

現在資料庫結構更加正規化，支援 BLOB 媒體儲存，並且所有關聯都正規化處理！前端可以通過健康檢查頁面看到綠燈提示，表示後端服務正常運行。
