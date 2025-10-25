# 台灣選物店地圖清單 - 認證 API 文件

## 概述

本專案提供完整的認證系統，包括註冊、登入、登出和取得當前使用者功能。使用 JWT + httpOnly Cookie 進行身份驗證，支援跨站憑證（CORS + credentials）。

## 技術規格

- **後端**: Node.js + Express + TypeScript
- **資料庫**: SQLite + Prisma ORM
- **認證**: JWT + httpOnly Cookie
- **密碼加密**: bcrypt (12 rounds)
- **CORS**: 支援 `http://localhost:5173` 和 `http://127.0.0.1:5173`

## API 端點

### 1. 註冊使用者

**POST** `/api/auth/register`

**請求體**:
```json
{
  "username": "string",     // 必填，唯一
  "email": "string",        // 必填，唯一，email 格式
  "password": "string",     // 必填，至少 6 個字元
  "nickname": "string"      // 選填
}
```

**成功回應** (201):
```json
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "nickname": "string"
}
```

**錯誤回應**:
- `400`: 缺少必填欄位
- `400`: 密碼太短
- `409`: Email 已存在
- `409`: 使用者名稱已存在

### 2. 登入

**POST** `/api/auth/login`

**請求體**:
```json
{
  "emailOrUsername": "string",  // 必填，支援 email 或 username
  "password": "string"           // 必填
}
```

**成功回應** (200):
```json
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "nickname": "string"
}
```

**錯誤回應**:
- `400`: 缺少必填欄位
- `401`: 無效的登入憑證

### 3. 登出

**POST** `/api/auth/logout`

**成功回應** (200):
```json
{
  "ok": true
}
```

### 4. 取得當前使用者

**GET** `/api/auth/me`

**成功回應** (200):
```json
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "nickname": "string",
  "avatarId": "string|null"
}
```

**錯誤回應**:
- `401`: 未提供認證令牌
- `401`: 無效的認證令牌
- `401`: 使用者不存在

## Cookie 設定

認證成功後，伺服器會設定 httpOnly Cookie：

```
Set-Cookie: sid=<JWT_TOKEN>; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax
```

- **名稱**: `sid`
- **值**: JWT Token
- **HttpOnly**: 是（防止 XSS 攻擊）
- **SameSite**: Lax
- **Secure**: 生產環境為 true
- **過期時間**: 7 天

## 錯誤格式

所有錯誤回應都遵循統一格式：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "錯誤訊息"
  }
}
```

### 錯誤代碼

- `AUTH_MISSING_FIELDS`: 缺少必填欄位
- `AUTH_PASSWORD_TOO_SHORT`: 密碼太短
- `AUTH_DUPLICATE_EMAIL`: Email 已存在
- `AUTH_DUPLICATE_USERNAME`: 使用者名稱已存在
- `AUTH_INVALID_CREDENTIALS`: 無效的登入憑證
- `AUTH_NO_TOKEN`: 未提供認證令牌
- `AUTH_INVALID_TOKEN`: 無效的認證令牌
- `AUTH_USER_NOT_FOUND`: 使用者不存在

## 前端使用範例

### JavaScript (瀏覽器)

```javascript
// 註冊
const register = async (userData) => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // 重要：包含 cookies
    body: JSON.stringify(userData)
  })
  return response.json()
}

// 登入
const login = async (credentials) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // 重要：包含 cookies
    body: JSON.stringify(credentials)
  })
  return response.json()
}

// 登出
const logout = async () => {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include' // 重要：包含 cookies
  })
  return response.json()
}

// 取得當前使用者
const getCurrentUser = async () => {
  const response = await fetch('/api/auth/me', {
    method: 'GET',
    credentials: 'include' // 重要：包含 cookies
  })
  return response.json()
}
```

### React Hook 範例

```javascript
import { useState, useEffect } from 'react'

const useAuth = () => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        setIsAuthenticated(true)
      } else {
        setUser(null)
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error('認證檢查失敗:', error)
      setUser(null)
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (credentials) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(credentials)
    })
    
    if (response.ok) {
      await checkAuth()
      return { success: true }
    } else {
      const error = await response.json()
      return { success: false, error }
    }
  }

  const logout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    })
    setUser(null)
    setIsAuthenticated(false)
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuth
  }
}

export default useAuth
```

## 環境變數

建立 `.env` 檔案：

```env
# 伺服器設定
PORT=3001
NODE_ENV=development

# 資料庫設定
DATABASE_URL="file:./dev.db"

# CORS 設定
FRONTEND_URL=http://localhost:5173

# JWT 設定
JWT_SECRET=your-super-secret-jwt-key-here-change-in-production
JWT_EXPIRES_IN=7d

# Cookie 設定
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
```

## 測試

使用提供的測試腳本：

```bash
node test-auth.js
```

測試流程：
1. 註冊新使用者
2. 取得當前使用者（驗證 Cookie）
3. 登出（清除 Cookie）
4. 登入
5. 再次取得當前使用者

## 安全性特性

1. **密碼加密**: 使用 bcrypt 進行密碼雜湊（12 rounds）
2. **JWT 簽章**: 使用密鑰簽章 JWT Token
3. **HttpOnly Cookie**: 防止 XSS 攻擊
4. **SameSite**: 防止 CSRF 攻擊
5. **CORS**: 限制允許的來源
6. **輸入驗證**: 驗證所有輸入資料
7. **錯誤處理**: 統一的錯誤回應格式

## 部署注意事項

1. 生產環境請設定強密碼的 `JWT_SECRET`
2. 設定 `COOKIE_SECURE=true` 用於 HTTPS
3. 更新 `FRONTEND_URL` 為實際的前端網址
4. 設定適當的 `NODE_ENV=production`
