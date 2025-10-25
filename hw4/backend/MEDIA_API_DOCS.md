# 台灣選物店地圖清單 - 媒體 API 文件

## 概述

本專案提供完整的媒體服務，包括圖片上傳、讀取和管理功能。使用 BLOB 儲存方式，支援 JPEG 和 PNG 格式，提供 ETag 快取和安全性控制。

## 技術規格

- **儲存方式**: SQLite BLOB
- **支援格式**: JPEG, PNG
- **檔案大小限制**: 5MB
- **圖片處理**: Sharp 庫
- **快取策略**: ETag + Cache-Control
- **安全性**: 需要登入才能上傳

## API 端點

### 1. 上傳媒體檔案

**POST** `/api/media/upload`

**認證**: 需要登入

**請求格式**: `multipart/form-data`

**欄位**:
- `file`: 圖片檔案（必填）

**支援格式**: `image/jpeg`, `image/png`

**成功回應** (200):
```json
{
  "id": "uuid",
  "mime": "image/png",
  "sizeBytes": 1024,
  "width": 1920,
  "height": 1080,
  "sha256": "hash_string"
}
```

**錯誤回應**:
- `400`: 沒有上傳檔案
- `401`: 需要登入
- `413`: 檔案大小超過 5MB
- `415`: 不支援的檔案格式

### 2. 取得媒體檔案

**GET** `/api/media/:id`

**認證**: 不需要

**成功回應** (200):
- **Content-Type**: 原始檔案的 MIME 類型
- **Content-Length**: 檔案大小
- **ETag**: SHA256 雜湊值
- **Cache-Control**: `public, max-age=31536000, immutable`
- **Body**: 原始檔案 bytes

**錯誤回應**:
- `400`: 無效的媒體 ID 格式
- `404`: 找不到媒體檔案

### 3. 取得媒體資訊

**GET** `/api/media/:id/info`

**認證**: 不需要

**成功回應** (200):
```json
{
  "id": "uuid",
  "kind": "IMAGE",
  "mime": "image/png",
  "sizeBytes": 1024,
  "width": 1920,
  "height": 1080,
  "sha256": "hash_string",
  "createdAt": "2025-10-23T14:42:56.457Z"
}
```

**錯誤回應**:
- `400`: 無效的媒體 ID 格式
- `404`: 找不到媒體檔案

### 4. 刪除媒體檔案

**DELETE** `/api/media/:id`

**認證**: 需要登入且為創建者

**成功回應** (200):
```json
{
  "success": true
}
```

**錯誤回應**:
- `400`: 無效的媒體 ID 格式
- `401`: 需要登入
- `403`: 沒有權限刪除此檔案
- `404`: 找不到媒體檔案

## 快取機制

### ETag 支援

媒體檔案支援 ETag 快取，使用 SHA256 雜湊值作為 ETag：

```
ETag: "124e8456b02497ef3e97ea1b54401d6adaf82c1e8b5884a751bca6bd4d336407"
```

**使用方式**:
```javascript
// 第一次請求
const response = await fetch('/api/media/123')
const etag = response.headers.get('ETag')

// 後續請求使用 If-None-Match
const cachedResponse = await fetch('/api/media/123', {
  headers: {
    'If-None-Match': etag
  }
})

if (cachedResponse.status === 304) {
  // 使用快取版本
}
```

### Cache-Control

設定長期快取：
```
Cache-Control: public, max-age=31536000, immutable
```

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

- `MEDIA_NO_FILE`: 沒有上傳檔案
- `MEDIA_INVALID_IMAGE`: 無效的圖片檔案
- `MEDIA_INVALID_ID`: 無效的媒體 ID 格式
- `MEDIA_NOT_FOUND`: 找不到媒體檔案
- `MEDIA_FORBIDDEN`: 沒有權限刪除此檔案
- `MEDIA_UPLOAD_ERROR`: 媒體上傳失敗
- `MEDIA_READ_ERROR`: 取得媒體檔案失敗
- `MEDIA_INFO_ERROR`: 取得媒體資訊失敗
- `MEDIA_DELETE_ERROR`: 刪除媒體檔案失敗
- `PAYLOAD_TOO_LARGE`: 檔案大小超過限制
- `AUTH_REQUIRED`: 需要登入

