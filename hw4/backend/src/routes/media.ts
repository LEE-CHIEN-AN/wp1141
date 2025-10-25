import { Router, Request, Response } from 'express'
import multer from 'multer'
import crypto from 'crypto'
import sharp from 'sharp'
import { PrismaClient } from '@prisma/client'
import { authenticateToken } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// 設定 multer 用於檔案上傳
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    console.log('File filter check:', {
      mimetype: file.mimetype,
      originalname: file.originalname,
      fieldname: file.fieldname
    })
    // 只允許 JPEG 和 PNG 圖片
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/jpg') {
      cb(null, true)
    } else {
      console.log('File type rejected:', file.mimetype)
      cb(new Error('只允許上傳 JPEG 或 PNG 圖片檔案'))
    }
  }
})

// 上傳媒體檔案
router.post('/upload', authenticateToken, (req: Request, res: Response, next: any) => {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      console.error('Multer error:', err)
      return res.status(400).json({
        error: {
          code: 'UPLOAD_ERROR',
          message: err.message || '檔案上傳失敗'
        }
      })
    }
    next()
  })
}, async (req: Request, res: Response) => {
  try {
    console.log('Media upload request:', {
      hasFile: !!req.file,
      fileField: req.file?.fieldname,
      fileName: req.file?.originalname,
      fileSize: req.file?.size,
      fileMimetype: req.file?.mimetype,
      bodyKeys: Object.keys(req.body),
      headers: req.headers
    })

    if (!req.file) {
      return res.status(400).json({
        error: {
          code: 'MEDIA_NO_FILE',
          message: '沒有上傳檔案'
        }
      })
    }

    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: '需要登入才能上傳檔案'
        }
      })
    }

    // 計算 SHA256 雜湊值
    const sha256 = crypto.createHash('sha256').update(req.file.buffer).digest('hex')

    // 檢查是否已存在相同檔案
    const existingMedia = await prisma.media.findUnique({
      where: { sha256 }
    })

    if (existingMedia) {
      return res.json({
        id: existingMedia.id,
        mime: existingMedia.mime,
        sizeBytes: existingMedia.sizeBytes,
        width: existingMedia.width,
        height: existingMedia.height,
        sha256: existingMedia.sha256
      })
    }

    // 使用 Sharp 取得圖片資訊
    let imageInfo
    try {
      imageInfo = await sharp(req.file.buffer).metadata()
    } catch (error) {
      return res.status(400).json({
        error: {
          code: 'MEDIA_INVALID_IMAGE',
          message: '無效的圖片檔案'
        }
      })
    }

    // 建立新的媒體記錄
    const media = await prisma.media.create({
      data: {
        kind: 'IMAGE',
        mime: req.file.mimetype,
        bytes: req.file.buffer,
        sizeBytes: req.file.size,
        width: imageInfo.width || null,
        height: imageInfo.height || null,
        sha256,
        createdById: req.user.id
      }
    })

    res.json({
      id: media.id,
      mime: media.mime,
      sizeBytes: media.sizeBytes,
      width: media.width,
      height: media.height,
      sha256: media.sha256
    })
  } catch (error) {
    console.error('媒體上傳失敗:', error)
    
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: {
            code: 'PAYLOAD_TOO_LARGE',
            message: '檔案大小超過 5MB 限制'
          }
        })
      }
    }

    res.status(500).json({
      error: {
        code: 'MEDIA_UPLOAD_ERROR',
        message: '媒體上傳失敗'
      }
    })
  }
})

// 取得媒體檔案
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // 驗證 UUID 格式（更寬鬆的驗證）
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: {
          code: 'MEDIA_INVALID_ID',
          message: '無效的媒體 ID 格式'
        }
      })
    }

    const media = await prisma.media.findUnique({
      where: { id }
    })

    if (!media) {
      return res.status(404).json({
        error: {
          code: 'MEDIA_NOT_FOUND',
          message: '找不到指定的媒體檔案'
        }
      })
    }

    // 設定 ETag
    const etag = `"${media.sha256}"`
    res.set('ETag', etag)

    // 檢查 If-None-Match
    const ifNoneMatch = req.headers['if-none-match']
    if (ifNoneMatch === etag) {
      res.set({
        'Access-Control-Allow-Origin': 'http://localhost:5173',
        'Access-Control-Allow-Credentials': 'true'
      })
      return res.status(304).end()
    }

    // 設定回應標頭
    res.set({
      'Content-Type': media.mime,
      'Content-Length': media.sizeBytes.toString(),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Last-Modified': media.createdAt.toUTCString(),
      'Access-Control-Allow-Origin': 'http://localhost:5173',
      'Access-Control-Allow-Credentials': 'true'
    })

    // 回傳檔案內容
    res.send(media.bytes)
  } catch (error) {
    console.error('取得媒體失敗:', error)
    res.status(500).json({
      error: {
        code: 'MEDIA_READ_ERROR',
        message: '取得媒體檔案失敗'
      }
    })
  }
})

// 取得媒體資訊（不包含檔案內容）
router.get('/:id/info', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // 驗證 UUID 格式（更寬鬆的驗證）
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: {
          code: 'MEDIA_INVALID_ID',
          message: '無效的媒體 ID 格式'
        }
      })
    }

    const media = await prisma.media.findUnique({
      where: { id },
      select: {
        id: true,
        kind: true,
        mime: true,
        sizeBytes: true,
        width: true,
        height: true,
        sha256: true,
        createdAt: true
      }
    })

    if (!media) {
      return res.status(404).json({
        error: {
          code: 'MEDIA_NOT_FOUND',
          message: '找不到指定的媒體檔案'
        }
      })
    }

    res.json(media)
  } catch (error) {
    console.error('取得媒體資訊失敗:', error)
    res.status(500).json({
      error: {
        code: 'MEDIA_INFO_ERROR',
        message: '取得媒體資訊失敗'
      }
    })
  }
})

// 刪除媒體檔案（需要登入且為創建者）
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: '需要登入才能刪除檔案'
        }
      })
    }

    // 驗證 UUID 格式（更寬鬆的驗證）
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: {
          code: 'MEDIA_INVALID_ID',
          message: '無效的媒體 ID 格式'
        }
      })
    }

    const media = await prisma.media.findUnique({
      where: { id }
    })

    if (!media) {
      return res.status(404).json({
        error: {
          code: 'MEDIA_NOT_FOUND',
          message: '找不到指定的媒體檔案'
        }
      })
    }

    // 檢查是否為創建者
    if (media.createdById !== req.user.id) {
      return res.status(403).json({
        error: {
          code: 'MEDIA_FORBIDDEN',
          message: '沒有權限刪除此檔案'
        }
      })
    }

    // 刪除媒體檔案
    await prisma.media.delete({
      where: { id }
    })

    res.json({ success: true })
  } catch (error) {
    console.error('刪除媒體失敗:', error)
    res.status(500).json({
      error: {
        code: 'MEDIA_DELETE_ERROR',
        message: '刪除媒體檔案失敗'
      }
    })
  }
})

export default router
