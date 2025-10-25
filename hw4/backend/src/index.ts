import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import { PrismaClient } from '@prisma/client'
import multer from 'multer'
import crypto from 'crypto'
import authRoutes from './routes/auth'
import mediaRoutes from './routes/media'
import storesRoutes from './routes/stores'
import favoritesRoutes from './routes/favorites'
import visitsRoutes from './routes/visits'
import storeEditsRoutes from './routes/storeEdits'
import tagsRoutes from './routes/tags'

// 載入環境變數
dotenv.config()

// 建立 Prisma 客戶端
const prisma = new PrismaClient()

// 建立 Express 應用程式
const app = express()
const PORT = process.env.PORT || 3001

// 設定 multer 用於檔案上傳
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('只允許上傳圖片檔案'))
    }
  }
})

// 中介軟體設定
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "http://localhost:3001", "http://127.0.0.1:3001"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'", "http://localhost:3001", "http://127.0.0.1:3001"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
})) // 安全性標頭
app.use(morgan('combined')) // 請求日誌
app.use(cookieParser()) // Cookie 解析
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
})) // CORS 設定
app.use(express.json({ limit: '10mb' })) // JSON 解析
app.use(express.urlencoded({ extended: true })) // URL 編碼解析

// 健康檢查路由
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
    console.error('健康檢查失敗:', error)
    res.status(503).json({
      status: 'error',
      message: '服務異常',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : '未知錯誤'
    })
  }
})

// 認證路由
app.use('/api/auth', authRoutes)

// 媒體路由
app.use('/api/media', mediaRoutes)

// 商店路由
app.use('/api/stores', storesRoutes)

// 收藏路由
app.use('/api/stores', favoritesRoutes)

// 造訪路由
app.use('/api/stores', visitsRoutes)
app.use('/api', visitsRoutes)

// 店家編輯路由
app.use('/api/stores', storeEditsRoutes)

// 標籤路由
app.use('/api/tags', tagsRoutes)

// API 路由
app.get('/api', (req, res) => {
  res.json({
    message: '台灣選物店地圖清單 API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: {
        register: '/api/auth/register',
        login: '/api/auth/login',
        logout: '/api/auth/logout',
        me: '/api/auth/me'
      },
      media: {
        upload: '/api/media/upload',
        get: '/api/media/:id',
        info: '/api/media/:id/info',
        delete: '/api/media/:id'
      },
      stores: {
        list: '/api/stores',
        create: '/api/stores',
        detail: '/api/stores/:id',
        photos: '/api/stores/:id/photos',
        favorite: '/api/stores/:id/favorite',
        visits: '/api/stores/:id/visits'
      },
      favorites: '/api/stores/me/favorites'
    }
  })
})

// 404 處理
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: '找不到請求的資源',
    path: req.originalUrl
  })
})

// 錯誤處理中介軟體
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('伺服器錯誤:', error)
  res.status(500).json({
    status: 'error',
    message: '內部伺服器錯誤',
    error: process.env.NODE_ENV === 'development' ? error.message : '請稍後再試'
  })
})

// 優雅關閉
process.on('SIGINT', async () => {
  console.log('正在關閉伺服器...')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('正在關閉伺服器...')
  await prisma.$disconnect()
  process.exit(0)
})

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`🚀 伺服器運行在 http://localhost:${PORT}`)
  console.log(`📊 健康檢查: http://localhost:${PORT}/api/health`)
  console.log(`🔐 認證 API: http://localhost:${PORT}/api/auth`)
  console.log(`🌍 環境: ${process.env.NODE_ENV || 'development'}`)
})

export default app