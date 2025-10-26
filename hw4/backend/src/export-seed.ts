import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('📤 開始匯出資料庫內容...')

  try {
    // 匯出標籤
    const tags = await prisma.tag.findMany({
      select: {
        id: true,
        name: true
      }
    })
    console.log(`✅ 匯出 ${tags.length} 個標籤`)

    // 匯出用戶（不包含密碼雜湊）
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        nickname: true,
        avatarId: true,
        status: true
      }
    })
    console.log(`✅ 匯出 ${users.length} 個用戶`)

    // 匯出媒體
    const media = await prisma.media.findMany({
      select: {
        id: true,
        kind: true,
        mime: true,
        sizeBytes: true,
        width: true,
        height: true,
        sha256: true,
        bytes: true,
        createdAt: true
      }
    })
    console.log(`✅ 匯出 ${media.length} 個媒體檔案`)

    // 匯出商店
    const stores = await prisma.store.findMany({
      include: {
        tags: {
          include: {
            tag: true
          }
        },
        photos: {
          select: {
            id: true,
            mediaId: true,
            caption: true,
            order: true,
            createdAt: true
          }
        }
      }
    })
    console.log(`✅ 匯出 ${stores.length} 個商店`)

    // 匯出造訪記錄
    const visits = await prisma.visit.findMany({
      include: {
        photos: {
          select: {
            id: true,
            mediaId: true,
            caption: true,
            order: true,
            createdAt: true
          }
        }
      }
    })
    console.log(`✅ 匯出 ${visits.length} 筆造訪記錄`)

    // 匯出收藏
    const favorites = await prisma.favorite.findMany({
      select: {
        userId: true,
        storeId: true,
        createdAt: true
      }
    })
    console.log(`✅ 匯出 ${favorites.length} 個收藏`)

    // 建立種子資料物件
    const seedData = {
      tags,
      users: users.map(user => ({
        ...user,
        // 為測試用戶設定預設密碼
        password: user.email === 'test@example.com' ? 'password123' : undefined
      })),
      media,
      stores: stores.map(store => ({
        name: store.name,
        address: store.address,
        lat: store.lat,
        lng: store.lng,
        openingHours: store.openingHours,
        googleMapUrl: store.googleMapUrl,
        instagramUrl: store.instagramUrl,
        mainPhotoId: store.mainPhotoId,
        tags: store.tags.map(st => st.tag.name),
        photos: store.photos.map(photo => ({
          mediaId: photo.mediaId,
          caption: photo.caption,
          order: photo.order
        }))
      })),
      visits: visits.map(visit => ({
        userId: visit.userId,
        storeId: visit.storeId,
        date: visit.date,
        rating: visit.rating,
        note: visit.note,
        photos: visit.photos.map(photo => ({
          mediaId: photo.mediaId,
          caption: photo.caption,
          order: photo.order
        }))
      })),
      favorites
    }

    // 寫入檔案
    const outputPath = path.join(__dirname, 'seed-data.json')
    fs.writeFileSync(outputPath, JSON.stringify(seedData, null, 2))
    
    console.log(`🎉 資料匯出完成！`)
    console.log(`📄 匯出檔案：${outputPath}`)
    console.log(`📊 匯出統計：`)
    console.log(`   - 標籤：${tags.length} 個`)
    console.log(`   - 用戶：${users.length} 個`)
    console.log(`   - 媒體：${media.length} 個`)
    console.log(`   - 商店：${stores.length} 個`)
    console.log(`   - 造訪記錄：${visits.length} 筆`)
    console.log(`   - 收藏：${favorites.length} 個`)

  } catch (error) {
    console.error('❌ 資料匯出失敗:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error('❌ 匯出失敗:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
