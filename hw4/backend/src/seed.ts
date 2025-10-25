import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 開始種子資料初始化...')

  // 建立標籤
  const tags = await Promise.all([
    prisma.tag.upsert({
      where: { name: '文創' },
      update: {},
      create: { name: '文創' }
    }),
    prisma.tag.upsert({
      where: { name: '咖啡' },
      update: {},
      create: { name: '咖啡' }
    }),
    prisma.tag.upsert({
      where: { name: '手作' },
      update: {},
      create: { name: '手作' }
    }),
    prisma.tag.upsert({
      where: { name: '選物' },
      update: {},
      create: { name: '選物' }
    }),
    prisma.tag.upsert({
      where: { name: '設計' },
      update: {},
      create: { name: '設計' }
    })
  ])

  console.log('✅ 標籤建立完成')

  // 建立測試使用者
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      username: 'testuser',
      email: 'test@example.com',
      nickname: '測試使用者',
      status: '探索台灣選物店中',
      passwordHash: '$2b$10$example.hash.here' // 實際應用中應該使用 bcrypt
    }
  })

  console.log('✅ 測試使用者建立完成')

  // 建立測試商店
  const stores = [
    {
      name: '赤峰街選物店',
      address: '台北市大同區赤峰街17巷',
      lat: 25.0525,
      lng: 121.5200,
      googleMapUrl: 'https://maps.google.com/?q=赤峰街選物店',
      instagramUrl: 'https://instagram.com/chifeng_street',
      openingHours: '週一至週日 11:00-20:00',
      isOpenNow: true,
      tagIds: [tags[0].id, tags[3].id] // 文創、選物
    },
    {
      name: '台南文創咖啡',
      address: '台南市中西區正興街',
      lat: 23.0000,
      lng: 120.2000,
      googleMapUrl: 'https://maps.google.com/?q=台南文創咖啡',
      instagramUrl: 'https://instagram.com/tainan_cafe',
      openingHours: '週二至週日 10:00-18:00',
      isOpenNow: true,
      tagIds: [tags[0].id, tags[1].id] // 文創、咖啡
    },
    {
      name: '高雄手作工坊',
      address: '高雄市鹽埕區大勇路',
      lat: 22.6200,
      lng: 120.2800,
      googleMapUrl: 'https://maps.google.com/?q=高雄手作工坊',
      instagramUrl: 'https://instagram.com/kaohsiung_handmade',
      openingHours: '週三至週日 13:00-21:00',
      isOpenNow: false,
      tagIds: [tags[2].id, tags[4].id] // 手作、設計
    }
  ]

  for (const storeData of stores) {
    const { tagIds, ...storeInfo } = storeData
    
    const store = await prisma.store.create({
      data: storeInfo
    })

    // 建立商店標籤關聯
    for (const tagId of tagIds) {
      await prisma.storeTagLink.create({
        data: {
          storeId: store.id,
          tagId: tagId
        }
      })
    }

    console.log(`✅ 商店 "${store.name}" 建立完成`)
  }

  // 建立測試造訪紀錄
  const storesList = await prisma.store.findMany()
  if (storesList.length > 0) {
    const visit = await prisma.visit.create({
      data: {
        userId: testUser.id,
        storeId: storesList[0].id,
        date: new Date('2024-01-15'),
        rating: 5,
        note: '很棒的選物店，商品很有特色！'
      }
    })

    console.log(`✅ 造訪紀錄建立完成`)
  }

  console.log('🎉 種子資料初始化完成！')
}

main()
  .catch((e) => {
    console.error('❌ 種子資料初始化失敗:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
