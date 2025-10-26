import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 開始種子資料初始化...')

  // 檢查是否有匯出的種子資料檔案
  const seedDataPath = path.join(__dirname, 'seed-data.json')
  const hasSeedData = fs.existsSync(seedDataPath)

  if (hasSeedData) {
    console.log('📂 發現種子資料檔案，開始匯入...')
    
    try {
      // 讀取種子資料
      const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf-8'))
      
      // 清空現有資料（可選）
      console.log('🗑️  清空現有資料...')
      await prisma.visitPhoto.deleteMany()
      await prisma.visit.deleteMany()
      await prisma.storePhoto.deleteMany()
      await prisma.favorite.deleteMany()
      await prisma.storeTagLink.deleteMany()
      await prisma.store.deleteMany()
      await prisma.user.deleteMany()
      await prisma.media.deleteMany()
      await prisma.tag.deleteMany()
      
      console.log('✅ 現有資料已清空')
      
      // 匯入標籤
      console.log('📝 匯入標籤...')
      const tags = await Promise.all(
        seedData.tags.map((tag: any) =>
          prisma.tag.create({
            data: { name: tag.name }
          })
        )
      )
      console.log(`✅ 已匯入 ${tags.length} 個標籤`)
      
      // 建立標籤映射
      const tagMap = new Map(tags.map((tag, index) => [seedData.tags[index].name, tag.id]))
      
      // 匯入用戶
      console.log('👤 匯入用戶...')
      for (const userData of seedData.users) {
        let passwordHash = '$2b$10$example.hash.here'
        
        // 如果有設定密碼，使用 bcrypt 雜湊
        if (userData.password) {
          passwordHash = await bcrypt.hash(userData.password, 12)
        }
        
        await prisma.user.create({
          data: {
            username: userData.username,
            email: userData.email,
            nickname: userData.nickname,
            status: userData.status,
            avatarId: userData.avatarId,
            passwordHash
          }
        })
      }
      console.log(`✅ 已匯入 ${seedData.users.length} 個用戶`)
      
      // 匯入媒體
      console.log('📸 匯入媒體檔案...')
      for (const mediaData of seedData.media) {
        // 將 bytes 從物件轉換為 Buffer
        let bytesData: Buffer
        if (mediaData.bytes && typeof mediaData.bytes === 'object' && 'data' in mediaData.bytes) {
          // 如果 bytes 是 JSON 物件 {type: "Buffer", data: [...]}
          bytesData = Buffer.from(mediaData.bytes.data)
        } else if (Buffer.isBuffer(mediaData.bytes)) {
          // 如果 bytes 已經是 Buffer
          bytesData = mediaData.bytes
        } else {
          console.warn('⚠️  無法解析媒體 bytes 資料，跳過此媒體')
          continue
        }
        
        await prisma.media.create({
          data: {
            kind: mediaData.kind,
            mime: mediaData.mime,
            sizeBytes: mediaData.sizeBytes,
            width: mediaData.width,
            height: mediaData.height,
            sha256: mediaData.sha256,
            bytes: bytesData,
            createdAt: new Date(mediaData.createdAt)
          }
        })
      }
      // 建立媒體 ID 映射（在匯入商店前）
      console.log('📸 建立媒體 ID 映射...')
      const mediaList = await prisma.media.findMany({ select: { id: true, sha256: true } })
      const mediaIdMap = new Map<string, string>()
      mediaList.forEach(media => {
        if (media.sha256) {
          mediaIdMap.set(media.sha256, media.id)
        }
      })
      
      // 建立原始 ID 到新 ID 的映射
      const originalMediaIdMap = new Map<string, string>()
      for (const mediaData of seedData.media) {
        const newMediaId = mediaIdMap.get(mediaData.sha256)
        if (newMediaId) {
          originalMediaIdMap.set(mediaData.id, newMediaId)
        }
      }
      
      // 匯入商店
      console.log('🏪 匯入商店...')
      for (const storeData of seedData.stores) {
        // 查找新的 mainPhotoId
        let mainPhotoId = null
        if (storeData.mainPhotoId) {
          // 找到對應的媒體資料
          const mediaData = seedData.media.find((m: any) => m.id === storeData.mainPhotoId)
          if (mediaData && originalMediaIdMap.has(mediaData.id)) {
            mainPhotoId = originalMediaIdMap.get(mediaData.id)
          }
        }
        
        const store = await prisma.store.create({
          data: {
            name: storeData.name,
            address: storeData.address,
            lat: storeData.lat,
            lng: storeData.lng,
            openingHours: storeData.openingHours,
            googleMapUrl: storeData.googleMapUrl,
            instagramUrl: storeData.instagramUrl,
            mainPhotoId: mainPhotoId
          }
        })
        
        // 建立標籤關聯
        if (storeData.tags) {
          for (const tagName of storeData.tags) {
            const tagId = tagMap.get(tagName)
            if (tagId) {
              await prisma.storeTagLink.create({
                data: {
                  storeId: store.id,
                  tagId: tagId
                }
              })
            }
          }
        }
        
        // 建立照片關聯
        if (storeData.photos) {
          let order = 0
          for (const photoData of storeData.photos) {
            // 使用原始 ID 映射查找新的媒體 ID
            if (photoData.mediaId && originalMediaIdMap.has(photoData.mediaId)) {
              const newMediaId = originalMediaIdMap.get(photoData.mediaId)
              if (newMediaId) {
                await prisma.storePhoto.create({
                  data: {
                    storeId: store.id,
                    mediaId: newMediaId,
                    caption: photoData.caption,
                    order: photoData.order || order
                  }
                })
                order++
              }
            }
          }
        }
      }
      console.log(`✅ 已匯入 ${seedData.stores.length} 個商店`)
      
      // 匯入造訪記錄
      console.log('📝 匯入造訪記錄...')
      for (const visitData of seedData.visits) {
        const visit = await prisma.visit.create({
          data: {
            userId: visitData.userId,
            storeId: visitData.storeId,
            date: new Date(visitData.date),
            rating: visitData.rating,
            note: visitData.note
          }
        })
        
        // 建立照片關聯
        if (visitData.photos) {
          let order = 0
          for (const photoData of visitData.photos) {
            // 使用原始 ID 映射查找新的媒體 ID
            if (photoData.mediaId && originalMediaIdMap.has(photoData.mediaId)) {
              const newMediaId = originalMediaIdMap.get(photoData.mediaId)
              if (newMediaId) {
                await prisma.visitPhoto.create({
                  data: {
                    visitId: visit.id,
                    mediaId: newMediaId,
                    caption: photoData.caption,
                    order: photoData.order || order
                  }
                })
                order++
              }
            }
          }
        }
      }
      console.log(`✅ 已匯入 ${seedData.visits.length} 筆造訪記錄`)
      
      // 匯入收藏
      console.log('❤️  匯入收藏...')
      for (const favoriteData of seedData.favorites) {
        await prisma.favorite.create({
          data: {
            userId: favoriteData.userId,
            storeId: favoriteData.storeId,
            createdAt: new Date(favoriteData.createdAt)
          }
        })
      }
      console.log(`✅ 已匯入 ${seedData.favorites.length} 個收藏`)
      
      console.log('🎉 種子資料匯入完成！')
      
    } catch (error) {
      console.error('❌ 匯入種子資料失敗:', error)
      throw error
    }
    
  } else {
    console.log('📝 未發現種子資料檔案，使用基本範例資料...')
    console.log('💡 提示：執行 npm run db:export 可以匯出當前資料庫作為種子資料')
    
    // 使用原有的基本範例資料邏輯
    // ... 保留原有代碼 ...
  }
}

main()
  .catch((e) => {
    console.error('❌ 種子資料初始化失敗:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
