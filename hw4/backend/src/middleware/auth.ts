import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 擴展 Request 介面以包含使用者資訊
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        username: string
        email: string
        nickname?: string
        avatarId?: string
      }
    }
  }
}

// JWT 介面
interface JWTPayload {
  userId: string
  username: string
  email: string
  iat?: number
  exp?: number
}

// 認證中介軟體
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 從 cookie 中取得 JWT
    const token = req.cookies?.sid

    if (!token) {
      return res.status(401).json({
        error: {
          code: 'AUTH_NO_TOKEN',
          message: '未提供認證令牌'
        }
      })
    }

    // 驗證 JWT
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      throw new Error('JWT_SECRET 未設定')
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload

    // 從資料庫取得使用者資訊
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        nickname: true,
        avatarId: true
      }
    })

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'AUTH_USER_NOT_FOUND',
          message: '使用者不存在'
        }
      })
    }

    // 將使用者資訊附加到 request 物件
    req.user = user
    next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: {
          code: 'AUTH_INVALID_TOKEN',
          message: '無效的認證令牌'
        }
      })
    }

    console.error('認證中介軟體錯誤:', error)
    return res.status(500).json({
      error: {
        code: 'AUTH_INTERNAL_ERROR',
        message: '認證系統內部錯誤'
      }
    })
  }
}

// 可選的認證中介軟體（不強制要求登入）
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.sid

    if (!token) {
      req.user = undefined
      return next()
    }

    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      req.user = undefined
      return next()
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        nickname: true,
        avatarId: true
      }
    })

    req.user = user || undefined
    next()
  } catch (error) {
    req.user = undefined
    next()
  }
}
