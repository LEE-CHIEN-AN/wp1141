/**
 * 資料同步管理 Hook
 * 解決跨頁面資料不同步的問題
 */

import { useState, useEffect, useCallback } from 'react'
import { Store, Visit } from '../types'
import { storesAPI, favoritesAPI, visitsAPI } from '../services/api'
import { useErrorHandler } from './useErrorHandler'

// 資料快取介面
interface DataCache<T> {
  data: T[]
  lastUpdated: number
  isLoading: boolean
  error: string | null
}

// 全域資料快取狀態
class DataSyncManager {
  private storesCache: DataCache<Store> = {
    data: [],
    lastUpdated: 0,
    isLoading: false,
    error: null
  }

  private favoritesCache: DataCache<Store> = {
    data: [],
    lastUpdated: 0,
    isLoading: false,
    error: null
  }

  private visitsCache: DataCache<Visit> = {
    data: [],
    lastUpdated: 0,
    isLoading: false,
    error: null
  }

  private listeners: Map<string, Set<() => void>> = new Map()

  // 訂閱資料變更
  subscribe(key: string, callback: () => void) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set())
    }
    this.listeners.get(key)!.add(callback)

    return () => {
      this.listeners.get(key)?.delete(callback)
    }
  }

  // 通知所有訂閱者
  private notify(key: string) {
    this.listeners.get(key)?.forEach(callback => callback())
  }

  // 檢查快取是否過期（5分鐘）
  private isCacheExpired(lastUpdated: number): boolean {
    return Date.now() - lastUpdated > 5 * 60 * 1000
  }

  // 商店資料管理
  async getStores(params: {
    bounds?: string
    q?: string
    tags?: string
    forceRefresh?: boolean
  } = {}): Promise<Store[]> {
    // 如果快取有效且不強制刷新，返回快取資料
    if (!params.forceRefresh && 
        !this.isCacheExpired(this.storesCache.lastUpdated) && 
        this.storesCache.data.length > 0) {
      return this.storesCache.data
    }

    // 如果正在載入，等待完成
    if (this.storesCache.isLoading) {
      return new Promise((resolve) => {
        const unsubscribe = this.subscribe('stores', () => {
          unsubscribe()
          resolve(this.storesCache.data)
        })
      })
    }

    this.storesCache.isLoading = true
    this.storesCache.error = null

    try {
      const data = await storesAPI.getStores(params)
      this.storesCache.data = data.items || data
      this.storesCache.lastUpdated = Date.now()
      this.notify('stores')
      return this.storesCache.data
    } catch (error: any) {
      this.storesCache.error = error.message
      throw error
    } finally {
      this.storesCache.isLoading = false
    }
  }

  // 收藏資料管理
  async getFavorites(forceRefresh?: boolean): Promise<Store[]> {
    if (!forceRefresh && 
        !this.isCacheExpired(this.favoritesCache.lastUpdated) && 
        this.favoritesCache.data.length > 0) {
      return this.favoritesCache.data
    }

    if (this.favoritesCache.isLoading) {
      return new Promise((resolve) => {
        const unsubscribe = this.subscribe('favorites', () => {
          unsubscribe()
          resolve(this.favoritesCache.data)
        })
      })
    }

    this.favoritesCache.isLoading = true
    this.favoritesCache.error = null

    try {
      const data = await favoritesAPI.getMyFavorites()
      this.favoritesCache.data = data
      this.favoritesCache.lastUpdated = Date.now()
      this.notify('favorites')
      return this.favoritesCache.data
    } catch (error: any) {
      this.favoritesCache.error = error.message
      throw error
    } finally {
      this.favoritesCache.isLoading = false
    }
  }

  // 造訪紀錄管理
  async getVisits(forceRefresh?: boolean): Promise<Visit[]> {
    if (!forceRefresh && 
        !this.isCacheExpired(this.visitsCache.lastUpdated) && 
        this.visitsCache.data.length > 0) {
      return this.visitsCache.data
    }

    if (this.visitsCache.isLoading) {
      return new Promise((resolve) => {
        const unsubscribe = this.subscribe('visits', () => {
          unsubscribe()
          resolve(this.visitsCache.data)
        })
      })
    }

    this.visitsCache.isLoading = true
    this.visitsCache.error = null

    try {
      const data = await visitsAPI.getMyVisits()
      this.visitsCache.data = data.items || data
      this.visitsCache.lastUpdated = Date.now()
      this.notify('visits')
      return this.visitsCache.data
    } catch (error: any) {
      this.visitsCache.error = error.message
      throw error
    } finally {
      this.visitsCache.isLoading = false
    }
  }

  // 更新單一商店資料
  updateStore(storeId: string, updatedStore: Store) {
    // 更新商店快取
    const storeIndex = this.storesCache.data.findIndex(s => s.id === storeId)
    if (storeIndex !== -1) {
      this.storesCache.data[storeIndex] = updatedStore
      this.storesCache.lastUpdated = Date.now()
      this.notify('stores')
    }

    // 更新收藏快取
    const favoriteIndex = this.favoritesCache.data.findIndex(s => s.id === storeId)
    if (favoriteIndex !== -1) {
      this.favoritesCache.data[favoriteIndex] = updatedStore
      this.favoritesCache.lastUpdated = Date.now()
      this.notify('favorites')
    }
  }

  // 添加收藏
  async addFavorite(storeId: string): Promise<void> {
    await favoritesAPI.favorite(storeId)
    // 清除收藏快取，強制重新載入
    this.favoritesCache.lastUpdated = 0
    this.notify('favorites')
  }

  // 移除收藏
  async removeFavorite(storeId: string): Promise<void> {
    await favoritesAPI.unfavorite(storeId)
    // 清除收藏快取，強制重新載入
    this.favoritesCache.lastUpdated = 0
    this.notify('favorites')
  }

  // 清除所有快取
  clearCache() {
    this.storesCache.lastUpdated = 0
    this.favoritesCache.lastUpdated = 0
    this.visitsCache.lastUpdated = 0
    this.notify('stores')
    this.notify('favorites')
    this.notify('visits')
  }

  // 獲取快取狀態
  getCacheStatus() {
    return {
      stores: {
        isLoading: this.storesCache.isLoading,
        error: this.storesCache.error,
        lastUpdated: this.storesCache.lastUpdated,
        count: this.storesCache.data.length
      },
      favorites: {
        isLoading: this.favoritesCache.isLoading,
        error: this.favoritesCache.error,
        lastUpdated: this.favoritesCache.lastUpdated,
        count: this.favoritesCache.data.length
      },
      visits: {
        isLoading: this.visitsCache.isLoading,
        error: this.visitsCache.error,
        lastUpdated: this.visitsCache.lastUpdated,
        count: this.visitsCache.data.length
      }
    }
  }
}

