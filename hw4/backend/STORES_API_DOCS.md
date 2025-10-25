# 台灣選物店地圖清單 - 商店、收藏、造訪 API 文件

## 概述

本專案提供完整的商店管理、收藏和造訪記錄功能，包括動態聚合欄位計算、媒體整合和分頁查詢。

## 技術規格

- **聚合欄位**: avgRating、visitsCount 動態計算
- **媒體整合**: 與 Media API 完全整合
- **分頁查詢**: 支援 page、pageSize 參數
- **地理查詢**: 支援邊界查詢
- **標籤系統**: 動態標籤建立和關聯

## 商店 API

### 1. 查詢商店列表

**GET** `/api/stores`

**認證**: 不需要

**查詢參數**:
- `bounds`: 地理邊界 `north,west,south,east`（四個浮點數）
- `q`: 關鍵字搜尋（商店名稱或地址）
- `tags`: 標籤篩選 `A,B,C`
- `isOpenNow`: 營業狀態 `true/false`

**成功回應** (200):
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "商店名稱",
      "address": "地址",
      "lat": 25.033,
      "lng": 121.5654,
      "mainPhotoId": "uuid",
      "googleMapUrl": "https://maps.google.com/...",
      "instagramUrl": "https://instagram.com/...",
      "openingHours": "週一至週日 10:00-22:00",
      "isOpenNow": true,
      "googlePlaceId": "place_id",
      "createdAt": "2025-10-23T14:55:04.677Z",
      "updatedAt": "2025-10-23T14:55:04.677Z",
      "tags": [
        { "id": 1, "name": "文創" },
        { "id": 3, "name": "選物" }
      ],
      "avgRating": 4.5,
      "visitsCount": 12
    }
  ],
  "total": 1
}
```

### 2. 建立商店

**POST** `/api/stores`

**認證**: 需要登入

**請求體**:
```json
{
  "name": "商店名稱",
  "lat": 25.033,
  "lng": 121.5654,
  "address": "地址",
  "openingHours": "營業時間",
  "tagNames": ["文創", "選物"],
  "mainPhotoId": "uuid"
}
```

**成功回應** (201):
```json
{
  "id": "uuid",
  "name": "商店名稱",
  "address": "地址",
  "lat": 25.033,
  "lng": 121.5654,
  "mainPhotoId": "uuid",
  "googleMapUrl": null,
  "instagramUrl": null,
  "openingHours": "週一至週日 10:00-22:00",
  "isOpenNow": null,
  "googlePlaceId": null,
  "createdAt": "2025-10-23T14:55:04.677Z",
  "updatedAt": "2025-10-23T14:55:04.677Z",
  "tags": [
    { "id": 1, "name": "文創" },
    { "id": 3, "name": "選物" }
  ],
  "avgRating": 0,
  "visitsCount": 0
}
```

### 3. 取得商店詳情

**GET** `/api/stores/:id`

**認證**: 不需要

**成功回應** (200):
```json
{
  "id": "uuid",
  "name": "商店名稱",
  "address": "地址",
  "lat": 25.033,
  "lng": 121.5654,
  "mainPhotoId": "uuid",
  "googleMapUrl": null,
  "instagramUrl": null,
  "openingHours": "週一至週日 10:00-22:00",
  "isOpenNow": null,
  "googlePlaceId": null,
  "createdAt": "2025-10-23T14:55:04.677Z",
  "updatedAt": "2025-10-23T14:55:04.677Z",
  "tags": [
    { "id": 1, "name": "文創" },
    { "id": 3, "name": "選物" }
  ],
  "avgRating": 4.5,
  "visitsCount": 12,
  "photos": [
    {
      "id": "uuid",
      "mediaId": "uuid",
      "caption": "照片說明",
      "order": 1,
      "createdAt": "2025-10-23T14:55:04.855Z"
    }
  ]
}
```

### 4. 新增商店相簿

**POST** `/api/stores/:id/photos`

**認證**: 需要登入

**請求體**:
```json
{
  "mediaId": "uuid",
  "caption": "照片說明",
  "order": 1
}
```

**成功回應** (201):
```json
{
  "id": "uuid",
  "storeId": "uuid",
  "mediaId": "uuid",
  "caption": "照片說明",
  "order": 1,
  "createdAt": "2025-10-23T14:55:04.855Z"
}
```

## 收藏 API

### 1. 收藏商店

**POST** `/api/stores/:id/favorite`

**認證**: 需要登入

**成功回應** (200):
```json
{
  "ok": true
}
```

### 2. 取消收藏商店

**DELETE** `/api/stores/:id/favorite`

**認證**: 需要登入

**成功回應** (200):
```json
{
  "ok": true
}
```

### 3. 取得我的收藏

**GET** `/api/stores/me/favorites`

**認證**: 需要登入

**成功回應** (200):
```json
[
  {
    "id": "uuid",
    "name": "商店名稱",
    "address": "地址",
    "lat": 25.033,
    "lng": 121.5654,
    "mainPhotoId": "uuid",
    "googleMapUrl": null,
    "instagramUrl": null,
    "openingHours": "週一至週日 10:00-22:00",
    "isOpenNow": null,
    "googlePlaceId": null,
    "createdAt": "2025-10-23T14:55:04.677Z",
    "updatedAt": "2025-10-23T14:55:04.677Z",
    "tags": [
      { "id": 1, "name": "文創" },
      { "id": 3, "name": "選物" }
    ],
    "avgRating": 4.5,
    "visitsCount": 12
  }
]
```

## 造訪 API

### 1. 查詢造訪記錄

**GET** `/api/stores/:id/visits`

**認證**: 不需要

**查詢參數**:
- `page`: 頁碼（預設 1）
- `pageSize`: 每頁數量（預設 10）

**成功回應** (200):
```json
{
  "items": [
    {
      "id": "uuid",
      "userId": "uuid",
      "storeId": "uuid",
      "date": "2025-10-23T00:00:00.000Z",
      "rating": 5,
      "note": "很棒的選物店！",
      "createdAt": "2025-10-23T14:55:04.992Z",
      "updatedAt": "2025-10-23T14:55:04.992Z",
      "user": {
        "id": "uuid",
        "username": "testuser3",
        "nickname": "測試用戶3",
        "avatarId": null
      },
      "photos": [
        {
          "id": "uuid",
          "mediaId": "uuid",
          "caption": null,
          "order": 0,
          "createdAt": "2025-10-23T14:55:05.015Z"
        }
      ]
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10,
  "totalPages": 1
}
```

### 2. 建立造訪記錄

**POST** `/api/stores/:id/visits`

**認證**: 需要登入

**請求體**:
```json
{
  "date": "2025-10-23",
  "rating": 5,
  "note": "很棒的選物店！",
  "photoIds": ["uuid1", "uuid2"]
}
```

**成功回應** (201):
```json
{
  "id": "uuid",
  "userId": "uuid",
  "storeId": "uuid",
  "date": "2025-10-23T00:00:00.000Z",
  "rating": 5,
  "note": "很棒的選物店！",
  "createdAt": "2025-10-23T14:55:04.992Z",
  "updatedAt": "2025-10-23T14:55:04.992Z",
  "user": {
    "id": "uuid",
    "username": "testuser3",
    "nickname": "測試用戶3",
    "avatarId": null
  },
  "photos": [
    {
      "id": "uuid",
      "mediaId": "uuid",
      "caption": null,
      "order": 0,
      "createdAt": "2025-10-23T14:55:05.015Z"
    }
  ]
}
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

**商店相關**:
- `STORE_NOT_FOUND`: 找不到指定的商店
- `STORE_INVALID_ID`: 無效的商店 ID 格式
- `STORE_MISSING_FIELDS`: 缺少必填欄位
- `STORE_INVALID_COORDINATES`: 無效的座標值
- `STORE_CREATE_ERROR`: 建立商店失敗
- `STORE_GET_ERROR`: 取得商店詳情失敗
- `STORE_PHOTO_CREATE_ERROR`: 新增商店相簿失敗
- `STORE_PHOTO_MISSING_MEDIA`: 缺少必填欄位：mediaId

**收藏相關**:
- `FAV_CONFLICT`: 已經收藏過此商店
- `FAVORITE_NOT_FOUND`: 沒有收藏過此商店
- `FAVORITE_CREATE_ERROR`: 收藏商店失敗
- `FAVORITE_DELETE_ERROR`: 取消收藏失敗
- `FAVORITES_GET_ERROR`: 取得收藏失敗

**造訪相關**:
- `VISIT_MISSING_FIELDS`: 缺少必填欄位：date, rating
- `VISIT_INVALID_RATING`: 評分必須是 1-5 之間的整數
- `VISIT_INVALID_DATE`: 無效的日期格式
- `VISIT_CREATE_ERROR`: 建立造訪記錄失敗
- `VISITS_GET_ERROR`: 取得造訪記錄失敗

**通用**:
- `AUTH_REQUIRED`: 需要登入
- `MEDIA_NOT_FOUND`: 找不到指定的媒體檔案

## 前端使用範例

### JavaScript (瀏覽器)

```javascript
// 查詢商店列表
const getStores = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString()
  const response = await fetch(`/api/stores?${queryString}`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error.message)
  }
  
  return response.json()
}

// 建立商店
const createStore = async (storeData) => {
  const response = await fetch('/api/stores', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(storeData)
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error.message)
  }
  
  return response.json()
}

// 收藏商店
const favoriteStore = async (storeId) => {
  const response = await fetch(`/api/stores/${storeId}/favorite`, {
    method: 'POST',
    credentials: 'include'
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error.message)
  }
  
  return response.json()
}

// 取消收藏
const unfavoriteStore = async (storeId) => {
  const response = await fetch(`/api/stores/${storeId}/favorite`, {
    method: 'DELETE',
    credentials: 'include'
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error.message)
  }
  
  return response.json()
}

// 取得我的收藏
const getMyFavorites = async () => {
  const response = await fetch('/api/stores/me/favorites', {
    credentials: 'include'
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error.message)
  }
  
  return response.json()
}

// 建立造訪記錄
const createVisit = async (storeId, visitData) => {
  const response = await fetch(`/api/stores/${storeId}/visits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(visitData)
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error.message)
  }
  
  return response.json()
}

