import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticateToken } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// GET /api/me/visits - 取得當前用戶的所有造訪記錄
router.get('/me/visits', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: '需要登入才能查看造訪記錄'
        }
      })
    }

    const { page = '1', pageSize = '20' } = req.query

    // 分頁參數
    const pageNum = parseInt(page.toString())
    const pageSizeNum = parseInt(pageSize.toString())
    const skip = (pageNum - 1) * pageSizeNum

    // 查詢用戶的所有造訪記錄
    const visits = await prisma.visit.findMany({
      where: { userId: req.user.id },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            address: true,
            lat: true,
            lng: true,
            mainPhotoId: true
          }
        },
        photos: {
          include: {
            media: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      },
      orderBy: {
        date: 'desc'
      },
      skip,
      take: pageSizeNum
    })

    // 格式化回應
    const formattedVisits = visits.map(visit => ({
      id: visit.id,
      userId: visit.userId,
      storeId: visit.storeId,
      date: visit.date,
      rating: visit.rating,
      note: visit.note,
      createdAt: visit.createdAt,
      updatedAt: visit.updatedAt,
      store: visit.store,
      photos: visit.photos.map(photo => ({
        id: photo.id,
        mediaId: photo.mediaId,
        caption: photo.caption,
        order: photo.order,
        createdAt: photo.createdAt
      }))
    }))

    // 計算總數
    const total = await prisma.visit.count({
      where: { userId: req.user.id }
    })

    res.json({
      items: formattedVisits,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages: Math.ceil(total / pageSizeNum)
    })
  } catch (error) {
    console.error('取得用戶造訪記錄失敗:', error)
    res.status(500).json({
      error: {
        code: 'USER_VISITS_GET_ERROR',
        message: '取得用戶造訪記錄失敗'
      }
    })
  }
})

// GET /api/stores/:id/visits - 取得商店造訪記錄
router.get('/:id/visits', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { page = '1', pageSize = '10' } = req.query

    // 驗證 UUID 格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: {
          code: 'STORE_INVALID_ID',
          message: '無效的商店 ID 格式'
        }
      })
    }

    // 檢查商店是否存在
    const store = await prisma.store.findUnique({
      where: { id }
    })

    if (!store) {
      return res.status(404).json({
        error: {
          code: 'STORE_NOT_FOUND',
          message: '找不到指定的商店'
        }
      })
    }

    // 分頁參數
    const pageNum = parseInt(page.toString())
    const pageSizeNum = parseInt(pageSize.toString())
    const skip = (pageNum - 1) * pageSizeNum

    // 查詢造訪記錄
    const visits = await prisma.visit.findMany({
      where: { storeId: id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatarId: true
          }
        },
        photos: {
          include: {
            media: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      },
      orderBy: {
        date: 'desc'
      },
      skip,
      take: pageSizeNum
    })

    // 格式化回應
    const formattedVisits = visits.map(visit => ({
      id: visit.id,
      userId: visit.userId,
      storeId: visit.storeId,
      date: visit.date,
      rating: visit.rating,
      note: visit.note,
      createdAt: visit.createdAt,
      updatedAt: visit.updatedAt,
      user: visit.user,
      photos: visit.photos.map(photo => ({
        id: photo.id,
        mediaId: photo.mediaId,
        caption: photo.caption,
        order: photo.order,
        createdAt: photo.createdAt
      }))
    }))

    // 計算總數
    const total = await prisma.visit.count({
      where: { storeId: id }
    })

    res.json({
      items: formattedVisits,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages: Math.ceil(total / pageSizeNum)
    })
  } catch (error) {
    console.error('取得造訪記錄失敗:', error)
    res.status(500).json({
      error: {
        code: 'VISITS_GET_ERROR',
        message: '取得造訪記錄失敗'
      }
    })
  }
})

