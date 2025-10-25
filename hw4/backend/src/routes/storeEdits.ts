import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticateToken } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// 更新店家資料
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const storeId = req.params.id
    const userId = req.user?.id
    const { 
      name, 
      address, 
      openingHours, 
      googleMapUrl, 
      instagramUrl, 
      tagNames,
      description 
    } = req.body

    if (!userId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: '請先登入' }
      })
    }

    // 檢查店家是否存在
    const existingStore = await prisma.store.findUnique({
      where: { id: storeId },
      include: { tags: { include: { tag: true } } }
    })

    if (!existingStore) {
      return res.status(404).json({
        error: { code: 'STORE_NOT_FOUND', message: '店家不存在' }
      })
    }

    // 開始事務
    const result = await prisma.$transaction(async (tx) => {
      // 更新店家基本資料
      const updatedStore = await tx.store.update({
        where: { id: storeId },
        data: {
          name: name || existingStore.name,
          address: address !== undefined ? address : existingStore.address,
          openingHours: openingHours !== undefined ? openingHours : existingStore.openingHours,
          googleMapUrl: googleMapUrl !== undefined ? googleMapUrl : existingStore.googleMapUrl,
          instagramUrl: instagramUrl !== undefined ? instagramUrl : existingStore.instagramUrl,
        }
      })

      // 處理標籤更新
      if (tagNames && Array.isArray(tagNames)) {
        // 刪除現有標籤關聯
        await tx.storeTagLink.deleteMany({
          where: { storeId }
        })

        // 創建或找到標籤
        for (const tagName of tagNames) {
          if (tagName.trim()) {
            const tag = await tx.tag.upsert({
              where: { name: tagName.trim() },
              update: {},
              create: { name: tagName.trim() }
            })

            // 創建新的標籤關聯
            await tx.storeTagLink.create({
              data: {
                storeId,
                tagId: tag.id
              }
            })
          }
        }
      }

      // 記錄編輯歷史
      const editRecord = await tx.storeEdit.create({
        data: {
          storeId,
          editorId: userId,
          editType: 'UPDATE',
          fieldName: 'store_info',
          oldValue: JSON.stringify({
            name: existingStore.name,
            address: existingStore.address,
            openingHours: existingStore.openingHours,
            googleMapUrl: existingStore.googleMapUrl,
            instagramUrl: existingStore.instagramUrl,
            tags: existingStore.tags.map(t => t.tag.name)
          }),
          newValue: JSON.stringify({
            name: name || existingStore.name,
            address: address !== undefined ? address : existingStore.address,
            openingHours: openingHours !== undefined ? openingHours : existingStore.openingHours,
            googleMapUrl: googleMapUrl !== undefined ? googleMapUrl : existingStore.googleMapUrl,
            instagramUrl: instagramUrl !== undefined ? instagramUrl : existingStore.instagramUrl,
            tags: tagNames || existingStore.tags.map(t => t.tag.name)
          }),
          description: description || '更新店家資料'
        }
      })

      return { store: updatedStore, editRecord }
    })

    // 獲取更新後的完整店家資料
    const storeWithDetails = await prisma.store.findUnique({
      where: { id: storeId },
      include: {
        mainPhoto: true,
        photos: {
          include: { media: true },
          orderBy: { order: 'asc' }
        },
        tags: {
          include: { tag: true }
        },
        _count: {
          select: {
            visits: true,
            fans: true
          }
        }
      }
    })

    // 計算平均評分
    const avgRatingResult = await prisma.visit.aggregate({
      where: { storeId },
      _avg: { rating: true }
    })

    const response = {
      ...storeWithDetails,
      avgRating: avgRatingResult._avg.rating || 0,
      visitCount: storeWithDetails?._count.visits || 0,
      tags: storeWithDetails?.tags.map(t => t.tag.name) || []
    }

    res.json(response)

  } catch (error) {
    console.error('更新店家失敗:', error)
    res.status(500).json({
      error: { code: 'UPDATE_FAILED', message: '更新店家失敗' }
    })
  }
})

// 新增店家照片
router.post('/:id/photos', authenticateToken, async (req: Request, res: Response) => {
  try {
    const storeId = req.params.id
    const userId = req.user?.id
    const { mediaId, caption, order } = req.body

    if (!userId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: '請先登入' }
      })
    }

    // 檢查店家是否存在
    const store = await prisma.store.findUnique({
      where: { id: storeId }
    })

    if (!store) {
      return res.status(404).json({
        error: { code: 'STORE_NOT_FOUND', message: '店家不存在' }
      })
    }

    // 檢查媒體是否存在
    const media = await prisma.media.findUnique({
      where: { id: mediaId }
    })

    if (!media) {
      return res.status(404).json({
        error: { code: 'MEDIA_NOT_FOUND', message: '照片不存在' }
      })
    }

    // 創建店家照片
    const storePhoto = await prisma.storePhoto.create({
      data: {
        storeId,
        mediaId,
        caption: caption || '',
        order: order || 0
      },
      include: {
        media: true
      }
    })

    // 記錄編輯歷史
    await prisma.storeEdit.create({
      data: {
        storeId,
        editorId: userId,
        editType: 'ADD_PHOTO',
        fieldName: 'photos',
        newValue: JSON.stringify({
          mediaId,
          caption: caption || '',
          order: order || 0
        }),
        description: '新增店家照片'
      }
    })

    res.json(storePhoto)

  } catch (error) {
    console.error('新增店家照片失敗:', error)
    res.status(500).json({
      error: { code: 'ADD_PHOTO_FAILED', message: '新增店家照片失敗' }
    })
  }
})

// 刪除店家照片
router.delete('/:id/photos/:photoId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id: storeId, photoId } = req.params
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: '請先登入' }
      })
    }

    // 檢查照片是否存在
    const storePhoto = await prisma.storePhoto.findFirst({
      where: {
        id: photoId,
        storeId
      },
      include: { media: true }
    })

    if (!storePhoto) {
      return res.status(404).json({
        error: { code: 'PHOTO_NOT_FOUND', message: '照片不存在' }
      })
    }

    // 記錄編輯歷史
    await prisma.storeEdit.create({
      data: {
        storeId,
        editorId: userId,
        editType: 'REMOVE_PHOTO',
        fieldName: 'photos',
        oldValue: JSON.stringify({
          mediaId: storePhoto.mediaId,
          caption: storePhoto.caption,
          order: storePhoto.order
        }),
        description: '刪除店家照片'
      }
    })

    // 刪除照片
    await prisma.storePhoto.delete({
      where: { id: photoId }
    })

    res.json({ success: true })

  } catch (error) {
    console.error('刪除店家照片失敗:', error)
    res.status(500).json({
      error: { code: 'DELETE_PHOTO_FAILED', message: '刪除店家照片失敗' }
    })
  }
})

// 獲取店家編輯歷史
router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const storeId = req.params.id
    const { page = 1, pageSize = 20 } = req.query

    const skip = (Number(page) - 1) * Number(pageSize)
    const take = Number(pageSize)

    const [edits, total] = await Promise.all([
      prisma.storeEdit.findMany({
        where: { storeId },
        include: {
          editor: {
            select: {
              id: true,
              username: true,
              nickname: true,
              avatar: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.storeEdit.count({
        where: { storeId }
      })
    ])

    res.json({
      items: edits,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      totalPages: Math.ceil(total / Number(pageSize))
    })

  } catch (error) {
    console.error('獲取編輯歷史失敗:', error)
    res.status(500).json({
      error: { code: 'GET_HISTORY_FAILED', message: '獲取編輯歷史失敗' }
    })
  }
})

export default router
