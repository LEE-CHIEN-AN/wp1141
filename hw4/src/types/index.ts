// 媒體檔案
export interface Media {
  id: string
  kind: 'IMAGE'
  mime: string
  sizeBytes: number
  width?: number
  height?: number
  sha256?: string
  createdById?: string
  createdAt: string
}

// 使用者
export interface User {
  id: string
  username: string
  email: string
  nickname?: string
  status?: string
  avatar?: Media
  avatarId?: string
  createdAt: string
  updatedAt: string
}

// 標籤
export interface Tag {
  id: number
  name: string
}

// 商店
export interface Store {
  id: string
  name: string
  address?: string
  lat: number
  lng: number
  mainPhoto?: Media
  mainPhotoId?: string
  googleMapUrl?: string
  instagramUrl?: string
  openingHours?: string
  googlePlaceId?: string
  createdAt: string
  updatedAt: string
  
  // 關聯資料
  photos?: StorePhoto[]
  tags?: Tag[]
  visits?: Visit[]
  reviews?: Review[]
  fans?: Favorite[]
  
  // 計算欄位（不存資料庫）
  avgRating?: number
  visitCount?: number
  isFavorite?: boolean
}

// 商店照片
export interface StorePhoto {
  id: string
  storeId: string
  media: Media
  mediaId: string
  caption?: string
  order: number
  createdAt: string
}

// 商店標籤關聯
export interface StoreTagLink {
  storeId: string
  tagId: number
  store: Store
  tag: Tag
}

// 收藏
export interface Favorite {
  userId: string
  storeId: string
  createdAt: string
  user: User
  store: Store
}

// 造訪紀錄
export interface Visit {
  id: string
  userId: string
  storeId: string
  date: string
  rating: number
  note?: string
  createdAt: string
  updatedAt: string
  
  // 關聯資料
  user: User
  store: Store
  photos: VisitPhoto[]
}

// 造訪照片
export interface VisitPhoto {
  id: string
  visitId: string
  media: Media
  mediaId: string
  caption?: string
  order: number
  createdAt: string
}

// 評論
export interface Review {
  id: string
  userId: string
  storeId: string
  date: string
  rating: number
  content: string
  createdAt: string
  updatedAt: string
  
  // 關聯資料
  user: User
  store: Store
}

// 認證狀態
export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

// 註冊資料
export interface RegisterData {
  username: string
  email: string
  password: string
  confirmPassword: string
  nickname?: string
  avatar?: string
}

// 搜尋狀態
export interface SearchState {
  query: string
  isSearching: boolean
  results: Store[]
}

// 地圖狀態
export interface MapState {
  center: {
    lat: number
    lng: number
  }
  zoom: number
  stores: Store[]
  selectedStore?: Store
  isAddingStore: boolean
}

// 向後相容的別名
export type VisitRecord = Visit
export type UserReview = Review