// 查詢造訪記錄
const getVisits = async (storeId, page = 1, pageSize = 10) => {
  const response = await fetch(`/api/stores/${storeId}/visits?page=${page}&pageSize=${pageSize}`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error.message)
  }
  
  return response.json()
}
```

### React Hook 範例

```javascript
import { useState, useEffect } from 'react'

const useStores = () => {
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchStores = async (params = {}) => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await getStores(params)
      setStores(data.items)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const createStore = async (storeData) => {
    try {
      const newStore = await createStore(storeData)
      setStores(prev => [newStore, ...prev])
      return newStore
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  return {
    stores,
    loading,
    error,
    fetchStores,
    createStore
  }
}

const useFavorites = () => {
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchFavorites = async () => {
    setLoading(true)
    try {
      const data = await getMyFavorites()
      setFavorites(data)
      return data
    } finally {
      setLoading(false)
    }
  }

  const toggleFavorite = async (storeId, isFavorited) => {
    try {
      if (isFavorited) {
        await unfavoriteStore(storeId)
        setFavorites(prev => prev.filter(store => store.id !== storeId))
      } else {
        await favoriteStore(storeId)
        // 需要重新取得收藏列表或從商店列表中找到該商店
        await fetchFavorites()
      }
    } catch (error) {
      console.error('切換收藏狀態失敗:', error)
      throw error
    }
  }

  useEffect(() => {
    fetchFavorites()
  }, [])

  return {
    favorites,
    loading,
    fetchFavorites,
    toggleFavorite
  }
}
```

## 聚合欄位說明

### avgRating（平均評分）
- 動態計算所有造訪記錄的評分平均值
- 範圍：0-5（無造訪記錄時為 0）
- 計算方式：`AVG(rating)` FROM `Visit` WHERE `storeId`

### visitsCount（造訪次數）
- 動態計算造訪記錄總數
- 範圍：0 或正整數
- 計算方式：`COUNT(*)` FROM `Visit` WHERE `storeId`

## 地理查詢說明

### bounds 參數格式
```
bounds=25.1,121.5,24.9,121.7
```
- 格式：`north,west,south,east`
- 類型：四個浮點數
- 用途：查詢指定地理邊界內的商店

### 座標系統
- 使用 WGS84 座標系統
- 緯度範圍：-90 到 90
- 經度範圍：-180 到 180

## 測試

使用提供的測試腳本：

```bash
node test-stores.js
```

測試項目：
1. 登入認證
2. 上傳圖片
3. 建立商店
4. 查詢商店列表
5. 取得商店詳情
6. 新增商店相簿
7. 收藏商店
8. 取得我的收藏
9. 建立造訪記錄
10. 查詢造訪記錄
11. 檢查聚合資料更新
12. 取消收藏