// POST /api/stores/:id/visits - 建立造訪記錄
router.post('/:id/visits', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { date, rating, note, photoIds } = req.body

    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: '需要登入才能建立造訪記錄'
        }
      })
    }

    // 驗證 UUID 格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: {
          code: 'STORE_INVALID_ID',
          message: '無效的商店 ID 格式'
        }
      })
    }

    // 驗證必填欄位
    if (!date || rating === undefined) {
      return res.status(400).json({
        error: {
          code: 'VISIT_MISSING_FIELDS',
          message: '缺少必填欄位：date, rating'
        }
      })
    }

    // 驗證評分範圍
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return res.status(400).json({
        error: {
          code: 'VISIT_INVALID_RATING',
          message: '評分必須是 1-5 之間的整數'
        }
      })
    }

    // 驗證日期格式
    const visitDate = new Date(date)
    if (isNaN(visitDate.getTime())) {
      return res.status(400).json({
        error: {
          code: 'VISIT_INVALID_DATE',
          message: '無效的日期格式'
        }
      })
    }

    // 檢查商店是否存在
    const store = await prisma.store.findUnique({
      where: { id }
    })

    if (!store) {
      return res.status(404).json({
        error: {
          code: 'STORE_NOT_FOUND',
          message: '找不到指定的商店'
        }
      })
    }

    // 驗證照片是否存在
    if (photoIds && Array.isArray(photoIds)) {
      for (const photoId of photoIds) {
        const media = await prisma.media.findUnique({
          where: { id: photoId }
        })
        if (!media) {
          return res.status(400).json({
            error: {
              code: 'MEDIA_NOT_FOUND',
              message: `找不到指定的照片：${photoId}`
            }
          })
        }
      }
    }

    // 建立造訪記錄
    const visit = await prisma.visit.create({
      data: {
        userId: req.user.id,
        storeId: id,
        date: visitDate,
        rating,
        note: note || null
      }
    })

    // 建立造訪照片
    if (photoIds && Array.isArray(photoIds)) {
      await Promise.all(
        photoIds.map((photoId: string, index: number) =>
          prisma.visitPhoto.create({
            data: {
              visitId: visit.id,
              mediaId: photoId,
              order: index
            }
          })
        )
      )
    }

    // 查詢完整的造訪記錄
    const fullVisit = await prisma.visit.findUnique({
      where: { id: visit.id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatarId: true
          }
        },
        photos: {
          include: {
            media: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    })

    // 格式化回應
    const response = {
      id: fullVisit!.id,
      userId: fullVisit!.userId,
      storeId: fullVisit!.storeId,
      date: fullVisit!.date,
      rating: fullVisit!.rating,
      note: fullVisit!.note,
      createdAt: fullVisit!.createdAt,
      updatedAt: fullVisit!.updatedAt,
      user: fullVisit!.user,
      photos: fullVisit!.photos.map(photo => ({
        id: photo.id,
        mediaId: photo.mediaId,
        caption: photo.caption,
        order: photo.order,
        createdAt: photo.createdAt
      }))
    }

    res.status(201).json(response)
  } catch (error) {
    console.error('建立造訪記錄失敗:', error)
    res.status(500).json({
      error: {
        code: 'VISIT_CREATE_ERROR',
        message: '建立造訪記錄失敗'
      }
    })
  }
})

