// 測試商店、收藏、造訪 API 的腳本
const testStoresAPI = async () => {
  const baseURL = 'http://localhost:3001/api'
  let cookies = '' // 手動管理 cookies
  let mediaId = '' // 儲存上傳的媒體 ID
  let storeId = '' // 儲存建立的商店 ID
  
  console.log('🧪 開始測試商店、收藏、造訪 API...\n')
  
  try {
    // 1. 登入取得認證
    console.log('1️⃣ 登入取得認證...')
    const loginResponse = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emailOrUsername: 'testuser3@example.com',
        password: 'password123'
      })
    })
    
    const loginData = await loginResponse.json()
    console.log('登入結果:', loginData)
    
    if (!loginResponse.ok) {
      throw new Error(`登入失敗: ${loginData.error?.message}`)
    }
    
    // 提取 Set-Cookie 標頭
    const setCookie = loginResponse.headers.get('set-cookie')
    if (setCookie) {
      cookies = setCookie
      console.log('Cookie 已設定')
    }
    
    console.log('✅ 登入成功\n')
    
    // 2. 上傳測試圖片
    console.log('2️⃣ 上傳測試圖片...')
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG 標頭
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 尺寸
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, // IHDR 資料
      0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
      0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // IDAT 資料
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND chunk
    ])
    
    const formData = new FormData()
    const blob = new Blob([testImageBuffer], { type: 'image/png' })
    formData.append('file', blob, 'test.png')
    
    const uploadResponse = await fetch(`${baseURL}/media/upload`, {
      method: 'POST',
      headers: {
        'Cookie': cookies
      },
      body: formData
    })
    
    const uploadData = await uploadResponse.json()
    console.log('上傳結果:', uploadData)
    
    if (!uploadResponse.ok) {
      throw new Error(`上傳失敗: ${uploadData.error?.message}`)
    }
    
    mediaId = uploadData.id
    console.log('✅ 上傳成功，媒體 ID:', mediaId, '\n')
    
    // 3. 建立商店
    console.log('3️⃣ 建立商店...')
    const createStoreResponse = await fetch(`${baseURL}/stores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        name: '測試選物店',
        lat: 25.0330,
        lng: 121.5654,
        address: '台北市信義區信義路五段7號',
        openingHours: '週一至週日 10:00-22:00',
        tagNames: ['文創', '選物'],
        mainPhotoId: mediaId
      })
    })
    
    const createStoreData = await createStoreResponse.json()
    console.log('建立商店結果:', createStoreData)
    
    if (!createStoreResponse.ok) {
      throw new Error(`建立商店失敗: ${createStoreData.error?.message}`)
    }
    
    storeId = createStoreData.id
    console.log('✅ 建立商店成功，商店 ID:', storeId, '\n')
    
    // 4. 查詢商店列表
    console.log('4️⃣ 查詢商店列表...')
    const listStoresResponse = await fetch(`${baseURL}/stores`)
    const listStoresData = await listStoresResponse.json()
    console.log('商店列表:', listStoresData)
    
    if (!listStoresResponse.ok) {
      throw new Error(`查詢商店列表失敗: ${listStoresData.error?.message}`)
    }
    
    console.log('✅ 查詢商店列表成功\n')
    
    // 5. 取得商店詳情
    console.log('5️⃣ 取得商店詳情...')
    const storeDetailResponse = await fetch(`${baseURL}/stores/${storeId}`)
    const storeDetailData = await storeDetailResponse.json()
    console.log('商店詳情:', storeDetailData)
    
    if (!storeDetailResponse.ok) {
      throw new Error(`取得商店詳情失敗: ${storeDetailData.error?.message}`)
    }
    
    console.log('✅ 取得商店詳情成功\n')
    
    // 6. 新增商店相簿
    console.log('6️⃣ 新增商店相簿...')
    const addPhotoResponse = await fetch(`${baseURL}/stores/${storeId}/photos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        mediaId: mediaId,
        caption: '測試相簿照片',
        order: 1
      })
    })
    
    const addPhotoData = await addPhotoResponse.json()
    console.log('新增相簿結果:', addPhotoData)
    
    if (!addPhotoResponse.ok) {
      throw new Error(`新增相簿失敗: ${addPhotoData.error?.message}`)
    }
    
    console.log('✅ 新增相簿成功\n')
    
    // 7. 收藏商店
    console.log('7️⃣ 收藏商店...')
    const favoriteResponse = await fetch(`${baseURL}/stores/${storeId}/favorite`, {
      method: 'POST',
      headers: {
        'Cookie': cookies
      }
    })
    
    const favoriteData = await favoriteResponse.json()
    console.log('收藏結果:', favoriteData)
    
    if (!favoriteResponse.ok) {
      throw new Error(`收藏失敗: ${favoriteData.error?.message}`)
    }
    
    console.log('✅ 收藏成功\n')
    
    // 8. 取得我的收藏
    console.log('8️⃣ 取得我的收藏...')
    const myFavoritesResponse = await fetch(`${baseURL}/stores/me/favorites`, {
      headers: {
        'Cookie': cookies
      }
    })
    
    const myFavoritesData = await myFavoritesResponse.json()
    console.log('我的收藏:', myFavoritesData)
    
    if (!myFavoritesResponse.ok) {
      throw new Error(`取得收藏失敗: ${myFavoritesData.error?.message}`)
    }
    
    console.log('✅ 取得收藏成功\n')
    
    // 9. 建立造訪記錄
    console.log('9️⃣ 建立造訪記錄...')
    const createVisitResponse = await fetch(`${baseURL}/stores/${storeId}/visits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        date: '2025-10-23',
        rating: 5,
        note: '很棒的選物店！',
        photoIds: [mediaId]
      })
    })
    
    const createVisitData = await createVisitResponse.json()
    console.log('建立造訪記錄結果:', createVisitData)
    
    if (!createVisitResponse.ok) {
      throw new Error(`建立造訪記錄失敗: ${createVisitData.error?.message}`)
    }
    
    console.log('✅ 建立造訪記錄成功\n')
    
    // 10. 查詢造訪記錄
    console.log('🔟 查詢造訪記錄...')
    const visitsResponse = await fetch(`${baseURL}/stores/${storeId}/visits`)
    const visitsData = await visitsResponse.json()
    console.log('造訪記錄:', visitsData)
    
    if (!visitsResponse.ok) {
      throw new Error(`查詢造訪記錄失敗: ${visitsData.error?.message}`)
    }
    
    console.log('✅ 查詢造訪記錄成功\n')
    
    // 11. 再次取得商店詳情（檢查聚合資料）
    console.log('1️⃣1️⃣ 再次取得商店詳情（檢查聚合資料）...')
    const storeDetail2Response = await fetch(`${baseURL}/stores/${storeId}`)
    const storeDetail2Data = await storeDetail2Response.json()
    console.log('商店詳情（含聚合資料）:', storeDetail2Data)
    
    if (!storeDetail2Response.ok) {
      throw new Error(`取得商店詳情失敗: ${storeDetail2Data.error?.message}`)
    }
    
    console.log('✅ 聚合資料更新成功\n')
    
    // 12. 取消收藏
    console.log('1️⃣2️⃣ 取消收藏...')
    const unfavoriteResponse = await fetch(`${baseURL}/stores/${storeId}/favorite`, {
      method: 'DELETE',
      headers: {
        'Cookie': cookies
      }
    })
    
    const unfavoriteData = await unfavoriteResponse.json()
    console.log('取消收藏結果:', unfavoriteData)
    
    if (!unfavoriteResponse.ok) {
      throw new Error(`取消收藏失敗: ${unfavoriteData.error?.message}`)
    }
    
    console.log('✅ 取消收藏成功\n')
    
    console.log('🎉 所有商店、收藏、造訪 API 測試通過！')
    console.log(`\n📸 測試圖片 URL: http://localhost:3001/api/media/${mediaId}`)
    console.log(`🏪 測試商店 ID: ${storeId}`)
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message)
  }
}

// 在 Node.js 環境中執行
if (typeof window === 'undefined') {
  // Node.js 環境
  const fetch = require('node-fetch')
  const FormData = require('form-data')
  testStoresAPI()
} else {
  // 瀏覽器環境
  testStoresAPI()
}
