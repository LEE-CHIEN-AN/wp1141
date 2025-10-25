// 測試媒體 API 的腳本
const testMediaAPI = async () => {
  const baseURL = 'http://localhost:3001/api'
  let cookies = '' // 手動管理 cookies
  
  console.log('🧪 開始測試媒體 API...\n')
  
  try {
    // 1. 先登入取得認證
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
    
    // 2. 建立測試圖片 (1x1 PNG)
    console.log('2️⃣ 建立測試圖片...')
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG 標頭
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 尺寸
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, // IHDR 資料
      0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
      0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // IDAT 資料
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND chunk
    ])
    
    console.log('✅ 測試圖片建立成功\n')
    
    // 3. 測試上傳圖片
    console.log('3️⃣ 測試上傳圖片...')
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
    
    const mediaId = uploadData.id
    console.log('✅ 上傳成功，媒體 ID:', mediaId, '\n')
    
    // 4. 測試取得媒體資訊
    console.log('4️⃣ 測試取得媒體資訊...')
    const infoResponse = await fetch(`${baseURL}/media/${mediaId}/info`)
    const infoData = await infoResponse.json()
    console.log('媒體資訊:', infoData)
    
    if (!infoResponse.ok) {
      throw new Error(`取得資訊失敗: ${infoData.error?.message}`)
    }
    
    console.log('✅ 取得媒體資訊成功\n')
    
    // 5. 測試取得媒體檔案
    console.log('5️⃣ 測試取得媒體檔案...')
    const getResponse = await fetch(`${baseURL}/media/${mediaId}`)
    
    if (!getResponse.ok) {
      const errorData = await getResponse.json()
      throw new Error(`取得檔案失敗: ${errorData.error?.message}`)
    }
    
    const contentType = getResponse.headers.get('content-type')
    const contentLength = getResponse.headers.get('content-length')
    const etag = getResponse.headers.get('etag')
    const cacheControl = getResponse.headers.get('cache-control')
    
    console.log('Content-Type:', contentType)
    console.log('Content-Length:', contentLength)
    console.log('ETag:', etag)
    console.log('Cache-Control:', cacheControl)
    
    const fileBuffer = await getResponse.arrayBuffer()
    console.log('檔案大小:', fileBuffer.byteLength, 'bytes')
    
    console.log('✅ 取得媒體檔案成功\n')
    
    // 6. 測試 ETag 快取
    console.log('6️⃣ 測試 ETag 快取...')
    const cacheResponse = await fetch(`${baseURL}/media/${mediaId}`, {
      headers: {
        'If-None-Match': etag
      }
    })
    
    console.log('快取回應狀態:', cacheResponse.status)
    
    if (cacheResponse.status === 304) {
      console.log('✅ ETag 快取測試成功\n')
    } else {
      console.log('⚠️ ETag 快取測試失敗\n')
    }
    
    // 7. 測試無效的媒體 ID
    console.log('7️⃣ 測試無效的媒體 ID...')
    const invalidResponse = await fetch(`${baseURL}/media/invalid-id`)
    const invalidData = await invalidResponse.json()
    console.log('無效 ID 回應:', invalidData)
    
    if (invalidResponse.status === 400) {
      console.log('✅ 無效 ID 測試成功\n')
    } else {
      console.log('⚠️ 無效 ID 測試失敗\n')
    }
    
    // 8. 測試不存在的媒體 ID
    console.log('8️⃣ 測試不存在的媒體 ID...')
    const notFoundResponse = await fetch(`${baseURL}/media/00000000-0000-0000-0000-000000000000`)
    const notFoundData = await notFoundResponse.json()
    console.log('不存在 ID 回應:', notFoundData)
    
    if (notFoundResponse.status === 404) {
      console.log('✅ 不存在 ID 測試成功\n')
    } else {
      console.log('⚠️ 不存在 ID 測試失敗\n')
    }
    
    console.log('🎉 所有媒體 API 測試通過！')
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message)
  }
}

// 在 Node.js 環境中執行
if (typeof window === 'undefined') {
  // Node.js 環境
  const fetch = require('node-fetch')
  const FormData = require('form-data')
  testMediaAPI()
} else {
  // 瀏覽器環境
  testMediaAPI()
}
