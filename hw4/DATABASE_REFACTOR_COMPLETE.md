# 資料庫重構完成 - BLOB 媒體儲存 + 正規化結構

## 🎯 **重構目標**

根據要求修改資料庫與相關程式碼：
- ✅ **通用媒體表 `Media`**：用 `Bytes`（SQLite BLOB）存放照片本體
- ✅ **使用者頭像、商店主圖/相簿、造訪紀錄照片**：全部指向 `Media`
- ✅ **收藏改成關聯表 `Favorite`**（N–M）
- ✅ **標籤改成 `Tag` + `StoreTagLink`**
- ✅ **造訪紀錄 `Visit`（日期/心得） + `VisitPhoto`（多張）**
- ✅ **商店主圖 `Store.mainPhoto` + `StorePhoto`（相簿）**
- ✅ **`avgRating`、`visitCount` 不落庫**，API 用聚合查詢回傳

## ✅ **實作內容**

### 🗄️ **新的資料庫結構**

#### 1. **Media 表（BLOB 儲存）**
```prisma
model Media {
  id          String   @id @default(uuid())
  kind        MediaKind   @default(IMAGE)
  mime        String                  // image/jpeg, image/png...
  bytes       Bytes                   // 照片實體（BLOB）
  sizeBytes   Int                     // 檔案大小
  width       Int?                    // 像素寬
  height      Int?                    // 像素高
  sha256      String?   @unique       // 去重雜湊
  createdById String?                 // 上傳者
  createdAt   DateTime  @default(now())
}
```

#### 2. **正規化的使用者表**
```prisma
model User {
  id           String   @id @default(uuid())
  username     String   @unique
  email        String   @unique
  nickname     String?
  status       String?
  passwordHash String
  avatar       Media?   @relation("UserAvatarMedia")
  avatarId     String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  visits       Visit[]
  reviews      Review[]
  favorites    Favorite[]          // N–M 關聯
}
```

#### 3. **重構的商店表**
```prisma
model Store {
  id            String    @id @default(uuid())
  name          String
  address       String?
  lat           Float     // 分離座標
  lng           Float
  mainPhoto     Media?    @relation("StoreMainPhoto")
  mainPhotoId   String?
  
  googleMapUrl  String?
  instagramUrl  String?
  openingHours  String?
  isOpenNow     Boolean?
  googlePlaceId String?
  
  photos   StorePhoto[]    // 相簿
  tags     StoreTagLink[]  // 標籤關聯
  visits   Visit[]
  reviews  Review[]
  fans     Favorite[]      // 收藏者
}
```

#### 4. **標籤正規化**
```prisma
model Tag {
  id    Int     @id @default(autoincrement())
  name  String  @unique
  links StoreTagLink[]
}

model StoreTagLink {
  store   Store @relation(fields: [storeId], references: [id])
  storeId String
  tag     Tag   @relation(fields: [tagId], references: [id])
  tagId   Int
  
  @@id([storeId, tagId])
}
```

#### 5. **收藏關聯表**
```prisma
model Favorite {
  user     User  @relation(fields: [userId], references: [id])
  userId   String
  store    Store @relation(fields: [storeId], references: [id])
  storeId  String
  createdAt DateTime @default(now())
  
  @@id([userId, storeId])
}
```

#### 6. **造訪紀錄 + 照片分離**
```prisma
model Visit {
  id        String   @id @default(uuid())
  userId    String
  storeId   String
  date      DateTime
  rating    Int
  note      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  photos VisitPhoto[]
}

model VisitPhoto {
  id        String   @id @default(uuid())
  visitId   String
  media     Media    @relation(fields: [mediaId], references: [id])
  mediaId   String
  caption   String?
  order     Int      @default(0)
  createdAt DateTime @default(now())
}
```

### 🚀 **後端 API 更新**

#### 1. **媒體上傳 API**
```typescript
// POST /api/media/upload
app.post('/api/media/upload', upload.single('image'), async (req, res) => {
  // 計算 SHA256 去重
  const sha256 = crypto.createHash('sha256').update(req.file.buffer).digest('hex')
  
  // 檢查重複檔案
  const existingMedia = await prisma.media.findUnique({ where: { sha256 } })
  
  // 儲存到 BLOB
  const media = await prisma.media.create({
    data: {
      kind: 'IMAGE',
      mime: req.file.mimetype,
      bytes: req.file.buffer,  // BLOB 儲存
      sizeBytes: req.file.size,
      sha256
    }
  })
})
```

#### 2. **媒體取得 API**
```typescript
// GET /api/media/:id
app.get('/api/media/:id', async (req, res) => {
  const media = await prisma.media.findUnique({ where: { id: req.params.id } })
  
  res.set({
    'Content-Type': media.mime,
    'Content-Length': media.sizeBytes.toString(),
    'Cache-Control': 'public, max-age=31536000'
  })
  
  res.send(media.bytes)  // 直接回傳 BLOB
})
```

### 🔧 **前端類型更新**

#### 1. **新的類型定義**
```typescript
// 媒體檔案
export interface Media {
  id: string
  kind: 'IMAGE'
  mime: string
  sizeBytes: number
  width?: number
  height?: number
  sha256?: string
  createdAt: string
}

// 使用者（頭像指向 Media）
export interface User {
  id: string
  username: string
  email: string
  nickname?: string
  status?: string
  avatar?: Media      // 指向 Media 而非字串
  avatarId?: string
}

// 商店（主圖 + 相簿分離）
export interface Store {
  id: string
  name: string
  lat: number
  lng: number
  mainPhoto?: Media    // 主圖
  photos?: StorePhoto[]  // 相簿
  tags?: Tag[]        // 標籤陣列
  visits?: Visit[]    // 造訪紀錄
  fans?: Favorite[]   // 收藏者
  
  // 計算欄位（不存資料庫）
  avgRating?: number
  visitCount?: number
  isFavorite?: boolean
}
```

### 🛠️ **技術優勢**

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

### 📊 **API 端點**

```typescript
// 媒體管理
POST /api/media/upload     // 上傳照片
GET  /api/media/:id        // 取得照片

// 商店管理
GET  /api/stores           // 取得商店列表（含聚合統計）
POST /api/stores           // 新增商店
PUT  /api/stores/:id       // 更新商店

// 使用者管理
GET  /api/users            // 取得使用者列表
POST /api/users            // 註冊使用者
PUT  /api/users/:id        // 更新使用者

// 造訪紀錄
GET  /api/visits           // 取得造訪紀錄
POST /api/visits           // 新增造訪紀錄
PUT  /api/visits/:id       // 更新造訪紀錄

// 收藏管理
GET  /api/favorites        // 取得收藏列表
POST /api/favorites        // 新增收藏
DELETE /api/favorites/:id  // 移除收藏
```

### 🎉 **重構完成**

✅ **BLOB 媒體儲存**：照片本體存資料庫，統一管理
✅ **正規化結構**：收藏、標籤、照片都正規化
✅ **關聯設計**：N-M 關聯表避免同步問題
✅ **計算欄位**：評分和造訪次數即時計算
✅ **API 支援**：完整的 CRUD 和媒體上傳 API
✅ **類型安全**：TypeScript 類型定義完整

現在資料庫結構更加正規化，支援 BLOB 媒體儲存，並且所有關聯都正規化處理！