## 前端使用範例

### JavaScript (瀏覽器)

```javascript
// 上傳圖片
const uploadImage = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await fetch('/api/media/upload', {
    method: 'POST',
    credentials: 'include', // 包含認證 cookies
    body: formData
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error.message)
  }
  
  return response.json()
}

// 取得圖片 URL
const getImageUrl = (mediaId) => {
  return `/api/media/${mediaId}`
}

// 取得圖片資訊
const getImageInfo = async (mediaId) => {
  const response = await fetch(`/api/media/${mediaId}/info`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error.message)
  }
  
  return response.json()
}

// 刪除圖片
const deleteImage = async (mediaId) => {
  const response = await fetch(`/api/media/${mediaId}`, {
    method: 'DELETE',
    credentials: 'include'
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error.message)
  }
  
  return response.json()
}
```

### React Hook 範例

```javascript
import { useState } from 'react'

const useMediaUpload = () => {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const uploadFile = async (file) => {
    setUploading(true)
    setError(null)
    
    try {
      // 驗證檔案類型
      if (!file.type.startsWith('image/')) {
        throw new Error('只允許上傳圖片檔案')
      }
      
      // 驗證檔案大小
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('檔案大小不能超過 5MB')
      }
      
      const result = await uploadImage(file)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setUploading(false)
    }
  }

  return {
    uploadFile,
    uploading,
    error
  }
}

// 使用範例
const ImageUploader = () => {
  const { uploadFile, uploading, error } = useMediaUpload()
  const [uploadedImage, setUploadedImage] = useState(null)

  const handleFileChange = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    try {
      const result = await uploadFile(file)
      setUploadedImage(result)
    } catch (error) {
      console.error('上傳失敗:', error)
    }
  }

  return (
    <div>
      <input
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleFileChange}
        disabled={uploading}
      />
      
      {uploading && <p>上傳中...</p>}
      {error && <p style={{ color: 'red' }}>錯誤: {error}</p>}
      
      {uploadedImage && (
        <div>
          <img
            src={getImageUrl(uploadedImage.id)}
            alt="上傳的圖片"
            style={{ maxWidth: '300px' }}
          />
          <p>檔案大小: {uploadedImage.sizeBytes} bytes</p>
          <p>尺寸: {uploadedImage.width} x {uploadedImage.height}</p>
        </div>
      )}
    </div>
  )
}
```

### HTML 圖片顯示

```html
<!-- 直接使用 URL -->
<img src="/api/media/123" alt="圖片" />

<!-- 使用 React -->
<img src={getImageUrl(mediaId)} alt="圖片" />
```

## 資料庫結構

### Media 表

```sql
CREATE TABLE Media (
  id TEXT PRIMARY KEY,
  kind TEXT DEFAULT 'IMAGE',
  mime TEXT NOT NULL,
  bytes BLOB NOT NULL,
  sizeBytes INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  sha256 TEXT UNIQUE,
  createdById TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 安全性考量

1. **檔案類型驗證**: 只允許 JPEG 和 PNG
2. **檔案大小限制**: 最大 5MB
3. **認證要求**: 上傳需要登入
4. **權限控制**: 只有創建者可以刪除檔案
5. **SHA256 去重**: 相同檔案只儲存一份
6. **輸入驗證**: 驗證所有輸入參數

## 效能優化

1. **ETag 快取**: 減少重複傳輸
2. **長期快取**: Cache-Control 設定 1 年
3. **去重機制**: 相同檔案共享儲存
4. **圖片資訊**: 使用 Sharp 快速取得尺寸

## 測試

使用提供的測試腳本：

```bash
node test-media.js
```

測試項目：
1. 登入認證
2. 上傳圖片
3. 取得媒體資訊
4. 取得媒體檔案
5. ETag 快取
6. 錯誤處理