// 導出單例實例
export const dataSyncManager = new DataSyncManager()

// 使用資料同步的 Hook
export const useDataSync = () => {
  const [stores, setStores] = useState<Store[]>([])
  const [favorites, setFavorites] = useState<Store[]>([])
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState({
    stores: false,
    favorites: false,
    visits: false
  })
  const [error, setError] = useState({
    stores: null as string | null,
    favorites: null as string | null,
    visits: null as string | null
  })
  const { handleError, handleSuccess } = useErrorHandler()

  // 訂閱資料變更
  useEffect(() => {
    const unsubscribeStores = dataSyncManager.subscribe('stores', () => {
      setStores(dataSyncManager.getCacheStatus().stores.count > 0 ? 
        dataSyncManager.storesCache.data : [])
    })

    const unsubscribeFavorites = dataSyncManager.subscribe('favorites', () => {
      setFavorites(dataSyncManager.getCacheStatus().favorites.count > 0 ? 
        dataSyncManager.favoritesCache.data : [])
    })

    const unsubscribeVisits = dataSyncManager.subscribe('visits', () => {
      setVisits(dataSyncManager.getCacheStatus().visits.count > 0 ? 
        dataSyncManager.visitsCache.data : [])
    })

    return () => {
      unsubscribeStores()
      unsubscribeFavorites()
      unsubscribeVisits()
    }
  }, [])

  // 載入商店資料
  const loadStores = useCallback(async (params: {
    bounds?: string
    q?: string
    tags?: string
    forceRefresh?: boolean
  } = {}) => {
    setLoading(prev => ({ ...prev, stores: true }))
    setError(prev => ({ ...prev, stores: null }))

    try {
      const data = await dataSyncManager.getStores(params)
      setStores(data)
    } catch (err: any) {
      setError(prev => ({ ...prev, stores: err.message }))
      handleError(err)
    } finally {
      setLoading(prev => ({ ...prev, stores: false }))
    }
  }, [handleError])

  // 載入收藏資料
  const loadFavorites = useCallback(async (forceRefresh?: boolean) => {
    setLoading(prev => ({ ...prev, favorites: true }))
    setError(prev => ({ ...prev, favorites: null }))

    try {
      const data = await dataSyncManager.getFavorites(forceRefresh)
      setFavorites(data)
    } catch (err: any) {
      setError(prev => ({ ...prev, favorites: err.message }))
      handleError(err)
    } finally {
      setLoading(prev => ({ ...prev, favorites: false }))
    }
  }, [handleError])

  // 載入造訪紀錄
  const loadVisits = useCallback(async (forceRefresh?: boolean) => {
    setLoading(prev => ({ ...prev, visits: true }))
    setError(prev => ({ ...prev, visits: null }))

    try {
      const data = await dataSyncManager.getVisits(forceRefresh)
      setVisits(data)
    } catch (err: any) {
      setError(prev => ({ ...prev, visits: err.message }))
      handleError(err)
    } finally {
      setLoading(prev => ({ ...prev, visits: false }))
    }
  }, [handleError])

  // 切換收藏狀態
  const toggleFavorite = useCallback(async (storeId: string) => {
    try {
      const isFavorited = favorites.some(store => store.id === storeId)
      
      if (isFavorited) {
        await dataSyncManager.removeFavorite(storeId)
        handleSuccess('已移除收藏')
      } else {
        await dataSyncManager.addFavorite(storeId)
        handleSuccess('已加入收藏')
      }
    } catch (err: any) {
      handleError(err)
      throw err
    }
  }, [favorites, handleError, handleSuccess])

  // 更新商店資料
  const updateStore = useCallback((storeId: string, updatedStore: Store) => {
    dataSyncManager.updateStore(storeId, updatedStore)
  }, [])

  // 清除所有快取
  const clearCache = useCallback(() => {
    dataSyncManager.clearCache()
  }, [])

  return {
    // 資料
    stores,
    favorites,
    visits,
    
    // 載入狀態
    loading,
    
    // 錯誤狀態
    error,
    
    // 操作方法
    loadStores,
    loadFavorites,
    loadVisits,
    toggleFavorite,
    updateStore,
    clearCache
  }
}