// PUT /api/visits/:id - 更新造訪記錄
router.put('/visits/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { date, rating, note, photoIds } = req.body

    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: '需要登入才能更新造訪記錄'
        }
      })
    }

    // 驗證 UUID 格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: {
          code: 'VISIT_INVALID_ID',
          message: '無效的造訪記錄 ID 格式'
        }
      })
    }

    // 檢查造訪記錄是否存在且屬於當前用戶
    const existingVisit = await prisma.visit.findFirst({
      where: {
        id: id,
        userId: req.user.id
      }
    })

    if (!existingVisit) {
      return res.status(404).json({
        error: {
          code: 'VISIT_NOT_FOUND',
          message: '找不到指定的造訪記錄'
        }
      })
    }

    // 驗證必填欄位
    if (!date || rating === undefined) {
      return res.status(400).json({
        error: {
          code: 'VISIT_MISSING_FIELDS',
          message: '缺少必填欄位：date, rating'
        }
      })
    }

    // 驗證評分範圍
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return res.status(400).json({
        error: {
          code: 'VISIT_INVALID_RATING',
          message: '評分必須是 1-5 之間的整數'
        }
      })
    }

    // 驗證日期格式
    const visitDate = new Date(date)
    if (isNaN(visitDate.getTime())) {
      return res.status(400).json({
        error: {
          code: 'VISIT_INVALID_DATE',
          message: '無效的日期格式'
        }
      })
    }

    // 驗證照片是否存在
    if (photoIds && Array.isArray(photoIds)) {
      for (const photoId of photoIds) {
        const media = await prisma.media.findUnique({
          where: { id: photoId }
        })
        if (!media) {
          return res.status(400).json({
            error: {
              code: 'MEDIA_NOT_FOUND',
              message: `找不到指定的照片：${photoId}`
            }
          })
        }
      }
    }

    // 更新造訪記錄
    const updatedVisit = await prisma.visit.update({
      where: { id: id },
      data: {
        date: visitDate,
        rating,
        note: note || null
      }
    })

    // 刪除舊的造訪照片
    await prisma.visitPhoto.deleteMany({
      where: { visitId: id }
    })

    // 建立新的造訪照片
    if (photoIds && Array.isArray(photoIds)) {
      await Promise.all(
        photoIds.map((photoId: string, index: number) =>
          prisma.visitPhoto.create({
            data: {
              visitId: id,
              mediaId: photoId,
              order: index
            }
          })
        )
      )
    }

    // 查詢完整的造訪記錄
    const fullVisit = await prisma.visit.findUnique({
      where: { id: id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatarId: true
          }
        },
        photos: {
          include: {
            media: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    })

    // 格式化回應
    const response = {
      id: fullVisit!.id,
      userId: fullVisit!.userId,
      storeId: fullVisit!.storeId,
      date: fullVisit!.date,
      rating: fullVisit!.rating,
      note: fullVisit!.note,
      createdAt: fullVisit!.createdAt,
      updatedAt: fullVisit!.updatedAt,
      user: fullVisit!.user,
      photos: fullVisit!.photos.map(photo => ({
        id: photo.id,
        mediaId: photo.mediaId,
        caption: photo.caption,
        order: photo.order,
        createdAt: photo.createdAt
      }))
    }

    res.json(response)
  } catch (error) {
    console.error('更新造訪記錄失敗:', error)
    res.status(500).json({
      error: {
        code: 'VISIT_UPDATE_ERROR',
        message: '更新造訪記錄失敗'
      }
    })
  }
})

// DELETE /api/visits/:id - 刪除造訪記錄
router.delete('/visits/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: '需要登入才能刪除造訪記錄'
        }
      })
    }

    // 驗證 UUID 格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: {
          code: 'VISIT_INVALID_ID',
          message: '無效的造訪記錄 ID 格式'
        }
      })
    }

    // 檢查造訪記錄是否存在且屬於當前用戶
    const existingVisit = await prisma.visit.findFirst({
      where: {
        id: id,
        userId: req.user.id
      }
    })

    if (!existingVisit) {
      return res.status(404).json({
        error: {
          code: 'VISIT_NOT_FOUND',
          message: '找不到指定的造訪記錄'
        }
      })
    }

    // 刪除造訪記錄（會自動刪除相關的造訪照片）
    await prisma.visit.delete({
      where: { id: id }
    })

    res.json({ ok: true })
  } catch (error) {
    console.error('刪除造訪記錄失敗:', error)
    res.status(500).json({
      error: {
        code: 'VISIT_DELETE_ERROR',
        message: '刪除造訪記錄失敗'
      }
    })
  }
})

export default router
