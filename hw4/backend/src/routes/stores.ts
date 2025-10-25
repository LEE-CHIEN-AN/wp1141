import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticateToken, optionalAuth } from '../middleware/auth'

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
    googlePlaceId: store.googlePlaceId,
    createdAt: store.createdAt,
    updatedAt: store.updatedAt,
    tags: store.tags?.map((link: any) => link.tag) || [],
    avgRating: aggregates?.avgRating || 0,
    visitsCount: aggregates?.visitsCount || 0
  }
}

// GET /api/stores - 查詢商店列表
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const {
      bounds,
      q,
      tags
    } = req.query

    // 建立查詢條件
    const where: any = {}

    // 地理邊界查詢
    if (bounds) {
      const [north, west, south, east] = bounds.toString().split(',').map(Number)
      if (!isNaN(north) && !isNaN(west) && !isNaN(south) && !isNaN(east)) {
        where.lat = {
          gte: south,
          lte: north
        }
        where.lng = {
          gte: west,
          lte: east
        }
      }
    }

    // 關鍵字搜尋
    if (q) {
      where.OR = [
        { name: { contains: q.toString() } },
        { address: { contains: q.toString() } }
      ]
    }

    // 標籤篩選
    if (tags) {
      const tagList = tags.toString().split(',')
      where.tags = {
        some: {
          tag: {
            name: { in: tagList }
          }
        }
      }
    }

    // 查詢商店
    const stores = await prisma.store.findMany({
      where,
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // 計算聚合資料
    const storesWithAggregates = await Promise.all(
      stores.map(async (store) => {
        const aggregates = await calculateStoreAggregates(store.id)
        return formatStore(store, aggregates)
      })
    )

    // 設置快取標頭
    const etag = `"${Buffer.from(JSON.stringify(storesWithAggregates)).toString('base64')}"`
    res.set('ETag', etag)
    res.set('Cache-Control', 'public, max-age=300') // 5分鐘快取

    // 檢查 If-None-Match
    const ifNoneMatch = req.headers['if-none-match']
    if (ifNoneMatch === etag) {
      return res.status(304).end()
    }

    res.json({
      items: storesWithAggregates,
      total: storesWithAggregates.length
    })
  } catch (error) {
    console.error('查詢商店失敗:', error)
    res.status(500).json({
      error: {
        code: 'STORES_QUERY_ERROR',
        message: '查詢商店失敗'
      }
    })
  }
})

// POST /api/stores - 建立商店
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      name,
      lat,
      lng,
      address,
      openingHours,
      tagNames,
      mainPhotoId
    } = req.body

    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: '需要登入才能建立商店'
        }
      })
    }

    // 驗證必填欄位
    if (!name || lat === undefined || lng === undefined) {
      return res.status(400).json({
        error: {
          code: 'STORE_MISSING_FIELDS',
          message: '缺少必填欄位：name, lat, lng'
        }
      })
    }

    // 驗證座標範圍
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        error: {
          code: 'STORE_INVALID_COORDINATES',
          message: '無效的座標值'
        }
      })
    }

    // 驗證主圖是否存在
    if (mainPhotoId) {
      const media = await prisma.media.findUnique({
        where: { id: mainPhotoId }
      })
      if (!media) {
        return res.status(400).json({
          error: {
            code: 'MEDIA_NOT_FOUND',
            message: '找不到指定的主圖'
          }
        })
      }
    }

    // 處理標籤
    let tagIds: number[] = []
    if (tagNames && Array.isArray(tagNames)) {
      for (const tagName of tagNames) {
        if (typeof tagName === 'string' && tagName.trim()) {
          const tag = await prisma.tag.upsert({
            where: { name: tagName.trim() },
            update: {},
            create: { name: tagName.trim() }
          })
          tagIds.push(tag.id)
        }
      }
    }

    // 建立商店
    const store = await prisma.store.create({
      data: {
        name,
        lat,
        lng,
        address: address || null,
        openingHours: openingHours || null,
        mainPhotoId: mainPhotoId || null,
        tags: {
          create: tagIds.map(tagId => ({
            tagId
          }))
        }
      },
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      }
    })

    // 計算聚合資料
    const aggregates = await calculateStoreAggregates(store.id)

    res.status(201).json(formatStore(store, aggregates))
  } catch (error) {
    console.error('建立商店失敗:', error)
    res.status(500).json({
      error: {
        code: 'STORE_CREATE_ERROR',
        message: '建立商店失敗'
      }
    })
  }
})

