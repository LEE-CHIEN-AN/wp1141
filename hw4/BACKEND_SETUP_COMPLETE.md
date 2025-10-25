# 後端骨架 + 健康檢查功能完成

## 🎯 **功能需求**

建立後端骨架 + 健康檢查功能：
- **架構**：Node + Express + TypeScript
- **資料庫**：SQLite（Prisma）
- **驗收**：前端能打到 `/api/health` 顯示綠燈提示

## ✅ **實作方案**

### 🔧 **後端架構**

#### 1. **技術棧**
- **Node.js** + **Express.js** + **TypeScript**
- **SQLite** 資料庫 + **Prisma** ORM
- **CORS** 支援前端跨域請求
- **Helmet** 安全性標頭
- **Morgan** 請求日誌

#### 2. **專案結構**
```
backend/
├── src/
│   └── index.ts          # 主應用程式入口
├── prisma/
│   └── schema.prisma     # 資料庫 schema
├── package.json          # 依賴套件
├── tsconfig.json         # TypeScript 設定
├── env.example          # 環境變數範例
├── setup.bat            # Windows 安裝腳本
├── setup.sh             # Linux/Mac 安裝腳本
└── README.md            # 說明文件
```

#### 3. **資料庫 Schema**
```prisma
model User {
  id            String         @id @default(cuid())
  name          String
  email         String         @unique
  nickname      String?
  avatar        String?
  status        String?
  passwordHash  String
  favorites     String[]       @default([])
  visitRecords  VisitRecord[]
  userReviews   UserReview[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model Store {
  id            String         @id @default(cuid())
  name          String
  address       String
  coordinates   Json
  images        String[]       @default([])
  googleMapLink String?
  instagramLink String?
  tags          String[]       @default([])
  isOpen        Boolean        @default(true)
  businessHours Json?
  rating        Float          @default(0)
  visitCount    Int            @default(0)
  userReviews   UserReview[]
  visitRecords  VisitRecord[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model VisitRecord {
  id        String   @id @default(cuid())
  storeId   String
  userId    String
  date      String
  rating    Int
  review    String
  photos    String[] @default([])
  store     Store    @relation(fields: [storeId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model UserReview {
  id        String   @id @default(cuid())
  storeId   String
  userId    String
  userName  String
  userAvatar String?
  date      String
  rating    Int
  review    String
  photos    String[] @default([])
  store     Store    @relation(fields: [storeId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 🚀 **快速開始**

#### 1. **安裝後端**
```bash
# Windows
cd backend
setup.bat

# Linux/Mac
cd backend
chmod +x setup.sh
./setup.sh

# 手動安裝
cd backend
npm install
cp env.example .env
npm run db:generate
npm run db:push
```

#### 2. **啟動後端服務**
```bash
cd backend
npm run dev
```

#### 3. **檢查健康狀態**
- **後端 API**：http://localhost:3001/api/health
- **前端頁面**：http://localhost:5173/health

### 🎯 **健康檢查功能**

#### 1. **後端 API 端點**
```typescript
GET /api/health
```

**成功回應：**
```json
{
  "status": "success",
  "message": "服務正常運行",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "environment": "development",
  "database": "connected"
}
```

**錯誤回應：**
```json
{
  "status": "error",
  "message": "服務異常",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "error": "資料庫連線失敗"
}
```

#### 2. **前端健康檢查頁面**
- **路由**：`/health`
- **功能**：即時檢查後端服務狀態
- **UI**：綠燈/紅燈狀態指示
- **資訊**：顯示服務運行時間、環境、資料庫狀態

#### 3. **健康檢查元件**
```tsx
const HealthCheck: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    status: 'loading',
    message: '檢查中...'
  })

  const checkHealth = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/health')
      const data = await response.json()
      
      if (response.ok) {
        setHealthStatus({
          status: 'success',
          message: data.message,
          timestamp: data.timestamp,
          uptime: data.uptime,
          environment: data.environment,
          database: data.database
        })
      } else {
        setHealthStatus({
          status: 'error',
          message: data.message || '服務異常'
        })
      }
    } catch (error) {
      setHealthStatus({
        status: 'error',
        message: '無法連接到後端服務'
      })
    }
  }
}
```

### 🛠️ **技術實作**

#### 1. **Express 伺服器設定**
```typescript
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { PrismaClient } from '@prisma/client'

const app = express()
const prisma = new PrismaClient()

// 中介軟體設定
app.use(helmet())
app.use(morgan('combined'))
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
```

#### 2. **健康檢查路由**
```typescript
app.get('/api/health', async (req, res) => {
  try {
    // 檢查資料庫連線
    await prisma.$queryRaw`SELECT 1`
    
    res.status(200).json({
      status: 'success',
      message: '服務正常運行',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: 'connected'
    })
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: '服務異常',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : '未知錯誤'
    })
  }
})
```

#### 3. **CORS 設定**
```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))
```

### 🔧 **開發指令**

```bash
# 開發模式（熱重載）
npm run dev

# 編譯 TypeScript
npm run build

# 生產模式
npm run start

# Prisma 相關
npm run db:generate  # 生成 Prisma 客戶端
npm run db:push      # 推送 schema 到資料庫
npm run db:migrate   # 執行資料庫遷移
npm run db:studio    # 開啟 Prisma Studio
```

### 🌐 **API 端點**

- **GET** `/api` - API 資訊
- **GET** `/api/health` - 健康檢查
- **GET** `/api/stores` - 店家列表（未來）
- **GET** `/api/users` - 使用者管理（未來）
- **GET** `/api/visit-records` - 造訪紀錄（未來）

### 🔒 **安全性設定**

- **Helmet**：設定安全性標頭
- **CORS**：限制跨域請求來源
- **請求大小限制**：防止過大請求
- **錯誤處理**：避免敏感資訊洩露

### 🎉 **驗收完成**

✅ **後端骨架建立**：Node + Express + TypeScript
✅ **資料庫設定**：SQLite + Prisma
✅ **健康檢查 API**：`/api/health` 端點
✅ **前端整合**：健康檢查頁面 `/health`
✅ **綠燈提示**：成功時顯示綠色狀態
✅ **錯誤處理**：失敗時顯示紅色狀態
✅ **即時檢查**：可重新檢查服務狀態
✅ **詳細資訊**：顯示運行時間、環境、資料庫狀態

現在您可以：
1. 啟動後端服務：`cd backend && npm run dev`
2. 訪問健康檢查頁面：http://localhost:5173/health
3. 看到綠燈提示表示後端服務正常運行！
