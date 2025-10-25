import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticateToken } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// 輔助函數：計算商店聚合資料
const calculateStoreAggregates = async (storeId: string) => {
  const [avgRatingResult, visitsCountResult] = await Promise.all([
    prisma.visit.aggregate({
      where: { storeId },
      _avg: { rating: true }
    }),
    prisma.visit.count({
      where: { storeId }
    })
  ])

  return {
    avgRating: avgRatingResult._avg.rating || 0,
    visitsCount: visitsCountResult
  }
}

// 輔助函數：格式化商店資料
const formatStore = (store: any, aggregates?: any) => {
  return {
    id: store.id,
    name: store.name,
    address: store.address,
    lat: store.lat,
    lng: store.lng,
    mainPhotoId: store.mainPhotoId,
    googleMapUrl: store.googleMapUrl,
    instagramUrl: store.instagramUrl,
    openingHours: store.openingHours,
    isOpenNow: store.isOpenNow,
    googlePlaceId: store.googlePlaceId,
    createdAt: store.createdAt,
    updatedAt: store.updatedAt,
    tags: store.tags?.map((link: any) => link.tag) || [],
    avgRating: aggregates?.avgRating || 0,
    visitsCount: aggregates?.visitsCount || 0
  }
}

// POST /api/stores/:id/favorite - 收藏商店
router.post('/:id/favorite', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: '需要登入才能收藏商店'
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

    // 檢查是否已經收藏
    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_storeId: {
          userId: req.user.id,
          storeId: id
        }
      }
    })

    if (existingFavorite) {
      return res.status(409).json({
        error: {
          code: 'FAV_CONFLICT',
          message: '已經收藏過此商店'
        }
      })
    }

    // 建立收藏
    await prisma.favorite.create({
      data: {
        userId: req.user.id,
        storeId: id
      }
    })

    res.json({ ok: true })
  } catch (error) {
    console.error('收藏商店失敗:', error)
    res.status(500).json({
      error: {
        code: 'FAVORITE_CREATE_ERROR',
        message: '收藏商店失敗'
      }
    })
  }
})

// DELETE /api/stores/:id/favorite - 取消收藏商店
router.delete('/:id/favorite', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: '需要登入才能取消收藏'
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

    // 刪除收藏
    const deleted = await prisma.favorite.deleteMany({
      where: {
        userId: req.user.id,
        storeId: id
      }
    })

    if (deleted.count === 0) {
      return res.status(404).json({
        error: {
          code: 'FAVORITE_NOT_FOUND',
          message: '沒有收藏過此商店'
        }
      })
    }

    res.json({ ok: true })
  } catch (error) {
    console.error('取消收藏失敗:', error)
    res.status(500).json({
      error: {
        code: 'FAVORITE_DELETE_ERROR',
        message: '取消收藏失敗'
      }
    })
  }
})

// GET /api/me/favorites - 取得我的收藏
router.get('/me/favorites', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: '需要登入才能查看收藏'
        }
      })
    }

    // 查詢收藏的商店
    const favorites = await prisma.favorite.findMany({
      where: {
        userId: req.user.id
      },
      include: {
        store: {
          include: {
            tags: {
              include: {
                tag: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // 計算聚合資料
    const storesWithAggregates = await Promise.all(
      favorites.map(async (favorite) => {
        const aggregates = await calculateStoreAggregates(favorite.store.id)
        return formatStore(favorite.store, aggregates)
      })
    )

    res.json(storesWithAggregates)
  } catch (error) {
    console.error('取得收藏失敗:', error)
    res.status(500).json({
      error: {
        code: 'FAVORITES_GET_ERROR',
        message: '取得收藏失敗'
      }
    })
  }
})

export default router
