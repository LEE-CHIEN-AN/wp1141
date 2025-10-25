// 測試認證 API 的腳本
const testAuthAPI = async () => {
  const baseURL = 'http://localhost:3001/api/auth'
  let cookies = '' // 手動管理 cookies
  
  console.log('🧪 開始測試認證 API...\n')
  
  try {
    // 1. 測試註冊
    console.log('1️⃣ 測試註冊...')
    const registerResponse = await fetch(`${baseURL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'testuser3',
        email: 'testuser3@example.com',
        password: 'password123',
        nickname: '測試用戶3'
      })
    })
    
    const registerData = await registerResponse.json()
    console.log('註冊結果:', registerData)
    
    if (!registerResponse.ok) {
      throw new Error(`註冊失敗: ${registerData.error?.message}`)
    }
    
    // 提取 Set-Cookie 標頭
    const setCookie = registerResponse.headers.get('set-cookie')
    if (setCookie) {
      cookies = setCookie
      console.log('Cookie 已設定:', setCookie)
    }
    
    console.log('✅ 註冊成功\n')
    
    // 2. 測試取得當前使用者
    console.log('2️⃣ 測試取得當前使用者...')
    const meResponse = await fetch(`${baseURL}/me`, {
      method: 'GET',
      headers: {
        'Cookie': cookies
      }
    })
    
    const meData = await meResponse.json()
    console.log('當前使用者:', meData)
    
    if (!meResponse.ok) {
      throw new Error(`取得使用者失敗: ${meData.error?.message}`)
    }
    
    console.log('✅ 取得使用者成功\n')
    
    // 3. 測試登出
    console.log('3️⃣ 測試登出...')
    const logoutResponse = await fetch(`${baseURL}/logout`, {
      method: 'POST',
      headers: {
        'Cookie': cookies
      }
    })
    
    const logoutData = await logoutResponse.json()
    console.log('登出結果:', logoutData)
    
    if (!logoutResponse.ok) {
      throw new Error(`登出失敗: ${logoutData.error?.message}`)
    }
    
    // 清除 cookies
    cookies = ''
    console.log('✅ 登出成功\n')
    
    // 4. 測試登入
    console.log('4️⃣ 測試登入...')
    const loginResponse = await fetch(`${baseURL}/login`, {
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
    const loginSetCookie = loginResponse.headers.get('set-cookie')
    if (loginSetCookie) {
      cookies = loginSetCookie
      console.log('Cookie 已設定:', loginSetCookie)
    }
    
    console.log('✅ 登入成功\n')
    
    // 5. 再次測試取得當前使用者
    console.log('5️⃣ 再次測試取得當前使用者...')
    const meResponse2 = await fetch(`${baseURL}/me`, {
      method: 'GET',
      headers: {
        'Cookie': cookies
      }
    })
    
    const meData2 = await meResponse2.json()
    console.log('當前使用者:', meData2)
    
    if (!meResponse2.ok) {
      throw new Error(`取得使用者失敗: ${meData2.error?.message}`)
    }
    
    console.log('✅ 取得使用者成功\n')
    
    console.log('🎉 所有測試通過！')
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message)
  }
}

// 在 Node.js 環境中執行
if (typeof window === 'undefined') {
  // Node.js 環境
  const fetch = require('node-fetch')
  testAuthAPI()
} else {
  // 瀏覽器環境
  testAuthAPI()
}