// GET /api/stores/:id - 取得商店詳情
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params

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

    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        tags: {
          include: {
            tag: true
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

    if (!store) {
      return res.status(404).json({
        error: {
          code: 'STORE_NOT_FOUND',
          message: '找不到指定的商店'
        }
      })
    }

    // 計算聚合資料
    const aggregates = await calculateStoreAggregates(store.id)

    // 格式化回應
    const response = {
      ...formatStore(store, aggregates),
      photos: store.photos.map(photo => ({
        id: photo.id,
        mediaId: photo.mediaId,
        caption: photo.caption,
        order: photo.order,
        createdAt: photo.createdAt
      }))
    }

    res.json(response)
  } catch (error) {
    console.error('取得商店詳情失敗:', error)
    res.status(500).json({
      error: {
        code: 'STORE_GET_ERROR',
        message: '取得商店詳情失敗'
      }
    })
  }
})

// POST /api/stores/:id/photos - 新增商店相簿
router.post('/:id/photos', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { mediaId, caption, order } = req.body

    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: '需要登入才能新增相簿'
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
    if (!mediaId) {
      return res.status(400).json({
        error: {
          code: 'STORE_PHOTO_MISSING_MEDIA',
          message: '缺少必填欄位：mediaId'
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

    // 檢查媒體是否存在
    const media = await prisma.media.findUnique({
      where: { id: mediaId }
    })

    if (!media) {
      return res.status(404).json({
        error: {
          code: 'MEDIA_NOT_FOUND',
          message: '找不到指定的媒體檔案'
        }
      })
    }

    // 建立商店相簿
    const storePhoto = await prisma.storePhoto.create({
      data: {
        storeId: id,
        mediaId,
        caption: caption || null,
        order: order || 0
      }
    })

    res.status(201).json({
      id: storePhoto.id,
      storeId: storePhoto.storeId,
      mediaId: storePhoto.mediaId,
      caption: storePhoto.caption,
      order: storePhoto.order,
      createdAt: storePhoto.createdAt
    })
  } catch (error) {
    console.error('新增商店相簿失敗:', error)
    res.status(500).json({
      error: {
        code: 'STORE_PHOTO_CREATE_ERROR',
        message: '新增商店相簿失敗'
      }
    })
  }
})

// PUT /api/stores/:id - 更新商店資料
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, address, openingHours, googleMapUrl, instagramUrl, tagNames, description, mainPhotoId } = req.body

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
    const existingStore = await prisma.store.findUnique({
      where: { id }
    })

    if (!existingStore) {
      return res.status(404).json({
        error: {
          code: 'STORE_NOT_FOUND',
          message: '找不到指定的商店'
        }
      })
    }

    // 更新商店資料
    const updatedStore = await prisma.store.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(address !== undefined && { address }),
        ...(openingHours !== undefined && { openingHours }),
        ...(googleMapUrl !== undefined && { googleMapUrl }),
        ...(instagramUrl !== undefined && { instagramUrl }),
        ...(mainPhotoId !== undefined && { mainPhotoId })
      },
      include: {
        tags: {
          include: {
            tag: true
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

    // 處理標籤更新
    if (tagNames && Array.isArray(tagNames)) {
      // 刪除現有標籤關聯
      await prisma.storeTagLink.deleteMany({
        where: { storeId: id }
      })

      // 新增標籤關聯
      for (const tagName of tagNames) {
        // 查找或建立標籤
        let tag = await prisma.tag.findFirst({
          where: { name: tagName }
        })

        if (!tag) {
          tag = await prisma.tag.create({
            data: { name: tagName }
          })
        }

        // 建立標籤關聯
        await prisma.storeTagLink.create({
          data: {
            storeId: id,
            tagId: tag.id
          }
        })
      }
    }

    // 重新載入包含標籤的完整資料
    const fullStore = await prisma.store.findUnique({
      where: { id },
      include: {
        tags: {
          include: {
            tag: true
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

    // 計算聚合資料
    const aggregates = await calculateStoreAggregates(id)

    // 格式化回應
    const response = {
      ...formatStore(fullStore, aggregates),
      photos: fullStore.photos.map(photo => ({
        id: photo.id,
        mediaId: photo.mediaId,
        caption: photo.caption,
        order: photo.order,
        createdAt: photo.createdAt
      }))
    }

    res.json(response)
  } catch (error) {
    console.error('更新商店失敗:', error)
    res.status(500).json({
      error: {
        code: 'STORE_UPDATE_ERROR',
        message: '更新商店失敗'
      }
    })
  }
})

export default router
