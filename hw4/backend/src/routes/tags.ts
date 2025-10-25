import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// 取得所有標籤
router.get('/', async (req: Request, res: Response) => {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' }
    })

    res.json(tags)
  } catch (error) {
    console.error('獲取標籤失敗:', error)
    res.status(500).json({
      error: { code: 'GET_TAGS_FAILED', message: '獲取標籤失敗' }
    })
  }
})

export default router
