import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// JWT 介面
interface JWTPayload {
  userId: string
  username: string
  email: string
}

// 設定 Cookie 的輔助函數
const setAuthCookie = (res: Response, payload: JWTPayload) => {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    throw new Error('JWT_SECRET 未設定')
  }

  const token = jwt.sign(payload, jwtSecret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  })

  const isSecure = process.env.NODE_ENV === 'production'
  const sameSite = process.env.COOKIE_SAME_SITE as 'lax' | 'strict' | 'none' || 'lax'

  res.cookie('sid', token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: sameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
    path: '/'
  })
}

// 清除 Cookie 的輔助函數
const clearAuthCookie = (res: Response) => {
  res.clearCookie('sid', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.COOKIE_SAME_SITE as 'lax' | 'strict' | 'none' || 'lax',
    path: '/'
  })
}

// 註冊
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, nickname } = req.body

    // 驗證必填欄位
    if (!username || !email || !password) {
      return res.status(400).json({
        error: {
          code: 'AUTH_MISSING_FIELDS',
          message: '缺少必填欄位'
        }
      })
    }

    // 驗證 email 格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(422).json({
        error: {
          code: 'AUTH_INVALID_EMAIL',
          message: '無效的 email 格式'
        }
      })
    }

    // 驗證密碼長度
    if (password.length < 6) {
      return res.status(422).json({
        error: {
          code: 'AUTH_PASSWORD_TOO_SHORT',
          message: '密碼至少需要 6 個字元'
        }
      })
    }

    // 檢查 email 是否已存在
    const existingEmail = await prisma.user.findUnique({
      where: { email }
    })

    if (existingEmail) {
      return res.status(409).json({
        error: {
          code: 'AUTH_DUPLICATE_EMAIL',
          message: '此 email 已被使用'
        }
      })
    }

    // 檢查 username 是否已存在
    const existingUsername = await prisma.user.findUnique({
      where: { username }
    })

    if (existingUsername) {
      return res.status(409).json({
        error: {
          code: 'AUTH_DUPLICATE_USERNAME',
          message: '此使用者名稱已被使用'
        }
      })
    }

    // 加密密碼
    const saltRounds = 12
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // 建立使用者
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        nickname: nickname || null
      },
      select: {
        id: true,
        username: true,
        email: true,
        nickname: true,
        avatarId: true
      }
    })

    // 設定 JWT Cookie
    const payload: JWTPayload = {
      userId: user.id,
      username: user.username,
      email: user.email
    }
    setAuthCookie(res, payload)

    res.status(201).json({
      id: user.id,
      username: user.username,
      email: user.email,
      nickname: user.nickname
    })
  } catch (error) {
    console.error('註冊錯誤:', error)
    res.status(500).json({
      error: {
        code: 'AUTH_REGISTER_ERROR',
        message: '註冊失敗'
      }
    })
  }
})

// 登入
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { emailOrUsername, password } = req.body

    // 驗證必填欄位
    if (!emailOrUsername || !password) {
      return res.status(400).json({
        error: {
          code: 'AUTH_MISSING_FIELDS',
          message: '缺少必填欄位'
        }
      })
    }

    // 查找使用者（支援 email 或 username 登入）
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername },
          { username: emailOrUsername }
        ]
      }
    })

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'AUTH_INVALID_CREDENTIALS',
          message: '無效的登入憑證'
        }
      })
    }

    // 驗證密碼
    const isValidPassword = await bcrypt.compare(password, user.passwordHash)
    if (!isValidPassword) {
      return res.status(401).json({
        error: {
          code: 'AUTH_INVALID_CREDENTIALS',
          message: '無效的登入憑證'
        }
      })
    }

    // 設定 JWT Cookie
    const payload: JWTPayload = {
      userId: user.id,
      username: user.username,
      email: user.email
    }
    setAuthCookie(res, payload)

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      nickname: user.nickname
    })
  } catch (error) {
    console.error('登入錯誤:', error)
    res.status(500).json({
      error: {
        code: 'AUTH_LOGIN_ERROR',
        message: '登入失敗'
      }
    })
  }
})

// 登出
router.post('/logout', (req: Request, res: Response) => {
  try {
    clearAuthCookie(res)
    res.json({ ok: true })
  } catch (error) {
    console.error('登出錯誤:', error)
    res.status(500).json({
      error: {
        code: 'AUTH_LOGOUT_ERROR',
        message: '登出失敗'
      }
    })
  }
})

// 取得當前使用者
router.get('/me', async (req: Request, res: Response) => {
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

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      nickname: user.nickname,
      avatarId: user.avatarId
    })
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: {
          code: 'AUTH_INVALID_TOKEN',
          message: '無效的認證令牌'
        }
      })
    }

    console.error('取得使用者資訊錯誤:', error)
    res.status(500).json({
      error: {
        code: 'AUTH_ME_ERROR',
        message: '取得使用者資訊失敗'
      }
    })
  }
})

export default router
