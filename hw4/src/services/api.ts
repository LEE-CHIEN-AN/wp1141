// API 服務層
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

// 通用 fetch 函數
const apiRequest = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(`${API_BASE}${url}`, {
    credentials: 'include', // 重要：包含 cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  // 處理 304 Not Modified 響應
  if (response.status === 304) {
    // 304 響應沒有 body，返回 null 表示使用快取
    return null
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: '網路錯誤' } }))
    const customError = new Error(error.error?.message || `HTTP ${response.status}`) as any
    customError.response = response
    customError.status = response.status
    throw customError
  }

  // 檢查響應是否有內容
  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return response.json()
  } else {
    // 非 JSON 響應，返回響應對象
    return response
  }
}

// 認證 API
export const authAPI = {
  // 登入
  login: (emailOrUsername: string, password: string) =>
    apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrUsername, password }),
    }),

  // 註冊
  register: (userData: {
    username: string
    email: string
    password: string
    nickname?: string
  }) =>
    apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  // 登出
  logout: () =>
    apiRequest('/api/auth/logout', {
      method: 'POST',
    }),

  // 取得當前使用者
  getMe: () => apiRequest('/api/auth/me'),
}

// 媒體 API
export const mediaAPI = {
  // 上傳圖片
  upload: (formData: FormData) => {
    console.log('API upload called with FormData:', {
      entries: Array.from(formData.entries()),
      hasFile: formData.has('file')
    })
    
    return fetch(`${API_BASE}/api/media/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    }).then(async (response) => {
      console.log('Upload response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: '網路錯誤' } }))
        console.error('Upload error:', error)
        throw new Error(error.error?.message || `HTTP ${response.status}`)
      }
      return response.json()
    })
  },

  // 取得圖片 URL
  getImageUrl: (mediaId: string) => `${API_BASE}/api/media/${mediaId}`,

  // 取得媒體資訊
  getInfo: (mediaId: string) => apiRequest(`/api/media/${mediaId}/info`),
}

// 商店 API
export const storesAPI = {
  // 查詢商店列表
  getStores: (params: {
    bounds?: string
    q?: string
    tags?: string
  } = {}) => {
    const queryString = new URLSearchParams()
    
    if (params.bounds) queryString.append('bounds', params.bounds)
    if (params.q) queryString.append('q', params.q)
    if (params.tags) queryString.append('tags', params.tags)
    
    const query = queryString.toString()
    return apiRequest(`/api/stores${query ? `?${query}` : ''}`)
  },

  // 建立商店
  createStore: (storeData: {
    name: string
    lat: number
    lng: number
    address?: string
    openingHours?: string
    tagNames?: string[]
    mainPhotoId?: string
    googleMapUrl?: string
    instagramUrl?: string
  }) =>
    apiRequest('/api/stores', {
      method: 'POST',
      body: JSON.stringify(storeData),
    }),

  // 取得商店詳情
  getStore: (storeId: string) => apiRequest(`/api/stores/${storeId}`),

  // 新增商店相簿
  addPhoto: (storeId: string, photoData: {
    mediaId: string
    caption?: string
    order?: number
  }) =>
    apiRequest(`/api/stores/${storeId}/photos`, {
      method: 'POST',
      body: JSON.stringify(photoData),
    }),

  // 更新商店資料
  updateStore: (storeId: string, storeData: {
    name?: string
    address?: string
    openingHours?: string
    googleMapUrl?: string
    instagramUrl?: string
    tagNames?: string[]
    description?: string
    mainPhotoId?: string
  }) =>
    apiRequest(`/api/stores/${storeId}`, {
      method: 'PUT',
      body: JSON.stringify(storeData),
    }),

  // 新增商店照片
  addStorePhoto: (storeId: string, photoData: {
    mediaId: string
    caption?: string
    order?: number
  }) =>
    apiRequest(`/api/stores/${storeId}/photos`, {
      method: 'POST',
      body: JSON.stringify(photoData),
    }),

  // 刪除商店照片
  deleteStorePhoto: (storeId: string, photoId: string) =>
    apiRequest(`/api/stores/${storeId}/photos/${photoId}`, {
      method: 'DELETE',
    }),

  // 取得商店編輯歷史
  getStoreHistory: (storeId: string, params: {
    page?: number
    pageSize?: number
  } = {}) => {
    const queryString = new URLSearchParams()
    if (params.page) queryString.append('page', params.page.toString())
    if (params.pageSize) queryString.append('pageSize', params.pageSize.toString())
    
    const query = queryString.toString()
    return apiRequest(`/api/stores/${storeId}/history${query ? `?${query}` : ''}`)
  },

  // 取得所有標籤
  getTags: () => apiRequest('/api/tags'),
}

// 收藏 API
export const favoritesAPI = {
  // 收藏商店
  favorite: (storeId: string) =>
    apiRequest(`/api/stores/${storeId}/favorite`, {
      method: 'POST',
    }),

  // 取消收藏
  unfavorite: (storeId: string) =>
    apiRequest(`/api/stores/${storeId}/favorite`, {
      method: 'DELETE',
    }),

  // 取得我的收藏
  getMyFavorites: () => apiRequest('/api/stores/me/favorites'),
}

// 造訪 API
export const visitsAPI = {
  // 查詢造訪記錄
  getVisits: (storeId: string, page = 1, pageSize = 10) =>
    apiRequest(`/api/stores/${storeId}/visits?page=${page}&pageSize=${pageSize}`),

  // 取得我的所有造訪記錄
  getMyVisits: (page = 1, pageSize = 20) =>
    apiRequest(`/api/me/visits?page=${page}&pageSize=${pageSize}`),

  // 建立造訪記錄
  createVisit: (storeId: string, visitData: {
    date: string
    rating: number
    note?: string
    photoIds?: string[]
  }) =>
    apiRequest(`/api/stores/${storeId}/visits`, {
      method: 'POST',
      body: JSON.stringify(visitData),
    }),

  // 更新造訪記錄
  updateVisit: (visitId: string, visitData: {
    date: string
    rating: number
    note?: string
    photoIds?: string[]
  }) =>
    apiRequest(`/api/visits/${visitId}`, {
      method: 'PUT',
      body: JSON.stringify(visitData),
    }),

  // 刪除造訪記錄
  deleteVisit: (visitId: string) =>
    apiRequest(`/api/visits/${visitId}`, {
      method: 'DELETE',
    }),
}

// 導出所有 API
export default {
  auth: authAPI,
  media: mediaAPI,
  stores: storesAPI,
  favorites: favoritesAPI,
  visits: visitsAPI,
}
